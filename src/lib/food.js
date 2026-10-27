// ที่อยู่ของหน้า "เมนู × จังหวัด" (27 ต.ค. 2569)
//   ไทย:    /shop/food/<slug>  ·  /shop/food/<slug>/<จังหวัด>
//   อังกฤษ: /shop/en/food/<slug>  ·  /shop/en/food/<slug>/<จังหวัด>
// slug ของเมนูเป็นอังกฤษ (khao-tom) · จังหวัดเป็นชื่อไทยแบบเดียวกับ /shop/area/<จังหวัด>

export function foodHref(lang, dishSlug, province = '') {
  const base = lang === 'en' ? '/shop/en/food/' : '/shop/food/';
  const p = province ? '/' + encodeURIComponent(province) : '';
  return base + encodeURIComponent(dishSlug) + p;
}

export function dishLabel(dish, lang) {
  if (!dish) return '';
  return lang === 'en' ? (dish.en || dish.th || '') : (dish.th || dish.en || '');
}

/* ลิงก์เมนูของร้าน: ไปหน้าจังหวัดถ้าจังหวัดนั้นถึงเกณฑ์ · ไม่งั้นหน้าทั้งประเทศ ·
 * ไม่ถึงทั้งคู่ = ไม่มีลิงก์ (หน้า 404 ไม่ควรถูกลิงก์ถึง) */
export function shopDishHref(lang, d) {
  if (d.provincePage && d.province) return foodHref(lang, d.slug, d.province);
  if (d.dishPage) return foodHref(lang, d.slug);
  return '';
}

/* ช่วงราคาจากเมนูจริง เช่น "฿40–฿180" · ไม่มีราคา = '' (ไม่ใส่ priceRange) */
export function priceRangeOf(prices) {
  const ps = (prices || []).map(Number).filter((n) => Number.isFinite(n) && n > 0);
  if (!ps.length) return '';
  const lo = Math.min(...ps);
  const hi = Math.max(...ps);
  const f = (n) => '฿' + Math.round(n).toLocaleString('en-US');
  return lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`;
}

const DAY_URL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  .map((d) => 'https://schema.org/' + d);
const HHMM = /^([01]\d|2[0-4]):[0-5]\d$/;
const okTime = (s) => typeof s === 'string' && HHMM.test(s.trim());

/* เวลาเปิดปิดจากข้อมูลจริงของร้าน → openingHoursSpecification
 *
 * weeklyHours (ตั้งแยกรายวัน) ชนะ · ไม่มีค่อยใช้ openTime/closeTime + closedDays
 * แต่ openTime/closeTime มีค่าตั้งต้นใน schema เป็น 09:00/20:00 — ร้านที่ไม่เคยตั้ง
 * ก็ได้ค่านี้ แยกไม่ออกว่าตั้งจริงหรือไม่ · จึงข้ามคู่ 09:00–20:00 ไปเลย
 * (ไม่ใส่ดีกว่าใส่เวลาที่ร้านไม่ได้บอก) · ร้านนำเข้า OSM ไม่ใส่เลย */
export function openingHoursOf(shop) {
  if (!shop || shop.importSource) return [];
  const rows = [];
  const wh = Array.isArray(shop.weeklyHours) ? shop.weeklyHours : [];
  if (wh.length) {
    for (const d of wh) {
      if (!d || d.closed || !(d.day >= 0 && d.day <= 6)) continue;
      const wins = Array.isArray(d.slots) && d.slots.length ? d.slots : [{ open: d.open, close: d.close }];
      for (const w of wins) {
        if (okTime(w.open) && okTime(w.close)) rows.push({ day: d.day, opens: w.open.trim(), closes: w.close.trim() });
      }
    }
  } else if (okTime(shop.openTime) && okTime(shop.closeTime)
    && !(shop.openTime.trim() === '09:00' && shop.closeTime.trim() === '20:00')) {
    const closed = new Set(Array.isArray(shop.closedDays) ? shop.closedDays : []);
    for (let day = 0; day < 7; day += 1) {
      if (!closed.has(day)) rows.push({ day, opens: shop.openTime.trim(), closes: shop.closeTime.trim() });
    }
  }
  // รวมวันที่เวลาเหมือนกันเป็นก้อนเดียว
  const byWin = new Map();
  for (const r of rows) {
    const k = `${r.opens}-${r.closes}`;
    if (!byWin.has(k)) byWin.set(k, { opens: r.opens, closes: r.closes, days: new Set() });
    byWin.get(k).days.add(r.day);
  }
  return [...byWin.values()].map((w) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: [...w.days].sort().map((d) => DAY_URL[d]),
    opens: w.opens,
    closes: w.closes,
  }));
}
