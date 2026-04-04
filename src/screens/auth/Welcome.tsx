import React, { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  StyleSheet, 
  FlatList, 
  Dimensions, 
  NativeSyntheticEvent, 
  NativeScrollEvent 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PieChart } from 'react-native-gifted-charts';
import RadarChart from '../../components/RadarChart';
import { AuthStackScreenProps } from '../../navigation/types';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppSettingsStore } from '../../store/appSettingsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PIE_DATA = [
  { value: 40, color: '#272b30', label: 'Food' },
  { value: 25, color: '#4a515a', label: 'Transport' },
  { value: 20, color: '#7b838f', label: 'Rent' },
  { value: 15, color: '#adb4be', label: 'Other' },
];

const RADAR_DATA = [
  { label: 'Food', current: 400, previous: 350 },
  { label: 'Shop', current: 300, previous: 450 },
  { label: 'Rent', current: 1200, previous: 1200 },
  { label: 'Transp', current: 200, previous: 180 },
  { label: 'Bills', current: 150, previous: 200 },
];

const SLIDES = [
  {
    id: 'splash',
    title: 'SpendWise',
    subtitle: 'High intelligence expense tracking for modern individuals.',
    type: 'splash',
  },
  {
    id: 'tracking',
    title: 'Track Every Penny',
    subtitle: 'Visualize your spending distribution in real-time with smart donut charts.',
    type: 'tracking',
  },
  {
    id: 'insights',
    title: 'Understand Habits',
    subtitle: 'Compare your spending habits across months to stay in control of your growth.',
    type: 'insights',
  },
  {
    id: 'budgets',
    title: 'Own Your Limits',
    subtitle: 'Set custom targets and keep your finances in the green all month long.',
    type: 'budgets',
  }
];

