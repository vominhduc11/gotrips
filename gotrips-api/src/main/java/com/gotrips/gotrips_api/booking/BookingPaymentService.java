package com.gotrips.gotrips_api.booking;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.tour.TourDeparture;
import com.gotrips.gotrips_api.tour.TourDepartureRepository;

import lombok.RequiredArgsConstructor;

/**
 * Nhận tiền chuyển khoản vào một đơn (gói {@code payment} gọi khi SePay báo tiền vào, hoặc khi nhân viên gắn giao dịch
 * vào đơn). Chạy trong transaction của người gọi để giao dịch ngân hàng và đơn được ghi cùng lúc.
 *
 * <p>Đủ tiền thì khoản thành PAID và đơn tự chuyển sang CONFIRMED, trừ khi dịch vụ đã bắt đầu (ngày khởi hành, nhận
 * phòng hoặc bay không còn sau hôm nay): khi đó đơn giữ PENDING để nhân viên quyết định xác nhận hay huỷ và hoàn tiền,
 * vì xác nhận một chuyến đã đi là sai.
 */
@Service
@RequiredArgsConstructor
public class BookingPaymentService {

    private final BookingRepository bookingRepository;
    private final TourBookingDetailRepository tourDetailRepository;
    private final TourDepartureRepository departureRepository;
    private final HotelBookingDetailRepository hotelDetailRepository;
    private final FlightBookingDetailRepository flightDetailRepository;
    private final Clock clock;

    /**
     * Kết quả nhận tiền.
     *
     * @param booking đơn đã được khoá và cập nhật (cùng persistence context với người gọi)
     * @param payable đơn còn nhận tiền không; {@code false} = đã huỷ hoặc đã thu đủ trước đó
     * @param appliedAmount phần tiền được tính vào đơn
     * @param paid khoản vừa đủ tiền và được đánh dấu PAID
     * @param confirmed đơn vừa được tự xác nhận
     */
    public record Receipt(Booking booking, boolean payable, long appliedAmount, boolean paid, boolean confirmed) {
    }

    /** Mã đầu tiên (theo thứ tự ứng viên) là đơn có thật; mã sai định dạng bị bỏ qua. */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<String> firstExistingCode(List<String> candidates) {
        List<String> valid = candidates.stream().filter(BookingCodeGenerator::isValid).distinct().toList();
        if (valid.isEmpty()) {
            return Optional.empty();
        }
        Collection<String> existing = bookingRepository.findExistingCodes(valid);
        return valid.stream().filter(existing::contains).findFirst();
    }

    /**
     * Khoá dòng đơn (như thao tác của nhân viên) rồi cộng tiền: hai khoản chuyển cùng lúc cho một đơn xếp hàng, khoản
     * sau thấy số đã nhận mới nên không tính thừa. Không có đơn với mã này thì trả rỗng.
     */
    @Transactional(propagation = Propagation.MANDATORY)
    public Optional<Receipt> receiveBankTransfer(String code, long amount) {
        if (!BookingCodeGenerator.isValid(code)) {
            return Optional.empty();
        }
        return bookingRepository.lockByCode(code).map(booking -> receive(booking, amount));
    }

    private Receipt receive(Booking booking, long amount) {
        BankTransferAllocation.Result result = booking.receiveBankTransfer(amount);
        boolean confirmed = false;
        if (result.completesPayment()) {
            var now = clock.instant();
            booking.apply(BookingTransitions.Action.MARK_PAID, now);
            if (serviceStartDate(booking).isAfter(LocalDate.now(clock))) {
                booking.apply(BookingTransitions.Action.CONFIRM, now);
                confirmed = true;
            }
        }
        return new Receipt(booking, result.payable(), result.appliedAmount(), result.completesPayment(), confirmed);
    }

    /** Ngày dịch vụ bắt đầu: ngày khởi hành tour, ngày nhận phòng, ngày bay chiều đi. */
    private LocalDate serviceStartDate(Booking booking) {
        Long id = booking.getId();
        return switch (booking.getKind()) {
            case TOUR -> {
                TourBookingDetail detail = tourDetailRepository.findById(id).orElseThrow(() -> missingDetail(booking));
                yield departureRepository.findById(detail.getDepartureId()).map(TourDeparture::getDepartureDate)
                        .orElseThrow(() -> missingDetail(booking));
            }
            case HOTEL -> hotelDetailRepository.findById(id).map(HotelBookingDetail::getCheckIn)
                    .orElseThrow(() -> missingDetail(booking));
            case FLIGHT -> flightDetailRepository.findWithSegmentsByBookingIdIn(List.of(id)).stream()
                    .flatMap(detail -> detail.getSegments().stream())
                    .map(FlightBookingSegment::getFlightDate)
                    .min(LocalDate::compareTo)
                    .orElseThrow(() -> missingDetail(booking));
        };
    }

    private static IllegalStateException missingDetail(Booking booking) {
        return new IllegalStateException("Đơn " + booking.getCode() + " thiếu chi tiết dịch vụ.");
    }
}
