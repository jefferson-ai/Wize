import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { Swipeable, TouchableOpacity as GHTouchableOpacity, RectButton, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { X, Bell, Flame, Wallet, CheckCircle2, AlertTriangle, Trash2, Sparkles } from 'lucide-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getSmartInsights } from '../features/ai/aiService';
import { formatAmount } from '../utils/formatters';
import { fontText } from '../theme/fonts';
import { TabNavigationContext } from '../navigation/navigationContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function NotificationsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { currency, setLastNotificationViewedAt, dismissedNotificationIds, dismissNotification } = useAppSettingsStore();
  const tabNav = React.useContext(TabNavigationContext);
  const [aiNotifications, setAiNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Mark as viewed on mount
    setLastNotificationViewedAt(new Date().toISOString());
  }, []);

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
  ]);

  React.useEffect(() => {
    if (user?.id) {
      loadAiInsights();
    }
  }, [user?.id]);

  const loadAiInsights = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await getSmartInsights(user.id);
      const newAiNotifs: any[] = [];

      // Map Anomalies
      res.anomalies.forEach(a => {
        newAiNotifs.push({
          id: a.id,
          type: 'ai-insight',
          title: 'Spending Spike 🚨',
          body: `AI detected a spike in ${a.categoryName}. Spending is up by ${a.increasePercentage}% this week.`,
          time: 'Now',
          icon: <Sparkles size={18} color="#8b5cf6" />,
          color: '#8b5cf6',
          onPress: () => {
            navigation.goBack();
            tabNav?.jumpToTab('Planning');
          }
        });
      });

      // Map Recommended Challenge
      if (res.recommendedChallenge) {
        const rc = res.recommendedChallenge;
        newAiNotifs.push({
          id: rc.id,
          type: 'ai-insight',
          title: 'New Savings Challenge ✨',
          body: rc.description,
          time: 'New',
          icon: <Sparkles size={18} color="#6366f1" />,
          color: '#6366f1',
          onPress: () => {
            navigation.goBack();
            tabNav?.jumpToTab('Planning');
          }
        });
      }

      setAiNotifications(newAiNotifs);
    } catch (err) {
      console.error('Failed to load AI insights for notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const allItems = [...aiNotifications, ...items].filter(item => !dismissedNotificationIds.includes(item.id));

  const handleDismiss = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dismissNotification(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const renderRightActions = (id: string, progress: any) => {
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
    });

    return (
      <GHTouchableOpacity 
        activeOpacity={0.6}
        onPress={() => handleDismiss(id)}
        style={[styles.deleteAction, { backgroundColor: colors.dangerBg }]}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash2 size={22} color={colors.danger} />
        </Animated.View>
      </GHTouchableOpacity>
    );
  };

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

      <GHScrollView 
        contentContainerStyle={styles.scrollContent}
        waitFor={Platform.OS === 'ios' ? [] : []} // Can be used to sync with other gestures if needed
      >
        {allItems.map((item, index) => (
          <Swipeable
            key={item.id}
            renderRightActions={(progress) => renderRightActions(item.id, progress)}
            friction={1.5}
            rightThreshold={30}
            activeOffsetX={[-5, 5]} // Capture horizontal movement immediately
            failOffsetY={[-5, 5]}   // Fail swipe if vertical movement starts first
          >
            <RectButton 
              onPress={item.onPress}
              rippleColor={colors.border}
              style={[
                styles.notificationItem, 
                { backgroundColor: colors.card },
                (item.type === 'ai-insight' || index === 0) && { borderLeftWidth: 3, borderLeftColor: item.color || colors.primary }
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
            </RectButton>
          </Swipeable>
        ))}

        {allItems.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Bell size={48} color={colors.textMuted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No new notifications</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              We'll notify you about budget alerts and streak milestones here.
            </Text>
          </View>
        )}
      </GHScrollView>
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
