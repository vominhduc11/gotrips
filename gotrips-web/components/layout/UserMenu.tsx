"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, type SessionUser } from "@/lib/auth/user";
import { useLogout } from "./use-logout";

/** Menu người dùng ở Header (desktop): avatar + tên, mở ra email và nút đăng xuất. */
export function UserMenu({ user }: { user: SessionUser }) {
  const { logout, pending } = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Tài khoản của ${user.name}`}
        className="inline-flex h-10 items-center gap-2 rounded-pill py-1 pl-1 pr-3 text-sm font-medium text-ink hover:bg-primary-50 data-[state=open]:bg-primary-50"
      >
        <Avatar>
          <AvatarFallback className="bg-primary-700 text-xs font-semibold text-white">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-32 truncate">{user.name}</span>
        <ChevronDown aria-hidden="true" className="size-4 text-ink-muted" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="flex flex-col gap-0.5 py-2">
          <span className="text-sm font-semibold text-ink">{user.name}</span>
          <span className="truncate text-xs font-normal text-ink-muted">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled={pending} onSelect={logout} className="min-h-10 cursor-pointer">
          <LogOut aria-hidden="true" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
