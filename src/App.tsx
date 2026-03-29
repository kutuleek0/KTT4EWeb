import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Quality from './components/Quality';
import Calculator from './components/Calculator';
import ChatBot from './components/ChatBot';
import LanguagePrompt from './components/LanguagePrompt';

export default function App() {
  return (
    <div className="min-h-screen relative font-sans">
      <LanguagePrompt />
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-secondary/20 blur-[120px] animate-blob" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Hero />
          <Quality />
          <Calculator />
        </main>
        <ChatBot />
      </div>
    </div>
  );
}
