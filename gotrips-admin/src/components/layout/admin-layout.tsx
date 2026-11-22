import { LayoutDashboard } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'

/**
 * Khung chung của trang quản trị: sidebar điều hướng bên trái và vùng nội dung chứa route con.
 * Chỉ là khung tạm, các mục menu sẽ bổ sung khi có tính năng thật.
 */
export function AdminLayout() {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <span className="px-2 text-sm font-semibold">GoTrips Admin</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  {/* asChild để NavLink làm phần tử gốc, giữ đúng việc điều hướng và trạng thái active. */}
                  <SidebarMenuButton asChild>
                    <NavLink to="/">
                      <LayoutDashboard />
                      <span>Tổng quan</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-12 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <span className="text-sm text-muted-foreground">Trang quản trị GoTrips</span>
        </header>
        <main id="noi-dung-chinh" className="flex-1 p-4">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
