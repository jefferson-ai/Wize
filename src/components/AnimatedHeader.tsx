import React, { createContext, useContext, useState, useEffect } from 'react';
import Animated, { useAnimatedStyle, interpolate, Extrapolate, SharedValue } from 'react-native-reanimated';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Rect } from 'react-native-svg';
import { useThemeColors } from '../hooks/useThemeColors';
import Confetti, { ConfettiRef } from './Confetti';
import { getStreakColor } from './StreakBadges';
import { fontDisplay, fontRounded } from '../theme/fonts';
import GlassyNavigationTitle from './GlassyNavigationTitle';
import * as LucideIcons from 'lucide-react-native';

// Context to share swipe position and header data across the app
export const NavigationPositionContext = createContext<SharedValue<number> | null>(null);

/** Long-jump header crossfade: only `fromIdx` ↔ `toIdx` (no intermediate tab titles). */
export type HeaderMorphState = {
  active: SharedValue<number>;
  fromIdx: SharedValue<number>;
  toIdx: SharedValue<number>;
  progress: SharedValue<number>;
};

export const HeaderMorphContext = createContext<HeaderMorphState | null>(null);

interface HeaderData {
  title: string;
  rightElement?: React.ReactNode;
  streak?: number;
  onStreakPress?: () => void;
  confettiRef?: React.RefObject<ConfettiRef | null>;
  useGlassyTitle?: boolean;
  tint?: string;
  iconName?: keyof typeof LucideIcons;
}

interface HeaderContextType {
  headerData: Record<number, HeaderData>;
  setHeaderData: (index: number, data: HeaderData) => void;
}

export const HeaderDataContext = createContext<HeaderContextType | null>(null);

export const HeaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [headerData, setHeaderDataState] = useState<Record<number, HeaderData>>({});

  const setHeaderData = (index: number, data: HeaderData) => {
    setHeaderDataState(prev => {
      // Basic check to prevent infinite updates if things aren't stable
      if (prev[index]?.title === data.title && 
          prev[index]?.streak === data.streak && 
          prev[index]?.rightElement === data.rightElement) {
        return prev;
      }
      return { ...prev, [index]: data };
    });
  };

  return (
    <HeaderDataContext.Provider value={{ headerData, setHeaderData }}>
      {children}
    </HeaderDataContext.Provider>
  );
};

// Component for screens to register their header content
export const HeaderRegistrar: React.FC<HeaderData & { index: number }> = ({ index, ...data }) => {
  const context = useContext(HeaderDataContext);
  
  useEffect(() => {
    if (context) {
      context.setHeaderData(index, data);
    }
  }, [index, data.title, data.rightElement, data.streak, data.onStreakPress, data.useGlassyTitle, data.tint, data.iconName]);

  return null;
};

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) {
    h = h.split('')
      .map((c) => c + c)
      .join('');
  }
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

/** Height from the header bottom over which we fade (transparent → translucent → opaque by the title row). */
const HEADER_BOTTOM_FADE_PX = 56;

