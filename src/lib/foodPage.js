// โหลดข้อมูลหน้า "เมนู × จังหวัด" ให้ทั้งหน้าไทยและหน้าอังกฤษใช้ตัวเดียวกัน (27 ต.ค. 2569)
//
// คืน { status: 404 } · { redirect: '/shop/food/…' } · หรือ { page, all }
// หน้า route ตัดสินใจเรื่องสถานะ/เด้งเอง (ต้องทำก่อนเริ่มส่งหน้า)
import { getFoodDishPage, getFoodDishes } from './api.js';
import { foodHref } from './food.js';

const safeDecode = (s) => {
  try { return decodeURIComponent(String(s || '')); } catch (_) { return String(s || ''); }
};

export async function loadFoodPage(params, lang) {
  const dishRaw = safeDecode(params.dish).slice(0, 60).trim();
  const provinceRaw = safeDecode(params.province || '').slice(0, 60).trim();
  if (!dishRaw) return { status: 404 };
  const [page, all] = await Promise.all([
    getFoodDishPage(dishRaw, provinceRaw),
    getFoodDishes(),
  ]);
  // หลังบ้านตอบ 404 เมื่อไม่มีเมนูนี้ หรือร้านไม่ถึงเกณฑ์ (หน้าบาง)
  if (!page || !page.dish || !Array.isArray(page.shops) || page.total < (page.minShops || 2)) {
    return { status: 404 };
  }
  // ชื่อไทย (/food/ข้าวต้ม) หรือ "จังหวัดเชียงใหม่" → ที่อยู่มาตรฐาน
  const want = foodHref(lang, page.dish.slug, provinceRaw ? page.province : '');
  if (dishRaw !== page.dish.slug || (provinceRaw && provinceRaw !== page.province)) {
    return { redirect: want };
  }
  return { page, all, path: want };
}
