# GoTrips Admin: đặc tả và prompt thực thi cho Codex

> **Cách chạy:** mỗi lần gọi Codex, dán toàn bộ tài liệu này (hoặc bảo Codex đọc `docs/codex/gotrips-admin.md`) và thêm một dòng ở cuối:
> `Thực hiện Giai đoạn <N>. Xong giai đoạn đó thì dừng và báo cáo.`
> Làm lần lượt từ Giai đoạn 1. Không gộp nhiều giai đoạn trong một lần chạy.

---

## 0. Vai trò và cách làm việc

Bạn là kỹ sư full-stack trong monorepo GoTrips. Mục tiêu chung: dựng trang quản trị `gotrips-admin` hoàn chỉnh (UI/UX + gọi API thật) và các API quản trị còn thiếu ở `gotrips-api`. Mỗi lần chạy chỉ làm **một** giai đoạn ở mục 6, và làm trọn giai đoạn đó (code, test, tài liệu, kiểm tra) rồi mới báo cáo.

**Trước khi viết code, ở mỗi lần chạy:**
1. Đọc `AGENTS.md` ở gốc repo. Mọi quy tắc trong đó là bắt buộc, nhất là "Quy tắc dùng thư viện", các quy ước của `gotrips-api` (Flyway, MapStruct, `ProblemDetail`, OpenAPI cho Orval, `Clock`) và "Lưu ý môi trường". Tài liệu này không chép lại các quy tắc đó. Nếu thấy tài liệu này mâu thuẫn với `AGENTS.md` hoặc với code thật thì dừng lại và hỏi.
2. Đọc mục 9 "Nhật ký tiến độ" trong file `docs/codex/gotrips-admin.md` để biết giai đoạn trước đã làm gì và đã lệch kế hoạch ở đâu.
3. Đọc manifest (`gotrips-admin/package.json`, `gotrips-api/pom.xml`) và tài liệu của **đúng phiên bản đã cài** trước khi dùng API của thư viện: React Router 8 (`node_modules/react-router/docs`), TanStack Table 9 (`node_modules/@tanstack/react-table`: README, thư mục `skills`), TanStack Query 5, Zod 4, Orval 8, Spring Boot 4 / Spring Security 7, Next 16 (`gotrips-web/node_modules/next/dist/docs`, khi sửa web). Không viết theo trí nhớ về bản cũ (Table v8, Router v6, Zod 3...).
4. Chạy kiểm tra nền (baseline) cho những dự án sắp sửa để biết lỗi nào có sẵn từ trước, và ghi kết quả vào báo cáo.

**Ràng buộc chung:**
- Working tree có thể đang chứa thay đổi chưa commit của người dùng. Không revert, stash, format lại hay sửa file không liên quan tới giai đoạn. Không commit, không push.
- Không thêm thư viện ngoài bảng trong `AGENTS.md`. Ở admin, cụ thể là không cài `clsx`, `tailwind-merge`, `@playwright/test`, MSW, Axios, Zustand, thư viện tag-input, thư viện UI khác. Nếu thật sự cần thì dừng lại, nêu lý do và lệnh cài để người dùng duyệt.
- Chạy `shadcn add` xong phải kiểm `package.json`: không được có thêm gói `cn`, `clsx`, `tailwind-merge` hay `next-themes`. Import `cn` phải trỏ về `@/lib/utils`.
- Không sửa file sinh tự động (`gotrips-admin/src/lib/api/generated/`, `gotrips-web/lib/api/generated/`). Giữ migration đã áp dụng. Khi cần đổi schema, dùng phiên bản Flyway kế tiếp.
- Mọi endpoint quản trị nằm dưới `/admin/**`. Không mở thêm endpoint công khai nào ngoài `POST /admin/auth/login` và `POST /admin/auth/logout`. `PublicEndpointsTests` phải luôn xanh.
- Admin không có dữ liệu giả: mọi màn hình đọc API thật. Cần dữ liệu mà API chưa có thì làm API trước.
- Log không ghi họ tên, email, số điện thoại, mật khẩu, token, cookie.
- Comment viết tiếng Việt, giải thích vì sao.
- Lệnh nào không chạy được (thiếu Docker, thiếu JDK 25, API không chạy...) thì ghi rõ trong báo cáo. Không báo "đã qua" cho thứ chưa chạy.

**Phải dừng lại hỏi người dùng khi:** cần thư viện ngoài bảng; phiên bản đã cài không hỗ trợ cách làm ở mục 2; một thay đổi sẽ phá hợp đồng API mà gotrips-web đang dùng; trước khi bắt đầu Giai đoạn 7.

---

## 1. Hiện trạng (khảo sát ngày 26/11/2026; kiểm lại trước khi làm)

- **gotrips-admin:** khung Vite + React 19. Router data mode (`src/app/router.tsx`: `/` là Dashboard tạm, `*` là 404). `AdminLayout` dùng `sidebar` của shadcn. `src/app/providers.tsx` tạo QueryClient trong `useState` và gắn Toaster. `src/lib/api/http.ts` có `apiFetch`, `ApiError` (có `errors[]`), `credentials: 'include'`, base URL lấy từ `VITE_API_URL`. `orval.config.ts` đã có (react-query + fetch, mutator `apiFetch`) nhưng **chưa chạy lần nào**. Đã có các component shadcn: alert-dialog, avatar, badge, breadcrumb, button, calendar, card, chart, checkbox, command, dialog, dropdown-menu, field, input, input-group, label, pagination, popover, select, separator, sheet, sidebar, skeleton, sonner, switch, table, tabs, textarea, tooltip. `cn()` tự viết, **chưa gộp được class xung đột**. Theme ở `src/index.css`: nền neutral, `--primary` teal `#0f766e`, màu chart đang là thang xám.
- **gotrips-api:** phần quản trị mới có `POST /admin/bookings/{code}/mark-paid|confirm|cancel` (luật ở `BookingTransitions`, khoá dòng đơn). Chưa có: danh sách/chi tiết đơn cho nhân viên, CRUD danh mục, khách hàng, nhân viên, thống kê, đăng nhập admin. Entity danh mục (`Tour`, `TourDeparture`, `Destination`, `Hotel`, `HotelRoomType`...) đang ghi chú "chỉ để đọc" và mới map một phần cột. Xác thực: `/auth/login` trả JWT trong body; API stateless, chỉ đọc header Bearer; quyền lấy từ claim `roles`. Seed **không có** tài khoản STAFF/ADMIN nào (test gán vai trò bằng SQL ở `BookingTestClient.staff()`).
- Mọi truy vấn công khai của tour/khách sạn đều lọc `status = :status` với `CatalogStatus.ACTIVE`.
- **gotrips-web:** ảnh remote chỉ cho phép `https://images.unsplash.com/photo-*` (`next.config.ts`). Dữ liệu cache bằng `"use cache"` theo tag. Chưa có cách nào để API báo web làm mới cache.

---

## 2. Quyết định kiến trúc (đã chốt, làm theo)

### 2.1 Đăng nhập admin: cookie httpOnly, cùng origin qua proxy
Lý do: không để JWT trong JavaScript (localStorage/sessionStorage) của một trang có dữ liệu cá nhân khách hàng; giữ đúng thiết kế `credentials: 'include'` đã có; bỏ được chuyện phải truyền `VITE_API_URL` làm build arg.

