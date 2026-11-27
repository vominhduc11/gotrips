/**
 * Lớp gọi HTTP duy nhất của gotrips-admin, dùng native fetch (không dùng Axios).
 *
 * Orval (src/lib/api/generated) gọi hàm này làm mutator, nên giữ đúng chữ ký
 * `(url, init)` và trả về dữ liệu đã parse. Lỗi từ Spring Boot (ProblemDetail,
 * application/problem+json) được đổi thành ApiError để UI đọc thống nhất.
 */

// Gốc API lấy từ biến build-time VITE_API_URL. Bỏ dấu / cuối để nối path không bị đôi "//".
const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '')

/** Lỗi của một field, đúng format GlobalExceptionHandler của API trả trong `errors` (HTTP 400 do @Valid). */
export interface ApiFieldError {
  field: string
  message: string
}

/** Lỗi API đã chuẩn hóa từ ProblemDetail của Spring. */
export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail?: string
  /** Lỗi theo từng field, dùng để gắn lỗi lên form (react-hook-form `setError`). */
  readonly errors?: ApiFieldError[]

  constructor(init: {
    status: number
    title: string
    detail?: string
    errors?: ApiFieldError[]
  }) {
    super(init.detail ?? init.title)
    this.name = 'ApiError'
    this.status = init.status
    this.title = init.title
    this.detail = init.detail
    this.errors = init.errors
  }
}

// Các trường có thể có trong ProblemDetail; mọi trường đều optional vì body có thể không đầy đủ.
interface ProblemBody {
  title?: string
  detail?: string
  errors?: unknown
}

/** Chỉ giữ các phần tử đúng dạng `{ field, message }`; body lạ thì bỏ qua thay vì làm hỏng UI. */
function parseFieldErrors(value: unknown): ApiFieldError[] | undefined {
  if (!Array.isArray(value)) return undefined
  const parsed = value.flatMap((item): ApiFieldError[] =>
    item && typeof item === 'object' && 'field' in item && 'message' in item
      ? [{ field: String(item.field), message: String(item.message) }]
      : [],
  )
  return parsed.length > 0 ? parsed : undefined
}

async function toApiError(response: Response): Promise<ApiError> {
  const fallbackTitle = response.statusText || 'Yêu cầu thất bại'

  // Không phải JSON (ví dụ proxy trả HTML 502): không có ProblemDetail, chỉ dùng status.
  const contentType = response.headers.get('Content-Type') ?? ''
  if (!contentType.includes('json')) {
    return new ApiError({ status: response.status, title: fallbackTitle })
  }

  // Body JSON hỏng vẫn phải ném ApiError theo status, không để lỗi parse lọt ra ngoài.
  const body: ProblemBody = await response.json().catch((): ProblemBody => ({}))

  return new ApiError({
    status: response.status,
    title: body.title ?? fallbackTitle,
    detail: body.detail,
    errors: parseFieldErrors(body.errors),
  })
}

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS', 'TRACE'])

/**
 * Orval truyền đường dẫn API (ví dụ "/admin/auth/me"). Proxy ở cùng origin xử lý tiền tố "/api".
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  // FormData tự đặt Content-Type kèm boundary; đặt tay sẽ làm hỏng request.
  if (init.body !== undefined && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  const method = (init.method ?? 'GET').toUpperCase()
  if (!safeMethods.has(method) && !headers.has('X-XSRF-TOKEN')) {
    const token = document.cookie.split(';').map((entry) => entry.trim())
      .find((entry) => entry.startsWith('XSRF-TOKEN='))?.slice('XSRF-TOKEN='.length)
    if (token) headers.set('X-XSRF-TOKEN', token)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })

  if (!response.ok) {
    throw await toApiError(response)
  }

  // 204 hoặc body rỗng không có JSON để parse.
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}
