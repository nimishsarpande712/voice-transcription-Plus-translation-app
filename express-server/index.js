const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
if (ffmpegPath) ffmpeg.setFfmpegPath(ffmpegPath);
require('dotenv').config();

// Optional OpenAI (Whisper / gpt-4o-mini-transcribe) support for improved multilingual accuracy
let OpenAIClient = null;
let openai = null;
const initOpenAI = () => {
  if (openai) return openai;
  if (!process.env.OPENAI_API_KEY) return null;
  try {
    OpenAIClient = require('openai');
    openai = new OpenAIClient({ apiKey: process.env.OPENAI_API_KEY });
    return openai;
  } catch (e) {
    console.warn('OpenAI SDK not available:', e.message);
    return null;
  }
};

// Import fetch for Node.js
let fetch;
(async () => {
  fetch = (await import('node-fetch')).default;
})();

let GoogleSpeech; // lazy import for Google Cloud Speech
let GoogleTranslate; // lazy import for Google Cloud Translate

// Initialize Google Cloud Speech client with proper credentials
const initGoogleSpeech = () => {
  if (GoogleSpeech) return;
  
  GoogleSpeech = require('@google-cloud/speech');
  
  // Handle different ways of providing credentials
  let clientConfig = {};
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // If credentials are provided as JSON string in environment variable
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      clientConfig = { credentials };
    } catch (error) {
      console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_KEY:', error);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // If credentials file path is provided
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
      clientConfig = { keyFilename: credPath };
    } else {
      console.warn('Google Cloud credentials file not found at:', credPath);
    }
  }
  
  return new GoogleSpeech.SpeechClient(clientConfig);
};

// Initialize Google Cloud Translate client with proper credentials
const initGoogleTranslate = () => {
  if (GoogleTranslate) return GoogleTranslate;
  
  const { Translate } = require('@google-cloud/translate').v2;
  
  // Handle different ways of providing credentials
  let clientConfig = {};
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    // If credentials are provided as JSON string in environment variable
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      clientConfig = { credentials };
    } catch (error) {
      console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_KEY for Translate:', error);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // If credentials file path is provided
    const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
    if (fs.existsSync(credPath)) {
      clientConfig = { keyFilename: credPath };
    } else {
      console.warn('Google Cloud credentials file not found at:', credPath);
    }
  } else if (process.env.GOOGLE_TRANSLATE_API_KEY) {
    // If using API key instead of service account
    clientConfig = { key: process.env.GOOGLE_TRANSLATE_API_KEY };
  }
  
  GoogleTranslate = new Translate(clientConfig);
  return GoogleTranslate;
};

// Enhanced translation function using Google Cloud Translate API
const translateText = async (text, targetLanguage) => {
  try {
    // First try Google Cloud Translate API if available
    if (process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const translate = initGoogleTranslate();
      const [translation] = await translate.translate(text, targetLanguage);
      return translation;
    }
    
    // Fallback to public endpoint if no API credentials
    return await translateWithPublicEndpoint(text, targetLanguage);
  } catch (error) {
    console.error('Google Cloud Translate error, falling back to public endpoint:', error);
    return await translateWithPublicEndpoint(text, targetLanguage);
  }
};

// Fallback translation using public endpoint
const translateWithPublicEndpoint = async (text, targetLanguage) => {
  if (!fetch) {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Public translate endpoint failed');
  }
  
  const data = await response.json();
  return Array.isArray(data?.[0]) ? data[0].map(chunk => chunk?.[0]).join('') : '';
};

