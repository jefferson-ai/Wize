import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated } from 'react-native';
import { X, Sparkles, CheckCircle2, TrendingUp, Heart, AlertTriangle } from 'lucide-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { getAIAdvice, AIAdvice } from '../services/aiAdvisor';
import { getSmartInsights, AnomalyAlert } from '../features/ai/aiService';
import { formatAmount } from '../utils/formatters';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { fontDisplay, fontText } from '../theme/fonts';

interface AIAdvisorModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
}

export default function AIAdvisorModal({ isVisible, onClose, userId }: AIAdvisorModalProps) {
  const colors = useThemeColors();
  const { currency } = useAppSettingsStore();
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyAlert[]>([]);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible && !advice) {
      loadAdvice();
    } else if (!isVisible) {
      setLoading(true);
      setAdvice(null);
      fadeAnim.setValue(0);
    }
  }, [isVisible]);

  const loadAdvice = async () => {
    // Prevent multiple simultaneous calls
    if (advice && loading) return;
    
    try {
      setLoading(true);
      const [res, insights] = await Promise.all([
        getAIAdvice(userId),
        getSmartInsights(userId)
      ]);
      setAdvice(res);
      setAnomalies(insights.anomalies);
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      setLoading(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitle}>
              <View style={[styles.iconWrap, { backgroundColor: colors.text + '10' }]}>
                <Sparkles size={20} color={colors.text} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>AI Financial Strategist</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Analysing your habits...
                </Text>
              </View>
            ) : (
              <Animated.View style={{ opacity: fadeAnim }}>
                {/* Summary Section */}
                <View style={[styles.section, styles.summarySection, { backgroundColor: colors.card, borderColor: colors.border }]}>
                   <View style={styles.sectionHeader}>
                     <TrendingUp size={18} color={colors.text} style={{ marginRight: 8 }} />
                     <Text style={[styles.sectionTitle, { color: colors.text }]}>Intelligence Report</Text>
                   </View>
                   <Text style={[styles.summaryText, { color: colors.text }]}>{advice?.summary}</Text>
                </View>

                {/* Anomalies Section (New) */}
                {anomalies.length > 0 && (
                  <View style={{ marginBottom: 24 }}>
                    <Text style={[styles.label, { color: colors.danger, marginBottom: 12 }]}>Critical Alerts</Text>
                    {anomalies.map(a => (
                      <View key={a.id} style={[styles.anomalyAlert, { backgroundColor: colors.danger + '10', borderColor: colors.danger + '20' }]}>
                        <View style={styles.anomalyIcon}>
                          <AlertTriangle size={18} color={colors.danger} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.anomalyTitle, { color: colors.text }]}>Spending Spike: {a.categoryName}</Text>
                          <Text style={[styles.anomalyBody, { color: colors.textMuted }]}>
                            Detected a {a.increasePercentage}% increase ({currency} {formatAmount(a.amountDifference)}) compared to last week.
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {/* Action Items Section */}
                <Text style={[styles.label, { color: colors.textMuted }]}>Actionable Steps</Text>
                {advice?.actionItems.map((item, index) => (
                  <View key={index} style={[styles.actionItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <CheckCircle2 size={18} color={colors.text} style={{ marginRight: 12, marginTop: 2 }} />
                    <Text style={[styles.actionText, { color: colors.text }]}>{item}</Text>
                  </View>
                ))}

                {/* Encouragement Section */}
                <View style={[styles.encouragementBox, { backgroundColor: colors.text + '08' }]}>
                  <Heart size={20} color={colors.text} style={{ marginBottom: 12 }} />
                  <Text style={[styles.encouragementText, { color: colors.text }]}>
                    {advice?.encouragement}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={loadAdvice}
                  style={[styles.refreshBtn, { borderColor: colors.border }]}
                >
                  <Text style={[styles.refreshBtnText, { color: colors.textMuted }]}>Refresh Analysis</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { width: '100%', height: '85%', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4, }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '700', fontFamily: fontDisplay },
  closeBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  scrollContent: { paddingBottom: 40 },
  loadingContainer: { height: 400, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 15, fontFamily: fontText },
  section: { padding: 20, borderRadius: 24, borderWidth: 1, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontFamily: fontText },
  summarySection: { },
  summaryText: { fontSize: 17, lineHeight: 26, fontFamily: fontText },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, marginLeft: 4, fontFamily: fontText },
  actionItem: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  actionText: { flex: 1, fontSize: 15, lineHeight: 22, fontFamily: fontText },
  encouragementBox: { padding: 24, borderRadius: 24, alignItems: 'center', marginTop: 12, marginBottom: 24 },
  encouragementText: { fontSize: 16, fontStyle: 'italic', textAlign: 'center', lineHeight: 24, opacity: 0.9, fontFamily: fontText },
  refreshBtn: { width: '100%', paddingVertical: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 8 },
  refreshBtnText: { fontSize: 14, fontWeight: '600', fontFamily: fontText },
  anomalyAlert: { flexDirection: 'row', padding: 16, borderRadius: 20, borderWidth: 1, marginBottom: 8, alignItems: 'center' },
  anomalyIcon: { marginRight: 12 },
  anomalyTitle: { fontSize: 14, fontWeight: '700', fontFamily: fontText, marginBottom: 2 },
  anomalyBody: { fontSize: 12, fontFamily: fontText, lineHeight: 18 },
});
