import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

const SFU_RED = '#C8102E';
const NAV_BG = '#54585A';
const { height: SCREEN_H } = Dimensions.get('window');

// ─── Stub AI function ─────────────────────────────────────────────────────────
async function getAIResponse(userMessage: string, imageUri?: string): Promise<string> {
  // TODO: Connect this to manish back end
  await new Promise(r => setTimeout(r, 1200));

  if (imageUri) {
    return 'I see you attached an image! Currently analyzing this document using our vision models...';
  }

  const lower = userMessage.toLowerCase();
  if (lower.includes('course') || lower.includes('cmpt') || lower.includes('class'))
    return 'SFU offers a wide range of courses across all faculties. You can browse the full catalogue at sfu.ca/students/calendar. Need help finding a specific course?';
  if (lower.includes('prof') || lower.includes('teacher') || lower.includes('instructor'))
    return 'Professor ratings can be found on Rate My Professor and through SFU\'s course evaluation system. Which department are you curious about?';
  if (lower.includes('map') || lower.includes('building') || lower.includes('room') || lower.includes('where'))
    return 'SFU\'s main Burnaby campus is on Burnaby Mountain. Key buildings include the AQ, WMC, and SSB. Which building are you trying to find?';
  if (lower.includes('advis'))
    return 'Academic advising is handled per department. You can book through the SFU advising portal or attend drop-in hours.';
  return "That's a great question! I can help with course info, professor reviews, campus locations, advising, clubs, and more. What would you like to know?";
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const LocationIcon = ({ color = '#fff' }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </Svg>
);
const SchoolIcon = ({ color = '#fff' }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
    <Path d="M12 3L1 9l4 2.18V17h2v-4.82l1 .55V17c0 2.21 1.79 4 4 4s4-1.79 4-4v-4.27l4-2.18v-1L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM16 17c0 2.21-1.79 4-4 4s-4-1.79-4-4v-3.45l4 2.18 4-2.18V17z" />
  </Svg>
);
const ChatIcon = ({ color = '#fff' }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
    <Path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z" />
  </Svg>
);
const SettingsIcon = ({ color = '#fff' }) => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={color}>
    <Path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.63-.07.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
  </Svg>
);
const UploadIcon = ({ color = '#fff' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z" />
  </Svg>
);
const SearchIcon = ({ color = '#fff' }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={color}>
    <Path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
  </Svg>
);

// Row icons for the upload sheet
const TranscriptIcon = ({ color = SFU_RED }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
    <Path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm-1 7V3.5L18.5 9H13zm-1 9H8v-2h4v2zm3-4H8v-2h7v2z" />
  </Svg>
);
const CalendarIcon = ({ color = SFU_RED }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
    <Path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z" />
  </Svg>
);
const ClipIcon = ({ color = SFU_RED }) => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill={color}>
    <Path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
  </Svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  imageUri?: string; // optional attached image
}

