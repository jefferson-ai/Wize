import { db } from '../../db';
import { budgets, transactions, categories as categoriesTable } from '../../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { syncData } from '../sync/syncService';

export async function createBudget(data: {
  userId: string;
  categoryId: string;
  amount: number;
  period: 'monthly' | 'weekly';
  startDate: string;
}) {
  try {
    const newBudget = {
      id: uuidv4(),
      ...data
    };
    
    await db.insert(budgets).values(newBudget);
    
    // Trigger background sync
    syncData(data.userId).catch(err => console.error('Failed to sync new budget', err));

    return newBudget;
  } catch (err) {
    console.error('Error creating budget', err);
    throw err;
  }
}

export async function getActiveBudgets(userId: string) {
  try {
    const records = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId));
    return records;
  } catch (err) {
    console.error('Error fetching budgets', err);
    return [];
  }
}

export async function getBudgetConsumption(userId: string) {
    try {
        const userBudgets = await db
          .select({
            budget: budgets,
            category: categoriesTable
          })
          .from(budgets)
          .leftJoin(categoriesTable, eq(budgets.categoryId, categoriesTable.id))
          .where(eq(budgets.userId, userId));
        
        const consumptionData = await Promise.all(
            userBudgets.map(async ({ budget, category }: any) => {
                const spentResult = await db
                    .select({
                        totalSpent: sql<number>`SUM(${transactions.amount})`
                    })
                    .from(transactions)
                    .where(
                        and(
                            eq(transactions.userId, userId),
                            eq(transactions.categoryId, budget.categoryId!),
                            eq(transactions.type, 'expense'),
                            sql`${transactions.date} >= ${budget.startDate}`
                        )
                    );
                
                const spent = spentResult[0]?.totalSpent || 0;
                
                return {
                    ...budget,
                    category, // Attach full category object
                    spent,
                    remaining: budget.amount - spent,
                    percentageUsed: spent > 0 ? (spent / budget.amount) * 100 : 0
                };
            })
        );
        
        return consumptionData;

    } catch (err) {
        console.error('Error calculating budget consumption', err);
        return [];
    }
}

export async function updateBudget(id: string, userId: string, data: { amount: number; period: 'monthly' | 'weekly' }) {
  try {
    await db
      .update(budgets)
      .set(data)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    
    syncData(userId).catch(err => console.error('Failed to sync updated budget', err));
  } catch (err) {
    console.error('Error updating budget', err);
    throw err;
  }
}

export async function deleteBudget(id: string, userId: string) {
  try {
    await db
      .delete(budgets)
      .where(and(eq(budgets.id, id), eq(budgets.userId, userId)));
    
    syncData(userId).catch(err => console.error('Failed to sync deleted budget', err));
  } catch (err) {
    console.error('Error deleting budget', err);
    throw err;
  }
}
