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
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.destination.Destination;
import com.gotrips.gotrips_api.destination.DestinationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HotelService {

    private final HotelRepository hotelRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final DestinationRepository destinationRepository;
    private final HotelMapper hotelMapper;
    private final Clock clock;

    /**
     * Khách sạn nổi bật cho Trang chủ: ACTIVE, có ít nhất một loại phòng, sắp theo điểm đánh giá giảm dần
     * (rồi số đánh giá, rồi id), tối đa {@code limit}. "Giá từ" là giá một đêm thấp nhất.
     */
    @Transactional(readOnly = true)
    public List<HotelCardResponse> featured(int limit) {
        List<Hotel> hotels = hotelRepository.findVisibleWithRooms(CatalogStatus.ACTIVE, Limit.of(limit));
        if (hotels.isEmpty()) {
            return List.of();
        }

        Map<Long, Long> minPriceByHotel = roomTypeRepository
                .findMinPriceByHotelIds(hotels.stream().map(Hotel::getId).toList()).stream()
                .collect(Collectors.toMap(HotelRoomTypeRepository.MinPrice::getHotelId,
                        HotelRoomTypeRepository.MinPrice::getMinPricePerNight));

        // Mọi khách sạn đã qua EXISTS nên chắc chắn có giá từ.
        return hotels.stream()
                .map(hotel -> hotelMapper.toCard(hotel, minPriceByHotel.get(hotel.getId())))
                .toList();
    }

    /**
     * Trang /hotels: khách sạn ACTIVE của một điểm đến còn phòng cho khoảng ngày, số khách, số phòng đã chọn (luật ở
     * {@link HotelStayCalculator}). Slug điểm đến không tồn tại cho kết quả rỗng (không bỏ qua bộ lọc, nếu không
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
                : roomTypeRepository.findByHotelIdIn(hotels.stream().map(Hotel::getId).toList()).stream()
                        .collect(Collectors.groupingBy(HotelRoomType::getHotelId));

        List<HotelSearchResultResponse> items = HotelStayCalculator
                .search(hotels, roomTypesByHotel, new HotelStayCalculator.Criteria(checkIn, checkOut, guests, rooms))
                .stream()
                .map(entry -> hotelMapper.toSearchResult(hotelMapper.toCard(entry.hotel(), entry.minPricePerNight()),
                        hotelMapper.toRoomType(entry.room()), entry.nights(), entry.rooms(), entry.totalPrice()))
                .toList();

        return new HotelSearchResponse(destination.get().getName(), items);
    }

    /**
     * Chi tiết một khách sạn theo slug. Không có, đang HIDDEN hoặc chưa có loại phòng nào (không có "giá từ" nên không
     * đặt được): 404, không phân biệt để không lộ khách sạn đang ẩn.
     */
    @Transactional(readOnly = true)
    public HotelDetailResponse detail(String slug) {
        Hotel hotel = hotelRepository.findBySlugAndStatus(slug, CatalogStatus.ACTIVE)
                .orElseThrow(HotelService::notFound);

        List<HotelRoomType> roomTypes = HotelStayCalculator.sortRoomTypes(roomTypeRepository.findByHotelId(hotel.getId()));
        long minPricePerNight = HotelStayCalculator.minPricePerNight(roomTypes).orElseThrow(HotelService::notFound);

        return hotelMapper.toDetail(hotelMapper.toCard(hotel, minPricePerNight), hotel.getDescription(),
                hotel.getAmenities(), hotel.getCheckInTime(), hotel.getCheckOutTime(),
                hotelMapper.toRoomTypes(roomTypes));
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy khách sạn này.");
    }
}