// ─── SFU Logo Watermark ───────────────────────────────────────────────────────
function SFUWatermark() {
  return (
    <View style={styles.watermarkContainer} pointerEvents="none">
      <View style={styles.octagonOuter}>
        <View style={styles.octagonInner}>
          <Text style={styles.watermarkLeaf}>🍁</Text>
          <Text style={styles.watermarkLine1}>SIMON FRASER</Text>
          <Text style={styles.watermarkLine2}>UNIVERSITY</Text>
          <Text style={styles.watermarkLine3}>ASKSFU</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ message }: { message: Message }) {
  const isUser = message.sender === 'user';
  return (
    <View style={[styles.bubbleRow, isUser ? styles.bubbleRowUser : styles.bubbleRowAI]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        {/* Attached image preview inside the bubble */}
        {message.imageUri && (
          <Image
            source={{ uri: message.imageUri }}
            style={styles.bubbleImage}
            resizeMode="cover"
          />
        )}
        {message.text ? (
          <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAI]}>
            {message.text}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

// ─── Bottom nav bar ───────────────────────────────────────────────────────────
function BottomNav({ activeTab }: { activeTab: string }) {
  const tabs = [
    { id: 'location', Icon: LocationIcon, label: 'Location' },
    { id: 'school', Icon: SchoolIcon, label: 'School' },
    { id: 'chat', Icon: ChatIcon, label: 'Chat' },
    { id: 'settings', Icon: SettingsIcon, label: 'Settings' },
  ];
  return (
    <View style={styles.navBar}>
      {tabs.map(({ id, Icon, label }) => (
        <TouchableOpacity
          key={id}
          style={styles.navItem}
          onPress={() => console.log(`Nav: ${label} pressed`)}
          activeOpacity={0.7}
        >
          <Icon color={id === activeTab ? SFU_RED : '#fff'} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Upload Bottom Sheet ──────────────────────────────────────────────────────
function UploadSheet({
  visible,
  onClose,
  onImageSelected,
}: {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string) => void;
}) {
  const slideAnim = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  // Keep Modal in the tree while animating closed
  const [modalVisible, setModalVisible] = useState(false);
  const [saveForContext, setSaveForContext] = useState(false);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      // Reset position off-screen before animating in
      slideAnim.setValue(SCREEN_H);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 380,
          easing: Easing.out(Easing.bezier(0.25, 0.46, 0.45, 0.94)),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();
    } else if (modalVisible) {
      // Animate out first, THEN hide the modal
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_H,
          duration: 320,
          easing: Easing.in(Easing.bezier(0.55, 0.06, 0.68, 0.19)),
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) setModalVisible(false);
      });
    }
  }, [visible]);

  const openPhotoLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      console.log('Photo library permission denied');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (!result.canceled) {
      onImageSelected(result.assets[0].uri); // pass URI up to parent
      onClose();
    }
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Dim backdrop — animated */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.sheetBackdrop, { opacity: backdropAnim }]} />
      </TouchableWithoutFeedback>

      {/* Sheet panel */}
      <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={styles.sheetHandle} />

        {/* Title */}
        <Text style={styles.sheetTitle}>Upload Documents</Text>
        <Text style={styles.sheetSubtitle}>Select files for AI analysis</Text>

        {/* Row: Advising Transcript */}
        <TouchableOpacity
          style={styles.sheetRow}
          onPress={() => console.log('Advising Transcript pressed')}
          activeOpacity={0.75}
        >
          <View style={styles.sheetRowIcon}>
            <TranscriptIcon />
          </View>
          <View style={styles.sheetRowText}>
            <Text style={styles.sheetRowTitle}>Advising Transcript</Text>
            <Text style={styles.sheetRowSub}>PDF format preferred</Text>
          </View>
        </TouchableOpacity>

        {/* Row: Course Timetable — opens photos */}
        <TouchableOpacity
          style={styles.sheetRow}
          onPress={openPhotoLibrary}
          activeOpacity={0.75}
        >
          <View style={styles.sheetRowIcon}>
            <CalendarIcon />
          </View>
          <View style={styles.sheetRowText}>
            <Text style={styles.sheetRowTitle}>Course Timetable</Text>
            <Text style={styles.sheetRowSub}>Image or Screenshot</Text>
          </View>
        </TouchableOpacity>

        {/* Row: Other Documents */}
        <TouchableOpacity
          style={styles.sheetRow}
          onPress={() => console.log('Other Documents pressed')}
          activeOpacity={0.75}
        >
          <View style={styles.sheetRowIcon}>
            <ClipIcon />
          </View>
          <View style={styles.sheetRowText}>
            <Text style={styles.sheetRowTitle}>Other Documents</Text>
            <Text style={styles.sheetRowSub}>Any file type</Text>
          </View>
        </TouchableOpacity>

        {/* Save for context toggle */}
        <View style={styles.sheetToggleRow}>
          <View>
            <Text style={styles.sheetToggleTitle}>Save for context</Text>
            <Text style={styles.sheetToggleSub}>ENABLE CONSENSUAL SAVING</Text>
          </View>
          <Switch
            value={saveForContext}
            onValueChange={setSaveForContext}
            trackColor={{ false: '#ccc', true: SFU_RED }}
            thumbColor="#fff"
            ios_backgroundColor="#ccc"
          />
        </View>

        {/* Start Advisor Analysis button */}
        <TouchableOpacity
          style={styles.sheetCta}
          onPress={() => { console.log('Start Advisor Analysis pressed'); onClose(); }}
          activeOpacity={0.85}
        >
          <Text style={styles.sheetCtaText}>⊞  Start Advisor Analysis</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

