package com.gotrips.gotrips_api.tour;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.catalog.CatalogVisibility;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.destination.Destination;
import com.gotrips.gotrips_api.destination.DestinationRepository;

import lombok.RequiredArgsConstructor;

/**
 * Tour ở trang quản trị. Mọi lệnh ghi khoá dòng tour trước khi đọc trạng thái (xem {@link Tour}) và phát
 * {@link WebCatalogChanged} để website làm mới cache sau commit.
 */
@Service
@RequiredArgsConstructor
public class AdminTourService {

    static final String SLUG_CONSTRAINT = "uq_tours_slug";
    private static final String DESTINATION_CONSTRAINT = "fk_tours_destination";
    private static final String SLUG_TAKEN = "Slug này đã được dùng cho tour khác (kể cả tour đã xoá).";
    private static final String DESTINATION_MISSING = "Điểm đến này không còn tồn tại. Vui lòng chọn điểm đến khác.";

    private final TourRepository tourRepository;
    private final TourDepartureRepository departureRepository;
    private final DestinationRepository destinationRepository;
    private final AdminTourPageQuery pageQuery;
    private final AdminTourMapper mapper;
    private final CatalogImageUrls imageUrls;
    private final ApplicationEventPublisher events;
    private final Clock clock;

    @Transactional(readOnly = true)
    public AdminTourPageResponse list(AdminTourFilters filters) {
        AdminTourPageQuery.Result page = pageQuery.search(filters);
        if (page.ids().isEmpty()) {
            return new AdminTourPageResponse(List.of(), page.page(), page.size(), page.totalItems(), page.totalPages());
        }
        Map<Long, Tour> tours = tourRepository.findAllWithDestinationByIdIn(page.ids()).stream()
                .collect(Collectors.toMap(Tour::getId, Function.identity()));
        Map<Long, TourDepartureRepository.UpcomingStats> stats =
                departureRepository.findUpcomingStats(page.ids(), LocalDate.now(clock)).stream()
                        .collect(Collectors.toMap(TourDepartureRepository.UpcomingStats::getTourId,
                                Function.identity()));
        // IN không giữ thứ tự: ghép lại theo thứ tự của truy vấn phân trang.
        List<AdminTourSummaryResponse> items = page.ids().stream().map(id -> {
            TourDepartureRepository.UpcomingStats upcoming = stats.get(id);
            return upcoming == null
                    ? mapper.toSummary(tours.get(id), 0, null, 0)
                    : mapper.toSummary(tours.get(id), upcoming.getUpcomingCount(), upcoming.getNextDate(),
                            upcoming.getRemainingSeats());
        }).toList();
        return new AdminTourPageResponse(items, page.page(), page.size(), page.totalItems(), page.totalPages());
    }

    @Transactional(readOnly = true)
    public AdminTourDetailResponse get(long id) {
        return detail(tourRepository.findById(id).orElseThrow(AdminTourService::notFound));
    }

    @Transactional
    public AdminTourDetailResponse create(AdminCreateTourRequest request) {
        validate(request);
        Destination destination = destination(request.destinationId());
        if (tourRepository.existsBySlug(request.slug())) {
            throw slugTaken();
        }
        CatalogVisibility visibility = request.status() == null ? CatalogVisibility.ACTIVE : request.status();
        Tour tour = Tour.create(content(request, destination), visibility);
        try {
            tourRepository.saveAndFlush(tour);
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        return changed(tour);
    }

    @Transactional
    public AdminTourDetailResponse update(long id, AdminUpdateTourRequest request) {
        Tour tour = lock(id);
        tour.requireNotDeleted();
        validate(request);
        Destination destination = destination(request.destinationId());
        if (tourRepository.existsBySlugAndIdNot(request.slug(), id)) {
            throw slugTaken();
        }
        tour.update(content(request, destination));
        try {
            tourRepository.flush();
        } catch (DataIntegrityViolationException ex) {
            throw translate(ex);
        }
        return changed(tour);
    }

    @Transactional
    public AdminTourDetailResponse changeVisibility(long id, CatalogVisibility visibility) {
        Tour tour = lock(id);
        tour.changeVisibility(visibility);
        return changed(tour);
    }

    @Transactional
    public void delete(long id) {
        lock(id).softDelete();
        events.publishEvent(WebCatalogChanged.tourCatalog());
    }

    @Transactional
    public AdminTourDetailResponse restore(long id) {
        Tour tour = lock(id);
        tour.restore();
        return changed(tour);
    }

    private Tour lock(long id) {
        return tourRepository.lockById(id).orElseThrow(AdminTourService::notFound);
    }

    private AdminTourDetailResponse changed(Tour tour) {
        events.publishEvent(WebCatalogChanged.tourCatalog());
        return detail(tour);
    }

    private AdminTourDetailResponse detail(Tour tour) {
        int open = departureRepository.findBookable(List.of(tour.getId()), LocalDate.now(clock)).size();
        return mapper.toDetail(tour, open);
    }

    private void validate(AdminTourFields fields) {
        if (AdminTourRules.RESERVED_SLUGS.contains(fields.slug())) {
            throw new InvalidRequestException("slug", AdminTourRules.SLUG_RESERVED);
        }
        if (fields.durationNights() > fields.durationDays()) {
            throw new InvalidRequestException("durationNights", AdminTourRules.NIGHTS_OVER_DAYS);
        }
        imageUrls.require("coverImageUrl", fields.coverImageUrl());
    }

    private Destination destination(long id) {
        return destinationRepository.findById(id)
                .orElseThrow(() -> new InvalidRequestException("destinationId", DESTINATION_MISSING));
    }

    private static Tour.Content content(AdminTourFields fields, Destination destination) {
        return new Tour.Content(fields.slug(), fields.title(), destination, fields.durationDays(),
                fields.durationNights(), fields.departureCity(), fields.shortDescription(), fields.coverImageUrl(),
                fields.coverImageAlt(), fields.featured());
    }

    /** Hai request đồng thời cùng qua bước kiểm trước thì ràng buộc DB chặn: đổi thành lỗi đúng ô. */
    private static RuntimeException translate(DataIntegrityViolationException ex) {
        if (ConstraintViolations.violates(ex, SLUG_CONSTRAINT)) {
            return slugTaken();
        }
        if (ConstraintViolations.violates(ex, DESTINATION_CONSTRAINT)) {
            return new InvalidRequestException("destinationId", DESTINATION_MISSING);
        }
        return ex;
    }

    private static ConflictException slugTaken() {
        return new ConflictException("slug", SLUG_TAKEN);
    }

    static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy tour này.");
    }
}
