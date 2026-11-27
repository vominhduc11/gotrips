import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { DataTable } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getListAdminDestinationsQueryOptions, getListAdminToursQueryOptions } from '@/lib/api/generated/api'
import type { AdminTourSummaryResponse } from '@/lib/api/generated/model'
import { apiErrorMessage } from '@/lib/form-errors'
import { tourColumns } from './tour-columns'
import {
  buildTourSearch, defaultTourFilters, hasActiveTourFilters, parseTourFilters, tourApiParams, tourSortFromTable,
  tourTableSorting, type TourFilters,
} from './tour-filters'

const emptyRows: AdminTourSummaryResponse[] = []

export function TourListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseTourFilters(searchParams), [searchParams])
  const query = useQuery(getListAdminToursQueryOptions(tourApiParams(filters), {
    query: { placeholderData: keepPreviousData },
  }))
  const destinations = useQuery(getListAdminDestinationsQueryOptions())

  const [draft, setDraft] = useState({ source: filters.q, value: filters.q })
  // Quên bản nháp sau khi URL đổi để Back/Forward không lấy lại nội dung đã thay thế.
  if (draft.source !== filters.q) setDraft({ source: filters.q, value: filters.q })
  const searchValue = draft.source === filters.q ? draft.value : filters.q
  const update = useCallback((values: Partial<TourFilters>, replace = false) =>
    setSearchParams(buildTourSearch({ ...filters, page: 1, ...values }), { replace }), [filters, setSearchParams])

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

  const hasFilters = !!searchValue || hasActiveTourFilters(filters)
  const clear = () => {
    setDraft({ source: filters.q, value: '' })
    setSearchParams(buildTourSearch({ ...defaultTourFilters, size: filters.size, sort: filters.sort }))
  }
  const createButton = (
    <Button asChild>
      <Link to="/tours/new"><Plus aria-hidden="true" />Thêm tour</Link>
    </Button>
  )

  return (
    <section className="space-y-5">
      <PageHeader title="Tour" action={createButton} />
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-72">
          <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
          <InputGroupInput type="search" aria-label="Tìm tour" placeholder="Tên tour hoặc slug" maxLength={150}
            value={searchValue} onChange={(event) => setDraft({ source: filters.q, value: event.target.value })} />
        </InputGroup>
        <Select value={filters.status ?? 'DEFAULT'} onValueChange={(status) =>
          update({ status: status === 'DEFAULT' ? undefined : status as TourFilters['status'] })}>
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
        <Select value={filters.featured ?? 'ALL'} onValueChange={(featured) =>
          update({ featured: featured === 'ALL' ? undefined : featured as TourFilters['featured'] })}>
          <SelectTrigger aria-label="Nổi bật"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Nổi bật và không</SelectItem>
            <SelectItem value="true">Chỉ tour nổi bật</SelectItem>
            <SelectItem value="false">Không nổi bật</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(sort) => update({ sort: sort as TourFilters['sort'] })}>
          <SelectTrigger aria-label="Sắp xếp"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="NEWEST">Mới nhất</SelectItem>
            <SelectItem value="OLDEST">Cũ nhất</SelectItem>
            <SelectItem value="TITLE_ASC">Tên A → Z</SelectItem>
            <SelectItem value="TITLE_DESC">Tên Z → A</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && <Button type="button" variant="ghost" onClick={clear}>Xoá bộ lọc</Button>}
      </div>
      <DataTable label="Danh sách tour" columns={tourColumns} rows={query.data?.items ?? emptyRows}
        getRowId={(tour) => String(tour.id)}
        pagination={{ pageIndex: (serverPage ?? filters.page) - 1, pageSize: filters.size }}
        sorting={tourTableSorting(filters.sort)} rowCount={query.data?.totalItems ?? 0}
        onPaginationChange={({ pageIndex, pageSize }) => update({ page: pageIndex + 1, size: pageSize })}
        onSortingChange={(sorting) => update({ sort: tourSortFromTable(sorting) })}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        errorMessage={apiErrorMessage(query.error) ?? undefined}
        emptyTitle={hasFilters ? 'Không tìm thấy tour phù hợp' : 'Chưa có tour nào'}
        emptyAction={hasFilters
          ? <Button type="button" variant="outline" onClick={clear}>Xoá bộ lọc</Button>
          : createButton}
        onRetry={() => void query.refetch()} />
    </section>
  )
}
