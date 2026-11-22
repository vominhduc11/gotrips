# CLAUDE.md

Ngữ cảnh đầu vào cho Claude Code khi làm việc trong repo **GoTrips** — nền tảng đặt tour du lịch trực tuyến (MVP). Trả lời và viết comment bằng **tiếng Việt**, trừ khi người dùng yêu cầu khác.

## Tổng quan monorepo

| Thư mục | Vai trò | Công nghệ | Cổng (Docker) |
|---|---|---|---|
| `gotrips-api/` | Backend REST API | Spring Boot 4.1 (Maven), Java 25, JPA, Flyway, PostgreSQL, Spring Security, Actuator, springdoc-openapi | 8080 |
| `gotrips-admin/` | Trang quản trị (SPA) | React 19 + Vite 8 + TypeScript, phục vụ bằng nginx | 8081 → 80 |
| `gotrips-web/` | Website khách hàng | Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript | 3000 |
| (gốc) `docker-compose.yml` | PostgreSQL 17 + 3 service trên | | DB 127.0.0.1:5432 |

Tài liệu nghiệp vụ ở gốc repo (`.docx`): `GoTrips_Phan_tich_chuc_nang_va_MVP.docx` (phân tích chức năng & MVP) — đọc khi cần hiểu phạm vi MVP.

### Trạng thái hiện tại
- `gotrips-api`: mới có khung (SecurityConfig, actuator health), **chưa có entity/controller/migration**. Thư mục `db/migration` chưa tồn tại (Flyway cấu hình `fail-on-missing-locations: false`).
- `gotrips-admin`: vẫn là template Vite mặc định.
- `gotrips-web`: Trang chủ đã dựng xong bằng **dữ liệu mock** (chưa gọi API thật).
- **Combo thư viện đã chốt** (22/11/2026) — xem mục "Quy tắc dùng thư viện". Muốn biết thư viện nào **đã cài thật** thì xem `package.json` / `pom.xml`, không suy ra từ file này.

## Lệnh thường dùng

Chạy toàn bộ stack (cần Docker, file `.env` copy từ `.env.example`):
```bash
docker compose up --build
```

Chạy từng phần khi phát triển (chạy DB bằng `docker compose up gotrips-db` trước):
```bash
# API (từ gotrips-api/) — mặc định nối DB localhost:5432
./mvnw spring-boot:run
./mvnw test

# Admin (từ gotrips-admin/)
npm run dev        # vite
npm run build      # tsc -b && vite build
npm run lint

# Web (từ gotrips-web/)
npm run dev
npm run build
npm run lint

# Có sau khi chạy prompt cài thư viện (web + admin):
npm test           # vitest
npm run test:e2e   # playwright (chỉ web), chạy trên cổng 3100
npm run api:gen    # orval: sinh client/type từ http://localhost:8080/v3/api-docs
```

### Lưu ý môi trường (máy dev Windows của người dùng)
- **Cổng 3000 do Docker chiếm** (container `gotrips-web`). Khi chạy dev server riêng hãy dùng cổng khác, ví dụ `next dev -p 3100`.
- Test E2E của dự án dùng `@playwright/test` trong `gotrips-web` (nếu đã cài). Chỉ khi cần kiểm tra giao diện nhanh, ngoài bộ test, mới dùng `playwright-core` đặt trong thư mục scratchpad, và không cài thêm vào repo.
- Shell chính là PowerShell; Bash (Git Bash) cũng dùng được.

## Quy ước chung
- **Không commit** `.env`, `.env.*` (trừ `.env.example`) hay bí mật. Mật khẩu DB chỉ nằm trong `.env`.
- Ngôn ngữ giao diện: **tiếng Việt** (`<html lang="vi">`). Định dạng số/ngày theo `vi-VN` (xem `gotrips-web/lib/format.ts`: `formatVND`, `formatDate`, `formatDuration`...).
- Comment trong code viết bằng tiếng Việt, giải thích *vì sao* chứ không chỉ *làm gì*.
- Chỉ commit / push khi người dùng yêu cầu.

