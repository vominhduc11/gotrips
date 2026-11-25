package com.gotrips.gotrips_api.hotel;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class HotelService {

    private final HotelRepository hotelRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final HotelMapper hotelMapper;

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
}