function HeaderScrim({
  backgroundColor,
  width,
  height,
}: {
  backgroundColor: string;
  width: number;
  height: number;
}) {
  const { r, g, b } = hexToRgb(backgroundColor);
  const fill = `rgb(${r},${g},${b})`;
  const gid = `headerScrim-${backgroundColor.replace('#', '')}`;
  const h = Math.max(height, 1);
  const band = Math.min(HEADER_BOTTOM_FADE_PX, h * 0.85);
  const solidTopPct = Math.max(0, ((h - band) / h) * 100);
  const midPct = solidTopPct + (100 - solidTopPct) * 0.5;

  return (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <SvgLinearGradient id={gid} x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={fill} stopOpacity={1} />
          <Stop offset={`${solidTopPct}%`} stopColor={fill} stopOpacity={1} />
          <Stop offset={`${midPct}%`} stopColor={fill} stopOpacity={0.42} />
          <Stop offset="100%" stopColor={fill} stopOpacity={0} />
        </SvgLinearGradient>
      </Defs>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${gid})`} />
    </Svg>
  );
}

function HeaderLayer({
  idx,
  data,
  position,
  morph,
  colors,
}: {
  idx: number;
  data: HeaderData;
  position: SharedValue<number>;
  morph: HeaderMorphState | null;
  colors: any;
}) {
  const animeStyle = useAnimatedStyle(() => {
    if (morph && morph.active.value > 0.5) {
      const t = morph.progress.value;
      const from = morph.fromIdx.value;
      const to = morph.toIdx.value;

      if (idx === from && idx === to) {
        return { opacity: 1, transform: [{ scale: 1 }] };
      }
      if (idx === from) {
        const opacity = 1 - t;
        const scale = interpolate(t, [0, 1], [1, 0.85], Extrapolate.CLAMP);
        return {
          opacity: opacity < 0.05 ? 0 : opacity,
          transform: [{ scale }],
        };
      }
      if (idx === to) {
        const opacity = t;
        const scale = interpolate(t, [0, 1], [0.85, 1], Extrapolate.CLAMP);
        return {
          opacity: opacity < 0.05 ? 0 : opacity,
          transform: [{ scale }],
        };
      }
      return { opacity: 0, transform: [{ scale: 0.85 }] };
    }

    const input = [idx - 1, idx, idx + 1];
    const scale = interpolate(position.value, input, [0.85, 1, 0.85], Extrapolate.CLAMP);
    const opacity = interpolate(position.value, input, [0, 1, 0], Extrapolate.CLAMP);

    return {
      opacity: opacity < 0.05 ? 0 : opacity,
      transform: [{ scale }],
    };
  });

  return (
    <Animated.View style={[styles.stackLayer, animeStyle, { backgroundColor: 'transparent' }]}>
      <View style={styles.contentRow}>
        {data.useGlassyTitle ? (
          <GlassyNavigationTitle 
            title={data.title} 
            iconName={data.iconName} 
            tint={data.tint} 
            style={styles.glassyTitleCenter}
          />
        ) : (
          <Text
            style={[styles.pageTitle, { color: colors.text }, Platform.OS === 'android' ? { includeFontPadding: false } : null]}
            accessibilityRole="header"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {data.title}
          </Text>
        )}

        <View style={styles.rightActions}>
          {data.streak !== undefined && idx !== 3 && (
            <View style={styles.streakWrap}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={data.onStreakPress}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                style={[
                  styles.streakBadge,
                  data.streak === 0
                    ? { opacity: 0.5, backgroundColor: colors.border }
                    : {
                        backgroundColor: getStreakColor(data.streak, colors.border) + '15',
                        borderColor: getStreakColor(data.streak, colors.border),
                      },
                ]}
              >
                <Text
                  style={[
                    styles.streakText,
                    data.streak === 0
                      ? { color: colors.textMuted }
                      : { color: getStreakColor(data.streak, colors.border) },
                  ]}
                >
                  {data.streak} 🔥
                </Text>
              </TouchableOpacity>
              {data.confettiRef && <Confetti ref={data.confettiRef} />}
            </View>
          )}
          {data.rightElement}
        </View>
      </View>
    </Animated.View>
  );
}

// The actual fixed header that sits in the Navigator
export function StationaryMorphingHeader() {
  const colors = useThemeColors();
  const position = useContext(NavigationPositionContext);
  const morph = useContext(HeaderMorphContext);
  const context = useContext(HeaderDataContext);
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  if (!context || !position) return null;

  const indices = [0, 1, 2, 3]; // Home, Transactions, Planning, Account

  const headerHeight = 70 + insets.top;

  return (
    <View
      style={[
        styles.fixedHeader,
        {
          height: headerHeight,
          paddingTop: insets.top,
        },
      ]}
      pointerEvents="box-none"
    >
      <HeaderScrim backgroundColor={colors.background} width={windowWidth} height={headerHeight} />
      {indices.map(idx => {
        const data = context.headerData[idx];
        if (!data) return null;
        return (
          <HeaderLayer key={idx} idx={idx} data={data} position={position} morph={morph} colors={colors} />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fixedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 70,
    width: '100%',
    zIndex: 100,
    elevation: 100,
    backgroundColor: 'transparent',
  },
  stackLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    justifyContent: 'flex-end',
    paddingBottom: Platform.select({ ios: 18, android: 16, default: 16 }),
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    minHeight: 48,
  },
  pageTitle: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    marginRight: 12,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
    fontFamily: fontDisplay,
    letterSpacing: -0.3,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flexShrink: 0,
    gap: 10,
  },
  streakWrap: {
    zIndex: 100,
    justifyContent: 'center',
  },
  streakBadge: {
    backgroundColor: '#fff3cd',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ffe69c',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 36,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontRounded,
    lineHeight: 18,
  },
  glassyTitleCenter: {
    marginLeft: 0,
    marginRight: 'auto', // Push it towards center if standard title was flex: 1
    flexShrink: 1,
  },
});
