import React from 'react';
import { View, Dimensions } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  scrollTo,
  runOnUI,
  useAnimatedRef,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import {
  NavigationPositionContext,
  HeaderMorphContext,
  type HeaderMorphState,
  HeaderProvider,
  StationaryMorphingHeader,
} from '../components/AnimatedHeader';
import { TabNavigationContext } from './navigationContext';
import { useThemeColors } from '../hooks/useThemeColors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

import CustomTabBar from '../components/CustomTabBar';

/** Header/tab morph duration for non-adjacent tab jumps (pager still jumps instantly). */
const LONG_JUMP_MORPH_MS = 340;

function TabNavigator({ navigation, scrollRef, onTabPress, position, index }: any) {
  const colors = useThemeColors();

  const state = {
    index: index === 0 ? 0 : (index === 1 ? 1 : index + 1),
    routes: [
      { key: 'home', name: 'Home' },           // 0
      { key: 'transactions', name: 'Transactions' }, // 1
      { key: 'add', name: 'AddTransaction' }, // 2 (center)
      { key: 'planning', name: 'Planning' },   // 3
      { key: 'account', name: 'Account' },     // 4
    ],
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StationaryMorphingHeader />
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onTabPress.scrollHandler}
        scrollEventThrottle={16}
        bounces={false}
        style={{ flex: 1 }}
      >
        <View style={{ width: SCREEN_WIDTH, minHeight: SCREEN_HEIGHT, backgroundColor: 'transparent' }}>
          <HomeScreen navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH, minHeight: SCREEN_HEIGHT, backgroundColor: 'transparent' }}>
          <TransactionHistoryScreen navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH, minHeight: SCREEN_HEIGHT, backgroundColor: 'transparent' }}>
          <InsightsScreen navigation={navigation} />
        </View>
        <View style={{ width: SCREEN_WIDTH, minHeight: SCREEN_HEIGHT, backgroundColor: 'transparent' }}>
          <SettingsScreen navigation={navigation} />
        </View>
      </Animated.ScrollView>
      
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
  const ignoreScrollForHeaderPosition = useSharedValue(0);
  const morphActive = useSharedValue(0);
  const morphFrom = useSharedValue(0);
  const morphTo = useSharedValue(0);
  const morphProgress = useSharedValue(0);
  const headerMorphRef = React.useRef<HeaderMorphState | null>(null);
  if (!headerMorphRef.current) {
    headerMorphRef.current = {
      active: morphActive,
      fromIdx: morphFrom,
      toIdx: morphTo,
      progress: morphProgress,
    };
  }
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const [index, setIndex] = React.useState(0);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      if (ignoreScrollForHeaderPosition.value) {
        return;
      }
      position.value = event.contentOffset.x / SCREEN_WIDTH;
    },
  });

  const scrollPagerTo = (offsetX: number, animated: boolean) => {
    runOnUI((x: number, anim: boolean) => {
      'worklet';
      scrollTo(scrollRef, x, 0, anim);
    })(offsetX, animated);
  };

  const onTabPress = (i: number) => {
    let scrollIndex = i;
    if (i === 2) return;
    if (i > 2) scrollIndex = i - 1;

    const prevScrollIndex = index;
    const isAdjacent = Math.abs(scrollIndex - prevScrollIndex) <= 1;
    setIndex(scrollIndex);

    const targetX = scrollIndex * SCREEN_WIDTH;

    if (isAdjacent) {
      morphActive.value = 0;
      ignoreScrollForHeaderPosition.value = 0;
      scrollPagerTo(targetX, true);
    } else {
      ignoreScrollForHeaderPosition.value = 1;
      scrollPagerTo(targetX, false);
      position.value = scrollIndex;
      morphFrom.value = prevScrollIndex;
      morphTo.value = scrollIndex;
      morphProgress.value = 0;
      morphActive.value = 1;
      morphProgress.value = withTiming(
        1,
        {
          duration: LONG_JUMP_MORPH_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            morphActive.value = 0;
            ignoreScrollForHeaderPosition.value = 0;
          }
        }
      );
    }
  };
  // @ts-ignore - attaching for usage in TabNavigator
  onTabPress.scrollHandler = scrollHandler;

  const jumpToTab = (name: string) => {
    const tabNames: Record<string, number> = { 'Home': 0, 'Transactions': 1, 'Planning': 3, 'Account': 4 };
    const targetIdx = tabNames[name];
    if (targetIdx !== undefined) {
      onTabPress(targetIdx);
    }
  };

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
                  scrollRef={scrollRef}
                  onTabPress={onTabPress}
                  position={position}
                  index={index}
                />
              )}
            </AppStack.Screen>
            <AppStack.Screen
              name="AddTransaction"
              component={AddTransactionScreen}
              options={{ 
                presentation: 'transparentModal',
                animation: 'slide_from_bottom' 
              }}
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
          </AppStack.Navigator>
        </HeaderProvider>
      </TabNavigationContext.Provider>
      </HeaderMorphContext.Provider>
    </NavigationPositionContext.Provider>
  );
}
