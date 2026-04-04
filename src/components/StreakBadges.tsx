import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Flame } from 'lucide-react-native';
import { useThemeColors } from '../hooks/useThemeColors';

export const STREAK_MILESTONES = [
  { days: 3, color: '#FFB800' }, // Amber
  { days: 10, color: '#FF5C00' }, // Orange
  { days: 30, color: '#FF2E4C' }, // Rose/Red
  { days: 100, color: '#FF00D6' }, // Magenta
  { days: 200, color: '#8A00FF' }, // Purple
];

export const getStreakColor = (streak: number, defaultColor: string): string => {
  const milestone = [...STREAK_MILESTONES].reverse().find(m => streak >= m.days);
  return milestone ? milestone.color : defaultColor;
};

export default function StreakBadges({ streak, isVisible, onClose }: { streak: number, isVisible: boolean, onClose: () => void }) {
  const colors = useThemeColors();

  const highestUnlocked = [...STREAK_MILESTONES].reverse().find(m => streak >= m.days);
  const currentFlameColor = highestUnlocked ? highestUnlocked.color : colors.border;
  const isCurrentFill = !!highestUnlocked;

  return (
    <Modal transparent visible={isVisible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Your Streak Badges</Text>
          
          {/* Horizontal Badges Row (View the full Palette) */}
          <View style={[styles.badgesContainer, { backgroundColor: colors.background, borderColor: colors.border, marginBottom: 24 }]}>
            {STREAK_MILESTONES.map((milestone, index) => {
              const isAchieved = streak >= milestone.days;
              const nextAchieved = streak >= (STREAK_MILESTONES[index+1]?.days || 9999);
              const color = milestone.color;
              
              return (
                <React.Fragment key={milestone.days}>
                  <View style={[styles.badgeWrapper, { opacity: isAchieved ? 1 : 0.35 }]}>
                    <View style={styles.flameContainer}>
                      <Flame 
                        size={28} 
                        color={color} 
                        fill={isAchieved ? color : 'transparent'} 
                        strokeWidth={isAchieved ? 0 : 2} 
                      />
                    </View>
                    <Text style={[styles.badgeText, { color: isAchieved ? colors.text : colors.textMuted }]}>{milestone.days}d</Text>
                  </View>
                  {index < STREAK_MILESTONES.length - 1 && (
                    <View style={[
                      styles.badgeLine, 
                      { 
                        backgroundColor: milestone.color,
                        opacity: nextAchieved ? 0.6 : 0.15 
                      }
                    ]} />
                  )}
                </React.Fragment>
              );
            })}
          </View>

          <View style={[styles.currentStreakCard, { backgroundColor: colors.background }]}>
            <View style={[styles.largeFlameContainer, { backgroundColor: currentFlameColor + '15' }]}>
              <Flame size={40} color={currentFlameColor} fill={isCurrentFill ? currentFlameColor : 'transparent'} strokeWidth={isCurrentFill ? 0 : 2} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.currentStreakNum, { color: colors.text }]}>{streak} Days</Text>
              <Text style={[styles.currentStreakLabel, { color: colors.textMuted }]}>Current Logging Streak</Text>
            </View>
          </View>

          <View style={styles.insightList}>
             {STREAK_MILESTONES.map(m => {
                const isAch = streak >= m.days;
                const daysTo = m.days - streak;
                return (
                  <View key={m.days} style={styles.insightRow}>
                     <Flame size={20} color={isAch ? m.color : colors.border} fill={isAch ? m.color : 'transparent'} strokeWidth={isAch ? 0 : 2} />
                     <Text style={[styles.insightRowText, { color: isAch ? colors.text : colors.textMuted }]}>{m.days} Day Badge</Text>
                     <Text style={[styles.insightRowStatus, { color: isAch ? '#4ade80' : colors.textMuted }]}>
                       {isAch ? 'Unlocked' : `${daysTo} days left`}
                     </Text>
                  </View>
                )
             })}
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
             <Text style={styles.closeBtnText}>Awesome!</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  badgesContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 20, borderWidth: 1 },
  badgeWrapper: { alignItems: 'center' },
  flameContainer: { marginBottom: 6, height: 28, justifyContent: 'center' },
  badgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  badgeLine: { flex: 1, height: 2, marginHorizontal: 4, borderRadius: 1, opacity: 0.5 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', borderRadius: 24, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 20, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold', marginBottom: 20, textAlign: 'center' },
  currentStreakCard: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 20 },
  largeFlameContainer: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  currentStreakNum: { fontSize: 22, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold', marginBottom: 2 },
  currentStreakLabel: { fontSize: 13, fontFamily: 'InstrumentSans_400Regular' },
  insightList: { marginBottom: 24 },
  insightRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.04)' },
  insightRowText: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },
  insightRowStatus: { fontSize: 13, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },
  closeBtn: { paddingVertical: 16, backgroundColor: '#212529', borderRadius: 100, alignItems: 'center' },
  closeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
});