export default function WelcomeScreen({ navigation }: AuthStackScreenProps<'Welcome'>) {
  const colors = useThemeColors();
  const { setHasSeenWelcomeCarousel } = useAppSettingsStore();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollOffset / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const skipOnboarding = () => {
    setHasSeenWelcomeCarousel(true);
    flatListRef.current?.scrollToEnd();
  };

  const renderIllustration = (type: string) => {
    switch (type) {
      case 'splash':
        return (
          <View style={styles.splashMockup}>
            <Image 
              source={require('../../assets/dollar-icon.png')} 
              style={styles.splashLogo} 
              resizeMode="contain" 
            />
          </View>
        );
      case 'tracking':
        return (
          <View style={[styles.mockupContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.chartTitle, { color: colors.text }]}>Expense Distribution</Text>
            <View style={styles.pieContainer}>
              <PieChart
                donut
                innerRadius={50}
                radius={70}
                strokeWidth={4}
                strokeColor={colors.card}
                innerCircleColor={colors.card}
                data={PIE_DATA}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 14 }}>GHS 2.4K</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 10 }}>Total</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.pieLegend}>
               {PIE_DATA.slice(0, 3).map((item, i) => (
                 <View key={i} style={styles.legendEntry}>
                   <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                   <Text style={[styles.legendText, { color: colors.textMuted }]}>{item.label}</Text>
                 </View>
               ))}
            </View>
          </View>
        );
      case 'insights':
        return (
          <View style={[styles.mockupContainer, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 10 }]}>
            <Text style={[styles.chartTitle, { color: colors.text, marginBottom: 0 }]}>Habit Comparison</Text>
            <View style={styles.radarContainer}>
              <RadarChart 
                data={RADAR_DATA} 
                size={140}
                currentColor={colors.text}
                previousColor={colors.textMuted}
                gridColor={colors.border}
                labelColor={colors.text}
              />
            </View>
          </View>
        );
      case 'budgets':
        return (
          <View style={styles.mockupContainer}>
            <View style={[styles.miniBudgetCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
               <View style={styles.budgetHeader}>
                  <View style={[styles.budgetDot, { backgroundColor: '#f87171' }]} />
                  <Text style={[styles.budgetName, { color: colors.text }]}>Monthly Personal</Text>
               </View>
               <View style={styles.budgetAmountRow}>
                  <Text style={[styles.budgetSpent, { color: colors.text }]}>GHS 850</Text>
                  <Text style={[styles.budgetTotal, { color: colors.textMuted }]}>/ 1,000</Text>
               </View>
               <View style={styles.progressBg}>
                  <View style={[styles.progressFill, { width: '85%', backgroundColor: colors.danger }]} />
               </View>
               <View style={[styles.statusBadge, { backgroundColor: colors.danger + '18' }]}>
                 <Text style={[styles.statusText, { color: colors.danger }]}>Nearing Limit</Text>
               </View>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  const renderSlide = ({ item }: { item: any }) => {
    return (
      <View style={styles.slide}>
        <View style={styles.illustrationArea}>
          {renderIllustration(item.type)}
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>{item.subtitle}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        {activeIndex < SLIDES.length - 1 && (
          <TouchableOpacity onPress={skipOnboarding} style={styles.skipBtn}>
            <Text style={[styles.skipText, { color: colors.textMuted }]}>Skip</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        keyExtractor={(item) => item.id}
        scrollEventThrottle={16}
      />

      <View style={styles.footer}>
        <View style={styles.pagination}>
          {SLIDES.map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.dot, 
                { backgroundColor: i === activeIndex ? colors.text : colors.border, width: i === activeIndex ? 22 : 8 }
              ]} 
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: colors.text }]}
          onPress={() => navigation.navigate('SignUp')}
        >
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>Create an account</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: colors.border }]}
          onPress={() => navigation.navigate('SignIn')}
        >
          <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: { height: 60, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'flex-end' },
  skipBtn: { padding: 8 },
  skipText: { fontSize: 16, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },
  slide: { width: SCREEN_WIDTH, alignItems: 'center', paddingHorizontal: 40 },
  illustrationArea: { height: SCREEN_WIDTH * 0.8, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  
  // Custom containers
  mockupContainer: { 
    width: SCREEN_WIDTH * 0.82, 
    padding: 24, 
    borderRadius: 28, 
    borderWidth: 1.5, 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 8,
  },
  chartTitle: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: '700', marginBottom: 20, fontFamily: 'InstrumentSans_700Bold' },
  pieContainer: { marginVertical: 10 },
  pieLegend: { flexDirection: 'row', gap: 12, marginTop: 16 },
  legendEntry: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, fontWeight: '600', fontFamily: 'InstrumentSans_600SemiBold' },

  radarContainer: { height: 200, width: '100%', alignItems: 'center', justifyContent: 'center' },
  
  // Splash
  splashMockup: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
  splashLogo: { width: 130, height: 130 },
  
  // Budgets
  miniBudgetCard: { width: '100%', padding: 20, borderRadius: 24, borderWidth: 1.5 },
  budgetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  budgetDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  budgetName: { fontSize: 15, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  budgetAmountRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 10 },
  budgetSpent: { fontSize: 22, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },
  budgetTotal: { fontSize: 14, marginLeft: 6, marginBottom: 3, fontFamily: 'InstrumentSans_400Regular' },
  progressBg: { height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, marginBottom: 14 },
  progressFill: { height: '100%', borderRadius: 4 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { fontSize: 11, fontWeight: '700', fontFamily: 'InstrumentSans_700Bold' },

  title: { fontSize: 28, fontWeight: '800', textAlign: 'center', marginBottom: 16, paddingHorizontal: 10, fontFamily: 'InstrumentSans_700Bold' },
  subtitle: { fontSize: 17, textAlign: 'center', color: '#64748b', lineHeight: 26, paddingHorizontal: 10, fontFamily: 'InstrumentSans_400Regular' },
  footer: { paddingHorizontal: 24, paddingBottom: 40 },
  pagination: { flexDirection: 'row', justifyContent: 'center', marginBottom: 40 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  primaryButton: { width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 14 },
  primaryButtonText: { fontWeight: '700', fontSize: 17, fontFamily: 'InstrumentSans_700Bold' },
  secondaryButton: { width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', borderWidth: 1.5 },
  secondaryButtonText: { fontWeight: '700', fontSize: 17, fontFamily: 'InstrumentSans_700Bold' },
});
