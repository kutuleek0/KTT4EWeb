import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Layers, Cpu, Globe2 } from 'lucide-react';

const features = [
  {
    icon: <ShieldCheck className="w-10 h-10 text-primary" />,
    title: "Контекстная точность",
    description: "Мы не просто переводим слова, мы адаптируем их под реалии игры, сохраняя историческую и игровую достоверность.",
    align: "left"
  },
  {
    icon: <Layers className="w-10 h-10 text-secondary" />,
    title: "Многослойный анализ",
    description: "KTT4-Expanded анализирует структуру файлов, переменные и триггеры, чтобы код мода оставался рабочим.",
    align: "right"
  },
  {
    icon: <Cpu className="w-10 h-10 text-primary" />,
    title: "Нейросетевая поддержка",
    description: "Использование передовых LLM моделей для черновой обработки с последующей ручной редактурой.",
    align: "left"
  },
  {
    icon: <Globe2 className="w-10 h-10 text-secondary" />,
    title: "Локализация интерфейса",
    description: "Адаптация длины строк под элементы UI, чтобы текст не вылезал за границы кнопок и окон.",
    align: "right"
  }
];

export default function Quality() {
  return (
    <section id="quality" className="py-32 relative z-10 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="text-center mb-24 relative z-10">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="font-display text-5xl md:text-7xl font-bold mb-6"
          >
            Безупречное <span className="text-gradient">Качество</span>
          </motion.h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-xl">
            Наш подход к переводу гарантирует, что игроки даже не заметят, что играют в локализованную версию.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Central glowing line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/50 to-transparent hidden md:block -translate-x-1/2"></div>

          <div className="space-y-24">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: feature.align === 'left' ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.4 }}
                className={`flex flex-col md:flex-row items-center gap-8 md:gap-16 ${feature.align === 'right' ? 'md:flex-row-reverse' : ''}`}
              >
                <div className={`flex-1 w-full ${feature.align === 'left' ? 'md:text-right' : 'md:text-left'}`}>
                  <h3 className="text-3xl font-bold mb-4 font-display">{feature.title}</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    {feature.description}
                  </p>
                </div>
                
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-24 h-24 rounded-full glass-panel flex items-center justify-center relative group">
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/20 to-secondary/20 blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                    <div className="relative z-10">
                      {feature.icon}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1 hidden md:block"></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
