// URL format ของร้าน: /shop/<Shop.slug>  เช่น /shop/วนาไส้กรอกอีสาน-7900
//
// เดิมหน้านี้สร้าง slug เองเป็น "<ชื่อ>-<_id เต็ม 24 ตัว>" เพราะตอนนั้นหลังบ้าน
// ยังไม่มีช่อง slug · ตอนนี้มีแล้วและครบทุกร้าน (7,348 ร้าน ไม่ซ้ำกันสักอัน)
// การมีสองชุดทำให้ลิงก์ที่แชร์ออกไปพา _id เต็มติดไปด้วย ซึ่งบอกทั้งเวลาที่
// สร้างและตัวนับของฐานข้อมูลออกไป (เจ้าของทัก 29 ส.ค. 2569)
//
// ลิงก์เก่ายังเปิดได้ทุกแบบ — extractShopId ปล่อย _id ผ่านไปตามเดิม
// และหลังบ้านหาร้านได้ทั้งจาก _id · shopId · slug

const MAX_SLUG_LEN = 60;

// Keep Thai block (฀-๿), latin a-z, digits, hyphen. Drop everything else.
export function slugify(name) {
  if (!name) return '';
  let s = String(name)
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^฀-๿a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (s.length > MAX_SLUG_LEN) {
    s = s.slice(0, MAX_SLUG_LEN).replace(/-+$/g, '');
  }
  return s;
}

// Canonical path param for a shop. Falls back to bare shopId when the name
// produces no usable slug (e.g. name is only emoji/symbols).
export function makeParam(name, shopId) {
  const s = slugify(name);
  return s ? `${s}-${shopId}` : String(shopId);
}

/** slug ของร้านที่หลังบ้านเก็บไว้ · ตกกลับไปแบบเดิมถ้าร้านนั้นยังไม่มี */
export function shopParam(shop) {
  if (shop && shop.slug) return String(shop.slug);
  return makeParam(shop?.shopName || '', shop?._id || shop?.shopId || '');
}

/* กุญแจที่ใช้ถามหลังบ้าน
 *
 * รูปแบบเก่า "<ชื่อ>-<_id 24 ตัว>" → ตัดเอาท่อนท้ายเป็น _id เหมือนเดิม
 * รูปแบบใหม่ "<ชื่อ>-7900" → ท่อนท้ายไม่ใช่ _id ต้องส่งทั้งก้อนไปให้หลังบ้าน
 *   หาจาก slug แทน · ส่งแค่ "7900" ไปจะหาไม่เจอเพราะนั่นเป็น shortCode
 *   ที่ร้านหนึ่งในสี่เท่านั้นที่มี
 * id เปล่า (จาก QR โปสเตอร์) → คืนตัวมันเอง
 */
const OBJECT_ID = /^[0-9a-f]{24}$/i;

export function extractShopId(param) {
  if (!param) return '';
  const raw = String(param);
  if (OBJECT_ID.test(raw)) return raw;
  const tail = raw.split('-').pop() || '';
  if (OBJECT_ID.test(tail)) return tail;
  return raw;
}

// Full path, URL-encoded so Thai chars are safe in headers and hrefs.
export function shopPath(lang, name, shopId) {
  const enc = encodeURIComponent(makeParam(name, shopId));
  return lang === 'en' ? `/shop/en/${enc}` : `/shop/${enc}`;
}

/** เส้นทางหน้าร้าน จาก slug ที่หลังบ้านเก็บไว้ · ใช้ตัวนี้แทน shopPath */
export function shopHref(lang, shop) {
  const enc = encodeURIComponent(shopParam(shop));
  return lang === 'en' ? `/shop/en/${enc}` : `/shop/${enc}`;
}

// Hotel uses the same slug-<id> pattern but lives under /hotel/.
export function hotelPath(lang, name, hotelId) {
  const enc = encodeURIComponent(makeParam(name, hotelId));
  return lang === 'en' ? `/hotel/en/${enc}` : `/hotel/${enc}`;
}
