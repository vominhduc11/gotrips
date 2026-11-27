import { useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router'

export function PageHeader({ title, description, action }: {
  title: string
  description?: string
  action?: ReactNode
}) {
  const heading = useRef<HTMLHeadingElement>(null)
  const { pathname } = useLocation()

  useEffect(() => heading.current?.focus({ preventScroll: true }), [pathname, title])

  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <h1 ref={heading} tabIndex={-1} className="text-2xl font-semibold tracking-tight outline-none">
          {title}
        </h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </header>
  )
}
