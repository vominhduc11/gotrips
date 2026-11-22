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
- `gotrips-api`: đã cài thư viện nền (validation, OAuth2 resource server — chưa bật, MapStruct, Testcontainers, CORS, ProblemDetail) nhưng **chưa có entity/controller/migration**. Thư mục `db/migration` chưa tồn tại (Flyway cấu hình `fail-on-missing-locations: false`).
- `gotrips-admin`: đã dọn template Vite, cài và cấu hình đủ thư viện; mới có Dashboard tạm và trang 404, chưa gọi API (xem mục "gotrips-admin" bên dưới).
- `gotrips-web`: Trang chủ đã dựng xong bằng **dữ liệu mock** (chưa gọi API thật). Đã cài và cấu hình đủ thư viện; `lib/api/http.ts` và Orval đã sẵn sàng nhưng chưa có chỗ nào gọi API.
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

# Web + admin
npm test           # vitest run (web: 18 test đơn vị; test:watch để chạy chế độ theo dõi)
npm run api:gen    # orval: sinh client/type từ http://localhost:8080/v3/api-docs (API phải đang chạy)

# Chỉ web
npm run test:e2e   # playwright (thư mục e2e/): tự build rồi chạy next start trên cổng 3100
```

### Lưu ý môi trường (máy dev Windows của người dùng)
- **Cổng 3000 do Docker chiếm** (container `gotrips-web`). Khi chạy dev server riêng hãy dùng cổng khác, ví dụ `next dev -p 3100`.
- Test E2E của dự án dùng `@playwright/test` trong `gotrips-web` (nếu đã cài). Chỉ khi cần kiểm tra giao diện nhanh, ngoài bộ test, mới dùng `playwright-core` đặt trong thư mục scratchpad, và không cài thêm vào repo.
- Shell chính là PowerShell; Bash (Git Bash) cũng dùng được.

## Quy ước chung
- **Không commit** `.env`, `.env.*` (trừ `.env.example`) hay bí mật. Mật khẩu DB chỉ nằm trong `.env`.
- **Biến môi trường kết nối API** (mẫu ở `.env.example` của từng dự án; chưa có trong `docker-compose.yml` — thêm khi cần):

  | Dự án | Biến | Ý nghĩa |
  |---|---|---|
  | web | `API_URL` | Địa chỉ API mà web gọi từ phía server. Mặc định `http://localhost:8080`; trong Docker là `http://gotrips-api:8080` |
  | admin | `VITE_API_URL` | Địa chỉ API mà trình duyệt gọi. Vite nhúng giá trị lúc **build** nên trong Docker phải là build arg |
  | api | `GOTRIPS_CORS_ORIGINS` | Các origin được gọi API từ trình duyệt (admin), cách nhau bằng dấu phẩy. Mặc định `http://localhost:8081,http://localhost:5173` |
  | api | `SPRINGDOC_ENABLED` | `false` để tắt `/v3/api-docs` (mặc định `true`) |
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
| Ghép class | `cn()` trong `lib/cn.ts`, là hàm `cn` **duy nhất** (alias `utils` của shadcn trỏ về đây). Dùng `tailwind-merge` nên gộp được class chồng nhau | Không tạo thêm `lib/utils.ts` |
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
- Bảo mật (`config/SecurityConfig.java`): stateless, CSRF tắt, HTTP Basic, công khai chỉ có `/actuator/health/**` và `/v3/api-docs/**`, `/swagger-ui/**` (để Orval đọc spec), còn lại cần xác thực. Khi thêm endpoint công khai cho website (danh sách tour...) phải mở rõ ràng trong cấu hình này. Đã có bean CORS (`gotrips.cors.allowed-origins`) cho admin; web gọi từ server nên không cần CORS. `oauth2-resource-server` mới chỉ là dependency, **chưa bật JWT** trong `SecurityConfig`.
- Lỗi API: `common/error/GlobalExceptionHandler` trả `ProblemDetail`; lỗi `@Valid` là 400 kèm `errors: [{field, message}]` (web/admin parse đúng format này trong `ApiError`). Map entity ↔ DTO dùng `@Mapper(config = MapStructConfig.class)` (`unmappedTargetPolicy = ERROR`: thiếu field thì lỗi lúc compile).
- Test: `GotripsApiApplicationTests` import `TestcontainersConfiguration` (PostgreSQL 17 qua `@ServiceConnection`) nên **cần Docker đang chạy** và **JDK 25** (`java.version` trong `pom.xml`).
- Actuator chỉ expose `health,info`; Docker healthcheck phụ thuộc `/actuator/health` trả `UP` — **đừng làm hỏng**, vì `gotrips-admin` và `gotrips-web` đợi API healthy mới khởi động.
- Lombok dùng qua `annotationProcessorPaths` trong `pom.xml`.
- Tài liệu API: springdoc-openapi (Swagger UI).

