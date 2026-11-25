-- DỮ LIỆU MẪU cho dev/Docker — KHÔNG chạy ở production.
--
-- Migration lặp lại (Flyway `R__`) nằm ngoài `db/migration`; chỉ được nạp khi bật profile `seed`
-- (xem `application-seed.yaml`). Chạy SAU mọi migration schema nên luôn viết theo schema mới nhất.
--
-- Nội dung chép NGUYÊN từ `gotrips-web/lib/mock/*` (cùng id, slug, giá, ngày, ảnh): thẻ ở Trang chủ lấy từ API
-- còn trang chi tiết tour/khách sạn vẫn đọc mock theo id/slug, nên hai bên lệch nhau là hỏng liên kết.
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

INSERT INTO hotels (id, slug, name, destination_id, star_rating, area, image_url, image_alt, status, rating, review_count, description, amenities, check_in_time, check_out_time) VALUES
    (1, 'khach-san-doi-may-da-lat', 'Khách sạn Đồi Mây', 1, 4, 'Phường 3, Đà Lạt', 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1600&q=75', 'Khu nghỉ dưỡng mái ngói gỗ bên hồ bơi lúc hoàng hôn', 'ACTIVE', 4.6, 1280, 'Khách sạn nằm trên đồi thông yên tĩnh, cách chợ Đà Lạt khoảng 10 phút đi xe. Phòng hướng đồi, sáng sớm nhìn thấy sương mù phủ thung lũng.', ARRAY['Hồ bơi nước ấm', 'Bữa sáng buffet', 'Wi-Fi miễn phí', 'Bãi đỗ xe', 'Đưa đón sân bay (có phí)']::text[], TIME '14:00', TIME '12:00'),
    (2, 'villa-thong-xanh-da-lat', 'Villa Thông Xanh', 1, 3, 'Phường 9, Đà Lạt', 'https://images.unsplash.com/photo-1455587734955-081b22074882?auto=format&fit=crop&w=1600&q=75', 'Mặt tiền khách sạn nhiều ban công, trước nhà có hàng cọ', 'ACTIVE', 4.3, 640, 'Biệt thự kiểu Pháp nhỏ xinh giữa rừng thông, phù hợp cho cặp đôi và nhóm bạn muốn không gian riêng, gần hồ Tuyền Lâm.', ARRAY['Vườn và sân nướng BBQ', 'Bữa sáng', 'Wi-Fi miễn phí', 'Cho thuê xe máy']::text[], TIME '14:00', TIME '11:00'),
    (3, 'resort-bai-sao-phu-quoc', 'Resort Bãi Sao', 2, 5, 'Bãi Sao, Phú Quốc', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi sát biển với ghế dài và dù che nắng trên sàn gỗ', 'ACTIVE', 4.8, 2150, 'Khu nghỉ dưỡng sát bãi Sao — một trong những bãi cát trắng đẹp nhất Phú Quốc. Có biệt thự hồ bơi riêng cho gia đình.', ARRAY['Bãi biển riêng', 'Hồ bơi vô cực', 'Spa', 'Nhà hàng hải sản', 'Câu lạc bộ trẻ em']::text[], TIME '15:00', TIME '12:00'),
    (4, 'khach-san-hoang-hon-phu-quoc', 'Khách sạn Hoàng Hôn', 2, 4, 'Dương Đông, Phú Quốc', 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1600&q=75', 'Toà nhà màu trắng và hàng cọ dưới bầu trời hoàng hôn', 'ACTIVE', 4.5, 930, 'Khách sạn ở trung tâm Dương Đông, đi bộ ra chợ đêm Phú Quốc, ngắm hoàng hôn trên biển từ quầy bar sân thượng.', ARRAY['Hồ bơi sân thượng', 'Quầy bar', 'Bữa sáng', 'Wi-Fi miễn phí']::text[], TIME '14:00', TIME '12:00'),
    (5, 'khach-san-vinh-xanh-ha-long', 'Khách sạn Vịnh Xanh', 3, 4, 'Bãi Cháy, Hạ Long', 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi giữa vườn cọ, phía xa là dãy núi đá', 'ACTIVE', 4.4, 780, 'Khách sạn ở Bãi Cháy, nhìn ra vịnh Hạ Long, gần bến tàu du thuyền và cầu Bãi Cháy.', ARRAY['Hồ bơi', 'Phòng gym', 'Nhà hàng', 'Đặt tour du thuyền']::text[], TIME '14:00', TIME '12:00'),
    (6, 'khach-san-may-ngan-sapa', 'Khách sạn Mây Ngàn', 4, 3, 'Thị xã Sa Pa, Lào Cai', 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1600&q=75', 'Sảnh kính sáng đèn bên hồ bơi lúc trời tối', 'ACTIVE', 4.2, 410, 'Khách sạn trên sườn núi ở trung tâm thị xã Sa Pa, phòng có cửa kính lớn nhìn thung lũng Mường Hoa.', ARRAY['Lò sưởi', 'Nhà hàng món vùng cao', 'Wi-Fi miễn phí', 'Hỗ trợ đặt trekking']::text[], TIME '14:00', TIME '12:00'),
    (7, 'khach-san-pho-hoa-dang-hoi-an', 'Khách sạn Phố Hoa Đăng', 5, 4, 'Phường Minh An, Hội An', 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?auto=format&fit=crop&w=1600&q=75', 'Toà nhà kiểu cổ điển màu trắng bên hồ bơi lúc chạng vạng', 'ACTIVE', 4.7, 1560, 'Khách sạn mang phong cách phố cổ, cách Chùa Cầu vài bước chân, có lớp học làm đèn lồng cho khách.', ARRAY['Hồ bơi', 'Xe đạp miễn phí', 'Bữa sáng', 'Lớp làm đèn lồng']::text[], TIME '14:00', TIME '12:00'),
    (8, 'resort-bien-xanh-nha-trang', 'Resort Biển Xanh', 6, 5, 'Trần Phú, Nha Trang', 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1600&q=75', 'Hồ bơi lát gạch xanh về đêm, phía sau là sảnh kính', 'HIDDEN', 4.9, 3020, 'Resort trên đường Trần Phú nhìn thẳng ra vịnh Nha Trang.', ARRAY['Bãi biển', 'Hồ bơi', 'Spa']::text[], TIME '14:00', TIME '12:00')
ON CONFLICT DO NOTHING;

INSERT INTO hotel_room_types (id, hotel_id, name, price_per_night, max_guests, bed_type, area_m2) VALUES
    (1, 1, 'Phòng Deluxe', 1250000, 2, '1 giường đôi lớn', 28),
    (2, 1, 'Phòng Gia đình', 1980000, 4, '2 giường đôi', 42),
    (3, 2, 'Phòng Standard', 690000, 2, '1 giường đôi', 22),
    (4, 2, 'Phòng Hướng đồi', 850000, 3, '1 giường đôi + 1 giường đơn', 30),
    (5, 3, 'Phòng Hướng vườn', 3200000, 2, '1 giường đôi lớn', 40),
    (6, 3, 'Phòng Hướng biển', 4100000, 3, '1 giường đôi lớn + 1 sofa giường', 48),
    (7, 3, 'Biệt thự hồ bơi riêng', 7800000, 6, '3 phòng ngủ, hồ bơi riêng', 160),
    (8, 4, 'Phòng Superior', 1450000, 2, '1 giường đôi', 26),
    (9, 4, 'Phòng Deluxe có ban công', 1850000, 3, '1 giường đôi lớn + 1 giường đơn', 34),
    (10, 5, 'Phòng Superior', 1100000, 2, '1 giường đôi', 25),
    (11, 5, 'Phòng Hướng vịnh', 1650000, 3, '1 giường đôi + 1 giường đơn', 32),
    (12, 6, 'Phòng Standard', 780000, 2, '1 giường đôi', 20),
    (13, 6, 'Phòng Hướng thung lũng', 1050000, 3, '1 giường đôi + 1 giường đơn', 28),
    (14, 7, 'Phòng Deluxe', 1350000, 2, '1 giường đôi lớn', 30),
    (15, 7, 'Phòng Gia đình', 2100000, 4, '2 giường đôi', 45),
    (16, 8, 'Phòng Hướng biển', 3600000, 3, '1 giường đôi lớn + 1 giường đơn', 38),
    (17, 8, 'Suite Biển', 6200000, 4, '2 giường đôi, phòng khách riêng', 70)
ON CONFLICT DO NOTHING;

INSERT INTO flight_routes (id, from_code, to_code, duration_minutes, reference_price, image_url, image_alt, sort_order) VALUES
    (1, 'SGN', 'HAN', 125, 1390000, 'https://images.unsplash.com/photo-1555921015-5532091f6026?auto=format&fit=crop&w=1600&q=75', 'Con phố nhỏ có đường tàu chạy giữa hai dãy nhà, treo nhiều cờ đỏ sao vàng', 1),
    (2, 'HAN', 'SGN', 125, 1350000, 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=1600&q=75', 'Các toà nhà cao tầng bên bờ sông lúc hoàng hôn', 2),
    (3, 'SGN', 'DAD', 85, 990000, 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1600&q=75', 'Cầu Vàng trên đồi Bà Nà, Đà Nẵng', 3),
    (4, 'SGN', 'PQC', 60, 890000, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=75', 'Bãi biển lúc bình minh, sóng nhẹ vỗ vào bờ cát', 4),
    (5, 'SGN', 'CXR', 65, 790000, 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=1600&q=75', 'Bãi biển nhiệt đới với hàng dừa và ô che nắng', 5),
    (6, 'SGN', 'DLI', 55, 750000, 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1600&q=75', 'Những ngọn đồi xanh phủ mây mỏng vùng cao nguyên', 6)
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
SELECT setval(pg_get_serial_sequence('flight_routes', 'id'), (SELECT MAX(id) FROM flight_routes));
SELECT setval(pg_get_serial_sequence('testimonials', 'id'), (SELECT MAX(id) FROM testimonials));
