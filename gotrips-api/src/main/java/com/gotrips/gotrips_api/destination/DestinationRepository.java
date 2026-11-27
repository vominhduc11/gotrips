package com.gotrips.gotrips_api.destination;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import jakarta.persistence.LockModeType;

public interface DestinationRepository extends JpaRepository<Destination, Long> {

    /** Thứ tự cố định theo id (thứ tự hiển thị ở website). */
    List<Destination> findAllByOrderByIdAsc();

    Optional<Destination> findBySlug(String slug);

    boolean existsBySlug(String slug);

    boolean existsBySlugAndIdNot(String slug, Long id);

    /** Khoá dòng khi sửa/xoá: lệnh sửa chạy đồng thời với lệnh xoá thì nhận 404 thay vì ghi vào dòng đã mất. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select d from Destination d where d.id = :id")
    Optional<Destination> lockById(@Param("id") Long id);

    /**
     * Số tour theo trạng thái cho từng điểm đến, một query cho tất cả điểm đến (tránh N+1). Điểm đến không có
     * tour nào không xuất hiện trong kết quả (đếm = 0). Tham chiếu {@code Tour} bằng tên entity trong JPQL để
     * package destination không phụ thuộc package tour khi biên dịch (tour đã phụ thuộc destination).
     */
    @Query("select t.destination.id as destinationId, count(t) as total from Tour t "
            + "where t.status = :status group by t.destination.id")
    List<ReferenceCount> countToursByDestination(@Param("status") CatalogStatus status);

    /** Mọi tour (mọi trạng thái) theo điểm đến: đúng tập bản ghi chặn việc xoá điểm đến. */
    @Query("select t.destination.id as destinationId, count(t) as total from Tour t group by t.destination.id")
    List<ReferenceCount> countAllToursByDestination();

    /** Mọi khách sạn (mọi trạng thái) theo điểm đến. Tham chiếu {@code Hotel} bằng tên entity: xem trên. */
    @Query("select h.destination.id as destinationId, count(h) as total from Hotel h group by h.destination.id")
    List<ReferenceCount> countAllHotelsByDestination();

    @Query("select count(t) from Tour t where t.destination.id = :id")
    long countAllTours(@Param("id") Long id);

    @Query("select count(h) from Hotel h where h.destination.id = :id")
    long countAllHotels(@Param("id") Long id);

    interface ReferenceCount {
        Long getDestinationId();

        Long getTotal();
    }
}
