import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Home, Wallet, Plus, LayoutGrid, User } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColorScheme } from 'nativewind';

const TAB_ICONS: Record<string, any> = {
  Home: Home,
  Transactions: Wallet,
  AddTransaction: Plus,
  Budgets: LayoutGrid,
  Account: User,
};

const TAB_LABELS: Record<string, string> = {
  Home: 'Home',
  Transactions: 'Transactions',
  AddTransaction: '',
  Budgets: 'Budgets',
  Account: 'Account',
};

export default function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const bgColor = isDark ? '#09090b' : '#ffffff';
  const borderColor = isDark ? '#27272a' : '#f4f4f5';
  const activeColor = '#600aff';
  const inactiveColor = isDark ? '#71717a' : '#a1a1aa';
  const activeBg = isDark ? '#1a1030' : '#f0e6ff';
  const bottomPadding = insets.bottom > 0 ? insets.bottom : 8;

  const onCenterPress = () => {
    navigation.getParent()?.navigate('AddTransaction');
  };

  const renderTab = (route: any) => {
    const routeIndex = state.routes.indexOf(route);
    const isFocused = state.index === routeIndex;
    const IconComponent = TAB_ICONS[route.name];
    const label = TAB_LABELS[route.name];

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
        canPreventDefault: true,
      });
      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.tab, isFocused && { backgroundColor: activeBg }]}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={label}
      >
        {IconComponent && (
          <IconComponent
            size={22}
            color={isFocused ? activeColor : inactiveColor}
            strokeWidth={isFocused ? 2.2 : 1.8}
          />
        )}
        <Text
          style={[
            styles.label,
            { color: isFocused ? activeColor : inactiveColor },
            isFocused && styles.labelActive,
          ]}
        >
          {label}
        </Text>
      </TouchableOpacity>
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
          activeOpacity={0.8}
          style={styles.centerButton}
          accessibilityRole="button"
          accessibilityLabel="Add Transaction"
        >
          <Plus size={30} color="#ffffff" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Tab bar */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: bgColor,
            borderTopColor: borderColor,
          },
        ]}
      >
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
    paddingHorizontal: 8,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 2,
  },
  label: {
    fontSize: 10,
    marginTop: 3,
    fontWeight: '500',
  },
  labelActive: {
    fontWeight: '700',
  },
  centerSpacer: {
    width: 72,
  },
  centerButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#600aff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#600aff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 12,
  },
});
