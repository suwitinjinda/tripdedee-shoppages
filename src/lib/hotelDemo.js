// ที่พักตัวอย่าง/สาธิต (27 ต.ค. 2569) · ที่เดียวที่ตัดสินว่าที่พักไหนเป็นของสาธิต
// โมเดล Hotel ไม่มีธงสาธิต (isDemo/isSample) · ตอนตรวจมี "ตัวอย่าง โรงแรม Tripdedee พิจิตร" (hotelId 890103)
// เปิดให้ index อยู่ ซึ่งทำให้ Google/AI เข้าใจว่าเป็นที่พักจริง
// เกณฑ์: ธง isDemo/isSample ถ้าหลังบ้านส่งมาในอนาคต · ชื่อขึ้นต้นด้วย "ตัวอย่าง" · หรือ hotelId 890103
// สาธิต = noindex,follow + ไม่ใส่ JSON-LD ที่พัก
const DEMO_HOTEL_IDS = new Set(['890103']);

export function isDemoHotel(hotel, hotelId = '') {
  if (!hotel && !hotelId) return false;
  if (hotel && (hotel.isDemo === true || hotel.isSample === true)) return true;
  const ids = [hotelId, hotel?.hotelId].map((v) => String(v || '').trim()).filter(Boolean);
  if (ids.some((v) => DEMO_HOTEL_IDS.has(v))) return true;
  const names = [hotel?.name, hotel?.nameEn].map((v) => String(v || '').trim());
  return names.some((n) => n.startsWith('ตัวอย่าง'));
}
