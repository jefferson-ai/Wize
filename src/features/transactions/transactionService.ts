import { db } from '../../db';
import { transactions, categories } from '../../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { syncData } from '../sync/syncService';

const generateId = () => Crypto.randomUUID();

export type TransactionInsert = typeof transactions.$inferInsert;

export async function addTransaction(data: Omit<TransactionInsert, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const newTx = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await db.insert(transactions).values(newTx);

    // Background sync (if userId is valid)
    if (newTx.userId) {
      syncData(newTx.userId).catch(console.error);
    }

    return newTx;
  } catch (err) {
    console.error('Error adding transaction', err);
    throw err;
  }
}

export async function getTransactions(
  userId: string,
  filters?: {
    limit?: number;
    type?: 'income' | 'expense';
    categoryId?: string;
    startDate?: Date;
    endDate?: Date;
  }
) {
  try {
    let conditions = [eq(transactions.userId, userId)];

    if (filters?.type) {
      conditions.push(eq(transactions.type, filters.type));
    }
    if (filters?.categoryId) {
      conditions.push(eq(transactions.categoryId, filters.categoryId));
    }
    // Using simple string comparison since dates are stored as ISO strings
    if (filters?.startDate) {
      conditions.push(sql`${transactions.date} >= ${filters.startDate.toISOString()}`);
    }
    if (filters?.endDate) {
      conditions.push(sql`${transactions.date} <= ${filters.endDate.toISOString()}`);
    }

    const query = db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        type: transactions.type,
        date: transactions.date,
        currency: transactions.currency,
        note: transactions.note,
        categoryId: transactions.categoryId, // Keeping for filtering
        category: {
          name: categories.name,
          icon: categories.icon,
          color: categories.color
        }
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions))
      .orderBy(desc(transactions.date));

    if (filters?.limit) {
      query.limit(filters.limit);
    }

    return await query;
  } catch (err) {
    console.error('Error fetching transactions', err);
    return [];
  }
}

export async function getDashboardSummary(userId: string) {
  try {
    // For MVP, just loading all user transactions. For scale, use date filtering.
    const allTx = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(eq(transactions.userId, userId));

    let income = 0;
    let expense = 0;
    const categoryTotals: Record<string, { value: number; color: string; label: string }> = {};

    allTx.forEach(tx => {
      const amt = tx.amount || 0;
      if (tx.type === 'income') {
        income += amt;
      } else {
        expense += amt;
        const cName = tx.categoryName || 'Unknown';
        const cColor = tx.categoryColor || '#94a3b8';
        if (!categoryTotals[cName]) {
          categoryTotals[cName] = { value: 0, color: cColor, label: cName };
        }
        categoryTotals[cName].value += amt;
      }
    });

    return {
      balance: income - expense,
      income,
      expense,
      categoryData: Object.values(categoryTotals).sort((a, b) => b.value - a.value)
    };
  } catch (err) {
    console.error('Error fetching dashboard summary', err);
    return { balance: 0, income: 0, expense: 0, categoryData: [] };
  }
}
