import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================
// CATEGORIES
// ============================================
const categories = [
  { name: "Ресторан", slug: "restaurant", icon: "utensils", color: "#E74C3C" },
  { name: "Кафе", slug: "cafe", icon: "coffee", color: "#F39C12" },
  { name: "Бар", slug: "bar", icon: "beer", color: "#9B59B6" },
  { name: "Парк", slug: "park", icon: "tree", color: "#27AE60" },
  { name: "ТРЦ", slug: "mall", icon: "shopping-bag", color: "#3498DB" },
  {
    name: "Развлечения",
    slug: "entertainment",
    icon: "sparkles",
    color: "#E91E63",
  },
];

// ============================================
// TAGS
// ============================================
const tags = [
  { name: "Wi-Fi", slug: "wifi" },
  { name: "Парковка", slug: "parking" },
  { name: "Детская зона", slug: "kids-zone" },
  { name: "Терраса", slug: "terrace" },
  { name: "Живая музыка", slug: "live-music" },
  { name: "С животными", slug: "pet-friendly" },
  { name: "Халяль", slug: "halal" },
  { name: "Бизнес-ланч", slug: "business-lunch" },
  { name: "Круглосуточно", slug: "24h" },
  { name: "Доставка", slug: "delivery" },
  { name: "Кальян", slug: "hookah" },
  { name: "VIP-зал", slug: "vip" },
];

// ============================================
// VENUES — 70 заведений Алматы
// ============================================
interface VenueSeed {
  name: string;
  slug: string;
  categorySlug: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp: string;
  liveScore: number;
  tagSlugs: string[];
  description: string;
  workingHours: Record<string, string>;
}

const defaultHours = {
  mon: "10:00-23:00",
  tue: "10:00-23:00",
  wed: "10:00-23:00",
  thu: "10:00-23:00",
  fri: "10:00-01:00",
  sat: "11:00-01:00",
  sun: "11:00-22:00",
};

const parkHours = {
  mon: "06:00-23:00",
  tue: "06:00-23:00",
  wed: "06:00-23:00",
  thu: "06:00-23:00",
  fri: "06:00-23:00",
  sat: "06:00-23:00",
  sun: "06:00-23:00",
};

const mallHours = {
  mon: "10:00-22:00",
  tue: "10:00-22:00",
  wed: "10:00-22:00",
  thu: "10:00-22:00",
  fri: "10:00-22:00",
  sat: "10:00-22:00",
  sun: "10:00-22:00",
};

