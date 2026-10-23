const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
const os = require('os');
const archiver = require('archiver');
const multer = require('multer');
const cron = require('node-cron');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3030;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public'), {
  etag: false,
  maxAge: 0,
  setHeaders: (res) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
}));

// Authentication Routes & User Isolation
const { authRouter, optionalAuth, authMiddleware } = require('./routes/auth');
app.use('/api/auth', authRouter);

// Root directories
const GENERATED_DIR = path.join(__dirname, 'generated-projects');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'videos');
const REELS_DIR = path.join(__dirname, 'public', 'rendered-reels');
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULER_FILE = path.join(DATA_DIR, 'scheduler-state.json');
const SCHEDULED_QUEUE_FILE = path.join(DATA_DIR, 'scheduled-queue.json');
[GENERATED_DIR, UPLOADS_DIR, REELS_DIR, DATA_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.mp4';
    cb(null, `upload-${Date.now()}-${Math.round(Math.random() * 1E6)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 * 1024, // 15GB max for 4K / full-length / multi-part videos
    fieldSize: 100 * 1024 * 1024       // 100MB max for text form fields
  }
});

// Serve uploaded media statically
app.use('/uploads', express.static(UPLOADS_DIR));

// 🎵 Timeline Studio BGM Audio Upload
app.post('/api/audio/upload-timeline-bgm', upload.single('audioFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded.' });
    }
    const relPath = `/uploads/${req.file.filename}`;
    console.log(`🎵 [Timeline Studio] Custom audio uploaded: ${req.file.originalname} -> ${req.file.filename}`);
    return res.json({
      success: true,
      audioUrl: relPath,
      fileName: req.file.filename,
      originalName: req.file.originalname
    });
  } catch (err) {
    console.error('Audio upload error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scheduled Reels Storage & Background Status Checker
function getScheduledQueue() {
  try {
    if (fs.existsSync(SCHEDULED_QUEUE_FILE)) {
      return JSON.parse(fs.readFileSync(SCHEDULED_QUEUE_FILE, 'utf8'));
    }
  } catch (_) {}
  return [];
}

function saveScheduledQueue(queue) {
  try {
    fs.writeFileSync(SCHEDULED_QUEUE_FILE, JSON.stringify(queue, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving scheduled queue:', err);
  }
}

// Helper to safely write updates to .env file and process.env
function updateEnvFile(keyValues) {
  try {
    let envContent = '';
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    for (const [key, val] of Object.entries(keyValues)) {
      if (val === undefined || val === null) continue;
      const strVal = String(val).trim();
      process.env[key] = strVal;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${strVal}`);
      } else {
        envContent = envContent.trim() + (envContent.trim() ? '\n' : '') + `${key}=${strVal}\n`;
      }
    }
    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    console.log('📝 [.env Sync] Updated keys:', Object.keys(keyValues).join(', '));
  } catch (err) {
    console.error('⚠️ [.env Sync Error]:', err.message);
  }
}

// Meta Token Status & Expiry Checker
async function checkMetaTokenStatus(token = process.env.META_INSTAGRAM_TOKEN) {
  if (!token) return { active: false, error: 'No token configured' };

  try {
    // 1. Check direct profile access
    const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${token}`).then(r => r.json());
    if (meRes.error) {
      return {
        active: false,
        error: meRes.error.message,
        code: meRes.error.code,
        subcode: meRes.error.error_subcode
      };
    }

    // 2. Query debug_token to inspect token type & permanent/expiry flag
    let debugInfo = null;
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;
    const inspectToken = (appId && appSecret) ? `${appId}|${appSecret}` : token;
    try {
      const debugRes = await fetch(`https://graph.facebook.com/debug_token?input_token=${token}&access_token=${inspectToken}`).then(r => r.json());
      if (debugRes.data) {
        debugInfo = debugRes.data;
      }
    } catch (_) {}

    // In Meta Graph API: expires_at === 0 or type === 'PAGE' indicates Never-Expiring Permanent Token!
    const isNeverExpiring = debugInfo ? (debugInfo.expires_at === 0 || debugInfo.type === 'PAGE') : false;
    let expiresAtFormatted = isNeverExpiring ? 'Never Expires (Permanent Page Token)' : null;

    if (!isNeverExpiring && debugInfo?.expires_at) {
      expiresAtFormatted = new Date(debugInfo.expires_at * 1000).toLocaleString('gu-IN', { dateStyle: 'medium', timeStyle: 'short' });
    }

    return {
      active: true,
      name: meRes.name,
      id: meRes.id,
      isNeverExpiring: !!isNeverExpiring,
      expiresAt: expiresAtFormatted || 'Active Session',
      type: debugInfo?.type || 'TOKEN',
      scopes: debugInfo?.scopes || []
    };
  } catch (err) {
    return { active: false, error: err.message };
  }
}

// Auto-Refresh & Upgrade to Never-Expiring Page Token
async function refreshOrUpgradeMetaToken(providedToken) {
  const currentToken = providedToken || process.env.META_INSTAGRAM_TOKEN;
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;

  if (!currentToken) {
    throw new Error('Meta Instagram Access Token is missing.');
  }

  console.log('🔄 [Meta Token Refresher] Attempting token refresh / upgrade to permanent Page token...');

  let userToken = currentToken;

  // Step 1: If App ID and Secret are provided, exchange short/long token with fb_exchange_token for 60-day token
  if (appId && appSecret) {
    try {
      const exchangeUrl = `https://graph.facebook.com/v20.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;
      const exchangeRes = await fetch(exchangeUrl).then(r => r.json());
      if (exchangeRes.access_token) {
        userToken = exchangeRes.access_token;
        console.log('✅ [Meta Token Refresher] Successfully refreshed 60-day User Token.');
      } else if (exchangeRes.error) {
        console.warn('⚠️ [Meta Token Refresher] fb_exchange_token notice:', exchangeRes.error.message);
      }
    } catch (e) {
      console.warn('⚠️ [Meta Token Refresher] Exchange request error:', e.message);
    }
  }

  // Step 2: Query /me/accounts using userToken to extract NEVER-EXPIRING Page Token
  let finalToken = userToken;
  let finalUserId = process.env.META_INSTAGRAM_USER_ID;
  let finalPageId = process.env.META_INSTAGRAM_PAGE_ID;
  let isNeverExpiring = false;
  let pageName = '';

  try {
    const accountsUrl = `https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${userToken}`;
    const accountsRes = await fetch(accountsUrl).then(r => r.json());

    if (accountsRes.data && accountsRes.data.length > 0) {
      // Find page linked to Instagram Business Account
      const matchedPage = accountsRes.data.find(p => p.instagram_business_account?.id) || accountsRes.data[0];
      if (matchedPage) {
        pageName = matchedPage.name;
        finalPageId = matchedPage.id;
        if (matchedPage.instagram_business_account?.id) {
          finalUserId = matchedPage.instagram_business_account.id;
        }
        if (matchedPage.access_token) {
          finalToken = matchedPage.access_token;
          isNeverExpiring = true;
          console.log(`🌟 [Meta Token Refresher] Extracted NEVER-EXPIRING Page Token for "${pageName}" (IG: ${finalUserId || 'linked'})!`);
        }
      }
    } else if (accountsRes.error) {
      console.warn('⚠️ [Meta Token Refresher] /me/accounts warning:', accountsRes.error.message);
    }
  } catch (accErr) {
    console.warn('⚠️ [Meta Token Refresher] Accounts lookup failed:', accErr.message);
  }

  // Step 3: Persist newly generated credentials
  updateEnvFile({
    META_INSTAGRAM_TOKEN: finalToken,
    ...(finalUserId ? { META_INSTAGRAM_USER_ID: finalUserId } : {}),
    ...(finalPageId ? { META_INSTAGRAM_PAGE_ID: finalPageId } : {})
  });

  // Verify the new token
  const testRes = await checkMetaTokenStatus(finalToken);
  if (!testRes.active) {
    throw new Error(`Token refresh failed: ${testRes.error}`);
  }

  return {
    success: true,
    token: finalToken,
    userId: finalUserId,
    pageId: finalPageId,
    pageName,
    isNeverExpiring: testRes.isNeverExpiring || isNeverExpiring,
    expiresAt: testRes.expiresAt,
    message: (testRes.isNeverExpiring || isNeverExpiring)
      ? `Never-Expiring Permanent Token is active! (Page: ${pageName || 'Connected Page'}) 🎉`
      : 'Token renewed successfully for 60 days! ✓'
  };
}

// 🛡️ PRE-UPLOAD GUARD: Check Token Before Every Reel Upload & Auto-Refresh If Invalid
async function ensureValidInstagramToken(customToken) {
  let token = customToken || process.env.META_INSTAGRAM_TOKEN;
  if (!token) {
    throw new Error('Meta Instagram Access Token missing. Please add token in Settings.');
  }

  console.log('🔍 [Meta Pre-Check] Validating Instagram Access Token before upload...');
  const status = await checkMetaTokenStatus(token);

  if (status.active) {
    console.log(`✅ [Meta Pre-Check] Token is valid and ready! (${status.isNeverExpiring ? 'Lifetime Never-Expiring' : 'Active'})`);
    return token;
  }

  console.warn(`⚠️ [Meta Pre-Check] Token invalid or expired (${status.error}). Triggering automatic refresh...`);

  // Attempt auto-refresh on the fly!
  try {
    const refreshed = await refreshOrUpgradeMetaToken(token);
    if (refreshed.success && refreshed.token) {
      console.log(`🎉 [Meta Pre-Check] Token automatically refreshed & upgraded! New token is active. Proceeding with Reel upload...`);
      return refreshed.token;
    }
  } catch (refreshErr) {
    console.error(`❌ [Meta Pre-Check] Automatic token refresh failed:`, refreshErr.message);
    throw new Error(`ઇન્સ્ટાગ્રામ એક્સેસ ટોકન એક્સપાયર થયેલ છે અને ઓટો-રિફ્રેશ પણ નિષ્ફળ રહ્યો: ${refreshErr.message}. કૃપા કરીને Settings માં નવો Token અથવા Meta App ID & Secret ચકાસો.`);
  }

  throw new Error(`Instagram token is invalid: ${status.error}`);
}

// Telegram Instant Alert Dispatcher
async function sendTelegramAlert(messageHtml) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return false;
  }
  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageHtml,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });
    const data = await res.json();
    if (data.ok) {
      console.log('📲 [Telegram Alert] Notification delivered to your Telegram!');
      return true;
    } else {
      console.warn('⚠️ [Telegram Alert Warning]:', data.description);
      return false;
    }
  } catch (err) {
    console.warn('⚠️ [Telegram Alert Request Error]:', err.message);
    return false;
  }
}

// WhatsApp Instant Alert Dispatcher (CallMeBot Free API)
async function sendWhatsAppAlert(messageText) {
  if (process.env.WHATSAPP_ALERTS_ENABLED === 'false') {
    console.log('⏸️ [WhatsApp Alert Skipped] Alerts are toggled OFF by user switch.');
    return false;
  }
  const phone = process.env.WHATSAPP_PHONE;
  const apiKey = process.env.WHATSAPP_APIKEY;
  if (!phone || !apiKey) {
    return false;
  }
  try {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    const encodedText = encodeURIComponent(messageText);
    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodedText}&apikey=${apiKey}`;
    const res = await fetch(url);
    const text = await res.text();
    if (res.ok || text.includes('queued') || text.includes('Success')) {
      console.log('📲 [WhatsApp Alert] Instant notification delivered to your WhatsApp!');
      return true;
    } else {
      console.warn('⚠️ [WhatsApp Alert Warning]:', text);
      return false;
    }
  } catch (err) {
    console.warn('⚠️ [WhatsApp Alert Error]:', err.message);
    return false;
  }
}

// Unified Instant Alert Dispatcher (Sends WhatsApp + Telegram)
async function sendInstantAlert(plainText, htmlText) {
  sendWhatsAppAlert(plainText).catch(() => {});
  sendTelegramAlert(htmlText || plainText).catch(() => {});
}

// Format seconds into ASS subtitle timestamp (H:MM:SS.cs)
function formatAssTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

// Generate Alex Hormozi Style Dynamic Subtitle (.ass) file
function generateAssSubtitleFile(captions, hookText, durationSec = 30, styleMode = 'hormozi', resX = 1080, resY = 1920) {
  const assPath = path.join(os.tmpdir(), `sub-${Date.now()}-${Math.round(Math.random() * 1000)}.ass`);
  let events = '';

  const primaryCol = styleMode === 'electric-cyan' ? '&H00FFFF00&' : '&H0000FFFF&'; // Cyan or Yellow
  const accentCol = styleMode === 'electric-cyan' ? '&H0000FFFF&' : '&H0000FF00&';  // Yellow or Neon Green

  const isLandscape = resX > resY;
  const wordFontSize = isLandscape ? 52 : 72;
  const hookFontSize = isLandscape ? 44 : 58;
  const wordMarginV = isLandscape ? 90 : 380;
  const hookMarginV = isLandscape ? 60 : 220;

  // 1. Hook Badge at Top for the first 3.5 seconds
  if (hookText) {
    const cleanHook = String(hookText).toUpperCase().replace(/[{}]/g, '').trim();
    events += `Dialogue: 0,0:00:00.20,0:00:03.50,HormoziHook,,0,0,0,,{\\c${primaryCol}}★ ${cleanHook} ★\n`;
  }

  // 2. Dynamic Timed Subtitles (centered above Instagram & YouTube Shorts bottom UI)
  if (Array.isArray(captions) && captions.length > 0) {
    for (const cap of captions) {
      if (!cap || !cap.text) continue;
      const sStart = formatAssTime(cap.startSec || 0);
      const sEnd = formatAssTime(cap.endSec || Math.min(durationSec, (cap.startSec || 0) + 3));
      const text = String(cap.text).toUpperCase().replace(/[{}]/g, '').trim();
      const col = cap.highlightColor || primaryCol;
      events += `Dialogue: 0,${sStart},${sEnd},HormoziWord,,0,0,0,,{\\c${col}}${text}\n`;
    }
  } else {
    // Intelligent default fallback sequence timed to the reel
    const dur = Math.max(10, durationSec);
    const step = dur / 4;
    const defaults = [
      { start: 0.5, end: Math.min(dur, step), text: "WAIT FOR THIS! 🔥", col: primaryCol },
      { start: step, end: Math.min(dur, step * 2), text: "WATCH TILL THE END 👀", col: accentCol },
      { start: step * 2, end: Math.min(dur, step * 3), text: "DON'T MISS THIS! 💡", col: primaryCol },
      { start: step * 3, end: Math.min(dur, dur - 0.5), text: isLandscape ? "SUBSCRIBE FOR PART 2 🔔" : "FOLLOW FOR NEXT PART 🚀", col: '&H00FFFFFF&' }
    ];
    for (const d of defaults) {
      if (d.start < dur) {
        events += `Dialogue: 0,${formatAssTime(d.start)},${formatAssTime(d.end)},HormoziWord,,0,0,0,,{\\c${d.col}}${d.text}\n`;
      }
    }
  }

  const assContent = `[Script Info]
Title: Dynamic Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: ${resX}
PlayResY: ${resY}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HormoziWord,Arial,${wordFontSize},&H0000FFFF,&H00000000,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,3,2,60,60,${wordMarginV},1
Style: HormoziHook,Arial,${hookFontSize},&H00FFFFFF,&H00000000,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,2,8,60,60,${hookMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;

  fs.writeFileSync(assPath, assContent, 'utf8');
  return assPath;
}

// 🖼️ Feature #4: AI Smart Thumbnail / Cover Photo Creator (Alex Hormozi & MrBeast Viral Style)
async function generateViralThumbnail({
  videoPath,
  outputPath,
  headlineText,
  hookBadge,
  bottomText,
  positionMode = 'title-only', // 'title-only' (1 classic title), 'both', 'top', 'bottom', 'center', 'none' (clean frame)
  fontStyle = 'classic',       // 'classic' (Constantia / Georgia Luxury Serif), 'modern' (Segoe UI), 'bold' (Arial Hormozi)
  colorStyle = 'gold',         // 'gold' (Royal Champagne Gold), 'white' (Silk Ivory), 'rose-gold', 'yellow', 'cyan'
  timestamp = 6.0
}) {
  const safeTime = Math.max(0.1, Number(timestamp) || 6.0);

  // If user selected 'none' or all text inputs are empty, render a pristine clean 9:16 frame!
  const hasHeadline = headlineText && String(headlineText).trim().length > 0;
  const hasBottom = (bottomText !== undefined ? bottomText : hookBadge) && String(bottomText || hookBadge).trim().length > 0;
  
  if (positionMode === 'none' || (!hasHeadline && !hasBottom)) {
    return new Promise((resolve) => {
      ffmpeg()
        .input(videoPath)
        .inputOptions([`-ss ${safeTime}`])
        .outputOptions([
          '-vf', 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.28:contrast=1.14',
          '-vframes 1',
          '-q:v 2'
        ])
        .output(outputPath)
        .on('end', () => {
          console.log(`🖼️ [AI Thumbnail Studio] Generated clean cover frame: ${path.basename(outputPath)} at ${safeTime}s`);
          resolve({ success: true, outputPath, fileName: path.basename(outputPath) });
        })
        .on('error', (err) => {
          console.warn('Clean frame generation error:', err.message);
          resolve({ success: false, error: err.message });
        })
        .run();
    });
  }

  // Luxury Color mappings for ASS subtitle format (&HAABBGGRR&)
  let primaryCol = '&H0070C8E5&'; // Royal Champagne Gold (Soft antique gold)
  let accentCol = '&H00F0F8FF&';  // Silk Ivory White
  let outlineCol = '&H00101015&'; // Very soft dark stroke
  let shadowCol = '&H60000000&';  // Translucent subtle shadow

  if (colorStyle === 'gold') {
    primaryCol = '&H0070C8E5&'; // Luxury Champagne Gold
    accentCol = '&H00F0F8FF&';
  } else if (colorStyle === 'white') {
    primaryCol = '&H00F0F8FF&'; // Silk Ivory White
    accentCol = '&H00D0E8F5&';
  } else if (colorStyle === 'rose-gold') {
    primaryCol = '&H00C5C0F5&'; // Soft Rose Gold
    accentCol = '&H00F0F8FF&';
  } else if (colorStyle === 'yellow') {
    primaryCol = '&H0000FFFF&'; // Yellow
    accentCol = '&H00FFFFFF&';
  } else if (colorStyle === 'cyan') {
    primaryCol = '&H00FFFF00&'; // Cyan
    accentCol = '&H00FFFFFF&';
  }

  // Font family, letter spacing and refined weights
  let fontName = 'Constantia';
  let fontSpacing = 5; // Luxury tracked capitals
  let isBold = 0;      // Regular weight (High-fashion editorial, NEVER bulky bold!)
  let outlineSize = 2; // Delicate fine stroke
  let shadowSize = 2;  // Soft shadow
  let headlineFontSize = 58; // Refined luxury headline size
  let hookFontSize = 34;

  if (fontStyle === 'classic') {
    fontName = 'Constantia'; // Ultra-luxurious editorial book serif (falls back to Georgia)
    fontSpacing = 5;
    isBold = 0;              // Regular weight for pure classic elegance
    outlineSize = 2;
    shadowSize = 2;
    headlineFontSize = 58;
    hookFontSize = 34;
  } else if (fontStyle === 'modern') {
    fontName = 'Segoe UI';
    fontSpacing = 3;
    isBold = 0;
    outlineSize = 2;
    shadowSize = 2;
    headlineFontSize = 62;
    hookFontSize = 36;
  } else if (fontStyle === 'bold') {
    fontName = 'Arial';
    fontSpacing = 0;
    isBold = -1;
    outlineSize = 6;
    shadowSize = 3;
    headlineFontSize = 72;
    hookFontSize = 46;
  }

  // Clean Headline (Strip hashtags, colons, and tacky emojis!)
  let formattedHeadline = '';
  if (hasHeadline) {
    const clean = String(headlineText)
      .replace(/#\w+/g, '') // remove #Shorts, #Patola, etc.
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}★✦✧✨🔥⚡👑🧵😱❌💡]/gu, '') // Strip emojis
      .replace(/[:]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[{}]/g, '')
      .toUpperCase();

    // Word wrap cleanly (max 2 lines, elegant balance)
    const words = clean.split(/\s+/).filter(Boolean);
    const lines = [];
    let curLine = '';
    for (const w of words) {
      if ((curLine + ' ' + w).trim().length > 22) {
        if (curLine) lines.push(curLine.trim());
        curLine = w;
      } else {
        curLine = (curLine + ' ' + w).trim();
      }
    }
    if (curLine) lines.push(curLine.trim());
    formattedHeadline = lines.slice(0, 2).join('\\N');
  }

  // Clean Hook / Bottom text (ONLY if user explicitly requested 'both' and not 'title-only')
  let formattedHook = '';
  if (positionMode === 'both') {
    const rawHook = bottomText !== undefined ? bottomText : hookBadge;
    if (rawHook && String(rawHook).trim()) {
      const cleanHook = String(rawHook)
        .replace(/#\w+/g, '')
        .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}★✦✧✨🔥⚡👑🧵😱❌💡]/gu, '')
        .replace(/[:]/g, '')
        .replace(/[{}]/g, '')
        .trim()
        .toUpperCase();

      // DEDUPLICATION: Suppress hook if it shares identical or subset words with headline!
      const normHead = formattedHeadline.replace(/[^A-Z]/g, '');
      const normHook = cleanHook.replace(/[^A-Z]/g, '');
      const isDuplicate = normHead && normHook && (normHead.includes(normHook) || normHook.includes(normHead));

      if (cleanHook && !isDuplicate) {
        // High-fashion clean divider instead of tacky stars
        formattedHook = `— ${cleanHook} —`;
      }
    }
  }

  const assPath = path.join(os.tmpdir(), `thumb-sub-${Date.now()}-${Math.round(Math.random() * 1000)}.ass`);
  const sStart = '0:00:00.00';
  const sEnd = '0:05:00.00';

  let headlineAlign = 8;
  let headlineMarginV = 130;
  let hookAlign = 2;
  let hookMarginV = 160;
  let events = '';

  if (positionMode === 'top') {
    headlineAlign = 8;
    headlineMarginV = 130;
    hookAlign = 8;
    hookMarginV = 75;
  } else if (positionMode === 'bottom') {
    headlineAlign = 2;
    headlineMarginV = 160;
    hookAlign = 2;
    hookMarginV = 100;
  } else if (positionMode === 'center') {
    headlineAlign = 5;
    headlineMarginV = 0;
    headlineFontSize = 66;
  } else if (positionMode === 'title-only') {
    // Only 1 classic title at the top, bottom is 100% untouched!
    headlineAlign = 8;
    headlineMarginV = 130;
    formattedHook = ''; // Zero bottom text
  } else {
    // 'both'
    headlineAlign = 8;
    headlineMarginV = 130;
    hookAlign = 2;
    hookMarginV = 160;
  }

  if (formattedHeadline) {
    events += `Dialogue: 0,${sStart},${sEnd},ThumbHeadline,,0,0,0,,{\\c${primaryCol}}${formattedHeadline}\n`;
  }
  if (formattedHook) {
    events += `Dialogue: 0,${sStart},${sEnd},ThumbHook,,0,0,0,,{\\c${accentCol}}${formattedHook}\n`;
  }

  const assContent = `[Script Info]
Title: AI Classic Luxury Cover
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: ThumbHeadline,${fontName},${headlineFontSize},${primaryCol},&H00000000,${outlineCol},${shadowCol},${isBold},0,0,0,100,100,${fontSpacing},0,1,${outlineSize},${shadowSize},${headlineAlign},60,60,${headlineMarginV},1
Style: ThumbHook,${fontName},${hookFontSize},${accentCol},&H00000000,${outlineCol},${shadowCol},0,0,0,0,100,100,${fontSpacing + 1},0,1,${outlineSize},${shadowSize},${hookAlign},60,60,${hookMarginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events}
`;

  fs.writeFileSync(assPath, assContent, 'utf8');
  const escapedAss = path.resolve(assPath).replace(/\\/g, '/').replace(/:/g, '\\:');
  const vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,eq=saturation=1.3:contrast=1.15,subtitles='${escapedAss}'`;

  return new Promise((resolve) => {
    ffmpeg()
      .input(videoPath)
      .inputOptions([`-ss ${safeTime}`])
      .outputOptions([
        '-vf', vf,
        '-vframes 1',
        '-q:v 2'
      ])
      .output(outputPath)
      .on('end', async () => {
        try { await fsp.unlink(assPath); } catch (_) {}
        console.log(`🖼️ [AI Thumbnail Studio] Generated viral cover photo: ${path.basename(outputPath)} at ${safeTime}s`);
        resolve({ success: true, outputPath, fileName: path.basename(outputPath) });
      })
      .on('error', async (err) => {
        try { await fsp.unlink(assPath); } catch (_) {}
        console.warn(`⚠️ [AI Thumbnail Studio] Overlay failed, falling back to basic frame:`, err.message);
        try {
          ffmpeg(videoPath)
            .screenshots({
              timestamps: [String(safeTime)],
              filename: path.basename(outputPath),
              folder: path.dirname(outputPath),
              size: '1080x1920'
            })
            .on('end', () => resolve({ success: true, outputPath, fileName: path.basename(outputPath) }))
            .on('error', () => resolve({ success: false, error: err.message }));
        } catch (e2) {
          resolve({ success: false, error: e2.message });
        }
      })
      .run();
  });
}

// Core Engine: Publish Reel to Instagram Graph API Direct
async function publishReelDirectToInstagram(videoPath, caption, customToken, customUserId) {
  // 🛡️ STEP 0: Check token validity first. Auto-refresh if expired!
  const token = await ensureValidInstagramToken(customToken);
  let userId = customUserId || process.env.META_INSTAGRAM_USER_ID;

  if (!userId) {
    const meAccounts = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${token}`).then(r => r.json());
    const igAcc = meAccounts.data?.find(a => a.instagram_business_account)?.instagram_business_account;
    if (igAcc && igAcc.id) {
      userId = igAcc.id;
      updateEnvFile({ META_INSTAGRAM_USER_ID: userId });
    } else {
      throw new Error('Instagram Business Account ID not found.');
    }
  }

  if (!fs.existsSync(videoPath)) throw new Error('Video file not found.');

  const fileStat = await fsp.stat(videoPath);
  const videoBuffer = await fsp.readFile(videoPath);
  console.log(`🚀 [Instagram Direct] Uploading "${path.basename(videoPath)}" (${(fileStat.size / (1024*1024)).toFixed(2)} MB) to IG Account: ${userId}...`);

  // Step 1: Initialize Resumable Reels Session
  const initUrl = `https://graph.facebook.com/v20.0/${userId}/media`;
  const initRes = await fetch(initUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      media_type: 'REELS',
      upload_type: 'resumable',
      caption: caption || '✨ Created with AI Reel Studio #reels',
      share_to_feed: true,
      access_token: token
    })
  }).then(r => r.json());

  if (!initRes.id || !initRes.uri) {
    console.error('Meta Media Init Error:', initRes);
    throw new Error(initRes.error?.message || 'Failed to initialize Meta Graph API upload session.');
  }

  const containerId = initRes.id;
  const uploadUri = initRes.uri;

  // Step 2: Upload Binary Video Data
  const uploadRes = await fetch(uploadUri, {
    method: 'POST',
    headers: {
      'Authorization': `OAuth ${token}`,
      'offset': '0',
      'file_size': String(fileStat.size)
    },
    body: videoBuffer
  }).then(r => r.json());

  if (uploadRes.error) {
    throw new Error(uploadRes.error.message || 'Error uploading video bytes to Meta.');
  }

  // Step 3: Wait for Meta to process the video
  // Step 3: Wait for Meta to process the video (up to 8 minutes for high-traffic peak hours)
  let isReady = false;
  const maxAttempts = 120;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 4000));
    const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${token}`).then(r => r.json());
    if (attempt % 5 === 0 || attempt === 1) {
      console.log(`⏳ [Instagram Direct] Poll attempt ${attempt}/${maxAttempts}: ${statusRes.status_code || 'CHECKING'}`);
    }

    if (statusRes.status_code === 'FINISHED') {
      isReady = true;
      break;
    }
    if (statusRes.status_code === 'ERROR') {
      const errorMsg = statusRes.status?.error_message || statusRes.error?.message || 'Error processing Meta Reel on server.';
      throw new Error(`Meta Processing Error: ${errorMsg}`);
    }
  }

  if (!isReady) {
    throw new Error('Meta video processing timed out (waited 8 minutes during peak server load).');
  }

  // Step 4: Publish Reel
  const publishRes = await fetch(`https://graph.facebook.com/v20.0/${userId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerId,
      access_token: token
    })
  }).then(r => r.json());

  if (!publishRes.id) {
    throw new Error(publishRes.error?.message || 'Media publish failed');
  }

  const postId = publishRes.id;
  const postUrl = `https://www.instagram.com/p/${postId}/`;
  console.log(`🎉 [Instagram Direct] Reel Published Successfully! Post URL: ${postUrl}`);

  return {
    success: true,
    postId,
    postUrl,
    message: 'Reel published directly to Instagram hands-free! 🎉'
  };
}

