// frontend/components/AIChatScreen.jsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ActivityIndicator, StyleSheet,
  Modal, Animated, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { Ionicons } from '@expo/vector-icons';
import { apiFetch, API_ENDPOINTS } from '@api/client';
import { useLanguage } from '@context/LanguageContext';

const { width: SCREEN_W } = Dimensions.get('window');
const SHEET_W = Math.min(Math.round(SCREEN_W * 0.85), 420);

const COLORS = {
  green:      '#22c55e',
  greenDark:  '#16a34a',
  greenSoft:  '#e8f8ed',
  bg:         '#F4F6F8',
  surface:    '#ffffff',
  text:       '#0f172a',
  muted:      '#64748b',
  border:     '#e2e8f0',
  userBubble: '#16a34a',
  overlay:    'rgba(0,0,0,0.4)',
  recording:  '#ef4444',
};

const INITIAL_MESSAGES = {
  fr: '🌿 Bonjour! Comment puis-je vous aider?',
  en: '🌿 Hello! How can I help you?',
  ar: '🌿 أهلاً! كيف يمكنني مساعدتك؟',
  tr: '🌿 Merhaba! Size nasıl yardımcı olabilirim?',
};

// ══════════════════════════════════════════════════════════════════════════════
// ELEVENLABS — Voix arabe & turque professionnelle (eleven_multilingual_v2)
// ══════════════════════════════════════════════════════════════════════════════
const ELEVENLABS_API_KEY  = 'sk_e3ab10dbc691b9f8f0e47bf9f09f68e26a20f0fda4f4f4f4';
const ELEVENLABS_VOICE_ID = 'cgSgspJ2msm6clMCkdW9'; // Aria — multilingual

async function elevenLabsSpeak(text, { onDone, onError } = {}) {
  try {
    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key':   ELEVENLABS_API_KEY,
          'Content-Type': 'application/json',
          'Accept':       'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability:         0.55,
            similarity_boost:  0.80,
            style:             0.20,
            use_speaker_boost: true,
          },
        }),
      }
    );
    if (!res.ok) { console.error('❌ [ElevenLabs] HTTP', res.status); onError?.(); return null; }
    const blob  = await res.blob();
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => { URL.revokeObjectURL(url); onDone?.(); };
    audio.onerror = () => { URL.revokeObjectURL(url); onError?.(); };
    audio.play();
    return audio;
  } catch (err) {
    console.error('❌ [ElevenLabs]', err.message);
    onError?.();
    return null;
  }
}

