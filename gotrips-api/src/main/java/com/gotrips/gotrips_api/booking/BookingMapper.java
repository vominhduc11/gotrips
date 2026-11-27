package com.gotrips.gotrips_api.booking;

import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import com.gotrips.gotrips_api.config.MapStructConfig;
import com.gotrips.gotrips_api.flight.FlightFaresResponse;
import com.gotrips.gotrips_api.flight.FlightMapper;
import com.gotrips.gotrips_api.flight.FlightSchedule;
import com.gotrips.gotrips_api.hotel.Hotel;
import com.gotrips.gotrips_api.hotel.HotelRoomType;
import com.gotrips.gotrips_api.tour.Tour;
import com.gotrips.gotrips_api.tour.TourDeparture;
import com.gotrips.gotrips_api.user.User;

/** Đơn + dữ liệu danh mục hiện tại → response. Giá luôn lấy từ đơn (đã chốt), không lấy từ danh mục. */
@Mapper(config = MapStructConfig.class, uses = FlightMapper.class)
public interface BookingMapper {

    @Mapping(target = "fullName", source = "contactName")
    @Mapping(target = "email", source = "contactEmail")
    @Mapping(target = "phone", source = "contactPhone")
    BookingContactResponse toContact(Booking booking);

    BookingTravelerResponse toTraveler(BookingTraveler traveler);

    List<BookingTravelerResponse> toTravelers(List<BookingTraveler> travelers);

    @Mapping(target = "type", source = "passengerType")
    BookingPassengerResponse toPassenger(BookingTraveler traveler);

    List<BookingPassengerResponse> toPassengers(List<BookingTraveler> travelers);

    @Mapping(target = "departureId", source = "departure.id")
    @Mapping(target = "tourSlug", source = "tour.slug")
    @Mapping(target = "tourTitle", source = "tour.title")
    @Mapping(target = "destinationName", source = "tour.destination.name")
    @Mapping(target = "coverImage", source = "tour.coverImageUrl")
    @Mapping(target = "coverImageAlt", source = "tour.coverImageAlt")
    @Mapping(target = "departureCity", source = "tour.departureCity")
    @Mapping(target = "durationDays", source = "tour.durationDays")
    @Mapping(target = "durationNights", source = "tour.durationNights")
    @Mapping(target = "departureDate", source = "departure.departureDate")
    @Mapping(target = "guests", source = "detail.guests")
    @Mapping(target = "unitPrice", source = "detail.unitPrice")
    @Mapping(target = "travelers", source = "travelers")
    TourBookingResponse toTour(TourBookingDetail detail, TourDeparture departure, Tour tour,
            List<BookingTravelerResponse> travelers);

    @Mapping(target = "roomTypeId", source = "roomType.id")
    @Mapping(target = "roomTypeName", source = "roomType.name")
    @Mapping(target = "hotelSlug", source = "hotel.slug")
    @Mapping(target = "hotelName", source = "hotel.name")
    @Mapping(target = "destinationName", source = "hotel.destination.name")
    @Mapping(target = "area", source = "hotel.area")
    @Mapping(target = "imageUrl", source = "hotel.imageUrl")
    @Mapping(target = "imageAlt", source = "hotel.imageAlt")
    @Mapping(target = "checkInTime", source = "hotel.checkInTime", dateFormat = "HH:mm")
    @Mapping(target = "checkOutTime", source = "hotel.checkOutTime", dateFormat = "HH:mm")
    @Mapping(target = "checkIn", source = "detail.checkIn")
    @Mapping(target = "checkOut", source = "detail.checkOut")
    @Mapping(target = "nights", source = "detail.nights")
    @Mapping(target = "rooms", source = "detail.rooms")
    @Mapping(target = "guests", source = "detail.guests")
    @Mapping(target = "pricePerNight", source = "detail.pricePerNight")
    @Mapping(target = "guestName", source = "detail.guestName")
    HotelBookingResponse toHotel(HotelBookingDetail detail, HotelRoomType roomType, Hotel hotel);

