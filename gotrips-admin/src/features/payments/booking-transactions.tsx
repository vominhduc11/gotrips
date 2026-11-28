import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { ErrorState } from '@/components/common/error-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { getListAdminBankTransactionsQueryOptions } from '@/lib/api/generated/api'
import { ApiError } from '@/lib/api/http'
import { formatDateTime, formatVND } from '@/lib/format'
import { paymentsOfBookingHref } from './payment-filters'
import { TransactionOutcome } from './transaction-outcome'

/** Một đơn hiếm khi có quá vài lần chuyển; quá số này thì xem đủ ở trang Giao dịch ngân hàng. */
const LIMIT = 20

/** Các lần chuyển khoản SePay báo cho đơn này, để nhân viên đối chiếu số đã nhận với sao kê. */
export function BookingTransactions({ code }: { code: string }) {
  const query = useQuery(getListAdminBankTransactionsQueryOptions({ bookingCode: code, size: LIMIT }, {
    query: { refetchOnWindowFocus: 'always' },
  }))
  const items = query.data?.items ?? []

  return (
    <Card>
      <CardHeader><CardTitle>Giao dịch chuyển khoản</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        {query.isPending ? <Skeleton aria-label="Đang tải giao dịch" className="h-16 w-full" />
          : query.isError ? (
            <ErrorState onRetry={() => void query.refetch()} message={query.error instanceof ApiError &&
              query.error.status === 403 ? 'Bạn không có quyền xem giao dịch ngân hàng.' : undefined} />
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Chưa nhận giao dịch nào qua SePay.</p>
          ) : (
            <ol className="divide-y text-sm" aria-label={`Giao dịch của đơn ${code}`}>
              {items.map((transaction) => (
                <li key={transaction.id} className="space-y-1 py-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="font-medium tabular-nums">{formatVND(transaction.amount)}</span>
                    <time dateTime={transaction.transactionAt} className="text-xs text-muted-foreground tabular-nums">
                      {formatDateTime(transaction.transactionAt)}
                    </time>
                  </div>
                  <p className="wrap-break-word text-muted-foreground">{transaction.content || '—'}</p>
                  <TransactionOutcome transaction={transaction} />
                </li>
              ))}
            </ol>
          )}
        <Link to={paymentsOfBookingHref(code)} className="inline-block text-sm text-primary hover:underline">
          Xem ở Giao dịch ngân hàng
        </Link>
      </CardContent>
    </Card>
  )
}
