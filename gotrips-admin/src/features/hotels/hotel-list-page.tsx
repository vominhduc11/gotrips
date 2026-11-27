import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DataTable } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getListAdminDestinationsQueryOptions, getListAdminHotelsQueryOptions } from '@/lib/api/generated/api'
import type { AdminHotelSummaryResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'
import { hotelColumns } from './hotel-columns'
import {
  buildHotelSearch, defaultHotelFilters, hasActiveHotelFilters, hotelApiParams, hotelSortFromTable, hotelTableSorting,
  parseHotelFilters, type HotelFilters,
} from './hotel-filters'

const emptyRows: AdminHotelSummaryResponse[] = []

export function HotelListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseHotelFilters(searchParams), [searchParams])
  const query = useQuery(getListAdminHotelsQueryOptions(hotelApiParams(filters), {
    query: { placeholderData: keepPreviousData },
  }))
  const destinations = useQuery(getListAdminDestinationsQueryOptions())

  const [draft, setDraft] = useState({ source: filters.q, value: filters.q })
  // Quên bản nháp sau khi URL đổi để Back/Forward không lấy lại nội dung đã thay thế.
  if (draft.source !== filters.q) setDraft({ source: filters.q, value: filters.q })
  const searchValue = draft.source === filters.q ? draft.value : filters.q
  const update = useCallback((values: Partial<HotelFilters>, replace = false) =>
    setSearchParams(buildHotelSearch({ ...filters, page: 1, ...values }), { replace }), [filters, setSearchParams])

  useEffect(() => {
    const q = searchValue.trim()
    if (q === filters.q) return
    const timer = window.setTimeout(() => update({ q }, true), 300)
    return () => window.clearTimeout(timer)
  }, [searchValue, filters.q, update])

  // API kẹp số trang: đưa URL về đúng trang đang hiện.
  const serverPage = query.isPlaceholderData ? undefined : query.data?.page
  useEffect(() => {
    if (serverPage !== undefined && serverPage !== filters.page) update({ page: serverPage }, true)
  }, [filters.page, serverPage, update])

  const hasFilters = !!searchValue || hasActiveHotelFilters(filters)
  const clear = () => {
    setDraft({ source: filters.q, value: '' })
    setSearchParams(buildHotelSearch({ ...defaultHotelFilters, size: filters.size, sort: filters.sort }))
  }
  const createButton = (
    <Button asChild>
      <Link to="/hotels/new"><Plus aria-hidden="true" />Thêm khách sạn</Link>
    </Button>
  )

  return (
    <section className="space-y-5">
      <PageHeader title="Khách sạn" action={createButton} />
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput type="search" aria-label="Tìm khách sạn" placeholder="Tên khách sạn hoặc slug"
            maxLength={200} value={searchValue}
            onChange={(event) => setDraft({ source: filters.q, value: event.target.value })} />
        </InputGroup>
        <Select value={filters.status ?? 'DEFAULT'} onValueChange={(status) =>
          update({ status: status === 'DEFAULT' ? undefined : status as HotelFilters['status'] })}>
          <SelectTrigger aria-label="Trạng thái"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="DEFAULT">Đang hiện và đang ẩn</SelectItem>
            <SelectItem value="ACTIVE">Đang hiện</SelectItem>
            <SelectItem value="HIDDEN">Đang ẩn</SelectItem>
            <SelectItem value="DELETED">Đã xoá</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.destinationId ? String(filters.destinationId) : 'ALL'} onValueChange={(id) =>
          update({ destinationId: id === 'ALL' ? undefined : Number(id) })}>
          <SelectTrigger aria-label="Điểm đến"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Mọi điểm đến</SelectItem>
            {destinations.data?.map((destination) => (
              <SelectItem key={destination.id} value={String(destination.id)}>{destination.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(sort) => update({ sort: sort as HotelFilters['sort'] })}>
          <SelectTrigger aria-label="Sắp xếp"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NEWEST">Mới nhất</SelectItem>
            <SelectItem value="OLDEST">Cũ nhất</SelectItem>
            <SelectItem value="NAME_ASC">Tên A → Z</SelectItem>
            <SelectItem value="NAME_DESC">Tên Z → A</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && <Button type="button" variant="ghost" onClick={clear}>Xoá bộ lọc</Button>}
      </div>
      <DataTable label="Danh sách khách sạn" columns={hotelColumns} rows={query.data?.items ?? emptyRows}
        getRowId={(hotel) => String(hotel.id)}
        pagination={{ pageIndex: (serverPage ?? filters.page) - 1, pageSize: filters.size }}
        sorting={hotelTableSorting(filters.sort)} rowCount={query.data?.totalItems ?? 0}
        onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, size: pageSize })}
        onSortingChange={(sorting) => update({ sort: hotelSortFromTable(sorting) })}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle={hasFilters ? 'Không tìm thấy khách sạn phù hợp' : 'Chưa có khách sạn nào'}
        emptyAction={hasFilters
          ? <Button type="button" variant="outline" onClick={clear}>Xoá bộ lọc</Button>
          : createButton}
        onRetry={() => void query.refetch()} />
    </section>
  )
}
