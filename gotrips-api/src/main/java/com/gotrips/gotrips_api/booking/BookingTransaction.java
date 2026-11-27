package com.gotrips.gotrips_api.booking;

import java.util.function.Supplier;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.gotrips.gotrips_api.common.error.ConstraintViolations;

/**
 * Chạy việc tạo đơn trong một transaction. Nếu hai request cùng lúc sinh ra cùng một mã đơn, ràng buộc UNIQUE làm hỏng
 * một transaction (Postgres không cho chạy tiếp sau lỗi), nên chạy LẠI cả transaction để sinh mã khác.
 */
@Component
public class BookingTransaction {

    static final String CODE_CONSTRAINT = "uq_bookings_code";
    private static final int MAX_ATTEMPTS = 3;

    private final TransactionTemplate transactionTemplate;

    public BookingTransaction(PlatformTransactionManager transactionManager) {
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    public <T> T run(Supplier<T> action) {
        for (int attempt = 1;; attempt++) {
            try {
                return transactionTemplate.execute(status -> action.get());
            } catch (DataIntegrityViolationException e) {
                if (attempt >= MAX_ATTEMPTS || !ConstraintViolations.violates(e, CODE_CONSTRAINT)) {
                    throw e;
                }
            }
        }
    }
}
