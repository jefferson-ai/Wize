import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus, Target, Sparkles, TrendingUp, Info } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getBudgetConsumption } from '../features/budgets/budgetService';
import { getCategories } from '../features/categories/categoryService';
import { getLoggingStreak } from '../features/transactions/transactionService';
import { getSavingGoals, getSavingsStrategies } from '../features/savings/savingsService';
import { formatAmount } from '../utils/formatters';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { useThemeColors } from '../hooks/useThemeColors';
import StreakBadges, { getStreakColor } from '../components/StreakBadges';
import Confetti, { ConfettiRef } from '../components/Confetti';
import SavingBucket from '../components/SavingBucket';
import { useFocusEffect } from '@react-navigation/native';
import AIAdvisorModal from '../components/AIAdvisorModal';
import { HeaderRegistrar } from '../components/AnimatedHeader';
import { useTabHeaderInset } from '../navigation/tabHeaderInset';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';
import AIInsightCard from '../components/AIInsightCard';
import { getSmartInsights, acceptChallenge, AnomalyAlert, SavingsChallenge } from '../features/ai/aiService';

const { width } = Dimensions.get('window');

export default function InsightsScreen({ navigation, route }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const headerInset = useTabHeaderInset();

  const [activeTab, setActiveTab] = useState<'budgets' | 'savings'>(route?.params?.initialTab || 'budgets');
  const [budgets, setBudgets] = useState<any[]>([]);
  const [savingGoals, setSavingGoals] = useState<any[]>([]);
  const [strategies, setStrategies] = useState({ spareChange: 0, multiplier: 0, transactionCount: 0 });
  const [streak, setStreak] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [insights, setInsights] = useState<{ anomalies: AnomalyAlert[], activeChallenges: any[], recommendedChallenge: SavingsChallenge | null }>({ anomalies: [], activeChallenges: [], recommendedChallenge: null });
  const colors = useThemeColors();

  const confettiRef = React.useRef<ConfettiRef>(null);
  const isInitialSyncDone = React.useRef(false);
  const prevStreak = React.useRef<number | null>(null);

  React.useEffect(() => {
    // Stage 1: Initial mount (ignore transition from null state)
    if (prevStreak.current === null) {
      prevStreak.current = streak;
      return;
    }

    // Stage 2: Initial data fetch (ignore transition from 0 to DB value)
    if (!isInitialSyncDone.current) {
      prevStreak.current = streak;
      return;
    }

    // Stage 3: Normal operation (celebrate increases)
    if (streak > prevStreak.current) {
      confettiRef.current?.trigger();
    }
    prevStreak.current = streak;
  }, [streak]);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) fetchData();
    }, [user?.id])
  );

  const fetchData = async () => {
    if (!user?.id) return;
    const [consumption, userStreak, goals, strategiesRes, dashInsights] = await Promise.all([
      getBudgetConsumption(user.id),
      getLoggingStreak(user.id),
      getSavingGoals(user.id),
      getSavingsStrategies(user.id),
      getSmartInsights(user.id)
    ]);
    setBudgets(consumption);
    setStreak(userStreak);
    // Explicitly mark initial sync as done to prevent confetti on startup
    if (!isInitialSyncDone.current) {
      prevStreak.current = userStreak;
      isInitialSyncDone.current = true;
    }
    setSavingGoals(goals);
    setStrategies(strategiesRes);
    setInsights(dashInsights);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleAddAction = () => {
    if (activeTab === 'budgets') {
      navigation.navigate('AddBudget');
    } else {
      navigation.navigate('AddSavingGoal');
    }
  };

  const handleAcceptChallenge = async (ch: SavingsChallenge) => {
    if (!user?.id) return;
    try {
      await acceptChallenge(user.id, ch);
      await fetchData();
    } catch (error) {
       console.error('Failed to accept challenge');
    }
  };

  const handleDismissInsight = (type: 'anomaly' | 'challenge', id: string) => {
    if (type === 'anomaly') {
      setInsights(prev => ({ ...prev, anomalies: prev.anomalies.filter(a => a.id !== id) }));
    } else {
      setInsights(prev => ({ ...prev, recommendedChallenge: null }));
    }
  };

  const renderBudgetCard = (budget: any) => {
    const pUsed = budget.percentageUsed;
    const isOver = pUsed >= 100;
    const isWarn = pUsed >= 80 && !isOver;
    const barColor = isOver ? colors.danger : isWarn ? colors.warning : colors.text;
    const statusColor = isOver ? colors.danger : isWarn ? colors.warning : colors.success;

    return (
      <TouchableOpacity 
        key={budget.id} 
        activeOpacity={0.7}
        onPress={() => navigation.navigate('EditBudget', { budgetToEdit: budget })}
        style={[styles.budgetCard, { backgroundColor: colors.card }]}
      >
        <View style={styles.budgetHeader}>
          <View style={styles.budgetLeft}>
            <View style={[styles.categoryDot, { backgroundColor: budget.category?.color || '#94a3b8' }]}>
              <Text style={styles.categoryDotText}>{getCategoryEmoji(budget.category?.name)}</Text>
            </View>
            <View>
              <Text style={[styles.categoryName, { color: colors.text }]}>{budget.category?.name || 'Category'}</Text>
              <Text style={[styles.budgetPeriod, { color: colors.textMuted }]}>{budget.period === 'monthly' ? 'Monthly' : 'Weekly'}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '18' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {isOver ? 'Over' : isWarn ? 'Warning' : 'On track'}
            </Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Spent</Text>
            <Text style={[styles.amountValue, { color: colors.text }]}>{currency} {formatAmount(budget.spent)}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Budget</Text>
            <Text style={[styles.amountLimit, { color: colors.textMuted }]}>{currency} {formatAmount(budget.amount)}</Text>
          </View>
        </View>

        <View style={[styles.progressTrack, { backgroundColor: colors.background }]}>
          <View style={[styles.progressFill, { width: `${Math.min(pUsed, 100)}%` as any, backgroundColor: barColor }]} />
        </View>
        <View style={styles.progressFooter}>
          <Text style={[styles.progressPct, { color: colors.textMuted }]}>{formatAmount(pUsed, 0)}% used</Text>
          {isOver ? (
            <Text style={[styles.progressStatus, { color: colors.danger }]}>Exceeded by {currency} {formatAmount(budget.spent - budget.amount)}</Text>
          ) : isWarn ? (
            <Text style={[styles.progressStatus, { color: colors.warning }]}>Approaching limit</Text>
          ) : (
            <Text style={[styles.progressStatus, { color: colors.textMuted }]}>{currency} {formatAmount(budget.remaining)} left</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderSavingsView = () => (
    <View>
      {/* Strategies Summary */}
      <View style={styles.strategiesContainer}>
        <View style={[
          styles.strategyCard, 
          { 
            backgroundColor: colors.isDark ? 'rgba(3, 105, 161, 0.15)' : '#f0f9ff', 
            borderColor: colors.isDark ? 'rgba(3, 105, 161, 0.3)' : '#bae6fd' 
          }
        ]}>
          <View style={[styles.strategyIconWrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#ffffff' }]}>
            <Sparkles size={16} color={colors.isDark ? '#7dd3fc' : "#0369a1"} />
          </View>
          <Text style={[styles.strategyLabel, { color: colors.isDark ? '#7dd3fc' : '#0369a1' }]}>Spare Change</Text>
          <Text style={[styles.strategyAmount, { color: colors.text }]}>{currency} {formatAmount(strategies.spareChange)}</Text>
          <Text style={[styles.strategyDetail, { color: colors.textMuted }]}>Round-ups this month</Text>
        </View>
        
        <View style={[
          styles.strategyCard, 
          { 
            backgroundColor: colors.isDark ? 'rgba(162, 28, 175, 0.15)' : '#fdf4ff', 
            borderColor: colors.isDark ? 'rgba(162, 28, 175, 0.3)' : '#f5d0fe' 
          }
        ]}>
          <View style={[styles.strategyIconWrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#ffffff' }]}>
            <TrendingUp size={16} color={colors.isDark ? '#f0abfc' : "#a21caf"} />
          </View>
          <Text style={[styles.strategyLabel, { color: colors.isDark ? '#f0abfc' : '#a21caf' }]}>Steady Growth</Text>
          <Text style={[styles.strategyAmount, { color: colors.text }]}>{currency} {formatAmount(strategies.multiplier)}</Text>
          <Text style={[styles.strategyDetail, { color: colors.textMuted }]}>Multiplier this month</Text>
        </View>
      </View>

      <View style={[styles.statBox, { backgroundColor: colors.card }]}>
        <Info size={14} color={colors.textMuted} />
        <Text style={[styles.statText, { color: colors.textMuted }]}>
           Based on your {strategies.transactionCount} purchases this month
        </Text>
      </View>

      <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 10 }]}>Active Bucket Goals</Text>
      
      {savingGoals.length === 0 ? (
        <View style={[styles.emptyGoals, { backgroundColor: colors.card }]}>
          <Target size={32} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text, fontSize: 18, marginTop: 12 }]}>Fuel your dreams</Text>
          <Text style={[styles.emptyBody, { color: colors.textMuted, marginTop: 4 }]}>Create your first goal bucket to start tracking progress.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('AddSavingGoal')} style={[styles.emptyBtn, { backgroundColor: colors.text, marginTop: 24 }]}>
             <Text style={[styles.emptyBtnText, { color: colors.background }]}>Add First Goal</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.goalsGrid}>
          {savingGoals.map(goal => (
            <TouchableOpacity 
              key={goal.id} 
              activeOpacity={0.8}
              style={[styles.goalCard, { backgroundColor: colors.card }]}
            >
              <SavingBucket 
                name={goal.name}
                target={goal.targetAmount}
                current={goal.currentAmount}
                color={goal.color}
                size="large"
              />
              <View style={styles.goalInfo}>
                 <Text style={[styles.goalName, { color: colors.text }]} numberOfLines={1}>{goal.name}</Text>
                 <Text style={[styles.goalTargetText, { color: colors.textMuted }]}>
                   Target: {currency} {formatAmount(goal.targetAmount)}
                 </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { flex: 1, backgroundColor: 'transparent' }]}>
      <HeaderRegistrar 
        title="Planning" 
        index={2}
        rightElement={
          <TouchableOpacity
            onPress={handleAddAction}
            accessibilityRole="button"
            accessibilityLabel={activeTab === 'budgets' ? "Add budget" : "Add goal"}
            style={[styles.addBtn, { backgroundColor: colors.text, shadowColor: colors.text }]}
          >
            <Plus size={20} color={colors.background} strokeWidth={2.5} />
          </TouchableOpacity>
        }
      />

      <View style={{ height: headerInset }} collapsable={false} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* AI Strategist Entry */}
      <View style={{ paddingHorizontal: 24, marginBottom: 16 }}>
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => setAiModalVisible(true)}
          style={[styles.aiCard, { backgroundColor: colors.text, shadowColor: colors.text }]}
        >
          <View style={styles.aiCardContent}>
            <View style={styles.aiTextContainer}>
              <View style={styles.aiBadge}>
                <Sparkles size={12} color={colors.background} style={{ marginRight: 4 }} />
                <Text style={[styles.aiBadgeText, { color: colors.background }]}>AI Strategy</Text>
              </View>
              <Text style={[styles.aiTitle, { color: colors.background }]}>Unlock Financial Insights</Text>
              <Text style={[styles.aiSubtitle, { color: colors.background, opacity: 0.7 }]}>Let your AI strategist analyze your habits</Text>
            </View>
            <View style={[styles.aiIconCircle, { backgroundColor: colors.background + '20' }]}>
              <Sparkles size={24} color={colors.background} />
            </View>
          </View>
        </TouchableOpacity>
      </View>




      {/* Segmented Control */}
      <View style={styles.tabsWrapper}>
        <View style={[styles.tabsContainer, { backgroundColor: colors.border }]}>
          <TouchableOpacity 
            onPress={() => setActiveTab('budgets')}
            style={[styles.tabBtn, activeTab === 'budgets' && { backgroundColor: colors.card }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'budgets' ? colors.text : colors.textMuted }]}>Budgets</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('savings')}
            style={[styles.tabBtn, activeTab === 'savings' && { backgroundColor: colors.card }]}
          >
            <Text style={[styles.tabText, { color: activeTab === 'savings' ? colors.text : colors.textMuted }]}>Savings</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        {activeTab === 'budgets' ? (
          <View>
            {/* Recommended Challenge Invitation */}
            {insights.recommendedChallenge && (
              <View style={{ marginBottom: 20 }}>
                <AIInsightCard
                  type="challenge"
                  title="AI Recommendation"
                  description={insights.recommendedChallenge.description}
                  color="#6366f1"
                  onAccept={() => handleAcceptChallenge(insights.recommendedChallenge!)}
                  onDismiss={() => handleDismissInsight('challenge', 'rec-challenge')}
                />
              </View>
            )}

            {budgets.length === 0 && insights.activeChallenges.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.border }]}>
                  <Plus size={30} color={colors.text} opacity={0.7} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No targets set yet</Text>
                <Text style={[styles.emptyBody, { color: colors.textMuted }]}>
                  Create a budget or accept an AI challenge to monitor your financial progress.
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('AddBudget')}
                  style={[styles.emptyBtn, { backgroundColor: colors.text }]}
                >
                  <Text style={[styles.emptyBtnText, { color: colors.background }]}>Create First Budget</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Active Targets</Text>
                {budgets.map(renderBudgetCard)}
                
                {/* Active Challenges as Targets */}
                {insights.activeChallenges.map(challenge => (
                  <AIInsightCard
                    key={challenge.id}
                    type="challenge"
                    title={challenge.title}
                    description={challenge.description}
                    color={challenge.currentAmount > (challenge.targetAmount * 0.9) ? colors.warning : colors.success}
                    progress={Math.min(1, challenge.currentAmount / challenge.targetAmount)}
                    amountLabel={`${currency} ${formatAmount(challenge.currentAmount)} / ${formatAmount(challenge.targetAmount)}`}
                    onDismiss={() => {}} 
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
          renderSavingsView()
        )}
      </ScrollView>
      </View>

      <StreakBadges 
        streak={streak} 
        isVisible={streakModalVisible} 
        onClose={() => setStreakModalVisible(false)} 
      />
      <AIAdvisorModal 
        isVisible={aiModalVisible} 
        onClose={() => setAiModalVisible(false)} 
        userId={user?.id || ''} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  aiCard: { borderRadius: 24, padding: 20, elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
  aiCardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  aiTextContainer: { flex: 1 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginBottom: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, fontFamily: fontRounded },
  aiTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4, fontFamily: fontDisplay },
  aiSubtitle: { fontSize: 13, fontFamily: fontText },
  aiIconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  screen: { flex: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#212529', alignItems: 'center', justifyContent: 'center' },

  tabsWrapper: { paddingHorizontal: 24, marginBottom: 8 },
  tabsContainer: { flexDirection: 'row', borderRadius: 16, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  tabText: { fontSize: 13, fontWeight: '700', fontFamily: fontRounded },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9aa2ad', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14, fontFamily: fontRounded },
  budgetCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 18, marginBottom: 14 },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  budgetLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  categoryDotText: { color: '#ffffff', fontWeight: '700', fontSize: 15, fontFamily: fontText },
  categoryName: { fontSize: 16, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },
  budgetPeriod: { fontSize: 12, color: '#9aa2ad', marginTop: 1, fontFamily: fontText },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: fontText },

  amountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 },
  amountLabel: { fontSize: 12, color: '#9aa2ad', marginBottom: 3, fontFamily: fontText },
  amountValue: { fontSize: 20, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },
  amountLimit: { fontSize: 15, fontWeight: '600', color: '#687280', fontFamily: fontText },

  progressTrack: { height: 6, backgroundColor: '#f5f6f7', borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 6 },
  progressFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  progressPct: { fontSize: 11, color: '#9aa2ad', fontFamily: fontText },
  progressStatus: { fontSize: 11, fontWeight: '600', color: '#9aa2ad', fontFamily: fontText },

  strategiesContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  strategyCard: { flex: 1, padding: 16, borderRadius: 24, borderWidth: 1 },
  strategyIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#ffffff', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  strategyLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6, fontFamily: fontText },
  strategyAmount: { fontSize: 18, fontWeight: '800', marginBottom: 4, fontFamily: fontDisplay },
  strategyDetail: { fontSize: 9, fontFamily: fontText },

  statBox: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, marginBottom: 20, gap: 8 },
  statText: { fontSize: 11, fontFamily: fontText },

  goalsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  goalCard: { width: (width - 56) / 2, padding: 20, borderRadius: 24, marginBottom: 16, alignItems: 'center' },
  goalInfo: { marginTop: 12, alignItems: 'center' },
  goalName: { fontSize: 14, fontWeight: '700', fontFamily: fontText, textAlign: 'center' },
  goalTargetText: { fontSize: 11, marginTop: 2, fontFamily: fontText },

  emptyState: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 30 },
  emptyGoals: { alignItems: 'center', paddingVertical: 40, paddingHorizontal: 20, borderRadius: 28 },
  emptyIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: '#e8eaec', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#212529', marginBottom: 8, textAlign: 'center', fontFamily: fontDisplay },
  emptyBody: { fontSize: 13, color: '#9aa2ad', textAlign: 'center', lineHeight: 20, fontFamily: fontText },
  emptyBtn: { backgroundColor: '#212529', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28 },
  emptyBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, fontFamily: fontText },
  
  streakBadge: { backgroundColor: '#fff3cd', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#ffe69c' },
  streakText: { fontSize: 13, fontWeight: '700', color: '#856404', fontFamily: fontText },
});