## Quy tắc dùng thư viện (BẮT BUỘC, áp dụng cho cả 3 dự án)

Mục tiêu: session nào cũng dùng đúng thư viện đã chốt, **không "code chay"** lại thứ thư viện đã làm được, và cũng **không dùng thư viện sai chỗ**.

1. **Đọc manifest trước khi viết code.** Mở `package.json` (web, admin) hoặc `pom.xml` (api) của dự án đang sửa và đối chiếu với các bảng bên dưới.
2. **Thư viện đã cài thì bắt buộc dùng.** Không tự viết lại chức năng mà thư viện đã cài cung cấp: quản lý form, validation, fetch/cache phía client, component UI, icon, toast, xử lý ngày, bảng dữ liệu, map DTO, test.
3. **Thư viện có trong bảng nhưng chưa cài:** không viết tạm bằng code tay, cũng không tự chọn thư viện khác thay thế. Dừng lại, báo người dùng và đề xuất lệnh cài đúng thư viện trong bảng.
4. **Thư viện ngoài bảng:** không tự thêm. Phải hỏi người dùng trước. Khi được duyệt thì cập nhật bảng trong file này cùng lúc với việc cài.
5. **Đúng phạm vi.** "Dùng triệt để" nghĩa là dùng thư viện cho đúng việc ghi ở cột "Dùng cho". Không đưa thư viện vào những chỗ ghi ở cột "Không dùng cho".
6. **Code viết tay có từ trước** (SVG icon tự vẽ, Button tự viết, form validate bằng `useState`…): không viết thêm code mới theo kiểu cũ. Khi sửa vào file đó thì chuyển nó sang thư viện tương ứng.
7. **Dùng API theo đúng phiên bản đã cài, không theo trí nhớ.** Nhiều thư viện vừa có bản lớn mới: Next 16, React Router 8, Zod 4, TanStack Table 9, Tailwind 4, Spring Boot 4, Testcontainers 2. Hãy đọc docs đi kèm package hoặc docs chính thức của đúng phiên bản.

### gotrips-web

| Việc | Dùng cho | Không dùng cho / lưu ý |
|---|---|---|
| Đọc dữ liệu hiển thị trang (danh mục, chi tiết, SEO) | Server Component → `lib/data/*` → `lib/api/http.ts` (native `fetch`) + `"use cache"` / `cacheLife` / `cacheTag` | Không dùng TanStack Query, không dùng `useEffect` + fetch |
| Ghi dữ liệu (đăng nhập, tạo booking, gửi form) | Server Action + `revalidateTag`. Form phía client dùng React Hook Form | Không gọi API trực tiếp từ trình duyệt khi Server Action làm được |
| Dữ liệu phía client, riêng từng người dùng, thay đổi liên tục (lịch sử booking, trạng thái thanh toán, kiểm tra phòng trống khi đổi ngày) | TanStack Query (`queryOptions`, `useMutation`). Provider đặt ở `app/providers.tsx` | Không cache cùng một dữ liệu ở cả `"use cache"` lẫn TanStack Query mà không phối hợp invalidate |
| HTTP | native `fetch`, chỉ gọi qua `lib/api/http.ts` | Không dùng Axios, không gọi `fetch` rải rác trong component |
| Form | React Hook Form + `@hookform/resolvers/zod` + component `field`/`form` của shadcn | Không quản lý form bằng nhiều `useState` |
| Validation | Zod. Schema dùng chung đặt ở `lib/schemas/*`, dùng cho cả client lẫn Server Action | Không validate bằng regex hoặc if-else rải rác |
| UI primitive (button, input, dialog, select, sheet, popover, tabs…) | shadcn/ui trong `components/ui/` (Radix) | Không tự viết lại các primitive này; không thêm thư viện UI thứ hai |
| Component riêng của GoTrips | `components/common/`, `components/<tính năng>/` | Không đặt vào `components/ui/` (thư mục này chỉ dành cho shadcn) |
| Icon | `lucide-react` | Không tự vẽ SVG icon |
| Toast / thông báo | Sonner (`toast()`, `<Toaster />` trong providers) | Không tự làm toast bằng state |
| Ngày | Tính toán: `date-fns` trên chuỗi `YYYY-MM-DD`. Hiển thị: `lib/format.ts`. Chọn ngày: `Calendar` của shadcn (react-day-picker). "Hôm nay": `getTodayInVietnam()` | Không gọi `new Date()` rải rác; không chuyển ngày `DATE` sang có múi giờ |
| Lọc / sắp xếp / phân trang / bước booking | URL search params | Không lưu các giá trị này vào state toàn cục |
| Ghép class | `cn()` trong `lib/cn.ts`, là hàm `cn` **duy nhất** (alias `utils` của shadcn trỏ về đây) | Không tạo thêm `lib/utils.ts`. Nếu `cn()` chưa dùng `tailwind-merge` thì không truyền class chồng nhau |
| Kiểu DTO của API | Sinh bằng Orval vào `lib/api/generated/` (`npm run api:gen`). Kiểu "View" vẫn nằm ở `lib/types.ts` | Không viết tay DTO mà Orval đã sinh; không sửa file trong `generated/` |
| SEO | Metadata API, `generateMetadata`, `sitemap.ts`, `robots.ts`, JSON-LD | Không thêm thư viện SEO |
| Unit test | Vitest, file `*.test.ts` đặt cạnh file nguồn | Không test async Server Component bằng Vitest (dùng Playwright) |
| E2E | Playwright, thư mục `e2e/`, cổng 3100 | |

