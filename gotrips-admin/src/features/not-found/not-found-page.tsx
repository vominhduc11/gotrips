import { Link } from 'react-router'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <main id="noi-dung-chinh" className="grid min-h-svh place-items-center p-6">
      <div className="space-y-4">
        <PageHeader title="Không tìm thấy trang" description="Đường dẫn bạn mở không tồn tại." />
        <Button asChild><Link to="/">Về trang tổng quan</Link></Button>
      </div>
    </main>
  )
}
