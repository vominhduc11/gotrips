import { z } from 'zod'

export const airlineCode = z.string().regex(/^[A-Z0-9]{2}$/, 'Mã hãng gồm đúng 2 chữ in hoa hoặc chữ số.')
export const airportCode = z.string().regex(/^[A-Z]{3}$/, 'Mã IATA gồm đúng 3 chữ in hoa.')
const maxInt = 2147483647

function requiredText(label: string, maximum: number) {
  const lower = label.toLocaleLowerCase('vi')
  return z.string().trim().min(1, `Vui lòng nhập ${lower}.`).max(maximum, `${label} không được quá ${maximum} ký tự.`)
}

function integer(minimum: number, maximum: number, message: string) {
  return z.string().trim().regex(/^-?\d+$/, message).transform(Number)
    .pipe(z.number().int(message).min(minimum, message).max(maximum, message))
}

export function flightReferenceSchema(isAirport: boolean) {
  return z.object({
    code: isAirport ? airportCode : airlineCode,
    name: isAirport ? requiredText('Tên sân bay', 150) : requiredText('Tên hãng', 100),
    city: isAirport ? requiredText('Tên thành phố', 100) : z.string(),
    sortOrder: integer(-maxInt - 1, maxInt, 'Thứ tự gợi ý phải là số nguyên trong phạm vi cho phép.'),
  })
}

const seats = integer(0, maxInt, 'Số ghế phải là số nguyên từ 0 trở lên.')
const scheduleTiming = z.object({
  departTime: z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Giờ cất cánh phải theo dạng HH:mm.'),
  durationMinutes: integer(1, 1439, 'Thời lượng phải từ 1 đến 1.439 phút.'),
  economyFare: integer(1, 1_000_000_000_000, 'Giá phổ thông phải từ 1 đến 1.000 tỷ đồng.'),
  economySeats: seats,
  premiumEconomySeats: seats,
  businessSeats: seats,
  firstSeats: seats,
})

export function flightScheduleSchema(edit: boolean) {
  return scheduleTiming.extend({
    airlineCode: edit ? z.string() : airlineCode,
    flightNumber: edit ? z.string() : z.string().regex(/^[A-Z0-9]{2}[0-9]{1,8}$/, 'Số hiệu gồm mã hãng và 1 đến 8 chữ số.'),
    fromCode: edit ? z.string() : airportCode,
    toCode: edit ? z.string() : airportCode,
  }).superRefine((data, ctx) => {
    if (edit) return
    if (data.fromCode === data.toCode) {
      ctx.addIssue({ code: 'custom', path: ['toCode'], message: 'Điểm đến phải khác điểm đi.' })
    }
    if (!data.flightNumber.startsWith(data.airlineCode)) {
      ctx.addIssue({ code: 'custom', path: ['flightNumber'], message: 'Số hiệu phải bắt đầu bằng mã hãng đã chọn.' })
    }
  })
}

export const flightRouteSchema = z.object({
  fromCode: airportCode,
  toCode: airportCode,
  durationMinutes: integer(1, maxInt, 'Thời lượng phải là số nguyên lớn hơn 0 phút.'),
  referencePrice: integer(1, Number.MAX_SAFE_INTEGER, 'Giá tham khảo phải là số nguyên dương trong phạm vi cho phép.'),
  imageUrl: requiredText('Địa chỉ ảnh', 500),
  imageAlt: requiredText('Mô tả ảnh', 255),
}).refine(({ fromCode, toCode }) => fromCode !== toCode, { path: ['toCode'], message: 'Điểm đến phải khác điểm đi.' })
