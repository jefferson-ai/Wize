import { useEffect } from 'react';
import * as QuickActions from 'expo-quick-actions';
import { Platform } from 'react-native';
import { navigateNested } from '../navigation/navigationRef';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';

export function useAppQuickActions() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    
    QuickActions.setItems([
      {
        title: 'Add Expense',
        icon: Platform.OS === 'ios' ? 'symbol:minus.circle' : 'add',
        id: 'add_expense',
        subtitle: 'Log a new expense',
      },
      {
        title: 'Add Income',
        icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : 'add',
        id: 'add_income',
        subtitle: 'Log new income',
      },
    ]);
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    // Check if app was launched via a Quick Action
    const checkInitialAction = async () => {
      try {
        const action = await QuickActions.initial;
        if (isMounted && action) {
          handleAction(action);
        }
      } catch (err) {}
    };
    checkInitialAction();

    // Listen for Quick Actions while app is running
    const subscription = QuickActions.addListener((action) => {
      handleAction(action);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleAction = (action: QuickActions.Action) => {
    const { session } = useAuthStore.getState();
    const { isOnboarded } = useAppSettingsStore.getState();

    // Only allow jumping to transactions if we're fully logged in and onboarded
    if (!session || !isOnboarded) return;

    if (action.id === 'add_expense') {
      navigateNested('Main', 'AddTransaction', { initialType: 'expense' });
    } else if (action.id === 'add_income') {
      navigateNested('Main', 'AddTransaction', { initialType: 'income' });
    }
  };
}
