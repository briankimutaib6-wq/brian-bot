'use strict';

// 510 numbered shortcuts across five browsable categories. Each shortcut is
// handled by the same small, dependable response pack as its category.
const categories = [
  {
    key: 'quotes', title: 'Quotes', icon: '💬', prefix: 'quote', count: 102,
    responses: [
      'Small steps, taken consistently, lead to meaningful progress.',
      'Curiosity is a fine compass for a lifelong learner.',
      'Make room for the work that matters most.',
      'A thoughtful beginning can change the shape of the day.',
      'Keep learning; every answer opens a better question.',
      'Progress is built from patient effort, not perfect timing.',
      'Choose a direction, then take the next kind step.',
      'Good ideas grow when you give them attention.',
      'A little courage can make a new path possible.',
      'Rest is part of the journey, not a detour from it.'
    ]
  },
  {
    key: 'jokes', title: 'Jokes', icon: '😄', prefix: 'joke', count: 102,
    responses: [
      'Why did the computer get glasses? It wanted to improve its web sight! 🤓',
      'Why was the calendar so popular? It had a lot of dates! 📅',
      'I told my laptop I needed a break. It said, “No problem,” and went to sleep. 😴',
      'Why did the developer go broke? Too many cache problems. 💸',
      'What do clouds wear under their raincoats? Thunderwear! ☁️',
      'Why did the bicycle fall over? It was two-tired. 🚲',
      'What is a computer’s favorite snack? Microchips. 🍟',
      'Why was the math book sad? It had too many problems. 📘',
      'What do you call a sleeping dinosaur? A dino-snore. 🦖',
      'Why did the phone wear glasses? It lost its contacts. 📱'
    ]
  },
  {
    key: 'facts', title: 'Facts', icon: '🌍', prefix: 'fact', count: 102,
    responses: [
      'Octopuses have three hearts.',
      'A day on Venus is longer than its year.',
      'Botanically, bananas are berries; strawberries are not.',
      'Honeybees communicate food locations using a waggle dance.',
      'The Pacific Ocean is the largest ocean on Earth.',
      'An adult human typically has 206 bones.',
      'Sound travels faster through water than through air.',
      'The Moon is moving away from Earth by a few centimeters each year.',
      'A group of flamingos is often called a flamboyance.',
      'Water reaches its maximum density at about 4°C.'
    ]
  },
  {
    key: 'affirmations', title: 'Affirmations', icon: '🌱', prefix: 'affirm', count: 102,
    responses: [
      'I can take this one step at a time.',
      'My effort matters, even when progress is gradual.',
      'I am allowed to learn as I go.',
      'I can ask for help when I need it.',
      'I can make a fresh start today.',
      'I deserve patience and kindness, including from myself.',
      'I can focus on what is within my control.',
      'I am more than one difficult moment.',
      'Small wins are still wins.',
      'I can pause, breathe, and choose my next step.'
    ]
  },
  {
    key: 'tips', title: 'Tips', icon: '🧠', prefix: 'tip', count: 102,
    responses: [
      'Try a 25-minute focus session followed by a short break.',
      'Write down your next action to make a big task feel smaller.',
      'Drink some water and take a brief stretch break.',
      'Use a password manager and unique passwords for important accounts.',
      'Back up important files to a second, separate location.',
      'For clearer messages, put the main request in the first sentence.',
      'A short walk can be a useful reset between tasks.',
      'Check the source and date before sharing a surprising claim.',
      'Keep a small list of recurring tasks so they are easier to remember.',
      'Turn off nonessential notifications when you need focused time.'
    ]
  }
];

const lookup = new Map();
for (const category of categories) {
  for (let index = 1; index <= category.count; index++) {
    lookup.set(`${category.prefix}${String(index).padStart(3, '0')}`, category);
  }
}

function getResponse(command) {
  const category = lookup.get(command);
  if (!category) return null;
  const choice = category.responses[Math.floor(Math.random() * category.responses.length)];
  return `${category.icon} ${choice}`;
}

function list(categoryKey, page = 1, pageSize = 20) {
  const category = categories.find(item => item.key === categoryKey);
  if (!category) return { page: 1, pages: 1, names: [] };
  const pages = Math.ceil(category.count / pageSize);
  const safePage = Number.isFinite(page) ? Math.min(Math.max(1, page), pages) : 1;
  const start = (safePage - 1) * pageSize;
  const names = Array.from({ length: Math.min(pageSize, category.count - start) }, (_, offset) =>
    `${category.prefix}${String(start + offset + 1).padStart(3, '0')}`
  );
  return { page: safePage, pages, names };
}

module.exports = {
  categories,
  count: lookup.size,
  getResponse,
  list
};
