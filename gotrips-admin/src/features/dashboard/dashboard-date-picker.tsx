import { useState } from 'react'
import { DateRangeCalendar } from '@/components/common/date-range-calendar'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'
import { isDashboardDateRange } from './dashboard-filters'

export function DashboardDatePicker({ today, initial, onApply }: {
  today: string
  initial?: { from: string; to: string }
  onApply: (from: string, to: string) => void
}) {
  const [draft, setDraft] = useState<{ from?: string; to?: string }>(initial ?? {})
  const { from, to } = draft
  const canApply = !!(from && to && isDashboardDateRange(from, to, today))
  return (
    <div className="space-y-2">
      <DateRangeCalendar from={from} to={to} latestDate={today} onChange={(from, to) => setDraft({ from, to })} />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {from && to ? `${formatDate(from)} – ${formatDate(to)}` : 'Chọn ngày bắt đầu và kết thúc'}
      </p>
      {from && to && !canApply && <p role="alert" className="text-sm text-destructive">Khoảng ngày tối đa là 366 ngày.</p>}
      <Button type="button" size="sm" disabled={!canApply} onClick={() => {
        if (from && to && canApply) onApply(from, to)
      }}>Áp dụng</Button>
    </div>
  )
}
