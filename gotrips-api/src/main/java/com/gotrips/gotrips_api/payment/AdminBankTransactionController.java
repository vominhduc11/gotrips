package com.gotrips.gotrips_api.payment;

import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.gotrips.gotrips_api.config.AdminSecurityConfig.AdminAuthentication;
import com.gotrips.gotrips_api.config.OpenApiConfig;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Đối chiếu giao dịch tiền vào do SePay báo (STAFF/ADMIN). */
@RestController
@RequestMapping("/admin/bank-transactions")
@RequiredArgsConstructor
@Tag(name = "Quản trị giao dịch ngân hàng", description = "Giao dịch chuyển khoản SePay báo về và việc đối chiếu với đơn")
@SecurityRequirement(name = OpenApiConfig.BEARER_SCHEME)
@SecurityRequirement(name = OpenApiConfig.ADMIN_COOKIE_SCHEME)
public class AdminBankTransactionController {

    private final BankTransactionService transactions;

    @Operation(operationId = "listAdminBankTransactions", summary = "Tìm và phân trang giao dịch, mới nhất trước",
            description = "Lỗi: 400 bộ lọc không hợp lệ, 401 chưa đăng nhập, 403 thiếu quyền.")
    @GetMapping
    public AdminBankTransactionPageResponse list(
            @Valid @ParameterObject @ModelAttribute AdminBankTransactionFilters filters) {
        return transactions.list(filters);
    }

    @Operation(operationId = "assignAdminBankTransaction", summary = "Gắn giao dịch chưa có đơn vào một đơn",
            description = "Tính tiền vào đơn như khi tự gắn: cộng dồn, đủ tiền thì tự xác nhận. Lỗi: 400 mã đơn sai "
                    + "hoặc không có (errors[bookingCode]), 401, 403 thiếu quyền hoặc CSRF, 404 không có giao dịch, "
                    + "409 giao dịch đã có đơn hoặc đã được xử lý.")
    @PostMapping("/{id}/assign")
    public AdminBankTransactionResponse assign(AdminAuthentication auth, @PathVariable long id,
            @Valid @RequestBody AssignBankTransactionRequest request) {
        return transactions.assign(id, request.bookingCode(), auth.user().id());
    }

    @Operation(operationId = "resolveAdminBankTransaction", summary = "Đánh dấu đã xử lý phần tiền lệch",
            description = "Lỗi: 400 thiếu ghi chú, 401, 403 thiếu quyền hoặc CSRF, 404 không có giao dịch, "
                    + "409 giao dịch không cần xử lý hoặc đã được xử lý.")
    @PostMapping("/{id}/resolve")
    public AdminBankTransactionResponse resolve(AdminAuthentication auth, @PathVariable long id,
            @Valid @RequestBody ResolveBankTransactionRequest request) {
        return transactions.resolve(id, request.note(), auth.user().id());
    }
}
