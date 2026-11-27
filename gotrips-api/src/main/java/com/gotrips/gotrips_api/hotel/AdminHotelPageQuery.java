package com.gotrips.gotrips_api.hotel;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Repository;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import jakarta.persistence.EntityManager;
import jakarta.persistence.criteria.CriteriaBuilder;
import jakarta.persistence.criteria.Order;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import lombok.RequiredArgsConstructor;

/** Lọc, sắp xếp và phân trang khách sạn trong SQL: đếm, lấy id của trang, rồi nơi gọi tải theo lô. */
@Repository
@RequiredArgsConstructor
class AdminHotelPageQuery {

    private final EntityManager em;

    record Result(List<Long> ids, int page, int size, long totalItems, long totalPages) {
    }

    Result search(AdminHotelFilters filters) {
        CriteriaBuilder cb = em.getCriteriaBuilder();
        var countQuery = cb.createQuery(Long.class);
        var counted = countQuery.from(Hotel.class);
        countQuery.select(cb.count(counted)).where(conditions(cb, counted, filters));
        long total = em.createQuery(countQuery).getSingleResult();
        int size = filters.pageSize();
        long totalPages = Math.max(1L, Math.ceilDiv(total, size));
        // Kẹp trang TRƯỚC khi nhân với cỡ trang để không tràn số (giống /tours).
        int page = (int) Math.min(filters.pageNumber(), totalPages);
        if (total == 0) {
            return new Result(List.of(), page, size, 0, totalPages);
        }

        var idQuery = cb.createQuery(Long.class);
        var hotel = idQuery.from(Hotel.class);
        idQuery.select(hotel.get("id")).where(conditions(cb, hotel, filters))
                .orderBy(order(cb, hotel, filters.order()));
        List<Long> ids = em.createQuery(idQuery)
                .setFirstResult(Math.toIntExact((long) (page - 1) * size))
                .setMaxResults(size)
                .getResultList();
        return new Result(ids, page, size, total, totalPages);
    }

    private static Predicate[] conditions(CriteriaBuilder cb, Root<Hotel> hotel, AdminHotelFilters filters) {
        List<Predicate> conditions = new ArrayList<>();
        if (filters.q() != null && !filters.q().isBlank()) {
            // Coi %, _ và ! là ký tự tìm kiếm để kết quả khớp đúng chuỗi người dùng nhập.
            String text = filters.q().strip().toLowerCase(Locale.ROOT)
                    .replace("!", "!!").replace("%", "!%").replace("_", "!_");
            String pattern = "%" + text + "%";
            conditions.add(cb.or(cb.like(cb.lower(hotel.get("name")), pattern, '!'),
                    cb.like(hotel.get("slug"), pattern, '!')));
        }
        if (filters.destinationId() != null) {
            conditions.add(cb.equal(hotel.get("destination").get("id"), filters.destinationId()));
        }
        // Không lọc trạng thái thì ẩn khách sạn đã xoá: chúng chỉ để khôi phục.
        conditions.add(filters.status() == null
                ? cb.notEqual(hotel.get("status"), CatalogStatus.DELETED)
                : cb.equal(hotel.get("status"), filters.status()));
        return conditions.toArray(Predicate[]::new);
    }

    private static List<Order> order(CriteriaBuilder cb, Root<Hotel> hotel, AdminHotelSort sort) {
        return switch (sort) {
            case NEWEST -> List.of(cb.desc(hotel.get("id")));
            case OLDEST -> List.of(cb.asc(hotel.get("id")));
            case NAME_ASC -> List.of(cb.asc(hotel.get("name")), cb.asc(hotel.get("id")));
            case NAME_DESC -> List.of(cb.desc(hotel.get("name")), cb.desc(hotel.get("id")));
        };
    }
}
