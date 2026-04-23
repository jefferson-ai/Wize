import { db } from '../../db';
import { transactions, categories, challenges } from '../../db/schema';
import { eq, and, sql, desc, between } from 'drizzle-orm';
import * as Crypto from 'expo-crypto';

export interface AnomalyAlert {
  id: string;
  type: 'anomaly';
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  increasePercentage: number;
  amountDifference: number;
  createdAt: string;
}

export interface SavingsChallenge {
  id: string;
  type: 'challenge';
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  targetAmount: number;
  currentAmount: number;
  daysRemaining: number;
  currentDay: number;
  totalDays: number;
  title: string;
  description: string;
  isCustom?: boolean;
}

export async function getSmartInsights(userId: string) {
  const anomalies = await getAnomalyAlerts(userId);
  const activeChallenges = await getActiveChallenges(userId);
  const recommendedChallenge = activeChallenges.length === 0 ? await getRecommendedChallenge(userId) : null;

  return {
    anomalies,
    activeChallenges,
    recommendedChallenge
  };
}

async function getAnomalyAlerts(userId: string): Promise<AnomalyAlert[]> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Fetch transactions for previous period (days 14-7)
    const prevTx = await db
      .select({ 
        amount: transactions.amount, 
        categoryId: transactions.categoryId, 
        catName: categories.name, 
        catColor: categories.color 
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        between(transactions.date, fourteenDaysAgo.toISOString(), sevenDaysAgo.toISOString())
      ));

    const currTx = await db
      .select({ 
        amount: transactions.amount, 
        categoryId: transactions.categoryId, 
        catName: categories.name, 
        catColor: categories.color,
        date: transactions.date
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        sql`${transactions.date} >= ${sevenDaysAgo.toISOString()}`
      ));

    // Calculate totals per category
    const prevTotals: Record<string, number> = {};
    const catMeta: Record<string, { name: string; color: string }> = {};
    prevTx.forEach(tx => {
      if (!tx.categoryId) return;
      prevTotals[tx.categoryId] = (prevTotals[tx.categoryId] || 0) + tx.amount;
      catMeta[tx.categoryId] = { name: tx.catName || 'Unknown', color: tx.catColor || '#94a3b8' };
    });

    const currTotals: Record<string, number> = {};
    const currMaxDates: Record<string, string> = {};
    currTx.forEach(tx => {
      if (!tx.categoryId) return;
      currTotals[tx.categoryId] = (currTotals[tx.categoryId] || 0) + tx.amount;
      if (!currMaxDates[tx.categoryId] || tx.date > currMaxDates[tx.categoryId]) {
        currMaxDates[tx.categoryId] = tx.date;
      }
      if (!catMeta[tx.categoryId]) {
        catMeta[tx.categoryId] = { name: tx.catName || 'Unknown', color: tx.catColor || '#94a3b8' };
      }
    });

    const alerts: AnomalyAlert[] = [];
    Object.keys(currTotals).forEach(catId => {
      const currAt = currTotals[catId];
      const prevAt = prevTotals[catId] || 0;
      
      // Min threshold to avoid noise: 50 GHS / USD spike and must have previous data
      if (prevAt > 50 && currAt > 1.3 * prevAt) {
        alerts.push({
          id: `anomaly-${catId}`,
          type: 'anomaly',
          categoryId: catId,
          categoryName: catMeta[catId].name,
          categoryColor: catMeta[catId].color,
          increasePercentage: Math.round(((currAt - prevAt) / prevAt) * 100),
          amountDifference: Math.round(currAt - prevAt),
          createdAt: currMaxDates[catId]
        });
      }
    });

    return alerts;
  } catch (err) {
    console.error('Error in getAnomalyAlerts', err);
    return [];
  }
}

