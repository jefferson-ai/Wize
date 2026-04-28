import { db } from '../../db';
import { transactions, categories } from '../../db/schema';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';
import { syncData } from '../sync/syncService';
import { updateAccountBalance, ensureDefaultAccount } from '../accounts/accountService';
import { DeviceEventEmitter } from 'react-native';

const generateId = () => Crypto.randomUUID();

export type TransactionInsert = typeof transactions.$inferInsert;

export async function addTransaction(data: Omit<TransactionInsert, 'id' | 'createdAt' | 'updatedAt'>) {
  try {
    const newTx = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any; // Cast to any to safely append nextRecurrenceDate if not provided in data

    if (newTx.isRecurring && newTx.recurrenceType && !newTx.nextRecurrenceDate) {
      const initialDate = new Date(newTx.date);
      let nextDate = new Date(initialDate);
      if (newTx.recurrenceType === 'daily') {
        nextDate.setDate(nextDate.getDate() + 1);
      } else if (newTx.recurrenceType === 'weekly') {
        nextDate.setDate(nextDate.getDate() + 7);
      } else if (newTx.recurrenceType === 'monthly') {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }
      newTx.nextRecurrenceDate = nextDate.toISOString();
    }

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
    DeviceEventEmitter.emit('transaction_updated');

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
    DeviceEventEmitter.emit('transaction_updated');
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
    DeviceEventEmitter.emit('transaction_updated');
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
    search?: string;
    minAmount?: number;
    maxAmount?: number;
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
    if (filters?.minAmount !== undefined) {
      conditions.push(sql`${transactions.amount} >= ${filters.minAmount}`);
    }
    if (filters?.maxAmount !== undefined) {
      conditions.push(sql`${transactions.amount} <= ${filters.maxAmount}`);
    }
    if (filters?.search) {
      const searchPattern = `%${filters.search}%`;
      conditions.push(sql`(${transactions.note} LIKE ${searchPattern} OR ${categories.name} LIKE ${searchPattern})`);
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

export async function getDashboardSummary(userId: string, accountId?: string, period: 'overall' | 'monthly' | 'weekly' = 'overall') {
  try {
    let conditions = [eq(transactions.userId, userId)];
    if (accountId) {
      conditions.push(eq(transactions.accountId, accountId));
    }

    if (period !== 'overall') {
      const now = new Date();
      if (period === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        conditions.push(gte(transactions.date, startOfMonth.toISOString()));
      } else if (period === 'weekly') {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        conditions.push(gte(transactions.date, startOfWeek.toISOString()));
      }
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
    } as any);
  } catch (err) {
    console.error('Error logging no spend day', err);
    throw err;
  }
}

export async function processRecurringTransactions(userId: string) {
  try {
    const now = new Date();
    const nowIso = now.toISOString();

    const recurringTxs = await db.select().from(transactions).where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.isRecurring, true),
        sql`${transactions.nextRecurrenceDate} <= ${nowIso}`
      )
    );

    for (const template of recurringTxs) {
      if (!template.nextRecurrenceDate) continue;

      let nextDateObj = new Date(template.nextRecurrenceDate);
      
      // We might have missed multiple occurrences if app was not opened for a while
      // We will loop to catch up
      while (nextDateObj <= now) {
         // Create the instance
         const newInstance = {
           userId: template.userId!,
           type: template.type,
           amount: template.amount,
           currency: template.currency,
           categoryId: template.categoryId,
           accountId: template.accountId,
           date: nextDateObj.toISOString(),
           note: `${template.note || ''} [Auto-Logged]`.trim(),
           receiptUrl: template.receiptUrl,
           isRecurring: false, // Instance is not a template
           recurrenceType: null,
           nextRecurrenceDate: null
         };
         
         await addTransaction(newInstance as any);
         
         // Advance nextDateObj
         if (template.recurrenceType === 'daily') {
           nextDateObj.setDate(nextDateObj.getDate() + 1);
         } else if (template.recurrenceType === 'weekly') {
           nextDateObj.setDate(nextDateObj.getDate() + 7);
         } else if (template.recurrenceType === 'monthly') {
           nextDateObj.setMonth(nextDateObj.getMonth() + 1);
         } else {
           break; // safety fallback
         }
      }

      // Update template's nextRecurrenceDate
      await db.update(transactions)
        .set({ nextRecurrenceDate: nextDateObj.toISOString(), updatedAt: new Date() })
        .where(eq(transactions.id, template.id));
    }
  } catch (err) {
    console.error('Error processing recurring transactions', err);
  }
}

