import { ImageOff } from 'lucide-react'
import { useState } from 'react'

/**
 * Xem trước ảnh theo địa chỉ đang nhập. Nguồn được phép do API quyết định (và CSP của bản Docker chỉ tải ảnh từ đó),
 * nên ở đây chỉ thử tải địa chỉ https và báo khi không tải được.
 */
export function ImagePreview({ url, alt }: { url: string; alt: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const source = url.trim()

  if (!source.startsWith('https://')) {
    return <p className="text-sm text-muted-foreground">Nhập địa chỉ ảnh bắt đầu bằng https:// để xem trước.</p>
  }
  if (failedUrl === source) {
    return (
      <p role="status" className="flex items-center gap-2 text-sm text-warning">
        <ImageOff aria-hidden="true" className="size-4" />Không tải được ảnh từ địa chỉ này.
      </p>
    )
  }
  return (
    <img src={source} alt={alt.trim() || 'Ảnh xem trước'} onError={() => setFailedUrl(source)}
      className="aspect-video w-full max-w-md rounded-lg border object-cover" />
  )
}
