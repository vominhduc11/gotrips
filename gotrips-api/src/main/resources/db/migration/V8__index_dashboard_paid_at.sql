-- Tổng quan lọc thời điểm thu tiền, độc lập với ngày tạo đơn.
CREATE INDEX idx_payments_paid_at ON payments (paid_at) WHERE status = 'PAID';
