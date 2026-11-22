import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

/** Trang 404 cho mọi đường dẫn không khớp route nào. */
export function NotFoundPage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-semibold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Đường dẫn bạn mở không tồn tại.</p>
      <Button asChild>
        <Link to="/">Về trang tổng quan</Link>
      </Button>
    </main>
  )
}
