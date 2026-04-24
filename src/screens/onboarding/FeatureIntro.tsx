import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRight, ArrowLeft } from 'phosphor-react-native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { OnboardingStackScreenProps } from '../../navigation/types';
import { fontDisplay, fontRounded, fontText } from '../../theme/fonts';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FEATURES = [
  {
    id: 'tracking',
    title: 'Smart Tracking',
    subtitle: 'Manage your wallets and logs with precision.',
    color: '#3b82f6',
    image: require('../../../assets/onboarding/home_screen.png'),
    steps: [
      'Organize your funds into distinct wallets.',
      'Log transactions in under 3 seconds.',
      'Auto-categorize your spending habits.',
      'Real-time balance synchronization.'
    ]
  },
  {
    id: 'ai',
    title: 'AI Smart Advisor',
    subtitle: 'Get automated, personalized intelligence reports.',
    color: '#8b5cf6',
    image: require('../../../assets/onboarding/ai_strategist.png'),
    steps: [
      'Automated monthly budget suggestions.',
      'Smart anomaly detection on expenses.',
      'Goal-based saving predictions.'
    ]
  },
  {
    id: 'analytics',
    title: 'Decision Intelligence',
    subtitle: 'Visualize trends to build better savings habits.',
    color: '#7c3aed',
    image: require('../../../assets/onboarding/insights_screen_v2.png'),
    steps: [
      'Deep spending habit scores & radar charts.',
      'Maintain logging streaks for rewards.',
      'Identify trends across any period.'
    ]
  },
];

export default function FeatureIntroScreen({ navigation }: OnboardingStackScreenProps<'FeatureIntro'>) {
  const colors = useThemeColors();
  const [currentIndex, setCurrentIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentIndex < FEATURES.length - 1) {
      animateTransition(() => setCurrentIndex(currentIndex + 1));
    } else {
      navigation.navigate('CurrencySetup');
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      animateTransition(() => setCurrentIndex(currentIndex - 1));
    }
  };

  const animateTransition = (callback: () => void) => {
    // Stage 1: Fade out and shrink
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true })
    ]).start(() => {
      callback();
      // Stage 2: Fade in and grow to full size
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    });
  };

  const renderVisual = (index: number) => {
    const feature = FEATURES[index];
    const isDark = colors.isDark;
    const phoneBg = isDark ? '#1a1a1a' : '#f8f9fa';

    return (
      <View style={[styles.phoneFrame, { backgroundColor: phoneBg, borderColor: colors.border }]}>
        <View style={[styles.phoneNotch, { backgroundColor: colors.border }]} />
        <View style={styles.phoneInner}>
          <Image 
            source={feature.image} 
            style={styles.screenshotImage} 
            resizeMode="cover"
          />
        </View>
      </View>
    );
  };

  const feature = FEATURES[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.skipText, { color: colors.textMuted }]} onPress={() => navigation.navigate('CurrencySetup')}>
          Skip
        </Text>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ 
          opacity: fadeAnim, 
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
          width: '100%',
          marginBottom: 8
        }}>
          <Text style={[styles.title, { color: colors.text }]}>{feature.title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>{feature.subtitle}</Text>
        </Animated.View>

        <Animated.View style={[styles.visualContainer, { 
          backgroundColor: feature.color + '05',
          opacity: fadeAnim,
          // Removed scaleAnim from here to restrict morphing to header only
        }]}>
          {renderVisual(currentIndex)}
        </Animated.View>

        <View style={styles.stepsContainer}>
          {feature.steps.map((step, idx) => (
            <Animated.View key={idx} style={[styles.stepRow, { 
              opacity: fadeAnim,
              // Removed scaleAnim from here to restrict morphing to header only
            }]}>
              <View style={[styles.stepNumber, { backgroundColor: feature.color + '15' }]}>
                <Text style={[styles.stepNumberText, { color: feature.color }]}>{idx + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.text }]}>{step}</Text>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.backButton, { backgroundColor: colors.background, borderColor: colors.border }]}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={currentIndex === 0 ? colors.textMuted : colors.text} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.nextButton, { backgroundColor: colors.text }]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Text style={[styles.nextButtonText, { color: colors.background }]}>
            {currentIndex === FEATURES.length - 1 ? "Let's Begin" : "Next"}
          </Text>
          <ArrowRight size={20} color={colors.background} weight="bold" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 8,
    alignItems: 'flex-end',
  },
  skipText: {
    fontFamily: fontRounded,
    fontWeight: '600',
    fontSize: 14,
    padding: 8,
  },
  scrollContent: {
    paddingHorizontal: 32,
    alignItems: 'center',
    paddingBottom: 40,
  },
  title: {
    fontFamily: fontDisplay,
    fontWeight: '800',
    fontSize: 32,
    textAlign: 'center',
    marginTop: 10,
  },
  subtitle: {
    fontFamily: fontText,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  visualContainer: {
    width: '100%',
    height: 380,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    overflow: 'hidden',
  },
  phoneFrame: {
    width: 200,
    height: 360,
    borderRadius: 32,
    borderWidth: 8,
    padding: 8,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  phoneNotch: {
    width: 60,
    height: 18,
    borderRadius: 9,
    alignSelf: 'center',
    marginBottom: 10,
  },
  phoneInner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 18,
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
  },
  stepsContainer: {
    width: '100%',
    gap: 12,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: fontRounded,
  },
  stepText: {
    flex: 1,
    fontFamily: fontText,
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 16,
    alignItems: 'center',
  },
  backButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  nextButton: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#fff',
    fontFamily: fontDisplay,
    fontWeight: '700',
    fontSize: 18,
  },
});
