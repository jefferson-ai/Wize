import { db } from '../../db';
import { categories } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { syncData } from '../sync/syncService';

// Use Expo Crypto for UUIDs on device
const generateId = () => Crypto.randomUUID();

export const DEFAULT_CATEGORIES = [
  // Expenses (15 categories)
  { name: 'Food & Dining', icon: 'utensils', color: '#f59e0b', type: 'expense' as const },
  { name: 'Transport', icon: 'car', color: '#600aff', type: 'expense' as const },
  { name: 'Housing & Rent', icon: 'home', color: '#3b82f6', type: 'expense' as const },
  { name: 'Health & Medical', icon: 'heart', color: '#ef4444', type: 'expense' as const },
  { name: 'Entertainment', icon: 'film', color: '#600aff', type: 'expense' as const },
  { name: 'Shopping & Clothing', icon: 'shopping-bag', color: '#ec4899', type: 'expense' as const },
  { name: 'Education', icon: 'book', color: '#6366f1', type: 'expense' as const },
  { name: 'Travel', icon: 'plane', color: '#0ea5e9', type: 'expense' as const },
  { name: 'Utilities', icon: 'lightbulb', color: '#eab308', type: 'expense' as const },
  { name: 'Home Maintenance', icon: 'wrench', color: '#78716c', type: 'expense' as const },
  { name: 'Fitness', icon: 'dumbbell', color: '#f97316', type: 'expense' as const },
  { name: 'Pets', icon: 'paw', color: '#a855f7', type: 'expense' as const },
  { name: 'Gifts & Donations', icon: 'gift', color: '#e11d48', type: 'expense' as const },
  { name: 'Business', icon: 'briefcase', color: '#475569', type: 'expense' as const },
  { name: 'Other', icon: 'more-horizontal', color: '#94a3b8', type: 'expense' as const },
  // Income
  { name: 'Salary', icon: 'briefcase', color: '#600aff', type: 'income' as const },
  { name: 'Investments', icon: 'trending-up', color: '#3b82f6', type: 'income' as const },
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