export async function getSpendingReport(userId: string, period: 'weekly' | 'monthly') {
  try {
    const now = new Date();
    
    let currentStart = new Date();
    let currentEnd = new Date();
    let previousStart = new Date();
    let previousEnd = new Date();

    if (period === 'weekly') {
      // Current week (Mon-Sun)
      const day = now.getDay() || 7; // Sunday is 0, make it 7
      currentStart.setDate(now.getDate() - day + 1);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(currentStart);
      currentEnd.setDate(currentStart.getDate() + 6);
      currentEnd.setHours(23, 59, 59, 999);

      // Previous week
      previousStart = new Date(currentStart);
      previousStart.setDate(previousStart.getDate() - 7);
      previousEnd = new Date(currentEnd);
      previousEnd.setDate(previousEnd.getDate() - 7);
    } else {
      // Current month
      currentStart.setDate(1);
      currentStart.setHours(0, 0, 0, 0);
      currentEnd = new Date(currentStart.getFullYear(), currentStart.getMonth() + 1, 0, 23, 59, 59, 999);

      // Previous month
      previousStart = new Date(currentStart);
      previousStart.setMonth(previousStart.getMonth() - 1);
      previousEnd = new Date(currentStart.getFullYear(), currentStart.getMonth(), 0, 23, 59, 59, 999);
    }

    const currentStartIso = currentStart.toISOString();
    const currentEndIso = currentEnd.toISOString();
    const previousStartIso = previousStart.toISOString();
    const previousEndIso = previousEnd.toISOString();

    const [currentTx, previousTx] = await Promise.all([
      db.select({
        amount: transactions.amount,
        date: transactions.date,
        type: transactions.type,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        sql`${transactions.date} >= ${currentStartIso}`,
        sql`${transactions.date} <= ${currentEndIso}`
      )),
      
      db.select({
        amount: transactions.amount,
      })
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        sql`${transactions.date} >= ${previousStartIso}`,
        sql`${transactions.date} <= ${previousEndIso}`
      ))
    ]);

    let currentTotal = 0;
    let previousTotal = 0;
    
    currentTx.forEach(tx => currentTotal += tx.amount);
    previousTx.forEach(tx => previousTotal += tx.amount);

    let percentageChange = 0;
    if (previousTotal > 0) {
      percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
    } else if (currentTotal > 0) {
      percentageChange = 100;
    }

    // Top categories
    const catMap: Record<string, { name: string; color: string; icon: string; amount: number }> = {};
    currentTx.forEach(tx => {
      const cName = tx.categoryName || 'Uncategorized';
      if (!catMap[cName]) {
         catMap[cName] = { 
           name: cName, 
           color: tx.categoryColor || '#94a3b8', 
           icon: tx.categoryIcon || 'Tag', 
           amount: 0 
         };
      }
      catMap[cName].amount += tx.amount;
    });

    const topCategories = Object.values(catMap).sort((a, b) => b.amount - a.amount);

    // Chart Data
    const dailyMap: Record<string, number> = {};
    let cursor = new Date(currentStart);
    while (cursor <= currentEnd) {
       const key = cursor.toISOString().split('T')[0]; // YYYY-MM-DD
       dailyMap[key] = 0;
       cursor.setDate(cursor.getDate() + 1);
    }
    
    currentTx.forEach(tx => {
       const key = tx.date.split('T')[0];
       if (dailyMap[key] !== undefined) {
         dailyMap[key] += tx.amount;
       }
    });

    let chartData: { label: string; value: number }[];

    if (period === 'weekly') {
      // Daily bars with weekday labels
      chartData = Object.keys(dailyMap).sort().map(date => {
        const d = new Date(date);
        return {
          label: d.toLocaleDateString('en-US', { weekday: 'short' }),
          value: dailyMap[date]
        };
      });
    } else {
      // Monthly: aggregate into weekly buckets for readability
      const sortedDates = Object.keys(dailyMap).sort();
      const lastDay = new Date(sortedDates[sortedDates.length - 1]).getDate();
      const weekBuckets: { start: number; end: number; value: number }[] = [];
      
      // Create buckets: 1-7, 8-14, 15-21, 22-end
      const ranges = [
        [1, 7], [8, 14], [15, 21], [22, lastDay]
      ];
      
      for (const [start, end] of ranges) {
        let total = 0;
        sortedDates.forEach(date => {
          const day = new Date(date).getDate();
          if (day >= start && day <= end) {
            total += dailyMap[date];
          }
        });
        weekBuckets.push({ start, end, value: total });
      }

      chartData = weekBuckets.map(bucket => ({
        label: `${bucket.start}-${bucket.end}`,
        value: bucket.value
      }));
    }

    return {
      currentTotal,
      previousTotal,
      percentageChange,
      topCategories,
      chartData
    };

  } catch(err) {
    console.error('Error fetching spending report', err);
    return null;
  }
}

