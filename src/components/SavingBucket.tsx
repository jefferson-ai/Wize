import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';

interface SavingBucketProps {
  name: string;
  target: number;
  current: number;
  color: string;
  icon?: string;
  size?: 'small' | 'large';
}

export default function SavingBucket({ name, target, current, color, icon, size = 'large' }: SavingBucketProps) {
  const colors = useThemeColors();
  const fillAnim = useRef(new Animated.Value(0)).current;
  
  const percentage = Math.min((current / target) * 100, 100);
  const isLarge = size === 'large';

  useEffect(() => {
    Animated.timing(fillAnim, {
      toValue: percentage,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [percentage]);

  const height = isLarge ? 120 : 80;
  const width = isLarge ? 80 : 54;

  const fillHeight = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={[styles.bucketOuter, { width, height, borderColor: colors.border }]}>
        {/* Fill Area */}
        <Animated.View 
          style={[
            styles.fill, 
            { 
              backgroundColor: color, 
              height: fillHeight,
              opacity: 0.8
            }
          ]} 
        />
        
        {/* Glow Effect */}
        <View style={[styles.glow, { backgroundColor: color, opacity: 0.1 }]} />
        
        {/* Label inside if large */}
        <View style={styles.content}>
          <Text style={[styles.percentageText, { fontSize: isLarge ? 14 : 10 }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>
      
      <Text style={[styles.name, { color: colors.text, fontSize: isLarge ? 13 : 11 }]} numberOfLines={1}>
        {name}
      </Text>
      <Text style={[styles.amount, { color: colors.textMuted, fontSize: isLarge ? 11 : 9 }]}>
        GHS {current}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginRight: 20,
  },
  bucketOuter: {
    borderWidth: 2,
    borderTopWidth: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    overflow: 'hidden',
    backgroundColor: 'rgba(154, 162, 173, 0.05)',
    justifyContent: 'flex-end',
    marginBottom: 10,
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  percentageText: {
    fontWeight: '800',
    color: '#ffffff',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    fontFamily: fontDisplay,
  },
  name: {
    fontWeight: '700',
    marginBottom: 2,
    fontFamily: fontRounded,
  },
  amount: {
    fontFamily: fontText,
  },
});
