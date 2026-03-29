import React, { useEffect, useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'motion/react';

const langNames = {
  en: 'English',
  de: 'Deutsch',
  pl: 'Polski',
  zh: '中文',
  ja: '日本語',
  es: 'Español',
  fr: 'Français'
};

export default function LanguagePrompt() {
  const { setLanguage } = useLanguage();
  const [showPrompt, setShowPrompt] = useState(false);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('app_lang');
    if (!saved) {
      const browserLang = navigator.language.slice(0, 2);
      if (browserLang !== 'ru' && langNames[browserLang as keyof typeof langNames]) {
        setDetectedLang(browserLang);
        setShowPrompt(true);
      }
    }
  }, []);

  if (!showPrompt || !detectedLang) return null;

  const handleAccept = () => {
    setLanguage(detectedLang as any);
    setShowPrompt(false);
  };

  const handleDecline = () => {
    localStorage.setItem('app_lang', 'ru'); // Save preference
    setShowPrompt(false);
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 right-6 z-50 bg-black/90 border border-primary/30 p-6 rounded-2xl shadow-2xl backdrop-blur-md max-w-sm"
      >
        <h3 className="text-lg font-bold mb-2">Хотите переключиться на {langNames[detectedLang as keyof typeof langNames]}?</h3>
        <p className="text-sm text-gray-400 mb-2">Do you want to switch to {langNames[detectedLang as keyof typeof langNames]}?</p>
        <p className="text-sm text-gray-400 mb-6">¿Quieres cambiar a {langNames[detectedLang as keyof typeof langNames]}? / Voulez-vous changer...</p>
        
        <div className="flex gap-3">
          <button onClick={handleAccept} className="flex-1 py-2 bg-primary text-black font-bold rounded-lg hover:bg-white transition-colors">
            Да / Yes
          </button>
          <button onClick={handleDecline} className="flex-1 py-2 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-colors">
            Нет / No
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
