package com.gotrips.gotrips_api.booking;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.springframework.stereotype.Component;

import com.gotrips.gotrips_api.config.BankTransferProperties;
import com.gotrips.gotrips_api.flight.FlightFareCalculator;
import com.gotrips.gotrips_api.flight.FlightFaresResponse;
import com.gotrips.gotrips_api.flight.FlightRoute;
import com.gotrips.gotrips_api.flight.FlightRouteRepository;
import com.gotrips.gotrips_api.flight.FlightSchedule;
import com.gotrips.gotrips_api.flight.FlightScheduleRepository;
import com.gotrips.gotrips_api.hotel.Hotel;
import com.gotrips.gotrips_api.hotel.HotelRepository;
import com.gotrips.gotrips_api.hotel.HotelRoomType;
import com.gotrips.gotrips_api.hotel.HotelRoomTypeRepository;
import com.gotrips.gotrips_api.tour.Tour;
import com.gotrips.gotrips_api.tour.TourDeparture;
import com.gotrips.gotrips_api.tour.TourDepartureRepository;
import com.gotrips.gotrips_api.tour.TourRepository;

import lombok.RequiredArgsConstructor;

/**
 * Ghép đơn với dữ liệu danh mục HIỆN TẠI (tên, ảnh, giờ bay...) để dựng response. Giá lấy từ đơn (đã chốt lúc đặt).
 * Danh mục đã bị ẩn vẫn hiện trong đơn cũ. Mỗi loại dịch vụ tải bằng vài query theo danh sách id (không N+1).
 * Phải gọi trong transaction ({@code open-in-view: false}).
 */
@Component
@RequiredArgsConstructor
class BookingAssembler {

    private final TourBookingDetailRepository tourDetailRepository;
    private final TourDepartureRepository departureRepository;
    private final TourRepository tourRepository;
    private final HotelBookingDetailRepository hotelDetailRepository;
    private final HotelRoomTypeRepository roomTypeRepository;
    private final HotelRepository hotelRepository;
    private final FlightBookingDetailRepository flightDetailRepository;
    private final FlightScheduleRepository scheduleRepository;
    private final FlightRouteRepository routeRepository;
    private final BookingMapper mapper;
    private final BankTransferProperties bankTransfer;

    List<BookingSummaryResponse> summaries(List<Booking> bookings) {
        Map<Long, TourBookingResponse> tours = tourBlocks(ofKind(bookings, BookingKind.TOUR));
        Map<Long, HotelBookingResponse> hotels = hotelBlocks(ofKind(bookings, BookingKind.HOTEL));
        Map<Long, FlightBookingResponse> flights = flightBlocks(ofKind(bookings, BookingKind.FLIGHT));
        return bookings.stream()
                .map(b -> mapper.toSummary(b, tours.get(b.getId()), hotels.get(b.getId()), flights.get(b.getId())))
                .toList();
    }

    BookingDetailResponse detail(Booking booking) {
        BookingSummaryResponse summary = summaries(List.of(booking)).get(0);
        return mapper.toDetail(summary, booking, new BankTransferResponse(bankTransfer.bankName(),
                bankTransfer.accountNumber(), bankTransfer.accountName(), booking.getCode()));
    }

    private static Map<Long, Booking> ofKind(List<Booking> bookings, BookingKind kind) {
        return bookings.stream().filter(b -> b.getKind() == kind)
                .collect(Collectors.toMap(Booking::getId, Function.identity()));
    }

    private Map<Long, TourBookingResponse> tourBlocks(Map<Long, Booking> bookings) {
        if (bookings.isEmpty()) {
            return Map.of();
        }
        List<TourBookingDetail> details = tourDetailRepository.findByBookingIdIn(bookings.keySet());
        Map<Long, TourDeparture> departures = byId(
                departureRepository.findAllById(details.stream().map(TourBookingDetail::getDepartureId).toList()),
                TourDeparture::getId);
        Map<Long, Tour> tours = byId(tourRepository.findAllWithDestinationByIdIn(
                departures.values().stream().map(TourDeparture::getTourId).distinct().toList()), Tour::getId);

        return details.stream().collect(Collectors.toMap(TourBookingDetail::getBookingId, detail -> {
            TourDeparture departure = departures.get(detail.getDepartureId());
            return mapper.toTour(detail, departure, tours.get(departure.getTourId()),
                    mapper.toTravelers(bookings.get(detail.getBookingId()).getTravelers()));
        }));
    }

