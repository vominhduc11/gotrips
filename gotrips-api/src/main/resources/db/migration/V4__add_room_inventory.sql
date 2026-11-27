-- Số phòng của mỗi loại phòng, để tính phòng trống theo khoảng ngày:
--   phòng trống trong [nhận, trả) = total_rooms - tổng số phòng của các đơn chưa huỷ có khoảng ngày giao nhau.
-- DEFAULT 10 để các loại phòng đã có sẵn trong DB có ngay giá trị hợp lệ khi chạy migration này.
ALTER TABLE hotel_room_types ADD COLUMN total_rooms integer NOT NULL DEFAULT 10;

ALTER TABLE hotel_room_types ADD CONSTRAINT ck_hotel_room_types_total_rooms CHECK (total_rooms >= 0);
