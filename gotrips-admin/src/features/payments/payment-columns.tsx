import { Link } from 'react-router'
import type { DataTableColumn } from '@/components/common/data-table'
import type { AdminBankTransactionResponse } from '@/lib/api/generated/model'
import { formatDateTime, formatVND } from '@/lib/format'
import { TransactionHandling, TransactionOutcome } from './transaction-outcome'
import { TransactionActions } from './transaction-actions'

export const paymentColumns: DataTableColumn<AdminBankTransactionResponse>[] = [
  { id: 'receivedAt', header: 'Thời gian', cell: ({ row }) => (
    <div className="flex flex-col tabular-nums">
      <time dateTime={row.original.receivedAt}>{formatDateTime(row.original.receivedAt)}</time>
      {/* Giờ ngân hàng ghi nhận có thể khác giờ nhận webhook (SePay gửi lại sau sự cố). */}
      <span className="text-xs text-muted-foreground">Ngân hàng: {formatDateTime(row.original.transactionAt)}</span>
    </div>
  ) },
  { id: 'amount', header: 'Số tiền', cell: ({ row }) => {
    const { amount, appliedAmount, bookingCode } = row.original
    return <div className="flex flex-col text-right tabular-nums">
      <span className="font-medium">{formatVND(amount)}</span>
      {bookingCode && appliedAmount !== amount && (
        <span className="text-xs text-muted-foreground">Tính vào đơn {formatVND(appliedAmount)}</span>
      )}
    </div>
  } },
  { id: 'content', header: 'Nội dung', cell: ({ row }) => {
    const { content, gateway, referenceCode } = row.original
    return <div className="flex min-w-48 max-w-80 flex-col gap-0.5 py-1">
      <span className="whitespace-normal wrap-break-word">{content || '—'}</span>
      <span className="text-xs text-muted-foreground">{[gateway, referenceCode].filter(Boolean).join(' · ')}</span>
    </div>
  } },
  { id: 'booking', header: 'Đơn', cell: ({ row }) => row.original.bookingCode
    ? <Link to={`/bookings/${row.original.bookingCode}`} className="font-mono font-medium text-primary hover:underline">
      {row.original.bookingCode}</Link>
    : <span className="text-muted-foreground">—</span> },
  { id: 'outcome', header: 'Kết quả', cell: ({ row }) => <TransactionOutcome transaction={row.original} /> },
  { id: 'handling', header: 'Xử lý', cell: ({ row }) => <TransactionHandling transaction={row.original} /> },
  { id: 'actions', header: 'Thao tác', cell: ({ row }) => <TransactionActions transaction={row.original} /> },
]
