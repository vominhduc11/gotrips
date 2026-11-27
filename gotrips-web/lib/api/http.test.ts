import { afterEach, describe, expect, it, vi } from "vitest";

// `server-only` ném lỗi khi import ngoài môi trường server của Next; ở đây chỉ kiểm logic HTTP thuần.
vi.mock("server-only", () => ({}));

import { ApiError, apiFetch, customFetch } from "./http";

const fetchSpy = vi.fn<typeof fetch>();

function fakeResponse(body: unknown, init: ResponseInit & { contentType?: string } = {}): Response {
  const { contentType = "application/json", ...rest } = init;
  return new Response(body === undefined ? null : JSON.stringify(body), {
    ...rest,
    headers: { "Content-Type": contentType },
  });
}

/** Request cuối cùng mà code đã gửi tới `fetch`. */
function lastRequest() {
  const [url, init] = fetchSpy.mock.calls.at(-1)!;
  return { url: String(url), init: init as RequestInit, headers: new Headers(init?.headers) };
}

afterEach(() => {
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

function stubFetch() {
  vi.stubGlobal("fetch", fetchSpy);
}

describe("customFetch (mutator của Orval)", () => {
  it("giữ nguyên body và header mà client do Orval truyền vào", async () => {
    // Lỗi cũ: body của client Orval bị ghi đè thành undefined nên API nhận request rỗng ("Failed to read request").
    stubFetch();
    fetchSpy.mockResolvedValue(fakeResponse({ ok: true }, { status: 201 }));

    await customFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer abc" },
      body: JSON.stringify({ email: "an@example.com" }),
    });

    const { url, init, headers } = lastRequest();
    expect(url).toBe("http://localhost:8080/auth/register");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"email":"an@example.com"}');
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("Authorization")).toBe("Bearer abc");
    expect(headers.get("Accept")).toContain("application/json");
  });

  it("trả { data, status, headers } như client Orval mong đợi", async () => {
    stubFetch();
    fetchSpy.mockResolvedValue(fakeResponse({ id: "1" }, { status: 201 }));

    const result = await customFetch<{ data: { id: string }; status: number; headers: Headers }>("/x");

    expect(result.data).toEqual({ id: "1" });
    expect(result.status).toBe(201);
    expect(result.headers.get("Content-Type")).toBe("application/json");
  });

  it("204 không có body thì data là undefined", async () => {
    stubFetch();
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await customFetch<{ data: unknown; status: number }>("/x", { method: "DELETE" });

    expect(result.status).toBe(204);
    expect(result.data).toBeUndefined();
  });

  it("đọc địa chỉ API từ biến môi trường API_URL lúc gọi (bỏ dấu / cuối)", async () => {
    vi.stubEnv("API_URL", "http://gotrips-api:8080/");
    stubFetch();
    fetchSpy.mockResolvedValue(fakeResponse({}));

    await customFetch("/auth/me");

    expect(lastRequest().url).toBe("http://gotrips-api:8080/auth/me");
  });
});

describe("apiFetch", () => {
  it("tự tạo body JSON và Content-Type từ `json`", async () => {
    stubFetch();
    fetchSpy.mockResolvedValue(fakeResponse({ ok: true }));

    await apiFetch("/x", { method: "POST", json: { a: 1 } });

    const { init, headers } = lastRequest();
    expect(init.body).toBe('{"a":1}');
    expect(headers.get("Content-Type")).toBe("application/json");
  });

  it("không gửi body khi không có json", async () => {
    stubFetch();
    fetchSpy.mockResolvedValue(fakeResponse({ ok: true }));

    await apiFetch("/x");

    expect(lastRequest().init.body).toBeUndefined();
  });
});

describe("lỗi từ API (ProblemDetail → ApiError)", () => {
  const problem = {
    status: 409,
    title: "Email đã được đăng ký",
    detail: "Email này đã được đăng ký.",
    errors: [
      { field: "email", message: "Email này đã được đăng ký." },
      { hello: "không phải lỗi field" },
    ],
  };

  it("customFetch ném ApiError có status, detail và errors theo field", async () => {
    stubFetch();
    fetchSpy.mockResolvedValue(fakeResponse(problem, { status: 409, contentType: "application/problem+json" }));

    const error = await customFetch("/auth/register", { method: "POST" }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 409,
      title: "Email đã được đăng ký",
      detail: "Email này đã được đăng ký.",
      errors: [{ field: "email", message: "Email này đã được đăng ký." }], // phần tử sai dạng bị bỏ
    });
  });

  it("body không phải JSON vẫn cho ApiError có nghĩa theo mã trạng thái", async () => {
    stubFetch();
    fetchSpy.mockResolvedValue(new Response("<html>Bad Gateway</html>", { status: 502, statusText: "Bad Gateway" }));

    const error = await apiFetch("/x").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 502, title: "Bad Gateway" });
  });
});
