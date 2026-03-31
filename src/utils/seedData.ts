import { db } from '../db';
import { transactions, categories } from '../db/schema';
import * as Crypto from 'expo-crypto';
import { eq } from 'drizzle-orm';

const generateId = () => Crypto.randomUUID();

export async function seed6MonthsData(userId: string) {
  try {
    // 1. Get user categories or create some defaults if none exist
    let userCategories = await db.select().from(categories).where(eq(categories.userId, userId));
    
    if (userCategories.length === 0) {
      const defaults = [
        { name: 'Groceries', icon: 'ShoppingCart', color: '#600aff', type: 'expense' },
        { name: 'Rent', icon: 'Home', color: '#3b82f6', type: 'expense' },
        { name: 'Salary', icon: 'Briefcase', color: '#600aff', type: 'income' },
        { name: 'Entertainment', icon: 'Film', color: '#f59e0b', type: 'expense' },
      ];
      for (const cat of defaults) {
        const id = generateId();
        await db.insert(categories).values({
          id,
          userId,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type as 'income' | 'expense'
        });
      }
      userCategories = await db.select().from(categories).where(eq(categories.userId, userId));
    }

    const incomeCats = userCategories.filter(c => c.type === 'income');
    const expCats = userCategories.filter(c => c.type === 'expense');

    const txsToInsert: typeof transactions.$inferInsert[] = [];
    const now = new Date();

    // 2. Generate data for the past 6 months (approx 180 days)
    for (let i = 0; i < 180; i++) {
      const txDate = new Date(now);
      txDate.setDate(txDate.getDate() - i);

      // Random 0 to 2 transactions per day
      const txCount = Math.floor(Math.random() * 3);
      for (let j = 0; j < txCount; j++) {
        const isIncome = Math.random() < 0.15; // 15% chance of income
        const catList = isIncome ? incomeCats : expCats;
        if (catList.length === 0) continue;
        
        const randomCat = catList[Math.floor(Math.random() * catList.length)];
        const amount = isIncome 
          ? (Math.random() * 2000 + 500) // Income between 500-2500
          : (Math.random() * 90 + 10);   // Expense between 10-100

        txsToInsert.push({
          id: generateId(),
          userId,
          type: isIncome ? 'income' : 'expense',
          amount: parseFloat(amount.toFixed(2)),
          currency: '$',
          categoryId: randomCat.id,
          date: txDate.toISOString(),
          note: `Seed Data - ${i} days ago`,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Insert in batches to avoid SQLite limits
    for (let i = 0; i < txsToInsert.length; i += 50) {
      const batch = txsToInsert.slice(i, i + 50);
      if (batch.length > 0) {
        await db.insert(transactions).values(batch);
      }
    }

    return txsToInsert.length;
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  }
}