## gotrips-admin (React + Vite)
- TypeScript, ESLint 10 flat config. Build production được nginx phục vụ với fallback SPA (`nginx.conf`: mọi route → `index.html`).
- Stack đã chốt: React Router, TanStack Query/Table, React Hook Form + Zod, Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui. Chi tiết ở bảng "gotrips-admin" thuộc mục Quy tắc dùng thư viện. Alias `@/*` → `src/*` (chỉ khai báo bằng `paths`; TypeScript 6 đã bỏ `baseUrl`).
- Đã cài và cấu hình: Router data mode (`src/app/router.tsx`: `/` Dashboard tạm trong `AdminLayout` dùng `sidebar` shadcn, `*` trang 404), `src/app/providers.tsx` (QueryClientProvider + devtools chỉ khi dev + `<Toaster />`), `src/lib/api/http.ts` (`apiFetch`, `ApiError` có `errors: {field, message}[]` khớp `GlobalExceptionHandler`, `credentials: "include"`), Orval (`react-query` + `fetch`, mutator `apiFetch`, `includeHttpResponseReturnType: false` để kiểu sinh ra là dữ liệu thuần; **chưa chạy** `api:gen`), Vitest (cấu hình nằm trong `vite.config.ts`, `jsdom`, `src/test/setup.ts`).
- Lệnh: `npm run dev|build|lint`, `npm test` (vitest run), `npm run api:gen`. Dev server dùng cổng 5173 (cổng 3000 do Docker chiếm).
- shadcn ở admin: component trong `src/components/ui/`; dùng `field` + `Controller` của React Hook Form (registry hiện không có file `form`). Gói `shadcn` nằm ở devDependencies vì chỉ cần lúc build (`shadcn/tailwind.css`).
- **`cn()` của admin (`src/lib/utils.ts`) tự viết, chưa gộp được class xung đột** vì chưa cài `clsx` + `tailwind-merge` (cần người dùng duyệt). Cho tới lúc đó đừng truyền class chồng nhóm (ví dụ `p-2` và `p-4`) cho component shadcn. Không cài package npm `cn` (preset `nova` của shadcn hay kéo nhầm gói này); `next-themes` cũng đã gỡ (chỉ chế độ sáng).
- `jsdom` đang ở 29.x (bản 31 yêu cầu Node ≥ 24.15; máy dev đang Node 24.8).
- `VITE_API_URL` được Vite nhúng lúc build: trong Docker phải là build arg (Dockerfile và `docker-compose.yml` hiện **chưa** có `ARG VITE_API_URL`), xem mục "Biến môi trường kết nối API".

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
components/ui/       CHỈ primitive của shadcn (button, badge, input, dialog, calendar, field, sonner...). Tên file chữ thường
components/common/   component riêng dùng chung: Container, CoverImage, AppLink, SectionHeading
app/providers.tsx    "use client": QueryClientProvider (staleTime 60s) + devtools (chỉ dev) + <Toaster /> của Sonner
lib/types.ts         kiểu dữ liệu: nhóm "bảng" (khớp DB MVP) + nhóm "View" (suy ra cho UI)
lib/data/            lớp truy cập dữ liệu — component CHỈ import từ đây
lib/mock/            dữ liệu giả (destinations, tours, departures, testimonials, images, site)
lib/api/http.ts      lớp HTTP duy nhất gọi gotrips-api (server-only): apiFetch, ApiError, customFetch (mutator của Orval)
lib/api/generated/   do Orval sinh (chưa có; chạy `npm run api:gen` khi API có endpoint). Không sửa tay
lib/schemas/         schema Zod dùng chung cho client + Server Action (search, newsletter)
lib/format.ts, cn.ts tiện ích; file *.test.ts đặt cạnh file nguồn
e2e/                 test Playwright
```

### Cài / thêm shadcn trên Windows (các lỗi đã gặp)
- Windows không phân biệt hoa/thường: tên file trong `components/ui/` phải chữ thường (`button.tsx`). Nếu từng có `Button.tsx`, git index (`core.ignorecase=true`) sẽ giữ tên cũ — kiểm tra `git ls-files components/ui` trước khi commit.
- `shadcn add` sinh `import { cn } from "cn"` (npm package `cn`, không dùng). Sau mỗi lần add phải sửa thành `@/lib/cn`, và không cài package `cn`.
- `shadcn add` các component phụ thuộc `button` sẽ hỏi ghi đè `button.tsx`/`badge.tsx` (đã tuỳ biến theo GoTrips). Sao lưu trước, hoặc trả lời "không"; nếu dùng `-o` thì khôi phục lại hai file này.
- `button.tsx` chỉ có size `sm|md|lg|icon|icon-sm|icon-lg` và variant `primary|accent|outline|ghost`. Component shadcn dùng `size="default"` hay variant khác (`secondary`, `destructive`, `link`) sẽ lỗi tsc: đổi sang giá trị có sẵn hoặc thêm vào `button.tsx` cho đúng token.
- `next-themes` không dùng (chỉ chế độ sáng): `sonner.tsx` cố định `theme="light"`.
- Vitest 5 (rolldown) trên Windows có thể báo "Cannot find native binding": chạy `npm install @rolldown/binding-win32-x64-msvc --no-save` (lỗi optional-deps của npm, không ghi vào package.json).
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
- `cn()` (`lib/cn.ts`) = `clsx` + `tailwind-merge` (`extendTailwindMerge`): gộp class xung đột, class sau thắng. Đã khai báo token riêng `rounded-control|card|pill`, `shadow-card|card-hover|search|header`, `max-w-page`. **Thêm token mới vào `@theme` thì phải khai báo thêm ở `lib/cn.ts`**, nếu không không gộp được (có test ở `lib/cn.test.ts`).
- **Khi dùng shadcn:** biến `--accent` của shadcn là **nền khi hover** (được gán sang `primary-50`). Nó khác với dải màu cam `accent-*` của GoTrips dùng cho giá và CTA. Cần màu cam thì dùng `accent-700`; không dùng `bg-accent` với ý là màu cam.
- Accessibility: giữ skip-link "Bỏ qua điều hướng", `id="noi-dung-chinh"`, focus ring theo token `focus`.
- **Ảnh hiện tại là ảnh mock Unsplash** (placeholder, không phải ảnh thật của địa danh) — phải thay bằng ảnh thật/có bản quyền trước khi ra mắt (`lib/mock/images.ts`).

## Docker
- Cả 3 Dockerfile là multi-stage trên `node:24-alpine` (web, admin) và build Maven (api). Web chạy non-root.
- Thứ tự khởi động: `gotrips-db` (healthy) → `gotrips-api` (healthy) → `gotrips-admin` & `gotrips-web`.
- Cổng DB chỉ bind `127.0.0.1:5432` để chạy API bằng IDE/mvnw, không lộ ra mạng ngoài.
