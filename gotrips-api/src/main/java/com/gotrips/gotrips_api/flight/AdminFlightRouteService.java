package com.gotrips.gotrips_api.flight;

import java.util.HashSet;
import java.util.List;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Limit;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.gotrips.gotrips_api.catalog.CatalogImageUrls;
import com.gotrips.gotrips_api.catalog.WebCatalogChanged;
import com.gotrips.gotrips_api.common.error.ConflictException;
import com.gotrips.gotrips_api.common.error.ConstraintViolations;
import com.gotrips.gotrips_api.common.error.InvalidRequestException;
import com.gotrips.gotrips_api.common.error.ResourceNotFoundException;
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteOrderRequest;
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteRequest;
import com.gotrips.gotrips_api.flight.AdminFlightRouteDtos.AdminFlightRouteResponse;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class AdminFlightRouteService {

    private final FlightRouteRepository routes;
    private final AirportRepository airports;
    private final CatalogImageUrls imageUrls;
    private final FlightMapper mapper;
    private final ApplicationEventPublisher events;

    @Transactional(readOnly = true)
    public List<AdminFlightRouteResponse> list() {
        return sortedRoutes().stream().map(mapper::toAdminRoute).toList();
    }

    @Transactional
    public AdminFlightRouteResponse create(AdminFlightRouteRequest request) {
        routes.lockWrites();
        FlightRoute route = new FlightRoute();
        apply(route, request);
        Integer last = routes.lastSortOrder();
        if (last != null && last == Integer.MAX_VALUE) {
            List<FlightRoute> rows = sortedRoutes();
            renumber(rows);
            last = rows.size();
        }
        route.moveTo(last == null ? 1 : last + 1);
        save(route);
        events.publishEvent(WebCatalogChanged.flightRoutes());
        return mapper.toAdminRoute(route);
    }

    @Transactional
    public AdminFlightRouteResponse update(long id, AdminFlightRouteRequest request) {
        routes.lockWrites();
        FlightRoute route = get(id);
        apply(route, request);
        save(route);
        events.publishEvent(WebCatalogChanged.flightRoutes());
        return mapper.toAdminRoute(route);
    }

    @Transactional
    public void delete(long id) {
        routes.lockWrites();
        routes.delete(get(id));
        events.publishEvent(WebCatalogChanged.flightRoutes());
    }

    @Transactional
    public List<AdminFlightRouteResponse> updateOrder(AdminFlightRouteOrderRequest request) {
        var expectedSet = new HashSet<>(request.expectedIds());
        if (expectedSet.size() != request.expectedIds().size()
                || expectedSet.size() != request.orderedIds().size()
                || !expectedSet.equals(new HashSet<>(request.orderedIds()))) {
            throw new InvalidRequestException("orderedIds", "Thứ tự mới phải chứa đủ các chặng, mỗi chặng đúng một lần.");
        }

        routes.lockWrites();
        List<FlightRoute> current = sortedRoutes();
        if (!request.expectedIds().equals(current.stream().map(FlightRoute::getId).toList())) {
            throw new ConflictException("Danh sách chặng đã thay đổi. Vui lòng tải lại trước khi lưu thứ tự.");
        }
        var byId = current.stream().collect(Collectors.toMap(FlightRoute::getId, Function.identity()));
        List<FlightRoute> ordered = request.orderedIds().stream().map(byId::get).toList();
        renumber(ordered);
        events.publishEvent(WebCatalogChanged.flightRoutes());
        return ordered.stream().map(mapper::toAdminRoute).toList();
    }

    private List<FlightRoute> sortedRoutes() {
        return routes.findPopular(Limit.unlimited());
    }

    private static void renumber(List<FlightRoute> ordered) {
        for (int index = 0; index < ordered.size(); index++) {
            ordered.get(index).moveTo(index + 1);
        }
    }

    private FlightRoute get(long id) {
        return routes.findById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy chặng bay này."));
    }

    private void apply(FlightRoute route, AdminFlightRouteRequest request) {
        FlightSearchRules.validateRoute("toCode", request.fromCode(), request.toCode());
        imageUrls.require("imageUrl", request.imageUrl());
        route.update(airport(request.fromCode(), "fromCode"), airport(request.toCode(), "toCode"),
                request.durationMinutes(), request.referencePrice(), request.imageUrl(), request.imageAlt());
    }

    private Airport airport(String code, String field) {
        return airports.findById(code)
                .orElseThrow(() -> new InvalidRequestException(field, "Sân bay này không tồn tại."));
    }

    private void save(FlightRoute route) {
        try {
            routes.saveAndFlush(route);
        } catch (DataIntegrityViolationException error) {
            if (ConstraintViolations.violates(error, "uq_flight_routes_from_to")) {
                throw new ConflictException("toCode", "Cặp điểm đi và điểm đến này đã có trong danh sách.");
            }
            throw error;
        }
    }
}
