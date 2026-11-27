package com.gotrips.gotrips_api.hotel;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.catalog.ImageResponse;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * Loại phòng ở trang quản trị. Mọi lệnh ghi khoá THEO THỨ TỰ khách sạn rồi mới tới loại phòng, cùng thứ tự với đặt
 * phòng ({@code HotelBookingService}) nên không deadlock và không chen ngang nhau: đặt phòng giữ khoá chia sẻ khách sạn,
 * còn lệnh ở đây giữ khoá ghi. Nhờ vậy số phòng đang được giữ đọc sau khi có khoá luôn gồm mọi đơn đã tạo.
 */
@Service
@RequiredArgsConstructor
public class AdminRoomTypeService {

    private static final String BOOKING_CONSTRAINT = "fk_hotel_bookings_room_type";
    private static final String HAS_BOOKINGS = "Không xoá được loại phòng này vì đã có đơn đặt (kể cả đơn đã huỷ). "
            + "Muốn ngừng bán, hãy giảm tổng số phòng xuống mức tối thiểu (0 khi không còn đơn nào giữ phòng).";

    private final HotelRepository hotelRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final HotelRoomTypeImageRepository imageRepository;
    private final HotelRoomTypeAmenityRepository roomTypeAmenityRepository;
    private final AdminHotelMapper mapper;
    private final HotelMapper hotelMapper;
    private final AmenityResolver amenityResolver;
    private final HotelCatalogWriter writer;
    private final CatalogImageUrls imageUrls;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Transactional(readOnly = true)
    public List<AdminRoomTypeResponse> list(long hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId).orElseThrow(AdminHotelService::notFound);
        return responses(hotel, HotelStayCalculator.sortRoomTypes(roomTypeRepository.findByHotelId(hotelId)));
    }

    @Transactional
    public AdminRoomTypeResponse create(long hotelId, AdminRoomTypeRequest request) {
        Hotel hotel = lockWritableHotel(hotelId);
        List<Amenity> amenities = validate(request);
        HotelRoomType roomType = roomTypeRepository.saveAndFlush(HotelRoomType.create(hotelId, content(request)));
        replaceChildren(roomType.getId(), amenities, request);
        return changed(hotel, roomType);
    }

    @Transactional
    public AdminRoomTypeResponse update(long roomTypeId, AdminRoomTypeRequest request) {
        Locked locked = lockRoomType(roomTypeId);
        HotelRoomType roomType = locked.roomType();
        List<Amenity> amenities = validate(request);
        requireEnoughRooms(roomType, request.totalRooms());
        roomType.update(content(request));
        roomTypeRepository.flush();
        replaceChildren(roomTypeId, amenities, request);
        return changed(locked.hotel(), roomType);
    }

    @Transactional
    public void delete(long roomTypeId) {
        Locked locked = lockRoomType(roomTypeId);
        if (!roomTypeRepository.findEverBookedIds(List.of(roomTypeId)).isEmpty()) {
            throw new ConflictException(HAS_BOOKINGS);
        }
        try {
            // Ảnh và dòng nối tiện ích đi theo nhờ ON DELETE CASCADE. Flush ngay để khoá ngoại của đơn (chốt chặn cuối)
            // thành 409 chứ không lỗi lúc commit.
            roomTypeRepository.delete(locked.roomType());
            roomTypeRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            if (ConstraintViolations.violates(ex, BOOKING_CONSTRAINT)) {
                throw new ConflictException(HAS_BOOKINGS);
            }
            throw ex;
        }
        events.publishEvent(WebCatalogChanged.hotelCatalog());
    }

    private record Locked(Hotel hotel, HotelRoomType roomType) {
    }

    private Locked lockRoomType(long roomTypeId) {
        // Chỉ đọc id khách sạn (vô hướng) để khoá được khách sạn trước; loại phòng chỉ được nạp bằng câu khoá.
        long hotelId = roomTypeRepository.findHotelId(roomTypeId).orElseThrow(AdminRoomTypeService::notFound);
        Hotel hotel = lockWritableHotel(hotelId);
        HotelRoomType roomType = roomTypeRepository.lockById(roomTypeId).orElseThrow(AdminRoomTypeService::notFound);
        return new Locked(hotel, roomType);
    }

    private Hotel lockWritableHotel(long hotelId) {
        Hotel hotel = hotelRepository.lockById(hotelId).orElseThrow(AdminHotelService::notFound);
        hotel.requireNotDeleted();
        return hotel;
    }

    /** Chỉ kiểm khi GIẢM: tăng số phòng luôn được, kể cả khi dữ liệu cũ đã giữ nhiều hơn tổng số phòng. */
    private void requireEnoughRooms(HotelRoomType roomType, int totalRooms) {
        if (totalRooms >= roomType.getTotalRooms()) {
            return;
        }
        int minimum = peakRoomsHeld(List.of(roomType.getId())).getOrDefault(roomType.getId(), 0);
        if (totalRooms < minimum) {
            throw new ConflictException("totalRooms", "Không giảm được: có đêm đang giữ " + minimum
                    + " phòng. Tổng số phòng tối thiểu là " + minimum + ".");
        }
    }

    /** Số phòng bị giữ cao nhất trong một đêm kể từ hôm nay, theo id loại phòng. Một query cho cả danh sách. */
    private Map<Long, Integer> peakRoomsHeld(List<Long> roomTypeIds) {
        LocalDate today = LocalDate.now(clock);
        Map<Long, List<HotelStayCalculator.Stay>> stays = roomTypeRepository.findHeldStays(roomTypeIds, today).stream()
                .collect(Collectors.groupingBy(HotelRoomTypeRepository.HeldStay::getRoomTypeId, Collectors.mapping(
                        held -> new HotelStayCalculator.Stay(held.getCheckIn(), held.getCheckOut(), held.getRooms()),
                        Collectors.toList())));
        return stays.entrySet().stream().collect(Collectors.toMap(Map.Entry::getKey,
                entry -> HotelStayCalculator.peakRoomsHeld(entry.getValue(), today)));
    }

    /** Gắn ảnh, tiện ích, mức tối thiểu và cờ xoá được; số query cố định, không phụ thuộc số loại phòng. */
    private List<AdminRoomTypeResponse> responses(Hotel hotel, List<HotelRoomType> roomTypes) {
        if (roomTypes.isEmpty()) {
            return List.of();
        }
        List<Long> ids = roomTypes.stream().map(HotelRoomType::getId).toList();
        Map<Long, List<ImageResponse>> images = imageRepository.findByRoomTypeIdInOrderBySortOrder(ids).stream()
                .collect(Collectors.groupingBy(HotelRoomTypeImage::getRoomTypeId,
                        Collectors.mapping(hotelMapper::toRoomImage, Collectors.toList())));
        Map<Long, List<AmenityResponse>> amenities = roomTypeAmenityRepository.findWithAmenityByRoomTypeIdIn(ids)
                .stream()
                .collect(Collectors.groupingBy(HotelRoomTypeAmenity::getRoomTypeId,
                        Collectors.mapping(link -> hotelMapper.toAmenity(link.getAmenity()), Collectors.toList())));
        Map<Long, Integer> minimums = peakRoomsHeld(ids);
        Set<Long> everBooked = Set.copyOf(roomTypeRepository.findEverBookedIds(ids));

        return roomTypes.stream()
                .map(roomType -> mapper.toRoomType(roomType,
                        amenities.getOrDefault(roomType.getId(), List.of()),
                        images.getOrDefault(roomType.getId(), List.of()),
                        minimums.getOrDefault(roomType.getId(), 0),
                        !hotel.isDeleted() && !everBooked.contains(roomType.getId())))
                .toList();
    }

    private AdminRoomTypeResponse changed(Hotel hotel, HotelRoomType roomType) {
        events.publishEvent(WebCatalogChanged.hotelCatalog());
        return responses(hotel, List.of(roomType)).get(0);
    }

    /** Kiểm URL ảnh và tiện ích; trả về các tiện ích đã tra trong danh mục. */
    private List<Amenity> validate(AdminRoomTypeRequest request) {
        AdminHotelRules.requireValidGallery(imageUrls, request.images(), null);
        return amenityResolver.resolve(request.amenityCodes(), AmenityScope.ROOM);
    }

    private void replaceChildren(long roomTypeId, List<Amenity> amenities, AdminRoomTypeRequest request) {
        writer.replaceRoomTypeAmenities(roomTypeId, amenities);
        writer.replaceRoomTypeImages(roomTypeId, request.images());
    }

    private static HotelRoomType.Content content(AdminRoomTypeRequest request) {
        return new HotelRoomType.Content(request.name(), request.pricePerNight(), request.maxGuests(),
                request.bedType(), request.areaM2(), request.totalRooms());
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy loại phòng này.");
    }
}
