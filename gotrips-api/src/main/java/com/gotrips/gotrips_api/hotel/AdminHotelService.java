package com.gotrips.gotrips_api.hotel;

import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.catalog.CatalogVisibility;
import com.gotrips.gotrips_api.common.catalog.ImageResponse;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.destination.Destination;
import com.gotrips.gotrips_api.destination.DestinationRepository;

import lombok.RequiredArgsConstructor;

/**
 * Khách sạn ở trang quản trị. Mọi lệnh ghi khoá dòng khách sạn trước khi đọc trạng thái (xem {@link Hotel}) và phát
 * {@link WebCatalogChanged} để website làm mới cache sau commit.
 */
@Service
@RequiredArgsConstructor
public class AdminHotelService {

    private static final String SLUG_CONSTRAINT = "uq_hotels_slug";
    private static final String DESTINATION_CONSTRAINT = "fk_hotels_destination";
    private static final String SLUG_TAKEN = "Slug này đã được dùng cho khách sạn khác (kể cả khách sạn đã xoá).";
    private static final String DESTINATION_MISSING = "Điểm đến này không còn tồn tại. Vui lòng chọn điểm đến khác.";

    private final HotelRepository hotelRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final HotelImageRepository imageRepository;
    private final HotelAmenityRepository hotelAmenityRepository;
    private final AmenityRepository amenityRepository;
    private final DestinationRepository destinationRepository;
    private final AdminHotelPageQuery pageQuery;
    private final AdminHotelMapper mapper;
    private final HotelMapper hotelMapper;
    private final AmenityResolver amenityResolver;
    private final HotelCatalogWriter writer;
    private final CatalogImageUrls imageUrls;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public AdminHotelPageResponse list(AdminHotelFilters filters) {
        AdminHotelPageQuery.Result page = pageQuery.search(filters);
        if (page.ids().isEmpty()) {
            return new AdminHotelPageResponse(List.of(), page.page(), page.size(), page.totalItems(), page.totalPages());
        }
        Map<Long, Hotel> hotels = hotelRepository.findAllWithDestinationByIdIn(page.ids()).stream()
                .collect(Collectors.toMap(Hotel::getId, Function.identity()));
        Map<Long, RoomSummary> rooms = roomSummaries(page.ids());
        // IN không giữ thứ tự: ghép lại theo thứ tự của truy vấn phân trang.
        List<AdminHotelSummaryResponse> items = page.ids().stream().map(id -> {
            Hotel hotel = hotels.get(id);
            RoomSummary summary = rooms.getOrDefault(id, RoomSummary.NONE);
            return mapper.toSummary(hotel, summary.count(), summary.sellingCount(), summary.minPricePerNight(),
                    AdminHotelRules.visibleOnWebsite(hotel.getStatus(), summary.sellingCount()));
        }).toList();
        return new AdminHotelPageResponse(items, page.page(), page.size(), page.totalItems(), page.totalPages());
    }

    @Transactional(readOnly = true)
    public AdminHotelDetailResponse get(long id) {
        return detail(hotelRepository.findById(id).orElseThrow(AdminHotelService::notFound));
    }

    @Transactional(readOnly = true)
    public List<AdminAmenityResponse> listAmenities() {
        return amenityRepository.findAllByOrderBySortOrderAscIdAsc().stream().map(mapper::toAmenity).toList();
    }