// Alternative function for using REST API with simple API key
const transcribeWithApiKey = async (audioBase64, dynamicConfig) => {
  if (!fetch) {
    const nodeFetch = await import('node-fetch');
    fetch = nodeFetch.default;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://speech.googleapis.com/v1/speech:recognize?key=${apiKey}`;
  
  const requestBody = {
    config: {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: languageCode,
      enableAutomaticPunctuation: true,
      model: 'latest_long', // Use the latest model for better accuracy
      useEnhanced: true, // Use enhanced models when available
      alternativeLanguageCodes: ['en-IN', 'hi-IN'], // Add alternative languages for better recognition
      maxAlternatives: 3, // Get multiple alternatives for better accuracy
      speechContexts: [{
        phrases: ['Hindi', 'Marathi', 'Sanskrit', 'भारत', 'नमस्ते', 'धन्यवाद'] // Add context phrases
      }]
    },
    audio: {
      content: audioBase64
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Speech API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data;
};

// OpenAI transcription (fallback or selectable engine)
const transcribeWithOpenAI = async (wavPath, languageRaw) => {
  const client = initOpenAI();
  if (!client) throw new Error('OpenAI not configured');
  // Try more modern lightweight model first; adjust if unsupported
  const preferredModels = ['gpt-4o-mini-transcribe', 'whisper-1'];
  let lastError;
  for (const model of preferredModels) {
    try {
      const response = await client.audio.transcriptions.create({
        file: fs.createReadStream(wavPath),
        model,
        // Provide language hint if plausible (strip region)
        language: languageRaw?.split('-')?.[0] || undefined,
        temperature: 0.2
      });
      // SDK returns an object with text property typically
      if (response?.text) return { transcript: response.text, engine: model };
      if (typeof response === 'string') return { transcript: response, engine: model };
      // Some variants might return segments
      if (response?.segments?.length) {
        return { transcript: response.segments.map(s => s.text).join(' ').trim(), engine: model };
      }
      return { transcript: '', engine: model };
    } catch (err) {
      lastError = err;
      continue; // try next model
    }
  }
  throw lastError || new Error('OpenAI transcription failed');
};

const app = express();
const PORT = process.env.PORT || 4000;

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'],
  credentials: true
}));
app.use(express.json());

// Multer for audio upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024 } // 30MB
});


app.get('/', (req, res) => {
  res.json({ 
    message: 'Multilingual Audio Transcriber API', 
    status: 'running',
    endpoints: ['/api/transcribe', '/translate'],
    supportedLanguages: ['Hindi', 'Marathi', 'Sanskrit']
  });
});

app.get('/api/message', (_req, res) => res.json({ message: 'Backend connected successfully! 🎙️ Enhanced with Google Translate API' }));

