/**
 * Deliberately Egyptian, not a translation of a foreign app's list.
 * `slug` is stable across devices so the same category never duplicates
 * when two installs sync into the same account.
 */
export interface DefaultCategory {
  slug: string;
  name: string;
  icon: string;
  color: string;
}

export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { slug: 'home_food',     name: 'أكل بيت',           icon: 'basket',            color: '#E8871E' },
  { slug: 'eating_out',    name: 'أكل بره وتوصيل',    icon: 'fast-food',         color: '#D64545' },
  { slug: 'transport',     name: 'مواصلات وبنزين',    icon: 'car',               color: '#2D6CDF' },
  { slug: 'rent_bills',    name: 'إيجار وفواتير',     icon: 'home',              color: '#6B4EFF' },
  { slug: 'internet',      name: 'إنترنت وموبايل',    icon: 'wifi',              color: '#1F9CB4' },
  { slug: 'health',        name: 'صحة ودوا',          icon: 'medkit',            color: '#17795E' },
  { slug: 'education',     name: 'تعليم',             icon: 'school',            color: '#0B5D51' },
  { slug: 'clothes',       name: 'ملابس',             icon: 'shirt',             color: '#C2528B' },
  { slug: 'gifts',         name: 'هدايا ومناسبات',    icon: 'gift',              color: '#E0457B' },
  { slug: 'coffee_out',    name: 'قهوة وخروجات',      icon: 'cafe',              color: '#8B5E3C' },
  { slug: 'subscriptions', name: 'اشتراكات',          icon: 'repeat',            color: '#4A5568' },
  { slug: 'cigarettes',    name: 'سجاير',             icon: 'flame',             color: '#7A6A55' },
  { slug: 'home_repair',   name: 'صيانة البيت',       icon: 'hammer',            color: '#5C6BC0' },
  { slug: 'work',          name: 'مصاريف الشغل',      icon: 'briefcase',         color: '#37474F' },
  { slug: 'charity',       name: 'صدقة وزكاة',        icon: 'heart',             color: '#2E7D32' },
  { slug: 'family',        name: 'تحويلات للأهل',     icon: 'people',            color: '#00897B' },
  { slug: 'misc',          name: 'متنوع',             icon: 'ellipsis-horizontal', color: '#8E8E93' },
];
