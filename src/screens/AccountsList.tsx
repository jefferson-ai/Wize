import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Wallet, CreditCard, Landmark, ChevronLeft, MoreHorizontal } from 'lucide-react-native';
import { getAccounts, getTotalBalance, Account } from '../features/accounts/accountService';
import { useAuthStore } from '../store/authStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatAmount } from '../utils/formatters';
import { HeaderRegistrar } from '../components/AnimatedHeader';
import { fontDisplay, fontText } from '../theme/fonts';

const getIcon = (type: string, color: string) => {
  switch (type) {
    case 'bank': return <Landmark size={22} color={color} />;
    case 'credit': return <CreditCard size={22} color={color} />;
    default: return <Wallet size={22} color={color} />;
  }
};

export default function AccountsListScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const colors = useThemeColors();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    if (!user?.id) return;
    const [accs, tot] = await Promise.all([
      getAccounts(user.id),
      getTotalBalance(user.id)
    ]);
    setAccounts(accs);
    setTotal(tot);
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [user?.id])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]}>
      <HeaderRegistrar 
        title="Accounts" 
        index={99} // Special index outside tab pager range
        rightElement={
          <TouchableOpacity onPress={() => navigation.navigate('AddAccount')} style={styles.addBtn}>
            <Plus size={20} color={colors.text} />
          </TouchableOpacity>
        }
      />

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>

        {/* Aggregate Balance */}
        <View style={styles.totalBlock}>
          <Text style={[styles.totalLabel, { color: colors.textMuted }]}>Total Balance</Text>
          <Text style={[styles.totalAmount, { color: colors.text }]}>{formatAmount(total, 'USD')}</Text>
        </View>

        {/* Account List */}
        <View style={styles.listContainer}>
          {accounts.map((acc) => (
            <TouchableOpacity 
              key={acc.id} 
              style={[styles.accountCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('AddAccount', { account: acc })}
            >
              <View style={[styles.iconBox, { backgroundColor: acc.color + '15' }]}>
                {getIcon(acc.type, acc.color)}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.accName, { color: colors.text }]}>{acc.name}</Text>
                <Text style={[styles.accType, { color: colors.textMuted }]}>{acc.type.toUpperCase()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.accBalance, { color: colors.text }, acc.balance < 0 && { color: colors.danger }]}>
                  {formatAmount(acc.balance, acc.currency)}
                </Text>
                <TouchableOpacity 
                  style={{ marginTop: 4, padding: 4 }}
                  onPress={() => navigation.navigate('AddAccount', { account: acc })}
                >
                  <MoreHorizontal size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}

          {accounts.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={{ color: colors.textMuted }}>No accounts found. Start by adding one!</Text>
            </View>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.bigAddBtn, { backgroundColor: colors.text }]}
          onPress={() => navigation.navigate('AddAccount')}
        >
          <Plus size={22} color={colors.background} />
          <Text style={[styles.bigAddText, { color: colors.background }]}>Add New Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  addBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  backBtn: { marginBottom: 20, width: 44, height: 44, justifyContent: 'center' },
  totalBlock: { marginBottom: 32, alignItems: 'center' },
  totalLabel: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, fontFamily: fontDisplay },
  totalAmount: { fontSize: 36, fontWeight: '700', fontFamily: fontDisplay },
  listContainer: { gap: 12 },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, borderWidth: 1 },
  iconBox: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  accName: { fontSize: 16, fontWeight: '700', fontFamily: fontText },
  accType: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 2, fontFamily: fontText },
  accBalance: { fontSize: 17, fontWeight: '700', fontFamily: fontDisplay },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  bigAddBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 20, gap: 10, marginTop: 32 },
  bigAddText: { fontSize: 16, fontWeight: '700', fontFamily: fontDisplay },
});
