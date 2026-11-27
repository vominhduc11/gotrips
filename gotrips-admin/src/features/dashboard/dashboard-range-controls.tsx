import { CalendarDays } from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@/lib/format'
import type { DashboardPreset, DashboardRange } from './dashboard-filters'

const DashboardDatePicker = lazy(async () => ({
  default: (await import('./dashboard-date-picker')).DashboardDatePicker,
}))
const presets: DashboardPreset[] = ['7', '30', '90']

export function DashboardRangeControls({ value, today, dates, onChange }: {
  value: DashboardRange
  today: string
  dates: { from: string; to: string }
  onChange: (value: DashboardRange) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Khoảng thống kê">
        {presets.map((range) => (
          <Button key={range} type="button" size="sm" variant={value.range === range ? 'default' : 'outline'}
            aria-pressed={value.range === range} onClick={() => onChange({ range })}>{range} ngày</Button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant={value.range === 'custom' ? 'default' : 'outline'}
              aria-pressed={value.range === 'custom'}>
              <CalendarDays aria-hidden="true" /> Tuỳ chọn
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label="Khoảng ngày tuỳ chọn">
            {open && (
              <Suspense fallback={<Skeleton className="h-64 w-56" aria-label="Đang tải lịch" />}>
                <DashboardDatePicker today={today} initial={value.range === 'custom' ? value : undefined}
                  onApply={(from, to) => {
                    onChange({ range: 'custom', from, to })
                    setOpen(false)
                  }} />
              </Suspense>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-sm tabular-nums text-muted-foreground">
        {formatDate(dates.from)} – {formatDate(dates.to)}
      </p>
    </div>
  )
}
