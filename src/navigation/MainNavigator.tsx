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
import EditBudgetScreen from '../screens/EditBudget';
import EditTransactionScreen from '../screens/EditTransaction';
import NotificationsScreen from '../screens/Notifications';
import SavingsGoalsScreen from '../screens/SavingsGoals';
import AddSavingGoalScreen from '../screens/AddSavingGoal';

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
      <Tab.Screen name="Planning" component={InsightsScreen} />
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
        options={{ 
          presentation: 'transparentModal',
          animation: 'slide_from_bottom' 
        }}
      />
      <AppStack.Screen
        name="AddBudget"
        component={AddBudgetScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="EditBudget"
        component={EditBudgetScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
      />
      <AppStack.Screen
        name="EditTransaction"
        component={EditTransactionScreen}
        options={{
          presentation: 'transparentModal',
          animation: 'slide_from_bottom'
        }}
      />
      <AppStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="SavingsGoals"
        component={SavingsGoalsScreen}
        options={{ presentation: 'modal' }}
      />
      <AppStack.Screen
        name="AddSavingGoal"
        component={AddSavingGoalScreen}
        options={{ presentation: 'modal' }}
      />
    </AppStack.Navigator>
  );
}
