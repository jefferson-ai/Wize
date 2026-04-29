import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Crosshair, Sparkle, TrendUp, Info } from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getSavingGoals } from '../features/savings/savingsService';
import SavingBucket from '../components/SavingBucket';
import UpgradeModal from '../components/UpgradeModal';
import { useFocusEffect } from '@react-navigation/native';
import { formatAmount } from '../utils/formatters';
import { fontText } from '../theme/fonts';

const { width } = Dimensions.get('window');

export default function SavingsGoalsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { isPro } = useAppSettingsStore();
  
  const [goals, setGoals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleAddGoal = () => {
    if (!isPro && goals.length >= 1) {
      setShowUpgrade(true);
    } else {
      navigation.navigate('AddSavingGoal');
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadData();
    }, [user?.id])
  );

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const userGoals = await getSavingGoals(user.id);
      setGoals(userGoals);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { backgroundColor: colors.card }]}
        >
          <X size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Savings & Goals</Text>
        <TouchableOpacity 
          onPress={handleAddGoal}
          style={[styles.addBtn, { backgroundColor: colors.text }]}
        >
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        

        {/* Goals Grid */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Goals</Text>
          <Text style={[styles.goalCount, { color: colors.textMuted }]}>{goals.length} target(s)</Text>
        </View>

        {goals.length > 0 ? (
          <View style={styles.goalsGrid}>
            {goals.map((goal) => (
              <TouchableOpacity 
                key={goal.id} 
                activeOpacity={0.8}
                style={[styles.goalCard, { backgroundColor: colors.card }]}
              >
                <View style={styles.goalBucketWrap}>
                  <SavingBucket 
                    name={goal.name}
                    target={goal.targetAmount}
                    current={goal.currentAmount}
                    color={goal.color}
                    size="large"
                  />
                </View>
                <View style={styles.goalInfo}>
                  <View style={styles.targetRow}>
                    <Crosshair size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={[styles.targetText, { color: colors.textMuted }]}>Target: GHS {formatAmount(goal.targetAmount)}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyGoals, { backgroundColor: colors.card }]}>
            <Info size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.text }]}>No financial goals yet</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              Track specific items like a "New Car" or "Emergency Fund" and fill your buckets!
            </Text>
            <TouchableOpacity 
               onPress={() => Alert.alert('Tip', 'SpendWise automatically tracks your progress once you create goals!')}
               style={styles.learnMoreBtn}
            >
              <Text style={[styles.learnMoreText, { color: colors.primary }]}>How it works</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.milestoneBox}>
          <View style={[styles.milestoneIcon, { backgroundColor: colors.accentGreenBg }]}>
            <TrendUp size={20} color="#22c55e" />
          </View>
          <Text style={[styles.milestoneText, { color: colors.textMuted }]}>
            You've saved <Text style={{ color: colors.text, fontWeight: '700' }}>GHS 340.00</Text> across all goals this month!
          </Text>
        </View>

      </ScrollView>
      <UpgradeModal
        visible={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureTitle="Unlimited Savings Goals"
        featureDescription="Free plan includes 1 savings goal. Upgrade to Pro for unlimited bucket goals."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    fontFamily: fontText,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: fontText,
  },
  goalCount: {
    fontSize: 13,
    fontFamily: fontText,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  goalCard: {
    width: (width - 60) / 2,
    padding: 20,
    borderRadius: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  goalBucketWrap: {
    marginVertical: 10,
  },
  goalInfo: {
    marginTop: 10,
    alignItems: 'center',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targetText: {
    fontSize: 10,
    fontFamily: fontText, fontWeight: '500',
  },
  emptyGoals: {
    padding: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 14,
    marginBottom: 6,
    fontFamily: fontText,
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: fontText,
  },
  learnMoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontText,
  },
  milestoneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    padding: 16,
  },
  milestoneIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  milestoneText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
    fontFamily: fontText,
  },
});
