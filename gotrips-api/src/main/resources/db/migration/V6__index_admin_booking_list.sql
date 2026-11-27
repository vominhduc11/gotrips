-- Danh sách vận hành không giới hạn theo khách hàng như danh sách công khai.
CREATE INDEX idx_bookings_created ON bookings (created_at DESC, id DESC);
CREATE INDEX idx_bookings_status_created ON bookings (status, created_at DESC, id DESC);
