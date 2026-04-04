import { db } from '../../db';
import { categories } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { syncData } from '../sync/syncService';

// Use Expo Crypto for UUIDs on device
const generateId = () => Crypto.randomUUID();

// Muted, desaturated palette to match the app's charcoal (#212529) design system
const MUTED = {
  amber:    '#b5894e',
  slate:    '#5c6b7a',
  steel:    '#4a6580',
  rose:     '#9e6068',
  mauve:    '#7a6080',
  dusty:    '#8a607a',
  indigo:   '#5c5c8c',
  teal:     '#4a7a80',
  olive:    '#7a7a40',
  stone:    '#6b6560',
  terracotta: '#8c5e4a',
  lavender: '#706080',
  crimson:  '#884050',
  charcoal: '#4a5568',
  mist:     '#7a8896',
};

export const DEFAULT_CATEGORIES = [
  // Expenses (15 categories)
  { name: 'Food & Dining',       icon: 'utensils',       color: MUTED.amber,      type: 'expense' as const },
  { name: 'Transport',           icon: 'car',            color: MUTED.slate,      type: 'expense' as const },
  { name: 'Housing & Rent',      icon: 'home',           color: MUTED.steel,      type: 'expense' as const },
  { name: 'Health & Medical',    icon: 'heart',          color: MUTED.rose,       type: 'expense' as const },
  { name: 'Entertainment',       icon: 'film',           color: MUTED.mauve,      type: 'expense' as const },
  { name: 'Shopping & Clothing', icon: 'shopping-bag',   color: MUTED.dusty,      type: 'expense' as const },
  { name: 'Education',           icon: 'book',           color: MUTED.indigo,     type: 'expense' as const },
  { name: 'Travel',              icon: 'plane',          color: MUTED.teal,       type: 'expense' as const },
  { name: 'Utilities',           icon: 'lightbulb',      color: MUTED.olive,      type: 'expense' as const },
  { name: 'Home Maintenance',    icon: 'wrench',         color: MUTED.stone,      type: 'expense' as const },
  { name: 'Fitness',             icon: 'dumbbell',       color: MUTED.terracotta, type: 'expense' as const },
  { name: 'Pets',                icon: 'paw',            color: MUTED.lavender,   type: 'expense' as const },
  { name: 'Gifts & Donations',   icon: 'gift',           color: MUTED.crimson,    type: 'expense' as const },
  { name: 'Business',            icon: 'briefcase',      color: MUTED.charcoal,   type: 'expense' as const },
  { name: 'Other',               icon: 'more-horizontal',color: MUTED.mist,       type: 'expense' as const },
  // Income
  { name: 'Salary / Wages',         icon: 'briefcase',   color: MUTED.teal,       type: 'income' as const },
  { name: 'Freelance / Contract',    icon: 'file-text',   color: MUTED.steel,      type: 'income' as const },
  { name: 'Business Revenue',        icon: 'briefcase',   color: MUTED.indigo,     type: 'income' as const },
  { name: 'Investments / Dividends', icon: 'trending-up', color: MUTED.amber,      type: 'income' as const },
  { name: 'Rental Income',           icon: 'home',        color: MUTED.dusty,      type: 'income' as const },
  { name: 'Side Hustle',             icon: 'zap',         color: MUTED.lavender,   type: 'income' as const },
  { name: 'Gift / Allowance',        icon: 'gift',        color: MUTED.rose,       type: 'income' as const },
  { name: 'Other Income',            icon: 'more-horizontal', color: MUTED.mist,   type: 'income' as const },
];

export async function seedDefaultCategories(userId: string) {
  try {
    const existing = await db.select().from(categories).where(eq(categories.userId, userId));
    
    if (existing.length === 0) {
      // Brand new user: seed all defaults
      const newCats = DEFAULT_CATEGORIES.map(cat => ({
        id: generateId(),
        userId,
        ...cat,
      }));
      await db.insert(categories).values(newCats);
      syncData(userId).catch(console.error);
      return newCats;
    }

    // Existing user: add any missing default categories
    const existingNames = existing.map(c => c.name.toLowerCase());
    const missingCats = DEFAULT_CATEGORIES.filter(
      cat => !existingNames.includes(cat.name.toLowerCase())
    );

    if (missingCats.length > 0) {
      const newCats = missingCats.map(cat => ({
        id: generateId(),
        userId,
        ...cat,
      }));
      await db.insert(categories).values(newCats);
      syncData(userId).catch(console.error);
      return [...existing, ...newCats];
    }

    return existing;
  } catch (err) {
    console.error('Error seeding categories:', err);
    return [];
  }
}

export async function getCategories(userId: string) {
  try {
    return await db.select().from(categories).where(eq(categories.userId, userId));
  } catch (err) {
    console.error('Error fetching categories', err);
    return [];
  }
}

export async function addCustomCategory(userId: string, category: { name: string, icon: string, color: string, type: 'income'|'expense' }) {
  try {
    const newCat = {
      id: generateId(),
      userId,
      ...category
    };
    await db.insert(categories).values(newCat);
    syncData(userId).catch(console.error);
    return newCat;
  } catch (err) {
    console.error('Error adding category', err);
    throw err;
  }
}
