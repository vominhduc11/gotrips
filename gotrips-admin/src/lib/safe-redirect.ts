export function getSafeRedirectPath(value: unknown, fallback = '/') {
  if (typeof value !== 'string' || value.length > 2000) return fallback
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return fallback
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 32 || code === 127) return fallback
  }
  return value
}

export function buildLoginHref(next: string, revoked = false) {
  const params = new URLSearchParams()
  const safe = getSafeRedirectPath(next, '')
  if (safe) params.set('next', safe)
  if (revoked) params.set('reason', 'access-revoked')
  return params.size ? `/login?${params}` : '/login'
}
