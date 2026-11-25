package com.gotrips.gotrips_api.newsletter;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

/** Đăng ký nhận ưu đãi (công khai, không cần token). */
@RestController
@RequestMapping("/newsletter")
@RequiredArgsConstructor
@Tag(name = "Ưu đãi", description = "Đăng ký nhận ưu đãi qua email")
public class NewsletterController {

    private final NewsletterService newsletterService;

    @Operation(operationId = "subscribeNewsletter", summary = "Đăng ký nhận ưu đãi qua email",
            description = "Công khai. Thành công trả 204, kể cả khi email đã đăng ký từ trước (không lộ email nào "
                    + "đã có trong danh sách). Lỗi: 400 email sai định dạng (kèm errors[] theo field).")
    @PostMapping("/subscriptions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void subscribe(@Valid @RequestBody SubscribeNewsletterRequest request) {
        newsletterService.subscribe(request.email());
    }
}
