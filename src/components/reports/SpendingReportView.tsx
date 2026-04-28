import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, Switch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { BarChart } from 'react-native-gifted-charts';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAuthStore } from '../../store/authStore';
import { useAppSettingsStore } from '../../store/appSettingsStore';
import { getSpendingReport } from '../../features/transactions/transactionService';
import { ArrowUpRight, ArrowDownRight, BellRinging, Bell } from 'phosphor-react-native';
import CategoryIcon from '../CategoryIcon';
import { scheduleReportNotifications, cancelReportNotifications, sendTestNotification } from '../../features/notifications/pushService';

export default function SpendingReportView() {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { currency, reportNotifications, setReportNotifications } = useAppSettingsStore();
  
  const [period, setPeriod] = useState<'weekly' | 'monthly'>('weekly');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      setLoading(true);
      getSpendingReport(user.id, period).then(data => {
        setReport(data);
        setLoading(false);
      });
    }
  }, [period, user?.id]);

  if (loading || !report) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.text} />
      </View>
    );
  }

  const toggleNotifications = async (value: boolean) => {
    if (value) {
      const success = await scheduleReportNotifications();
      if (success) {
        setReportNotifications(true);
        Alert.alert('Notifications Enabled', 'You will receive a notification when your reports are ready.');
      } else {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
        setReportNotifications(false);
      }
    } else {
      await cancelReportNotifications();
      setReportNotifications(false);
    }
  };

  const isPositiveChange = report.percentageChange > 0;
  const changeColor = isPositiveChange ? colors.danger : colors.success;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      {/* Header and Toggle */}
      <Animated.View entering={FadeInDown.duration(400)} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
         <Text style={{ fontSize: 24, fontWeight: '700', color: colors.text }}>Spending Reports</Text>
         <TouchableOpacity 
           style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: reportNotifications ? colors.successBg : colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}
           onPress={() => toggleNotifications(!reportNotifications)}
         >
           {reportNotifications ? <BellRinging size={18} color={colors.success} weight="fill" /> : <Bell size={18} color={colors.textMuted} />}
           <Text style={{ marginLeft: 6, fontSize: 13, fontWeight: '600', color: reportNotifications ? colors.success : colors.textMuted }}>
             {reportNotifications ? 'Enabled' : 'Notify Me'}
           </Text>
         </TouchableOpacity>

         {reportNotifications && (
           <TouchableOpacity 
             style={{ marginLeft: 8, backgroundColor: colors.border, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 }}
             onPress={() => sendTestNotification()}
           >
             <Text style={{ fontSize: 13, fontWeight: '600', color: colors.text }}>Test</Text>
           </TouchableOpacity>
         )}
      </Animated.View>

      {/* Toggle */}
      <Animated.View entering={FadeInDown.delay(80).duration(400)} style={[styles.toggleContainer, { backgroundColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => setPeriod('weekly')}
          style={[styles.toggleBtn, period === 'weekly' && { backgroundColor: colors.card }]}
        >
          <Text style={[styles.toggleText, { color: period === 'weekly' ? colors.text : colors.textMuted }]}>Weekly</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => setPeriod('monthly')}
          style={[styles.toggleBtn, period === 'monthly' && { backgroundColor: colors.card }]}
        >
          <Text style={[styles.toggleText, { color: period === 'monthly' ? colors.text : colors.textMuted }]}>Monthly</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Summary + Chart Card */}
      <Animated.View entering={FadeInDown.delay(160).duration(500)} style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Total Spent</Text>
        <Text style={[styles.summaryAmount, { color: colors.text }]}>
          {currency} {report.currentTotal.toLocaleString()}
        </Text>
        
        <View style={styles.trendRow}>
          <View style={[styles.trendBadge, { backgroundColor: changeColor + '20' }]}>
             {isPositiveChange ? <ArrowUpRight size={14} color={changeColor} /> : <ArrowDownRight size={14} color={changeColor} />}
             <Text style={[styles.trendText, { color: changeColor }]}>
               {Math.abs(report.percentageChange).toFixed(1)}%
             </Text>
          </View>
          <Text style={[styles.trendDesc, { color: colors.textMuted }]}>
             vs previous {period === 'weekly' ? 'week' : 'month'} ({currency} {report.previousTotal.toLocaleString()})
          </Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 14 }} />

        <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 10 }]}>Spending Trend</Text>
        <BarChart
          data={report.chartData.map((d: any) => ({
            value: d.value,
            label: d.label,
            frontColor: d.value > 0 ? colors.text : colors.border,
          }))}
          barWidth={period === 'weekly' ? 28 : 24}
          spacing={period === 'weekly' ? 18 : 24}
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={{ color: colors.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: colors.textMuted, fontSize: 11 }}
          noOfSections={3}
          height={120}
          maxValue={Math.max(...report.chartData.map((d: any) => d.value)) * 1.2 || 100}
          initialSpacing={16}
          endSpacing={16}
          isAnimated
          animationDuration={600}
        />
      </Animated.View>

      {/* Top Categories */}
      <View style={styles.categoriesContainer}>
        <Animated.Text entering={FadeInDown.delay(240).duration(400)} style={[styles.sectionTitle, { color: colors.text, marginBottom: 16 }]}>Top Categories</Animated.Text>
        {report.topCategories.length === 0 ? (
           <Text style={{ color: colors.textMuted, marginTop: 12 }}>No spending in this period.</Text>
        ) : (
          report.topCategories.map((cat: any, index: number) => (
            <Animated.View key={index} entering={FadeInDown.delay(300 + index * 60).duration(400)} style={[styles.categoryRow, { backgroundColor: colors.card }]}>
               <View style={[styles.catIcon, { backgroundColor: cat.color + '20' }]}>
                 <CategoryIcon categoryName={cat.name} size={20} color={cat.color} />
               </View>
               <Text style={[styles.catName, { color: colors.text }]}>{cat.name}</Text>
               <Text style={[styles.catAmount, { color: colors.text }]}>
                 {currency} {cat.amount.toLocaleString()}
               </Text>
            </Animated.View>
          ))
        )}
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  toggleContainer: { flexDirection: 'row', borderRadius: 20, padding: 4, marginTop: 16, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 16 },
  toggleText: { fontSize: 14, fontWeight: '600' },
  
  summaryCard: { padding: 16, borderRadius: 24, marginBottom: 24 },
  summaryLabel: { fontSize: 13, fontWeight: '500', marginBottom: 4 },
  summaryAmount: { fontSize: 28, fontWeight: '800', marginBottom: 10 },
  trendRow: { flexDirection: 'row', alignItems: 'center' },
  trendBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8 },
  trendText: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
  trendDesc: { fontSize: 13 },

  sectionTitle: { fontSize: 18, fontWeight: '700' },

  categoriesContainer: { marginBottom: 24 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 20, marginBottom: 12 },
  catIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  catName: { flex: 1, fontSize: 16, fontWeight: '600' },
  catAmount: { fontSize: 16, fontWeight: '700' }
});
