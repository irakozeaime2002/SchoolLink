import { BookOpen, CalendarClock, Plus } from 'lucide-react'
import { useState } from 'react'
import { homeworkSeed, type HomeworkItem } from '../../data/homework'

const priorityStyles: Record<HomeworkItem['priority'], string> = {
  Low: 'bg-emerald-50 text-emerald-700',
  Normal: 'bg-amber-50 text-amber-700',
  High: 'bg-rose-50 text-rose-700',
}

export default function TeacherHomeworkPage() {
  const [items, setItems] = useState<HomeworkItem[]>(homeworkSeed)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    subject: '',
    className: 'S2 A',
    dueDate: '',
    description: '',
    priority: 'Normal' as HomeworkItem['priority'],
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title || !form.subject || !form.dueDate || !form.description) return

    const newItem: HomeworkItem = {
      id: String(Date.now()),
      title: form.title,
      subject: form.subject,
      className: form.className,
      dueDate: form.dueDate,
      description: form.description,
      priority: form.priority,
    }

    setItems((current) => [newItem, ...current])
    setForm({
      title: '',
      subject: '',
      className: 'S2 A',
      dueDate: '',
      description: '',
      priority: 'Normal',
    })
    setShowForm(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
          <p className="text-gray-500 text-sm mt-1">Assign and track learning tasks for your classes.</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={16} />
          {showForm ? 'Close' : 'New Homework'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Reading comprehension"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="English"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <input
                value={form.className}
                onChange={(e) => setForm({ ...form, className: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="S2 A"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Explain what students must do..."
            />
          </div>

          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as HomeworkItem['priority'] })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>

            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              Save Homework
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mt-0.5">
                  <BookOpen size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{item.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{item.subject} · {item.className}</p>
                  <p className="text-sm text-gray-600 mt-2">{item.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[item.priority]}`}>
                  {item.priority}
                </span>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
              <CalendarClock size={14} />
              Due: {new Date(item.dueDate).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
