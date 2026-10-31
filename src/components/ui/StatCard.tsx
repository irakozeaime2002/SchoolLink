interface StatCardProps {
  label: string
  value: React.ReactNode
  icon: React.ReactNode
  color?: string
}

export default function StatCard({
  label,
  value,
  icon,
  color = 'bg-indigo-50 text-indigo-600',
}: StatCardProps) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className={`shrink-0 rounded-lg p-2 ${color}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm leading-tight text-gray-500">{label}</p>
        <p className="mt-1 text-xl font-bold leading-tight text-gray-800">{value}</p>
      </div>
    </div>
  )
}