import { clsx } from 'clsx'
import { Plus, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

interface Conversation { id: string; name: string; lastMessage: string; time: string; unread: number }
interface Message { id: string; body: string; mine: boolean; time: string; channel: string }
interface Parent { id: string; full_name: string; phone: string | null }

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [thread, setThread] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [channel, setChannel] = useState<'platform' | 'sms'>('platform')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newOpen, setNewOpen] = useState(false)
  const [parents, setParents] = useState<Parent[]>([])
  const [selectedParent, setSelectedParent] = useState('')
  const [parentSearch, setParentSearch] = useState('')
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
      id: m.id,
      body: m.body,
      mine: m.sender_id === user.id,
      time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channel: m.channel ?? 'platform',
    })))

    await supabase.from('messages').update({ read: true })
      .eq('sender_id', otherId).eq('recipient_id', user.id).eq('read', false)
  }

  async function loadParents() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, phone')
      .eq('school_id', user.school_id)
      .eq('role', 'parent')
      .order('full_name')
    setParents(data ?? [])
  }

  useEffect(() => { loadConversations() }, [user])
  useEffect(() => { if (activeId) loadThread(activeId) }, [activeId])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread])

  async function handleSend() {
    if (!input.trim() || !activeId || !user?.id) return
    setSending(true)
    if (channel === 'sms') {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-sms`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ recipient_id: activeId, body: input.trim() }),
        }
      )
      const result = await res.json()
      if (!res.ok) { alert(result?.error ?? 'SMS failed'); setSending(false); return }
    } else {
      await supabase.from('messages').insert({
        school_id: user.school_id,
        sender_id: user.id,
        recipient_id: activeId,
        body: input.trim(),
        channel: 'platform',
      })
    }
    setInput('')
    setSending(false)
    loadThread(activeId)
    loadConversations()
  }

  async function handleNewConversation() {
    if (!selectedParent || !user?.id) return
    // If conversation already exists just open it
    const existing = conversations.find((c) => c.id === selectedParent)
    if (existing) { setActiveId(selectedParent); setNewOpen(false); return }
    setActiveId(selectedParent)
    setNewOpen(false)
    setParentSearch('')
    setSelectedParent('')
    await loadConversations()
  }

  function openNew() {
    loadParents()
    setSelectedParent('')
    setParentSearch('')
    setNewOpen(true)
  }

  const active = conversations.find((c) => c.id === activeId)
  const filteredParents = parents.filter((p) =>
    p.full_name.toLowerCase().includes(parentSearch.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="text-gray-500 text-sm mt-1">Conversations with parents</p>
        </div>
        {isStaff && (
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus size={16} />
            New Message
          </button>
        )}
      </div>

      {!loading && conversations.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          {isStaff ? 'No conversations yet. Click "New Message" to contact a parent.' : 'No conversations yet.'}
        </div>
      )}

      {(conversations.length > 0 || activeId) && (
        <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: '70vh' }}>
          {/* Conversation list */}
          <div className="w-72 border-r border-gray-100 flex flex-col shrink-0">
            <div className="p-3 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Conversations
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <button key={c.id} onClick={() => setActiveId(c.id)}
                  className={clsx('w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors', activeId === c.id && 'bg-indigo-50')}>
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

          {/* Thread */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-800">{active?.name ?? '—'}</p>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {thread.map((m) => (
                <div key={m.id} className={clsx('flex', m.mine ? 'justify-end' : 'justify-start')}>
                  <div className={clsx('max-w-xs lg:max-w-md px-4 py-2.5 rounded-2xl text-sm',
                    m.mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-gray-100 text-gray-800 rounded-bl-sm')}>
                    <p>{m.body}</p>
                    <p className={clsx('text-xs mt-1 flex items-center gap-1', m.mine ? 'text-indigo-200' : 'text-gray-400')}>
                      {m.channel === 'sms' && <span className="bg-green-500 text-white text-[10px] px-1 rounded">SMS</span>}
                      {m.time}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="px-4 py-3 border-t border-gray-100 space-y-2">
              {isStaff && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setChannel('platform')}
                    className={clsx('flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors border',
                      channel === 'platform' ? 'bg-indigo-600 text-white border-indigo-600' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    Platform
                  </button>
                  <button
                    onClick={() => setChannel('sms')}
                    className={clsx('flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors border',
                      channel === 'sms' ? 'bg-green-600 text-white border-green-600' : 'text-gray-500 border-gray-200 hover:bg-gray-50'
                    )}
                  >
                    SMS
                  </button>
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={channel === 'sms' ? 'Type SMS message…' : 'Type a message…'}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <button onClick={handleSend} disabled={sending}
                  className={clsx('text-white p-2 rounded-lg transition-colors disabled:opacity-50',
                    channel === 'sms' ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  )}>
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Message Modal — parent picker */}
      {newOpen && (
        <Modal title="New Message" onClose={() => setNewOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Parent</label>
              <input
                type="text"
                placeholder="Search by name…"
                value={parentSearch}
                onChange={(e) => setParentSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2"
              />
              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                {filteredParents.length === 0
                  ? <p className="text-sm text-gray-400 text-center py-6">No parents found.</p>
                  : filteredParents.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedParent(p.id)}
                      className={clsx('w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 hover:bg-gray-50 transition-colors',
                        selectedParent === p.id && 'bg-indigo-50 text-indigo-700 font-medium'
                      )}
                    >
                      <p>{p.full_name}</p>
                      {p.phone && <p className="text-xs text-gray-400">{p.phone}</p>}
                    </button>
                  ))
                }
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setNewOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleNewConversation}
                disabled={!selectedParent}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Open Conversation
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
