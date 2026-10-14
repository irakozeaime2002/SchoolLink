import { Bell, Plus } from 'lucide-react'
import Badge from '../../components/ui/Badge'

const announcements = [
  {
    id: '1',
    title: 'End of term exams schedule published',
    body: 'The exam timetable for Term 3 is now available. Please check the school calendar for details.',
    audience: 'all',
    date: '2 Oct 2025',
    author: 'Headteacher',
  },
  {
    id: '2',
    title: 'Parent-teacher meeting — 10 October',
    body: 'All parents are invited to attend the parent-teacher meeting on 10 October at 14:00.',
    audience: 'parents',
    date: '28 Sep 2025',
    author: 'Headteacher',
  },
  {
    id: '3',
    title: 'Physics homework due tomorrow',
    body: 'S2 A students: complete exercises 4.1–4.5 from the textbook.',
    audience: 'class',
    date: '1 Oct 2025',
    author: 'Mr. Aime',
  },
]

const audienceBadge: Record<string, 'blue' | 'green' | 'yellow'> = {
  all: 'blue',
  parents: 'green',
  class: 'yellow',
}

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 text-sm mt-1">School notices and updates</p>
        </div>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
          <Plus size={16} />
          New Announcement
        </button>
      </div>

      <div className="space-y-3">
        {announcements.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg mt-0.5">
                  <Bell size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-800">{a.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">{a.body}</p>
                  <p className="text-xs text-gray-400 mt-2">{a.author} · {a.date}</p>
                </div>
              </div>
              <Badge label={a.audience} variant={audienceBadge[a.audience]} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
