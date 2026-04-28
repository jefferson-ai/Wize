import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, StyleSheet, ActivityIndicator, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MagnifyingGlass, X, Funnel } from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { useAuthStore } from '../store/authStore';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { getTransactions } from '../features/transactions/transactionService';
import CategoryIcon from '../components/CategoryIcon';
import { formatAmount } from '../utils/formatters';
import { fontDisplay, fontText } from '../theme/fonts';

const HighlightedText = ({ text, highlight, style, colors }: any) => {
  if (!highlight.trim()) {
    return <Text style={style}>{text}</Text>;
  }
  const regex = new RegExp(`(${highlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part: string, i: number) => 
        regex.test(part) ? (
          <Text key={i} style={{ backgroundColor: '#fff3cd', color: '#856404' }}>{part}</Text>
        ) : (
          <Text key={i}>{part}</Text>
        )
      )}
    </Text>
  );
};

export default function SearchTransactionsScreen({ navigation }: any) {
  const colors = useThemeColors();
  const { user } = useAuthStore();
  const { currency } = useAppSettingsStore();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const searchInputRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.length >= 2) {
        performSearch();
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const performSearch = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const data = await getTransactions(user.id, {
        search: query,
        limit: 50
      });
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={[styles.resultItem, { borderBottomColor: colors.border }]}
      onPress={() => navigation.navigate('EditTransaction', { transaction: item })}
    >
      <View style={[styles.iconContainer, { backgroundColor: (item.category?.color || '#94a3b8') + '22' }]}>
        <CategoryIcon categoryName={item.category?.name} size={18} color={item.category?.color || '#94a3b8'} />
      </View>
      <View style={{ flex: 1 }}>
        <HighlightedText 
          text={item.note || item.category?.name || 'Unknown'} 
          highlight={query} 
          style={[styles.title, { color: colors.text }]} 
          colors={colors}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
          <View style={[styles.dot, { backgroundColor: item.category?.color || '#94a3b8' }]} />
          <Text style={[styles.category, { color: colors.textMuted }]}>{item.category?.name || 'Uncategorized'}</Text>
        </View>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[styles.amount, { color: item.type === 'income' ? colors.success : colors.danger }]}>
          {item.type === 'income' ? '+' : '-'}{currency}{formatAmount(item.amount)}
        </Text>
        <Text style={[styles.date, { color: colors.textMuted }]}>
          {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={{ width: 40 }} />
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <X size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Search Input */}
      <View style={styles.searchBarWrap}>
        <View style={[styles.searchInner, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <MagnifyingGlass size={20} color={colors.textMuted} />
          <TextInput
            ref={searchInputRef}
            placeholder="Search notes or categories..."
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { color: colors.text }]}
            autoFocus
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
          {loading && <ActivityIndicator size="small" color={colors.textMuted} style={{ marginLeft: 8 }} />}
        </View>
      </View>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            {query.length < 2 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Type at least 2 characters to search</Text>
            ) : !loading ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No transactions found for "{query}"</Text>
            ) : null}
          </View>
        )}
        onScrollBeginDrag={() => Keyboard.dismiss()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 12 
  },
  headerTitle: { fontSize: 17, fontWeight: '700', fontFamily: fontDisplay },
  closeBtn: { padding: 4 },
  
  searchBarWrap: { paddingHorizontal: 20, paddingVertical: 12 },
  searchInner: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#f5f6f7', 
    paddingHorizontal: 16, 
    height: 52, 
    borderRadius: 16,
    borderWidth: 1,
  },
  input: { flex: 1, marginLeft: 12, fontSize: 16, height: '100%' },

  resultItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 16, 
    borderBottomWidth: 1 
  },
  iconContainer: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 16 
  },
  title: { fontSize: 16, fontWeight: '600' },
  category: { fontSize: 13, marginLeft: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  amount: { fontSize: 15, fontWeight: '700' },
  date: { fontSize: 12, marginTop: 2 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { fontSize: 15, textAlign: 'center' }
});
