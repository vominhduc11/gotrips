import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { SERVICE_UNAVAILABLE } from '@/components/common/error-state'
import { useAdminLogout } from '@/lib/api/generated/api'

export function useLogout() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const logout = useAdminLogout({
    mutation: {
      onSuccess: async () => {
        await queryClient.cancelQueries()
        queryClient.clear()
        await navigate('/login', { replace: true })
        toast.success('Đã đăng xuất')
      },
      onError: () => toast.error(SERVICE_UNAVAILABLE),
    },
  })
  return { logout: logout.mutate, isPending: logout.isPending }
}