const venues: VenueSeed[] = [
  // ===== РЕСТОРАНЫ (20) =====
  {
    name: "Del Papa",
    slug: "del-papa",
    categorySlug: "restaurant",
    address: "ул. Кабанбай Батыра 78, Алматы",
    latitude: 43.2565,
    longitude: 76.9457,
    phone: "+7 727 250 7700",
    whatsapp: "77272507700",
    liveScore: 8.3,
    tagSlugs: ["wifi", "parking", "terrace", "halal"],
    description: "Итальянская кухня в центре Алматы с уютной террасой",
    workingHours: defaultHours,
  },
  {
    name: "Kishlak",
    slug: "kishlak",
    categorySlug: "restaurant",
    address: "ул. Толе Би 73, Алматы",
    latitude: 43.2538,
    longitude: 76.9302,
    phone: "+7 727 291 6868",
    whatsapp: "77272916868",
    liveScore: 8.7,
    tagSlugs: ["wifi", "parking", "halal", "kids-zone", "vip"],
    description:
      "Лучший плов в городе. Узбекская кухня в аутентичном интерьере",
    workingHours: defaultHours,
  },
  {
    name: "Grill House",
    slug: "grill-house",
    categorySlug: "restaurant",
    address: "пр. Достык 36, Алматы",
    latitude: 43.2421,
    longitude: 76.9555,
    phone: "+7 727 264 1111",
    whatsapp: "77272641111",
    liveScore: 7.9,
    tagSlugs: ["wifi", "parking", "terrace", "live-music"],
    description: "Стейки на гриле и крафтовое пиво с видом на горы",
    workingHours: defaultHours,
  },
  {
    name: "Navat",
    slug: "navat",
    categorySlug: "restaurant",
    address: "ул. Жибек Жолы 50, Алматы",
    latitude: 43.2575,
    longitude: 76.9458,
    phone: "+7 727 273 5050",
    whatsapp: "77272735050",
    liveScore: 8.1,
    tagSlugs: ["wifi", "halal", "kids-zone", "vip", "parking"],
    description:
      "Восточная кухня с национальным колоритом и живыми выступлениями",
    workingHours: defaultHours,
  },
  {
    name: "Дареджани",
    slug: "darejani",
    categorySlug: "restaurant",
    address: "ул. Курмангазы 102, Алматы",
    latitude: 43.2494,
    longitude: 76.9289,
    phone: "+7 727 267 0202",
    whatsapp: "77272670202",
    liveScore: 8.5,
    tagSlugs: ["wifi", "parking", "terrace", "live-music"],
    description: "Аутентичная грузинская кухня. Хинкали, хачапури, вино",
    workingHours: defaultHours,
  },
  {
    name: "Ракета Бургер",
    slug: "raketa-burger",
    categorySlug: "restaurant",
    address: "ул. Панфилова 110, Алматы",
    latitude: 43.2587,
    longitude: 76.9476,
    phone: "+7 700 123 4567",
    whatsapp: "77001234567",
    liveScore: 7.4,
    tagSlugs: ["wifi", "delivery"],
    description: "Сочные бургеры ручной работы, крафт-лимонады",
    workingHours: defaultHours,
  },
  {
    name: "Line Brew",
    slug: "line-brew",
    categorySlug: "restaurant",
    address: "ул. Гоголя 2, Алматы",
    latitude: 43.2609,
    longitude: 76.9533,
    phone: "+7 727 279 7788",
    whatsapp: "77272797788",
    liveScore: 7.8,
    tagSlugs: ["wifi", "parking", "terrace", "live-music", "hookah"],
    description: "Пивоварня-ресторан с собственным крафтовым пивом",
    workingHours: defaultHours,
  },
  {
    name: "Алаша",
    slug: "alasha",
    categorySlug: "restaurant",
    address: "ул. Оспанова 40, Алматы",
    latitude: 43.2316,
    longitude: 76.9551,
    phone: "+7 727 263 5959",
    whatsapp: "77272635959",
    liveScore: 9.1,
    tagSlugs: ["wifi", "parking", "halal", "vip", "kids-zone", "terrace"],
    description:
      "Премиальная казахская кухня в горах. Бешбармак от шеф-повара",
    workingHours: defaultHours,
  },
  {
    name: "Пиросмани",
    slug: "pirosmani",
    categorySlug: "restaurant",
    address: "пр. Достык 104, Алматы",
    latitude: 43.2345,
    longitude: 76.9563,
    phone: "+7 727 264 3300",
    whatsapp: "77272643300",
    liveScore: 8.0,
    tagSlugs: ["wifi", "parking", "terrace"],
    description: "Классическая грузинская кухня с панорамным видом",
    workingHours: defaultHours,
  },
  {
    name: "Sushi Bar",
    slug: "sushi-bar-almaty",
    categorySlug: "restaurant",
    address: "ул. Фурманова 187, Алматы",
    latitude: 43.2389,
    longitude: 76.9365,
    phone: "+7 727 293 8888",
    whatsapp: "77272938888",
    liveScore: 6.9,
    tagSlugs: ["wifi", "delivery", "parking"],
    description: "Японская кухня — суши, роллы, сашими",
    workingHours: defaultHours,
  },
  {
    name: "Чёрная Жемчужина",
    slug: "chyornaya-zhemchuzhina",
    categorySlug: "restaurant",
    address: "ул. Байтурсынова 159, Алматы",
    latitude: 43.2446,
    longitude: 76.9193,
    phone: "+7 727 292 0505",
    whatsapp: "77272920505",
    liveScore: 7.2,
    tagSlugs: ["wifi", "parking", "vip", "live-music"],
    description: "Рыбный ресторан — морепродукты и стейки",
    workingHours: defaultHours,
  },
  {
    name: "Tandoor",
    slug: "tandoor",
    categorySlug: "restaurant",
    address: "ул. Шевченко 137, Алматы",
    latitude: 43.2476,
    longitude: 76.9288,
    phone: "+7 727 250 5656",
    whatsapp: "77272505656",
    liveScore: 7.6,
    tagSlugs: ["wifi", "halal", "delivery", "parking"],
    description: "Индийская кухня — карри, тандури, наан",
    workingHours: defaultHours,
  },
  {
    name: "АBC Ресторан",
    slug: "abc-restaurant",
    categorySlug: "restaurant",
    address: "пр. Абая 68, Алматы",
    latitude: 43.2401,
    longitude: 76.9397,
    phone: "+7 727 250 1010",
    whatsapp: "77272501010",
    liveScore: 6.5,
    tagSlugs: ["wifi", "parking", "business-lunch"],
    description: "Европейская кухня, бизнес-ланчи для офисных сотрудников",
    workingHours: defaultHours,
  },
  {
    name: "Qaimaq",
    slug: "qaimaq",
    categorySlug: "restaurant",
    address: "ул. Тулебаева 38, Алматы",
    latitude: 43.2531,
    longitude: 76.9445,
    phone: "+7 727 261 2525",
    whatsapp: "77272612525",
    liveScore: 8.8,
    tagSlugs: ["wifi", "halal", "kids-zone", "terrace"],
    description: "Современная казахская кухня. Авторские блюда из местных продуктов",
    workingHours: defaultHours,
  },
  {
    name: "The Brew",
    slug: "the-brew",
    categorySlug: "restaurant",
    address: "ул. Муканова 241, Алматы",
    latitude: 43.2502,
    longitude: 76.9176,
    phone: "+7 727 346 7890",
    whatsapp: "77273467890",
    liveScore: 7.1,
    tagSlugs: ["wifi", "terrace", "parking"],
    description: "Гастропаб с крафтовым пивом и бургерами",
    workingHours: defaultHours,
  },
  {
    name: "Рустик",
    slug: "rustik",
    categorySlug: "restaurant",
    address: "ул. Назарбаева 240, Алматы",
    latitude: 43.2356,
    longitude: 76.9498,
    phone: "+7 727 264 7777",
    whatsapp: "77272647777",
    liveScore: 7.5,
    tagSlugs: ["wifi", "parking", "kids-zone", "business-lunch"],
    description: "Домашняя кухня в стиле рустик. Выпечка из дровяной печи",
    workingHours: defaultHours,
  },
  {
    name: "BarBQ",
    slug: "barbq",
    categorySlug: "restaurant",
    address: "ул. Жандосова 58, Алматы",
    latitude: 43.2133,
    longitude: 76.9267,
    phone: "+7 727 302 0101",
    whatsapp: "77273020101",
    liveScore: 7.3,
    tagSlugs: ["wifi", "parking", "delivery", "halal"],
    description: "Мясо на гриле, шашлыки, кебабы в семейной атмосфере",
    workingHours: defaultHours,
  },
  {
    name: "La Barca",
    slug: "la-barca",
    categorySlug: "restaurant",
    address: "ул. Маметовой 54, Алматы",
    latitude: 43.2519,
    longitude: 76.9379,
    phone: "+7 727 272 1234",
    whatsapp: "77272721234",
    liveScore: 7.7,
    tagSlugs: ["wifi", "terrace", "parking", "vip"],
    description: "Средиземноморская кухня с авторской подачей",
    workingHours: defaultHours,
  },
  {
    name: "Асадор",
    slug: "asador",
    categorySlug: "restaurant",
    address: "пр. Аль-Фараби 77/8, Алматы",
    latitude: 43.2182,
    longitude: 76.9283,
    phone: "+7 727 311 5555",
    whatsapp: "77273115555",
    liveScore: 8.4,
    tagSlugs: ["wifi", "parking", "terrace", "vip", "live-music"],
    description: "Аргентинский гриль. Стейки на открытом огне",
    workingHours: defaultHours,
  },
  {
    name: "Казахская Юрта",
    slug: "kazakhskaya-yurta",
    categorySlug: "restaurant",
    address: "пр. Аль-Фараби 140, Алматы",
    latitude: 43.2156,
    longitude: 76.8942,
    phone: "+7 727 311 0909",
    whatsapp: "77273110909",
    liveScore: 8.6,
    tagSlugs: ["halal", "parking", "kids-zone", "vip"],
    description: "Национальная кухня в настоящей юрте. Бешбармак, казы, курт",
    workingHours: defaultHours,
  },

  // ===== КАФЕ (15) =====
  {
    name: "Coffee Boom",
    slug: "coffee-boom",
    categorySlug: "cafe",
    address: "ул. Абая 52, Алматы",
    latitude: 43.2401,
    longitude: 76.9378,
    phone: "+7 700 555 0001",
    whatsapp: "77005550001",
    liveScore: 7.2,
    tagSlugs: ["wifi", "business-lunch"],
    description:
      "Сеть кофеен со специальным кофе и десертами. Уютно работать",
    workingHours: {
      mon: "07:30-22:00",
      tue: "07:30-22:00",
      wed: "07:30-22:00",
      thu: "07:30-22:00",
      fri: "07:30-23:00",
      sat: "09:00-23:00",
      sun: "09:00-21:00",
    },
  },
  {
    name: "Чашка",
    slug: "chashka",
    categorySlug: "cafe",
    address: "ул. Розыбакиева 247, Алматы",
    latitude: 43.2245,
    longitude: 76.9178,
    phone: "+7 700 555 0002",
    whatsapp: "77005550002",
    liveScore: 5.4,
    tagSlugs: ["wifi"],
    description: "Уютная кофейня в спальном районе с домашней выпечкой",
    workingHours: {
      mon: "08:00-21:00",
      tue: "08:00-21:00",
      wed: "08:00-21:00",
      thu: "08:00-21:00",
      fri: "08:00-22:00",
      sat: "09:00-22:00",
      sun: "09:00-20:00",
    },
  },
  {
    name: "Bowls & Bites",
    slug: "bowls-and-bites",
    categorySlug: "cafe",
    address: "ул. Кабанбай Батыра 102, Алматы",
    latitude: 43.2588,
    longitude: 76.9511,
    phone: "+7 700 555 0003",
    whatsapp: "77005550003",
    liveScore: 8.1,
    tagSlugs: ["wifi", "delivery", "pet-friendly"],
    description: "Здоровая еда — боулы, смузи, авокадо-тосты",
    workingHours: defaultHours,
  },
  {
    name: "Bro Coffee",
    slug: "bro-coffee",
    categorySlug: "cafe",
    address: "ул. Толе Би 59, Алматы",
    latitude: 43.2542,
    longitude: 76.9332,
    phone: "+7 700 555 0004",
    whatsapp: "77005550004",
    liveScore: 6.8,
    tagSlugs: ["wifi", "business-lunch"],
    description: "Третья волна кофе. Ручная обжарка, альтернативные способы заваривания",
    workingHours: defaultHours,
  },
  {
    name: "Paul",
    slug: "paul-almaty",
    categorySlug: "cafe",
    address: "пр. Достык 5, Алматы",
    latitude: 43.2479,
    longitude: 76.9553,
    phone: "+7 727 261 0707",
    whatsapp: "77272610707",
    liveScore: 7.6,
    tagSlugs: ["wifi", "terrace", "kids-zone"],
    description: "Французская булочная-кафе. Круассаны и патиссерия",
    workingHours: defaultHours,
  },
  {
    name: "COCO",
    slug: "coco-almaty",
    categorySlug: "cafe",
    address: "ул. Панфилова 76, Алматы",
    latitude: 43.2567,
    longitude: 76.9467,
    phone: "+7 700 555 0005",
    whatsapp: "77005550005",
    liveScore: 7.9,
    tagSlugs: ["wifi", "terrace", "delivery"],
    description: "Модное кафе-бистро на Арбате. Бранчи и коктейли",
    workingHours: defaultHours,
  },
  {
    name: "Green Tea",
    slug: "green-tea",
    categorySlug: "cafe",
    address: "ул. Казыбек Би 38, Алматы",
    latitude: 43.2518,
    longitude: 76.9435,
    phone: "+7 700 555 0006",
    whatsapp: "77005550006",
    liveScore: 6.3,
    tagSlugs: ["wifi", "delivery"],
    description: "Чайная с широким выбором зелёных и травяных чаёв",
    workingHours: defaultHours,
  },
  {
    name: "Куренга",
    slug: "kurenga",
    categorySlug: "cafe",
    address: "ул. Байтурсынова 119, Алматы",
    latitude: 43.2478,
    longitude: 76.9211,
    phone: "+7 700 555 0007",
    whatsapp: "77005550007",
    liveScore: 7.0,
    tagSlugs: ["wifi", "kids-zone", "halal", "business-lunch"],
    description: "Семейное кафе с детским меню и игровой зоной",
    workingHours: defaultHours,
  },
  {
    name: "Simple Coffee",
    slug: "simple-coffee",
    categorySlug: "cafe",
    address: "ул. Жамбыла 100, Алматы",
    latitude: 43.2553,
    longitude: 76.9344,
    phone: "+7 700 555 0008",
    whatsapp: "77005550008",
    liveScore: 8.4,
    tagSlugs: ["wifi", "pet-friendly"],
    description: "Минималистичная кофейня для фрилансеров. Розетки у каждого столика",
    workingHours: defaultHours,
  },
  {
    name: "Крем",
    slug: "krem-cafe",
    categorySlug: "cafe",
    address: "ул. Тулебаева 77, Алматы",
    latitude: 43.2497,
    longitude: 76.9451,
    phone: "+7 700 555 0009",
    whatsapp: "77005550009",
    liveScore: 7.5,
    tagSlugs: ["wifi", "terrace", "delivery"],
    description: "Кафе-кондитерская. Торты на заказ и десерты авторской работы",
    workingHours: defaultHours,
  },
  {
    name: "Шоколадница",
    slug: "shokoladnitsa",
    categorySlug: "cafe",
    address: "пр. Абая 109, Алматы",
    latitude: 43.2405,
    longitude: 76.9282,
    phone: "+7 727 300 1234",
    whatsapp: "77273001234",
    liveScore: 5.9,
    tagSlugs: ["wifi", "parking", "kids-zone", "delivery"],
    description: "Сетевая кофейня — завтраки, десерты, бизнес-ланчи",
    workingHours: defaultHours,
  },
  {
    name: "Raw Vegan Cafe",
    slug: "raw-vegan-cafe",
    categorySlug: "cafe",
    address: "ул. Курмангазы 61, Алматы",
    latitude: 43.2489,
    longitude: 76.9358,
    phone: "+7 700 555 0010",
    whatsapp: "77005550010",
    liveScore: 6.7,
    tagSlugs: ["wifi", "pet-friendly", "delivery"],
    description: "Веганское кафе — сыроедческие десерты, смузи-боулы",
    workingHours: defaultHours,
  },
  {
    name: "Coffeedelia",
    slug: "coffeedelia",
    categorySlug: "cafe",
    address: "ул. Макатаева 117, Алматы",
    latitude: 43.2612,
    longitude: 76.9355,
    phone: "+7 700 555 0011",
    whatsapp: "77005550011",
    liveScore: 8.0,
    tagSlugs: ["wifi", "business-lunch", "terrace"],
    description: "Кофейня-коворкинг. Тихо, быстрый Wi-Fi, авторский кофе",
    workingHours: defaultHours,
  },
  {
    name: "Марципан",
    slug: "martsipan",
    categorySlug: "cafe",
    address: "ул. Гоголя 50, Алматы",
    latitude: 43.2593,
    longitude: 76.9425,
    phone: "+7 700 555 0012",
    whatsapp: "77005550012",
    liveScore: 7.3,
    tagSlugs: ["wifi", "kids-zone", "delivery"],
    description: "Семейная кондитерская с кофе и макарунами",
    workingHours: defaultHours,
  },
  {
    name: "Бариста",
    slug: "barista-cafe",
    categorySlug: "cafe",
    address: "ул. Шевченко 100, Алматы",
    latitude: 43.2478,
    longitude: 76.9335,
    phone: "+7 700 555 0013",
    whatsapp: "77005550013",
    liveScore: 6.1,
    tagSlugs: ["wifi"],
    description: "Бюджетная кофейня с хорошим эспрессо",
    workingHours: defaultHours,
  },

  // ===== БАРЫ (10) =====
  {
    name: "Барвиха",
    slug: "barvikha",
    categorySlug: "bar",
    address: "ул. Панфилова 88, Алматы",
    latitude: 43.2579,
    longitude: 76.9472,
    phone: "+7 700 777 0001",
    whatsapp: "77007770001",
    liveScore: 8.2,
    tagSlugs: ["wifi", "live-music", "hookah"],
    description: "Коктейльный бар с живой музыкой. Авторские коктейли",
    workingHours: {
      mon: "17:00-02:00",
      tue: "17:00-02:00",
      wed: "17:00-02:00",
      thu: "17:00-03:00",
      fri: "17:00-05:00",
      sat: "17:00-05:00",
      sun: "17:00-01:00",
    },
  },
  {
    name: "Public Bar",
    slug: "public-bar",
    categorySlug: "bar",
    address: "ул. Кунаева 35, Алматы",
    latitude: 43.2557,
    longitude: 76.9502,
    phone: "+7 700 777 0002",
    whatsapp: "77007770002",
    liveScore: 7.8,
    tagSlugs: ["wifi", "live-music"],
    description: "Паб с живыми концертами каждую пятницу",
    workingHours: {
      mon: "16:00-01:00",
      tue: "16:00-01:00",
      wed: "16:00-01:00",
      thu: "16:00-02:00",
      fri: "16:00-04:00",
      sat: "16:00-04:00",
      sun: "16:00-00:00",
    },
  },
  {
    name: "Guinness Pub",
    slug: "guinness-pub",
    categorySlug: "bar",
    address: "ул. Жибек Жолы 60, Алматы",
    latitude: 43.2571,
    longitude: 76.9423,
    phone: "+7 700 777 0003",
    whatsapp: "77007770003",
    liveScore: 6.5,
    tagSlugs: ["wifi", "live-music", "parking"],
    description: "Ирландский паб — Guinness из-под крана, спортивные трансляции",
    workingHours: {
      mon: "12:00-01:00",
      tue: "12:00-01:00",
      wed: "12:00-01:00",
      thu: "12:00-02:00",
      fri: "12:00-03:00",
      sat: "12:00-03:00",
      sun: "12:00-00:00",
    },
  },
  {
    name: "Chukubar",
    slug: "chukubar",
    categorySlug: "bar",
    address: "ул. Гоголя 40, Алматы",
    latitude: 43.2598,
    longitude: 76.9453,
    phone: "+7 700 777 0004",
    whatsapp: "77007770004",
    liveScore: 8.5,
    tagSlugs: ["wifi", "hookah", "live-music"],
    description: "Винный бар — натуральные вина и тапас",
    workingHours: defaultHours,
  },
  {
    name: "Сабантуй",
    slug: "sabantuy",
    categorySlug: "bar",
    address: "ул. Достык 89, Алматы",
    latitude: 43.2387,
    longitude: 76.9559,
    phone: "+7 700 777 0005",
    whatsapp: "77007770005",
    liveScore: 7.1,
    tagSlugs: ["wifi", "live-music", "hookah", "parking"],
    description: "Караоке-бар с восточной кухней",
    workingHours: defaultHours,
  },
  {
    name: "Mishelin",
    slug: "mishelin-bar",
    categorySlug: "bar",
    address: "ул. Курмангазы 80, Алматы",
    latitude: 43.2495,
    longitude: 76.9318,
    phone: "+7 700 777 0006",
    whatsapp: "77007770006",
    liveScore: 7.4,
    tagSlugs: ["wifi", "hookah"],
    description: "Коктейльный бар с авторской миксологией",
    workingHours: defaultHours,
  },
  {
    name: "Sky Lounge",
    slug: "sky-lounge",
    categorySlug: "bar",
    address: "пр. Достык 240, Алматы",
    latitude: 43.2267,
    longitude: 76.9572,
    phone: "+7 700 777 0007",
    whatsapp: "77007770007",
    liveScore: 9.0,
    tagSlugs: ["wifi", "parking", "vip", "hookah"],
    description: "Руфтоп-бар на 25 этаже с панорамным видом на горы",
    workingHours: defaultHours,
  },
  {
    name: "Barley",
    slug: "barley",
    categorySlug: "bar",
    address: "ул. Абая 143, Алматы",
    latitude: 43.2398,
    longitude: 76.9197,
    phone: "+7 700 777 0008",
    whatsapp: "77007770008",
    liveScore: 6.8,
    tagSlugs: ["wifi", "parking"],
    description: "Пивной бар — 40 сортов крафтового пива",
    workingHours: defaultHours,
  },
  {
    name: "12 Bar",
    slug: "12-bar",
    categorySlug: "bar",
    address: "ул. Макатаева 41, Алматы",
    latitude: 43.2605,
    longitude: 76.9412,
    phone: "+7 700 777 0009",
    whatsapp: "77007770009",
    liveScore: 7.6,
    tagSlugs: ["wifi", "live-music"],
    description: "Рок-бар с живыми выступлениями местных групп",
    workingHours: defaultHours,
  },
  {
    name: "Secret Room",
    slug: "secret-room",
    categorySlug: "bar",
    address: "ул. Тулебаева 55, Алматы",
    latitude: 43.2525,
    longitude: 76.9447,
    phone: "+7 700 777 0010",
    whatsapp: "77007770010",
    liveScore: 8.8,
    tagSlugs: ["wifi", "vip"],
    description: "Speakeasy-бар за скрытой дверью. Бронь обязательна",
    workingHours: defaultHours,
  },

  // ===== ПАРКИ (10) =====
  {
    name: "Парк 28 Панфиловцев",
    slug: "park-28-panfilovtsev",
    categorySlug: "park",
    address: "ул. Гоголя / Зенкова, Алматы",
    latitude: 43.258,
    longitude: 76.9575,
    phone: "",
    whatsapp: "",
    liveScore: 9.1,
    tagSlugs: ["kids-zone", "pet-friendly"],
    description: "Исторический парк в центре города. Вознесенский собор",
    workingHours: parkHours,
  },
  {
    name: "Центральный парк культуры и отдыха",
    slug: "gorky-park-almaty",
    categorySlug: "park",
    address: "ул. Гоголя 1, Алматы",
    latitude: 43.2611,
    longitude: 76.9645,
    phone: "+7 727 272 5500",
    whatsapp: "77272725500",
    liveScore: 8.4,
    tagSlugs: ["kids-zone", "pet-friendly", "parking"],
    description: "Главный парк города — аттракционы, прокат, пруды",
    workingHours: parkHours,
  },
  {
    name: "Ботанический сад",
    slug: "botanical-garden",
    categorySlug: "park",
    address: "ул. Тимирязева 36, Алматы",
    latitude: 43.2278,
    longitude: 76.9322,
    phone: "+7 727 394 8888",
    whatsapp: "",
    liveScore: 7.8,
    tagSlugs: ["kids-zone", "pet-friendly", "parking"],
    description: "6000+ видов растений. Тихое место для прогулок",
    workingHours: parkHours,
  },
  {
    name: "Парк Первого Президента",
    slug: "park-pervogo-prezidenta",
    categorySlug: "park",
    address: "пр. Аль-Фараби, Алматы",
    latitude: 43.2122,
    longitude: 76.9205,
    phone: "",
    whatsapp: "",
    liveScore: 8.9,
    tagSlugs: ["kids-zone", "pet-friendly", "parking"],
    description: "Огромный парк с фонтанами, велодорожками и детскими площадками",
    workingHours: parkHours,
  },
  {
    name: "Кок-Тобе",
    slug: "kok-tobe",
    categorySlug: "park",
    address: "гора Кок-Тобе, Алматы",
    latitude: 43.2314,
    longitude: 76.9812,
    phone: "+7 727 261 3333",
    whatsapp: "77272613333",
    liveScore: 9.3,
    tagSlugs: ["kids-zone", "parking"],
    description: "Смотровая площадка + парк развлечений на горе. Канатная дорога",
    workingHours: parkHours,
  },
  {
    name: "Медеу",
    slug: "medeu",
    categorySlug: "park",
    address: "урочище Медеу, Алматы",
    latitude: 43.1582,
    longitude: 77.0572,
    phone: "+7 727 386 6644",
    whatsapp: "",
    liveScore: 9.5,
    tagSlugs: ["parking", "kids-zone"],
    description: "Высокогорный каток и зона для горных прогулок",
    workingHours: parkHours,
  },
  {
    name: "Парк Фемили",
    slug: "family-park",
    categorySlug: "park",
    address: "ул. Жандосова 200, Алматы",
    latitude: 43.2025,
    longitude: 76.8945,
    phone: "+7 727 395 1000",
    whatsapp: "77273951000",
    liveScore: 7.2,
    tagSlugs: ["kids-zone", "parking", "pet-friendly"],
    description: "Семейный парк с детскими площадками и скейт-парком",
    workingHours: parkHours,
  },
  {
    name: "Japanese Garden",
    slug: "japanese-garden",
    categorySlug: "park",
    address: "пр. Аль-Фараби 93, Алматы",
    latitude: 43.218,
    longitude: 76.9355,
    phone: "",
    whatsapp: "",
    liveScore: 8.1,
    tagSlugs: ["pet-friendly"],
    description: "Японский сад — дзен-пространство для медитации и отдыха",
    workingHours: parkHours,
  },
  {
    name: "Парк Ганди",
    slug: "gandhi-park",
    categorySlug: "park",
    address: "ул. Курмангазы / Байтурсынова, Алматы",
    latitude: 43.2485,
    longitude: 76.9197,
    phone: "",
    whatsapp: "",
    liveScore: 6.4,
    tagSlugs: ["kids-zone", "pet-friendly"],
    description: "Тихий городской сквер. Скамейки, тень, фонтан",
    workingHours: parkHours,
  },
  {
    name: "Парк EXPO",
    slug: "expo-park",
    categorySlug: "park",
    address: "ул. Тимирязева 42, Алматы",
    latitude: 43.2304,
    longitude: 76.943,
    phone: "",
    whatsapp: "",
    liveScore: 6.9,
    tagSlugs: ["kids-zone", "pet-friendly", "parking"],
    description: "Парк рядом с выставочным центром. Большие газоны и дорожки",
    workingHours: parkHours,
  },

  // ===== ТРЦ (8) =====
  {
    name: "Mega Park",
    slug: "mega-park",
    categorySlug: "mall",
    address: "ул. Розыбакиева 263, Алматы",
    latitude: 43.2198,
    longitude: 76.9167,
    phone: "+7 727 331 0000",
    whatsapp: "77273310000",
    liveScore: 6.5,
    tagSlugs: ["parking", "kids-zone", "wifi"],
    description: "Крупнейший ТРЦ Алматы — 300+ магазинов, кинотеатр, каток",
    workingHours: mallHours,
  },
  {
    name: "Dostyk Plaza",
    slug: "dostyk-plaza",
    categorySlug: "mall",
    address: "пр. Достык 111, Алматы",
    latitude: 43.2355,
    longitude: 76.9569,
    phone: "+7 727 339 1111",
    whatsapp: "77273391111",
    liveScore: 7.8,
    tagSlugs: ["parking", "wifi", "kids-zone"],
    description: "Премиальный торговый центр. Люксовые бренды, ресторанный дворик",
    workingHours: mallHours,
  },
  {
    name: "Esentai Mall",
    slug: "esentai-mall",
    categorySlug: "mall",
    address: "пр. Аль-Фараби 77/7, Алматы",
    latitude: 43.219,
    longitude: 76.929,
    phone: "+7 727 311 2222",
    whatsapp: "77273112222",
    liveScore: 8.6,
    tagSlugs: ["parking", "wifi", "vip"],
    description: "Luxury shopping — Gucci, Prada, Louis Vuitton",
    workingHours: mallHours,
  },
  {
    name: "Forum Almaty",
    slug: "forum-almaty",
    categorySlug: "mall",
    address: "ул. Сейфуллина 617, Алматы",
    latitude: 43.2286,
    longitude: 76.9389,
    phone: "+7 727 334 5555",
    whatsapp: "77273345555",
    liveScore: 6.1,
    tagSlugs: ["parking", "wifi", "kids-zone"],
    description: "ТРЦ с кинотеатром IMAX и фуд-кортом",
    workingHours: mallHours,
  },
  {
    name: "Asia Park",
    slug: "asia-park",
    categorySlug: "mall",
    address: "ул. Райымбека 514А, Алматы",
    latitude: 43.2688,
    longitude: 76.8978,
    phone: "+7 727 346 7777",
    whatsapp: "77273467777",
    liveScore: 5.7,
    tagSlugs: ["parking", "wifi"],
    description: "Торговый центр с акцентом на электронику и технику",
    workingHours: mallHours,
  },
  {
    name: "ADK",
    slug: "adk-mall",
    categorySlug: "mall",
    address: "ул. Райымбека 239, Алматы",
    latitude: 43.2654,
    longitude: 76.9202,
    phone: "+7 727 276 6666",
    whatsapp: "77272766666",
    liveScore: 7.1,
    tagSlugs: ["parking", "wifi", "kids-zone"],
    description: "ТРЦ с развлечениями для детей и фуд-кортом",
    workingHours: mallHours,
  },
  {
    name: "Almaly Mall",
    slug: "almaly-mall",
    categorySlug: "mall",
    address: "ул. Тулебаева 170, Алматы",
    latitude: 43.243,
    longitude: 76.944,
    phone: "+7 727 261 8888",
    whatsapp: "77272618888",
    liveScore: 6.8,
    tagSlugs: ["parking", "wifi"],
    description: "Компактный торговый центр в центре города",
    workingHours: mallHours,
  },
  {
    name: "Керуен",
    slug: "keruen-mall",
    categorySlug: "mall",
    address: "пр. Абая 109, Алматы",
    latitude: 43.2397,
    longitude: 76.9249,
    phone: "+7 727 300 9999",
    whatsapp: "77273009999",
    liveScore: 5.3,
    tagSlugs: ["parking", "wifi"],
    description: "Торговый центр среднего сегмента с кинотеатром",
    workingHours: mallHours,
  },

  // ===== РАЗВЛЕЧЕНИЯ (7) =====
  {
    name: "Chaplin Cinemas",
    slug: "chaplin-cinemas",
    categorySlug: "entertainment",
    address: "пр. Достык 111, Алматы",
    latitude: 43.2358,
    longitude: 76.9565,
    phone: "+7 727 339 2222",
    whatsapp: "77273392222",
    liveScore: 7.9,
    tagSlugs: ["parking", "wifi", "kids-zone"],
    description: "Крупнейшая сеть кинотеатров — IMAX, Dolby Atmos",
    workingHours: mallHours,
  },
  {
    name: "Happylon",
    slug: "happylon",
    categorySlug: "entertainment",
    address: "ул. Розыбакиева 263, Алматы",
    latitude: 43.2201,
    longitude: 76.9165,
    phone: "+7 727 331 3333",
    whatsapp: "77273313333",
    liveScore: 7.4,
    tagSlugs: ["kids-zone", "parking"],
    description: "Крупнейший крытый парк развлечений для детей",
    workingHours: mallHours,
  },
  {
    name: "Лазертаг Arena",
    slug: "lazertag-arena",
    categorySlug: "entertainment",
    address: "ул. Жандосова 98, Алматы",
    latitude: 43.2101,
    longitude: 76.9301,
    phone: "+7 700 888 0001",
    whatsapp: "77008880001",
    liveScore: 6.8,
    tagSlugs: ["parking"],
    description: "Лазертаг-арена для взрослых и детей. Командные игры",
    workingHours: mallHours,
  },
  {
    name: "Escape Room Almaty",
    slug: "escape-room-almaty",
    categorySlug: "entertainment",
    address: "ул. Гоголя 65, Алматы",
    latitude: 43.2591,
    longitude: 76.9489,
    phone: "+7 700 888 0002",
    whatsapp: "77008880002",
    liveScore: 8.2,
    tagSlugs: ["wifi"],
    description: "10 квест-комнат разной сложности. Хоррор, детектив, фэнтези",
    workingHours: mallHours,
  },
  {
    name: "Bowling City",
    slug: "bowling-city",
    categorySlug: "entertainment",
    address: "ул. Фурманова 50, Алматы",
    latitude: 43.2422,
    longitude: 76.9378,
    phone: "+7 727 293 4444",
    whatsapp: "77272934444",
    liveScore: 6.3,
    tagSlugs: ["parking", "wifi", "kids-zone"],
    description: "Боулинг на 20 дорожек + бильярд и бар",
    workingHours: mallHours,
  },
  {
    name: "Shymbulak Ski Resort",
    slug: "shymbulak",
    categorySlug: "entertainment",
    address: "урочище Шымбулак, Алматы",
    latitude: 43.1345,
    longitude: 77.0795,
    phone: "+7 727 330 0999",
    whatsapp: "77273300999",
    liveScore: 9.4,
    tagSlugs: ["parking", "kids-zone"],
    description: "Горнолыжный курорт — трассы, подъёмники, горный ресторан",
    workingHours: {
      mon: "09:00-17:00",
      tue: "09:00-17:00",
      wed: "09:00-17:00",
      thu: "09:00-17:00",
      fri: "09:00-17:00",
      sat: "09:00-17:00",
      sun: "09:00-17:00",
    },
  },
  {
    name: "Театр Ауэзова",
    slug: "theatre-auezov",
    categorySlug: "entertainment",
    address: "пр. Абая 103, Алматы",
    latitude: 43.2407,
    longitude: 76.9289,
    phone: "+7 727 242 4646",
    whatsapp: "77272424646",
    liveScore: 7.6,
    tagSlugs: ["parking", "wifi"],
    description: "Казахский государственный академический театр драмы",
    workingHours: {
      mon: "09:00-18:00",
      tue: "09:00-18:00",
      wed: "09:00-18:00",
      thu: "09:00-18:00",
      fri: "09:00-21:00",
      sat: "10:00-21:00",
      sun: "10:00-18:00",
    },
  },
];

