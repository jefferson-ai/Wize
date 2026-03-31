import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { supabase } from '../utils/supabase';
import { User, Moon, LogOut, Download, FileText, DollarSign, X } from 'lucide-react-native';
import { exportTransactionsToCSV } from '../features/export/exportService';
import { seed6MonthsData } from '../utils/seedData';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20ac', name: 'Euro' },
  { code: 'GBP', symbol: '\u00a3', name: 'British Pound' },
  { code: 'JPY', symbol: '\u00a5', name: 'Japanese Yen' },
  { code: 'INR', symbol: '\u20b9', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'GHS', symbol: '\u20b5', name: 'Ghana Cedi' },
  { code: 'NGN', symbol: '\u20a6', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'EGP', symbol: 'E\u00a3', name: 'Egyptian Pound' },
];

export default function SettingsScreen({ navigation }: any) {
  const { user, setUser } = useAuthStore();
  const { theme, setTheme, currency, setCurrency } = useAppSettingsStore();
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);

  const currentCurrency = CURRENCIES.find(c => c.code === currency || c.symbol === currency) || CURRENCIES[0];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Logout error', error);
      Alert.alert('Error', 'Failed to log out.');
    }
  };

  const cycleTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  const handleExport = async () => {
    if (!user?.id) return;
    try {
      await exportTransactionsToCSV(user.id);
    } catch (err) {
      Alert.alert('Error', 'Failed to export data. Please try again.');
    }
  };

  const handleSeed = async () => {
    if (!user?.id) return;
    try {
      const count = await seed6MonthsData(user.id);
      Alert.alert('Success', `Seeded ${count} transactions successfully! Pull to refresh your dashboard.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to seed data.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50 dark:bg-zinc-950" edges={['top']}>
      <View className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex-row items-center">
        <Text className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Settings</Text>
      </View>

      <ScrollView className="flex-1 pt-4">
        {/* Profile Card */}
        <View className="bg-white dark:bg-zinc-900 p-4 mx-4 rounded-2xl mb-6 shadow-sm border border-zinc-100 dark:border-zinc-800 flex-row items-center">
          <View className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/40 items-center justify-center mr-4">
            <User size={24} color="#600aff" />
          </View>
          <View className="flex-1">
            <Text className="text-zinc-900 dark:text-white font-bold text-lg">{user?.email}</Text>
            <Text className="text-zinc-500 text-sm">Pro Member</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text className="px-6 text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2" accessibilityRole="header">Preferences</Text>
        <View className="bg-white dark:bg-zinc-900 mx-4 rounded-2xl mb-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
          
          <TouchableOpacity 
            onPress={cycleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Current theme is ${theme}. Double tap to change theme.`}
            className="flex-row items-center justify-between p-4 border-b border-zinc-100 dark:border-zinc-800"
          >
            <View className="flex-row items-center">
              <Moon size={20} color="#71717a" />
              <Text className="text-zinc-900 dark:text-zinc-50 ml-3 font-medium text-base">Theme</Text>
            </View>
            <Text className="text-zinc-500 capitalize">{theme}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowCurrencyPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Current currency is ${currentCurrency.name}. Double tap to change.`}
            className="flex-row items-center justify-between p-4"
          >
            <View className="flex-row items-center">
              <DollarSign size={20} color="#71717a" />
              <Text className="text-zinc-900 dark:text-zinc-50 ml-3 font-medium text-base">Currency</Text>
            </View>
            <Text className="text-zinc-500">{currentCurrency.symbol} {currentCurrency.code}</Text>
          </TouchableOpacity>

        </View>

        {/* Data & Privacy */}
        <Text className="px-6 text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2" accessibilityRole="header">Data</Text>
        <View className="bg-white dark:bg-zinc-900 mx-4 rounded-2xl mb-6 shadow-sm border border-zinc-100 dark:border-zinc-800">
          <TouchableOpacity 
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel="Export Transactions to CSV"
            className="flex-row items-center p-4 border-b border-zinc-100 dark:border-zinc-800"
          >
            <Download size={20} color="#71717a" className="dark:text-zinc-400" />
            <Text className="text-zinc-900 dark:text-zinc-50 ml-3 font-medium text-base">Export Data to CSV</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={handleSeed}
            className="flex-row items-center p-4"
          >
            <FileText size={20} color="#71717a" className="dark:text-zinc-400" />
            <Text className="text-zinc-900 dark:text-zinc-50 ml-3 font-medium text-base">Seed 6 Months Data</Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone */}
        <Text className="px-6 text-sm font-bold text-rose-500 uppercase tracking-wider mb-2">Account</Text>
        <View className="bg-white dark:bg-zinc-900 mx-4 rounded-2xl mb-12 shadow-sm border border-rose-100 dark:border-rose-900/30">
          <TouchableOpacity 
            onPress={handleLogout}
            className="flex-row items-center p-4"
          >
            <LogOut size={20} color="#ef4444" />
            <Text className="text-rose-500 ml-3 font-bold text-base">Log Out</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} animationType="slide" transparent>
        <Pressable 
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }} 
          onPress={() => setShowCurrencyPicker(false)}
        >
          <View style={{ flex: 1 }} />
          <Pressable 
            onPress={(e) => e.stopPropagation()}
            className="bg-white dark:bg-zinc-900 rounded-t-3xl" 
            style={{ maxHeight: '60%' }}
          >
            <View className="flex-row items-center justify-between p-5 border-b border-zinc-100 dark:border-zinc-800">
              <Text className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Choose Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <X size={24} color="#71717a" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = currentCurrency.code === item.code;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      setCurrency(item.code);
                      setShowCurrencyPicker(false);
                    }}
                    className={`flex-row items-center px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 ${
                      isSelected ? 'bg-violet-50 dark:bg-violet-900/20' : ''
                    }`}
                  >
                    <View className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center mr-4">
                      <Text className="text-lg font-medium text-zinc-800 dark:text-zinc-200">{item.symbol}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className={`text-base font-semibold ${isSelected ? 'text-violet-600 dark:text-violet-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
                        {item.code}
                      </Text>
                      <Text className={`text-sm ${isSelected ? 'text-violet-500' : 'text-zinc-500'}`}>
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
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
