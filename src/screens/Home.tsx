import React, { useState, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Dimensions, ActionSheetIOS, Platform, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Eye, EyeSlash, ArrowUpRight, CaretDown, Flame, Sparkle } from 'phosphor-react-native';

import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getDashboardSummary, getTransactions, getLoggingStreak, checkLoggedToday, logNoSpendDay, processRecurringTransactions } from '../features/transactions/transactionService';
import { getBudgetConsumption } from '../features/budgets/budgetService';
import { getAccounts, getTotalBalance, ensureDefaultAccount, Account } from '../features/accounts/accountService';
import { getSavingGoals } from '../features/savings/savingsService';
import CategoryIcon from '../components/CategoryIcon';
import { seedDefaultCategories } from '../features/categories/categoryService';
import { formatAmount } from '../utils/formatters';
import { useThemeColors } from '../hooks/useThemeColors';
import StreakBadges, { getStreakColor } from '../components/StreakBadges';
import Confetti, { ConfettiRef } from '../components/Confetti';
import SavingBucket from '../components/SavingBucket';
import ShakingBell from '../components/ShakingBell';
import AnimatedDonutChart from '../components/AnimatedDonutChart';
import { HeaderRegistrar } from '../components/AnimatedHeader';
import { TabNavigationContext } from '../navigation/navigationContext';
import { useTabHeaderInset } from '../navigation/tabHeaderInset';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';
import AIInsightCard from '../components/AIInsightCard';
import { getSmartInsights, AnomalyAlert, SavingsChallenge } from '../features/ai/aiService';
import { generateNotifications, countUnread } from '../features/notifications/notificationService';
import UpgradeModal from '../components/UpgradeModal';
import TransactionStack from '../components/TransactionStack';

