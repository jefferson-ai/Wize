import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, CalendarBlank, Trash } from 'phosphor-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { updateBudget, deleteBudget } from '../features/budgets/budgetService';
import { useThemeColors } from '../hooks/useThemeColors';
import CategoryIcon from '../components/CategoryIcon';
import { fontDisplay, fontText } from '../theme/fonts';

export default function EditBudgetScreen({ navigation, route }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();
  
  const budget = route?.params?.budgetToEdit;
  
  const [amountStr, setAmountStr] = useState(budget?.amount?.toString() || '0');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>(budget?.period || 'monthly');
  const [loading, setLoading] = useState(false);

  const amountRef = useRef<TextInput>(null);

  if (!budget) {
      navigation.goBack();
      return null;
  }

  const handleUpdate = async () => {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) { Alert.alert('Invalid Amount', 'Enter a valid amount greater than 0.'); return; }

    setLoading(true);
    try {
      await updateBudget(budget.id, user!.id, { amount, period });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to update budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Budget',
      'Are you sure you want to delete this budget?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await deleteBudget(budget.id, user!.id);
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete budget.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Budget</Text>
        <TouchableOpacity onPress={handleUpdate} disabled={loading} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, { color: colors.text }, loading && { opacity: 0.4 }]}>Save</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20 }}>
          
          {/* Amount Display */}
          <TouchableOpacity style={styles.amountArea} activeOpacity={1} onPress={() => amountRef.current?.focus()}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Budget Amount</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencyText, { color: colors.textMuted }]}>{currency}</Text>
              <TextInput
                ref={amountRef}
                style={[styles.amountText, { color: colors.text }]}
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
                autoFocus
              />
            </View>
          </TouchableOpacity>

          {/* Period Toggle */}
          <View style={[styles.periodToggle, { backgroundColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setPeriod('monthly')}
              style={[styles.periodBtn, period === 'monthly' && { backgroundColor: colors.card }]}
            >
              <CalendarBlank size={16} color={period === 'monthly' ? colors.text : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.periodBtnText, period === 'monthly' ? { color: colors.text } : { color: colors.textMuted }]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPeriod('weekly')}
              style={[styles.periodBtn, period === 'weekly' && { backgroundColor: colors.card }]}
            >
              <CalendarBlank size={16} color={period === 'weekly' ? colors.text : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.periodBtnText, period === 'weekly' ? { color: colors.text } : { color: colors.textMuted }]}>Weekly</Text>
            </TouchableOpacity>
          </View>

          {/* Locked Category Display */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Category (Locked)</Text>
          <View style={styles.lockedCategory}>
            <View style={[styles.categoryDot, { backgroundColor: budget.category?.color || colors.textMuted }]}>
              <CategoryIcon categoryName={budget.category?.name} size={16} color="#fff" />
            </View>
            <Text style={[styles.lockedCategoryText, { color: colors.text }]}>{budget.category?.name || 'Unknown'}</Text>
          </View>
          
          {/* Delete Button */}
          <View style={{ marginTop: 40, alignItems: 'center' }}>
             <TouchableOpacity disabled={loading} onPress={handleDelete} style={styles.deleteBtn}>
                 <Trash size={20} color={colors.danger} />
                 <Text style={[styles.deleteText, { color: colors.danger }]}>Delete Budget</Text>
             </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  closeBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#ffffff', fontFamily: fontDisplay },
  saveBtn: { padding: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#f5f6f7', fontFamily: fontText },

  amountArea: { alignItems: 'center', paddingVertical: 32 },
  amountLabel: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, fontFamily: fontText },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencyText: { fontSize: 30, fontWeight: '700', color: 'rgba(255,255,255,0.4)', marginRight: 4, fontFamily: fontDisplay },
  amountText: { fontSize: 56, fontWeight: '700', color: '#ffffff', letterSpacing: -1, fontFamily: fontDisplay, minWidth: 60 } as any,

  periodToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 18, padding: 4, marginBottom: 28 },
  periodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 14 },
  periodBtnText: { fontWeight: '600', color: '#9aa2ad', fontSize: 14, fontFamily: fontText },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16, fontFamily: fontText },
  
  lockedCategory: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16 },
  categoryDot: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  categoryDotText: { color: '#ffffff', fontWeight: '700', fontSize: 17, fontFamily: fontText },
  lockedCategoryText: { fontSize: 16, fontWeight: '600', fontFamily: fontText },
  
  deleteBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 8 },
  deleteText: { fontSize: 16, fontWeight: '600', fontFamily: fontText }
});
