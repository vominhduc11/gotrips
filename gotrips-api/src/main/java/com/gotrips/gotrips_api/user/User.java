package com.gotrips.gotrips_api.user;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * Tài khoản đăng nhập (khách hàng, nhân viên, admin).
 * Không dùng {@code @Data}/{@code @ToString}: tránh vô tình in {@code passwordHash} ra log.
 * Hibernate truy cập theo field. Các phương thức nghiệp vụ giới hạn phần dữ liệu có thể cập nhật.
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** Luôn chữ thường (DB có CHECK); chuẩn hoá ở {@code RegisterRequest}/{@code LoginRequest}. */
    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(length = 30)
    private String phone;

    // LAZY: chỉ nạp khi cần (repository dùng @EntityGraph); open-in-view tắt nên không lazy-load ngoài transaction.
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "user_roles",
            joinColumns = @JoinColumn(name = "user_id"),
            inverseJoinColumns = @JoinColumn(name = "role_id"))
    @Builder.Default
    private Set<Role> roles = new HashSet<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public boolean hasRole(RoleName name) {
        return roles.stream().anyMatch(role -> role.getName() == name);
    }

    public boolean hasStaffAccess() {
        return hasRole(RoleName.STAFF) || hasRole(RoleName.ADMIN);
    }

    void replaceStaffRole(Role granted) {
        roles.removeIf(role -> (role.getName() == RoleName.STAFF || role.getName() == RoleName.ADMIN)
                && role != granted);
        if (granted != null) {
            roles.add(granted);
        }
    }

    public void changePasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public void changeFullName(String fullName) {
        this.fullName = fullName;
    }

    public void changePhone(String phone) {
        this.phone = phone;
    }
}
