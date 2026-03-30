import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Settings, ChevronDown } from 'lucide-react';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { SYSTEM_PROMPT } from '../data/knowledge';

const DEFAULT_MODELS = [
  { id: 'z-ai/glm-4.7-flash', name: 'GLM 4.7 Flash' },
  { id: 'openai/gpt-oss-120b', name: 'GPT OSS 120B' },
];

export default function ChatBot() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('selected_ai_model') || 'google/gemini-2.0-flash-001');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([
    { role: 'assistant', content: 'Здравствуйте! Я ИИ-ассистент KTT4. Чем могу помочь?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendDirect = async (msg: string) => {
    if (!msg.trim() || isLoading) return;

    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setIsLoading(true);

    try {
      const apiKey = (import.meta as any).env.VITE_OPENROUTER_API_KEY;

      if (!apiKey || apiKey === 'undefined') {
        throw new Error('API Key не найден. Пожалуйста, проверьте файл .env');
      }

      const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
        model: selectedModel,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...messages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: msg }
        ],
        temperature: 0.7,
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': window.location.origin,
          'X-Title': 'KTT4 Expanded Assistant',
          'Content-Type': 'application/json'
        }
      });

      const aiResponse = response.data.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse || 'Извините, произошла ошибка.' }]);
    } catch (error: any) {
      console.error(error);
      const errorMsg = error.response?.data?.error?.message || error.message || 'Извините, сервис временно недоступен.';
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${errorMsg}. Пожалуйста, обратитесь в Discord.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    const userMsg = input.trim();
    if (!userMsg) return;
    setInput('');
    handleSendDirect(userMsg);
  };

  const updateModel = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('selected_ai_model', modelId);
    setShowSettings(false);
  };

  useEffect(() => {
    const handleExplainBat = () => {
      setIsOpen(true);
      handleSendDirect("Объясни детально, как работает ваш скрипт-сканер (.bat), зачем он нужен, что именно он делает с моими файлами и почему он абсолютно безопасен и не содержит вирусов.");
    };

    window.addEventListener('open-chatbot-explain-bat', handleExplainBat);
    return () => window.removeEventListener('open-chatbot-explain-bat', handleExplainBat);
  }, [isLoading, selectedModel]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 left-6 z-40 w-14 h-14 bg-primary text-black rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.4)] hover:scale-110 transition-transform"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-50 w-80 sm:w-96 h-[550px] bg-[#141418] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="p-4 bg-black/50 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-white">{t('chatTitle')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-lg transition-colors ${showSettings ? 'bg-primary text-black' : 'text-gray-400 hover:text-white'}`}
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="p-4 bg-black/80 border-b border-white/10 animate-in slide-in-from-top duration-200">
                <label className="text-xs text-gray-400 uppercase tracking-wider mb-2 block">Выберите модель ИИ</label>
                <div className="space-y-1">
                  {DEFAULT_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => updateModel(model.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedModel === model.id ? 'bg-primary/20 text-primary border border-primary/30' : 'text-gray-300 hover:bg-white/5'}`}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-secondary/20 text-secondary' : 'bg-primary/20 text-primary'}`}>
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-secondary/20 text-white rounded-tr-none' : 'bg-white/5 text-gray-200 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white/5 text-gray-400 rounded-tl-none flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-black/50 border-t border-white/10">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder={t('chatPlaceholder')}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 bg-primary text-black rounded-xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