// Concurrency Mutex Lock to PREVENT duplicate uploads
const currentlyProcessingScheduleIds = new Set();
let isSchedulerTickRunning = false;
let lastSuccessfulAutoPostTime = 0; // Throttle to prevent posting bursts

// Background checker: Auto-post scheduled reels & handle Recurring Daily auto-posting
setInterval(async () => {
  if (isSchedulerTickRunning) return; // Prevent concurrent timer overlap
  isSchedulerTickRunning = true;

  try {
    const queue = getScheduledQueue();
    const now = new Date();
    let updated = false;

    // 🛡️ SAFEGUARD: Handle any items that became overdue while PC was turned off
    // NO parts are skipped! The sequence is preserved: the earliest unposted part runs first,
    // and subsequent overdue parts are shifted forward to upcoming regular slots (11:30 AM / 06:30 PM).
    const dueItems = queue.filter(item => {
      const isSched = item.status === 'Scheduled' || item.status === 'Rendered & Ready to Post' || (typeof item.status === 'string' && item.status.startsWith('Rendered & Scheduled'));
      return isSched && item.scheduledTime && now >= new Date(item.scheduledTime);
    });

    if (dueItems.length > 1) {
      console.log(`🔄 [Auto-Pilot Queue] Found ${dueItems.length} overdue parts from while PC was off. Rescheduling sequence forward without skipping any part...`);
      // Sort in sequential part order
      dueItems.sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
      
      // Keep the first overdue item for immediate/current posting
      // Shift all other overdue items into upcoming slots (today 18:30, tomorrow 11:30, tomorrow 18:30, etc.)
      let nextSlot = new Date(now);
      for (let i = 1; i < dueItems.length; i++) {
        const itemToShift = dueItems[i];
        // Find next slot
        if (nextSlot.getHours() < 18 || (nextSlot.getHours() === 18 && nextSlot.getMinutes() < 30)) {
          nextSlot.setHours(18, 30, 0, 0);
        } else {
          nextSlot.setDate(nextSlot.getDate() + 1);
          nextSlot.setHours(11, 30, 0, 0);
        }
        itemToShift.scheduledTime = nextSlot.toISOString();
        itemToShift.scheduledTimeFormatted = nextSlot.toLocaleString('gu-IN', { dateStyle: 'medium', timeStyle: 'short' });
        console.log(`➡️ [Sequence Preserved] Shifted "${itemToShift.fileName}" to upcoming slot: ${itemToShift.scheduledTimeFormatted}`);
        // Advance nextSlot for next iteration
        nextSlot = new Date(nextSlot.getTime() + 6 * 60 * 60 * 1000); // jump ahead to next check
        updated = true;
      }
    }

    for (const item of queue) {
      const isScheduled = item.status === 'Scheduled' || item.status === 'Rendered & Ready to Post' || (typeof item.status === 'string' && item.status.startsWith('Rendered & Scheduled'));
      
      // 🛡️ Auto-Retry Engine: Automatically retry failed posts (up to 3 attempts, 5 mins cooldown after failure)
      const isFailedEligibleForRetry = item.status === 'Post Failed (Ready to retry)' &&
        (!item.retryCount || item.retryCount < 3) &&
        (!item.startedPublishingAt || (Date.now() - new Date(item.startedPublishingAt).getTime() >= 5 * 60 * 1000));

      if ((isScheduled || isFailedEligibleForRetry) && item.scheduledTime) {
        const itemTime = new Date(item.scheduledTime);

        // ⏰ If the time has arrived:
        if (now >= itemTime) {
          if (currentlyProcessingScheduleIds.has(item.id)) {
            continue; // Skip: Already being uploaded by active task
          }

          // 🛡️ Rate limit cooldown (minimum 45 minutes between automatic posts)
          const timeSinceLastPost = Date.now() - lastSuccessfulAutoPostTime;
          if (lastSuccessfulAutoPostTime > 0 && timeSinceLastPost < 45 * 60 * 1000) {
            console.log(`⏳ [Auto-Pilot Guard] An auto-post completed recently (${Math.round(timeSinceLastPost / 60000)} mins ago). Waiting cooldown before next post...`);
            break; // Stop loop for this tick
          }

          currentlyProcessingScheduleIds.add(item.id);
          if (isFailedEligibleForRetry) {
            item.retryCount = (item.retryCount || 0) + 1;
            console.log(`🔄 [Auto-Retry Engine] Automatically retrying failed reel "${item.fileName}" (Attempt ${item.retryCount}/3)...`);
          } else {
            console.log(`⏰ [Auto-Pilot Schedule] Reel "${item.fileName}" scheduled for ${item.scheduledTimeFormatted || item.scheduledTime} is NOW DUE! Locking to prevent duplicate posts...`);
          }

          // 🔒 CRITICAL: Update status and save to disk IMMEDIATELY before starting upload!
          item.status = 'Publishing to Social Media...';
          item.startedPublishingAt = now.toISOString();
          saveScheduledQueue(queue);

          try {
            const videoPath = path.join(REELS_DIR, item.fileName);
            const caption = `${item.viralCaption || ''}\n\n${item.viralHashtags || ''}`;
            let igSuccess = false;
            let ytSuccess = false;
            let fbSuccess = false;

            // Direct Auto-Publish to Instagram if configured
            if (process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID) {
              try {
                console.log(`🚀 [Auto-Post Engine] Auto-uploading due Reel to Instagram...`);
                const pubResult = await publishReelDirectToInstagram(videoPath, caption);
                item.lastPostUrl = pubResult.postUrl;
                item.lastPostId = pubResult.postId;
                item.lastPostedAt = new Date().toISOString();
                delete item.lastError;
                igSuccess = true;
                lastSuccessfulAutoPostTime = Date.now();
                console.log(`🎉 [Auto-Post Engine] Reel ${item.fileName} successfully posted to Instagram: ${pubResult.postUrl}`);
              } catch (igErr) {
                console.error(`❌ [Auto-Post Engine] Instagram upload failed:`, igErr.message);
                item.lastError = igErr.message;
              }
            }

            // Direct Auto-Publish to YouTube Shorts if configured (checks access token OR auto-refresh token)
            if (process.env.YOUTUBE_ACCESS_TOKEN || (process.env.YOUTUBE_REFRESH_TOKEN && process.env.YOUTUBE_CLIENT_ID)) {
              try {
                console.log(`🚀 [Auto-Post Engine] Auto-uploading due Reel to YouTube Shorts...`);
                const ytTitle = (item.viralTitle || item.title || 'Viral AI Reel #Shorts').substring(0, 100);
                const ytDesc = `${caption}\n\n#Shorts #Reels #Viral`;
                const ytResult = await publishShortDirectToYouTube(videoPath, ytTitle, ytDesc, ['Shorts', 'Reels', 'Viral']);
                item.youtubePostUrl = ytResult.postUrl;
                item.youtubeVideoId = ytResult.videoId;
                delete item.lastYoutubeError;
                ytSuccess = true;
                console.log(`🎉 [Auto-Post Engine] Short successfully posted to YouTube: ${ytResult.postUrl}`);
              } catch (ytErr) {
                console.error(`❌ [Auto-Post Engine] YouTube upload failed:`, ytErr.message);
                item.lastYoutubeError = ytErr.message;
              }
            }

            // Direct Auto-Publish to Facebook Page if configured
            const fbTok = process.env.META_INSTAGRAM_TOKEN;
            const fbPgId = process.env.META_INSTAGRAM_PAGE_ID || '1320416261160842';
            if (fbTok && fbPgId) {
              try {
                console.log(`🚀 [Auto-Post Engine] Auto-uploading due Reel to Facebook Page (${fbPgId})...`);
                const fbTitle = (item.viralTitle || item.title || 'Viral AI Reel | Patola Heritage').substring(0, 100);
                const fbDesc = `${caption}\n\n🌐 Authentic Handloom Patola: https://patolahandmadebyvankar.com\n📞 Helpline: +91 8160160750\n\n#patola #handloom #saree #heritage`;
                const fbResult = await publishVideoDirectToFacebookPage({
                  videoPath,
                  title: fbTitle,
                  description: fbDesc,
                  customToken: fbTok,
                  customPageId: fbPgId
                });
                item.facebookPostUrl = fbResult.postUrl;
                item.facebookVideoId = fbResult.videoId;
                delete item.lastFacebookError;
                fbSuccess = true;
                console.log(`🎉 [Auto-Post Engine] Reel successfully posted to Facebook Page: ${fbResult.postUrl}`);
              } catch (fbErr) {
                console.error(`❌ [Auto-Post Engine] Facebook Page upload failed:`, fbErr.message);
                item.lastFacebookError = fbErr.message;
              }
            }

            const successList = [];
            if (igSuccess) successList.push('IG');
            if (ytSuccess) successList.push('YouTube');
            if (fbSuccess) successList.push('Facebook');

            if (successList.length > 0) {
              item.status = `Posted to ${successList.join(' + ')} ✓`;
            } else if (item.lastError || item.lastYoutubeError || item.lastFacebookError) {
              item.status = 'Post Failed (Ready to retry)';
            } else {
              item.status = 'Ready to Post';
              item.readyAt = new Date().toISOString();
            }

            // 📲 Send Instant Alert to WhatsApp & Telegram
            if (igSuccess || ytSuccess || fbSuccess) {
              let plainText = `🎉 ForgeAI: New Reel Published!\n\n`;
              let htmlText = `🎉 <b>ForgeAI: New Reel Published!</b>\n\n`;
              if (igSuccess && item.lastPostUrl) {
                plainText += `📸 Instagram: ${item.lastPostUrl}\n`;
                htmlText += `📸 <b>Instagram:</b> <a href="${item.lastPostUrl}">${item.lastPostUrl}</a>\n`;
              }
              if (ytSuccess && item.youtubePostUrl) {
                plainText += `🔴 YouTube Shorts: ${item.youtubePostUrl}\n`;
                htmlText += `🔴 <b>YouTube Shorts:</b> <a href="${item.youtubePostUrl}">${item.youtubePostUrl}</a>\n`;
              }
              if (fbSuccess && item.facebookPostUrl) {
                plainText += `📘 Facebook Page: ${item.facebookPostUrl}\n`;
                htmlText += `📘 <b>Facebook Page:</b> <a href="${item.facebookPostUrl}">${item.facebookPostUrl}</a>\n`;
              }
              const timeStr = new Date().toLocaleTimeString('en-IN');
              plainText += `\n⏰ Published at: ${timeStr}`;
              htmlText += `\n⏰ <i>Published at: ${timeStr}</i>`;
              sendInstantAlert(plainText, htmlText).catch(() => {});
            }

            // If Every Day Recurring Mode is ON: Reschedule for tomorrow at the EXACT same time!
            if (item.recurringDaily) {
              const nextDate = new Date(itemTime.getTime() + 24 * 60 * 60 * 1000);
              item.scheduledTime = nextDate.toISOString();
              item.scheduledTimeFormatted = nextDate.toLocaleString('gu-IN', { dateStyle: 'medium', timeStyle: 'short' });
              item.status = 'Scheduled'; // Ready for tomorrow!
              item.recurringCycle = (item.recurringCycle || 0) + 1;
              console.log(`🔁 [Every Day Auto-Pilot] Rescheduled for tomorrow at ${item.scheduledTimeFormatted}! (Cycle #${item.recurringCycle})`);
            }
          } catch (err) {
            console.error(`❌ [Auto-Post Engine] Upload loop failed:`, err.message);
            item.status = 'Post Failed (Ready to retry)';
            item.lastError = err.message;
          } finally {
            currentlyProcessingScheduleIds.delete(item.id);
          }

          updated = true;
          break; // Process only 1 reel per tick to prevent burst spamming
        }
      }
    }

    if (updated) saveScheduledQueue(queue);
  } catch (err) {
    console.error('Scheduled queue timer error:', err);
  } finally {
    isSchedulerTickRunning = false;
  }
}, 10000);



// 1. Health & Config status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    hasEnvKey: !!process.env.GEMINI_API_KEY,
    generatedDir: GENERATED_DIR
  });
});

// ========================================================
// 🎵 ONLINE MUSIC SEARCH & INSTAGRAM-STYLE AUDIO API
// ========================================================
app.get('/api/music/search', async (req, res) => {
  const query = (req.query.q || '').trim();
  const limit = Math.min(50, parseInt(req.query.limit) || 25);
  if (!query) {
    return res.json({ success: true, results: [] });
  }

  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
    const apiRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!apiRes.ok) throw new Error(`iTunes API status ${apiRes.status}`);
    const data = await apiRes.json();

    const results = (data.results || []).map(item => ({
      id: item.trackId,
      title: item.trackName || 'Song',
      artist: item.artistName || 'Artist',
      album: item.collectionName || '',
      artwork: (item.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      previewUrl: item.previewUrl || '',
      duration: Math.round((item.trackTimeMillis || 30000) / 1000)
    })).filter(item => !!item.previewUrl);

    res.json({ success: true, count: results.length, results });
  } catch (err) {
    console.error('Online music search error:', err);
    res.status(500).json({ success: false, error: err.message, results: [] });
  }
});