async function getRecommendedChallenge(userId: string): Promise<SavingsChallenge | null> {
  try {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Identify highest expense category from last 7 days
    const currTx = await db
      .select({ 
        amount: transactions.amount, 
        categoryId: transactions.categoryId, 
        catName: categories.name, 
        catColor: categories.color 
      })
      .from(transactions)
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(and(
        eq(transactions.userId, userId),
        eq(transactions.type, 'expense'),
        sql`${transactions.date} >= ${sevenDaysAgo.toISOString()}`
      ));

    if (currTx.length === 0) return null;

    const totals: Record<string, { val: number; name: string; color: string }> = {};
    currTx.forEach(tx => {
      if (!tx.categoryId) return;
      if (!totals[tx.categoryId]) totals[tx.categoryId] = { val: 0, name: tx.catName || 'Unknown', color: tx.catColor || '#94a3b8' };
      totals[tx.categoryId].val += tx.amount;
    });

    const sorted = Object.keys(totals).sort((a, b) => totals[b].val - totals[a].val);
    if (sorted.length === 0) return null;
    const topCatId = sorted[0];
    const topCat = totals[topCatId];

    // If spending in top cat is significant (>100 GHS/USD)
    if (topCat.val > 100) {
      const target = Math.round(topCat.val * 0.8); // 20% reduction
      return {
        id: 'ai-challenge-recommendation',
        type: 'challenge',
        categoryId: topCatId,
        categoryName: topCat.name,
        categoryColor: topCat.color,
        targetAmount: target,
        currentAmount: 0,
        daysRemaining: 7,
        currentDay: 1,
        totalDays: 7,
        title: `Spend less on ${topCat.name}`,
        description: `Try to keep your ${topCat.name} spending under GHS ${target} for the next 7 days.`
      };
    }

    return null;
  } catch (err) {
    console.error('Error in getRecommendedChallenge', err);
    return null;
  }
}

export async function getActiveChallenges(userId: string) {
  try {
    const active = await db
      .select()
      .from(challenges)
      .where(and(eq(challenges.userId, userId), eq(challenges.status, 'active')))
      .orderBy(desc(challenges.createdAt));

    const now = new Date();
    const updatedChallenges = await Promise.all(active.map(async (ch) => {
      const spending = await db
        .select({ total: sql<number>`SUM(${transactions.amount})` })
        .from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.categoryId, ch.categoryId!),
          between(transactions.date, ch.startDate, now.toISOString())
        ));

      const currentSpent = spending[0]?.total || 0;
      const isOver = currentSpent > ch.targetAmount;
      const endDate = new Date(ch.endDate);
      const isExpired = now > endDate;

      if (isOver || isExpired) {
         const newStatus = isOver ? 'failed' : 'completed';
         await db.update(challenges).set({ status: newStatus, currentAmount: currentSpent }).where(eq(challenges.id, ch.id));
         return null; 
      }

      return {
        id: ch.id,
        type: 'challenge' as const,
        categoryId: ch.categoryId!,
        categoryName: '', // Will be filled in UI or with another join
        categoryColor: '',
        targetAmount: ch.targetAmount,
        currentAmount: currentSpent,
        daysRemaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        currentDay: Math.min(Math.floor((now.getTime() - new Date(ch.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1, Math.round((endDate.getTime() - new Date(ch.startDate).getTime()) / (1000 * 60 * 60 * 24))),
        totalDays: Math.round((endDate.getTime() - new Date(ch.startDate).getTime()) / (1000 * 60 * 60 * 24)),
        title: ch.title,
        description: ch.description || '',
        isCustom: true
      };
    }));

    return updatedChallenges.filter(c => c !== null);
  } catch (err) {
    console.error('Error in getActiveChallenges', err);
    return [];
  }
}

export async function acceptChallenge(userId: string, ch: SavingsChallenge) {
  try {
    const now = new Date();
    const endDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.insert(challenges).values({
      id: Crypto.randomUUID(),
      userId,
      type: 'reduced_spending',
      categoryId: ch.categoryId,
      targetAmount: ch.targetAmount,
      currentAmount: 0,
      status: 'active',
      startDate: now.toISOString(),
      endDate: endDate.toISOString(),
      title: ch.title,
      description: ch.description,
      createdAt: now
    });
  } catch (err) {
    console.error('Error in acceptChallenge', err);
    throw err;
  }
}
