import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { DashboardDaily } from '@/lib/api/generated/model'
import { formatDate, formatVND } from '@/lib/format'

const config = {
  revenueCollected: { label: 'Doanh thu', color: 'var(--chart-1)' },
  newBookings: { label: 'Đơn mới', color: 'var(--chart-2)' },
} satisfies ChartConfig

const compact = new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 })
const tickDate = (date: string) => formatDate(date).slice(0, 5)
const axes = (money: boolean) => [
  <CartesianGrid key="grid" vertical={false} />,
  <XAxis key="x" dataKey="date" tickFormatter={tickDate} tickLine={false} axisLine={false} minTickGap={20} />,
  <YAxis key="y" tickFormatter={(value: number) => compact.format(value)}
    allowDecimals={money} width={62} axisLine={false} tickLine={false} />,
  <ChartTooltip key="tooltip" content={<ChartTooltipContent
    labelFormatter={(date) => formatDate(String(date))}
    formatter={(value) => (
      <span className="font-medium tabular-nums">{money ? formatVND(Number(value)) : `${value} đơn`}</span>
    )} />} />,
]

export function DashboardChart({ daily, metric, label }: {
  daily: DashboardDaily[]
  metric: keyof typeof config
  label: string
}) {
  return (
    <ChartContainer config={config} className="h-52 w-full min-w-0">
      {metric === 'revenueCollected' ? (
        <LineChart data={daily} aria-label={label}>
          {axes(true)}
          <Line dataKey="revenueCollected" name="Doanh thu" type="monotone" stroke="var(--color-revenueCollected)"
            strokeWidth={2} dot={daily.length <= 30} />
        </LineChart>
      ) : (
        <BarChart data={daily} aria-label={label}>
          {axes(false)}
          <Bar dataKey="newBookings" name="Đơn mới" fill="var(--color-newBookings)" radius={[3, 3, 0, 0]} />
        </BarChart>
      )}
    </ChartContainer>
  )
}
