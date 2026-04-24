import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../navigation/types';
import { supabase } from '../../utils/supabase';
import { Eye, EyeSlash, ArrowLeft } from 'phosphor-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { signInWithGoogle, configureGoogleSignIn } from '../../utils/googleAuth';
import GoogleIcon from '../../components/GoogleIcon';
import { useEffect } from 'react';
import { fontDisplay, fontText } from '../../theme/fonts';

export default function SignInScreen({ navigation }: AuthStackScreenProps<'SignIn'>) {
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (error) {
      if (error.message.toLowerCase().includes('email not confirmed')) {
        Alert.alert(
          'Email Not Confirmed',
          'You need to verify your email address before signing in.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Now', onPress: () => navigation.navigate('VerifyEmail', { email }) }
          ]
        );
      } else {
        Alert.alert('Error', error.message);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        Alert.alert('Google Sign-In Error', error.message);
      }
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
        <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Sign in to pick up where you left off.</Text>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textMuted }]}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.passwordInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
                placeholder="••••••••"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword ? <EyeSlash size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.text }, loading && styles.primaryButtonDisabled]}
          onPress={handleSignIn}
          disabled={loading || googleLoading}
        >
          {loading && <ActivityIndicator color={colors.background} style={{ marginRight: 8 }} />}
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
        </View>

        <TouchableOpacity
          style={[styles.googleButton, { borderColor: colors.border }]}
          onPress={handleGoogleSignIn}
          disabled={loading || googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} />
          ) : (
            <>
              <View style={styles.googleIconPlaceholder}>
                 <GoogleIcon size={20} />
              </View>
              <Text style={[styles.googleButtonText, { color: colors.text }]}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.footerLink}
          onPress={() => navigation.navigate('SignUp')}
          disabled={loading || googleLoading}
        >
          <Text style={[styles.footerLinkText, { color: colors.textMuted }]}>
            Don't have an account? <Text style={[styles.footerLinkTextBold, { color: colors.text }]}>Sign Up</Text>
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
  subtitle: { fontSize: 16, color: '#687280', marginBottom: 32, fontFamily: fontText },
  form: { marginBottom: 32 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, color: '#4a5568', marginBottom: 8, fontWeight: '600', fontFamily: fontText },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: '#212529', fontFamily: fontText },
  passwordContainer: { position: 'relative', justifyContent: 'center' },
  passwordInput: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, paddingRight: 48, fontSize: 16, color: '#212529', fontFamily: fontText },
  eyeIcon: { position: 'absolute', right: 16 },
  primaryButton: { width: '100%', backgroundColor: '#212529', paddingVertical: 16, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', marginBottom: 16 },
  primaryButtonDisabled: { opacity: 0.7 },
  primaryButtonText: { color: '#ffffff', fontWeight: '600', fontSize: 16, fontFamily: fontText },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontSize: 14, fontFamily: fontText },
  googleButton: { width: '100%', paddingVertical: 16, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginBottom: 24 },
  googleIconPlaceholder: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  googleButtonText: { fontWeight: '600', fontSize: 16, fontFamily: fontText },
  footerLink: { alignItems: 'center' },
  footerLinkText: { color: '#687280', fontSize: 15, fontFamily: fontText },
  footerLinkTextBold: { color: '#212529', fontWeight: '700', fontFamily: fontText },
});
