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
app.use(express.static(path.join(__dirname, 'public')));

// Root directories
const GENERATED_DIR = path.join(__dirname, 'generated-projects');
const UPLOADS_DIR = path.join(__dirname, 'uploads', 'videos');
const REELS_DIR = path.join(__dirname, 'public', 'rendered-reels');
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULER_FILE = path.join(DATA_DIR, 'scheduler-state.json');
const SCHEDULED_QUEUE_FILE = path.join(DATA_DIR, 'scheduled-queue.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');
const INVOICES_FILE = path.join(DATA_DIR, 'invoices.json');
const SHOP_SETTINGS_FILE = path.join(DATA_DIR, 'shop-settings.json');
const QR_DIR = path.join(__dirname, 'public', 'uploads', 'qr');

[GENERATED_DIR, UPLOADS_DIR, REELS_DIR, DATA_DIR, QR_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage for shop UPI QR image
const qrStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, QR_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png';
    cb(null, `shop-qr-${Date.now()}${ext}`);
  }
});
const qrUpload = multer({ storage: qrStorage, limits: { fileSize: 10 * 1024 * 1024 } });

// Helper functions for persistent Stock, Invoices & Shop Profile
function getShopSettings() {
  try {
    if (fs.existsSync(SHOP_SETTINGS_FILE)) return JSON.parse(fs.readFileSync(SHOP_SETTINGS_FILE, 'utf8'));
  } catch (_) {}
  return { shopName: 'My Store', businessType: 'Retail & Fashion', phone: '', upiId: '', upiQrImage: '' };
}

function saveShopSettings(settings) {
  try {
    fs.writeFileSync(SHOP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving shop settings:', e);
  }
}

function getProducts() {
  try {
    if (fs.existsSync(PRODUCTS_FILE)) return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  } catch (_) {}
  return [];
}

function saveProducts(products) {
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving products:', e);
  }
}

function getInvoices() {
  try {
    if (fs.existsSync(INVOICES_FILE)) return JSON.parse(fs.readFileSync(INVOICES_FILE, 'utf8'));
  } catch (_) {}
  return [];
}

function saveInvoices(invoices) {
  try {
    fs.writeFileSync(INVOICES_FILE, JSON.stringify(invoices, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving invoices:', e);
  }
}

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
  limits: { fileSize: 500 * 1024 * 1024 } // 500MB max
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
    throw new Error('Meta Instagram Access Token ઉપલબ્ધ નથી.');
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
    throw new Error(`ટોકન રિફ્રેશ થઈ શક્યો નથી: ${testRes.error}`);
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
      ? `Never-Expiring Permanent Token સક્રિય થઈ ગયો છે! (Page: ${pageName || 'Connected Page'}) 🎉`
      : 'ટોકન 60 દિવસ માટે સફળતાપૂર્વક રિન્યુ થઈ ગયો છે! ✓'
  };
}

// 🛡️ PRE-UPLOAD GUARD: Check Token Before Every Reel Upload & Auto-Refresh If Invalid
async function ensureValidInstagramToken(customToken) {
  let token = customToken || process.env.META_INSTAGRAM_TOKEN;
  if (!token) {
    throw new Error('Meta Instagram Access Token ઉપલબ્ધ નથી. કૃપા કરીને Settings માં ટોકન ઉમેરો.');
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

  throw new Error(`ઇન્સ્ટાગ્રામ ટોકન માન્ય નથી: ${status.error}`);
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
function generateAssSubtitleFile(captions, hookText, durationSec = 30, styleMode = 'hormozi') {
  const assPath = path.join(os.tmpdir(), `sub-${Date.now()}-${Math.round(Math.random() * 1000)}.ass`);
  let events = '';

  const primaryCol = styleMode === 'electric-cyan' ? '&H00FFFF00&' : '&H0000FFFF&'; // Cyan or Yellow
  const accentCol = styleMode === 'electric-cyan' ? '&H0000FFFF&' : '&H0000FF00&';  // Yellow or Neon Green

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
      { start: step * 3, end: Math.min(dur, dur - 0.5), text: "FOLLOW FOR NEXT PART 🚀", col: '&H00FFFFFF&' }
    ];
    for (const d of defaults) {
      if (d.start < dur) {
        events += `Dialogue: 0,${formatAssTime(d.start)},${formatAssTime(d.end)},HormoziWord,,0,0,0,,{\\c${d.col}}${d.text}\n`;
      }
    }
  }

  const assContent = `[Script Info]
Title: Alex Hormozi Dynamic Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: HormoziWord,Arial,72,&H0000FFFF,&H00000000,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,8,3,2,60,60,380,1
Style: HormoziHook,Arial,58,&H00FFFFFF,&H00000000,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,7,2,8,60,60,220,1

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
      throw new Error('Instagram Business Account ID મળ્યો નથી.');
    }
  }

  if (!fs.existsSync(videoPath)) throw new Error('વિડીયો ફાઈલ મળી નથી.');

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
    throw new Error(initRes.error?.message || 'Meta Graph API સત્ર શરૂ કરવામાં ભૂલ આવી.');
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
    throw new Error(uploadRes.error.message || 'વિડીયો બાઈટ્સ અપલોડ કરવામાં ભૂલ આવી.');
  }

  // Step 3: Wait for Meta to process the video
  let isReady = false;
  for (let attempt = 1; attempt <= 25; attempt++) {
    await new Promise(r => setTimeout(r, 3000));
    const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${token}`).then(r => r.json());
    console.log(`⏳ [Instagram Direct] Poll attempt ${attempt}/25: ${statusRes.status_code}`);

    if (statusRes.status_code === 'FINISHED') {
      isReady = true;
      break;
    }
    if (statusRes.status_code === 'ERROR') {
      throw new Error('Meta Reels પ્રોસેસિંગમાં ભૂલ આવી.');
    }
  }

  if (!isReady) {
    throw new Error('Meta Video પ્રોસેસિંગમાં વધુ સમય લાગી રહ્યો છે.');
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
    message: 'રીલ ૧૦૦% હેન્ડ્સ-ફ્રી સીધી જ Instagram પર પબ્લિશ થઈ ગઈ છે! 🎉'
  };
}

// Concurrency Mutex Lock to PREVENT duplicate uploads
const currentlyProcessingScheduleIds = new Set();
let isSchedulerTickRunning = false;

