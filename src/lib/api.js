const BACKEND_URL = (import.meta.env.BACKEND_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
const TTL_MS = 60 * 1000;

const cache = new Map();

async function getCached(path) {
  const hit = cache.get(path);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.data;
  try {
    const res = await fetch(`${BACKEND_URL}/api${path}`, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      // 404 is a real answer worth caching briefly; other errors are not
      const data = res.status === 404 ? { notFound: true } : null;
      if (data) cache.set(path, { at: Date.now(), data });
      return data;
    }
    const json = await res.json();
    cache.set(path, { at: Date.now(), data: json });
    return json;
  } catch (err) {
    console.error(`[shoppages] backend fetch failed: ${path}`, err.message);
    return null;
  }
}

export async function getShop(shopId) {
  const json = await getCached(`/shop/${encodeURIComponent(shopId)}`);
  if (!json || json.notFound || json.success === false) return null;
  return json.data || null;
}

export async function getShopMenu(shopId) {
  const json = await getCached(`/shop/${encodeURIComponent(shopId)}/menu`);
  if (!json || json.notFound || json.success === false) return [];
  return Array.isArray(json.data) ? json.data : [];
}

export async function getShopProducts(shopId) {
  const json = await getCached(`/shop/${encodeURIComponent(shopId)}/products`);
  if (!json || json.notFound || json.success === false) return [];
  return Array.isArray(json.data) ? json.data : [];
}

// All active shops — used to build the sitemap.
export async function getActiveShops() {
  const json = await getCached('/shop/active');
  if (!json || json.notFound || json.success === false) return [];
  return Array.isArray(json.data) ? json.data : [];
}

// Wongnai-style directory search. opts: { q, province, shopType, district,
// limit, offset }. Always returns { shops, total, limit, offset }.
export async function searchShops(opts = {}) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(opts)) {
    if (v != null && v !== '') qs.set(k, String(v));
  }
  const json = await getCached(`/shop/search?${qs.toString()}`);
  if (!json || json.notFound || json.success === false) {
    return { shops: [], total: 0, limit: opts.limit || 24, offset: opts.offset || 0 };
  }
  return {
    shops: Array.isArray(json.data) ? json.data : [],
    total: Number(json.total) || 0,
    limit: Number(json.limit) || 24,
    offset: Number(json.offset) || 0,
  };
}

// Province + shopType counts for the directory homepage filter chips.
export async function getShopFacets() {
  const json = await getCached('/shop/facets');
  if (!json || json.notFound || json.success === false) {
    return { provinces: [], shopTypes: [], totalActive: 0 };
  }
  return json.data || { provinces: [], shopTypes: [], totalActive: 0 };
}

// Hotel public page — backend GET /hotels/:id accepts Mongo _id, custom `id`,
// or 6-digit hotelId. Same caching pattern as shop.
export async function getHero(userId) {
  const json = await getCached(`/hero/public/${encodeURIComponent(userId)}`);
  if (!json || json.notFound || json.success === false) return null;
  return json.data || null;
}

export async function getHotel(hotelId) {
  const json = await getCached(`/hotels/${encodeURIComponent(hotelId)}`);
  if (!json || json.notFound || json.success === false) return null;
  return json.data || null;
}

// Food Feed: single post for FB share landing page (with OG meta tags).
export async function getFeedPost(postId) {
  const json = await getCached(`/feed/post/${encodeURIComponent(postId)}`);
  if (!json || json.notFound || json.success === false) return null;
  return json.data || null;
}

// สินค้าทั้งหมดบน Shopping marketplace — ใช้ทำ sitemap (23 ส.ค. 2569)
//
// ก่อนหน้านี้ sitemap มีแต่หน้าร้าน (1,399 ร้าน x 2 ภาษา) ไม่มีสินค้าสักรายการ
// Google จึงไม่มีทางรู้ว่ามีหน้าสินค้าอยู่ ทั้งที่หน้าพร้อมใช้งานแล้ว
//
// เส้น /shopping/products คืนเฉพาะสินค้าที่ขายจริงบน marketplace
// (ไม่ใช่ shopproducts ทั้ง 913 รายการ) วัดเมื่อ 23 ส.ค. 2569 ได้ 43 รายการ
// pageSize ของเส้นนี้คือ 48 จึงยังพอในหน้าเดียว แต่วนหน้าเผื่อไว้ให้โตได้
export async function getShoppingProducts() {
  const out = [];
  for (let page = 1; page <= 40; page += 1) {
    const json = await getCached(`/shopping/products?page=${page}&limit=48`);
    if (!json || json.notFound || json.success === false) break;
    const rows = Array.isArray(json.data) ? json.data : [];
    out.push(...rows);
    const total = Number(json.total) || 0;
    if (!rows.length || out.length >= total) break;
  }
  return out;
}

// Shopping marketplace: single product for share landing page.
// Public endpoint · same shape the mobile Shopping tab consumes.
export async function getShoppingProduct(productId) {
  const json = await getCached(`/shopping/product/${encodeURIComponent(productId)}`);
  if (!json || json.notFound || json.success === false) return null;
  return json.data || null;
}
