package com.gotrips.gotrips_api.common.catalog;

/** Luật slug của danh mục. Khớp CHECK ở DB và {@code slug.ts} của gotrips-admin: đổi một nơi phải đổi nơi kia. */
public final class CatalogSlugs {

    public static final String PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";
    public static final String PATTERN_MESSAGE =
            "Slug chỉ gồm chữ thường không dấu và số, nối với nhau bằng một dấu gạch ngang.";

    private CatalogSlugs() {
    }
}
