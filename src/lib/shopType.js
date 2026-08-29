// Maps a shop's business type to a "flavor" that drives which sections show,
// in what order, and which schema.org type the page advertises.

const FLAVOR_BY_TYPE = {
  'Restaurant/Cafe': 'food',
  Bakery: 'food',
  'Retail Store': 'retail',
  OTOP: 'retail',
  Hardware: 'retail',
  'Service Business': 'service',
  'Beauty Salon': 'service',
  'Thai Massage': 'service',
  'Auto Repair': 'service',
  'Tour Operator': 'service',
  'Tour/Transport': 'service',
  Fitness: 'service',
  Laundry: 'service',
  Florist: 'service',
  'Hotel/Accommodation': 'other',
  Other: 'other',
};

const SCHEMA_BY_TYPE = {
  'Restaurant/Cafe': 'Restaurant',
  Bakery: 'Bakery',
  'Retail Store': 'Store',
  OTOP: 'Store',
  Hardware: 'HardwareStore',
  'Service Business': 'LocalBusiness',
  'Beauty Salon': 'BeautySalon',
  'Thai Massage': 'HealthAndBeautyBusiness',
  'Auto Repair': 'AutoRepair',
  'Tour Operator': 'TravelAgency',
  'Tour/Transport': 'TravelAgency',
  Fitness: 'ExerciseGym',
  Laundry: 'DryCleaningOrLaundry',
  Florist: 'Florist',
  'Hotel/Accommodation': 'LodgingBusiness',
  Other: 'LocalBusiness',
};

// Section render order per flavor — only sections that actually have data render.
const SECTION_ORDER = {
  food: ['menu', 'products', 'services'],
  retail: ['products', 'menu', 'services'],
  service: ['services', 'products', 'menu'],
  other: ['menu', 'products', 'services'],
};

const TYPE_LABELS = {
  'Restaurant/Cafe': ['ร้านอาหาร / คาเฟ่', 'Restaurant & Cafe'],
  'Retail Store': ['ร้านค้าปลีก', 'Retail Store'],
  OTOP: ['สินค้า OTOP', 'OTOP Products'],
  'Service Business': ['ธุรกิจบริการ', 'Service Business'],
  'Hotel/Accommodation': ['โรงแรม / ที่พัก', 'Hotel & Accommodation'],
  'Tour Operator': ['ผู้ให้บริการทัวร์', 'Tour Operator'],
  'Tour/Transport': ['ทัวร์ / รถรับส่ง', 'Tour & Transport'],
  'Beauty Salon': ['ร้านเสริมสวย', 'Beauty Salon'],
  'Thai Massage': ['นวดแผนไทย / สปา', 'Thai Massage & Spa'],
  'Auto Repair': ['อู่ซ่อมรถ', 'Auto Repair'],
  Bakery: ['เบเกอรี่', 'Bakery'],
  Hardware: ['ร้านวัสดุก่อสร้าง', 'Hardware Store'],
  Florist: ['ร้านดอกไม้', 'Florist'],
  Fitness: ['ฟิตเนส', 'Fitness'],
  Laundry: ['ร้านซักรีด', 'Laundry'],
  Other: ['ร้านค้า', 'Shop'],
};

export function typeLabel(shop, lang) {
  const pair = TYPE_LABELS[primaryType(shop)] || TYPE_LABELS.Other;
  return lang === 'en' ? pair[1] : pair[0];
}

export function primaryType(shop) {
  if (shop?.shopType) return shop.shopType;
  if (Array.isArray(shop?.shopTypes) && shop.shopTypes.length) return shop.shopTypes[0];
  return 'Other';
}

export function flavorOf(shop) {
  return FLAVOR_BY_TYPE[primaryType(shop)] || 'other';
}

export function schemaTypeOf(shop) {
  return SCHEMA_BY_TYPE[primaryType(shop)] || 'LocalBusiness';
}

export function sectionOrder(flavor) {
  return SECTION_ORDER[flavor] || SECTION_ORDER.other;
}

// /menu returns food + service items (kind !== 'product'). Split them apart.
export function splitMenuItems(items) {
  const food = [];
  const services = [];
  for (const item of items) {
    if (item?.isDeleted) continue;
    if (item?.kind === 'service') services.push(item);
    else food.push(item);
  }
  return { food, services };
}
