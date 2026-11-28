"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { logoutAction } from "@/lib/actions/auth";

/** Đăng xuất dùng chung cho menu người dùng (desktop) và menu di động. */
export function useLogout() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function logout() {
    startTransition(async () => {
      await logoutAction(window.location.pathname === "/account");
      toast.success("Bạn đã đăng xuất");
      router.refresh();
    });
  }

  return { logout, pending };
}