// Background checker: Auto-post scheduled reels & handle Recurring Daily auto-posting
setInterval(async () => {
  if (isSchedulerTickRunning) return; // Prevent concurrent timer overlap
  isSchedulerTickRunning = true;

  try {
    const queue = getScheduledQueue();
    const now = new Date();
    let updated = false;

    for (const item of queue) {
      if (item.status === 'Scheduled' && item.scheduledTime) {
        const itemTime = new Date(item.scheduledTime);
        if (now >= itemTime) {
          if (currentlyProcessingScheduleIds.has(item.id)) {
            continue; // Skip: Already being uploaded by active task
          }

          currentlyProcessingScheduleIds.add(item.id);
          console.log(`⏰ [Auto-Pilot Schedule] Reel "${item.fileName}" scheduled for ${item.scheduledTime} is NOW DUE! Locking to prevent duplicate posts...`);

          // 🔒 CRITICAL: Update status and save to disk IMMEDIATELY before starting the 30-sec upload!
          item.status = 'Publishing to Instagram...';
          item.startedPublishingAt = now.toISOString();
          saveScheduledQueue(queue);

          try {
            const videoPath = path.join(REELS_DIR, item.fileName);
            const caption = `${item.viralCaption || ''}\n\n${item.viralHashtags || ''}`;
            let igSuccess = false;
            let ytSuccess = false;

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
                console.log(`🎉 [Auto-Post Engine] Reel ${item.fileName} successfully posted to Instagram: ${pubResult.postUrl}`);
              } catch (igErr) {
                console.error(`❌ [Auto-Post Engine] Instagram upload failed:`, igErr.message);
                item.lastError = igErr.message;
              }
            }

            // Direct Auto-Publish to YouTube Shorts if configured
            if (process.env.YOUTUBE_ACCESS_TOKEN) {
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

            if (igSuccess && ytSuccess) {
              item.status = 'Posted to IG & YouTube ✓';
            } else if (igSuccess) {
              item.status = 'Posted to Instagram ✓';
            } else if (ytSuccess) {
              item.status = 'Posted to YouTube ✓';
            } else if (item.lastError || item.lastYoutubeError) {
              item.status = 'Post Failed (Ready to retry)';
            } else {
              item.status = 'Ready to Post';
              item.readyAt = new Date().toISOString();
            }

            // 📲 Send Instant Alert to WhatsApp & Telegram
            if (igSuccess || ytSuccess) {
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

// Helper to sanitize Gemini response text and extract JSON
function extractJsonFromText(text) {
  let cleaned = text.trim();
  // Strip Markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/i, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\w*\s*/i, '').replace(/\s*```$/, '');
  }
  return JSON.parse(cleaned.trim());
}

// 2. Full-stack Project Generation via Gemini API
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt, techStack, apiKey: userKey, model = 'gemini-3.8-flash' } = req.body;
    const apiKey = userKey || process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(400).json({
        error: 'API Key Missing: Please provide your Gemini API Key in the settings or .env file.'
      });
    }

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Please describe what application you want to build.' });
    }

    const {
      dbEngine = 'SQL Server',
      backendFramework = 'ASP.NET Core C#',
      frontendFramework = 'React'
    } = techStack || {};

    const systemInstruction = `You are a Principal Full-Stack Software Architect and Staff Engineer.
The user wants to generate a complete, working, industry-standard full-stack web application based on their description.
Your goal is to generate:
1. Complete Database Schema (${dbEngine}) with tables, columns, primary keys, foreign keys, constraints, and realistic seed data.
2. Complete Backend Application (${backendFramework}) with Models, Repositories/Services, and REST API Controllers implementing full CRUD operations.
3. Complete Frontend Application (${frontendFramework}) with clean components, state management, modern styling, and realistic UI.
4. An interactive single-page standalone HTML preview (previewHtml) that can be rendered directly in an iframe so the user can test the UI instantly!
5. Setup & Run instructions (runGuide) with clear step-by-step guidance in simple Gujarati + English.

CRITICAL INSTRUCTIONS:
- You MUST respond ONLY with a single valid JSON object.
- DO NOT wrap with explanation text outside JSON.
- Ensure all quotes and special characters inside code strings are properly escaped so JSON.parse never fails.

JSON SCHEMA:
{
  "projectName": "slug-name-without-spaces",
  "projectTitle": "Human Friendly Title",
  "description": "Brief description of the generated app",
  "techStack": {
    "database": "${dbEngine}",
    "backend": "${backendFramework}",
    "frontend": "${frontendFramework}"
  },
  "database": {
    "fileName": "schema.sql",
    "script": "-- Full SQL script...",
    "notes": "Key database points and tables explanation"
  },
  "backend": {
    "files": [
      {
        "path": "Controllers/ExampleController.cs or server.js",
        "description": "Controller or API handler",
        "content": "// Full code..."
      },
      {
        "path": "Models/ExampleModel.cs or models/Example.js",
        "description": "Data models or entities",
        "content": "// Full code..."
      }
    ],
    "setupInstructions": "Command to install dependencies and run"
  },
  "frontend": {
    "files": [
      {
        "path": "src/App.jsx or index.html",
        "description": "Main frontend file",
        "content": "// Full code..."
      },
      {
        "path": "src/styles.css",
        "description": "Styling",
        "content": "/* Full modern CSS */"
      }
    ],
    "previewHtml": "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Live Preview</title><style>/* Embedded CSS */</style></head><body><!-- Fully working interactive mock UI with dummy data and click interactions --></body><script>// Interactive mockup JS</script></html>"
  },
  "runGuide": "Step-by-step Gujarati/English guide to run database, backend, and frontend locally."
}`;

    console.log(`\n⚡ [${new Date().toLocaleTimeString()}] Generating full-stack project for prompt: "${prompt.slice(0, 50)}..."`);
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-flash-lite-latest', 'gemini-3.5-flash', 'gemini-flash-latest'];
    let lastError = null;
    let candidateText = null;

    for (const currentModel of candidateModels) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `PROJECT REQUIREMENT:\n${prompt}\n\nPREFERRED TECH STACK:\n- Database: ${dbEngine}\n- Backend: ${backendFramework}\n- Frontend: ${frontendFramework}\n\nGenerate the complete full-stack project as defined in the JSON schema.`
                }
              ]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2
          }
        };

        const response = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorJson;
          try { errorJson = JSON.parse(errorText); } catch (_) {}
          const msg = errorJson?.error?.message || errorText || `Status ${response.status}`;
          lastError = new Error(`Model ${currentModel}: ${msg}`);
          console.warn(`Model ${currentModel} returned error: ${msg}. Trying next fallback model...`);
          continue;
        }

        const data = await response.json();
        candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (candidateText) {
          console.log(`✓ Successfully generated using model: ${currentModel}`);
          break;
        }
      } catch (reqErr) {
        lastError = reqErr;
        console.warn(`Model ${currentModel} request failed: ${reqErr.message}. Trying next fallback...`);
      }
    }

    if (!candidateText) {
      return res.status(500).json({ error: lastError?.message || 'Could not generate project with any AI model.' });
    }

    let parsedProject;
    try {
      parsedProject = extractJsonFromText(candidateText);
    } catch (parseErr) {
      console.error('Failed to parse Gemini output:', candidateText.slice(0, 500));
      return res.status(500).json({
        error: 'JSON Parsing error in generated code. Please try again.',
        raw: candidateText
      });
    }

    return res.json({ success: true, project: parsedProject });
  } catch (err) {
    console.error('Error generating project:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// 3. Save Project directly to PC disk
app.post('/api/save-project', async (req, res) => {
  try {
    const { project, targetDirectory } = req.body;
    if (!project || !project.projectName) {
      return res.status(400).json({ error: 'Invalid project data.' });
    }

    const folderName = project.projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const baseDir = targetDirectory && targetDirectory.trim() 
      ? path.resolve(targetDirectory.trim())
      : path.join(GENERATED_DIR, folderName);

    await fsp.mkdir(baseDir, { recursive: true });

    // 1. Save Database script
    if (project.database?.script) {
      const dbDir = path.join(baseDir, 'database');
      await fsp.mkdir(dbDir, { recursive: true });
      const dbFileName = project.database.fileName || 'schema.sql';
      await fsp.writeFile(path.join(dbDir, dbFileName), project.database.script, 'utf8');
    }

    // 2. Save Backend files
    if (Array.isArray(project.backend?.files)) {
      const backendDir = path.join(baseDir, 'backend');
      for (const file of project.backend.files) {
        const filePath = path.join(backendDir, file.path);
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, file.content || '', 'utf8');
      }
    }

    // 3. Save Frontend files
    if (Array.isArray(project.frontend?.files)) {
      const frontendDir = path.join(baseDir, 'frontend');
      for (const file of project.frontend.files) {
        const filePath = path.join(frontendDir, file.path);
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        await fsp.writeFile(filePath, file.content || '', 'utf8');
      }
    }

    // 4. Save Readme / Run Guide
    const readmeContent = `# ${project.projectTitle || project.projectName}
Generated by AI Full-Stack App Builder

## Overview
${project.description || ''}

## Tech Stack
- Database: ${project.techStack?.database || 'SQL'}
- Backend: ${project.techStack?.backend || 'REST API'}
- Frontend: ${project.techStack?.frontend || 'Web'}

## Setup & Run Guide
${project.runGuide || 'Follow standard setup for the chosen tech stack.'}
`;
    await fsp.writeFile(path.join(baseDir, 'README.md'), readmeContent, 'utf8');

    return res.json({
      success: true,
      savedPath: baseDir,
      message: `Project successfully saved to: ${baseDir}`
    });
  } catch (err) {
    console.error('Error saving project to disk:', err);
    return res.status(500).json({ error: err.message || 'Failed to save project.' });
  }
});

// 4. Download project as ZIP
app.post('/api/download-zip', async (req, res) => {
  try {
    const { project } = req.body;
    if (!project || !project.projectName) {
      return res.status(400).json({ error: 'Invalid project data' });
    }

    const archive = archiver('zip', { zlib: { level: 9 } });
    const filename = `${project.projectName || 'generated-app'}.zip`;

    res.attachment(filename);
    archive.pipe(res);

    // Database
    if (project.database?.script) {
      archive.append(project.database.script, { name: `database/${project.database.fileName || 'schema.sql'}` });
    }

    // Backend
    if (Array.isArray(project.backend?.files)) {
      project.backend.files.forEach(f => {
        archive.append(f.content || '', { name: `backend/${f.path}` });
      });
    }

    // Frontend
    if (Array.isArray(project.frontend?.files)) {
      project.frontend.files.forEach(f => {
        archive.append(f.content || '', { name: `frontend/${f.path}` });
      });
    }

    // Readme
    const readme = `# ${project.projectTitle || project.projectName}\n\n${project.description || ''}\n\n## Run Guide\n${project.runGuide || ''}`;
    archive.append(readme, { name: 'README.md' });

    await archive.finalize();
  } catch (err) {
    console.error('Zip generation error:', err);
    res.status(500).json({ error: 'Failed to create zip.' });
  }
});

// 5. AI Video Reel Generator & Smart Auto-Editor
app.post('/api/video/auto-edit', upload.single('videoFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'કૃપા કરીને વિડીયો ફાઈલ અપલોડ કરો.' });
    }

    const inputPath = req.file.path;
    const { niche = 'Auto-Detect (Any Video - Movies, Kids, Fashion, etc.)', targetDuration = '30', customInstructions = '', videoStyle = 'auto' } = req.body;
    const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

    console.log(`🎬 [Video AI] Processing video: ${req.file.originalname} (${(req.file.size / (1024*1024)).toFixed(1)}MB) | Niche: ${niche} | Style: ${videoStyle}`);

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
            console.log(`🤖 AI Vision Detected: "${aiDirectorRecipe.detectedTopic}"`);
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
    const maxSec = parseInt(targetDuration, 10) || 30;

    let sat = Math.max(1.0, Math.min(1.5, Number(aiDirectorRecipe.saturation) || 1.25));
    let con = Math.max(1.0, Math.min(1.3, Number(aiDirectorRecipe.contrast) || 1.12));
    let bri = Math.max(-0.1, Math.min(0.1, Number(aiDirectorRecipe.brightness) || 0.02));

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

    console.log(`🎬 Rendering 30s 9:16 Reel with Saturation: ${sat}, Contrast: ${con}...`);

    const vFilters = [
      // Scale & pad to 1080x1920 (9:16 vertical for Reels & Shorts)
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      // Color grading
      `eq=saturation=${sat}:contrast=${con}:brightness=${bri}`,
      // Fade in at 0s, fade out at end
      'fade=t=in:st=0:d=0.8',
      `fade=t=out:st=${Math.max(1, maxSec - 1.5)}:d=1.5`
    ];

    let assFilePath = null;
    if (subtitlesStyle !== 'none') {
      try {
        assFilePath = generateAssSubtitleFile(aiDirectorRecipe.captions, aiDirectorRecipe.hookOverlay, maxSec, subtitlesStyle);
        if (assFilePath && fs.existsSync(assFilePath)) {
          const escapedAss = path.resolve(assFilePath).replace(/\\/g, '/').replace(/:/g, '\\:');
          vFilters.push(`subtitles='${escapedAss}'`);
          console.log(`🎬 [Subtitles Engine] Burning Alex Hormozi dynamic subtitles (${subtitlesStyle})`);
        }
      } catch (assErr) {
        console.warn('⚠️ Subtitle generation notice:', assErr.message);
      }
    }

    // Feature #3: Background Music (BGM) Engine
    const bgmTrack = req.body.bgmTrack || 'none';
    const bgmVolume = Math.max(0.05, Math.min(1.0, parseFloat(req.body.bgmVolume) || 0.25));
    const bgmFilePath = bgmTrack !== 'none' ? path.join(__dirname, 'public', 'audio', 'bgm', `${bgmTrack}.mp3`) : null;
    const hasValidBgm = bgmFilePath && fs.existsSync(bgmFilePath);

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

    const isScheduled = req.body.isScheduled === 'true' || !!req.body.scheduledTime;
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
      duration: `${maxSec} સેકન્ડ`,
      aspectRatio: '9:16 (1080x1920) - Instagram Reels / YouTube Shorts',
      recipe: aiDirectorRecipe,
      isScheduled: !!scheduledItem,
      scheduledItem,
      scheduledQueue: getScheduledQueue()
    });

  } catch (err) {
    console.error('Video processing error:', err);
    res.status(500).json({ error: `વિડીયો પ્રોસેસ કરવામાં ભૂલ આવી: ${err.message}` });
  }
});

