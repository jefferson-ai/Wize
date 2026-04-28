import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WarningCircle, Crosshair, ArrowRight, X, ChartLineUp } from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontDisplay, fontRounded, fontText } from '../theme/fonts';

interface AIInsightCardProps {
  type: 'anomaly' | 'challenge' | 'forecast';
  title: string;
  description: string;
  color: string;
  onAccept?: () => void;
  onDismiss: () => void;
  progress?: number; // 0 to 1
  amountLabel?: string;
  currentDay?: number;
  totalDays?: number;
}

export default function AIInsightCard({ 
  type, 
  title, 
  description, 
  color, 
  onAccept, 
  onDismiss,
  progress,
  amountLabel,
  currentDay,
  totalDays,
}: AIInsightCardProps) {
  const colors = useThemeColors();
  const isAnomaly = type === 'anomaly';
  const isForecast = type === 'forecast';

  const isAlert = isAnomaly || isForecast;
  const cardBorderColor = isAlert ? colors.danger + '33' : color + '33';
  const iconBgColor = isAlert ? colors.danger + '15' : color + '15';

  return (
    <View style={[
      styles.container, 
      { backgroundColor: colors.card, borderColor: cardBorderColor }
    ]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: iconBgColor }]}>
          {isAnomaly ? (
            <WarningCircle size={20} color={colors.danger} weight="fill" />
          ) : isForecast ? (
            <ChartLineUp size={20} color={colors.danger} weight="bold" />
          ) : (
            <Crosshair size={20} color={color} />
          )}
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <TouchableOpacity onPress={onDismiss}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      <Text style={[styles.description, { color: colors.textMuted }]}>{description}</Text>

      {progress !== undefined && (
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.progressLabel, { color: colors.text }]}>{amountLabel}</Text>
              {currentDay !== undefined && totalDays !== undefined && (
                <Text style={[styles.dayLabel, { color: colors.textMuted }]}>Day {currentDay} of {totalDays}</Text>
              )}
            </View>
            <Text style={[styles.progressPercent, { color: color }]}>{Math.round(progress * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
            <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
          </View>
        </View>
      )}

      {onAccept && (
        <TouchableOpacity 
          style={[styles.actionBtn, { backgroundColor: color }]} 
          onPress={onAccept}
        >
          <Text style={styles.actionBtnText}>Accept Challenge</Text>
          <ArrowRight size={16} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    marginBottom: 20,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    fontFamily: fontDisplay,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontText,
    marginBottom: 16,
  },
  progressSection: {
    marginBottom: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: fontRounded,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: fontRounded,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    backgroundColor: '#eee', // Fallback for light mode
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    marginTop: 8,
    gap: 8,
  },
  actionBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: fontRounded,
  },
  dayLabel: {
    fontSize: 11,
    fontFamily: fontText,
    marginTop: 2,
  },
});
