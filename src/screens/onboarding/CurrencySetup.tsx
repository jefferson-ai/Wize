import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check } from 'phosphor-react-native';
import { OnboardingStackScreenProps } from '../../navigation/types';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontDisplay, fontText } from '../../theme/fonts';

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'GHS', symbol: '₵', name: 'Ghana Cedi' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound' },
];

export default function CurrencySetupScreen({ navigation }: OnboardingStackScreenProps<'CurrencySetup'>) {
  const { currency, setCurrency } = useAppSettingsStore();
  const colors = useThemeColors();
  const [selectedCurrency, setSelectedCurrency] = useState(currency || 'USD');

  const handleNext = () => {
    setCurrency(selectedCurrency);
    navigation.navigate('AccountSetup');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Choose Your Currency
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            This will be the main currency used for all your transactions and budgets.
          </Text>
        </View>

        <FlatList
          data={CURRENCIES}
          keyExtractor={(item) => item.code}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => {
            const isSelected = selectedCurrency === item.code;
            const borderColor = isSelected ? colors.success : colors.border;
            const bgColor = isSelected ? (colors.isDark ? 'rgba(34, 197, 94, 0.1)' : '#f0fdf4') : colors.card;
            
            return (
              <TouchableOpacity
                onPress={() => setSelectedCurrency(item.code)}
                style={[styles.currencyCard, { backgroundColor: bgColor, borderColor }]}
                activeOpacity={0.7}
              >
                <View style={[styles.symbolBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Text style={[styles.symbolText, { color: colors.text }]}>
                    {item.symbol}
                  </Text>
                </View>
                <View style={styles.currencyText}>
                  <Text style={[styles.codeText, { color: isSelected ? colors.success : colors.text }]}>
                    {item.code}
                  </Text>
                  <Text style={[styles.nameText, { color: colors.textMuted }]}>
                    {item.name}
                  </Text>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.success }]}>
                    <Check size={14} color="#ffffff" weight="bold" />
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.text }]}
            onPress={handleNext}
          >
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontFamily: fontDisplay,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: fontText,
    fontWeight: '400',
    lineHeight: 24,
  },
  currencyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  symbolBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  symbolText: {
    fontSize: 20,
    fontFamily: fontDisplay,
    fontWeight: '600',
  },
  currencyText: {
    flex: 1,
  },
  codeText: {
    fontSize: 18,
    fontFamily: fontDisplay,
    fontWeight: '600',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 14,
    fontFamily: fontText, fontWeight: '500',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 16,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: fontDisplay,
    fontWeight: '700',
  },
});
