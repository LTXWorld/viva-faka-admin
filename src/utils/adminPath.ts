export type AdminQuery = Record<string, string | number | boolean | null | undefined>

function normalizePrefix(raw: string): string {
  const value = raw.trim()
  if (!value || value === '.' || value === './' || value.includes('__DJ_ADMIN_BASE__')) {
    return ''
  }

  let path = value
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    try {
      path = new URL(value).pathname
    } catch {
      return ''
    }
  }

  path = path.replace(/\/+$/, '')
  if (!path || path === '.') return ''
  return path.startsWith('/') ? path : `/${path}`
}

export function resolveAdminBasePath(input: {
  baseHref?: string | null
  envPath?: string | null
} = {}): string {
  const fromBase = normalizePrefix(String(input.baseHref || ''))
  if (fromBase) return fromBase
  return normalizePrefix(String(input.envPath || ''))
}

export function getAdminBasePath(): string {
  const baseHref = typeof document === 'undefined'
    ? ''
    : document.querySelector('base')?.getAttribute('href') || ''
  const env = (import.meta as ImportMeta & { env?: Record<string, unknown> }).env
  const envPath = typeof env?.VITE_ADMIN_PATH === 'string' ? env.VITE_ADMIN_PATH : ''
  return resolveAdminBasePath({ baseHref, envPath })
}

function joinPathAndQuery(path: string, query?: AdminQuery): string {
  const trimmed = path.trim()
  const pathname = !trimmed ? '/' : trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  if (!query) return pathname

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    params.set(key, String(value))
  }
  const qs = params.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/** Vue Router :to value. History base already includes the admin prefix. */
export function adminTo(path: string, query?: AdminQuery): string {
  return joinPathAndQuery(path, query)
}

/** Absolute href for <a> and window.location, including the runtime admin prefix. */
export function adminHref(path: string, query?: AdminQuery): string {
  return `${getAdminBasePath()}${joinPathAndQuery(path, query)}`
}
