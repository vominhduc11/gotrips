import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { DataTable } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { StatusBadge } from '@/components/common/status-badges'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApiError } from '@/lib/api/http'
import { getListAdminBookingsQueryOptions } from '@/lib/api/generated/api'
import type { AdminBookingSummaryResponse } from '@/lib/api/generated/model'
import { bookingColumns } from './booking-columns'
import { BookingDateFilter } from './booking-date-filter'
import {
  activeBookingTab, bookingApiParams, bookingSort, bookingTabs, buildBookingSearch, parseBookingFilters,
  tableSorting, type BookingFilters,
} from './booking-filters'

const emptyRows: AdminBookingSummaryResponse[] = []
const defaultFilters = parseBookingFilters(new URLSearchParams())

export function BookingListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseBookingFilters(searchParams), [searchParams])
  const query = useQuery(getListAdminBookingsQueryOptions(bookingApiParams(filters), {
    query: { placeholderData: keepPreviousData, refetchOnWindowFocus: 'always' },
  }))

  const [draft, setDraft] = useState({ source: filters.q, value: filters.q })
  // Quên bản nháp sau khi URL đổi để Back/Forward không lấy lại nội dung đã thay thế.
  if (draft.source !== filters.q) setDraft({ source: filters.q, value: filters.q })
  const searchValue = draft.source === filters.q ? draft.value : filters.q
  const update = useCallback((values: Partial<BookingFilters>, replace = false) =>
    setSearchParams(buildBookingSearch({ ...filters, page: 1, ...values }), { replace }), [filters, setSearchParams])

  useEffect(() => {
    const q = searchValue.trim()
    if (q === filters.q) return
    const timer = window.setTimeout(() => update({ q }, true), 300)
    return () => window.clearTimeout(timer)
  }, [searchValue, filters.q, update])

  const serverPage = query.isPlaceholderData ? undefined : query.data?.page
  useEffect(() => {
    if (serverPage !== undefined && serverPage !== filters.page) update({ page: serverPage }, true)
  }, [filters.page, serverPage, update])

  const active = activeBookingTab(filters)
  const hasFilters = !!(searchValue || filters.kind || filters.createdFrom || filters.createdTo || filters.customerId ||
    filters.status !== 'PENDING' || filters.paymentStatus)
  const clear = () => {
    setDraft({ source: filters.q, value: '' })
    setSearchParams(buildBookingSearch({ ...defaultFilters, size: filters.size, sort: filters.sort }))
  }

  return (
    <section className="space-y-5">
      <PageHeader title="Đơn đặt chỗ" />
      <div className="flex flex-wrap gap-2" role="group" aria-label="Lọc nhanh theo trạng thái">
        {bookingTabs.map(({ key, label, status, paymentStatus }) => (
          <Button key={key} size="sm" variant={active === key ? 'default' : 'outline'} aria-pressed={active === key}
            onClick={() => update({ status, paymentStatus })}>{label}</Button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput type="search" aria-label="Tìm đơn đặt chỗ" placeholder="Mã đơn, email, tên, SĐT" maxLength={254}
            value={searchValue} onChange={(event) => setDraft({ source: filters.q, value: event.target.value })} />
        </InputGroup>
        <Select value={filters.kind ?? 'ALL'} onValueChange={(kind) =>
          update({ kind: kind === 'ALL' ? undefined : kind as BookingFilters['kind'] })}>
          <SelectTrigger aria-label="Loại dịch vụ"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Mọi dịch vụ</SelectItem>
            <SelectItem value="TOUR">Tour</SelectItem>
            <SelectItem value="HOTEL">Khách sạn</SelectItem>
            <SelectItem value="FLIGHT">Vé máy bay</SelectItem>
          </SelectContent>
        </Select>
        <BookingDateFilter from={filters.createdFrom} to={filters.createdTo}
          onChange={(createdFrom, createdTo) => update({ createdFrom, createdTo })} />
        {filters.paymentStatus && !active && (
          <div className="flex items-center gap-1.5 rounded-lg border py-0.5 pl-2 pr-0.5 text-xs">
            <span>Thanh toán</span>
            <StatusBadge group="payment" value={filters.paymentStatus} />
            <Button type="button" size="icon-xs" variant="ghost" aria-label="Gỡ bộ lọc thanh toán"
              onClick={() => update({ paymentStatus: undefined })}><X aria-hidden="true" /></Button>
          </div>
        )}
        {hasFilters && <Button type="button" variant="ghost" onClick={clear}>Xoá bộ lọc</Button>}
      </div>
      <DataTable label="Danh sách đơn đặt chỗ" columns={bookingColumns} rows={query.data?.items ?? emptyRows}
        getRowId={(booking) => booking.code} pagination={{ pageIndex: (serverPage ?? filters.page) - 1, pageSize: filters.size }}
        sorting={tableSorting(filters.sort)} rowCount={query.data?.totalItems ?? 0}
        onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, size: pageSize })}
        onSortingChange={(sorting) => update({ sort: bookingSort(sorting) })}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={query.error instanceof ApiError && query.error.status === 403
          ? 'Bạn không có quyền xem đơn đặt chỗ.' : undefined}
        emptyTitle={active === 'pending' && !filters.q ? 'Không có đơn chờ xử lý' : 'Không tìm thấy đơn phù hợp'}
        emptyAction={hasFilters ? <Button type="button" variant="outline" onClick={clear}>Xoá bộ lọc</Button> : undefined}
        onRetry={() => void query.refetch()} />
    </section>
  )
}
