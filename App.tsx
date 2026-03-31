import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import RootNavigator from './src/navigation/RootNavigator';
import { useColorScheme } from 'nativewind';
import { useAppSettingsStore } from './src/store/appSettingsStore';
import './global.css';

import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from './src/db';
import migrations from './drizzle/migrations';

export default function App() {
  const { colorScheme, setColorScheme } = useColorScheme();
  const { theme } = useAppSettingsStore();
  const { success, error } = useMigrations(db, migrations);

  useEffect(() => {
    // Sync the zustand persisted theme configuration with NativeWind's context
    setColorScheme(theme);
  }, [theme, setColorScheme]);

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
        <Text className="text-zinc-500">Loading database...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
