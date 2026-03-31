import { db } from '../../db';
import { transactions, categories, budgets } from '../../db/schema';
import { supabase } from '../../utils/supabase';
import { eq } from 'drizzle-orm';

// A naive push-only background sync function for the MVP.
// Silently skips if Supabase tables don't exist yet (PGRST205).
export const syncData = async (userId: string) => {
  if (!userId) return;

  try {
    // 1. Sync Categories
    const localCategories = await db.select().from(categories).where(eq(categories.userId, userId));
    if (localCategories.length > 0) {
      const { error: catError } = await supabase
        .from('categories')
        .upsert(
          localCategories.map(c => ({
            id: c.id,
            user_id: c.userId,
            type: c.type,
            name: c.name,
            icon: c.icon,
            color: c.color
          }))
        );
      if (catError && catError.code !== 'PGRST205') {
        console.warn('Supabase categories sync:', catError.message);
      }
    }

    // 2. Sync Transactions
    const localTransactions = await db.select().from(transactions).where(eq(transactions.userId, userId));
    if (localTransactions.length > 0) {
      const { error: txError } = await supabase
        .from('transactions')
        .upsert(
          localTransactions.map(t => ({
            id: t.id,
            user_id: t.userId,
            type: t.type,
            amount: t.amount,
            currency: t.currency,
            category_id: t.categoryId,
            date: t.date,
            note: t.note,
            receipt_url: t.receiptUrl,
            is_recurring: t.isRecurring,
            recurrence_type: t.recurrenceType,
            created_at: new Date(t.createdAt).toISOString(),
            updated_at: new Date(t.updatedAt).toISOString()
          }))
        );
      if (txError && txError.code !== 'PGRST205') {
        console.warn('Supabase transactions sync:', txError.message);
      }
    }

    // 3. Sync Budgets
    const localBudgets = await db.select().from(budgets).where(eq(budgets.userId, userId));
    if (localBudgets.length > 0) {
      const { error: budgetError } = await supabase
        .from('budgets')
        .upsert(
          localBudgets.map(b => ({
            id: b.id,
            user_id: b.userId,
            category_id: b.categoryId,
            amount: b.amount,
            period: b.period,
            start_date: b.startDate
          }))
        );
      if (budgetError && budgetError.code !== 'PGRST205') {
        console.warn('Supabase budgets sync:', budgetError.message);
      }
    }
  } catch (error) {
    // Silently fail — local data is the source of truth
  }
};
