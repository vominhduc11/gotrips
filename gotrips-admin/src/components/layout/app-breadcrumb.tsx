import { Fragment } from 'react'
import { Link, useMatches } from 'react-router'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'

export function AppBreadcrumb() {
  const crumbs = useMatches().flatMap(({ handle, pathname, id }) => {
    if (handle && typeof handle === 'object' && 'breadcrumb' in handle && typeof handle.breadcrumb === 'string') {
      return [{ pathname, id, label: handle.breadcrumb }]
    }
    return []
  })
  return (
    <Breadcrumb aria-label="Đường dẫn trang">
      <BreadcrumbList>
        {crumbs.map(({ id, pathname, label }, index) => (
          <Fragment key={id}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {index === crumbs.length - 1 ? <BreadcrumbPage>{label}</BreadcrumbPage>
                : <BreadcrumbLink asChild><Link to={pathname}>{label}</Link></BreadcrumbLink>}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
