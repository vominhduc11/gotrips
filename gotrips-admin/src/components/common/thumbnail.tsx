import { ImageOff } from 'lucide-react'
import { useState } from 'react'

/** Ảnh nhỏ trong bảng. Chỉ để nhận diện (tên nằm ở cột bên cạnh) nên là ảnh trang trí với trình đọc màn hình. */
export function Thumbnail({ url }: { url: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  if (failedUrl === url) {
    return (
      <span className="grid h-10 w-16 place-items-center rounded-md bg-muted text-muted-foreground">
        <ImageOff aria-hidden="true" className="size-4" />
      </span>
    )
  }
  return <img src={url} alt="" loading="lazy" onError={() => setFailedUrl(url)}
    className="h-10 w-16 rounded-md object-cover" />
}
