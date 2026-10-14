import { Bell, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

type Audience = 'all' | 'teachers' | 'parents' | 'class'

const audienceBadge: Record<string, 'blue' | 'green' | 'yellow' | 'gray'> = {
  all: 'blue', teachers: 'gray', parents: 'green', class: 'yellow',
}

const canCreate = (role: string) => ['headteacher', 'teacher'].includes(role)

export default function AnnouncementsPage() {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' as Audience })
  const [loading, setLoading] = useState(true)

  async function load() {
    if (!user?.school_id) return
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .eq('school_id', user.school_id)
      .order('created_at', { ascending: false })
    setAnnouncements(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  async function handleCreate() {
    if (!form.title.trim() || !form.body.trim()) return
    await supabase.from('announcements').insert({
      school_id: user!.school_id,
      author_id: user!.id,
      title: form.title,
      body: form.body,
      audience: form.audience,
    })
    setForm({ title: '', body: '', audience: 'all' })
    setOpen(false)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">School notices and updates</p>
        </div>
        {user && canCreate(user.role) && (
          <button onClick={() => setOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={16} /> New Announcement
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Loading…</p>}

      {!loading && announcements.length === 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-800">
          No announcements yet.
        </div>
      )}

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mt-0.5 shrink-0">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {a.profiles?.full_name ?? '—'} · {new Date(a.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge label={a.audience} variant={audienceBadge[a.audience]} />
            </div>
          </div>
        ))}
      </div>

      {open && (
        <Modal title="New Announcement" onClose={() => setOpen(false)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Announcement title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea rows={4} value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                placeholder="Write your announcement…" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Audience</label>
              <select value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as Audience }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">Everyone</option>
                <option value="teachers">Teachers only</option>
                <option value="parents">Parents only</option>
                <option value="class">Specific class</option>
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">Publish</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