    @Mapping(target = "adult", source = "adultFare")
    @Mapping(target = "child", source = "childFare")
    @Mapping(target = "infant", source = "infantFare")
    FlightFaresResponse toFares(FlightBookingSegment segment);

    /** Giờ hạ cánh suy ra từ lịch bay nên truyền riêng. */
    @Mapping(target = "scheduleId", source = "schedule.id")
    @Mapping(target = "airline", source = "schedule.airline")
    @Mapping(target = "flightNumber", source = "schedule.flightNumber")
    @Mapping(target = "from", source = "schedule.fromAirport")
    @Mapping(target = "to", source = "schedule.toAirport")
    @Mapping(target = "date", source = "segment.flightDate")
    @Mapping(target = "departTime", source = "schedule.departTime", dateFormat = "HH:mm")
    @Mapping(target = "arriveTime", source = "arriveTime", dateFormat = "HH:mm")
    @Mapping(target = "arrivesNextDay", source = "arrivesNextDay")
    @Mapping(target = "durationMinutes", source = "schedule.durationMinutes")
    @Mapping(target = "fares", source = "segment")
    FlightSegmentResponse toSegment(FlightBookingSegment segment, FlightSchedule schedule, LocalTime arriveTime,
            boolean arrivesNextDay);

    @Mapping(target = "code", source = "booking.code")
    @Mapping(target = "kind", source = "booking.kind")
    @Mapping(target = "status", source = "booking.status")
    @Mapping(target = "paymentStatus", source = "booking.payment.status")
    @Mapping(target = "totalAmount", source = "booking.totalAmount")
    @Mapping(target = "createdAt", source = "booking.createdAt")
    @Mapping(target = "tour", source = "tour")
    @Mapping(target = "hotel", source = "hotel")
    @Mapping(target = "flight", source = "flight")
    BookingSummaryResponse toSummary(Booking booking, TourBookingResponse tour, HotelBookingResponse hotel,
            FlightBookingResponse flight);

    /** Chi tiết = các trường của dòng danh sách (đã dựng) + phần chỉ trang chi tiết cần. */
    @Mapping(target = "code", source = "summary.code")
    @Mapping(target = "kind", source = "summary.kind")
    @Mapping(target = "status", source = "summary.status")
    @Mapping(target = "paymentStatus", source = "summary.paymentStatus")
    @Mapping(target = "totalAmount", source = "summary.totalAmount")
    @Mapping(target = "createdAt", source = "summary.createdAt")
    @Mapping(target = "tour", source = "summary.tour")
    @Mapping(target = "hotel", source = "summary.hotel")
    @Mapping(target = "flight", source = "summary.flight")
    @Mapping(target = "contact", source = "booking")
    @Mapping(target = "note", source = "booking.note")
    @Mapping(target = "paidAt", source = "booking.payment.paidAt")
    @Mapping(target = "confirmedAt", source = "booking.confirmedAt")
    @Mapping(target = "cancelledAt", source = "booking.cancelledAt")
    @Mapping(target = "bankTransfer", source = "bankTransfer")
    BookingDetailResponse toDetail(BookingSummaryResponse summary, Booking booking, BankTransferResponse bankTransfer);

    @Mapping(target = ".", source = "summary")
    @Mapping(target = "availableActions", source = "actions")
    AdminBookingSummaryResponse toAdminSummary(BookingSummaryResponse summary, UUID customerId,
            BookingContactResponse contact, List<BookingTransitions.Action> actions);

    @Mapping(target = ".", source = "detail")
    @Mapping(target = "customer", source = "customer")
    @Mapping(target = "availableActions", source = "actions")
    AdminBookingDetailResponse toAdminDetail(BookingDetailResponse detail, AdminBookingDetailResponse.Customer customer,
            List<BookingTransitions.Action> actions);

    AdminBookingDetailResponse.Customer toAdminCustomer(User user, boolean hasCustomerProfile);
}