// ============================================
// DEMO REVIEWS
// ============================================
const reviewTemplates = {
  positive: [
    { text: "Отличное место! Вкусная еда и приятный персонал", sentiment: 0.9 },
    { text: "Очень уютная атмосфера, буду приходить ещё", sentiment: 0.85 },
    { text: "Быстро обслужили, всё свежее. Рекомендую!", sentiment: 0.88 },
    { text: "Прекрасное место для семейного отдыха", sentiment: 0.82 },
    { text: "Лучшее заведение в этом районе!", sentiment: 0.95 },
    { text: "Красивый интерьер, вкусные десерты", sentiment: 0.8 },
    { text: "Идеально для бизнес-встречи. Тихо и комфортно", sentiment: 0.78 },
    { text: "Приятно удивлены качеством. Придём снова", sentiment: 0.84 },
  ],
  neutral: [
    { text: "Нормальное место, средние цены", sentiment: 0.1 },
    { text: "Кухня на четвёрочку, обслуживание тоже", sentiment: 0.2 },
    { text: "Ничего особенного, но и жаловаться не на что", sentiment: 0.05 },
    { text: "Пришли большой компанией, в целом ок", sentiment: 0.15 },
  ],
  negative: [
    { text: "Долго ждали заказ, больше часа", sentiment: -0.7 },
    { text: "Грязный столик, официант невнимательный", sentiment: -0.8 },
    { text: "Цены завышены для такого качества", sentiment: -0.5 },
    { text: "Шумно, не слышно собеседника", sentiment: -0.6 },
    { text: "Блюдо было холодным, пришлось возвращать", sentiment: -0.75 },
  ],
};

