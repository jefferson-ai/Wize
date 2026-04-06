import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions, Alert } from 'react-native';
import { X, Plus, Target, Sparkles, TrendingUp, Info } from 'lucide-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthStore } from '../store/authStore';
import { getSavingGoals, getSavingsStrategies } from '../features/savings/savingsService';
import SavingBucket from '../components/SavingBucket';
import { useFocusEffect } from '@react-navigation/native';
import { formatAmount } from '../utils/formatters';
import { fontText } from '../theme/fonts';

const { width } = Dimensions.get('window');

export default function SavingsGoalsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  
  const [goals, setGoals] = useState<any[]>([]);
  const [strategies, setStrategies] = useState({ spareChange: 0, multiplier: 0, transactionCount: 0 });
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (user?.id) loadData();
    }, [user?.id])
  );

  const loadData = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [userGoals, userStrategies] = await Promise.all([
        getSavingGoals(user.id),
        getSavingsStrategies(user.id)
      ]);
      setGoals(userGoals);
      setStrategies(userStrategies);
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
          onPress={() => Alert.alert('Coming Soon', 'Create Goal feature is arriving shortly!')}
          style={[styles.addBtn, { backgroundColor: colors.text }]}
        >
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Dual Strategies Comparison */}
        <View style={styles.strategiesHeader}>
          <Text style={[styles.strategiesLabel, { color: colors.textMuted }]}>Saving Opportunity</Text>
          <Text style={[styles.strategiesTitle, { color: colors.text }]}>Which strategy fits you?</Text>
        </View>

        <View style={styles.strategiesContainer}>
          {/* Strategy A: Spare Change */}
          <View style={[
            styles.strategyCard, 
            { 
              backgroundColor: colors.isDark ? 'rgba(3, 105, 161, 0.15)' : '#f0f9ff', 
              borderColor: colors.isDark ? 'rgba(3, 105, 161, 0.3)' : '#bae6fd' 
            }
          ]}>
            <View style={[styles.strategyIconWrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#ffffff' }]}>
              <Sparkles size={18} color={colors.isDark ? '#7dd3fc' : '#0369a1'} />
            </View>
            <Text style={[styles.strategyLabel, { color: colors.isDark ? '#7dd3fc' : '#0369a1' }]}>Option A</Text>
            <Text style={[styles.strategyName, { color: colors.text }]}>Spare Change</Text>
            <Text style={[styles.strategyAmount, { color: colors.text }]}>GHS {formatAmount(strategies.spareChange)}</Text>
            <Text style={[styles.strategyDetail, { color: colors.textMuted }]}>Rounding up to nearest GHS 1.00 this month</Text>
          </View>

          {/* Strategy B: Multiplier */}
          <View style={[
            styles.strategyCard, 
            { 
              backgroundColor: colors.isDark ? 'rgba(162, 28, 175, 0.15)' : '#fdf4ff', 
              borderColor: colors.isDark ? 'rgba(162, 28, 175, 0.3)' : '#f5d0fe' 
            }
          ]}>
            <View style={[styles.strategyIconWrap, { backgroundColor: colors.isDark ? 'rgba(255,255,255,0.1)' : '#ffffff' }]}>
              <TrendingUp size={18} color={colors.isDark ? '#f0abfc' : '#a21caf'} />
            </View>
            <Text style={[styles.strategyLabel, { color: colors.isDark ? '#f0abfc' : '#a21caf' }]}>Option B</Text>
            <Text style={[styles.strategyName, { color: colors.text }]}>Steady Growth</Text>
            <Text style={[styles.strategyAmount, { color: colors.text }]}>GHS {formatAmount(strategies.multiplier)}</Text>
            <Text style={[styles.strategyDetail, { color: colors.textMuted }]}>Saving fixed GHS 2.00 per purchase this month</Text>
          </View>
        </View>

        <View style={[styles.statBox, { backgroundColor: colors.card }]}>
          <Info size={16} color={colors.textMuted} />
          <Text style={[styles.statText, { color: colors.textMuted }]}>
             Based on your {strategies.transactionCount} purchases this month
          </Text>
        </View>

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
                    <Target size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
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
            <TrendingUp size={20} color="#22c55e" />
          </View>
          <Text style={[styles.milestoneText, { color: colors.textMuted }]}>
            You've saved <Text style={{ color: colors.text, fontWeight: '700' }}>GHS 340.00</Text> across all goals this month!
          </Text>
        </View>

      </ScrollView>
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
  strategiesHeader: {
    marginTop: 10,
    marginBottom: 16,
  },
  strategiesLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  strategiesTitle: {
    fontSize: 22,
    fontWeight: '800',
    fontFamily: fontText,
  },
  strategiesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  strategyCard: {
    width: (width - 50) / 2,
    padding: 16,
    borderRadius: 24,
    borderWidth: 1,
  },
  strategyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  strategyLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  strategyName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fontText,
    marginBottom: 8,
  },
  strategyAmount: {
    fontSize: 20,
    fontWeight: '800',
    fontFamily: fontText,
    marginBottom: 8,
  },
  strategyDetail: {
    fontSize: 10,
    lineHeight: 14,
    fontFamily: fontText,
  },
  statBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    marginBottom: 30,
    gap: 8,
  },
  statText: {
    fontSize: 11,
    fontFamily: fontText,
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
