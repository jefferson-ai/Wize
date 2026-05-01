import { db } from '../../db';
import { transactions, categories, budgets, accounts, savingGoals, challenges, notifications } from '../../db/schema';
import { supabase } from '../../utils/supabase';
import { eq } from 'drizzle-orm';
import { reconcileAccountBalances } from '../accounts/accountService';
import { DeviceEventEmitter } from 'react-native';

/**
 * Pushes all local data to Supabase (Upsert).
 */
export const pushData = async (userId: string) => {
  if (!userId) return;

  try {
    // 1. Categories
    const localCats = await db.select().from(categories).where(eq(categories.userId, userId));
    if (localCats.length > 0) {
      await supabase.from('categories').upsert(localCats.map(c => ({
        id: c.id, user_id: c.userId, type: c.type, name: c.name, icon: c.icon, color: c.color
      })));
    }

    // 2. Accounts
    const localAccs = await db.select().from(accounts).where(eq(accounts.userId, userId));
    if (localAccs.length > 0) {
      await supabase.from('accounts').upsert(localAccs.map(a => ({
        id: a.id, user_id: a.userId, name: a.name, type: a.type, balance: a.balance, 
        currency: a.currency, color: a.color, icon: a.icon, created_at: a.createdAt?.toISOString()
      })));
    }

    // 3. Transactions
    const localTxs = await db.select().from(transactions).where(eq(transactions.userId, userId));
    if (localTxs.length > 0) {
      await supabase.from('transactions').upsert(localTxs.map(t => ({
        id: t.id, user_id: t.userId, type: t.type, amount: t.amount, currency: t.currency,
        category_id: t.categoryId, account_id: t.accountId, date: t.date, note: t.note,
        receipt_url: t.receiptUrl, is_recurring: t.isRecurring, recurrence_type: t.recurrenceType,
        created_at: t.createdAt?.toISOString(), updated_at: t.updatedAt?.toISOString()
      })));
    }

    // 4. Budgets
    const localBudgets = await db.select().from(budgets).where(eq(budgets.userId, userId));
    if (localBudgets.length > 0) {
      await supabase.from('budgets').upsert(localBudgets.map(b => ({
        id: b.id, user_id: b.userId, category_id: b.categoryId, amount: b.amount,
        period: b.period, start_date: b.startDate
      })));
    }

    // 5. Saving Goals
    const localGoals = await db.select().from(savingGoals).where(eq(savingGoals.userId, userId));
    if (localGoals.length > 0) {
      await supabase.from('saving_goals').upsert(localGoals.map(g => ({
        id: g.id, user_id: g.userId, name: g.name, target_amount: g.targetAmount,
        current_amount: g.currentAmount, icon: g.icon, color: g.color
      })));
    }
  } catch (error) {
    console.warn('Sync Push Error:', error);
  }
};

/**
 * Pulls all data from Supabase and restores it to local SQLite.
 */
export const pullData = async (userId: string) => {
  if (!userId) return;

  try {
    // 1. Categories
    const { data: remoteCats } = await supabase.from('categories').select('*').eq('user_id', userId);
    if (remoteCats && remoteCats.length > 0) {
      for (const c of remoteCats) {
        await db.insert(categories).values({
          id: c.id, userId: c.user_id, type: c.type, name: c.name, icon: c.icon, color: c.color
        }).onConflictDoUpdate({ target: categories.id, set: { name: c.name, icon: c.icon, color: c.color } });
      }
    }

    // 2. Accounts
    const { data: remoteAccs } = await supabase.from('accounts').select('*').eq('user_id', userId);
    if (remoteAccs && remoteAccs.length > 0) {
      for (const a of remoteAccs) {
        await db.insert(accounts).values({
          id: a.id, userId: a.user_id, name: a.name, type: a.type, balance: a.balance,
          currency: a.currency, color: a.color, icon: a.icon, createdAt: new Date(a.created_at)
        }).onConflictDoUpdate({ target: accounts.id, set: { balance: a.balance, name: a.name } });
      }
    }

    // 3. Transactions
    const { data: remoteTxs } = await supabase.from('transactions').select('*').eq('user_id', userId);
    if (remoteTxs && remoteTxs.length > 0) {
      for (const t of remoteTxs) {
        await db.insert(transactions).values({
          id: t.id, userId: t.user_id, type: t.type, amount: t.amount, currency: t.currency,
          categoryId: t.category_id, accountId: t.account_id, date: t.date, note: t.note,
          receiptUrl: t.receipt_url, isRecurring: t.is_recurring, recurrenceType: t.recurrence_type,
          createdAt: new Date(t.created_at), updatedAt: new Date(t.updated_at)
        }).onConflictDoUpdate({ target: transactions.id, set: { amount: t.amount, date: t.date, note: t.note } });
      }
    }

    // 4. Budgets
    const { data: remoteBudgets } = await supabase.from('budgets').select('*').eq('user_id', userId);
    if (remoteBudgets && remoteBudgets.length > 0) {
      for (const b of remoteBudgets) {
        await db.insert(budgets).values({
          id: b.id, userId: b.user_id, categoryId: b.category_id, amount: b.amount,
          period: b.period, startDate: b.start_date
        }).onConflictDoUpdate({ target: budgets.id, set: { amount: b.amount } });
      }
    }

    // 5. Saving Goals
    const { data: remoteGoals } = await supabase.from('saving_goals').select('*').eq('user_id', userId);
    if (remoteGoals && remoteGoals.length > 0) {
      for (const g of remoteGoals) {
        await db.insert(savingGoals).values({
          id: g.id, userId: g.user_id, name: g.name, targetAmount: g.target_amount,
          currentAmount: g.current_amount, icon: g.icon, color: g.color
        }).onConflictDoUpdate({ target: savingGoals.id, set: { currentAmount: g.current_amount, name: g.name } });
      }
    }

    // Final step: Recalculate balances to ensure consistency
    await reconcileAccountBalances(userId);
    
    // Notify the app to refresh the UI
    DeviceEventEmitter.emit('transaction_updated');
  } catch (error) {
    console.warn('Sync Pull Error:', error);
  }
};

/**
 * Full bidirectional sync.
 */
export const syncData = async (userId: string) => {
  if (!userId) return;
  // Naive MVP: Pull first to get remote data, then push to backup local changes
  await pullData(userId);
  await pushData(userId);
};
