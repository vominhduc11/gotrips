import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router'
import './index.css'
import { AppProviders } from '@/app/providers'
import { routes } from '@/app/router'

// Tạo router một lần khi khởi động. Data mode (createBrowserRouter) để sau này dùng được loader/action.
const router = createBrowserRouter(routes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
