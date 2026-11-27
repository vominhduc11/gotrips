-- DỮ LIỆU MẪU cho dev/Docker — KHÔNG chạy ở production.
--
-- Migration lặp lại (Flyway `R__`) nằm ngoài `db/migration`; chỉ được nạp khi bật profile `seed`
-- (xem `application-seed.yaml`). Chạy SAU mọi migration schema nên luôn viết theo schema mới nhất.
--
-- Dữ liệu minh hoạ cho dev/Docker (hãng bay là TÊN GIẢ, giá không phải giá bán). `SeedDataTests` kiểm các giá trị này.
-- Ngày khởi hành cố định (01–04/2027) nên tour sẽ dần biến mất khỏi "nổi bật" khi các ngày này lùi vào quá khứ.
--
-- Idempotent: `ON CONFLICT DO NOTHING` nên không ghi đè dữ liệu đã sửa trong DB. Muốn nạp lại seed đã đổi:
-- `docker compose down -v` rồi chạy lại. Id được chèn tường minh nên cuối file đưa sequence lên MAX(id),
-- nếu không bản ghi tạo sau này sẽ đụng khoá chính.

INSERT INTO destinations (id, slug, name, region, image_url, image_alt) VALUES
    (1, 'da-lat', 'Đà Lạt', 'Tây Nguyên', 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=75', 'Những ngọn đồi xanh phủ mây mỏng vùng cao nguyên'),
    (2, 'phu-quoc', 'Phú Quốc', 'Miền Nam', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=75', 'Bãi biển lúc bình minh, sóng nhẹ vỗ vào bờ cát'),
    (3, 'ha-long', 'Hạ Long', 'Miền Bắc', 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?auto=format&fit=crop&w=1600&q=75', 'Ngôi đình nhỏ bên hồ nước giữa những dãy núi đá vôi'),
    (4, 'sapa', 'Sapa', 'Tây Bắc', 'https://images.unsplash.com/photo-1570366583862-f91883984fde?auto=format&fit=crop&w=1600&q=75', 'Ruộng bậc thang và bản làng nhìn từ trên cao'),
    (5, 'hoi-an', 'Hội An', 'Miền Trung', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=75', 'Cầu Vàng trên đồi Bà Nà, Đà Nẵng'),
    (6, 'nha-trang', 'Nha Trang', 'Miền Trung', 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=75', 'Bãi biển nhiệt đới với hàng dừa và ô che nắng')
ON CONFLICT DO NOTHING;

INSERT INTO airports (code, name, city, sort_order) VALUES
    ('SGN', 'Sân bay Tân Sơn Nhất', 'TP. Hồ Chí Minh', 1),
    ('HAN', 'Sân bay Nội Bài', 'Hà Nội', 2),
    ('DAD', 'Sân bay quốc tế Đà Nẵng', 'Đà Nẵng', 3),
    ('CXR', 'Sân bay quốc tế Cam Ranh', 'Nha Trang', 4),
    ('PQC', 'Sân bay quốc tế Phú Quốc', 'Phú Quốc', 5),
    ('DLI', 'Sân bay Liên Khương', 'Đà Lạt', 6),
    ('HPH', 'Sân bay quốc tế Cát Bi', 'Hải Phòng', 7),
    ('VDO', 'Sân bay quốc tế Vân Đồn', 'Quảng Ninh', 8),
    ('HUI', 'Sân bay quốc tế Phú Bài', 'Huế', 9),
    ('VII', 'Sân bay quốc tế Vinh', 'Vinh', 10),
    ('UIH', 'Sân bay Phù Cát', 'Quy Nhơn', 11),
    ('VCA', 'Sân bay quốc tế Cần Thơ', 'Cần Thơ', 12)
ON CONFLICT DO NOTHING;

INSERT INTO tours (id, slug, title, destination_id, duration_days, duration_nights, departure_city, short_description, cover_image_url, cover_image_alt, rating, review_count, is_featured, status) VALUES
    (1, 'da-lat-3n2d-thanh-pho-ngan-hoa', 'Đà Lạt 3N2Đ – Thành phố ngàn hoa', 1, 3, 2, 'TP. Hồ Chí Minh', 'Dạo đồi chè Cầu Đất, thung lũng Tình Yêu và thưởng thức ẩm thực phố núi trong 3 ngày thong thả.', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1600&q=75', 'Con đường mòn xuyên qua khu rừng xanh mát', 4.8, 312, true, 'ACTIVE'),
    (2, 'da-lat-2n1d-san-may-trekking', 'Đà Lạt 2N1Đ – Săn mây & trekking rừng thông', 1, 2, 1, 'TP. Hồ Chí Minh', 'Dậy sớm săn mây, trekking xuyên rừng thông và cắm trại bên hồ — dành cho người thích khám phá.', 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1600&q=75', 'Khu rừng phủ sương mù buổi sớm', 4.7, 128, true, 'ACTIVE'),
    (3, 'phu-quoc-4n3d-dao-ngoc-nghi-duong', 'Phú Quốc 4N3Đ – Đảo ngọc nghỉ dưỡng', 2, 4, 3, 'TP. Hồ Chí Minh', 'Nghỉ dưỡng resort ven biển, tham quan hòn đảo nhỏ bằng cano và ngắm hoàng hôn Sunset Sanato.', 'https://images.unsplash.com/photo-1559128010-7c1ad6e1b6a5?auto=format&fit=crop&w=1600&q=75', 'Hòn đảo nhỏ phủ cây xanh giữa làn nước biển màu ngọc', 4.9, 245, true, 'ACTIVE'),
    (4, 'nha-trang-3n2d-lan-ngam-san-ho', 'Nha Trang 3N2Đ – Lặn ngắm san hô', 6, 3, 2, 'TP. Hồ Chí Minh', 'Hòa mình xuống làn nước trong xanh, ngắm san hô và đàn cá nhiệt đới cùng huấn luyện viên lặn.', 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1600&q=75', 'Thợ lặn bơi giữa đàn cá dưới biển', 4.6, 187, true, 'ACTIVE'),
    (5, 'ha-long-2n1d-du-thuyen-ngu-dem', 'Hạ Long 2N1Đ – Du thuyền ngủ đêm trên vịnh', 3, 2, 1, 'Hà Nội', 'Ngủ đêm trên du thuyền, chèo kayak khám phá hang động và ngắm bình minh giữa vịnh.', 'https://images.unsplash.com/photo-1504457047772-27faf1c00561?auto=format&fit=crop&w=1600&q=75', 'Làng quê soi bóng bên hồ dưới chân núi đá vôi', 4.8, 356, true, 'ACTIVE'),
    (6, 'sapa-3n2d-ban-cat-cat-ruong-bac-thang', 'Sapa 3N2Đ – Bản Cát Cát & ruộng bậc thang', 4, 3, 2, 'Hà Nội', 'Đi bộ qua những thửa ruộng bậc thang, ghé bản làng người H''Mông và thưởng thức đặc sản vùng cao.', 'https://images.unsplash.com/photo-1559628233-100c798642d4?auto=format&fit=crop&w=1600&q=75', 'Những thửa ruộng bậc thang xanh trải dài trên sườn núi', 4.7, 204, true, 'ACTIVE'),
    (7, 'sapa-4n3d-chinh-phuc-fansipan', 'Sapa 4N3Đ – Chinh phục Fansipan', 4, 4, 3, 'Hà Nội', 'Hành trình trekking chinh phục nóc nhà Đông Dương dành cho người có sức khoẻ tốt.', 'https://images.unsplash.com/photo-1558005530-a7958896ec60?auto=format&fit=crop&w=1600&q=75', 'Những thửa ruộng bậc thang xanh dưới nền núi mờ sương', 4.9, 74, true, 'HIDDEN'),
    (8, 'hoi-an-da-nang-4n3d-ba-na-pho-co', 'Đà Nẵng – Hội An 4N3Đ – Bà Nà & phố cổ', 5, 4, 3, 'Hà Nội', 'Check-in Cầu Vàng trên Bà Nà Hills, dạo phố cổ Hội An về đêm và thả hoa đăng trên sông Hoài.', 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=75', 'Cầu Vàng nâng bởi đôi bàn tay đá khổng lồ trên đồi Bà Nà', 4.8, 298, true, 'ACTIVE'),
    (9, 'ha-long-ninh-binh-3n2d-hai-di-san', 'Hạ Long – Ninh Bình 3N2Đ – Hai di sản một hành trình', 3, 3, 2, 'Hà Nội', 'Kết hợp vịnh Hạ Long và quần thể Tràng An – Tam Cốc, trọn vẹn núi non sông nước miền Bắc.', 'https://images.unsplash.com/photo-1557750255-c76072a7aad1?auto=format&fit=crop&w=1600&q=75', 'Ngôi đình nhỏ bên hồ nước giữa những dãy núi đá vôi', 4.5, 96, true, 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO tour_departures (id, tour_id, departure_date, price, original_price, total_seats, booked_seats) VALUES
    (1, 1, DATE '2027-01-09', 3190000, NULL, 20, 20),
    (2, 1, DATE '2027-01-23', 3490000, NULL, 20, 11),
    (3, 1, DATE '2027-02-20', 3390000, NULL, 20, 6),
    (4, 1, DATE '2027-03-13', 3290000, NULL, 20, 16),
    (5, 2, DATE '2027-01-16', 2190000, NULL, 16, 9),
    (6, 2, DATE '2027-02-27', 2290000, NULL, 16, 12),
    (7, 2, DATE '2027-03-20', 2390000, NULL, 16, 4),
    (8, 3, DATE '2027-01-14', 8990000, 10990000, 24, 14),
    (9, 3, DATE '2027-02-25', 9490000, 11490000, 24, 20),
    (10, 3, DATE '2027-04-08', 8490000, 10490000, 24, 9),
    (11, 4, DATE '2027-01-30', 4590000, NULL, 18, 7),
    (12, 4, DATE '2027-03-06', 4790000, NULL, 18, 12),
    (13, 4, DATE '2027-04-24', 4490000, NULL, 18, 16),
    (14, 5, DATE '2027-01-17', 3890000, NULL, 20, 17),
    (15, 5, DATE '2027-02-28', 4190000, NULL, 20, 8),
    (16, 5, DATE '2027-03-27', 3990000, NULL, 20, 10),
    (17, 6, DATE '2027-01-22', 3990000, NULL, 16, 6),
    (18, 6, DATE '2027-02-19', 4290000, NULL, 16, 10),
    (19, 6, DATE '2027-03-12', 4090000, NULL, 16, 13),
    (20, 7, DATE '2027-01-29', 5490000, NULL, 12, 5),
    (21, 7, DATE '2027-03-05', 5690000, NULL, 12, 10),
    (22, 8, DATE '2027-01-21', 6290000, NULL, 22, 9),
    (23, 8, DATE '2027-02-18', 6490000, NULL, 22, 15),
    (24, 8, DATE '2027-03-18', 6190000, NULL, 22, 22),
    (25, 8, DATE '2027-04-15', 6390000, NULL, 22, 10),
    (26, 9, DATE '2027-01-31', 4290000, NULL, 18, 8),
    (27, 9, DATE '2027-03-07', 4490000, NULL, 18, 10)
ON CONFLICT DO NOTHING;

-- Nét riêng không phải tiện ích chuẩn (nước ấm, có phí, vô cực, lớp làm đèn lồng...) ghi trong phần giới thiệu; tiện ích
-- chuẩn gắn ở bảng hotel_amenities bên dưới.
INSERT INTO hotels (id, slug, name, destination_id, star_rating, area, image_url, image_alt, status, rating, review_count, description, check_in_time, check_out_time) VALUES
    (1, 'khach-san-doi-may-da-lat', 'Khách sạn Đồi Mây', 1, 4, 'Phường 3, Đà Lạt', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=75', 'Khu nghỉ dưỡng mái ngói gỗ bên hồ bơi lúc hoàng hôn', 'ACTIVE', 4.6, 1280, 'Khách sạn nằm trên đồi thông yên tĩnh, cách chợ Đà Lạt khoảng 10 phút đi xe. Phòng hướng đồi, sáng sớm nhìn thấy sương mù phủ thung lũng. Khách sạn có hồ bơi nước ấm, bữa sáng buffet, Wi-Fi miễn phí và dịch vụ đưa đón sân bay (có phí).', TIME '14:00', TIME '12:00'),
    (2, 'villa-thong-xanh-da-lat', 'Villa Thông Xanh', 1, 3, 'Phường 9, Đà Lạt', 'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1600&q=75', 'Mặt tiền khách sạn nhiều ban công, trước nhà có hàng cọ', 'ACTIVE', 4.3, 640, 'Biệt thự kiểu Pháp nhỏ xinh giữa rừng thông, phù hợp cho cặp đôi và nhóm bạn muốn không gian riêng, gần hồ Tuyền Lâm. Khách được dùng Wi-Fi miễn phí.', TIME '14:00', TIME '11:00'),
    (3, 'resort-bai-sao-phu-quoc', 'Resort Bãi Sao', 2, 5, 'Bãi Sao, Phú Quốc', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi sát biển với ghế dài và dù che nắng trên sàn gỗ', 'ACTIVE', 4.8, 2150, 'Khu nghỉ dưỡng sát bãi Sao — một trong những bãi cát trắng đẹp nhất Phú Quốc. Có biệt thự hồ bơi riêng cho gia đình. Resort có bãi biển riêng, hồ bơi vô cực và nhà hàng hải sản.', TIME '15:00', TIME '12:00'),
    (4, 'khach-san-hoang-hon-phu-quoc', 'Khách sạn Hoàng Hôn', 2, 4, 'Dương Đông, Phú Quốc', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=75', 'Toà nhà màu trắng và hàng cọ dưới bầu trời hoàng hôn', 'ACTIVE', 4.5, 930, 'Khách sạn ở trung tâm Dương Đông, đi bộ ra chợ đêm Phú Quốc, ngắm hoàng hôn trên biển từ quầy bar sân thượng. Hồ bơi cũng nằm trên sân thượng, Wi-Fi miễn phí.', TIME '14:00', TIME '12:00'),
    (5, 'khach-san-vinh-xanh-ha-long', 'Khách sạn Vịnh Xanh', 3, 4, 'Bãi Cháy, Hạ Long', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi giữa vườn cọ, phía xa là dãy núi đá', 'ACTIVE', 4.4, 780, 'Khách sạn ở Bãi Cháy, nhìn ra vịnh Hạ Long, gần bến tàu du thuyền và cầu Bãi Cháy. Lễ tân hỗ trợ đặt tour du thuyền trên vịnh.', TIME '14:00', TIME '12:00'),
    (6, 'khach-san-may-ngan-sapa', 'Khách sạn Mây Ngàn', 4, 3, 'Thị xã Sa Pa, Lào Cai', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=75', 'Sảnh kính sáng đèn bên hồ bơi lúc trời tối', 'ACTIVE', 4.2, 410, 'Khách sạn trên sườn núi ở trung tâm thị xã Sa Pa, phòng có cửa kính lớn nhìn thung lũng Mường Hoa. Nhà hàng phục vụ món vùng cao, Wi-Fi miễn phí, khách sạn hỗ trợ đặt tour trekking.', TIME '14:00', TIME '12:00'),
    (7, 'khach-san-pho-hoa-dang-hoi-an', 'Khách sạn Phố Hoa Đăng', 5, 4, 'Phường Minh An, Hội An', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=75', 'Toà nhà kiểu cổ điển màu trắng bên hồ bơi lúc chạng vạng', 'ACTIVE', 4.7, 1560, 'Khách sạn mang phong cách phố cổ, cách Chùa Cầu vài bước chân, có lớp học làm đèn lồng cho khách. Xe đạp cho khách mượn miễn phí.', TIME '14:00', TIME '12:00'),
    (8, 'resort-bien-xanh-nha-trang', 'Resort Biển Xanh', 6, 5, 'Trần Phú, Nha Trang', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi lát gạch xanh về đêm, phía sau là sảnh kính', 'HIDDEN', 4.9, 3020, 'Resort trên đường Trần Phú nhìn thẳng ra vịnh Nha Trang.', TIME '14:00', TIME '12:00')
ON CONFLICT DO NOTHING;

INSERT INTO hotel_room_types (id, hotel_id, name, price_per_night, max_guests, bed_type, area_m2, total_rooms) VALUES
    (1, 1, 'Phòng Deluxe', 1250000, 2, '1 giường đôi lớn', 28, 12),
    (2, 1, 'Phòng Gia đình', 1980000, 4, '2 giường đôi', 42, 6),
    (3, 2, 'Phòng Standard', 690000, 2, '1 giường đôi', 22, 10),
    (4, 2, 'Phòng Hướng đồi', 850000, 3, '1 giường đôi + 1 giường đơn', 30, 8),
    (5, 3, 'Phòng Hướng vườn', 3200000, 2, '1 giường đôi lớn', 40, 20),
    (6, 3, 'Phòng Hướng biển', 4100000, 3, '1 giường đôi lớn + 1 sofa giường', 48, 15),
    (7, 3, 'Biệt thự hồ bơi riêng', 7800000, 6, '3 phòng ngủ, hồ bơi riêng', 160, 4),
    (8, 4, 'Phòng Superior', 1450000, 2, '1 giường đôi', 26, 14),
    (9, 4, 'Phòng Deluxe có ban công', 1850000, 3, '1 giường đôi lớn + 1 giường đơn', 34, 10),
    (10, 5, 'Phòng Superior', 1100000, 2, '1 giường đôi', 25, 16),
    (11, 5, 'Phòng Hướng vịnh', 1650000, 3, '1 giường đôi + 1 giường đơn', 32, 10),
    (12, 6, 'Phòng Standard', 780000, 2, '1 giường đôi', 20, 12),
    (13, 6, 'Phòng Hướng thung lũng', 1050000, 3, '1 giường đôi + 1 giường đơn', 28, 8),
    (14, 7, 'Phòng Deluxe', 1350000, 2, '1 giường đôi lớn', 30, 14),
    (15, 7, 'Phòng Gia đình', 2100000, 4, '2 giường đôi', 45, 6),
    (16, 8, 'Phòng Hướng biển', 3600000, 3, '1 giường đôi lớn + 1 giường đơn', 38, 10),
    (17, 8, 'Suite Biển', 6200000, 4, '2 giường đôi, phòng khách riêng', 70, 5)
ON CONFLICT DO NOTHING;

-- Danh mục tiện ích chuẩn. `code` là khoá nghiệp vụ (web chọn biểu tượng theo code nên đổi code phải đổi cả web).
-- `scope`: gắn cho khách sạn (HOTEL), loại phòng (ROOM) hay cả hai; DB không ép được ở bảng nối, SeedDataTests canh.
INSERT INTO amenities (id, code, name, scope, sort_order) VALUES
    (1, 'pool', 'Hồ bơi', 'HOTEL', 10),
    (2, 'beach', 'Bãi biển', 'HOTEL', 20),
    (3, 'spa', 'Spa', 'HOTEL', 30),
    (4, 'gym', 'Phòng gym', 'HOTEL', 40),
    (5, 'restaurant', 'Nhà hàng', 'HOTEL', 50),
    (6, 'bar', 'Quầy bar', 'HOTEL', 60),
    (7, 'breakfast', 'Bữa sáng', 'HOTEL', 70),
    (8, 'wifi', 'Wi-Fi', 'BOTH', 80),
    (9, 'kids-club', 'Câu lạc bộ trẻ em', 'HOTEL', 90),
    (10, 'garden-bbq', 'Sân vườn & BBQ', 'HOTEL', 100),
    (11, 'fireplace', 'Lò sưởi', 'HOTEL', 110),
    (12, 'parking', 'Bãi đỗ xe', 'HOTEL', 120),
    (13, 'airport-shuttle', 'Đưa đón sân bay', 'HOTEL', 130),
    (14, 'motorbike-rental', 'Cho thuê xe máy', 'HOTEL', 140),
    (15, 'bicycle', 'Xe đạp', 'HOTEL', 150),
    (16, 'tour-desk', 'Đặt tour', 'HOTEL', 160),
    (17, 'air-conditioning', 'Điều hoà', 'ROOM', 170),
    (18, 'tv', 'TV', 'ROOM', 180),
    (19, 'minibar', 'Minibar', 'ROOM', 190),
    (20, 'kettle', 'Ấm đun nước', 'ROOM', 200),
    (21, 'bathtub', 'Bồn tắm', 'ROOM', 210),
    (22, 'balcony', 'Ban công', 'ROOM', 220),
    (23, 'safe', 'Két an toàn', 'ROOM', 230)
ON CONFLICT DO NOTHING;

INSERT INTO hotel_amenities (hotel_id, amenity_id)
SELECT v.owner_id, a.id FROM (VALUES
    (1, 'pool'), (1, 'breakfast'), (1, 'wifi'), (1, 'parking'), (1, 'airport-shuttle'),
    (2, 'breakfast'), (2, 'wifi'), (2, 'garden-bbq'), (2, 'motorbike-rental'),
    (3, 'pool'), (3, 'beach'), (3, 'spa'), (3, 'restaurant'), (3, 'kids-club'),
    (4, 'pool'), (4, 'bar'), (4, 'breakfast'), (4, 'wifi'),
    (5, 'pool'), (5, 'gym'), (5, 'restaurant'), (5, 'tour-desk'),
    (6, 'restaurant'), (6, 'wifi'), (6, 'fireplace'), (6, 'tour-desk'),
    (7, 'pool'), (7, 'breakfast'), (7, 'bicycle'),
    (8, 'pool'), (8, 'beach'), (8, 'spa')
) AS v (owner_id, code)
JOIN amenities a ON a.code = v.code
ON CONFLICT DO NOTHING;

INSERT INTO hotel_room_type_amenities (room_type_id, amenity_id)
SELECT v.owner_id, a.id FROM (VALUES
    (1, 'wifi'), (1, 'tv'), (1, 'kettle'), (1, 'bathtub'), (1, 'safe'),
    (2, 'wifi'), (2, 'tv'), (2, 'minibar'), (2, 'kettle'), (2, 'bathtub'),
    (3, 'wifi'), (3, 'tv'), (3, 'kettle'),
    (4, 'wifi'), (4, 'tv'), (4, 'kettle'), (4, 'balcony'),
    (5, 'wifi'), (5, 'air-conditioning'), (5, 'minibar'), (5, 'kettle'), (5, 'bathtub'), (5, 'safe'),
    (6, 'wifi'), (6, 'air-conditioning'), (6, 'minibar'), (6, 'bathtub'), (6, 'balcony'), (6, 'safe'),
    (7, 'wifi'), (7, 'air-conditioning'), (7, 'tv'), (7, 'minibar'), (7, 'bathtub'), (7, 'safe'),
    (8, 'wifi'), (8, 'air-conditioning'), (8, 'tv'), (8, 'kettle'),
    (9, 'wifi'), (9, 'air-conditioning'), (9, 'tv'), (9, 'minibar'), (9, 'bathtub'), (9, 'balcony'),
    (10, 'wifi'), (10, 'air-conditioning'), (10, 'tv'), (10, 'safe'),
    (11, 'wifi'), (11, 'air-conditioning'), (11, 'tv'), (11, 'kettle'), (11, 'bathtub'), (11, 'balcony'),
    (12, 'wifi'), (12, 'tv'), (12, 'kettle'),
    (13, 'wifi'), (13, 'tv'), (13, 'kettle'), (13, 'balcony'),
    (14, 'wifi'), (14, 'air-conditioning'), (14, 'tv'), (14, 'kettle'), (14, 'bathtub'), (14, 'safe'),
    (15, 'wifi'), (15, 'air-conditioning'), (15, 'tv'), (15, 'minibar'), (15, 'kettle'),
    (16, 'wifi'), (16, 'air-conditioning'), (16, 'tv'), (16, 'balcony'), (16, 'safe'),
    (17, 'wifi'), (17, 'air-conditioning'), (17, 'tv'), (17, 'minibar'), (17, 'bathtub'), (17, 'safe')
) AS v (owner_id, code)
JOIN amenities a ON a.code = v.code
ON CONFLICT DO NOTHING;

-- Ảnh xem thêm (không gồm ảnh đại diện của khách sạn). Ảnh TẠM từ Unsplash, phải thay trước khi ra mắt. Id tự sinh:
-- UNIQUE (chủ, sort_order) + ON CONFLICT DO NOTHING giúp Flyway chạy lại file này mà không nhân đôi ảnh.
INSERT INTO hotel_images (hotel_id, sort_order, image_url, image_alt) VALUES
    (1, 0, 'https://images.unsplash.com/photo-1529290130-4ca3753253ae?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi trong nhà với khu ghế nghỉ và vách gỗ'),
    (1, 1, 'https://images.unsplash.com/photo-1445019980597-93fa8acb246c?auto=format&fit=crop&w=1600&q=75', 'Hai ghế nằm có khăn gấp sẵn, nhìn ra dãy núi lúc chiều'),
    (1, 2, 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1600&q=75', 'Bàn bữa sáng nhiều món với bánh waffle trái cây, trứng và nước cam'),
    (1, 3, 'https://images.unsplash.com/photo-1573052905904-34ad8c27f0cc?auto=format&fit=crop&w=1600&q=75', 'Sảnh khách sạn kiểu cổ điển với cửa vòm, bậc thang trải thảm và cây cảnh'),
    (2, 0, 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1600&q=75', 'Căn nhà gỗ nhỏ giữa rừng thông'),
    (2, 1, 'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=1600&q=75', 'Phòng khách thông bếp với sofa da màu nâu và nhiều cây xanh'),
    (2, 2, 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?auto=format&fit=crop&w=1600&q=75', 'Ngôi nhà gỗ lớn bên bãi cỏ rộng lúc chiều tà'),
    (2, 3, 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=1600&q=75', 'Đĩa bữa sáng gồm bánh mì nướng, trứng ốp la, cà chua và rau xanh'),
    (3, 0, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi vô cực sát biển với ghế tắm nắng trên sàn gỗ dưới tán cây'),
    (3, 1, 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi uốn lượn trên cao nhìn ra biển xanh, quanh là hàng dừa và ô trắng'),
    (3, 2, 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1600&q=75', 'Khách đang được massage với tinh dầu tại spa'),
    (3, 3, 'https://images.unsplash.com/photo-1537726235470-8504e3beef77?auto=format&fit=crop&w=1600&q=75', 'Phòng ăn tường kính nhìn thẳng ra biển lúc hoàng hôn'),
    (3, 4, 'https://images.unsplash.com/photo-1561501900-3701fa6a0864?auto=format&fit=crop&w=1600&q=75', 'Khu nghỉ dưỡng ven biển với hồ bơi và ghế nằm dưới bầu trời hoàng hôn màu hồng'),
    (4, 0, 'https://images.unsplash.com/photo-1572331165267-854da2b10ccc?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi trên sân thượng lúc hoàng hôn với hàng ghế tắm nắng và ô'),
    (4, 1, 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=1600&q=75', 'Quầy bar gỗ với kệ đồ uống và bảng thực đơn viết phấn'),
    (4, 2, 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=1600&q=75', 'Ly cocktail với viên đá lớn đang được rót trên quầy bar'),
    (4, 3, 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=1600&q=75', 'Lát bánh mì nướng phủ bơ và trứng ốp la'),
    (5, 0, 'https://images.unsplash.com/photo-1568084680786-a84f91d1153c?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi lớn và vườn nhiệt đới trước các toà nhà khách sạn'),
    (5, 1, 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1600&q=75', 'Phòng tập với giá tạ tay dài và các máy tập'),
    (5, 2, 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1600&q=75', 'Nhà hàng với bàn gỗ, ghế bọc đen và ánh đèn ấm'),
    (5, 3, 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=1600&q=75', 'Phòng chờ ốp gỗ sang trọng với sofa và đèn bàn'),
    (6, 0, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=75', 'Phòng khách sáng với ghế bành bên cửa sổ góc, phía trong là lò sưởi đang cháy'),
    (6, 1, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1600&q=75', 'Quán ăn không gian mở với bàn ghế gỗ, trần cao và cửa kính nhìn ra cây xanh'),
    (6, 2, 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1600&q=75', 'Bàn ăn bày món, ly vang và giỏ bánh mì'),
    (7, 0, 'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?auto=format&fit=crop&w=1600&q=75', 'Sân trong khách sạn với hồ bơi có đài phun nước và hàng cọ'),
    (7, 1, 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi trong vườn cây xanh, có ghế nằm và ô che nắng'),
    (7, 2, 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1600&q=75', 'Chiếc xe đạp khung trắng dựng sát bức tường tối màu'),
    (7, 3, 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?auto=format&fit=crop&w=1600&q=75', 'Bàn bữa sáng nhiều món với bánh waffle trái cây, trứng và nước cam'),
    (8, 0, 'https://images.unsplash.com/photo-1549294413-26f195200c16?auto=format&fit=crop&w=1600&q=75', 'Dãy phòng khu nghỉ dưỡng nằm giữa những hàng dừa cao'),
    (8, 1, 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1600&q=75', 'Khăn tắm cuộn, chai dưỡng thể, nến và bó tulip hồng'),
    (8, 2, 'https://images.unsplash.com/photo-1469796466635-455ede028aca?auto=format&fit=crop&w=1600&q=75', 'Sân hiên nhìn ra biển với hai chiếc ghế và giàn hoa giấy')
ON CONFLICT DO NOTHING;

INSERT INTO hotel_room_type_images (room_type_id, sort_order, image_url, image_alt) VALUES
    (1, 0, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ trang nhã với ghế bành màu mù tạt, bàn làm việc và băng ghế xanh cuối giường'),
    (1, 1, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm trắng với bồn tắm nằm độc lập, chậu rửa tròn và cây xanh'),
    (2, 0, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1600&q=75', 'Phòng rộng kê hai giường lớn trải ga trắng, tấm trang trí giường màu xanh'),
    (2, 1, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm có bồn tắm, buồng tắm đứng vách kính và bàn lavabo dài'),
    (3, 0, 'https://images.unsplash.com/photo-1505692952047-1a78307da8f2?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ ấm áp với giường trắng nhiều gối, tủ gỗ sẫm màu và đèn ngủ'),
    (3, 1, 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm nhỏ sơn trắng với chậu rửa, cửa sổ và cây xanh'),
    (4, 0, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ sàn gỗ với băng ghế gỗ cuối giường và dãy cửa kính đón nắng nhìn ra vườn'),
    (5, 0, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ nội thất gỗ ấm cúng với giường thấp, gối xanh ngọc và cửa kính nhìn ra khoảng vườn'),
    (5, 1, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1600&q=75', 'Bồn tắm nằm đặt trên nền sỏi trong phòng tắm có cây xanh'),
    (6, 0, 'https://images.unsplash.com/photo-1501117716987-c8c394bb29df?auto=format&fit=crop&w=1600&q=75', 'Cửa kính từ phòng ngủ mở ra ban công nhìn thẳng ra biển'),
    (6, 1, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1600&q=75', 'Giường đôi lớn trải ga trắng, hai đèn bàn hai bên và tranh treo đầu giường'),
    (6, 2, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm trắng với bồn tắm nằm độc lập, chậu rửa tròn và cây xanh'),
    (7, 0, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1600&q=75', 'Biệt thự trắng hiện đại hai tầng với hồ bơi riêng trước hiên'),
    (7, 1, 'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ rộng có phòng tắm vách kính, khu tiếp khách và cửa sổ lớn nhìn ra đồi'),
    (8, 0, 'https://images.unsplash.com/photo-1521783988139-89397d761dce?auto=format&fit=crop&w=1600&q=75', 'Đầu giường bọc nệm xanh navy với gối cùng tông và đèn ngủ trên tủ trắng'),
    (9, 0, 'https://images.unsplash.com/photo-1587985064135-0366536eab42?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ ánh đèn vàng với giường phủ chăn hoa văn và cửa kính mở ra ban công'),
    (9, 1, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm có bồn tắm, buồng tắm đứng vách kính và bàn lavabo dài'),
    (10, 0, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ có đầu giường bọc nệm xanh đậm, hai đèn treo và vách gỗ tối màu'),
    (11, 0, 'https://images.unsplash.com/photo-1562438668-bcf0ca6578f0?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ tông xám be với ghế dài cuối giường và cửa kính mở ra ban công'),
    (11, 1, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm có bồn tắm, buồng tắm đứng vách kính và bàn lavabo dài'),
    (12, 0, 'https://images.unsplash.com/photo-1444201983204-c43cbd584d93?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ tông tím trầm với giường đôi, đèn ngủ và cửa sổ cao'),
    (13, 0, 'https://images.unsplash.com/photo-1598928636135-d146006ff4be?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ tông màu sáng với giường trắng, tủ gỗ và cửa kính trượt ra ban công'),
    (14, 0, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ phong cách cổ điển có ghế sofa kem đặt cuối giường và rèm xanh rêu'),
    (14, 1, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1600&q=75', 'Phòng tắm trắng với bồn tắm nằm độc lập, chậu rửa tròn và cây xanh'),
    (15, 0, 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1600&q=75', 'Phòng rộng kê hai giường lớn trải ga trắng, tấm trang trí giường màu xanh'),
    (15, 1, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ rộng với đầu giường bọc nệm chần nút, ghế dài cuối giường và hai tủ đầu giường'),
    (16, 0, 'https://images.unsplash.com/photo-1501117716987-c8c394bb29df?auto=format&fit=crop&w=1600&q=75', 'Cửa kính từ phòng ngủ mở ra ban công nhìn thẳng ra biển'),
    (16, 1, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ sáng màu với đầu giường bọc nệm trắng cao và thảm hoạ tiết ngựa vằn'),
    (17, 0, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1600&q=75', 'Phòng ngủ hiện đại với gối màu cam, hai ghế đôn cuối giường và bức tranh đỏ'),
    (17, 1, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1600&q=75', 'Phòng khách sàn gỗ xương cá với sofa xanh, tivi và cửa sổ lớn')
ON CONFLICT DO NOTHING;

INSERT INTO flight_routes (id, from_code, to_code, duration_minutes, reference_price, image_url, image_alt, sort_order) VALUES
    (1, 'SGN', 'HAN', 125, 1390000, 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1600&q=75', 'Con phố nhỏ có đường tàu chạy giữa hai dãy nhà, treo nhiều cờ đỏ sao vàng', 1),
    (2, 'HAN', 'SGN', 125, 1350000, 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1600&q=75', 'Các toà nhà cao tầng bên bờ sông lúc hoàng hôn', 2),
    (3, 'SGN', 'DAD', 85, 990000, 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=75', 'Cầu Vàng trên đồi Bà Nà, Đà Nẵng', 3),
    (4, 'SGN', 'PQC', 60, 890000, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=75', 'Bãi biển lúc bình minh, sóng nhẹ vỗ vào bờ cát', 4),
    (5, 'SGN', 'CXR', 65, 790000, 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=75', 'Bãi biển nhiệt đới với hàng dừa và ô che nắng', 5),
    (6, 'SGN', 'DLI', 55, 750000, 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=75', 'Những ngọn đồi xanh phủ mây mỏng vùng cao nguyên', 6)
ON CONFLICT DO NOTHING;

INSERT INTO airlines (code, name) VALUES
    ('SV', 'Sao Việt Air'),
    ('MT', 'Mây Trời Airlines'),
    ('CD', 'Cánh Diều Air')
ON CONFLICT DO NOTHING;

-- Mỗi chặng có lịch bay cả hai chiều để tìm khứ hồi được. SV236 (HAN → PQC, 22:30) hạ cánh sau nửa đêm ("+1 ngày").
-- Số ghế mỗi ngày: phổ thông 150, phổ thông đặc biệt 24, thương gia 16, hạng nhất 8.
INSERT INTO flight_schedules (id, airline_code, flight_number, from_code, to_code, depart_time, duration_minutes, economy_fare, economy_seats, premium_economy_seats, business_seats, first_seats) VALUES
    (1, 'SV', 'SV201', 'SGN', 'HAN', TIME '06:00', 125, 1690000, 150, 24, 16, 8),
    (2, 'MT', 'MT113', 'SGN', 'HAN', TIME '08:30', 125, 1490000, 150, 24, 16, 8),
    (3, 'CD', 'CD305', 'SGN', 'HAN', TIME '13:15', 130, 1390000, 150, 24, 16, 8),
    (4, 'SV', 'SV219', 'SGN', 'HAN', TIME '19:45', 125, 1590000, 150, 24, 16, 8),
    (5, 'MT', 'MT114', 'HAN', 'SGN', TIME '06:30', 125, 1450000, 150, 24, 16, 8),
    (6, 'SV', 'SV202', 'HAN', 'SGN', TIME '09:00', 125, 1650000, 150, 24, 16, 8),
    (7, 'CD', 'CD306', 'HAN', 'SGN', TIME '15:40', 130, 1350000, 150, 24, 16, 8),
    (8, 'SV', 'SV220', 'HAN', 'SGN', TIME '21:00', 125, 1550000, 150, 24, 16, 8),
    (9, 'SV', 'SV121', 'SGN', 'DAD', TIME '07:10', 85, 1090000, 150, 24, 16, 8),
    (10, 'CD', 'CD221', 'SGN', 'DAD', TIME '11:20', 85, 990000, 150, 24, 16, 8),
    (11, 'MT', 'MT131', 'SGN', 'DAD', TIME '17:30', 90, 1050000, 150, 24, 16, 8),
    (12, 'CD', 'CD222', 'DAD', 'SGN', TIME '09:00', 85, 950000, 150, 24, 16, 8),
    (13, 'SV', 'SV122', 'DAD', 'SGN', TIME '14:25', 85, 1050000, 150, 24, 16, 8),
    (14, 'MT', 'MT132', 'DAD', 'SGN', TIME '20:10', 90, 1000000, 150, 24, 16, 8),
    (15, 'MT', 'MT151', 'SGN', 'PQC', TIME '06:45', 60, 890000, 150, 24, 16, 8),
    (16, 'SV', 'SV151', 'SGN', 'PQC', TIME '12:00', 60, 950000, 150, 24, 16, 8),
    (17, 'MT', 'MT152', 'PQC', 'SGN', TIME '08:30', 60, 870000, 150, 24, 16, 8),
    (18, 'SV', 'SV152', 'PQC', 'SGN', TIME '16:20', 60, 930000, 150, 24, 16, 8),
    (19, 'CD', 'CD171', 'SGN', 'CXR', TIME '07:30', 65, 790000, 150, 24, 16, 8),
    (20, 'SV', 'SV171', 'SGN', 'CXR', TIME '15:00', 65, 850000, 150, 24, 16, 8),
    (21, 'CD', 'CD172', 'CXR', 'SGN', TIME '10:00', 65, 770000, 150, 24, 16, 8),
    (22, 'SV', 'SV172', 'CXR', 'SGN', TIME '17:20', 65, 830000, 150, 24, 16, 8),
    (23, 'MT', 'MT181', 'SGN', 'DLI', TIME '09:15', 55, 750000, 150, 24, 16, 8),
    (24, 'CD', 'CD181', 'SGN', 'DLI', TIME '14:40', 55, 720000, 150, 24, 16, 8),
    (25, 'MT', 'MT182', 'DLI', 'SGN', TIME '11:10', 55, 730000, 150, 24, 16, 8),
    (26, 'CD', 'CD182', 'DLI', 'SGN', TIME '16:30', 55, 710000, 150, 24, 16, 8),
    (27, 'SV', 'SV211', 'HAN', 'DAD', TIME '07:00', 80, 1150000, 150, 24, 16, 8),
    (28, 'CD', 'CD211', 'HAN', 'DAD', TIME '18:20', 80, 990000, 150, 24, 16, 8),
    (29, 'SV', 'SV212', 'DAD', 'HAN', TIME '09:30', 80, 1100000, 150, 24, 16, 8),
    (30, 'CD', 'CD212', 'DAD', 'HAN', TIME '20:40', 80, 960000, 150, 24, 16, 8),
    (31, 'MT', 'MT235', 'HAN', 'PQC', TIME '08:00', 130, 1790000, 150, 24, 16, 8),
    (32, 'SV', 'SV236', 'HAN', 'PQC', TIME '22:30', 130, 1690000, 150, 24, 16, 8),
    (33, 'MT', 'MT236', 'PQC', 'HAN', TIME '11:30', 130, 1750000, 150, 24, 16, 8),
    (34, 'SV', 'SV237', 'PQC', 'HAN', TIME '18:00', 130, 1650000, 150, 24, 16, 8),
    (35, 'CD', 'CD241', 'HAN', 'CXR', TIME '10:10', 120, 1590000, 150, 24, 16, 8),
    (36, 'CD', 'CD242', 'CXR', 'HAN', TIME '13:20', 120, 1550000, 150, 24, 16, 8)
ON CONFLICT DO NOTHING;

INSERT INTO testimonials (id, tour_id, customer_name, customer_city, rating, content) VALUES
    (1, 3, 'Nguyễn Minh Anh', 'TP. Hồ Chí Minh', 5, 'Giá hiển thị rõ ràng ngay từ đầu, đặt xong nhận xác nhận rất nhanh. Hướng dẫn viên nhiệt tình, cả nhà mình đều hài lòng.'),
    (2, 5, 'Trần Quốc Bảo', 'Hà Nội', 5, 'Ngủ đêm trên du thuyền là trải nghiệm đáng nhớ. Lịch trình hợp lý, không bị nhồi nhét điểm tham quan.'),
    (3, 1, 'Lê Thu Hà', 'Đà Nẵng', 4, 'Đà Lạt đẹp và lịch trình thoải mái. Mình chọn đúng ngày còn chỗ nên đặt rất dễ, chỉ tiếc trời hơi lạnh hơn dự kiến.'),
    (4, 4, 'Phạm Hoàng Nam', 'Cần Thơ', 5, 'Lần đầu lặn biển nhưng được hướng dẫn rất kỹ. Đội ngũ hỗ trợ trả lời tin nhắn cả buổi tối, mình thấy yên tâm hẳn.')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('destinations', 'id'), (SELECT MAX(id) FROM destinations));
SELECT setval(pg_get_serial_sequence('tours', 'id'), (SELECT MAX(id) FROM tours));
SELECT setval(pg_get_serial_sequence('tour_departures', 'id'), (SELECT MAX(id) FROM tour_departures));
SELECT setval(pg_get_serial_sequence('hotels', 'id'), (SELECT MAX(id) FROM hotels));
SELECT setval(pg_get_serial_sequence('hotel_room_types', 'id'), (SELECT MAX(id) FROM hotel_room_types));
SELECT setval(pg_get_serial_sequence('amenities', 'id'), (SELECT MAX(id) FROM amenities));
SELECT setval(pg_get_serial_sequence('flight_routes', 'id'), (SELECT MAX(id) FROM flight_routes));
SELECT setval(pg_get_serial_sequence('flight_schedules', 'id'), (SELECT MAX(id) FROM flight_schedules));
SELECT setval(pg_get_serial_sequence('testimonials', 'id'), (SELECT MAX(id) FROM testimonials));