const { width, height: WINDOW_HEIGHT } = Dimensions.get('window');

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency, isOnboarded, isPro, lastNotificationViewedAt, dismissedNotificationIds } = useAppSettingsStore();

  const [summary, setSummary] = useState({ balance: 0, income: 0, expense: 0, categoryData: [] as any[] });
  const [chartKey, setChartKey] = useState(0);
  const [totalBalance, setTotalBalance] = useState(0);
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);
  const [notifCount, setNotifCount] = useState(0);
  const [allBudgets, setAllBudgets] = useState<any[]>([]);
  const [savingGoals, setSavingGoals] = useState<any[]>([]);
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [streak, setStreak] = useState(0);
  const [hasLoggedToday, setHasLoggedToday] = useState(true);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const [insights, setInsights] = useState<{ anomalies: AnomalyAlert[], activeChallenges: any[], recommendedChallenge: SavingsChallenge | null }>({ anomalies: [], activeChallenges: [], recommendedChallenge: null });
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [isStackExpanded, setIsStackExpanded] = useState(false);

  const [selectedPeriod, setSelectedPeriod] = useState<'overall' | 'monthly' | 'weekly'>('overall');
  const [accounts, setAccounts] = useState<Account[]>([]);

  const colors = useThemeColors();
  const headerInset = useTabHeaderInset();
  const tabNav = React.useContext(TabNavigationContext);
  
  const confettiRef = React.useRef<ConfettiRef>(null);
  const isInitialSyncDone = React.useRef(false);
  const prevStreak = React.useRef<number | null>(null);
  const stackSectionLayout = React.useRef({ y: 0, height: 0 });

  React.useEffect(() => {
    // If we haven't seen any streak yet, just record it
    if (prevStreak.current === null) {
      prevStreak.current = streak;
      return;
    }

    // Ignore the very first time we sync from the database
    if (!isInitialSyncDone.current) {
      prevStreak.current = streak;
      if (streak > 0) {
        isInitialSyncDone.current = true;
      }
      return;
    }

    // Now we can trigger on legitimate increases
    if (streak > prevStreak.current) {
      confettiRef.current?.trigger();
    }
    prevStreak.current = streak;
  }, [streak]);

  useFocusEffect(
    useCallback(() => {
      // Delay slightly to ensure tab transition finishes so the spiral build is visible
      const timer = setTimeout(() => {
        setChartKey(prev => prev + 1);
      }, 150);

      if (user?.id) {
        loadData();
      }
      
      return () => clearTimeout(timer);
    }, [user?.id, selectedPeriod])
  );

  React.useEffect(() => {
    const sub = DeviceEventEmitter.addListener('transaction_updated', () => {
      if (user?.id) loadData();
    });
    return () => sub.remove();
  }, [user?.id, selectedPeriod]);

  const loadData = async () => {
    if (!user?.id) return;
    await processRecurringTransactions(user.id);
    await ensureDefaultAccount(user.id, currency);
    await seedDefaultCategories(user.id);

    const [dashSummary, total, allAccounts, recent, consumption, userStreak, loggedToday, goals, smartInsights] = await Promise.all([
      getDashboardSummary(user.id, undefined, selectedPeriod),
      getTotalBalance(user.id),
      getAccounts(user.id),
      getTransactions(user.id, { limit: 3 }),
      getBudgetConsumption(user.id),
      getLoggingStreak(user.id),
      checkLoggedToday(user.id),
      getSavingGoals(user.id),
      getSmartInsights(user.id)
    ]);
    setSummary(dashSummary as any);
    setTotalBalance(total);
    setAccounts(allAccounts);
    setRecentTx(recent);
    setAllBudgets(consumption.sort((a, b) => b.percentageUsed - a.percentageUsed).slice(0, 4));
    setStreak(userStreak);
    // Explicitly mark initial sync as done once we've fetched from DB
    if (!isInitialSyncDone.current) {
      prevStreak.current = userStreak;
      isInitialSyncDone.current = true;
    }
    setHasLoggedToday(loggedToday);
    setSavingGoals(goals);
    setInsights(smartInsights);
    
    const criticalBudgets = consumption
       .filter(b => b.percentageUsed >= 80)
       .sort((a, b) => b.percentageUsed - a.percentageUsed)
       .slice(0, 2);
       
    setBudgetAlerts(criticalBudgets);

    // Compute unread notification count — read latest store values
    // directly to avoid stale closure from useFocusEffect
    try {
      const allNotifs = await generateNotifications(user.id, currency, isOnboarded, isPro);
      const store = useAppSettingsStore.getState();
      setNotifCount(countUnread(allNotifs, store.dismissedNotificationIds, store.lastNotificationViewedAt));
    } catch (_) {}
  };

  const showFilterOptions = () => {
    const options = ['Overall', 'This Month', 'This Week', 'Cancel'];
    const periods: ('overall' | 'monthly' | 'weekly')[] = ['overall', 'monthly', 'weekly'];
    const cancelButtonIndex = options.length - 1;

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex,
          title: 'Filter Chart By Period',
        },
        buttonIndex => {
          if (buttonIndex < cancelButtonIndex) {
            setSelectedPeriod(periods[buttonIndex]);
          }
        }
      );
    } else {
      Alert.alert(
        'Filter Chart By Period',
        'Choose a time period to view.',
        options.slice(0, cancelButtonIndex).map((opt, idx) => ({
          text: opt,
          onPress: () => setSelectedPeriod(periods[idx])
        }))
      );
    }
  };

  const periodLabel = selectedPeriod === 'overall' ? 'Overall' : selectedPeriod === 'monthly' ? 'This Month' : 'This Week';

  const hasChartData = summary.categoryData && summary.categoryData.length > 0;
  const firstName = user?.email?.split('@')[0] || 'there';

  const handleScroll = (e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    const { y, height } = stackSectionLayout.current;
    
    if (y > 0 && isStackExpanded) {
      // The section is out of screen if its bottom is above the viewport 
      // or its top is below the viewport.
      const isOutOfScreen = (offsetY > y + height) || (offsetY + WINDOW_HEIGHT < y);
      if (isOutOfScreen) {
        setIsStackExpanded(false);
      }
    }
  };

  const handleNoSpend = async () => {
    if (!user?.id) return;
    try {
      await logNoSpendDay(user.id, currency);
      await loadData();
    } catch (error) {
      console.error('Failed to log no spend day');
    }
  };

  return (
    <View style={[styles.screen, { flex: 1, backgroundColor: 'transparent' }]}>
      <HeaderRegistrar 
        title="Dashboard" 
        index={0}
        useGlassyTitle={true}
        iconName="Sparkles"
        streak={streak}
        onStreakPress={() => setStreakModalVisible(true)}
        confettiRef={confettiRef}
        rightElement={
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => navigation.navigate('Notifications')}
            style={[styles.bellBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <ShakingBell 
              size={20} 
              color={colors.text} 
              shouldShake={notifCount > 0} 
            />
            {notifCount > 0 && <View style={styles.notifBadge} />}
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: 110 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={{ height: headerInset }} collapsable={false} />
        <View
          style={{
            backgroundColor: colors.background,
            flexGrow: 1,
            minHeight: Math.max(0, WINDOW_HEIGHT - headerInset),
          }}
        >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={[styles.greetingLabel, { color: colors.textMuted }]}>Welcome back</Text>
            <Text style={[styles.greetingName, { color: colors.text }]}>{firstName} 👋</Text>
          </View>
        </View>

        {/* No Spend Today Banner */}
        {!hasLoggedToday && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={handleNoSpend}
            style={[styles.noSpendBanner, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.noSpendTitle, { color: colors.text }]}>Didn't spend anything today?</Text>
              <Text style={[styles.noSpendSub, { color: colors.textMuted }]}>Tap here to save your streak!</Text>
            </View>
            <View style={[styles.noSpendBtnWrapper, { backgroundColor: colors.text }]}>
              <Text style={[styles.noSpendBtnText, { color: colors.background }]}>Log $0</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Wallet Card */}
        <View style={styles.card}>
          {/* Decorative circles */}
          <View style={styles.decorCircle1} />
          <View style={styles.decorCircle2} />
          
          <View style={styles.cardInner}>
            {/* Card header */}
            <View style={styles.cardHeader}>
              <View style={styles.balanceLabelRow}>
                <Text style={styles.balanceLabel}>Your Balance</Text>
                <TouchableOpacity
                  onPress={() => setBalanceHidden(!balanceHidden)}
                  style={{ marginLeft: 8, padding: 4 }}
                  accessibilityRole="button"
                  accessibilityLabel={balanceHidden ? 'Show balance' : 'Hide balance'}
                >
                  {balanceHidden ? (
                    <EyeSlash size={15} color="rgba(255,255,255,0.55)" />
                  ) : (
                    <Eye size={15} color="rgba(255,255,255,0.55)" />
                  )}
                </TouchableOpacity>
              </View>
              <View style={styles.brandBadge}>
                <Text style={styles.brandBadgeText}>SpendWise</Text>
              </View>
            </View>

            {/* Balance amount */}
            <Text style={styles.balanceAmount}>
              {balanceHidden ? '••••••' : `${currency} ${formatAmount(totalBalance)}`}
            </Text>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.cardFooterCol}>
               <View style={styles.cardFooterLabelRow}>
                 <View style={[styles.cardFooterDot, { backgroundColor: '#4ade80' }]} />
                 <Text style={styles.cardFooterLabel}>Income</Text>
               </View>
               <Text style={styles.cardFooterValue}>
                 {balanceHidden ? '••••' : `${currency} ${formatAmount(summary.income)}`}
               </Text>
            </View>
            <View style={styles.cardFooterCol}>
               <View style={styles.cardFooterLabelRow}>
                 <View style={[styles.cardFooterDot, { backgroundColor: '#f87171' }]} />
                 <Text style={styles.cardFooterLabel}>Expenses</Text>
               </View>
               <Text style={styles.cardFooterValue}>
                 {balanceHidden ? '••••' : `${currency} ${formatAmount(summary.expense)}`}
               </Text>
            </View>
          </View>
        </View>



        <View style={styles.section}>
          <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: colors.text }]}>Expenses by Category</Text>
              <TouchableOpacity 
                style={[styles.chartDropdown, { borderColor: colors.border }]}
                onPress={showFilterOptions}
                activeOpacity={0.7}
              >
                <Text style={[styles.chartDropdownText, { color: colors.textMuted }]}>{periodLabel}</Text>
                <CaretDown size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>

            {hasChartData ? (
              <AnimatedDonutChart
                data={summary.categoryData}
                totalValue={summary.expense}
                radius={65}
                strokeWidth={16}
                chartKey={chartKey}
              />
            ) : (
              <View style={{ height: 160, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: colors.textMuted, fontFamily: fontText }}>No expenses yet</Text>
              </View>
            )}
          </View>
        </View>

        {/* Budget Summary Section */}
        {allBudgets.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>My Budgets</Text>
              <TouchableOpacity
                onPress={() => tabNav?.jumpToTab('Planning')}
                style={styles.seeAllBtn}
              >
                <Text style={[styles.seeAllText, { color: colors.text }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.budgetListCard, { backgroundColor: colors.card }]}>
              {allBudgets.map((budget, idx) => {
                const pUsed = Math.min(budget.percentageUsed, 100);
                const barColor = budget.category?.color || colors.primary;
                const isOver = budget.percentageUsed >= 100;
                const isWarn = budget.percentageUsed >= 85;
                
                return (
                  <View key={budget.id}>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => navigation.navigate('EditBudget', { budgetToEdit: budget })}
                      style={[
                        styles.budgetRow, 
                        isOver && { borderLeftWidth: 3, borderLeftColor: colors.danger, paddingLeft: 12 },
                        isWarn && !isOver && { borderLeftWidth: 3, borderLeftColor: colors.warning, paddingLeft: 12 }
                      ]}
                    >
                      <View style={styles.budgetRowTop}>
                        <View style={styles.budgetRowLeft}>
                          <CategoryIcon categoryName={budget.category?.name} size={18} color={colors.text} style={{ marginRight: 8 }} />
                          <View>
                            <Text style={[styles.budgetName, { color: colors.text }]}>{budget.category?.name || 'Budget'}</Text>
                            {(isOver || isWarn) && (
                              <Text style={[styles.inlineAlertText, { color: isOver ? colors.danger : colors.warning }]}>
                                {isOver ? 'Limit Exceeded' : 'Nearing Limit'}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Text style={[styles.budgetRemain, { color: isOver ? colors.danger : colors.textMuted }]}>
                          {isOver ? `-${currency} ${formatAmount(budget.spent - budget.amount)}` : `${currency} ${formatAmount(budget.remaining)} left`}
                        </Text>
                      </View>
                      
                      <View style={[styles.miniProgressTrack, { backgroundColor: colors.background }]}>
                        <View style={[styles.miniProgressFill, { width: `${pUsed}%`, backgroundColor: isOver ? colors.danger : isWarn ? colors.warning : barColor }]} />
                      </View>
                    </TouchableOpacity>
                    {idx < allBudgets.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Challenge Progress Bar */}
        {isPro && insights.activeChallenges.length > 0 && (
          <View style={styles.sectionSmall}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Ongoing Challenges</Text>
              <Sparkle size={16} color={colors.primary} weight="fill" />
            </View>
            <View style={[styles.challengeProgressCard, { backgroundColor: colors.card }]}>
              {insights.activeChallenges.map((challenge, idx) => {
                const pct = Math.min(1, challenge.currentAmount / challenge.targetAmount);
                return (
                  <View key={challenge.id}>
                    <TouchableOpacity 
                      activeOpacity={0.7}
                      onPress={() => tabNav?.jumpToTab('Planning')}
                      style={styles.challengeRow}
                    >
                      <View style={styles.challengeRowTop}>
                         <Text style={[styles.challengeName, { color: colors.text }]}>{challenge.title}</Text>
                         <Text style={[styles.challengePct, { color: colors.primary }]}>{(pct * 100).toFixed(0)}%</Text>
                      </View>
                      <View style={[styles.miniProgressTrack, { backgroundColor: colors.background }]}>
                        <View style={[styles.miniProgressFill, { width: `${pct * 100}%`, backgroundColor: colors.primary }]} />
                      </View>
                      <Text style={[styles.challengeProgressText, { color: colors.textMuted }]}>
                        {currency} {formatAmount(challenge.currentAmount)} of {formatAmount(challenge.targetAmount)} • Day {challenge.currentDay} of {challenge.totalDays}
                      </Text>
                    </TouchableOpacity>
                    {idx < insights.activeChallenges.length - 1 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* AI Teaser for Free Users */}
        {!isPro && (
          <TouchableOpacity 
            activeOpacity={0.8}
            onPress={() => setShowUpgrade(true)}
            style={[styles.aiTeaser, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.aiTeaserIcon, { backgroundColor: '#8b5cf620' }]}>
              <Sparkle size={20} color="#8b5cf6" weight="fill" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.aiTeaserTitle, { color: colors.text }]}>AI Insights & Challenges</Text>
              <Text style={[styles.aiTeaserDesc, { color: colors.textMuted }]}>Unlock smart anomaly detection and personalized savings challenges</Text>
            </View>
          </TouchableOpacity>
        )}


        {/* Latest Transactions */}
        <View 
          style={styles.section}
          onLayout={(e) => {
            stackSectionLayout.current = {
              y: e.nativeEvent.layout.y,
              height: e.nativeEvent.layout.height
            };
          }}
        >
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Latest Transactions</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {isStackExpanded && (
                <TouchableOpacity
                  onPress={() => setIsStackExpanded(false)}
                  activeOpacity={0.6}
                  style={[styles.showLessBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <CaretDown size={12} color={colors.textMuted} weight="bold" />
                  <Text style={[styles.showLessText, { color: colors.textMuted }]}>Show less</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => tabNav?.jumpToTab('Transactions')}
                accessibilityRole="button"
                accessibilityLabel="See all transactions"
                style={styles.seeAllBtn}
              >
                <Text style={[styles.seeAllText, { color: colors.text }]}>See All</Text>
                <ArrowUpRight size={14} color={colors.text} weight="bold" />
              </TouchableOpacity>
            </View>
          </View>

          <TransactionStack 
            transactions={recentTx} 
            currency={currency} 
            isExpanded={isStackExpanded}
            onToggleExpand={() => setIsStackExpanded(!isStackExpanded)}
          />
        </View>
      </View>
    </ScrollView>

      <StreakBadges 
        streak={streak} 
        isVisible={streakModalVisible} 
        onClose={() => setStreakModalVisible(false)} 
      />
      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureTitle="AI Financial Intelligence"
        featureDescription="Get smart spending alerts, personalized savings challenges, and AI-powered financial coaching."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  greetingLabel: { fontSize: 13, color: '#9aa2ad', fontFamily: fontText },
  greetingName: { fontSize: 22, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 100 },
  streakBadge: { backgroundColor: '#fff3cd', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#ffe69c' },
  streakText: { fontSize: 14, fontWeight: '700', color: '#856404', fontFamily: fontRounded },
  bellBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  notifBadge: { position: 'absolute', top: 11, right: 12, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: 'transparent' },

  // Savings
  savingsScroll: { paddingRight: 20, paddingBottom: 10 },
  savingsPromo: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 24, borderWidth: 1, marginBottom: 10 },
  promoIcon: { width: 44, height: 44, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  promoTitle: { fontSize: 15, fontWeight: '700', fontFamily: fontDisplay },
  promoSub: { fontSize: 12, fontFamily: fontText, marginTop: 2 },

  // No Spend Banner
  noSpendBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 4, padding: 16, borderRadius: 16, borderWidth: 1 },
  noSpendTitle: { fontSize: 14, fontWeight: '700', fontFamily: fontDisplay, marginBottom: 2 },
  noSpendSub: { fontSize: 12, fontFamily: fontText },
  noSpendBtnWrapper: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  noSpendBtnText: { fontSize: 13, fontWeight: '700', fontFamily: fontDisplay },

  // Wallet Card
  card: { marginHorizontal: 20, marginTop: 12, borderRadius: 24, backgroundColor: '#212529', overflow: 'hidden', shadowColor: '#212529', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  decorCircle1: { position: 'absolute', top: -60, right: -60, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.05)' },
  decorCircle2: { position: 'absolute', top: 40, left: -50, width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,255,255,0.04)' },
  cardInner: { padding: 20 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center' },
  balanceLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', fontFamily: fontRounded },
  brandBadge: { backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  brandBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700', fontFamily: fontRounded },
  balanceAmount: { color: '#fff', fontSize: 34, fontWeight: '700', letterSpacing: -0.5, marginBottom: 8, fontFamily: fontDisplay },
  changePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.12)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  changePillText: { color: '#fff', fontSize: 13, fontWeight: '600', fontFamily: fontRounded },
  changePillSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: fontText },

  // Card Footer (Income/Expenses)
  cardFooter: { flexDirection: 'row', paddingBottom: 20, justifyContent: 'space-evenly', alignItems: 'center' },
  cardFooterCol: { alignItems: 'center' },
  cardFooterDivider: { width: 0, opacity: 0 },
  cardFooterLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  cardFooterDot: { width: 4, height: 4, borderRadius: 2, marginRight: 5 },
  cardFooterLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, fontFamily: fontRounded, fontWeight: '600' },
  cardFooterValue: { color: '#ffffff', fontSize: 15, fontWeight: '700', fontFamily: fontDisplay },

  // Sections
  section: { paddingHorizontal: 20, marginTop: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#212529', marginBottom: 14, fontFamily: fontDisplay },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  seeAllText: { fontSize: 13, fontWeight: '600', color: '#212529', fontFamily: fontRounded },
  showLessBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  showLessText: { fontSize: 12, fontWeight: '600', fontFamily: fontRounded },

  // Chart
  chartCard: { backgroundColor: '#ffffff', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  chartTitle: { fontSize: 14, fontWeight: '700', color: '#0f172a', fontFamily: fontDisplay },
  chartDropdown: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  chartDropdownText: { fontSize: 12, color: '#475569', fontFamily: fontText },
  chartWrapper: { alignItems: 'center', paddingVertical: 20 },
  legendContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 20, paddingHorizontal: 10, rowGap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  legendText: { fontSize: 11, color: '#64748b', fontFamily: fontText },
  legendDivider: { width: 1, height: 10, backgroundColor: '#e2e8f0', marginHorizontal: 8 },

  // Alerts
  alertCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
  alertOver: { },
  alertWarn: { },
  alertIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  alertTitle: { fontWeight: '700', fontSize: 14, marginBottom: 2, fontFamily: fontText },
  alertBody: { fontSize: 12, color: '#687280', fontFamily: fontText },

  // Transactions
  txRow: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  txIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txName: { fontSize: 15, fontWeight: '600', color: '#212529', fontFamily: fontText },
  txNote: { fontSize: 12, color: '#9aa2ad', marginTop: 2, fontFamily: fontText },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: fontText },
  txDate: { fontSize: 11, color: '#9aa2ad', marginTop: 2, fontFamily: fontText },
  emptyText: { color: '#9aa2ad', textAlign: 'center', paddingVertical: 20, fontFamily: fontText },

  // Compact Budgets
  budgetListCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  budgetRow: { paddingVertical: 12 },
  budgetRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetRowLeft: { flexDirection: 'row', alignItems: 'center' },
  budgetName: { fontSize: 14, fontWeight: '600', fontFamily: fontText },
  inlineAlertText: { fontSize: 10, fontWeight: '700', marginTop: 1, fontFamily: fontRounded, textTransform: 'uppercase' },
  budgetRemain: { fontSize: 12, fontFamily: fontText },
  miniProgressTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  miniProgressFill: { height: '100%', borderRadius: 2 },
  rowDivider: { height: 1, opacity: 0.3 },

  // Challenges
  sectionSmall: { paddingHorizontal: 20, marginTop: 22 },
  challengeProgressCard: { borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2 },
  challengeRow: { paddingVertical: 10 },
  challengeRowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  challengeName: { fontSize: 13, fontWeight: '700', fontFamily: fontDisplay },
  challengePct: { fontSize: 12, fontWeight: '800', fontFamily: fontRounded },
  challengeProgressText: { fontSize: 11, color: '#9aa2ad', marginTop: 8, fontFamily: fontText },

  // AI Teaser
  aiTeaser: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginTop: 22, padding: 16, borderRadius: 20, borderWidth: 1, gap: 14 },
  aiTeaserIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  aiTeaserTitle: { fontSize: 15, fontWeight: '700', fontFamily: fontDisplay, marginBottom: 2 },
  aiTeaserDesc: { fontSize: 12, lineHeight: 17, fontFamily: fontText },
});
