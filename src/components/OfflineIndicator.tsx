import React, { useState, useEffect } from 'react';
import { View, Text, Animated, TouchableOpacity } from 'react-native';
import { CloudOff } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontRounded } from '../theme/fonts';
import { OfflineStatusModal } from './OfflineStatusModal';

// Defensive import to prevent crash if native module is missing (needs rebuild)
let NetInfo: any;
try {
  NetInfo = require('@react-native-community/netinfo');
} catch (e) {
  NetInfo = null;
}

/**
 * A pill-shaped indicator that appears when the device is offline.
 * Matches the design requested in the user image.
 */
export const OfflineIndicator = () => {
  const [isOffline, setIsOffline] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (NetInfo?.default?.addEventListener) {
      // Use the native library if it's correctly linked
      const unsubscribe = NetInfo.default.addEventListener((state: any) => {
        const offline = state.isConnected === false || state.isInternetReachable === false;
        toggleIndicator(offline);
      });
      return () => unsubscribe();
    } else {
      // JS-only Fallback: Periodic check for environments without native NetInfo
      const checkConnection = async () => {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          await fetch('https://8.8.8.8', { 
            method: 'HEAD', 
            mode: 'no-cors',
            signal: controller.signal 
          });
          
          clearTimeout(timeoutId);
          toggleIndicator(false);
        } catch (e) {
          toggleIndicator(true);
        }
      };

      const interval = setInterval(checkConnection, 10000);
      checkConnection();
      return () => clearInterval(interval);
    }
  }, []);

  const toggleIndicator = (show: boolean) => {
    setIsOffline(show);
    Animated.timing(opacity, {
      toValue: show ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  if (!isOffline && (opacity as any)._value === 0 && !showModal) return null;

  const isDark = colors.isDark;

  return (
    <>
      <Animated.View 
        pointerEvents="auto"
        style={{ 
          position: 'absolute',
          top: insets.top + 14,
          alignSelf: 'center',
          zIndex: 1000000,
          opacity,
          elevation: 100,
          transform: [{
            translateY: opacity.interpolate({
              inputRange: [0, 1],
              outputRange: [-20, 0]
            })
          }]
        }}
      >
        <TouchableOpacity 
          activeOpacity={0.7}
          onPress={() => {
            console.log('--- OFFLINE PILL PRESSED ---');
            setShowModal(true);
          }}
          hitSlop={{ top: 25, bottom: 25, left: 60, right: 60 }}
          className="bg-zinc-900 dark:bg-zinc-50 px-5 py-2.5 rounded-full flex-row items-center shadow-2xl border border-white/10"
        >
          <CloudOff size={14} color={isDark ? '#000' : '#fff'} />
          <Text 
            style={{ color: isDark ? '#000' : '#fff', fontFamily: fontRounded }}
            className="text-[12px] font-bold ml-1.5 uppercase tracking-widest"
          >
            Offline
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <OfflineStatusModal 
        visible={showModal}
        onClose={() => setShowModal(false)}
        isOffline={isOffline}
      />
    </>
  );
};