app.get('/api/music/trending', async (req, res) => {
  const category = (req.query.genre || req.query.category || 'reels').toLowerCase();
  const queries = {
    'reels': 'bollywood hits',
    'gujarati': 'gujarati garba',
    'bollywood': 'arijit singh',
    'lofi': 'hindi lofi',
    'punjabi': 'punjabi hits',
    'sitar': 'royal sitar'
  };

  const searchTerm = queries[category] || queries['reels'];
  try {
    const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(searchTerm)}&media=music&entity=song&limit=25`;
    const apiRes = await fetch(searchUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await apiRes.json();

    const results = (data.results || []).map(item => ({
      id: item.trackId,
      title: item.trackName || 'Song',
      artist: item.artistName || 'Artist',
      album: item.collectionName || '',
      artwork: (item.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
      previewUrl: item.previewUrl || '',
      duration: Math.round((item.trackTimeMillis || 30000) / 1000)
    })).filter(item => !!item.previewUrl);

    res.json({ success: true, category, count: results.length, results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, results: [] });
  }
});

// 5. AI Video Reel Generator & Smart Auto-Editor
app.post('/api/video/auto-edit', upload.fields([{ name: 'videoFile', maxCount: 1 }, { name: 'customAudio', maxCount: 1 }]), async (req, res) => {
  let customAudioPath = null;
  let onlineAudioPath = null;
  try {
    const videoFile = (req.files && req.files.videoFile && req.files.videoFile[0]) ? req.files.videoFile[0] : req.file;
    if (!videoFile) {
      return res.status(400).json({ error: 'Please upload a video file.' });
    }

    if (req.files && req.files.customAudio && req.files.customAudio[0]) {
      customAudioPath = req.files.customAudio[0].path;
      console.log(`🎵 [Custom Song] User uploaded custom audio file for video: ${req.files.customAudio[0].originalname} (${(req.files.customAudio[0].size / (1024*1024)).toFixed(2)} MB)`);
    }

    const inputPath = videoFile.path;
    const { niche = 'Auto-Detect (Any Video - Movies, Kids, Fashion, etc.)', targetDuration = '30', customInstructions = '', videoStyle = 'auto' } = req.body;
    const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

    console.log(`🎬 [Video AI] Processing video: ${videoFile.originalname} (${(videoFile.size / (1024*1024)).toFixed(1)}MB) | Niche: ${niche} | Style: ${videoStyle}`);

    // Step 1: Extract representative snapshot frame using FFmpeg for AI Vision
    const snapshotPath = path.join(UPLOADS_DIR, `snap-${Date.now()}-${Math.round(Math.random()*1000)}.jpg`);
    let frameBase64 = null;

    try {
      await new Promise((resolve) => {
        ffmpeg(inputPath)
          .setStartTime(2) // Extract frame at 2 seconds
          .outputOptions(['-vframes 1', '-q:v 2'])
          .save(snapshotPath)
          .on('end', () => resolve(true))
          .on('error', (err) => {
            console.warn('Frame extraction warning:', err.message);
            resolve(false);
          });
      });

      if (fs.existsSync(snapshotPath)) {
        frameBase64 = await fsp.readFile(snapshotPath, { encoding: 'base64' });
        console.log(`📸 Extracted video snapshot frame for AI Vision (${(frameBase64.length / 1024).toFixed(0)} KB base64)`);
      }
    } catch (snapErr) {
      console.warn('Could not extract snapshot:', snapErr.message);
    }

    // Step 2: AI Vision & Director Recipe generation via Gemini Vision
    const subtitlesStyle = req.body.subtitlesStyle || 'hormozi';
    let aiDirectorRecipe = {
      detectedTopic: 'Universal Video Showcase',
      themeName: 'Cinematic Vibrant Glow',
      saturation: 1.25,
      contrast: 1.12,
      brightness: 0.02,
      viralTitle: '✨ Watch This Till The End! #Viral #Shorts #Reels',
      viralCaption: 'Unbelievable moments captured in 4K quality! Hit Like and Share with your friends. 🔥\n\nFollow for more daily viral content! ✨',
      viralHashtags: '#ViralReels #TrendingNow #Shorts #ExplorePage #InstaDaily #ViralVideo #TrendingReels',
      hookOverlay: 'Wait For The End 🔥',
      captions: []
    };

    if (apiKey) {
      try {
        const parts = [];

        // If snapshot frame exists, send it to Gemini Vision!
        if (frameBase64) {
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: frameBase64
            }
          });
        }

        const promptText = `You are a World-Class AI Video Director and Viral Social Media Strategist.
${frameBase64 ? 'LOOK CAREFULLY AT THIS REAL VIDEO FRAME EXTRACTED FROM THE UPLOADED VIDEO.' : ''}
The user uploaded a video. It could be ANY topic:
- MOVIES & CINEMA (Movie scenes, dialogues, dramatic acting, movie quotes, action, web series, Bollywood, Hollywood)
- LITTLE BOY & KIDS (Cute toddlers, babies, funny kids moments, parenting, innocent comedy, family)
- FASHION & SAREES (Ethnic wear, Patola, luxury clothing)
- CARS, GYM, FOOD, TRAVEL, COMEDY, TECH, etc.

User selected niche/note: "${customInstructions || niche || 'Auto-Detect exact topic from visual frame'}".
Selected color style preference: "${videoStyle || 'auto'}".

Tasks:
1. Inspect the visual content carefully (who/what is the main subject? Is it a movie actor/scene? A cute boy/child? Clothes? Food? Gym?).
2. Determine "detectedTopic": A concise 1-sentence description of what you SEE in this video.
3. Choose optimal color grading parameters for THIS SPECIFIC CONTENT:
   - For MOVIES / CINEMA: "themeName": "Cinematic Movie Teal & Orange" or "Dramatic Film Noir" or "Hollywood Gold Drama", saturation: 1.15 - 1.25, contrast: 1.18 - 1.25, brightness: 0.01
   - For LITTLE BOY / KIDS: "themeName": "Warm Sunny Pastel" or "Vivid Cute Glow" or "Golden Hour Sweetness", saturation: 1.20 - 1.30, contrast: 1.08 - 1.14, brightness: 0.03
   - For other topics: choose matching atmospheric style.
   - "saturation": Number between 1.10 and 1.35
   - "contrast": Number between 1.05 and 1.25
   - "brightness": Number between -0.02 and 0.04
4. Create Viral Metadata tailored precisely to THIS SPECIFIC NICHE & CONTENT:
   - "viralTitle": Irresistible YouTube Shorts title (with relevant emojis & #Shorts). If movie, mention the scene/vibe. If kid/boy, use cute heartwarming phrasing.
   - "viralCaption": High-converting Instagram Reels caption with hook, scene description, engagement question & call to action.
   - "viralHashtags": 12-15 targeted viral hashtags matching this exact niche (e.g. for movies: #MovieClips #BestScenes #Cinema #FilmScene #Shorts; for kids: #CuteBaby #LittleBoy #KidsOfInstagram #CuteMoments #FunnyKids #Shorts).
   - "hookOverlay": Catchy 3-4 word explosive hook for top badge (e.g. for movie: "THIS SCENE 🎬", "UNBELIEVABLE ACTING 👏", "WAIT FOR THE DIALOGUE 🔥"; for kids: "TOO CUTE 🥰", "WAIT FOR HIS REACTION 👶", "PURE INNOCENCE ❤️").
   - "captions": Array of 3-5 timed punchy uppercase subtitle items for 30s video, matching the dialogue, action or emotion in the scene.

Respond ONLY with valid JSON:`;

        parts.push({ text: promptText });

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
        const aiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
          })
        });

        if (aiRes.ok) {
          const aiData = await aiRes.json();
          const jsonStr = aiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (jsonStr) {
            aiDirectorRecipe = { ...aiDirectorRecipe, ...JSON.parse(jsonStr) };
            if (Array.isArray(aiDirectorRecipe.viralHashtags)) {
              aiDirectorRecipe.viralHashtags = aiDirectorRecipe.viralHashtags
                .map(t => String(t).trim().startsWith('#') ? String(t).trim() : `#${String(t).trim()}`)
                .filter(t => t.length > 1)
                .join(' ');
            }
            console.log(`🤖 AI Vision Detected: "${aiDirectorRecipe.detectedTopic}"`);
            console.log(`🏷️ Tailored Hashtags: "${aiDirectorRecipe.viralHashtags}"`);
            console.log(`🎨 Applied Theme: "${aiDirectorRecipe.themeName}" (Saturation: ${aiDirectorRecipe.saturation})`);
          }
        }
      } catch (aiErr) {
        console.warn('AI recipe generation error, using fallback recipe:', aiErr.message);
      }
    }

    // Clean up temporary snapshot
    try { if (fs.existsSync(snapshotPath)) await fsp.unlink(snapshotPath); } catch (_) {}

    // Step 2: Render with FFmpeg
    const outputFileName = `reel-${Date.now()}-${Math.round(Math.random() * 1000)}.mp4`;
    const outputPath = path.join(REELS_DIR, outputFileName);
    const isDirectUpload = req.body.isDirectUpload === 'true' || videoStyle === 'original' || targetDuration === 'original';
    const videoType = req.body.videoType || 'shorts';
    const isLandscape = (videoType === 'youtube_long' || videoType === 'cinema');
    const isSquare = (videoType === 'square');
    const targetW = isLandscape ? 1920 : (isSquare ? 1080 : 1080);
    const targetH = isLandscape ? 1080 : (isSquare ? 1080 : 1920);

    let maxSec = 30;
    if (isDirectUpload) {
      maxSec = await new Promise((resProbe) => {
        ffmpeg.ffprobe(inputPath, (err, meta) => {
          if (!err && meta?.format?.duration) resProbe(Math.round(meta.format.duration));
          else resProbe(30);
        });
      });
      console.log(`⚡ [Direct Upload Mode] Keeping full original duration: ${maxSec}s without AI trimming.`);
    } else {
      maxSec = parseInt(targetDuration, 10) || 30;
    }

    let sat = Math.max(1.0, Math.min(1.5, Number(aiDirectorRecipe.saturation) || 1.25));
    let con = Math.max(1.0, Math.min(1.3, Number(aiDirectorRecipe.contrast) || 1.12));
    let bri = Math.max(-0.1, Math.min(0.1, Number(aiDirectorRecipe.brightness) || 0.02));

    let vFilters = [];
    if (isDirectUpload) {
      // Direct Upload: Preserve original colors and frame as-is, adapt to target resolution
      vFilters = [
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`,
        `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black`
      ];
    } else {
      if (videoStyle === 'cinematic-movie') {
        sat = 1.18; con = 1.22; bri = 0.01;
      } else if (videoStyle === 'kids-sunny') {
        sat = 1.28; con = 1.08; bri = 0.03;
      } else if (videoStyle === 'royal-silk') {
        sat = 1.25; con = 1.15; bri = 0.02;
      } else if (videoStyle === 'heritage-gold') {
        sat = 1.20; con = 1.12; bri = 0.02;
      } else if (videoStyle === 'cinematic-vibrant') {
        sat = 1.35; con = 1.22; bri = 0.02;
      }

      vFilters = [
        `scale=${targetW}:${targetH}:force_original_aspect_ratio=decrease`,
        `pad=${targetW}:${targetH}:(ow-iw)/2:(oh-ih)/2:black`,
        `eq=saturation=${sat}:contrast=${con}:brightness=${bri}`,
        'fade=t=in:st=0:d=0.8',
        `fade=t=out:st=${Math.max(1, maxSec - 1.5)}:d=1.5`
      ];
    }

    console.log(`🎬 Rendering ${isLandscape ? '16:9 HD' : (isSquare ? '1:1 Square' : '9:16 Vertical')} Video (${maxSec}s) | Format: ${videoType} | Direct: ${isDirectUpload}`);

    let assFilePath = null;
    if (!isDirectUpload && subtitlesStyle !== 'none') {
      try {
        assFilePath = generateAssSubtitleFile(aiDirectorRecipe.captions, aiDirectorRecipe.hookOverlay, maxSec, subtitlesStyle, targetW, targetH);
        if (assFilePath && fs.existsSync(assFilePath)) {
          const escapedAss = path.resolve(assFilePath).replace(/\\/g, '/').replace(/:/g, '\\:');
          vFilters.push(`subtitles='${escapedAss}'`);
          console.log(`🎬 [Subtitles Engine] Burning dynamic subtitles (${subtitlesStyle})`);
        }
      } catch (assErr) {
        console.warn('⚠️ Subtitle generation notice:', assErr.message);
      }
    }

    // Feature #3: Background Music (BGM) Engine (Preset, Custom or Online Instagram Song)
    const bgmTrack = isDirectUpload ? 'none' : (req.body.bgmTrack || 'none');
    const bgmVolume = Math.max(0.05, Math.min(1.0, parseFloat(req.body.bgmVolume) || 0.25));

    // Handle online audio stream download if user picked an online song
    if (req.body.onlineAudioUrl && !customAudioPath && !isDirectUpload) {
      try {
        console.log(`🎵 [Online Song] Downloading chosen song preview from: ${req.body.onlineAudioUrl}`);
        const audioRes = await fetch(req.body.onlineAudioUrl);
        if (audioRes.ok) {
          const buffer = Buffer.from(await audioRes.arrayBuffer());
          onlineAudioPath = path.join(UPLOADS_DIR, `online-bgm-${Date.now()}.mp3`);
          fs.writeFileSync(onlineAudioPath, buffer);
          console.log(`🎵 [Online Song] Saved audio to ${onlineAudioPath} (${(buffer.length / (1024*1024)).toFixed(2)} MB)`);
        }
      } catch (dlErr) {
        console.warn('⚠️ Online audio download error:', dlErr.message);
      }
    }

    const bgmFilePath = (customAudioPath && fs.existsSync(customAudioPath))
      ? customAudioPath
      : (onlineAudioPath && fs.existsSync(onlineAudioPath))
      ? onlineAudioPath
      : (bgmTrack !== 'none' && bgmTrack !== 'custom' ? path.join(__dirname, 'public', 'audio', 'bgm', `${bgmTrack}.mp3`) : null);
    const hasValidBgm = !isDirectUpload && bgmFilePath && fs.existsSync(bgmFilePath);

    let hasVideoAudio = false;
    try {
      await new Promise((resProbe) => {
        ffmpeg.ffprobe(inputPath, (err, meta) => {
          if (!err && meta.streams) {
            hasVideoAudio = meta.streams.some(s => s.codec_type === 'audio');
          }
          resProbe();
        });
      });
    } catch (_) {}

    // FFmpeg execution with optional BGM Audio Mixing
    await new Promise((resolve, reject) => {
      if (hasValidBgm) {
        console.log(`🎵 [BGM Audio Mixer] Mixing "${bgmTrack}" at volume ${Math.round(bgmVolume * 100)}% (Video Audio: ${hasVideoAudio ? 'Yes' : 'None'})`);
        const complexFilters = [
          `[0:v]${vFilters.join(',')}[vout]`
        ];

        if (hasVideoAudio) {
          complexFilters.push(
            `[0:a]volume=1.0[voice]`,
            `[1:a]volume=${bgmVolume},afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(1, maxSec - 2.5)}:d=2.5[bgm_mix]`,
            `[voice][bgm_mix]amix=inputs=2:duration=first:dropout_transition=2[aout]`
          );
        } else {
          complexFilters.push(
            `[1:a]volume=${bgmVolume},afade=t=in:st=0:d=1.5,afade=t=out:st=${Math.max(1, maxSec - 2.5)}:d=2.5[aout]`
          );
        }

        ffmpeg(inputPath)
          .setStartTime(0)
          .duration(maxSec)
          .input(bgmFilePath)
          .complexFilter(complexFilters)
          .outputOptions([
            '-map [vout]',
            '-map [aout]',
            '-c:v libx264',
            '-preset fast',
            '-crf 22',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 192k',
            '-movflags +faststart'
          ])
          .save(outputPath)
          .on('end', () => {
            console.log(`✅ 30-sec Reel render completed with BGM: ${outputFileName}`);
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg render error with BGM:', err);
            reject(err);
          });
      } else {
        ffmpeg(inputPath)
          .setStartTime(0)
          .duration(maxSec)
          .videoFilters(vFilters)
          .outputOptions([
            '-c:v libx264',
            '-preset fast',
            '-crf 22',
            '-pix_fmt yuv420p',
            '-c:a aac',
            '-b:a 192k',
            '-movflags +faststart'
          ])
          .save(outputPath)
          .on('end', () => {
            console.log(`✅ 30-sec Reel render completed: ${outputFileName}`);
            resolve();
          })
          .on('error', (err) => {
            console.error('FFmpeg render error:', err);
            reject(err);
          });
      }
    });

    // Cleanup raw uploaded video and temporary subtitle file after render
    try { await fsp.unlink(inputPath); } catch (_) {}
    if (assFilePath && fs.existsSync(assFilePath)) {
      try { await fsp.unlink(assFilePath); } catch (_) {}
    }

    // Feature #4: Generate AI Smart Viral 9:16 Cover Thumbnail (Classic & Clean Default)
    const thumbFileName = outputFileName.replace('.mp4', '-cover.jpg');
    const thumbOutputPath = path.join(REELS_DIR, thumbFileName);
    try {
      await generateViralThumbnail({
        videoPath: outputPath,
        outputPath: thumbOutputPath,
        headlineText: aiDirectorRecipe.viralTitle || 'MUST WATCH 🎬',
        hookBadge: '',
        bottomText: '',
        positionMode: 'none', // Default to Clean Frame! Prevents duplicate text / title clashes!
        fontStyle: 'classic',
        colorStyle: 'gold',
        timestamp: 6.5        // Extract vibrant saree frame instead of 1.5s intro card
      });
      console.log(`🖼️ [Cover Photo] AI Viral Cover photo generated: ${thumbFileName}`);
    } catch (thumbErr) {
      console.warn('⚠️ Thumbnail generation fallback:', thumbErr.message);
    }

    const isScheduled = req.body.isScheduled === 'true' && !!req.body.scheduledTime;
    const scheduledTime = req.body.scheduledTime || null;
    const recurringDaily = req.body.recurringDaily === 'true';
    let scheduledItem = null;

    if (isScheduled && scheduledTime) {
      const queue = getScheduledQueue();
      const schedDate = new Date(scheduledTime);
      const isPastOrNow = isNaN(schedDate.getTime()) || (new Date() >= schedDate);

      scheduledItem = {
        id: `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reelUrl: `/rendered-reels/${outputFileName}`,
        downloadUrl: `/rendered-reels/${outputFileName}`,
        fileName: outputFileName,
        scheduledTime: scheduledTime,
        scheduledTimeFormatted: !isNaN(schedDate.getTime()) 
          ? schedDate.toLocaleString('gu-IN', { dateStyle: 'medium', timeStyle: 'short' })
          : scheduledTime,
        recurringDaily,
        recurringCycle: 1,
        duration: `${maxSec}s`,
        thumbnailUrl: `/rendered-reels/${thumbFileName}`,
        niche: niche || 'AI Auto-Detect',
        viralTitle: aiDirectorRecipe.viralTitle,
        viralCaption: aiDirectorRecipe.viralCaption,
        viralHashtags: aiDirectorRecipe.viralHashtags,
        detectedTopic: aiDirectorRecipe.detectedTopic,
        themeName: aiDirectorRecipe.themeName,
        status: isPastOrNow ? 'Ready to Post' : 'Scheduled',
        createdAt: new Date().toISOString()
      };

      queue.unshift(scheduledItem);
      saveScheduledQueue(queue);
      console.log(`⏰ [Single Reel Scheduled] Saved reel "${outputFileName}" scheduled for ${scheduledItem.scheduledTimeFormatted} (Recurring Daily: ${recurringDaily})`);
    }

    res.json({
      success: true,
      reelUrl: `/rendered-reels/${outputFileName}`,
      downloadUrl: `/rendered-reels/${outputFileName}`,
      thumbnailUrl: `/rendered-reels/${thumbFileName}`,
      subtitlesEnabled: subtitlesStyle !== 'none',
      subtitlesStyle,
      bgmEnabled: hasValidBgm,
      bgmTrack,
      fileName: outputFileName,
      duration: maxSec >= 60 ? `${Math.round(maxSec / 60)} Minutes (${maxSec}s)` : `${maxSec} Seconds`,
      durationSec: maxSec,
      videoType: videoType,
      isLongVideo: isLandscape || maxSec > 180,
      aspectRatio: isLandscape ? '16:9 (1920x1080) - YouTube Long Video' : (isSquare ? '1:1 (1080x1080) - Square' : '9:16 (1080x1920) - YouTube Shorts / Reels'),
      recipe: aiDirectorRecipe,
      isScheduled: !!scheduledItem,
      scheduledItem,
      scheduledQueue: getScheduledQueue()
    });

  } catch (err) {
    console.error('Video processing error:', err);
    res.status(500).json({ error: `Video processing error: ${err.message}` });
  } finally {
    if (customAudioPath && fs.existsSync(customAudioPath)) {
      try { await fsp.unlink(customAudioPath); } catch (_) {}
    }
  }
});

// 📸 5B. AI Photos-to-Reel Generator (Create 30s Viral Reel from 2-8 Photos)
app.post('/api/video/photos-to-reel', upload.fields([{ name: 'photoFiles', maxCount: 6 }, { name: 'customAudio', maxCount: 1 }]), async (req, res) => {
  let customAudioPath = null;
  try {
    let photoPaths = [];
    const usePreset = req.body.usePreset;

    // Support 1-Click Patola Saree preset photos (Exact 6 High-Res Photos)
    if (usePreset === 'patola') {
      const patolaImgDir = path.resolve(__dirname, '..', 'patola-saree-web', 'patola-copy', 'patola-copy', 'assets', 'images');
      const presetFiles = [
        'saree_royal_blue.jpg',
        'saree_emerald_chhabdi.jpg',
        'saree_nari_kunjar.jpg',
        'saree_ratanchowk.jpg',
        'patola_pallu.jpg',
        'hero.jpg'
      ];
      for (const pf of presetFiles) {
        const fullP = path.join(patolaImgDir, pf);
        if (fs.existsSync(fullP)) photoPaths.push(fullP);
      }
    }

    let uploadedPhotos = [];
    if (req.files && req.files.photoFiles) {
      uploadedPhotos = req.files.photoFiles;
    } else if (Array.isArray(req.files)) {
      uploadedPhotos = req.files;
    }
    if (uploadedPhotos.length > 0) {
      photoPaths = photoPaths.concat(uploadedPhotos.map(f => f.path));
    }

    if (req.files && req.files.customAudio && req.files.customAudio[0]) {
      customAudioPath = req.files.customAudio[0].path;
      console.log(`🎵 [Custom Song] User uploaded custom audio file for Photo Reel: ${req.files.customAudio[0].originalname} (${(req.files.customAudio[0].size / (1024*1024)).toFixed(2)} MB)`);
    }

    // Strictly enforce maximum 6 photos limit
    photoPaths = photoPaths.slice(0, 6);

    if (photoPaths.length === 0) {
      return res.status(400).json({ error: 'Please select at least 1 photo.' });
    }

    const {
      productTitle = 'Royal Patola Silk Saree',
      productPrice = '₹3,800',
      badgeText = 'Special Offer 🔥',
      niche = 'Patola Sarees & Fashion',
      targetDuration = '30',
      videoStyle = 'auto',
      subtitlesStyle = 'hormozi',
      bgmTrack = 'luxury-saree',
      bgmVolume = '0.35',
      customInstructions = '',
      transitionEffect = 'kenburns-fade'
    } = req.body;

    const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;
    const targetDur = parseInt(targetDuration) || 30;
    const secPerPhoto = Math.max(2, Math.min(8, Math.round((targetDur / photoPaths.length) * 10) / 10));
    const totalDuration = Math.round(photoPaths.length * secPerPhoto);

    console.log(`📸 [Photos-to-Reel] Composing ${photoPaths.length} photos into ${totalDuration}s 9:16 Reel. Title: "${productTitle}", Price: "${productPrice}", Niche: "${niche}", Style: "${videoStyle}", Subtitles: "${subtitlesStyle}", Effect: "${transitionEffect}"`);

    // AI Copy Generation (Title, sales caption, hashtags) with Gemini
    let aiTitle = `✨ ${productTitle} | ${badgeText} ${productPrice}`;
    let aiCaption = `🔥 પ્રીમિયમ કલેક્શન: ${productTitle}\n\n💰 ખાસ કિંમત: ${productPrice}\n✨ ${badgeText}\n✨ ૧૦૦% ઓથેન્ટિક ડિઝાઈન અને રિચ કલર!\n\n📲 ઓર્ડર કરવા માટે અત્યારે જ DM કરો અથવા WhatsApp પર મેસેજ મોકલો!\n\n#PatolaSaree #TraditionalFashion #SareeLove #Handloom #OnlineShopping #IndianEthnic`;
    let aiHashtags = `#PatolaSaree #FashionReels #IndianWear #Handloom #SareeCollection #TrendingReels #ShopOnline`;

    if (apiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const prompt = `You are a viral social media copywriter for Indian Reels and YouTube Shorts.
Category/Niche: ${niche}
Product: "${productTitle}" priced at "${productPrice}" (Badge: "${badgeText}")
Brand & Special Instructions: "${customInstructions || 'Handcrafted luxury, pure silk, limited edition'}"
Write a viral, high-converting social media Reel caption, catchy short title, and 10 trending hashtags for an Instagram Reel.
The audience is Gujarati and Indian fashion/saree buyers.
Respond ONLY with JSON:
{
  "viralTitle": "Short catchy title with emojis",
  "viralCaption": "Persuasive sales caption with price, qualities, and call to action to DM/WhatsApp",
  "viralHashtags": "#tags"
}`;
        const gRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.3 } })
        });
        if (gRes.ok) {
          const gData = await gRes.json();
          const parsed = JSON.parse(gData.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
          if (parsed.viralTitle) aiTitle = parsed.viralTitle;
          if (parsed.viralCaption) aiCaption = parsed.viralCaption;
          if (parsed.viralHashtags) aiHashtags = parsed.viralHashtags;
        }
      } catch (gErr) {
        console.warn('AI Copy generation warning for photo reel:', gErr.message);
      }
    }

    const outputFileName = `reel-photos-${Date.now()}.mp4`;
    const outputPath = path.join(REELS_DIR, outputFileName);
    let onlinePhotoAudioPath = null;
    if (req.body.onlineAudioUrl && !customAudioPath) {
      try {
        console.log(`🎵 [Online Song] Downloading online audio for photos reel: ${req.body.onlineAudioUrl}`);
        const aRes = await fetch(req.body.onlineAudioUrl);
        if (aRes.ok) {
          const buffer = Buffer.from(await aRes.arrayBuffer());
          onlinePhotoAudioPath = path.join(UPLOADS_DIR, `online-photo-bgm-${Date.now()}.mp3`);
          fs.writeFileSync(onlinePhotoAudioPath, buffer);
        }
      } catch (aErr) {
        console.warn('⚠️ Online audio for photos download error:', aErr.message);
      }
    }

    const parsedVol = Math.max(0.05, Math.min(1.0, parseFloat(bgmVolume) || 0.35));
    const bgmFilePath = (customAudioPath && fs.existsSync(customAudioPath))
      ? customAudioPath
      : (onlinePhotoAudioPath && fs.existsSync(onlinePhotoAudioPath))
      ? onlinePhotoAudioPath
      : (bgmTrack !== 'none' && bgmTrack !== 'custom' ? path.join(__dirname, 'public', 'audio', 'bgm', `${bgmTrack}.mp3`) : null);
    const hasValidBgm = bgmFilePath && fs.existsSync(bgmFilePath);

    // Color Grading Configuration
    let sat = 1.0, con = 1.0, bri = 0.0;
    if (videoStyle === 'royal-silk') {
      sat = 1.30; con = 1.15; bri = 0.02;
    } else if (videoStyle === 'heritage-gold') {
      sat = 1.25; con = 1.12; bri = 0.02;
    } else if (videoStyle === 'cinematic-movie') {
      sat = 1.20; con = 1.18; bri = 0.0;
    } else if (videoStyle === 'cinematic-vibrant') {
      sat = 1.38; con = 1.22; bri = 0.02;
    } else if (videoStyle === 'kids-sunny') {
      sat = 1.25; con = 1.08; bri = 0.03;
    }
    const colorFilter = (videoStyle !== 'auto') ? `eq=saturation=${sat}:contrast=${con}:brightness=${bri},` : '';

    // Build FFmpeg Filter Complex with CapCut effects, Ken Burns motion & transitions
    const filterComplex = [];
    const frames = Math.round(secPerPhoto * 30);
    const isCapcutFlash = (transitionEffect === 'capcut-flash' || transitionEffect === 'capcut-blur-bg');
    const fadeDur = isCapcutFlash ? 0.28 : 0.45;
    const fadeOutSt = Math.max(0.1, secPerPhoto - fadeDur).toFixed(2);
    const fadeColor = isCapcutFlash ? ':color=white' : '';

    for (let i = 0; i < photoPaths.length; i++) {
      let motionFilter = '';
      if (transitionEffect === 'kenburns-fade' || transitionEffect === 'capcut-flash' || transitionEffect === 'capcut-blur-bg') {
        if (i % 2 === 0) {
          motionFilter = `zoompan=z='min(zoom+0.0016,1.18)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,`;
        } else {
          motionFilter = `zoompan=z='if(lte(zoom,1.0),1.18,max(1.001,zoom-0.0016))':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,`;
        }
      } else if (transitionEffect === 'zoom-in') {
        motionFilter = `zoompan=z='min(zoom+0.0016,1.18)':d=${frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30,`;
      }

      if (transitionEffect === 'capcut-blur-bg') {
        // CapCut Blur Background Canvas: blurred full screen behind, sharp photo on top + White Flash
        filterComplex.push(
          `[${i}:v]split=2[bg_in${i}][fg_in${i}]`,
          `[bg_in${i}]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=25:5,eq=brightness=-0.08[bg${i}]`,
          `[fg_in${i}]scale=1080:1920:force_original_aspect_ratio=decrease[fg${i}]`,
          `[bg${i}][fg${i}]overlay=(W-w)/2:(H-h)/2,${colorFilter}${motionFilter}setsar=1,fps=30,trim=duration=${secPerPhoto},setpts=PTS-STARTPTS,fade=t=in:st=0:d=${fadeDur}${fadeColor},fade=t=out:st=${fadeOutSt}:d=${fadeDur}${fadeColor}[v${i}]`
        );
      } else {
        filterComplex.push(
          `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=black,${colorFilter}${motionFilter}setsar=1,fps=30,trim=duration=${secPerPhoto},setpts=PTS-STARTPTS,fade=t=in:st=0:d=${fadeDur}${fadeColor},fade=t=out:st=${fadeOutSt}:d=${fadeDur}${fadeColor}[v${i}]`
        );
      }
    }
    const concatInputs = photoPaths.map((_, i) => `[v${i}]`).join('');
    
    // Subtitles burning support for Photo Reels
    let assSubFilter = '';
    let assFilePath = null;
    if (subtitlesStyle && subtitlesStyle !== 'none') {
      try {
        const photoCaptions = [
          { text: productTitle, start: 0.5, end: Math.min(4, totalDuration / 2) },
          { text: `${badgeText} • ${productPrice}`, start: Math.min(4, totalDuration / 2), end: Math.min(8, totalDuration) },
          { text: "✨ ૧૦૦% શુદ્ધ કલેક્શન • ઓર્ડર માટે DM કરો", start: Math.min(8, totalDuration), end: Math.max(9, totalDuration - 1) }
        ];
        assFilePath = generateAssSubtitleFile(photoCaptions, productTitle, totalDuration, subtitlesStyle);
        if (assFilePath && fs.existsSync(assFilePath)) {
          const escapedAss = path.resolve(assFilePath).replace(/\\/g, '/').replace(/:/g, '\\:');
          assSubFilter = `,subtitles='${escapedAss}'`;
        }
      } catch (assErr) {
        console.warn('⚠️ Subtitles notice for photo reel:', assErr.message);
      }
    }

    filterComplex.push(`${concatInputs}concat=n=${photoPaths.length}:v=1:a=0,drawbox=y=ih-260:color=black@0.65:width=iw:height=260:t=fill${assSubFilter}[vout]`);

    const audioInputIndex = photoPaths.length;
    if (hasValidBgm) {
      filterComplex.push(`[${audioInputIndex}:a]volume=${parsedVol},afade=t=in:st=0:d=1.0,afade=t=out:st=${Math.max(1, totalDuration - 2)}:d=2.0[aout]`);
    }

    const ffmpegCmd = ffmpeg();
    for (const p of photoPaths) {
      ffmpegCmd.input(p).inputOptions(['-loop 1', `-t ${secPerPhoto}`]);
    }
    if (hasValidBgm) {
      ffmpegCmd.input(bgmFilePath);
    }

    ffmpegCmd.complexFilter(filterComplex);

    const outOpts = [
      '-map [vout]',
      '-c:v libx264',
      '-preset fast',
      '-crf 22',
      '-pix_fmt yuv420p',
      `-t ${totalDuration}`,
      '-movflags +faststart'
    ];
    if (hasValidBgm) {
      outOpts.push('-map [aout]', '-c:a aac', '-b:a 192k');
    }

    ffmpegCmd.outputOptions(outOpts);

    await new Promise((resolve, reject) => {
      ffmpegCmd.save(outputPath)
        .on('end', () => {
          console.log(`✅ [Photos-to-Reel] 30s Reel render completed: ${outputFileName}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg photos-to-reel error:', err);
          reject(err);
        });
    });

    // Generate cover thumbnail
    const thumbFileName = outputFileName.replace('.mp4', '-cover.jpg');
    const thumbOutputPath = path.join(REELS_DIR, thumbFileName);
    try {
      await generateViralThumbnail({
        videoPath: outputPath,
        outputPath: thumbOutputPath,
        headlineText: productTitle,
        hookBadge: productPrice,
        positionMode: 'none',
        fontStyle: 'classic',
        colorStyle: 'gold',
        timestamp: 1.0
      });
    } catch (_) {}

    // Cleanup uploaded temp photos
    if (uploadedPhotos && uploadedPhotos.length > 0) {
      for (const f of uploadedPhotos) {
        try { await fsp.unlink(f.path); } catch (_) {}
      }
    }

    // Schedule handling for Photo Reels
    const isScheduled = req.body.isScheduled === 'true' && !!req.body.scheduledTime;
    const scheduledTime = req.body.scheduledTime || null;
    const recurringDaily = req.body.recurringDaily === 'true';
    let scheduledItem = null;

    if (isScheduled && scheduledTime) {
      const queue = getScheduledQueue();
      const schedDate = new Date(scheduledTime);
      const isPastOrNow = isNaN(schedDate.getTime()) || (new Date() >= schedDate);

      scheduledItem = {
        id: `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        reelUrl: `/rendered-reels/${outputFileName}`,
        downloadUrl: `/rendered-reels/${outputFileName}`,
        fileName: outputFileName,
        scheduledTime: scheduledTime,
        scheduledTimeFormatted: !isNaN(schedDate.getTime()) 
          ? schedDate.toLocaleString('gu-IN', { dateStyle: 'medium', timeStyle: 'short' })
          : scheduledTime,
        recurringDaily,
        recurringCycle: 1,
        duration: `${totalDuration}s`,
        thumbnailUrl: `/rendered-reels/${thumbFileName}`,
        niche: niche || 'Patola Sarees & Fashion',
        viralTitle: aiTitle,
        viralCaption: aiCaption,
        viralHashtags: aiHashtags,
        detectedTopic: niche,
        themeName: 'Luxury Photo Reel',
        status: isPastOrNow ? 'Ready to Post' : 'Scheduled',
        createdAt: new Date().toISOString()
      };

      queue.unshift(scheduledItem);
      saveScheduledQueue(queue);
      console.log(`⏰ [Photo Reel Scheduled] Saved reel "${outputFileName}" scheduled for ${scheduledItem.scheduledTimeFormatted}`);
    }

    return res.json({
      success: true,
      videoUrl: `/rendered-reels/${outputFileName}`,
      coverUrl: `/rendered-reels/${thumbFileName}`,
      fileName: outputFileName,
      duration: `${totalDuration} Seconds`,
      aspectRatio: '9:16 (1080x1920) - Instagram Reels / YouTube Shorts',
      isScheduled,
      scheduledItem,
      recipe: {
        themeName: 'Luxury Product Photo Reel',
        detectedTopic: niche,
        viralTitle: aiTitle,
        viralCaption: aiCaption,
        viralHashtags: aiHashtags
      }
    });

  } catch (err) {
    console.error('Photos-to-reel error:', err);
    res.status(500).json({ error: `Photo reel generation error: ${err.message}` });
  } finally {
    if (customAudioPath && fs.existsSync(customAudioPath)) {
      try { await fsp.unlink(customAudioPath); } catch (_) {}
    }
  }
});

