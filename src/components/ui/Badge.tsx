import { clsx } from 'clsx'

const variants = {
  green: 'bg-green-100 text-green-700',
  red: 'bg-red-100 text-red-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  blue: 'bg-blue-100 text-blue-700',
  gray: 'bg-gray-100 text-gray-600',
}

export type BadgeVariant = keyof typeof variants

interface BadgeProps {
  label: string
  variant?: BadgeVariant
}

export default function Badge({ label, variant = 'gray' }: BadgeProps) {
  return (
    <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', variants[variant])}>
      {label}
    </span>
  )
}
