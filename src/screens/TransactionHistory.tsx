import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Filter } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getTransactions } from '../features/transactions/transactionService';
import { getCategories } from '../features/categories/categoryService';
import { useFocusEffect } from '@react-navigation/native';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { formatAmount } from '../utils/formatters';
import RadarChart from '../components/RadarChart';
import { useThemeColors } from '../hooks/useThemeColors';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TransactionHistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'income' | 'expense' | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);
  
  const [radarType, setRadarType] = useState<'expense' | 'income'>('expense');

  const monthScrollRef = useRef<ScrollView>(null);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchData();
      }
    }, [user?.id, filterType, filterCategoryId])
  );

  const fetchData = async () => {
    if (!user?.id) return;
    setLoading(true);
    const [fetchedTx, fetchedCats] = await Promise.all([
      getTransactions(user.id, {
        type: filterType || undefined,
        categoryId: filterCategoryId || undefined,
      }),
      getCategories(user.id)
    ]);
    setTransactions(fetchedTx);
    if (categories.length === 0) setCategories(fetchedCats);
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
    const sorted = Array.from(monthSet.values()).sort((a, b) => b.key.localeCompare(a.key));
    if (!selectedMonth && sorted.length > 0) setSelectedMonth(sorted[0].key);
    return sorted;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    if (!selectedMonth) return transactions;
    return transactions
      .filter((tx) => {
        const d = new Date(tx.date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return key === selectedMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, selectedMonth]);

  const monthTotals = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [filteredTransactions]);

  const selectedMonthData = availableMonths.find(m => m.key === selectedMonth);
  const clearFilters = () => { setFilterType(null); setFilterCategoryId(null); setShowFilters(false); };
  const activeFilterCount = (filterType ? 1 : 0) + (filterCategoryId ? 1 : 0);

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

  const renderTransaction = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.txRow, { backgroundColor: colors.card }]}
      activeOpacity={0.7}
      onPress={() => navigation.getParent()?.navigate('EditTransaction', { transaction: item })}
      accessibilityRole="button"
      accessibilityLabel={`Edit ${item.category?.name || 'Unknown'} transaction`}
    >
      <View style={[styles.txIcon, { backgroundColor: (item.category?.color || '#94a3b8') + '22' }]}>
        <Text style={{ fontSize: 22 }}>{getCategoryEmoji(item.category?.name)}</Text>
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
          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background }]}>
        {navigation.canGoBack() && navigation.getState()?.type !== 'tab' ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn} accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={22} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.headerBtn} />
        )}
        <Text style={[styles.headerTitle, { color: colors.text }]} accessibilityRole="header">Transactions</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} style={[styles.headerBtn, { position: 'relative' }]} accessibilityRole="button" accessibilityLabel="Toggle Filters">
          <Filter size={22} color={activeFilterCount > 0 ? colors.text : colors.textMuted} />
          {activeFilterCount > 0 && (
            <View style={[styles.filterBadge, { backgroundColor: colors.text }]}>
              <Text style={[styles.filterBadgeText, { color: colors.background }]}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Month Navigation */}
      {availableMonths.length > 0 && (
        <View style={[styles.monthBar, { backgroundColor: colors.background }]}>
          <ScrollView ref={monthScrollRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
            {availableMonths.map((month) => {
              const isActive = selectedMonth === month.key;
              return (
                <TouchableOpacity
                  key={month.key}
                  onPress={() => setSelectedMonth(month.key)}
                  style={[styles.monthPill, isActive ? { backgroundColor: colors.text } : { backgroundColor: colors.card }]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthPillText, isActive ? { color: colors.background } : { color: colors.textMuted }]}>
                    {month.label}
                  </Text>
                </TouchableOpacity>
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
              <Text style={[styles.filterChipText, filterType === 'expense' && { color: colors.background }]}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'income' ? null : 'income')}
              style={[styles.filterChip, { backgroundColor: colors.background, borderColor: colors.border }, filterType === 'income' && { backgroundColor: colors.text, borderColor: colors.text }]}
            >
              <Text style={[styles.filterChipText, filterType === 'income' && { color: colors.background }]}>Income</Text>
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
                <Text style={[styles.catChipText, filterCategoryId === cat.id && { color: colors.text, fontWeight: '600' }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Transaction List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#212529" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={item => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 110 }}
          ListHeaderComponent={showRadar ? (
            <View style={[styles.radarCard, { backgroundColor: colors.card }]}>
              {/* Toggle Header */}
              <View style={[styles.radarToggleRow, { backgroundColor: colors.background }]}>
                <TouchableOpacity 
                  style={[styles.radarToggleBtn, radarType === 'expense' && [styles.radarToggleBtnActive, { backgroundColor: colors.text }]]}
                  onPress={() => setRadarType('expense')}
                >
                  <Text style={[styles.radarToggleText, radarType === 'expense' && [styles.radarToggleTextActive, { color: colors.background }]]}>Expenses</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.radarToggleBtn, radarType === 'income' && [styles.radarToggleBtnActive, { backgroundColor: colors.text }]]}
                  onPress={() => setRadarType('income')}
                >
                  <Text style={[styles.radarToggleText, radarType === 'income' && [styles.radarToggleTextActive, { color: colors.background }]]}>Income</Text>
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
                    { backgroundColor: comparisonData!.change > 0 ? (radarType === 'income' ? '#dcfce7' : '#fee2e2') : (radarType === 'income' ? '#fee2e2' : '#dcfce7') }
                  ]}>
                    <Text style={[
                      styles.radarBadgeText,
                      { color: comparisonData!.change > 0 ? (radarType === 'income' ? '#16a34a' : '#dc2626') : (radarType === 'income' ? '#dc2626' : '#16a34a') }
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
                />
              ) : (
                <View style={{ height: 260, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#9aa2ad', fontFamily: 'InstrumentSans_400Regular' }}>No {radarType} data for this period</Text>
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
              <Text style={{ color: colors.textMuted, fontSize: 16, fontFamily: 'InstrumentSans_400Regular' }}>No transactions found</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={clearFilters} style={{ marginTop: 14 }}>
                  <Text style={{ color: colors.text, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' }}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f5f6f7' },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#f5f6f7' },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#212529', fontFamily: 'InstrumentSans_700Bold' },
  filterBadge: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: '#212529', alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

  monthBar: { backgroundColor: '#f5f6f7', paddingBottom: 10 },
  monthPill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, marginRight: 8 },
  monthPillActive: { backgroundColor: '#212529' },
  monthPillInactive: { backgroundColor: '#e8eaec' },
  monthPillText: { fontSize: 13, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },
  monthPillTextActive: { color: '#ffffff' },
  monthPillTextInactive: { color: '#687280' },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-around', marginHorizontal: 20, marginBottom: 8, backgroundColor: '#ffffff', borderRadius: 20, paddingVertical: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  summaryLabel: { fontSize: 11, color: '#9aa2ad', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, fontFamily: 'InstrumentSans_400Regular' },
  summaryValue: { fontSize: 14, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  summaryDivider: { width: 1, backgroundColor: '#e8eaec' },

  filterPanel: { backgroundColor: '#ffffff', marginHorizontal: 20, marginBottom: 10, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  filterTitle: { fontWeight: '700', color: '#212529', fontSize: 15, fontFamily: 'InstrumentSans_700Bold' },
  clearText: { color: '#212529', fontWeight: '600', fontSize: 13, fontFamily: 'InstrumentSans_600SemiBold' },
  filterSectionLabel: { fontSize: 11, fontWeight: '700', color: '#9aa2ad', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: 'InstrumentSans_700Bold' },
  filterTypeRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#e8eaec' },
  filterChipActive: { backgroundColor: '#212529', borderColor: '#212529' },
  filterChipText: { fontWeight: '600', color: '#687280', fontFamily: 'InstrumentSans_600SemiBold' },
  filterChipTextActive: { color: '#ffffff' },
  categoryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e8eaec' },
  catChipActive: { backgroundColor: '#f5f6f7', borderColor: '#212529' },
  catChipText: { fontSize: 12, color: '#687280', fontFamily: 'InstrumentSans_400Regular' },
  catChipTextActive: { color: '#212529', fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },

  txRow: { backgroundColor: '#ffffff', borderRadius: 18, padding: 14, flexDirection: 'row', alignItems: 'center', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
  txIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txName: { fontSize: 15, fontWeight: '600', color: '#212529', fontFamily: 'InstrumentSans_600SemiBold' },
  txNote: { fontSize: 12, color: '#9aa2ad', marginTop: 2, fontFamily: 'InstrumentSans_400Regular' },
  txAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  txDate: { fontSize: 11, color: '#9aa2ad', marginTop: 2, fontFamily: 'InstrumentSans_400Regular' },

  // Radar Comparison Card
  radarCard: { backgroundColor: '#ffffff', borderRadius: 24, padding: 24, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 3 },
  radarToggleRow: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 12, padding: 4, marginBottom: 16 },
  radarToggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  radarToggleBtnActive: { backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  radarToggleText: { fontSize: 13, fontWeight: '600', color: '#64748b', fontFamily: 'InstrumentSans_600SemiBold' },
  radarToggleTextActive: { color: '#0f172a' },
  radarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  radarTitle: { fontSize: 20, fontWeight: '700', color: '#212529', fontFamily: 'InstrumentSans_700Bold' },
  radarSubtitle: { fontSize: 12, color: '#9aa2ad', marginTop: 3, fontFamily: 'InstrumentSans_400Regular' },
  radarBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  radarBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  radarTotal: { fontSize: 34, fontWeight: '700', color: '#212529', letterSpacing: -0.5, marginTop: 6, marginBottom: 8, fontFamily: 'InstrumentSans_700Bold' },
  radarLegend: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginTop: 12 },
  radarLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  radarLegendDot: { width: 8, height: 8, borderRadius: 4 },
  radarLegendText: { fontSize: 12, color: '#687280', fontFamily: 'InstrumentSans_400Regular' },
});
