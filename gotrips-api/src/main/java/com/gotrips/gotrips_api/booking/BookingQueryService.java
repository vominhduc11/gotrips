package com.gotrips.gotrips_api.booking;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/** Đơn của người đang đăng nhập. */
@Service
@RequiredArgsConstructor
public class BookingQueryService {

    private final BookingRepository bookingRepository;
    private final BookingAssembler assembler;
    private final BookingAccounts accounts;
    private final BookingMapper mapper;

    @Transactional(readOnly = true)
    public List<BookingSummaryResponse> listMine(UUID userId) {
        accounts.requireExisting(userId);
        return assembler.summaries(bookingRepository.findAllByUser(userId));
    }

    /** Mã sai định dạng, không có hoặc là đơn của người khác: 404 như nhau (không lộ đơn nào tồn tại). */
    @Transactional(readOnly = true)
    public BookingDetailResponse getMine(UUID userId, String code) {
        accounts.requireExisting(userId);
        if (!BookingCodeGenerator.isValid(code)) {
            throw notFound();
        }
        return bookingRepository.findByCodeAndUser(code, userId)
                .map(assembler::detail)
                .orElseThrow(BookingQueryService::notFound);
    }

    /** Cùng luật 404 với {@link #getMine}; chỉ đọc đơn và khoản thanh toán (được gọi vài giây một lần). */
    @Transactional(readOnly = true)
    public BookingPaymentStatusResponse getMyPaymentStatus(UUID userId, String code) {
        accounts.requireExisting(userId);
        if (!BookingCodeGenerator.isValid(code)) {
            throw notFound();
        }
        return bookingRepository.findWithPaymentByCodeAndUser(code, userId)
                .map(mapper::toPaymentStatus)
                .orElseThrow(BookingQueryService::notFound);
    }

    static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy đơn đặt chỗ.");
    }
}
