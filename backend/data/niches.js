export const NICHE_REGISTRY = [
  { id: 'books', names: ['книги','литература','издательство','писательство','чтение','библиотека'], category: 'Контент/Образование', templates: ['book_review','author_interview','reading_challenge'] },
  { id: 'beauty', names: ['бьюти','красота','косметика','уход','макияж','скинкар','парфюм'], category: 'E-com/Бьюти', templates: ['product_review','tutorial','before_after'] },
  { id: 'it', names: ['it','технологии','программирование','софт','гаджеты','айти','dev'], category: 'Технологии', templates: ['code_tips','tech_review','startup_story'] },
  { id: 'coffee', names: ['кофейня','кофе','бариста','кофе с собой','обжарка'], category: 'Еда/Напитки', templates: ['recipe','behind_the_scenes','barista_life'] },
  { id: 'fitness', names: ['фитнес','спорт','тренировки','зож','питание','йога'], category: 'Здоровье/Спорт', templates: ['workout','motivation','nutrition'] },
  { id: 'realestate', names: ['недвижимость','квартиры','ипотека','жк','застройщик','риелтор'], category: 'Недвижимость', templates: ['tour','investment','market_update'] },
  { id: 'fashion', names: ['одежда','мода','стиль','лукбук','шопинг'], category: 'E-com/Мода', templates: ['lookbook','haul','styling_tips'] },
  { id: 'food', names: ['еда','ресторан','доставка','рецепт','кухня'], category: 'Еда', templates: ['recipe','review','cooking_process'] },
  { id: 'education', names: ['образование','курсы','обучение','репетитор','школа'], category: 'Образование', templates: ['study_tips','course_promo','success_story'] },
  { id: 'travel', names: ['путешествия','туризм','отели','авиа','гид'], category: 'Путешествия', templates: ['vlog','guide','checklist'] },
  { id: 'auto', names: ['авто','машины','автосервис','тюнинг','электромобили'], category: 'Авто', templates: ['review','comparison','maintenance'] },
  { id: 'finance', names: ['финансы','инвестиции','крипта','трейдинг','банк'], category: 'Финансы', templates: ['tips','market_update','crypto_analysis'] },
  { id: 'health', names: ['здоровье','медицина','витамины','диета','психология'], category: 'Здоровье', templates: ['tips','myths','expert_opinion'] },
  { id: 'pets', names: ['животные','питомцы','собаки','кошки','ветеринар'], category: 'Питомцы', templates: ['care','funny','products'] },
  { id: 'kids', names: ['дети','родители','мама','воспитание','развитие'], category: 'Дети', templates: ['tips','activities','products'] },
  { id: 'gaming', names: ['игры','гейминг','стрим','twitch','esports'], category: 'Игры', templates: ['review','highlights','news'] },
  { id: 'music', names: ['музыка','артист','продюсер','звукозапись'], category: 'Музыка', templates: ['release','behind','tips'] },
  { id: 'design', names: ['дизайн','графика','ui','ux','фриланс'], category: 'Дизайн', templates: ['portfolio','tips','trends'] },
  { id: 'photo', names: ['фото','фотограф','обработка','съёмка'], category: 'Фото', templates: ['tips','before_after','gear'] },
  { id: 'law', names: ['юрист','закон','бизнес','регистрация','налоги'], category: 'Юриспруденция', templates: ['explainer','news','checklist'] },
];

export function findNiche(input) {
  if (!input) return null;
  const clean = input.toLowerCase().trim();
  let match = NICHE_REGISTRY.find(n => n.names.includes(clean));
  if (match) return match;
  match = NICHE_REGISTRY.find(n => n.names.some(name => name.includes(clean) || clean.includes(name)));
  if (match) return match;
  return null;
}
