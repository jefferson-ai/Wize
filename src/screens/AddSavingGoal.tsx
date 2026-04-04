import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, KeyboardAvoidingView, Platform, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Target, Heart, Home, Car, Gift, Briefcase, Camera, Plane, Coffee } from 'lucide-react-native';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { createSavingGoal } from '../features/savings/savingsService';
import { useThemeColors } from '../hooks/useThemeColors';
import { formatAmount } from '../utils/formatters';

const GOAL_ICONS = [
  { name: 'Target', Icon: Target },
  { name: 'Home', Icon: Home },
  { name: 'Car', Icon: Car },
  { name: 'Gift', Icon: Gift },
  { name: 'Travel', Icon: Plane },
  { name: 'Tech', Icon: Camera },
  { name: 'Career', Icon: Briefcase },
  { name: 'Leisure', Icon: Coffee },
  { name: 'Health', Icon: Heart },
];

const GOAL_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

export default function AddSavingGoalScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  const colors = useThemeColors();
  
  const [name, setName] = useState('');
  const [targetAmountStr, setTargetAmountStr] = useState('0');
  const [selectedColor, setSelectedColor] = useState(GOAL_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState('Target');
  const [loading, setLoading] = useState(false);

  const targetRef = useRef<TextInput>(null);

  const handleCreate = async () => {
    const targetAmount = parseFloat(targetAmountStr);
    if (!name.trim()) { Alert.alert('Missing Name', 'Please give your goal a name.'); return; }
    if (!targetAmount || targetAmount <= 0) { Alert.alert('Invalid Target', 'Enter a valid target amount greater than 0.'); return; }

    setLoading(true);
    try {
      await createSavingGoal({
        userId: user!.id,
        name: name.trim(),
        targetAmount,
        icon: selectedIcon,
        color: selectedColor,
      });
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to create saving goal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>New Saving Goal</Text>
        <TouchableOpacity onPress={handleCreate} disabled={loading} style={styles.saveBtn}>
          <Text style={[styles.saveBtnText, { color: colors.text }, loading && { opacity: 0.4 }]}>Create</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
          
          {/* Target Amount Display */}
          <TouchableOpacity style={styles.amountArea} activeOpacity={1} onPress={() => targetRef.current?.focus()}>
            <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Target Amount</Text>
            <View style={styles.amountRow}>
              <Text style={[styles.currencyText, { color: colors.textMuted, opacity: 0.6 }]}>{currency}</Text>
              <TextInput
                ref={targetRef}
                style={[styles.amountText, { color: colors.text }]}
                value={targetAmountStr}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  if (cleaned.split('.').length > 2) return;
                  const parts = cleaned.split('.');
                  if (parts[1] && parts[1].length > 2) return;
                  setTargetAmountStr(cleaned);
                }}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>
          </TouchableOpacity>

          {/* Goal Name */}
          <View style={[styles.inputGroup, { borderBottomColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Goal Name</Text>
            <TextInput
              style={[styles.nameInput, { color: colors.text }]}
              placeholder="e.g. New Macbook Pro"
              placeholderTextColor={colors.textMuted}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Color Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 24 }]}>Select Theme Color</Text>
          <View style={styles.colorGrid}>
            {GOAL_COLORS.map((color) => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                style={[
                  styles.colorCircle,
                  { backgroundColor: color },
                  selectedColor === color && { borderWidth: 3, borderColor: colors.text }
                ]}
              />
            ))}
          </View>

          {/* Icon Selection */}
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: 24 }]}>Select Icon</Text>
          <View style={styles.iconGrid}>
            {GOAL_ICONS.map(({ name, Icon }) => (
              <TouchableOpacity
                key={name}
                onPress={() => setSelectedIcon(name)}
                style={[
                  styles.iconItem,
                  { backgroundColor: colors.border },
                  selectedIcon === name && { backgroundColor: selectedColor }
                ]}
              >
                <Icon size={24} color={selectedIcon === name ? '#ffffff' : colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  closeBtn: { padding: 8 },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  saveBtn: { padding: 8 },
  saveBtnText: { fontSize: 16, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },

  amountArea: { alignItems: 'center', paddingVertical: 32 },
  amountLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 12, fontFamily: 'InstrumentSans_600SemiBold' },
  amountRow: { flexDirection: 'row', alignItems: 'baseline' },
  currencyText: { fontSize: 30, fontWeight: '700', marginRight: 4, fontFamily: 'InstrumentSans_700Bold' },
  amountText: { fontSize: 56, fontWeight: '700', letterSpacing: -1, fontFamily: 'InstrumentSans_700Bold', minWidth: 60 } as any,

  inputGroup: { paddingVertical: 16, borderBottomWidth: 1 },
  sectionLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 16, fontFamily: 'InstrumentSans_700Bold' },
  nameInput: { fontSize: 20, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },

  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  colorCircle: { width: 44, height: 44, borderRadius: 22 },

  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 4 },
  iconItem: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
