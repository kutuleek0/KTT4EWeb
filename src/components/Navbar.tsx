import React from 'react';
import { motion } from 'motion/react';
import { Globe, Calculator, MessageSquare } from 'lucide-react';

export default function Navbar() {
  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4"
    >
      <div className="max-w-7xl mx-auto glass-panel rounded-full px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-xl tracking-tight">KTT4<span className="text-primary">Expanded</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#quality" className="text-gray-300 hover:text-white transition-colors">Качество</a>
          <a href="#calculator" className="text-gray-300 hover:text-white transition-colors">Калькулятор</a>
          <a href="#chat" className="text-gray-300 hover:text-white transition-colors">Нейро-помощник</a>
        </div>

        <a href="#calculator" className="glass-panel-interactive px-5 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-primary/30 text-primary hover:bg-primary hover:text-black transition-all">
          <Calculator className="w-4 h-4" />
          <span>Рассчитать</span>
        </a>
      </div>
    </motion.nav>
  );
}
