import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { X, Bell, Flame, Wallet, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatAmount } from '../utils/formatters';
import { fontText } from '../theme/fonts';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function NotificationsScreen({ navigation }: any) {
  const colors = useThemeColors();

  // Mock Notifications State
  const [items, setItems] = React.useState([
    {
      id: '1',
      type: 'streak',
      title: '7-Day Streak! 🔥',
      body: 'Incredible consistency! You\'ve logged your expenses for 7 days straight. Keep it up!',
      time: '2h ago',
      icon: <Flame size={18} color="#f97316" />,
      color: '#f97316',
    },
    {
      id: '2',
      type: 'budget',
      title: 'Budget Alert: Food & Dining',
      body: 'You have used 92% of your Food budget. You have GHS 45.00 remaining for the month.',
      time: '5h ago',
      icon: <AlertTriangle size={18} color="#eab308" />,
      color: '#eab308',
    },
    {
      id: '3',
      type: 'system',
      title: 'Welcome to SpendWise!',
      body: 'Start tracking your expenses daily to build a healthy financial habit.',
      time: 'Yesterday',
      icon: <CheckCircle2 size={18} color="#22c55e" />,
      color: '#22c55e',
    },
    {
      id: '4',
      type: 'wallet',
      title: 'Weekly Summary Ready',
      body: 'Your spending summary for last week is now available in the Insights tab.',
      time: '2d ago',
      icon: <Wallet size={18} color="#3b82f6" />,
      color: '#3b82f6',
    },
  ]);

  const handleDismiss = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const renderRightActions = (id: string) => (
    <View style={[styles.deleteAction, { backgroundColor: colors.dangerBg }]}>
      <Trash2 size={20} color={colors.danger} />
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Activity</Text>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { backgroundColor: colors.card }]}
        >
          <X size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {items.map((item, index) => (
          <Swipeable
            key={item.id}
            renderRightActions={() => renderRightActions(item.id)}
            onSwipeableOpen={() => handleDismiss(item.id)}
            friction={2}
            rightThreshold={80}
          >
            <TouchableOpacity 
              activeOpacity={0.8}
              style={[
                styles.notificationItem, 
                { backgroundColor: colors.card },
                index === 0 && { borderLeftWidth: 3, borderLeftColor: colors.primary }
              ]}
            >
              <View style={[styles.iconWrapper, { backgroundColor: item.color + '15' }]}>
                {item.icon}
              </View>
              <View style={styles.content}>
                <View style={styles.row}>
                  <Text style={[styles.notifTitle, { color: colors.text }]}>{item.title}</Text>
                  <Text style={[styles.timeText, { color: colors.textMuted }]}>{item.time}</Text>
                </View>
                <Text style={[styles.notifBody, { color: colors.textMuted }]} numberOfLines={2}>
                  {item.body}
                </Text>
              </View>
            </TouchableOpacity>
          </Swipeable>
        ))}

        {items.length === 0 && (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No new notifications</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              We'll notify you about budget alerts and streak milestones here.
            </Text>
          </View>
        )}
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: fontText,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(154, 162, 173, 0.15)',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  notifTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontText,
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    fontSize: 11,
    fontFamily: fontText,
  },
  notifBody: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: fontText,
  },
  deleteAction: {
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '84%',
    borderRadius: 20,
    marginVertical: 0,
    marginLeft: 10,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fontText,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontText,
  },
});
