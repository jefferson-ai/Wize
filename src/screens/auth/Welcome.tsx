import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AuthStackScreenProps } from '../../navigation/types';
import { useThemeColors } from '../../hooks/useThemeColors';
import { fontDisplay, fontText } from '../../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }: AuthStackScreenProps<'Welcome'>) {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        
        <View style={styles.logoContainer}>
          <Image 
            source={require('../../assets/dollar-icon.png')} 
            style={styles.logo} 
            resizeMode="contain" 
          />
        </View>

        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            Welcome {'\n'}to Wize 👋
          </Text>
          
          <Text style={[styles.description, { color: colors.textMuted }]}>
            A simple & beautiful budgeting app built to help you track expenses, curb spending, and reach financial freedom faster.
          </Text>
        </View>

      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.text }]}
          onPress={() => navigation.navigate('SignUp')}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>
            Create an Account
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.navigate('SignIn')}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
            Log in
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1 
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 120,
    height: 120,
  },
  textContainer: {
    alignItems: 'flex-start',
  },
  title: { 
    fontSize: 42, 
    fontWeight: '800', 
    marginBottom: 24, 
    fontFamily: fontDisplay,
    lineHeight: 48,
  },
  description: { 
    fontSize: 20, 
    lineHeight: 32, 
    fontFamily: fontDisplay,
  },
  footer: { 
    paddingHorizontal: 24, 
    paddingBottom: 40,
    gap: 16,
  },
  primaryButton: { 
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
  },
  primaryButtonText: { 
    fontWeight: '700', 
    fontSize: 17, 
    fontFamily: fontDisplay 
  },
  secondaryButton: { 
    width: '100%', 
    paddingVertical: 18, 
    borderRadius: 20, 
    alignItems: 'center', 
    borderWidth: 1.5 
  },
  secondaryButtonText: { 
    fontWeight: '700', 
    fontSize: 17, 
    fontFamily: fontDisplay 
  },
});
