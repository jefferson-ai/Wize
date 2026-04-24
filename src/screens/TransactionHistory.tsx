import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, SectionList, ActivityIndicator, ScrollView, StyleSheet, Animated, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Funnel, Plus, Trash } from 'phosphor-react-native';
import { Swipeable, RectButton, TouchableOpacity as GHTouchableOpacity } from 'react-native-gesture-handler';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getTransactions, getLoggingStreak, deleteTransaction } from '../features/transactions/transactionService';
import { getCategories } from '../features/categories/categoryService';
import { getAccounts } from '../features/accounts/accountService';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import CategoryIcon from '../components/CategoryIcon';
import { formatAmount } from '../utils/formatters';
import RadarChart from '../components/RadarChart';
import { useThemeColors } from '../hooks/useThemeColors';
import { HeaderRegistrar } from '../components/AnimatedHeader';
import { useTabHeaderInset } from '../navigation/tabHeaderInset';
import StreakBadges, { getStreakColor } from '../components/StreakBadges';
import Confetti, { ConfettiRef } from '../components/Confetti';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const AnimatedMonthText = ({ month, isActive, onPress, onLayout, colors }: any) => {
  const progress = useSharedValue(isActive ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isActive ? 1 : 0, { duration: 250 });
  }, [isActive]);

  const textColorStyle = useAnimatedStyle(() => {
    return {
      color: interpolateColor(
        progress.value,
        [0, 1],
        [colors.textMuted, colors.background]
      )
    };
  });

  return (
    <TouchableOpacity onPress={onPress} onLayout={onLayout} activeOpacity={0.8} style={[styles.monthPill, { backgroundColor: 'transparent', zIndex: 1 }]}>
      <Reanimated.Text style={[styles.monthPillText, textColorStyle]}>
        {month.label}
      </Reanimated.Text>
    </TouchableOpacity>
  );
};

