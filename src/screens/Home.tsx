import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { PieChart } from 'react-native-gifted-charts';
import { Eye, EyeOff } from 'lucide-react-native';

import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getDashboardSummary, getTransactions } from '../features/transactions/transactionService';
import { getBudgetConsumption } from '../features/budgets/budgetService';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { seedDefaultCategories } from '../features/categories/categoryService';
import { formatAmount } from '../utils/formatters';

export default function HomeScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  
  const [summary, setSummary] = useState({ balance: 0, income: 0, expense: 0, categoryData: [] });
  const [recentTx, setRecentTx] = useState<any[]>([]);
  const [budgetAlerts, setBudgetAlerts] = useState<any[]>([]);
  const [balanceHidden, setBalanceHidden] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadData();
      }
    }, [user?.id])
  );

  const loadData = async () => {
    if (!user?.id) return;
    // Ensure all default categories exist (backfills new ones)
    await seedDefaultCategories(user.id);
    const [dashSummary, recent, consumption] = await Promise.all([
      getDashboardSummary(user.id),
      getTransactions(user.id, { limit: 3 }),
      getBudgetConsumption(user.id)
    ]);
    setSummary(dashSummary as any);
    setRecentTx(recent);
    
    // Sort logic: Get the budgets closest to or above 100% capacity
    const criticalBudgets = consumption
       .filter(b => b.percentageUsed >= 80)
       .sort((a, b) => b.percentageUsed - a.percentageUsed)
       .slice(0, 2);
       
    setBudgetAlerts(criticalBudgets);
  };

  const hasChartData = summary.categoryData && summary.categoryData.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Greeting */}
        <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
          <View>
            <Text className="text-zinc-400 dark:text-zinc-500 text-sm font-medium">Welcome back</Text>
            <Text className="text-zinc-900 dark:text-zinc-50 text-lg font-bold" numberOfLines={1}>
              {user?.email?.split('@')[0] || 'User'} 👋
            </Text>
          </View>
        </View>

        {/* Wallet Card */}
        <View className="mx-6 mt-4 rounded-3xl overflow-hidden shadow-lg" style={{ backgroundColor: '#600aff' }}>
          {/* Decorative circles */}
          <View style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.08)' }} />
          <View style={{ position: 'absolute', top: 60, left: -30, width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.06)' }} />
          
          <View className="p-6">
            {/* Card header */}
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center">
                <Text className="text-white/70 text-sm font-semibold uppercase tracking-wider">
                  Your Balance
                </Text>
                <TouchableOpacity
                  onPress={() => setBalanceHidden(!balanceHidden)}
                  className="ml-2 p-1"
                  accessibilityRole="button"
                  accessibilityLabel={balanceHidden ? 'Show balance' : 'Hide balance'}
                >
                  {balanceHidden ? (
                    <EyeOff size={16} color="rgba(255,255,255,0.5)" />
                  ) : (
                    <Eye size={16} color="rgba(255,255,255,0.5)" />
                  )}
                </TouchableOpacity>
              </View>
              <View className="bg-white/20 px-3 py-1.5 rounded-full">
                <Text className="text-white text-xs font-bold">SpendWise</Text>
              </View>
            </View>

            {/* Balance amount */}
            <Text className="text-white text-4xl font-extrabold tracking-tight mt-1 mb-3">
              {balanceHidden ? '••••••' : `${currency} ${formatAmount(summary.balance)}`}
            </Text>

            {/* Weekly change indicator */}
            <View className="flex-row items-center">
              <View className="bg-white/20 px-3 py-1 rounded-full flex-row items-center">
                <Text className="text-white text-sm font-semibold">
                  {balanceHidden ? '••••' : `${summary.income >= summary.expense ? '▲' : '▼'} ${currency} ${formatAmount(Math.abs(summary.income - summary.expense))}`}
                </Text>
                <Text className="text-white/70 text-xs ml-1.5">this period</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Income / Expense Cards */}
        <View className="flex-row px-6 mt-4 gap-3">
          {/* Income Card */}
          <View className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 items-center justify-center mr-2">
                <Text className="text-sm">📈</Text>
              </View>
              <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Income</Text>
            </View>
            <Text className="text-emerald-500 font-bold text-xl">
              {balanceHidden ? '••••' : `${currency} ${formatAmount(summary.income)}`}
            </Text>
          </View>

          {/* Expense Card */}
          <View className="flex-1 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-800">
            <View className="flex-row items-center mb-2">
              <View className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mr-2">
                <Text className="text-sm">📉</Text>
              </View>
              <Text className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Expense</Text>
            </View>
            <Text className="text-red-500 font-bold text-xl">
              {balanceHidden ? '••••' : `${currency} ${formatAmount(summary.expense)}`}
            </Text>
          </View>
        </View>

        {/* Chart Section */}
        <View className="px-6 mt-8">
          <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">Expenses by Category</Text>
          <View className="bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-sm items-center">
            {hasChartData ? (
              <PieChart
                donut
                innerRadius={60}
                radius={110}
                data={summary.categoryData}
                centerLabelComponent={() => {
                  return (
                    <View className="items-center justify-center">
                      <Text className="text-zinc-500 dark:text-zinc-400 text-sm">Total</Text>
                      <Text className="text-zinc-900 dark:text-white font-bold text-lg">
                        {currency} {formatAmount(summary.expense, 0)}
                      </Text>
                    </View>
                  );
                }}
              />
            ) : (
              <View className="h-40 items-center justify-center">
                <Text className="text-zinc-400 dark:text-zinc-500">No expenses yet</Text>
              </View>
            )}
            
            {hasChartData && (
              <View className="flex-row flex-wrap justify-center mt-6 gap-4">
                {summary.categoryData.map((cat: any, i) => (
                  <View key={i} className="flex-row items-center">
                    <View style={{ backgroundColor: cat.color }} className="w-3 h-3 rounded-full mr-2" />
                    <Text className="text-zinc-600 dark:text-zinc-400 text-sm font-medium">{cat.label}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Budget Alerts Section (if any budgets are near/over limit) */}
      {budgetAlerts.length > 0 && (
        <View className="px-6 mb-8 mt-2">
          <Text className="text-zinc-900 dark:text-zinc-50 font-bold mb-4 text-lg">Budget Alerts</Text>
          {budgetAlerts.map(budget => {
            const pUsed = budget.percentageUsed;
            const isOver = pUsed >= 100;
            return (
              <View 
                key={budget.id} 
                accessibilityRole="alert"
                accessibilityLabel={`${isOver ? 'Budget Exceeded' : 'Nearing Limit'} for ${budget.categoryId}. Uses ${budget.amount} budget for category is at ${Math.min(pUsed, 100).toFixed(0)} percent`}
                className={`p-4 rounded-xl mb-3 flex-row items-center border ${isOver ? 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-900/50' : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900/50'}`}>
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${isOver ? 'bg-rose-100 dark:bg-rose-900/50' : 'bg-amber-100 dark:bg-amber-900/50'}`}>
                   {/* We don't have AlertTriangle imported, so just use text for now */}
                   <Text className={`font-bold text-lg ${isOver ? 'text-rose-600' : 'text-amber-600'}`}>!</Text>
                </View>
                <View className="flex-1">
                   <Text className={`font-semibold text-base ${isOver ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400'}`}>
                     {isOver ? 'Budget Exceeded' : 'Nearing Limit'}
                   </Text>
                   <Text className={`text-xs mt-0.5 ${isOver ? 'text-rose-600 dark:text-rose-300' : 'text-amber-600 dark:text-amber-300'}`}>
                     {budget.amount} budget for category is at {Math.min(pUsed, 100).toFixed(0)}%
                   </Text>
                </View>
              </View>
            )
          })}
        </View>
      )}

      {/* Recent Transactions */}
        <View className="px-6 mt-8 mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Recent Transactions</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Transactions')} accessibilityRole="button" accessibilityLabel="See all transactions">
              <Text className="text-violet-500 font-semibold">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="space-y-3">
            {recentTx.length === 0 ? (
              <Text className="text-zinc-400 text-center py-4">No recent transactions</Text>
            ) : (
              recentTx.map(tx => (
                <View key={tx.id} className="bg-white dark:bg-zinc-900 p-4 rounded-2xl flex-row items-center shadow-sm mb-4">
                  <View style={{ backgroundColor: (tx.category?.color || '#94a3b8') + '20' }} className="w-14 h-14 rounded-2xl items-center justify-center mr-4">
                    <Text className="text-2xl">{getCategoryEmoji(tx.category?.name)}</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-zinc-900 dark:text-zinc-50 font-semibold text-base">{tx.category?.name || 'Unknown'}</Text>
                    {tx.note && <Text className="text-zinc-400 text-sm mt-1" numberOfLines={1}>{tx.note}</Text>}
                  </View>
                  <View className="items-end">
                    <Text className={`font-bold text-base ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{currency} {formatAmount(tx.amount)}
                    </Text>
                    <Text className="text-zinc-400 text-xs mt-1">
                      {new Date(tx.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
