import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  NavigationPositionContext,
  HeaderMorphContext,
  type HeaderMorphState,
  HeaderProvider,
  StationaryMorphingHeader,
} from '../components/AnimatedHeader';
import { TabNavigationContext } from './navigationContext';
import { useThemeColors } from '../hooks/useThemeColors';

import HomeScreen from '../screens/Home';
import AddTransactionScreen from '../screens/AddTransaction';
import InsightsScreen from '../screens/Insights';
import SettingsScreen from '../screens/Settings';
import TransactionHistoryScreen from '../screens/TransactionHistory';
import AddBudgetScreen from '../screens/AddBudget';
import EditBudgetScreen from '../screens/EditBudget';
import EditTransactionScreen from '../screens/EditTransaction';
import NotificationsScreen from '../screens/Notifications';
import SavingsGoalsScreen from '../screens/SavingsGoals';
import AddSavingGoalScreen from '../screens/AddSavingGoal';
import AccountsListScreen from '../screens/AccountsList';
import AddAccountScreen from '../screens/AddAccount';
import SearchTransactionsScreen from '../screens/SearchTransactionsScreen';

import CustomTabBar from '../components/CustomTabBar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/** Duration of the shrink/grow transition in ms */
const TRANSITION_MS = 300;
/** Scale factor for shrunk screens */
const SCALE_MIN = 0.93;
/** Swipe distance threshold */
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;
/** Number of tab screens */
const TAB_COUNT = 4;

/**
 * Each screen layer is always mounted. Its animated style is driven by shared values:
 * - If it's the active screen (activeIdx matches): opacity 1, scale 1
 * - If it's the outgoing screen during transition: fades/shrinks out
 * - Otherwise: hidden (opacity 0)
 */
function ScreenLayer({
  screenIdx,
  activeIdx,
  prevIdx,
  progress,
  transitioning,
  navigation,
  Screen,
}: {
  screenIdx: number;
  activeIdx: Animated.SharedValue<number>;
  prevIdx: Animated.SharedValue<number>;
  progress: Animated.SharedValue<number>;
  transitioning: Animated.SharedValue<boolean>;
  navigation: any;
  Screen: React.ComponentType<any>;
}) {
  const animatedStyle = useAnimatedStyle(() => {
    const isActive = activeIdx.value === screenIdx;
    const isPrev = prevIdx.value === screenIdx;

    if (transitioning.value) {
      if (isActive) {
        // Incoming: grow from SCALE_MIN → 1, fade in
        const t = progress.value;
        return {
          opacity: t,
          transform: [{ scale: SCALE_MIN + (1 - SCALE_MIN) * t }],
          zIndex: 2,
        };
      }
      if (isPrev) {
        // Outgoing: shrink from 1 → SCALE_MIN, fade out
        const t = progress.value;
        return {
          opacity: 1 - t,
          transform: [{ scale: 1 - (1 - SCALE_MIN) * t }],
          zIndex: 1,
        };
      }
      // Not involved in this transition
      return { opacity: 0, transform: [{ scale: SCALE_MIN }], zIndex: 0 };
    }

    // Settled state
    if (isActive) {
      return { opacity: 1, transform: [{ scale: 1 }], zIndex: 2 };
    }
    return { opacity: 0, transform: [{ scale: SCALE_MIN }], zIndex: 0 };
  });

  // Pointer events: only the active screen should be interactive
  const isActive = useDerivedValue(() => activeIdx.value === screenIdx);
  const pointerStyle = useAnimatedStyle(() => ({
    pointerEvents: isActive.value ? 'auto' as const : 'none' as const,
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, animatedStyle]}>
      <Animated.View style={[{ flex: 1 }, pointerStyle]}>
        <Screen navigation={navigation} />
      </Animated.View>
    </Animated.View>
  );
}

const SCREENS = [
  { Screen: HomeScreen, key: 'home' },
  { Screen: TransactionHistoryScreen, key: 'transactions' },
  { Screen: InsightsScreen, key: 'insights' },
  { Screen: SettingsScreen, key: 'settings' },
];

function TabNavigator({
  navigation,
  onTabPress,
  onSwipe,
  position,
  index,
  activeIdx,
  prevIdx,
  transitionProgress,
  isTransitioning,
}: any) {
  const colors = useThemeColors();

  const state = {
    index: index,
    routes: [
      { key: 'home', name: 'Home' },
      { key: 'transactions', name: 'Transactions' },
      { key: 'planning', name: 'Planning' },
      { key: 'account', name: 'Account' },
    ],
  };

  // Horizontal swipe gesture
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onEnd((event) => {
      'worklet';
      if (isTransitioning.value) return;
      const { translationX, velocityX } = event;
      if (translationX < -SWIPE_THRESHOLD || velocityX < -800) {
        runOnJS(onSwipe)(1);
      } else if (translationX > SWIPE_THRESHOLD || velocityX > 800) {
        runOnJS(onSwipe)(-1);
      }
    });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StationaryMorphingHeader />

      <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1 }}>
          {SCREENS.map((item, idx) => (
            <ScreenLayer
              key={item.key}
              screenIdx={idx}
              activeIdx={activeIdx}
              prevIdx={prevIdx}
              progress={transitionProgress}
              transitioning={isTransitioning}
              navigation={navigation}
              Screen={item.Screen}
            />
          ))}
        </View>
      </GestureDetector>

      <CustomTabBar
        state={state}
        navigation={navigation}
        position={position}
        onTabPress={onTabPress}
      />
    </View>
  );
}

