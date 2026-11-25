package com.gotrips.gotrips_api.destination;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

public interface DestinationRepository extends JpaRepository<Destination, Long> {

    /** Thứ tự cố định theo id (khớp thứ tự mock mà web đang hiển thị). */
    List<Destination> findAllByOrderByIdAsc();

    /**
     * Số tour theo trạng thái cho từng điểm đến, một query cho tất cả điểm đến (tránh N+1). Điểm đến không có
     * tour nào không xuất hiện trong kết quả (đếm = 0). Tham chiếu {@code Tour} bằng tên entity trong JPQL để
     * package destination không phụ thuộc package tour khi biên dịch (tour đã phụ thuộc destination).
     */
    @Query("select t.destination.id as destinationId, count(t) as tourCount from Tour t "
            + "where t.status = :status group by t.destination.id")
    List<TourCount> countToursByDestination(@Param("status") CatalogStatus status);

    interface TourCount {
        Long getDestinationId();

        Long getTourCount();
    }
}
