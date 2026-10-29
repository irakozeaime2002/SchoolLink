interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  color?: string
}

export default function StatCard({ label, value, icon, color = 'bg-indigo-50 text-indigo-600' }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${color}`}>{icon}</div>
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
    </div>
  )
}
