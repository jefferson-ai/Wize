import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingStackScreenProps } from '../../navigation/types';
import { useAppSettingsStore } from '../../store/appSettingsStore';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
];

export default function CurrencySetupScreen({ navigation }: OnboardingStackScreenProps<'CurrencySetup'>) {
  const { currency, setCurrency } = useAppSettingsStore();
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');

  const handleNext = () => {
    setCurrency(selectedCurrency);
    navigation.navigate('BudgetSetup');
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950 px-6">
      <View className="flex-1 mt-8">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Choose Your Currency
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 mb-8">
          This will be the main currency used for all your transactions and budgets.
        </Text>

        <FlatList
          data={CURRENCIES}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isSelected = selectedCurrency === item.code;
            return (
              <TouchableOpacity
                onPress={() => setSelectedCurrency(item.code)}
                className={`flex-row items-center p-4 mb-3 rounded-2xl border ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900'
                }`}
              >
                <View className="w-12 h-12 bg-white dark:bg-zinc-800 rounded-full items-center justify-center mr-4 shadow-sm border border-zinc-100 dark:border-zinc-700">
                  <Text className="text-xl font-medium text-zinc-800 dark:text-zinc-200">
                    {item.symbol}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-lg font-semibold ${isSelected ? 'text-violet-700 dark:text-violet-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                    {item.code}
                  </Text>
                  <Text className={`text-sm ${isSelected ? 'text-violet-600 dark:text-violet-500' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {item.name}
                  </Text>
                </View>
                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-violet-500 items-center justify-center">
                    <Text className="text-white text-xs font-bold">✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <View className="py-4">
          <TouchableOpacity
            className="w-full bg-violet-500 py-4 rounded-xl items-center"
            onPress={handleNext}
          >
            <Text className="text-white font-semibold text-lg">Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
