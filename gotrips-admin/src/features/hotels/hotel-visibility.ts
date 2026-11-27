import type { AdminHotelSummaryResponse, AdminRoomTypeResponse } from '@/lib/api/generated/model'

export const NO_ROOM_TYPE_WARNING = 'Chưa hiện trên website: chưa có loại phòng'
export const NO_SELLING_ROOM_TYPE_WARNING = 'Chưa hiện trên website: không còn loại phòng đang bán'

type HotelRoomCounts = Pick<AdminHotelSummaryResponse, 'status' | 'roomTypeCount' | 'sellingRoomTypeCount'>

export function hotelRoomWarning(hotel: HotelRoomCounts) {
  if (hotel.status !== 'ACTIVE' || hotel.sellingRoomTypeCount > 0) return null
  return hotel.roomTypeCount === 0 ? NO_ROOM_TYPE_WARNING : NO_SELLING_ROOM_TYPE_WARNING
}

export function lastSellingRoomWarning(hotel: HotelRoomCounts, roomType: AdminRoomTypeResponse) {
  if (hotel.sellingRoomTypeCount !== 1 || roomType.totalRooms === 0) return null
  return hotel.status === 'ACTIVE'
    ? 'Đây là loại phòng đang bán cuối cùng. Khách sạn sẽ không còn hiện trên website.'
    : 'Đây là loại phòng đang bán cuối cùng. Cần mở bán ít nhất một loại để khách sạn có thể hiện trên website.'
}
