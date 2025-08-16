
"use client";
import React from 'react';

export default function Home() {
  const [message, setMessage] = React.useState('');
  
  // File transcription state
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);
  const [fileTranscript, setFileTranscript] = React.useState('');
  const [fileTranslated, setFileTranslated] = React.useState('');
  const [isTranscribing, setIsTranscribing] = React.useState(false);
  const [targetLanguage, setTargetLanguage] = React.useState<'hi' | 'mr' | 'sa'>('hi');
  
  // Live speech recognition + translation state
  const [recognized, setRecognized] = React.useState('');
  const [translated, setTranslated] = React.useState('');
  const [translateLang, setTranslateLang] = React.useState<'hi' | 'mr' | 'sa'>('hi');
  const [inputLanguage, setInputLanguage] = React.useState<'en-IN' | 'hi-IN' | 'mr-IN'>('en-IN');
  const [listening, setListening] = React.useState(false);
  const [copySuccess, setCopySuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [translationService, setTranslationService] = React.useState('');
  const [debugInfo, setDebugInfo] = React.useState('');
  const recognitionRef = React.useRef<any>(null);

  const startRecognition = () => {
    try {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      if (!SpeechRecognition) {
        setError('SpeechRecognition not supported in this browser. Please use Chrome.');
        setTimeout(() => setError(''), 5000);
        return;
      }
      const rec = new SpeechRecognition();
      recognitionRef.current = rec;
      
      // Enhanced configuration for better accuracy
      rec.lang = inputLanguage; // Use selected input language
      rec.interimResults = true; // Enable interim results for better UX
      rec.continuous = true; // Enable continuous recognition
      rec.maxAlternatives = 3; // Get multiple alternatives for better accuracy
      
      rec.onstart = () => {
        setListening(true);
        setDebugInfo('🎤 Listening... Speak clearly into your microphone.');
      };
      rec.onend = () => {
        setListening(false);
        setDebugInfo('⏹️ Speech recognition stopped.');
        setTimeout(() => setDebugInfo(''), 3000);
      };
      rec.onerror = (e: any) => { 
        console.error('Speech Recognition Error:', e);
        setListening(false);
        setDebugInfo(`❌ Error: ${e.error}`);
        if (e.error === 'no-speech') {
          setError('No speech was detected. Try speaking closer to the microphone.');
        } else if (e.error === 'network') {
          setError('Network error occurred. Please check your connection.');
        } else {
          setError(`Speech recognition error: ${e.error}`);
        }
        setTimeout(() => setError(''), 5000);
      };
      
      rec.onresult = async (event: any) => {
        // Process all results for better accuracy
        let finalTranscript = '';
        let interimTranscript = '';
        let confidence = 0;
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcript = result[0].transcript;
          confidence = Math.max(confidence, result[0].confidence || 0);
          
          if (result.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        // Update debug information with confidence
        if (confidence > 0) {
          setDebugInfo(`🎯 Recognition confidence: ${Math.round(confidence * 100)}%`);
        }
        
        // Show interim results for better UX
        if (interimTranscript) {
          setRecognized(finalTranscript + interimTranscript + '...');
        }
        
        // Only translate when we have final results
        if (finalTranscript.trim()) {
          setRecognized(finalTranscript);
          setTranslated('Translating...');
          setDebugInfo(`✅ Final transcript: "${finalTranscript}" (${Math.round(confidence * 100)}% confidence)`);
          
          try {
            const res = await fetch(`http://localhost:4000/translate?text=${encodeURIComponent(finalTranscript.trim())}&lang=${translateLang}`);
            const data = await res.json();
            setTranslated(data.translated || '');
            setDebugInfo(`🌐 Translation completed successfully`);
          } catch (e:any) {
            console.error('Translation error:', e);
            setError('Translation failed. Please try again.');
            setDebugInfo(`❌ Translation failed: ${e.message}`);
            setTimeout(() => setError(''), 3000);
          }
        }
      };
      
      rec.start();
    } catch (err) {
      console.error(err);
      setError('Failed to start speech recognition. Please try again.');
      setTimeout(() => setError(''), 5000);
    }
  };

  const stopRecognition = () => {
    const rec = recognitionRef.current;
    if (rec) rec.stop();
  };

  // Function to get the best available voice for a language
  const getBestVoice = (language: string) => {
    const voices = window.speechSynthesis.getVoices();
    
    // Try to find a native voice for the language
    let voice = voices.find(v => v.lang === language && v.localService);
    
    // If no local voice, try any voice for the language
    if (!voice) {
      voice = voices.find(v => v.lang === language);
    }
    
    // If still no voice, try language code without region
    if (!voice) {
      const langCode = language.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(langCode));
    }
    
    return voice;
  };

  const speakTranslated = () => {
    if (!translated) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(translated);
    
    // Enhanced speech synthesis configuration for better accuracy
    const targetLang = translateLang === 'hi' ? 'hi-IN' : translateLang === 'mr' ? 'mr-IN' : 'hi-IN';
    utter.lang = targetLang;
    
    // Try to set the best available voice
    const bestVoice = getBestVoice(targetLang);
    if (bestVoice) {
      utter.voice = bestVoice;
      console.log(`Using voice: ${bestVoice.name} (${bestVoice.lang})`);
    }
    
    utter.rate = 0.8; // Slightly slower for better pronunciation
    utter.pitch = 1.0; // Normal pitch
    utter.volume = 0.9; // Slightly lower volume for clarity
    
    // Add event handlers for better control
    utter.onstart = () => console.log('Speech started');
    utter.onend = () => console.log('Speech ended');
    utter.onerror = (event) => {
      console.error('Speech synthesis error:', event.error);
      setError('Text-to-speech failed. Please try again.');
      setTimeout(() => setError(''), 3000);
    };
    
    window.speechSynthesis.speak(utter);
  };

  const speakFileTranslated = () => {
    if (!fileTranslated) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utter = new SpeechSynthesisUtterance(fileTranslated);
    
    // Enhanced speech synthesis configuration for better accuracy
    const targetLang = targetLanguage === 'hi' ? 'hi-IN' : targetLanguage === 'mr' ? 'mr-IN' : 'hi-IN';
    utter.lang = targetLang;
    
    // Try to set the best available voice
    const bestVoice = getBestVoice(targetLang);
    if (bestVoice) {
      utter.voice = bestVoice;
      console.log(`Using voice: ${bestVoice.name} (${bestVoice.lang})`);
    }
    
    utter.rate = 0.8; // Slightly slower for better pronunciation
    utter.pitch = 1.0; // Normal pitch
    utter.volume = 0.9; // Slightly lower volume for clarity
    
    // Add event handlers for better control
    utter.onstart = () => console.log('File speech started');
    utter.onend = () => console.log('File speech ended');
    utter.onerror = (event) => {
      console.error('File speech synthesis error:', event.error);
      setError('Text-to-speech failed. Please try again.');
      setTimeout(() => setError(''), 3000);
    };
    
    window.speechSynthesis.speak(utter);
  };

  // Initialize voices when component mounts
  React.useEffect(() => {
    // Load voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      console.log('Available voices:', voices.map(v => `${v.name} (${v.lang})`));
    };

    // Load voices immediately if already available
    loadVoices();

    // Also listen for the voiceschanged event (some browsers load voices asynchronously)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Tips component for better speech recognition
  const SpeechTips = () => (
    <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
      <h3 className="text-lg font-semibold text-blue-300 mb-3 flex items-center gap-2">
        💡 Tips for Better Speech Recognition
      </h3>
      <ul className="text-sm text-gray-300 space-y-1">
        <li>• Speak clearly and at a moderate pace</li>
        <li>• Use a quiet environment with minimal background noise</li>
        <li>• Position your microphone 6-12 inches from your mouth</li>
        <li>• Select the correct input language for better accuracy</li>
        <li>• Give browser microphone permissions when prompted</li>
        <li>• Use Chrome/Chromium browser for best results</li>
      </ul>
    </div>
  );

  // Copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess('✅ Copied!');
      setTimeout(() => setCopySuccess(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
      setCopySuccess('❌ Failed to copy');
      setTimeout(() => setCopySuccess(''), 2000);
    }
  };

  // Loading spinner component
  const LoadingSpinner = () => (
    <div className="flex items-center justify-center gap-2">
      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      <span>Processing...</span>
    </div>
  );

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setFileTranscript('');
      setFileTranslated('');
    }
  };

  const transcribeFile = async () => {
    if (!uploadedFile) return;
    
    setIsTranscribing(true);
    setFileTranscript('');
    setFileTranslated('');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('language', 'hi'); // Source language
      formData.append('target', targetLanguage); // Target language for translation

      const response = await fetch('http://localhost:4000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setFileTranscript(data.text || '');
      setFileTranslated(data.translated || data.text || '');
    } catch (error) {
      console.error('Transcription error:', error);
      setError('Failed to transcribe audio. Please try again.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setIsTranscribing(false);
    }
  };
  React.useEffect(() => {
     fetch('http://localhost:4000/api/message')
       .then(res => res.json())
       .then(data => setMessage(data.message))
       .catch(()=>{});
     
     // Fetch translation service status
     fetch('http://localhost:4000/api/translation-status')
       .then(res => res.json())
       .then(data => {
         setTranslationService(data.service || 'Unknown');
       })
       .catch(()=>{});
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 font-sans">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white text-center py-12 px-4">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 hover:text-pink-200 transition-colors float">
          🎙️ Multilingual Audio Transcriber
        </h1>
        <p className="text-lg md:text-xl text-indigo-100">
          Upload audio, get transcription, and translate into Hindi, Marathi, or Sanskrit instantly.
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Copy Success Notification */}
        {copySuccess && (
          <div className="fixed top-4 right-4 bg-gray-800 border border-green-500 text-green-400 px-4 py-2 rounded-xl shadow-lg z-50 animate-pulse">
            {copySuccess}
          </div>
        )}

        {/* Error Notification */}
        {error && (
          <div className="fixed top-4 right-4 bg-gray-800 border border-red-500 text-red-400 px-4 py-2 rounded-xl shadow-lg z-50 animate-pulse">
            ❌ {error}
          </div>
        )}
        
        {/* File Upload Section */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6 fade-in-up">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            📂 Upload Audio File
          </h2>
          
          <div className="space-y-6">
            {/* Drag & Drop Upload Box */}
            <div className="relative">
              <input
                type="file"
                accept=".mp3,.wav,.m4a,audio/*"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={isTranscribing}
                id="file-upload"
              />
              <label 
                htmlFor="file-upload" 
                className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-500 rounded-xl bg-gray-700/50 hover:border-pink-400 hover:bg-gray-700 transition-all cursor-pointer ${
                  isTranscribing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-2">🎵</div>
                  <p className="text-gray-300 text-sm">
                    Drag & Drop your audio file here or click to browse
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Supports .mp3, .wav, .m4a files
                  </p>
                </div>
              </label>
            </div>

            {/* Selected File Info */}
            {uploadedFile && (
              <div className="bg-gray-700 p-3 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="bg-purple-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                    {uploadedFile.name.split('.').pop()?.toUpperCase()}
                  </div>
                  <span className="text-white font-medium">{uploadedFile.name}</span>
                  <span className="text-gray-400 text-sm">
                    ({Math.round(uploadedFile.size / 1024)}KB)
                  </span>
                </div>
              </div>
            )}

            {/* Language Selector & Action Button */}
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Language
                </label>
                <select
                  value={targetLanguage}
                  onChange={(e) => setTargetLanguage(e.target.value as 'hi' | 'mr' | 'sa')}
                  className="w-full bg-gray-700 border border-gray-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                  disabled={isTranscribing}
                >
                  <option value="">Choose Target Language</option>
                  <option value="hi">🇮🇳 Hindi</option>
                  <option value="mr">🌸 Marathi</option>
                  <option value="sa">📜 Sanskrit</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={transcribeFile}
                  disabled={!uploadedFile || isTranscribing || !targetLanguage}
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 text-white px-6 py-3 rounded-full font-medium transition-all"
                >
                  {isTranscribing ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Transcribing...
                    </span>
                  ) : (
                    '✨ Transcribe Audio'
                  )}
                </button>
                
                <button
                  onClick={speakFileTranslated}
                  disabled={!fileTranslated}
                  className="bg-purple-500 hover:bg-purple-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-3 rounded-full font-medium transition-all flex items-center gap-2"
                >
                  🔊 Listen
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {(fileTranscript || fileTranslated || isTranscribing) && (
          <div className="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6 fade-in-up delay-100">
            <h3 className="text-2xl font-bold text-white mb-6">📜 Results</h3>
            
            {/* Original Transcription */}
            {fileTranscript && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-gray-300">Original Transcription</h4>
                  <button
                    onClick={() => copyToClipboard(fileTranscript)}
                    className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="bg-gray-700 p-4 rounded-xl">
                  <p className="font-mono text-gray-300 leading-relaxed">
                    {fileTranscript}
                  </p>
                </div>
              </div>
            )}

            {/* Translated Text */}
            {fileTranslated && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-lg font-semibold text-pink-300">
                    Translated to {targetLanguage === 'hi' ? 'Hindi 🇮🇳' : targetLanguage === 'mr' ? 'Marathi 🌸' : 'Sanskrit 📜'}
                  </h4>
                  <button
                    onClick={() => copyToClipboard(fileTranslated)}
                    className="bg-pink-600 hover:bg-pink-500 text-white px-3 py-1 rounded-full text-sm transition-colors flex items-center gap-1"
                  >
                    📋 Copy
                  </button>
                </div>
                <div className="bg-gradient-to-br from-pink-900/30 to-purple-900/30 p-4 rounded-xl border border-pink-500/20">
                  <p className="font-serif text-xl text-pink-300 leading-relaxed devanagari-text">
                    {fileTranslated}
                  </p>
                </div>
              </div>
            )}

            {/* Placeholder when transcribing */}
            {isTranscribing && !fileTranscript && (
              <div className="bg-gray-700 p-6 rounded-xl text-center">
                <div className="animate-pulse text-gray-400">
                  Your transcription will appear here...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live Speech Recognition Section */}
        <div className="bg-gray-800 p-6 rounded-2xl shadow-xl mb-6 fade-in-up delay-200">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            🎤 Live Speech Recognition
          </h2>
          
          <SpeechTips />
          
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Input Language (Speech Recognition)
                </label>
                <select
                  value={inputLanguage}
                  onChange={(e) => setInputLanguage(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="en-IN">🇬🇧 English (India)</option>
                  <option value="hi-IN">🇮🇳 Hindi (India)</option>
                  <option value="mr-IN">🌸 Marathi (India)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Target Language (Translation)
                </label>
                <select
                  value={translateLang}
                  onChange={(e) => setTranslateLang(e.target.value as any)}
                  className="bg-gray-700 border border-gray-600 rounded-xl px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                >
                  <option value="hi">🇮🇳 Hindi</option>
                  <option value="mr">🌸 Marathi</option>
                  <option value="sa">📜 Sanskrit</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                {!listening ? (
                  <button 
                    onClick={startRecognition} 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105 hover:shadow-xl text-white px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2"
                  >
                    ▶️ Start Listening
                  </button>
                ) : (
                  <button 
                    onClick={stopRecognition} 
                    className="bg-gradient-to-r from-red-500 to-rose-500 hover:scale-105 hover:shadow-xl text-white px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 animate-pulse"
                  >
                    ⏹️ Stop Recording
                  </button>
                )}
                
                <button 
                  disabled={!translated} 
                  onClick={speakTranslated} 
                  className="bg-purple-500 hover:bg-purple-600 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2"
                >
                  🔊 Speak
                </button>
              </div>
            </div>

            <div className="text-sm text-gray-400 bg-gray-700 p-3 rounded-xl">
              💡 Input language: {
                inputLanguage === 'en-IN' ? 'English (India)' :
                inputLanguage === 'hi-IN' ? 'Hindi (India)' :
                'Marathi (India)'
              }. Output displayed in Devanagari script.
            </div>

            {/* Debug Information */}
            {debugInfo && (
              <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-xl">
                <p className="text-blue-300 text-sm">{debugInfo}</p>
              </div>
            )}

            {/* Live Recognition Results */}
            {(recognized || translated) && (
              <div className="space-y-4">
                {recognized && (
                  <div className="bg-gray-700 p-4 rounded-xl">
                    <h5 className="font-semibold text-gray-300 mb-2">Original (English):</h5>
                    <p className="text-white">{recognized}</p>
                  </div>
                )}
                
                {translated && (
                  <div className="bg-gradient-to-br from-indigo-900/30 to-blue-900/30 p-4 rounded-xl border border-indigo-500/20">
                    <h5 className="font-semibold text-indigo-300 mb-2">Translated:</h5>
                    <p className="text-xl text-indigo-200 devanagari-text leading-relaxed">
                      {translated}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Backend Status */}
        <div className="bg-gray-800 p-4 rounded-xl shadow-lg text-center fade-in-up delay-300">
          <div className="text-gray-300">
            <span className="font-semibold">Backend Status:</span>
            <div className="mt-1">
              {message ? (
                <span className="text-green-400">✅ {message}</span>
              ) : (
                <span className="text-yellow-400 animate-pulse">🔄 Connecting to backend...</span>
              )}
            </div>
            {translationService && (
              <div className="mt-2 text-sm">
                <span className="font-semibold text-purple-300">Translation Service:</span>
                <div className="text-purple-200">
                  {translationService.includes('Official') ? '🚀' : '📡'} {translationService}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
