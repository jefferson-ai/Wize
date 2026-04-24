import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { X, Crown, Check, Lock } from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { fontDisplay, fontText, fontRounded } from '../theme/fonts';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

interface UpgradeModalProps {
  visible: boolean;
  onClose: () => void;
  featureTitle: string;
  featureDescription: string;
}

const PRO_FEATURES = [
  'Unlimited Wallets & Accounts',
  'Unlimited Budgets',
  'Unlimited Savings Goals',
  'AI Spending Insights',
  'AI Savings Challenges',
  'AI Financial Advisor',
  'CSV Data Export',
];

export default function UpgradeModal({ visible, onClose, featureTitle, featureDescription }: UpgradeModalProps) {
  const colors = useThemeColors();

  return (
    <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle */}
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          {/* Close */}
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeBtn, { backgroundColor: colors.card }]}
          >
            <X size={18} color={colors.text} />
          </TouchableOpacity>

          {/* Crown Badge */}
          <LinearGradient
            colors={['#f59e0b', '#f97316']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.crownBadge}
          >
            <Crown size={28} color="#ffffff" />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>
            Upgrade to Pro
          </Text>

          {/* Feature Lock Message */}
          <View style={[styles.lockCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Lock size={16} color="#f59e0b" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.lockTitle, { color: colors.text }]}>{featureTitle}</Text>
              <Text style={[styles.lockDesc, { color: colors.textMuted }]}>{featureDescription}</Text>
            </View>
          </View>

          {/* Feature List */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            Everything in Pro
          </Text>
          <View style={styles.featureList}>
            {PRO_FEATURES.map((feature, i) => (
              <View key={i} style={styles.featureRow}>
                <View style={[styles.checkCircle, { backgroundColor: '#22c55e20' }]}>
                  <Check size={12} color="#22c55e" weight="bold" />
                </View>
                <Text style={[styles.featureText, { color: colors.text }]}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* Pricing */}
          <View style={styles.pricingArea}>
            <LinearGradient
              colors={colors.isDark ? ['#f59e0b', '#f97316'] : ['#212529', '#374151']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.upgradeBtn}
            >
              <TouchableOpacity
                style={styles.upgradeBtnInner}
                activeOpacity={0.8}
                onPress={() => {
                  // TODO: RevenueCat purchase flow
                  onClose();
                }}
              >
                <Text style={styles.upgradeBtnText}>Upgrade — $2.99/month</Text>
                <Text style={styles.upgradeBtnSub}>or $19.99/year (save 44%)</Text>
              </TouchableOpacity>
            </LinearGradient>

            <TouchableOpacity onPress={onClose} style={styles.laterBtn}>
              <Text style={[styles.laterText, { color: colors.textMuted }]}>Maybe Later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '92%',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  closeBtn: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },

  crownBadge: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    fontFamily: fontDisplay,
    textAlign: 'center',
    marginBottom: 20,
  },

  lockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 24,
  },
  lockTitle: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontText,
    marginBottom: 2,
  },
  lockDesc: {
    fontSize: 12,
    fontFamily: fontText,
    lineHeight: 17,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 14,
    fontFamily: fontRounded,
  },
  featureList: {
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  featureText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontText,
  },

  pricingArea: {
    alignItems: 'center',
  },
  upgradeBtn: {
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  upgradeBtnInner: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  upgradeBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    fontFamily: fontDisplay,
  },
  upgradeBtnSub: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    fontFamily: fontText,
    marginTop: 2,
  },
  laterBtn: {
    paddingVertical: 16,
  },
  laterText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: fontText,
  },
});