    private Map<Long, HotelBookingResponse> hotelBlocks(Map<Long, Booking> bookings) {
        if (bookings.isEmpty()) {
            return Map.of();
        }
        List<HotelBookingDetail> details = hotelDetailRepository.findByBookingIdIn(bookings.keySet());
        Map<Long, HotelRoomType> roomTypes = byId(
                roomTypeRepository.findAllById(details.stream().map(HotelBookingDetail::getRoomTypeId).toList()),
                HotelRoomType::getId);
        Map<Long, Hotel> hotels = byId(hotelRepository.findAllWithDestinationByIdIn(
                roomTypes.values().stream().map(HotelRoomType::getHotelId).distinct().toList()), Hotel::getId);

        return details.stream().collect(Collectors.toMap(HotelBookingDetail::getBookingId, detail -> {
            HotelRoomType roomType = roomTypes.get(detail.getRoomTypeId());
            return mapper.toHotel(detail, roomType, hotels.get(roomType.getHotelId()));
        }));
    }

    private Map<Long, FlightBookingResponse> flightBlocks(Map<Long, Booking> bookings) {
        if (bookings.isEmpty()) {
            return Map.of();
        }
        List<FlightBookingDetail> details = flightDetailRepository.findWithSegmentsByBookingIdIn(bookings.keySet());
        Map<Long, FlightSchedule> schedules = byId(scheduleRepository.findAllWithDetailsByIdIn(
                details.stream().flatMap(d -> d.getSegments().stream())
                        .map(FlightBookingSegment::getScheduleId).distinct().toList()),
                FlightSchedule::getId);
        Map<String, FlightRoute> routeImages = routeImages(details, schedules);

        return details.stream().collect(Collectors.toMap(FlightBookingDetail::getBookingId,
                detail -> flightBlock(detail, bookings.get(detail.getBookingId()), schedules, routeImages)));
    }

    /** Ảnh minh hoạ của đơn vé: chặng bay phổ biến (theo độ phổ biến) tới điểm đến của chiều đi. */
    private Map<String, FlightRoute> routeImages(List<FlightBookingDetail> details,
            Map<Long, FlightSchedule> schedules) {
        List<String> destinations = details.stream().map(d -> destinationCode(d, schedules)).distinct().toList();
        Map<String, FlightRoute> images = new HashMap<>();
        routeRepository.findByDestinationCodes(destinations)
                .forEach(route -> images.putIfAbsent(route.getToAirport().getCode(), route));
        return images;
    }

    private static String destinationCode(FlightBookingDetail detail, Map<Long, FlightSchedule> schedules) {
        return schedules.get(detail.getSegments().get(0).getScheduleId()).getToAirport().getCode();
    }

    private FlightBookingResponse flightBlock(FlightBookingDetail detail, Booking booking,
            Map<Long, FlightSchedule> schedules, Map<String, FlightRoute> routeImages) {
        List<FlightSegmentResponse> segments = detail.getSegments().stream().map(segment -> {
            FlightSchedule schedule = schedules.get(segment.getScheduleId());
            FlightFareCalculator.Arrival arrival = FlightFareCalculator.arrival(schedule.getDepartTime(),
                    schedule.getDurationMinutes());
            return mapper.toSegment(segment, schedule, arrival.time(), arrival.nextDay());
        }).toList();
        List<FlightFaresResponse> fares = segments.stream().map(FlightSegmentResponse::fares).toList();
        List<PassengerType> passengerTypes = booking.getTravelers().stream()
                .map(BookingTraveler::getPassengerType).toList();
        FlightRoute route = routeImages.get(destinationCode(detail, schedules));

        return new FlightBookingResponse(detail.getCabin(), route == null ? null : route.getImageUrl(),
                route == null ? null : route.getImageAlt(), segments, mapper.toPassengers(booking.getTravelers()),
                FlightPricing.priceLines(fares, passengerTypes));
    }

    private static <T> Map<Long, T> byId(List<T> items, Function<T, Long> id) {
        return items.stream().collect(Collectors.toMap(id, Function.identity()));
    }
}
