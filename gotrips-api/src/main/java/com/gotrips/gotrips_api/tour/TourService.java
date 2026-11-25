package com.gotrips.gotrips_api.tour;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TourService {

    private final TourRepository tourRepository;
    private final TourDepartureRepository departureRepository;
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

        Map<Long, List<TourDeparture>> departuresByTour = departureRepository
                .findBookable(tours.stream().map(Tour::getId).toList(), today).stream()
                .collect(Collectors.groupingBy(TourDeparture::getTourId));

        return tours.stream()
                .map(tour -> TourCardCalculator.toCard(tour, departuresByTour.getOrDefault(tour.getId(), List.of()), today))
                .toList();
    }
}
