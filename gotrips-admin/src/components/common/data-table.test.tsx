import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from './data-table'

const columns: DataTableColumn<{ name: string }>[] = [
  { accessorKey: 'name', header: 'Tên' },
]

it('giữ nguyên hàng từ API và gửi yêu cầu sắp xếp, phân trang ra ngoài bảng', async () => {
  const onSortingChange = vi.fn()
  const onPaginationChange = vi.fn()
  render(<DataTable label="Khách hàng" columns={columns} rows={[{ name: 'Bình' }, { name: 'An' }]}
    getRowId={(row) => row.name} pagination={{ pageIndex: 1, pageSize: 2 }}
    sorting={[{ id: 'name', desc: false }]} rowCount={9} onRetry={vi.fn()}
    onSortingChange={onSortingChange} onPaginationChange={onPaginationChange} />)

  expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Bình', 'An'])
  expect(screen.getByRole('columnheader', { name: 'Tên' })).toHaveAttribute('aria-sort', 'ascending')
  expect(screen.getByText('Trang 2 / 5')).toBeInTheDocument()
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Tên' }))
  expect(onSortingChange).toHaveBeenCalledWith([{ id: 'name', desc: true }])
  await user.click(screen.getByRole('button', { name: 'Trang sau' }))
  expect(onPaginationChange).toHaveBeenCalledWith({ pageIndex: 2, pageSize: 2 })
})

it('hiện mọi hàng, không có thanh phân trang hay nút sắp xếp khi không truyền phân trang và sắp xếp', () => {
  const rows = Array.from({ length: 25 }, (_, index) => ({ name: `Khách ${index}` }))
  render(<DataTable label="Khách hàng" columns={columns} rows={rows} getRowId={(row) => row.name} onRetry={vi.fn()} />)

  expect(screen.getAllByRole('cell')).toHaveLength(25)
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.getByRole('columnheader', { name: 'Tên' })).not.toHaveAttribute('aria-sort')
})

it('thử tải lại tại chỗ khi bảng lỗi', async () => {
  const onRetry = vi.fn()
  render(<DataTable label="Khách hàng" columns={columns} rows={[]}
    getRowId={(row) => row.name} pagination={{ pageIndex: 0, pageSize: 20 }}
    sorting={[]} rowCount={0} state="error" onRetry={onRetry}
    onSortingChange={vi.fn()} onPaginationChange={vi.fn()} />)

  expect(screen.getByRole('alert')).toBeInTheDocument()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Thử lại' }))
  expect(onRetry).toHaveBeenCalledOnce()
})
