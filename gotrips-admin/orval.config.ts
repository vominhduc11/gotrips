import { defineConfig } from 'orval'

// Sinh client từ OpenAPI của gotrips-api. Chạy: npm run api:gen (cần API đang chạy ở cổng 8080).
// Không sửa file trong src/lib/api/generated: mọi thay đổi phải làm ở backend rồi sinh lại.
export default defineConfig({
  gotrips: {
    input: {
      target: 'http://localhost:8080/v3/api-docs',
    },
    output: {
      mode: 'single',
      target: 'src/lib/api/generated/api.ts',
      schemas: 'src/lib/api/generated/model',
      client: 'react-query',
      // Dùng fetch thay vì axios (không dùng Axios trong dự án); mutator bên dưới là fetch wrapper của mình.
      httpClient: 'fetch',
      clean: true,
      override: {
        // apiFetch trả thẳng dữ liệu đã parse (không bọc { data, status, headers }), nên kiểu do Orval
        // sinh ra cũng phải là dữ liệu thuần, nếu không kiểu và giá trị chạy thật sẽ lệch nhau.
        fetch: { includeHttpResponseReturnType: false },
        mutator: {
          path: 'src/lib/api/http.ts',
          name: 'apiFetch',
        },
      },
    },
  },
})
