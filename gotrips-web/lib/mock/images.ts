/**
 * Dựng URL ảnh Unsplash cố định (ảnh tạm cho prototype — thay bằng ảnh thật/ảnh có bản quyền của GoTrips sau).
 * Host `images.unsplash.com` đã được khai báo trong `images.remotePatterns` ở next.config.ts.
 */
export function unsplash(photoId: string, width = 1600): string {
  return `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=75`;
}
