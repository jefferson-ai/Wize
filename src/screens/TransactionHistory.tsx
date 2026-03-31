import React, { useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Filter } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getTransactions } from '../features/transactions/transactionService';
import { getCategories } from '../features/categories/categoryService';
import { useFocusEffect } from '@react-navigation/native';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { formatAmount } from '../utils/formatters';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function TransactionHistoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Filtering states
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'income' | 'expense' | null>(null);
  const [filterCategoryId, setFilterCategoryId] = useState<string | null>(null);

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

    if (categories.length === 0) {
      setCategories(fetchedCats);
    }
    setLoading(false);
  };

  // Get available months from transactions (sorted most recent first)
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

    // Auto-select the most recent month if none selected
    if (!selectedMonth && sorted.length > 0) {
      setSelectedMonth(sorted[0].key);
    }

    return sorted;
  }, [transactions]);

  // Filter transactions by selected month
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

  // Month totals
  const monthTotals = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income')
      .reduce((s, t) => s + t.amount, 0);
    const expense = filteredTransactions
      .filter(t => t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  }, [filteredTransactions]);

  const selectedMonthData = availableMonths.find(m => m.key === selectedMonth);

  const clearFilters = () => {
    setFilterType(null);
    setFilterCategoryId(null);
    setShowFilters(false);
  };

  const activeFilterCount = (filterType ? 1 : 0) + (filterCategoryId ? 1 : 0);

  const renderTransaction = ({ item }: { item: any }) => (
    <View
      className="bg-white dark:bg-zinc-900 p-4 rounded-2xl flex-row items-center mb-3 shadow-sm mx-4"
      accessibilityRole="text"
      accessibilityLabel={`Transaction for ${item.category?.name || 'Unknown'}, amount ${formatAmount(item.amount)} ${currency}, type ${item.type}`}
    >
      <View style={{ backgroundColor: (item.category?.color || '#94a3b8') + '20' }} className="w-14 h-14 rounded-2xl items-center justify-center mr-4">
        <Text className="text-2xl">{getCategoryEmoji(item.category?.name)}</Text>
      </View>
      <View className="flex-1">
        <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">{item.category?.name || 'Unknown'}</Text>
        {item.note && <Text className="text-zinc-400 text-sm mt-1" numberOfLines={1}>{item.note}</Text>}
      </View>
      <View className="items-end">
        <Text className={`font-bold text-base ${item.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
          {item.type === 'income' ? '+' : '-'}{currency} {formatAmount(item.amount)}
        </Text>
        <Text className="text-zinc-400 text-xs mt-1">
          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-4 bg-white dark:bg-zinc-950">
        {navigation.canGoBack() && navigation.getState()?.type !== 'tab' ? (
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2" accessibilityRole="button" accessibilityLabel="Go back">
            <ArrowLeft size={24} color="#18181b" className="dark:text-white" />
          </TouchableOpacity>
        ) : (
          <View className="p-2 w-10" />
        )}
        <Text className="text-lg font-bold text-zinc-900 dark:text-zinc-50" accessibilityRole="header">Transactions</Text>
        <TouchableOpacity onPress={() => setShowFilters(!showFilters)} className="p-2 relative" accessibilityRole="button" accessibilityLabel="Toggle Filters">
          <Filter size={24} color={activeFilterCount > 0 ? "#600aff" : "#18181b"} className="dark:text-white" />
          {activeFilterCount > 0 && (
            <View className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-500 items-center justify-center">
              <Text className="text-white text-[10px] font-bold">{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Month Navigation Bar */}
      {availableMonths.length > 0 && (
        <View className="bg-white dark:bg-zinc-950 pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <ScrollView
            ref={monthScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {availableMonths.map((month) => {
              const isActive = selectedMonth === month.key;
              return (
                <TouchableOpacity
                  key={month.key}
                  onPress={() => setSelectedMonth(month.key)}
                  className={`px-4 py-2 mr-2 rounded-full ${
                    isActive
                      ? 'bg-violet-500'
                      : 'bg-zinc-100 dark:bg-zinc-800'
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      isActive
                        ? 'text-white'
                        : 'text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
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
        <View className="flex-row justify-around px-6 py-4 bg-white dark:bg-zinc-900 mx-4 mt-4 rounded-2xl shadow-sm">
          <View className="items-center">
            <Text className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Income</Text>
            <Text className="text-base font-bold text-emerald-500">
              +{currency} {formatAmount(monthTotals.income)}
            </Text>
          </View>
          <View className="w-px bg-zinc-200 dark:bg-zinc-700" />
          <View className="items-center">
            <Text className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Expense</Text>
            <Text className="text-base font-bold text-red-500">
              -{currency} {formatAmount(monthTotals.expense)}
            </Text>
          </View>
          <View className="w-px bg-zinc-200 dark:bg-zinc-700" />
          <View className="items-center">
            <Text className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Net</Text>
            <Text className={`text-base font-bold ${monthTotals.income - monthTotals.expense >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {currency} {formatAmount(monthTotals.income - monthTotals.expense)}
            </Text>
          </View>
        </View>
      )}

      {/* Filter Panel (Expandable) */}
      {showFilters && (
        <View className="bg-white dark:bg-zinc-900 p-4 mx-4 mt-3 rounded-2xl shadow-sm">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="font-bold text-zinc-900 dark:text-zinc-50">Filters</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={clearFilters}>
                <Text className="text-violet-500 font-medium text-sm">Clear All</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Type</Text>
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'expense' ? null : 'expense')}
              className={`px-4 py-2 rounded-full border ${filterType === 'expense' ? 'bg-zinc-900 border-zinc-900 dark:bg-violet-500 dark:border-violet-500' : 'bg-transparent border-zinc-300 dark:border-zinc-700'}`}
            >
              <Text className={filterType === 'expense' ? 'text-white font-medium' : 'text-zinc-700 dark:text-zinc-400 font-medium'}>Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilterType(filterType === 'income' ? null : 'income')}
              className={`px-4 py-2 rounded-full border ${filterType === 'income' ? 'bg-zinc-900 border-zinc-900 dark:bg-violet-500 dark:border-violet-500' : 'bg-transparent border-zinc-300 dark:border-zinc-700'}`}
            >
              <Text className={filterType === 'income' ? 'text-white font-medium' : 'text-zinc-700 dark:text-zinc-400 font-medium'}>Income</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Category</Text>
          <View className="flex-row flex-wrap gap-2">
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setFilterCategoryId(filterCategoryId === cat.id ? null : cat.id)}
                className={`px-3 py-1.5 rounded-full border ${filterCategoryId === cat.id ? 'bg-violet-50 dark:bg-violet-900/30 border-violet-500' : 'bg-transparent border-zinc-200 dark:border-zinc-800'}`}
              >
                <Text className={filterCategoryId === cat.id ? 'text-violet-700 dark:text-violet-400 font-medium' : 'text-zinc-600 dark:text-zinc-400'}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Transaction List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#600aff" />
        </View>
      ) : (
        <FlatList
          data={filteredTransactions}
          keyExtractor={item => item.id}
          renderItem={renderTransaction}
          contentContainerStyle={{ paddingTop: 16, paddingBottom: 100 }}
          ListEmptyComponent={() => (
            <View className="items-center justify-center py-20">
              <Text className="text-zinc-400 text-lg">No transactions found</Text>
              {activeFilterCount > 0 && (
                <TouchableOpacity onPress={clearFilters} className="mt-4">
                  <Text className="text-violet-500 font-medium">Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
