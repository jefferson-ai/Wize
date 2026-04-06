import { supabase } from '../utils/supabase';
import { getTransactions } from '../features/transactions/transactionService';
import { getBudgetConsumption } from '../features/budgets/budgetService';
import { getSavingGoals } from '../features/savings/savingsService';

// Set to false for live mode
const MOCK_MODE = false;

export interface AIAdvice {
  summary: string;
  actionItems: string[];
  encouragement: string;
}

/**
 * Gathers user financial context and requests advice via a secure Supabase Edge Function.
 */
export const getAIAdvice = async (userId: string): Promise<AIAdvice> => {
  if (MOCK_MODE) {
    console.log('AI Advisor: Using Mock Mode (MOCK_MODE=true)');
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    return {
      summary: "I've analyzed your recent activity. Your discipline with the 'Coffee' budget is impressive, but I noticed a 15% uptick in unscheduled 'Entertainment' spending this week.",
      actionItems: [
        "Pause non-essential purchases for the next 72 hours to reset your baseline.",
        "Consider moving $25 from your surplus into your 'Summer Trip' savings bucket today.",
        "Your logging streak is at 5 days—one more and you'll hit a new level of financial clarity."
      ],
      encouragement: "You're building the habits of a wealth-builder. Don't let one off-week distract you from the vision. You've got this."
    };
  }

  try {
    // 1. Gather Context
    const [transactions, budgets, goals] = await Promise.all([
      getTransactions(userId, { limit: 40 }),
      getBudgetConsumption(userId),
      getSavingGoals(userId)
    ]);

    // 2. Format Context for the Edge Function
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
      }))
    };

    // 3. Invoke Supabase Edge Function directly for better reliability
    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/get-ai-advice`;
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log('AI Advisor: Directly fetching from', functionUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || anonKey}`,
        'apikey': anonKey || '',
      },
      body: JSON.stringify({ context }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Advisor: Network Error:', response.status, errorText);
      throw new Error(`AI Connection Error (${response.status}): ${errorText || 'Failed to reach backend'}`);
    }

    const data = await response.json();

    if (data && data.error) {
      console.error('AI Advisor: Strategy Error:', data.error);
      throw new Error(data.error);
    }
    
    return data as AIAdvice;

  } catch (err) {
    console.error('AI Advisor Error:', err);
    throw err;
  }
};
