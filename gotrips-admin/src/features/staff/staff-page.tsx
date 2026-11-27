import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Ellipsis, Plus } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/common/data-table'
import { PageHeader } from '@/components/common/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { hasAdminRole } from '@/features/auth/session'
import { getListAdminStaffQueryKey, getListAdminStaffQueryOptions, useRevokeAdminStaffRole } from '@/lib/api/generated/api'
import type { AdminStaffResponse, UserResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { apiErrorMessage } from '@/lib/form-errors'
import { formatDateTime } from '@/lib/format'
import { CreateStaffDialog } from './create-staff-dialog'
import { StaffRoleDialog } from './staff-role-dialog'
import { staffRoleLabels } from './staff-schema'

type StaffAction = { kind: 'create' } | { kind: 'role' | 'revoke'; staff: AdminStaffResponse }
const emptyRows: AdminStaffResponse[] = []
const staffColumns: DataTableColumn<AdminStaffResponse>[] = [
  { accessorKey: 'fullName', header: 'Họ và tên' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'role', header: 'Vai trò', cell: ({ row }) => <Badge variant="secondary">{staffRoleLabels[row.original.role]}</Badge> },
  { accessorKey: 'createdAt', header: 'Ngày tạo', cell: ({ row }) => formatDateTime(row.original.createdAt) },
]

function StaffActions({ staff, onChoose }: {
  staff: AdminStaffResponse
  onChoose: (action: StaffAction, trigger: HTMLButtonElement | null) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" ref={trigger} aria-label={`Thao tác với ${staff.fullName}`}>
          <Ellipsis aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => onChoose({ kind: 'role', staff }, trigger.current)}>Đổi vai trò</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={() => onChoose({ kind: 'revoke', staff }, trigger.current)}>
          Thu hồi quyền
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function StaffPage() {
  const user = useOutletContext<UserResponse>()
  if (!hasAdminRole(user)) return (
    <section className="space-y-3">
      <PageHeader title="Bạn không có quyền" />
      <Button asChild><Link to="/">Về trang tổng quan</Link></Button>
    </section>
  )

  return <StaffManagement userId={user.id} />
}

function StaffManagement({ userId }: { userId: string }) {
  const query = useQuery(getListAdminStaffQueryOptions())
  const client = useQueryClient()
  const [action, setAction] = useState<StaffAction | null>(null)
  const addButton = useRef<HTMLButtonElement>(null)
  const returnFocus = useRef<HTMLButtonElement | null>(null)
  const revoke = useRevokeAdminStaffRole()

  const columns = useMemo<DataTableColumn<AdminStaffResponse>[]>(() => [
    ...staffColumns,
    { id: 'actions', header: 'Thao tác', cell: ({ row }) => row.original.id === userId ? null : (
      <StaffActions staff={row.original} onChoose={(next, trigger) => {
        returnFocus.current = trigger
        setAction(next)
      }} />
    ) },
  ], [userId])

  const refresh = () => { void client.invalidateQueries({ queryKey: getListAdminStaffQueryKey() }) }
  const close = () => {
    setAction(null)
    const target = returnFocus.current
    requestAnimationFrame(() => (target?.isConnected ? target : addButton.current)?.focus())
  }
  const saved = () => {
    refresh()
    close()
  }
  const revokeStaff = async (staff: AdminStaffResponse) => {
    try {
      await revoke.mutateAsync({ id: staff.id })
      toast.success('Đã thu hồi quyền')
      returnFocus.current = addButton.current
      saved()
    } catch (error) {
      const message = apiErrorMessage(error)
      if (message) toast.error(message)
      if (error instanceof ApiError && (error.status === 409 || error.status === 404)) saved()
    }
  }
  const canCreate = !(query.error instanceof ApiError && query.error.status === 403)

  return (
    <section className="space-y-5">
      <PageHeader title="Nhân viên" action={canCreate && (
        <Button type="button" ref={addButton} onClick={() => {
          returnFocus.current = addButton.current
          setAction({ kind: 'create' })
        }}><Plus aria-hidden="true" />Thêm nhân viên</Button>
      )} />
      <DataTable label="Danh sách nhân viên" columns={columns} rows={query.data ?? emptyRows}
        getRowId={(staff) => staff.id}
        state={query.isError ? 'error' : query.isPending ? 'loading' : 'ready'}
        emptyTitle="Chưa có nhân viên nào" onRetry={() => void query.refetch()}
        errorMessage={apiErrorMessage(query.error) ?? undefined} />
      {action?.kind === 'create' && <CreateStaffDialog onClose={close} onSuccess={saved} />}
      {action?.kind === 'role' && <StaffRoleDialog staff={action.staff} onClose={close} onSuccess={saved} onConflict={refresh} />}
      {action?.kind === 'revoke' && (
        <ConfirmDialog open onOpenChange={(open) => { if (!open) close() }} title="Thu hồi quyền"
          description={`${action.staff.fullName} sẽ mất quyền truy cập GoTrips Admin. Tài khoản và đơn đặt chỗ vẫn được giữ.`}
          confirmLabel="Thu hồi quyền" danger pending={revoke.isPending}
          onConfirm={() => void revokeStaff(action.staff)} />
      )}
    </section>
  )
}
