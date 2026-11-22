import { defineConfig } from "orval";

/**
 * Sinh client + kiểu DTO từ OpenAPI của gotrips-api (springdoc). Chạy `npm run api:gen` khi API đang chạy.
 * Không sửa tay file trong lib/api/generated/ — thay đổi ở API rồi sinh lại.
 * Mọi request đi qua `customFetch` trong lib/api/http.ts (timeout, ProblemDetail → ApiError).
 */
export default defineConfig({
  gotrips: {
    input: {
      target: "http://localhost:8080/v3/api-docs",
    },
    output: {
      target: "lib/api/generated/index.ts",
      schemas: "lib/api/generated/model",
      mode: "split",
      client: "fetch",
      clean: true,
      override: {
        mutator: {
          path: "lib/api/http.ts",
          name: "customFetch",
        },
      },
    },
  },
});