### gotrips-admin

| Việc | Dùng cho | Không dùng cho / lưu ý |
|---|---|---|
| Định tuyến | React Router, data mode (`createBrowserRouter` + `RouterProvider`) | Không tự xử lý `window.location` |
| Dữ liệu server (đọc và ghi) | TanStack Query: `queryOptions` theo từng tính năng, `useMutation`, invalidate query sau khi mutation | Không dùng `useEffect` + fetch; không copy dữ liệu server sang `useState` hoặc store |
| Bảng dữ liệu (tour, booking, khách hàng) | TanStack Table + `Table` của shadcn | Không tự viết logic sort / filter / phân trang cho bảng |
| HTTP | native `fetch` qua `src/lib/api/http.ts` (`credentials: "include"`), hoặc client do Orval sinh | Không dùng Axios |
| Form / validation | React Hook Form + Zod (+ `field`/`form` của shadcn) | |
| UI / icon / toast / biểu đồ | shadcn/ui, `lucide-react`, Sonner, `Chart` của shadcn (Recharts) | Không thêm thư viện UI hoặc thư viện biểu đồ khác |
| Ngày | `date-fns` + `Calendar` của shadcn | |
| API client | Orval (`client: "react-query"`), sinh vào `src/lib/api/generated/` | Không viết tay hook hoặc DTO mà Orval đã sinh |
| Test | Vitest + Testing Library (jsdom) | |

### gotrips-api

| Việc | Dùng cho | Không dùng cho / lưu ý |
|---|---|---|
| Validate request | `spring-boot-starter-validation`: `@Valid` + annotation `jakarta.validation` trên DTO | Không kiểm tra thủ công bằng if-else trong controller |
| Entity ↔ DTO | MapStruct, `@Mapper(config = MapStructConfig.class)` | Không map tay từng field; không trả entity ra controller |
| Code lặp (boilerplate) | Lombok (`@Getter`, `@Setter`, `@RequiredArgsConstructor`, `@Builder`). DTO ưu tiên dùng `record` | Entity JPA không dùng `@Data` (vì `equals`/`hashCode` và lazy-load) |
| Truy cập DB | Spring Data JPA repository (+ `@Query` khi cần) | Không viết JDBC thủ công nếu không có lý do rõ ràng |
| Thay đổi schema | Flyway migration `V{n}__*.sql` | Không đổi `ddl-auto` sang giá trị khác `validate` |
| Định dạng lỗi API | `ProblemDetail` + `@RestControllerAdvice` dùng chung | Không tự đặt ra format lỗi khác |
| Xác thực | Spring Security + OAuth2 Resource Server (JWT bằng Nimbus) | Không thêm jjwt hay thư viện JWT khác |
| Gọi HTTP ra ngoài (cổng thanh toán…) | `RestClient` của Spring | Không thêm OkHttp, Feign, Apache HttpClient |
| Email / realtime | `spring-boot-starter-mail` + template Thymeleaf; `spring-boot-starter-websocket` | |
| Tài liệu API | springdoc-openapi. Annotate controller và DTO đầy đủ để Orval sinh client chính xác | |
| Test | JUnit 5 + các starter test + Testcontainers PostgreSQL (`@ServiceConnection`) | Không test repository bằng H2 |

