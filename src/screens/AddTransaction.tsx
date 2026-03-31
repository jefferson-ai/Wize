import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  Tag,
  FileText,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { addTransaction } from '../features/transactions/transactionService';
import { getCategories, addCustomCategory } from '../features/categories/categoryService';
import { getCategoryEmoji } from '../utils/categoryEmojis';

export default function AddTransactionScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();

  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [note, setNote] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [date, setDate] = useState(new Date());

  // Custom category state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [addingCustom, setAddingCustom] = useState(false);

  const amountRef = useRef<TextInput>(null);
  const customInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user?.id) {
      loadCategories();
    }
  }, [user?.id, type]);

  const loadCategories = async () => {
    if (!user?.id) return;
    const cats = await getCategories(user.id);
    const filtered = cats.filter((c) => c.type === type);
    setCategories(filtered);
    if (filtered.length > 0 && !selectedCategory) {
      setSelectedCategory(filtered[0].id);
    }
  };

  const selectedCat = categories.find((c) => c.id === selectedCategory);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  };

  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleAddCustomCategory = async () => {
    if (!customCategoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }
    if (!user?.id) return;

    setAddingCustom(true);
    try {
      const colors = ['#f59e0b', '#600aff', '#3b82f6', '#ef4444', '#600aff', '#ec4899', '#f97316', '#0ea5e9'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];

      const newCat = await addCustomCategory(user.id, {
        name: customCategoryName.trim(),
        icon: 'tag',
        color: randomColor,
        type,
      });

      await loadCategories();
      setSelectedCategory(newCat.id);
      setCustomCategoryName('');
      setShowCustomInput(false);
      setShowCategories(false);
    } catch (e) {
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setAddingCustom(false);
    }
  };

  const handleSubmit = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter an amount greater than 0');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Please select a category');
      return;
    }

    try {
      await addTransaction({
        userId: user!.id,
        type,
        amount,
        currency,
        categoryId: selectedCategory,
        date: date.toISOString(),
        note: note || null,
        receiptUrl: null,
      });
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Failed to add transaction');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950" edges={['top']}>
      {/* Top accent bar */}
      <View className="h-1 bg-violet-500" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-5 py-4">
            <TouchableOpacity
              onPress={() => navigation.canGoBack() && navigation.goBack()}
              className="w-10 h-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={20} color="#71717a" />
            </TouchableOpacity>
            <Text className="text-sm font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
              New Transaction
            </Text>
            <View className="w-10" />
          </View>

          {/* Amount */}
          <TouchableOpacity
            className="items-center py-6 px-6"
            activeOpacity={1}
            onPress={() => amountRef.current?.focus()}
          >
            <View className="flex-row items-baseline">
              <Text className="text-2xl font-bold text-zinc-400 dark:text-zinc-500 mr-1">
                {currency}
              </Text>
              <TextInput
                ref={amountRef}
                className="text-5xl font-extrabold text-zinc-900 dark:text-zinc-50"
                value={amountStr}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  if (cleaned.split('.').length > 2) return;
                  const parts = cleaned.split('.');
                  if (parts[1] && parts[1].length > 2) return;
                  setAmountStr(cleaned);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor="#d4d4d8"
                style={{ minWidth: 60 }}
              />
            </View>
          </TouchableOpacity>

          {/* Type Tabs */}
          <View className="flex-row justify-center px-6 mb-8">
            <TouchableOpacity
              onPress={() => setType('expense')}
              className={`px-6 py-2.5 rounded-full mr-3 ${
                type === 'expense'
                  ? 'bg-zinc-900 dark:bg-zinc-100'
                  : 'bg-zinc-100 dark:bg-zinc-900'
              }`}
            >
              <Text
                className={`font-bold text-xs uppercase tracking-wider ${
                  type === 'expense'
                    ? 'text-white dark:text-zinc-900'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                Expense
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setType('income')}
              className={`px-6 py-2.5 rounded-full ${
                type === 'income'
                  ? 'bg-zinc-900 dark:bg-zinc-100'
                  : 'bg-zinc-100 dark:bg-zinc-900'
              }`}
            >
              <Text
                className={`font-bold text-xs uppercase tracking-wider ${
                  type === 'income'
                    ? 'text-white dark:text-zinc-900'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                Income
              </Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="h-px bg-zinc-100 dark:bg-zinc-800 mx-6" />

          {/* Fields List */}
          <View className="px-6 mt-2">
            {/* Category Row */}
            <TouchableOpacity
              className="flex-row items-center py-5 border-b border-zinc-100 dark:border-zinc-800"
              onPress={() => {
                setShowCategories(!showCategories);
                setShowCustomInput(false);
              }}
              activeOpacity={0.6}
            >
              <View className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 items-center justify-center mr-4">
                <Tag size={18} color="#600aff" />
              </View>
              <Text className="text-base text-zinc-500 dark:text-zinc-400">
                Category:{' '}
              </Text>
              <Text className="text-base font-bold text-zinc-900 dark:text-zinc-50 flex-1" numberOfLines={1}>
                {selectedCat
                  ? `${getCategoryEmoji(selectedCat.name)} ${selectedCat.name}`
                  : 'Select'}
              </Text>
              <Text className="text-zinc-400 text-lg">{showCategories ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {/* Category Grid (expandable) */}
            {showCategories && (
              <View className="py-4 border-b border-zinc-100 dark:border-zinc-800">
                <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                  {categories.map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        onPress={() => {
                          setSelectedCategory(cat.id);
                          setShowCategories(false);
                          setShowCustomInput(false);
                        }}
                        className={`px-3 py-2.5 rounded-2xl border ${
                          isSelected
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                            : 'border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900'
                        }`}
                      >
                        <Text
                          className={`text-sm font-semibold ${
                            isSelected
                              ? 'text-violet-600 dark:text-violet-400'
                              : 'text-zinc-600 dark:text-zinc-400'
                          }`}
                        >
                          {getCategoryEmoji(cat.name)} {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Add Custom Button */}
                  <TouchableOpacity
                    onPress={() => {
                      setShowCustomInput(true);
                      setTimeout(() => customInputRef.current?.focus(), 100);
                    }}
                    className="px-3 py-2.5 rounded-2xl border border-dashed border-violet-400 dark:border-violet-600 bg-violet-50/50 dark:bg-violet-900/10"
                  >
                    <Text className="text-sm font-semibold text-violet-500 dark:text-violet-400">
                      ＋ Custom
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Custom Category Input */}
                {showCustomInput && (
                  <View className="flex-row items-center mt-4 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 px-4 py-1">
                    <TextInput
                      ref={customInputRef}
                      className="flex-1 text-base text-zinc-900 dark:text-zinc-50 py-3"
                      placeholder="Enter category name..."
                      placeholderTextColor="#a1a1aa"
                      value={customCategoryName}
                      onChangeText={setCustomCategoryName}
                      autoCapitalize="words"
                      returnKeyType="done"
                      onSubmitEditing={handleAddCustomCategory}
                    />
                    <TouchableOpacity
                      onPress={handleAddCustomCategory}
                      disabled={addingCustom}
                      className="w-9 h-9 rounded-full bg-violet-500 items-center justify-center ml-2"
                    >
                      <Check size={18} color="#ffffff" strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* Note Row */}
            <View className="flex-row items-center py-5 border-b border-zinc-100 dark:border-zinc-800">
              <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mr-4">
                <FileText size={18} color="#f59e0b" />
              </View>
              <TextInput
                className="flex-1 text-base text-zinc-900 dark:text-zinc-50"
                placeholder="Add a note..."
                placeholderTextColor="#a1a1aa"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Date Row */}
            <View className="flex-row items-center py-5 border-b border-zinc-100 dark:border-zinc-800">
              <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 items-center justify-center mr-4">
                <CalendarDays size={18} color="#3b82f6" />
              </View>
              <Text className="flex-1 text-base font-semibold text-zinc-900 dark:text-zinc-50">
                {formatDate(date)}
              </Text>
              <TouchableOpacity
                onPress={() => shiftDate(-1)}
                className="w-9 h-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 mr-2"
              >
                <ChevronLeft size={18} color="#71717a" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => shiftDate(1)}
                className="w-9 h-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800"
              >
                <ChevronRight size={18} color="#71717a" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Save Button */}
        <View className="px-6 pb-6 pt-3">
          <TouchableOpacity
            onPress={handleSubmit}
            className="w-full bg-zinc-900 dark:bg-zinc-100 rounded-2xl items-center shadow-sm"
            style={{ paddingVertical: 18 }}
            activeOpacity={0.85}
          >
            <Text className="text-white dark:text-zinc-900 font-bold text-base uppercase tracking-wider">
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