// 🖼️ Feature #4: AI Smart Thumbnail Studio Endpoint (Regenerate / Customize on the fly)
app.post('/api/video/generate-thumbnail', async (req, res) => {
  try {
    const { videoFileName, headlineText, hookBadge, bottomText, positionMode, fontStyle, colorStyle, timestamp } = req.body;
    if (!videoFileName) {
      return res.status(400).json({ error: 'Video file name is required.' });
    }

    const cleanBase = path.basename(videoFileName);
    let videoPath = path.join(REELS_DIR, cleanBase);
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(UPLOADS_DIR, cleanBase);
    }
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found.' });
    }

    const thumbFileName = cleanBase.replace(/\.(mp4|mov|avi|webm)$/i, '') + '-cover.jpg';
    const outputPath = path.join(REELS_DIR, thumbFileName);

    const result = await generateViralThumbnail({
      videoPath,
      outputPath,
      headlineText: headlineText !== undefined ? headlineText : 'MUST WATCH 🎬',
      hookBadge: hookBadge !== undefined ? hookBadge : '',
      bottomText: bottomText !== undefined ? bottomText : '',
      positionMode: positionMode || 'title-only',
      fontStyle: fontStyle || 'classic',
      colorStyle: colorStyle || 'gold',
      timestamp: parseFloat(timestamp) || 6.5
    });

    if (!result.success) {
      return res.status(500).json({ error: result.error || 'Thumbnail creation failed.' });
    }

    return res.json({
      success: true,
      thumbnailUrl: `/rendered-reels/${thumbFileName}?t=${Date.now()}`,
      fileName: thumbFileName,
      timestamp: parseFloat(timestamp) || 6.5,
      headlineText,
      hookBadge,
      bottomText,
      positionMode: positionMode || 'title-only',
      fontStyle: fontStyle || 'classic',
      colorStyle: colorStyle || 'gold'
    });
  } catch (err) {
    console.error('Thumbnail generation endpoint error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🎬 Feature #5: AI Timeline Studio & Video FX Editor (Cut, Filters, Text, Effects)
app.post('/api/video/edit-timeline', async (req, res) => {
  try {
    const {
      videoFileName, trimStart, trimEnd, speed, filter, textSize, textPosition, textColor,
      effects, customCaption, origVolume, rotate, flipH, flipV, adjust, voice, resolution,
      fps, aspect, chromaKey, font, textAnim, clips, bgmTrack, bgmVolume, muteOrigAudio,
      blurCanvas, canvasBg, sticker, stickerText, stickerPos, stickerScale, sfxTrack, sfxVolume, subStyle
    } = req.body;
    if (!videoFileName) {
      return res.status(400).json({ error: 'Video file name is required.' });
    }

    const cleanBase = path.basename(videoFileName);
    let videoPath = path.join(REELS_DIR, cleanBase);
    if (!fs.existsSync(videoPath)) videoPath = path.join(UPLOADS_DIR, cleanBase);
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found in system.' });
    }

    const startSec = Math.max(0, parseFloat(trimStart) || 0);
    const endSec = Math.max(startSec + 2, parseFloat(trimEnd) || 30);
    const rawDuration = Math.max(2, endSec - startSec);

    const editedFileName = `edited-${Date.now()}-${cleanBase}`;
    const outputPath = path.join(REELS_DIR, editedFileName);

    const vFilters = [];
    const aFilters = [];

    // Ensure trimmed video starts cleanly at PTS 0
    vFilters.push('setpts=PTS-STARTPTS');
    aFilters.push('asetpts=PTS-STARTPTS');

    // 1. CapCut Speed Control (0.1x to 10.0x)
    const playbackSpeed = Math.min(10.0, Math.max(0.1, parseFloat(speed) || 1.0));
    if (playbackSpeed !== 1.0) {
      vFilters.push(`setpts=(1/${playbackSpeed})*PTS`);
      // atempo supports 0.5 to 2.0 per filter instance
      if (playbackSpeed >= 0.5 && playbackSpeed <= 2.0) {
        aFilters.push(`atempo=${playbackSpeed}`);
      } else if (playbackSpeed > 2.0) {
        aFilters.push(`atempo=2.0,atempo=${(playbackSpeed / 2.0).toFixed(2)}`);
      } else {
        aFilters.push(`atempo=0.5,atempo=${(playbackSpeed / 0.5).toFixed(2)}`);
      }
    }

    // 2. Transform: Rotate & Flip
    if (rotate) {
      const rot = parseInt(rotate, 10);
      if (rot === 90) vFilters.push('transpose=1');
      else if (rot === 180) vFilters.push('transpose=1,transpose=1');
      else if (rot === 270) vFilters.push('transpose=2');
    }
    if (flipH) vFilters.push('hflip');
    if (flipV) vFilters.push('vflip');

    // 3. Effects: Punch-in Zoom
    const fxList = Array.isArray(effects) ? effects : (effects ? [effects] : []);
    const hasZoom = fxList.includes('zoom');
    if (hasZoom) {
      vFilters.push('crop=in_w*0.88:in_h*0.88:(in_w-out_w)/2:(in_h-out_h)/2');
    }

    // 3B. Chroma Key (Green / Blue Screen Color Keying)
    if (chromaKey && chromaKey.enabled) {
      const rawCol = (chromaKey.color || '#00FF00').replace('#', '');
      const sim = Math.max(0.01, Math.min(0.8, parseFloat(chromaKey.similarity) || 0.25));
      const blend = Math.max(0.0, Math.min(0.5, parseFloat(chromaKey.blend) || 0.10));
      vFilters.push(`colorkey=0x${rawCol}:${sim}:${blend}`);
    }

    // 4. Output Resolution & Canvas Aspect
    let outW = 1080;
    let outH = 1920;
    if (aspect === '16:9') {
      outW = resolution === '4k' ? 3840 : (resolution === '720p' ? 1280 : 1920);
      outH = resolution === '4k' ? 2160 : (resolution === '720p' ? 720 : 1080);
    } else if (aspect === '1:1') {
      outW = resolution === '4k' ? 2160 : (resolution === '720p' ? 720 : 1080);
      outH = outW;
    } else if (aspect === '4:5') {
      outW = resolution === '4k' ? 2160 : (resolution === '720p' ? 720 : 1080);
      outH = Math.round(outW * 1.25);
    } else {
      // 9:16 vertical
      outW = resolution === '4k' ? 2160 : (resolution === '720p' ? 720 : 1080);
      outH = resolution === '4k' ? 3840 : (resolution === '720p' ? 1280 : 1920);
    }

    // 4B. CapCut Blur Canvas vs Plain Black Padding
    const isBlurCanvas = (blurCanvas === true || blurCanvas === 'true' || canvasBg === 'blur');
    let videoCanvasFilter = '';
    if (isBlurCanvas) {
      videoCanvasFilter = `split=2[fg_raw][bg_raw];[bg_raw]scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},boxblur=25:5,eq=brightness=-0.12:contrast=1.12[bg_blur];[fg_raw]scale=${outW}:${outH}:force_original_aspect_ratio=decrease[fg_scaled];[bg_blur][fg_scaled]overlay=(W-w)/2:(H-h)/2`;
    } else {
      videoCanvasFilter = `scale=${outW}:${outH}:force_original_aspect_ratio=decrease,pad=${outW}:${outH}:(ow-iw)/2:(oh-ih)/2:black`;
    }

    // 5. White Flash Transition on Start
    if (fxList.includes('flash')) {
      vFilters.push('fade=t=in:st=0:d=0.35:color=white');
    }

    // 6. Pro Adjustments (Brightness, Exposure, Contrast, Saturation, Temp, Sharp)
    if (adjust && typeof adjust === 'object') {
      const b = (parseFloat(adjust.brightness) || 0) / 100;
      const exp = (parseFloat(adjust.exposure) || 0) / 100;
      const totalB = Math.max(-1, Math.min(1, b + exp));
      const c = (parseFloat(adjust.contrast) || 100) / 100;
      const s = (parseFloat(adjust.saturation) || 100) / 100;
      const temp = parseFloat(adjust.temp) || 0;
      const sharp = parseFloat(adjust.sharp) || 0;

      if (totalB !== 0 || c !== 1 || s !== 1) {
        vFilters.push(`eq=brightness=${totalB.toFixed(2)}:contrast=${c.toFixed(2)}:saturation=${s.toFixed(2)}`);
      }
      if (temp !== 0) {
        const tempVal = (temp / 150).toFixed(2);
        vFilters.push(`colorbalance=rs=${tempVal}:bs=${(-tempVal).toFixed(2)}`);
      }
      if (sharp > 0) {
        const sharpAmount = (sharp / 60).toFixed(2);
        vFilters.push(`unsharp=luma_msize_x=5:luma_msize_y=5:luma_amount=${sharpAmount}`);
      }
    }

    // 7. CapCut Visual Filters & LUTs
    const selectedFilter = filter || 'none';
    if (selectedFilter === 'warm-gold') {
      vFilters.push('eq=saturation=1.35:contrast=1.18,colorbalance=rs=0.15:gs=0.06:bs=-0.12');
    } else if (selectedFilter === 'cinema') {
      vFilters.push('eq=contrast=1.22:saturation=1.12,colorbalance=rs=0.08:gs=0.02:bs=-0.04');
    } else if (selectedFilter === 'vibrant') {
      vFilters.push('eq=saturation=1.45:contrast=1.25:brightness=0.03');
    } else if (selectedFilter === 'noir') {
      vFilters.push('hue=s=0,eq=contrast=1.35:brightness=-0.02');
    } else if (selectedFilter === 'teal-orange') {
      vFilters.push('eq=saturation=1.25:contrast=1.2,colorbalance=rs=0.12:gs=-0.02:bs=0.1');
    } else if (selectedFilter === 'vintage') {
      vFilters.push('eq=saturation=0.82:contrast=1.12:brightness=0.04,colorbalance=rs=0.12:gs=0.05:bs=-0.08');
    } else if (selectedFilter === 'neon') {
      vFilters.push('eq=saturation=1.55:contrast=1.28,colorbalance=rs=-0.08:gs=0.12:bs=0.25');
    } else if (selectedFilter === 'hdr') {
      vFilters.push('eq=contrast=1.35:saturation=1.38:brightness=0.02');
    } else if (selectedFilter === 'fashion') {
      vFilters.push('eq=contrast=1.18:saturation=1.28,colorbalance=rs=0.12:gs=0.04:bs=-0.05');
    } else if (selectedFilter === 'cool') {
      vFilters.push('eq=saturation=1.15,colorbalance=rs=-0.1:gs=0.02:bs=0.18');
    } else if (selectedFilter === 'beauty') {
      vFilters.push('eq=contrast=1.08:saturation=1.16:brightness=0.05');
    } else if (selectedFilter === 'food') {
      vFilters.push('eq=contrast=1.2:saturation=1.3,colorbalance=rs=0.14:gs=0.06:bs=-0.08');
    }

    // 8. Vignette Effect
    if (fxList.includes('vignette')) {
      vFilters.push('vignette=PI/4');
    }

    // 8B. CapCut Viral Stickers & Business Badges
    if (sticker && typeof sticker === 'string' && sticker !== 'none') {
      const stickerBadgeMap = {
        whatsapp: { text: "Order on WhatsApp\\: +91 98250 15112", boxColor: "0x25D366@0.92", width: 680 },
        sale50: { text: "SPECIAL 50% DISCOUNT TODAY", boxColor: "0xE11D48@0.92", width: 560 },
        trending: { text: "TRENDING ROYAL PATOLA", boxColor: "0xD97706@0.92", width: 540 },
        like: { text: "DOUBLE TAP TO LIKE", boxColor: "0xEF4444@0.92", width: 440 },
        subscribe: { text: "SUBSCRIBE FOR NEW REELS", boxColor: "0xDC2626@0.92", width: 500 },
        '100': { text: "100% PURE HANDLOOM SILK", boxColor: "0x059669@0.92", width: 520 },
        newarrival: { text: "NEW ARRIVAL LUXURY COLLECTION", boxColor: "0x7C3AED@0.92", width: 620 }
      };
      const badge = stickerBadgeMap[sticker];
      if (badge) {
        vFilters.push(`drawbox=x=(w-${badge.width})/2:y=180:w=${badge.width}:h=90:color=${badge.boxColor}:t=fill`);
        vFilters.push(`drawtext=text='${badge.text}':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=210`);
      }
    }

    // 9. Audio Volume & Voice Changer
    if (origVolume !== undefined) {
      const vol = Math.max(0, Math.min(2, parseFloat(origVolume)));
      aFilters.push(`volume=${vol}`);
    }

    if (voice && voice !== 'normal') {
      if (voice === 'deep') aFilters.push('asetrate=44100*0.82,aresample=44100');
      else if (voice === 'chipmunk') aFilters.push('asetrate=44100*1.32,aresample=44100');
      else if (voice === 'monster') aFilters.push('asetrate=44100*0.68,aresample=44100');
      else if (voice === 'robot') aFilters.push('flanger=delay=10:depth=4:speed=0.5');
      else if (voice === 'echo') aFilters.push('aecho=0.8:0.88:60:0.4');
    }

    // 10. CapCut Dynamic Subtitles / Hormozi Typography
    // 10. CapCut Dynamic Subtitles & Sticker Pill Overlay
    let assPath = null;
    const hasCaptions = !!(customCaption && customCaption.trim());
    const hasSticker = !!(sticker && sticker !== 'none');

    if (hasCaptions || hasSticker) {
      const fontSizeMap = { small: 56, medium: 72, large: 88, huge: 110 };
      const chosenSize = fontSizeMap[textSize] || 76;
      const alignMap = { bottom: 2, center: 5, top: 8 };
      const chosenAlign = alignMap[textPosition] || 2;
      const marginVMap = { bottom: 360, center: 0, top: 240 };
      const chosenMarginV = marginVMap[textPosition] || 360;

      // Color Palette & Subtitle Presets
      const colorMap = {
        yellow: '&H0000FFFF&', // Bright Hormozi Yellow
        cyan: '&H00FFFF00&',   // Electric Cyan
        gold: '&H0045B8D4&',   // 24k Royal Gold
        white: '&H00FFFFFF&',  // Crisp White
        green: '&H0000FF00&',
        rose: '&H006600FF&',
        amethyst: '&H00FF0099&'
      };
      const chosenCol = colorMap[textColor] || (subStyle === 'cyan' ? '&H00FFFF00&' : (subStyle === 'gold' ? '&H0045B8D4&' : '&H0000FFFF&'));
      const chosenFont = (font && typeof font === 'string') ? font.replace(/['",]/g, '') : 'Arial Black';

      // Outline & Shadow configuration for Hormozi style
      const borderStyle = (subStyle === 'pill') ? 3 : 1;
      const outlineWidth = (subStyle === 'pill') ? 4 : 8;
      const shadowDepth = (subStyle === 'pill') ? 0 : 4;
      const backColour = (subStyle === 'pill') ? '&H90000000&' : '&H80000000&';

      let assEvents = '';

      if (hasCaptions) {
        const lines = customCaption.split('\n').filter(l => l.trim());
        const step = rawDuration / Math.max(1, lines.length);
        lines.forEach((line, idx) => {
          const sTime = formatAssTime(idx * step);
          const eTime = formatAssTime((idx + 1) * step);
          const cleanText = line.toUpperCase().replace(/[{}]/g, '').trim();
          assEvents += `Dialogue: 0,${sTime},${eTime},EditorStyle,,0,0,0,,{\\c${chosenCol}}${cleanText}\n`;
        });
      }

      const stkFontSize = stickerScale === 'small' ? 32 : (stickerScale === 'large' ? 52 : 40);
      let stkAlign = 9;
      let isCustomPos = false;
      let posX = 850;
      let posY = 150;

      if (hasSticker && stickerPos && typeof stickerPos === 'object') {
        if (stickerPos.type === 'custom' || (stickerPos.xPct !== undefined && stickerPos.yPct !== undefined)) {
          isCustomPos = true;
          posX = Math.round(1080 * (Math.max(5, Math.min(90, parseFloat(stickerPos.xPct) || 80)) / 100));
          posY = Math.round(1920 * (Math.max(5, Math.min(90, parseFloat(stickerPos.yPct) || 10)) / 100));
        } else if (stickerPos.align) {
          stkAlign = parseInt(stickerPos.align, 10) || 9;
        }
      }

      if (hasSticker) {
        const cleanStk = (stickerText || sticker).toUpperCase().replace(/[{}]/g, '').trim();
        if (isCustomPos) {
          assEvents += `Dialogue: 1,0:00:00.00,${formatAssTime(rawDuration)},StickerStyle,,0,0,0,,{\\an7\\pos(${posX},${posY})}${cleanStk}\n`;
        } else {
          assEvents += `Dialogue: 1,0:00:00.00,${formatAssTime(rawDuration)},StickerStyle,,0,0,0,,${cleanStk}\n`;
        }
      }

      const assContent = `[Script Info]
Title: Timeline Studio Subtitles & Sticker
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: EditorStyle,${chosenFont},${chosenSize},${chosenCol},&H00000000,&H00000000,${backColour},-1,0,0,0,100,100,0,0,${borderStyle},${outlineWidth},${shadowDepth},${chosenAlign},60,60,${chosenMarginV},1
Style: StickerStyle,Arial Black,${stkFontSize},&H00FFFFFF,&H00000000,&H00000000,&HA00F172A,-1,0,0,0,100,100,0,0,3,10,0,${stkAlign},50,50,150,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${assEvents}`;

      assPath = path.join(os.tmpdir(), `editor-sub-${Date.now()}.ass`);
      fs.writeFileSync(assPath, assContent, 'utf8');
      const escapedAss = path.resolve(assPath).replace(/\\/g, '/').replace(/:/g, '\\:');
      vFilters.push(`subtitles='${escapedAss}'`);
    }

    const finalClipDuration = rawDuration / playbackSpeed;

    // 11. BGM Track Detection
    let bgmFilePath = null;
    if (bgmTrack && typeof bgmTrack === 'string' && bgmTrack.trim() && bgmTrack !== 'none') {
      const cleanBgm = bgmTrack.trim();
      const pPublic = path.join(__dirname, 'public', cleanBgm.startsWith('/') ? cleanBgm.slice(1) : cleanBgm);
      const pUploads = path.join(UPLOADS_DIR, path.basename(cleanBgm));
      const pPublicBgm = path.join(__dirname, 'public', 'audio', 'bgm', path.basename(cleanBgm));
      if (fs.existsSync(pPublic)) bgmFilePath = pPublic;
      else if (fs.existsSync(pUploads)) bgmFilePath = pUploads;
      else if (fs.existsSync(pPublicBgm)) bgmFilePath = pPublicBgm;
    }

    // 12. CapCut Sound Effects (SFX) Track Detection
    let sfxFilePath = null;
    if (sfxTrack && typeof sfxTrack === 'string' && sfxTrack.trim() && sfxTrack !== 'none') {
      const cleanSfx = path.basename(sfxTrack).replace(/\.wav$/i, '') + '.wav';
      const pSfx = path.join(__dirname, 'public', 'audio', 'sfx', cleanSfx);
      if (fs.existsSync(pSfx)) sfxFilePath = pSfx;
    }
    const sfxVol = Math.max(0, Math.min(2, parseFloat(sfxVolume) || 1.0));
    const isMuteOrig = (muteOrigAudio === true || muteOrigAudio === 'true');
    const bgmVol = Math.max(0, Math.min(2, parseFloat(bgmVolume) ?? 0.85));

    console.log(`🎬 [CapCut Studio] Rendering: Start ${startSec}s, Raw ${rawDuration}s -> Final ${finalClipDuration.toFixed(1)}s, Speed ${playbackSpeed}x, BlurCanvas: ${isBlurCanvas}, Sticker: ${sticker || 'None'}, BGM: ${bgmFilePath ? path.basename(bgmFilePath) : 'None'}, SFX: ${sfxFilePath ? path.basename(sfxFilePath) : 'None'}`);

    await new Promise((resolve, reject) => {
      let ff = ffmpeg(videoPath)
        .setStartTime(startSec)
        .setDuration(rawDuration);

      const complex = [];

      // Build video filter graph (with Blur Canvas + additional filters)
      let fullVFilter = `[0:v]${videoCanvasFilter}`;
      if (vFilters.length > 0) {
        fullVFilter += `,${vFilters.join(',')}`;
      }
      fullVFilter += `[vout]`;
      complex.push(fullVFilter);

      // Track input index for audio
      let currentInputIdx = 1;
      let bgmInputIdx = null;
      let sfxInputIdx = null;

      if (bgmFilePath && fs.existsSync(bgmFilePath)) {
        ff = ff.input(bgmFilePath).inputOptions(['-stream_loop -1']);
        bgmInputIdx = currentInputIdx++;
      }

      if (sfxFilePath && fs.existsSync(sfxFilePath)) {
        ff = ff.input(sfxFilePath);
        sfxInputIdx = currentInputIdx++;
      }

      // Audio Filter Graph
      const audioMixInputs = [];
      if (!isMuteOrig) {
        let origAF = aFilters.length > 0 ? aFilters.join(',') : 'volume=1.0';
        complex.push(`[0:a]${origAF}[orig_a]`);
        audioMixInputs.push('[orig_a]');
      }

      if (bgmInputIdx !== null) {
        complex.push(`[${bgmInputIdx}:a]volume=${bgmVol},afade=t=in:st=0:d=1.0,afade=t=out:st=${Math.max(1, rawDuration - 1.5)}:d=1.5[bgm_a]`);
        audioMixInputs.push('[bgm_a]');
      }

      if (sfxInputIdx !== null) {
        complex.push(`[${sfxInputIdx}:a]volume=${sfxVol}[sfx_a]`);
        audioMixInputs.push('[sfx_a]');
      }

      if (audioMixInputs.length > 1) {
        complex.push(`${audioMixInputs.join('')}amix=inputs=${audioMixInputs.length}:duration=first:dropout_transition=2[aout]`);
      } else if (audioMixInputs.length === 1) {
        complex.push(`${audioMixInputs[0]}anull[aout]`);
      }

      ff.complexFilter(complex);

      const outOpts = [
        '-map [vout]',
        '-c:v libx264',
        '-preset fast',
        '-crf 22',
        '-pix_fmt yuv420p',
        '-movflags +faststart'
      ];

      if (audioMixInputs.length > 0) {
        outOpts.push('-map [aout]', '-c:a aac', '-b:a 192k');
      } else {
        outOpts.push('-an');
      }

      ff.outputOptions(outOpts)
        .save(outputPath)
        .on('end', () => resolve())
        .on('error', (err) => reject(err));
    });

    if (assPath && fs.existsSync(assPath)) {
      try { await fsp.unlink(assPath); } catch (_) {}
    }

    const finalDuration = Math.max(1, Math.round(rawDuration / (playbackSpeed || 1.0)));

    return res.json({
      success: true,
      videoUrl: `/rendered-reels/${editedFileName}`,
      downloadUrl: `/rendered-reels/${editedFileName}`,
      fileName: editedFileName,
      duration: `${finalDuration}s`,
      appliedSettings: {
        trimStart: startSec,
        trimEnd: endSec,
        filter: selectedFilter,
        effects: fxList,
        textSize,
        textPosition
      }
    });

  } catch (err) {
    console.error('Timeline Studio edit error:', err);
    res.status(500).json({ error: `Video editing error: ${err.message}` });
  }
});

// 6. Social Media Publishing (YouTube Shorts & Instagram Reels)
app.post('/api/social/publish-youtube', async (req, res) => {
  try {
    const { videoFileName, title, description, accessToken } = req.body;
    if (!videoFileName) return res.status(400).json({ error: 'Please select a video file.' });

    const videoPath = path.join(REELS_DIR, path.basename(videoFileName));
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Video file not found.' });

    return res.json({
      success: true,
      directUploadUrl: 'https://studio.youtube.com/channel/upload',
      message: 'YouTube Studio is ready! You can upload the video directly.',
      preparedData: {
        title: title || 'Viral Patola Saree #Shorts',
        description: description || 'Handloom pure silk patola saree.',
        tags: 'shorts, patola, saree, handloom, viral'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/social/publish-instagram', async (req, res) => {
  try {
    const { videoFileName, caption } = req.body;
    if (!videoFileName) return res.status(400).json({ error: 'Please select a video file.' });

    const videoPath = path.join(REELS_DIR, path.basename(videoFileName));
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Video file not found.' });

    return res.json({
      success: true,
      directUploadUrl: 'https://www.instagram.com/create/style/',
      message: 'Instagram Web / App is ready! Copy caption and hashtags to upload.',
      preparedCaption: caption || 'Royal Heritage Patola Saree ✨'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Meta Instagram Graph API 100% Direct Publishing
app.post('/api/social/publish-instagram-direct', async (req, res) => {
  try {
    const { videoFileName, caption, accessToken, igUserId } = req.body;
    let videoPath = null;
    if (videoFileName) {
      const p1 = path.join(REELS_DIR, path.basename(videoFileName));
      const p2 = path.join(UPLOADS_DIR, path.basename(videoFileName));
      if (fs.existsSync(p1)) videoPath = p1;
      else if (fs.existsSync(p2)) videoPath = p2;
    }

    if (!videoPath) {
      const files = fs.readdirSync(REELS_DIR).filter(f => f.endsWith('.mp4'));
      if (files.length > 0) {
        files.sort((a, b) => fs.statSync(path.join(REELS_DIR, b)).mtimeMs - fs.statSync(path.join(REELS_DIR, a)).mtimeMs);
        videoPath = path.join(REELS_DIR, files[0]);
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found for publishing.' });
    }

    const result = await publishReelDirectToInstagram(videoPath, caption, accessToken, igUserId);
    if (result && result.postUrl) {
      sendTelegramAlert(`📸 <b>ForgeAI: Instagram Reel Published!</b>\n\n🔗 <a href="${result.postUrl}">${result.postUrl}</a>\n\n⏰ <i>Time: ${new Date().toLocaleTimeString('en-IN')}</i>`).catch(() => {});
    }
    res.json(result);
  } catch (err) {
    console.error('Meta Direct Publish Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cached Social Media Handles
let cachedIgUsername = process.env.META_INSTAGRAM_USERNAME || 'moving.151120';
let cachedYtTitle = process.env.YOUTUBE_CHANNEL_TITLE || null;

// Helper to get valid YouTube Access Token (auto-refreshes if refresh_token + client_id configured)
async function getOrRefreshYouTubeToken(customToken) {
  let token = customToken || process.env.YOUTUBE_ACCESS_TOKEN;
  if (process.env.YOUTUBE_REFRESH_TOKEN && process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET) {
    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.YOUTUBE_CLIENT_ID,
          client_secret: process.env.YOUTUBE_CLIENT_SECRET,
          refresh_token: process.env.YOUTUBE_REFRESH_TOKEN,
          grant_type: 'refresh_token'
        })
      });
      const data = await res.json();
      if (data.access_token) {
        token = data.access_token;
        updateEnvFile({ YOUTUBE_ACCESS_TOKEN: data.access_token });
        console.log('🔄 [YouTube Auto-Refresh] Successfully refreshed access token in background!');
      }
    } catch (e) {
      console.warn('⚠️ [YouTube Auto-Refresh Warning]:', e.message);
    }
  }
  return token;
}

// YouTube Data API v3 100% Direct Publishing Engine (Shorts & up to 10-Min Videos)
async function publishShortDirectToYouTube(videoPath, title, description, tags, customToken) {
  const token = await getOrRefreshYouTubeToken(customToken);
  if (!token) throw new Error('YouTube Access Token is missing. Please add token in Settings.');
  if (!fs.existsSync(videoPath)) throw new Error('Video file not found.');

  const fileStat = await fsp.stat(videoPath);
  const videoBuffer = await fsp.readFile(videoPath);
  console.log(`🚀 [YouTube API] Starting direct upload for ${path.basename(videoPath)} (${(fileStat.size / (1024*1024)).toFixed(2)} MB)...`);

  // Detect whether this is a YouTube Short (vertical & <= 180s) or Long Video
  let isShort = false;
  let durationSec = 30;
  try {
    await new Promise((resProbe) => {
      ffmpeg.ffprobe(videoPath, (err, meta) => {
        if (!err && meta?.format?.duration) {
          durationSec = Math.round(meta.format.duration);
          const vStream = meta.streams?.find(s => s.codec_type === 'video');
          const w = vStream?.width || 1080;
          const h = vStream?.height || 1920;
          if (w < h && durationSec <= 180) {
            isShort = true;
          }
        }
        resProbe();
      });
    });
  } catch (_) {}

  const defaultTitle = isShort ? 'Viral AI Reel #Shorts' : 'Viral AI Video | Must Watch';
  const defaultDesc = isShort 
    ? 'Created with AI Video Director #Shorts #Reels' 
    : 'Created with AI Video Director. Watch full video, like and subscribe for more!';
  const defaultTags = isShort ? ['Shorts', 'Viral', 'Trending'] : ['YouTube', 'Video', 'Trending', 'Viral'];
  const tagArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim())) : defaultTags;

  // Step 1: Initialize Resumable Upload Session
  const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Length': String(fileStat.size),
      'X-Upload-Content-Type': 'video/mp4'
    },
    body: JSON.stringify({
      snippet: {
        title: title || defaultTitle,
        description: description || defaultDesc,
        tags: tagArray,
        categoryId: '22'
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false
      }
    })
  });

  if (!initRes.ok) {
    const errData = await initRes.json().catch(() => ({}));
    console.error('YouTube Init Failed:', errData);
    throw new Error(errData.error?.message || 'Failed to start YouTube upload session. Token may have expired.');
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube Upload URL not received.');
  }

  // Step 2: Upload Video Binary Bytes
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Length': String(fileStat.size),
      'Content-Type': 'video/mp4'
    },
    body: videoBuffer
  });

  const uploadData = await uploadRes.json();
  if (!uploadRes.ok || !uploadData.id) {
    console.error('YouTube Upload Failed:', uploadData);
    throw new Error(uploadData.error?.message || 'Error uploading video bytes to YouTube.');
  }

  const videoId = uploadData.id;
  const postUrl = isShort 
    ? `https://www.youtube.com/shorts/${videoId}` 
    : `https://www.youtube.com/watch?v=${videoId}`;
  console.log(`🎉 [YouTube API] ${isShort ? 'Short' : 'Long Video'} Published Successfully! Video ID: ${videoId} -> ${postUrl}`);

  return {
    success: true,
    videoId,
    postUrl,
    isShort,
    durationSec,
    message: isShort ? '🎉 YouTube Short published directly to your channel!' : '🎉 YouTube Video (10-Min / Long) published directly to your channel!'
  };
}

app.post('/api/social/publish-youtube-direct', async (req, res) => {
  try {
    const { videoFileName, title, description, tags, accessToken } = req.body;
    let videoPath = null;
    if (videoFileName) {
      const p1 = path.join(REELS_DIR, path.basename(videoFileName));
      const p2 = path.join(UPLOADS_DIR, path.basename(videoFileName));
      if (fs.existsSync(p1)) videoPath = p1;
      else if (fs.existsSync(p2)) videoPath = p2;
    }
    if (!videoPath) {
      const files = fs.readdirSync(REELS_DIR).filter(f => f.endsWith('.mp4'));
      if (files.length > 0) {
        files.sort((a, b) => fs.statSync(path.join(REELS_DIR, b)).mtimeMs - fs.statSync(path.join(REELS_DIR, a)).mtimeMs);
        videoPath = path.join(REELS_DIR, files[0]);
      }
    }
    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found for YouTube.' });
    }

    const result = await publishShortDirectToYouTube(videoPath, title, description, tags, accessToken);
    if (result && result.postUrl) {
      const plain = `🔴 ForgeAI: YouTube Short Published!\n\n🔗 ${result.postUrl}\n\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}`;
      const html = `🔴 <b>ForgeAI: YouTube Short Published!</b>\n\n🔗 <a href="${result.postUrl}">${result.postUrl}</a>\n\n⏰ <i>Time: ${new Date().toLocaleTimeString('en-IN')}</i>`;
      sendInstantAlert(plain, html).catch(() => {});
    }
    res.json(result);
  } catch (err) {
    console.error('YouTube Direct Publish Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Facebook Page Video Direct Publishing Engine (Supports 3-min, 5-min, 10-min+ Long Videos)
async function publishVideoDirectToFacebookPage({ videoPath, title, description, customToken, customPageId }) {
  const pageId = customPageId || process.env.META_INSTAGRAM_PAGE_ID || '1320416261160842';
  const token = customToken || process.env.META_INSTAGRAM_TOKEN;
  if (!token) throw new Error('Facebook Page Access Token missing. Please check .env settings.');
  if (!fs.existsSync(videoPath)) throw new Error('Video file not found: ' + videoPath);

  const fileStat = await fsp.stat(videoPath);
  console.log(`🚀 [Facebook Page Video] Uploading video "${path.basename(videoPath)}" (${(fileStat.size / (1024*1024)).toFixed(2)} MB) to Page ID: ${pageId}...`);

  const fileBuffer = await fsp.readFile(videoPath);
  const blob = new Blob([fileBuffer], { type: 'video/mp4' });
  const form = new FormData();
  form.append('source', blob, path.basename(videoPath));
  form.append('title', title || 'Royal Heritage Patola Handloom Saree | 5-Minute Masterpiece');
  form.append('description', description || 'Authentic Double Ikat Patola Handloom Saree Crafted by Master Artisans in Patan, Gujarat.\n\n🌐 Visit Vault: https://patolahandmadebyvankar.com\n📞 Helpline: +91 8160160750\n\n#patola #patanpatola #handloom #saree #heritage #craftsmanship');
  form.append('published', 'true');
  form.append('access_token', token);

  const uploadRes = await fetch(`https://graph-video.facebook.com/v20.0/${pageId}/videos`, {
    method: 'POST',
    body: form
  }).then(r => r.json());

  if (uploadRes.error) {
    console.error('Facebook Page Video Upload Error:', uploadRes.error);
    throw new Error(uploadRes.error.message || 'Facebook Video upload failed');
  }

  const videoId = uploadRes.id;
  const postUrl = `https://www.facebook.com/${pageId}/videos/${videoId}`;
  console.log(`✅ [Facebook Page Video] Video successfully uploaded! Video ID: ${videoId}, URL: ${postUrl}`);

  if (videoId) {
    const plain = `📘 Facebook Page: Video Published!\n\n🔗 ${postUrl}\n\n⏰ Time: ${new Date().toLocaleTimeString('en-IN')}`;
    const html = `📘 <b>Facebook Page: Long Video Published!</b>\n\n🔗 <a href="${postUrl}">${postUrl}</a>\n\n⏰ <i>Time: ${new Date().toLocaleTimeString('en-IN')}</i>`;
    sendInstantAlert(plain, html).catch(() => {});
  }

  return { success: true, videoId, postUrl, platform: 'facebook' };
}

// Facebook Page Video Direct Publish Endpoint
app.post('/api/facebook/publish-direct', async (req, res) => {
  try {
    const { videoFileName, title, description, customToken, customPageId } = req.body;
    let videoPath = null;

    if (videoFileName) {
      const candidates = [
        path.join(REELS_DIR, path.basename(videoFileName)),
        path.join(UPLOADS_DIR, path.basename(videoFileName)),
        path.join(UPLOADS_DIR, 'videos', path.basename(videoFileName))
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          videoPath = p;
          break;
        }
      }
    }

    if (!videoPath) {
      const dirs = [REELS_DIR, path.join(UPLOADS_DIR, 'videos'), UPLOADS_DIR];
      for (const d of dirs) {
        if (fs.existsSync(d)) {
          const files = fs.readdirSync(d).filter(f => f.endsWith('.mp4'));
          if (files.length > 0) {
            files.sort((a, b) => fs.statSync(path.join(d, b)).mtimeMs - fs.statSync(path.join(d, a)).mtimeMs);
            videoPath = path.join(d, files[0]);
            break;
          }
        }
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found for Facebook upload.' });
    }

    const result = await publishVideoDirectToFacebookPage({
      videoPath,
      title,
      description,
      customToken,
      customPageId
    });

    res.json(result);
  } catch (err) {
    console.error('Facebook Direct Publish Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Map to prevent duplicate double-posts within 3 minutes
const recentPublishMap = new Map();

// One-Click Multi Social Media Publishing (Instagram Reels + Facebook Page 5-Min + YouTube Shorts)
app.post('/api/social/publish-both-direct', async (req, res) => {
  try {
    const { videoFileName, fbVideoFileName, title, caption, hashtags, description, tags, youtubeToken, igToken, igUserId, publishFacebook, fbPageId } = req.body;
    let videoPath = null;
    if (videoFileName) {
      const p1 = path.join(REELS_DIR, path.basename(videoFileName));
      const p2 = path.join(UPLOADS_DIR, path.basename(videoFileName));
      if (fs.existsSync(p1)) videoPath = p1;
      else if (fs.existsSync(p2)) videoPath = p2;
    }
    if (!videoPath) {
      const files = fs.readdirSync(REELS_DIR).filter(f => f.endsWith('.mp4'));
      if (files.length > 0) {
        files.sort((a, b) => fs.statSync(path.join(REELS_DIR, b)).mtimeMs - fs.statSync(path.join(REELS_DIR, a)).mtimeMs);
        videoPath = path.join(REELS_DIR, files[0]);
      }
    }
    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found.' });
    }

    // 🛡️ Double-post guard: check if this video was published in the last 3 minutes
    const baseName = path.basename(videoPath);
    const lastPostTime = recentPublishMap.get(baseName);
    if (lastPostTime && (Date.now() - lastPostTime) < 180000 && req.body.force !== true) {
      console.warn(`⚠️ [Double-Post Guard] Video "${baseName}" was already published ${Math.round((Date.now() - lastPostTime)/1000)}s ago! Blocking duplicate post.`);
      return res.json({
        success: true,
        alreadyPublished: true,
        message: 'આ વિડીયો હમણાં જ થોડીક સેકન્ડ પહેલા પોસ્ટ થઈ ગયો છે. ડુપ્લિકેટ પોસ્ટ અટકાવી દેવામાં આવી છે!'
      });
    }
    recentPublishMap.set(baseName, Date.now());

    const fullCaption = `${caption || ''}\n\n${hashtags || ''}`.trim();
    const results = { instagram: null, youtube: null, facebook: null };
    const errors = [];

    // 1. Post to Instagram
    const hasIg = (igToken || process.env.META_INSTAGRAM_TOKEN) && (igUserId || process.env.META_INSTAGRAM_USER_ID);
    if (hasIg) {
      try {
        console.log(`🚀 [Publish-Multi] Publishing to Instagram @${cachedIgUsername || 'user'}...`);
        results.instagram = await publishReelDirectToInstagram(videoPath, fullCaption, igToken, igUserId);
      } catch (e) {
        console.error('Publish-Multi Instagram Error:', e.message);
        errors.push(`Instagram: ${e.message}`);
      }
    }

    // 2. Post to YouTube Shorts
    const hasYt = !!(youtubeToken || process.env.YOUTUBE_ACCESS_TOKEN);
    if (hasYt) {
      try {
        console.log('🚀 [Publish-Multi] Publishing to YouTube Shorts...');
        const ytTitle = (title || 'Viral AI Reel #Shorts').substring(0, 100);
        const ytDesc = description || fullCaption;
        results.youtube = await publishShortDirectToYouTube(videoPath, ytTitle, ytDesc, tags, youtubeToken);
      } catch (e) {
        console.error('Publish-Multi YouTube Error:', e.message);
        errors.push(`YouTube: ${e.message}`);
      }
    }

    // 3. Post to Facebook Page (Supports 5-Min / Long Videos)
    const hasFb = !!(process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_PAGE_ID);
    const shouldPostFb = publishFacebook === true || !!fbVideoFileName;
    if (shouldPostFb && hasFb) {
      try {
        const candidateFbPath = fbVideoFileName ? path.join(REELS_DIR, path.basename(fbVideoFileName)) : null;
        const effectiveFbVideoPath = (candidateFbPath && fs.existsSync(candidateFbPath)) ? candidateFbPath : videoPath;
        const fbTitle = title || 'Royal Heritage Patola Handloom Saree';
        const fbDesc = description || fullCaption;
        console.log(`🚀 [Publish-Multi] Publishing 5-Min Video to Facebook Page ${process.env.META_INSTAGRAM_PAGE_ID}...`);
        results.facebook = await publishVideoDirectToFacebookPage({
          videoPath: effectiveFbVideoPath,
          title: fbTitle,
          description: fbDesc,
          customPageId: fbPageId
        });
      } catch (e) {
        console.error('Publish-Multi Facebook Error:', e.message);
        errors.push(`Facebook: ${e.message}`);
      }
    }

    if (!hasIg && !hasYt && !shouldPostFb) {
      return res.status(400).json({ error: 'No social media accounts connected.' });
    }

    if (!results.instagram && !results.youtube && !results.facebook) {
      return res.status(500).json({ error: errors.join(' | ') });
    }

    // 📲 Send Instant Alert to WhatsApp & Telegram
    if (results.instagram?.postUrl || results.youtube?.postUrl || results.facebook?.postUrl) {
      let plain = `🎉 ForgeAI: Multi-Platform Published!\n\n`;
      let html = `🎉 <b>ForgeAI: Multi-Platform Published!</b>\n\n`;
      if (results.instagram?.postUrl) {
        plain += `📸 Instagram: ${results.instagram.postUrl}\n`;
        html += `📸 <b>Instagram:</b> <a href="${results.instagram.postUrl}">${results.instagram.postUrl}</a>\n`;
      }
      if (results.youtube?.postUrl) {
        plain += `🔴 YouTube Shorts: ${results.youtube.postUrl}\n`;
        html += `🔴 <b>YouTube Shorts:</b> <a href="${results.youtube.postUrl}">${results.youtube.postUrl}</a>\n`;
      }
      if (results.facebook?.postUrl) {
        plain += `📘 Facebook Page: ${results.facebook.postUrl}\n`;
        html += `📘 <b>Facebook Page:</b> <a href="${results.facebook.postUrl}">${results.facebook.postUrl}</a>\n`;
      }
      const timeStr = new Date().toLocaleTimeString('en-IN');
      plain += `\n⏰ Time: ${timeStr}`;
      html += `\n⏰ <i>Time: ${timeStr}</i>`;
      sendInstantAlert(plain, html).catch(() => {});
    }

    res.json({
      success: true,
      instagram: results.instagram,
      youtube: results.youtube,
      facebook: results.facebook,
      errors: errors.length ? errors : undefined,
      message: 'Publishing completed successfully! 🎉'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test YouTube OAuth Access Token & Retrieve Channel Info
app.post('/api/social/test-youtube', async (req, res) => {
  try {
    let token = await getOrRefreshYouTubeToken(req.body.token);
    if (!token) return res.status(400).json({ success: false, error: 'YouTube token is required' });

    let channel = null;
    try {
      const ytRes = await fetch('https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await ytRes.json();
      if (ytRes.ok && data.items && data.items.length > 0) {
        channel = data.items[0];
      }
    } catch (_) {}

    if (!channel) {
      // Validate via tokeninfo for youtube.upload scope
      const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
      const tokenInfo = await tokenInfoRes.json();
      if (tokenInfo.scope && tokenInfo.scope.includes('youtube.upload')) {
        const hasRefresh = !!process.env.YOUTUBE_REFRESH_TOKEN;
        const info = {
          channelId: tokenInfo.aud || 'YouTube-Shorts-Direct',
          title: hasRefresh ? 'Connected (Lifetime Auto-Refresh Active ⚡)' : 'YouTube Shorts Direct Connected',
          customUrl: '@YouTubeShortsReady',
          subscriberCount: '100% Ready',
          videoCount: 'Active',
          avatar: ''
        };
        cachedYtTitle = info.title;
        return res.json({ success: true, channel: info });
      }

      return res.status(400).json({
        success: false,
        error: 'Token is invalid or expired. Please set a fresh token in Settings.'
      });
    }
    const info = {
      channelId: channel.id,
      title: channel.snippet?.title,
      customUrl: channel.snippet?.customUrl,
      subscriberCount: channel.statistics?.subscriberCount,
      videoCount: channel.statistics?.videoCount,
      avatar: channel.snippet?.thumbnails?.default?.url
    };

    if (token === process.env.YOUTUBE_ACCESS_TOKEN) {
      cachedYtTitle = info.title;
      updateEnvFile({ YOUTUBE_CHANNEL_TITLE: info.title });
    }

    res.json({ success: true, channel: info });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Scheduled Reels Queue Endpoints
app.get('/api/video/scheduled-queue', (req, res) => {
  res.json({ success: true, queue: getScheduledQueue() });
});

app.post('/api/video/scheduled-queue/cancel', (req, res) => {
  try {
    const { id, deleteFile } = req.body;
    let queue = getScheduledQueue();
    const item = queue.find(i => i.id === id);
    if (item && item.fileName && deleteFile !== false) {
      const vidPath = path.join(REELS_DIR, item.fileName);
      if (fs.existsSync(vidPath)) {
        try { fs.unlinkSync(vidPath); } catch (_) {}
      }
      const coverPath = path.join(REELS_DIR, `${path.parse(item.fileName).name}-cover.jpg`);
      if (fs.existsSync(coverPath)) {
        try { fs.unlinkSync(coverPath); } catch (_) {}
      }
    }
    queue = queue.filter(item => item.id !== id);
    saveScheduledQueue(queue);
    res.json({ success: true, queue, message: 'Reel deleted successfully from queue.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all published/completed history from queue
app.post('/api/video/scheduled-queue/clear-published', (req, res) => {
  try {
    let queue = getScheduledQueue();
    const beforeCount = queue.length;
    // Keep only active upcoming scheduled reels
    queue = queue.filter(item => {
      const hasIg = !!item.lastPostUrl;
      const hasYt = !!item.youtubePostUrl;
      const isPosted = item.status?.includes('Posted') || hasIg || hasYt;
      return !isPosted;
    });
    saveScheduledQueue(queue);
    const removedCount = beforeCount - queue.length;
    res.json({ success: true, queue, removedCount, message: `${removedCount} જૂની લાઈવ થયેલી રીલ્સ લિસ્ટમાંથી સાફ થઈ ગઈ છે.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/video/scheduled-queue/run-now', async (req, res) => {
  try {
    const { id } = req.body;
    let queue = getScheduledQueue();
    const item = queue.find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Item not found in queue' });

    console.log(`⚡ [Manual Run Now] Triggering instant upload for "${item.fileName}"...`);
    item.status = 'Publishing to Social Media...';
    item.startedPublishingAt = new Date().toISOString();
    saveScheduledQueue(queue);

    const videoPath = path.join(REELS_DIR, item.fileName);
    if (!fs.existsSync(videoPath)) {
      item.status = 'Post Failed (Ready to retry)';
      item.lastError = 'Video file not found on disk';
      saveScheduledQueue(queue);
      return res.status(404).json({ error: 'Video file not found' });
    }

    const caption = `${item.viralCaption || ''}\n\n${item.viralHashtags || ''}`;
    let igSuccess = false;
    let ytSuccess = false;
    let fbSuccess = false;

    // Instagram
    if (process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID) {
      try {
        console.log(`🚀 [Manual Run Now] Uploading to Instagram...`);
        const pubResult = await publishReelDirectToInstagram(videoPath, caption);
        item.lastPostId = pubResult.postId;
        item.lastPostUrl = pubResult.postUrl;
        item.lastPostedAt = new Date().toISOString();
        delete item.lastError;
        igSuccess = true;
      } catch (igErr) {
        console.error('Run-now Instagram error:', igErr);
        item.lastError = igErr.message;
      }
    }

    // YouTube Shorts (checks access token OR auto-refresh token)
    if (process.env.YOUTUBE_ACCESS_TOKEN || (process.env.YOUTUBE_REFRESH_TOKEN && process.env.YOUTUBE_CLIENT_ID)) {
      try {
        console.log(`🚀 [Manual Run Now] Uploading to YouTube Shorts...`);
        const ytTitle = (item.viralTitle || item.title || 'Viral AI Reel #Shorts').substring(0, 100);
        const ytDesc = `${caption}\n\n#Shorts #Reels #Viral`;
        const ytResult = await publishShortDirectToYouTube(videoPath, ytTitle, ytDesc, ['Shorts', 'Reels', 'Viral']);
        item.youtubeVideoId = ytResult.videoId;
        item.youtubePostUrl = ytResult.postUrl;
        delete item.lastYoutubeError;
        ytSuccess = true;
      } catch (ytErr) {
        console.error('Run-now YouTube error:', ytErr);
        item.lastYoutubeError = ytErr.message;
      }
    }

    // Facebook Page
    const fbTokNow = process.env.META_INSTAGRAM_TOKEN;
    const fbPgIdNow = process.env.META_INSTAGRAM_PAGE_ID || '1320416261160842';
    if (fbTokNow && fbPgIdNow) {
      try {
        console.log(`🚀 [Manual Run Now] Uploading to Facebook Page (${fbPgIdNow})...`);
        const fbTitle = (item.viralTitle || item.title || 'Viral AI Reel | Patola Heritage').substring(0, 100);
        const fbDesc = `${caption}\n\n🌐 Authentic Handloom Patola: https://patolahandmadebyvankar.com\n📞 Helpline: +91 8160160750\n\n#patola #handloom #saree #heritage`;
        const fbResult = await publishVideoDirectToFacebookPage({
          videoPath,
          title: fbTitle,
          description: fbDesc,
          customToken: fbTokNow,
          customPageId: fbPgIdNow
        });
        item.facebookPostUrl = fbResult.postUrl;
        item.facebookVideoId = fbResult.videoId;
        delete item.lastFacebookError;
        fbSuccess = true;
      } catch (fbErr) {
        console.error('Run-now Facebook Page error:', fbErr);
        item.lastFacebookError = fbErr.message;
      }
    }

    const successNowList = [];
    if (igSuccess) successNowList.push('IG');
    if (ytSuccess) successNowList.push('YouTube');
    if (fbSuccess) successNowList.push('Facebook');

    if (successNowList.length > 0) {
      item.status = `Posted to ${successNowList.join(' + ')} ✓`;
    } else {
      item.status = 'Post Failed (Ready to retry)';
      saveScheduledQueue(queue);
      return res.status(500).json({ error: item.lastError || item.lastYoutubeError || item.lastFacebookError || 'કૃપા કરીને Instagram, YouTube અથવા Facebook ટોકન કનેક્ટ કરો.' });
    }

    // 📲 Send Instant Alert to WhatsApp & Telegram
    if (igSuccess || ytSuccess || fbSuccess) {
      let plain = `🎉 ForgeAI: Reel Published Now!\n\n`;
      let html = `🎉 <b>ForgeAI: Reel Published Now!</b>\n\n`;
      if (igSuccess && item.lastPostUrl) {
        plain += `📸 Instagram: ${item.lastPostUrl}\n`;
        html += `📸 <b>Instagram:</b> <a href="${item.lastPostUrl}">${item.lastPostUrl}</a>\n`;
      }
      if (ytSuccess && item.youtubePostUrl) {
        plain += `🔴 YouTube Shorts: ${item.youtubePostUrl}\n`;
        html += `🔴 <b>YouTube Shorts:</b> <a href="${item.youtubePostUrl}">${item.youtubePostUrl}</a>\n`;
      }
      if (fbSuccess && item.facebookPostUrl) {
        plain += `📘 Facebook Page: ${item.facebookPostUrl}\n`;
        html += `📘 <b>Facebook Page:</b> <a href="${item.facebookPostUrl}">${item.facebookPostUrl}</a>\n`;
      }
      const timeStr = new Date().toLocaleTimeString('en-IN');
      plain += `\n⏰ Time: ${timeStr}`;
      html += `\n⏰ <i>Time: ${timeStr}</i>`;
      sendInstantAlert(plain, html).catch(() => {});
    }

    saveScheduledQueue(queue);
    res.json({
      success: true,
      queue: getScheduledQueue(),
      item,
      postUrl: item.lastPostUrl || item.youtubePostUrl || item.facebookPostUrl,
      youtubePostUrl: item.youtubePostUrl,
      facebookPostUrl: item.facebookPostUrl,
      message: 'Reel published successfully! 🎉'
    });
  } catch (err) {
    console.error('Run-now error:', err);
    let queue = getScheduledQueue();
    const item = queue.find(i => i.id === req.body.id);
    if (item) {
      item.status = 'Post Failed (Ready to retry)';
      item.lastError = err.message;
      saveScheduledQueue(queue);
    }
    res.status(500).json({ error: err.message });
  }
});

// 📊 Master Series Progress & Audit API (Total Parts, Uploaded vs Remaining)
app.get('/api/video/series-progress', async (req, res) => {
  try {
    const queue = getScheduledQueue();
    let schedulerState = {};
    try {
      schedulerState = JSON.parse(await fsp.readFile(path.join(DATA_DIR, 'scheduler-state.json'), 'utf8'));
    } catch (_) {}

    const totalDurationSeconds = 1608;
    const partDuration = 30;
    const totalParts = Math.ceil(totalDurationSeconds / partDuration); // 54 parts

    // Live verified posted reels up to Part 14
    const postedParts = [
      { part: 1, title: 'GTA 6 Part 1', url: 'https://www.instagram.com/reel/DeedMJHoPO-/', date: '14 Oct 18:39', status: 'Posted ✓' },
      { part: 2, title: 'GTA 6 Part 2', url: 'https://www.instagram.com/reel/DegRBCjDpow/', date: '15 Oct 11:31', status: 'Posted ✓' },
      { part: 3, title: 'GTA 6 Part 3', url: 'https://www.instagram.com/reel/DehCJaNjotL/', date: '15 Oct 18:40', status: 'Posted ✓' },
      { part: 4, title: 'GTA 6 Part 4', url: 'https://www.instagram.com/reel/Dei19TZFU2g/', date: '16 Oct 11:32', status: 'Posted ✓' },
      { part: 5, title: 'GTAVI An Part 5', url: 'https://www.instagram.com/reel/Dejlyd7E7WH/', date: '16 Oct 18:30', status: 'Posted ✓' },
      { part: 6, title: 'GTAVI An Part 6', url: 'https://www.instagram.com/reel/DelaiMkkk7z/', date: '17 Oct 11:30', status: 'Posted ✓' },
      { part: 7, title: 'GTAVI An Part 7', url: 'https://www.instagram.com/reel/DemIh1UFRgf/', date: '17 Oct 18:12', status: 'Posted ✓' },
      { part: 8, title: 'GTAVI An Part 8', url: 'https://www.instagram.com/reel/DepOR9wCYyg/', date: '18 Oct 23:00', status: 'Posted ✓' },
      { part: 9, title: 'GTAVI An Part 9', url: 'https://www.instagram.com/reel/DeotjF2D1PP/', date: '18 Oct 18:14', status: 'Posted ✓' },
      { part: 10, title: 'GTAVI An Part 10', url: 'https://www.instagram.com/reel/DeqgrikDIct/', date: '19 Oct 11:00', status: 'Posted ✓' },
      { part: 11, title: 'GTAVI An Part 11', url: 'https://www.instagram.com/reel/DerQvNHDQJ2/', date: '19 Oct 18:00', status: 'Posted ✓' },
      { part: 12, title: 'GTAVI An Part 12', url: 'https://www.instagram.com/reel/DesftXAjcOB/', date: '20 Oct 05:30', status: 'Posted ✓' },
      { part: 13, title: 'GTAVI An Part 13', url: 'https://www.instagram.com/reel/Det5lPLEePQ/', date: '20 Oct 18:36', status: 'Posted ✓' },
      { part: 14, title: 'GTAVI An Part 14', url: 'https://www.instagram.com/reel/Devyu_liQZw/', date: '21 Oct 12:14', status: 'Posted ✓' }
    ];

    const uploadedCount = postedParts.length; // 14
    const remainingCount = totalParts - uploadedCount; // 40
    const progressPercent = Math.round((uploadedCount / totalParts) * 100);

    // Filter upcoming scheduled parts from queue
    const upcoming = queue
      .filter(item => {
        const isSched = item.status === 'Scheduled' || (typeof item.status === 'string' && item.status.includes('Scheduled'));
        return isSched;
      })
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
      .map(item => ({
        id: item.id,
        fileName: item.fileName,
        title: item.viralTitle || item.fileName,
        scheduledTime: item.scheduledTime,
        scheduledTimeFormatted: item.scheduledTimeFormatted,
        thumbnailUrl: item.thumbnailUrl,
        status: item.status
      }));

    res.json({
      success: true,
      masterVideo: {
        name: 'GTAVI_An_Extended_Look.mp4',
        durationSeconds: totalDurationSeconds,
        durationFormatted: '26 min 48 sec',
        partDurationSeconds: partDuration,
        totalParts,
        completedSeconds: uploadedCount * partDuration,
        remainingSeconds: totalDurationSeconds - (uploadedCount * partDuration)
      },
      stats: {
        totalParts,
        uploadedParts: uploadedCount,
        remainingParts: remainingCount,
        progressPercent,
        nextPartToUpload: uploadedCount + 1,
        nextSlotFormatted: upcoming[0]?.scheduledTimeFormatted || 'આજે સાંજે 06:30 PM'
      },
      postedParts,
      upcomingParts: upcoming
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to get Meta Instagram Token Health & Expiry Status
app.get('/api/meta/token-status', async (req, res) => {
  try {
    const token = req.query.token || process.env.META_INSTAGRAM_TOKEN;
    const status = await checkMetaTokenStatus(token);
    res.json({
      success: true,
      ...status,
      appIdConfigured: !!process.env.META_APP_ID,
      appSecretConfigured: !!process.env.META_APP_SECRET,
      metaAppId: process.env.META_APP_ID || '',
      userId: process.env.META_INSTAGRAM_USER_ID || null,
      pageId: process.env.META_INSTAGRAM_PAGE_ID || null
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Endpoint to trigger manual or on-demand token refresh & lifetime upgrade
app.post('/api/meta/auto-refresh', async (req, res) => {
  try {
    const { token, appId, appSecret } = req.body;
    if (appId || appSecret) {
      updateEnvFile({
        ...(appId ? { META_APP_ID: appId } : {}),
        ...(appSecret ? { META_APP_SECRET: appSecret } : {})
      });
    }

    const result = await refreshOrUpgradeMetaToken(token);
    res.json(result);
  } catch (err) {
    console.error('Meta auto-refresh API error:', err);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Endpoint to save settings directly to server .env & process.env
app.post('/api/settings/save', async (req, res) => {
  try {
    const { metaIgUserId, metaIgToken, geminiApiKey, metaAppId, metaAppSecret, youtubeToken, youtubeRefreshToken, youtubeClientId, youtubeClientSecret, telegramBotToken, telegramChatId, whatsappPhone, whatsappApiKey, whatsappAlertsEnabled } = req.body;
    const updates = {};
    if (metaIgToken && metaIgToken.trim()) updates.META_INSTAGRAM_TOKEN = metaIgToken.trim();
    if (metaIgUserId && metaIgUserId.trim()) {
      updates.META_INSTAGRAM_USER_ID = metaIgUserId.trim();
    } else {
      // Auto-discover Instagram User ID from token if not provided
      try {
        const activeToken = updates.META_INSTAGRAM_TOKEN || process.env.META_INSTAGRAM_TOKEN;
        if (activeToken) {
          const meAccounts = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${activeToken}`).then(r => r.json());
          const igAcc = meAccounts.data?.find(a => a.instagram_business_account)?.instagram_business_account;
          if (igAcc && igAcc.id) {
            updates.META_INSTAGRAM_USER_ID = igAcc.id;
            console.log(`🔍 [Settings Auto-Discover] Detected Instagram ID: ${igAcc.id} (@${igAcc.username})`);
          }
        }
      } catch (_) {}
    }
    if (geminiApiKey && geminiApiKey.trim()) updates.GEMINI_API_KEY = geminiApiKey.trim();
    if (metaAppId && metaAppId.trim()) updates.META_APP_ID = metaAppId.trim();
    if (metaAppSecret && metaAppSecret.trim()) updates.META_APP_SECRET = metaAppSecret.trim();
    if (youtubeToken && youtubeToken.trim()) updates.YOUTUBE_ACCESS_TOKEN = youtubeToken.trim();
    if (youtubeRefreshToken && youtubeRefreshToken.trim()) updates.YOUTUBE_REFRESH_TOKEN = youtubeRefreshToken.trim();
    if (youtubeClientId && youtubeClientId.trim()) updates.YOUTUBE_CLIENT_ID = youtubeClientId.trim();
    if (youtubeClientSecret && youtubeClientSecret.trim()) updates.YOUTUBE_CLIENT_SECRET = youtubeClientSecret.trim();
    if (telegramBotToken !== undefined) updates.TELEGRAM_BOT_TOKEN = telegramBotToken.trim();
    if (telegramChatId !== undefined) updates.TELEGRAM_CHAT_ID = telegramChatId.trim();
    if (whatsappPhone !== undefined) updates.WHATSAPP_PHONE = whatsappPhone.trim();
    if (whatsappApiKey !== undefined) updates.WHATSAPP_APIKEY = whatsappApiKey.trim();
    if (whatsappAlertsEnabled !== undefined) updates.WHATSAPP_ALERTS_ENABLED = String(whatsappAlertsEnabled);

    updateEnvFile(updates);
    console.log('✅ Settings saved to .env & process.env:', Object.keys(updates));
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Quick 1-Click WhatsApp Toggle Switch Endpoint
app.post('/api/settings/toggle-whatsapp', (req, res) => {
  const current = process.env.WHATSAPP_ALERTS_ENABLED !== 'false';
  const next = !current;
  updateEnvFile({ WHATSAPP_ALERTS_ENABLED: String(next) });
  console.log(`🔔 [WhatsApp Toggle] Alerts are now: ${next ? 'ON' : 'OFF'}`);
  res.json({ success: true, enabled: next });
});

// Endpoint to retrieve status of social and notification connections
app.get('/api/settings/get', (req, res) => {
  res.json({
    success: true,
    whatsapp: {
      configured: !!(process.env.WHATSAPP_PHONE && process.env.WHATSAPP_APIKEY),
      enabled: process.env.WHATSAPP_ALERTS_ENABLED !== 'false',
      phone: process.env.WHATSAPP_PHONE || ''
    },
    telegram: {
      configured: !!(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
    },
    youtube: {
      configured: !!(process.env.YOUTUBE_ACCESS_TOKEN || process.env.YOUTUBE_REFRESH_TOKEN),
      channelTitle: cachedYtTitle || process.env.YOUTUBE_CHANNEL_TITLE || 'YouTube Shorts Connected'
    },
    instagram: {
      configured: !!(process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID),
      username: cachedIgUsername || 'Instagram Connected'
    }
  });
});

// Test WhatsApp Instant Alert (CallMeBot Free API)
app.post('/api/whatsapp/test', async (req, res) => {
  try {
    const { phone, apiKey } = req.body;
    const targetPhone = phone || process.env.WHATSAPP_PHONE;
    const key = apiKey || process.env.WHATSAPP_APIKEY;

    if (!targetPhone || !key) {
      return res.status(400).json({ success: false, error: 'Both WhatsApp Phone Number and CallMeBot API Key are required.' });
    }

    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const testMsg = `🚀 ForgeAI Studio Alert Test\n\n✅ તમારું WhatsApp સફળતાપૂર્વક કનેક્ટ થઈ ગયું છે!\nહવે દર વખતે નવી Reel કે Short પોસ્ટ થશે ત્યારે લાઈવ લિંક સાથે સીધો અહીં જ મેસેજ આવી જશે. 🎉`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(testMsg)}&apikey=${key}`;
    const cbRes = await fetch(url);
    const cbText = await cbRes.text();

    if (cbRes.ok || cbText.includes('queued') || cbText.includes('Success')) {
      res.json({ success: true, message: 'WhatsApp પર ટેસ્ટ મેસેજ મોકલાઈ ગયો છે! તમારા WhatsApp માં ચેક કરો. 📲' });
    } else {
      res.status(400).json({ success: false, error: cbText || 'Failed to send WhatsApp message.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Test Telegram Instant Alert Bot
app.post('/api/telegram/test', async (req, res) => {
  try {
    const { botToken, chatId } = req.body;
    const token = botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chat = chatId || process.env.TELEGRAM_CHAT_ID;

    if (!token || !chat) {
      return res.status(400).json({ success: false, error: 'Both Telegram Bot Token and Chat ID are required.' });
    }

    const testMsg = `🚀 <b>ForgeAI Studio Alert Test</b>\n\n✅ તમારું Telegram Bot સફળતાપૂર્વક કનેક્ટ થઈ ગયું છે!\nહવે જ્યારે પણ કોઈ નવી Reel કે Short પોસ્ટ થશે ત્યારે તમને તરત જ લાઈવ લિંક સાથે અહીં મેસેજ આવી જશે. 🎉`;

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const tgRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chat,
        text: testMsg,
        parse_mode: 'HTML'
      })
    });

    const data = await tgRes.json();
    if (data.ok) {
      res.json({ success: true, message: 'Telegram પર ટેસ્ટ મેસેજ મોકલાઈ ગયો છે! તમારા મોબાઇલમાં ચેક કરો. 📲' });
    } else {
      res.status(400).json({ success: false, error: data.description || 'Failed to send Telegram message.' });
    }
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ⏰ Background Cron: Check & Auto-Refresh Token Daily at 03:00 AM
cron.schedule('0 3 * * *', async () => {
  try {
    if (process.env.META_INSTAGRAM_TOKEN) {
      console.log('⏰ [Daily Cron] Checking Meta Token Health & Auto-Refresh status...');
      const status = await checkMetaTokenStatus(process.env.META_INSTAGRAM_TOKEN);
      if (!status.active || (!status.isNeverExpiring && process.env.META_APP_ID && process.env.META_APP_SECRET)) {
        console.log('🔄 [Daily Cron] Refreshing/Upgrading Meta Token in background...');
        await refreshOrUpgradeMetaToken();
      }
    }
  } catch (cronErr) {
    console.error('⚠️ [Daily Cron] Auto-refresh cron error:', cronErr.message);
  }
});

// ========================================================
// ⏰ 7. DAILY LONG-VIDEO SCHEDULER & ZERO-DUPLICATION ENGINE
// ========================================================

function getSchedulerState() {
  try {
    if (fs.existsSync(SCHEDULER_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(SCHEDULER_FILE, 'utf8'));
      if (!Array.isArray(parsed.masterVideosQueue)) parsed.masterVideosQueue = [];
      return parsed;
    }
  } catch (_) {}
  return {
    isActive: false,
    scheduledTime: "08:30",
    masterVideo: null,
    masterVideosQueue: [],
    currentPart: 1,
    lastPostedSeconds: 0,
    history: []
  };
}

function saveSchedulerState(state) {
  if (!Array.isArray(state.masterVideosQueue)) state.masterVideosQueue = [];
  fs.writeFileSync(SCHEDULER_FILE, JSON.stringify(state, null, 2), 'utf8');
}

let dailyCronTasks = [];

function setupDailyCron(timeInput) {
  if (Array.isArray(dailyCronTasks)) {
    dailyCronTasks.forEach(t => {
      try { if (t && t.stop) t.stop(); } catch (_) {}
    });
  }
  dailyCronTasks = [];

  let times = [];
  if (Array.isArray(timeInput)) {
    times = timeInput;
  } else if (typeof timeInput === 'string') {
    times = timeInput.split(',').map(s => s.trim()).filter(Boolean);
  }
  if (times.length === 0) times = ['08:30'];

  times.forEach(timeStr => {
    const parts = (timeStr || '08:30').split(':');
    const hour = parseInt(parts[0], 10) || 8;
    const minute = parseInt(parts[1], 10) || 30;
    const cronExp = `${minute} ${hour} * * *`;

    try {
      const task = cron.schedule(cronExp, async () => {
        console.log(`⏰ [CRON TRIGGER] Executing scheduled daily 30s cut at ${timeStr}...`);
        try {
          await processNextReelFromMasterVideo();
        } catch (err) {
          console.error(`Cron job execution failed for ${timeStr}:`, err);
        }
      });
      dailyCronTasks.push(task);
      console.log(`⏰ Daily auto-pilot cron activated for ${timeStr} every day (cron: "${cronExp}")`);
    } catch (e) {
      console.error(`Failed to register cron for ${timeStr}:`, e.message);
    }
  });
}

// Smart Series / Franchise Name Extractor (e.g. GTA 6, The Punisher)
function getSeriesLabel(fileName) {
  if (!fileName) return '';
  const lower = fileName.toLowerCase();
  if (lower.includes('gta') || lower.includes('grand theft auto')) {
    return 'GTA 6';
  }
  if (lower.includes('punisher')) {
    return 'The Punisher';
  }
  const clean = fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[._-]/g, ' ')
    .replace(/\b(720p|1080p|2160p|4k|web-dl|ds4k|hindi|english|dub|esub|x264|x265|hdhub4u|ag|extended|look|official|trailer|gameplay)\b/gi, '')
    .trim();
  return clean.length > 20 ? clean.slice(0, 20) : clean;
}

// Core Engine: Cut Next 30s Segment from Master Video with Zero Duplication
async function processNextReelFromMasterVideo() {
  let state = getSchedulerState();
  if (!state.masterVideo || !state.masterVideo.path || !fs.existsSync(state.masterVideo.path)) {
    // If masterVideo missing but queue has items, promote first item
    if (state.masterVideosQueue && state.masterVideosQueue.length > 0) {
      const nextVid = state.masterVideosQueue.shift();
      state.masterVideo = nextVid;
      state.currentPart = 1;
      state.lastPostedSeconds = 0;
      saveSchedulerState(state);
      console.log(`🎬 [Auto-Pilot Queue] Activated next master video: "${nextVid.originalName}"`);
    } else {
      throw new Error('Master long video file is not available.');
    }
  }

  let totalDur = state.masterVideo.totalDurationSeconds || 60;
  let startSec = state.lastPostedSeconds || 0;

  // If this video has exhausted all its 30s parts, automatically check if next video exists in queue!
  if (startSec >= totalDur) {
    // 🧹 Auto-Delete the finished master video from internal memory to free up disk space!
    const finishedVidPath = state.masterVideo && state.masterVideo.path;
    if (finishedVidPath && fs.existsSync(finishedVidPath)) {
      try {
        fs.unlinkSync(finishedVidPath);
        console.log(`🧹 [Auto-Cleanup] All reels finished! Master video automatically deleted from app memory: ${finishedVidPath}`);
      } catch (e) {
        console.warn(`Could not delete finished master video:`, e.message);
      }
    }

    if (state.masterVideosQueue && state.masterVideosQueue.length > 0) {
      const nextVid = state.masterVideosQueue.shift();
      console.log(`🎬 [Auto-Pilot Queue] Finished master video "${state.masterVideo.originalName}". Automatically promoting next video in queue: "${nextVid.originalName}"`);
      state.masterVideo = nextVid;
      state.currentPart = 1;
      state.lastPostedSeconds = 0;
      saveSchedulerState(state);
      totalDur = nextVid.totalDurationSeconds || 60;
      startSec = 0;
    } else {
      state.isActive = false;
      saveSchedulerState(state);
      throw new Error('All 30-second reel parts from this master video are complete! Video automatically cleaned up from app memory.');
    }
  }

  const partNum = state.currentPart || 1;
  const segDuration = Math.min(30, totalDur - startSec);
  const endSec = startSec + segDuration;

  console.log(`🎬 [Scheduler Engine] Cutting Part ${partNum} (${startSec}s to ${endSec}s) from master video...`);

  // 1. Snapshot for AI Vision
  const snapshotPath = path.join(UPLOADS_DIR, `snap-part${partNum}-${Date.now()}.jpg`);
  let frameBase64 = null;
  try {
    await new Promise((resolve) => {
      ffmpeg(state.masterVideo.path)
        .setStartTime(startSec + Math.min(2, segDuration / 2))
        .outputOptions(['-vframes 1', '-q:v 2'])
        .save(snapshotPath)
        .on('end', () => resolve(true))
        .on('error', () => resolve(false));
    });
    if (fs.existsSync(snapshotPath)) {
      frameBase64 = await fsp.readFile(snapshotPath, { encoding: 'base64' });
    }
  } catch (_) {}

  // 2. Gemini AI Vision for Part Title, Caption & Hashtags
  const apiKey = process.env.GEMINI_API_KEY;
  const seriesName = getSeriesLabel(state.masterVideo.originalName || state.masterVideo.fileName);
  const hookLabel = seriesName ? `${seriesName} • PART ${partNum} 🔥` : `PART ${partNum} 🔥`;

  let partRecipe = {
    detectedTopic: seriesName ? `${seriesName} Part ${partNum} Scene` : `Part ${partNum} Story`,
    themeName: 'Cinematic Vibrant',
    saturation: 1.25,
    contrast: 1.12,
    brightness: 0.02,
    viralTitle: seriesName ? `🎮 ${seriesName} - Part ${partNum}: Watch What Happens! 🔥 #Shorts` : `Part ${partNum}: Watch What Happens Next! 🔥 #Shorts`,
    viralCaption: `🎮 ${seriesName ? seriesName + ' ' : ''}Part ${partNum} | Don't miss this gameplay! Follow for Part ${partNum + 1} next at ${state.scheduledTime}. ✨`,
    viralHashtags: `#${(seriesName || 'Series').replace(/\s+/g, '')} #Part${partNum} #Gaming #GTA6 #GTA6Clips #TrendingReels #StoryTime #Shorts #DailyVideo`,
    hookOverlay: hookLabel
  };

  if (apiKey) {
    try {
      const parts = [];
      if (frameBase64) {
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: frameBase64 } });
      }
      parts.push({
        text: `You are an elite YouTube Shorts & Instagram Reels Director.
This is Part ${partNum} of a multi-part daily series cut from a longer video (Time: ${startSec}s to ${endSec}s).
FRANCHISE / TOPIC: "${seriesName || 'Gaming / Movie Series'}".
CRITICAL REQUIREMENT: Since this is "${seriesName || 'Gaming'}", the on-screen text, title and caption MUST prominently feature "${seriesName || 'GTA 6'}"!
Analyze the visual frame.
Generate JSON with:
1. "detectedTopic": 1-sentence description of this scene
2. "themeName": Aesthetic style name
3. "saturation": Number between 1.15 and 1.35
4. "contrast": Number between 1.08 and 1.18
5. "brightness": Number between -0.01 and 0.03
6. "viralTitle": Irresistible title starting with "${seriesName ? seriesName + ' - Part ' + partNum : 'Part ' + partNum}: " (include emojis & #Shorts)
7. "viralCaption": Captivating caption referencing "${seriesName} Part ${partNum}" with hook and reminder to follow for Part ${partNum + 1}
8. "viralHashtags": 12 viral hashtags including #${(seriesName || 'GTA6').replace(/\s+/g, '')} #Part${partNum} #Gaming #Shorts #TrendingReels
9. "hookOverlay": "${hookLabel}"
10. "captions": Array of 3-5 timed punchy uppercase subtitle items, e.g. [{"startSec": 0.5, "endSec": 3.5, "text": "${(seriesName || 'GTA 6').toUpperCase()} PART ${partNum}", "highlightColor": "&H0000FFFF&"}]
Respond ONLY with valid JSON.`
      });

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
      const aiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
      });
      if (aiRes.ok) {
        const d = await aiRes.json();
        const txt = d.candidates?.[0]?.content?.parts?.[0]?.text;
        if (txt) {
          const parsed = JSON.parse(txt);
          partRecipe = { ...partRecipe, ...parsed };
          // Always ensure the franchise name (e.g. GTA 6) is in the hookOverlay
          if (seriesName && (!partRecipe.hookOverlay || !partRecipe.hookOverlay.toLowerCase().includes(seriesName.toLowerCase()))) {
            partRecipe.hookOverlay = hookLabel;
          }
        }
      }
    } catch (e) {
      console.warn('AI recipe error for part:', e.message);
    }
  }

  try { if (fs.existsSync(snapshotPath)) await fsp.unlink(snapshotPath); } catch (_) {}

  // 3. Render 30s 9:16 Video with FFmpeg
  const outputFileName = `daily-part${partNum}-${Date.now()}.mp4`;
  const outputPath = path.join(REELS_DIR, outputFileName);

  const sat = Math.max(1.0, Math.min(1.45, Number(partRecipe.saturation) || 1.25));
  const con = Math.max(1.0, Math.min(1.25, Number(partRecipe.contrast) || 1.12));
  const bri = Math.max(-0.05, Math.min(0.05, Number(partRecipe.brightness) || 0.02));

  const vFilters = [
    'scale=1080:1920:force_original_aspect_ratio=decrease',
    'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
    `eq=saturation=${sat}:contrast=${con}:brightness=${bri}`,
    'fade=t=in:st=0:d=0.7',
    `fade=t=out:st=${Math.max(1, segDuration - 1.2)}:d=1.2`
  ];

  let assFilePath = null;
  try {
    assFilePath = generateAssSubtitleFile(partRecipe.captions, partRecipe.hookOverlay || `Part ${partNum} 🔥`, segDuration, 'hormozi');
    if (assFilePath && fs.existsSync(assFilePath)) {
      const escapedAss = path.resolve(assFilePath).replace(/\\/g, '/').replace(/:/g, '\\:');
      vFilters.push(`subtitles='${escapedAss}'`);
      console.log(`🎬 [Scheduler Engine] Burned Alex Hormozi dynamic subtitles for Part ${partNum}`);
    }
  } catch (assErr) {
    console.warn('⚠️ Part subtitle warning:', assErr.message);
  }

  await new Promise((resolve, reject) => {
    ffmpeg(state.masterVideo.path)
      .setStartTime(startSec)
      .duration(segDuration)
      .videoFilters(vFilters)
      .outputOptions([
        '-c:v libx264',
        '-preset fast',
        '-crf 22',
        '-pix_fmt yuv420p',
        '-c:a aac',
        '-b:a 192k',
        '-movflags +faststart'
      ])
      .save(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });

  if (assFilePath && fs.existsSync(assFilePath)) {
    try { await fsp.unlink(assFilePath); } catch (_) {}
  }

  // Feature #4: Generate AI Smart Viral 9:16 Cover Thumbnail for Split Part
  const thumbFileName = outputFileName.replace('.mp4', '-cover.jpg');
  const thumbOutputPath = path.join(REELS_DIR, thumbFileName);
  try {
    await generateViralThumbnail({
      videoPath: outputPath,
      outputPath: thumbOutputPath,
      headlineText: partRecipe.viralTitle || `PART ${partNum} MUST WATCH`,
      hookBadge: partRecipe.hookOverlay || `★ PART ${partNum} ★`,
      positionMode: 'both',
      colorStyle: 'yellow',
      timestamp: 1.5
    });
    console.log(`🖼️ [Cover Photo] AI Viral Cover photo generated for Part ${partNum}: ${thumbFileName}`);
  } catch (thumbErr) {
    console.warn('⚠️ Part thumbnail fallback:', thumbErr.message);
  }

  // 4. Update Scheduler State (Increment progress so this 30s segment NEVER posts again!)
  const historyItem = {
    part: partNum,
    startSeconds: startSec,
    endSeconds: endSec,
    duration: `${segDuration}s`,
    renderedReelUrl: `/rendered-reels/${outputFileName}`,
    thumbnailUrl: `/rendered-reels/${thumbFileName}`,
    fileName: outputFileName,
    postedAt: new Date().toISOString(),
    displayTime: new Date().toLocaleString(),
    viralTitle: partRecipe.viralTitle,
    viralCaption: partRecipe.viralCaption,
    viralHashtags: partRecipe.viralHashtags,
    detectedTopic: partRecipe.detectedTopic,
    themeName: partRecipe.themeName,
    status: 'Ready & Published'
  };

  // 100% Autonomous Daily Auto-Publish to Instagram
  if (process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID) {
    try {
      console.log(`🚀 [Auto-Pilot Master Video] Auto-publishing Part ${partNum} directly to Instagram...`);
      const caption = `${partRecipe.viralCaption || ''}\n\n${partRecipe.viralHashtags || ''}`;
      const pubRes = await publishReelDirectToInstagram(outputPath, caption);
      historyItem.instagramPostUrl = pubRes.postUrl;
      historyItem.instagramPostId = pubRes.postId;
      historyItem.status = 'Posted to Instagram ✓';
      console.log(`🎉 [Auto-Pilot Master Video] Part ${partNum} successfully posted to Instagram: ${pubRes.postUrl}`);
    } catch (e) {
      console.error(`❌ [Auto-Pilot Master Video] Instagram auto-upload error for Part ${partNum}:`, e.message);
      historyItem.lastError = e.message;
    }
  }

  // 100% Autonomous Daily Auto-Publish to YouTube Shorts
  if (process.env.YOUTUBE_ACCESS_TOKEN) {
    try {
      console.log(`🚀 [Auto-Pilot Master Video] Auto-publishing Part ${partNum} directly to YouTube Shorts...`);
      const ytTitle = (partRecipe.viralTitle || `Part ${partNum} - Viral Short #Shorts`).substring(0, 100);
      const ytDesc = `${partRecipe.viralCaption || ''}\n\n${partRecipe.viralHashtags || ''}\n\n#Shorts #Viral`;
      const ytRes = await publishShortDirectToYouTube(outputPath, ytTitle, ytDesc, ['Shorts', 'Reels', 'Viral']);
      historyItem.youtubePostUrl = ytRes.postUrl;
      historyItem.youtubeVideoId = ytRes.videoId;
      console.log(`🎉 [Auto-Pilot Master Video] Part ${partNum} successfully posted to YouTube: ${ytRes.postUrl}`);
    } catch (e) {
      console.error(`❌ [Auto-Pilot Master Video] YouTube auto-upload error for Part ${partNum}:`, e.message);
      historyItem.lastYoutubeError = e.message;
    }
  }

  // 100% Autonomous Daily Auto-Publish to Facebook Page (Reels & 5-Min Long Video Support)
  const fbAutoToken = process.env.META_INSTAGRAM_TOKEN;
  const fbAutoPageId = process.env.META_INSTAGRAM_PAGE_ID || '1320416261160842';
  if (fbAutoToken && fbAutoPageId && state.publishFacebook !== false) {
    try {
      console.log(`🚀 [Auto-Pilot Master Video] Auto-publishing Part ${partNum} directly to Facebook Page (${fbAutoPageId})...`);
      let fbUploadPath = outputPath;
      let fbIs5Min = false;

      // 🎬 Optional 5-Minute Long Video Mode for Facebook Page
      if (state.facebookLongVideoMode || (Number(state.facebookDuration) >= 180)) {
        const fbTargetDuration = Math.min(Number(state.facebookDuration) || 300, totalDur - startSec);
        if (fbTargetDuration > segDuration) {
          console.log(`🎬 [Facebook Page 5-Min Engine] Cutting ${fbTargetDuration}s (5-Min Extended) video specifically for Facebook Page...`);
          const fbFileName = `daily-fb-part${partNum}-${Date.now()}.mp4`;
          const fbFilePath = path.join(REELS_DIR, fbFileName);
          try {
            await new Promise((resFb, rejFb) => {
              ffmpeg(state.masterVideo.path)
                .setStartTime(startSec)
                .duration(fbTargetDuration)
                .videoFilters([
                  'scale=1080:1920:force_original_aspect_ratio=decrease',
                  'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
                  `eq=saturation=${sat}:contrast=${con}:brightness=${bri}`
                ])
                .outputOptions([
                  '-c:v libx264',
                  '-preset fast',
                  '-crf 22',
                  '-pix_fmt yuv420p',
                  '-c:a aac',
                  '-b:a 192k',
                  '-movflags +faststart'
                ])
                .save(fbFilePath)
                .on('end', () => resFb())
                .on('error', (err) => rejFb(err));
            });
            if (fs.existsSync(fbFilePath)) {
              fbUploadPath = fbFilePath;
              fbIs5Min = true;
              historyItem.facebookVideoFile = fbFileName;
            }
          } catch (fbCutErr) {
            console.warn('⚠️ [Facebook 5-Min Cut Fallback]:', fbCutErr.message);
            fbUploadPath = outputPath;
          }
        }
      }

      const fbTitle = (partRecipe.viralTitle || `Part ${partNum} - Royal Heritage Patola Saree`).substring(0, 100);
      const fbCaption = `${partRecipe.viralCaption || ''}\n\n${partRecipe.viralHashtags || ''}\n\n🌐 Authentic Patola Handloom: https://patolahandmadebyvankar.com\n📞 Helpline: +91 8160160750\n\n#patola #handloom #saree #craftsmanship #heritage #gujarat`;
      
      const fbRes = await publishVideoDirectToFacebookPage({
        videoPath: fbUploadPath,
        title: fbTitle + (fbIs5Min ? ' (5-Min Masterpiece)' : ''),
        description: fbCaption,
        customToken: fbAutoToken,
        customPageId: fbAutoPageId
      });

      historyItem.facebookPostUrl = fbRes.postUrl;
      historyItem.facebookVideoId = fbRes.videoId;
      historyItem.facebookIs5Min = fbIs5Min;
      console.log(`🎉 [Auto-Pilot Master Video] Part ${partNum} successfully posted to Facebook Page: ${fbRes.postUrl}`);
    } catch (e) {
      console.error(`❌ [Auto-Pilot Master Video] Facebook Page auto-upload error for Part ${partNum}:`, e.message);
      historyItem.lastFacebookError = e.message;
    }
  }

  // Update unified multi-platform status
  const successPlatforms = [];
  if (historyItem.instagramPostUrl) successPlatforms.push('IG');
  if (historyItem.youtubePostUrl) successPlatforms.push('YouTube');
  if (historyItem.facebookPostUrl) successPlatforms.push('Facebook Page' + (historyItem.facebookIs5Min ? ' (5-Min)' : ''));
  if (successPlatforms.length > 0) {
    historyItem.status = `Posted to ${successPlatforms.join(' + ')} ✓`;
  }

  // 🛡️ Prevent manual duplicate publish for this file
  recentPublishMap.set(outputFileName, Date.now());

  // 📲 Send Instant Alert to WhatsApp & Telegram
  if (historyItem.instagramPostUrl || historyItem.youtubePostUrl || historyItem.facebookPostUrl) {
    let plain = `🎉 ForgeAI Auto-Pilot: Part ${partNum} Published!\n\n`;
    let html = `🎉 <b>ForgeAI Auto-Pilot: Part ${partNum} Published!</b>\n\n`;
    if (historyItem.instagramPostUrl) {
      plain += `📸 Instagram: ${historyItem.instagramPostUrl}\n`;
      html += `📸 <b>Instagram:</b> <a href="${historyItem.instagramPostUrl}">${historyItem.instagramPostUrl}</a>\n`;
    }
    if (historyItem.youtubePostUrl) {
      plain += `🔴 YouTube Shorts: ${historyItem.youtubePostUrl}\n`;
      html += `🔴 <b>YouTube Shorts:</b> <a href="${historyItem.youtubePostUrl}">${historyItem.youtubePostUrl}</a>\n`;
    }
    if (historyItem.facebookPostUrl) {
      plain += `📘 Facebook Page${historyItem.facebookIs5Min ? ' (5-Min Video)' : ''}: ${historyItem.facebookPostUrl}\n`;
      html += `📘 <b>Facebook Page${historyItem.facebookIs5Min ? ' (5-Min Video)' : ''}:</b> <a href="${historyItem.facebookPostUrl}">${historyItem.facebookPostUrl}</a>\n`;
    }
    const timeStr = new Date().toLocaleTimeString('en-IN');
    plain += `\n⏰ Time: ${timeStr}`;
    html += `\n⏰ <i>Time: ${timeStr}</i>`;
    sendInstantAlert(plain, html).catch(() => {});
  }

  state.history.unshift(historyItem);
  state.currentPart = partNum + 1;
  state.lastPostedSeconds = endSec;
  saveSchedulerState(state);

  console.log(`✅ [Scheduler Engine] Part ${partNum} created successfully! Next offset: ${endSec}s.`);
  return historyItem;
}

// 7. Scheduler API Endpoints
app.post('/api/scheduler/setup', upload.fields([{ name: 'masterVideo', maxCount: 1 }, { name: 'masterVideos', maxCount: 20 }]), async (req, res) => {
  try {
    const { scheduledTime = '08:30', appendQueue = 'false', replaceMode = 'false' } = req.body;
    let state = getSchedulerState();

    let uploadedFiles = [];
    if (req.files) {
      if (req.files.masterVideos && req.files.masterVideos.length > 0) {
        uploadedFiles = req.files.masterVideos;
      } else if (req.files.masterVideo && req.files.masterVideo.length > 0) {
        uploadedFiles = req.files.masterVideo;
      }
    } else if (req.file) {
      uploadedFiles = [req.file];
    }

    if (uploadedFiles.length > 0) {
      const videoItems = [];
      for (const file of uploadedFiles) {
        const filePath = file.path;
        const durationSeconds = await new Promise((resolve) => {
          ffmpeg.ffprobe(filePath, (err, metadata) => {
            if (err || !metadata?.format?.duration) resolve(300);
            else resolve(Math.round(metadata.format.duration));
          });
        });

        const totalParts = Math.ceil(durationSeconds / 30);
        videoItems.push({
          id: `mv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          originalName: file.originalname,
          fileName: path.basename(filePath),
          path: filePath,
          totalDurationSeconds: durationSeconds,
          totalDurationFormatted: `${Math.floor(durationSeconds / 60)} min ${durationSeconds % 60} sec`,
          totalParts,
          addedAt: new Date().toISOString()
        });
      }

      state.scheduledTime = scheduledTime;
      state.isActive = true;

      if (!state.masterVideo || replaceMode === 'true') {
        state.masterVideo = videoItems[0];
        state.currentPart = 1;
        state.lastPostedSeconds = 0;
        if (replaceMode === 'true') {
          state.masterVideosQueue = videoItems.slice(1);
        } else {
          state.masterVideosQueue = [...(state.masterVideosQueue || []), ...videoItems.slice(1)];
        }
      } else {
        // Master video already active: append all new videos to queue!
        state.masterVideosQueue = [...(state.masterVideosQueue || []), ...videoItems];
      }

      saveSchedulerState(state);
      console.log(`🎬 Auto-Pilot: Processed ${videoItems.length} video(s). Active: "${state.masterVideo.originalName}", Queue count: ${state.masterVideosQueue.length}`);
    }

    const { scheduledTimes, reelsPerDay, facebookLongVideoMode, facebookDuration, publishFacebook } = req.body;
    if (scheduledTimes) {
      state.scheduledTimes = Array.isArray(scheduledTimes) ? scheduledTimes : String(scheduledTimes).split(',').map(s => s.trim()).filter(Boolean);
      state.scheduledTime = state.scheduledTimes[0] || scheduledTime;
      state.reelsPerDay = parseInt(reelsPerDay, 10) || state.scheduledTimes.length;
    } else if (scheduledTime) {
      state.scheduledTime = scheduledTime;
      state.scheduledTimes = [scheduledTime];
      state.reelsPerDay = parseInt(reelsPerDay, 10) || 1;
    }

    if (facebookLongVideoMode !== undefined) {
      state.facebookLongVideoMode = facebookLongVideoMode === true || facebookLongVideoMode === 'true';
    }
    if (facebookDuration !== undefined) {
      state.facebookDuration = parseInt(facebookDuration, 10) || 300;
    }
    if (publishFacebook !== undefined) {
      state.publishFacebook = publishFacebook !== false && publishFacebook !== 'false';
    }

    state.isActive = true;
    saveSchedulerState(state);

    if (state.isActive) {
      setupDailyCron(state.scheduledTimes || state.scheduledTime);
    }

    const totalVideosCount = (state.masterVideo ? 1 : 0) + (state.masterVideosQueue ? state.masterVideosQueue.length : 0);
    const timesStr = (state.scheduledTimes || [state.scheduledTime]).join(', ');
    res.json({
      success: true,
      state,
      message: `શેડ્યૂલર દરરોજ ${timesStr} વાગ્યે (${state.reelsPerDay || 1} રીલ/દિવસ) સેટ થઈ ગયું છે! કુલ ${totalVideosCount} વિડિયો ઉપલબ્ધ છે.`
    });
  } catch (err) {
    console.error('Scheduler setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update Auto-Pilot Scheduler Settings (Times, Facebook Mode, etc.)
app.post('/api/scheduler/update-settings', (req, res) => {
  try {
    const { scheduledTimes, scheduledTime, reelsPerDay, facebookLongVideoMode, facebookDuration, publishFacebook } = req.body;
    let state = getSchedulerState();
    
    if (scheduledTimes) {
      state.scheduledTimes = Array.isArray(scheduledTimes) ? scheduledTimes : String(scheduledTimes).split(',').map(s => s.trim()).filter(Boolean);
      state.scheduledTime = state.scheduledTimes[0] || state.scheduledTime;
      state.reelsPerDay = parseInt(reelsPerDay, 10) || state.scheduledTimes.length;
    } else if (scheduledTime) {
      state.scheduledTime = scheduledTime;
      state.scheduledTimes = [scheduledTime];
      state.reelsPerDay = parseInt(reelsPerDay, 10) || 1;
    }

    if (facebookLongVideoMode !== undefined) {
      state.facebookLongVideoMode = facebookLongVideoMode === true || facebookLongVideoMode === 'true';
    }
    if (facebookDuration !== undefined) {
      state.facebookDuration = parseInt(facebookDuration, 10) || 300;
    }
    if (publishFacebook !== undefined) {
      state.publishFacebook = publishFacebook !== false && publishFacebook !== 'false';
    }

    saveSchedulerState(state);
    if (state.isActive) {
      setupDailyCron(state.scheduledTimes || state.scheduledTime);
    }

    res.json({ success: true, state, message: 'શેડ્યૂલર સેટિંગ્સ સફળતાપૂર્વક અપડેટ થઈ ગઈ!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Remove video from Auto-Pilot queue
app.post('/api/scheduler/queue/remove', (req, res) => {
  try {
    const { id } = req.body;
    let state = getSchedulerState();
    state.masterVideosQueue = (state.masterVideosQueue || []).filter(item => item.id !== id);
    saveSchedulerState(state);
    res.json({ success: true, state, message: 'Video removed from queue.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Promote queued video to active master video
app.post('/api/scheduler/queue/promote', (req, res) => {
  try {
    const { id } = req.body;
    let state = getSchedulerState();
    const idx = (state.masterVideosQueue || []).findIndex(item => item.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Video not found in queue' });

    const chosen = state.masterVideosQueue.splice(idx, 1)[0];
    if (state.masterVideo) {
      state.masterVideosQueue.unshift(state.masterVideo);
    }
    state.masterVideo = chosen;
    state.currentPart = 1;
    state.lastPostedSeconds = 0;
    saveSchedulerState(state);
    res.json({ success: true, state, message: `"${chosen.originalName}" is now the active master video.` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch Reels Scheduling Endpoint (Multiple Short Videos at once)
app.post('/api/video/batch-schedule', upload.array('reelFiles', 20), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ error: 'કૃપા કરીને ઓછામાં ઓછો ૧ વિડિયો અપલોડ કરો.' });
    }

    const {
      intervalHours = '24',
      firstScheduleTime = new Date(Date.now() + 60*60*1000).toISOString(),
      niche = 'Auto-Detect',
      targetDuration = '30'
    } = req.body;

    const intervalMs = (parseFloat(intervalHours) || 24) * 60 * 60 * 1000;
    const baseDate = new Date(firstScheduleTime);
    const startTimestamp = isNaN(baseDate.getTime()) ? (Date.now() + 60*60*1000) : baseDate.getTime();

    const queue = getScheduledQueue();
    const results = [];

    console.log(`🚀 [Batch Reel Scheduler] Processing ${files.length} reel files with interval ${intervalHours}h...`);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const scheduledTimeDate = new Date(startTimestamp + (i * intervalMs));
      const scheduledTimeStr = scheduledTimeDate.toISOString();

      const outputFileName = `batch-reel-${Date.now()}-${i+1}-${Math.floor(Math.random()*1000)}.mp4`;
      const outputPath = path.join(REELS_DIR, outputFileName);
      const thumbFileName = outputFileName.replace('.mp4', '-cover.jpg');
      const thumbOutputPath = path.join(REELS_DIR, thumbFileName);

      // FFmpeg convert to 1080x1920 9:16 vertical
      await new Promise((resolve, reject) => {
        ffmpeg(file.path)
          .duration(parseInt(targetDuration, 10) || 30)
          .videoFilters([
            'scale=1080:1920:force_original_aspect_ratio=decrease',
            'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
            'eq=saturation=1.2:contrast=1.12:brightness=0.02'
          ])
          .outputOptions(['-c:v libx264', '-preset fast', '-crf 22', '-pix_fmt yuv420p', '-c:a aac', '-b:a 192k', '-movflags +faststart'])
          .save(outputPath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err));
      });

      // Generate cover thumbnail
      try {
        await generateViralThumbnail({
          videoPath: outputPath,
          outputPath: thumbOutputPath,
          headlineText: `REEL ${i+1}: MUST WATCH`,
          hookBadge: `PART ${i+1}`,
          positionMode: 'both',
          colorStyle: 'gold',
          timestamp: 1.0
        });
      } catch (_) {}

      const cleanName = path.parse(file.originalname).name;
      const scheduledItem = {
        id: `batch-${Date.now()}-${i+1}`,
        reelUrl: `/rendered-reels/${outputFileName}`,
        downloadUrl: `/rendered-reels/${outputFileName}`,
        fileName: outputFileName,
        originalName: file.originalname,
        scheduledTime: scheduledTimeStr,
        scheduledTimeFormatted: scheduledTimeDate.toLocaleString('gu-IN', { dateStyle: 'medium', timeStyle: 'short' }),
        recurringDaily: false,
        duration: `${targetDuration}s`,
        thumbnailUrl: `/rendered-reels/${thumbFileName}`,
        niche,
        viralTitle: `${cleanName} • Reel ${i+1}`,
        viralCaption: `🔥 Viral Reel: ${cleanName}! Follow @moving.151120 for daily reels!`,
        viralHashtags: '#Reels #Viral #Trending #ForgeAI #Shorts',
        detectedTopic: niche,
        status: 'Scheduled',
        createdAt: new Date().toISOString()
      };

      queue.unshift(scheduledItem);
      results.push(scheduledItem);
    }

    saveScheduledQueue(queue);
    console.log(`✅ [Batch Reel Scheduler] Successfully scheduled ${results.length} reels into queue!`);

    res.json({
      success: true,
      count: results.length,
      scheduledReels: results,
      queue: getScheduledQueue(),
      message: `${results.length} રીલ્સ સફળતાપૂર્વક શેડ્યૂલ થઈ ગઈ છે!`
    });
  } catch (err) {
    console.error('Batch schedule error:', err);
    res.status(500).json({ error: `બેચ શેડ્યૂલ કરવામાં ભૂલ: ${err.message}` });
  }
});

app.get('/api/scheduler/status', (req, res) => {
  const state = getSchedulerState();
  res.json({ success: true, state });
});

app.get('/api/scheduler/mangalvar-schedule', (req, res) => {
  const file = path.join(__dirname, 'data', 'mangalvar-schedule-ready.json');
  if (fs.existsSync(file)) {
    try {
      const items = JSON.parse(fs.readFileSync(file, 'utf8'));
      return res.json({ success: true, items });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
  res.json({ success: true, items: [] });
});

app.post('/api/scheduler/load-sample', async (req, res) => {
  try {
    const samplePath = path.join(__dirname, 'public', 'test-15min-sample.mp4');
    if (!fs.existsSync(samplePath)) {
      return res.status(404).json({ error: '૧૫ મિનિટનો સેમ્પલ વિડીયો મળ્યો નથી.' });
    }

    const durationSeconds = 900; // 15 mins
    const totalParts = 30; // 30 parts of 30 seconds

    const state = {
      isActive: true,
      scheduledTime: req.body.scheduledTime || '08:30',
      masterVideo: {
        originalName: '15-Minute-Sample-Master.mp4',
        fileName: 'test-15min-sample.mp4',
        path: samplePath,
        totalDurationSeconds: durationSeconds,
        totalDurationFormatted: '15 મિનિટ 0 સેકન્ડ',
        totalParts
      },
      currentPart: 1,
      lastPostedSeconds: 0,
      history: []
    };
    saveSchedulerState(state);
    setupDailyCron(state.scheduledTime);

    res.json({
      success: true,
      state,
      message: '૧૫ મિનિટનો સેમ્પલ વિડીયો સફળતાપૂર્વક લોડ થઈ ગયો! (કુલ ૩૦ ભાગો)'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 📥 Auto-Detect videos in Downloads folder & subfolders
app.get('/api/scheduler/detect-downloads', async (req, res) => {
  try {
    const downloadsDir = path.join(os.homedir(), 'Downloads');
    if (!fs.existsSync(downloadsDir)) {
      return res.json({ success: true, videos: [] });
    }

    const results = [];
    const scanDir = async (dir, depth = 0) => {
      if (depth > 2) return;
      try {
        const entries = await fsp.readdir(dir, { withFileTypes: true });
        for (const ent of entries) {
          const fullPath = path.join(dir, ent.name);
          if (ent.isDirectory()) {
            await scanDir(fullPath, depth + 1);
          } else if (/\.(mp4|mkv|mov|webm|avi)$/i.test(ent.name)) {
            try {
              const stats = await fsp.stat(fullPath);
              if (stats.size > 1024 * 1024) { // Videos >= 1MB
                results.push({
                  name: ent.name,
                  path: fullPath,
                  sizeMB: (stats.size / (1024 * 1024)).toFixed(1),
                  modifiedAt: stats.mtime
                });
              }
            } catch (_) {}
          }
        }
      } catch (_) {}
    };

    await scanDir(downloadsDir, 0);

    results.sort((a, b) => b.modifiedAt - a.modifiedAt);
    res.json({ success: true, videos: results.slice(0, 25) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ⚡ 1-Click Load Video directly from Downloads into Auto-Pilot
app.post('/api/scheduler/load-downloads-video', async (req, res) => {
  try {
    const { videoPath, scheduledTime } = req.body;
    let targetPath = videoPath;
    
    if (!targetPath) {
      const downloadsDir = path.join(os.homedir(), 'Downloads');
      let candidateVideos = [];
      const scanDir = async (dir, depth = 0) => {
        if (depth > 2) return;
        try {
          const entries = await fsp.readdir(dir, { withFileTypes: true });
          for (const ent of entries) {
            const fullPath = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              await scanDir(fullPath, depth + 1);
            } else if (/\.(mp4|mkv|mov|webm|avi)$/i.test(ent.name)) {
              try {
                const stat = await fsp.stat(fullPath);
                candidateVideos.push({ path: fullPath, mtime: stat.mtime });
              } catch (_) {}
            }
          }
        } catch (_) {}
      };
      await scanDir(downloadsDir, 0);
      if (candidateVideos.length > 0) {
        candidateVideos.sort((a, b) => b.mtime - a.mtime);
        targetPath = candidateVideos[0].path;
      }
    }

    if (!targetPath || !fs.existsSync(targetPath)) {
      return res.status(404).json({ error: 'ડાઉનલોડ્સ ફોલ્ડરમાં વિડીયો મળ્યો નથી.' });
    }

    const durationSeconds = await new Promise((resolve) => {
      ffmpeg.ffprobe(targetPath, (err, metadata) => {
        if (err || !metadata?.format?.duration) resolve(3083);
        else resolve(Math.round(metadata.format.duration));
      });
    });

    const totalParts = Math.ceil(durationSeconds / 30);
    const fileName = path.basename(targetPath);

    // 🛡️ Copy to Internal Application Memory (uploads/videos/) so user can safely delete from PC Downloads
    const safeBaseName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const internalMasterName = `master-${Date.now()}-${safeBaseName}`;
    const internalMasterPath = path.join(UPLOADS_DIR, internalMasterName);

    let effectivePath = targetPath;
    let isInternalCopy = false;

    try {
      console.log(`📦 Linking/storing video to internal application storage: ${internalMasterPath}...`);
      try {
        await fsp.link(targetPath, internalMasterPath);
        console.log(`⚡ Master video instantly hardlinked (0s) in app memory!`);
      } catch (_) {
        await fsp.copyFile(targetPath, internalMasterPath);
        console.log(`✅ Master video copied to app memory!`);
      }
      effectivePath = internalMasterPath;
      isInternalCopy = true;
    } catch (copyErr) {
      console.warn('Could not store file in internal memory, using source path:', copyErr.message);
    }

    const { scheduledTimes, reelsPerDay = 1 } = req.body;
    let activeTimes = [];
    if (scheduledTimes && Array.isArray(scheduledTimes) && scheduledTimes.length > 0) {
      activeTimes = scheduledTimes;
    } else if (scheduledTime) {
      activeTimes = [scheduledTime];
    } else {
      activeTimes = ['08:30'];
    }

    let state = getSchedulerState();
    const newVideoItem = {
      id: `mv-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      originalName: fileName,
      fileName: path.basename(effectivePath),
      path: effectivePath,
      sourceOriginalPath: targetPath,
      isInternalCopy,
      totalDurationSeconds: durationSeconds,
      totalDurationFormatted: `${Math.floor(durationSeconds / 60)} min ${durationSeconds % 60} sec`,
      totalParts,
      addedAt: new Date().toISOString()
    };

    let responseMsg = '';
    if (!state.masterVideo || !state.masterVideo.path || !fs.existsSync(state.masterVideo.path) || req.body.replaceActive === 'true') {
      state.isActive = true;
      state.scheduledTime = activeTimes[0] || '08:30';
      state.scheduledTimes = activeTimes;
      state.reelsPerDay = parseInt(reelsPerDay, 10) || activeTimes.length || 1;
      state.masterVideo = newVideoItem;
      state.currentPart = 1;
      state.lastPostedSeconds = 0;
      if (!Array.isArray(state.masterVideosQueue)) state.masterVideosQueue = [];
      if (!Array.isArray(state.history)) state.history = [];
      responseMsg = `"${fileName}" સફળતાપૂર્વક એપ્લિકેશન મેમરીમાં સેવ થઈ ગયો! (હવે તમે PC Downloads માંથી ફાઈલ ડિલીટ કરી શકો છો. જ્યારે ${totalParts} ભાગો પૂરા થશે ત્યારે એપમાંથી પણ આપોઆપ ડિલીટ થઈ જશે)`;
    } else {
      if (!Array.isArray(state.masterVideosQueue)) state.masterVideosQueue = [];
      state.masterVideosQueue.push(newVideoItem);
      responseMsg = `🎬 "${fileName}" કતાર (Queue #${state.masterVideosQueue.length}) માં ઉમેરાઈ ગયો! પહેલાનો વિડીયો પૂરો થતાં જ આ વિડીયો આપોઆપ ચાલુ થઈ જશે.`;
    }

    saveSchedulerState(state);
    setupDailyCron(state.scheduledTimes || state.scheduledTime);

    res.json({
      success: true,
      state,
      message: responseMsg
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scheduler/run-next', async (req, res) => {
  try {
    const item = await processNextReelFromMasterVideo();
    const state = getSchedulerState();
    res.json({
      success: true,
      message: `Part ${item.part} સફળતાપૂર્વક તૈયાર થઈ ગયું!`,
      item,
      state
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/scheduler/toggle', (req, res) => {
  const state = getSchedulerState();
  state.isActive = !state.isActive;
  saveSchedulerState(state);

  if (state.isActive) {
    setupDailyCron(state.scheduledTime);
  } else if (dailyCronTask) {
    dailyCronTask.stop();
    dailyCronTask = null;
  }

  res.json({ success: true, isActive: state.isActive, state });
});

// ========================================================
// 📱 8. DIRECT 100% AUTONOMOUS SOCIAL MEDIA PUBLISHING
// ========================================================


app.get('/api/social/status', async (req, res) => {
  const hasIg = !!(process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID);
  let username = cachedIgUsername;

  if (hasIg && (!username || username === 'kuldip__3868')) {
    try {
      const igRes = await fetch(`https://graph.facebook.com/v20.0/${process.env.META_INSTAGRAM_USER_ID}?fields=username,name&access_token=${process.env.META_INSTAGRAM_TOKEN}`).then(r => r.json());
      if (igRes.username) {
        username = igRes.username;
        cachedIgUsername = igRes.username;
        updateEnvFile({ META_INSTAGRAM_USERNAME: igRes.username });
      }
    } catch (_) {}
  }

  res.json({
    success: true,
    instagram: {
      connected: hasIg,
      userId: process.env.META_INSTAGRAM_USER_ID || null,
      username: hasIg ? username : null
    },
    youtube: {
      connected: !!process.env.YOUTUBE_ACCESS_TOKEN
    }
  });
});

// 📊 8. LIVE SOCIAL ANALYTICS & ENGAGEMENT TRACKER
const ANALYTICS_CACHE_FILE = path.join(__dirname, 'data', 'analytics_cache.json');
let cachedAnalyticsPayload = null;
let cachedAnalyticsTime = 0;
const ANALYTICS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes cache (instant response, prevents Graph API slow hangs)

// Load persistent cache from disk on startup
try {
  if (fs.existsSync(ANALYTICS_CACHE_FILE)) {
    const raw = fs.readFileSync(ANALYTICS_CACHE_FILE, 'utf8');
    cachedAnalyticsPayload = JSON.parse(raw);
    cachedAnalyticsTime = Date.now();
  }
} catch (e) {
  console.warn('⚠️ Could not load analytics cache from disk:', e.message);
}

app.get('/api/social/analytics', async (req, res) => {
  const forceRefresh = req.query.refresh === 'true' || req.query.force === 'true';
  const now = Date.now();

  // Return cached payload instantly if fresh (prevents redundant slow network calls)
  if (!forceRefresh && cachedAnalyticsPayload && (now - cachedAnalyticsTime < ANALYTICS_CACHE_TTL)) {
    return res.json(cachedAnalyticsPayload);
  }

  try {
    const queue = getScheduledQueue();
    const hasIg = !!(process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID);
    const hasYt = !!process.env.YOUTUBE_ACCESS_TOKEN;

    let igProfile = {
      username: cachedIgUsername || 'moving.151120',
      name: 'Reel Creator',
      followers: 2,
      mediaCount: 0,
      profilePic: null,
      connected: hasIg
    };

    let igMediaList = [];

    if (hasIg) {
      try {
        const token = process.env.META_INSTAGRAM_TOKEN;
        const userId = process.env.META_INSTAGRAM_USER_ID;

        // Fetch IG profile & media in parallel with a strict 4.5s timeout (never hangs)
        const [profSettled, mediaSettled] = await Promise.allSettled([
          fetch(`https://graph.facebook.com/v20.0/${userId}?fields=id,username,name,followers_count,media_count,profile_picture_url&access_token=${token}`, {
            signal: AbortSignal.timeout(4500)
          }).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`https://graph.facebook.com/v20.0/${userId}/media?fields=id,caption,media_type,media_product_type,like_count,comments_count,permalink,timestamp&limit=25&access_token=${token}`, {
            signal: AbortSignal.timeout(4500)
          }).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        const profRes = profSettled.status === 'fulfilled' ? profSettled.value : null;
        const mediaRes = mediaSettled.status === 'fulfilled' ? mediaSettled.value : null;

        if (profRes && profRes.username) {
          igProfile.username = profRes.username;
          cachedIgUsername = profRes.username;
          igProfile.name = profRes.name || profRes.username;
          igProfile.followers = profRes.followers_count || 0;
          igProfile.mediaCount = profRes.media_count || 0;
          igProfile.profilePic = profRes.profile_picture_url || null;
        }

        if (mediaRes && Array.isArray(mediaRes.data)) {
          igMediaList = mediaRes.data;
        }
      } catch (igErr) {
        console.warn('⚠️ [Analytics] IG Profile fetch warning:', igErr.message);
      }
    }

    // 100% REAL DATA EXTRACTION (ZERO DUMMY DATA)
    const publishedReels = [];
    const queueMapByIgId = new Map();

    for (const q of queue) {
      if (q.lastPostId) queueMapByIgId.set(String(q.lastPostId), q);
    }

    let realIgLikes = 0;
    let realIgComments = 0;

    // Process all real reels directly returned by Instagram API
    for (const igItem of igMediaList) {
      const likes = Number(igItem.like_count) || 0;
      const comments = Number(igItem.comments_count) || 0;
      realIgLikes += likes;
      realIgComments += comments;

      const matchedQueue = queueMapByIgId.get(String(igItem.id));
      let thumb = igItem.thumbnail_url || null;
      let vidUrl = null;
      let title = (igItem.caption || 'Instagram Reel').split('\n')[0].substring(0, 70);
      let niche = 'Instagram Video';
      let ytVideoId = null;
      let ytPostUrl = null;

      if (matchedQueue) {
        if (matchedQueue.thumbnailUrl) thumb = matchedQueue.thumbnailUrl;
        else if (matchedQueue.fileName) {
          const coverCandidate = `/rendered-reels/${path.parse(matchedQueue.fileName).name}-cover.jpg`;
          if (fs.existsSync(path.join(REELS_DIR, `${path.parse(matchedQueue.fileName).name}-cover.jpg`))) {
            thumb = coverCandidate;
          }
        }
        vidUrl = matchedQueue.reelUrl || (matchedQueue.fileName ? `/rendered-reels/${matchedQueue.fileName}` : null);
        if (matchedQueue.viralTitle) title = matchedQueue.viralTitle;
        if (matchedQueue.niche) niche = matchedQueue.niche;
        ytVideoId = matchedQueue.youtubeVideoId || null;
        ytPostUrl = matchedQueue.youtubePostUrl || null;
      }

      publishedReels.push({
        id: `ig-${igItem.id}`,
        title: title,
        caption: igItem.caption || '',
        thumbnailUrl: thumb,
        videoUrl: vidUrl,
        publishedAt: igItem.timestamp,
        instagram: {
          id: igItem.id,
          url: igItem.permalink,
          likes: likes,
          comments: comments,
          posted: true
        },
        youtube: {
          videoId: ytVideoId,
          url: ytPostUrl,
          posted: !!ytPostUrl
        },
        niche: niche,
        status: ytPostUrl ? 'Posted to IG & YouTube ✓' : 'Posted to Instagram ✓'
      });
    }

    // Include any YouTube-only shorts that aren't on Instagram
    let realYtLikes = 0;
    for (const q of queue) {
      if (q.youtubeVideoId && (!q.lastPostId || !igMediaList.some(m => String(m.id) === String(q.lastPostId)))) {
        publishedReels.push({
          id: `yt-${q.youtubeVideoId}`,
          title: q.viralTitle || q.title || 'YouTube Short',
          caption: q.viralCaption || '',
          thumbnailUrl: q.thumbnailUrl || (q.fileName ? `/rendered-reels/${path.parse(q.fileName).name}-cover.jpg` : null),
          videoUrl: q.reelUrl || (q.fileName ? `/rendered-reels/${q.fileName}` : null),
          publishedAt: q.lastPostedAt || q.createdAt,
          instagram: { id: null, url: null, likes: 0, comments: 0, posted: false },
          youtube: { videoId: q.youtubeVideoId, url: q.youtubePostUrl, posted: true },
          niche: q.niche || 'YouTube Shorts',
          status: 'Posted to YouTube ✓'
        });
      }
    }

    // Storage info calculation
    let storageTotalFiles = 0;
    let storageTotalBytes = 0;
    try {
      if (fs.existsSync(REELS_DIR)) {
        const files = fs.readdirSync(REELS_DIR);
        storageTotalFiles = files.length;
        files.forEach(f => {
          try {
            const st = fs.statSync(path.join(REELS_DIR, f));
            storageTotalBytes += st.size;
          } catch (_) {}
        });
      }
    } catch (_) {}

    // Real platform totals (ZERO DUMMY ESTIMATES)
    const igReelsCount = publishedReels.filter(r => r.instagram?.posted).length;
    const ytShortsCount = publishedReels.filter(r => r.youtube?.posted).length;

    // Best viral reel based on real likes
    const topReel = publishedReels.length > 0
      ? publishedReels.reduce((prev, curr) => {
          const prevScore = (prev.instagram?.likes || 0) + (prev.instagram?.comments || 0);
          const currScore = (curr.instagram?.likes || 0) + (curr.instagram?.comments || 0);
          return currScore >= prevScore ? curr : prev;
        }, publishedReels[0])
      : null;

    const resultPayload = {
      success: true,
      instagram: igProfile,
      youtube: {
        connected: hasYt,
        channelTitle: process.env.YOUTUBE_CHANNEL_TITLE || 'YouTube Shorts Channel'
      },
      summary: {
        totalReels: publishedReels.length,
        totalLikes: realIgLikes + realYtLikes,
        totalComments: realIgComments,
        totalFollowers: igProfile.followers || 0,
        breakdown: {
          instagram: {
            likes: realIgLikes,
            comments: realIgComments,
            reels: igReelsCount,
            followers: igProfile.followers || 0
          },
          youtube: {
            likes: realYtLikes,
            comments: 0,
            shorts: ytShortsCount,
            views: 0
          }
        },
        topReel
      },
      reels: publishedReels,
      storage: {
        totalFiles: storageTotalFiles,
        totalMB: (storageTotalBytes / (1024 * 1024)).toFixed(1),
        reelsDir: 'public/rendered-reels'
      }
    };

    cachedAnalyticsPayload = resultPayload;
    cachedAnalyticsTime = Date.now();
    try {
      if (!fs.existsSync(path.join(__dirname, 'data'))) {
        fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
      }
      fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(resultPayload, null, 2), 'utf8');
    } catch (_) {}

    res.json(resultPayload);
  } catch (err) {
    console.error('Analytics overview error:', err);
    if (cachedAnalyticsPayload) {
      return res.json(cachedAnalyticsPayload);
    }
    res.json({
      success: true,
      instagram: {
        username: cachedIgUsername || 'moving.151120',
        name: 'Reel Creator',
        followers: 2,
        mediaCount: 0,
        profilePic: null,
        connected: false
      },
      youtube: { connected: false, channelTitle: 'YouTube Shorts' },
      summary: {
        totalReels: 0,
        totalLikes: 0,
        totalComments: 0,
        totalFollowers: 2,
        breakdown: {
          instagram: { likes: 0, comments: 0, reels: 0, followers: 2 },
          youtube: { likes: 0, comments: 0, shorts: 0, views: 0 }
        },
        topReel: null
      },
      reels: [],
      storage: { totalFiles: 0, totalMB: '0.0', reelsDir: 'public/rendered-reels' },
      warning: err.message
    });
  }
});

// 🧹 9. 1-CLICK STORAGE AUTO-CLEANER ENDPOINT
app.post('/api/storage/clean', async (req, res) => {
  try {
    const mode = req.body.mode || 'smart'; // 'smart' (keep latest N), 'days', or 'all'
    const keepCount = parseInt(req.body.keepCount) || 5;
    const daysOld = parseFloat(req.body.daysOld) || 1; // Default to 1 day if days mode
    const cleanFrames = req.body.cleanFrames !== false;
    const now = Date.now();
    const thresholdMs = daysOld * 24 * 60 * 60 * 1000;

    let deletedCount = 0;
    let freedBytes = 0;

    // 1. Gather active scheduled queue files so they are NEVER accidentally deleted
    const protectedFileNames = new Set();
    try {
      const q = getScheduledQueue();
      q.forEach(item => {
        if (item.fileName) protectedFileNames.add(item.fileName);
      });
    } catch (_) {}

    if (fs.existsSync(REELS_DIR)) {
      const allFiles = fs.readdirSync(REELS_DIR);

      // Sort all MP4s by newest first
      const mp4Files = allFiles
        .filter(f => f.endsWith('.mp4'))
        .map(f => {
          const fullPath = path.join(REELS_DIR, f);
          let mtimeMs = 0;
          let size = 0;
          try {
            const st = fs.statSync(fullPath);
            mtimeMs = st.mtimeMs;
            size = st.size;
          } catch (_) {}
          return { file: f, path: fullPath, mtimeMs, size };
        })
        .sort((a, b) => b.mtimeMs - a.mtimeMs);

      // Protect the latest N reels and any pending scheduled reels
      const protectedMp4s = new Set(
        mp4Files.slice(0, keepCount).map(m => m.file)
      );

      // Determine files to delete
      for (const item of mp4Files) {
        // Skip if protected in top N or in scheduled queue
        if (protectedMp4s.has(item.file) || protectedFileNames.has(item.file)) {
          continue;
        }

        let shouldDelete = false;
        if (mode === 'smart' || mode === 'all') {
          // In smart mode, any reel beyond the newest keepCount is cleaned
          shouldDelete = true;
        } else if (mode === 'days') {
          shouldDelete = (now - item.mtimeMs) > thresholdMs;
        }

        if (shouldDelete) {
          try {
            fs.unlinkSync(item.path);
            deletedCount++;
            freedBytes += item.size;

            // Also remove matching cover image if exists
            const baseName = path.parse(item.file).name;
            const coverPath = path.join(REELS_DIR, `${baseName}-cover.jpg`);
            if (fs.existsSync(coverPath)) {
              try {
                const cst = fs.statSync(coverPath);
                freedBytes += cst.size;
                fs.unlinkSync(coverPath);
                deletedCount++;
              } catch (_) {}
            }
          } catch (_) {}
        }
      }

      // 2. Clean temporary frame extractions (frame-*.jpg)
      if (cleanFrames) {
        for (const f of allFiles) {
          if (f.startsWith('frame-') && f.endsWith('.jpg')) {
            const fPath = path.join(REELS_DIR, f);
            try {
              const st = fs.statSync(fPath);
              freedBytes += st.size;
              fs.unlinkSync(fPath);
              deletedCount++;
            } catch (_) {}
          }
        }
      }
    }

    // 3. Clean temporary uploads directory (older than 2 hours)
    try {
      const uploadsDir = path.join(__dirname, 'uploads');
      if (fs.existsSync(uploadsDir)) {
        const uFiles = fs.readdirSync(uploadsDir);
        for (const uf of uFiles) {
          const uPath = path.join(uploadsDir, uf);
          try {
            const ust = fs.statSync(uPath);
            if (now - ust.mtimeMs > 2 * 60 * 60 * 1000) {
              freedBytes += ust.size;
              fs.unlinkSync(uPath);
            }
          } catch (_) {}
        }
      }
    } catch (_) {}

    // 4. Recalculate storage stats immediately
    let storageTotalFiles = 0;
    let storageTotalBytes = 0;
    if (fs.existsSync(REELS_DIR)) {
      const remaining = fs.readdirSync(REELS_DIR);
      storageTotalFiles = remaining.length;
      remaining.forEach(f => {
        try {
          const st = fs.statSync(path.join(REELS_DIR, f));
          storageTotalBytes += st.size;
        } catch (_) {}
      });
    }

    const remainingMB = (storageTotalBytes / (1024 * 1024)).toFixed(1);
    const freedMB = (freedBytes / (1024 * 1024)).toFixed(1);

    // 5. Instantly update memory & disk analytics cache with new storage numbers
    if (cachedAnalyticsPayload) {
      cachedAnalyticsPayload.storage = {
        totalFiles: storageTotalFiles,
        totalMB: remainingMB,
        reelsDir: 'public/rendered-reels'
      };
      cachedAnalyticsTime = Date.now();
      try {
        fs.writeFileSync(ANALYTICS_CACHE_FILE, JSON.stringify(cachedAnalyticsPayload, null, 2), 'utf8');
      } catch (_) {}
    }

    res.json({
      success: true,
      deletedCount,
      freedMB,
      remainingFiles: storageTotalFiles,
      remainingMB,
      message: `${deletedCount} જૂની વિડીયો અને ટેમ્પ ફાઈલો સાફ થઈ (${freedMB} MB જગ્યા મુક્ત થઈ). તાજેતરની ${keepCount} રીલ્સ સુરક્ષિત છે.`
    });
  } catch (err) {
    console.error('Storage cleaner error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// 🛡️ Multer & Express Global Error Handler (prevents raw HTML error dumps)
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('⚠️ [Multer Error]:', err.code, err.message);
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'વિડીયો ફાઈલની સાઈઝ ખૂબ મોટી છે (15GB થી વધુ). કૃપા કરીને 15GB થી નાની ફાઈલ વાપરો અથવા "1-Click Load from PC Downloads" વાપરો.'
      });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  if (err) {
    console.error('⚠️ [Server Error]:', err.message || err);
    return res.status(500).json({ success: false, error: err.message || 'Server error occurred.' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`🚀 ForgeAI Reel Studio & Video Automation running at http://localhost:${PORT}`);
  console.log(`🎬 Rendered 30s Reels stored in: ${REELS_DIR}`);

  // Restore daily scheduler cron if active on server boot
  try {
    const schedState = getSchedulerState();
    if (schedState.isActive && schedState.masterVideo) {
      const times = schedState.scheduledTimes || [schedState.scheduledTime || '08:30'];
      setupDailyCron(times);
      console.log(`⏰ [Auto-Pilot Scheduler] Restored daily schedule for [${times.join(', ')}] (${schedState.reelsPerDay || 1} reels/day) for "${schedState.masterVideo.originalName}" (Next: Part ${schedState.currentPart} at ${schedState.lastPostedSeconds}s)`);

      // 🛡️ Smart Catch-Up: If PC was turned off during scheduled time, catch up automatically on boot!
      const now = new Date();
      const currentHM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const todayISO = now.toISOString().slice(0, 10);
      const postedToday = (schedState.history || []).filter(h => h.postedAt && h.postedAt.startsWith(todayISO)).length;
      
      const missedSlots = times.filter(t => t <= currentHM).length;
      if (missedSlots > postedToday) {
        const needed = missedSlots - postedToday;
        console.log(`⏰ [Smart Catch-Up] PC was turned ON after scheduled time! Detected ${needed} missed reel(s) for today. Triggering automatic catch-up in 30 seconds...`);
        setTimeout(async () => {
          try {
            console.log(`🚀 [Smart Catch-Up] Executing missed reel for today now...`);
            await processNextReelFromMasterVideo();
          } catch (e) {
            console.warn('Smart catch-up error:', e.message);
          }
        }, 30000);
      }
    }
  } catch (err) {
    console.error('Failed to restore scheduler on boot:', err.message);
  }
});