// ─── Main Chatbot Screen ──────────────────────────────────────────────────────
export default function ChatbotScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', sender: 'ai', text: "Hey SFU! Ask me about courses, prof reviews, rooms, clubs, or advising. What's up?" },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadVisible, setUploadVisible] = useState(false);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const flatRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text && !attachedImage || isLoading) return;
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      imageUri: attachedImage ?? undefined,
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAttachedImage(null);
    setIsLoading(true);
    try {
      // Pass the text and the attached image URI to the AI API
      const aiText = await getAIResponse(text, attachedImage ?? undefined);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: aiText }]);
    } catch {
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), sender: 'ai', text: "Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={SFU_RED} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ChatBot</Text>
      </View>

      <View style={styles.flex}>
        {/* Chat area */}
        <View style={styles.chatArea}>
          {messages.length <= 1 && <SFUWatermark />}
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={item => item.id}
            renderItem={({ item }) => <MessageBubble message={item} />}
            contentContainerStyle={styles.messageList}
            showsVerticalScrollIndicator={false}
          />
          {isLoading && (
            <View style={styles.typingRow}>
              <View style={styles.typingBubble}>
                <ActivityIndicator size="small" color="#888" />
                <Text style={styles.typingText}>  AskSFU is thinking…</Text>
              </View>
            </View>
          )}
        </View>

        {/* Input bar */}
        <View style={styles.inputBarWrapper}>
          <View style={styles.inputPill}>
            {/* Upload button */}
            <TouchableOpacity
              style={styles.pillIconBtn}
              onPress={() => setUploadVisible(true)}
              hitSlop={8}
            >
              <UploadIcon />
            </TouchableOpacity>

            <View style={styles.inputMainArea}>
              {/* Attached image preview inside the pill */}
              {attachedImage && (
                <View style={styles.attachPreviewRow}>
                  <View style={styles.attachPreviewCard}>
                    <Image
                      source={{ uri: attachedImage }}
                      style={styles.attachPreviewImg}
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      style={styles.attachPreviewRemove}
                      onPress={() => setAttachedImage(null)}
                      hitSlop={6}
                    >
                      <Text style={styles.attachPreviewRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <TextInput
                style={styles.pillInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Tell me about CMPT276..."
                placeholderTextColor="#D9D9D9"
                multiline
                maxLength={1000}
                returnKeyType="send"
                onSubmitEditing={sendMessage}
                blurOnSubmit={false}
              />
            </View>

            {/* Send / search button */}
            <TouchableOpacity
              style={styles.pillIconBtn}
              onPress={sendMessage}
              hitSlop={8}
            >
              <SearchIcon />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Bottom nav */}
      <BottomNav activeTab="chat" />

      {/* Upload bottom sheet */}
      <UploadSheet
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onImageSelected={(uri) => setAttachedImage(uri)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  flex: { flex: 1 },

  header: {
    backgroundColor: SFU_RED, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 14, gap: 10
  },
  backBtn: { padding: 4 },
  backArrow: { color: '#fff', fontSize: 24, fontWeight: '600' },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },

  chatArea: { flex: 1, backgroundColor: '#fff', position: 'relative' },
  messageList: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 12 },

  bubbleRow: { marginBottom: 10, flexDirection: 'row' },
  bubbleRowAI: { justifyContent: 'flex-start' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '78%', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3
  },
  bubbleAI: { backgroundColor: '#D9D9D9' },
  bubbleUser: { backgroundColor: '#D9D9D9' },
  bubbleText: { fontSize: 15, lineHeight: 22, letterSpacing: 0.3 },
  bubbleTextAI: { color: '#000' },
  bubbleTextUser: { color: '#000' },

  typingRow: { flexDirection: 'row', paddingHorizontal: 16, marginBottom: 8 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#D9D9D9',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9
  },
  typingText: { color: '#555', fontSize: 13 },

  watermarkContainer: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center'
  },
  octagonOuter: {
    width: 210, height: 210, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '22.5deg' }]
  },
  octagonInner: { alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-22.5deg' }] },
  watermarkLeaf: { fontSize: 70, opacity: 0.5, marginBottom: 8 },
  watermarkLine1: { fontSize: 13, fontWeight: '700', color: 'rgba(200,16,46,0.4)', letterSpacing: 2 },
  watermarkLine2: { fontSize: 11, color: 'rgba(200,16,46,0.35)', letterSpacing: 2 },
  watermarkLine3: { fontSize: 10, color: 'rgba(200,16,46,0.3)', letterSpacing: 3, marginTop: 2 },

  inputBarWrapper: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10 },
  inputPill: {
    flexDirection: 'row', alignItems: 'flex-end', backgroundColor: NAV_BG,
    borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6, gap: 4,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4
  },
  inputMainArea: {
    flex: 1,
    paddingHorizontal: 4,
  },
  pillIconBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#A7A7A7',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0
  },
  pillInput: {
    color: '#D9D9D9', fontSize: 16, maxHeight: 150,
    paddingHorizontal: 8,
    paddingTop: Platform.OS === 'ios' ? 10 : 8,
    paddingBottom: Platform.OS === 'ios' ? 10 : 8
  },

  // Attached image preview (Inside main area of pill)
  attachPreviewRow: {
    paddingBottom: 8,
    paddingHorizontal: 4,
    flexDirection: 'row',
  },
  attachPreviewCard: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 12,
    overflow: 'visible',
  },
  attachPreviewImg: {
    width: 72,
    height: 72,
    borderRadius: 12,
  },
  attachPreviewRemove: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#444',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  attachPreviewRemoveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 13,
  },

  // Image inside a chat bubble
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 6,
  },

  navBar: {
    backgroundColor: NAV_BG, flexDirection: 'row', height: 62,
    alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 16
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%' },

  // ── Upload sheet ──────────────────────────────────────────────────────────
  sheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 12,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#D0D0D0', alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  sheetSubtitle: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 24 },

  sheetRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 12, gap: 14,
    borderStyle: 'dashed',
  },
  sheetRowIcon: { width: 32, alignItems: 'center' },
  sheetRowText: { flex: 1 },
  sheetRowTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 2 },
  sheetRowSub: { fontSize: 12, color: '#999' },

  sheetToggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 4, marginBottom: 24,
  },
  sheetToggleTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  sheetToggleSub: { fontSize: 10, color: '#aaa', letterSpacing: 0.5, marginTop: 2 },

  sheetCta: {
    backgroundColor: SFU_RED, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  sheetCtaText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
});
