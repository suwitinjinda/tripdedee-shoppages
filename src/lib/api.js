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
    return { shops: [], total: 0, realTotal: null, limit: opts.limit || 24, offset: opts.offset || 0 };
  }
  return {
    shops: Array.isArray(json.data) ? json.data : [],
    // total = จำนวนที่ลิสต์ (รวมหมุดนำเข้าจากแผนที่สาธารณะ) ใช้แบ่งหน้าเท่านั้น ห้ามโชว์เป็นตัวเลข
    // realTotal = ร้านจริง (importSource ว่าง) · หลังบ้านรุ่นเก่าไม่ส่งมา = null → ไม่โชว์ตัวเลข (27 ต.ค. 2569)
    total: Number(json.total) || 0,
    realTotal: realCount(json.realTotal),
    limit: Number(json.limit) || 24,
    offset: Number(json.offset) || 0,
  };
}

// ตัวเลขร้านจริงจากหลังบ้าน · ไม่ใช่ตัวเลข = null (ห้ามเดา ห้ามถอยไปใช้ยอดรวมหมุดนำเข้า)
export function realCount(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : null;
}

// Province + shopType counts for the directory homepage filter chips.
// แต่ละชิปมี count (รวมหมุดนำเข้า · ห้ามโชว์) กับ real (ร้านจริง · โชว์ได้)
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

// ── หน้า "เมนู × จังหวัด" (27 ต.ค. 2569) ──
//
// รายการเมนู (ชื่อไทย/อังกฤษ/slug) กับการจับเมนูอยู่ที่หลังบ้านที่เดียว
// (services/publicFoodDishes.js) · หน้านี้ไม่เก็บสำเนา จะได้ไม่เพี้ยนจากกัน
// หลังบ้านตอบ 404 เมื่อร้านไม่ถึงเกณฑ์ (หน้าบาง) → คืน null ให้หน้าตอบ 404 ตาม

/** { minShops, dishes:[{slug, th, en, total, provinces:[{province,count}]}] } */
export async function getFoodDishes() {
  const json = await getCached('/shop/food/dishes');
  if (!json || json.notFound || json.success === false || !json.data) return { minShops: 2, dishes: [] };
  return { minShops: Number(json.data.minShops) || 2, dishes: Array.isArray(json.data.dishes) ? json.data.dishes : [] };
}

/** ร้านของเมนูหนึ่ง · province ว่าง = ทั้งประเทศ · null = ไม่มีหน้านี้ */
export async function getFoodDishPage(dish, province = '') {
  const qs = new URLSearchParams({ dish: String(dish || '') });
  if (province) qs.set('province', String(province));
  const json = await getCached(`/shop/food?${qs.toString()}`);
  if (!json || json.notFound || json.success === false) return null;
  return json.data || null;
}

/** เมนูที่ร้านนี้มี + ลิงก์ไปหน้าไหนได้จริง · หลังบ้านยังไม่มีเส้นนี้ก็ได้ [] */
export async function getShopDishes(shopKey) {
  if (!shopKey) return [];
  const json = await getCached(`/shop/food/by-shop/${encodeURIComponent(shopKey)}`);
  if (!json || json.notFound || json.success === false) return [];
  return Array.isArray(json.data) ? json.data : [];
}
