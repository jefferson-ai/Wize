import React, { useImperativeHandle, useState, useCallback, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay, 
  withSequence, 
  Easing,
  runOnJS 
} from 'react-native-reanimated';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CONFETTI_COLORS = ['#facc15', '#4ade80', '#38bdf8', '#f472b6', '#a855f7', '#fb923c'];
const NUM_PARTICLES = 45;

interface ParticleProps {
  id: number;
  onComplete: (id: number) => void;
}

const Particle = ({ id, onComplete }: ParticleProps) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(Math.random() * 0.6 + 0.4);

  const color = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
  const isCircle = Math.random() > 0.5;
  
  // Burst physics
  const angle = Math.random() * Math.PI * 2;
  const velocity = Math.random() * 80 + 40;
  const burstX = Math.cos(angle) * velocity;
  const burstY = Math.sin(angle) * velocity - 20; // Slight upward bias
  
  const duration = Math.random() * 1000 + 1000;
  const gravity = 180;

  React.useEffect(() => {
    // Initial burst
    translateX.value = withTiming(burstX, { duration: 400, easing: Easing.out(Easing.quad) });
    translateY.value = withTiming(burstY, { duration: 400, easing: Easing.out(Easing.quad) }, () => {
      // Fall down
      translateY.value = withTiming(150, { 
        duration: duration - 400, 
        easing: Easing.in(Easing.quad) 
      }, (finished) => {
        if (finished) runOnJS(onComplete)(id);
      });
    });

    rotate.value = withTiming(Math.random() * 720, { duration, easing: Easing.linear });

    opacity.value = withDelay(
      duration * 0.6,
      withTiming(0, { duration: duration * 0.4 })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value }
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View 
      style={[
        styles.particle, 
        { 
          backgroundColor: color, 
          borderRadius: isCircle ? 100 : 2 
        }, 
        animatedStyle
      ]} 
    />
  );
};

export interface ConfettiRef {
  trigger: () => void;
}

const Confetti = React.forwardRef<ConfettiRef>((_, ref) => {
  const [particles, setParticles] = useState<{ id: number }[]>([]);
  const nextId = useRef(0);

  const removeParticle = useCallback((id: number) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  useImperativeHandle(ref, () => ({
    trigger: () => {
      const newParticles = Array.from({ length: NUM_PARTICLES }).map(() => ({
        id: nextId.current++,
      }));
      setParticles(prev => [...prev, ...newParticles]);
    }
  }));

  return (
    <View style={styles.container} pointerEvents="none">
      {particles.map(p => (
        <Particle key={p.id} id={p.id} onComplete={removeParticle} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 0,
    height: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    top: -4,
    left: -4,
  },
});

export default Confetti;
