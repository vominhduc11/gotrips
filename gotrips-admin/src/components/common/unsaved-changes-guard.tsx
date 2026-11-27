import { useCallback } from 'react'
import { useBeforeUnload, useBlocker } from 'react-router'
import { ConfirmDialog } from '@/components/common/confirm-dialog'

/**
 * Chặn rời trang khi form còn thay đổi chưa lưu: cả điều hướng trong app lẫn đóng/tải lại tab.
 *
 * @param isDirty đọc tại thời điểm điều hướng (hàm, không phải giá trị) để trang gọi được ngay sau khi vừa lưu.
 */
export function UnsavedChangesGuard({ isDirty }: { isDirty: () => boolean }) {
  const blocker = useBlocker(useCallback(({ currentLocation, nextLocation }) =>
    // Đổi tab chỉ đổi `?tab=` (form vẫn còn). Về trang đăng nhập (hết phiên, đăng xuất) thì không được giữ lại.
    nextLocation.pathname !== currentLocation.pathname && nextLocation.pathname !== '/login' && isDirty(),
  [isDirty]))

  useBeforeUnload(useCallback((event) => {
    if (isDirty()) event.preventDefault()
  }, [isDirty]))

  return (
    <ConfirmDialog open={blocker.state === 'blocked'} onOpenChange={(open) => { if (!open) blocker.reset?.() }}
      title="Rời trang khi chưa lưu?" description="Các thay đổi chưa lưu sẽ bị mất." confirmLabel="Rời trang" danger
      onConfirm={() => blocker.proceed?.()} />
  )
}
