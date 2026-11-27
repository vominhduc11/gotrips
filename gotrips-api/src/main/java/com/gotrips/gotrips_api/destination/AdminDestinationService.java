package com.gotrips.gotrips_api.destination;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;

import lombok.RequiredArgsConstructor;

/** Điểm đến ở trang quản trị. Mỗi lần ghi phát {@link WebCatalogChanged} để website làm mới cache sau commit. */
@Service
@RequiredArgsConstructor
public class AdminDestinationService {

    static final String SLUG_CONSTRAINT = "uq_destinations_slug";
    private static final String SLUG_TAKEN = "Slug này đã được dùng cho điểm đến khác.";
    private static final String IN_USE =
            "Không xoá được điểm đến này vì còn tour hoặc khách sạn đang dùng (kể cả bản đã ẩn hoặc đã xoá).";

    private final DestinationRepository repository;
    private final AdminDestinationMapper mapper;
    private final CatalogImageUrls imageUrls;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public List<AdminDestinationResponse> list() {
        Map<Long, Long> tours = byDestination(repository.countAllToursByDestination());
        Map<Long, Long> hotels = byDestination(repository.countAllHotelsByDestination());
        return repository.findAllByOrderByIdAsc().stream()
                .map(d -> mapper.toResponse(d, tours.getOrDefault(d.getId(), 0L), hotels.getOrDefault(d.getId(), 0L)))
                .toList();
    }

    @Transactional
    public AdminDestinationResponse create(AdminDestinationRequest request) {
        imageUrls.require("imageUrl", request.imageUrl());
        if (repository.existsBySlug(request.slug())) {
            throw slugTaken();
        }
        Destination destination = save(Destination.create(request));
        events.publishEvent(WebCatalogChanged.tourCatalog());
        return mapper.toResponse(destination, 0, 0);
    }

    @Transactional
    public AdminDestinationResponse update(long id, AdminDestinationRequest request) {
        Destination destination = repository.lockById(id).orElseThrow(AdminDestinationService::notFound);
        imageUrls.require("imageUrl", request.imageUrl());
        if (repository.existsBySlugAndIdNot(request.slug(), id)) {
            throw slugTaken();
        }
        destination.update(request);
        save(destination);
        events.publishEvent(WebCatalogChanged.tourCatalog());
        return mapper.toResponse(destination, repository.countAllTours(id), repository.countAllHotels(id));
    }

    @Transactional
    public void delete(long id) {
        Destination destination = repository.lockById(id).orElseThrow(AdminDestinationService::notFound);
        long tours = repository.countAllTours(id);
        long hotels = repository.countAllHotels(id);
        if (tours > 0 || hotels > 0) {
            throw new ConflictException("Không xoá được điểm đến này vì còn " + tours + " tour và " + hotels
                    + " khách sạn đang dùng (kể cả bản đã ẩn hoặc đã xoá).");
        }
        try {
            repository.delete(destination);
            repository.flush();
        } catch (DataIntegrityViolationException ex) {
            // Khoá dòng điểm đến không chặn được tour/khách sạn vừa được tạo trỏ vào nó: khoá ngoại là chốt chặn.
            if (ConstraintViolations.violates(ex, "fk_tours_destination")
                    || ConstraintViolations.violates(ex, "fk_hotels_destination")) {
                throw new ConflictException(IN_USE);
            }
            throw ex;
        }
        events.publishEvent(WebCatalogChanged.tourCatalog());
    }

    /** Ghi ngay xuống DB để lỗi trùng slug lộ ra ở đây (chứ không phải lúc commit) và gắn được vào ô slug. */
    private Destination save(Destination destination) {
        try {
            return repository.saveAndFlush(destination);
        } catch (DataIntegrityViolationException ex) {
            if (ConstraintViolations.violates(ex, SLUG_CONSTRAINT)) {
                throw slugTaken();
            }
            throw ex;
        }
    }

    private static Map<Long, Long> byDestination(List<DestinationRepository.ReferenceCount> rows) {
        return rows.stream().collect(Collectors.toMap(DestinationRepository.ReferenceCount::getDestinationId,
                DestinationRepository.ReferenceCount::getTotal));
    }

    private static ConflictException slugTaken() {
        return new ConflictException("slug", SLUG_TAKEN);
    }

    private static ResourceNotFoundException notFound() {
        return new ResourceNotFoundException("Không tìm thấy điểm đến này.");
    }
}
