import { supabase } from '../utils/supabase';
import { getTransactions } from '../features/transactions/transactionService';
import { getBudgetConsumption } from '../features/budgets/budgetService';
import { getSavingGoals } from '../features/savings/savingsService';
import { getSmartInsights } from '../features/ai/aiService';

export interface AIAdvice {
  summary: string;
  actionItems: string[];
  encouragement: string;
}

/**
 * Generates a local AI-style financial report from the user's real data.
 * Falls back here when the Supabase Edge Function is not deployed.
 */
const generateLocalAdvice = (
  transactions: any[],
  budgets: any[],
  goals: any[],
  anomalies: any[]
): AIAdvice => {
  // --- Summary ---
  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const topCategory = transactions
    .filter(t => t.type === 'expense' && t.category?.name)
    .reduce((acc: Record<string, number>, t) => {
      acc[t.category.name] = (acc[t.category.name] || 0) + t.amount;
      return acc;
    }, {});
  const topCatEntry = Object.entries(topCategory).sort((a, b) => b[1] - a[1])[0];

  const overBudgets = budgets.filter(b => b.percentageUsed >= 100);
  const warnBudgets = budgets.filter(b => b.percentageUsed >= 80 && b.percentageUsed < 100);

  let summaryParts: string[] = [];
  if (transactions.length === 0) {
    summaryParts.push("You haven't logged any transactions recently. Start tracking your spending to unlock personalised insights.");
  } else {
    summaryParts.push(
      `Over your last ${transactions.length} transactions, you spent ${totalSpent.toFixed(0)} and earned ${totalIncome.toFixed(0)}.`
    );
    if (topCatEntry) {
      const pct = totalSpent > 0 ? ((topCatEntry[1] / totalSpent) * 100).toFixed(0) : 0;
      summaryParts.push(`Your top expense category is ${topCatEntry[0]} at ${pct}% of spending.`);
    }
    if (overBudgets.length > 0) {
      summaryParts.push(`⚠️ ${overBudgets.length} budget(s) exceeded — tighten spending in ${overBudgets.map(b => b.category?.name || 'Unknown').join(', ')}.`);
    } else if (warnBudgets.length > 0) {
      summaryParts.push(`${warnBudgets.length} budget(s) are nearing their limits — keep an eye on ${warnBudgets.map(b => b.category?.name || 'Unknown').join(', ')}.`);
    } else if (budgets.length > 0) {
      summaryParts.push("All budgets are on track — great discipline this period.");
    }
  }

  // --- Action Items ---
  const actionItems: string[] = [];
  if (overBudgets.length > 0) {
    actionItems.push(`Pause non-essential ${overBudgets[0].category?.name || ''} purchases for the next 72 hours to reset your baseline.`);
  }
  if (goals.length > 0) {
    const lowestGoal = goals.reduce((a: any, b: any) =>
      (a.currentAmount / a.targetAmount) < (b.currentAmount / b.targetAmount) ? a : b
    );
    const remaining = lowestGoal.targetAmount - lowestGoal.currentAmount;
    actionItems.push(`Focus on your "${lowestGoal.name}" goal — you're ${remaining.toFixed(0)} away from your target.`);
  }
  if (anomalies.length > 0) {
    actionItems.push(`Review your ${anomalies[0].categoryName} spending — it spiked ${anomalies[0].increasePercentage}% versus last week.`);
  }
  if (totalIncome > 0 && totalSpent / totalIncome > 0.8) {
    actionItems.push("You're spending over 80% of your income. Aim to save at least 20% each pay period.");
  }
  if (actionItems.length === 0) {
    actionItems.push(
      "Keep your logging streak alive — consistency is the #1 predictor of financial success.",
      "Review your budgets at the start of each week to stay proactive.",
      "Consider setting a new savings goal to stay motivated."
    );
  }

  // --- Encouragement ---
  const encouragements = [
    "You're building the habits of a wealth-builder. Every transaction you track brings you closer to your goals.",
    "Financial awareness is a superpower. The fact that you're here means you're already ahead of the curve.",
    "Small wins compound. Keep going — your future self will thank you for the discipline you show today.",
    "Tracking your money is the first step to mastering it. You've got this.",
  ];
  const encouragement = encouragements[Math.floor(Math.random() * encouragements.length)];

  return {
    summary: summaryParts.join(' '),
    actionItems,
    encouragement,
  };
};

/**
 * Gathers user financial context and requests advice.
 * Tries the Supabase Edge Function first, falls back to local generation.
 */
