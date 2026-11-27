import { isRouteErrorResponse, Link, useRevalidator, useRouteError } from 'react-router'
import { ErrorState } from '@/components/common/error-state'
import { PageHeader } from '@/components/common/page-header'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api/http'

export function RouteError() {
  const error = useRouteError()
  const revalidator = useRevalidator()
  const status = isRouteErrorResponse(error) || error instanceof ApiError ? error.status : undefined
  const forbidden = status === 403
  const notFound = status === 404

  return (
    <main id="noi-dung-chinh" className="grid min-h-svh place-items-center p-6">
      <div className="space-y-4">
        <PageHeader title={forbidden ? 'Bạn không có quyền' : notFound ? 'Không tìm thấy trang' : 'Không tải được trang'} />
        {forbidden || notFound
          ? <Button asChild><Link to="/">Về trang tổng quan</Link></Button>
          : <ErrorState onRetry={() => void revalidator.revalidate()} />}
      </div>
    </main>
  )
}
