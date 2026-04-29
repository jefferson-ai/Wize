import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet, useColorScheme } from 'react-native';
import { Home, CreditCard, Plus, BarChart2, Settings } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, withSpring, interpolate, Extrapolate } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontText } from '../theme/fonts';
import { useAppSettingsStore } from '../store/appSettingsStore';

const TAB_ICONS: Record<string, any> = {
  Home: Home,
  Transactions: CreditCard,
  Planning: BarChart2,
  Account: Settings,
};

function AnimatedTabButton({ route, isFocused, onPress, onLayout, label, IconComponent, activeColor, inactiveColor }: any) {
  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: withSpring(isFocused ? 1.05 : 1, { damping: 14, stiffness: 200 }) }
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
        <Animated.View style={[styles.iconContainer, animatedIconStyle]}>
          {IconComponent && (
            <IconComponent
              size={22}
              color={isFocused ? activeColor : inactiveColor}
              strokeWidth={isFocused ? 2.5 : 2}
            />
          )}
          <Text style={[styles.tabLabel, { color: isFocused ? activeColor : inactiveColor, fontWeight: isFocused ? '600' : '400' }]}>
            {label}
          </Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function CustomTabBar({ state, descriptors, navigation, position: sharedPosition, onTabPress }: any) {
  const position = sharedPosition; // Use the shared value we passed in
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  
  const { theme } = useAppSettingsStore();
  const systemColorScheme = useColorScheme();
  const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');
  const blurTint = isDark ? 'dark' : 'light';

  const [tabLayouts, setTabLayouts] = React.useState<Record<number, { x: number, width: number, y: number, height: number }>>({});

  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  const onCenterPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate('AddTransaction');
  };

  const indicatorStyle = useAnimatedStyle(() => {
    // If we don't have layouts for all tabs yet, don't show the indicator
    if (Object.keys(tabLayouts).length < state.routes.length || !position) {
      return { opacity: 0 };
    }

    const scrollIndices = state.routes.map((_: any, i: number) => i);
    const xOutput = scrollIndices.map((i: number) => tabLayouts[i]?.x ?? 0);
    const widthOutput = scrollIndices.map((i: number) => tabLayouts[i]?.width ?? 0);

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

    const tabHeight = tabLayouts[state.index]?.height ?? 0;
    const paddingVal = 6; // Margin top/bottom for the pill

    return {
      opacity: 1,
      width,
      height: Math.max(0, tabHeight - paddingVal * 2),
      marginTop: paddingVal,
      transform: [
        { translateX },
        { translateY: tabLayouts[state.index]?.y ?? 0 }
      ],
    };
  }, [state.index, tabLayouts, position, state.routes.length]);

  const renderTab = (route: any, index: number) => {
    const isFocused = state.index === index;
    const IconComponent = TAB_ICONS[route.name];
    let label = route.name;
    if (label === 'Transactions') label = 'Log'; // Shorter name for UI
    
    const onPress = () => {
      if (!isFocused) {
        Haptics.selectionAsync();
      }
      if (onTabPress) {
        onTabPress(index);
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
        [index]: { x, y, width, height }
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
        activeColor={colors.text}
        inactiveColor={colors.textMuted}
      />
    );
  };

  return (
    <View
      style={[styles.wrapper, { paddingBottom: bottomPadding }]}
      pointerEvents="box-none"
    >
      <BlurView intensity={80} tint={blurTint} style={[styles.leftIsland, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
        <Animated.View
          style={[
            {
              position: 'absolute',
              backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
              borderRadius: 24,
              left: 0,
              top: 0,
            },
            indicatorStyle,
          ]}
        />
        {state.routes.map((route: any, index: number) => renderTab(route, index))}
      </BlurView>
      
      <BlurView 
        intensity={100} 
        tint={isDark ? "light" : "dark"} 
        style={[
          styles.rightIsland, 
          { 
            borderColor: isDark ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
            backgroundColor: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' 
          }
        ]}
      >
        <TouchableOpacity
          onPress={onCenterPress}
          activeOpacity={0.85}
          style={[styles.centerButton]}
          accessibilityRole="button"
          accessibilityLabel="Add Transaction"
        >
          <Plus size={26} color={isDark ? '#000000' : '#ffffff'} strokeWidth={2.5} />
        </TouchableOpacity>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  leftIsland: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 36,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  rightIsland: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 24,
    marginHorizontal: 0,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontFamily: fontText,
    marginTop: 4,
  },
  centerButton: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
