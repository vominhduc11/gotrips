import { Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function CopyButton({ value, label, sensitive = false }: { value: string; label: string; sensitive?: boolean }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success('Đã sao chép')
    } catch {
      toast.error(sensitive ? 'Không thể sao chép. Hãy thử lại.' : 'Không thể sao chép. Hãy chọn và sao chép nội dung.')
    }
  }
  return <Button type="button" variant="ghost" size="icon-sm" aria-label={label} onClick={() => void copy()}>
    <Copy aria-hidden="true" />
  </Button>
}
