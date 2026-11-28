import { LayoutDashboard } from 'lucide-react'
import { NavLink } from 'react-router'
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from '@/components/ui/sidebar'
import { PendingBookingsBadge } from '@/features/bookings/pending-bookings-badge'
import { ReviewTransactionsBadge } from '@/features/payments/review-transactions-badge'
import { TooltipProvider } from '@/components/ui/tooltip'
import { visibleNavigation, type NavigationItem } from './navigation'

export function AppSidebar({ items, isAdmin }: { items: NavigationItem[]; isAdmin: boolean }) {
  const visible = visibleNavigation(items, isAdmin)
  const groups = new Set(visible.map((item) => item.group))
  return (
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <span className="truncate px-2 text-sm font-semibold group-data-[collapsible=icon]:hidden">GoTrips Admin</span>
        </SidebarHeader>
        <SidebarContent>
          {[...groups].map((group) => (
            <SidebarGroup key={group ?? 'root'}>
              {group && <SidebarGroupLabel>{group}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.filter((item) => item.group === group).map(({ to, label, icon: Icon = LayoutDashboard }) => (
                    <SidebarMenuItem key={to}>
                      <SidebarMenuButton asChild tooltip={label}>
                        <NavLink to={to} end={to === '/'} aria-label={label}
                          className="aria-[current=page]:bg-sidebar-accent aria-[current=page]:font-medium">
                          <Icon aria-hidden="true" />
                          <span>{label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                      {to === '/bookings' && <PendingBookingsBadge />}
                      {to === '/payments' && <ReviewTransactionsBadge />}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  )
}
