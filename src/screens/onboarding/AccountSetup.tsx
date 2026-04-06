import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Platform, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Landmark, CreditCard, Wallet, Check } from 'lucide-react-native';
import { OnboardingStackScreenProps } from '../../navigation/types';
import { createAccount } from '../../features/accounts/accountService';
import { useAuthStore } from '../../store/authStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontDisplay, fontText, fontRounded } from '../../theme/fonts';

const ACCOUNT_TYPES = [
  { id: 'bank', label: 'Bank Account', icon: Landmark },
  { id: 'credit', label: 'Credit Card', icon: CreditCard },
  { id: 'cash', label: 'Cash / Wallet', icon: Wallet },
];

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#212529'];

export default function AccountSetupScreen({ navigation }: OnboardingStackScreenProps<'AccountSetup'>) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();

  const [name, setName] = useState('');
  const [type, setType] = useState<'bank' | 'credit' | 'cash'>('bank');
  const [balance, setBalance] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [loading, setLoading] = useState(false);

  const handleNext = async () => {
    if (!name.trim()) return Alert.alert('Action Required', 'Please provide an account name (e.g., Chase Checkings)');
    if (!user?.id) return;

    setLoading(true);
    try {
      await createAccount({
        userId: user.id,
        name: name.trim(),
        type,
        balance: parseFloat(balance) || 0,
        currency,
        color: selectedColor,
        icon: type === 'bank' ? 'Landmark' : type === 'credit' ? 'CreditCard' : 'Wallet',
      });
      navigation.navigate('FinancialGoalsSetup');
    } catch {
      Alert.alert('Error', 'Failed to save account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Create Your First Wallet</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>Let's set up your primary account so we can start tracking your balance.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* Starting Balance */}
          <View style={styles.amountArea}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted, textAlign: 'center' }]}>Current Balance</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencySymbol, { color: colors.textMuted }]}>{currency}</Text>
              <TextInput
                style={[styles.amountInput, { color: colors.text }]}
                value={balance}
                onChangeText={setBalance}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Account Name */}
          <View style={styles.inputGroup}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Wallet Name</Text>
            <TextInput
              style={[styles.nameInput, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
              placeholder="e.g. Daily Spending"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Type Select */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 12 }]}>Wallet Type</Text>
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

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.text, opacity: loading ? 0.7 : 1 }]}
            onPress={handleNext}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <Text style={[styles.primaryButtonText, { color: colors.background }]}>Set up Account & Continue</Text>
            )}
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontFamily: fontDisplay,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fontText,
    fontWeight: '500',
    lineHeight: 22,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  amountArea: { 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  amountRow: { 
    flexDirection: 'row', 
    alignItems: 'baseline' 
  },
  currencySymbol: { 
    fontSize: 32, 
    fontWeight: '700', 
    marginRight: 6, 
    fontFamily: fontDisplay 
  },
  amountInput: { 
    fontSize: 56, 
    fontWeight: '700', 
    minWidth: 60, 
    fontFamily: fontDisplay 
  } as any,
  divider: { 
    height: 1, 
    marginBottom: 20 
  },
  sectionLabel: { 
    fontSize: 11, 
    fontWeight: '700', 
    textTransform: 'uppercase', 
    letterSpacing: 0.6, 
    marginBottom: 8, 
    fontFamily: fontRounded 
  },
  inputGroup: { 
    marginBottom: 20 
  },
  nameInput: { 
    fontSize: 16, 
    fontWeight: '500', 
    fontFamily: fontText,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  typeGrid: { 
    flexDirection: 'row', 
    gap: 10 
  },
  typeItem: { 
    flex: 1, 
    padding: 14, 
    borderRadius: 16, 
    borderWidth: 1, 
    alignItems: 'center', 
    gap: 8 
  },
  typeText: { 
    fontSize: 12, 
    fontWeight: '700', 
    fontFamily: fontText 
  },
  colorGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12 
  },
  colorCircle: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  selectedCircle: { 
    borderWidth: 2, 
    borderColor: '#fff' 
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    height: 58,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: fontDisplay,
    fontWeight: '700',
  },
});
