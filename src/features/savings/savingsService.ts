import { db } from '../../db';
import { savingGoals } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { syncData } from '../sync/syncService';

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
    syncData(data.userId).catch(err => console.error('Failed to sync new goal', err));
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
    
    syncData(userId).catch(err => console.error('Failed to sync updated goal', err));
  } catch (err) {
    console.error('Error updating saving goal', err);
  }
}
