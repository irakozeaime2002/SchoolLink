import { Settings } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface GradeRow { label: string; min: number }

interface Settings {
  logo_url: string
  address: string
  pass_mark: number
  grading_system: GradeRow[]
  working_days: string[]
  late_threshold: string
  sms_notifications: boolean
  teachers_can_message_parents: boolean
  parents_can_see_marks: boolean
  parents_can_see_attendance: boolean
}

const defaults: Settings = {
  logo_url: '',
  address: '',
  pass_mark: 50,
  grading_system: [
    { label: 'A', min: 80 }, { label: 'B', min: 70 }, { label: 'C', min: 60 },
    { label: 'D', min: 50 }, { label: 'F', min: 0 },
  ],
  working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  late_threshold: '08:00',
  sms_notifications: false,
  teachers_can_message_parents: true,
  parents_can_see_marks: true,
  parents_can_see_attendance: true,
}

export default function SchoolSettingsPage() {
  const { user } = useAuth()
  const [form, setForm] = useState<Settings>(defaults)
  const [schoolName, setSchoolName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user?.school_id) return
    async function load() {
      const [{ data: school }, { data: settings }] = await Promise.all([
        supabase.from('schools').select('name').eq('id', user!.school_id).single(),
        supabase.from('school_settings').select('*').eq('school_id', user!.school_id).single(),
      ])
      if (school) setSchoolName(school.name)
      if (settings) {
        setForm({
          logo_url: settings.logo_url ?? '',
          address: settings.address ?? '',
          pass_mark: settings.pass_mark,
          grading_system: settings.grading_system,
          working_days: settings.working_days,
          late_threshold: settings.late_threshold,
          sms_notifications: settings.sms_notifications,
          teachers_can_message_parents: settings.teachers_can_message_parents,
          parents_can_see_marks: settings.parents_can_see_marks,
          parents_can_see_attendance: settings.parents_can_see_attendance,
        })
      }
      setLoading(false)
    }
    load()
  }, [user])

  function set<K extends keyof Settings>(key: K, value: Settings[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function toggleDay(day: string) {
    set('working_days', form.working_days.includes(day)
      ? form.working_days.filter(d => d !== day)
      : [...form.working_days, day]
    )
  }

  function updateGrade(i: number, field: keyof GradeRow, value: string | number) {
    const updated = form.grading_system.map((g, idx) => idx === i ? { ...g, [field]: value } : g)
    set('grading_system', updated)
  }

  async function handleSave() {
    if (!user?.school_id) return
    setSaving(true)
    const payload = { ...form, school_id: user.school_id, updated_at: new Date().toISOString() }
    await supabase.from('school_settings').upsert(payload, { onConflict: 'school_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <p className="text-sm text-gray-400">Loading…</p>

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings size={22} className="text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
          <p className="text-sm text-gray-500">{schoolName}</p>
        </div>
      </div>

      {/* School Profile */}
      <Section title="School Profile">
        <Field label="School Name">
          <input
            className="input"
            value={schoolName}
            onChange={e => setSchoolName(e.target.value)}
            onBlur={async () => {
              if (user?.school_id)
                await supabase.from('schools').update({ name: schoolName }).eq('id', user.school_id)
            }}
          />
        </Field>
        <Field label="Address">
          <input className="input" value={form.address} onChange={e => set('address', e.target.value)} />
        </Field>
        <Field label="Logo URL">
          <input className="input" placeholder="https://…" value={form.logo_url} onChange={e => set('logo_url', e.target.value)} />
          {form.logo_url && <img src={form.logo_url} alt="logo" className="mt-2 h-12 rounded object-contain" />}
        </Field>
      </Section>

      {/* Grading */}
      <Section title="Grading System">
        <Field label="Pass Mark (%)">
          <input type="number" className="input w-28" min={0} max={100} value={form.pass_mark}
            onChange={e => set('pass_mark', Number(e.target.value))} />
        </Field>
        <Field label="Grade Thresholds">
          <div className="space-y-2">
            {form.grading_system.map((g, i) => (
              <div key={i} className="flex items-center gap-3">
                <input className="input w-16 text-center font-medium" value={g.label}
                  onChange={e => updateGrade(i, 'label', e.target.value)} />
                <span className="text-sm text-gray-500">min</span>
                <input type="number" className="input w-20" min={0} max={100} value={g.min}
                  onChange={e => updateGrade(i, 'min', Number(e.target.value))} />
                <span className="text-sm text-gray-400">%</span>
              </div>
            ))}
          </div>
        </Field>
      </Section>

      {/* Attendance */}
      <Section title="Attendance Settings">
        <Field label="Working Days">
          <div className="flex gap-2 flex-wrap">
            {DAYS.map(day => (
              <button key={day} type="button"
                onClick={() => toggleDay(day)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  form.working_days.includes(day)
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >{day}</button>
            ))}
          </div>
        </Field>
        <Field label="Late Arrival After">
          <input type="time" className="input w-36" value={form.late_threshold}
            onChange={e => set('late_threshold', e.target.value)} />
        </Field>
      </Section>

      {/* Notifications & Access */}
      <Section title="Notifications & Access">
        <Toggle label="SMS notifications to parents" value={form.sms_notifications}
          onChange={v => set('sms_notifications', v)} />
        <Toggle label="Teachers can message parents" value={form.teachers_can_message_parents}
          onChange={v => set('teachers_can_message_parents', v)} />
        <Toggle label="Parents can see marks" value={form.parents_can_see_marks}
          onChange={v => set('parents_can_see_marks', v)} />
        <Toggle label="Parents can see attendance" value={form.parents_can_see_attendance}
          onChange={v => set('parents_can_see_attendance', v)} />
      </Section>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Saved ✓</span>}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
      <h2 className="text-base font-semibold text-gray-800 border-b border-gray-100 pb-2">{title}</h2>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative w-10 h-5 rounded-full transition-colors ${value ? 'bg-indigo-600' : 'bg-gray-200'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  )
}
