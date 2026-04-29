import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable, TouchableOpacity as GHTouchableOpacity, RectButton, ScrollView as GHScrollView } from 'react-native-gesture-handler';
import {
  X, Bell, Flame, Wallet, CheckCircle, Warning, Trash, Sparkle,
  WarningOctagon, Trophy, HeartBreak
} from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { generateNotifications, timeAgo, isToday, AppNotification } from '../features/notifications/notificationService';
import { fontText, fontDisplay, fontRounded } from '../theme/fonts';
import { TabNavigationContext } from '../navigation/navigationContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Map icon name strings to actual components
const ICON_MAP: Record<string, React.ComponentType<any>> = {
  AlertTriangle: Warning,
  AlertOctagon: WarningOctagon,
  Flame,
  Trophy,
  HeartCrack: HeartBreak,
  Sparkles: Sparkle,
  CheckCircle2: CheckCircle,
  Bell,
};

export default function NotificationsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { currency, isPro, isOnboarded, setLastNotificationViewedAt, dismissedNotificationIds, dismissNotification } = useAppSettingsStore();
  const tabNav = React.useContext(TabNavigationContext);
  const [notifications, setNotifications] = React.useState<AppNotification[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLastNotificationViewedAt(new Date().toISOString());
  }, []);

  React.useEffect(() => {
    if (user?.id) {
      loadNotifications();
    }
  }, [user?.id]);

  const loadNotifications = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const result = await generateNotifications(user.id, currency, isOnboarded, isPro);
      setNotifications(result);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const visibleItems = notifications.filter(
    (item) => !dismissedNotificationIds.includes(item.id)
  );

  // Section grouping
  const todayItems = visibleItems.filter((n) => isToday(n.timestamp));
  const earlierItems = visibleItems.filter((n) => !isToday(n.timestamp));

  const handleDismiss = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    dismissNotification(id);
  };

  const handlePress = (item: AppNotification) => {
    if (item.onPressTarget) {
      navigation.goBack();
      tabNav?.jumpToTab(item.onPressTarget);
    }
  };

  const renderIcon = (iconName: string, iconColor: string) => {
    const IconComponent = ICON_MAP[iconName] || Bell;
    return <IconComponent size={18} color={iconColor} />;
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
          <Trash size={22} color={colors.danger} />
        </Animated.View>
      </GHTouchableOpacity>
    );
  };

  const renderNotificationItem = (item: AppNotification) => {
    const isHighPriority =
      item.type === 'budget-exceeded' ||
      item.type === 'ai-anomaly' ||
      item.type === 'challenge-failed';

    return (
      <Swipeable
        key={item.id}
        renderRightActions={(progress) => renderRightActions(item.id, progress)}
        friction={1.5}
        rightThreshold={30}
        activeOffsetX={[-5, 5]}
        failOffsetY={[-5, 5]}
      >
        <RectButton
          onPress={() => handlePress(item)}
          rippleColor={colors.border}
          style={[
            styles.notificationItem,
            { backgroundColor: colors.card },
            isHighPriority && {
              borderLeftWidth: 3,
              borderLeftColor: item.iconColor,
            },
          ]}
        >
          <View
            style={[
              styles.iconWrapper,
              { backgroundColor: item.iconColor + '15' },
            ]}
          >
            {renderIcon(item.iconName, item.iconColor)}
          </View>
          <View style={styles.content}>
            <View style={styles.row}>
              <Text
                style={[styles.notifTitle, { color: colors.text }]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <Text style={[styles.timeText, { color: colors.textMuted }]}>
                {timeAgo(item.timestamp)}
              </Text>
            </View>
            <Text
              style={[styles.notifBody, { color: colors.textMuted }]}
              numberOfLines={2}
            >
              {item.body}
            </Text>
          </View>
        </RectButton>
      </Swipeable>
    );
  };

  const renderSection = (title: string, items: AppNotification[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
          {title}
        </Text>
        {items.map(renderNotificationItem)}
      </View>
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
        waitFor={Platform.OS === 'ios' ? [] : []}
      >
        {renderSection('Today', todayItems)}
        {renderSection('Earlier', earlierItems)}

        {visibleItems.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconWrap, { backgroundColor: colors.card }]}>
              <Bell size={36} color={colors.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              All caught up!
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              We'll notify you about budget alerts, streak milestones, and AI-powered spending insights here.
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
    fontFamily: fontDisplay,
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
  section: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
    marginLeft: 4,
    fontFamily: fontRounded,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 20,
    marginBottom: 10,
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
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: fontDisplay,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: fontText,
  },
});