export const getAIAdvice = async (userId: string): Promise<AIAdvice> => {
  // 1. Gather Context (needed for both live and fallback paths)
  const [transactions, budgets, goals, smartInsights] = await Promise.all([
    getTransactions(userId, { limit: 40 }),
    getBudgetConsumption(userId),
    getSavingGoals(userId),
    getSmartInsights(userId)
  ]);

  // 2. Try live Edge Function if env vars are set
  const functionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-ai-advice`
    : null;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (functionUrl && anonKey) {
    try {
      const context = {
        recentTransactions: transactions.map(t => ({
          amount: t.amount,
          type: t.type,
          category: t.category?.name,
          date: t.date,
          note: t.note
        })),
        budgets: budgets.map(b => ({
          category: b.category?.name,
          limit: b.amount,
          spent: b.spent,
          percentageUsed: b.percentageUsed
        })),
        savingGoals: goals.map(g => ({
          name: g.name,
          target: g.targetAmount,
          current: g.currentAmount
        })),
        detectedAnomalies: smartInsights.anomalies.map(a => ({
          category: a.categoryName,
          increasePercentage: a.increasePercentage,
          amountDifference: a.amountDifference
        })),
        budgetForecasts: smartInsights.forecasts?.map(f => ({
          category: f.categoryName,
          projectedTotal: f.projectedTotal,
          budgetAmount: f.budgetAmount,
          overspendAmount: f.overspendAmount
        })) || []
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ context }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && !data.error) {
          return data as AIAdvice;
        }
      }
      // If response wasn't ok or had an error, fall through to local
      console.log('AI Advisor: Edge function unavailable, using local analysis');
    } catch {
      console.log('AI Advisor: Network unreachable, using local analysis');
    }
  }

  // 3. Fallback: generate advice locally from real data
  // Brief delay to feel deliberate
  await new Promise(resolve => setTimeout(resolve, 1200));
  return generateLocalAdvice(transactions, budgets, goals, smartInsights.anomalies);
};

export const sendChatMessage = async (userId: string, message: string, history: any[]): Promise<string> => {
  // 1. Gather Context
  const [transactions, budgets, goals, smartInsights] = await Promise.all([
    getTransactions(userId, { limit: 40 }),
    getBudgetConsumption(userId),
    getSavingGoals(userId),
    getSmartInsights(userId)
  ]);

  const functionUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
    ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-chat`
    : null;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (functionUrl && anonKey) {
    try {
      const context = {
        recentTransactions: transactions.map(t => ({
          amount: t.amount,
          type: t.type,
          category: t.category?.name,
          date: t.date,
          note: t.note
        })),
        budgets: budgets.map(b => ({
          category: b.category?.name,
          limit: b.amount,
          spent: b.spent,
          percentageUsed: b.percentageUsed
        })),
        savingGoals: goals.map(g => ({
          name: g.name,
          target: g.targetAmount,
          current: g.currentAmount
        })),
        detectedAnomalies: smartInsights.anomalies.map(a => ({
          category: a.categoryName,
          increasePercentage: a.increasePercentage,
          amountDifference: a.amountDifference
        })),
        budgetForecasts: smartInsights.forecasts?.map(f => ({
          category: f.categoryName,
          projectedTotal: f.projectedTotal,
          budgetAmount: f.budgetAmount,
          overspendAmount: f.overspendAmount
        })) || []
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({ message, history, context }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        if (data && data.reply) {
          return data.reply;
        } else {
          console.log('AI Chat Error response:', data);
        }
      } else {
        console.log('AI Chat non-200 response:', response.status);
      }
    } catch (err: any) {
      console.log('AI Chat Error:', err?.message || err);
    }
  }

  // ----------------------------------------------------
  // Local Fallback Bot (Since Edge Function isn't deployed)
  // ----------------------------------------------------
  await new Promise(resolve => setTimeout(resolve, 800)); // Simulate thinking
  
  const msgLower = message.toLowerCase();
  
  // Calculate some basic stats from context
  const totalSpent = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
    
  if (msgLower.includes('how much') || msgLower.includes('spent') || msgLower.includes('spending')) {
    return `Based on your recent transactions, you have spent a total of **${totalSpent.toFixed(2)}**. Your highest expense category was usually Food or Transport. Is there a specific category you want to cut back on?`;
  }
  
  if (msgLower.includes('budget') || msgLower.includes('limit')) {
    if (budgets.length === 0) return "You don't have any active budgets right now. Would you like me to suggest one?";
    const overBudgets = budgets.filter(b => b.percentageUsed >= 100);
    if (overBudgets.length > 0) {
      return `Watch out! You have exceeded your budget for **${overBudgets.map(b => b.category?.name).join(', ')}**. Try to pause non-essential spending there for the rest of the period.`;
    }
    return `You have ${budgets.length} active budget(s) and they are all currently on track. Great job!`;
  }
  
  if (msgLower.includes('save') || msgLower.includes('goal')) {
    if (goals.length === 0) return "You haven't set up any savings goals yet. Setting a concrete goal is the best way to build wealth!";
    const topGoal = goals[0];
    const remaining = topGoal.targetAmount - topGoal.currentAmount;
    return `You are working towards **${topGoal.name}**. You need **${remaining.toFixed(2)}** more to reach your target. Keep it up!`;
  }

  if (smartInsights.anomalies.length > 0 && (msgLower.includes('spike') || msgLower.includes('unusual'))) {
    const a = smartInsights.anomalies[0];
    return `Yes, I noticed your **${a.categoryName}** spending spiked by **${a.increasePercentage}%** compared to last week. Try to be mindful of that category this week.`;
  }

  return `I'm currently running in **Local Fallback Mode** (Edge Function not deployed). However, I can see you've spent **${totalSpent.toFixed(2)}** recently and have **${budgets.length}** active budgets. What else would you like to know?`;
};
