import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppProviders } from '@/app/providers'
import { createAppQueryClient } from '@/app/query-client'
import { createAdminRoutes } from '@/app/router'
import { buildLoginHref } from '@/lib/safe-redirect'

let redirecting = false
const queryClient = createAppQueryClient((reason): void => {
  if (redirecting) return
  const { pathname, search, hash } = router.state.location
  if (pathname === '/login') return
  redirecting = true
  void (async () => {
    try {
      await queryClient.cancelQueries()
      queryClient.clear()
      await router.navigate(buildLoginHref(pathname + search + hash, reason === 'revoked'), { replace: true })
    } finally {
      redirecting = false
    }
  })()
})
const router = createBrowserRouter(createAdminRoutes(queryClient))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
