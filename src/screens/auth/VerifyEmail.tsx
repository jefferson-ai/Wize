import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
import { ArrowLeft } from 'lucide-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontDisplay, fontText } from '../../theme/fonts';

export default function VerifyEmailScreen({ navigation, route }: AuthStackScreenProps<'VerifyEmail'>) {
  const colors = useThemeColors();
  const { email } = route.params;
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    if (!code || code.length < 6) {
      Alert.alert('Invalid Code', 'Please enter the verification code sent to your email.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: 'signup',
    });
    setLoading(false);

    if (error) {
      Alert.alert('Verification Failed', error.message);
    } else {
      // Upon successful verification, Supabase creates a session.
      // RootNavigator will automatically transition to MainNavigator based on the session change.
    }
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Verify Email</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          We've sent a verification code to <Text style={[styles.highlight, { color: colors.text }]}>{email}</Text>. Please enter it below to confirm your account.
        </Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Verification Code</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="00000000"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={8}
              value={code}
              onChangeText={setCode}
              autoFocus
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.text }, loading && styles.disabledButton]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading && <ActivityIndicator color={colors.background} style={{ marginRight: 8 }} />}
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>Verify & Continue</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.resendLink}
          onPress={handleResend}
          disabled={loading}
        >
          <Text style={[styles.resendLinkText, { color: colors.textMuted }]}>
            Didn't receive the code? <Text style={[styles.resendLinkTextBold, { color: colors.text }]}>Resend It</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 20 },
  title: { fontSize: 32, fontWeight: '700', color: '#212529', marginBottom: 8, fontFamily: fontDisplay },
  subtitle: { fontSize: 16, color: '#687280', marginBottom: 32, fontFamily: fontText, lineHeight: 24 },
  highlight: { fontWeight: '700', color: '#212529', fontFamily: fontText },
  form: { marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#4a5568', marginBottom: 8, fontWeight: '600', fontFamily: fontText },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 24, letterSpacing: 4, textAlign: 'center', color: '#212529', fontFamily: fontDisplay },
  primaryButton: { width: '100%', backgroundColor: '#212529', paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  disabledButton: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16, fontFamily: fontText },
  resendLink: { alignItems: 'center' },
  resendLinkText: { color: '#687280', fontSize: 15, fontFamily: fontText },
  resendLinkTextBold: { color: '#212529', fontWeight: '700', fontFamily: fontText },
});
