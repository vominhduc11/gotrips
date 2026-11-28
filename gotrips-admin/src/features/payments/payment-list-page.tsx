import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DataTable } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { getListAdminBankTransactionsQueryOptions } from '@/lib/api/generated/api'
import type { AdminBankTransactionResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { bookingRefreshOptions } from '@/features/bookings/booking-refresh'
import { paymentColumns } from './payment-columns'
import { buildPaymentSearch, parsePaymentFilters, paymentApiParams, paymentTabs, type PaymentFilters } from './payment-filters'

const emptyRows: AdminBankTransactionResponse[] = []
const defaultFilters = parsePaymentFilters(new URLSearchParams())

const emptyTitles: Record<PaymentFilters['tab'], string> = {
  review: 'Không có giao dịch cần xử lý',
  done: 'Chưa có giao dịch nào',
  all: 'Chưa có giao dịch nào',
}

/**
 * Giao dịch tiền vào do SePay báo. Mặc định chỉ hiện giao dịch cần xử lý (không khớp đơn, chuyển thừa, đơn đã huỷ...).
 * Làm mới định kỳ như danh sách đơn vì webhook có thể tới bất cứ lúc nào.
 */
export function PaymentListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parsePaymentFilters(searchParams), [searchParams])
  const query = useQuery(getListAdminBankTransactionsQueryOptions(paymentApiParams(filters), {
    query: { placeholderData: keepPreviousData, ...bookingRefreshOptions },
  }))

  const [draft, setDraft] = useState({ source: filters.q, value: filters.q })
  // Quên bản nháp sau khi URL đổi để Back/Forward không lấy lại nội dung đã thay thế.
  if (draft.source !== filters.q) setDraft({ source: filters.q, value: filters.q })
  const searchValue = draft.source === filters.q ? draft.value : filters.q
  const update = useCallback((values: Partial<PaymentFilters>, replace = false) =>
    setSearchParams(buildPaymentSearch({ ...filters, page: 1, ...values }), { replace }), [filters, setSearchParams])

  useEffect(() => {
    const q = searchValue.trim()
    if (q === filters.q) return
    const timer = window.setTimeout(() => update({ q }, true), 300)
    return () => window.clearTimeout(timer)
  }, [searchValue, filters.q, update])

  // API kẹp trang quá cuối về trang cuối: đưa URL theo để nút phân trang khớp với dữ liệu.
  const serverPage = query.isPlaceholderData ? undefined : query.data?.page
  useEffect(() => {
    if (serverPage !== undefined && serverPage !== filters.page) update({ page: serverPage }, true)
  }, [filters.page, serverPage, update])

  const hasFilters = !!searchValue || filters.tab !== defaultFilters.tab
  const clear = () => {
    setDraft({ source: filters.q, value: '' })
    setSearchParams(buildPaymentSearch({ ...defaultFilters, size: filters.size }))
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Giao dịch ngân hàng"
        description="Tiền vào tài khoản nhận do SePay báo. Giao dịch có mã đơn được tự tính vào đơn." />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc nhanh theo việc cần làm">
        {paymentTabs.map(({ key, label }) => (
          <Button key={key} size="sm" variant={filters.tab === key ? 'default' : 'outline'} aria-pressed={filters.tab === key}
            onClick={() => update({ tab: key })}>{label}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-80">
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput type="search" aria-label="Tìm giao dịch" placeholder="Nội dung, mã tham chiếu, mã đơn"
            maxLength={100} value={searchValue}
            onChange={(event) => setDraft({ source: filters.q, value: event.target.value })} />
        </InputGroup>
        {hasFilters && <Button type="button" variant="ghost" onClick={clear}>Xoá bộ lọc</Button>}
      </div>
      <DataTable label="Danh sách giao dịch ngân hàng" columns={paymentColumns} rows={query.data?.items ?? emptyRows}
        getRowId={(transaction) => String(transaction.id)}
        pagination={{ pageIndex: (serverPage ?? filters.page) - 1, pageSize: filters.size }}
        rowCount={query.data?.totalItems ?? 0}
        onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, size: pageSize })}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={query.error instanceof ApiError && query.error.status === 403
          ? 'Bạn không có quyền xem giao dịch ngân hàng.' : undefined}
        emptyTitle={filters.q ? 'Không tìm thấy giao dịch phù hợp' : emptyTitles[filters.tab]}
        emptyAction={hasFilters ? <Button type="button" variant="outline" onClick={clear}>Xoá bộ lọc</Button> : undefined}
        onRetry={() => void query.refetch()} />
    </section>
  )
}
