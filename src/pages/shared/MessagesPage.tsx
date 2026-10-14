import { clsx } from 'clsx'
import { ArrowLeft, MessageSquare, Plus, Send, Users, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Conversation { id: string; name: string; lastMessage: string; time: string; unread: number }
interface Message { id: string; body: string; mine: boolean; time: string; channel: string }
interface Parent { id: string; full_name: string; phone: string | null }

type Channel = 'platform' | 'sms' | 'both'

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [channel, setChannel] = useState<Channel>('platform')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false)
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParents, setSelectedParents] = useState<Parent[]>([])
  const [parentSearch, setParentSearch] = useState('')
  const [composeBody, setComposeBody] = useState('')
  const [composeChannel, setComposeChannel] = useState<Channel>('platform')
  const [composeSending, setComposeSending] = useState(false)
  const [composeError, setComposeError] = useState('')

  // Mobile: show thread or list
  const [showThread, setShowThread] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const isStaff = ['headteacher', 'teacher'].includes(user?.role ?? '')

  async function loadConversations() {
    if (!user?.id) return
    const { data } = await supabase
      .from('messages')
      .select('id, body, created_at, read, sender_id, recipient_id, channel, sender:profiles!messages_sender_id_fkey(full_name), recipient:profiles!messages_recipient_id_fkey(full_name)')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!data) { setLoading(false); return }

    const map = new Map<string, Conversation>()
    data.forEach((m: any) => {
      const otherId = m.sender_id === user.id ? m.recipient_id : m.sender_id
      const otherName = m.sender_id === user.id ? m.recipient?.full_name : m.sender?.full_name
      if (!map.has(otherId)) {
        map.set(otherId, {
          id: otherId,
          name: otherName ?? 'Unknown',
          lastMessage: m.body,
          time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          unread: (!m.read && m.recipient_id === user.id) ? 1 : 0,
        })
      } else if (!m.read && m.recipient_id === user.id) {
        map.get(otherId)!.unread += 1
      }
    })

    const convs = Array.from(map.values())
    setConversations(convs)
    if (convs.length > 0 && !activeId) setActiveId(convs[0].id)
    setLoading(false)
  }

  async function loadThread(otherId: string) {
    if (!user?.id) return
    const { data } = await supabase
      .from('messages')
      .select('id, body, created_at, sender_id, channel')
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${user.id})`)
      .order('created_at', { ascending: true })

    setThread((data ?? []).map((m: any) => ({
      id: m.id, body: m.body, mine: m.sender_id === user.id,
      time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: m.channel ?? 'platform',
    })))

    await supabase.from('messages').update({ read: true })
      .eq('sender_id', otherId).eq('recipient_id', user.id).eq('read', false)
  }

  async function loadParents() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('parent_students')
      .select('parent_id, profiles!parent_students_parent_id_fkey(id, full_name, phone), students!parent_students_student_id_fkey(school_id)')
      .eq('students.school_id', user.school_id)

    // Deduplicate by parent_id
    const seen = new Set<string>()
    const result: Parent[] = []
    for (const row of data ?? []) {
      const p = (row as any).profiles
      if (p && !seen.has(p.id)) {
        seen.add(p.id)
        result.push({ id: p.id, full_name: p.full_name, phone: p.phone })
      }
    }
    setParents(result.sort((a, b) => a.full_name.localeCompare(b.full_name)))
  }

  useEffect(() => { loadConversations() }, [user])
  useEffect(() => { if (activeId) loadThread(activeId) }, [activeId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  function openConversation(id: string) {
    setActiveId(id)
    setShowThread(true)
  }

  async function handleSend() {
    if (!input.trim() || !activeId || !user?.id) return
    setSending(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (channel === 'sms' || channel === 'both') {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
        body: JSON.stringify({ recipient_id: activeId, body: input.trim() }),
      })
    }
    if (channel === 'platform' || channel === 'both') {
      await supabase.from('messages').insert({
        school_id: user.school_id, sender_id: user.id,
        recipient_id: activeId, body: input.trim(), channel: 'platform',
      })
    }

    setInput('')
    setSending(false)
    loadThread(activeId)
    loadConversations()
  }

  async function handleComposeSend() {
    if (!composeBody.trim() || selectedParents.length === 0 || !user?.id) return
    setComposeError('')
    setComposeSending(true)
    const { data: { session } } = await supabase.auth.getSession()

    for (const parent of selectedParents) {
      if (composeChannel === 'sms' || composeChannel === 'both') {
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}`, 'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY },
          body: JSON.stringify({ recipient_id: parent.id, body: composeBody.trim() }),
        })
      }
      if (composeChannel === 'platform' || composeChannel === 'both') {
        await supabase.from('messages').insert({
          school_id: user.school_id, sender_id: user.id,
          recipient_id: parent.id, body: composeBody.trim(), channel: 'platform',
        })
      }
    }

    setComposeSending(false)
    setComposeOpen(false)
    setComposeBody('')
    setSelectedParents([])
    setComposeChannel('platform')
    loadConversations()

    // Open thread with first recipient if single
    if (selectedParents.length === 1) {
      setActiveId(selectedParents[0].id)
      setShowThread(true)
    }
  }

  function openCompose() {
    loadParents()
    setSelectedParents([])
    setParentSearch('')
    setComposeBody('')
    setComposeChannel('platform')
    setComposeError('')
    setComposeOpen(true)
  }

  function toggleParent(p: Parent) {
    setSelectedParents(prev =>
      prev.find(x => x.id === p.id) ? prev.filter(x => x.id !== p.id) : [...prev, p]
    )
  }

  const active = conversations.find(c => c.id === activeId)
  const filteredParents = parents.filter(p =>
    p.full_name.toLowerCase().includes(parentSearch.toLowerCase())
  )

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] space-y-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 text-sm mt-0.5">Conversations with parents</p>
        </div>
        {isStaff && (
          <button onClick={openCompose}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> New Message
          </button>
        )}
      </div>

      {!loading && conversations.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          {isStaff ? 'No conversations yet. Click "New Message" to contact a parent.' : 'No conversations yet.'}
        </div>
      )}

      {conversations.length > 0 && (
        <div className="flex flex-1 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden min-h-0">

          {/* Conversation list — hidden on mobile when thread is open */}
          <div className={clsx(
            'flex flex-col border-r border-gray-100 shrink-0',
            'w-full sm:w-72',
            showThread ? 'hidden sm:flex' : 'flex'
          )}>
            <div className="p-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Conversations ({conversations.length})
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map(c => (
                <button key={c.id} onClick={() => openConversation(c.id)}
                  className={clsx('w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors',
                    activeId === c.id && 'bg-indigo-50 border-l-2 border-l-indigo-500'
                  )}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-800 truncate">{c.name}</span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{c.time}</span>
                  </div>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-xs text-gray-400 truncate">{c.lastMessage}</span>
                    {c.unread > 0 && (
                      <span className="ml-2 bg-indigo-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center shrink-0">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Thread — hidden on mobile when list is shown */}
          <div className={clsx(
            'flex-1 flex flex-col min-w-0',
            !showThread ? 'hidden sm:flex' : 'flex'
          )}>
            {/* Thread header */}
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
              <button onClick={() => setShowThread(false)}
                className="sm:hidden p-1 text-gray-400 hover:text-gray-600">
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-800">{active?.name ?? '—'}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {thread.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <MessageSquare size={32} className="mb-2 opacity-30" />
                  <p className="text-sm">No messages yet. Say hello!</p>
                </div>
              )}
              {thread.map(m => (
                <div key={m.id} className={clsx('flex', m.mine ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('max-w-[75%] px-4 py-2.5 rounded-2xl text-sm',
                    m.mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  )}>
                    <p className="break-words">{m.body}</p>
                    <p className={clsx('text-xs mt-1 flex items-center gap-1', m.mine ? 'text-indigo-200' : 'text-gray-400')}>
                      {m.channel === 'sms' && <span className="bg-green-500 text-white text-[10px] px-1 rounded">SMS</span>}
                      {m.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-3 border-t border-gray-100 space-y-2">
              {isStaff && (
                <div className="flex gap-1.5">
                  {(['platform', 'sms', 'both'] as Channel[]).map(ch => (
                    <button key={ch} onClick={() => setChannel(ch)}
                      className={clsx('flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors border capitalize',
                        channel === ch
                          ? ch === 'sms' ? 'bg-green-600 text-white border-green-600'
                            : ch === 'both' ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                      )}>
                      {ch === 'both' ? 'Both' : ch === 'sms' ? 'SMS' : 'Platform'}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={input} onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  placeholder="Type a message…"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300" />
                <button onClick={handleSend} disabled={sending || !input.trim()}
                  className={clsx('text-white p-2.5 rounded-lg transition-colors disabled:opacity-40',
                    channel === 'sms' ? 'bg-green-600 hover:bg-green-700'
                    : channel === 'both' ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                  )}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compose Modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4">
          <div className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <h2 className="text-base font-semibold text-gray-800">New Message</h2>
              <button onClick={() => setComposeOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {composeError && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{composeError}</div>}

              {/* Recipients */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipients <span className="text-red-500">*</span>
                </label>

                {/* Selected tags */}
                {selectedParents.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedParents.map(p => (
                      <span key={p.id} className="flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full">
                        {p.full_name}
                        <button onClick={() => toggleParent(p)} className="hover:text-indigo-900">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <input type="text" placeholder="Search parents…" value={parentSearch}
                  onChange={e => setParentSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-1" />

                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                  {filteredParents.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-5">No parents found.</p>
                    : filteredParents.map(p => (
                      <button key={p.id} onClick={() => toggleParent(p)}
                        className={clsx('w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors flex items-center justify-between',
                          selectedParents.find(x => x.id === p.id) && 'bg-indigo-50'
                        )}>
                        <div>
                          <p className="font-medium text-gray-800">{p.full_name}</p>
                          {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                        </div>
                        {selectedParents.find(x => x.id === p.id) && (
                          <span className="w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-white text-[10px]">✓</span>
                          </span>
                        )}
                      </button>
                    ))
                  }
                </div>

                {selectedParents.length > 1 && (
                  <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                    <Users size={12} /> Sending to {selectedParents.length} parents
                  </p>
                )}
              </div>

              {/* Channel */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Send via</label>
                <div className="flex gap-2">
                  {(['platform', 'sms', 'both'] as Channel[]).map(ch => (
                    <button key={ch} onClick={() => setComposeChannel(ch)}
                      className={clsx('flex-1 py-2 rounded-lg text-sm font-medium border transition-colors',
                        composeChannel === ch
                          ? ch === 'sms' ? 'bg-green-600 text-white border-green-600'
                            : ch === 'both' ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-indigo-600 text-white border-indigo-600'
                          : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                      )}>
                      {ch === 'both' ? 'Both' : ch === 'sms' ? 'SMS' : 'Platform'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {composeChannel === 'platform' && 'Message will appear in the app only.'}
                  {composeChannel === 'sms' && 'Message will be sent as SMS to their phone.'}
                  {composeChannel === 'both' && 'Message will be sent via app and SMS.'}
                </p>
              </div>

              {/* Message body */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={composeBody}
                  onChange={e => setComposeBody(e.target.value)}
                  placeholder="Type your message…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-2 shrink-0">
              <button onClick={() => setComposeOpen(false)}
                className="flex-1 py-2.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-200 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleComposeSend}
                disabled={composeSending || !composeBody.trim() || selectedParents.length === 0}
                className={clsx('flex-1 py-2.5 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2',
                  composeChannel === 'sms' ? 'bg-green-600 hover:bg-green-700'
                  : composeChannel === 'both' ? 'bg-purple-600 hover:bg-purple-700'
                  : 'bg-indigo-600 hover:bg-indigo-700'
                )}>
                <Send size={14} />
                {composeSending ? 'Sending…' : `Send${selectedParents.length > 1 ? ` to ${selectedParents.length}` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
