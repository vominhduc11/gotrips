package com.gotrips.gotrips_api.tour;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.destination.Destination;
import com.gotrips.gotrips_api.destination.DestinationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final TourDepartureRepository departureRepository;
    private final DestinationRepository destinationRepository;
    private final TourMapper tourMapper;
    private final Clock clock;

    /**
     * Tour nổi bật cho Trang chủ: tour ACTIVE + isFeatured còn ít nhất một chuyến đặt được, theo id, tối đa
     * {@code limit}. "Hôm nay" tính MỘT lần cho cả request (theo giờ Việt Nam, xem {@code ClockConfig}) để
     * hai query và phần tính toán dùng cùng một ngày dù request chạy qua nửa đêm.
     */
    @Transactional(readOnly = true)
    public List<TourCardResponse> featured(int limit) {
        LocalDate today = LocalDate.now(clock);

        List<Tour> tours = tourRepository.findFeaturedWithBookableDeparture(CatalogStatus.ACTIVE, today, Limit.of(limit));
        if (tours.isEmpty()) {
            return List.of();
        }

        Map<Long, List<TourDeparture>> departuresByTour = bookableDeparturesByTour(tours, today);

        return tours.stream()
                .map(tour -> TourCardCalculator.toCard(tour, departuresByTour.getOrDefault(tour.getId(), List.of()), today))
                .toList();
    }

    /**
     * Trang /tours: lọc, sắp xếp, phân trang (luật ở {@link TourSearchCalculator}). Chỉ tour ACTIVE. Slug điểm đến không
     * tồn tại cho kết quả rỗng (không bỏ qua bộ lọc, nếu không khách gõ sai slug lại thấy mọi tour).
     */
    @Transactional(readOnly = true)
    public TourSearchResponse search(String destinationSlug, String query, LocalDate date, Integer guests, TourSort sort,
            int page) {
        LocalDate today = LocalDate.now(clock);

        Optional<Destination> destination = StringUtils.hasText(destinationSlug)
                ? destinationRepository.findBySlug(destinationSlug.strip())
                : Optional.empty();
        List<Tour> tours;
        if (!StringUtils.hasText(destinationSlug)) {
            tours = tourRepository.findAllByStatus(CatalogStatus.ACTIVE);
        } else {
            tours = destination
                    .map(d -> tourRepository.findAllByStatusAndDestination(CatalogStatus.ACTIVE, d.getId()))
                    .orElse(List.of());
        }

        TourSearchCalculator.Result result = TourSearchCalculator.search(tours, bookableDeparturesByTour(tours, today),
                new TourSearchCalculator.Criteria(query, date, guests, sort, page), today);

        return new TourSearchResponse(result.items(), result.total(), result.page(), result.pageCount(),
                destination.map(Destination::getName).orElse(null));
    }

    /** Chi tiết một tour theo slug. Tour không có hoặc đang HIDDEN: 404 (không phân biệt, để không lộ tour đang ẩn). */
    @Transactional(readOnly = true)
    public TourDetailResponse detail(String slug) {
        LocalDate today = LocalDate.now(clock);

        Tour tour = tourRepository.findBySlugAndStatus(slug, CatalogStatus.ACTIVE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tour này."));

        List<TourDeparture> upcoming = departureRepository.findUpcoming(tour.getId(), today);
        // Thẻ (giá từ, ngày gần nhất...) tính từ cùng danh sách chuyến với phần lịch khởi hành bên dưới nên luôn khớp nhau.
        TourCardResponse card = TourCardCalculator.toCard(tour, upcoming, today);

        return tourMapper.toDetail(card, tour.getShortDescription(),
                upcoming.stream().map(TourCardCalculator::toDeparture).toList(),
                tourRepository.findTestimonials(tour.getId()));
    }

    /** Chuyến đặt được của các tour đã chọn, gom theo id tour: một query cho cả danh sách (tránh N+1). */
    private Map<Long, List<TourDeparture>> bookableDeparturesByTour(List<Tour> tours, LocalDate today) {
        if (tours.isEmpty()) {
            return Map.of();
        }
        return departureRepository.findBookable(tours.stream().map(Tour::getId).toList(), today).stream()
                .collect(Collectors.groupingBy(TourDeparture::getTourId));
    }
}
