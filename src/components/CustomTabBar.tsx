import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Home, CreditCard, Plus, BarChart2, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontRounded } from '../theme/fonts';

const TAB_ICONS: Record<string, any> = {
  Home: Home,
  Transactions: CreditCard,
  AddTransaction: Plus,
  Planning: BarChart2,
  Account: Settings,
};

function AnimatedTabButton({ route, isFocused, onPress, onLayout, label, IconComponent, activeColor, inactiveColor }: any) {
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isFocused ? 1.0 : 1, { damping: 14, stiffness: 200 }) }
      ],
    };
  }, [isFocused]);

  return (
    <TouchableOpacity
      onLayout={onLayout}
      onPress={onPress}
      activeOpacity={0.7}
      style={{ flex: 1, marginHorizontal: 2 }}
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
    >
      <View style={[styles.tab, { backgroundColor: 'transparent' }]}>
        <Animated.View style={animatedIconStyle}>
          {IconComponent && (
            <IconComponent
              size={24}
              color={isFocused ? activeColor : inactiveColor}
              strokeWidth={isFocused ? 3 : 2}
            />
          )}
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, descriptors, navigation, position: sharedPosition, onTabPress }: any) {
  const position = sharedPosition; // Use the shared value we passed in
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();

  const [tabLayouts, setTabLayouts] = React.useState<Record<number, { x: number, width: number, y: number, height: number }>>({});

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  const onCenterPress = () => {
    navigation.navigate('AddTransaction');
  };

  const indicatorStyle = useAnimatedStyle(() => {
    // If we don't have layouts for all tabs yet, don't show the indicator
    if (Object.keys(tabLayouts).length < state.routes.length || !position) {
      return { opacity: 0 };
    }

    // Map scroll index (0-3) to tab slot index (0, 1, 3, 4)
    // We only interpolate between the indices that have layouts AND are scrollable
    const scrollIndices = [0, 1, 2, 3];
    const visualSlotIndices = [0, 1, 3, 4];
    
    const xOutput = visualSlotIndices.map(i => tabLayouts[i]?.x ?? 0);
    const widthOutput = visualSlotIndices.map(i => tabLayouts[i]?.width ?? 0);

    const translateX = interpolate(
      position.value,
      scrollIndices,
      xOutput,
      Extrapolate.CLAMP
    );

    const width = interpolate(
      position.value,
      scrollIndices,
      widthOutput,
      Extrapolate.CLAMP
    );

    const tabHeight = tabLayouts[state.index === 2 ? 1 : (state.index > 2 ? state.index : state.index)]?.height ?? 0;
    const paddingVal = 8; // Margin top/bottom for the pill

    return {
      opacity: 1,
      width,
      height: Math.max(0, tabHeight - paddingVal * 2), // Make it slightly smaller than full height
      marginTop: paddingVal,
      transform: [
        { translateX },
        { translateY: tabLayouts[state.index === 2 ? 1 : (state.index > 2 ? state.index : state.index)]?.y ?? 0 }
      ],
    };
  }, [state.index, tabLayouts, position]);

  const renderTab = (route: any) => {
    const routeIndex = state.routes.indexOf(route);
    const isFocused = state.index === routeIndex;
    const IconComponent = TAB_ICONS[route.name];
    const label = route.name;

    const onPress = () => {
      if (route.name === 'AddTransaction') {
        onCenterPress();
        return;
      }

      if (onTabPress) {
        onTabPress(routeIndex);
      } else {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });
        if (!isFocused && !event.defaultPrevented) {
          navigation.navigate(route.name);
        }
      }
    };

    const handleLayout = (e: any) => {
      const { x, y, width, height } = e.nativeEvent.layout;
      setTabLayouts(prev => ({
        ...prev,
        [routeIndex]: { x, y, width, height }
      }));
    };

    return (
      <AnimatedTabButton
        key={route.key}
        route={route}
        isFocused={isFocused}
        onPress={onPress}
        onLayout={handleLayout}
        label={label}
        IconComponent={IconComponent}
        activeColor={colors.primary}
        inactiveColor={colors.text}
      />
    );
  };

  // Split routes: left 2, center (skip), right 2
  const leftRoutes = state.routes.filter((_: any, i: number) => i < 2);
  const rightRoutes = state.routes.filter((_: any, i: number) => i > 2);

  return (
    <View
      style={[styles.wrapper, { paddingBottom: bottomPadding }]}
      pointerEvents="box-none"
    >
      {/* Center floating button — at top of wrapper, above the bar */}
      <View style={styles.centerRow} pointerEvents="box-none">
        <TouchableOpacity
          onPress={onCenterPress}
          activeOpacity={0.85}
          style={[styles.centerButton, { backgroundColor: colors.text }]}
          accessibilityRole="button"
          accessibilityLabel="Add Transaction"
        >
          <Plus size={26} color={colors.background} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View style={[styles.bar, { backgroundColor: colors.tabBarBg, borderColor: colors.tabBarBorder, borderWidth: 1, shadowColor: '#000' }]}>
        {/* Sliding active indicator */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              backgroundColor: colors.iconBg,
              borderRadius: 100, // Large pill
              left: 0,
              top: 0,
            },
            indicatorStyle,
          ]}
        />
        {leftRoutes.map(renderTab)}
        <View style={styles.centerSpacer} />
        {rightRoutes.map(renderTab)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 12,
    right: 12,
  },
  centerRow: {
    alignItems: 'center',
    marginBottom: -28,
    zIndex: 10,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 8,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 24,
    marginHorizontal: 2,
  },
  centerSpacer: {
    width: 72,
  },
  centerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'transparent',
  },
});