// 🖼️ Feature #4: AI Smart Thumbnail Studio Endpoint (Regenerate / Customize on the fly)
app.post('/api/video/generate-thumbnail', async (req, res) => {
  try {
    const { videoFileName, headlineText, hookBadge, bottomText, positionMode, fontStyle, colorStyle, timestamp } = req.body;
    if (!videoFileName) {
      return res.status(400).json({ error: 'વિડીયો ફાઈલનું નામ જરૂરી છે.' });
    }

    const cleanBase = path.basename(videoFileName);
    let videoPath = path.join(REELS_DIR, cleanBase);
    if (!fs.existsSync(videoPath)) {
      videoPath = path.join(UPLOADS_DIR, cleanBase);
    }
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'વિડીયો ફાઈલ મળી નથી.' });
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
      return res.status(500).json({ error: result.error || 'થમ્બનેઈલ બનાવવામાં નિષ્ફળતા મળી.' });
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

// 6. Social Media Publishing (YouTube Shorts & Instagram Reels)
app.post('/api/social/publish-youtube', async (req, res) => {
  try {
    const { videoFileName, title, description, accessToken } = req.body;
    if (!videoFileName) return res.status(400).json({ error: 'વિડીયો ફાઈલ પસંદ કરો.' });

    const videoPath = path.join(REELS_DIR, path.basename(videoFileName));
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'વિડીયો ફાઈલ મળી નથી.' });

    return res.json({
      success: true,
      directUploadUrl: 'https://studio.youtube.com/channel/upload',
      message: 'YouTube Studio તૈયાર છે! તમે સીધો વિડીયો અપલોડ કરી શકો છો.',
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
    if (!videoFileName) return res.status(400).json({ error: 'વિડીયો ફાઈલ પસંદ કરો.' });

    const videoPath = path.join(REELS_DIR, path.basename(videoFileName));
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'વિડીયો ફાઈલ મળી નથી.' });

    return res.json({
      success: true,
      directUploadUrl: 'https://www.instagram.com/create/style/',
      message: 'Instagram Web / App તૈયાર છે! કેપ્શન અને હેશટેગ્સ કોપી કરીને અપલોડ કરો.',
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
      return res.status(404).json({ error: 'પબ્લિશ કરવા માટે વિડીયો ફાઈલ મળી નથી.' });
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

// YouTube Data API v3 100% Direct Publishing Engine
async function publishShortDirectToYouTube(videoPath, title, description, tags, customToken) {
  const token = await getOrRefreshYouTubeToken(customToken);
  if (!token) throw new Error('YouTube Access Token ઉપલબ્ધ નથી. કૃપા કરીને સેટિંગ્સમાં ટોકન ઉમેરો.');
  if (!fs.existsSync(videoPath)) throw new Error('વિડીયો ફાઈલ મળી નથી.');

  const fileStat = await fsp.stat(videoPath);
  const videoBuffer = await fsp.readFile(videoPath);
  console.log(`🚀 [YouTube API] Starting direct upload for ${path.basename(videoPath)} (${(fileStat.size / (1024*1024)).toFixed(2)} MB)...`);

  const tagArray = tags ? (Array.isArray(tags) ? tags : String(tags).split(',').map(t => t.trim())) : ['Shorts', 'Viral', 'Trending'];

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
        title: title || 'Viral AI Reel #Shorts',
        description: description || 'Created with AI Video Director #Shorts #Reels',
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
    throw new Error(errData.error?.message || 'YouTube સત્ર શરૂ કરવામાં ભૂલ આવી. ટોકન એક્સપાયર થઈ ગઈ હોઈ શકે છે.');
  }

  const uploadUrl = initRes.headers.get('location');
  if (!uploadUrl) {
    throw new Error('YouTube Upload URL પ્રાપ્ત થયો નથી.');
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
    throw new Error(uploadData.error?.message || 'વિડીયો બાઈટ્સ અપલોડ કરવામાં ભૂલ આવી.');
  }

  const videoId = uploadData.id;
  const postUrl = `https://www.youtube.com/shorts/${videoId}`;
  console.log(`🎉 [YouTube API] Short Published Successfully! Video ID: ${videoId} -> ${postUrl}`);

  return {
    success: true,
    videoId,
    postUrl,
    message: '🎉 YouTube Short સીધું તમારી ચેનલ પર પબ્લિશ થઈ ગયું છે!'
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
      return res.status(404).json({ error: 'YouTube માટે વિડીયો ફાઈલ મળી નથી.' });
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

// One-Click Dual Social Media Publishing (Instagram Reels + YouTube Shorts simultaneously)
app.post('/api/social/publish-both-direct', async (req, res) => {
  try {
    const { videoFileName, title, caption, hashtags, description, tags, youtubeToken, igToken, igUserId } = req.body;
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
      return res.status(404).json({ error: 'વિડીયો ફાઈલ મળી નથી.' });
    }

    const fullCaption = `${caption || ''}\n\n${hashtags || ''}`.trim();
    const results = { instagram: null, youtube: null };
    const errors = [];

    // 1. Post to Instagram
    const hasIg = (igToken || process.env.META_INSTAGRAM_TOKEN) && (igUserId || process.env.META_INSTAGRAM_USER_ID);
    if (hasIg) {
      try {
        console.log(`🚀 [Publish-Both] Publishing to Instagram @${cachedIgUsername || 'user'}...`);
        results.instagram = await publishReelDirectToInstagram(videoPath, fullCaption, igToken, igUserId);
      } catch (e) {
        console.error('Publish-Both Instagram Error:', e.message);
        errors.push(`Instagram: ${e.message}`);
      }
    }

    // 2. Post to YouTube Shorts
    const hasYt = !!(youtubeToken || process.env.YOUTUBE_ACCESS_TOKEN);
    if (hasYt) {
      try {
        console.log('🚀 [Publish-Both] Publishing to YouTube Shorts...');
        const ytTitle = (title || 'Viral AI Reel #Shorts').substring(0, 100);
        const ytDesc = description || fullCaption;
        results.youtube = await publishShortDirectToYouTube(videoPath, ytTitle, ytDesc, tags, youtubeToken);
      } catch (e) {
        console.error('Publish-Both YouTube Error:', e.message);
        errors.push(`YouTube: ${e.message}`);
      }
    }

    if (!hasIg && !hasYt) {
      return res.status(400).json({ error: 'Instagram અથવા YouTube એકાઉન્ટ કનેક્ટ કરેલ નથી.' });
    }

    if (!results.instagram && !results.youtube) {
      return res.status(500).json({ error: errors.join(' | ') });
    }

    // 📲 Send Instant Alert to WhatsApp & Telegram
    if (results.instagram?.postUrl || results.youtube?.postUrl) {
      let plain = `🎉 ForgeAI: 1-Click Published!\n\n`;
      let html = `🎉 <b>ForgeAI: 1-Click Published!</b>\n\n`;
      if (results.instagram?.postUrl) {
        plain += `📸 Instagram: ${results.instagram.postUrl}\n`;
        html += `📸 <b>Instagram:</b> <a href="${results.instagram.postUrl}">${results.instagram.postUrl}</a>\n`;
      }
      if (results.youtube?.postUrl) {
        plain += `🔴 YouTube Shorts: ${results.youtube.postUrl}\n`;
        html += `🔴 <b>YouTube Shorts:</b> <a href="${results.youtube.postUrl}">${results.youtube.postUrl}</a>\n`;
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
      errors: errors.length ? errors : undefined,
      message: 'પબ્લિશિંગ પ્રક્રિયા સફળતાપૂર્વક પૂર્ણ થઈ ગઈ! 🎉'
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
        error: 'ટોકન અમાન્ય અથવા એક્સપાયર થઈ ગઈ છે. કૃપા કરીને નવી ટોકન સેટ કરો.'
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
    const { id } = req.body;
    let queue = getScheduledQueue();
    queue = queue.filter(item => item.id !== id);
    saveScheduledQueue(queue);
    res.json({ success: true, queue, message: 'શેડ્યૂલ કેન્સલ થઈ ગયું છે.' });
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

    // YouTube Shorts
    if (process.env.YOUTUBE_ACCESS_TOKEN) {
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

    if (igSuccess && ytSuccess) {
      item.status = 'Posted to IG & YouTube ✓';
    } else if (igSuccess) {
      item.status = 'Posted to Instagram ✓';
    } else if (ytSuccess) {
      item.status = 'Posted to YouTube ✓';
    } else {
      item.status = 'Post Failed (Ready to retry)';
      saveScheduledQueue(queue);
      return res.status(500).json({ error: item.lastError || item.lastYoutubeError || 'કૃપા કરીને Instagram અથવા YouTube ટોકન કનેક્ટ કરો.' });
    }

    // 📲 Send Instant Alert to WhatsApp & Telegram
    if (igSuccess || ytSuccess) {
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
      postUrl: item.lastPostUrl || item.youtubePostUrl,
      youtubePostUrl: item.youtubePostUrl,
      message: 'રીલ સફળતાપૂર્વક પબ્લિશ થઈ ગઈ છે! 🎉'
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
      return res.status(400).json({ success: false, error: 'WhatsApp Phone Number અને CallMeBot API Key બંને જરૂરી છે.' });
    }

    const cleanPhone = targetPhone.replace(/[^0-9]/g, '');
    const testMsg = `🚀 ForgeAI Studio Alert Test\n\n✅ તમારું WhatsApp સફળતાપૂર્વક કનેક્ટ થઈ ગયું છે!\nહવે દર વખતે નવી Reel કે Short પોસ્ટ થશે ત્યારે લાઈવ લિંક સાથે સીધો અહીં જ મેસેજ આવી જશે. 🎉`;

    const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(testMsg)}&apikey=${key}`;
    const cbRes = await fetch(url);
    const cbText = await cbRes.text();

    if (cbRes.ok || cbText.includes('queued') || cbText.includes('Success')) {
      res.json({ success: true, message: 'WhatsApp પર ટેસ્ટ મેસેજ મોકલાઈ ગયો છે! તમારા WhatsApp માં ચેક કરો. 📲' });
    } else {
      res.status(400).json({ success: false, error: cbText || 'WhatsApp મેસેજ મોકલવામાં ભૂલ આવી.' });
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
      return res.status(400).json({ success: false, error: 'Telegram Bot Token અને Chat ID બંને જરૂરી છે.' });
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
      res.status(400).json({ success: false, error: data.description || 'Telegram પર મેસેજ મોકલવામાં ભૂલ આવી.' });
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
      return JSON.parse(fs.readFileSync(SCHEDULER_FILE, 'utf8'));
    }
  } catch (_) {}
  return {
    isActive: false,
    scheduledTime: "08:30",
    masterVideo: null,
    currentPart: 1,
    lastPostedSeconds: 0,
    history: []
  };
}

function saveSchedulerState(state) {
  fs.writeFileSync(SCHEDULER_FILE, JSON.stringify(state, null, 2), 'utf8');
}

let dailyCronTask = null;

function setupDailyCron(timeStr) {
  if (dailyCronTask) {
    dailyCronTask.stop();
    dailyCronTask = null;
  }

  const parts = (timeStr || '08:30').split(':');
  const hour = parseInt(parts[0], 10) || 8;
  const minute = parseInt(parts[1], 10) || 30;
  const cronExp = `${minute} ${hour} * * *`;

  dailyCronTask = cron.schedule(cronExp, async () => {
    console.log(`⏰ [CRON TRIGGER] Executing scheduled daily 30s cut at ${timeStr}...`);
    try {
      await processNextReelFromMasterVideo();
    } catch (err) {
      console.error('Cron job execution failed:', err);
    }
  });

  console.log(`⏰ Daily auto-pilot cron activated for ${timeStr} every day (cron: "${cronExp}")`);
}

// Core Engine: Cut Next 30s Segment from Master Video with Zero Duplication
async function processNextReelFromMasterVideo() {
  const state = getSchedulerState();
  if (!state.masterVideo || !state.masterVideo.path || !fs.existsSync(state.masterVideo.path)) {
    throw new Error('માસ્ટર લોંગ વિડીયો ફાઈલ ઉપલબ્ધ નથી.');
  }

  const totalDur = state.masterVideo.totalDurationSeconds || 60;
  const startSec = state.lastPostedSeconds || 0;

  if (startSec >= totalDur) {
    throw new Error('આ લોંગ વિડીયોના બધા ૩૦ સેકન્ડના ભાગો પૂરા થઈ ગયા છે!');
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
  let partRecipe = {
    detectedTopic: `Part ${partNum} Story`,
    themeName: 'Cinematic Vibrant',
    saturation: 1.25,
    contrast: 1.12,
    brightness: 0.02,
    viralTitle: `Part ${partNum}: Watch What Happens Next! 🔥 #Shorts`,
    viralCaption: `Part ${partNum} | Don't miss this episode! Follow for Part ${partNum + 1} tomorrow at ${state.scheduledTime}. ✨`,
    viralHashtags: `#ViralShorts #Part${partNum} #TrendingReels #StoryTime #Shorts #DailyVideo`,
    hookOverlay: `Part ${partNum} 🔥`
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
Analyze the visual frame.
Generate JSON with:
1. "detectedTopic": 1-sentence description of this scene
2. "themeName": Aesthetic style name
3. "saturation": Number between 1.15 and 1.35
4. "contrast": Number between 1.08 and 1.18
5. "brightness": Number between -0.01 and 0.03
6. "viralTitle": Irresistible title starting with "Part ${partNum}: " (include emojis & #Shorts)
7. "viralCaption": Captivating caption referencing Part ${partNum} with hook and reminder to follow for next part
8. "viralHashtags": 12 viral hashtags including #Part${partNum} #Shorts #TrendingReels
9. "hookOverlay": "Part ${partNum} 🔥"
10. "captions": Array of 3-5 timed punchy uppercase subtitle items, e.g. [{"startSec": 0.5, "endSec": 3.5, "text": "PART ${partNum} MUST WATCH", "highlightColor": "&H0000FFFF&"}]
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
        if (txt) partRecipe = { ...partRecipe, ...JSON.parse(txt) };
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
      if (historyItem.instagramPostUrl) {
        historyItem.status = 'Posted to IG & YouTube ✓';
      } else {
        historyItem.status = 'Posted to YouTube ✓';
      }
      console.log(`🎉 [Auto-Pilot Master Video] Part ${partNum} successfully posted to YouTube: ${ytRes.postUrl}`);
    } catch (e) {
      console.error(`❌ [Auto-Pilot Master Video] YouTube auto-upload error for Part ${partNum}:`, e.message);
      historyItem.lastYoutubeError = e.message;
    }
  }

  // 📲 Send Instant Alert to WhatsApp & Telegram
  if (historyItem.instagramPostUrl || historyItem.youtubePostUrl) {
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
app.post('/api/scheduler/setup', upload.single('masterVideo'), async (req, res) => {
  try {
    const { scheduledTime = '08:30' } = req.body;
    let state = getSchedulerState();

    if (req.file) {
      const filePath = req.file.path;
      // Get duration with ffprobe
      const durationSeconds = await new Promise((resolve) => {
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err || !metadata?.format?.duration) resolve(300);
          else resolve(Math.round(metadata.format.duration));
        });
      });

      const totalParts = Math.ceil(durationSeconds / 30);

      state = {
        isActive: true,
        scheduledTime,
        masterVideo: {
          originalName: req.file.originalname,
          fileName: path.basename(filePath),
          path: filePath,
          totalDurationSeconds: durationSeconds,
          totalDurationFormatted: `${Math.floor(durationSeconds / 60)} મિનિટ ${durationSeconds % 60} સેકન્ડ`,
          totalParts
        },
        currentPart: 1,
        lastPostedSeconds: 0,
        history: []
      };
      saveSchedulerState(state);
      console.log(`🎬 New Master Video Loaded: "${req.file.originalname}" (${durationSeconds}s, ${totalParts} total 30s parts)`);
    } else {
      state.scheduledTime = scheduledTime;
      saveSchedulerState(state);
    }

    if (state.isActive) {
      setupDailyCron(state.scheduledTime);
    }

    res.json({ success: true, state, message: `શેડ્યૂલર દરરોજ સવારે ${state.scheduledTime} વાગ્યે સેટ થઈ ગયું છે!` });
  } catch (err) {
    console.error('Scheduler setup error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/scheduler/status', (req, res) => {
  const state = getSchedulerState();
  res.json({ success: true, state });
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
app.get('/api/social/analytics', async (req, res) => {
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

        // Fetch IG profile details
        const profRes = await fetch(`https://graph.facebook.com/v20.0/${userId}?fields=id,username,name,followers_count,media_count,profile_picture_url&access_token=${token}`).then(r => r.json());
        if (profRes && profRes.username) {
          igProfile.username = profRes.username;
          cachedIgUsername = profRes.username;
          igProfile.name = profRes.name || profRes.username;
          igProfile.followers = profRes.followers_count || 0;
          igProfile.mediaCount = profRes.media_count || 0;
          igProfile.profilePic = profRes.profile_picture_url || null;
        }

        // Fetch recent reels/media
        const mediaRes = await fetch(`https://graph.facebook.com/v20.0/${userId}/media?fields=id,caption,media_type,media_product_type,like_count,comments_count,permalink,timestamp&limit=25&access_token=${token}`).then(r => r.json());
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

    res.json({
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
    });
  } catch (err) {
    console.error('Analytics overview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🧹 9. 1-CLICK STORAGE AUTO-CLEANER ENDPOINT
app.post('/api/storage/clean', async (req, res) => {
  try {
    const daysOld = parseInt(req.body.daysOld) || 7;
    const now = Date.now();
    const thresholdMs = daysOld * 24 * 60 * 60 * 1000;
    let deletedCount = 0;
    let freedBytes = 0;

    if (fs.existsSync(REELS_DIR)) {
      const files = fs.readdirSync(REELS_DIR);
      // Keep at least the 5 newest reels
      const mp4Files = files.filter(f => f.endsWith('.mp4')).map(f => {
        const fullPath = path.join(REELS_DIR, f);
        const st = fs.statSync(fullPath);
        return { file: f, path: fullPath, mtimeMs: st.mtimeMs, size: st.size };
      }).sort((a, b) => b.mtimeMs - a.mtimeMs);

      const filesToConsider = mp4Files.slice(5); // Protect latest 5 reels
      for (const item of filesToConsider) {
        if (now - item.mtimeMs > thresholdMs) {
          try {
            fs.unlinkSync(item.path);
            deletedCount++;
            freedBytes += item.size;
          } catch (_) {}
        }
      }
    }

    res.json({
      success: true,
      deletedCount,
      freedMB: (freedBytes / (1024 * 1024)).toFixed(1),
      message: `${deletedCount} જૂની વિડીયો ફાઈલો સાફ થઈ (${(freedBytes / (1024 * 1024)).toFixed(1)} MB મેમરી મુક્ત થઈ).`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.post('/api/social/publish-instagram-direct', async (req, res) => {
  try {
    const { videoFileName, caption } = req.body;
    const token = req.body.accessToken || process.env.META_INSTAGRAM_TOKEN;
    let userId = req.body.igUserId || process.env.META_INSTAGRAM_USER_ID;

    if (!token) {
      return res.status(400).json({ error: 'Meta Instagram Access Token ઉપલબ્ધ નથી.' });
    }

    // Auto-discover Instagram Business Account ID if not provided
    if (!userId) {
      const meAccounts = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${token}`).then(r => r.json());
      const igAcc = meAccounts.data?.find(a => a.instagram_business_account)?.instagram_business_account;
      if (igAcc && igAcc.id) {
        userId = igAcc.id;
      } else {
        return res.status(400).json({ error: 'Instagram Business Account ID મળ્યો નથી.' });
      }
    }

    // Find video file
    let videoPath = null;
    if (videoFileName) {
      const p1 = path.join(REELS_DIR, videoFileName);
      const p2 = path.join(UPLOADS_DIR, videoFileName);
      if (fs.existsSync(p1)) videoPath = p1;
      else if (fs.existsSync(p2)) videoPath = p2;
    }

    if (!videoPath) {
      // Find latest rendered reel
      const files = fs.readdirSync(REELS_DIR).filter(f => f.endsWith('.mp4'));
      if (files.length > 0) {
        files.sort((a, b) => fs.statSync(path.join(REELS_DIR, b)).mtimeMs - fs.statSync(path.join(REELS_DIR, a)).mtimeMs);
        videoPath = path.join(REELS_DIR, files[0]);
      }
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'પબ્લિશ કરવા માટે વિડીયો ફાઈલ મળી નથી.' });
    }

    const videoBuffer = await fsp.readFile(videoPath);
    console.log(`🚀 [Instagram Direct] Uploading "${path.basename(videoPath)}" (${(videoBuffer.length / (1024*1024)).toFixed(2)} MB) to IG Account ${userId}...`);

    // Step 1: Initialize Resumable Reels Upload Session
    const initUrl = `https://graph.facebook.com/v20.0/${userId}/media`;
    const initRes = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        upload_type: 'resumable',
        caption: caption || '✨ Created with AI Reel Studio #reels',
        access_token: token
      })
    }).then(r => r.json());

    if (initRes.error) {
      console.error('Meta Media Init Error:', initRes.error);
      return res.status(400).json({ error: initRes.error.message || 'Meta Media Init Failed' });
    }

    const containerId = initRes.id;
    const uploadUri = initRes.uri;
    console.log(`📦 [Instagram Direct] Container created: ${containerId}, uploading bytes...`);

    // Step 2: Upload Binary Video Data to rupload endpoint
    const uploadRes = await fetch(uploadUri, {
      method: 'POST',
      headers: {
        'Authorization': `OAuth ${token}`,
        'offset': '0',
        'file_size': videoBuffer.length.toString()
      },
      body: videoBuffer
    }).then(r => r.json());

    if (uploadRes.error) {
      console.error('Meta Video Binary Upload Error:', uploadRes.error);
      return res.status(400).json({ error: uploadRes.error.message || 'Video binary upload failed' });
    }

    console.log(`⏳ [Instagram Direct] Binary uploaded. Waiting for Meta to transcode Reel container ${containerId}...`);

    // Step 3: Poll Container Status until FINISHED
    let isReady = false;
    for (let attempt = 1; attempt <= 30; attempt++) {
      await new Promise(r => setTimeout(r, 3000));
      const statusRes = await fetch(`https://graph.facebook.com/v20.0/${containerId}?fields=status_code,status&access_token=${token}`).then(r => r.json());
      console.log(`🔄 [Instagram Direct] Poll attempt ${attempt}/30: status_code=${statusRes.status_code}`);

      if (statusRes.status_code === 'FINISHED') {
        isReady = true;
        break;
      }
      if (statusRes.status_code === 'ERROR') {
        return res.status(400).json({ error: 'Meta Reels પ્રોસેસિંગમાં ભૂલ આવી.' });
      }
    }

    if (!isReady) {
      return res.status(408).json({ error: 'Meta Video પ્રોસેસિંગમાં વધુ સમય લાગી રહ્યો છે. કૃપા કરીને ૧ મિનિટ પછી ફરી પ્રયાસ કરો.' });
    }

    // Step 4: Publish Reel
    console.log(`🚀 [Instagram Direct] Publishing container ${containerId}...`);
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${userId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: containerId,
        access_token: token
      })
    }).then(r => r.json());

    if (publishRes.error) {
      console.error('Meta Media Publish Error:', publishRes.error);
      return res.status(400).json({ error: publishRes.error.message || 'Media publish failed' });
    }

    const postId = publishRes.id;
    console.log(`🎉 [Instagram Direct] Reel Published Successfully! Post ID: ${postId}`);

    res.json({
      success: true,
      postId,
      postUrl: `https://www.instagram.com/p/${postId}/`,
      message: 'રીલ ૧૦૦% હેન્ડ્સ-ફ્રી સીધી જ તમારા Instagram એકાઉન્ટ પર પબ્લિશ થઈ ગઈ છે! 🎉'
    });
  } catch (err) {
    console.error('Instagram direct publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Endpoint to fetch current settings and social connectivity status
app.get('/api/settings/get', async (req, res) => {
  try {
    const hasIg = !!(process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID);
    const hasYt = !!process.env.YOUTUBE_ACCESS_TOKEN;
    const hasGemini = !!process.env.GEMINI_API_KEY;

    res.json({
      success: true,
      geminiConfigured: hasGemini,
      meta: {
        configured: hasIg,
        username: cachedIgUsername || process.env.META_INSTAGRAM_USERNAME || null,
        userId: process.env.META_INSTAGRAM_USER_ID || null
      },
      youtube: {
        configured: hasYt,
        channelTitle: cachedYtTitle || process.env.YOUTUBE_CHANNEL_TITLE || null
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// 📦 9. ALL-SELLER STOCK INVENTORY, BILLING & CUSTOM UPI QR
// ========================================================

// Shop Settings & Custom UPI QR
app.get('/api/shop/settings', (req, res) => {
  res.json({ success: true, settings: getShopSettings() });
});

app.post('/api/shop/settings', (req, res) => {
  try {
    const current = getShopSettings();
    const updated = { ...current, ...req.body };
    saveShopSettings(updated);
    res.json({ success: true, settings: updated, message: 'દુકાનની વિગતો સફળતાપૂર્વક સેવ થઈ ગઈ!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shop/onboarding-setup', (req, res) => {
  try {
    const {
      shopName,
      businessType,
      ownerName,
      phone,
      address,
      upiId,
      upiQrImage,
      gstNumber,
      gstEnabled,
      defaultGstRate,
      invoicePrefix,
      billTerms,
      initialProducts
    } = req.body;

    const currentSettings = getShopSettings();
    const updatedSettings = {
      ...currentSettings,
      shopName: shopName ? shopName.trim() : (currentSettings.shopName || 'Retail & Fashion Store'),
      businessType: businessType ? businessType.trim() : (currentSettings.businessType || 'General Retail'),
      ownerName: ownerName ? ownerName.trim() : (currentSettings.ownerName || 'Shop Owner'),
      phone: phone ? phone.trim() : (currentSettings.phone || ''),
      address: address ? address.trim() : (currentSettings.address || ''),
      upiId: upiId ? upiId.trim() : (currentSettings.upiId || ''),
      upiQrImage: upiQrImage !== undefined ? upiQrImage : (currentSettings.upiQrImage || ''),
      gstNumber: gstNumber ? gstNumber.trim() : '',
      gstEnabled: gstEnabled !== undefined ? Boolean(gstEnabled) : !!currentSettings.gstEnabled,
      defaultGstRate: defaultGstRate !== undefined ? Number(defaultGstRate) : (currentSettings.defaultGstRate || 5),
      invoicePrefix: invoicePrefix ? invoicePrefix.trim() : (currentSettings.invoicePrefix || 'INV'),
      billTerms: billTerms ? billTerms.trim() : (currentSettings.billTerms || 'માલ પાછો લેવામાં આવશે નહીં. મુલાકાત બદલ આભાર! 🙏'),
      isConfigured: true,
      lastSetupAt: new Date().toISOString()
    };
    saveShopSettings(updatedSettings);

    let products = getProducts();
    let addedCount = 0;

    if (Array.isArray(initialProducts) && initialProducts.length > 0) {
      initialProducts.forEach(ip => {
        if (ip && ip.name && ip.name.trim()) {
          const newProd = {
            id: `prod-${Date.now()}-${Math.round(Math.random() * 1000)}`,
            name: ip.name.trim(),
            sku: ip.sku ? ip.sku.trim() : `SKU-${Math.floor(100 + Math.random() * 900)}`,
            category: ip.category ? ip.category.trim() : (updatedSettings.businessType || 'General Product'),
            unit: ip.unit ? ip.unit.trim() : 'Pcs (નંગ)',
            price: Number(ip.price) || 0,
            cost: Number(ip.cost) || 0,
            stock: Number(ip.stock) || 10,
            minStockAlert: 3,
            gstRate: ip.gstRate !== undefined ? Number(ip.gstRate) : (updatedSettings.defaultGstRate || 5),
            description: ip.description || '',
            videoFileName: '',
            createdAt: new Date().toISOString()
          };
          products.unshift(newProd);
          addedCount++;
        }
      });
      saveProducts(products);
    }

    res.json({
      success: true,
      settings: updatedSettings,
      products,
      addedProductsCount: addedCount,
      message: `વેલકમ "${updatedSettings.shopName}"! તમારી દુકાનનું સેટઅપ સફળતાપૂર્વક થઈ ગયું છે. 🎉`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/shop/upload-qr', qrUpload.single('qrImage'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'QR Code ઈમેજ ફાઈલ પસંદ કરો.' });
    const qrRelativeUrl = `/uploads/qr/${req.file.filename}`;
    const settings = getShopSettings();
    settings.upiQrImage = qrRelativeUrl;
    saveShopSettings(settings);
    res.json({ success: true, qrUrl: qrRelativeUrl, message: 'તમારો UPI QR Code સફળતાપૂર્વક અપલોડ થઈ ગયો! 🎉' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Products & Inventory CRUD
app.get('/api/products', (req, res) => {
  res.json({ success: true, products: getProducts() });
});

app.post('/api/products', (req, res) => {
  try {
    const { id, name, sku, category, unit, price, cost, stock, minStockAlert, gstRate, description, videoFileName } = req.body;
    if (!name || price === undefined) {
      return res.status(400).json({ error: 'પ્રોડક્ટનું નામ અને કિંમત જરૂરી છે.' });
    }

    let products = getProducts();
    let product;

    if (id) {
      // Update existing
      const idx = products.findIndex(p => p.id === id);
      if (idx !== -1) {
        products[idx] = {
          ...products[idx],
          name: name.trim(),
          sku: sku || products[idx].sku,
          category: category || products[idx].category,
          unit: unit || products[idx].unit || 'Pcs (નંગ)',
          price: Number(price),
          cost: Number(cost) || 0,
          stock: Number(stock) || 0,
          minStockAlert: Number(minStockAlert) || 3,
          gstRate: gstRate !== undefined ? Number(gstRate) : (products[idx].gstRate || 0),
          description: description || '',
          videoFileName: videoFileName !== undefined ? videoFileName : products[idx].videoFileName,
          updatedAt: new Date().toISOString()
        };
        product = products[idx];
      }
    }

    if (!product) {
      // Create new
      product = {
        id: `prod-${Date.now()}-${Math.round(Math.random() * 1000)}`,
        name: name.trim(),
        sku: sku || `SKU-${Math.floor(100 + Math.random() * 900)}`,
        category: category || 'General Product',
        unit: unit || 'Pcs (નંગ)',
        price: Number(price),
        cost: Number(cost) || 0,
        stock: Number(stock) || 0,
        minStockAlert: Number(minStockAlert) || 3,
        gstRate: Number(gstRate) || 0,
        description: description || '',
        videoFileName: videoFileName || '',
        createdAt: new Date().toISOString()
      };
      products.unshift(product);
    }

    saveProducts(products);
    res.json({ success: true, product, products, message: 'પ્રોડક્ટ સ્ટોકમાં સફળતાપૂર્વક સેવ થઈ ગઈ! ✓' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/products/:id', (req, res) => {
  try {
    let products = getProducts();
    products = products.filter(p => p.id !== req.params.id);
    saveProducts(products);
    res.json({ success: true, products, message: 'પ્રોડક્ટ ડિલીટ થઈ ગઈ.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invoicing & Billing (with Auto-Stock Deduction)
app.get('/api/invoices', (req, res) => {
  res.json({ success: true, invoices: getInvoices() });
});

app.post('/api/invoices', (req, res) => {
  try {
    const { customerName, customerPhone, customerAddress, items, discount = 0, paymentMethod = 'UPI QR', notes } = req.body;
    if (!items || !items.length) {
      return res.status(400).json({ error: 'બિલ બનાવવા માટે ઓછામાં ઓછી ૧ આઇટમ ઉમેરો.' });
    }

    let products = getProducts();
    const shopSettings = getShopSettings();
    let subtotal = 0;
    let totalTax = 0;

    // Validate items and deduct stock
    const billedItems = items.map((it, idx) => {
      const prod = it.productId ? products.find(p => p.id === it.productId) : null;
      const qty = Number(it.qty || it.quantity) || 1;
      const unitPrice = Number(it.price) || (prod ? prod.price : 0);
      const rowTaxRate = Number(it.gstRate !== undefined ? it.gstRate : (prod ? prod.gstRate : (shopSettings.gstEnabled ? shopSettings.defaultGstRate : 0))) || 0;
      
      const itemSubtotal = unitPrice * qty;
      const rowTax = shopSettings.gstEnabled ? (itemSubtotal * (rowTaxRate / 100)) : 0;
      const total = itemSubtotal + rowTax;
      
      subtotal += itemSubtotal;
      totalTax += rowTax;

      // Auto-deduct stock if catalog product exists
      if (prod) {
        prod.stock = Math.max(0, (Number(prod.stock) || 0) - qty);
      }

      return {
        srNo: idx + 1,
        productId: it.productId || '',
        name: it.name || (prod ? prod.name : 'Custom Item'),
        sku: prod ? prod.sku : (it.sku || ''),
        unit: it.unit || (prod ? prod.unit : 'Pcs'),
        price: unitPrice,
        qty: qty,
        gstRate: rowTaxRate,
        taxAmount: Math.round(rowTax * 100) / 100,
        total: Math.round((itemSubtotal) * 100) / 100
      };
    });

    const disc = Number(discount) || 0;
    const cgst = shopSettings.gstEnabled ? Math.round((totalTax / 2) * 100) / 100 : 0;
    const sgst = shopSettings.gstEnabled ? Math.round((totalTax / 2) * 100) / 100 : 0;
    const grandTotal = Math.round(Math.max(0, subtotal + (shopSettings.gstEnabled ? totalTax : 0) - disc));

    const invoices = getInvoices();
    const prefix = shopSettings.invoicePrefix || 'INV';
    const invoiceNo = `${prefix}-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(3, '0')}`;

    const newInvoice = {
      id: `inv-${Date.now()}`,
      invoiceNo,
      invoiceNumber: invoiceNo,
      customerName: customerName ? customerName.trim() : 'Walk-in Customer',
      customerPhone: customerPhone ? customerPhone.trim() : '',
      customerAddress: customerAddress ? customerAddress.trim() : '',
      items: billedItems,
      subtotal: Math.round(subtotal * 100) / 100,
      discount: disc,
      gstEnabled: !!shopSettings.gstEnabled,
      gstNumber: shopSettings.gstNumber || '',
      cgst,
      sgst,
      taxAmount: Math.round(totalTax * 100) / 100,
      grandTotal,
      paymentMethod,
      paymentStatus: 'Paid',
      notes: notes || shopSettings.billTerms || 'Thank you for your business! 🙏',
      shopDetails: { ...shopSettings },
      createdAt: new Date().toISOString()
    };

    invoices.unshift(newInvoice);
    saveInvoices(invoices);
    saveProducts(products); // Persist updated stock

    res.json({
      success: true,
      invoice: newInvoice,
      invoices,
      products,
      shopSettings,
      message: `બિલ #${invoiceNo} સફળતાપૂર્વક બની ગયું અને સ્ટોક આપોઆપ માઈનસ થઈ ગયો! 🎉`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========================================================
// 🤖 10. AI STORE COPILOT (SELLER CONVERSATIONAL MANAGER)
// ========================================================

function generateAlgorithmicCopilotResponse(message, data) {
  const q = (message || '').toLowerCase();
  const { products, totalItems, lowStockProducts, todaysRevenue, topSellingProducts, shopSettings } = data;

  if (q.includes('ઓછો') || q.includes('ખલાસ') || q.includes('low') || q.includes('alert') || q.includes('પતી ગય')) {
    if (lowStockProducts.length > 0) {
      const items = lowStockProducts.map(p => `• **${p.name}**: ફક્ત **${p.stock} નંગ** બાકી! (મિનિમમ એલર્ટ: ${p.minStockAlert || 3})`).join('\n');
      return `⚠️ **સ્ટોક એલર્ટ (ઓછો સ્ટોક):**\n\nનીચેની આઇટમ્સ ખલાસ થવાની તૈયારીમાં છે, નવો માલ મંગાવી લેવો જોઈએ:\n\n${items}`;
    }
    return `✅ **ખુશખબર:** તમારી દુકાનમાં કોઈપણ આઇટમનો સ્ટોક ઓછો નથી, બધી આઇટમ્સ પૂરતા પ્રમાણમાં છે!`;
  }

  if (q.includes('વેચાણ') || q.includes('સૌથી') || q.includes('selling') || q.includes('best') || q.includes('વેચાણું') || q.includes('વેચાણી') || q.includes('top')) {
    if (topSellingProducts.length > 0) {
      return `🔥 **સૌથી વધુ વેચાતી પ્રોડક્ટ્સ:**\n\n1. **${topSellingProducts[0]}** સૌથી ટોપ પર છે!\n${topSellingProducts.slice(1, 4).map((p, i) => `${i + 2}. ${p}`).join('\n')}\n\n💡 આ આઇટમની વધુ રીલ્સ બનાવીને ઇન્સ્ટાગ્રામ પર મૂકવાથી ઓર્ડર્સ હજુ વધશે!`;
    }
    return `🔥 અત્યાર સુધીના ડેટા મુજબ તમારી પ્રોડક્ટ્સ લિસ્ટમાં છે. જેમ જેમ નવા બિલ બનશે તેમ ટોપ-સેલિંગ પ્રોડક્ટ્સ અહીં લાઈવ દેખાશે!`;
  }

  if (q.includes('સ્ટોક') || q.includes('stock') || q.includes('કેટલો') || q.includes('item') || q.includes('માલ')) {
    const list = products.slice(0, 4).map(p => `• **${p.name}**: ${p.stock} નંગ (₹${p.price})`).join('\n');
    return `📦 **તમારી દુકાનનો સ્ટોક રિપોર્ટ (${shopSettings.shopName}):**\n\nતમારી પાસે અત્યારે કુલ **${totalItems} આઇટમ્સ** સ્ટોકમાં ઉપલબ્ધ છે (${products.length} અલગ અલગ પ્રોડક્ટ્સ).\n\n${list}\n\n${lowStockProducts.length > 0 ? `⚠️ **ધ્યાન આપો:** ${lowStockProducts.length} આઇટમ્સનો સ્ટોક ઓછો છે!` : '✅ બધી આઇટમ્સનો પૂરતો સ્ટોક છે.'}`;
  }

  if (q.includes('આજ') || q.includes('કમાણી') || q.includes('નફો') || q.includes('revenue') || q.includes('sale') || q.includes('રૂપિયા')) {
    return `💰 **આજનું વેચાણ રિપોર્ટ:**\n\n• આજની કુલ કમાણી: **₹${todaysRevenue.toLocaleString('en-IN')}**\n• દુકાન: **${shopSettings.shopName}**\n\nનવું બિલ બનાવવા માટે બિલિંગ ટેબનો ઉપયોગ કરી શકો છો!`;
  }

  return `નમસ્તે! હું તમારો **AI Store Copilot** છું. 🤖\n\nતમે મને તમારી દુકાન વિશે કંઈપણ પૂછી શકો છો:\n• *"આજે કેટલો સ્ટોક છે?"*\n• *"સૌથી વધુ કઈ આઇટમ વેચાઈ?"*\n• *"કયો સ્ટોક ઓછો થઈ ગયો છે?"*\n• *"આજનું કુલ વેચાણ કેટલું થયું?"*`;
}

app.post('/api/ai-copilot/chat', async (req, res) => {
  try {
    const message = req.body.message || req.body.query;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const products = getProducts();
    const invoices = getInvoices();
    const shopSettings = getShopSettings();

    const totalItems = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStockProducts = products.filter(p => Number(p.stock) <= (Number(p.minStockAlert) || 3));
    
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysInvoices = invoices.filter(inv => inv.createdAt && inv.createdAt.startsWith(todayStr));
    const todaysRevenue = todaysInvoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);

    const productSalesMap = {};
    invoices.forEach(inv => {
      (inv.items || []).forEach(it => {
        productSalesMap[it.name] = (productSalesMap[it.name] || 0) + (Number(it.qty || it.quantity) || 1);
      });
    });

    const topSellingProducts = Object.entries(productSalesMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, qty]) => `${name} (${qty} નંગ વેચાયા)`);

    const fallbackData = { products, totalItems, lowStockProducts, todaysRevenue, topSellingProducts, shopSettings };

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const algorithmicReply = generateAlgorithmicCopilotResponse(message, fallbackData);
      return res.json({ success: true, reply: algorithmicReply, answer: algorithmicReply });
    }

    const systemPrompt = `You are "Store Copilot", a friendly, ultra-smart AI Business & Inventory Manager for shopkeepers and online sellers across all industries (Sarees, Fashion, Jewelry, Electronics, Retail, etc.).
Your job is to answer the seller's questions in clear, conversational Gujarati (with helpful English terms and emojis) based on their real-time live business data below:

🏪 Shop Name: "${shopSettings.shopName}" (${shopSettings.businessType || 'Retail'})
📦 Total Unique Products: ${products.length}
📦 Total Physical Stock Units: ${totalItems}
⚠️ Low Stock Items (<3 units): ${lowStockProducts.map(p => `${p.name} (Stock: ${p.stock})`).join(', ') || 'None (All well-stocked)'}
💰 Today's Invoices: ${todaysInvoices.length} orders
💰 Today's Revenue: ₹${todaysRevenue.toLocaleString('en-IN')}
🔥 Top Selling Items: ${topSellingProducts.slice(0, 5).join(', ') || 'No sales recorded yet'}

Full Current Inventory List:
${JSON.stringify(products.map(p => ({ name: p.name, sku: p.sku, category: p.category, price: p.price, stock: p.stock })), null, 2)}

Instructions:
1. Always respond warmly in natural Gujarati (e.g., "હા ભાઈ...", "તમારા સ્ટોકમાં અત્યારે...").
2. Use bullet points and emojis (📦, 💰, 🔥, ⚠️) so it is super easy to read on mobile.
3. If they ask about total stock, give the total units and highlight key categories.
4. If they ask what sold the most today or overall, give exact numbers from the data.
5. If they ask what is low, warn them clearly.
6. Keep answers concise, direct, helpful, and empowering for the seller!`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const aiRes = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${systemPrompt}\n\nSeller's Question: "${message}"` }] }
        ],
        generationConfig: { temperature: 0.3 }
      })
    });

    if (aiRes.ok) {
      const data = await aiRes.json();
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (reply) return res.json({ success: true, reply: reply.trim(), answer: reply.trim() });
    }

    const fallbackReply = generateAlgorithmicCopilotResponse(message, fallbackData);
    res.json({ success: true, reply: fallbackReply, answer: fallbackReply });
  } catch (err) {
    console.error('AI Copilot error:', err);
    const safeReply = generateAlgorithmicCopilotResponse(req.body.message || req.body.query, { products: getProducts(), totalItems: 0, lowStockProducts: [], todaysRevenue: 0, topSellingProducts: [], shopSettings: getShopSettings() });
    res.json({ success: true, reply: safeReply, answer: safeReply });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Full-Stack & Video Automation running at http://localhost:${PORT}`);
  console.log(`📁 Generated projects will be saved to: ${GENERATED_DIR}`);
  console.log(`🎬 Rendered 30s Reels stored in: ${REELS_DIR}`);
});
