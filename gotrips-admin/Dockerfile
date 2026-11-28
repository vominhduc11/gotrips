
# Stage 1: Build React/Vite
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Địa chỉ website cho liên kết "Xem trên website". Vite đọc biến VITE_* từ môi trường lúc build và nhúng vào bundle,
# nên giá trị phải có ở bước này (docker-compose.yml truyền qua build arg). Trống thì code dùng http://localhost:3000.
ARG VITE_WEB_URL

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
