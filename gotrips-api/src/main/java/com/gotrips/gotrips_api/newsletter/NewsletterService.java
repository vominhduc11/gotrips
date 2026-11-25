package com.gotrips.gotrips_api.newsletter;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class NewsletterService {

    private final NewsletterRepository newsletterRepository;

    /**
     * Đăng ký nhận ưu đãi. Email đã đăng ký cũng coi như thành công (idempotent): phản hồi không được khác nhau
     * giữa email mới và email cũ, nếu không người lạ dò được email nào đã có trong danh sách.
     * Không ghi email vào log.
     */
    @Transactional
    public void subscribe(String email) {
        newsletterRepository.insertIfAbsent(email);
    }
}
