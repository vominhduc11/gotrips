import { ChevronDown, KeyRound, LogOut, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { hasAdminRole } from '@/features/auth/session'
import { useLogout } from '@/features/auth/use-logout'
import type { UserResponse } from '@/lib/api/generated/model'

export function UserMenu({ user }: { user: UserResponse }) {
  const { logout, isPending } = useLogout()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" aria-label={`Tài khoản của ${user.fullName}`}>
          <Avatar size="sm">
            <AvatarFallback><UserRound aria-hidden="true" /></AvatarFallback>
          </Avatar>
          <span className="hidden max-w-52 truncate sm:inline">{user.fullName}</span>
          <ChevronDown aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          <p>{user.fullName}</p>
          <p className="text-xs font-normal text-muted-foreground">{hasAdminRole(user) ? 'Quản trị viên' : 'Nhân viên'}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/account/password"><KeyRound aria-hidden="true" />Đổi mật khẩu</Link>
        </DropdownMenuItem>
        <DropdownMenuItem disabled={isPending} onSelect={() => logout()}>
          <LogOut aria-hidden="true" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