### Không dùng trong toàn repo (đã cân nhắc và loại)
Zustand, MSW, Axios, next-intl, NextAuth/Auth.js, Prisma/Drizzle (hay bất kỳ ORM nào trong Next.js), thư viện UI thứ hai (MUI, Chakra, Ant…), jjwt, ModelMapper. Lý do: trùng vai trò với thư viện đã chọn (state đã phân vai, `lib/data` thay MSW, `fetch` đủ dùng, MVP chỉ tiếng Việt, Spring Security lo xác thực, Next không truy cập DB). Nếu thực sự cần thì hỏi người dùng trước.

## gotrips-api (Spring Boot)

- Package gốc: `com.gotrips.gotrips_api` (lưu ý dấu gạch dưới). Cấu hình ở `src/main/resources/application.yaml`.
- **Schema do Flyway quản lý**, Hibernate chỉ `ddl-auto: validate` → mọi thay đổi bảng phải là file migration mới trong `src/main/resources/db/migration` (`V1__...sql`), không sửa migration đã áp dụng.
- `open-in-view: false` → không lazy-load ngoài transaction; map sang DTO trong service.
- Bảo mật (`config/SecurityConfig.java`): stateless, CSRF tắt, HTTP Basic, chỉ `/actuator/health/**` mở công khai, còn lại cần xác thực. Khi thêm endpoint công khai cho website (danh sách tour...) phải mở rõ ràng trong cấu hình này.
- Actuator chỉ expose `health,info`; Docker healthcheck phụ thuộc `/actuator/health` trả `UP` — **đừng làm hỏng**, vì `gotrips-admin` và `gotrips-web` đợi API healthy mới khởi động.
- Lombok dùng qua `annotationProcessorPaths` trong `pom.xml`.
- Tài liệu API: springdoc-openapi (Swagger UI).

## gotrips-admin (React + Vite)
- TypeScript, ESLint 10 flat config. Build production được nginx phục vụ với fallback SPA (`nginx.conf`: mọi route → `index.html`).
- Stack đã chốt: React Router, TanStack Query/Table, React Hook Form + Zod, Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui. Chi tiết ở bảng "gotrips-admin" thuộc mục Quy tắc dùng thư viện. Alias `@/*` → `src/*`.

## gotrips-web (Next.js)

> **Quan trọng:** đây là Next.js 16 với breaking changes so với kiến thức cũ. `gotrips-web/AGENTS.md` yêu cầu đọc tài liệu trong `gotrips-web/node_modules/next/dist/docs/` **trước khi viết code Next.js**. Chú ý các deprecation notice.

### Cấu hình đáng chú ý (`next.config.ts`)
- `output: "standalone"` (Docker chạy `node server.js`), `cacheComponents: true`, `partialPrefetching: true`.
- Tailwind 4 chạy qua `@tailwindcss/turbopack` (khai báo trong `turbopack.rules`).
- Ảnh remote chỉ cho phép `images.unsplash.com/photo-*`.

