import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { OnboardingStackScreenProps } from '../../navigation/types';

export default function BudgetSetupScreen({ navigation }: OnboardingStackScreenProps<'BudgetSetup'>) {
  const { setOnboarded, currency } = useAppSettingsStore();
  const [targetBudget, setTargetBudget] = useState('');

  const symbolMap: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', JPY: '¥', INR: '₹', AUD: 'A$', CAD: 'C$'
  };

  const handleFinish = () => {
    // We could save this target budget to local database/supabase later
    setOnboarded(true);
  };

  const handleSkip = () => {
    setOnboarded(true);
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-zinc-950 px-6">
      <View className="flex-1 mt-8">
        <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50 mb-2">
          Set a Monthly Budget
        </Text>
        <Text className="text-zinc-500 dark:text-zinc-400 mb-12">
          Setting a target helps you stay on track. You can always change this later.
        </Text>

        <View className="items-center mb-12">
          <Text className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-4 uppercase tracking-wider">
            Target Amount
          </Text>
          <View className="flex-row items-center border-b-2 border-brand-500 pb-2 px-4 shadow-sm">
            <Text className="text-4xl font-semibold text-zinc-400 mr-2">
              {symbolMap[currency] || '$'}
            </Text>
            <TextInput
              className="text-5xl font-bold text-zinc-900 dark:text-zinc-50 min-w-[150px] text-center"
              value={targetBudget}
              onChangeText={setTargetBudget}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor="#a1a1aa"
              autoFocus
            />
          </View>
        </View>

        <View className="mt-auto py-4 space-y-4">
          <TouchableOpacity
            className="w-full bg-brand-500 py-4 rounded-xl items-center"
            onPress={handleFinish}
          >
            <Text className="text-white font-semibold text-lg">Finish Setup</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className="w-full py-4 rounded-xl items-center"
            onPress={handleSkip}
          >
            <Text className="text-zinc-500 dark:text-zinc-400 font-medium">
              Skip for now
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
