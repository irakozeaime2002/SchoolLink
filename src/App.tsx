import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './components/layout/AppLayout'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import WelcomePage from './pages/auth/WelcomePage'
import AdminDashboard from './pages/admin/AdminDashboard'
import AcademicYearsPage from './pages/headteacher/AcademicYearsPage'
import ClassDetailPage from './pages/headteacher/ClassDetailPage'
import ClassesPage from './pages/headteacher/ClassesPage'
import HeadteacherDashboard from './pages/headteacher/HeadteacherDashboard'
import StudentDetailPage from './pages/headteacher/StudentDetailPage'
import StudentsPage from './pages/headteacher/StudentsPage'
import SchoolSettingsPage from './pages/headteacher/SchoolSettingsPage'
import SubjectDetailPage from './pages/headteacher/SubjectDetailPage'
import SubjectsPage from './pages/headteacher/SubjectsPage'
import TeachersPage from './pages/headteacher/TeachersPage'
import ParentAttendancePage from './pages/parent/ParentAttendancePage'
import ParentDashboard from './pages/parent/ParentDashboard'
import ParentHomeworkPage from './pages/parent/HomeworkPage'
import ParentProgressPage from './pages/parent/ParentProgressPage'
import AnnouncementsPage from './pages/shared/AnnouncementsPage'
import MessagesPage from './pages/shared/MessagesPage'
import AttendancePage from './pages/teacher/AttendancePage'
import MarksPage from './pages/teacher/MarksPage'
import TeacherClassesPage from './pages/teacher/TeacherClassesPage'
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherHomeworkPage from './pages/teacher/HomeworkPage'
import TeacherStudentDetailPage from './pages/teacher/TeacherStudentDetailPage'
import TeacherStudentsPage from './pages/teacher/TeacherStudentsPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Platform Admin */}
          <Route element={<ProtectedRoute allowedRoles={['platform_admin']} />}>
            <Route element={<AppLayout />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>
          </Route>

          {/* Headteacher */}
          <Route element={<ProtectedRoute allowedRoles={['headteacher']} />}>
            <Route element={<AppLayout />}>
              <Route path="/headteacher" element={<HeadteacherDashboard />} />
              <Route path="/headteacher/academic-years" element={<AcademicYearsPage />} />
              <Route path="/headteacher/teachers" element={<TeachersPage />} />
              <Route path="/headteacher/classes" element={<ClassesPage />} />
              <Route path="/headteacher/classes/:id" element={<ClassDetailPage />} />
              <Route path="/headteacher/students" element={<StudentsPage />} />
              <Route path="/headteacher/students/:id" element={<StudentDetailPage />} />
              <Route path="/headteacher/announcements" element={<AnnouncementsPage />} />
              <Route path="/headteacher/messages" element={<MessagesPage />} />
              <Route path="/headteacher/subjects" element={<SubjectsPage />} />
              <Route path="/headteacher/subjects/:id" element={<SubjectDetailPage />} />
              <Route path="/headteacher/settings" element={<SchoolSettingsPage />} />
            </Route>
          </Route>

          {/* Teacher */}
          <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
            <Route element={<AppLayout />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
              <Route path="/teacher/classes" element={<TeacherClassesPage />} />
              <Route path="/teacher/students" element={<TeacherStudentsPage />} />
              <Route path="/teacher/marks" element={<MarksPage />} />
              <Route path="/teacher/attendance" element={<AttendancePage />} />
              <Route path="/teacher/students/:id" element={<TeacherStudentDetailPage />} />
              <Route path="/teacher/messages" element={<MessagesPage />} />
              <Route path="/teacher/announcements" element={<AnnouncementsPage />} />
              <Route path="/teacher/homework" element={<TeacherHomeworkPage />} />
            </Route>
          </Route>

          {/* Parent */}
          <Route element={<ProtectedRoute allowedRoles={['parent']} />}>
            <Route element={<AppLayout />}>
              <Route path="/parent" element={<ParentDashboard />} />
              <Route path="/parent/progress" element={<ParentProgressPage />} />
              <Route path="/parent/attendance" element={<ParentAttendancePage />} />
              <Route path="/parent/messages" element={<MessagesPage />} />
              <Route path="/parent/announcements" element={<AnnouncementsPage />} />
              <Route path="/parent/homework" element={<ParentHomeworkPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
