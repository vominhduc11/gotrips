import { Badge } from '@/components/ui/badge'
import type { AdminBankTransactionResponse, BankTransactionOutcome } from '@/lib/api/generated/model'
import { formatDateTime, formatVND } from '@/lib/format'
import { outcomeLabels, reviewReasonLabels } from './payment-labels'

export function OutcomeBadge({ outcome }: { outcome: BankTransactionOutcome }) {
  const [label, color] = outcomeLabels[outcome]
  return <Badge variant="ghost" className={color}>{label}</Badge>
}

/** Kết quả đối chiếu, kèm việc cần làm và số tiền khi giao dịch còn chờ xử lý. */
export function TransactionOutcome({ transaction }: { transaction: AdminBankTransactionResponse }) {
  const reason = reviewReasonLabels[transaction.reviewReason]
  return (
    <div className="flex min-w-48 max-w-72 flex-col items-start gap-1 py-1">
      <OutcomeBadge outcome={transaction.outcome} />
      {transaction.needsReview && (
        <>
          <span className="text-xs font-medium text-warning tabular-nums">
            Cần xử lý {formatVND(transaction.reviewAmount)}
          </span>
          {reason && <span className="whitespace-normal text-xs text-muted-foreground">{reason}</span>}
        </>
      )}
    </div>
  )
}

/** Ai đã làm gì với giao dịch: đánh dấu xử lý (kèm ghi chú) hoặc gắn đơn bằng tay. Tự gắn thì không có dòng nào. */
export function TransactionHandling({ transaction }: { transaction: AdminBankTransactionResponse }) {
  const { resolvedAt, resolvedByName, resolutionNote, assignedAt, assignedByName } = transaction
  if (!resolvedAt && !assignedAt) return <span className="text-muted-foreground">—</span>
  return (
    <div className="flex min-w-40 max-w-64 flex-col gap-1 py-1 text-xs">
      {assignedAt && (
        <span>Gắn tay bởi {assignedByName ?? 'nhân viên'} · <time dateTime={assignedAt}>{formatDateTime(assignedAt)}</time></span>
      )}
      {resolvedAt && (
        <>
          <span>Đã xử lý bởi {resolvedByName ?? 'nhân viên'} · <time dateTime={resolvedAt}>{formatDateTime(resolvedAt)}</time></span>
          {resolutionNote && <span className="whitespace-pre-wrap wrap-break-word text-muted-foreground">{resolutionNote}</span>}
        </>
      )}
    </div>
  )
}