const AppStack = createNativeStackNavigator();

export default function MainNavigator() {
  const colors = useThemeColors();
  const position = useSharedValue(0);
  const morphActive = useSharedValue(0);
  const morphFrom = useSharedValue(0);
  const morphTo = useSharedValue(0);
  const morphProgress = useSharedValue(0);
  const transitionProgress = useSharedValue(0);
  const isTransitioning = useSharedValue(false);
  const activeIdx = useSharedValue(0);
  const prevIdx = useSharedValue(0);

  const headerMorphRef = React.useRef<HeaderMorphState | null>(null);
  if (!headerMorphRef.current) {
    headerMorphRef.current = {
      active: morphActive,
      fromIdx: morphFrom,
      toIdx: morphTo,
      progress: morphProgress,
    };
  }

  // React state only for the tab bar indicator (doesn't affect screen rendering)
  const [tabIndex, setTabIndex] = React.useState(0);

  /** Core transition — runs entirely on the UI thread via shared values */
  const transitionTo = React.useCallback((targetIdx: number) => {
    if (targetIdx < 0 || targetIdx >= TAB_COUNT) return;
    if (targetIdx === activeIdx.value) return;

    // Set up the transition
    prevIdx.value = activeIdx.value;
    activeIdx.value = targetIdx;

    // Header morph
    morphFrom.value = prevIdx.value;
    morphTo.value = targetIdx;
    morphProgress.value = 0;
    morphActive.value = 1;

    // Start the animation
    isTransitioning.value = true;
    transitionProgress.value = 0;

    // Animate header position
    position.value = withTiming(targetIdx, {
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });

    // Animate header morph
    morphProgress.value = withTiming(1, {
      duration: TRANSITION_MS,
      easing: Easing.out(Easing.cubic),
    });

    // Animate screen transition
    transitionProgress.value = withTiming(
      1,
      {
        duration: TRANSITION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (finished) {
          isTransitioning.value = false;
          morphActive.value = 0;
        }
      }
    );

    // Update tab bar indicator (React state, non-blocking)
    setTabIndex(targetIdx);
  }, []);

  const onTabPress = React.useCallback((i: number) => {
    transitionTo(i);
  }, [transitionTo]);

  const onSwipe = React.useCallback((direction: number) => {
    const target = activeIdx.value + direction;
    transitionTo(target);
  }, [transitionTo]);

  const jumpToTab = React.useCallback((name: string) => {
    const tabNames: Record<string, number> = { 'Home': 0, 'Transactions': 1, 'Planning': 2, 'Account': 3 };
    const targetIdx = tabNames[name];
    if (targetIdx !== undefined) {
      transitionTo(targetIdx);
    }
  }, [transitionTo]);

  return (
    <NavigationPositionContext.Provider value={position}>
      <HeaderMorphContext.Provider value={headerMorphRef.current}>
      <TabNavigationContext.Provider value={{ jumpToTab }}>
        <HeaderProvider>
          <AppStack.Navigator
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <AppStack.Screen name="Tabs">
              {(props) => (
                <TabNavigator
                  {...props}
                  onTabPress={onTabPress}
                  onSwipe={onSwipe}
                  position={position}
                  index={tabIndex}
                  activeIdx={activeIdx}
                  prevIdx={prevIdx}
                  transitionProgress={transitionProgress}
                  isTransitioning={isTransitioning}
                />
              )}
            </AppStack.Screen>
            <AppStack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
              options={{ presentation: 'modal' }}
            />
            <AppStack.Screen
              name="AddBudget"
              component={AddBudgetScreen}
              options={{ presentation: 'modal' }}
            />
            <AppStack.Screen
              name="EditBudget"
              component={EditBudgetScreen}
              options={{ presentation: 'modal' }}
            />
            <AppStack.Screen
              name="TransactionHistory"
              component={TransactionHistoryScreen}
            />
            <AppStack.Screen
              name="EditTransaction"
              component={EditTransactionScreen}
              options={{
                presentation: 'transparentModal',
                animation: 'slide_from_bottom'
              }}
            />
            <AppStack.Screen
              name="Notifications"
              component={NotificationsScreen}
              options={{ presentation: 'modal' }}
            />
            <AppStack.Screen
              name="SavingsGoals"
              component={SavingsGoalsScreen}
              options={{ presentation: 'modal' }}
            />
            <AppStack.Screen
              name="AddSavingGoal"
              component={AddSavingGoalScreen}
              options={{ presentation: 'modal' }}
            />
            <AppStack.Screen
              name="AccountsList"
              component={AccountsListScreen}
            />
            <AppStack.Screen
              name="AddAccount"
              component={AddAccountScreen}
              options={{ 
                presentation: 'transparentModal',
                animation: 'slide_from_bottom'
              }}
            />
            <AppStack.Screen
              name="SearchTransactions"
              component={SearchTransactionsScreen}
              options={{ 
                presentation: 'modal',
                headerShown: false
              }}
            />
          </AppStack.Navigator>
        </HeaderProvider>
      </TabNavigationContext.Provider>
      </HeaderMorphContext.Provider>
    </NavigationPositionContext.Provider>
  );
}

