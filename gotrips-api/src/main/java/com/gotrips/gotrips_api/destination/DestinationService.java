package com.gotrips.gotrips_api.destination;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.common.catalog.CatalogStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DestinationService {

    private final DestinationRepository destinationRepository;
    private final DestinationMapper destinationMapper;

    /** Mọi điểm đến theo id; {@code tourCount} chỉ đếm tour ACTIVE (không cần tour còn chuyến). */
    @Transactional(readOnly = true)
    public List<DestinationResponse> listAll() {
        Map<Long, Long> tourCounts = new HashMap<>();
        for (DestinationRepository.TourCount row : destinationRepository.countToursByDestination(CatalogStatus.ACTIVE)) {
            tourCounts.put(row.getDestinationId(), row.getTourCount());
        }
        return destinationRepository.findAllByOrderByIdAsc().stream()
                .map(d -> destinationMapper.toResponse(d, tourCounts.getOrDefault(d.getId(), 0L)))
                .toList();
    }
}
