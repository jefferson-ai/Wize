import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CurrencySetupScreen from '../screens/onboarding/CurrencySetup';
import BudgetSetupScreen from '../screens/onboarding/BudgetSetup';
import { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="CurrencySetup" component={CurrencySetupScreen} />
      <Stack.Screen name="BudgetSetup" component={BudgetSetupScreen} />
    </Stack.Navigator>
  );
}
