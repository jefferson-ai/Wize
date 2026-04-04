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

export async function updateTransaction(
  id: string,
  userId: string,
  data: Partial<Omit<TransactionInsert, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>
) {
  try {
    await db
      .update(transactions)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    syncData(userId).catch(console.error);
  } catch (err) {
    console.error('Error updating transaction', err);
    throw err;
  }
}

export async function deleteTransaction(id: string, userId: string) {
  try {
    await db
      .delete(transactions)
      .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
    syncData(userId).catch(console.error);
  } catch (err) {
    console.error('Error deleting transaction', err);
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

export async function getLoggingStreak(userId: string) {
  try {
    const allTx = await db
      .select({ date: transactions.date })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));

    if (allTx.length === 0) return 0;

    // Get unique dates in local timezone (YYYY-MM-DD)
    const dates = new Set<string>();
    allTx.forEach(tx => {
      if (tx.date) {
        const d = new Date(tx.date);
        dates.add(
          `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        );
      }
    });

    const uniqueSortedDates = Array.from(dates).sort().reverse();
    
    let streak = 0;
    
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    if (!uniqueSortedDates.includes(todayStr) && !uniqueSortedDates.includes(yesterdayStr)) {
      return 0; // Streak broken
    }

    let checkDate = new Date(today);
    if (!uniqueSortedDates.includes(todayStr)) {
      checkDate = new Date(yesterday);
    }
    
    while (true) {
      const checkStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      if (uniqueSortedDates.includes(checkStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  } catch (err) {
    console.error('Error fetching streak', err);
    return 0;
  }
}

export async function checkLoggedToday(userId: string): Promise<boolean> {
  try {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    // We can use a simple SQL comparison for ISO strings
    const todaysTx = await db
      .select({ id: transactions.id })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          sql`${transactions.date} LIKE ${todayStr + '%'}`
        )
      )
      .limit(1);
      
    return todaysTx.length > 0;
  } catch (err) {
    console.error('Error checking logged today', err);
    return true; // fail safe
  }
}

export async function logNoSpendDay(userId: string, currency: string) {
  try {
    const now = new Date();
    // Insert a dummy 0 amount expense
    await addTransaction({
      userId,
      type: 'expense',
      amount: 0,
      currency,
      categoryId: null,
      date: now.toISOString(),
      note: 'No Spend Today ✨',
      receiptUrl: null,
      isRecurring: false,
      recurrenceType: null,
    });
  } catch (err) {
    console.error('Error logging no spend day', err);
    throw err;
  }
}