### Cấu trúc
```
app/                 layout.tsx (Header + <main id="noi-dung-chinh"> + Footer), page.tsx (chỉ ghép section)
components/home/     các section Trang chủ
components/layout/   Header, Footer, MobileNav, Logo, nav-items
components/tour/     TourCard
components/ui/       Button, Badge, Container, CoverImage, AppLink, SectionHeading, icons
                     (sau khi cài thư viện: chỉ còn primitive shadcn; component riêng chuyển sang components/common/)
lib/types.ts         kiểu dữ liệu: nhóm "bảng" (khớp DB MVP) + nhóm "View" (suy ra cho UI)
lib/data/            lớp truy cập dữ liệu — component CHỈ import từ đây
lib/mock/            dữ liệu giả (destinations, tours, departures, testimonials, images, site)
lib/format.ts, cn.ts tiện ích
```
Alias import: `@/*` → thư mục gốc `gotrips-web/`.

### Quy tắc kiến trúc dữ liệu
- Component **không** import `lib/mock/*`; chỉ import `lib/data/*`. Khi chuyển sang API thật, chỉ đổi *thân hàm* trong `lib/data/*` thành `fetch(...)` và map sang kiểu trong `lib/types.ts`; giữ nguyên chữ ký và các directive `"use cache"` / `cacheLife` / `cacheTag`.
- Vì `cacheComponents` bật và logic "ngày còn chỗ" phụ thuộc thời điểm hiện tại, các hàm data phải nằm trong phạm vi `"use cache"` để trang prerender được thành static shell. Dùng `getTodayInVietnam()` (`lib/data/tour-view.ts`), không dùng `new Date()` rải rác.
- Dữ liệu "View" (tourCount, giá thấp nhất, ngày khởi hành gần nhất...) được **tính** trong `lib/data/*`, không lưu trong mock. Tour trạng thái `HIDDEN` không được hiển thị/đếm.
- Sau này admin đổi tour/lịch khởi hành → gọi `revalidateTag("tours")` (các tag: `site`, `destinations`, `tours`).

### Giao diện / design tokens
- Nguồn duy nhất của màu, bo góc, đổ bóng, font là khối `@theme` trong `app/globals.css`. Bảng màu mặc định của Tailwind **đã bị xoá** (`--color-*: initial`) → chỉ dùng token: `primary-*` (teal), `accent-*` (cam, cho giá/CTA), `neutral-*`, `danger/success`, alias `surface`, `ink`, `ink-muted`, `line`; `rounded-control|card|pill`; `shadow-card|card-hover|search|header`. **Không hard-code mã màu.**
- Chỉ có chế độ sáng. Chữ trắng chỉ đặt trên `primary-700+` / `accent-700+` để đạt tương phản AA.
- Font: Be Vietnam Pro (subset `vietnamese` + `latin`, khai báo weight).
- `cn()` (`lib/cn.ts`): xem bảng thư viện ở trên. Nếu file chưa dùng `tailwind-merge` thì `cn()` chỉ nối class, không gộp được class xung đột, nên đừng truyền class chồng nhau.
- **Khi dùng shadcn:** biến `--accent` của shadcn là **nền khi hover** (được gán sang `primary-50`). Nó khác với dải màu cam `accent-*` của GoTrips dùng cho giá và CTA. Cần màu cam thì dùng `accent-700`; không dùng `bg-accent` với ý là màu cam.
- Accessibility: giữ skip-link "Bỏ qua điều hướng", `id="noi-dung-chinh"`, focus ring theo token `focus`.
- **Ảnh hiện tại là ảnh mock Unsplash** (placeholder, không phải ảnh thật của địa danh) — phải thay bằng ảnh thật/có bản quyền trước khi ra mắt (`lib/mock/images.ts`).

## Docker
- Cả 3 Dockerfile là multi-stage trên `node:24-alpine` (web, admin) và build Maven (api). Web chạy non-root.
- Thứ tự khởi động: `gotrips-db` (healthy) → `gotrips-api` (healthy) → `gotrips-admin` & `gotrips-web`.
- Cổng DB chỉ bind `127.0.0.1:5432` để chạy API bằng IDE/mvnw, không lộ ra mạng ngoài.
