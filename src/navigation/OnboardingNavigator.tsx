import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import FeatureIntroScreen from '../screens/onboarding/FeatureIntro';
import CurrencySetupScreen from '../screens/onboarding/CurrencySetup';
import FinancialGoalsSetupScreen from '../screens/onboarding/FinancialGoalsSetup';
import AccountSetupScreen from '../screens/onboarding/AccountSetup';
import { OnboardingStackParamList } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export default function OnboardingNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FeatureIntro" component={FeatureIntroScreen} />
      <Stack.Screen name="CurrencySetup" component={CurrencySetupScreen} />
      <Stack.Screen name="AccountSetup" component={AccountSetupScreen} />
      <Stack.Screen name="FinancialGoalsSetup" component={FinancialGoalsSetupScreen} />
    </Stack.Navigator>
  );
}
