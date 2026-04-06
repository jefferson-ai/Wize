import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useColorScheme } from 'nativewind';
import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useAppSettingsStore } from './src/store/appSettingsStore';
import './global.css';
import { navigationRef } from './src/navigation/navigationRef';
import { useAppNotifications } from './src/hooks/useAppNotifications';
import { useAppQuickActions } from './src/hooks/useAppQuickActions';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from './src/db';
import migrations from './drizzle/migrations';


export default function App() {
  useAppNotifications();
  useAppQuickActions();

  const { setColorScheme } = useColorScheme();
  const systemColorScheme = useNativeColorScheme();
  const { theme } = useAppSettingsStore();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const { success, error } = useMigrations(db, migrations);


  useEffect(() => {
    // Sync the zustand persisted theme configuration with NativeWind's context
    // Explicitly resolve 'system' to prevent NativeWind from causing Appearance context glitches
    const resolvedTheme = theme === 'system' ? (systemColorScheme === 'dark' ? 'dark' : 'light') : theme;
    setColorScheme(resolvedTheme);
  }, [theme, systemColorScheme, setColorScheme]);

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <Text className="text-red-500">Migration error: {error.message}</Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-zinc-950">
        <Text className="text-zinc-500">Loading...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
          <StatusBar style={isDark ? 'light' : 'dark'} />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
