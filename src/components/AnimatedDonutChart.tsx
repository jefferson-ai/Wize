import React, { useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Defs, Mask, G, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { ArrowClockwise } from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontText } from '../theme/fonts';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GAP_DEGREES = 2; // gap between segments in degrees
const GAP_RADIANS = (GAP_DEGREES * Math.PI) / 180;

type Segment = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  data: Segment[];
  totalValue: number;
  radius?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSublabel?: string;
  chartKey?: number;
};

function SegmentArc({
  color,
  startAngle,
  endAngle,
  innerRadius,
  outerRadius,
  cx,
  cy,
}: {
  color: string;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  cx: number;
  cy: number;
}) {
  if (endAngle - startAngle < 0.001) return null;

  // Handle full circle edge case (SVG arcs break if start and end are exactly same)
  const isFullCircle = endAngle - startAngle >= 2 * Math.PI - 0.001;
  const safeEndAngle = isFullCircle ? startAngle + 2 * Math.PI - 0.001 : endAngle;

  const p1_out = {
    x: cx + outerRadius * Math.cos(startAngle),
    y: cy + outerRadius * Math.sin(startAngle),
  };
  const p2_out = {
    x: cx + outerRadius * Math.cos(safeEndAngle),
    y: cy + outerRadius * Math.sin(safeEndAngle),
  };
  const p1_in = {
    x: cx + innerRadius * Math.cos(safeEndAngle),
    y: cy + innerRadius * Math.sin(safeEndAngle),
  };
  const p2_in = {
    x: cx + innerRadius * Math.cos(startAngle),
    y: cy + innerRadius * Math.sin(startAngle),
  };

  const largeArcFlag = safeEndAngle - startAngle > Math.PI ? 1 : 0;

  const d = `M ${p1_out.x} ${p1_out.y} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${p2_out.x} ${p2_out.y} L ${p1_in.x} ${p1_in.y} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${p2_in.x} ${p2_in.y} Z`;

  return <Path fill={color} d={d} />;
}

export default function AnimatedDonutChart({
  data,
  totalValue,
  radius = 85,
  strokeWidth = 20,
  centerLabel,
  centerSublabel,
  chartKey = 0,
}: Props) {
  const colors = useThemeColors();
  const progress = useSharedValue(0);
  const labelOpacity = useSharedValue(0);

  const outerRadius = radius;
  const innerRadius = radius - strokeWidth;
  const svgSize = radius * 2;
  const center = radius;

  // Compute segment angles
  const totalGap = data.length > 1 ? GAP_RADIANS * data.length : 0;
  const availableAngle = 2 * Math.PI - totalGap;

  let currentStartAngle = Math.PI;

  const segmentPositions = data.map((seg) => {
    const fraction = totalValue > 0 ? seg.value / totalValue : 0;
    const segmentAngle = fraction * availableAngle;
    const startAngle = currentStartAngle;
    const endAngle = startAngle + segmentAngle;

    currentStartAngle = endAngle + (data.length > 1 ? GAP_RADIANS : 0);

    return { ...seg, startAngle, endAngle };
  });

  const playAnimation = useCallback(() => {
    progress.value = 0;
    labelOpacity.value = 0;

    progress.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });

    labelOpacity.value = withDelay(
      1000,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
    );
  }, [progress, labelOpacity]);

  useEffect(() => {
    playAnimation();
  }, [chartKey, playAnimation]);

  const maskRadius = radius / 2;
  const maskCircumference = 2 * Math.PI * maskRadius;
  // Add a tiny buffer to dasharray to prevent floating point gaps at 0 progress
  const dashLength = maskCircumference + 5; 

  const maskAnimatedProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: dashLength - progress.value * dashLength,
    };
  });

  const labelAnimatedStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
  }));

  const topCat = data[0];
  const pct =
    totalValue > 0 && topCat
      ? ((topCat.value / totalValue) * 100).toFixed(0)
      : '0';

  // Sort data by value descending for the legend
  const sortedData = [...data].sort((a, b) => b.value - a.value);

  return (
    <View style={localStyles.container}>
      <View style={localStyles.row}>
        {/* Chart on the left */}
        <View style={localStyles.chartWrapper}>
          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            <Defs>
              <Mask id="sweepMask">
                <AnimatedCircle
                  cx={center}
                  cy={center}
                  r={maskRadius}
                  stroke="white"
                  strokeWidth={radius + 2}
                  strokeDasharray={dashLength}
                  animatedProps={maskAnimatedProps}
                  fill="none"
                  originX={center}
                  originY={center}
                  rotation={180}
                />
              </Mask>
            </Defs>
            <G mask="url(#sweepMask)">
              {segmentPositions.map((seg, i) => (
                <SegmentArc
                  key={`${chartKey}-${i}`}
                  color={seg.color}
                  startAngle={seg.startAngle}
                  endAngle={seg.endAngle}
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  cx={center}
                  cy={center}
                />
              ))}
            </G>
          </Svg>

          {/* Center label overlay */}
          <Animated.View
            style={[
              localStyles.centerLabel,
              labelAnimatedStyle,
              { height: svgSize }
            ]}
          >
            <View style={localStyles.centerContent}>
              <Text style={[localStyles.centerTitle, { color: colors.text }]}>
                {centerLabel || (topCat ? topCat.label : 'Expenses')}
              </Text>
              <Text style={[localStyles.centerSubtitle, { color: colors.textMuted }]}>
                {centerSublabel || (topCat ? `${pct}%` : '')}
              </Text>
            </View>
          </Animated.View>
        </View>

        {/* Category list on the right */}
        <Animated.View style={[localStyles.legendList, labelAnimatedStyle]}>
          {sortedData.slice(0, 5).map((cat, i) => {
            const percentage =
              totalValue > 0 ? ((cat.value / totalValue) * 100).toFixed(0) : '0';
            return (
              <View key={i} style={localStyles.legendRow}>
                <View style={[localStyles.legendDot, { backgroundColor: cat.color }]} />
                <Text style={[localStyles.legendLabel, { color: colors.text }]} numberOfLines={1}>
                  {cat.label}
                </Text>
                <Text style={[localStyles.legendPct, { color: colors.textMuted }]}>
                  {percentage}%
                </Text>
              </View>
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chartWrapper: {
    position: 'relative',
  },
  centerLabel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  centerTitle: {
    fontWeight: '700',
    fontSize: 13,
    fontFamily: fontText,
  },
  centerSubtitle: {
    fontSize: 11,
    fontFamily: fontText,
    marginTop: 1,
  },
  legendList: {
    flex: 1,
    marginLeft: 12,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  legendLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    fontFamily: fontText,
  },
  legendPct: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: fontText,
    marginLeft: 6,
  },
});

