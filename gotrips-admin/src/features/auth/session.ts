import { getGetAdminMeQueryOptions } from '@/lib/api/generated/api'
import type { UserResponse } from '@/lib/api/generated/model'

export function adminMeOptions() {
  return getGetAdminMeQueryOptions({
    query: {
      meta: { session: true },
      staleTime: 0,
      retry: false,
    },
  })
}

export function hasAdminRole(user: UserResponse) {
  return user.roles.includes('ADMIN')
}