- Admin gọi API qua đường dẫn tương đối `/api/...`. Khi dev: `server.proxy` của Vite (`/api` → `http://localhost:8080`, bỏ tiền tố `/api`). Trong Docker: nginx `location /api/ { proxy_pass http://gotrips-api:8080/; }` kèm các header proxy chuẩn. `VITE_API_URL` mặc định là `/api`.
- **API (Spring Security 7):** thêm một `SecurityFilterChain` riêng cho `/admin/**` (`securityMatcher`, `@Order` đứng trước chain hiện có):
  - Đọc token từ cookie `gotrips_admin_session` bằng một `BearerTokenResolver` tuỳ biến. Header `Authorization: Bearer` vẫn được nhận, để test hiện có của `/admin/bookings` giữ nguyên. Không tự viết filter.
  - Thuộc tính cookie: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age` bằng hạn token. `Secure` theo cấu hình `GOTRIPS_ADMIN_COOKIE_SECURE` (mặc định `true`; `.env.example` và compose cho dev đặt `false`, kèm comment). Tên cookie phải khác `gotrips_session` của web, vì cookie không tách theo cổng nên mọi cổng trên `localhost` dùng chung.
  - Bật CSRF cho request xác thực bằng cookie, theo mẫu SPA của Spring Security: cookie `XSRF-TOKEN` đọc được từ JS và header `X-XSRF-TOKEN`. Dùng `csrf.spa()` nếu bản đã cài có; nếu không thì làm theo mục "Single-Page Applications" trong tài liệu của đúng bản đó. Request mang header Bearer thì miễn CSRF. Login/logout xử lý CSRF theo tài liệu (miễn, hoặc để SPA lấy token trước), và phải có test. `apiFetch` tự gắn header CSRF cho các method không an toàn.
  - Với `/admin/**`, **vai trò lấy từ DB ở mỗi request** (converter tuỳ biến của resource server, đúng một truy vấn), không tin claim `roles`. Nhờ vậy hạ quyền hoặc thu hồi nhân viên có hiệu lực ngay; tài khoản đã xoá thì bị 401.
  - Token admin có hạn ngắn: `GOTRIPS_JWT_ADMIN_EXPIRATION` (mặc định `8h`), dùng cùng khoá và issuer với token của khách. `/auth/login` của web giữ nguyên.
  - Khai báo security scheme kiểu cookie trong OpenAPI cho các operation quản trị.
- **Endpoint:**
  - `POST /admin/auth/login` (`adminLogin`, công khai): dùng lại `AuthService` để giữ tính năng chống dò email qua thời gian phản hồi. Sai thông tin → 401, cùng câu chữ với `/auth/login`. Đúng mật khẩu nhưng không có STAFF/ADMIN → 403 "Tài khoản không có quyền truy cập trang quản trị". Thành công → 200 `UserResponse` kèm Set-Cookie; **không trả token trong body**.
  - `POST /admin/auth/logout` (`adminLogout`, công khai): xoá cookie, trả 204.
  - `GET /admin/auth/me` (`getAdminMe`): cần STAFF/ADMIN, vai trò đọc từ DB.
- Chưa có giới hạn số lần đăng nhập sai: ghi vào mục "Chưa có" của `AGENTS.md`/`CLAUDE.md`.

### 2.2 Xoá mềm bằng trạng thái `DELETED`
Thêm migration để đưa `DELETED` vào CHECK `status` của `tours` và `hotels`, và thêm `CatalogStatus.DELETED`. Truy vấn công khai đã lọc `= ACTIVE` nên bản ghi DELETED tự biến mất khỏi website; vẫn thêm test canh như với HIDDEN. "Khôi phục" đưa bản ghi về `HIDDEN`. Không xoá cứng tour hay khách sạn, vì đơn cũ còn tham chiếu.

### 2.3 Ảnh: nhập URL, không upload
Chưa có kho lưu file. Form cho nhập URL và có xem trước. API chỉ nhận URL `https` bắt đầu bằng một tiền tố trong danh sách cho phép (cấu hình `gotrips.catalog.allowed-image-prefixes`, mặc định `https://images.unsplash.com/photo-`), vì `next/image` của web báo lỗi với host lạ. Ghi chú trong tài liệu: đổi danh sách ở API thì phải đổi `images.remotePatterns` của web.

### 2.4 API là nguồn duy nhất của luật nghiệp vụ
- Nút thao tác trên đơn hiện theo `availableActions` do API tính bằng `BookingTransitions.canApply`. Admin không tự suy ra.
- Số liệu dashboard, số chỗ còn, trạng thái của chuyến (sắp tới / hết chỗ / đã qua), cờ "đang hiện trên website" đều do API tính.
- Schema Zod ở admin chỉ để báo lỗi sớm và phải khớp annotation của API (ghi chú "đổi một nơi phải đổi nơi kia"). Lỗi 400/409 kèm `errors[]` được gắn lại vào ô bằng `setError`; lỗi không gắn được vào ô nào thì hiện ở đầu form.

### 2.5 Hợp đồng API cho admin
- Danh sách có phân trang trả một record riêng `{ items, page, size, totalItems, totalPages }`, không trả `Page` của Spring. `page` bắt đầu từ 1 và được kẹp về trang cuối giống `/tours`. `size` từ 1 đến 100, mặc định 20. `sort` là enum whitelist. Phân trang làm trong SQL; truy vấn động dùng JPA `Specification` hoặc `@Query` với tham số có thể null; không N+1 (gom theo danh sách id).
- Theo đúng quy ước OpenAPI trong `AGENTS.md`: chỉ khai báo kết quả thành công, có `requiredMode`, chỉ cho phép nullable với kiểu nguyên thuỷ, `operationId` ghi tường minh, mỗi nhóm quản trị một tag riêng. Thêm test hợp đồng (theo kiểu `BookingOpenApiTests`) cho operationId và kiểu tham số.
- Orval của admin chỉ sinh các operation thuộc `/admin/**` (dùng `input.filters` của Orval bản đã cài). Orval của web loại bỏ `/admin/**`, để client của web không phình ra.
- Ngày lịch (`LocalDate`) là chuỗi `YYYY-MM-DD`; mốc thời gian là `Instant`. "Hôm nay" và việc gom theo ngày dùng `Clock` và `ClockConfig.BUSINESS_ZONE`.

### 2.6 Làm mới cache của web khi dữ liệu đổi từ admin
Sau khi transaction ghi dữ liệu commit (`@TransactionalEventListener(phase = AFTER_COMMIT)`), API gọi `POST ${GOTRIPS_WEB_REVALIDATE_URL}` bằng `RestClient`: timeout ngắn, không chặn và không làm hỏng thao tác của admin (lỗi chỉ ghi log warn). Request gửi header bí mật `GOTRIPS_REVALIDATE_SECRET` và danh sách tag (`destinations`, `tours`, `departures`, `hotels`, `flights`, `flight-routes`, `airports`).

Phía web thêm Route Handler `app/api/revalidate/route.ts`: so bí mật bằng `crypto.timingSafeEqual`, chỉ nhận tag trong whitelist (tag lạ → 400, sai bí mật → 401), rồi gọi `revalidateTag` cho hết hạn ngay, theo đúng tài liệu Next 16. URL để trống nghĩa là tắt tính năng. Compose truyền biến cho cả hai service, và `.env.example` có mẫu.

---

## 3. Thiết kế UI/UX

### 3.1 Nguyên tắc
- **Người dùng:** nhân viên vận hành xử lý đơn hằng ngày trên desktop (≥ 1280px), và admin quản lý danh mục, nhân viên. Ưu tiên: thấy ngay việc cần làm, thao tác ít bước, khó bấm nhầm những thao tác không hoàn tác được.
- **Mật độ cao nhưng dễ đọc lướt:** bảng dùng `text-sm`; số và tiền căn phải với `tabular-nums`; hàng đổi màu khi hover; mỗi vùng tối đa một nút chính.
- **Chỉ dùng token trong `src/index.css`.** Token nào còn thiếu thì bổ sung ở đó (ví dụ `--success`, `--warning`, bảng màu chart theo tông teal của thương hiệu, đủ tương phản), rồi dùng qua class. Không hard-code mã màu trong component. Chỉ có chế độ sáng.
- Vì `cn()` chưa gộp được class xung đột: không truyền hai class cùng nhóm (`p-2` và `p-4`) vào component shadcn.
- **Ngôn ngữ:** tiếng Việt, viết như trong repo ("huỷ", "xoá"). Thuật ngữ cố định: Đơn đặt chỗ, Mã đơn, Chuyến khởi hành, Loại phòng, Lịch bay, Khách hàng, Nhân viên, Ẩn/Hiện, Xoá (khôi phục được), Khôi phục.
- **Màn nào cũng đủ các trạng thái:** đang tải (skeleton đúng hình nội dung), rỗng (nói lý do và hành động tiếp theo), lỗi (thông báo + nút "Thử lại"), không có quyền (403), không tồn tại (404).
- **Accessibility:** giữ skip-link và `id="noi-dung-chinh"`; chuyển trang xong thì focus vào `h1`; nút chỉ có icon phải có `aria-label`; dialog có tiêu đề và mô tả; dùng được hoàn toàn bằng bàn phím; không truyền đạt thông tin chỉ bằng màu.

### 3.2 Khung và điều hướng
Sidebar (component `sidebar` của shadcn; thu gọn thành icon; trên mobile là sheet). Mục nào chưa có trang thì **ẩn**, không để liên kết chết.
- Tổng quan
- Vận hành: Đơn đặt chỗ (badge số đơn chờ xử lý), Khách hàng
- Danh mục: Tour, Điểm đến, Khách sạn, Vé máy bay
- Hệ thống (chỉ ADMIN): Nhân viên

Header gồm: nút thu/mở sidebar, breadcrumb theo route (khai báo bằng `handle` của route), menu người dùng (họ tên, vai trò, Đổi mật khẩu, Đăng xuất).

Route dùng data mode. Bảo vệ route bằng loader kết hợp `queryClient.ensureQueryData`. QueryClient tạo ở một module riêng để loader và provider dùng chung; test thì tự tạo client mới.

| Đường dẫn | Màn hình | Quyền |
|---|---|---|
| `/login?next=` | Đăng nhập | công khai (đã đăng nhập thì chuyển về `/`) |
| `/` | Tổng quan | STAFF, ADMIN |
| `/bookings`, `/bookings/:code` | Danh sách / chi tiết đơn | STAFF, ADMIN |
| `/customers`, `/customers/:id` | Khách hàng | STAFF, ADMIN |
| `/tours`, `/tours/new`, `/tours/:id` | Tour (có tab Lịch khởi hành) | STAFF, ADMIN |
| `/destinations` | Điểm đến (bảng + dialog) | STAFF, ADMIN |
| `/hotels`, `/hotels/new`, `/hotels/:id` | Khách sạn (có tab Loại phòng) | STAFF, ADMIN |
| `/flights/schedules`, `/flights/airlines`, `/flights/airports`, `/flights/routes` | Vé máy bay | STAFF, ADMIN |
| `/staff` | Nhân viên | ADMIN (STAFF không thấy menu; gõ thẳng đường dẫn thì thấy 403) |
| `/account/password` | Đổi mật khẩu | STAFF, ADMIN |

**Phiên đăng nhập:**
- Chưa đăng nhập, hoặc bất kỳ query/mutation nào nhận 401 → xoá cache rồi chuyển về `/login?next=<đường dẫn hiện tại>`. `next` chỉ nhận đường dẫn nội bộ bắt đầu bằng đúng một `/` (chống open redirect, có test).
- `GET /admin/auth/me` trả 403 (bị thu hồi quyền) → xoá phiên, về trang đăng nhập kèm thông báo "Tài khoản không còn quyền truy cập".
- Các 403 khác → hiện trang hoặc khối "Bạn không có quyền".
- Đăng xuất: gọi API, `queryClient.clear()`, chuyển về `/login`.

### 3.3 Thành phần dùng chung (`src/components/common/`)
- **`PageHeader`:** `h1`, mô tả ngắn, nút chính ở bên phải.
- **`DataTable`:** TanStack Table v9 ở chế độ manual (phân trang, sắp xếp, lọc đều làm ở server) kết hợp `Table` của shadcn. Header dính khi cuộn; cột sắp xếp được có `aria-sort`; ô đầu tiên là liên kết (không biến cả `<tr>` thành phần tử bấm được); mỗi hàng có menu thao tác; chọn được số dòng mỗi trang; khi tải hiện skeleton dòng; trạng thái rỗng và lỗi hiện ngay trong bảng; màn nhỏ thì bảng cuộn ngang.
- **Trạng thái bảng** (trang, cỡ trang, sắp xếp, bộ lọc, ô tìm) nằm trên URL search params, parse bằng schema Zod riêng của từng tính năng (giá trị sai thì về mặc định). Ô tìm debounce khoảng 300ms và dùng `replace` cho lịch sử trình duyệt. Đổi bộ lọc thì về trang 1. Dùng `placeholderData: keepPreviousData` để bảng không nháy khi chuyển trang.
- **Thanh lọc:** ô tìm, select, chọn khoảng ngày (Popover + Calendar), nút "Xoá bộ lọc" chỉ hiện khi đang lọc.
- **`ConfirmDialog`** (AlertDialog), dùng cho thao tác không hoàn tác được: tiêu đề là chính hành động; phần thân nêu hệ quả cụ thể; nút xác nhận ghi đúng hành động ("Huỷ đơn", không ghi "OK"); có biến thể "nguy hiểm" cho huỷ và xoá.
- **Form** (RHF + Zod + `field` của shadcn): chia khối bằng Card; thanh lưu dính ở đáy (Lưu / Bỏ thay đổi); khoá nút và hiện spinner khi đang gửi; chặn rời trang khi còn thay đổi chưa lưu (`useBlocker` nếu bản React Router đã cài có); focus vào ô lỗi đầu tiên.
- **Badge trạng thái:** chỉ một bảng ánh xạ dùng chung cho toàn app, và badge luôn có chữ.
  - Đơn: PENDING "Chờ xử lý" (warning), CONFIRMED "Đã xác nhận" (success), CANCELLED "Đã huỷ" (muted).
  - Thanh toán: UNPAID "Chưa thanh toán", PAID "Đã thanh toán", CANCELLED "Không thu".
  - Loại dịch vụ: TOUR "Tour" (icon `Map`), HOTEL "Khách sạn" (`BedDouble`), FLIGHT "Vé máy bay" (`Plane`).
  - Danh mục: ACTIVE "Đang hiện", HIDDEN "Đang ẩn", DELETED "Đã xoá".
- **Định dạng** (`src/lib/format.ts`, có test): tiền theo `vi-VN`, đơn vị VND. `Instant` luôn hiện theo giờ `Asia/Ho_Chi_Minh` (`dd/MM/yyyy HH:mm`), bất kể múi giờ của máy. Ngày `YYYY-MM-DD` hiện thành `dd/MM/yyyy` và không đổi múi giờ. "Hôm nay" tính theo giờ Việt Nam bằng một hàm dùng chung, không gọi `new Date()` rải rác.
- **Phản hồi:** thao tác thành công thì hiện toast Sonner. Lỗi 409 hiện `detail` của API rồi refetch. Lỗi mạng hoặc 5xx (kể cả nginx trả 502 dạng HTML) hiện "Hệ thống đang bận, vui lòng thử lại sau".

---

## 4. Cấu trúc thư mục mục tiêu của admin

```
gotrips-admin/src/
  app/          router.tsx (khai báo route), query-client.ts, providers.tsx, route-guards.ts (loader kiểm phiên, vai trò)
  features/
    auth/       login-page, change-password-page, session.ts (queryOptions của `me`), use-logout
    dashboard/  bookings/  customers/  tours/  destinations/  hotels/  flights/  staff/
                (mỗi tính năng: trang, cột bảng, schema lọc + test, form + schema, dialog)
  components/
    layout/     admin-layout, app-sidebar, user-menu, app-breadcrumb
    common/     page-header, data-table/, status-badges, confirm-dialog, empty-state, error-state, forbidden
    ui/         CHỈ chứa component của shadcn
  lib/          api/http.ts, api/generated/ (Orval), format.ts, slug.ts, safe-redirect.ts, utils.ts (cn)
  test/         setup.ts, helper render (QueryClient + memory router), helper stub fetch
```
- Dùng thẳng hook và `queryOptions` do Orval sinh. Không viết tay lại hook hay DTO đã có.
- Chuyển `src/pages/*` hiện có vào `features/` và sửa test tương ứng.
- Test không dùng MSW. Stub `fetch` bằng `vi.stubGlobal`/`vi.spyOn`, hoặc mock module do Orval sinh.

---

## 5. Kiểm tra ở mỗi giai đoạn

1. **API:** chạy toàn bộ test trong container JDK 25 (lệnh ở "Lưu ý môi trường" của `AGENTS.md`). Tất cả phải xanh, kể cả test cũ.
2. **API đổi thì sinh lại client:** chạy API (profile `seed`), rồi `npm run api:gen` trong `gotrips-admin` (và trong `gotrips-web` nếu cấu hình Orval của web đổi).
3. **Admin:** `npm run lint`, `npm test`, `npm run build`. Chạy vitest bằng PowerShell.
4. **Web** (khi có sửa): `npm run lint`, `npm test`, `npm run build`; chạy `npm run test:e2e` khi có API và DB.
5. **Chạy thật:** DB (`docker compose up -d gotrips-db`), API với profile `seed`, admin `npm run dev` (cổng 5173). Đi qua các luồng trong mục "Xong khi" của giai đoạn. Giai đoạn 1 và giai đoạn cuối cùng được làm phải chạy thêm `docker compose up --build`, rồi kiểm admin ở `http://localhost:8081`.
6. **Tài liệu:** cập nhật `CLAUDE.md` và `AGENTS.md` (nội dung phải giống nhau), gồm các mục: Trạng thái hiện tại, gotrips-api (endpoint, bảo mật, số test), gotrips-admin (cấu trúc, đăng nhập, lệnh, số test), bảng biến môi trường, Docker. Kiểm bằng `diff --strip-trailing-cr CLAUDE.md AGENTS.md`: chỉ được ra đúng 3 dòng khác nhau.
7. **Cập nhật mục 9** ngay trong file `docs/codex/gotrips-admin.md`.

---

## 6. Các giai đoạn

### Giai đoạn 1: Nền tảng (đăng nhập admin, khung giao diện, hạ tầng gọi API)

**API**
- Làm đủ mục 2.1: chain riêng, cookie, CSRF, vai trò đọc từ DB, hạn token riêng, 3 endpoint `/admin/auth/*`.
- Seed (chỉ dùng cho dev): tài khoản `admin@gotrips.test` (ADMIN) và `staff@gotrips.test` (STAFF), mật khẩu thoả luật đăng ký, ghi trong `AGENTS.md`/`CLAUDE.md` là chỉ dành cho dev. Chuỗi băm `{bcrypt}` phải sinh bằng chính `PasswordEncoder` của dự án, không tự bịa. `SeedDataTests` canh việc cả hai tài khoản đăng nhập được qua `/admin/auth/login`. Khi khởi động với profile `seed`, API ghi một dòng log WARN nhắc rằng đang có tài khoản quản trị thử nghiệm và không được dùng cho môi trường thật.
- Test: đăng nhập thành công (cookie đúng thuộc tính, body không chứa token); sai mật khẩu → 401; tài khoản khách → 403; `me` bằng cookie; không có cookie → 401; cookie hỏng → 401; POST bằng cookie mà thiếu CSRF → 403, có CSRF thì qua; Bearer không cần CSRF; hạ vai trò trong DB thì request kế tiếp bị 403 ngay; logout xoá cookie. Toàn bộ test cũ vẫn xanh.

**Hạ tầng**
- Proxy của Vite và nginx (mục 2.1).
- Header bảo mật trong nginx của admin: chặn nhúng iframe (`frame-ancestors 'none'` hoặc `X-Frame-Options: DENY`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`. Thêm CSP chặt nếu không làm hỏng bản build (kiểm bằng cách chạy thật).
- Cập nhật `docker-compose.yml` và các file `.env.example` (gốc repo, admin, api) với biến mới. Admin không còn cần build arg.
- Orval: admin chỉ sinh `/admin/**`; chạy `api:gen` lần đầu. Web loại `/admin/**`, chạy lại `api:gen` của web và giữ build, test của web xanh.

**Admin**
- `query-client.ts`, providers, tổ chức lại router, guard (`requireStaff`, `requireAdmin`), `errorElement` chung, trang 403/404.
- `apiFetch`: base `/api`, gắn header CSRF, xử lý 401 toàn cục.
- **Trang đăng nhập:** card ở giữa màn hình, tiêu đề "GoTrips Admin"; ô email và mật khẩu (có nút hiện/ẩn); lỗi 401 hiện chung ở đầu form; 403 có thông báo riêng; nhấn Enter là gửi; khoá nút khi đang gửi; đăng nhập xong chuyển tới `next`.
- **Khung:** sidebar theo mục 3.2, menu người dùng, breadcrumb. Dashboard tạm thời chỉ chào theo tên; số liệu thật làm ở Giai đoạn 4.
- Các thành phần dùng chung ở mục 3.3 (`DataTable`, `PageHeader`, `ConfirmDialog`, `EmptyState`, `ErrorState`, badge), `format.ts`, `safe-redirect.ts`, và token màu mới trong `index.css`.
- Test: `safe-redirect`, `format`, `apiFetch` (header CSRF chỉ gửi kèm method không an toàn; 401 thành `ApiError`), guard chuyển hướng khi `me` trả 401, form đăng nhập gắn đúng lỗi, sidebar ẩn mục "Nhân viên" với STAFF.

**Xong khi:** đăng nhập bằng tài khoản seed ở `http://localhost:5173` (dev) và `http://localhost:8081` (Docker) vào được khung admin; F5 vẫn giữ phiên; đăng xuất được; tài khoản khách bị từ chối; mọi test, lint, build đều xanh.

### Giai đoạn 2: Quản lý đơn đặt chỗ, làm mới cache web

**API**
- `GET /admin/bookings` (`listAdminBookings`). Tham số:
  - `q`: tìm theo mã đơn, email, tên hoặc SĐT người liên hệ, không phân biệt hoa thường.
  - `kind`, `status`, `paymentStatus`.
  - `createdFrom`, `createdTo`: ngày theo giờ Việt Nam, tính cả hai đầu, `from ≤ to`.
  - `customerId`: UUID, dùng từ Giai đoạn 5.
  - `page`, `size`, `sort` (`CREATED_DESC` mặc định, `CREATED_ASC`, `TOTAL_DESC`, `TOTAL_ASC`).

  Mỗi item gồm các trường của `BookingSummaryResponse`, thêm `contact`, `customerId` và `availableActions`. Thêm index bằng migration mới nếu cần.
- `GET /admin/bookings/{code}` (`getAdminBooking`): các trường của `BookingDetailResponse`, thêm tài khoản đặt đơn (id, họ tên, email) và `availableActions`. Mã sai định dạng hoặc không có → 404.
- Ba thao tác hiện có trả về chi tiết đơn dạng admin, để UI cập nhật ngay. Giữ nguyên luật và việc khoá dòng.
- Làm mục 2.6. Huỷ đơn có trả lại chỗ/phòng/ghế nên phát sự kiện làm mới các tag `tours`, `departures`, `hotels`, `flights`. Phía web: Route Handler, test đơn vị cho phần kiểm bí mật và tag, cập nhật `.env.example` và compose.
- Test: lọc theo từng tham số; phân trang và kẹp trang; sắp xếp; quyền (khách → 403, không có token → 401); `availableActions` đúng với từng tổ hợp trạng thái; khoảng ngày tính theo giờ Việt Nam (đơn tạo lúc 23:30 giờ Việt Nam rơi đúng ngày); sự kiện làm mới cache chỉ phát sau khi commit, và lỗi gọi web không làm hỏng thao tác.

**Admin**
- **`/bookings`:**
  - Tab nhanh: "Cần xử lý" (mặc định, gồm đơn PENDING), "Chờ thanh toán" (PENDING + UNPAID), "Chờ xác nhận" (PENDING + PAID), "Đã xác nhận", "Đã huỷ", "Tất cả".
  - Ô tìm có placeholder "Mã đơn, email, tên, SĐT"; lọc theo loại dịch vụ và khoảng ngày tạo.
  - Cột: Mã đơn (liên kết, font mono), Dịch vụ (icon loại + tên tour/khách sạn/chặng bay + ngày sử dụng), Người liên hệ (tên, dòng nhỏ email/SĐT), Tổng tiền, Trạng thái đơn, Thanh toán, Ngày tạo, menu thao tác (theo `availableActions`).
  - Tự refetch khi người dùng quay lại tab trình duyệt.
  - Badge ở sidebar: số đơn PENDING, refetch mỗi 60 giây.
- **`/bookings/:code`:**
  - Header: mã đơn + nút sao chép, 3 badge, thời điểm tạo; thanh thao tác hiện theo `availableActions`.
  - Cột trái:
    - Thông tin dịch vụ theo loại. Tour: tên, ngày khởi hành, số khách, đơn giá. Khách sạn: khách sạn, loại phòng, ngày nhận và trả, số đêm, số phòng, người nhận phòng. Vé: từng chặng, giờ bay, hạng ghế, giá theo loại hành khách.
    - Danh sách người đi / hành khách.
    - Người liên hệ: liên kết `mailto:`/`tel:` kèm nút sao chép.
    - Ghi chú.
  - Cột phải:
    - Thanh toán: tổng tiền, trạng thái, nội dung chuyển khoản (chính là mã đơn), thời điểm thu.
    - Dòng thời gian: tạo đơn → thu tiền → xác nhận / huỷ.
    - Liên kết tới tài khoản khách: ẩn cho tới Giai đoạn 5.
- **Dialog:**
  - "Đánh dấu đã nhận tiền": nhắc đối chiếu sao kê, đúng số tiền `X ₫` và nội dung `GTxxxxxx`.
  - "Xác nhận đơn".
  - "Huỷ đơn": nói rõ là sẽ trả lại chỗ/phòng/ghế. Nếu đơn đã thanh toán thì cảnh báo phải hoàn tiền thủ công (hệ thống chưa có hoàn tiền).
  - Đơn đã huỷ nhưng thanh toán là PAID: trang chi tiết luôn hiện một callout cảnh báo.
- Sau mỗi thao tác: ghi response vào cache chi tiết; invalidate danh sách, số đếm ở sidebar và dashboard. Gặp 409 thì hiện toast `detail` rồi refetch.
- Test: parse và dựng URL của bộ lọc; ánh xạ tab ↔ bộ lọc; nút thao tác hiện đúng theo `availableActions`; dialog huỷ hiện cảnh báo hoàn tiền khi đơn đã PAID.

**Xong khi:** nhân viên tìm được đơn vừa đặt trên web; đánh dấu đã nhận tiền rồi xác nhận; trang `/bookings/<mã>` của web thấy trạng thái mới. Huỷ một đơn tour thì trang tour trên web thấy số chỗ được trả lại ngay (nhờ cơ chế làm mới cache).

### Giai đoạn 3: Điểm đến, Tour, Lịch khởi hành

**API**
- Migration thêm `DELETED` (mục 2.2, cho cả `tours` và `hotels`). Trước khi thêm unique `(tour_id, departure_date)`, kiểm seed có ngày trùng hay không; nếu có thì chỉ kiểm ở service.
- Cho các entity danh mục ghi được: map đủ cột bắt buộc; thay setter tuỳ tiện bằng phương thức nghiệp vụ (`update(...)`, `changeStatus(...)`); sửa lại comment "chỉ để đọc".
- **Điểm đến:**
  - `GET /admin/destinations`: trả tất cả, kèm số tour và số khách sạn.
  - `POST`, `PUT /admin/destinations/{id}`.
  - `DELETE /admin/destinations/{id}`: 409 nếu còn tour hay khách sạn tham chiếu (kể cả bản ghi đã xoá mềm).
  - Slug theo regex của DB và không được trùng (409, field `slug`).
- **Tour:**
  - `GET /admin/tours`: tham số `q` (tên hoặc slug), `destinationId`, `status` (mặc định ACTIVE + HIDDEN; DELETED chỉ trả khi lọc rõ), `featured`, `page`, `size`, `sort`. Mỗi item kèm tên điểm đến, số chuyến sắp tới, ngày chuyến gần nhất và tổng chỗ còn (API tính).
  - `GET /admin/tours/{id}`: mọi trường sửa được, kèm `rating` và `reviewCount` (chỉ đọc).
  - `POST`, `PUT /admin/tours/{id}` nhận: `slug`, `title`, `destinationId`, `durationDays` > 0, `durationNights` (≥ 0 và ≤ `durationDays`), `departureCity`, `shortDescription` (≤ 500 ký tự), `coverImageUrl` (theo mục 2.3), `coverImageAlt`, `featured`.
  - `PATCH /admin/tours/{id}/status` `{ status: ACTIVE | HIDDEN }`.
  - `DELETE /admin/tours/{id}`: chuyển sang DELETED; đơn cũ vẫn giữ nguyên.
  - `POST /admin/tours/{id}/restore`: chuyển về HIDDEN.
- **Chuyến khởi hành:**
  - `GET /admin/tours/{id}/departures`: mọi chuyến, kể cả chuyến đã qua; kèm `bookedSeats`, `remainingSeats` và `state` (`UPCOMING` | `SOLD_OUT` | `PAST`, tính bằng `Clock`).
  - `POST /admin/tours/{id}/departures`, `PUT /admin/departures/{id}`, `DELETE /admin/departures/{id}`.
  - Luật:
    - Ngày khởi hành phải sau hôm nay, khi tạo cũng như khi đổi ngày.
    - Chuyến đã qua không sửa được (409).
    - Đã có khách đặt thì không đổi ngày được (409).
    - Giá > 0; giá gốc để trống hoặc lớn hơn giá.
    - Tổng chỗ ≥ 1 và ≥ số chỗ đã đặt. Cập nhật bằng câu `UPDATE` có điều kiện `booked_seats <= :total` (0 dòng → 409) để không tranh với lệnh giữ chỗ.
    - Không trùng ngày trong cùng một tour (409, field `departureDate`).
    - Chỉ xoá được chuyến chưa từng có đơn (409 kèm gợi ý "Đóng bán", tức đặt tổng chỗ bằng số chỗ đã đặt).
- Mỗi thao tác ghi đều phát sự kiện làm mới cache (`tours`, `departures`, `destinations`).
- Test:
  - CRUD và mọi ràng buộc.
  - Tour đã xoá mềm biến mất khỏi mọi API công khai: `/tours`, `/tours/{slug}`, `/tours/featured`, `tourCount` của `/destinations`, `/testimonials`.
  - Đổi tổng chỗ chạy đồng thời với đặt tour (theo kiểu `BookingConcurrencyTests`).
  - URL ảnh ngoài danh sách cho phép → 400.

**Admin**
- **`/destinations`:** bảng (ảnh nhỏ, tên, slug, vùng, số tour, số khách sạn). Dialog tạo/sửa: slug tự sinh từ tên và sửa tay được; ô "vùng" gợi ý các vùng đã có. Xoá có bước xác nhận; gặp 409 thì giải thích là còn tour hoặc khách sạn đang dùng điểm đến này.
- **`/tours`:**
  - Bảng: ảnh bìa nhỏ, tên + slug, điểm đến, thời lượng ("3N2Đ"), trạng thái, nổi bật, chuyến sắp tới, chỗ còn.
  - Lọc theo trạng thái, điểm đến, nổi bật; có ô tìm.
  - Menu mỗi hàng: Sửa, Ẩn/Hiện, Xem trên website (`${VITE_WEB_URL}/tours/<slug>`, mặc định `http://localhost:3000`; chỉ hiện với tour ACTIVE), Xoá/Khôi phục.
- **`/tours/new`, `/tours/:id`:**
  - Tab "Thông tin":
    - Khối Cơ bản: tên; slug tự sinh (cảnh báo khi đổi slug của tour đã có vì liên kết cũ sẽ hỏng); điểm đến (combobox); số ngày, số đêm; nơi khởi hành.
    - Khối Mô tả: giới thiệu ngắn, có bộ đếm tới 500 ký tự.
    - Khối Ảnh: URL, alt, xem trước, báo lỗi URL.
    - Khối Hiển thị: trạng thái, nổi bật.
    - Khối chỉ đọc: điểm và số đánh giá.
  - Tab "Lịch khởi hành" (chỉ có sau khi tour đã được tạo):
    - Bảng chuyến: ngày, giá, giá gốc / % giảm, đã đặt / tổng (kèm thanh tiến độ), trạng thái. Mặc định ẩn chuyến đã qua, có công tắc "Hiện chuyến đã qua".
    - Dialog "Thêm chuyến" / sửa: ngày (Calendar chặn các ngày ≤ hôm nay theo giờ Việt Nam), giá, giá gốc, tổng chỗ. Ghi rõ rằng đổi giá không ảnh hưởng đơn cũ.
    - Có Xoá và Đóng bán.
  - Cảnh báo khi tour đang ACTIVE mà không còn chuyến nào mở bán.
- `slug.ts`: bỏ dấu, đổi `đ` thành `d`, khớp regex của DB; có test.

**Xong khi:** tạo tour mới kèm chuyến thì tour hiện ngay trên web. Ẩn thì tour biến mất; xoá mềm cũng biến mất; khôi phục thì tour về trạng thái ẩn.

### Giai đoạn 4: Trang Tổng quan

**API:** `GET /admin/dashboard` (`getAdminDashboard`) với `from`, `to`: mặc định là 30 ngày gần nhất tính tới hôm nay theo giờ Việt Nam, tối đa 366 ngày; `from > to` → `InvalidRequestException`. Response gồm:
- `revenueCollected`: tổng `payments.amount` có trạng thái PAID, `paid_at` nằm trong khoảng, của đơn chưa huỷ.
- `refundPending`: số đơn và tổng tiền của các đơn đã huỷ mà thanh toán vẫn PAID (không phụ thuộc khoảng ngày).
- `newBookings` trong khoảng (theo `created_at`), có tách theo loại dịch vụ.
- `awaitingPayment` (PENDING + UNPAID) và `awaitingConfirmation` (PENDING + PAID) tại thời điểm hiện tại.
- Số khách hàng (tổng và mới trong khoảng); số tour ACTIVE và HIDDEN.
- `daily`: đủ mọi ngày trong khoảng, ngày không có dữ liệu thì bằng 0; mỗi ngày gồm số đơn mới và doanh thu thu được. Gom theo ngày giờ Việt Nam ngay trong SQL.
- `upcomingDepartures`: chuyến trong 14 ngày tới của các tour ACTIVE (tour, ngày, đã đặt / tổng), sắp theo ngày, tối đa 10 chuyến.

Test từng chỉ số với dữ liệu dựng sẵn, ranh giới ngày theo giờ Việt Nam, ngày trống bằng 0, và phân quyền.

**Admin:**
- Bộ chọn khoảng: 7, 30, 90 ngày hoặc tuỳ chọn.
- Hàng KPI: Doanh thu đã thu, Đơn mới, Chờ thanh toán, Chờ xác nhận, Khách hàng mới, Tour đang bán. Các KPI "Chờ…" là liên kết tới `/bookings` đã lọc sẵn.
- Biểu đồ doanh thu và số đơn theo ngày (`Chart` của shadcn): tooltip định dạng VND; có tóm tắt bằng chữ cho trình đọc màn hình.
- Cơ cấu đơn theo loại dịch vụ.
- "Việc cần làm": 5 đơn chờ lâu nhất, lấy từ `listAdminBookings`.
- "Chuyến sắp khởi hành": có thanh tỷ lệ lấp đầy.
- Callout "Cần hoàn tiền" khi `refundPending` > 0, liên kết tới `/bookings?status=CANCELLED&paymentStatus=PAID`.

### Giai đoạn 5: Khách hàng, Nhân viên, Đổi mật khẩu

**API**
- **Khách hàng** (tài khoản có vai trò CUSTOMER):
  - `GET /admin/customers`: tham số `q` (tên hoặc email), `page`, `size`, `sort` (`CREATED_DESC`, `NAME_ASC`, `PAID_DESC`). Mỗi item gồm id, họ tên, email, ngày tạo, số đơn, tổng đã thanh toán (đơn chưa huỷ), lần đặt gần nhất.
  - `GET /admin/customers/{id}`: hồ sơ và thống kê. Danh sách đơn của khách lấy qua `listAdminBookings?customerId=`.
- **Nhân viên** (`/admin/staff/**` chỉ dành cho ADMIN):
  - `GET /admin/staff`: các tài khoản có STAFF hoặc ADMIN.
  - `POST /admin/staff` `{ fullName, email, password, role: STAFF | ADMIN }`: luật giống `RegisterRequest`; email đã có → 409, field `email`.
  - `PUT /admin/staff/{id}/role` `{ role }`.
  - `DELETE /admin/staff/{id}/role`: thu hồi quyền quản trị, tài khoản vẫn còn.
  - Không được tự đổi hay thu hồi quyền của chính mình. Không được làm hệ thống mất ADMIN cuối cùng (khoá dòng để hai lệnh đồng thời không cùng lọt qua). STAFF gọi các endpoint này → 403, phải có test.
- **Đổi mật khẩu:** `PUT /admin/auth/password` `{ currentPassword, newPassword }`. Sai mật khẩu hiện tại → 400, field `currentPassword`. Luật mật khẩu mới giống đăng ký (kể cả giới hạn 72 byte). Ghi chú trong tài liệu: token cũ vẫn hợp lệ tới khi hết hạn, vì JWT không thu hồi được.

**Admin**
- `/customers`: bảng và ô tìm.
- `/customers/:id`: thẻ hồ sơ (tên, email sao chép được, ngày tham gia), KPI nhỏ (số đơn, tổng đã thanh toán), bảng đơn của khách (dùng lại các cột của `/bookings`). Chỉ xem, không sửa. Bật liên kết "tài khoản khách" ở trang chi tiết đơn.
- `/staff` (ADMIN):
  - Bảng: tên, email, vai trò, ngày tạo.
  - Dialog "Thêm nhân viên": mật khẩu tạm, có nút tạo ngẫu nhiên (`crypto.getRandomValues`) và nút sao chép; nhắc gửi mật khẩu qua kênh an toàn và yêu cầu nhân viên đổi ngay.
  - Đổi vai trò; thu hồi quyền (có bước xác nhận).
  - Dòng của chính mình không có thao tác nào.
- `/account/password`: form 3 ô (mật khẩu hiện tại, mật khẩu mới, nhập lại), luật mật khẩu hiển thị ngay dưới ô.

**Xong khi:** ADMIN tạo một STAFF; STAFF đó đăng nhập được, không thấy menu Nhân viên, gõ `/staff` thì thấy 403 và API cũng trả 403. ADMIN thu hồi quyền thì request kế tiếp của STAFF bị từ chối và UI đưa về trang đăng nhập kèm thông báo.

### Giai đoạn 6: Khách sạn, Loại phòng

**API**
- **Khách sạn:**
  - `GET /admin/hotels`: tham số `q`, `destinationId`, `status`, `page`, `size`, `sort`. Mỗi item kèm điểm đến, hạng sao, số loại phòng, giá từ và cờ `visibleOnWebsite` (API tính theo luật ở từng giai đoạn). Từ Giai đoạn 7, cần ít nhất một loại đang bán.
  - Chi tiết, `POST`, `PUT` nhận: `slug`, `name`, `destinationId`, `starRating` (1–5), `area`, `imageUrl` và `imageAlt` (theo mục 2.3), `description`, `amenities` (danh sách chuỗi: bỏ trùng, mỗi mục ≤ 100 ký tự, tối đa 30 mục), `checkInTime`, `checkOutTime` (dạng "HH:mm").
  - Đổi trạng thái, xoá mềm, khôi phục: làm giống tour.
- **Loại phòng:**
  - `GET /admin/hotels/{id}/room-types`, `POST`, `PUT /admin/room-types/{id}`.
  - `DELETE /admin/room-types/{id}`: 409 nếu đã có đơn.
  - Giảm `totalRooms`: khoá dòng loại phòng bằng `PESSIMISTIC_WRITE` như luồng đặt phòng; không cho thấp hơn số phòng đang được giữ ở bất kỳ đêm nào trong tương lai, đếm đúng theo cách của `HotelRoomInventory` (409 kèm số phòng tối thiểu).
- Phát sự kiện làm mới cache `hotels` (và `destinations`).
- Test giống tour: khách sạn đã xoá mềm biến mất khỏi `/hotels`, `/hotels/{slug}`, `/hotels/featured`; giảm số phòng chạy đồng thời với đặt phòng.

**Admin**
- `/hotels`: bảng (ảnh, tên, điểm đến, hạng sao, khu vực, số loại phòng, giá từ mỗi đêm, trạng thái). Khách sạn chưa có loại phòng thì có cảnh báo "Chưa hiện trên website: chưa có loại phòng".
- Form khách sạn gồm các khối: Cơ bản, Mô tả, Tiện ích, Giờ nhận/trả phòng, Ảnh, Hiển thị. Ô Tiện ích nhập dạng tag (Enter để thêm, dấu × để bỏ), tự ghép từ `Input` và `Badge`, không thêm thư viện.
- Tab "Loại phòng": bảng (tên, giá mỗi đêm, số khách tối đa, giường, diện tích, số phòng) kèm dialog thêm/sửa.

### Giai đoạn 7: Vé máy bay và “giá từ” khách sạn

“Giá từ” chỉ tính loại phòng có `totalRooms > 0`, độc lập với phòng trống theo ngày. Khi hết loại đang bán, khách sạn rời featured và tìm kiếm, API chi tiết trả 404. Admin vẫn đếm và hiển thị mọi loại phòng, đồng thời nhận `sellingRoomTypeCount` để phân biệt hai cảnh báo.

| Endpoint quản trị cho STAFF và ADMIN | Method và `operationId` |
|---|---|
| `/admin/airlines` | GET `listAdminAirlines`, POST `createAdminAirline` |
| `/admin/airlines/{code}` | PUT `updateAdminAirline` |
| `/admin/airports` | GET `listAdminAirports`, POST `createAdminAirport` |
| `/admin/airports/{code}` | PUT `updateAdminAirport` |
| `/admin/flight-schedules` | GET `listAdminFlightSchedules`, POST `createAdminFlightSchedule` |
| `/admin/flight-schedules/{id}` | GET `getAdminFlightSchedule`, PUT `updateAdminFlightSchedule`, DELETE `deleteAdminFlightSchedule` |
| `/admin/flight-routes` | GET `listAdminFlightRoutes`, POST `createAdminFlightRoute` |
| `/admin/flight-routes/{id}` | PUT `updateAdminFlightRoute`, DELETE `deleteAdminFlightRoute` |
| `/admin/flight-routes/order` | PUT `updateAdminFlightRouteOrder` |

- Mã hãng và mã IATA chỉ nhập khi tạo. Sân bay có `sortOrder`. Số hiệu gồm mã hãng và 1–8 chữ số, cùng hãng và hai sân bay được cố định sau khi tạo lịch. Giá phổ thông gốc từ 1 đến 1.000 tỷ đồng. `FlightFareCalculator` tính giờ hạ cánh, cờ sang ngày và giá theo hạng/loại hành khách.
- Lịch bay phân trang trong SQL, lọc theo hai sân bay và hãng. Lệnh sửa và xoá khoá cùng dòng với đặt vé trước khi đọc. Lịch từng có đơn, kể cả đã huỷ hoặc đã bay, giữ nguyên giờ và thời lượng, đồng thời bị chặn xoá. Khi giảm ghế, mức tối thiểu là đỉnh theo từng ngày và từng hạng kể từ hôm nay, bỏ em bé và đơn huỷ.
- Danh sách chặng gợi ý sắp lại từ hai mảng đầy đủ `expectedIds` và `orderedIds`. API trả 409 nếu bản gốc đã cũ. Ảnh qua `CatalogImageUrls`. Giá tham khảo giới hạn ở số nguyên an toàn của JavaScript vì hợp đồng trả số. Web lấy tối đa 50 chặng trong trang vé.
- Đơn vé giữ giá lúc đặt. Tên sân bay, tên hãng và ảnh minh hoạ đọc từ danh mục hiện tại. Ảnh dùng chặng đứng đầu theo `sortOrder`, rồi id, đến cùng điểm đến. Khi hết chặng phù hợp, web dùng ảnh mặc định. Nếu nhân viên sửa giờ trước khi có đơn đầu tiên, đơn nhận giờ mới.
- Admin có bốn trang con dưới “Vé máy bay”, dùng điều khiển Lên/Xuống bằng bàn phím cho thứ tự chặng. Webhook sau commit dùng `flights` cho hãng/lịch, `airports` cho sân bay và `flight-routes` cho chặng. Các thao tác loại phòng giữ bộ tag Giai đoạn 6.
- Việc ngừng bán riêng một lịch bay còn đơn tương lai cần quyết định tiếp theo. Hiện các ngày khác vẫn bán được vì số ghế mỗi hạng áp dụng cho mọi ngày.

---

## 7. Ngoài phạm vi (không làm; ghi nhận trong tài liệu nếu liên quan)
- Upload ảnh và kho lưu file; `tour_images`; lịch trình chi tiết của tour.
- Cổng thanh toán, hoàn tiền tự động.
- Nhật ký hoạt động của quản trị viên; xuất Excel/PDF.
- Quản lý đánh giá, blog, banner, voucher; xuất danh sách đăng ký nhận tin.
- Refresh token và thu hồi token; giới hạn số lần đăng nhập sai; khoá lạc quan (`@Version`) khi hai người cùng sửa một bản ghi (hiện tại ghi sau thắng).
- Chế độ tối, đa ngôn ngữ.

---

## 8. Báo cáo cuối mỗi lần chạy (viết bằng tiếng Việt)
1. Giai đoạn đã làm và tóm tắt kết quả (3–5 dòng).
2. Thay đổi theo từng dự án (api / admin / web / hạ tầng), kèm danh sách endpoint mới và `operationId`.
3. Kết quả kiểm tra: lệnh đã chạy, số test qua/lỗi, kết quả baseline. Thứ gì **chưa chạy được** thì ghi rõ vì sao.
4. Chỗ nào lệch so với tài liệu này, và lý do.
5. Các mục đã sửa trong `CLAUDE.md`/`AGENTS.md`, kèm kết quả lệnh `diff`.
6. Câu hỏi hoặc quyết định cần người dùng trả lời trước giai đoạn tiếp theo.

---

## 9. Nhật ký tiến độ (Codex cập nhật ngay trong file `docs/codex/gotrips-admin.md` sau mỗi giai đoạn)

| Giai đoạn | Trạng thái | Ngày | Ghi chú (lệch kế hoạch, tồn đọng) |
|---|---|---|---|
| 1. Nền tảng | Hoàn tất | 26/11/2026 | Đăng nhập cookie và CSRF, khung quản trị, sinh Orval và proxy cùng origin. API 417/417, admin 34/34, web 363/363 và E2E 112/112 trên DB riêng. Đã kiểm ADMIN, STAFF, CUSTOMER trên Vite và Docker. Đã giữ CSP sau kiểm tra. Vite còn cảnh báo kích thước chunk chính. |
| 2. Đơn đặt chỗ + làm mới cache | Hoàn tất | 26/11/2026 | Danh sách, chi tiết và thao tác đơn cho STAFF/ADMIN. Webhook hết hạn cache sau commit, dùng HTTP/1.1 trong Docker. API 430/430, admin 48/48, web 373/373. E2E 112/112 sau khi chạy lại trên DB riêng với 4 worker vì lượt đầu một test chọn ngày khách sạn timeout. Smoke Docker xác nhận trạng thái trên web và số chỗ tăng từ 1 lên 3 sau khi huỷ. Đã kiểm danh sách và tìm kiếm trên Vite. Webhook đã bật trên Compose local. Vite còn cảnh báo kích thước chunk chính. |
| 3. Điểm đến, Tour, Lịch khởi hành | Hoàn tất | 26/11/2026 | API và UI cho `/destinations`, `/tours`, `/tours/new`, `/tours/:id` (có tab Lịch khởi hành), migration V7. Khách sạn chỉ thêm `DELETED`. **Lệch đặc tả:** (a) "Đóng bán" là cờ `sales_closed` với `POST /admin/departures/{id}/close` và `/reopen`, thêm `state=CLOSED`, vì cách "tổng chỗ = số đã đặt" bị huỷ đơn mở bán lại và vi phạm `total_seats > 0` khi chưa ai đặt (người dùng đã chọn); (b) chuyến "đã có khách" gồm `booked_seats > 0` hoặc từng có đơn kể cả đã huỷ, không đổi ngày và không xoá vì đơn đọc ngày từ chuyến; (c) `getTestimonials` của web thêm tag `tours`; (d) CSP admin thêm `https://images.unsplash.com` vào `img-src`; (e) slug tour `featured` bị từ chối, slug điểm đến tối đa 60 ký tự; (f) URL ảnh chỉ được có một đoạn đường dẫn sau tiền tố, khớp `next/image`; (g) `POST /admin/tours` nhận thêm `status` tuỳ chọn; (h) đặt tour khoá tour rồi khoá chuyến; (i) `DataTable` cho bỏ phân trang và sắp xếp; (j) thêm giới hạn số ngày ≤ 365, giá ≤ 10¹², tổng chỗ ≤ 10.000; (k) ở trang sửa, đổi trạng thái là nút riêng có hiệu lực ngay; (l) sửa `button.tsx` để variant `outline` có viền (lỗi có sẵn, các nút ở màn Giai đoạn 1–2 cũng đổi theo). **Kết quả:** baseline API 430/430, admin 48/48, web 373/373, E2E 112/112. Cuối: API 648/648 (container JDK 25); admin lint, 107/107, build (hết cảnh báo kích thước chunk chính); web lint, tsc, 373/373; E2E 112/112 trên DB riêng mới. V7 chạy được trên DB V6 đã có dữ liệu và trên DB mới. Nghiệm thu 20/20 mục trên Vite, API, DB thật và web `next start` có webhook; 24 vòng giảm tổng chỗ song song với đặt tour không vòng nào bán quá chỗ (đặt thắng 18, nhân viên thắng 6). CSP ảnh đã kiểm trên image Docker của admin. **Chưa kiểm:** chưa dựng lại stack Compose đầy đủ (không build lại stack đang dùng, DB dev còn ở V6). **Tồn đọng:** admin đổi ngày một chuyến chưa ai đặt trong lúc khách đang mở form thì đơn nhận ngày mới; Docker build admin dùng `VITE_WEB_URL` mặc định (chưa có build arg); `Badge` `outline` vẫn không viền; Zod 4 thử `Function('')` nên trình duyệt báo vi phạm CSP `script-src eval` từ trang đăng nhập (vô hại, có thể tắt bằng `z.config({ jitless: true })`). |
| 4. Tổng quan | Hoàn tất | 26/11/2026 | Thêm `GET /admin/dashboard` (`getAdminDashboard`, STAFF/ADMIN) và trang Tổng quan đầy đủ. V8 thêm index theo `paid_at` của khoản PAID. SQL gom theo ngày Việt Nam trong transaction đọc `REPEATABLE READ`. “Tour đang bán” là tour ACTIVE có chuyến mở sau hôm nay và còn chỗ. Đơn mới gồm cả đơn đã huỷ. Huỷ đơn đã thu giảm doanh thu của ngày đã thu và hiện ở “Cần hoàn tiền”. Chuyến trong 14 ngày tới tính từ ngày mai, vẫn liệt kê chuyến hết chỗ hoặc đã đóng bán của tour ACTIVE. Dashboard và badge làm mới mỗi 60 giây và khi về cửa sổ. `Progress` chuyển giá trị xuống Radix để trình đọc màn hình nhận tỷ lệ lấp đầy. **Baseline:** API 648/648, admin 107/107, web 373/373, E2E 112/112 trên DB riêng, lint admin/web và build admin qua (chunk chính 381,91 kB). **Cuối:** API 661/661 trong JDK 25, gồm 55 PublicEndpoints và test commit giữa truy vấn. Admin lint, 126/126, build (chunk chính 430,56 kB, biểu đồ lazy 368,03 kB, không cảnh báo chunk). Web lint, 373/373, sinh lại bằng Orval và cả 55 file giữ nguyên theo SHA-256. **Nghiệm thu:** Vite/API/PostgreSQL riêng, SQL đối chiếu sau mỗi thao tác đơn và danh mục, cập nhật qua điều hướng SPA, kiểm bộ lọc, lỗi/thử lại, chặn ngày tương lai, polling 60 giây. Đã tự xem ảnh có dữ liệu/rỗng/lỗi ở 1440, 1280, 390 px. Image `gotrips-admin:phase4` hiển thị biểu đồ/tooltip, chỉ ghi nhận CSP `script-src eval` của Zod đã biết. Stack Compose đang dùng tiếp tục chạy, API healthy, admin/web 200. Phạm vi kiểm Docker là image tag riêng. |
| 5. Khách hàng, Nhân viên, Mật khẩu | Hoàn tất | 26/11/2026 | Thêm 7 endpoint quản trị và các màn `/customers`, `/customers/:id`, `/staff`, `/account/password`. SQL tính thống kê và phân trang khách hàng. Giao dịch đổi/thu hồi quyền khoá dòng ADMIN và kiểm lại quyền. UI kiểm phiên qua `getAdminMe` sau lỗi 403. Đổi mật khẩu theo luật đăng ký và CSRF, JWT cũ giữ hạn ban đầu. **Lệch đã chốt:** chi tiết đơn chỉ gắn liên kết hồ sơ khi chủ đơn có CUSTOMER vì API đặt chỗ cũng nhận tài khoản chỉ có quyền quản trị. **Baseline:** API 661/661, admin 126/126, web 373/373; E2E gần nhất 112/112. **Cuối:** API Giai đoạn 5 674/674 trong JDK 25, gồm 55 PublicEndpoints, admin lint/build và 142/142 (chạy lại với `--maxWorkers=1 --testTimeout=15000` sau timeout ở test tour). Client admin sinh bằng Orval, 55 tệp client web Giai đoạn 5 khớp SHA-256. Kiểm thêm bản chụp working tree có thay đổi khách sạn song song: API 689/689, web lint và 380/380. **Nghiệm thu:** Vite/API/PostgreSQL riêng, kiểm tạo STAFF, đổi vai trò, 403 ở trang và cả 4 API STAFF, mật khẩu 72 byte, phiên bị thu hồi đưa về đăng nhập. Hồ sơ hiện đủ ba trạng thái đơn và khớp SQL độc lập với 3 đơn, 3.200.000 ₫. Smoke `gotrips-admin:phase5` qua ba màn với CSP qua nginx và bàn phím. Các lượt dựng/migrate của Giai đoạn 5 dùng môi trường riêng. Stack đang dùng kiểm cuối API healthy, admin và web 200. **Chưa chạy lại:** build/E2E web Giai đoạn 5 vì không có thay đổi mã web thuộc giai đoạn này. `AGENTS.md` và `CLAUDE.md` khác đúng ba dòng quy ước. |
| 6. Khách sạn, Loại phòng | Hoàn tất | 27/11/2026 | Thêm 12 operation quản trị (`listAdminHotels`, `createAdminHotel`, `getAdminHotel`, `updateAdminHotel`, `updateAdminHotelStatus`, `deleteAdminHotel`, `restoreAdminHotel`, `listAdminRoomTypes`, `createAdminRoomType`, `updateAdminRoomType`, `deleteAdminRoomType`, `listAdminAmenities`) và các màn `/hotels`, `/hotels/new`, `/hotels/:id` (tab Loại phòng). Không có migration mới (V4, V7, V9 đủ cột), không đổi seed. **Sửa lỗi đặt phòng:** trước đây đơn lọt vào khách sạn đang bị ẩn/xoá vì đọc trạng thái không khoá (test khoá đỏ trên mã cũ). Nay khoá chia sẻ khách sạn rồi khoá ghi loại phòng. **Lệch đặc tả:** (a) tiện ích chọn nhiều từ danh mục V9, kiểm mã và scope, không nhập tag; (b) thêm `GET /admin/amenities` chỉ đọc; (c) quản lý cả bộ ảnh khách sạn và ảnh loại phòng; (d) giảm `totalRooms` so với đỉnh theo từng đêm, còn tìm/đặt giữ cách cộng mọi đơn giao với cả kỳ nên kỳ dài có thể báo hết phòng dù từng đêm còn; (e) khi đó `totalRooms = 0` ngừng nhận đặt và giá vẫn được tính. Giai đoạn 7 thay quy tắc này; (f) thêm giới hạn: giới thiệu ≤ 5.000, bộ ảnh ≤ 20, `maxGuests` ≤ 30, giá ≤ 10¹², diện tích và tổng phòng ≤ 10.000; (g) không chạy `docker compose up --build` của mục 5 để giữ nguyên stack đang dùng. **Baseline:** API 689/689, admin lint/build và 142/142, web lint/build và 380/380, E2E 113/113 trên DB riêng (bộ hiện có 113 ca, mốc ghi trước là 112). **Cuối:** API 822/822 (JDK 25, gồm 55 PublicEndpoints). Admin lint, 190/190, build không cảnh báo. Web lint, 380/380, build, E2E 113/113 với API mới trên DB mới. Client web sinh lại giống hệt 58/58 tệp (SHA-256). **Nghiệm thu:** 62/62 mục trên Vite, API, PostgreSQL và web `next start` riêng có webhook, đối chiếu SQL. Đối chứng: sửa DB không qua API thì web vẫn giữ trang cache. Image `gotrips-admin:phase6` qua 9/9 mục smoke dưới CSP (chỉ còn vi phạm `script-src eval` của Zod đã biết). Môi trường riêng đã dọn. Kiểm cuối stack đang dùng: API healthy, admin và web 200. **Chưa kiểm:** chưa build lại stack Compose đang dùng (đang chạy mã cũ), trình duyệt ngoài Chromium, trình đọc màn hình thật. **Tồn đọng (web, chưa sửa):** khách sạn mới hiện "0,0 (0 đánh giá)" và JSON-LD có `aggregateRating` 0 lượt; giới thiệu mất xuống dòng; chuỗi dài không khoảng trắng có thể tràn (suy từ mã, chưa thử). Khác: đơn cũ đọc tên khách sạn/loại phòng hiện tại; đổi nội dung seed có thể chèn lại ảnh, tiện ích, loại phòng đã gỡ khỏi khách sạn mẫu (DB dev); ở chế độ dev, nút React Query Devtools (có từ trước) che một phần nút Lưu của form. |
| 7. Vé máy bay và “giá từ” khách sạn | Hoàn tất | 27/11/2026 | **Giao hàng.** 16 operation STAFF/ADMIN và bốn màn Vé máy bay, danh sách operationId ở mục 6. Schema giữ V9. Luật Giai đoạn 6 được thay bằng `totalRooms > 0` cho “giá từ” và loại phòng công khai. Admin giữ tổng số loại, trả thêm `sellingRoomTypeCount`, phân biệt hai cảnh báo và báo hệ quả trước khi ngừng bán hoặc xoá loại đang bán cuối. Số hiệu gồm mã hãng và 1–8 chữ số. Giá phổ thông tối đa 10¹² đồng để phép tính vẫn an toàn. Giá tham khảo dùng giới hạn số nguyên an toàn của JavaScript. Thứ tự chặng kiểm danh sách gốc trong cùng giao dịch. **Baseline.** API 822/822, admin lint/build đạt và 190/190 khi chạy lại với hai worker sau một timeout 5 giây ở bài thao tác ảnh. Web lint và 380/380, E2E 113/113 trên DB riêng. Build Windows vướng EPERM trong `.next` trên OneDrive. Build Docker và build cho E2E ngoài OneDrive đều đạt. **Cuối.** API 874/874 trên JDK 25, gồm 64 PublicEndpoints và 6 ca tranh khoá đặt vé. Hai ca hồi quy khách sạn đỏ trên mã cũ rồi xanh. Admin lint/test/build đạt, 196/196. Web lint/test/build đạt, 380/380 và E2E 113/113 trên DB mới với jar bản cuối. Orval sinh lại cả hai client, 58/58 tệp web khớp SHA-256. **Nghiệm thu.** 62 mục trên Vite, API, PostgreSQL và web riêng có webhook, gồm đối chứng sửa SQL giữ giá cũ ở cache, liên kết phòng cũ, phòng ngừng/mở bán, tiền đơn vé và ảnh đơn khi sắp/xoá chặng. Đã sửa mất focus khi bảng dựng lại ô đổi thứ tự. Image `gotrips-admin:phase7` qua HTTP, proxy và Chromium dưới CSP. Compose project riêng `gotrips-phase7` có API healthy và admin/web 200, đã kiểm config và lấy JRE từ mirror sau lỗi kết nối Docker Hub. Stack đang dùng giữ nguyên. **Chưa kiểm.** Trình duyệt ngoài Chromium và trình đọc màn hình thật vì bộ nghiệm thu dùng Chromium headless cùng kiểm tra focus bàn phím. **Quyết định còn mở.** Cơ chế ngừng bán lịch bay vẫn còn đơn tương lai. |