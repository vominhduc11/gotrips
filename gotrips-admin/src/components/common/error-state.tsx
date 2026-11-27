import { Button } from '@/components/ui/button'

export const SERVICE_UNAVAILABLE = 'Hệ thống đang bận, vui lòng thử lại sau.'

export function ErrorState({ message = SERVICE_UNAVAILABLE, onRetry }: {
  message?: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <p role="alert" className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={onRetry}>Thử lại</Button>
    </div>
  )
}
