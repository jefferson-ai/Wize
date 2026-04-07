import React, { useEffect } from 'react';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withRepeat, 
  withSequence, 
  withTiming, 
  withDelay,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';
import { Bell } from 'lucide-react-native';

interface ShakingBellProps {
  size?: number;
  color?: string;
  shouldShake: boolean;
}

const ShakingBell = ({ size = 20, color = '#000', shouldShake }: ShakingBellProps) => {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (shouldShake) {
      // Periodic shake: 5 swings, then 3s delay
      rotation.value = withRepeat(
        withSequence(
          withTiming(-12, { duration: 60, easing: Easing.bezier(0.36, 0.07, 0.19, 0.97) }),
          withTiming(12, { duration: 60 }),
          withTiming(-10, { duration: 60 }),
          withTiming(10, { duration: 60 }),
          withTiming(-8, { duration: 60 }),
          withTiming(8, { duration: 60 }),
          withTiming(0, { duration: 60 }),
          withDelay(2500, withTiming(0, { duration: 0 }))
        ),
        -1, // Loop forever
        false // Do not reverse (we want the sequence to restart)
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = withTiming(0, { duration: 200 });
    }

    return () => cancelAnimation(rotation);
  }, [shouldShake]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotation.value}deg` },
        { translateY: 0 } // Anchor point fix might be needed on some RN versions
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Bell size={size} color={color} />
    </Animated.View>
  );
};

export default ShakingBell;
