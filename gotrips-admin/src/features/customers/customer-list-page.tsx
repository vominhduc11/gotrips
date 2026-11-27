import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getListAdminCustomersQueryOptions } from '@/lib/api/generated/api'
import type { AdminCustomerResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatDateTime, formatVND } from '@/lib/format'
import {
  buildCustomerSearch, customerApiParams, customerSortLabels, customerSorts, parseCustomerFilters, type CustomerFilters,
} from './customer-filters'

const emptyRows: AdminCustomerResponse[] = []
const columns: DataTableColumn<AdminCustomerResponse>[] = [
  { accessorKey: 'fullName', header: 'Họ và tên', cell: ({ row }) => (
    <Link to={`/customers/${row.original.id}`} className="font-medium text-primary hover:underline">{row.original.fullName}</Link>
  ) },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'createdAt', header: 'Ngày tham gia', cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: 'bookingCount', header: () => <div className="text-right">Số đơn</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{row.original.bookingCount.toLocaleString('vi-VN')}</div> },
  { accessorKey: 'totalPaid', header: () => <div className="text-right">Đã thanh toán</div>,
    cell: ({ row }) => <div className="text-right tabular-nums">{formatVND(row.original.totalPaid)}</div> },
  { accessorKey: 'lastBookingAt', header: 'Lần đặt gần nhất',
    cell: ({ row }) => row.original.lastBookingAt ? formatDateTime(row.original.lastBookingAt) : '—' },
]

export function CustomerListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseCustomerFilters(searchParams), [searchParams])
  const query = useQuery(getListAdminCustomersQueryOptions(customerApiParams(filters), {
    query: { placeholderData: keepPreviousData },
  }))
  const [draft, setDraft] = useState({ source: filters.q, value: filters.q })
  if (draft.source !== filters.q) setDraft({ source: filters.q, value: filters.q })
  const searchValue = draft.source === filters.q ? draft.value : filters.q
  const update = useCallback((values: Partial<CustomerFilters>, replace = false) =>
    setSearchParams(buildCustomerSearch({ ...filters, page: 1, ...values }), { replace }), [filters, setSearchParams])

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

  const clear = () => {
    setDraft({ source: filters.q, value: '' })
    update({ q: '' })
  }
  const clearButton = <Button type="button" variant="outline" onClick={clear}>Xoá bộ lọc</Button>

  return (
    <section className="space-y-5">
      <PageHeader title="Khách hàng" />
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput type="search" aria-label="Tìm khách hàng" placeholder="Tên hoặc email" maxLength={254}
            value={searchValue} onChange={(event) => setDraft({ source: filters.q, value: event.target.value })} />
        </InputGroup>
        <Select value={filters.sort} onValueChange={(sort: CustomerFilters['sort']) => update({ sort })}>
          <SelectTrigger aria-label="Sắp xếp"><SelectValue /></SelectTrigger>
          <SelectContent>{customerSorts.map((sort) =>
            <SelectItem key={sort} value={sort}>{customerSortLabels[sort]}</SelectItem>)}</SelectContent>
        </Select>
        {searchValue && clearButton}
      </div>
      <DataTable label="Danh sách khách hàng" columns={columns} rows={query.data?.items ?? emptyRows}
        getRowId={(customer) => customer.id}
        pagination={{ pageIndex: (serverPage ?? filters.page) - 1, pageSize: filters.size }}
        rowCount={query.data?.totalItems ?? 0}
        onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, size: pageSize })}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle={filters.q ? 'Không tìm thấy khách hàng phù hợp' : 'Chưa có khách hàng nào'}
        emptyAction={filters.q && clearButton}
        onRetry={() => void query.refetch()} />
    </section>
  )
}
