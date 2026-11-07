import { FileText, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const CLOUDINARY_CLOUD = 'iybwg24c'
const CLOUDINARY_PRESET = 'lesson_plans'

interface LessonPlan {
  id: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  plan_date: string | null
  class_ids: string[] | null
  subject_id: string | null
  created_at: string
  subjects: { name: string } | null
  lesson_plan_classes: { class_id: string; classes: { name: string } }[]
}

export default function LessonPlansPage() {
  const { user } = useAuth()

  const [plans, setPlans] = useState<LessonPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([])
  const [subjectClasses, setSubjectClasses] = useState<{ id: string; name: string }[]>([])

  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subjectId, setSubjectId] = useState('')
  const [selectedClasses, setSelectedClasses] = useState<string[]>([])
  const [planDate, setPlanDate] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function load() {
    if (!user?.id) return
    const { data } = await supabase
      .from('lesson_plans')
      .select('*, subjects(name), lesson_plan_classes(class_id, classes(name))')
      .eq('teacher_id', user.id)
      .order('created_at', { ascending: false })
    setPlans((data ?? []) as LessonPlan[])
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  useEffect(() => {
    if (!user?.id) return
    supabase.from('class_subjects').select('subjects(id, name)').eq('teacher_id', user.id)
      .then(({ data }) => {
        const seen = new Map<string, string>()
        ;(data ?? []).forEach((r: any) => { if (r.subjects) seen.set(r.subjects.id, r.subjects.name) })
        setSubjects(Array.from(seen.entries()).map(([id, name]) => ({ id, name })))
      })
  }, [user?.id])

  async function handleSubjectChange(sid: string) {
    setSubjectId(sid)
    setSelectedClasses([])
    if (!sid) { setSubjectClasses([]); return }
    const { data } = await supabase
      .from('class_subjects')
      .select('classes(id, name)')
      .eq('subject_id', sid)
      .eq('teacher_id', user!.id)
    setSubjectClasses((data ?? []).map((r: any) => r.classes).filter(Boolean))
  }

  function toggleClass(id: string) {
    setSelectedClasses(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function resetModal() {
    setTitle(''); setDescription(''); setSubjectId(''); setSelectedClasses([])
    setPlanDate(''); setSubjectClasses([])
    setFile(null); setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleUpload() {
    if (!title.trim() || !file) { setError('Title and file are required.'); return }
    setUploading(true); setError('')

    const form = new FormData()
    form.append('file', file)
    form.append('upload_preset', CLOUDINARY_PRESET)
    form.append('folder', 'lesson_plans')

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/auto/upload`, {
      method: 'POST', body: form,
    })
    const json = await res.json()
    if (!res.ok || !json.secure_url) { setError(json.error?.message ?? 'Upload failed.'); setUploading(false); return }

    // For PDFs: ensure inline delivery by inserting fl_attachment:false
    const fileUrl = json.secure_url.replace('/upload/', '/upload/fl_attachment:false/')

    const { data: plan, error: dbErr } = await supabase.from('lesson_plans').insert({
      school_id: user!.school_id,
      teacher_id: user!.id,
      title: title.trim(),
      description: description.trim() || null,
      subject_id: subjectId || null,
      plan_date: planDate || null,
      file_url: fileUrl,
      file_name: file.name,
    }).select('id').single()
    if (dbErr || !plan) { setError(dbErr?.message ?? 'Save failed.'); setUploading(false); return }

    if (selectedClasses.length > 0) {
      await supabase.from('lesson_plan_classes').insert(
        selectedClasses.map(cid => ({ lesson_plan_id: plan.id, class_id: cid }))
      )
    }

    setUploading(false)
    setShowModal(false)
    resetModal()
    load()
  }

  function getViewUrl(fileUrl: string, fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return fileUrl
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this lesson plan?')) return
    await supabase.from('lesson_plans').delete().eq('id', id)
    setPlans(p => p.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lesson Plans</h1>
          <p className="text-gray-500 text-sm mt-1">{plans.length} uploaded</p>
        </div>
        <button
          onClick={() => { resetModal(); setShowModal(true) }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Upload size={16} /> Upload Plan
        </button>
      </div>

      {loading ? (
        <p className="text-gray-400 text-sm">Loading…</p>
      ) : plans.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          No lesson plans uploaded yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
          {plans.map(p => (
            <div key={p.id} className="flex items-start justify-between px-5 py-4 hover:bg-gray-50">
              <div className="flex items-start gap-3">
                <FileText size={20} className="text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-gray-800">{p.title}</p>
                  {p.description && <p className="text-sm text-gray-500 mt-0.5">{p.description}</p>}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {p.subjects && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{p.subjects.name}</span>}
                    {p.lesson_plan_classes?.map(lpc => (
                      <span key={lpc.class_id} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{lpc.classes?.name}</span>
                    ))}
                    {p.plan_date && <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{p.plan_date}</span>}
                    <span className="text-xs text-gray-400">{p.file_name}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <a href={getViewUrl(p.file_url, p.file_name)} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-indigo-600 hover:underline">View</a>
                <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upload Lesson Plan</h2>
              <button onClick={() => { setShowModal(false); resetModal() }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. Week 3 - Fractions" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  placeholder="Optional notes…" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <select value={subjectId} onChange={e => handleSubjectChange(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">— Select subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              {subjectClasses.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Classes</label>
                  <div className="flex flex-wrap gap-2">
                    {subjectClasses.map(c => (
                      <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                        className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                          selectedClasses.includes(c.id)
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-400'
                        }`}>
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={planDate} onChange={e => setPlanDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">File * (PDF, Word, PPT…)</label>
                <input ref={fileRef} type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setShowModal(false); resetModal() }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleUpload} disabled={uploading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                <Upload size={15} />{uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
