import {
  columnFilteringFeature, functionalUpdate, rowPaginationFeature, rowSortingFeature,
  tableFeatures, useTable, type ColumnDef, type PaginationState, type RowData, type SortingState, type Updater,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import type { ReactNode } from 'react'
import { EmptyState } from '@/components/common/empty-state'
import { ErrorState } from '@/components/common/error-state'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const features = tableFeatures({ columnFilteringFeature, rowPaginationFeature, rowSortingFeature })
const pageSizes = [10, 20, 50, 100]
const noSorting: SortingState = []

export type DataTableColumn<T extends RowData> = ColumnDef<typeof features, T>

interface DataTableProps<T extends RowData> {
  label: string
  columns: DataTableColumn<T>[]
  rows: T[]
  getRowId: (row: T) => string
  /** Bỏ trống khi API trả toàn bộ danh sách một lần: bảng hiện mọi hàng và không có thanh phân trang. */
  pagination?: PaginationState
  onPaginationChange?: (value: PaginationState) => void
  rowCount?: number
  /** Bỏ trống khi API không cho chọn thứ tự: không cột nào bấm sắp xếp được. */
  sorting?: SortingState
  onSortingChange?: (value: SortingState) => void
  state?: 'loading' | 'error' | 'ready'
  emptyAction?: ReactNode
  emptyTitle?: string
  errorMessage?: string
  onRetry: () => void
}

export function DataTable<T extends RowData>({
  label, columns, rows, getRowId, pagination, sorting, rowCount, onPaginationChange, onSortingChange,
  state = 'ready', emptyTitle = 'Không có kết quả', emptyAction, errorMessage, onRetry,
}: DataTableProps<T>) {
  const table = useTable({
    features, columns, data: rows, getRowId, rowCount,
    state: { sorting: sorting ?? noSorting, ...(pagination && { pagination }) },
    manualFiltering: true, manualPagination: true, manualSorting: true, enableMultiSort: false,
    enableSorting: sorting !== undefined,
    onPaginationChange: (update: Updater<PaginationState>) => {
      if (pagination) onPaginationChange?.(functionalUpdate(update, pagination))
    },
    onSortingChange: (update: Updater<SortingState>) =>
      onSortingChange?.(functionalUpdate(update, sorting ?? noSorting)),
  })

  const rowModel = table.getRowModel()
  const leafColumns = table.getAllLeafColumns()

  return (
    <div className="overflow-hidden rounded-lg border [&_[data-slot=table-container]]:max-h-[65vh]">
      <Table aria-label={label} aria-busy={state === 'loading'}>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => {
                const sorted = header.column.getIsSorted()
                const canSort = header.column.getCanSort()
                const SortIcon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown
                return (
                  <TableHead key={header.id} colSpan={header.colSpan}
                    aria-sort={canSort ? sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none' : undefined}>
                    {header.isPlaceholder ? null : canSort ? (
                      <Button type="button" variant="ghost" size="sm" className="-ml-2"
                        onClick={header.column.getToggleSortingHandler()}>
                        <table.FlexRender header={header} />
                        <SortIcon aria-hidden="true" />
                      </Button>
                    ) : <table.FlexRender header={header} />}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {state === 'loading' ? Array.from({ length: Math.min(pagination?.pageSize ?? 6, 8) }, (_, index) => (
            <TableRow key={index} aria-hidden="true">
              {leafColumns.map((column) => <TableCell key={column.id}><Skeleton className="h-5 w-full" /></TableCell>)}
            </TableRow>
          )) : state === 'error' || rowModel.rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={leafColumns.length}>
                {state === 'error' ? <ErrorState message={errorMessage} onRetry={onRetry} /> : <EmptyState title={emptyTitle} action={emptyAction} />}
              </TableCell>
            </TableRow>
          ) : rowModel.rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}><table.FlexRender cell={cell} /></TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {pagination && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t p-3 text-sm">
          <div className="flex items-center gap-2">
            <span>Số dòng mỗi trang</span>
            <Select value={String(pagination.pageSize)}
              onValueChange={(value) => table.setPagination({ pageSize: Number(value), pageIndex: 0 })}>
              <SelectTrigger aria-label="Số dòng mỗi trang"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[...new Set([...pageSizes, pagination.pageSize])].sort((a, b) => a - b)
                  .map((size) => <SelectItem key={size} value={String(size)}>{size}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="tabular-nums">Trang {pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}</span>
            <Button type="button" variant="outline" size="sm" disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}>Trang trước</Button>
            <Button type="button" variant="outline" size="sm" disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}>Trang sau</Button>
          </div>
        </div>
      )}
    </div>
  )
}
