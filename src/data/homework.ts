export type HomeworkItem = {
  id: string
  title: string
  subject: string
  className: string
  dueDate: string
  description: string
  priority: 'Low' | 'Normal' | 'High'
}

export const homeworkSeed: HomeworkItem[] = [
  {
    id: '1',
    title: 'Algebra practice',
    subject: 'Mathematics',
    className: 'S2 A',
    dueDate: '2026-10-30',
    description: 'Complete exercises 4.1 to 4.5 in the mathematics workbook and revise quadratic equations.',
    priority: 'High',
  },
  {
    id: '2',
    title: 'Lab observation notes',
    subject: 'Physics',
    className: 'S2 A',
    dueDate: '2026-11-02',
    description: 'Write a short reflection on today’s electricity experiment and explain the observed results.',
    priority: 'Normal',
  },
  {
    id: '3',
    title: 'Reading comprehension task',
    subject: 'English',
    className: 'S2 B',
    dueDate: '2026-11-04',
    description: 'Read the passage in unit 6 and answer all comprehension questions in full sentences.',
    priority: 'Normal',
  },
]
