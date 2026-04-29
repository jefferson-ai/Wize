import React, { memo } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { Trash } from 'phosphor-react-native';
import CategoryIcon from './CategoryIcon';
import { formatAmount } from '../utils/formatters';

interface TransactionItemProps {
  item: any;
  currency: string;
  colors: any;
  fontDisplay?: string;
  fontText?: string;
  onPress: (item: any) => void;
  onDelete?: (id: string) => void;
  hideDelete?: boolean;
}

const TransactionItem = memo(({ 
  item, 
  currency, 
  colors, 
  fontDisplay = 'Inter-Bold',
  fontText = 'Inter-Medium',
  onPress, 
  onDelete,
  hideDelete = false
}: TransactionItemProps) => {

  const renderRightActions = (progress: any) => {
    if (hideDelete || !onDelete) return null;
    
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1],
      extrapolate: 'clamp',
    });

    return (
      <RectButton
        style={[styles.deleteAction, { backgroundColor: colors.dangerBg }]}
        onPress={() => onDelete(item.id)}
      >
        <Animated.View style={{ transform: [{ scale }] }}>
          <Trash size={22} color={colors.danger} />
        </Animated.View>
      </RectButton>
    );
  };

  const rowContent = (
    <RectButton
      style={[styles.txRow, { backgroundColor: colors.card }]}
      onPress={() => onPress(item)}
      accessibilityRole="button"
      accessibilityLabel={`View ${item.category?.name || 'Unknown'} transaction`}
    >
      <View style={[styles.txIcon, { backgroundColor: (item.category?.color || '#94a3b8') + '22' }]}>
        <CategoryIcon categoryName={item.category?.name} size={20} color={item.category?.color || '#94a3b8'} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.txName, { color: colors.text, fontFamily: fontDisplay }]}>{item.category?.name || 'Unknown'}</Text>
        {item.note && <Text style={[styles.txNote, { color: colors.textMuted, fontFamily: fontText }]} numberOfLines={1}>{item.note}</Text>}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.txAmount, { color: item.type === 'income' ? colors.success : colors.danger, fontFamily: fontDisplay }]}>
          {item.type === 'income' ? '+' : '-'}{currency} {formatAmount(item.amount)}
        </Text>
        <Text style={[styles.txDate, { color: colors.textMuted, fontFamily: fontText }]}>
          {new Date(item.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
        </Text>
      </View>
    </RectButton>
  );

  if (hideDelete) {
    return rowContent;
  }

  return (
    <Swipeable
      key={item.id}
      renderRightActions={renderRightActions}
      friction={1.5}
      rightThreshold={40}
    >
      {rowContent}
    </Swipeable>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.item.id === nextProps.item.id &&
    prevProps.item.amount === nextProps.item.amount &&
    prevProps.item.note === nextProps.item.note &&
    prevProps.currency === nextProps.currency &&
    prevProps.colors.text === nextProps.colors.text
  );
});

export default TransactionItem;

const styles = StyleSheet.create({
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: 'transparent' },
  txIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  txName: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  txNote: { fontSize: 13 },
  txAmount: { fontSize: 15, fontWeight: '700', marginBottom: 4 },
  txDate: { fontSize: 12 },
  deleteAction: { width: 80, justifyContent: 'center', alignItems: 'center' },
});
