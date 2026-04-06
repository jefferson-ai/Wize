import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { createBudget } from '../features/budgets/budgetService';
import { getCategories } from '../features/categories/categoryService';
import { useThemeColors } from '../hooks/useThemeColors';
import { getCategoryEmoji } from '../utils/categoryEmojis';
import { fontDisplay, fontText } from '../theme/fonts';

export default function AddBudgetScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();

  const [amountStr, setAmountStr] = useState('0');
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountRef = useRef<TextInput>(null);

  useEffect(() => {
    if (user?.id) {
      getCategories(user.id).then(cats => {
        setCategories(cats.filter(c => c.type === 'expense'));
      });
    }
  }, [user?.id]);

  const handleCreate = async () => {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0) { Alert.alert('Invalid Amount', 'Enter a valid amount greater than 0.'); return; }
    if (!selectedCategoryId) { Alert.alert('Missing Category', 'Select a category for this budget.'); return; }

    setLoading(true);
    try {
      const now = new Date();
      let startDateStr = '';
      if (period === 'monthly') {
        startDateStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      } else {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        startDateStr = startOfWeek.toISOString();
      }
      await createBudget({ userId: user!.id, categoryId: selectedCategoryId, amount, period, startDate: startDateStr });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create budget. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Budget</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading} style={styles.saveBtn}>
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
              <Calendar size={16} color={period === 'monthly' ? colors.text : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.periodBtnText, period === 'monthly' ? { color: colors.text } : { color: colors.textMuted }]}>Monthly</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPeriod('weekly')}
              style={[styles.periodBtn, period === 'weekly' && { backgroundColor: colors.card }]}
            >
              <Calendar size={16} color={period === 'weekly' ? colors.text : colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.periodBtnText, period === 'weekly' ? { color: colors.text } : { color: colors.textMuted }]}>Weekly</Text>
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Select Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id)}
                style={styles.categoryItem}
              >
                <View style={[
                  styles.categoryDot,
                  { backgroundColor: cat.color },
                  selectedCategoryId === cat.id && { borderWidth: 3, borderColor: colors.text },
                ]}>
                  <Text style={[styles.categoryDotText, { color: '#ffffff' }]}>{getCategoryEmoji(cat.name)}</Text>
                </View>
                <Text style={[styles.categoryName, { color: colors.textMuted }]} numberOfLines={1}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
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
  periodBtnActive: { backgroundColor: '#ffffff' },
  periodBtnText: { fontWeight: '600', color: '#9aa2ad', fontSize: 14, fontFamily: fontText },
  periodBtnTextActive: { color: '#212529' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16, fontFamily: fontText },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginBottom: 20 },
  categoryItem: { alignItems: 'center', width: 60 },
  categoryDot: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryDotSelected: { borderWidth: 3, borderColor: '#ffffff' },
  categoryDotText: { color: '#ffffff', fontWeight: '700', fontSize: 17, fontFamily: fontText },
  categoryName: { fontSize: 11, color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontFamily: fontDisplay },

  numpadArea: { backgroundColor: 'rgba(255,255,255,0.05)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
});
