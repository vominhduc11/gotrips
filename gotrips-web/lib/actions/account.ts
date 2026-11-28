"use server";

import { refresh } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { changeMyPassword, updateMe } from "@/lib/api/generated";
import type { UserResponse } from "@/lib/api/generated/model";
import { ApiError } from "@/lib/api/http";
import { bearerRequestInit } from "@/lib/auth/bearer";
import { getSessionToken } from "@/lib/auth/session";
import { buildLoginHref } from "@/lib/safe-redirect";
import { changePasswordSchema, profileSchema } from "@/lib/schemas/account";
import { fromApiFieldErrors, toFieldErrors, toFormPath } from "./field-errors";
import { SERVICE_UNAVAILABLE_MESSAGE } from "./messages";

type AccountActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; fieldErrors?: Record<string, string>; message?: string };

async function submitAccountChange<T>(
  send: (init: RequestInit) => Promise<T>,
  fields: readonly string[],
): Promise<AccountActionResult<T>> {
  const token = await getSessionToken();
  if (!token) redirect(buildLoginHref("/account"));

  try {
    return { ok: true, data: await send(bearerRequestInit(token)) };
  } catch (error) {
    unstable_rethrow(error);
    if (error instanceof ApiError && error.status === 401) redirect(buildLoginHref("/account"));
    if (error instanceof ApiError && error.status === 400) {
      const fieldErrors = fromApiFieldErrors(error.errors, fields);
      const needsMessage = !Object.keys(fieldErrors).length
        || error.errors?.some(({ field }) => !fields.includes(toFormPath(field)));
      return { ok: false, fieldErrors, message: needsMessage ? error.detail ?? "Dữ liệu chưa hợp lệ." : undefined };
    }

    console.error("[tài khoản] Không cập nhật được tài khoản:", error instanceof ApiError ? error.status : "lỗi kết nối");
    return { ok: false, message: SERVICE_UNAVAILABLE_MESSAGE };
  }
}

export async function updateProfileAction(values: unknown): Promise<AccountActionResult<Pick<UserResponse, "fullName" | "phone">>> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  const { fullName, phone } = parsed.data;
  const result = await submitAccountChange(async (init) => {
    const { data } = await updateMe({ fullName, phone: phone || null }, init);
    return { fullName: data.fullName, phone: data.phone };
  }, ["fullName", "phone"]);

  if (result.ok) refresh();
  return result;
}

export async function changePasswordAction(values: unknown): Promise<AccountActionResult<void>> {
  const parsed = changePasswordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, fieldErrors: toFieldErrors(parsed.error.issues) };

  const { currentPassword, newPassword } = parsed.data;
  return submitAccountChange(async (init) => {
    await changeMyPassword({ currentPassword, newPassword }, init);
  }, ["currentPassword", "newPassword"]);
}
