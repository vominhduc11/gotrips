import { Ellipsis } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { AdminBankTransactionResponse, AdminBankTransactionResponseAvailableActionsItem } from '@/lib/api/generated/model'
import { AssignTransactionDialog, ResolveTransactionDialog } from './transaction-dialogs'

const actionLabels: Record<AdminBankTransactionResponseAvailableActionsItem, string> = {
  ASSIGN: 'Gắn vào đơn',
  RESOLVE: 'Đánh dấu đã xử lý',
}

/** Thao tác theo `availableActions` của API: giao diện không tự suy ra luật được phép. */
export function TransactionActions({ transaction }: { transaction: AdminBankTransactionResponse }) {
  const [selected, setSelected] = useState<AdminBankTransactionResponseAvailableActionsItem | null>(null)
  if (transaction.availableActions.length === 0 && !selected) return null
  const close = () => setSelected(null)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="icon-sm" variant="ghost" aria-label={`Thao tác giao dịch ${transaction.sepayId}`}>
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {transaction.availableActions.map((action) => (
            <DropdownMenuItem key={action} onSelect={() => setSelected(action)}>{actionLabels[action]}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selected === 'ASSIGN' && <AssignTransactionDialog transaction={transaction} onClose={close} />}
      {selected === 'RESOLVE' && <ResolveTransactionDialog transaction={transaction} onClose={close} />}
    </>
  )
}
