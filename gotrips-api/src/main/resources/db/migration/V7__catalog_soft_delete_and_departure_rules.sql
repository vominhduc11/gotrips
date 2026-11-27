-- Quản trị danh mục: xoá mềm tour/khách sạn, đóng bán chuyến, và mỗi tour chỉ một chuyến mỗi ngày.

-- DELETED = xoá mềm. Không xoá cứng vì đơn cũ còn tham chiếu và đọc tên, ngày... trực tiếp từ danh mục.
-- Truy vấn công khai đều lọc status = 'ACTIVE' nên bản ghi DELETED tự biến mất khỏi website.
ALTER TABLE tours DROP CONSTRAINT ck_tours_status;
ALTER TABLE tours ADD CONSTRAINT ck_tours_status CHECK (status IN ('ACTIVE', 'HIDDEN', 'DELETED'));

ALTER TABLE hotels DROP CONSTRAINT ck_hotels_status;
ALTER TABLE hotels ADD CONSTRAINT ck_hotels_status CHECK (status IN ('ACTIVE', 'HIDDEN', 'DELETED'));

-- Đóng bán là cờ riêng. Nếu hạ total_seats xuống bằng booked_seats thì huỷ một đơn sẽ tự mở bán lại chỗ đó,
-- và chuyến chưa ai đặt không đóng được (total_seats phải > 0).
ALTER TABLE tour_departures ADD COLUMN sales_closed boolean NOT NULL DEFAULT false;

-- Index của ràng buộc UNIQUE thay cho index thường trên cùng hai cột.
ALTER TABLE tour_departures ADD CONSTRAINT uq_tour_departures_tour_date UNIQUE (tour_id, departure_date);
DROP INDEX idx_tour_departures_tour_date;
