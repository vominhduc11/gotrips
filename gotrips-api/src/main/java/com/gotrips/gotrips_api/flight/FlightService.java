package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;

/** Sân bay và chặng bay phổ biến. */
@Service
@RequiredArgsConstructor
public class FlightService {

    private final AirportRepository airportRepository;
    private final FlightRouteRepository routeRepository;
    private final FlightMapper flightMapper;

    @Transactional(readOnly = true)
    public List<AirportResponse> listAirports() {
        return airportRepository.findAllByOrderBySortOrderAscCodeAsc().stream()
                .map(flightMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<FlightRouteCardResponse> popularRoutes(int limit) {
        return routeRepository.findPopular(Limit.of(limit)).stream()
                .map(flightMapper::toCard)
                .toList();
    }
}
