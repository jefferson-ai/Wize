// Maps category names to emojis for visual display
const CATEGORY_EMOJI_MAP: Record<string, string> = {
  // Default expense categories (matching DEFAULT_CATEGORIES)
  'food & dining': '🍔',
  'transport': '🚗',
  'housing & rent': '🏠',
  'health & medical': '💊',
  'entertainment': '🎮',
  'shopping & clothing': '👗',
  'education': '📚',
  'travel': '✈️',
  'utilities': '💡',
  'home maintenance': '🔧',
  'fitness': '💪',
  'pets': '🐾',
  'gifts & donations': '🎁',
  'business': '💼',
  'other': '❓',

  // Additional aliases for flexible matching
  groceries: '🛒',
  food: '🍔',
  dining: '🍽️',
  restaurants: '🍽️',
  rent: '🏠',
  housing: '🏠',
  transportation: '🚗',
  health: '💊',
  healthcare: '💊',
  medical: '💊',
  shopping: '🛍️',
  clothing: '👗',
  gym: '💪',
  insurance: '🛡️',
  subscriptions: '📱',
  gifts: '🎁',
  donations: '❤️',
  personal: '👤',
  bills: '📄',
  internet: '🌐',
  phone: '📞',
  coffee: '☕',
  maintenance: '🔧',

  // Income categories
  salary: '💰',
  investments: '📈',
  freelance: '💼',
  investment: '📈',
  bonus: '🎉',
  refund: '🔄',
  rental: '🏘️',
  interest: '🏦',
  dividends: '📊',
};

export function getCategoryEmoji(categoryName: string | null | undefined): string {
  if (!categoryName) return '📦';
  const key = categoryName.toLowerCase().trim();

  // Direct match
  if (CATEGORY_EMOJI_MAP[key]) return CATEGORY_EMOJI_MAP[key];

  // Partial match: check if any key is contained in the name
  for (const [mapKey, emoji] of Object.entries(CATEGORY_EMOJI_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) {
      return emoji;
    }
  }

  return '📦';
}
