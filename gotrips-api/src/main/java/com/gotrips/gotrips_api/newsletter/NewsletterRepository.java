package com.gotrips.gotrips_api.newsletter;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NewsletterRepository extends JpaRepository<NewsletterSubscription, Long> {

    /**
     * Thêm email nếu chưa có; đã có thì không làm gì (không lỗi). Dùng {@code ON CONFLICT DO NOTHING} thay cho
     * "kiểm tra rồi mới thêm": hai request đồng thời cùng một email không thể làm hỏng transaction bằng lỗi vi
     * phạm UNIQUE, và không phải lộ ra bên ngoài việc email đó đã đăng ký từ trước.
     *
     * @return 1 nếu vừa thêm mới, 0 nếu đã có từ trước
     */
    @Modifying
    @Query(value = "INSERT INTO newsletter_subscriptions (email) VALUES (:email) ON CONFLICT (email) DO NOTHING",
            nativeQuery = true)
    int insertIfAbsent(@Param("email") String email);
}