// ── Strip markdown pour TTS ───────────────────────────────────────────────────
function stripMarkdown(text = '') {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
    .replace(/_{1,2}(.+?)_{1,2}/g, '$1').replace(/#{1,6}\s+/g, '')
    .replace(/`{1,3}[^`]*`{1,3}/g, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^[-*•]\s+/gm, '').replace(/^\d+\.\s+/gm, '')
    .replace(/>{1,}\s*/g, '').replace(/\n{3,}/g, '\n\n').trim();
}

// ── Chiffres → mots arabes ────────────────────────────────────────────────────
const AR_NUMBERS = {
  0:'صفر',1:'واحد',2:'اثنان',3:'ثلاثة',4:'أربعة',5:'خمسة',
  6:'ستة',7:'سبعة',8:'ثمانية',9:'تسعة',10:'عشرة',
  11:'أحد عشر',12:'اثنا عشر',13:'ثلاثة عشر',14:'أربعة عشر',15:'خمسة عشر',
  16:'ستة عشر',17:'سبعة عشر',18:'ثمانية عشر',19:'تسعة عشر',20:'عشرون',
  30:'ثلاثون',40:'أربعون',50:'خمسون',60:'ستون',70:'سبعون',80:'ثمانون',90:'تسعون',
  100:'مئة',200:'مئتان',1000:'ألف',
};

function numToArabic(n) {
  const num = parseInt(n, 10);
  if (isNaN(num)) return n;
  if (AR_NUMBERS[num] !== undefined) return AR_NUMBERS[num];
  if (num < 100) {
    const tens = Math.floor(num / 10) * 10;
    const ones = num % 10;
    return `${AR_NUMBERS[ones]} و${AR_NUMBERS[tens]}`;
  }
  return n;
}

function prepareArabicTTS(text = '') {
  return text
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/\b(\d+)\b/g, (_, n) => numToArabic(n));
}

// ── Détection langue réponse AI ───────────────────────────────────────────────
function detectSpeechLang(text = '') {
  const s = text.slice(0, 300);
  const tunisianWords = /\b(chneya|kifesh|barsha|bhi|mrigel|ya3tik|3andek|lazem|bech|taw|famma|hnaya|sahit|yezzi|mouch|wala|kifek|labas|nheb|ma3lich|haka|chahed|kol|inti|ena|yelzem|tnajem|talbek|t9olha|9oulha|shniya|9addesh|ween|mta3|elli|fih|3lih|manha|ghadi|rahi|brabi|yaani|chkoun|chbik|mch|nrou7|nlawej)\b/gi;
  const tunisianScore = (s.match(tunisianWords) || []).length * 5;
  const arabicChars   = (s.match(/[\u0600-\u06FF]/g) || []).length;
  const scores = {
    'ar-TN': tunisianScore + arabicChars,
    'ar-SA': arabicChars * 4,
    'tr-TR': (s.match(/[şğüöçıİŞĞÜÖÇ]/g) || []).length * 4,
    'fr-FR': (s.match(/[àâæçéèêëîïôœùûüÿ]/gi) || []).length * 2
           + (s.match(/\b(le|la|les|de|du|des|pour|avec|dans|que|qui|vous|votre|je|nous|est|une|bonjour|merci|température|irrigation)\b/gi) || []).length * 1.5,
    'en-US': (s.match(/\b(the|is|are|and|for|with|your|you|this|have|will|from|they|weather|irrigation|crop|hello|thank)\b/gi) || []).length,
  };
  if (tunisianScore > 0 && scores['ar-TN'] > scores['ar-SA']) return 'ar-TN';
  const winner = Object.entries(scores)
    .filter(([k]) => k !== 'ar-TN')
    .reduce((a, b) => b[1] > a[1] ? b : a);
  return winner[1] >= 2 ? winner[0] : 'fr-FR';
}

function getTTSLang(lang) {
  return lang === 'ar-TN' ? 'ar-SA' : lang;
}

const LANG_LABELS = {
  'ar-TN': 'تونسي 🇹🇳',
  'ar-SA': 'العربية',
  'tr-TR': 'Türkçe',
  'fr-FR': 'Français',
  'en-US': 'English',
};

// ══════════════════════════════════════════════════════════════════════════════
// WEB TTS — Web Speech API fallback
// ══════════════════════════════════════════════════════════════════════════════
let _webVoicesCache = null;

function loadWebVoices() {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) { resolve([]); return; }
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) { _webVoicesCache = v; resolve(v); return; }
    window.speechSynthesis.onvoiceschanged = () => {
      _webVoicesCache = window.speechSynthesis.getVoices();
      resolve(_webVoicesCache);
    };
    setTimeout(() => resolve(window.speechSynthesis.getVoices() || []), 2000);
  });
}

async function webSpeak(text, langCode, { rate = 0.92, pitch = 1.0, onDone, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) { onError?.(); return; }
  window.speechSynthesis.cancel();
  const voices    = await loadWebVoices();
  const utterance = new window.SpeechSynthesisUtterance(text);
  const matched   = voices.find(v => v.lang === langCode) ||
                    voices.find(v => v.lang?.startsWith(langCode.split('-')[0]));
  if (matched) utterance.voice = matched;
  utterance.lang  = langCode;
  utterance.rate  = rate;
  utterance.pitch = pitch;
  const keepAlive = setInterval(() => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else { clearInterval(keepAlive); }
  }, 10000);
  utterance.onend   = () => { clearInterval(keepAlive); onDone?.(); };
  utterance.onerror = (e) => { clearInterval(keepAlive); console.error('[WebTTS]', e.error); onError?.(); };
  window.speechSynthesis.speak(utterance);
}

function stopWebSpeech() {
  if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── Voix native Android ───────────────────────────────────────────────────────
async function getVoiceForLanguage(language) {
  if (Platform.OS !== 'android') return undefined;
  try {
    const voices = await Speech.getAvailableVoicesAsync();
    const v = voices.find(v =>
      v.language === language &&
      (v.quality === 'Enhanced' || v.name?.includes('Google'))
    );
    return v?.identifier;
  } catch { return undefined; }
}

// ══════════════════════════════════════════════════════════════════════════════
// FAB + Modal
// ══════════════════════════════════════════════════════════════════════════════
export default function AIChatFAB() {
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(SHEET_W)).current;

  const openSheet = () => {
    setOpen(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 70, friction: 12 }).start();
  };

  const closeSheet = () => {
    Animated.timing(slideAnim, { toValue: SHEET_W, duration: 240, useNativeDriver: true })
      .start(() => setOpen(false));
  };

  return (
    <>
      <TouchableOpacity onPress={openSheet} style={styles.fab} activeOpacity={0.88}>
        <Text style={{ fontSize: 22 }}>🌿</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="none" statusBarTranslucent onRequestClose={closeSheet}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSheet} />
        <Animated.View style={[styles.sheet, { transform: [{ translateX: slideAnim }] }]}>
          <AIChatSheet onClose={closeSheet} />
        </Animated.View>
      </Modal>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAT SHEET
// ══════════════════════════════════════════════════════════════════════════════
function AIChatSheet({ onClose }) {
  const { language, isRTL } = useLanguage();
  const insets = useSafeAreaInsets();

  const [messages,       setMessages]       = useState([{ id: '0', role: 'assistant', text: INITIAL_MESSAGES[language] || INITIAL_MESSAGES.fr }]);
  const [input,          setInput]          = useState('');
  const [loading,        setLoading]        = useState(false);
  const [isListening,    setIsListening]    = useState(false);
  const [conversationId, setConversationId] = useState('');
  const [isSpeaking,     setIsSpeaking]     = useState(false);
  const [ttsLang,        setTtsLang]        = useState('fr-FR');
  const [ttsEnabled,     setTtsEnabled]     = useState(true);
  const [nativeVoices,   setNativeVoices]   = useState({});
  const [recordDuration, setRecordDuration] = useState(0); // durée en secondes

  const elevenLabsAudioRef  = useRef(null);
  const flatListRef         = useRef(null);
  const pendingTranscriptRef = useRef('');
  const recordTimerRef      = useRef(null); // timer pour afficher la durée

  // Langues speech input
  const speechInputLangs = (() => {
    const primary = { fr: 'fr-FR', en: 'en-US', ar: 'ar-SA', tr: 'tr-TR' }[language] || 'ar-SA';
    const all = ['ar-SA', 'fr-FR', 'en-US', 'tr-TR'];
    return [primary, ...all.filter(l => l !== primary)];
  })();

  useEffect(() => {
    if (Platform.OS === 'web')     loadWebVoices();
    if (Platform.OS === 'android') loadNativeVoices();
  }, []);

  useEffect(() => {
    setMessages([{ id: '0', role: 'assistant', text: INITIAL_MESSAGES[language] || INITIAL_MESSAGES.fr }]);
  }, [language]);

  const loadNativeVoices = async () => {
    const voicesMap = {};
    for (const lang of ['ar-SA', 'tr-TR', 'fr-FR', 'en-US']) {
      const id = await getVoiceForLanguage(lang);
      if (id) voicesMap[lang] = id;
    }
    setNativeVoices(voicesMap);
  };

  // ── Stop TTS ───────────────────────────────────────────────────────────────
  const stopSpeaking = useCallback(async () => {
    if (elevenLabsAudioRef.current) {
      elevenLabsAudioRef.current.pause();
      elevenLabsAudioRef.current = null;
    }
    if (Platform.OS === 'web') stopWebSpeech();
    else await Speech.stop();
    setIsSpeaking(false);
  }, []);

  // ── TTS principal ──────────────────────────────────────────────────────────
  const speakText = useCallback(async (text, detectedLang) => {
    if (!ttsEnabled) { setIsSpeaking(false); return; }
    const ttsCode   = getTTSLang(detectedLang);
    const isArabic  = ttsCode === 'ar-SA' || detectedLang === 'ar-TN';
    const isTurkish = ttsCode === 'tr-TR';
    const cleaned   = stripMarkdown(text);

    try {
      // Arabe → ElevenLabs
      if (isArabic && Platform.OS === 'web') {
        const arabicText = prepareArabicTTS(cleaned);
        const audio = await elevenLabsSpeak(arabicText, {
          onDone:  () => { elevenLabsAudioRef.current = null; setIsSpeaking(false); },
          onError: () => { elevenLabsAudioRef.current = null; setIsSpeaking(false); },
        });
        if (audio) elevenLabsAudioRef.current = audio;
        return;
      }

      // Turc / Français / Anglais → ElevenLabs multilingual (web)
      if ((isTurkish || ttsCode === 'fr-FR' || ttsCode === 'en-US') && Platform.OS === 'web') {
        const audio = await elevenLabsSpeak(cleaned, {
          onDone:  () => { elevenLabsAudioRef.current = null; setIsSpeaking(false); },
          onError: () => { elevenLabsAudioRef.current = null; setIsSpeaking(false); },
        });
        if (audio) elevenLabsAudioRef.current = audio;
        return;
      }

      // Fallback web → Web Speech API
      if (Platform.OS === 'web') {
        await webSpeak(cleaned, ttsCode, {
          rate:    0.90,
          pitch:   1.0,
          onDone:  () => setIsSpeaking(false),
          onError: () => setIsSpeaking(false),
        });
        return;
      }

      // Mobile → expo-speech
      const rateMap  = { 'ar-SA': 0.78, 'ar-TN': 0.78, 'tr-TR': 0.88, 'fr-FR': 0.92 };
      const pitchMap = { 'ar-SA': 1.10, 'ar-TN': 1.10, 'fr-FR': 1.05 };
      const opts = {
        language: ttsCode,
        rate:     rateMap[detectedLang]  ?? 0.90,
        pitch:    pitchMap[detectedLang] ?? 1.0,
        onDone:   () => setIsSpeaking(false),
        onError:  () => setIsSpeaking(false),
      };
      if (Platform.OS === 'android' && nativeVoices[ttsCode]) opts.voice = nativeVoices[ttsCode];
      await Speech.speak(isArabic ? prepareArabicTTS(cleaned) : cleaned, opts);

    } catch (e) {
      console.error('❌ [TTS]', e);
      setIsSpeaking(false);
    }
  }, [ttsEnabled, nativeVoices]);

  // ══════════════════════════════════════════════════════════════════════════
  // VOICE INPUT — Press & Hold (style WhatsApp)
  // ══════════════════════════════════════════════════════════════════════════

  // Stocker le transcript en temps réel sans envoyer
  useSpeechRecognitionEvent('result', (event) => {
    const spoken = event.results[0]?.transcript;
    if (spoken) {
      pendingTranscriptRef.current = spoken;
      setInput(spoken); // afficher en live dans l'input
    }
  });

  // Quand la reconnaissance se termine → envoyer automatiquement
  useSpeechRecognitionEvent('end', () => {
    stopRecordTimer();
    setIsListening(false);
    const t = pendingTranscriptRef.current;
    if (t && t.trim()) {
      pendingTranscriptRef.current = '';
      setInput('');
      sendMessage(t.trim());
    }
  });

  useSpeechRecognitionEvent('error', () => {
    stopRecordTimer();
    setIsListening(false);
    pendingTranscriptRef.current = '';
  });

  // Timer d'affichage de la durée d'enregistrement
  const startRecordTimer = () => {
    setRecordDuration(0);
    recordTimerRef.current = setInterval(() => {
      setRecordDuration(prev => prev + 1);
    }, 1000);
  };

  const stopRecordTimer = () => {
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
    setRecordDuration(0);
  };

  // Formater la durée ex: 0:05
  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Appuyer → commencer à écouter
  const onMicPressIn = async () => {
    if (isListening || loading) return;
    try {
      if (isSpeaking) await stopSpeaking();
      pendingTranscriptRef.current = '';
      setInput('');
      setIsListening(true);
      startRecordTimer();
      await ExpoSpeechRecognitionModule.start({
        lang:           speechInputLangs[0],
        extraLanguages: speechInputLangs.slice(1),
        interimResults: true, // affichage en temps réel
      });
    } catch (e) {
      console.error('❌ [Voice]', e);
      stopRecordTimer();
      setIsListening(false);
    }
  };

  // Relâcher → arrêter et envoyer
  const onMicPressOut = async () => {
    if (!isListening) return;
    try {
      // stop() déclenche l'event 'end' qui envoie automatiquement
      await ExpoSpeechRecognitionModule.stop();
    } catch {
      // fallback si stop() échoue
      try { await ExpoSpeechRecognitionModule.abort(); } catch {}
      stopRecordTimer();
      setIsListening(false);
      const t = pendingTranscriptRef.current;
      if (t && t.trim()) {
        pendingTranscriptRef.current = '';
        setInput('');
        sendMessage(t.trim());
      }
    }
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = useCallback(async (text) => {
    if (!text?.trim() || loading) return;
    const trimmed = text.trim();
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', text: trimmed }]);
    setInput('');
    setLoading(true);

    try {
      const res = await apiFetch(API_ENDPOINTS.ai?.chat || '/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          message:         trimmed,
          conversation_id: conversationId,
          city:            'Tunis',
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Erreur IA');

      if (data.conversation_id) setConversationId(data.conversation_id);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(), role: 'assistant', text: data.answer,
      }]);

      const detected = detectSpeechLang(data.answer);
      setTtsLang(detected);
      setIsSpeaking(true);
      await speakText(data.answer, detected);

    } catch {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(), role: 'assistant',
        text: '❌ Erreur de connexion. Réessayez.',
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [loading, conversationId, speakText]);

  // ── Bubble ─────────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.bubbleWrap, isUser ? styles.bubbleWrapUser : styles.bubbleWrapAI]}>
        {!isUser && (
          <View style={styles.avatar}>
            <Text style={{ fontSize: 13 }}>🌿</Text>
          </View>
        )}
        <View style={{ maxWidth: '85%' }}>
          <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
            <Text style={[
              styles.bubbleText,
              { color: isUser ? '#fff' : COLORS.text },
              isRTL && { textAlign: 'right', writingDirection: 'rtl' },
            ]}>
              {item.text}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const getPlaceholder = () => {
    if (isListening) return `🎤 ${formatDuration(recordDuration)}  Parlez... (relâchez pour envoyer)`;
    return { ar: 'اكتب سؤالك...', en: 'Ask a question...', tr: 'Sorunuzu yazın...' }[language]
      ?? 'Posez votre question...';
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.sheetInner, {
      paddingTop:    insets.top    || 12,
      paddingBottom: insets.bottom || 10,
    }]}>

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.muted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => { setTtsEnabled(p => !p); if (isSpeaking) stopSpeaking(); }}
            style={styles.headerBtn}
          >
            <Ionicons
              name={ttsEnabled ? 'volume-high-outline' : 'volume-mute-outline'}
              size={18}
              color={ttsEnabled ? COLORS.green : COLORS.muted}
            />
          </TouchableOpacity>

          {isSpeaking && (
            <TouchableOpacity onPress={stopSpeaking} style={styles.headerBtn}>
              <Ionicons name="stop-circle-outline" size={20} color={COLORS.green} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.headerLeft}>
          <View>
            <Text style={styles.headerTitle}>SmartIrrig AI</Text>
            <Text style={styles.headerSub}>
              {isSpeaking
                ? `🔊 ${LANG_LABELS[ttsLang]}`
                : isListening
                  ? `🎤 ${formatDuration(recordDuration)}  Écoute...`
                  : 'Powered by Dify • 5 langues'}
            </Text>
          </View>
          <View style={styles.headerIcon}>
            <Text style={{ fontSize: 16 }}>🌿</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={10}
      >
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          contentContainerStyle={styles.listContent}
          data={messages}
          keyExtractor={item => item.id}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={styles.typingRow}>
                <View style={styles.avatar}><Text style={{ fontSize: 13 }}>🌿</Text></View>
                <View style={styles.typingBubble}>
                  <ActivityIndicator size="small" color={COLORS.green} />
                  <Text style={styles.typingText}>Analyse...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Barre d'enregistrement vocale (visible pendant l'écoute) */}
        {isListening && (
          <View style={styles.recordingBar}>
            <Animated.View style={styles.recordingDot} />
            <Text style={styles.recordingText}>
              {formatDuration(recordDuration)}  •  Relâchez le micro pour envoyer
            </Text>
            <TouchableOpacity
              onPress={async () => {
                // Annuler l'enregistrement sans envoyer
                pendingTranscriptRef.current = '';
                setInput('');
                stopRecordTimer();
                setIsListening(false);
                try { await ExpoSpeechRecognitionModule.abort(); } catch {}
              }}
              style={styles.cancelVoiceBtn}
            >
              <Ionicons name="close" size={16} color={COLORS.recording} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input bar */}
        <View style={styles.inputBar}>

          {/* Bouton MIC — Press & Hold */}
          <TouchableOpacity
            onPressIn={onMicPressIn}
            onPressOut={onMicPressOut}
            style={[styles.iconBtn, isListening && styles.iconBtnRecording]}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Ionicons
              name={isListening ? 'mic' : 'mic-outline'}
              size={19}
              color={isListening ? '#fff' : COLORS.muted}
            />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              isRTL && { textAlign: 'right' },
              isListening && styles.inputRecording,
            ]}
            placeholder={getPlaceholder()}
            placeholderTextColor={isListening ? COLORS.recording : COLORS.muted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => { if (input.trim() && !isListening) sendMessage(input); }}
            blurOnSubmit={false}
            returnKeyType="send"
            maxLength={500}
            editable={!isListening}
          />

          <TouchableOpacity
            onPress={() => sendMessage(input)}
            disabled={loading || !input.trim() || isListening}
            style={[styles.iconBtn, input.trim() && !loading && !isListening ? styles.sendBtnActive : null]}
            activeOpacity={0.85}
          >
            <Ionicons
              name="send"
              size={17}
              color={input.trim() && !loading && !isListening ? '#fff' : COLORS.muted}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  fab: {
    position: 'absolute', bottom: 90, right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: COLORS.greenDark,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 9, zIndex: 999,
  },
  overlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.overlay,
  },
  sheet: {
    position: 'absolute', top: 0, bottom: 0, right: 0, width: SHEET_W,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20, borderBottomLeftRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 20,
    shadowOffset: { width: -6, height: 0 }, elevation: 20, overflow: 'hidden',
  },
  sheetInner: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft:  { flexDirection: 'row', alignItems: 'center', gap: 9 },
  headerIcon:  {
    width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.greenSoft,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, textAlign: 'right' },
  headerSub:   { fontSize: 10, color: COLORS.green, marginTop: 1, textAlign: 'right' },
  headerBtn:   {
    width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  listContent:    { padding: 12, paddingBottom: 4, gap: 6 },
  bubbleWrap:     { flexDirection: 'row', alignItems: 'flex-end', gap: 6, marginBottom: 3 },
  bubbleWrapUser: { justifyContent: 'flex-end' },
  bubbleWrapAI:   { justifyContent: 'flex-start' },
  avatar: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.greenSoft,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    borderWidth: 1, borderColor: COLORS.border,
  },
  bubble:     { maxWidth: '100%', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleUser: { backgroundColor: COLORS.userBubble, borderBottomRightRadius: 3 },
  bubbleAI:   { backgroundColor: COLORS.bg, borderBottomLeftRadius: 3, borderWidth: 1, borderColor: COLORS.border },
  bubbleText: { fontSize: 13, lineHeight: 19 },
  typingRow:    { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8,
  },
  typingText: { fontSize: 12, color: COLORS.muted, fontStyle: 'italic' },

  // Recording bar (au-dessus de l'input)
  recordingBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: '#fff5f5',
    borderTopWidth: 1, borderTopColor: '#fecaca',
  },
  recordingDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.recording,
  },
  recordingText: {
    flex: 1, fontSize: 11, color: COLORS.recording, fontWeight: '600',
  },
  cancelVoiceBtn: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center',
  },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 12, paddingVertical: 9,
    backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8,
    fontSize: 13, color: COLORS.text, maxHeight: 90,
  },
  inputRecording: {
    borderColor: '#fca5a5', backgroundColor: '#fff5f5', color: COLORS.recording,
  },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bg,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  iconBtnRecording: {
    backgroundColor: COLORS.recording, borderColor: COLORS.recording,
  },
  sendBtnActive: { backgroundColor: COLORS.greenDark, borderColor: COLORS.greenDark },
});