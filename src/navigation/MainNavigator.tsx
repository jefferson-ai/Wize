import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from '../screens/Home';
import AddTransactionScreen from '../screens/AddTransaction';
import InsightsScreen from '../screens/Insights';
import SettingsScreen from '../screens/Settings';
import TransactionHistoryScreen from '../screens/TransactionHistory';
import AddBudgetScreen from '../screens/AddBudget';

import CustomTabBar from '../components/CustomTabBar';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Dummy screen for the center "Add" tab (never actually rendered)
function DummyScreen() {
  return <View />;
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Transactions" component={TransactionHistoryScreen} />
      <Tab.Screen
        name="AddTransaction"
        component={DummyScreen}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.getParent()?.navigate('AddTransaction');
          },
        })}
      />
      <Tab.Screen name="Budgets" component={InsightsScreen} />
      <Tab.Screen name="Account" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

const AppStack = createNativeStackNavigator();

export default function MainNavigator() {
  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      <AppStack.Screen name="Tabs" component={TabNavigator} />
      <AppStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="AddBudget"
        component={AddBudgetScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
      />
    </AppStack.Navigator>
  );
}
