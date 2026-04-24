import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import * as PhosphorIcons from 'phosphor-react-native';
import { fontDisplay } from '../theme/fonts';
import { useThemeColors } from '../hooks/useThemeColors';

// Map old Lucide icon names to Phosphor equivalents
const ICON_MAP: Record<string, keyof typeof PhosphorIcons> = {
  Sparkles: 'Sparkle',
  BarChart2: 'ChartBar',
  Settings: 'GearSix',
  CreditCard: 'CreditCard',
  Home: 'House',
};

interface GlassyNavigationTitleProps {
  title: string;
  iconName?: string;
  tint?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function GlassyNavigationTitle({
  title,
  iconName,
  tint,
  onPress,
  style,
}: GlassyNavigationTitleProps) {
  const colors = useThemeColors();
  
  // Conditionally select the icon component
  const mappedName = iconName ? (ICON_MAP[iconName] || iconName) : null;
  const IconComponent = mappedName ? (PhosphorIcons[mappedName] as any) : null;

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <View style={[styles.container, style]}>
      <BlurView
        intensity={colors.isDark ? 25 : 60}
        tint={colors.isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      
      {/* Subtle Tint Overlay */}
      {tint && (
        <View 
          style={[
            StyleSheet.absoluteFill, 
            { backgroundColor: tint, opacity: colors.isDark ? 0.15 : 0.1 }
          ]} 
        />
      )}

      {/* Edge Highlight (simulates glass border) */}
      <View 
        style={[
          StyleSheet.absoluteFill, 
          styles.edgeHighlight, 
          { borderColor: colors.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.4)' }
        ]} 
      />

      <Wrapper 
        activeOpacity={0.7} 
        onPress={onPress} 
        style={styles.content}
      >
        {IconComponent && (
          <IconComponent 
            size={16} 
            color={colors.text} 
            weight="bold" 
            style={styles.icon} 
          />
        )}
        <Text style={[styles.title, { color: colors.text }]}>
          {title}
        </Text>
      </Wrapper>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  edgeHighlight: {
    borderRadius: 999,
    borderWidth: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    gap: 8,
  },
  icon: {
    marginRight: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontDisplay,
    letterSpacing: -0.2,
  },
});
