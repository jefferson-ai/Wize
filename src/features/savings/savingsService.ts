import { db } from '../../db';
import { savingGoals, transactions } from '../../db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export async function createSavingGoal(data: {
  userId: string;
  name: string;
  targetAmount: number;
  currentAmount?: number;
  icon: string;
  color: string;
}) {
  try {
    const newGoal = {
      id: uuidv4(),
      currentAmount: 0,
      ...data
    };
    await db.insert(savingGoals).values(newGoal);
    return newGoal;
  } catch (err) {
    console.error('Error creating saving goal', err);
    throw err;
  }
}

export async function getSavingGoals(userId: string) {
  try {
    return await db.select().from(savingGoals).where(eq(savingGoals.userId, userId));
  } catch (err) {
    console.error('Error fetching saving goals', err);
    return [];
  }
}

export async function updateSavingGoal(id: string, userId: string, amount: number) {
  try {
    const [goal] = await db.select().from(savingGoals).where(and(eq(savingGoals.id, id), eq(savingGoals.userId, userId)));
    if (!goal) return;
    
    await db.update(savingGoals)
      .set({ currentAmount: (goal.currentAmount || 0) + amount })
      .where(and(eq(savingGoals.id, id), eq(savingGoals.userId, userId)));
  } catch (err) {
    console.error('Error updating saving goal', err);
  }
}

/**
 * Calculates two potential saving strategies based on the current month's expense data.
 */
export async function getSavingsStrategies(userId: string) {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const userTransactions = await db.select()
      .from(transactions)
      .where(and(
        eq(transactions.userId, userId), 
        eq(transactions.type, 'expense'),
        gte(transactions.date, startOfMonth)
      ));
    
    let totalSpareChange = 0; // Strategy A: Round to next GHS 1
    let totalMultiplier = 0;   // Strategy B: Fixed GHS 2 per transaction
    
    userTransactions.forEach(tx => {
      const amount = tx.amount;
      
      // Strategy A (Spare Change)
      const nextWhole = Math.ceil(amount);
      const diff = nextWhole - amount;
      if (diff > 0) {
        totalSpareChange += diff;
      }
      
      // Strategy B (Steady Growth)
      totalMultiplier += 2.00;
    });
    
    return {
      spareChange: totalSpareChange,
      multiplier: totalMultiplier,
      transactionCount: userTransactions.length
    };
  } catch (err) {
    console.error('Error calculating savings strategies', err);
    return { spareChange: 0, multiplier: 0, transactionCount: 0 };
  }
}
