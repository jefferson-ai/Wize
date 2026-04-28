import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import Reanimated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withTiming, 
  withDelay, 
  interpolate,
  Extrapolation,
  Easing
} from 'react-native-reanimated';
import { fontText } from '../theme/fonts';
import { useThemeColors } from '../hooks/useThemeColors';
import CategoryIcon from './CategoryIcon';
import { formatAmount } from '../utils/formatters';
import { useNavigation } from '@react-navigation/native';

interface TransactionStackProps {
  transactions: any[];
  currency: string;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function TransactionStack({ transactions, currency, isExpanded, onToggleExpand }: TransactionStackProps) {
  const colors = useThemeColors();
  const progress = useSharedValue(0);
  const expandProgress = useSharedValue(isExpanded ? 1 : 0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(100, withSpring(1, { damping: 15, stiffness: 100 }));
  }, [transactions]);

  useEffect(() => {
    expandProgress.value = withTiming(isExpanded ? 1 : 0, { duration: 350, easing: Easing.out(Easing.cubic) });
  }, [isExpanded]);

  const stackItems = transactions ? transactions.slice(0, 3) : [];
  
  const cardHeight = 80;
  const cardMargin = 10;
  
  const stackedHeight = stackItems.length > 0 ? cardHeight + (stackItems.length - 1) * 12 + 10 : 0;
  const expandedHeight = stackItems.length * (cardHeight + cardMargin);

  const containerStyle = useAnimatedStyle(() => {
    return {
      height: interpolate(expandProgress.value, [0, 1], [stackedHeight, expandedHeight])
    };
  });

  if (stackItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No recent transactions</Text>
      </View>
    );
  }

  return (
    <Reanimated.View style={[styles.cardsContainer, containerStyle]}>
      {stackItems.map((tx, index) => (
        <TransactionCard
          key={tx.id}
          tx={tx}
          index={index}
          totalItems={stackItems.length}
          progress={progress}
          expandProgress={expandProgress}
          cardHeight={cardHeight}
          cardMargin={cardMargin}
          isExpanded={isExpanded}
          onToggleExpand={onToggleExpand}
          currency={currency}
          colors={colors}
        />
      ))}
    </Reanimated.View>
  );
}

interface TransactionCardProps {
  tx: any;
  index: number;
  totalItems: number;
  progress: Reanimated.SharedValue<number>;
  expandProgress: Reanimated.SharedValue<number>;
  cardHeight: number;
  cardMargin: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  currency: string;
  colors: any;
}

function TransactionCard({
  tx,
  index,
  totalItems,
  progress,
  expandProgress,
  cardHeight,
  cardMargin,
  isExpanded,
  onToggleExpand,
  currency,
  colors
}: TransactionCardProps) {
  const navigation = useNavigation<any>();
  const zIndex = totalItems - index;
  
  const animatedStyle = useAnimatedStyle(() => {
    const stackedTranslateY = interpolate(progress.value, [0, 1], [-20, index * 12], Extrapolation.CLAMP);
    const expandedTranslateY = index * (cardHeight + cardMargin);
    const translateY = interpolate(expandProgress.value, [0, 1], [stackedTranslateY, expandedTranslateY]);
    
    const stackedScale = interpolate(progress.value, [0, 1], [0.9, 1 - index * 0.05], Extrapolation.CLAMP);
    const scale = interpolate(expandProgress.value, [0, 1], [stackedScale, 1]);

    const stackedOpacity = interpolate(progress.value, [0, 1], [0, 1 - index * 0.15], Extrapolation.CLAMP);
    const opacity = interpolate(expandProgress.value, [0, 1], [stackedOpacity, 1]);

    return {
      transform: [
        { translateY },
        { scale }
      ],
      opacity,
      zIndex
    };
  });

  const isTop = index === 0;

  return (
    <Reanimated.View
      style={[
        styles.cardWrapper,
        animatedStyle,
        { zIndex }
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => {
          if (!isExpanded) {
            onToggleExpand();
          } else {
            navigation.navigate('EditTransaction', { transaction: tx });
          }
        }}
        style={[
          styles.txRow,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            shadowColor: colors.text,
          }
        ]}
        accessibilityRole="button"
      >
        <View style={[styles.txIcon, { backgroundColor: (tx.category?.color || '#94a3b8') + '22' }]}>
          <CategoryIcon categoryName={tx.category?.name} size={20} color={tx.category?.color || '#94a3b8'} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.txName, { color: colors.text }]}>{tx.category?.name || 'Unknown'}</Text>
          {tx.note ? (
            <Text style={[styles.txNote, { color: colors.textMuted }]} numberOfLines={1}>{tx.note}</Text>
          ) : (
            <Text style={[styles.txNote, { color: colors.textMuted }]}>{new Date(tx.date).toLocaleDateString()}</Text>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={[styles.txAmount, { color: tx.type === 'income' ? colors.success : colors.danger }]}>
            {tx.type === 'income' ? '+' : '-'}{currency} {formatAmount(tx.amount)}
          </Text>
          <Text style={[styles.txDate, { color: colors.textMuted }]}>
            {!isExpanded && isTop ? 'Just now' : new Date(tx.date).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  cardsContainer: {
    position: 'relative',
    width: '100%',
  },

  emptyContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: fontText,
    fontSize: 14,
  },
  cardWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    width: '100%',
  },
  txRow: {
    height: 80,
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  txIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  txName: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: fontText,
  },
  txNote: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: fontText,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: fontText,
  },
  txDate: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: fontText,
  },
});
