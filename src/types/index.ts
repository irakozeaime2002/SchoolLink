export type Role = 'platform_admin' | 'headteacher' | 'teacher' | 'parent'

export interface User {
  id: string
  email: string
  full_name: string
  role: Role
  school_id: string | null
  avatar_url?: string
}

export interface School {
  id: string
  name: string
  code: string
  address?: string
  created_at: string
}

export interface AcademicYear {
  id: string
  school_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

export interface Term {
  id: string
  academic_year_id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

export interface Class {
  id: string
  school_id: string
  name: string
  academic_year_id: string
  teacher_id?: string
}

export interface Subject {
  id: string
  school_id: string
  name: string
  code?: string
}

export interface Student {
  id: string
  school_id: string
  full_name: string
  date_of_birth?: string
  class_id: string
  status: 'active' | 'transferred' | 'graduated'
  photo_url?: string
}

export interface Parent {
  id: string
  user_id: string
  full_name: string
  phone?: string
}

export interface ParentStudent {
  parent_id: string
  student_id: string
}

export interface Assessment {
  id: string
  subject_id: string
  class_id: string
  term_id: string
  title: string
  type: 'quiz' | 'assignment' | 'test' | 'exam' | 'project' | 'practical'
  max_score: number
  date: string
}

export interface Mark {
  id: string
  assessment_id: string
  student_id: string
  score: number
  comment?: string
}

export interface AttendanceRecord {
  id: string
  student_id: string
  class_id: string
  date: string
  status: 'present' | 'absent' | 'late' | 'excused'
  note?: string
}

export interface Announcement {
  id: string
  school_id: string
  author_id: string
  title: string
  body: string
  audience: 'all' | 'teachers' | 'parents' | 'class'
  class_id?: string
  created_at: string
}

export interface Message {
  id: string
  school_id: string
  sender_id: string
  recipient_id: string
  body: string
  read: boolean
  created_at: string
}
