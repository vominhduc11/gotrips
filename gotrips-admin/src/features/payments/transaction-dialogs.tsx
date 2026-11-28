import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAssignAdminBankTransaction, useResolveAdminBankTransaction } from '@/lib/api/generated/api'
import type { AdminBankTransactionResponse } from '@/lib/api/generated/model'
import { ApiError } from '@/lib/api/http'
import { applyApiErrors } from '@/lib/form-errors'
import { formatDateTime, formatVND } from '@/lib/format'
import { refreshAfterTransactionChange } from './payment-refresh'
import {
  assignTransactionSchema, resolveTransactionSchema, type AssignTransactionValues, type ResolveTransactionValues,
} from './payment-schemas'

interface DialogProps {
  transaction: AdminBankTransactionResponse
  onClose: () => void
}

/** Tóm tắt giao dịch để nhân viên đối chiếu với sao kê trước khi thao tác. */
function TransactionSummary({ transaction }: { transaction: AdminBankTransactionResponse }) {
  return (
    <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-md bg-muted px-3 py-2 text-sm">
      <dt className="text-muted-foreground">Số tiền</dt>
      <dd className="font-medium tabular-nums">{formatVND(transaction.amount)}</dd>
      <dt className="text-muted-foreground">Nội dung</dt>
      <dd className="wrap-break-word">{transaction.content || '—'}</dd>
      <dt className="text-muted-foreground">Thời gian</dt>
      <dd className="tabular-nums">{formatDateTime(transaction.transactionAt)}</dd>
    </dl>
  )
}

/**
 * Giao dịch 409 (người khác vừa gắn hoặc xử lý) thì báo, lấy lại danh sách và đóng hộp thoại: giữ nguyên chỉ làm
 * nhân viên bấm lại vào một trạng thái đã cũ.
 */
function handleConflict(error: unknown, transaction: AdminBankTransactionResponse,
  refresh: (code: string | null) => Promise<unknown>, onClose: () => void) {
  if (!(error instanceof ApiError && (error.status === 409 || error.status === 404))) return false
  toast.error(error.detail ?? 'Giao dịch đã thay đổi. Hãy kiểm tra trạng thái mới.')
  void refresh(transaction.bookingCode)
  onClose()
  return true
}

export function AssignTransactionDialog({ transaction, onClose }: DialogProps) {
  const client = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const assign = useAssignAdminBankTransaction()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(assignTransactionSchema),
    defaultValues: { bookingCode: '' },
  })
  const refresh = (code: string | null) => refreshAfterTransactionChange(client, code)

  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      const result = await assign.mutateAsync({ id: transaction.id, data })
      void refresh(result.bookingCode)
      toast.success(`Đã gắn giao dịch vào đơn ${result.bookingCode ?? data.bookingCode}`)
      onClose()
    } catch (error) {
      if (handleConflict(error, transaction, refresh, onClose)) return
      setFormError(applyApiErrors<AssignTransactionValues>(error, ['bookingCode'], setError))
    }
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gắn giao dịch vào đơn</DialogTitle>
          <DialogDescription>
            Tiền được tính vào đơn như khi khách ghi đúng nội dung. Đơn đủ tiền sẽ tự được xác nhận.
          </DialogDescription>
        </DialogHeader>
        <TransactionSummary transaction={transaction} />
        <form noValidate onSubmit={submit} className="space-y-4">
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <FieldGroup>
            <Field data-invalid={!!errors.bookingCode}>
              <FieldLabel htmlFor="assign-booking-code">Mã đơn</FieldLabel>
              <Input id="assign-booking-code" autoComplete="off" spellCheck={false} placeholder="GT7K4Q2M"
                className="font-mono uppercase" aria-invalid={!!errors.bookingCode} {...register('bookingCode')} />
              <FieldDescription>Đối chiếu tên người chuyển và số tiền với đơn trước khi gắn.</FieldDescription>
              {errors.bookingCode && <FieldError>{errors.bookingCode.message}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Gắn vào đơn
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function ResolveTransactionDialog({ transaction, onClose }: DialogProps) {
  const client = useQueryClient()
  const [formError, setFormError] = useState<string | null>(null)
  const resolve = useResolveAdminBankTransaction()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(resolveTransactionSchema),
    defaultValues: { note: '' },
  })
  const refresh = (code: string | null) => refreshAfterTransactionChange(client, code)

  const submit = handleSubmit(async (data) => {
    setFormError(null)
    try {
      await resolve.mutateAsync({ id: transaction.id, data })
      void refresh(transaction.bookingCode)
      toast.success('Đã đánh dấu giao dịch đã xử lý')
      onClose()
    } catch (error) {
      if (handleConflict(error, transaction, refresh, onClose)) return
      setFormError(applyApiErrors<ResolveTransactionValues>(error, ['note'], setError))
    }
  })

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đánh dấu đã xử lý</DialogTitle>
          <DialogDescription>
            Cần xử lý {formatVND(transaction.reviewAmount)}. Ghi lại cách đã xử lý để người sau đối chiếu được.
          </DialogDescription>
        </DialogHeader>
        <TransactionSummary transaction={transaction} />
        <form noValidate onSubmit={submit} className="space-y-4">
          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <FieldGroup>
            <Field data-invalid={!!errors.note}>
              <FieldLabel htmlFor="resolve-note">Cách đã xử lý</FieldLabel>
              <Textarea id="resolve-note" rows={3} maxLength={500} aria-invalid={!!errors.note} {...register('note')} />
              <FieldDescription>Ví dụ: Đã hoàn 200.000 ₫ cho khách ngày 28/11.</FieldDescription>
              {errors.note && <FieldError>{errors.note.message}</FieldError>}
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Đánh dấu đã xử lý
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
