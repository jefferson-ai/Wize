import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Plus } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getBudgetConsumption } from '../features/budgets/budgetService';
import { getCategories } from '../features/categories/categoryService';
import { useFocusEffect } from '@react-navigation/native';
import { formatAmount } from '../utils/formatters';

export default function InsightsScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();

  const [budgets, setBudgets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        fetchData();
      }
    }, [user?.id])
  );

  const fetchData = async () => {
    if (!user?.id) return;
    const [consumption, fetchedCats] = await Promise.all([
      getBudgetConsumption(user.id),
      getCategories(user.id)
    ]);

    // Map categories to budgets for easy rendering
    const enrichedBudgets = consumption.map(b => ({
      ...b,
      category: fetchedCats.find(c => c.id === b.categoryId)
    }));

    setBudgets(enrichedBudgets);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const renderBudgetCard = (budget: any) => {
    const pUsed = budget.percentageUsed;
    let progressColor = pUsed >= 100 ? 'bg-rose-500' : pUsed >= 80 ? 'bg-amber-400' : 'bg-violet-500';
    let textColor = pUsed >= 100 ? 'text-rose-500' : pUsed >= 80 ? 'text-amber-500' : 'text-violet-500';

    return (
      <View key={budget.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-5 mb-4 shadow-sm border border-zinc-100 dark:border-zinc-800">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center">
            <View style={{ backgroundColor: budget.category?.color || '#94a3b8' }} className="w-10 h-10 rounded-full items-center justify-center mr-3">
              <Text className="text-white font-bold">{budget.category?.name?.charAt(0) || '?'}</Text>
            </View>
            <Text className="text-zinc-900 dark:text-zinc-50 font-bold text-lg">{budget.category?.name || 'Category'}</Text>
          </View>
          <Text className="text-zinc-500 dark:text-zinc-400 text-sm">{budget.period === 'monthly' ? 'Monthly' : 'Weekly'}</Text>
        </View>

        <View className="flex-row justify-between items-end mb-2">
          <View>
            <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-1">Spent</Text>
            <Text className="text-zinc-900 dark:text-white font-bold text-xl">
              {currency} {formatAmount(budget.spent)}
            </Text>
          </View>
          <View className="items-end">
            <Text className="text-zinc-500 dark:text-zinc-400 text-sm mb-1">Budget</Text>
            <Text className="text-zinc-900 dark:text-white font-semibold">
              {currency} {formatAmount(budget.amount)}
            </Text>
          </View>
        </View>

        {/* Progress Bar Container */}
        <View className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full w-full overflow-hidden mt-2">
          <View
            style={{ width: `${Math.min(pUsed, 100)}%` }}
            className={`h-full rounded-full ${progressColor}`}
          />
        </View>
        <View className="flex-row justify-between mt-2">
          <Text className="text-zinc-400 text-xs">
            {formatAmount(Math.min(pUsed, 100), 0)}% used
          </Text>
          {pUsed >= 100 ? (
            <Text className={`text-xs font-bold ${textColor}`}>Over budget!</Text>
          ) : pUsed >= 80 ? (
            <Text className={`text-xs font-bold ${textColor}`}>Approaching limit</Text>
          ) : (
            <Text className="text-zinc-400 text-xs">{currency} {formatAmount(budget.remaining)} left</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4 flex-row justify-between items-center bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
        <Text className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight" accessibilityRole="header">Budgets</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('AddBudget')}
          accessibilityRole="button"
          accessibilityLabel="Add new budget"
          className="bg-violet-500 w-10 h-10 rounded-full items-center justify-center shadow-sm"
        >
          <Plus size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4 pt-6"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#600aff" />}
      >
        {budgets.length === 0 ? (
          <View className="items-center justify-center py-20 px-8">
            <View className="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-full items-center justify-center mb-6">
              <Plus size={32} color="#600aff" opacity={0.8} />
            </View>
            <Text className="text-zinc-900 dark:text-zinc-50 text-xl font-bold mb-2 text-center">No budgets set yet</Text>
            <Text className="text-zinc-500 text-center mb-8">
              Create a budget to monitor your spending and avoid going over your limits.
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AddBudget')}
              className="bg-violet-500 px-6 py-3 rounded-full shadow-sm shadow-violet-500/30"
            >
              <Text className="text-white font-bold text-base">Create First Budget</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="pb-24">
            <Text className="text-zinc-900 dark:text-zinc-50 font-bold mb-4 text-lg ml-2">Active Targets</Text>
            {budgets.map(renderBudgetCard)}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