    @Transactional
    public AdminHotelDetailResponse create(AdminCreateHotelRequest request) {
        validate(request);
        List<Amenity> amenities = amenityResolver.resolve(request.amenityCodes(), AmenityScope.HOTEL);
        Destination destination = destination(request.destinationId());
        if (hotelRepository.existsBySlug(request.slug())) {
            throw slugTaken();
        }
        CatalogVisibility visibility = request.status() == null ? CatalogVisibility.ACTIVE : request.status();
        Hotel hotel = Hotel.create(content(request, destination), visibility);
        try {
            hotelRepository.saveAndFlush(hotel);
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        replaceChildren(hotel.getId(), amenities, request);
        return changed(hotel);
    }

    @Transactional
    public AdminHotelDetailResponse update(long id, AdminUpdateHotelRequest request) {
        Hotel hotel = lock(id);
        hotel.requireNotDeleted();
        validate(request);
        List<Amenity> amenities = amenityResolver.resolve(request.amenityCodes(), AmenityScope.HOTEL);
        Destination destination = destination(request.destinationId());
        if (hotelRepository.existsBySlugAndIdNot(request.slug(), id)) {
            throw slugTaken();
        }
        hotel.update(content(request, destination));
        // Ghi khách sạn ngay: lỗi trùng slug lộ ra ở đây và gắn được vào ô, trước khi đụng tới các bảng con.
        try {
            hotelRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        replaceChildren(id, amenities, request);
        return changed(hotel);
    }

    @Transactional
    public AdminHotelDetailResponse changeVisibility(long id, CatalogVisibility visibility) {
        Hotel hotel = lock(id);
        hotel.changeVisibility(visibility);
        return changed(hotel);
    }

    @Transactional
    public void delete(long id) {
        lock(id).softDelete();
        events.publishEvent(WebCatalogChanged.hotelCatalog());
    }

    @Transactional
    public AdminHotelDetailResponse restore(long id) {
        Hotel hotel = lock(id);
        hotel.restore();
        return changed(hotel);
    }

    private Hotel lock(long id) {
        return hotelRepository.lockById(id).orElseThrow(AdminHotelService::notFound);
    }

    private AdminHotelDetailResponse changed(Hotel hotel) {
        events.publishEvent(WebCatalogChanged.hotelCatalog());
        return detail(hotel);
    }

    private AdminHotelDetailResponse detail(Hotel hotel) {
        RoomSummary rooms = roomSummaries(List.of(hotel.getId())).getOrDefault(hotel.getId(), RoomSummary.NONE);
        List<AmenityResponse> amenities = hotelAmenityRepository.findWithAmenityByHotelId(hotel.getId()).stream()
                .map(link -> hotelMapper.toAmenity(link.getAmenity()))
                .toList();
        List<ImageResponse> images = imageRepository.findByHotelIdOrderBySortOrder(hotel.getId()).stream()
                .map(hotelMapper::toHotelImage)
                .toList();
        return mapper.toDetail(hotel, amenities, images, rooms.count(), rooms.sellingCount(), rooms.minPricePerNight(),
                AdminHotelRules.visibleOnWebsite(hotel.getStatus(), rooms.sellingCount()));
    }

    /** Một query cho cả danh sách khách sạn; khách sạn chưa có loại phòng không xuất hiện trong kết quả. */
    private Map<Long, RoomSummary> roomSummaries(List<Long> hotelIds) {
        return roomTypeRepository.findRoomStatsByHotelIds(hotelIds).stream()
                .collect(Collectors.toMap(HotelRoomTypeRepository.RoomStats::getHotelId,
                        stats -> new RoomSummary(stats.getRoomTypeCount(), stats.getSellingRoomTypeCount(),
                                stats.getMinPricePerNight())));
    }

    private record RoomSummary(long count, long sellingCount, Long minPricePerNight) {
        static final RoomSummary NONE = new RoomSummary(0, 0, null);
    }

    private void validate(AdminHotelFields fields) {
        if (AdminHotelRules.RESERVED_SLUGS.contains(fields.slug())) {
            throw new InvalidRequestException("slug", AdminHotelRules.SLUG_RESERVED);
        }
        imageUrls.require("imageUrl", fields.imageUrl());
        AdminHotelRules.requireValidGallery(imageUrls, fields.images(), fields.imageUrl());
    }

    private Destination destination(long id) {
        return destinationRepository.findById(id)
                .orElseThrow(() -> new InvalidRequestException("destinationId", DESTINATION_MISSING));
    }

    private void replaceChildren(long hotelId, List<Amenity> amenities, AdminHotelFields fields) {
        writer.replaceHotelAmenities(hotelId, amenities);
        writer.replaceHotelImages(hotelId, fields.images());
    }

    private static Hotel.Content content(AdminHotelFields fields, Destination destination) {
        return new Hotel.Content(fields.slug(), fields.name(), destination, fields.starRating(), fields.area(),
                fields.imageUrl(), fields.imageAlt(), fields.description(), LocalTime.parse(fields.checkInTime()),
                LocalTime.parse(fields.checkOutTime()));
    }

    /** Hai request đồng thời cùng qua bước kiểm trước thì ràng buộc DB chặn: đổi thành lỗi đúng ô. */
    private static RuntimeException translate(DataIntegrityViolationException ex) {
        if (ConstraintViolations.violates(ex, SLUG_CONSTRAINT)) {
            return slugTaken();
        }
        if (ConstraintViolations.violates(ex, DESTINATION_CONSTRAINT)) {
            return new InvalidRequestException("destinationId", DESTINATION_MISSING);
        }
        return ex;
    }

    private static ConflictException slugTaken() {
        return new ConflictException("slug", SLUG_TAKEN);
    }

    static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy khách sạn này.");
    }
}
