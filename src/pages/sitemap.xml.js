import { getActiveShops, getFoodDishes, getTravelIndex } from '../lib/api.js';
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

  // สินค้า Shopping ไม่อยู่ใน sitemap นี้แล้ว (27 ต.ค. 2569)
  // หน้า /shop/shopping/product/<id> เป็นหน้าแชร์เปิดแอป canonical ชี้ไป /shopping/product.html?id=…
  // ซึ่งอยู่ใน /shopping/sitemap.xml (เฉพาะร้านที่เคลมแล้ว) · ใส่ซ้ำตรงนี้ = ส่งสำเนาให้ Google
  // และเดิมใส่สินค้า OTOP ที่ยังสั่งไม่ได้ปนเข้ามาด้วย

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

  // หน้าจังหวัด /shop/area/<จังหวัด> + ร้านใกล้ที่เที่ยว /f/t (8 พ.ย. 2569) · เดิมไม่อยู่ใน sitemap ไหนเลย
  // จังหวัด = มีหน้าเมนู หรือมีหน้าที่เที่ยวที่ถึงเกณฑ์ · /f/t เอาเฉพาะหน้าที่ไม่ noindex (หลังบ้านตัดให้)
  try {
    const [{ dishes }, travel] = await Promise.all([getFoodDishes().catch(() => ({ dishes: [] })), getTravelIndex()]);
    const provs = new Set(travel.provinces);
    for (const d of dishes || []) for (const p of d.provinces || []) provs.add(p.province);
    for (const p of provs) locs.push(`${SITE}/shop/area/${encodeURIComponent(p)}`);
    for (const p of travel.provinces) locs.push(`${SITE}/f/t?province=${encodeURIComponent(p)}`.replace(/&/g, '&amp;'));
    for (const id of travel.attractions) locs.push(`${SITE}/f/t/${encodeURIComponent(id)}`);
  } catch (_) { /* ไม่ให้ทั้ง sitemap ล้ม */ }

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
