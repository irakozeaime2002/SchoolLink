import {
  ArrowRight,
  Bell,
  BookOpen,
  CalendarCheck,
  GraduationCap,
  MessageSquare,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const features = [
  {
    icon: TrendingUp,
    title: 'Academic Progress',
    desc: "Parents can follow marks and subject averages without waiting for report cards.",
    color: 'feature-icon-blue',
  },
  {
    icon: CalendarCheck,
    title: 'Attendance Tracking',
    desc: 'Teachers record attendance digitally, helping families stay informed.',
    color: 'feature-icon-green',
  },
  {
    icon: MessageSquare,
    title: 'Direct Messaging',
    desc: 'Teachers and headteachers can communicate with parents through the platform.',
    color: 'feature-icon-purple',
  },
  {
    icon: Bell,
    title: 'School Announcements',
    desc: 'Share important updates with parents, teachers, and specific classes.',
    color: 'feature-icon-orange',
  },
  {
    icon: Users,
    title: 'Class Management',
    desc: 'Manage classes, assign teachers, and follow school-wide performance.',
    color: 'feature-icon-blue',
  },
  {
    icon: Shield,
    title: 'Secure & Private',
    desc: 'Role-based access helps keep school information visible to the right people.',
    color: 'feature-icon-green',
  },
]

const roles = [
  {
    icon: GraduationCap,
    title: 'Headteachers',
    desc: 'Manage teachers, classes, and students while keeping an eye on school performance.',
    color: 'role-card-indigo',
  },
  {
    icon: BookOpen,
    title: 'Teachers',
    desc: 'Record marks and attendance, track student progress, and connect with parents.',
    color: 'role-card-orange',
  },
  {
    icon: Users,
    title: 'Parents',
    desc: "Follow your child's progress, attendance, and school updates in one place.",
    color: 'role-card-blue',
  },
]

const stats = [
  { value: '3', label: 'School roles supported' },
  { value: '1', label: 'Connected platform' },
  { value: 'SMS', label: 'Parent updates' },
]

export default function WelcomePage() {
  const navigate = useNavigate()

  return (
    <main className="welcome-page">
      <nav className="welcome-nav">
        <a className="welcome-brand" href="#home" aria-label="SchoolLink home">
          <span className="welcome-brand-icon">
            <GraduationCap size={24} />
          </span>
          <span>School<span className="welcome-brand-accent">Link</span></span>
        </a>

        <div className="welcome-nav-links">
          <a href="#features">Platform</a>
          <a href="#roles">For schools</a>
          <a href="#about">About</a>
        </div>

        <div className="welcome-nav-actions">
          <button className="welcome-signin" onClick={() => navigate('/login')}>
            Sign in
          </button>
          <button className="welcome-nav-cta" onClick={() => navigate('/login')}>
            Get started <ArrowRight size={16} />
          </button>
        </div>
      </nav>

      <section id="home" className="welcome-hero">
        <div className="welcome-hero-inner">
          <div className="welcome-hero-copy">
            <div className="welcome-eyebrow welcome-enter">
              <span className="welcome-eyebrow-dot" />
              Built for Rwandan schools
            </div>

            <h1 className="welcome-enter welcome-delay-1">
              One school.
              <br />
              <span>One connected</span>
              <br />
              community.
            </h1>

            <p className="welcome-hero-description welcome-enter welcome-delay-2">
              SchoolLink brings headteachers, teachers, and parents together
              with tools for learning, attendance, and communication.
            </p>

            <div className="welcome-hero-actions welcome-enter welcome-delay-3">
              <button
                className="welcome-button-primary"
                onClick={() => navigate('/login')}
              >
                Get started <ArrowRight size={18} />
              </button>
              <a className="welcome-button-secondary" href="#features">
                Explore the platform
              </a>
            </div>

            <div className="welcome-trust-note welcome-enter welcome-delay-3">
              <span className="welcome-trust-check">✓</span>
              A clearer connection between home and school
            </div>
          </div>

          <aside className="welcome-hero-card welcome-float" aria-label="SchoolLink overview">
            <div className="welcome-card-photo">
              <div className="welcome-card-label">
                <span className="welcome-live-dot" />
                SCHOOL & FAMILY
              </div>
              <div className="welcome-photo-caption">
                Better communication.
                <br />
                More connected learning.
              </div>
            </div>

            <div className="welcome-card-content">
              <div>
                <span className="welcome-card-kicker">WELCOME TO</span>
                <h2>SchoolLink</h2>
                <p>Everything your school community needs, together.</p>
              </div>
              <span className="welcome-card-arrow">
                <ArrowRight size={20} />
              </span>
            </div>

            <div className="welcome-card-footer">
              <span><span className="welcome-footer-dot" /> Headteachers</span>
              <span><span className="welcome-footer-dot" /> Teachers</span>
              <span><span className="welcome-footer-dot" /> Parents</span>
            </div>
          </aside>
        </div>

        <div className="welcome-stats">
          {stats.map((stat) => (
            <div className="welcome-stat" key={stat.label}>
              <span className="welcome-stat-value">{stat.value}</span>
              <span className="welcome-stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="welcome-section welcome-features">
        <div className="welcome-section-heading">
          <span className="welcome-section-kicker">ONE PLACE FOR YOUR SCHOOL</span>
          <h2>School life, working better together.</h2>
          <p>
            Practical tools that make it easier for your school community to
            stay informed and connected.
          </p>
        </div>

        <div className="welcome-feature-grid">
          {features.map((feature, index) => {
            const Icon = feature.icon

            return (
              <article
                className="welcome-feature-card"
                key={feature.title}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <span className={`welcome-feature-icon ${feature.color}`}>
                  <Icon size={22} />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
                <span className="welcome-feature-link" aria-hidden="true">
                  <ArrowRight size={17} />
                </span>
              </article>
            )
          })}
        </div>
      </section>

      <section id="roles" className="welcome-section welcome-roles">
        <div className="welcome-section-heading">
          <span className="welcome-section-kicker">MADE FOR YOUR COMMUNITY</span>
          <h2>One platform. Every perspective.</h2>
          <p>Each person gets tools designed around their role in the school.</p>
        </div>

        <div className="welcome-role-grid">
          {roles.map((role) => {
            const Icon = role.icon

            return (
              <article className={`welcome-role-card ${role.color}`} key={role.title}>
                <span className="welcome-role-icon">
                  <Icon size={25} />
                </span>
                <h3>{role.title}</h3>
                <p>{role.desc}</p>
              </article>
            )
          })}
        </div>
      </section>

      <section id="about" className="welcome-cta">
        <div>
          <span className="welcome-section-kicker">LET'S GET CONNECTED</span>
          <h2>Bring your school community closer.</h2>
          <p>Sign in with your school account to get started with SchoolLink.</p>
        </div>
        <button
          className="welcome-button-primary"
          onClick={() => navigate('/login')}
        >
          Sign in to SchoolLink <ArrowRight size={18} />
        </button>
      </section>

      <footer className="welcome-footer">
        <a className="welcome-brand welcome-footer-brand" href="#home">
          <span className="welcome-brand-icon">
            <GraduationCap size={21} />
          </span>
          <span>School<span className="welcome-brand-accent">Link</span></span>
        </a>
        <p>© {new Date().getFullYear()} SchoolLink · Built for Rwanda</p>
        <button onClick={() => navigate('/login')}>Sign in <ArrowRight size={15} /></button>
      </footer>
    </main>
  )
}