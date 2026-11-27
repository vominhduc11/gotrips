import { useQuery } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { adminMeOptions, hasAdminRole } from '@/features/auth/session'
import { AppBreadcrumb } from './app-breadcrumb'
import { AppSidebar } from './app-sidebar'
import { adminNavigation } from './navigation'
import { UserMenu } from './user-menu'

export function AdminLayout() {
  const { data: user } = useQuery(adminMeOptions())
  if (!user) return null

  return (
    <SidebarProvider>
      <a href="#noi-dung-chinh"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:p-3">
        Bỏ qua đến nội dung chính
      </a>
      <AppSidebar items={adminNavigation} isAdmin={hasAdminRole(user)} />
      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4">
          <SidebarTrigger aria-label="Thu hoặc mở thanh điều hướng" />
          <AppBreadcrumb />
          <div className="ml-auto"><UserMenu user={user} /></div>
        </header>
        <main id="noi-dung-chinh" tabIndex={-1} className="flex-1 p-4 outline-none md:p-6">
          <Outlet context={user} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
