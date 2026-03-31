import { db } from '../../db';
import { budgets, transactions } from '../../db/schema';
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
    // A simplified consumption approach: 
    // We fetch all budgets, and for each budget, we sum up the expenses 
    // in that category since the budget's start date
    try {
        const userBudgets = await getActiveBudgets(userId);
        
        const consumptionData = await Promise.all(
            userBudgets.map(async (budget) => {
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
