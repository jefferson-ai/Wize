import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Target, TrendingUp, ShieldAlert, BadgeCheck } from 'lucide-react-native';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { useThemeColors } from '../../hooks/useThemeColors';
import { OnboardingStackScreenProps } from '../../navigation/types';
import { fontDisplay, fontText } from '../../theme/fonts';

const STRATEGIES = [
  {
    id: 'steady',
    title: 'Steady Growth',
    description: 'Focus on consistent long-term savings through strict budgeting.',
    icon: TrendingUp,
    color: '#8b5cf6', // purple
  },
  {
    id: 'aggressive',
    title: 'Aggressive Debt Payoff',
    description: 'Allocate maximum funds towards resolving outstanding balances.',
    icon: Target,
    color: '#ef4444', // red
  },
  {
    id: 'safety',
    title: 'Emergency Padding',
    description: 'Build a safety net of 3-6 months of essential living expenses.',
    icon: ShieldAlert,
    color: '#eab308', // yellow
  },
];

export default function FinancialGoalsSetupScreen({ navigation }: OnboardingStackScreenProps<'FinancialGoalsSetup'>) {
  const { setOnboarded } = useAppSettingsStore();
  const colors = useThemeColors();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);

  const handleFinish = () => {
    if (selectedStrategy) {
      // Logic to initialize the strategy in the hub would go here globally
    }
    setOnboarded(true);
  };

  const handleSkip = () => {
    setOnboarded(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Primary Financial Focus</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Select a core strategy for your Planning Hub. We'll tailor your insights to help you get there.
          </Text>
        </View>

        <View style={styles.strategiesContainer}>
          {STRATEGIES.map((strategy) => {
            const isSelected = selectedStrategy === strategy.id;
            return (
              <TouchableOpacity
                key={strategy.id}
                onPress={() => setSelectedStrategy(strategy.id)}
                style={[
                  styles.strategyCard, 
                  { backgroundColor: colors.card, borderColor: isSelected ? colors.primary : colors.border }
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.strategyLeft}>
                  <View style={[styles.iconBox, { backgroundColor: colors.isDark ? colors.border : strategy.color + '1a' }]}>
                    <strategy.icon size={22} color={strategy.color} />
                  </View>
                  <View style={styles.strategyText}>
                    <Text style={[styles.strategyTitle, { color: colors.text }]}>{strategy.title}</Text>
                    <Text style={[styles.strategyDesc, { color: colors.textMuted }]}>{strategy.description}</Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary }]}>
                     <BadgeCheck size={16} color={colors.background} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.text, opacity: selectedStrategy ? 1 : 0.5 }]}
            onPress={handleFinish}
            disabled={!selectedStrategy}
          >
            <Text style={[styles.primaryButtonText, { color: colors.background }]}>Finish Setup</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
          >
            <Text style={[styles.skipButtonText, { color: colors.textMuted }]}>
              I'll decide later
            </Text>
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
    marginBottom: 32,
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
  strategiesContainer: {
    gap: 16,
  },
  strategyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  strategyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  strategyText: {
    flex: 1,
    paddingRight: 12,
  },
  strategyTitle: {
    fontSize: 16,
    fontFamily: fontText,
    fontWeight: '600',
    marginBottom: 4,
  },
  strategyDesc: {
    fontSize: 14,
    fontFamily: fontText,
    fontWeight: '400',
    lineHeight: 20,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 16,
    paddingTop: 24,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 17,
    fontFamily: fontDisplay,
    fontWeight: '700',
  },
  skipButton: {
    width: '100%',
    paddingVertical: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 15,
    fontFamily: fontText, fontWeight: '500',
  },
});
