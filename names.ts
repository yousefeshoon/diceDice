// names.ts
export const iranianNames: string[] = [
  // Male Names
  "امیرعلی", "محمد", "علی", "امیرحسین", "حسین", "ابوالفضل", "امیرعباس", "محمدطاها",
  "محمدحسین", "کیان", "محمدرضا", "ماهان", "آراد", "آرتین", "سامیار", "یوسف",
  "رضا", "مهدی", "ایلیا", "طاها", "آرمین", "بنیامین", "دانیال", "سبحان",
  "پرهام", "آرین", "عرفان", "صدرا", "پارسا", "امیرمهدی",
  // Female Names
  "فاطمه", "زهرا", "حلما", "زینب", "یسنا", "نازنین زهرا", "آوا", "باران",
  "ریحانه", "مرسانا", "رها", "هستی", "ثنا", "النا", "سارینا", "اسرا",
  "مریم", "سوفیا", "آیلین", "محدثه", "حنانه", "کوثر", "نگار", "یکتا",
  "هلیا", "سوگند", "ستایش", "مهدیس", "آیناز", "بهار",
];

// Fisher-Yates shuffle algorithm to get random unique names from the list.
export const getRandomNames = (count: number): string[] => {
  const shuffled = [...iranianNames];
  let currentIndex = shuffled.length;
  let randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex !== 0) {
    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [shuffled[currentIndex], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[currentIndex],
    ];
  }

  return shuffled.slice(0, count);
};
