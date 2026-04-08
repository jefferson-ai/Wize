import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Account } from '../features/accounts/accountService';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Onboarding: undefined;
  Main: undefined;
  AccountsList: undefined;
  AddAccount: { account?: Account };
};

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  SignUp: undefined;
  VerifyEmail: { email: string };
};

export type OnboardingStackParamList = {
  FeatureIntro: undefined;
  CurrencySetup: undefined;
  AccountSetup: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Transactions: undefined;
  AddTransaction: undefined;
  Planning: { initialTab?: 'budgets' | 'savings' } | undefined;
  Account: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;
export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<AuthStackParamList, T>;
export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> = NativeStackScreenProps<OnboardingStackParamList, T>;
