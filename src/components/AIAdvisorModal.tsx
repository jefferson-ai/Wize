import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Animated, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { X, Sparkle, CheckCircle, TrendUp, Heart, Warning, PaperPlaneRight, User } from 'phosphor-react-native';
import { useThemeColors } from '../hooks/useThemeColors';
import { getAIAdvice, AIAdvice, sendChatMessage } from '../services/aiAdvisor';
import { getSmartInsights, AnomalyAlert } from '../features/ai/aiService';
import { formatAmount } from '../utils/formatters';
import { useAppSettingsStore } from '../store/appSettingsStore';
import { fontDisplay, fontText } from '../theme/fonts';

interface AIAdvisorModalProps {
  isVisible: boolean;
  onClose: () => void;
  userId: string;
}

export default function AIAdvisorModal({ isVisible, onClose, userId }: AIAdvisorModalProps) {
  const colors = useThemeColors();
  const { currency } = useAppSettingsStore();
  const [loading, setLoading] = useState(true);
  const [advice, setAdvice] = useState<AIAdvice | null>(null);
  const [messages, setMessages] = useState<{role: 'user'|'model', content: string}[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (isVisible && !advice) {
      loadAdvice();
    } else if (!isVisible) {
      setLoading(true);
      setAdvice(null);
    }
  }, [isVisible]);

  const loadAdvice = async () => {
    // Prevent multiple simultaneous calls
    if (advice && loading) return;
    
    try {
      setLoading(true);
      const [res] = await Promise.all([
        getAIAdvice(userId)
      ]);
      setAdvice(res);
      
      // Format the initial advice as the first message
      const initialContent = `**Intelligence Report:**\n${res.summary}\n\n**Actionable Steps:**\n${res.actionItems.map(i => `• ${i}`).join('\n')}\n\n*${res.encouragement}*`;
      setMessages([{ role: 'model', content: initialContent }]);
      
      setLoading(false);
    } catch (err) {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputText.trim() || isSending) return;
    
    const userMsg = inputText.trim();
    setInputText('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsSending(true);

    // Scroll to bottom
    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await sendChatMessage(userId, userMsg, messages);
      setMessages(prev => [...prev, { role: 'model', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I ran into an issue connecting to the network." }]);
    } finally {
      setIsSending(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  const renderMarkdown = (text: string) => {
    // A very simple markdown bold and bullet renderer for the chat bubbles
    const paragraphs = text.split('\n');
    return paragraphs.map((p, i) => {
      if (p.trim() === '') return <View key={i} style={{ height: 8 }} />;
      
      // Simple bold replacement
      const parts = p.split(/\*\*(.*?)\*\*/g);
      
      return (
        <Text key={i} style={[styles.chatText, { color: colors.text, marginBottom: 4 }]}>
          {parts.map((part, index) => {
            if (index % 2 === 1) {
              return <Text key={index} style={{ fontWeight: 'bold' }}>{part}</Text>;
            }
            return part;
          })}
        </Text>
      );
    });
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerTitle}>
              <View style={[styles.iconWrap, { backgroundColor: colors.text + '10' }]}>
                <Sparkle size={20} color={colors.text} weight="fill" />
              </View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>AI Strategist</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView 
            ref={scrollViewRef}
            showsVerticalScrollIndicator={false} 
            contentContainerStyle={styles.scrollContent}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.text} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                  Analysing your habits...
                </Text>
              </View>
            ) : (
              <View style={styles.chatContainer}>
                {messages.map((msg, idx) => {
                  const isModel = msg.role === 'model';
                  return (
                    <View key={idx} style={[styles.messageRow, isModel ? styles.messageRowModel : styles.messageRowUser]}>
                      {isModel && (
                        <View style={[styles.avatarBox, { backgroundColor: colors.text + '10' }]}>
                          <Sparkle size={14} color={colors.text} weight="fill" />
                        </View>
                      )}
                      
                      <View style={[
                        styles.messageBubble, 
                        isModel ? [styles.modelBubble, { backgroundColor: colors.card, borderColor: colors.border }] : [styles.userBubble, { backgroundColor: colors.text }]
                      ]}>
                        {isModel ? (
                           renderMarkdown(msg.content)
                        ) : (
                           <Text style={[styles.chatText, { color: colors.background }]}>{msg.content}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
                
                {isSending && (
                  <View style={[styles.messageRow, styles.messageRowModel]}>
                    <View style={[styles.avatarBox, { backgroundColor: colors.text + '10' }]}>
                      <Sparkle size={14} color={colors.text} weight="fill" />
                    </View>
                    <View style={[styles.messageBubble, styles.modelBubble, { backgroundColor: colors.card, borderColor: colors.border, paddingVertical: 14 }]}>
                      <ActivityIndicator size="small" color={colors.text} />
                    </View>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Input Area */}
          <View style={[styles.inputArea, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
            <TextInput
              style={[styles.textInput, { color: colors.text, backgroundColor: colors.card }]}
              placeholder="Ask about your spending..."
              placeholderTextColor={colors.textMuted}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={200}
            />
            <TouchableOpacity 
              onPress={handleSend} 
              disabled={isSending || !inputText.trim()}
              style={[styles.sendBtn, { backgroundColor: (isSending || !inputText.trim()) ? colors.border : colors.text }]}
            >
              <PaperPlaneRight size={20} color={colors.background} weight="fill" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  centeredView: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalView: { width: '100%', height: '88%', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 0, shadowColor: '#000', shadowOffset: { width: 0, height: -4, }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 5, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '700', fontFamily: fontDisplay },
  closeBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
  scrollContent: { paddingBottom: 20 },
  loadingContainer: { height: 400, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 15, fontFamily: fontText },
  
  chatContainer: { flex: 1, paddingBottom: 20 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowModel: { justifyContent: 'flex-start', paddingRight: 40 },
  messageRowUser: { justifyContent: 'flex-end', paddingLeft: 40 },
  avatarBox: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 8, marginBottom: 2 },
  messageBubble: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  modelBubble: { borderBottomLeftRadius: 4, borderWidth: 1 },
  userBubble: { borderBottomRightRadius: 4 },
  chatText: { fontSize: 15, lineHeight: 22, fontFamily: fontText },
  
  inputArea: { flexDirection: 'row', alignItems: 'flex-end', paddingVertical: 12, borderTopWidth: 1, marginBottom: 30 }, // Extra margin for iOS bottom safe area
  textInput: { flex: 1, minHeight: 44, maxHeight: 100, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, fontFamily: fontText },
  sendBtn: { width: 44, height: 44, borderRadius: 22, marginLeft: 10, alignItems: 'center', justifyContent: 'center' },
});
