import { School, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import StatCard from '../../components/ui/StatCard'
import { supabase } from '../../lib/supabase'

export default function AdminDashboard() {
  const [schools, setSchools] = useState<any[]>([])
  const [userCount, setUserCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: schoolData } = await supabase.from('schools').select('*').order('created_at')
      setSchools(schoolData ?? [])
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      setUserCount(count ?? 0)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
        <p className="text-gray-500 text-sm mt-1">All schools using SchoolLink</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard label="Schools Registered" value={loading ? '…' : schools.length} icon={<School size={20} />} color="bg-indigo-50 text-indigo-600" />
        <StatCard label="Total Users" value={loading ? '…' : userCount} icon={<Users size={20} />} color="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">School</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Code</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Address</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Registered</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading
              ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">Loading…</td></tr>
              : schools.length === 0
              ? <tr><td colSpan={4} className="px-5 py-8 text-center text-gray-400">No schools registered yet.</td></tr>
              : schools.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                  <td className="px-5 py-3 text-gray-500">{s.code}</td>
                  <td className="px-5 py-3 text-gray-500">{s.address ?? '—'}</td>
                  <td className="px-5 py-3 text-gray-400">{new Date(s.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  )
}
