package com.gotrips.gotrips_api.tour;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/**
 * Chuyến khởi hành ở trang quản trị.
 *
 * <p>Thứ tự khoá cho mọi lệnh ghi: dòng TOUR rồi dòng CHUYẾN, cùng thứ tự với luồng đặt chỗ, và chỉ kiểm đơn SAU khi
 * đã giữ khoá. Khoá tour còn xếp hàng hai lệnh đổi ngày trên cùng một tour. Số chỗ đã đặt chỉ do luồng đặt và huỷ ghi.
 */
@Service
@RequiredArgsConstructor
public class AdminDepartureService {

    static final String DATE_CONSTRAINT = "uq_tour_departures_tour_date";
    private static final String BOOKING_CONSTRAINT = "fk_tour_bookings_departure";
    private static final String DATE_NOT_FUTURE = "Ngày khởi hành phải sau hôm nay.";
    private static final String DATE_INVALID = "Ngày phải theo định dạng YYYY-MM-DD.";
    private static final String DATE_TAKEN = "Tour này đã có chuyến khởi hành vào ngày đó.";
    private static final String DATE_LOCKED = "Chuyến đã có khách đặt nên không đổi được ngày khởi hành.";
    private static final String ORIGINAL_NOT_HIGHER = "Giá gốc phải lớn hơn giá bán (hoặc để trống).";
    private static final String PAST = "Chuyến khởi hành hôm nay hoặc đã qua nên không thay đổi được.";
    private static final String NOT_DELETABLE =
            "Chuyến đã có khách đặt nên không xoá được. Dùng \"Đóng bán\" để ngừng nhận khách.";

    private final TourRepository tourRepository;
    private final TourDepartureRepository repository;
    private final AdminDepartureMapper mapper;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    /** Mọi chuyến của tour, kể cả đã qua. Tour đã xoá vẫn xem được. */
    @Transactional(readOnly = true)
    public List<AdminDepartureResponse> list(long tourId) {
        Tour tour = tourRepository.findById(tourId).orElseThrow(AdminTourService::notFound);
        List<TourDeparture> departures = repository.findByTourIdOrderByDepartureDateAscIdAsc(tourId);
        Set<Long> booked = departures.isEmpty() ? Set.of()
                : repository.findIdsWithBookings(departures.stream().map(TourDeparture::getId).toList());
        LocalDate today = LocalDate.now(clock);
        return departures.stream()
                .map(d -> response(d, booked.contains(d.getId()), tour.isDeleted(), today))
                .toList();
    }

