import {
  Bell,
  BookOpen,
  CalendarCheck,
  ChevronRight,
  GraduationCap,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const features = [
  {
    icon: <TrendingUp size={24} />,
    title: 'Academic Progress',
    desc: 'Parents see their child\'s marks and subject averages in real time — no waiting for report cards.',
    color: 'bg-indigo-50 text-indigo-600',
  },
  {
    icon: <CalendarCheck size={24} />,
    title: 'Attendance Tracking',
    desc: 'Teachers record daily attendance digitally. Parents are always informed about absences.',
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: <MessageSquare size={24} />,
    title: 'Direct Messaging',
    desc: 'Teachers and headteachers communicate with parents via platform messages or SMS.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: <Bell size={24} />,
    title: 'Announcements',
    desc: 'School announcements reach all parents, teachers, or specific classes instantly.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: <Users size={24} />,
    title: 'Class Management',
    desc: 'Headteachers manage classes, assign teachers, and track school-wide performance.',
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: <Shield size={24} />,
    title: 'Secure & Private',
    desc: 'Role-based access ensures each user only sees what they\'re supposed to see.',
    color: 'bg-rose-50 text-rose-600',
  },
]

const roles = [
  {
    icon: <GraduationCap size={28} />,
    title: 'Headteacher',
    desc: 'Full school overview — manage teachers, classes, students, and monitor performance across all subjects.',
    color: 'border-indigo-200 bg-indigo-50',
    iconColor: 'bg-indigo-600 text-white',
  },
  {
    icon: <BookOpen size={28} />,
    title: 'Teacher',
    desc: 'Record marks and attendance, track student progress, log interventions, and communicate with parents.',
    color: 'border-emerald-200 bg-emerald-50',
    iconColor: 'bg-emerald-600 text-white',
  },
  {
    icon: <Users size={28} />,
    title: 'Parent',
    desc: 'Monitor your child\'s academic progress, attendance, and receive messages from school — on your phone.',
    color: 'border-blue-200 bg-blue-50',
    iconColor: 'bg-blue-600 text-white',
  },
]

const stats = [
  { value: '4', label: 'User Roles' },
  { value: 'SMS', label: 'Parent Alerts' },
  { value: '100%', label: 'Rwanda-focused' },
  { value: 'RLS', label: 'Secure by Default' },
]

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 flex items-center justify-between px-6 sm:px-10 py-4">
        <div className="flex items-center gap-2 text-indigo-700">
          <GraduationCap size={26} />
          <span className="text-lg font-bold tracking-tight">SchoolLink</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gray-600 hover:text-indigo-600 font-medium transition-colors"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate('/login')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-indigo-600 text-white px-6 sm:px-10 py-20 sm:py-28 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-indigo-200 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
            Built for Rwandan Schools
          </div>
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight mb-6">
            Connecting Schools,<br />
            <span className="text-indigo-300">Empowering Parents</span>
          </h1>
          <p className="text-indigo-200 text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            SchoolLink is a modern school management platform that brings headteachers, teachers, and parents together — with real-time progress tracking, attendance, and direct communication.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/login')}
              className="flex items-center justify-center gap-2 bg-white text-indigo-700 font-semibold px-7 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-base"
            >
              Get Started <ChevronRight size={18} />
            </button>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-medium px-7 py-3 rounded-xl transition-colors text-base"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-indigo-700 text-white px-6 sm:px-10 py-8">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-extrabold">{s.value}</p>
              <p className="text-indigo-200 text-sm mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 sm:px-10 py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything your school needs</h2>
            <p className="text-gray-500 mt-3 text-base max-w-xl mx-auto">
              One platform for academic management, communication, and parent engagement.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => (
              <div key={f.title} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className={`${f.color} p-3 rounded-xl inline-block mb-4`}>{f.icon}</div>
                <h3 className="font-semibold text-gray-900 text-base mb-2">{f.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who is it for */}
      <section className="px-6 sm:px-10 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Built for everyone in the school</h2>
            <p className="text-gray-500 mt-3 text-base">Each role has a tailored experience.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {roles.map((r) => (
              <div key={r.title} className={`rounded-xl border p-6 ${r.color}`}>
                <div className={`${r.iconColor} p-3 rounded-xl inline-block mb-4`}>{r.icon}</div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{r.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-indigo-900 to-indigo-700 text-white px-6 sm:px-10 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4">Ready to get started?</h2>
          <p className="text-indigo-200 text-base mb-8">
            Sign in with your school credentials or contact your headteacher to get access.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-white text-indigo-700 font-semibold px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg text-base"
          >
            Sign In Now
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 px-6 sm:px-10 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white">
            <GraduationCap size={20} />
            <span className="font-bold">SchoolLink</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} SchoolLink · Built for Rwanda 🇷🇼</p>
          <button onClick={() => navigate('/login')} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">
            Sign In →
          </button>
        </div>
      </footer>

    </div>
  )
}
