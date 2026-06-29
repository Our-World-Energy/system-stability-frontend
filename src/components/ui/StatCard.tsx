import { type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string
  icon: LucideIcon
  trend?: string
  trendUp?: boolean
  accent?: 'green' | 'blue' | 'red' | 'yellow'
}

const accentMap = {
  green: 'bg-green-50 text-green-600',
  blue: 'bg-blue-50 text-blue-600',
  red: 'bg-red-50 text-red-600',
  yellow: 'bg-yellow-50 text-yellow-600',
}

export function StatCard({ label, value, icon: Icon, trend, trendUp, accent = 'green' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={cn('flex size-9 items-center justify-center rounded-lg', accentMap[accent])}>
          <Icon className="size-5" />
        </div>
      </div>
      <p className="mt-3 text-2xl font-bold text-slate-900">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trendUp ? 'text-green-600' : 'text-red-500')}>
          {trendUp ? '↑' : '↓'} {trend}
        </p>
      )}
    </div>
  )
}