    @Transactional
    public AdminDepartureResponse create(long tourId, AdminDepartureRequest request) {
        lockEditableTour(tourId);
        LocalDate today = LocalDate.now(clock);
        validate(request, today);
        if (repository.existsByTourIdAndDepartureDate(tourId, request.departureDate())) {
            throw dateTaken();
        }
        TourDeparture departure = TourDeparture.create(tourId, request.departureDate(), request.price(),
                request.originalPrice(), request.totalSeats());
        try {
            repository.saveAndFlush(departure);
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        publishChange();
        return response(departure, false, false, today);
    }

    @Transactional
    public AdminDepartureResponse update(long id, AdminDepartureRequest request) {
        TourDeparture departure = lock(id);
        LocalDate today = LocalDate.now(clock);
        requireUpcoming(departure, today);
        validate(request, today);
        boolean hasBookings = hasBookings(id);
        if (!departure.getDepartureDate().equals(request.departureDate())) {
            if (AdminDepartureRules.everBooked(departure, hasBookings)) {
                throw new ConflictException("departureDate", DATE_LOCKED);
            }
            if (repository.existsByTourIdAndDepartureDateAndIdNot(departure.getTourId(), request.departureDate(), id)) {
                throw dateTaken();
            }
        }

        int updated;
        try {
            updated = repository.updateSchedule(id, request.departureDate(), request.price(), request.originalPrice(),
                    request.totalSeats());
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        if (updated == 0) {
            throw new ConflictException("totalSeats", "Tổng chỗ không được thấp hơn số chỗ đã đặt ("
                    + repository.findBookedSeats(id).orElse(0) + ").");
        }
        publishChange();
        // Câu UPDATE đi thẳng xuống DB và đã xoá persistence context, nên đọc lại bản mới.
        TourDeparture saved = repository.findById(id).orElseThrow(AdminDepartureService::notFound);
        return response(saved, hasBookings, false, today);
    }

    @Transactional
    public void delete(long id) {
        TourDeparture departure = lock(id);
        if (AdminDepartureRules.everBooked(departure, hasBookings(id))) {
            throw new ConflictException(NOT_DELETABLE);
        }
        try {
            repository.delete(departure);
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        publishChange();
    }

    @Transactional
    public AdminDepartureResponse close(long id) {
        TourDeparture departure = lock(id);
        LocalDate today = LocalDate.now(clock);
        requireUpcoming(departure, today);
        if (departure.isSalesClosed()) {
            throw new ConflictException("Chuyến này đã đóng bán.");
        }
        departure.closeSales();
        publishChange();
        return response(departure, hasBookings(id), false, today);
    }

    @Transactional
    public AdminDepartureResponse reopen(long id) {
        TourDeparture departure = lock(id);
        LocalDate today = LocalDate.now(clock);
        requireUpcoming(departure, today);
        if (!departure.isSalesClosed()) {
            throw new ConflictException("Chuyến này đang mở bán.");
        }
        departure.reopenSales();
        publishChange();
        return response(departure, hasBookings(id), false, today);
    }

    /** Khoá tour và chặn mọi thay đổi trên chuyến của tour đã xoá. */
    private void lockEditableTour(long tourId) {
        tourRepository.lockById(tourId).orElseThrow(AdminTourService::notFound).requireNotDeleted();
    }

    /** Khoá tour rồi khoá và nạp chuyến (đúng thứ tự khoá, xem mô tả lớp). */
    private TourDeparture lock(long id) {
        long tourId = repository.findTourId(id).orElseThrow(AdminDepartureService::notFound);
        lockEditableTour(tourId);
        return repository.lockById(id).orElseThrow(AdminDepartureService::notFound);
    }

    private boolean hasBookings(long id) {
        return !repository.findIdsWithBookings(List.of(id)).isEmpty();
    }

    private AdminDepartureResponse response(TourDeparture departure, boolean hasBookings, boolean tourDeleted,
            LocalDate today) {
        return mapper.toResponse(departure, AdminDepartureRules.view(departure, hasBookings, tourDeleted, today));
    }

    private static void requireUpcoming(TourDeparture departure, LocalDate today) {
        if (!AdminDepartureRules.isUpcoming(departure, today)) {
            throw new ConflictException(PAST);
        }
    }

    private static void validate(AdminDepartureRequest request, LocalDate today) {
        // Năm ngoài khoảng này không phải ngày hợp lệ của form và có thể vượt giới hạn cột date.
        if (request.departureDate().getYear() > 9999) {
            throw new InvalidRequestException("departureDate", DATE_INVALID);
        }
        if (!request.departureDate().isAfter(today)) {
            throw new InvalidRequestException("departureDate", DATE_NOT_FUTURE);
        }
        if (request.originalPrice() != null && request.originalPrice() <= request.price()) {
            throw new InvalidRequestException("originalPrice", ORIGINAL_NOT_HIGHER);
        }
    }

    private void publishChange() {
        events.publishEvent(WebCatalogChanged.tourCatalog());
    }

    /** Ràng buộc của DB là chốt chặn khi hai request đồng thời cùng qua bước kiểm trước. */
    private static RuntimeException translate(DataIntegrityViolationException ex) {
        if (ConstraintViolations.violates(ex, DATE_CONSTRAINT)) {
            return dateTaken();
        }
        if (ConstraintViolations.violates(ex, BOOKING_CONSTRAINT)) {
            return new ConflictException(NOT_DELETABLE);
        }
        return ex;
    }

    private static ConflictException dateTaken() {
        return new ConflictException("departureDate", DATE_TAKEN);
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy chuyến khởi hành này.");
    }
}