export default function TransactionHistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();
  const headerInset = useTabHeaderInset();
  const isFocused = useIsFocused();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [activeMonth, setActiveMonth] = useState<string | null>(null);


  const [showFilters, setShowFilters] = useState(false);


  const [filterType, setFilterType] = useState<'income' | 'expense' | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  const [filterAccountId, setFilterAccountId] = useState<string | null>(null);
  
  const [radarType, setRadarType] = useState<'expense' | 'income'>('expense');

  const [streak, setStreak] = useState(0);
  const [streakModalVisible, setStreakModalVisible] = useState(false);
  const confettiRef = useRef<ConfettiRef>(null);
  const prevStreak = useRef<number | null>(null);

  const monthScrollRef = useRef<ScrollView>(null);
  const switchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sliding Indicator Refs
  const pillTranslateX = useSharedValue(0);
  const pillTranslateY = useSharedValue(0);
  const pillWidth = useSharedValue(0);
  const pillHeight = useSharedValue(0);
  const layouts = useRef<Record<string, { x: number, y: number, width: number, height: number }>>({}).current;
  const [layoutTrigger, setLayoutTrigger] = useState(0);

  useEffect(() => {
    if (activeMonth && layouts[activeMonth]) {
      const target = layouts[activeMonth];
      const timingConfig = { duration: 250 };
      pillTranslateX.value = withTiming(target.x, timingConfig);
      pillTranslateY.value = withTiming(target.y, timingConfig);
      pillWidth.value = withTiming(target.width, timingConfig);
      pillHeight.value = withTiming(target.height, timingConfig);
    }
  }, [activeMonth, layoutTrigger]);

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: pillTranslateX.value },
        { translateY: pillTranslateY.value }
      ],
      width: pillWidth.value,
      height: pillHeight.value,
    };
  });

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchData();
      }
    }, [user?.id])
  );

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [filterType, filterCategoryId, filterAccountId]);

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [fetchedTx, fetchedCats, fetchedAccs, userStreak] = await Promise.all([
      getTransactions(user.id, {
        type: filterType || undefined,
        categoryId: filterCategoryId || undefined,
        accountId: filterAccountId || undefined,
      }),
      getCategories(user.id),
      getAccounts(user.id),
      getLoggingStreak(user.id)
    ]);
    setTransactions(fetchedTx);
    setStreak(userStreak);
    if (categories.length === 0) setCategories(fetchedCats);
    if (accounts.length === 0) setAccounts(fetchedAccs);
    
    // Sync selected month with new results
    if (fetchedTx.length > 0) {
      const d = new Date(fetchedTx[0].date);
      const latestKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      // Only force update if current month is gone or if explicitly filtering anew
      setSelectedMonth(latestKey);
      setActiveMonth(latestKey);
    } else {
      setSelectedMonth(null);
      setActiveMonth(null);
    }
    
    setLoading(false);
  };

  const availableMonths = useMemo(() => {
    const monthSet = new Map<string, { key: string; label: string; fullLabel: string }>();
    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthSet.has(key)) {
        monthSet.set(key, {
          key,
          label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
          fullLabel: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        });
      }
    });
    return Array.from(monthSet.values()).sort((a, b) => b.key.localeCompare(a.key));
  }, [transactions]);


  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        if (key !== selectedMonth) return false;
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth]);

  const groupedTransactions = useMemo(() => {
    const groups: { title: string, data: any[] }[] = [];
    let currentGroup: { title: string, data: any[] } | null = null;
    
    filteredTransactions.forEach(tx => {
      const d = new Date(tx.date);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
      const isYesterday = d.getDate() === yesterday.getDate() && d.getMonth() === yesterday.getMonth() && d.getFullYear() === yesterday.getFullYear();
      
      let title = '';
      if (isToday) title = 'Today';
      else if (isYesterday) title = 'Yesterday';
      else title = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

      if (!currentGroup || currentGroup.title !== title) {
        if (currentGroup) groups.push(currentGroup);
        currentGroup = { title, data: [] };
      }
      currentGroup.data.push(tx);
    });
    if (currentGroup) groups.push(currentGroup);
    return groups;
  }, [filteredTransactions]);

  const monthTotals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [filteredTransactions]);

  const selectedMonthData = availableMonths.find(m => m.key === selectedMonth);
  const clearFilters = () => { setFilterType(null); setFilterCategoryId(null); setFilterAccountId(null); setShowFilters(false); };
  const activeFilterCount = (filterType ? 1 : 0) + (filterCategoryId ? 1 : 0) + (filterAccountId ? 1 : 0);

  // Radar chart: compare selected month vs previous month
  const radarData = useMemo(() => {
    if (!selectedMonth || transactions.length === 0) return [];
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    const currentTotals: Record<string, number> = {};
    const prevTotals: Record<string, number> = {};

    transactions.forEach(tx => {
      if (tx.type !== radarType) return;
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const catName = tx.category?.name || 'Other';
      if (key === selectedMonth) currentTotals[catName] = (currentTotals[catName] || 0) + tx.amount;
      else if (key === prevKey) prevTotals[catName] = (prevTotals[catName] || 0) + tx.amount;
    });

    const allCats = new Set([...Object.keys(currentTotals), ...Object.keys(prevTotals)]);
    let result = Array.from(allCats)
      .map(cat => ({ label: cat, current: currentTotals[cat] || 0, previous: prevTotals[cat] || 0 }))
      .sort((a, b) => (b.current + b.previous) - (a.current + a.previous))
      .slice(0, 6);
      
    // Pad to 3 items so the polygon can draw
    if (result.length > 0 && result.length < 3) {
      const padding = 3 - result.length;
      for (let i = 0; i < padding; i++) {
        result.push({ label: ' '.repeat(i + 1), current: 0, previous: 0 });
      }
    }
    
    return result;
  }, [transactions, selectedMonth, radarType]);

  const comparisonData = useMemo(() => {
    if (!selectedMonth || transactions.length === 0) return null;
    const [year, month] = selectedMonth.split('-').map(Number);
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;
    const prevKey = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    const prevDate = new Date(prevYear, prevMonth - 1, 1);
    const prevMonthName = prevDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

    let currentExp = 0, prevExp = 0;
    transactions.forEach(tx => {
      if (tx.type !== radarType) return;
      const d = new Date(tx.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key === selectedMonth) currentExp += tx.amount;
      else if (key === prevKey) prevExp += tx.amount;
    });

    const change = prevExp > 0 ? ((currentExp - prevExp) / prevExp * 100) : 0;
    return { currentExp, prevExp, change, prevMonthName };
  }, [transactions, selectedMonth, radarType]);

  const showRadar = comparisonData !== null && filterType === null;

  const handleDelete = (id: string) => {
    Alert.alert('Delete Transaction', 'Are you sure you want to delete this transaction?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          if (!user?.id) return;
          try {
            await deleteTransaction(id, user.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            fetchData();
          } catch (e) {
            Alert.alert('Error', 'Failed to delete transaction');
          }
      }}
    ]);
  };

  const renderRightActions = (id: string, progress: any, dragX: any) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <GHTouchableOpacity
        activeOpacity={0.6}
        onPress={() => handleDelete(id)}
        style={[styles.deleteAction, { backgroundColor: colors.dangerBg }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash size={22} color={colors.danger} />
        </Animated.View>
      </GHTouchableOpacity>
    );
  };

  const renderTransaction = ({ item }: { item: any }) => (
    <Swipeable
      key={item.id}
      renderRightActions={(progress, dragX) => renderRightActions(item.id, progress, dragX)}
      friction={1.5}
      rightThreshold={40}
    >
      <RectButton
        style={[styles.txRow, { backgroundColor: colors.card }]}
        onPress={() => navigation.navigate('EditTransaction', { transaction: item })}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${item.category?.name || 'Unknown'} transaction`}
      >
        <View style={[styles.txIcon, { backgroundColor: (item.category?.color || '#94a3b8') + '22' }]}>
          <CategoryIcon categoryName={item.category?.name} size={20} color={item.category?.color || '#94a3b8'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.txName, { color: colors.text }]}>{item.category?.name || 'Unknown'}</Text>
          {item.note && <Text style={[styles.txNote, { color: colors.textMuted }]} numberOfLines={1}>{item.note}</Text>}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.txAmount, { color: item.type === 'income' ? colors.success : colors.danger }]}>
            {item.type === 'income' ? '+' : '-'}{currency} {formatAmount(item.amount)}
          </Text>
          <Text style={[styles.txDate, { color: colors.textMuted }]}>
            {new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>
      </RectButton>
    </Swipeable>
  );

  return (
    <View style={[styles.screen, { flex: 1, backgroundColor: 'transparent' }]}>
      <HeaderRegistrar 
        title="Transactions" 
        index={1}
        rightElement={
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            accessibilityRole="button"
            accessibilityLabel="Toggle Filters"
            style={[styles.addBtn, { backgroundColor: colors.text, shadowColor: colors.text }]}
          >
            <Funnel size={20} color={colors.background} weight="bold" />
            {activeFilterCount > 0 && (
              <View style={[styles.filterBadge, { backgroundColor: colors.background, borderColor: colors.text, borderWidth: 1 }]}>
                <Text style={[styles.filterBadgeText, { color: colors.text }]}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <View style={{ height: headerInset }} collapsable={false} />
      <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Month Navigation */}
      {availableMonths.length > 0 && (
        <View style={[styles.monthBar, { backgroundColor: colors.background }]}>
          <ScrollView ref={monthScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {/* Gliding Indicator */}
            <Reanimated.View
              style={[
                {
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  backgroundColor: colors.text,
                  borderRadius: 20,
                  zIndex: 0,
                },
                indicatorStyle
              ]}
            />

            {availableMonths.map((month) => {
              const isActive = activeMonth === month.key;
              return (
                <AnimatedMonthText
                  key={month.key}
                  month={month}
                  isActive={isActive}
                  colors={colors}
                  onLayout={(e: any) => {
                    const { x, y, width, height } = e.nativeEvent.layout;
                    layouts[month.key] = { x, y, width, height };
                    if (month.key === activeMonth) {
                      setLayoutTrigger(prev => prev + 1);
                    }
                  }}
                  onPress={() => {
                    if (activeMonth === month.key) return;
                    setActiveMonth(month.key);
                    
                    if (switchTimeoutRef.current) {
                      clearTimeout(switchTimeoutRef.current);
                    }
                    switchTimeoutRef.current = setTimeout(() => {
                      setSelectedMonth(month.key);
                    }, 250);
                  }}
                />
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Month Summary */}
      {selectedMonthData && !loading && filteredTransactions.length > 0 && (
        <View style={[styles.summaryRow, { backgroundColor: colors.card }]}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Income</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>+{currency} {formatAmount(monthTotals.income)}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.background }]} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Expense</Text>
            <Text style={[styles.summaryValue, { color: colors.danger }]}>-{currency} {formatAmount(monthTotals.expense)}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.background }]} />
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Net</Text>
            <Text style={[styles.summaryValue, { color: monthTotals.income - monthTotals.expense >= 0 ? colors.success : colors.danger }]}>
              {currency} {formatAmount(monthTotals.income - monthTotals.expense)}
            </Text>
          </View>
        </View>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <View style={[styles.filterPanel, { backgroundColor: colors.card }]}>
          <View style={styles.filterHeader}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text style={[styles.clearText, { color: colors.text }]}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>Type</Text>
          <View style={styles.filterTypeRow}>
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'expense' ? null : 'expense')}
              style={[styles.filterChip, { backgroundColor: colors.background, borderColor: colors.border }, filterType === 'expense' && { backgroundColor: colors.text, borderColor: colors.text }]}
            >
              <Text style={[styles.filterChipText, { color: colors.textMuted }, filterType === 'expense' && { color: colors.background }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'income' ? null : 'income')}
              style={[styles.filterChip, { backgroundColor: colors.background, borderColor: colors.border }, filterType === 'income' && { backgroundColor: colors.text, borderColor: colors.text }]}
            >
              <Text style={[styles.filterChipText, { color: colors.textMuted }, filterType === 'income' && { color: colors.background }]}>Income</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.filterSectionLabel, { color: colors.textMuted }]}>Category</Text>
          <View style={styles.categoryWrap}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
                style={[styles.catChip, { backgroundColor: colors.background, borderColor: colors.border }, filterCategoryId === cat.id && { borderColor: colors.text }]}
              >
                <Text style={[styles.catChipText, { color: colors.textMuted }, filterCategoryId === cat.id && { color: colors.text, fontWeight: '600' }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.filterSectionLabel, { color: colors.textMuted, marginTop: 14 }]}>Account</Text>
          <View style={styles.categoryWrap}>
            {accounts.map(acc => (
              <TouchableOpacity
                key={acc.id}
                onPress={() => setFilterAccountId(filterAccountId === acc.id ? null : acc.id)}
                style={[styles.catChip, { backgroundColor: colors.background, borderColor: colors.border }, filterAccountId === acc.id && { borderColor: colors.text }]}
              >
                <Text style={[styles.catChipText, { color: colors.textMuted }, filterAccountId === acc.id && { color: colors.text, fontWeight: '600' }]}>{acc.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Transaction List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={colors.text} />
        </View>
      ) : (
        <SectionList
          sections={groupedTransactions}
          keyExtractor={item => item.id}
          renderItem={renderTransaction}
          renderSectionHeader={({ section: { title } }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionHeaderText, { color: colors.text }]}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          initialNumToRender={15}
          maxToRenderPerBatch={15}
          windowSize={10}
          removeClippedSubviews={true}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 }}
          ListHeaderComponent={showRadar ? (
            <View style={[styles.radarCard, { backgroundColor: colors.card }]}>
              {/* Toggle Header */}
              <View style={[styles.radarToggleRow, { backgroundColor: colors.background }]}>
                <TouchableOpacity 
                  style={[styles.radarToggleBtn, radarType === 'expense' && [styles.radarToggleBtnActive, { backgroundColor: colors.text }]]}
                  onPress={() => setRadarType('expense')}
                >
                  <Text style={[styles.radarToggleText, { color: colors.textMuted }, radarType === 'expense' && [styles.radarToggleTextActive, { color: colors.background }]]}>Expenses</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radarToggleBtn, radarType === 'income' && [styles.radarToggleBtnActive, { backgroundColor: colors.text }]]}
                  onPress={() => setRadarType('income')}
                >
                  <Text style={[styles.radarToggleText, { color: colors.textMuted }, radarType === 'income' && [styles.radarToggleTextActive, { color: colors.background }]]}>Income</Text>
                </TouchableOpacity>
              </View>

              {/* Card Header */}
              <View style={styles.radarHeader}>
                <View>
                  <Text style={[styles.radarSubtitle, { color: colors.textMuted }]}>
                    Compared to {currency} {formatAmount(comparisonData!.prevExp)} in {comparisonData!.prevMonthName}
                  </Text>
                </View>
                {comparisonData!.change !== 0 && (
                  <View style={[
                    styles.radarBadge,
                    { backgroundColor: comparisonData!.change > 0 ? (radarType === 'income' ? colors.successBg : colors.dangerBg) : (radarType === 'income' ? colors.dangerBg : colors.successBg) }
                  ]}>
                    <Text style={[
                      styles.radarBadgeText,
                      { color: comparisonData!.change > 0 ? (radarType === 'income' ? colors.success : colors.danger) : (radarType === 'income' ? colors.danger : colors.success) }
                    ]}>
                      {comparisonData!.change > 0 ? '↑' : '↓'}{Math.abs(comparisonData!.change).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>

              {/* Total */}
              <Text style={[styles.radarTotal, { color: colors.text }]}>
                {currency} {formatAmount(comparisonData!.currentExp)}
              </Text>

              {/* Radar Chart */}
              {radarData.length >= 3 ? (
                <RadarChart 
                  data={radarData} 
                  currentColor={radarType === 'income' ? colors.success : '#8b5cf6'}
                  previousColor={radarType === 'income' ? '#86efac' : '#d2b48c'}
                  gridColor={colors.border}
                  labelColor={colors.text}
                  isFocused={isFocused}
                />
              ) : (
                <View style={{ height: 260, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#9aa2ad', fontFamily: fontText }}>No {radarType} data for this period</Text>
                </View>
              )}

              {/* Legend */}
              {radarData.length >= 3 && (
                <View style={styles.radarLegend}>
                  <View style={styles.radarLegendItem}>
                    <View style={[styles.radarLegendDot, { backgroundColor: radarType === 'income' ? colors.success : '#8b5cf6' }]} />
                    <Text style={[styles.radarLegendText, { color: colors.textMuted }]}>This Month</Text>
                  </View>
                  <View style={styles.radarLegendItem}>
                    <View style={[styles.radarLegendDot, { backgroundColor: radarType === 'income' ? '#86efac' : '#d2b48c' }]} />
                    <Text style={[styles.radarLegendText, { color: colors.textMuted }]}>{comparisonData!.prevMonthName}</Text>
                  </View>
                </View>
              )}
            </View>
          ) : null}
          ListEmptyComponent={() => (
            <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80 }}>
              <Text style={{ color: colors.textMuted, fontSize: 16, fontFamily: fontText }}>No transactions found</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={clearFilters} style={{ marginTop: 14 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontFamily: fontText }}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
      </View>
      <StreakBadges 
        streak={streak} 
        isVisible={streakModalVisible} 
        onClose={() => setStreakModalVisible(false)} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  pageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#212529', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '700' },

  monthBar: { backgroundColor: '#f5f6f7', paddingBottom: 10 },
  monthPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8 },
  monthPillText: { fontSize: 13, fontWeight: '600', fontFamily: fontRounded },



  sectionHeader: { paddingVertical: 8, paddingHorizontal: 4, marginTop: 12, marginBottom: 4 },
  sectionHeaderText: { fontSize: 13, fontWeight: '700', fontFamily: fontText, textTransform: 'uppercase', letterSpacing: 0.5 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginBottom: 8, backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  summaryLabel: { fontSize: 11, color: '#9aa2ad', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: fontText },
  summaryValue: { fontSize: 14, fontWeight: '700', fontFamily: fontText },
  summaryDivider: { width: 1, backgroundColor: '#e8eaec' },

  filterPanel: { backgroundColor: '#ffffff', marginHorizontal: 20, marginBottom: 10, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  filterTitle: { fontWeight: '700', color: '#212529', fontSize: 15, fontFamily: fontText },
  clearText: { color: '#212529', fontWeight: '600', fontSize: 13, fontFamily: fontText },
  filterSectionLabel: { fontSize: 11, fontWeight: '700', color: '#9aa2ad', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: fontText },
  filterTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e8eaec' },
  filterChipText: { fontWeight: '600', color: '#687280', fontFamily: fontRounded },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e8eaec' },
  catChipText: { fontSize: 12, color: '#687280', fontFamily: fontText },

  txRow: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  txIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txName: { fontSize: 15, fontWeight: '600', color: '#212529', fontFamily: fontText },
  txNote: { fontSize: 12, color: '#9aa2ad', marginTop: 2, fontFamily: fontText },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: fontText },
  txDate: { fontSize: 11, color: '#9aa2ad', marginTop: 2, fontFamily: fontText },

  radarCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  radarToggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 },
  radarToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  radarToggleBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  radarToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: fontText },
  radarToggleTextActive: { color: '#0f172a' },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  radarSubtitle: { fontSize: 12, color: '#9aa2ad', marginTop: 3, fontFamily: fontText },
  radarBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  radarBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: fontText },
  radarTotal: { fontSize: 34, fontWeight: '700', color: '#212529', letterSpacing: -0.5, marginTop: 6, marginBottom: 8, fontFamily: fontDisplay },
  radarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  radarLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radarLegendDot: { width: 8, height: 8, borderRadius: 4 },
  radarLegendText: { fontSize: 12, color: '#687280', fontFamily: fontText },
  
  streakBadge: { backgroundColor: '#fff3cd', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: '#ffe69c' },
  streakText: { fontSize: 13, fontWeight: '700', color: '#856404', fontFamily: fontRounded },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    maxHeight: 78,
    borderRadius: 18,
    marginBottom: 10,
    marginLeft: 10,
  },
});
