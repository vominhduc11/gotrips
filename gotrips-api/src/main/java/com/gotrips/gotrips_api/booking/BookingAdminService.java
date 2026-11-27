package com.gotrips.gotrips_api.booking;

import java.time.Clock;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

import org.springframework.context.ApplicationEventPublisher;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.user.RoleName;
import com.gotrips.gotrips_api.user.UserRepository;
import com.gotrips.gotrips_api.tour.TourDepartureRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/** Thao tác của nhân viên trên một đơn bất kỳ (đánh dấu đã thanh toán, xác nhận, huỷ). */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingAdminService {

    private final BookingRepository bookingRepository;
    private final TourBookingDetailRepository tourDetailRepository;
    private final TourDepartureRepository departureRepository;
    private final BookingAssembler assembler;
    private final Clock clock;
    private final AdminBookingPageQuery pageQuery;
    private final BookingMapper mapper;
    private final UserRepository users;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public AdminBookingPageResponse list(AdminBookingFilters filters) {
        var page = pageQuery.search(filters);
        if (page.ids().isEmpty()) {
            return new AdminBookingPageResponse(List.of(), page.page(), page.size(), page.totalItems(), page.totalPages());
        }
        var byId = bookingRepository.findAllDetailedByIdIn(page.ids()).stream()
                .collect(Collectors.toMap(Booking::getId, Function.identity()));
        // IN không giữ thứ tự. Dùng thứ tự từ truy vấn phân trang để ghép đúng đơn với đúng tổng quan.
        var ordered = page.ids().stream().map(byId::get).toList();
        var summaries = assembler.summaries(ordered);
        var items = IntStream.range(0, ordered.size()).mapToObj(index -> {
            Booking booking = ordered.get(index);
            return mapper.toAdminSummary(summaries.get(index), booking.getUserId(), mapper.toContact(booking),
                    BookingTransitions.availableActions(booking.state()));
        }).toList();
        return new AdminBookingPageResponse(items, page.page(), page.size(), page.totalItems(), page.totalPages());
    }

    @Transactional(readOnly = true)
    public AdminBookingDetailResponse get(String code) {
        requireValidCode(code);
        return bookingRepository.findDetailedByCode(code).map(this::detail).orElseThrow(BookingQueryService::notFound);
    }

    private AdminBookingDetailResponse detail(Booking booking) {
        var customer = users.findWithRolesById(booking.getUserId()).orElseThrow();
        return mapper.toAdminDetail(assembler.detail(booking), mapper.toAdminCustomer(customer, customer.hasRole(RoleName.CUSTOMER)),
                BookingTransitions.availableActions(booking.state()));
    }

    private static void requireValidCode(String code) {
        if (!BookingCodeGenerator.isValid(code)) {
            throw BookingQueryService.notFound();
        }
    }

    /**
     * Không có đơn: 404. Trạng thái không cho phép: 409. Huỷ đơn tour trả lại số chỗ của chuyến; phòng và ghế của đơn
     * khách sạn/vé được đếm động từ các đơn chưa huỷ nên tự được trả.
     */
    @Transactional
    public AdminBookingDetailResponse apply(String code, BookingTransitions.Action action) {
        requireValidCode(code);
        // Khoá dòng đơn: hai lệnh đồng thời xếp hàng, lệnh sau thấy trạng thái mới (không trả chỗ hai lần).
        Booking booking = bookingRepository.lockByCode(code).orElseThrow(BookingQueryService::notFound);
        booking.apply(action, clock.instant());
        if (action == BookingTransitions.Action.CANCEL) {
            if (booking.getKind() == BookingKind.TOUR) {
                releaseTourSeats(booking);
            }
            events.publishEvent(new WebCatalogChanged(List.of("tours", "departures", "hotels", "flights")));
        }
        return detail(booking);
    }

    private void releaseTourSeats(Booking booking) {
        TourBookingDetail detail = tourDetailRepository.findById(booking.getId()).orElseThrow(
                () -> new IllegalStateException("Đơn tour " + booking.getCode() + " thiếu chi tiết."));
        if (departureRepository.releaseSeats(detail.getDepartureId(), detail.getGuests()) == 0) {
            // Chỉ xảy ra khi số chỗ đã đặt bị sửa tay: vẫn huỷ đơn, ghi log để kiểm tra (mã đơn không phải PII).
            log.warn("Không trả được chỗ khi huỷ đơn {}: booked_seats của chuyến {} nhỏ hơn số khách.",
                    booking.getCode(), detail.getDepartureId());
        }
    }
}