// New endpoint to check translation service status
app.get('/api/translation-status', async (req, res) => {
  try {
    const hasApiKey = !!process.env.GOOGLE_TRANSLATE_API_KEY;
    const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_KEY || process.env.GOOGLE_APPLICATION_CREDENTIALS);
    
    let translationService = 'Public Endpoint (Free)';
    if (hasApiKey || hasServiceAccount) {
      translationService = 'Google Cloud Translate API (Official)';
    }
    
    // Test translation to verify it's working
    const testTranslation = await translateText('Hello, world!', 'hi');
    
    res.json({
      status: 'operational',
      service: translationService,
      hasApiKey,
      hasServiceAccount,
      testTranslation: testTranslation || 'Translation test failed',
      supportedLanguages: ['hi', 'mr', 'sa'],
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Health check endpoint for Google Cloud credentials
app.get('/api/health', (req, res) => {
  try {
    const hasServiceAccount = !!(process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
    const hasApiKey = !!process.env.GOOGLE_API_KEY;
    const hasCredentials = hasServiceAccount || hasApiKey;
    
    let credentialsStatus = 'not configured';
    let authMethod = 'none';
    
    if (process.env.GOOGLE_API_KEY) {
      credentialsStatus = 'API key configured';
      authMethod = 'api_key';
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      credentialsStatus = 'JSON service account key configured';
      authMethod = 'service_account';
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credPath = path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      credentialsStatus = fs.existsSync(credPath) ? 'service account file configured' : 'service account file not found';
      authMethod = 'service_account_file';
    }
    
    res.json({
      status: 'healthy',
      googleCloud: {
        configured: hasCredentials,
        authMethod,
        credentialsStatus,
        speechApi: 'available'
      },
      endpoints: {
        transcribe: '/api/transcribe',
        translate: '/translate',
        health: '/api/health'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

// Language mapping (UI language keys -> API codes)
const LANG_MAP = {
  hindi: 'hi-IN',
  marathi: 'mr-IN',
  sanskrit: 'sa-IN', // Sanskrit support is limited; may fallback.
  hi: 'hi-IN',
  mr: 'mr-IN',
  sa: 'sa-IN'
};

// Build dynamic phrase hints (speech adaptation)
function buildPhraseHints(reqLanguageRaw) {
  const envHints = (process.env.SPEECH_HINTS || '')
    .split(/[,;\n]/)
    .map(p => p.trim())
    .filter(Boolean);
  const reqHints = (reqLanguageRaw && reqLanguageRaw.phrases) ? [] : []; // backward compat
  // Domain specific (birthday / greeting) multi-language variants.
  const domain = [
    'जन्मदिन', 'जन्मदिनम्', 'शुभ', 'मंगलम्', 'विजयी', 'सुदिनम्', 'नमस्ते', 'धन्यवाद',
    'Happy Birthday', 'Congratulations', 'victory', 'good day', 'Sanskrit', 'Hindi', 'Marathi'
  ];
  // Remove duplicates while preserving order
  const seen = new Set();
  return [...envHints, ...reqHints, ...domain].filter(p => { if (seen.has(p)) return false; seen.add(p); return true; });
}

function buildSpeechConfig({ languageCode, sampleRate, additionalPhrases = [] }) {
  const baseHints = buildPhraseHints(languageCode.split('-')[0]);
  const merged = [...baseHints, ...additionalPhrases];
  const boost = Number(process.env.SPEECH_BOOST || 15);
  return {
    encoding: 'LINEAR16',
    sampleRateHertz: sampleRate,
    languageCode,
    enableAutomaticPunctuation: true,
    enableWordTimeOffsets: true,
    enableWordConfidence: true,
    model: process.env.SPEECH_MODEL || 'latest_long',
    useEnhanced: true,
    maxAlternatives: 5,
    alternativeLanguageCodes: ['en-IN', 'hi-IN', 'mr-IN'],
    speechContexts: merged.length ? [{ phrases: merged, boost }] : undefined,
    metadata: {
      interactionType: 'DISCUSSION',
      microphoneDistance: 'NEARFIELD',
      recordingDeviceType: 'SMARTPHONE'
    }
  };
}

// Enhanced translation endpoint using Google Cloud Translate API
// GET /translate?text=...&lang=hi|mr|sa
app.get('/translate', async (req, res) => {
  try {
    const { text = '', lang = 'hi' } = req.query;
    if (!text) return res.status(400).json({ error: 'Missing text query parameter' });
    
    const allowed = ['hi','mr','sa'];
    const target = allowed.includes(String(lang)) ? String(lang) : 'hi';
    
    const translated = await translateText(text, target);
    res.json({ translated, target });
  } catch (err) {
    console.error('Translation error:', err);
    res.status(500).json({ error: 'Translation failed' });
  }
});

// POST /api/transcribe  (multipart form-data: file, language, target?)
// Uses Google Cloud Speech-to-Text only, and optionally translates to target (hi|mr|sa).
app.post('/api/transcribe', upload.single('file'), async (req, res) => {
  let originalPath = '';
  let wavPath = '';
  let detectedSampleRate = 16000;
  let engineRequested = '';
  let engineUsed = '';
  let rawAlternatives = [];
  
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded (field name: file)' });
    }

    console.log(`Received file: ${req.file.originalname}, size: ${req.file.size} bytes`);
    
  const languageRaw = (req.body.language || 'hi').toLowerCase();
  const targetRaw = (req.body.target || '').toLowerCase();
  engineRequested = (req.body.engine || req.query.engine || 'google').toLowerCase();
    const languageCode = LANG_MAP[languageRaw] || 'hi-IN';

    // Create tmp dir & write original buffer
    const tmpDir = path.join(__dirname, 'tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    originalPath = path.join(tmpDir, `${Date.now()}_${req.file.originalname.replace(/[^a-zA-Z0-9_.-]/g,'_')}`);
    fs.writeFileSync(originalPath, req.file.buffer);
    wavPath = originalPath + '.wav';

    // Probe original to get sample rate (avoid unnecessary downsampling which can reduce accuracy)
    await new Promise((resolveProbe) => {
      ffmpeg.ffprobe(originalPath, (err, data) => {
        if (!err) {
          const stream = data.streams?.find(s => s.codec_type === 'audio');
          if (stream?.sample_rate) {
            const sr = parseInt(stream.sample_rate, 10);
            if (!Number.isNaN(sr)) detectedSampleRate = sr; 
          }
        }
        resolveProbe();
      });
    });

    const targetSampleRate = detectedSampleRate >= 16000 ? detectedSampleRate : 16000; // ensure minimum 16k
    console.log(`Converting audio to WAV linear16 mono (target SR: ${targetSampleRate}, original detected: ${detectedSampleRate})...`);
    console.log(`Converting audio to WAV linear16 mono (target SR: ${targetSampleRate}, original detected: ${detectedSampleRate})...`);
    // Optional normalization & basic noise shaping if enabled via env (SPEECH_PREPROCESS=1)
    const audioFilters = process.env.SPEECH_PREPROCESS ? 'dynaudnorm=f=75:g=15,highpass=f=120,lowpass=f=5500' : '';
    await new Promise((resolve, reject) => {
      const chain = ffmpeg(originalPath)
        .outputOptions(['-ac 1', `-ar ${targetSampleRate}`, '-f wav', '-acodec pcm_s16le']);
      if (audioFilters) chain.audioFilters(audioFilters);
      chain.save(wavPath)
        .on('end', () => { console.log('Audio conversion completed'); resolve(); })
        .on('error', (err) => { console.error('FFmpeg conversion error:', err); reject(err); });
    });

    let transcript = '';
    
    try {
      const audioBytes = fs.readFileSync(wavPath).toString('base64');
      
      const wantOpenAI = engineRequested === 'openai';
      const openaiAvailable = !!process.env.OPENAI_API_KEY;
      let usedGoogle = false;
      if (wantOpenAI && openaiAvailable) {
        try {
          console.log(`Transcribing audio using OpenAI model (requested engine: ${engineRequested})`);
          const { transcript: oaText, engine: oaModel } = await transcribeWithOpenAI(wavPath, languageCode);
          transcript = oaText;
          engineUsed = `openai:${oaModel}`;
        } catch (err) {
          console.warn('OpenAI transcription failed, will fallback to Google:', err.message);
        }
      }
      if (!transcript) {
        // Choose Google auth method
        const sampleRateToSend = Math.min(targetSampleRate, 48000); // Google limit for some enhanced models
        // Optionally accept extra phrases from client
        const clientPhrasesRaw = req.body.phrases || req.query.phrases || '';
        const additionalPhrases = String(clientPhrasesRaw)
          .split(/[,;\n]/)
          .map(p => p.trim())
          .filter(Boolean);
        const dynamicConfig = buildSpeechConfig({ languageCode, sampleRate: sampleRateToSend, additionalPhrases });
        if (process.env.GOOGLE_API_KEY) {
          usedGoogle = true;
          engineUsed = 'google:rest';
          console.log(`Transcribing audio using Google REST (API key) language=${languageCode} sr=${sampleRateToSend}`);
          const response = await transcribeWithApiKey(audioBytes, dynamicConfig);
          if (response.results?.length) {
            rawAlternatives = response.results.flatMap(r => r.alternatives || []);
            transcript = response.results.map(r => r.alternatives?.[0]?.transcript || '').join(' ').trim();
          }
        } else {
          usedGoogle = true;
          engineUsed = 'google:client';
          console.log(`Transcribing audio using Google client (service account) language=${languageCode} sr=${sampleRateToSend}`);
          const speechClient = initGoogleSpeech();
          const request = { audio: { content: audioBytes }, config: dynamicConfig };
          const [response] = await speechClient.recognize(request);
          if (response.results?.length) {
            rawAlternatives = response.results.flatMap(r => r.alternatives || []);
            transcript = response.results.map(r => r.alternatives?.[0]?.transcript || '').join(' ').trim();
          }
        }
      }
      if (!transcript) {
        transcript = 'No speech detected in the audio file.';
      }
      console.log('Transcription successful:', transcript.substring(0, 120) + '...');
    } catch (error) {
      console.error('Google Speech API error:', error);
      throw new Error(`Speech recognition failed: ${error.message}`);
    }
    let translated = null;
    const target = ['hi','mr','sa'].includes(targetRaw) ? targetRaw : null;
    if (target && target !== languageRaw) {
      try {
        console.log(`Translating to ${target}...`);
        translated = await translateText(transcript, target);
        console.log('Translation successful:', translated.substring(0, 100) + '...');
      } catch (e) {
        console.error('Translation error:', e);
        // swallow translation errors, still return transcript
      }
    }
    
    res.json({ 
      text: transcript, 
      translated, 
      engine: engineUsed || engineRequested || 'google', 
      language: languageCode, 
      target,
      sampleRate: detectedSampleRate,
      alternatives: rawAlternatives.slice(0,5).map(a => ({ transcript: a.transcript, confidence: a.confidence })),
      success: true 
    });
    
  } catch (err) {
    console.error('Transcription error:', err);
    res.status(500).json({ 
      error: 'Transcription failed', 
      details: err.message,
      success: false 
    });
  } finally {
    // Cleanup files
    try { 
      if (originalPath && fs.existsSync(originalPath)) {
        fs.unlinkSync(originalPath); 
        console.log('Cleaned up original file');
      }
    } catch (cleanupErr) {
      console.warn('Failed to cleanup original file:', cleanupErr.message);
    }
    
    try { 
      if (wavPath && fs.existsSync(wavPath)) {
        fs.unlinkSync(wavPath); 
        console.log('Cleaned up WAV file');
      }
    } catch (cleanupErr) {
      console.warn('Failed to cleanup WAV file:', cleanupErr.message);
    }
  }
});

app.listen(PORT, () => {
  console.log(`Express server running on http://localhost:${PORT}`);
});
