import { z } from 'zod'

const MAX_PRICE = 1_000_000_000_000
const MAX_SEATS = 10_000

/** "1.000.000" hay "1 000 000" đều là một triệu: bỏ dấu ngăn hàng nghìn trước khi kiểm. */
const digits = (value: string) => value.replace(/[.\s]/g, '')

const isWholeNumberIn = (value: string, min: number, max: number) =>
  /^\d+$/.test(value) && Number(value) >= min && Number(value) <= max

/**
 * Chỉ để báo lỗi sớm. Giới hạn và câu chữ khớp `AdminDepartureRequest` và `AdminDepartureService` của API: đổi một nơi
 * phải đổi nơi kia. "Hôm nay" truyền vào lúc kiểm để test được.
 */
export function createDepartureFormSchema(today: string) {
  return z.object({
    departureDate: z.string().min(1, 'Vui lòng chọn ngày khởi hành.')
      .refine((date) => date === '' || date > today, 'Ngày khởi hành phải sau hôm nay.'),
    price: z.string().transform(digits).pipe(z.string().min(1, 'Vui lòng nhập giá.')
      .refine((value) => isWholeNumberIn(value, 1, MAX_PRICE), 'Giá phải là số nguyên lớn hơn 0.')
      .transform(Number)),
    originalPrice: z.string().transform(digits).pipe(z.string()
      .refine((value) => value === '' || isWholeNumberIn(value, 1, MAX_PRICE), 'Giá gốc phải là số nguyên lớn hơn 0.')
      .transform((value) => (value === '' ? undefined : Number(value)))),
    totalSeats: z.string().trim().min(1, 'Vui lòng nhập tổng số chỗ.')
      .refine((value) => value === '' || isWholeNumberIn(value, 1, MAX_SEATS), 'Tổng số chỗ phải từ 1 đến 10.000.')
      .transform(Number),
  }).refine((departure) => departure.originalPrice === undefined || departure.originalPrice > departure.price, {
    path: ['originalPrice'],
    message: 'Giá gốc phải lớn hơn giá bán (hoặc để trống).',
  })
}

export type DepartureFormInput = z.input<ReturnType<typeof createDepartureFormSchema>>
export type DepartureFormOutput = z.output<ReturnType<typeof createDepartureFormSchema>>

export const departureFormFields = ['departureDate', 'price', 'originalPrice', 'totalSeats'] as const
