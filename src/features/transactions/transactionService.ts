import { db } from '../../db';
import { transactions, categories } from '../../db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { syncData } from '../sync/syncService';
import { updateAccountBalance, ensureDefaultAccount } from '../accounts/accountService';

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
    // Update account balance
    if (newTx.accountId) {
      const balanceAdjustment = newTx.type === 'income' ? newTx.amount : -newTx.amount;
      await updateAccountBalance(newTx.accountId, balanceAdjustment);
    }

    // 3. Insert into database
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
    // 1. Fetch old transaction to calculate balance shift
    const oldTx = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (oldTx.length === 0) return;
    const tx = oldTx[0];

    // 2. Perform balance shift if amount, type, or accountId changed
    const newAmount = data.amount !== undefined ? data.amount : tx.amount;
    const newAccountId = data.accountId !== undefined ? data.accountId : tx.accountId;
    const newType = data.type !== undefined ? data.type : tx.type;

    if (tx.accountId) {
      // Reverse old adjustment
      const oldAdjustment = tx.type === 'income' ? -tx.amount : tx.amount;
      await updateAccountBalance(tx.accountId, oldAdjustment);
    }
    
    if (newAccountId) {
      // Apply new adjustment
      const newAdjustment = newType === 'income' ? newAmount : -newAmount;
      await updateAccountBalance(newAccountId, newAdjustment);
    }

    // 3. Update the transaction in DB
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
    // 1. Fetch old transaction to reverse balance
    const oldTx = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
    if (oldTx.length > 0) {
      const tx = oldTx[0];
      if (tx.accountId) {
        // Reverse adjustment: income deduces, expense adds back
        const reversal = tx.type === 'income' ? -tx.amount : tx.amount;
        await updateAccountBalance(tx.accountId, reversal);
      }
    }

    // 2. Delete the record
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
    accountId?: string;
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
    if (filters?.accountId) {
      conditions.push(eq(transactions.accountId, filters.accountId));
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
        categoryId: transactions.categoryId,
        accountId: transactions.accountId,
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

export async function getDashboardSummary(userId: string, accountId?: string) {
  try {
    let conditions = [eq(transactions.userId, userId)];
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }

    const allTx = await db
      .select({
        amount: transactions.amount,
        type: transactions.type,
        categoryName: categories.name,
        categoryColor: categories.color,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(...conditions));

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
    // Ensure we have an account to link to
    const defaultAcc = await ensureDefaultAccount(userId, currency);
    
    // Insert a dummy 0 amount expense
    await addTransaction({
      userId,
      type: 'expense',
      amount: 0,
      currency,
      categoryId: null,
      accountId: defaultAcc.id,
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
