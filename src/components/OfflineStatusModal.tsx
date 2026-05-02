import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Platform, Pressable, StyleSheet } from 'react-native';
import { 
  CloudSlash, 
  X, 
  ShieldCheck, 
  ArrowsClockwise, 
  Hourglass, 
  CheckCircle, 
  WarningCircle, 
  PlusCircle, 
  BookOpen, 
  ChartBar, 
  Sparkle,
  Info
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';

interface OfflineStatusModalProps {
  visible: boolean;
  onClose: () => void;
  recheckInterval?: number; // seconds
  isOffline?: boolean;
}

export const OfflineStatusModal = ({ visible, onClose, recheckInterval = 10, isOffline = true }: OfflineStatusModalProps) => {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const [countdown, setCountdown] = useState(recheckInterval);

  useEffect(() => {
    if (!visible || !isOffline) {
      setCountdown(recheckInterval);
      return;
    }

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) return recheckInterval;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [visible, isOffline, recheckInterval]);

  const isDark = colors.isDark;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        
        <View 
          style={[
            styles.sheet, 
            { 
              backgroundColor: isDark ? '#16181a' : '#FFFBF5',
              paddingBottom: insets.bottom 
            }
          ]}
        >
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: isDark ? '#2a2f33' : '#e8eaec' }]} />
          
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-6">
              <View className="flex-row items-center">
                <View className={`w-10 h-10 rounded-full ${isOffline ? 'bg-orange-100 dark:bg-orange-900/30' : 'bg-green-100 dark:bg-green-900/30'} items-center justify-center`}>
                  {isOffline ? (
                    <CloudSlash size={22} color="#f97316" weight="bold" />
                  ) : (
                    <CheckCircle size={22} color="#22c55e" weight="bold" />
                  )}
                </View>
                <Text style={{ fontFamily: fontDisplay }} className="text-xl font-bold ml-3 text-zinc-900 dark:text-zinc-100">
                  {isOffline ? 'Server Status' : 'Systems Online'}
                </Text>
              </View>
              <TouchableOpacity 
                onPress={onClose}
                className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 items-center justify-center"
              >
                <X size={20} color={colors.textMuted} weight="bold" />
              </TouchableOpacity>
            </View>

            {/* Status Pill */}
            <View className={`self-center ${isOffline ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30' : 'bg-green-50 dark:bg-green-900/20 border-green-100 dark:border-green-900/30'} px-4 py-2 rounded-full flex-row items-center mb-8 border`}>
              {isOffline ? (
                <>
                  <ArrowsClockwise size={14} color="#f97316" weight="bold" />
                  <Text style={{ fontFamily: fontRounded }} className="text-[#f97316] text-[13px] font-bold ml-2">
                    Rechecking in {countdown}s
                  </Text>
                </>
              ) : (
                <>
                  <CheckCircle size={14} color="#22c55e" weight="bold" />
                  <Text style={{ fontFamily: fontRounded }} className="text-[#22c55e] text-[13px] font-bold ml-2">
                    Back online & Synced
                  </Text>
                </>
              )}
            </View>

            {/* Section: What's happening */}
            <Text style={{ fontFamily: fontRounded }} className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
              What's happening
            </Text>
            
            <View className="bg-white dark:bg-zinc-900 rounded-[24px] p-1 mb-8 shadow-sm">
              <StatusCard 
                icon={<Info size={20} color="#f97316" weight="fill" />}
                title="Services degraded"
                description="The Wize cloud is currently unreachable (offline mode)."
                isFirst
              />
              <StatusCard 
                icon={<ShieldCheck size={20} color="#22c55e" weight="fill" />}
                title="Your data is safe"
                description="All your transactions and budgets are stored locally on this device."
              />
              <StatusCard 
                icon={<ArrowsClockwise size={20} color="#3b82f6" weight="fill" />}
                title="Automatic sync"
                description="Changes will sync automatically when your connection returns."
              />
              <StatusCard 
                icon={<Hourglass size={20} color="#a855f7" weight="fill" />}
                title="Local-First Mode"
                description="You can keep using Wize normally; we'll handle the rest."
                isLast
              />
            </View>

            {/* Section: What still works */}
            <Text style={{ fontFamily: fontRounded }} className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
              What still works
            </Text>
            <View className="bg-white dark:bg-zinc-900 rounded-[24px] p-4 mb-8 shadow-sm">
              <FeatureRow icon={<PlusCircle size={18} color="#22c55e" />} label="Logging transactions" active />
              <FeatureRow icon={<BookOpen size={18} color="#22c55e" />} label="Viewing your history" active />
              <FeatureRow icon={<ChartBar size={18} color="#22c55e" />} label="Tracking daily totals" active />
              <FeatureRow icon={<ShieldCheck size={18} color="#22c55e" />} label="Managing accounts" active />
            </View>

            {/* Section: Temporarily limited */}
            <Text style={{ fontFamily: fontRounded }} className="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-3 ml-1">
              Temporarily limited
            </Text>
            <View className="bg-white dark:bg-zinc-900 rounded-[24px] p-4 mb-4 shadow-sm">
              <FeatureRow icon={<Sparkle size={18} color="#f97316" />} label="AI Advisor insights" />
              <FeatureRow icon={<CloudSlash size={18} color="#f97316" />} label="Cross-device sync" />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const StatusCard = ({ icon, title, description, isFirst, isLast }: any) => (
  <View className={`flex-row p-4 ${!isLast ? 'border-b border-zinc-50 dark:border-zinc-800' : ''}`}>
    <View className="mt-1">{icon}</View>
    <View className="ml-4 flex-1">
      <Text style={{ fontFamily: fontDisplay }} className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100 mb-0.5">
        {title}
      </Text>
      <Text style={{ fontFamily: fontText }} className="text-xs text-zinc-500 dark:text-zinc-400 leading-4">
        {description}
      </Text>
    </View>
  </View>
);

const FeatureRow = ({ icon, label, active }: any) => (
  <View className="flex-row items-center justify-between py-2.5">
    <View className="flex-row items-center">
      <View className="opacity-80">{icon}</View>
      <Text style={{ fontFamily: fontText }} className="text-[14px] font-medium ml-3 text-zinc-700 dark:text-zinc-300">
        {label}
      </Text>
    </View>
    {active ? (
      <View className="w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/30 items-center justify-center">
        <CheckCircle size={14} color="#22c55e" weight="fill" />
      </View>
    ) : (
      <WarningCircle size={18} color="#f97316" weight="bold" />
    )}
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: '82%',
    width: '100%',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
});
