import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { FolderSearch, Calculator as CalcIcon, Package, ChevronRight, CheckCircle2, AlertTriangle, Download, Upload } from 'lucide-react';
import JSZip from 'jszip';
import { useLanguage } from '../contexts/LanguageContext';
import { generateReceipt } from '../utils/generateReceipt';

interface ModResult {
  id: string;
  name: string;
  words: number;
  tags: string[];
  pictureUrl?: string;
  version?: string;
  supported_version?: string;
  remote_file_id?: string;
  isLocOnly?: boolean;
}

const BASE_PRICE_PER_WORD = 0.0016; // Базовая цена за слово (8000 руб за 5 млн слов)
const MIN_PRICE = 219; // Минимальная цена
const SMALL_MOD_WORDS = 100000; // Примерное количество слов в "небольшом" моде

export default function Calculator() {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Scan State
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ModResult[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);
  const [parsingStatus, setParsingStatus] = useState<string>('');
  const [progress, setProgress] = useState(0);

  // Filter & Selection State
  const [selectedMods, setSelectedMods] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'words_desc' | 'words_asc' | 'name_asc'>('words_desc');
  const [showLocOnly, setShowLocOnly] = useState(false);

  // Package State
  const [manualModsCount, setManualModsCount] = useState<number>(5);

  // Speed State
  const [isFastSpeed, setIsFastSpeed] = useState(false);

  const calculateDiscount = (modsCount: number) => {
    if (modsCount < 5) return 0;
    let discount = 40 + (modsCount - 5) * 3;
    return Math.min(discount, 60); // Максимум 60%
  };

  const calculatePrice = (words: number, modsCount: number, fast: boolean) => {
    let basePrice = words * BASE_PRICE_PER_WORD;
    if (fast) basePrice *= 1.5; // +50% markup for fast speed
    const discount = calculateDiscount(modsCount);
    const finalPrice = basePrice * (1 - discount / 100);
    return Math.max(finalPrice, MIN_PRICE);
  };

  const getEstimatedTime = (words: number, fast: boolean) => {
    if (words === 0) return 0;
    const wph = fast ? 4000000 : 500000;
    return words / wph;
  };

  const formatTime = (hours: number) => {
    if (hours === 0) return "0 часов";
    if (hours < 1) return "< 1 часа";
    const h = Math.round(hours);
    if (h === 1) return "1 час";
    if (h > 1 && h < 5) return `${h} часа`;
    return `${h} часов`;
  };

  const generateBatScript = () => {
    const batContent = `@echo off
chcp 65001 >nul
echo ==========================================
echo KTT4 Mod Scanner
echo ==========================================
echo.
set /p mod_path="Enter the path to your HOI4 mods folder (or a single mod folder): "
if not exist "%mod_path%" (
    echo Folder not found!
    pause
    exit /b
)

set temp_dir=%TEMP%\\KTT4_Scanner_Temp
if exist "%temp_dir%" rmdir /s /q "%temp_dir%"
mkdir "%temp_dir%"

set "is_single_mod="
if exist "%mod_path%\\descriptor.mod" set is_single_mod=1
if exist "%mod_path%\\localisation" set is_single_mod=1

if defined is_single_mod (
    echo Detected single mod folder.
    mkdir "%temp_dir%\\Scanned_Mod" 2>nul
    if exist "%mod_path%\\descriptor.mod" copy "%mod_path%\\descriptor.mod" "%temp_dir%\\Scanned_Mod\\" >nul
    copy "%mod_path%\\*.png" "%temp_dir%\\Scanned_Mod\\" 2>nul
    copy "%mod_path%\\*.jpg" "%temp_dir%\\Scanned_Mod\\" 2>nul
    if exist "%mod_path%\\localisation" (
        mkdir "%temp_dir%\\Scanned_Mod\\localisation" 2>nul
        xcopy "%mod_path%\\localisation\\*.yml" "%temp_dir%\\Scanned_Mod\\localisation\\" /s /e /y /q >nul
    )
) else (
    echo Scanning mods folder...
    for /d %%D in ("%mod_path%\\*") do (
        if exist "%%D\\localisation" (
            mkdir "%temp_dir%\\%%~nxD" 2>nul
            if exist "%%D\\descriptor.mod" copy "%%D\\descriptor.mod" "%temp_dir%\\%%~nxD\\" >nul
            copy "%%D\\*.png" "%temp_dir%\\%%~nxD\\" 2>nul
            copy "%%D\\*.jpg" "%temp_dir%\\%%~nxD\\" 2>nul
            mkdir "%temp_dir%\\%%~nxD\\localisation" 2>nul
            xcopy "%%D\\localisation\\*.yml" "%temp_dir%\\%%~nxD\\localisation\\" /s /e /y /q >nul
        )
    )
)

echo Compressing data...
set output_zip=%~dp0KTT4_Mod_Data.zip
if exist "%output_zip%" del "%output_zip%"
powershell -NoProfile -Command "Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory('%temp_dir%', '%output_zip%')"

rmdir /s /q "%temp_dir%"
echo.
echo ==========================================
echo Done! Created KTT4_Mod_Data.zip in this folder.
echo Please upload this file to the KTT4 website.
echo ==========================================
pause`;

    const blob = new Blob([batContent], { type: 'application/bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'KTT4_Scanner.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setScanError(null);
    setScanResults([]);
    setParsingStatus('Чтение архива...');
    setProgress(0);

    try {
      const zip = new JSZip();
      const zipContent = await zip.loadAsync(file);
      
      const modsMap = new Map<string, any>();

      setParsingStatus('Анализ структуры файлов...');
      
      // Iterate over all files in the zip
      zipContent.forEach((relativePath, zipEntry) => {
        if (zipEntry.dir) return;

        const normalizedPath = relativePath.replace(/\\/g, '/');
        const parts = normalizedPath.split('/');
        
        let isLoc = normalizedPath.includes('/localisation/') && normalizedPath.endsWith('.yml');
        let isDesc = normalizedPath.endsWith('descriptor.mod');
        let isImage = normalizedPath.endsWith('.png') || normalizedPath.endsWith('.jpg');

        if (!isLoc && !isDesc && !isImage) return;

        let modId = "Unknown Mod";
        if ((isDesc || isImage) && parts.length >= 2) {
          modId = parts[parts.length - 2];
        } else if (isLoc) {
          const locIndex = parts.indexOf('localisation');
          if (locIndex > 0) {
            modId = parts[locIndex - 1];
          }
        }

        if (!modsMap.has(modId)) {
          modsMap.set(modId, { id: modId, name: modId, words: 0, tags: [], locFiles: [], descriptorFile: null, imageFiles: [] });
        }
        
        const modData = modsMap.get(modId);

        if (isDesc) {
          modData.descriptorFile = zipEntry;
        } else if (isLoc) {
          modData.locFiles.push(zipEntry);
        } else if (isImage) {
          modData.imageFiles.push(zipEntry);
        }
      });

      const results: ModResult[] = [];
      let processed = 0;
      const totalMods = modsMap.size;

      if (totalMods === 0) {
        setScanError("В архиве не найдено модов с файлами локализации (.yml).");
        setIsScanning(false);
        return;
      }

      const modValues = Array.from(modsMap.values());
      const chunkSize = 5; // Обрабатываем по 5 модов параллельно для стабильности

      for (let i = 0; i < modValues.length; i += chunkSize) {
        const chunk = modValues.slice(i, i + chunkSize);
        
        await Promise.all(chunk.map(async (modData) => {
          if (modData.locFiles.length === 0) return;

          let pictureName = "";
          let version = "";
          let supported_version = "";
          let remote_file_id = "";

          if (modData.descriptorFile) {
            try {
              const text = await modData.descriptorFile.async('string');
              const nameMatch = text.match(/name\s*=\s*"([^"]+)"/);
              if (nameMatch) modData.name = nameMatch[1];

              const tagsMatch = text.match(/tags\s*=\s*\{([^}]+)\}/);
              if (tagsMatch) {
                const tagsText = tagsMatch[1];
                const tagMatches = [...tagsText.matchAll(/"([^"]+)"/g)];
                modData.tags = tagMatches.map(m => m[1]);
              }

              const picMatch = text.match(/picture\s*=\s*"([^"]+)"/);
              if (picMatch) pictureName = picMatch[1];

              const verMatch = text.match(/version\s*=\s*"([^"]+)"/);
              if (verMatch) version = verMatch[1];

              const supVerMatch = text.match(/supported_version\s*=\s*"([^"]+)"/);
              if (supVerMatch) supported_version = supVerMatch[1];

              const remoteMatch = text.match(/remote_file_id\s*=\s*"([^"]+)"/);
              if (remoteMatch) remote_file_id = remoteMatch[1];
            } catch (e) {
              console.warn("Failed to parse descriptor for", modData.id);
            }
          }

          let pictureUrl = undefined;
          let picFile = undefined;

          if (pictureName && modData.imageFiles.length > 0) {
            const cleanPicName = pictureName.split('/').pop() || pictureName;
            picFile = modData.imageFiles.find((f: any) => f.name.toLowerCase().endsWith(cleanPicName.toLowerCase()));
          }

          if (!picFile && modData.imageFiles.length > 0) {
            picFile = modData.imageFiles.find((f: any) => f.name.toLowerCase().includes('thumbnail'));
          }

          if (!picFile && modData.imageFiles.length > 0) {
            picFile = modData.imageFiles[0];
          }

          if (picFile) {
            try {
              const base64 = await picFile.async('base64');
              const ext = picFile.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg';
              pictureUrl = `data:image/${ext};base64,${base64}`;
            } catch (e) {
              console.warn("Failed to load picture for", modData.id);
            }
          }

          let words = 0;
          for (const file of modData.locFiles) {
            try {
              const text = await file.async('string');
              // Оптимизированный подсчет слов: считаем только текст внутри кавычек
              const quoteMatches = text.match(/"([^"\\]*(?:\\.[^"\\]*)*)"/g);
              if (quoteMatches) {
                for (let j = 0; j < quoteMatches.length; j++) {
                  const innerText = quoteMatches[j].slice(1, -1);
                  const wordsMatch = innerText.match(/\S+/g);
                  if (wordsMatch) words += wordsMatch.length;
                }
              }
            } catch (e) {
              console.warn("Failed to read loc file", file.name);
            }
          }
          modData.words = words;

          const isLocOnly = !modData.descriptorFile && modData.imageFiles.length === 0;

          if (words > 0) {
            results.push({
              id: modData.id,
              name: modData.name,
              words: modData.words,
              tags: modData.tags,
              pictureUrl,
              version,
              supported_version,
              remote_file_id,
              isLocOnly
            });
          }
        }));

        processed += chunk.length;
        setProgress((processed / totalMods) * 100);
        setParsingStatus(`Обработка мода ${Math.min(processed, totalMods)} из ${totalMods}...`);
        // Даем UI обновиться
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      if (results.length === 0) {
        setScanError("Файлы локализации найдены, но в них нет текста для перевода.");
      } else {
        results.sort((a, b) => b.words - a.words);
        setScanResults(results);
        setSelectedMods(new Set(results.map(r => r.id)));
      }
    } catch (err) {
      console.error(err);
      setScanError("Произошла ошибка при чтении архива. Убедитесь, что это правильный ZIP файл.");
    } finally {
      setIsScanning(false);
      setParsingStatus('');
      if (event.target) event.target.value = '';
    }
  };

  const filteredResults = scanResults
    .filter(mod => mod.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(mod => selectedTags.length === 0 || selectedTags.every(tag => mod.tags.includes(tag)))
    .filter(mod => showLocOnly || !mod.isLocOnly)
    .sort((a, b) => {
      if (sortBy === 'words_desc') return b.words - a.words;
      if (sortBy === 'words_asc') return a.words - b.words;
      return a.name.localeCompare(b.name);
    });

  const allTags = Array.from(new Set(scanResults.flatMap(mod => mod.tags))).sort();

  const totalScanWords = scanResults.filter(m => selectedMods.has(m.id)).reduce((acc, curr) => acc + curr.words, 0);
  const totalScanPrice = selectedMods.size > 0 ? calculatePrice(totalScanWords, selectedMods.size, isFastSpeed) : 0;
  const scanDiscount = calculateDiscount(selectedMods.size);
  const scanEstimatedTime = getEstimatedTime(totalScanWords, isFastSpeed);

  const packagePrice = calculatePrice(manualModsCount * SMALL_MOD_WORDS, manualModsCount, isFastSpeed);
  const packageDiscount = calculateDiscount(manualModsCount);
  const packageEstimatedTime = getEstimatedTime(manualModsCount * SMALL_MOD_WORDS, isFastSpeed);

  const selectTopMods = (count: number) => {
    const topMods = filteredResults.slice(0, count).map(m => m.id);
    setSelectedMods(new Set(topMods));
  };

  return (
    <section id="calculator" className="py-32 relative z-10">
      <div className="max-w-5xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            {t('title').split(' ')[0]} <span className="text-gradient">{t('title').split(' ')[1] || ''}</span>
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            {t('desc')}
          </p>
        </div>

        <div className="glass-panel rounded-3xl p-8 md:p-12 min-h-[400px] mb-8">
          <h3 className="text-2xl font-display font-bold mb-6 text-center">{t('exactAnalysis')}</h3>
          <div className="flex flex-col items-center justify-center h-full">
            {!scanResults.length && !isScanning ? (
                <div className="text-center w-full max-w-2xl mx-auto">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6 border border-primary/20">
                    <FolderSearch className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-4">Инструкция по анализу</h3>
                  
                  <div className="bg-black/50 border border-white/10 rounded-2xl p-6 text-left mb-8 space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold">1</div>
                      <div>
                        <p className="text-white font-medium mb-1">Скачайте скрипт-сканер</p>
                        <p className="text-sm text-gray-400">Нажмите кнопку "Скачать скрипт (.bat)" ниже.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold">2</div>
                      <div>
                        <p className="text-white font-medium mb-1">Запустите скрипт</p>
                        <p className="text-sm text-gray-400">Запустите скачанный файл. Он попросит указать путь к папке с вашими модами (например, <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary">C:\Users\Name\Documents\Paradox Interactive\Hearts of Iron IV\mod</code>).</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center flex-shrink-0 font-bold">3</div>
                      <div>
                        <p className="text-white font-medium mb-1">Загрузите результат</p>
                        <p className="text-sm text-gray-400">Скрипт создаст файл <code className="bg-white/10 px-1.5 py-0.5 rounded text-primary">KTT4_Mod_Data.zip</code>. Загрузите его сюда с помощью кнопки "Загрузить ZIP-архив".</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
                    <button 
                      onClick={generateBatScript}
                      className="px-8 py-4 bg-white/10 text-white font-bold rounded-full hover:bg-white/20 transition-colors border border-white/20 flex items-center gap-2"
                    >
                      <Download className="w-5 h-5" />
                      1. Скачать скрипт (.bat)
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="px-8 py-4 bg-primary text-black font-bold rounded-full hover:scale-105 transition-transform shadow-[0_0_30px_rgba(0,240,255,0.3)] flex items-center gap-2"
                    >
                      <Upload className="w-5 h-5" />
                      2. Загрузить ZIP-архив
                    </button>
                  </div>

                  <button 
                    onClick={() => window.dispatchEvent(new CustomEvent('open-chatbot-explain-bat'))}
                    className="text-sm text-primary hover:text-white underline underline-offset-4 transition-colors"
                  >
                    Почему этот скрипт безопасен? (Спросить ИИ)
                  </button>
                  
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleZipUpload}
                    className="hidden" 
                    accept=".zip"
                  />
                  
                  {scanError && (
                    <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-start gap-3 text-left max-w-md mx-auto">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>{scanError}</p>
                    </div>
                  )}
                </div>
              ) : isScanning ? (
                <div className="text-center flex flex-col items-center justify-center h-full w-full max-w-md mx-auto">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full mb-8"
                  />
                  <h3 className="text-2xl font-display font-bold mb-2">Анализ данных...</h3>
                  <p className="text-primary font-mono animate-pulse">{parsingStatus}</p>
                  
                  <div className="mt-8 w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-primary"
                        initial={{ width: "0%" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.2, ease: "linear" }}
                      />
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-display font-bold">Результаты анализа</h3>
                    <button onClick={() => setScanResults([])} className="text-sm text-gray-400 hover:text-white">Сбросить</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4 max-h-[600px] overflow-y-auto pr-4 custom-scrollbar">
                      <div className="flex flex-col gap-4 mb-4">
                        <div className="flex flex-wrap gap-2 mb-2">
                          <button onClick={() => selectTopMods(5)} className="text-xs px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full hover:bg-secondary/40 transition-colors">
                            Пакет Мини (5)
                          </button>
                          <button onClick={() => selectTopMods(10)} className="text-xs px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full hover:bg-secondary/40 transition-colors">
                            Пакет Стандарт (10)
                          </button>
                          <button onClick={() => selectTopMods(15)} className="text-xs px-3 py-1.5 bg-secondary/20 text-secondary border border-secondary/30 rounded-full hover:bg-secondary/40 transition-colors">
                            Пакет Макс (15)
                          </button>
                        </div>
                        <input 
                          type="text" 
                          placeholder={t('searchPlaceholder')} 
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary/50"
                          value={searchQuery}
                          onChange={e => setSearchQuery(e.target.value)}
                        />
                        <select 
                          className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-primary/50"
                          value={sortBy}
                          onChange={e => setSortBy(e.target.value as any)}
                        >
                          <option value="words_desc" className="bg-black">По убыванию слов</option>
                          <option value="words_asc" className="bg-black">По возрастанию слов</option>
                          <option value="name_asc" className="bg-black">По имени (А-Я)</option>
                        </select>
                        <label className="flex items-center gap-2 cursor-pointer mt-2">
                          <input 
                            type="checkbox" 
                            checked={showLocOnly}
                            onChange={(e) => setShowLocOnly(e.target.checked)}
                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-primary focus:ring-primary focus:ring-offset-0"
                          />
                          <span className="text-sm text-gray-400 hover:text-white transition-colors">{t('showLocOnly')}</span>
                        </label>
                        {allTags.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {allTags.map(tag => (
                              <button
                                key={tag}
                                onClick={() => {
                                  if (selectedTags.includes(tag)) {
                                    setSelectedTags(selectedTags.filter(t => t !== tag));
                                  } else {
                                    setSelectedTags([...selectedTags, tag]);
                                  }
                                }}
                                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                                  selectedTags.includes(tag) 
                                    ? 'bg-primary text-black border-primary' 
                                    : 'bg-white/5 text-gray-400 border-white/10 hover:border-primary/50'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                           <input 
                             type="checkbox" 
                             checked={selectedMods.size === scanResults.length && scanResults.length > 0}
                             onChange={(e) => {
                               if (e.target.checked) {
                                 setSelectedMods(new Set(scanResults.map(r => r.id)));
                               } else {
                                 setSelectedMods(new Set());
                               }
                             }}
                             className="w-5 h-5 rounded border-gray-600 bg-black/50 text-primary focus:ring-primary focus:ring-offset-black"
                           />
                           <span className="text-sm text-gray-400">Выбрать все</span>
                        </div>
                      </div>

                      {filteredResults.map((mod, idx) => (
                        <div key={idx} className="bg-white/5 p-4 rounded-xl flex gap-4 items-center border border-white/10 hover:bg-white/10 transition-colors">
                          <input 
                            type="checkbox"
                            checked={selectedMods.has(mod.id)}
                            onChange={(e) => {
                              const newSet = new Set(selectedMods);
                              if (e.target.checked) newSet.add(mod.id);
                              else newSet.delete(mod.id);
                              setSelectedMods(newSet);
                            }}
                            className="w-5 h-5 rounded border-gray-600 bg-black/50 text-primary focus:ring-primary focus:ring-offset-black"
                          />
                          <div className="w-14 h-14 bg-black/50 rounded-lg flex items-center justify-center border border-white/10 overflow-hidden">
                            {mod.pictureUrl ? (
                              <img src={mod.pictureUrl} alt={mod.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-base truncate" title={mod.name}>{mod.name}</h4>
                            <div className="text-xs text-gray-400 mt-1">
                              {mod.version && <span className="mr-2">Версия: {mod.version}</span>}
                              {mod.supported_version && <span>Игра: {mod.supported_version}</span>}
                            </div>
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {mod.tags.slice(0, 3).map(tag => (
                                <span key={tag} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full whitespace-nowrap">
                                  {tag}
                                </span>
                              ))}
                              {mod.tags.length === 0 && (
                                <span className="text-[10px] text-gray-500">Нет тегов</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-primary font-mono font-bold text-lg">{mod.words.toLocaleString('ru-RU')}</div>
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">слов</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    <div className="bg-black/50 p-8 rounded-2xl border border-primary/20 flex flex-col justify-center relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 blur-[50px]"></div>
                      
                      <div className="space-y-4 mb-8 relative z-10">
                        <div className="flex justify-between text-gray-400">
                          <span>Выбрано модов:</span>
                          <span className="text-white font-mono">{selectedMods.size} из {scanResults.length}</span>
                        </div>
                        <div className="flex justify-between text-gray-400">
                          <span>Всего слов:</span>
                          <span className="text-white font-mono">{totalScanWords.toLocaleString('ru-RU')}</span>
                        </div>
                        {scanDiscount > 0 && (
                          <div className="flex justify-between text-secondary font-medium">
                            <span>Скидка за объем:</span>
                            <span>-{scanDiscount}%</span>
                          </div>
                        )}
                        <div className="flex justify-between text-gray-400">
                          <span>Примерное время:</span>
                          <span className="text-white font-mono">{formatTime(scanEstimatedTime)}</span>
                        </div>
                        <div className="pt-4 mt-4 border-t border-white/10">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <div className="relative flex items-center justify-center mt-0.5">
                              <input 
                                type="checkbox" 
                                className="sr-only"
                                checked={isFastSpeed}
                                onChange={(e) => setIsFastSpeed(e.target.checked)}
                              />
                              <div className={`w-10 h-6 rounded-full transition-colors ${isFastSpeed ? 'bg-primary' : 'bg-gray-700'}`}></div>
                              <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${isFastSpeed ? 'translate-x-4' : 'translate-x-0'}`}></div>
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold text-white group-hover:text-primary transition-colors">Высокая скорость (x8)</div>
                              <div className="text-xs text-gray-500 mt-1">Перевод будет выполнен в 8 раз быстрее. Надбавка +50% к стоимости.</div>
                            </div>
                          </label>
                        </div>
                      </div>
                      
                      <div className="pt-6 border-t border-white/10 relative z-10">
                        <div className="text-sm text-gray-400 mb-2">Итоговая стоимость</div>
                        <div className="text-5xl font-display font-bold text-gradient">
                          {Math.round(totalScanPrice).toLocaleString('ru-RU')} ₽
                        </div>
                        {totalScanPrice === MIN_PRICE && selectedMods.size > 0 && (
                          <div className="text-xs text-gray-500 mt-2">* Применена минимальная стоимость заказа</div>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => generateReceipt({
                          type: 'exact',
                          price: totalScanPrice,
                          discount: scanDiscount,
                          time: formatTime(scanEstimatedTime),
                          isFast: isFastSpeed,
                          modsCount: selectedMods.size,
                          totalWords: totalScanWords,
                          modsList: scanResults.filter(m => selectedMods.has(m.id)).map(m => ({
                            name: m.name,
                            words: m.words,
                            tags: m.tags
                          }))
                        })}
                        className="mt-8 w-full py-4 bg-primary text-black font-bold rounded-xl hover:bg-white transition-colors text-center block"
                      >
                        {t('orderBtn')}
                      </button>

                      <div className="mt-4 text-center">
                        <p className="text-red-500 text-xs font-bold drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse">
                          {t('disclaimer')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
        </div>

        <div className="glass-panel rounded-3xl p-8 md:p-12 min-h-[400px] mt-8">
          <h3 className="text-2xl font-display font-bold mb-6 text-center">{t('packages')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { name: t('packageMini'), count: 5, desc: '5 небольших модов' },
              { name: t('packageStd'), count: 10, desc: '10 небольших модов', popular: true },
              { name: t('packageMax'), count: 15, desc: '15 небольших модов' }
            ].map((pkg) => (
              <div 
                key={pkg.name}
                onClick={() => setManualModsCount(pkg.count)}
                className={`cursor-pointer p-6 rounded-2xl border transition-all relative ${manualModsCount === pkg.count ? 'bg-secondary/10 border-secondary shadow-[0_0_20px_rgba(112,0,255,0.2)]' : 'bg-white/5 border-white/10 hover:border-white/30'}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-secondary text-white text-xs font-bold px-3 py-1 rounded-full">
                    ПОПУЛЯРНЫЙ
                  </div>
                )}
                <h4 className="text-xl font-display font-bold mb-2">{pkg.name}</h4>
                <p className="text-gray-400 text-sm mb-4">{pkg.desc}</p>
                <div className="text-2xl font-bold text-secondary">-{calculateDiscount(pkg.count)}%</div>
              </div>
            ))}
          </div>
          
          <div className="bg-black/50 p-8 rounded-2xl border border-white/10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex-1 w-full">
              <label className="block text-sm text-gray-400 mb-4">{t('manualCount')}</label>
              <div className="flex items-center gap-4">
                <input 
                  type="range" 
                  min="1" 
                  max="30" 
                  value={manualModsCount}
                  onChange={(e) => setManualModsCount(parseInt(e.target.value))}
                  className="w-full accent-secondary"
                />
                <input 
                  type="number" 
                  min="1"
                  value={manualModsCount}
                  onChange={(e) => setManualModsCount(parseInt(e.target.value) || 1)}
                  className="w-20 bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-center font-mono focus:outline-none focus:border-secondary"
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto min-w-[250px] text-right">
              <div className="text-sm text-gray-400 mb-2">{t('packagePrice')}</div>
              <div className="text-4xl font-display font-bold text-gradient mb-2">
                {Math.round(packagePrice).toLocaleString('ru-RU')} ₽
              </div>
              <div className="text-sm text-secondary mb-2">
                {t('discount')}: {packageDiscount}%
              </div>
              <div className="text-sm text-gray-400 mb-6">
                {t('estimatedTime')}: <span className="text-white font-mono">{formatTime(packageEstimatedTime)}</span>
              </div>
              
              <div className="pt-4 border-t border-white/10 text-left">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative flex items-center justify-center mt-0.5">
                    <input 
                      type="checkbox" 
                      className="sr-only"
                      checked={isFastSpeed}
                      onChange={(e) => setIsFastSpeed(e.target.checked)}
                    />
                    <div className={`w-10 h-6 rounded-full transition-colors ${isFastSpeed ? 'bg-secondary' : 'bg-gray-700'}`}></div>
                    <div className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white transition-transform ${isFastSpeed ? 'translate-x-4' : 'translate-x-0'}`}></div>
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-white group-hover:text-secondary transition-colors">{t('fastSpeed')}</div>
                    <div className="text-xs text-gray-500 mt-1">{t('fastSpeedDesc')}</div>
                  </div>
                </label>
              </div>
            </div>
          </div>
          <button 
            onClick={() => generateReceipt({
              type: 'package',
              price: packagePrice,
              discount: packageDiscount,
              time: formatTime(packageEstimatedTime),
              isFast: isFastSpeed,
              modsCount: manualModsCount,
              totalWords: manualModsCount * SMALL_MOD_WORDS
            })}
            className="mt-8 w-full py-4 bg-secondary text-white font-bold rounded-xl hover:bg-white hover:text-black transition-colors text-center block"
          >
            {t('orderBtn')}
          </button>
        </div>
      </div>
    </section>
  );
}

