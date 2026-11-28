package com.gotrips.gotrips_api.payment;

import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.booking.Booking;
import com.gotrips.gotrips_api.booking.BookingPaymentService;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.config.BankTransferProperties;
import com.gotrips.gotrips_api.user.User;
import com.gotrips.gotrips_api.user.UserRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * Ghi nhận giao dịch tiền vào và các thao tác của nhân viên trên giao dịch.
 *
 * <p>Thứ tự khoá: webhook chỉ chèn dòng giao dịch MỚI rồi khoá đơn; nhân viên khoá dòng giao dịch rồi mới khoá đơn
 * (qua {@link BookingPaymentService}). Không luồng nào khoá đơn trước rồi mới khoá một giao dịch đã có, nên không thể
 * deadlock với nhau hay với thao tác huỷ đơn (chỉ khoá đơn).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BankTransactionService {

    private final BankTransactionRepository repository;
    private final AdminBankTransactionPageQuery pageQuery;
    private final BookingPaymentService bookingPayments;
    private final BankTransferProperties bankTransfer;
    private final UserRepository users;
    private final BankTransactionMapper mapper;
    private final Clock clock;

    /**
     * Ghi một giao dịch tiền vào rồi tự gắn đơn theo mã trong nội dung. Giao dịch đã ghi (SePay gửi lại) thì không làm
     * gì. Tiền vào tài khoản khác tài khoản nhận đã cấu hình thì chỉ ghi lại, không tính vào đơn: thường là cấu hình sai
     * (số tài khoản ở GoTrips khác tài khoản liên kết SePay), nhân viên kiểm tra rồi gắn tay.
     */
    @Transactional
    public void record(SepayWebhookPayload payload, Instant transactionAt) {
        Instant now = clock.instant();
        int inserted = repository.insertIfAbsent(payload.id(), payload.gateway().strip(),
                payload.accountNumber().strip(), payload.transferAmount(), payload.content(),
                Objects.requireNonNullElse(payload.referenceCode(), "").strip(), transactionAt, now);
        if (inserted == 0) {
            log.info("Giao dịch SePay {} đã được ghi nhận trước đó, bỏ qua.", payload.id());
            return;
        }
        BankTransaction transaction = repository.findBySepayId(payload.id()).orElseThrow();
        if (!BankTransferProperties.normalizeAccountNumber(payload.accountNumber())
                .equals(bankTransfer.normalizedAccountNumber())) {
            transaction.markWrongAccount();
            log.warn("Giao dịch SePay {} vào tài khoản khác GOTRIPS_BANK_ACCOUNT_NUMBER, chờ nhân viên kiểm tra.",
                    payload.id());
            return;
        }
        Optional<String> code = bookingPayments.firstExistingCode(
                PaymentCodeExtractor.candidates(payload.code(), payload.content()));
        if (code.isEmpty()) {
            log.info("Giao dịch SePay {} không khớp đơn nào, chờ nhân viên xử lý.", payload.id());
            return;
        }
        attach(transaction, code.get(), null, now);
    }

    @Transactional(readOnly = true)
    public AdminBankTransactionPageResponse list(AdminBankTransactionFilters filters) {
        var page = pageQuery.search(filters);
        if (page.ids().isEmpty()) {
            return new AdminBankTransactionPageResponse(List.of(), page.page(), page.size(), page.totalItems(),
                    page.totalPages());
        }
        Map<Long, BankTransaction> byId = repository.findAllDetailedByIdIn(page.ids()).stream()
                .collect(Collectors.toMap(BankTransaction::getId, Function.identity()));
        // IN không giữ thứ tự: ghép lại theo thứ tự của truy vấn phân trang.
        List<BankTransaction> ordered = page.ids().stream().map(byId::get).toList();
        return new AdminBankTransactionPageResponse(responses(ordered), page.page(), page.size(), page.totalItems(),
                page.totalPages());
    }

    /**
     * Nhân viên gắn giao dịch chưa có đơn (khách ghi sai nội dung, tiền vào tài khoản khác) vào một đơn. Áp dụng đúng
     * luật như khi tự gắn: cộng dồn, đủ tiền thì tự xác nhận.
     */
    @Transactional
    public AdminBankTransactionResponse assign(long id, String bookingCode, UUID staffId) {
        BankTransaction transaction = lock(id);
        if (transaction.getBooking() != null) {
            throw new ConflictException("Giao dịch này đã được gắn vào đơn " + transaction.getBooking().getCode() + ".");
        }
        if (transaction.getResolvedAt() != null) {
            throw new ConflictException("Giao dịch này đã được đánh dấu xử lý, không gắn vào đơn được nữa.");
        }
        attach(transaction, bookingCode, staffId, clock.instant());
        return response(transaction);
    }

    /** Ghi lại cách nhân viên đã xử lý phần tiền lệch (đã hoàn tiền, không phải tiền của khách...). */
    @Transactional
    public AdminBankTransactionResponse resolve(long id, String note, UUID staffId) {
        BankTransaction transaction = lock(id);
        if (!BankTransactionRules.needsReview(reviewReason(transaction), transaction.getResolvedAt() != null)) {
            throw new ConflictException("Giao dịch này không cần xử lý hoặc đã được xử lý.");
        }
        transaction.resolve(staffId, note, clock.instant());
        return response(transaction);
    }

    private BankTransaction lock(long id) {
        return repository.lockById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch."));
    }

    private void attach(BankTransaction transaction, String bookingCode, UUID staffId, Instant now) {
        BookingPaymentService.Receipt receipt = bookingPayments.receiveBankTransfer(bookingCode,
                transaction.getAmount()).orElseThrow(() -> new InvalidRequestException("bookingCode",
                        "Không tìm thấy đơn " + bookingCode + "."));
        BankTransactionOutcome outcome = BankTransactionRules.outcome(receipt.payable(), receipt.appliedAmount(),
                transaction.getAmount());
        transaction.attachTo(receipt.booking(), receipt.appliedAmount(), outcome, staffId, now);
        // Mã đơn và id giao dịch không phải dữ liệu cá nhân.
        log.info("Giao dịch SePay {} gắn vào đơn {} ({}): {}{}.", transaction.getSepayId(), bookingCode,
                staffId == null ? "tự động" : "nhân viên", outcome,
                receipt.confirmed() ? ", đơn đủ tiền và đã tự xác nhận" : receipt.paid() ? ", đơn đủ tiền" : "");
    }

    private static BankTransactionReviewReason reviewReason(BankTransaction transaction) {
        Booking booking = transaction.getBooking();
        return BankTransactionRules.reviewReason(transaction.getOutcome(),
                booking == null ? null : booking.getStatus(),
                booking == null ? null : booking.getPayment().getStatus());
    }

    private AdminBankTransactionResponse response(BankTransaction transaction) {
        return responses(List.of(transaction)).get(0);
    }

    /** Tên nhân viên đã gắn/xử lý: một truy vấn cho cả trang. */
    private List<AdminBankTransactionResponse> responses(List<BankTransaction> transactions) {
        List<UUID> staffIds = transactions.stream()
                .flatMap(t -> Stream.of(t.getAssignedBy(), t.getResolvedBy()))
                .filter(Objects::nonNull).distinct().toList();
        Map<UUID, String> names = staffIds.isEmpty() ? Map.of()
                : users.findAllById(staffIds).stream().collect(Collectors.toMap(User::getId, User::getFullName));
        return transactions.stream().map(transaction -> {
            BankTransactionReviewReason reason = reviewReason(transaction);
            boolean resolved = transaction.getResolvedAt() != null;
            Booking booking = transaction.getBooking();
            return mapper.toAdmin(transaction,
                    booking == null ? null : booking.getCode(),
                    reason,
                    BankTransactionRules.reviewAmount(reason, transaction.getAmount(), transaction.getAppliedAmount()),
                    BankTransactionRules.needsReview(reason, resolved),
                    BankTransactionRules.availableActions(booking != null, reason, resolved),
                    nameOf(names, transaction.getAssignedBy()),
                    nameOf(names, transaction.getResolvedBy()));
        }).toList();
    }

    /** {@code Map.of().get(null)} ném NPE nên kiểm null trước. */
    private static String nameOf(Map<UUID, String> names, UUID id) {
        return id == null ? null : names.get(id);
    }
}
