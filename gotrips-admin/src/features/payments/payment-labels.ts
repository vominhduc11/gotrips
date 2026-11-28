import type { BankTransactionOutcome, BankTransactionReviewReason } from '@/lib/api/generated/model'

/** Bảng đủ mọi giá trị enum của API: API thêm giá trị mới thì TypeScript báo thiếu nhãn. */
export const outcomeLabels: Record<BankTransactionOutcome, readonly [string, string]> = {
  APPLIED: ['Đã tính vào đơn', 'bg-success-surface text-success'],
  OVERPAID: ['Chuyển thừa', 'bg-warning-surface text-warning'],
  NOT_PAYABLE: ['Đơn không nhận tiền', 'bg-warning-surface text-warning'],
  UNMATCHED: ['Không khớp đơn', 'bg-warning-surface text-warning'],
  WRONG_ACCOUNT: ['Sai tài khoản nhận', 'bg-warning-surface text-warning'],
}

/** Câu giải thích việc cần làm; NONE không có gì để nói. */
export const reviewReasonLabels: Record<BankTransactionReviewReason, string> = {
  NONE: '',
  UNMATCHED: 'Nội dung không có mã đơn nào. Gắn vào đúng đơn hoặc hoàn lại cho người chuyển.',
  WRONG_ACCOUNT: 'Tiền vào tài khoản khác tài khoản nhận đã cấu hình. Kiểm tra rồi gắn đơn hoặc hoàn tiền.',
  NOT_PAYABLE: 'Đơn đã huỷ hoặc đã thu đủ trước đó nên khoản này không được tính. Hoàn lại cho khách.',
  OVERPAID: 'Khách chuyển thừa. Hoàn phần thừa cho khách.',
  BOOKING_CANCELLED: 'Đơn đã huỷ khi chưa đủ tiền. Hoàn lại số đã nhận cho khách.',
}
