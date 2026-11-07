import { Bell, Plus, Send } from 'lucide-react'
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
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' as Audience, delivery: 'platform' as 'platform' | 'sms' | 'both', class_id: '' })
  const [publishing, setPublishing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])

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

  useEffect(() => {
    load()
    if (user?.school_id) {
      supabase.from('classes').select('id, name').eq('school_id', user.school_id).order('name')
        .then(({ data }) => setClasses(data ?? []))
    }
  }, [user])

  async function handleCreate() {
    if (!form.title.trim() || !form.body.trim()) return
    setPublishing(true)
    await supabase.from('announcements').insert({
      school_id: user!.school_id,
      author_id: user!.id,
      title: form.title,
      body: form.body,
      audience: form.audience,
      ...(form.audience === 'class' && form.class_id ? { class_id: form.class_id } : {}),
    })
    if (form.delivery === 'sms' || form.delivery === 'both') {
      const recipientIds: string[] = []

      if (form.audience === 'teachers' || form.audience === 'all') {
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id')
          .eq('school_id', user!.school_id)
          .eq('role', 'teacher')
        teachers?.forEach((t: any) => recipientIds.push(t.id))
      }

      if (form.audience !== 'teachers') {
        let studentQuery = supabase.from('students').select('id').eq('school_id', user!.school_id).eq('status', 'active')
        if (form.audience === 'class' && form.class_id) studentQuery = studentQuery.eq('class_id', form.class_id)
        const { data: students } = await studentQuery
        if (students?.length) {
          const { data: links } = await supabase
            .from('parent_students')
            .select('parent_id')
            .in('student_id', students.map((s: any) => s.id))
          links?.forEach((l: any) => recipientIds.push(l.parent_id))
        }
      }

      const uniqueRecipients = [...new Set(recipientIds)]
      const smsBody = `${form.title}\n${form.body}\n\nMakuru: ${form.title}\n${form.body}`
      await Promise.all(uniqueRecipients.map((pid) =>
        supabase.functions.invoke('send-sms', { body: { recipient_id: pid, body: smsBody } })
      ))
    }
    setForm({ title: '', body: '', audience: 'all', delivery: 'platform', class_id: '' })
    setPublishing(false)
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
              <select value={form.audience} onChange={(e) => setForm((p) => ({ ...p, audience: e.target.value as Audience, class_id: '' }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">Everyone</option>
                <option value="teachers">Teachers only</option>
                <option value="parents">Parents only</option>
                <option value="class">Specific class</option>
              </select>
            </div>
            {form.audience === 'class' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select class</label>
                <select value={form.class_id} onChange={(e) => setForm((p) => ({ ...p, class_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— choose a class —</option>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Delivery</label>
              <div className="flex gap-2">
                {(['platform', 'sms', 'both'] as const).map((d) => (
                  <button key={d} type="button"
                    onClick={() => setForm((p) => ({ ...p, delivery: d }))}
                    className={`flex-1 py-1.5 text-sm rounded-lg border font-medium transition-colors ${
                      form.delivery === d
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-indigo-400'
                    }`}>
                    {d === 'platform' ? 'Platform only' : d === 'sms' ? 'SMS only' : 'Both'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleCreate} disabled={publishing || (form.audience === 'class' && !form.class_id)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
                {publishing ? 'Publishing…' : <><Send size={14} /> Publish</>}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