const reviewSources = ["google", "2gis", "instagram", "manual"];

// ============================================
// HELPER FUNCTIONS
// ============================================

function randomBetween(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomBetween(min, max + 1));
}

function randomDate(daysBack: number): Date {
  const now = new Date();
  const pastMs = now.getTime() - daysBack * 24 * 60 * 60 * 1000;
  return new Date(pastMs + Math.random() * daysBack * 24 * 60 * 60 * 1000);
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateReviews(baseScore: number, count: number) {
  const reviews = [];
  for (let i = 0; i < count; i++) {
    const roll = Math.random();
    let template;
    if (baseScore >= 8) {
      template =
        roll < 0.7
          ? pickRandom(reviewTemplates.positive)
          : roll < 0.9
            ? pickRandom(reviewTemplates.neutral)
            : pickRandom(reviewTemplates.negative);
    } else if (baseScore >= 6) {
      template =
        roll < 0.4
          ? pickRandom(reviewTemplates.positive)
          : roll < 0.75
            ? pickRandom(reviewTemplates.neutral)
            : pickRandom(reviewTemplates.negative);
    } else {
      template =
        roll < 0.2
          ? pickRandom(reviewTemplates.positive)
          : roll < 0.5
            ? pickRandom(reviewTemplates.neutral)
            : pickRandom(reviewTemplates.negative);
    }

    reviews.push({
      text: template.text,
      sentiment: template.sentiment + randomBetween(-0.1, 0.1),
      source: pickRandom(reviewSources),
      rating: Math.max(1, Math.min(5, baseScore / 2 + randomBetween(-1, 1))),
      authorName: `User${randomInt(100, 9999)}`,
      createdAt: randomDate(30),
    });
  }
  return reviews;
}

function generateScoreHistory(baseScore: number, days: number) {
  const history = [];
  const now = new Date();
  for (let d = days; d >= 0; d--) {
    const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
    const score = Math.max(
      0,
      Math.min(10, baseScore + randomBetween(-1.2, 1.2)),
    );
    history.push({
      score: parseFloat(score.toFixed(1)),
      calculatedAt: date,
    });
  }
  return history;
}

function generateSocialSignals(baseScore: number) {
  const signals = [];
  const sources = ["instagram", "tiktok", "google_maps"];
  for (const source of sources) {
    for (let w = 3; w >= 0; w--) {
      const date = new Date(
        Date.now() - w * 7 * 24 * 60 * 60 * 1000,
      );
      signals.push({
        source,
        mentionCount: Math.floor(baseScore * randomBetween(2, 15)),
        sentimentAvg: parseFloat(
          (baseScore / 10 - 0.2 + randomBetween(0, 0.4)).toFixed(2),
        ),
        collectedAt: date,
      });
    }
  }
  return signals;
}

// ============================================
// MAIN SEED
// ============================================

async function main() {
  console.log("Seeding LiveCity database...\n");

  // Clean
  console.log("Cleaning existing data...");
  await prisma.socialSignal.deleteMany();
  await prisma.review.deleteMany();
  await prisma.scoreHistory.deleteMany();
  await prisma.venueTag.deleteMany();
  await prisma.venue.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  // Categories
  console.log("Creating categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    const created = await prisma.category.create({ data: cat });
    categoryMap.set(cat.slug, created.id);
  }
  console.log(`  ${categories.length} categories created`);

  // Tags
  console.log("Creating tags...");
  const tagMap = new Map<string, string>();
  for (const tag of tags) {
    const created = await prisma.tag.create({ data: tag });
    tagMap.set(tag.slug, created.id);
  }
  console.log(`  ${tags.length} tags created`);

  // Venues
  console.log("Creating venues with reviews, scores, signals...");
  let venueCount = 0;
  let reviewCount = 0;
  let scoreCount = 0;
  let signalCount = 0;

  for (const v of venues) {
    const categoryId = categoryMap.get(v.categorySlug);
    if (!categoryId) {
      console.error(`  Category not found: ${v.categorySlug}`);
      continue;
    }

    const venue = await prisma.venue.create({
      data: {
        name: v.name,
        slug: v.slug,
        description: v.description,
        address: v.address,
        latitude: v.latitude,
        longitude: v.longitude,
        phone: v.phone || null,
        whatsapp: v.whatsapp || null,
        photoUrls: [],
        workingHours: v.workingHours,
        liveScore: v.liveScore,
        categoryId,
      },
    });

    // Tags
    for (const tagSlug of v.tagSlugs) {
      const tagId = tagMap.get(tagSlug);
      if (tagId) {
        await prisma.venueTag.create({
          data: { venueId: venue.id, tagId },
        });
      }
    }

    // Reviews (5-10 per venue)
    const reviews = generateReviews(v.liveScore, randomInt(5, 10));
    for (const r of reviews) {
      await prisma.review.create({
        data: { ...r, venueId: venue.id },
      });
      reviewCount++;
    }

    // Score History (30 days)
    const history = generateScoreHistory(v.liveScore, 30);
    for (const h of history) {
      await prisma.scoreHistory.create({
        data: { ...h, venueId: venue.id },
      });
      scoreCount++;
    }

    // Social Signals
    const signals = generateSocialSignals(v.liveScore);
    for (const s of signals) {
      await prisma.socialSignal.create({
        data: { ...s, venueId: venue.id },
      });
      signalCount++;
    }

    venueCount++;
    if (venueCount % 10 === 0) {
      console.log(`  ${venueCount}/${venues.length} venues processed...`);
    }
  }

  console.log("\n=== SEED COMPLETE ===");
  console.log(`  Categories: ${categories.length}`);
  console.log(`  Tags: ${tags.length}`);
  console.log(`  Venues: ${venueCount}`);
  console.log(`  Reviews: ${reviewCount}`);
  console.log(`  Score History: ${scoreCount}`);
  console.log(`  Social Signals: ${signalCount}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
