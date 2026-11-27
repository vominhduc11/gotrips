package com.gotrips.gotrips_api.catalog;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.gotrips.gotrips_api.common.error.InvalidRequestException;

/**
 * Danh sách URL ảnh được phép lưu vào danh mục. Website hiển thị ảnh bằng {@code next/image}: URL ngoài
 * {@code images.remotePatterns} làm trang LỖI chứ không chỉ mất ảnh. Đổi danh sách ở đây ({@code
 * gotrips.catalog.allowed-image-prefixes}) thì phải đổi {@code next.config.ts} của web và {@code img-src} trong
 * {@code nginx.conf} của admin.
 *
 * <p>So trên URI đã tách phần chứ không chỉ so đầu chuỗi: phần sau tiền tố phải là MỘT đoạn đường dẫn, vì mẫu
 * {@code /photo-*} của web không khớp thêm dấu {@code /}.
 */
@Component
public class CatalogImageUrls {

    public static final String MESSAGE =
            "Ảnh phải là địa chỉ https từ nguồn được phép, ví dụ https://images.unsplash.com/photo-…";

    private final List<URI> prefixes;

    public CatalogImageUrls(@Value("${gotrips.catalog.allowed-image-prefixes}") List<String> allowedPrefixes) {
        // Cấu hình sai thì không khởi động: tiền tố thiếu đường dẫn (https://cdn.vn) sẽ khớp cả https://cdn.vn.xau.com.
        this.prefixes = allowedPrefixes.stream().map(CatalogImageUrls::parsePrefix).toList();
        if (prefixes.isEmpty()) {
            throw new IllegalStateException("gotrips.catalog.allowed-image-prefixes không được để trống.");
        }
    }

    /** URL không được phép thì ném lỗi 400 gắn với {@code field}. */
    public void require(String field, String url) {
        if (!isAllowed(url)) {
            throw new InvalidRequestException(field, MESSAGE);
        }
    }

    boolean isAllowed(String url) {
        URI uri = parse(url);
        if (uri == null || !isPlainHttps(uri)) {
            return false;
        }
        String path = uri.getRawPath();
        String lower = path.toLowerCase(Locale.ROOT);
        // Dấu "/", "\" và "." viết dạng mã hoá cũng đổi đường dẫn thật sau khi máy chủ ảnh giải mã.
        if (lower.contains("%2f") || lower.contains("%5c") || lower.contains("%2e") || lower.contains("..")) {
            return false;
        }
        return prefixes.stream().anyMatch(prefix -> {
            if (!uri.getRawAuthority().equalsIgnoreCase(prefix.getRawAuthority())
                    || !path.startsWith(prefix.getRawPath())) {
                return false;
            }
            String rest = path.substring(prefix.getRawPath().length());
            return !rest.isEmpty() && rest.indexOf('/') < 0;
        });
    }

    private static URI parsePrefix(String value) {
        String prefix = value.strip();
        URI uri = parse(prefix);
        if (uri == null || !isPlainHttps(uri) || uri.getRawQuery() != null || !uri.getRawPath().startsWith("/")) {
            throw new IllegalStateException("Tiền tố ảnh không hợp lệ: \"" + prefix
                    + "\". Cần dạng https://tên-miền/đường-dẫn, không có cổng, tài khoản, truy vấn hay #.");
        }
        return uri;
    }

    private static URI parse(String url) {
        try {
            return new URI(url);
        } catch (URISyntaxException ex) {
            return null;
        }
    }

    /** https, chỉ có tên miền (không tài khoản, không cổng) và không có phần {@code #}. */
    private static boolean isPlainHttps(URI uri) {
        return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getHost().equals(uri.getRawAuthority())
                && uri.getRawPath() != null && uri.getRawFragment() == null;
    }
}
