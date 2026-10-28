import { BookOpen, CalendarClock } from 'lucide-react'
import { homeworkSeed, type HomeworkItem } from '../../data/homework'

const priorityStyles: Record<HomeworkItem['priority'], string> = {
  Low: 'bg-emerald-50 text-emerald-700',
  Normal: 'bg-amber-50 text-amber-700',
  High: 'bg-rose-50 text-rose-700',
}

export default function ParentHomeworkPage() {
  const items = homeworkSeed

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Homework</h1>
        <p className="text-gray-500 text-sm mt-1">Check what your child needs to complete this week.</p>
      </div>

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

              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${priorityStyles[item.priority]}`}>
                {item.priority}
              </span>
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
