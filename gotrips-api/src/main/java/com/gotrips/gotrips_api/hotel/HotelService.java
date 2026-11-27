package com.gotrips.gotrips_api.hotel;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.catalog.ImageResponse;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.destination.Destination;
import com.gotrips.gotrips_api.destination.DestinationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HotelService {

    private final HotelRepository hotelRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final HotelImageRepository hotelImageRepository;
    private final HotelAmenityRepository hotelAmenityRepository;
    private final HotelRoomTypeImageRepository roomTypeImageRepository;
    private final HotelRoomTypeAmenityRepository roomTypeAmenityRepository;
    private final DestinationRepository destinationRepository;
    private final HotelMapper hotelMapper;
    private final HotelRoomInventory roomInventory;
    private final Clock clock;

    /**
     * Khách sạn nổi bật cho Trang chủ: ACTIVE, có loại phòng đang bán, theo điểm đánh giá giảm dần
     * (rồi số đánh giá, rồi id), tối đa {@code limit}. "Giá từ" lấy trong các loại đang bán.
     */
    @Transactional(readOnly = true)
    public List<HotelCardResponse> featured(int limit) {
        return hotelRepository.findVisibleWithSellingRooms(CatalogStatus.ACTIVE, Limit.of(limit)).stream()
                .map(row -> hotelMapper.toCard(row.getHotel(), row.getMinPricePerNight()))
                .toList();
    }

    /**
     * Trang /hotels: khách sạn ACTIVE của một điểm đến còn phòng trống cho khoảng ngày, số khách, số phòng đã chọn (luật
     * ở {@link HotelStayCalculator}). Slug điểm đến không tồn tại cho kết quả rỗng (không bỏ qua bộ lọc, nếu không
     * khách gõ sai slug lại thấy mọi khách sạn). Lượt tìm sai luật ném {@code InvalidRequestException} (400).
     * "Hôm nay" tính MỘT lần mỗi request theo giờ Việt Nam (xem {@code ClockConfig}).
     */
    @Transactional(readOnly = true)
    public HotelSearchResponse search(String destinationSlug, LocalDate checkIn, LocalDate checkOut, int guests,
            int rooms) {
        HotelStayCalculator.validateStay(checkIn, checkOut, guests, rooms, LocalDate.now(clock));

        Optional<Destination> destination = destinationRepository.findBySlug(destinationSlug.strip());
        if (destination.isEmpty()) {
            return new HotelSearchResponse(null, List.of());
        }

        List<Hotel> hotels = hotelRepository.findByStatusAndDestination(CatalogStatus.ACTIVE,
                destination.get().getId());
        Map<Long, List<HotelRoomType>> roomTypesByHotel = hotels.isEmpty() ? Map.of()
                : roomTypeRepository
                        .findByHotelIdInAndTotalRoomsGreaterThan(hotels.stream().map(Hotel::getId).toList(), 0).stream()
                        .collect(Collectors.groupingBy(HotelRoomType::getHotelId));

        Map<Long, Long> bookedRoomsByType = roomInventory.bookedRooms(
                roomTypesByHotel.values().stream().flatMap(List::stream).map(HotelRoomType::getId).toList(), checkIn,
                checkOut);

        List<HotelSearchResultResponse> items = HotelStayCalculator
                .search(hotels, roomTypesByHotel, bookedRoomsByType,
                        new HotelStayCalculator.Criteria(checkIn, checkOut, guests, rooms))
                .stream()
                .map(entry -> hotelMapper.toSearchResult(hotelMapper.toCard(entry.hotel(), entry.minPricePerNight()),
                        hotelMapper.toRoomType(entry.room()), entry.nights(), entry.rooms(), entry.totalPrice()))
                .toList();

        return new HotelSearchResponse(destination.get().getName(), items);
    }

    /**
     * Chi tiết chỉ gồm loại phòng đang bán. Khách sạn vắng mặt, không ACTIVE hoặc hết loại đang bán cùng trả 404.
     */
    @Transactional(readOnly = true)
    public HotelDetailResponse detail(String slug) {
        Hotel hotel = hotelRepository.findBySlugAndStatus(slug, CatalogStatus.ACTIVE)
                .orElseThrow(HotelService::notFound);

        List<HotelRoomType> roomTypes = HotelStayCalculator.sortRoomTypes(
                roomTypeRepository.findByHotelIdAndTotalRoomsGreaterThan(hotel.getId(), 0));
        long minPricePerNight = HotelStayCalculator.minPricePerNight(roomTypes).orElseThrow(HotelService::notFound);

        // Ảnh và tiện ích chỉ đọc SAU khi biết khách sạn xem được. Cùng với phần của loại phòng là 4 query cố định,
        // không phụ thuộc số loại phòng.
        List<ImageResponse> images = hotelImageRepository.findByHotelIdOrderBySortOrder(hotel.getId()).stream()
                .map(hotelMapper::toHotelImage)
                .toList();
        List<AmenityResponse> amenities = hotelAmenityRepository.findWithAmenityByHotelId(hotel.getId()).stream()
                .map(link -> hotelMapper.toAmenity(link.getAmenity()))
                .toList();

        return hotelMapper.toDetail(hotelMapper.toCard(hotel, minPricePerNight), hotel.getDescription(), amenities,
                images, hotel.getCheckInTime(), hotel.getCheckOutTime(), roomTypeDetails(roomTypes));
    }

    /** Gắn ảnh và tiện ích cho từng loại phòng, giữ nguyên thứ tự của {@code roomTypes}. */
    private List<HotelRoomTypeDetailResponse> roomTypeDetails(List<HotelRoomType> roomTypes) {
        List<Long> roomTypeIds = roomTypes.stream().map(HotelRoomType::getId).toList();

        // `groupingBy` giữ thứ tự gặp trong từng nhóm nên thứ tự do query quyết định không bị mất.
        Map<Long, List<ImageResponse>> images = roomTypeImageRepository
                .findByRoomTypeIdInOrderBySortOrder(roomTypeIds).stream()
                .collect(Collectors.groupingBy(HotelRoomTypeImage::getRoomTypeId,
                        Collectors.mapping(hotelMapper::toRoomImage, Collectors.toList())));
        Map<Long, List<AmenityResponse>> amenities = roomTypeAmenityRepository
                .findWithAmenityByRoomTypeIdIn(roomTypeIds).stream()
                .collect(Collectors.groupingBy(HotelRoomTypeAmenity::getRoomTypeId,
                        Collectors.mapping(link -> hotelMapper.toAmenity(link.getAmenity()), Collectors.toList())));

        // Loại phòng chưa có ảnh/tiện ích phải ra danh sách rỗng, không phải null.
        return roomTypes.stream()
                .map(room -> hotelMapper.toRoomTypeDetail(hotelMapper.toRoomType(room),
                        images.getOrDefault(room.getId(), List.of()),
                        amenities.getOrDefault(room.getId(), List.of())))
                .toList();
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy khách sạn này.");
    }
}
