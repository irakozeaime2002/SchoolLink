import { Bell, ChevronDown, ChevronUp, Download, PencilLine, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { useAuth } from '../../context/AuthContext'
import { useTeacherClasses } from '../../hooks/useTeacherClasses'
import { assessmentTypeLabel, formatAssessmentDate } from '../../lib/assessments'
import { supabase } from '../../lib/supabase'

interface Assessment {
  id: string; title: string; max_score: number; type: string; date: string
  subjectId: string; subjectName: string; classId: string
  termName: string; schoolName: string; academicYear: string; classTeacher: string
}
interface Student { id: string; name: string; classId: string }
type MarksMap = Record<string, Record<string, number>>

export default function AllMarksPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const { classes } = useTeacherClasses()

  const [selectedClass, setSelectedClass] = useState(searchParams.get('class') ?? classes[0]?.id ?? '')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [sortBy, setSortBy] = useState<'name' | 'avg'>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [marksMap, setMarksMap] = useState<MarksMap>({})
  const [loading, setLoading] = useState(false)

  // All-classes data for export
  const [allAssessments, setAllAssessments] = useState<Assessment[]>([])
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [allMarksMap, setAllMarksMap] = useState<MarksMap>({})

  // Alert state
  const [showAlert, setShowAlert] = useState(false)
  const [alertThreshold, setAlertThreshold] = useState(50)
  const [alertCondition, setAlertCondition] = useState<'below' | 'above'>('below')
  const [alertAssessment, setAlertAssessment] = useState('all')
  const [alerting, setAlerting] = useState(false)
  const [alertResult, setAlertResult] = useState('')

  async function handleSendAlerts() {
    setAlerting(true); setAlertResult('')
    const targetAssessments = alertAssessment === 'all' ? filteredAssessments : filteredAssessments.filter(a => a.id === alertAssessment)
    const matched = sortedStudents.filter(s => {
      const scored = targetAssessments.filter(a => marksMap[s.id]?.[a.id] !== undefined)
      const totalScore = scored.reduce((sum, a) => sum + marksMap[s.id][a.id], 0)
      const totalMax = scored.reduce((sum, a) => sum + a.max_score, 0)
      if (!totalMax) return false
      const avg = Math.round((totalScore / totalMax) * 100)
      return alertCondition === 'below' ? avg < alertThreshold : avg >= alertThreshold
    })
    if (matched.length === 0) { setAlertResult('No students match the condition.'); setAlerting(false); return }
    const { data: links } = await supabase.from('parent_students').select('parent_id, student_id').in('student_id', matched.map(s => s.id))
    if (!links || links.length === 0) { setAlertResult('No parents linked to matching students.'); setAlerting(false); return }
    let sent = 0; let failed = 0
    await Promise.all((links as any[]).map(async (link) => {
      const student = matched.find(s => s.id === link.student_id)
      const scored = targetAssessments.filter(a => marksMap[link.student_id]?.[a.id] !== undefined)
      const totalScore = scored.reduce((sum, a) => sum + marksMap[link.student_id][a.id], 0)
      const totalMax = scored.reduce((sum, a) => sum + a.max_score, 0)
      const avg = totalMax ? Math.round((totalScore / totalMax) * 100) : 0
      const assessmentLabel = alertAssessment === 'all' ? 'the current assessments' : `"${targetAssessments[0]?.title}"`
      const assessmentLabelRw = alertAssessment === 'all' ? 'ibigeragezo bya vuba' : `"${targetAssessments[0]?.title}"`
      const scoreLabel = alertAssessment === 'all' ? 'an average score' : 'a mark'
      const scoreLabelRw = alertAssessment === 'all' ? 'amanota y\'ikigereranyo' : 'amanota'
      const body = `Your child ${student?.name} has ${scoreLabel} of ${avg}% in ${assessmentLabel}.\nUmwana wawe ${student?.name} afite ${scoreLabelRw} ya ${avg}% muri ${assessmentLabelRw}.`
      const res = await supabase.functions.invoke('send-sms', { body: { recipient_id: link.parent_id, body } })
      if (res.error || res.data?.error) failed++; else sent++
    }))
    setAlertResult(`Alerts sent: ${sent}${failed > 0 ? `, failed: ${failed}` : ''}.`)
    setAlerting(false)
  }

  useEffect(() => {
    if (classes.length === 0) return
    if (!selectedClass || !classes.some((c) => c.id === selectedClass))
      setSelectedClass(classes[0].id)
  }, [classes])

  async function fetchClassData(classIds: string[]) {
    const [{ data: aData }, { data: sData }] = await Promise.all([
      supabase.from('assessments')
        .select(`id, title, max_score, type, date, class_id,
          subjects(id, name),
          terms(name),
          classes(teacher_id, schools(name), academic_years(name), profiles!classes_teacher_id_fkey(full_name))`)
        .in('class_id', classIds).eq('teacher_id', user!.id)
        .order('date', { ascending: true }),
      supabase.from('students')
        .select('id, full_name, class_id')
        .in('class_id', classIds)
        .order('full_name'),
    ])
    const aList: Assessment[] = (aData ?? []).map((a: any) => ({
      id: a.id, title: a.title, max_score: a.max_score, type: a.type, date: a.date,
      subjectId: a.subjects?.id ?? '', subjectName: a.subjects?.name ?? '',
      classId: a.class_id,
      termName: a.terms?.name ?? '',
      schoolName: a.classes?.schools?.name ?? '',
      academicYear: a.classes?.academic_years?.name ?? '',
      classTeacher: a.classes?.profiles?.full_name ?? '',
    }))
    const sList: Student[] = (sData ?? []).map((s: any) => ({ id: s.id, name: s.full_name, classId: s.class_id }))
    let map: MarksMap = {}
    if (aList.length && sList.length) {
      const { data: mData } = await supabase.from('marks')
        .select('student_id, assessment_id, score')
        .in('assessment_id', aList.map((a) => a.id))
      ;(mData ?? []).forEach((m: any) => {
        if (!map[m.student_id]) map[m.student_id] = {}
        map[m.student_id][m.assessment_id] = m.score
      })
    }
    return { aList, sList, map }
  }

  useEffect(() => {
    if (!user?.id || classes.length === 0) return
    setSearchParams(selectedClass ? { class: selectedClass } : {}, { replace: true })
    setLoading(true)
    setFilterSubject('')
    setFilterType('all')

    const allIds = classes.map((c) => c.id)

    // Fetch selected class for display
    fetchClassData([selectedClass]).then(({ aList, sList, map }) => {
      setAssessments(aList); setStudents(sList); setMarksMap(map)
      setLoading(false)
    })

    // Fetch all classes for export
    fetchClassData(allIds).then(({ aList, sList, map }) => {
      setAllAssessments(aList); setAllStudents(sList); setAllMarksMap(map)
    })
  }, [selectedClass, user?.id, classes])

  const subjects = useMemo(() => {
    const seen = new Map<string, string>()
    assessments.forEach((a) => { if (a.subjectId) seen.set(a.subjectId, a.subjectName) })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [assessments])

  // Auto-select first subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !subjects.some(s => s.id === filterSubject))
      setFilterSubject(subjects[0].id)
  }, [subjects])

  const types = useMemo(() => [...new Set(assessments.map((a) => a.type))], [assessments])

  const filteredAssessments = useMemo(() =>
    assessments.filter((a) =>
      (filterSubject === '' || a.subjectId === filterSubject) &&
      (filterType === 'all' || a.type === filterType)
    ), [assessments, filterSubject, filterType])

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else {
        const avg = (s: Student) => {
          const scores = filteredAssessments.map((a) => marksMap[s.id]?.[a.id]).filter((v) => v !== undefined) as number[]
          if (!scores.length) return -1
          const total = filteredAssessments.reduce((sum, a) => sum + (marksMap[s.id]?.[a.id] !== undefined ? a.max_score : 0), 0)
          return total ? (scores.reduce((s, v) => s + v, 0) / total) * 100 : 0
        }
        cmp = avg(a) - avg(b)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [students, sortBy, sortDir, filteredAssessments, marksMap])

  function handleExport() {
    const wb = XLSX.utils.book_new()
    classes.forEach((cls) => {
      const clsStudents = [...allStudents].filter((s) => s.classId === cls.id).sort((a, b) => a.name.localeCompare(b.name))
      const clsAssessments = allAssessments.filter((a) => a.classId === cls.id)
      const clsSubjects = [...new Map(clsAssessments.map(a => [a.subjectId, a.subjectName])).entries()]

      clsSubjects.forEach(([subjectId, subjectName]) => {
        const subjAssessments = clsAssessments.filter(a => a.subjectId === subjectId)
        if (subjAssessments.length === 0 || clsStudents.length === 0) return

        const meta = subjAssessments[0]
        const terms = [...new Set(subjAssessments.map(a => a.termName).filter(Boolean))].join(', ')

        const metaBlock = [
          ['School', meta?.schoolName ?? ''],
          ['Class', cls.name],
          ['Subject', subjectName],
          ['Academic Year', meta?.academicYear ?? ''],
          ['Term(s)', terms],
          ['Subject Teacher', user?.full_name ?? ''],
          ['Exported', new Date().toLocaleDateString()],
          [],
        ]

        const headers = ['#', 'Student', ...subjAssessments.map((a) => `${a.title} /${a.max_score}`), 'Avg%']
        const rows = clsStudents.map((s, i) => {
          const scored = subjAssessments.filter((a) => allMarksMap[s.id]?.[a.id] !== undefined)
          const totalScore = scored.reduce((sum, a) => sum + allMarksMap[s.id][a.id], 0)
          const totalMax = scored.reduce((sum, a) => sum + a.max_score, 0)
          const avg = totalMax ? Math.round((totalScore / totalMax) * 100) : ''
          return [i + 1, s.name, ...subjAssessments.map((a) => allMarksMap[s.id]?.[a.id] ?? ''), avg]
        })

        const sheetName = `${cls.name} - ${subjectName}`.slice(0, 31)
        const ws = XLSX.utils.aoa_to_sheet([...metaBlock, headers, ...rows])
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
      })
    })
    if (wb.SheetNames.length === 0) return
    XLSX.writeFile(wb, 'All_Classes_marks.xlsx')
  }

  function toggleSort(col: 'name' | 'avg') {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  function SortIcon({ col }: { col: 'name' | 'avg' }) {
    if (sortBy !== col) return <ChevronUp size={14} className="text-gray-300" />
    return sortDir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
  }

  const colCount = filteredAssessments.length + 3

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Recorded Marks</h1>
          <p className="text-gray-500 text-sm mt-1">{sortedStudents.length} students · {filteredAssessments.length} assessments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={filteredAssessments.length === 0 || sortedStudents.length === 0}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-40">
            <Download size={16} /> Export Excel
          </button>
          <button
            onClick={() => { setShowAlert(v => !v); setAlertResult('') }}
            className="flex items-center gap-2 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Bell size={16} /> Alert Parents
          </button>
          <Link to={`/teacher/marks/enter${selectedClass ? `?class=${selectedClass}` : ''}`}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <PencilLine size={16} /> Enter Marks
          </Link>
        </div>
      </div>

      {/* Alert panel */}
      {showAlert && (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-indigo-800">
              Send SMS alert to parents of students whose {alertAssessment === 'all' ? 'average' : 'mark'} is:
            </p>
            <button onClick={() => { setShowAlert(false); setAlertResult('') }} className="text-indigo-500 hover:text-indigo-700"><X size={16} /></button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select value={alertAssessment} onChange={e => setAlertAssessment(e.target.value)}
              className="border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="all">All assessments</option>
              {filteredAssessments.map(a => <option key={a.id} value={a.id}>{a.title} · {a.subjectName}</option>)}
            </select>
            <select value={alertCondition} onChange={e => setAlertCondition(e.target.value as 'below' | 'above')}
              className="border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="below">Below</option>
              <option value="above">At or above</option>
            </select>
            <div className="flex items-center gap-1">
              <input type="number" min={0} max={100} value={alertThreshold} onChange={e => setAlertThreshold(Number(e.target.value))}
                className="w-20 border border-indigo-200 bg-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              <span className="text-sm text-indigo-700">%</span>
            </div>
            <button onClick={handleSendAlerts} disabled={alerting}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors disabled:opacity-50">
              <Bell size={14} />{alerting ? 'Sending…' : 'Send Alerts'}
            </button>
          </div>
          {alertResult && <p className="text-sm text-indigo-800">{alertResult}</p>}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {subjects.length > 1 && (
          <select value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="all">All Types</option>
          {types.map((t) => <option key={t} value={t}>{assessmentTypeLabel(t)}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="text-sm border-collapse" style={{ minWidth: `${Math.max(600, filteredAssessments.length * 110 + 280)}px` }}>
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr className="border-b border-gray-100">
              <th className="sticky left-0 z-10 bg-gray-50 px-5 py-2 w-8" />
              <th className="sticky left-8 z-10 bg-gray-50 px-5 py-2 min-w-[140px]" />
              {filteredAssessments.map((a) => (
                <th key={a.id} className="px-3 py-2 text-center text-xs text-indigo-500 font-medium border-l border-gray-100">
                  {a.subjectName}
                </th>
              ))}
              <th className="px-3 py-2 border-l border-gray-100" />
            </tr>
            <tr className="border-b border-gray-100">
              <th className="sticky left-0 z-10 bg-gray-50 text-left px-5 py-3 text-gray-500 font-medium w-8">#</th>
              <th className="sticky left-8 z-10 bg-gray-50 text-left px-5 py-3 text-gray-500 font-medium min-w-[140px] border-r border-gray-200">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700">
                  Student <SortIcon col="name" />
                </button>
              </th>
              {filteredAssessments.map((a) => (
                <th key={a.id} className="px-3 py-3 text-center text-gray-500 font-medium border-l border-gray-100 min-w-[100px]">
                  <div className="font-medium text-gray-700 truncate max-w-[100px]" title={a.title}>{a.title}</div>
                  <div className="text-xs text-gray-400 font-normal">{assessmentTypeLabel(a.type)} · {formatAssessmentDate(a.date)}</div>
                  <div className="text-xs text-gray-400 font-normal">/ {a.max_score}</div>
                </th>
              ))}
              <th className="px-3 py-3 text-center text-gray-500 font-medium border-l border-gray-100 min-w-[70px]">
                <button onClick={() => toggleSort('avg')} className="flex items-center gap-1 hover:text-gray-700 mx-auto">
                  Avg% <SortIcon col="avg" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              <tr><td colSpan={colCount} className="px-5 py-10 text-center text-gray-400">Loading…</td></tr>
            ) : sortedStudents.length === 0 ? (
              <tr><td colSpan={colCount} className="px-5 py-10 text-center text-gray-400">No students found.</td></tr>
            ) : filteredAssessments.length === 0 ? (
              <tr><td colSpan={colCount} className="px-5 py-10 text-center text-gray-400">No assessments match the selected filters.</td></tr>
            ) : sortedStudents.map((s, i) => {
              const scored = filteredAssessments.filter((a) => marksMap[s.id]?.[a.id] !== undefined)
              const totalScore = scored.reduce((sum, a) => sum + marksMap[s.id][a.id], 0)
              const totalMax = scored.reduce((sum, a) => sum + a.max_score, 0)
              const avg = totalMax ? Math.round((totalScore / totalMax) * 100) : null
              return (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="sticky left-0 z-10 bg-white px-5 py-3 text-gray-400">{i + 1}</td>
                  <td className="sticky left-8 z-10 bg-white px-5 py-3 font-medium text-gray-800 border-r border-gray-200">{s.name}</td>
                  {filteredAssessments.map((a) => {
                    const score = marksMap[s.id]?.[a.id]
                    const pct = score !== undefined ? Math.round((score / a.max_score) * 100) : null
                    return (
                      <td key={a.id} className="px-3 py-3 text-center border-l border-gray-50">
                        {score !== undefined ? (
                          <span className={`font-medium ${pct! >= 70 ? 'text-green-600' : pct! >= 50 ? 'text-yellow-600' : 'text-red-500'}`}>
                            {score}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="px-3 py-3 text-center border-l border-gray-100 font-medium">
                    {avg !== null ? (
                      <span className={avg >= 70 ? 'text-green-600' : avg >= 50 ? 'text-yellow-600' : 'text-red-500'}>
                        {avg}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
