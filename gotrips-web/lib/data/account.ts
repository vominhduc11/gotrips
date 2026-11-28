import "server-only";

import { getMe } from "@/lib/api/generated";
import type { UserResponse } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/http";
import { bearerRequestInit } from "@/lib/auth/bearer";
import { getSessionToken } from "@/lib/auth/session";

type AccountResult = { status: "unauthenticated" } | { status: "ok"; data: UserResponse };

export async function getMyAccount(): Promise<AccountResult> {
  const token = await getSessionToken();
  if (!token) return { status: "unauthenticated" };

  try {
    const { data } = await getMe(bearerRequestInit(token));
    return { status: "ok", data };
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return { status: "unauthenticated" };
    throw error;
  }
}
