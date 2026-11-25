package com.gotrips.gotrips_api.newsletter;

import java.time.Instant;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Một địa chỉ email đã đăng ký nhận ưu đãi. Ghi bằng {@link NewsletterRepository#insertIfAbsent}, không qua {@code save}. */
@Entity
@Table(name = "newsletter_subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsletterSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Luôn chữ thường (có ràng buộc CHECK ở DB) để UNIQUE bắt được trùng. */
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    /** Do DB đặt ({@code DEFAULT now()}). */
    @Column(name = "subscribed_at", nullable = false, insertable = false, updatable = false)
    private Instant subscribedAt;
}
