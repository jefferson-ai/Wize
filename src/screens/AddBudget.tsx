import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { createBudget } from '../features/budgets/budgetService';
import { getCategories } from '../features/categories/categoryService';
import Numpad from '../components/Numpad';

export default function AddBudgetScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  
  const [amountStr, setAmountStr] = useState('0');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.id) {
      // Budgets are only for expenses usually
      getCategories(user.id).then(cats => {
        setCategories(cats.filter(c => c.type === 'expense'));
      });
    }
  }, [user?.id]);

  const handleNumpadPress = (val: string) => {
    if (val === 'DEL') {
      setAmountStr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
    } else if (val === '.') {
      if (!amountStr.includes('.')) setAmountStr(prev => prev + '.');
    } else {
      setAmountStr(prev => prev === '0' ? val : prev + val);
    }
  };

  const handleCreate = async () => {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Missing Category', 'Please select a category for this budget.');
      return;
    }

    setLoading(true);
    try {
      const now = new Date();
      let startDateStr = '';

      if (period === 'monthly') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        startDateStr = startOfMonth.toISOString();
      } else {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDateStr = startOfWeek.toISOString();
      }

      await createBudget({
        userId: user!.id,
        categoryId: selectedCategoryId,
        amount,
        period,
        startDate: startDateStr
      });

      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create budget. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950" edges={['top']}>
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-4 border-b border-zinc-800">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
          <X size={24} color="#f4f4f5" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">New Budget</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading} className="p-2">
          <Text className={`font-bold ${loading ? 'text-violet-500/50' : 'text-violet-500'}`}>
            Save
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView className="flex-1 px-6">
          
          {/* Amount Display */}
          <View className="items-center py-10">
            <Text className="text-zinc-400 font-medium mb-2 uppercase tracking-wide">
              Budget Amount
            </Text>
            <View className="flex-row items-center">
              <Text className="text-white text-4xl font-bold mr-1">{currency}</Text>
              <Text className="text-white text-6xl font-bold tracking-tight">
                {amountStr}
              </Text>
            </View>
          </View>

          {/* Period Toggle */}
          <View className="flex-row bg-zinc-900 rounded-xl p-1 mb-8">
            <TouchableOpacity 
              onPress={() => setPeriod('monthly')}
              className={`flex-1 py-3 items-center rounded-lg flex-row justify-center ${period === 'monthly' ? 'bg-zinc-800 shadow-sm' : ''}`}
            >
              <Calendar size={18} color={period === 'monthly' ? '#600aff' : '#a1a1aa'} className="mr-2" />
              <Text className={`font-semibold ${period === 'monthly' ? 'text-white' : 'text-zinc-400'}`}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setPeriod('weekly')}
              className={`flex-1 py-3 items-center rounded-lg flex-row justify-center ${period === 'weekly' ? 'bg-zinc-800 shadow-sm' : ''}`}
            >
              <Calendar size={18} color={period === 'weekly' ? '#600aff' : '#a1a1aa'} className="mr-2" />
              <Text className={`font-semibold ${period === 'weekly' ? 'text-white' : 'text-zinc-400'}`}>Weekly</Text>
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <Text className="text-zinc-50 font-bold text-lg mb-4">Select Category</Text>
          <View className="flex-row flex-wrap gap-x-4 gap-y-4 mb-8">
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                className="items-center w-16"
              >
                <View 
                  style={{ backgroundColor: cat.color }}
                  className={`w-14 h-14 rounded-full items-center justify-center mb-2 shadow-sm ${selectedCategoryId === cat.id ? 'border-4 border-violet-500' : ''}`}
                >
                  <Text className="text-white font-bold text-xl">{cat.name.charAt(0)}</Text>
                </View>
                <Text className="text-zinc-400 text-xs font-medium text-center" numberOfLines={1}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
        
        {/* Numpad */}
        <View className="bg-zinc-900 pb-10 rounded-t-3xl pt-4 shadow-lg border-t border-zinc-800">
           <Numpad onPress={handleNumpadPress} onDelete={() => handleNumpadPress('DEL')} />
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
