import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Landmark, CreditCard, Wallet, Check, Trash2 } from 'lucide-react-native';
import { createAccount, updateAccount, deleteAccount } from '../features/accounts/accountService';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontDisplay, fontText } from '../theme/fonts';
import { useRoute } from '@react-navigation/native';

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank Account', icon: Landmark },
  { id: 'credit', label: 'Credit Card', icon: CreditCard },
  { id: 'cash', label: 'Cash / Wallet', icon: Wallet },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#212529'];

export default function AddAccountScreen({ navigation }: any) {
  const route = useRoute<any>();
  const editingAccount = route.params?.account;
  const isEditing = !!editingAccount;

  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();

  const [name, setName] = useState(editingAccount?.name || '');
  const [type, setType] = useState<'bank' | 'credit' | 'cash'>(editingAccount?.type || 'bank');
  const [balance, setBalance] = useState(editingAccount?.balance?.toString() || '0');
  const [selectedColor, setSelectedColor] = useState(editingAccount?.color || COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Error', 'Please enter an account name');
    if (!user?.id) return;

    setLoading(true);
    try {
      const accountData = {
        userId: user.id,
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        currency,
        color: selectedColor,
        icon: type === 'bank' ? 'Landmark' : type === 'credit' ? 'CreditCard' : 'Wallet',
      };

      if (isEditing) {
        await updateAccount(editingAccount.id, accountData);
      } else {
        await createAccount(accountData);
      }
      navigation.goBack();
    } catch {
      Alert.alert('Error', isEditing ? 'Failed to update account' : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure? This will permanently delete this account and all its transaction history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete Everywhere', 
          style: 'destructive', 
          onPress: async () => {
            setLoading(true);
            try {
              await deleteAccount(editingAccount.id);
              navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => navigation.goBack()} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        <View style={[styles.handle, { backgroundColor: colors.handle }]} />
        
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.closeBtn, { backgroundColor: colors.background }]}>
                <X size={18} color={colors.text} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textMuted }]}>
                {isEditing ? 'Edit Account' : 'New Account'}
              </Text>
              {isEditing ? (
                <TouchableOpacity onPress={handleDelete} style={[styles.closeBtn, { backgroundColor: colors.danger + '15' }]}>
                  <Trash2 size={18} color={colors.danger} />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 38 }} />
              )}
            </View>

            <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
              
              {/* Current/Starting Balance */}
              <View style={styles.amountArea}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted, textAlign: 'center' }]}>
                  {isEditing ? 'Current Balance' : 'Starting Balance'}
                </Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>{editingAccount?.currency || currency}</Text>
                  <TextInput
                    style={[styles.amountInput, { color: colors.text }]}
                    value={balance}
                    onChangeText={setBalance}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    autoFocus={!isEditing}
                  />
                </View>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Account Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Account Name</Text>
                <TextInput
                  style={[styles.nameInput, { color: colors.text }]}
                  placeholder="e.g. Chase Bank"
                  placeholderTextColor={colors.textMuted}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Type Select */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 24 }]}>Account Type</Text>
              <View style={styles.typeGrid}>
                {ACCOUNT_TYPES.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    onPress={() => setType(t.id as any)}
                    style={[
                      styles.typeItem, 
                      { borderColor: colors.border, backgroundColor: colors.background },
                      type === t.id && { borderColor: colors.text, borderWidth: 1.5, backgroundColor: colors.card }
                    ]}
                  >
                    <t.icon size={20} color={type === t.id ? colors.text : colors.textMuted} />
                    <Text style={[styles.typeText, { color: type === t.id ? colors.text : colors.textMuted }]}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Grid */}
              <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 24 }]}>Theme Color</Text>
              <View style={styles.colorGrid}>
                {COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setSelectedColor(c)}
                    style={[styles.colorCircle, { backgroundColor: c }, selectedColor === c && styles.selectedCircle]}
                  >
                    {selectedColor === c && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>

            </ScrollView>

            <View style={styles.saveArea}>
              <TouchableOpacity onPress={handleSave} disabled={loading} style={[styles.saveBtn, { backgroundColor: colors.text }]}>
                <Text style={[styles.saveBtnText, { color: colors.background }]}>
                  {isEditing ? 'Save Changes' : 'Create Account'}
                </Text>
              </TouchableOpacity>
            </View>

          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 0.9, paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: fontDisplay },
  amountArea: { paddingVertical: 24, alignItems: 'center' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencySymbol: { fontSize: 26, fontWeight: '700', marginRight: 4, fontFamily: fontDisplay },
  amountInput: { fontSize: 52, fontWeight: '700', minWidth: 60, fontFamily: fontDisplay } as any,
  divider: { height: 1, marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8, fontFamily: fontText },
  inputGroup: { marginBottom: 20 },
  nameInput: { fontSize: 20, fontWeight: '600', fontFamily: fontDisplay },
  typeGrid: { flexDirection: 'row', gap: 10 },
  typeItem: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1, alignItems: 'center', gap: 8 },
  typeText: { fontSize: 12, fontWeight: '700', fontFamily: fontText },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  selectedCircle: { borderWidth: 2, borderColor: '#fff' },
  saveArea: { padding: 24 },
  saveBtn: { borderRadius: 20, paddingVertical: 18, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', fontFamily: fontText },
});
