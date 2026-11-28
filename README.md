# GoTrips

Nền tảng đặt dịch vụ du lịch trực tuyến (bản MVP). Khách tìm và đặt **tour**, **phòng khách sạn** và **vé máy bay**, rồi thanh toán bằng chuyển khoản (có mã VietQR). Khi bật [SePay](https://sepay.vn), tiền về tài khoản là đơn tự được xác nhận. Nhân viên xử lý các giao dịch lệch, quản lý đơn và danh mục ở trang quản trị.

> Giao diện và tài liệu viết bằng tiếng Việt. Ảnh trong dữ liệu mẫu là ảnh Unsplash dùng tạm, phải thay bằng ảnh có bản quyền trước khi ra mắt.

## Cấu trúc repo

| Thư mục | Vai trò | Công nghệ | Cổng (Docker) |
|---|---|---|---|
| [`gotrips-api/`](gotrips-api/) | REST API, nguồn duy nhất của dữ liệu và luật nghiệp vụ | Spring Boot 4, Java 25, PostgreSQL, Flyway | 8080 |
| [`gotrips-web/`](gotrips-web/) | Website cho khách | Next.js 16, React 19, Tailwind CSS 4 | 3000 |
| [`gotrips-admin/`](gotrips-admin/) | Trang quản trị cho nhân viên | React 19, Vite, TanStack Query | 8081 |
| [`docker-compose.yml`](docker-compose.yml) | PostgreSQL 17 và ba dịch vụ trên | Docker Compose | DB: `127.0.0.1:5432` |

Web và admin không tự giữ dữ liệu: mọi thứ (danh mục, giá, chỗ trống, đơn) đều lấy từ `gotrips-api`.

## Chức năng đã có

- **Website:** Trang chủ với ô tìm kiếm tour, khách sạn, vé máy bay; danh sách và chi tiết tour, khách sạn; tìm vé một chiều và khứ hồi; đặt chỗ hai bước, điền sẵn số liên hệ từ hồ sơ; đăng ký, đăng nhập; trang tài khoản để sửa họ tên, lưu số điện thoại và đổi mật khẩu; xem đơn của tôi kèm hướng dẫn chuyển khoản và mã VietQR, trang đơn tự cập nhật khi tiền về; đăng ký nhận ưu đãi.
- **Thanh toán chuyển khoản qua SePay:** webhook báo tiền vào, hệ thống cộng dồn các lần chuyển và tự xác nhận đơn khi đủ tiền (xem [Thanh toán qua SePay](#thanh-toán-qua-sepay-tuỳ-chọn)).
- **Trang quản trị:** Tổng quan (KPI, biểu đồ, việc cần làm); quản lý đơn (đánh dấu đã thu tiền, xác nhận, huỷ); giao dịch ngân hàng do SePay báo (gắn vào đơn, đánh dấu đã xử lý); điểm đến, tour, lịch khởi hành; khách sạn, loại phòng; hãng bay, sân bay, lịch bay, chặng phổ biến; tra cứu khách hàng; quản lý nhân viên (chỉ ADMIN); đổi mật khẩu.
- **Chưa có:** thanh toán thẻ hoặc ví điện tử, hoàn tiền tự động, hạn giữ chỗ cho đơn chưa trả tiền, quên mật khẩu, xác minh email, giới hạn số lần đăng nhập sai.

## Chạy nhanh bằng Docker

Cần [Docker](https://docs.docker.com/get-docker/) có Compose v2. Không cần cài Node hay Java.

1. Tạo file `.env` ở gốc repo từ file mẫu:

   ```bash
   cp .env.example .env
   ```

2. Mở `.env` và điền:
   - `POSTGRES_PASSWORD`: mật khẩu tuỳ ý cho DB dev.
   - `GOTRIPS_JWT_SECRET`: **bắt buộc**, thiếu thì Compose dừng ngay. Tạo bằng `openssl rand -base64 48`.
   - Muốn website tự làm mới dữ liệu sau khi sửa ở trang quản trị: bỏ dấu `#` ở hai dòng `GOTRIPS_WEB_REVALIDATE_URL` và `GOTRIPS_REVALIDATE_SECRET`, điền bí mật tạo bằng `openssl rand -hex 32`. Không bật thì website vẫn chạy, chỉ thấy dữ liệu mới sau khi cache hết hạn.

3. Build và chạy:

   ```bash
   docker compose up --build
   ```

   Lần đầu mất vài phút. Web và admin chỉ khởi động sau khi API báo healthy.

4. Mở:

   | Địa chỉ | Nội dung |
   |---|---|
   | http://localhost:3000 | Website khách |
   | http://localhost:8081 | Trang quản trị |
   | http://localhost:8080/swagger-ui.html | Tài liệu API (Swagger UI) |

Compose mặc định bật profile `seed` của API: nạp dữ liệu mẫu (điểm đến, tour, khách sạn, lịch bay...), tài khoản quản trị và tài khoản nhận chuyển khoản thử nghiệm.

### Tài khoản dùng thử (chỉ có khi bật profile `seed`)

| Vai trò | Email | Mật khẩu |
|---|---|---|
| ADMIN | `admin@gotrips.test` | `GoTripsDevAdmin26` |
| STAFF | `staff@gotrips.test` | `GoTripsDevStaff26` |

Hai tài khoản này chỉ dùng cho máy dev. Tài khoản khách thì tự đăng ký trên website.

### Lệnh Docker hay dùng

```bash
docker compose up -d gotrips-db gotrips-api   # chỉ chạy DB + API (khi phát triển web/admin hoặc chạy e2e)
docker compose logs -f gotrips-api            # xem log API
docker compose down                           # dừng, giữ dữ liệu
docker compose down -v                        # dừng và XOÁ dữ liệu DB dev (nạp lại seed từ đầu)
```

## Phát triển từng phần

Cần thêm **Node.js 24** cho web/admin và **JDK 25** cho API. Chạy DB trước bằng `docker compose up -d gotrips-db`.

### API (`gotrips-api/`)

API không tự đọc file `.env`: đặt biến môi trường trong shell hoặc IDE trước khi chạy (mẫu ở [`gotrips-api/.env.example`](gotrips-api/.env.example)). Tối thiểu cần:

- `GOTRIPS_JWT_SECRET`
- `SPRING_DATASOURCE_PASSWORD`: trùng `POSTGRES_PASSWORD` trong `.env` ở gốc repo.
- `GOTRIPS_ADMIN_COOKIE_SECURE=false`: để đăng nhập trang quản trị qua HTTP.

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=seed   # kèm dữ liệu mẫu
./mvnw test                                              # cần Docker đang chạy (Testcontainers)
```

Không chạy profile `seed` thì phải đặt thêm `GOTRIPS_BANK_NAME`, `GOTRIPS_BANK_ACCOUNT_NUMBER`, `GOTRIPS_BANK_ACCOUNT_NAME`, thiếu thì API không khởi động.

Máy Windows không có JDK 25 thì chạy test trong container (Git Bash, từ gốc repo):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -v "$(cygpath -wa gotrips-api):/app" -v gotrips-m2:/root/.m2 \
  -v /var/run/docker.sock:/var/run/docker.sock -e TESTCONTAINERS_HOST_OVERRIDE=host.docker.internal \
  -w /app eclipse-temurin:25-jdk ./mvnw -B test
```

### Website (`gotrips-web/`)

Mặc định gọi API ở `http://localhost:8080` (đổi bằng `API_URL`, mẫu ở [`gotrips-web/.env.example`](gotrips-web/.env.example)).

```bash
npm install
npm run dev -- -p 3100   # cổng 3000 đã bị container gotrips-web chiếm nếu đang chạy Compose
npm run lint
npm test                 # unit test (Vitest)
npm run test:e2e         # Playwright, cổng 3100; cần DB + API đang chạy với profile seed
npm run build            # build được cả khi API tắt
```

Test e2e tạo tài khoản và đơn đặt chỗ **thật** trong DB dev. Chạy rất nhiều lần có thể làm hết chỗ các tour mẫu; khi đó nạp lại DB bằng `docker compose down -v`.

Spec thanh toán (`e2e/payment.spec.ts`) tự gửi webhook SePay có chữ ký. Nó chỉ chạy khi API đang bật webhook và lệnh e2e có cùng biến `GOTRIPS_SEPAY_WEBHOOK_SECRET`; thiếu biến thì spec được bỏ qua.

### Trang quản trị (`gotrips-admin/`)

```bash
npm install
npm run dev     # http://localhost:5173, tự chuyển /api tới API ở cổng 8080
npm run lint
npm test        # Vitest + Testing Library
npm run build
```

### Khi API đổi hợp đồng

Web và admin dùng client do [Orval](https://orval.dev) sinh từ OpenAPI của API. Sau khi sửa endpoint hoặc DTO, cho API chạy ở cổng 8080 rồi sinh lại client ở cả hai dự án:

```bash
npm run api:gen   # chạy trong gotrips-web/ và gotrips-admin/
```

Commit thư mục `lib/api/generated/` (web) và `src/lib/api/generated/` (admin) cùng với thay đổi API. Không sửa tay các file sinh ra.

## Biến môi trường

Mỗi dự án có file mẫu riêng, mỗi biến đều có chú thích:

| File | Dùng khi |
|---|---|
| [`.env.example`](.env.example) | Chạy bằng Docker Compose |
| [`gotrips-api/.env.example`](gotrips-api/.env.example) | Chạy API bằng `mvnw` hoặc IDE |
| [`gotrips-web/.env.example`](gotrips-web/.env.example) | Chạy web bằng `npm run dev` |
| [`gotrips-admin/.env.example`](gotrips-admin/.env.example) | Chạy hoặc build admin bằng Vite |

Không commit `.env` hay bất kỳ bí mật nào. Khi triển khai môi trường thật:

- File `.env` chỉ dùng cho máy local. Trên VPS dùng file `.env.vps` ở gốc repo (cũng không commit) và chạy `docker compose --env-file .env.vps up -d --build`. Mọi lệnh `docker compose` trên VPS đều phải kèm `--env-file .env.vps`.
- Đặt `SPRING_PROFILES_ACTIVE=` (rỗng) để không nạp dữ liệu mẫu và tài khoản dev. Khi đó DB chưa có tài khoản quản trị: đăng ký một tài khoản ở website rồi gán vai trò `ADMIN` cho tài khoản đó trong bảng `user_roles`.
- Đặt đủ ba biến `GOTRIPS_BANK_*`.
- Đặt `GOTRIPS_ADMIN_COOKIE_SECURE=true` và phục vụ qua HTTPS. Khi tạm chạy bằng HTTP (chưa có tên miền) thì để `false`, nếu không trang quản trị không đăng nhập được.
- Đặt `VITE_WEB_URL` bằng địa chỉ website để liên kết "Xem trên website" của trang quản trị trỏ đúng (giá trị nhúng lúc build).
- Dùng `GOTRIPS_JWT_SECRET` riêng cho từng môi trường.
- Dùng SePay thì đặt `GOTRIPS_SEPAY_WEBHOOK_SECRET` riêng cho môi trường đó (xem mục dưới).

## Thanh toán qua SePay (tuỳ chọn)

[SePay](https://sepay.vn) theo dõi tài khoản ngân hàng nhận tiền và gọi webhook của API mỗi khi có tiền vào. API tìm mã đơn (`GT` + 6 ký tự) trong nội dung chuyển khoản, cộng tiền vào đơn và tự xác nhận khi đủ. Không bật thì mọi thứ khác vẫn chạy, nhân viên đánh dấu đã thu tiền bằng tay.

1. Tạo Secret Key bằng `openssl rand -hex 32`, rồi đặt vào `.env` (hoặc `.env.vps`):
   - `GOTRIPS_SEPAY_WEBHOOK_SECRET`: Secret Key vừa tạo.
   - `GOTRIPS_BANK_QR_CODE`: mã ngân hàng để trang đơn hiện mã VietQR, ví dụ `VCB`, `MB` hoặc mã BIN `970436`. Để trống thì không có mã QR.

   Khởi động lại API (`docker compose up -d gotrips-api`).
2. Trên SePay, liên kết đúng tài khoản ghi ở `GOTRIPS_BANK_ACCOUNT_NUMBER`. Giao dịch vào tài khoản khác chỉ được ghi lại, không tự tính vào đơn.
3. Ở "Cấu hình Công ty → Cấu hình chung → Cấu trúc mã thanh toán", thêm mẫu: tiền tố `GT`, hậu tố từ 6 đến 6 ký tự, loại "Số và chữ".
4. Tạo webhook:
   - URL: `<địa chỉ API>/payments/sepay/webhook`. Với Docker Compose, API mở ở cổng 8080. Nên dùng HTTPS.
   - Xác thực: **HMAC-SHA256**, Secret Key trùng `GOTRIPS_SEPAY_WEBHOOK_SECRET`.
   - Định dạng dữ liệu: JSON.
   - Bật "Tự động gửi lại khi server trả lỗi".
   - Không bật "Chỉ gửi khi có mã thanh toán", để giao dịch khách quên ghi mã đơn vẫn hiện ở trang quản trị cho nhân viên gắn tay.

SePay phải gọi tới được API, nên máy local cần một đường hầm (tunnel) công khai. Giao dịch qua QR tĩnh NAPAS không có webhook, và lần gửi SePay đã bỏ cuộc thì không tới nữa. Khi đó nhân viên đánh dấu đã thu tiền ở trang chi tiết đơn.

## Tài liệu khác

- [`CLAUDE.md`](CLAUDE.md): mô tả chi tiết kiến trúc, luật nghiệp vụ, quy ước code và quy tắc dùng thư viện. Ai sửa code cũng nên đọc. [`AGENTS.md`](AGENTS.md) có cùng nội dung.
- Các sơ đồ ở gốc repo, mở bằng [draw.io](https://app.diagrams.net):
  - [`GoTrips_ERD_V9_Corrected.drawio`](GoTrips_ERD_V9_Corrected.drawio): cơ sở dữ liệu.
  - [`GoTrips_Kien_truc.drawio`](GoTrips_Kien_truc.drawio): tổng thể hệ thống, triển khai Docker, đăng nhập và làm mới cache.
  - [`GoTrips_Chuc_nang.drawio`](GoTrips_Chuc_nang.drawio): ai làm được gì, các màn hình website và trang quản trị.
  - [`GoTrips_Luong_nghiep_vu.drawio`](GoTrips_Luong_nghiep_vu.drawio): đặt tour, đặt phòng, đặt vé và nhân viên xử lý đơn.
  - [`GoTrips_Trang_thai.drawio`](GoTrips_Trang_thai.drawio): vòng đời đơn và thanh toán, tour, khách sạn, chuyến khởi hành, loại phòng và lịch bay.
- Swagger UI của API đang chạy: http://localhost:8080/swagger-ui.html
