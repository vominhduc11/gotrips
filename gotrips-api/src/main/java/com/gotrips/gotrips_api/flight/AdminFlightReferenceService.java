package com.gotrips.gotrips_api.flight;

import java.util.List;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminAirportResponse;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminCreateAirlineRequest;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminCreateAirportRequest;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminUpdateAirlineRequest;
import com.gotrips.gotrips_api.flight.AdminFlightReferences.AdminUpdateAirportRequest;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminFlightReferenceService {

    private static final String AIRLINE_TAKEN = "Mã hãng này đã được dùng.";
    private static final String AIRPORT_TAKEN = "Mã IATA này đã được dùng.";

    private final AirportRepository airports;
    private final AirlineRepository airlines;
    private final FlightMapper mapper;
    private final EntityManager entityManager;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public List<AirlineResponse> listAirlines() {
        return airlines.findAllByOrderByCodeAsc().stream().map(mapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAirportResponse> listAirports() {
        return airports.findAllByOrderBySortOrderAscCodeAsc().stream().map(mapper::toAdminAirport).toList();
    }

    @Transactional
    public AirlineResponse createAirline(AdminCreateAirlineRequest request) {
        if (airlines.existsById(request.code())) {
            throw new ConflictException("code", AIRLINE_TAKEN);
        }
        Airline airline = Airline.create(request.code(), request.name());
        insert(airline, "airlines_pkey", AIRLINE_TAKEN);
        events.publishEvent(WebCatalogChanged.flights());
        return mapper.toResponse(airline);
    }

    @Transactional
    public AirlineResponse updateAirline(String code, AdminUpdateAirlineRequest request) {
        Airline airline = airlines.findById(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hãng bay này."));
        airline.rename(request.name());
        events.publishEvent(WebCatalogChanged.flights());
        return mapper.toResponse(airline);
    }

    @Transactional
    public AdminAirportResponse createAirport(AdminCreateAirportRequest request) {
        if (airports.existsById(request.code())) {
            throw new ConflictException("code", AIRPORT_TAKEN);
        }
        Airport airport = Airport.create(request.code(), request.name(), request.city(), request.sortOrder());
        insert(airport, "airports_pkey", AIRPORT_TAKEN);
        events.publishEvent(WebCatalogChanged.airports());
        return mapper.toAdminAirport(airport);
    }

    @Transactional
    public AdminAirportResponse updateAirport(String code, AdminUpdateAirportRequest request) {
        Airport airport = airports.findById(code)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy sân bay này."));
        airport.update(request.name(), request.city(), request.sortOrder());
        events.publishEvent(WebCatalogChanged.airports());
        return mapper.toAdminAirport(airport);
    }

    private void insert(Object entity, String constraint, String message) {
        try {
            // Khoá chính do người dùng nhập. persist buộc INSERT; merge có thể ghi đè mã đã tồn tại.
            entityManager.persist(entity);
            entityManager.flush();
        } catch (RuntimeException error) {
            if (ConstraintViolations.violates(error, constraint)) {
                throw new ConflictException("code", message);
            }
            throw error;
        }
    }
}
