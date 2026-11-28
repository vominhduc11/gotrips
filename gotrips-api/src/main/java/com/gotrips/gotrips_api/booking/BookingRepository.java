package com.gotrips.gotrips_api.booking;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface BookingRepository extends JpaRepository<Booking, Long> {

    boolean existsByCode(String code);

    /** Đơn của một người, mới nhất trước; tải luôn thanh toán và người đi ({@code open-in-view: false}). */
    @Query("""
            select b from Booking b join fetch b.payment left join fetch b.travelers
            where b.userId = :userId
            order by b.createdAt desc, b.id desc
            """)
    List<Booking> findAllByUser(@Param("userId") UUID userId);

    /** Đơn theo mã CỦA người gọi: đơn của người khác coi như không có. */
    @Query("""
            select b from Booking b join fetch b.payment left join fetch b.travelers
            where b.code = :code and b.userId = :userId
            """)
    Optional<Booking> findByCodeAndUser(@Param("code") String code, @Param("userId") UUID userId);

    @Query("""
            select b from Booking b join fetch b.payment left join fetch b.travelers
            where b.id in :ids
            """)
    List<Booking> findAllDetailedByIdIn(@Param("ids") Collection<Long> ids);

    @Query("""
            select b from Booking b join fetch b.payment left join fetch b.travelers
            where b.code = :code
            """)
    Optional<Booking> findDetailedByCode(@Param("code") String code);

    /**
     * Khoá dòng đơn trước khi đổi trạng thái: hai thao tác đồng thời (ví dụ hai lệnh huỷ) phải chờ nhau, lệnh sau thấy
     * trạng thái mới và bị từ chối, nên không trả chỗ hai lần.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.code = :code")
    Optional<Booking> lockByCode(@Param("code") String code);

    /** Trong các mã ứng viên (đọc từ nội dung chuyển khoản), mã nào là đơn có thật. */
    @Query("select b.code from Booking b where b.code in :codes")
    List<String> findExistingCodes(@Param("codes") Collection<String> codes);

    /** Trạng thái thanh toán của đơn CỦA người gọi (trang chi tiết đơn hỏi lại định kỳ, không cần người đi). */
    @Query("select b from Booking b join fetch b.payment where b.code = :code and b.userId = :userId")
    Optional<Booking> findWithPaymentByCodeAndUser(@Param("code") String code, @Param("userId") UUID userId);
}
