import { getActiveShops, getShoppingProducts, getFoodDishes } from '../lib/api.js';
import { foodHref } from '../lib/food.js';
import { shopHref } from '../lib/slug.js';

const SITE = 'https://tripdedee.com';

export async function GET() {
  const shops = await getActiveShops();
  const locs = [];
  for (const s of shops) {
    const id = s.shopId;
    if (!id) continue;
    const thName = s.shopName || s.name || id;
    const enName = s.nameEn || thName;
    // sitemap ต้องชี้ที่อยู่มาตรฐานตรง ๆ ไม่ใช่ที่อยู่ที่ต้องเด้งอีกต่อ
    locs.push(SITE + shopHref('th', s));
    locs.push(SITE + shopHref('en', s));
  }

  // สินค้าบน Shopping marketplace (23 ส.ค. 2569)
  //
  // เจ้าของแจ้ง "มีสินค้าใน shopping ด้วยน่ะ ต้องหาเจอ ทั้ง google and AI"
  // เดิม sitemap มีแต่หน้าร้าน Google จึงไม่เคยรู้ว่ามีหน้าสินค้าอยู่
  //
  // หน้าสินค้ามีอยู่แล้วที่ /shop/shopping/product/<id> และ render ครบ
  // (ชื่อ · ราคา · รูปจริง) แค่ไม่มีใครบอก Google ว่ามันอยู่ตรงไหน
  // ถ้าดึงรายการไม่สำเร็จก็ปล่อยผ่าน — sitemap ของร้านต้องออกได้เสมอ
  try {
    const products = await getShoppingProducts();
    for (const p of products) {
      const pid = p && (p.id || p._id);
      if (pid) locs.push(`${SITE}/shop/shopping/product/${pid}`);
    }
  } catch (_) { /* ไม่ให้สินค้าล้มทั้ง sitemap */ }

  // หน้า "เมนู × จังหวัด" (27 ต.ค. 2569) · หลังบ้านคืนเฉพาะเมนู/จังหวัดที่มีร้านถึงเกณฑ์ (≥2)
  // จึงไม่มีหน้าบางหรือหน้า 404 หลุดเข้า sitemap · ดึงไม่ได้ก็ข้ามไป
  try {
    const { dishes } = await getFoodDishes();
    if (dishes.length) {
      locs.push(`${SITE}/shop/food`, `${SITE}/shop/en/food`);
      for (const d of dishes) {
        for (const lang of ['th', 'en']) {
          locs.push(SITE + foodHref(lang, d.slug));
          for (const p of d.provinces || []) locs.push(SITE + foodHref(lang, d.slug, p.province));
        }
      }
    }
  } catch (_) { /* ไม่ให้หน้าเมนูล้มทั้ง sitemap */ }

  const body =
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    locs.map((u) => `  <url><loc>${u}</loc></url>`).join('\n') +
    '\n</urlset>\n';

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
