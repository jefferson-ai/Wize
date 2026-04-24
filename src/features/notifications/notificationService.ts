import { getBudgetConsumption } from '../budgets/budgetService';
import { getLoggingStreak } from '../transactions/transactionService';
import { getSmartInsights, AnomalyAlert, SavingsChallenge } from '../ai/aiService';
import { db } from '../../db';
import { challenges } from '../../db/schema';
import { eq, and, desc } from 'drizzle-orm';

// ─── Types ────────────────────────────────────────────────────
export interface AppNotification {
  id: string;
  type:
    | 'budget-warning'
    | 'budget-exceeded'
    | 'streak-milestone'
    | 'challenge-complete'
    | 'challenge-failed'
    | 'ai-anomaly'
    | 'ai-challenge'
    | 'welcome';
  title: string;
  body: string;
  timestamp: string; // ISO string
  iconName: string;  // phosphor-react-native icon key
  iconColor: string;
  onPressTarget?: string; // Tab name to jump to
}

// ─── Milestone thresholds ─────────────────────────────────────
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];

// ─── Time-ago formatter ───────────────────────────────────────
export function timeAgo(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(isoString).toLocaleDateString();
}

// ─── Section helpers ──────────────────────────────────────────
export function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ─── Main generator ───────────────────────────────────────────
export async function generateNotifications(
  userId: string,
  currency: string,
  isOnboarded: boolean,
  isPro: boolean = false
): Promise<AppNotification[]> {
  const notifications: AppNotification[] = [];
  const now = new Date().toISOString();

  // Run all data queries concurrently
  const [budgetData, streak, smartInsights, recentChallenges] =
    await Promise.all([
      getBudgetConsumption(userId),
      getLoggingStreak(userId),
      isPro ? getSmartInsights(userId) : Promise.resolve({ anomalies: [], activeChallenges: [], recommendedChallenge: null }),
      isPro ? getRecentChallengeOutcomes(userId) : Promise.resolve([]),
    ]);

  // ── 1. Budget Alerts ────────────────────────────────────────
  budgetData.forEach((b: any) => {
    const pct = b.percentageUsed;
    const catName = b.category?.name || 'Budget';

    if (pct >= 100) {
      notifications.push({
        id: `budget-exceeded-${b.id}`,
        type: 'budget-exceeded',
        title: `${catName} Budget Exceeded 🚨`,
        body: `You've exceeded your ${catName} budget by ${currency} ${Math.round(b.spent - b.amount).toLocaleString()}. Consider adjusting your spending.`,
        timestamp: b.updatedAt || now,
        iconName: 'AlertOctagon',
        iconColor: '#ef4444',
        onPressTarget: 'Planning',
      });
    } else if (pct >= 85) {
      notifications.push({
        id: `budget-warn-${b.id}`,
        type: 'budget-warning',
        title: `${catName} Budget Alert ⚠️`,
        body: `You've used ${Math.round(pct)}% of your ${catName} budget. ${currency} ${Math.round(b.remaining).toLocaleString()} remaining.`,
        timestamp: b.updatedAt || now,
        iconName: 'AlertTriangle',
        iconColor: '#eab308',
        onPressTarget: 'Planning',
      });
    }
  });

  // ── 2. Streak Milestones ────────────────────────────────────
  const highestMilestone = STREAK_MILESTONES.filter((m) => streak >= m).pop();
  if (highestMilestone) {
    const emoji =
      highestMilestone >= 100
        ? '🏆'
        : highestMilestone >= 30
        ? '⭐'
        : highestMilestone >= 14
        ? '💪'
        : '🔥';
    notifications.push({
      id: `streak-${highestMilestone}`,
      type: 'streak-milestone',
      title: `${highestMilestone}-Day Streak! ${emoji}`,
      body:
        highestMilestone >= 30
          ? `Incredible discipline! You've logged your finances for ${highestMilestone} days straight. You're building a powerful habit.`
          : `Amazing consistency! You've logged your expenses for ${highestMilestone} days in a row. Keep the momentum going!`,
      timestamp: now, // Streaks are always "current"
      iconName: 'Flame',
      iconColor: '#f97316',
    });
  }

  // ── 3. Challenge Outcomes ───────────────────────────────────
  recentChallenges.forEach((ch) => {
    if (ch.status === 'completed') {
      notifications.push({
        id: `challenge-complete-${ch.id}`,
        type: 'challenge-complete',
        title: `Challenge Completed! 🏆`,
        body: `Congratulations! You successfully completed "${ch.title}". Your discipline is paying off.`,
        timestamp: ch.endDate || now,
        iconName: 'Trophy',
        iconColor: '#22c55e',
        onPressTarget: 'Planning',
      });
    } else if (ch.status === 'failed') {
      notifications.push({
        id: `challenge-failed-${ch.id}`,
        type: 'challenge-failed',
        title: `Challenge Ended`,
        body: `The "${ch.title}" challenge has ended. Don't worry — every day is a fresh start. Try again!`,
        timestamp: ch.endDate || now,
        iconName: 'HeartCrack',
        iconColor: '#ef4444',
        onPressTarget: 'Planning',
      });
    }
  });

  // ── 4. AI Anomaly Alerts ────────────────────────────────────
  smartInsights.anomalies.forEach((a: AnomalyAlert) => {
    notifications.push({
      id: a.id,
      type: 'ai-anomaly',
      title: `Spending Spike: ${a.categoryName} 🚨`,
      body: `Your ${a.categoryName} spending is up ${a.increasePercentage}% compared to last week — that's ${currency} ${a.amountDifference.toLocaleString()} more than usual.`,
      timestamp: a.createdAt || now,
      iconName: 'Sparkles',
      iconColor: '#8b5cf6',
      onPressTarget: 'Planning',
    });
  });

  // ── 5. AI Challenge Recommendation ──────────────────────────
  if (smartInsights.recommendedChallenge) {
    const rc = smartInsights.recommendedChallenge;
    notifications.push({
      id: rc.id,
      type: 'ai-challenge',
      title: `New Savings Challenge ✨`,
      body: rc.description,
      timestamp: now,
      iconName: 'Sparkles',
      iconColor: '#6366f1',
      onPressTarget: 'Planning',
    });
  }

  // ── 6. Welcome Message ──────────────────────────────────────
  if (isOnboarded) {
    notifications.push({
      id: 'welcome',
      type: 'welcome',
      title: 'Welcome to SpendWise! 🎉',
      body: 'Start tracking your expenses daily to build a healthy financial habit. Log your first transaction to get started!',
      timestamp: now,
      iconName: 'CheckCircle2',
      iconColor: '#22c55e',
    });
  }

  // Sort by timestamp, newest first
  notifications.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return notifications;
}

// ─── Helper: fetch recently completed/failed challenges ───────
async function getRecentChallengeOutcomes(userId: string) {
  try {
    const results = await db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.userId, userId),
          // Only non-active (completed or failed)
        )
      )
      .orderBy(desc(challenges.createdAt));

    // Filter to completed/failed only and only from the last 30 days
    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000
    ).toISOString();

    return results.filter(
      (ch) =>
        (ch.status === 'completed' || ch.status === 'failed') &&
        ch.endDate >= thirtyDaysAgo
    );
  } catch (err) {
    console.error('Error fetching challenge outcomes', err);
    return [];
  }
}

// ─── Utility: count unread notifications ──────────────────────
export function countUnread(
  notifications: AppNotification[],
  dismissedIds: string[],
  lastViewedAt: string | null
): number {
  return notifications.filter((n) => {
    // Already dismissed by swipe → never show
    if (dismissedIds.includes(n.id)) return false;
    // If the user has visited the Activity screen, only count
    // notifications whose timestamp is AFTER that visit
    if (lastViewedAt) {
      return new Date(n.timestamp).getTime() > new Date(lastViewedAt).getTime();
    }
    // Never visited Activity → everything is unread
    return true;
  }).length;
}
