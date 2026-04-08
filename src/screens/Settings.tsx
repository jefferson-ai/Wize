import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, FlatList, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { supabase } from '../utils/supabase';
import { User, Moon, LogOut, Download, FileText, DollarSign, X, ChevronRight, Database, Wallet, RefreshCw } from 'lucide-react-native';
import { exportTransactionsToCSV } from '../features/export/exportService';
import { seed1YearStudentData, clearAllData } from '../utils/seedData';
import { useThemeColors } from '../hooks/useThemeColors';
import { db } from '../db';
import { transactions, budgets, categories, savingGoals, challenges } from '../db/schema';
import { eq } from 'drizzle-orm';
import { Trash2, Loader2 } from 'lucide-react-native';
import { HeaderRegistrar } from '../components/AnimatedHeader';
import { useTabHeaderInset } from '../navigation/tabHeaderInset';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';

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
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const colors = useThemeColors();
  const headerInset = useTabHeaderInset();

  const currentCurrency = CURRENCIES.find(c => c.code === currency || c.symbol === currency) || CURRENCIES[0];

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
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
    }
    catch { Alert.alert('Error', 'Failed to export data.'); }
  };

  const handleSeed = async () => {
    if (!user?.id) return;
    setSeeding(true);
    try {
      const count = await seed1YearStudentData(user.id);
      Alert.alert('Success', `Generated ${count} test transactions covering 1 year!`);
    } catch { Alert.alert('Error', 'Failed to generate seed data.'); }
    finally { setSeeding(false); }
  };

  const handleClearData = () => {
    Alert.alert(
      'Reset All Data',
      'This will permanently delete all your transactions, budgets, spending challenges, and savings goals. Your default account will be reset to zero. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset Everything', 
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setClearing(true);
            try {
              await clearAllData(user.id);
              useAppSettingsStore.getState().setOnboarded(false);
              Alert.alert('Success', 'All data has been cleared. You have a clean slate!');
            } catch {
              Alert.alert('Error', 'Failed to clear data');
            } finally {
              setClearing(false);
            }
          }
        }
      ]
    );
  };
  
  const handleDeleteAccount = async () => {
    if (!user?.id) return;
    
    Alert.alert(
      'Wait! Export your data first?',
      'Account deletion is permanent. Would you like to export your transactions to CSV before we wipe everything?',
      [
        { text: 'Export & Delete', onPress: async () => { await handleExport(); triggerDeleteFlow(); } },
        { text: 'Just Delete', style: 'destructive', onPress: triggerDeleteFlow },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };
  
  const triggerDeleteFlow = () => {
    Alert.alert(
        'Final Confirmation',
        'Are you absolutely sure? This will permanently erase all your transactions, budgets, and categories. This CANNOT be undone.',
        [
            { text: 'Delete Everywhere', style: 'destructive', onPress: performHardDelete },
            { text: 'Cancel', style: 'cancel' }
        ]
    );
  };
  
  const performHardDelete = async () => {
    if (!user?.id) return;
    setDeleting(true);
    try {
        // 1. Call custom RPC to delete user from auth.users (Supabase side)
        const { error: rpcError } = await supabase.rpc('delete_user');
        if (rpcError) throw rpcError;

        // 2. Hard wipe local sequences
        await db.delete(transactions).where(eq(transactions.userId, user.id));
        await db.delete(budgets).where(eq(budgets.userId, user.id));
        await db.delete(categories).where(eq(categories.userId, user.id));
        await db.delete(savingGoals).where(eq(savingGoals.userId, user.id));
        await db.delete(challenges).where(eq(challenges.userId, user.id));
        
        // 3. Clear session and redirect
        await supabase.auth.signOut();
        setUser(null);
        useAppSettingsStore.getState().setOnboarded(false);
        Alert.alert('Account Deleted', 'Your data has been successfully wiped and your account has been deactivated.');
    } catch (err) {
        Alert.alert('Error', 'Failed to complete account deletion. Please ensure you have run the required SQL in your Supabase dashboard.');
        console.error('Delete User Error:', err);
    } finally {
        setDeleting(false);
    }
  };

  const themeLabel = theme === 'system' ? 'System' : theme === 'light' ? 'Light' : 'Dark';

  return (
    <View style={[styles.screen, { flex: 1, backgroundColor: 'transparent' }]}>
      <HeaderRegistrar 
        title="Account" 
        index={3}
      />

      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: 110 }}
      >
        <View style={{ height: headerInset }} collapsable={false} />
        <View style={{ backgroundColor: colors.background }}>
        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: colors.card }]}>
          <View style={[styles.avatar, { backgroundColor: colors.background }]}>
            <User size={26} color={colors.text} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.profileEmail, { color: colors.text }]} numberOfLines={1}>{user?.email}</Text>
            <Text style={[styles.profileSub, { color: colors.textMuted }]}>Pro Member</Text>
          </View>
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Preferences</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={cycleTheme}
            accessibilityRole="button"
            accessibilityLabel={`Current theme is ${theme}. Tap to change.`}
            style={[styles.settingsRow, styles.settingsRowBorder, { borderBottomColor: colors.background }]}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.iconBg }]}>
                <Moon size={17} color={colors.text} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Appearance</Text>
            </View>
            <View style={styles.settingsRight}>
              <Text style={[styles.settingsValue, { color: colors.textMuted }]}>{themeLabel}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('AccountsList')}
            accessibilityRole="button"
            accessibilityLabel="Manage Accounts"
            style={[styles.settingsRow, styles.settingsRowBorder, { borderBottomColor: colors.background }]}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.accentRedBg }]}>
                <Wallet size={17} color="#ef4444" />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Accounts</Text>
            </View>
            <View style={styles.settingsRight}>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setShowCurrencyPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Current currency is ${currentCurrency.name}. Tap to change.`}
            style={styles.settingsRow}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.accentBlueBg }]}>
                <DollarSign size={17} color="#3b82f6" />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Currency</Text>
            </View>
            <View style={styles.settingsRight}>
              <Text style={[styles.settingsValue, { color: colors.textMuted }]}>{currentCurrency.symbol} {currentCurrency.code}</Text>
              <ChevronRight size={16} color={colors.textMuted} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Data */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Data</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <TouchableOpacity
            onPress={handleExport}
            accessibilityRole="button"
            accessibilityLabel="Export Transactions to CSV"
            style={[styles.settingsRow, styles.settingsRowBorder, { borderBottomColor: colors.background }]}
          >
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.successBg }]}>
                <Download size={17} color={colors.success} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Export to CSV</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSeed} style={[styles.settingsRow, styles.settingsRowBorder, { borderBottomColor: colors.background }]} disabled={seeding}>
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.warningBg }]}>
                <Database size={17} color={colors.warning} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>
                {seeding ? 'Generating mock data...' : 'Seed 1-Year Legon Data'}
              </Text>
            </View>
            {!seeding && <ChevronRight size={16} color={colors.textMuted} />}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleClearData} style={styles.settingsRow} disabled={clearing}>
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.danger + '15' }]}>
                <RefreshCw size={17} color={colors.danger} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.danger }]}>
                {clearing ? 'Clearing records...' : 'Reset All Data'}
              </Text>
            </View>
            {!clearing && <ChevronRight size={16} color={colors.textMuted} />}
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <Text style={[styles.sectionLabel, { color: colors.danger }]}>Account</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card }]}>
          <TouchableOpacity onPress={handleLogout} style={[styles.settingsRow, styles.settingsRowBorder, { borderBottomColor: colors.background }]}>
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.border }]}>
                <LogOut size={17} color={colors.text} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Log Out</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity onPress={handleDeleteAccount} style={styles.settingsRow} disabled={deleting}>
            <View style={styles.settingsLeft}>
              <View style={[styles.settingsIcon, { backgroundColor: colors.danger + '15' }]}>
                {deleting ? (
                  <Loader2 size={17} color={colors.danger} />
                ) : (
                  <Trash2 size={17} color={colors.danger} />
                )}
              </View>
              <Text style={[styles.settingsLabel, { color: colors.danger }]}>
                {deleting ? 'Deleting account...' : 'Delete Account'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        </View>

      </ScrollView>

      {/* Currency Picker Modal */}
      <Modal visible={showCurrencyPicker} animationType="slide" transparent>
        <Pressable style={styles.modalOverlay} onPress={() => setShowCurrencyPicker(false)}>
          <View style={{ flex: 1 }} />
          <Pressable onPress={(e) => e.stopPropagation()} style={[styles.modalSheet, { backgroundColor: colors.card }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={[styles.modalHeader, { borderBottomColor: colors.background }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Choose Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyPicker(false)}>
                <X size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => {
                const isSelected = currentCurrency.code === item.code;
                return (
                  <TouchableOpacity
                    onPress={() => { setCurrency(item.code); setShowCurrencyPicker(false); }}
                    style={[styles.currencyRow, { borderBottomColor: colors.background }, isSelected && { backgroundColor: colors.background }]}
                  >
                    <View style={[styles.currencySymbolBadge, { backgroundColor: colors.background }]}>
                      <Text style={[styles.currencySymbol, { color: colors.text }]}>{item.symbol}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.currencyCode, { color: colors.textMuted }, isSelected && { color: colors.text }]}>{item.code}</Text>
                      <Text style={[styles.currencyName, { color: colors.textMuted }]}>{item.name}</Text>
                    </View>
                    {isSelected && (
                      <View style={[styles.checkBadge, { backgroundColor: colors.text }]}>
                        <Text style={{ color: colors.background, fontSize: 11, fontWeight: '700' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  pageHeader: { paddingHorizontal: 24, paddingVertical: 16 },
  pageTitle: { fontSize: 26, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },

  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', marginHorizontal: 20, borderRadius: 20, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  avatar: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#f5f6f7', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  profileEmail: { fontSize: 15, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },
  profileSub: { fontSize: 12, color: '#9aa2ad', marginTop: 2, fontFamily: fontText },

  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9aa2ad', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, marginHorizontal: 24, fontFamily: fontRounded },

  settingsGroup: { backgroundColor: '#ffffff', marginHorizontal: 20, borderRadius: 20, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f6f7' },
  settingsLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  settingsLabel: { fontSize: 15, fontWeight: '500', color: '#212529', fontFamily: fontText },
  settingsRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  settingsValue: { fontSize: 14, color: '#9aa2ad', fontFamily: fontText },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '65%', paddingTop: 12 },
  modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#e8eaec', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: '#f5f6f7' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#212529', fontFamily: fontDisplay },

  currencyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f6f7' },
  currencyRowActive: { backgroundColor: '#f5f6f7' },
  currencySymbolBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#f5f6f7', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  currencySymbol: { fontSize: 17, fontWeight: '600', color: '#212529', fontFamily: fontDisplay },
  currencyCode: { fontSize: 15, fontWeight: '600', color: '#687280', fontFamily: fontText },
  currencyName: { fontSize: 12, color: '#9aa2ad', marginTop: 1, fontFamily: fontText },
  checkBadge: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#212529', alignItems: 'center', justifyContent: 'center' },
});
