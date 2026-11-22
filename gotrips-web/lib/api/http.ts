import "server-only";

/**
 * Lớp HTTP duy nhất để gọi gotrips-api. Chỉ chạy phía server (`server-only`): web gọi API từ Server
 * Component / Server Action, trình duyệt không gọi thẳng API và địa chỉ nội bộ không lộ ra client.
 *
 * - Dùng native `fetch` nên vẫn dùng được các tuỳ chọn cache mở rộng của Next (`next: { tags }`...).
 * - Lỗi từ Spring (`application/problem+json`, RFC 9457) được chuyển thành `ApiError`.
 * - Hàm `customFetch` là "mutator" cho Orval (xem orval.config.ts); code còn lại dùng `apiFetch`.
 */

const DEFAULT_API_URL = "http://localhost:8080";
/** API chậm hơn mức này coi như lỗi, để trang không treo vô hạn. */
const DEFAULT_TIMEOUT_MS = 10_000;

/** Lỗi theo từng field mà GlobalExceptionHandler của API trả trong `errors` (khi 400 do validate). */
export interface ApiFieldError {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly title: string;
  readonly detail?: string;
  readonly errors?: ApiFieldError[];

  constructor({
    status,
    title,
    detail,
    errors,
  }: {
    status: number;
    title: string;
    detail?: string;
    errors?: ApiFieldError[];
  }) {
    super(detail ?? title);
    this.name = "ApiError";
    this.status = status;
    this.title = title;
    this.detail = detail;
    this.errors = errors;
  }
}

export type ApiRequestInit = Omit<RequestInit, "body"> & {
  /** Object/mảng sẽ được `JSON.stringify` và gửi kèm `Content-Type: application/json`. */
  json?: unknown;
  /** Mặc định 10 giây. */
  timeoutMs?: number;
};

/** Đọc địa chỉ API lúc gọi (không chốt lúc import) để đổi biến môi trường không cần sửa code. */
export function getApiBaseUrl(): string {
  return (process.env.API_URL ?? DEFAULT_API_URL).replace(/\/+$/, "");
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiBaseUrl()}${path.startsWith("/") ? "" : "/"}${path}`;
}

function parseFieldErrors(value: unknown): ApiFieldError[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const parsed = value.flatMap((item): ApiFieldError[] => {
    if (item && typeof item === "object" && "field" in item && "message" in item) {
      return [{ field: String(item.field), message: String(item.message) }];
    }
    return [];
  });
  return parsed.length > 0 ? parsed : undefined;
}

/** Chuyển phản hồi lỗi thành ApiError; vẫn tạo được lỗi có nghĩa khi body không phải ProblemDetail. */
async function toApiError(response: Response): Promise<ApiError> {
  const fallbackTitle = response.statusText || `Lỗi ${response.status}`;
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("json")) {
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object") {
        const problem = body as Record<string, unknown>;
        return new ApiError({
          status: typeof problem.status === "number" ? problem.status : response.status,
          title: typeof problem.title === "string" ? problem.title : fallbackTitle,
          detail: typeof problem.detail === "string" ? problem.detail : undefined,
          errors: parseFieldErrors(problem.errors),
        });
      }
    } catch {
      // Body JSON hỏng: dùng thông tin từ mã trạng thái bên dưới.
    }
  }
  return new ApiError({ status: response.status, title: fallbackTitle });
}

function buildInit({ json, timeoutMs = DEFAULT_TIMEOUT_MS, headers, signal, ...rest }: ApiRequestInit): RequestInit {
  const merged = new Headers(headers);
  if (!merged.has("Accept")) merged.set("Accept", "application/json, application/problem+json");

  let body: string | undefined;
  if (json !== undefined) {
    body = JSON.stringify(json);
    if (!merged.has("Content-Type")) merged.set("Content-Type", "application/json");
  }

  const timeout = AbortSignal.timeout(timeoutMs);
  return {
    ...rest,
    headers: merged,
    body,
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  };
}

/** Gọi API và trả dữ liệu đã parse (kiểu `T` do nơi gọi khai báo; 204 trả `undefined`). Lỗi → `ApiError`. */
export async function apiFetch<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(path), buildInit(init));
  if (!response.ok) throw await toApiError(response);
  if (response.status === 204 || response.status === 205) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Mutator cho Orval (`client: "fetch"`). Client sinh ra gọi hàm này với `url` và `RequestInit`,
 * và mong nhận về `{ data, status, headers }`. Lỗi HTTP ném `ApiError` giống `apiFetch`.
 */
export async function customFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(buildUrl(url), buildInit(init));
  if (!response.ok) throw await toApiError(response);

  const hasBody = ![204, 205, 304].includes(response.status);
  const text = hasBody ? await response.text() : "";
  const data = text ? JSON.parse(text) : undefined;
  return { data, status: response.status, headers: response.headers } as T;
}
