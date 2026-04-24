import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Tag, FileText, CalendarBlank, CaretLeft, CaretRight, Trash, Wallet } from 'phosphor-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { updateTransaction, deleteTransaction } from '../features/transactions/transactionService';
import { getCategories } from '../features/categories/categoryService';
import { getAccounts } from '../features/accounts/accountService';
import CategoryIcon from '../components/CategoryIcon';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontDisplay, fontText } from '../theme/fonts';

export default function EditTransactionScreen({ navigation, route }: any) {
  const { transaction } = route.params;
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();

  const [type, setType] = useState<'expense' | 'income'>(transaction.type);
  const [amountStr, setAmountStr] = useState(String(transaction.amount));
  const [note, setNote] = useState(transaction.note || '');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(transaction.categoryId);
  const [showCategories, setShowCategories] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(transaction.accountId || null);
  const [showAccounts, setShowAccounts] = useState(false);
  const [date, setDate] = useState(new Date(transaction.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user?.id) {
      loadCategories();
      loadAccounts();
    }
  }, [user?.id, type]);

  const loadCategories = async () => {
    if (!user?.id) return;
    const cats = await getCategories(user.id);
    const filtered = cats.filter((c) => c.type === type);
    setCategories(filtered);
  };

  const loadAccounts = async () => {
    if (!user?.id) return;
    const accs = await getAccounts(user.id);
    setAccounts(accs);
    if (accs.length > 0 && !selectedAccountId) {
      // Default to the first account if none is set
      setSelectedAccountId(accs[0].id);
    }
  };

  const selectedCat = categories.find((c) => c.id === selectedCategory);

  const shiftDate = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d);
  };

  const formatDate = (d: Date) => {
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
    const tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSave = async () => {
    const amount = parseFloat(amountStr);
    if (!amountStr || amount <= 0) {
      Alert.alert('Invalid Amount', 'Enter an amount greater than 0');
      return;
    }
    if (!selectedCategory) {
      Alert.alert('Error', 'Select a category');
      return;
    }
    setSaving(true);
    try {
      await updateTransaction(transaction.id, user!.id, {
        type,
        amount,
        currency,
        categoryId: selectedCategory,
        accountId: selectedAccountId,
        date: date.toISOString(),
        note: note || null,
      });
      if (navigation.canGoBack()) navigation.goBack();
    } catch {
      Alert.alert('Error', 'Failed to update transaction');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTransaction(transaction.id, user!.id);
              if (navigation.canGoBack()) navigation.goBack();
            } catch {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => navigation.canGoBack() && navigation.goBack()} />
      <View style={[styles.sheet, { backgroundColor: colors.card }]}>
        {/* Drag handle */}
        <View style={[styles.handle, { backgroundColor: colors.handle }]} />
        <SafeAreaView edges={['bottom']} style={{ flex: 1 }}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">

              {/* Header */}
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => navigation.canGoBack() && navigation.goBack()}
                  style={[styles.closeBtn, { backgroundColor: colors.background }]}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
                <Text style={[styles.modalTitle, { color: colors.textMuted }]}>Edit Transaction</Text>
                <TouchableOpacity
                  onPress={handleDelete}
                  style={[styles.deleteBtn, { backgroundColor: colors.dangerBg }]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete transaction"
                >
                  <Trash size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>

              {/* Type Toggle */}
              <View style={[styles.typeToggle, { backgroundColor: colors.background }]}>
                <TouchableOpacity
                  onPress={() => setType('expense')}
                  style={[styles.typeBtn, type === 'expense' && { backgroundColor: colors.text }]}
                >
                  <Text style={[styles.typeBtnText, type === 'expense' && { color: colors.background }]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setType('income')}
                  style={[styles.typeBtn, type === 'income' && { backgroundColor: colors.text }]}
                >
                  <Text style={[styles.typeBtnText, type === 'income' && { color: colors.background }]}>Income</Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <TouchableOpacity style={styles.amountArea} activeOpacity={1} onPress={() => amountRef.current?.focus()}>
                <View style={styles.amountRow}>
                  <Text style={styles.currencySymbol}>{currency}</Text>
                  <TextInput
                    ref={amountRef}
                    style={[styles.amountInput, { color: colors.text }]}
                    value={amountStr}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9.]/g, '');
                      if (cleaned.split('.').length > 2) return;
                      const parts = cleaned.split('.');
                      if (parts[1] && parts[1].length > 2) return;
                      setAmountStr(cleaned);
                    }}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </TouchableOpacity>

              <View style={[styles.divider, { backgroundColor: colors.background }]} />

              {/* Fields */}
              <View style={styles.fields}>

                {/* Category */}
                <TouchableOpacity
                  style={[styles.fieldRow, styles.fieldRowBorder, { borderBottomColor: colors.background }]}
                  onPress={() => setShowCategories(!showCategories)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.fieldIcon, { backgroundColor: colors.iconBg }]}>
                    <Tag size={16} color={colors.text} />
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Category  </Text>
                  {selectedCat ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <CategoryIcon categoryName={selectedCat.name} size={14} color={colors.text} />
                      <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>{selectedCat.name}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.fieldValue, { color: colors.text }]}>Select</Text>
                  )}
                  <Text style={styles.chevronText}>{showCategories ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {/* Category Grid (expandable) */}
                {showCategories && (
                  <View style={[styles.categoriesBlock, { borderBottomColor: colors.background }]}>
                    <View style={styles.categoryGrid}>
                      {categories.map((cat) => {
                        const isSelected = selectedCategory === cat.id;
                        return (
                          <TouchableOpacity
                            key={cat.id}
                            onPress={() => { setSelectedCategory(cat.id); setShowCategories(false); }}
                            style={[styles.catChip, { backgroundColor: colors.background, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', gap: 6 }, isSelected && { backgroundColor: colors.text, borderColor: colors.text }]}
                          >
                            <CategoryIcon categoryName={cat.name} size={13} color={isSelected ? colors.background : colors.text} weight="bold" />
                            <Text style={[styles.catChipText, isSelected && { color: colors.background }]}>
                              {cat.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Account Selection */}
                <TouchableOpacity
                  style={[styles.fieldRow, styles.fieldRowBorder, { borderBottomColor: colors.background }]}
                  onPress={() => { setShowAccounts(!showAccounts); setShowCategories(false); }}
                  activeOpacity={0.6}
                >
                  <View style={[styles.fieldIcon, { backgroundColor: colors.accentRedBg }]}>
                    <Wallet size={16} color="#ef4444" />
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Account   </Text>
                  <Text style={[styles.fieldValue, { color: colors.text }]} numberOfLines={1}>
                    {accounts.find(a => a.id === selectedAccountId)?.name || 'Select Account'}
                  </Text>
                  <Text style={styles.chevronText}>{showAccounts ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showAccounts && (
                  <View style={[styles.categoriesBlock, { borderBottomColor: colors.background }]}>
                    <View style={styles.categoryGrid}>
                      {accounts.map((acc) => {
                        const isSelected = selectedAccountId === acc.id;
                        return (
                          <TouchableOpacity
                            key={acc.id}
                            onPress={() => { setSelectedAccountId(acc.id); setShowAccounts(false); }}
                            style={[styles.catChip, { backgroundColor: colors.background, borderColor: colors.border }, isSelected && { backgroundColor: colors.text, borderColor: colors.text }]}
                          >
                            <Text style={[styles.catChipText, isSelected && { color: colors.background }]}>
                              {acc.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Note */}
                <View style={[styles.fieldRow, styles.fieldRowBorder, { borderBottomColor: colors.background }]}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.accentYellowBg }]}>
                    <FileText size={16} color="#ca8a04" />
                  </View>
                  <TextInput
                    style={[styles.noteInput, { color: colors.text }]}
                    placeholder="Add a note..."
                    placeholderTextColor={colors.textMuted}
                    value={note}
                    onChangeText={setNote}
                  />
                </View>

                {/* Date */}
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.accentCalendarBg }]}>
                    <CalendarBlank size={16} color="#3b82f6" />
                  </View>
                  <TouchableOpacity 
                    style={{ flex: 1, paddingVertical: 10 }}
                    onPress={() => setShowDatePicker(true)}
                  >
                    <Text style={[styles.dateText, { color: colors.text }]}>{formatDate(date)}</Text>
                  </TouchableOpacity>
                  <View style={styles.dateControls}>
                    <TouchableOpacity onPress={() => shiftDate(-1)} style={[styles.dateBtn, { backgroundColor: colors.background }]}>
                      <CaretLeft size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => shiftDate(1)} style={[styles.dateBtn, { backgroundColor: colors.background }]}>
                      <CaretRight size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) setDate(selectedDate);
                    }}
                  />
                )}
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.actionArea}>
              <TouchableOpacity onPress={handleDelete} style={[styles.deleteBtnBottom, { backgroundColor: colors.dangerBg, borderColor: colors.dangerBg }]} activeOpacity={0.85}>
                <Trash size={18} color={colors.danger} />
                <Text style={[styles.deleteBtnText, { color: colors.danger }]}>Delete</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.saveBtn, { backgroundColor: colors.text }, saving && { opacity: 0.6 }]}
                activeOpacity={0.85}
                disabled={saving}
              >
                <Text style={[styles.saveBtnText, { color: colors.background }]}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#ffffff', borderTopLeftRadius: 28, borderTopRightRadius: 28, flex: 0.95, paddingTop: 10 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14 },
  closeBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5f6f7', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontFamily: fontDisplay },
  deleteBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center' },

  typeToggle: { flexDirection: 'row', marginHorizontal: 20, backgroundColor: '#f5f6f7', borderRadius: 20, padding: 4, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 16 },
  typeBtnActive: { backgroundColor: '#212529' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#9aa2ad', fontFamily: fontText },
  typeBtnTextActive: { color: '#ffffff' },

  amountArea: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24 },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencySymbol: { fontSize: 26, fontWeight: '700', color: '#c8cdd3', marginRight: 4, fontFamily: fontDisplay },
  amountInput: { fontSize: 52, fontWeight: '700', color: '#212529', minWidth: 60, fontFamily: fontDisplay } as any,

  divider: { height: 1, backgroundColor: '#f5f6f7', marginHorizontal: 20 },

  fields: { marginHorizontal: 20, marginTop: 4 },
  fieldRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
  fieldRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f5f6f7' },
  fieldIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  fieldLabel: { fontSize: 15, color: '#9aa2ad', fontFamily: fontText },
  fieldValue: { flex: 1, fontSize: 15, fontWeight: '600', color: '#212529', fontFamily: fontText },
  chevronText: { fontSize: 13, color: '#c8cdd3' },

  categoriesBlock: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f5f6f7' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#e8eaec', backgroundColor: '#f5f6f7' },
  catChipActive: { backgroundColor: '#212529', borderColor: '#212529' },
  catChipText: { fontSize: 13, fontWeight: '500', color: '#687280', fontFamily: fontText },
  catChipTextActive: { color: '#ffffff' },

  noteInput: { flex: 1, fontSize: 15, color: '#212529', fontFamily: fontText },

  dateText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#212529', fontFamily: fontText },
  dateControls: { flexDirection: 'row', gap: 6 },
  dateBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f5f6f7', alignItems: 'center', justifyContent: 'center' },

  actionArea: { flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 12, paddingTop: 10, gap: 12 },
  deleteBtnBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 20, paddingVertical: 18, paddingHorizontal: 20, backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  deleteBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 15, fontFamily: fontText },
  saveBtn: { flex: 1, backgroundColor: '#212529', borderRadius: 20, alignItems: 'center', paddingVertical: 18 },
  saveBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 16, fontFamily: fontText },
});
