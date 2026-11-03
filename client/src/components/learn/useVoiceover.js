import { useState, useEffect, useRef, useCallback } from 'react';

export function useVoiceover() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true); // Enabled by default
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voiceRate, setVoiceRate] = useState(1.0); // 0.8, 1.0, 1.2
  const currentUtteranceRef = useRef(null);

  // Initialize SpeechSynthesis and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }
    setIsSupported(true);

    const updateVoices = () => {
      try {
        const available = window.speechSynthesis.getVoices();
        if (available && available.length > 0) {
          // Filter to English voices or all available
          const englishVoices = available.filter(v => v.lang.startsWith('en'));
          const voiceList = englishVoices.length > 0 ? englishVoices : available;
          setVoices(voiceList);

          // Find a great default voice: Samantha, Daniel, Natural, Alex, Google US
          const best = voiceList.find(v => 
            v.name.includes('Samantha') || 
            v.name.includes('Daniel') || 
            v.name.includes('Natural') || 
            v.name.includes('Google US English') ||
            v.name.includes('Alex')
          ) || voiceList[0];

          setSelectedVoice(prev => prev || best);
        }
      } catch (err) {
        console.warn('Voice enumeration error:', err);
      }
    };

    updateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return () => {
      try {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      } catch {
        // cleanup safety
      }
    };
  }, []);

  const stop = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setIsSpeaking(false);
    currentUtteranceRef.current = null;
  }, []);

  const speak = useCallback((text, onFinish) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Cancel ongoing speech
    stop();

    if (!isVoiceEnabled || !text) {
      setIsSpeaking(false);
      return;
    }

    try {
      const cleanText = text
        .replace(/<[^>]*>/g, '') // strip any HTML
        .replace(/\[\d+\]/g, '')  // strip bracket numbers like [1]
        .replace(/[`*#_]/g, '')   // strip markdown formatting
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      if (selectedVoice) utterance.voice = selectedVoice;
      utterance.rate = voiceRate;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        if (onFinish) onFinish();
      };

      utterance.onerror = (e) => {
        // 'interrupted' is normal when user navigates or stops
        if (e.error !== 'interrupted' && e.error !== 'canceled') {
          console.warn('SpeechSynthesis error:', e);
        }
        setIsSpeaking(false);
        currentUtteranceRef.current = null;
        if (onFinish) onFinish();
      };

      currentUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Failed to start speech:', err);
      setIsSpeaking(false);
      if (onFinish) onFinish();
    }
  }, [isVoiceEnabled, selectedVoice, voiceRate, stop]);

  const toggleVoice = useCallback(() => {
    setIsVoiceEnabled(prev => {
      const next = !prev;
      if (!next) {
        stop();
      }
      return next;
    });
  }, [stop]);

  return {
    isSupported,
    isSpeaking,
    isVoiceEnabled,
    voices,
    selectedVoice,
    setSelectedVoice,
    voiceRate,
    setVoiceRate,
    speak,
    stop,
    toggleVoice,
  };
}
