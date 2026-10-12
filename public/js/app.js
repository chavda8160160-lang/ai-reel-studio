// Settings Modal
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const apiKeyInput = document.getElementById('apiKeyInput');
const btnSaveApiKey = document.getElementById('btnSaveApiKey');
const apiKeyStatusLabel = document.getElementById('apiKeyStatusLabel');

// Toast
const toast = document.getElementById('toast');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadApiKeyStatus();
  initCopyButtons();
  initModeSwitcher();
  initVideoStudio();
  initSchedulerView();
  initAnalyticsView();
});

// Toast Helper
function showToast(message, isError = false) {
  toast.textContent = message;
  toast.style.borderColor = isError ? 'var(--accent-rose)' : 'var(--accent-emerald)';
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 4000);
}

// API Key & Meta Credentials Management
function getSavedApiKey() {
  return localStorage.getItem('GEMINI_API_KEY') || '';
}

// Live Meta Token Health Checker
async function checkLiveTokenHealth() {
  const tokenDot = document.getElementById('tokenStatusDot');
  const tokenTitle = document.getElementById('metaTokenStatusTitle');
  const tokenExpiry = document.getElementById('metaTokenExpiryText');
  const tokenBadge = document.getElementById('tokenTypeBadge');
  const metaIgTokenInput = document.getElementById('metaIgTokenInput');
  const metaAppIdInput = document.getElementById('metaAppIdInput');
  const metaIgUserIdInput = document.getElementById('metaIgUserIdInput');

  if (!tokenDot || !tokenTitle) return;

  const currentToken = metaIgTokenInput?.value.trim() || localStorage.getItem('META_IG_TOKEN') || '';

  try {
    const res = await fetch(`/api/meta/token-status?token=${encodeURIComponent(currentToken)}`);
    const data = await res.json();

    if (data.success && data.active) {
      tokenDot.style.background = '#10b981'; // Green
      tokenDot.style.boxShadow = '0 0 8px #10b981';

      if (data.isNeverExpiring) {
        tokenTitle.textContent = `Lifetime Never-Expiring Token Active ✓ (${data.name || 'Account'})`;
        tokenTitle.style.color = '#10b981';
        tokenExpiry.textContent = 'Expires: NEVER (Permanent Page Token). Zero expiration, 100% hands-free!';
        if (tokenBadge) {
          tokenBadge.textContent = 'Lifetime Token ✓';
          tokenBadge.style.color = '#34d399';
          tokenBadge.style.borderColor = 'rgba(52,211,153,0.4)';
          tokenBadge.style.background = 'rgba(16,185,129,0.15)';
        }
      } else {
        tokenTitle.textContent = `Token Active ✓ (${data.name || 'Connected'})`;
        tokenTitle.style.color = '#38bdf8';
        tokenExpiry.textContent = `Valid Session. Expiry: ${data.expiresAt}. Pre-flight auto-refresh active.`;
        if (tokenBadge) {
          tokenBadge.textContent = 'Auto-Refresh Guard Active';
          tokenBadge.style.color = '#38bdf8';
          tokenBadge.style.borderColor = 'rgba(56,189,248,0.4)';
          tokenBadge.style.background = 'rgba(56,189,248,0.15)';
        }
      }

      if (data.metaAppId && metaAppIdInput && !metaAppIdInput.value) {
        metaAppIdInput.value = data.metaAppId;
      }
      if (data.userId && metaIgUserIdInput && !metaIgUserIdInput.value) {
        metaIgUserIdInput.value = data.userId;
      }
    } else {
      tokenDot.style.background = '#ef4444'; // Red
      tokenDot.style.boxShadow = '0 0 8px #ef4444';
      tokenTitle.textContent = 'Token Inactive / Expired ⚠️';
      tokenTitle.style.color = '#ef4444';
      tokenExpiry.textContent = data.error || 'Token expired. Click "Auto-Refresh / Make Permanent" or paste new token.';
      if (tokenBadge) {
        tokenBadge.textContent = 'Needs Refresh ⚠️';
        tokenBadge.style.color = '#f87171';
        tokenBadge.style.borderColor = 'rgba(248,113,113,0.4)';
        tokenBadge.style.background = 'rgba(239,68,68,0.15)';
      }
    }
  } catch (err) {
    if (tokenTitle) tokenTitle.textContent = 'Status check offline';
  }
}

async function loadApiKeyStatus() {
  const localKey = getSavedApiKey();
  const metaIgUserIdInput = document.getElementById('metaIgUserIdInput');
  const metaIgTokenInput = document.getElementById('metaIgTokenInput');
  const metaAppIdInput = document.getElementById('metaAppIdInput');
  const metaAppSecretInput = document.getElementById('metaAppSecretInput');
  const youtubeTokenInput = document.getElementById('youtubeTokenInput');
  const youtubeClientIdInput = document.getElementById('youtubeClientIdInput');
  const youtubeClientSecretInput = document.getElementById('youtubeClientSecretInput');
  const youtubeRefreshTokenInput = document.getElementById('youtubeRefreshTokenInput');
  const telegramBotTokenInput = document.getElementById('telegramBotTokenInput');
  const telegramChatIdInput = document.getElementById('telegramChatIdInput');

  if (metaIgUserIdInput) metaIgUserIdInput.value = localStorage.getItem('META_IG_USER_ID') || '';
  if (metaIgTokenInput) metaIgTokenInput.value = localStorage.getItem('META_IG_TOKEN') || '';
  if (metaAppIdInput) metaAppIdInput.value = localStorage.getItem('META_APP_ID') || '';
  if (metaAppSecretInput) metaAppSecretInput.value = localStorage.getItem('META_APP_SECRET') || '';
  if (youtubeTokenInput) youtubeTokenInput.value = localStorage.getItem('YOUTUBE_ACCESS_TOKEN') || '';
  if (youtubeClientIdInput) youtubeClientIdInput.value = localStorage.getItem('YOUTUBE_CLIENT_ID') || '';
  if (youtubeClientSecretInput) youtubeClientSecretInput.value = localStorage.getItem('YOUTUBE_CLIENT_SECRET') || '';
  if (youtubeRefreshTokenInput) youtubeRefreshTokenInput.value = localStorage.getItem('YOUTUBE_REFRESH_TOKEN') || '';
  if (telegramBotTokenInput) telegramBotTokenInput.value = localStorage.getItem('TELEGRAM_BOT_TOKEN') || '';
  if (telegramChatIdInput) telegramChatIdInput.value = localStorage.getItem('TELEGRAM_CHAT_ID') || '';

  const whatsappPhoneInput = document.getElementById('whatsappPhoneInput');
  const whatsappApiKeyInput = document.getElementById('whatsappApiKeyInput');
  if (whatsappPhoneInput) whatsappPhoneInput.value = localStorage.getItem('WHATSAPP_PHONE') || '';
  if (whatsappApiKeyInput) whatsappApiKeyInput.value = localStorage.getItem('WHATSAPP_APIKEY') || '';

  // Load WhatsApp Alerts enabled status
  fetch('/api/settings/get').then(r => r.json()).then(data => {
    if (data.success && data.whatsapp) {
      updateWhatsAppToggleUI(data.whatsapp.enabled);
      if (data.whatsapp.phone && whatsappPhoneInput && !whatsappPhoneInput.value) {
        whatsappPhoneInput.value = data.whatsapp.phone;
      }
    }
  }).catch(() => {});

  if (localKey) {
    apiKeyStatusLabel.textContent = 'API Key Active ✓';
    apiKeyStatusLabel.style.color = 'var(--accent-emerald)';
    apiKeyInput.value = localKey;
  } else {
    // Check if server .env has key
    try {
      const res = await fetch('/api/status');
      const data = await res.json();
      if (data.hasEnvKey) {
        apiKeyStatusLabel.textContent = 'API Key Active ✓';
        apiKeyStatusLabel.style.color = 'var(--accent-emerald)';
      } else {
        apiKeyStatusLabel.textContent = 'API Key Required ⚠️';
        apiKeyStatusLabel.style.color = 'var(--accent-rose)';
      }
    } catch (_) {
      apiKeyStatusLabel.textContent = 'API Key Required ⚠️';
      apiKeyStatusLabel.style.color = 'var(--accent-rose)';
    }
  }

  // Check token health on load
  checkLiveTokenHealth();
}

function updateWhatsAppToggleUI(isEnabled) {
  const toggle = document.getElementById('whatsappAlertsToggle');
  const track = document.getElementById('whatsappToggleTrack');
  const knob = document.getElementById('whatsappToggleKnob');
  const label = document.getElementById('whatsappToggleLabel');
  const headerBtn = document.getElementById('btnHeaderWhatsAppToggle');
  const headerLabel = document.getElementById('headerWhatsAppStatusLabel');

  if (toggle) toggle.checked = isEnabled;
  if (track) track.style.backgroundColor = isEnabled ? '#22c55e' : '#cbd5e1';
  if (knob) knob.style.left = isEnabled ? '24px' : '4px';
  if (label) {
    label.textContent = isEnabled ? 'ON' : 'OFF';
    label.style.color = isEnabled ? '#16a34a' : '#64748b';
  }

  if (headerLabel) {
    headerLabel.textContent = isEnabled ? 'WhatsApp: ON ✓' : 'WhatsApp: OFF ⏸️';
  }
  if (headerBtn) {
    headerBtn.style.color = isEnabled ? '#16a34a' : '#64748b';
    headerBtn.style.borderColor = isEnabled ? 'rgba(34,197,94,0.3)' : '#cbd5e1';
    headerBtn.style.background = isEnabled ? 'rgba(34,197,94,0.08)' : 'rgba(241,245,249,0.7)';
  }
}

// 1-Click WhatsApp Header Toggle Button
const btnHeaderWhatsAppToggle = document.getElementById('btnHeaderWhatsAppToggle');
if (btnHeaderWhatsAppToggle) {
  btnHeaderWhatsAppToggle.addEventListener('click', async () => {
    btnHeaderWhatsAppToggle.disabled = true;
    try {
      const res = await fetch('/api/settings/toggle-whatsapp', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        updateWhatsAppToggleUI(data.enabled);
        showToast(data.enabled ? '🔔 WhatsApp Alerts Turned ON!' : '⏸️ WhatsApp Alerts Paused (OFF)');
      }
    } catch (e) {
      showToast('Toggle failed: ' + e.message, true);
    } finally {
      btnHeaderWhatsAppToggle.disabled = false;
    }
  });
}

// Settings Modal WhatsApp Toggle Switch
const whatsappAlertsToggle = document.getElementById('whatsappAlertsToggle');
if (whatsappAlertsToggle) {
  whatsappAlertsToggle.addEventListener('change', async (e) => {
    const isChecked = e.target.checked;
    updateWhatsAppToggleUI(isChecked);
    try {
      await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsappAlertsEnabled: isChecked })
      });
      showToast(isChecked ? '🔔 WhatsApp Alerts Turned ON!' : '⏸️ WhatsApp Alerts Paused (OFF)');
    } catch (_) {}
  });
}

btnSettings.addEventListener('click', () => {
  apiKeyInput.value = getSavedApiKey();
  const metaIgUserIdInput = document.getElementById('metaIgUserIdInput');
  const metaIgTokenInput = document.getElementById('metaIgTokenInput');
  const metaAppIdInput = document.getElementById('metaAppIdInput');
  const metaAppSecretInput = document.getElementById('metaAppSecretInput');
  const youtubeTokenInput = document.getElementById('youtubeTokenInput');
  const youtubeClientIdInput = document.getElementById('youtubeClientIdInput');
  const youtubeClientSecretInput = document.getElementById('youtubeClientSecretInput');
  const youtubeRefreshTokenInput = document.getElementById('youtubeRefreshTokenInput');
  const whatsappPhoneInput = document.getElementById('whatsappPhoneInput');
  const whatsappApiKeyInput = document.getElementById('whatsappApiKeyInput');

  if (metaIgUserIdInput) metaIgUserIdInput.value = localStorage.getItem('META_IG_USER_ID') || '';
  if (metaIgTokenInput) metaIgTokenInput.value = localStorage.getItem('META_IG_TOKEN') || '';
  if (metaAppIdInput) metaAppIdInput.value = localStorage.getItem('META_APP_ID') || '';
  if (metaAppSecretInput) metaAppSecretInput.value = localStorage.getItem('META_APP_SECRET') || '';
  if (youtubeTokenInput) youtubeTokenInput.value = localStorage.getItem('YOUTUBE_ACCESS_TOKEN') || '';
  if (youtubeClientIdInput) youtubeClientIdInput.value = localStorage.getItem('YOUTUBE_CLIENT_ID') || '';
  if (youtubeClientSecretInput) youtubeClientSecretInput.value = localStorage.getItem('YOUTUBE_CLIENT_SECRET') || '';
  if (youtubeRefreshTokenInput) youtubeRefreshTokenInput.value = localStorage.getItem('YOUTUBE_REFRESH_TOKEN') || '';
  if (whatsappPhoneInput) whatsappPhoneInput.value = localStorage.getItem('WHATSAPP_PHONE') || '';
  if (whatsappApiKeyInput) whatsappApiKeyInput.value = localStorage.getItem('WHATSAPP_APIKEY') || '';

  settingsModal.classList.remove('hidden');
  checkLiveTokenHealth();

  fetch('/api/settings/get').then(r => r.json()).then(data => {
    if (data.success) {
      if (data.youtube?.configured && !youtubeTokenInput.value) {
        youtubeTokenInput.placeholder = `Connected on server (${data.youtube.channelTitle || 'YouTube'}) ✓`;
      }
      const ytPill = document.getElementById('youtubeStatusPill');
      if (ytPill && data.youtube?.configured) {
        ytPill.textContent = `${data.youtube.channelTitle || 'Connected'} ✓`;
        ytPill.style.background = 'rgba(16, 185, 129, 0.15)';
        ytPill.style.color = '#059669';
      }
      const waPill = document.getElementById('whatsappStatusPill');
      if (waPill && data.whatsapp?.configured) {
        waPill.textContent = 'WhatsApp Active ✓';
        waPill.style.background = 'rgba(34, 197, 94, 0.15)';
        waPill.style.color = '#16a34a';
        if (whatsappPhoneInput && !whatsappPhoneInput.value) {
          whatsappPhoneInput.value = data.whatsapp.phone;
        }
      }
    }
  }).catch(() => {});
});

btnCloseModal.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

// One-Click Convert to Never-Expiring Token / Auto-Refresh Handler
const btnUpgradePermanentToken = document.getElementById('btnUpgradePermanentToken');
if (btnUpgradePermanentToken) {
  btnUpgradePermanentToken.addEventListener('click', async () => {
    const metaIgTokenInput = document.getElementById('metaIgTokenInput');
    const metaAppIdInput = document.getElementById('metaAppIdInput');
    const metaAppSecretInput = document.getElementById('metaAppSecretInput');
    const metaIgUserIdInput = document.getElementById('metaIgUserIdInput');

    const token = metaIgTokenInput?.value.trim() || localStorage.getItem('META_IG_TOKEN') || '';
    const appId = metaAppIdInput?.value.trim() || localStorage.getItem('META_APP_ID') || '';
    const appSecret = metaAppSecretInput?.value.trim() || localStorage.getItem('META_APP_SECRET') || '';

    if (!token) {
      showToast('⚠️ Please enter an Access Token first to refresh/upgrade.', 'error');
      return;
    }

    const origHtml = btnUpgradePermanentToken.innerHTML;
    btnUpgradePermanentToken.disabled = true;
    btnUpgradePermanentToken.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Refreshing...';

    try {
      const res = await fetch('/api/meta/auto-refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, appId, appSecret })
      });
      const data = await res.json();

      if (data.success) {
        if (data.token) {
          metaIgTokenInput.value = data.token;
          localStorage.setItem('META_IG_TOKEN', data.token);
        }
        if (data.userId) {
          metaIgUserIdInput.value = data.userId;
          localStorage.setItem('META_IG_USER_ID', data.userId);
        }
        if (appId) localStorage.setItem('META_APP_ID', appId);
        if (appSecret) localStorage.setItem('META_APP_SECRET', appSecret);

        showToast(data.message || 'Token upgraded successfully! 🎉', 'success');
        await checkLiveTokenHealth();
      } else {
        showToast(`❌ Refresh failed: ${data.error}`, 'error');
      }
    } catch (err) {
      showToast(`❌ Request error: ${err.message}`, 'error');
    } finally {
      btnUpgradePermanentToken.disabled = false;
      btnUpgradePermanentToken.innerHTML = origHtml;
    }
  });
}

btnSaveApiKey.addEventListener('click', async () => {
  const val = apiKeyInput.value.trim();
  if (val) {
    localStorage.setItem('GEMINI_API_KEY', val);
  } else {
    localStorage.removeItem('GEMINI_API_KEY');
  }

  const metaIgUser = document.getElementById('metaIgUserIdInput')?.value.trim();
  const metaIgTok = document.getElementById('metaIgTokenInput')?.value.trim();
  const metaAppId = document.getElementById('metaAppIdInput')?.value.trim();
  const metaAppSecret = document.getElementById('metaAppSecretInput')?.value.trim();
  const ytTok = document.getElementById('youtubeTokenInput')?.value.trim();
  const ytClientId = document.getElementById('youtubeClientIdInput')?.value.trim();
  const ytClientSecret = document.getElementById('youtubeClientSecretInput')?.value.trim();
  const ytRefreshToken = document.getElementById('youtubeRefreshTokenInput')?.value.trim();

  if (metaIgUser) localStorage.setItem('META_IG_USER_ID', metaIgUser);
  else localStorage.removeItem('META_IG_USER_ID');

  if (metaIgTok) localStorage.setItem('META_IG_TOKEN', metaIgTok);
  else localStorage.removeItem('META_IG_TOKEN');

  if (metaAppId) localStorage.setItem('META_APP_ID', metaAppId);
  else localStorage.removeItem('META_APP_ID');

  if (metaAppSecret) localStorage.setItem('META_APP_SECRET', metaAppSecret);
  else localStorage.removeItem('META_APP_SECRET');

  if (ytTok) localStorage.setItem('YOUTUBE_ACCESS_TOKEN', ytTok);
  else localStorage.removeItem('YOUTUBE_ACCESS_TOKEN');

  if (ytClientId) localStorage.setItem('YOUTUBE_CLIENT_ID', ytClientId);
  if (ytClientSecret) localStorage.setItem('YOUTUBE_CLIENT_SECRET', ytClientSecret);
  const telegramBotToken = document.getElementById('telegramBotTokenInput')?.value.trim() || '';
  const telegramChatId = document.getElementById('telegramChatIdInput')?.value.trim() || '';

  if (telegramBotToken) localStorage.setItem('TELEGRAM_BOT_TOKEN', telegramBotToken);
  else localStorage.removeItem('TELEGRAM_BOT_TOKEN');

  if (telegramChatId) localStorage.setItem('TELEGRAM_CHAT_ID', telegramChatId);
  else localStorage.removeItem('TELEGRAM_CHAT_ID');

  const whatsappPhone = document.getElementById('whatsappPhoneInput')?.value.trim() || '';
  const whatsappApiKey = document.getElementById('whatsappApiKeyInput')?.value.trim() || '';

  if (whatsappPhone) localStorage.setItem('WHATSAPP_PHONE', whatsappPhone);
  else localStorage.removeItem('WHATSAPP_PHONE');

  if (whatsappApiKey) localStorage.setItem('WHATSAPP_APIKEY', whatsappApiKey);
  else localStorage.removeItem('WHATSAPP_APIKEY');

  // Sync to server backend so background scheduler has the new token immediately
  try {
    await fetch('/api/settings/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        geminiApiKey: val,
        metaIgUserId: metaIgUser,
        metaIgToken: metaIgTok,
        metaAppId: metaAppId,
        metaAppSecret: metaAppSecret,
        youtubeToken: ytTok,
        youtubeClientId: ytClientId,
        youtubeClientSecret: ytClientSecret,
        youtubeRefreshToken: ytRefreshToken,
        telegramBotToken,
        telegramChatId,
        whatsappPhone,
        whatsappApiKey,
        whatsappAlertsEnabled: document.getElementById('whatsappAlertsToggle')?.checked !== false
      })
    });
  } catch (err) {
    console.error('Server settings sync error:', err);
  }

  showToast('Settings saved successfully!');
  await loadApiKeyStatus();
  settingsModal.classList.add('hidden');
});

// WhatsApp Alert Test Button Listener
const btnTestWhatsApp = document.getElementById('btnTestWhatsApp');
if (btnTestWhatsApp) {
  btnTestWhatsApp.addEventListener('click', async () => {
    const phone = document.getElementById('whatsappPhoneInput')?.value.trim() || '';
    const apiKey = document.getElementById('whatsappApiKeyInput')?.value.trim() || '';
    if (!phone || !apiKey) {
      showToast('WhatsApp Phone અને CallMeBot API Key બંને દાખલ કરો.', true);
      return;
    }
    btnTestWhatsApp.disabled = true;
    btnTestWhatsApp.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing WhatsApp...';
    try {
      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, apiKey })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || '✅ WhatsApp Alert Sent Successfully!');
      } else {
        showToast(`Error: ${data.error || 'Failed'}`, true);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnTestWhatsApp.disabled = false;
      btnTestWhatsApp.innerHTML = '<i class="fa-brands fa-whatsapp"></i> Test WhatsApp Alert';
    }
  });
}

// Telegram Alert Test Button Listener
const btnTestTelegram = document.getElementById('btnTestTelegram');
if (btnTestTelegram) {
  btnTestTelegram.addEventListener('click', async () => {
    const botToken = document.getElementById('telegramBotTokenInput')?.value.trim() || '';
    const chatId = document.getElementById('telegramChatIdInput')?.value.trim() || '';
    if (!botToken || !chatId) {
      showToast('Telegram Bot Token અને Chat ID બંને દાખલ કરો.', true);
      return;
    }
    btnTestTelegram.disabled = true;
    btnTestTelegram.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
    try {
      const res = await fetch('/api/telegram/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, chatId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || '✅ Telegram Alert Sent Successfully!');
      } else {
        showToast(`Error: ${data.error || 'Failed'}`, true);
      }
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnTestTelegram.disabled = false;
      btnTestTelegram.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Test Alert';
    }
  });
}

// Quick Chips
function initChips() {
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      promptInput.value = chip.getAttribute('data-prompt');
      promptInput.focus();
    });
  });
}

// Tab Switching
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetTabId = `tab-${btn.getAttribute('data-tab')}`;
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });
}

// Copy to Clipboard
function initCopyButtons() {
  document.querySelectorAll('.btn-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const el = document.getElementById(targetId);
      if (el) {
        navigator.clipboard.writeText(el.textContent);
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }
    });
  });
}

// ==========================================
// 🎬 MODE SWITCHER & VIDEO STUDIO IMPLEMENTATION
// ==========================================

function initModeSwitcher() {
  const navTabs = document.querySelectorAll('.mode-tab');
  const allViews = [
    document.getElementById('videoStudioView'),
    document.getElementById('schedulerView'),
    document.getElementById('analyticsView')
  ].filter(Boolean);

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-target');
      allViews.forEach(v => {
        if (v) v.classList.add('hidden');
      });

      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.remove('hidden');

      if (targetId === 'schedulerView') {
        fetchSchedulerStatus();
      } else if (targetId === 'analyticsView') {
        fetchAnalyticsOverview();
      }
    });
  });
}


let selectedVideoFile = null;
let currentRenderedReel = null;

function initVideoStudio() {
  const dropzone = document.getElementById('videoDropzone');
  const fileInput = document.getElementById('videoFileInput');
  const selectedFileNameBadge = document.getElementById('selectedFileName');
  const btnProcessVideo = document.getElementById('btnProcessVideo');
  const videoLoader = document.getElementById('videoLoader');
  const videoLoaderStatus = document.getElementById('videoLoaderStatus');

  const videoNicheSelect = document.getElementById('videoNicheSelect');
  const videoDurationSelect = document.getElementById('videoDurationSelect');
  const videoCustomPrompt = document.getElementById('videoCustomPrompt');

  const renderedVideoPlayer = document.getElementById('renderedVideoPlayer');
  const reelPlaceholder = document.getElementById('reelPlaceholder');
  const recipePills = document.getElementById('recipePills');
  const pillTheme = document.getElementById('pillTheme');
  const pillDuration = document.getElementById('pillDuration');

  const viralTitleText = document.getElementById('viralTitleText');
  const viralCaptionText = document.getElementById('viralCaptionText');
  const viralHashtagsText = document.getElementById('viralHashtagsText');
  const btnDownloadReel = document.getElementById('btnDownloadReel');
  const videoActionButtons = document.getElementById('videoActionButtons');

  const btnPublishYouTube = document.getElementById('btnPublishYouTube');
  const btnPublishInstagram = document.getElementById('btnPublishInstagram');

  // Schedule Timing Elements
  const btnSchedModeInstant = document.getElementById('btnSchedModeInstant');
  const btnSchedModeTimed = document.getElementById('btnSchedModeTimed');
  const scheduleTimePickerBox = document.getElementById('scheduleTimePickerBox');
  const videoScheduleDateTime = document.getElementById('videoScheduleDateTime');
  const videoScheduleFriendlyText = document.getElementById('videoScheduleFriendlyText');
  const badgeScheduleMode = document.getElementById('badgeScheduleMode');
  const btnProcessVideoIcon = document.getElementById('btnProcessVideoIcon');
  const btnProcessVideoText = document.getElementById('btnProcessVideoText');
  const pillScheduleTime = document.getElementById('pillScheduleTime');
  const lblPillScheduleTime = document.getElementById('lblPillScheduleTime');
  const scheduledPublishBanner = document.getElementById('scheduledPublishBanner');
  const scheduledBannerTime = document.getElementById('scheduledBannerTime');
  const scheduledQueueList = document.getElementById('scheduledQueueList');
  const scheduledCountBadge = document.getElementById('scheduledCountBadge');
  const schedPresetChips = document.querySelectorAll('.sched-preset-chip');

  let isScheduleModeActive = false;

  function getLocalDateTimeInputValue(date) {
    const d = date || new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  function formatGujaratiDateTime(isoOrLocalString) {
    if (!isoOrLocalString) return 'Instant (Now)';
    const d = new Date(isoOrLocalString);
    if (isNaN(d.getTime())) return isoOrLocalString;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    let period = 'AM';
    if (hours >= 12 && hours < 16) period = 'PM';
    else if (hours >= 16 && hours < 20) period = 'PM';
    else if (hours >= 20 || hours < 5) period = 'PM';

    const displayHours = hours % 12 || 12;
    const timeStr = `${String(displayHours).padStart(2, '0')}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;

    if (isToday) return `Today at ${timeStr} ${period}`;
    if (isTomorrow) return `Tomorrow at ${timeStr} ${period}`;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]}, ${period} ${timeStr}`;
  }

  function initSchedulePickerDefault() {
    if (!videoScheduleDateTime) return;
    const now = new Date();
    let target = new Date(now.getTime() + 60 * 60 * 1000);
    if (now.getHours() < 18) {
      target = new Date();
      target.setHours(18, 30, 0, 0);
    } else if (now.getHours() >= 21) {
      target = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      target.setHours(8, 30, 0, 0);
    }
    videoScheduleDateTime.value = getLocalDateTimeInputValue(target);
    updateScheduleFriendlyDisplay();
  }

  function updateScheduleFriendlyDisplay() {
    if (!videoScheduleDateTime || !videoScheduleFriendlyText) return;
    const val = videoScheduleDateTime.value;
    if (!val) {
      videoScheduleFriendlyText.innerHTML = '<i class="fa-solid fa-bell"></i> Selected Time: <span>Instant (Now)</span>';
      return;
    }
    const friendly = formatGujaratiDateTime(val);
    videoScheduleFriendlyText.innerHTML = `<i class="fa-solid fa-bell"></i> Selected Time: <span>${friendly}</span>`;
    if (isScheduleModeActive && btnProcessVideoText) {
      btnProcessVideoText.textContent = `⏰ Schedule Reel for ${friendly}`;
    }
  }

  let isRecurringDailyMode = false;
  const btnSchedModeEveryDay = document.getElementById('btnSchedModeEveryDay');
  const everyDayRecurringInfoBanner = document.getElementById('everyDayRecurringInfoBanner');

  if (btnSchedModeInstant && btnSchedModeTimed) {
    btnSchedModeInstant.addEventListener('click', () => {
      isScheduleModeActive = false;
      isRecurringDailyMode = false;
      btnSchedModeInstant.classList.add('active');
      btnSchedModeTimed.classList.remove('active');
      if (btnSchedModeEveryDay) btnSchedModeEveryDay.classList.remove('active');
      if (scheduleTimePickerBox) scheduleTimePickerBox.classList.add('hidden');
      if (everyDayRecurringInfoBanner) everyDayRecurringInfoBanner.classList.add('hidden');
      if (badgeScheduleMode) {
        badgeScheduleMode.textContent = '⚡ Instant (Now)';
        badgeScheduleMode.style.background = 'rgba(99, 102, 241, 0.2)';
      }
      if (btnProcessVideoText) btnProcessVideoText.textContent = '🎬 AI Auto-Edit & Generate 30s Reel';
      if (btnProcessVideoIcon) btnProcessVideoIcon.className = 'fa-solid fa-wand-magic-sparkles';
    });

    btnSchedModeTimed.addEventListener('click', () => {
      isScheduleModeActive = true;
      isRecurringDailyMode = false;
      btnSchedModeTimed.classList.add('active');
      btnSchedModeInstant.classList.remove('active');
      if (btnSchedModeEveryDay) btnSchedModeEveryDay.classList.remove('active');
      if (scheduleTimePickerBox) scheduleTimePickerBox.classList.remove('hidden');
      if (everyDayRecurringInfoBanner) everyDayRecurringInfoBanner.classList.add('hidden');
      if (badgeScheduleMode) {
        badgeScheduleMode.textContent = '⏰ Schedule Once';
        badgeScheduleMode.style.background = 'rgba(6, 182, 212, 0.25)';
      }
      if (btnProcessVideoIcon) btnProcessVideoIcon.className = 'fa-solid fa-calendar-check';
      initSchedulePickerDefault();
    });
  }

  if (btnSchedModeEveryDay) {
    btnSchedModeEveryDay.addEventListener('click', () => {
      isScheduleModeActive = true;
      isRecurringDailyMode = true;
      btnSchedModeEveryDay.classList.add('active');
      if (btnSchedModeInstant) btnSchedModeInstant.classList.remove('active');
      if (btnSchedModeTimed) btnSchedModeTimed.classList.remove('active');
      if (scheduleTimePickerBox) scheduleTimePickerBox.classList.remove('hidden');
      if (everyDayRecurringInfoBanner) everyDayRecurringInfoBanner.classList.remove('hidden');
      if (badgeScheduleMode) {
        badgeScheduleMode.textContent = '🔁 Daily Auto-Pilot (Every Day)';
        badgeScheduleMode.style.background = 'rgba(168, 85, 247, 0.35)';
      }
      if (btnProcessVideoIcon) btnProcessVideoIcon.className = 'fa-solid fa-repeat';
      initSchedulePickerDefault();
      if (btnProcessVideoText) {
        btnProcessVideoText.textContent = '🔁 Schedule Daily Auto-Pilot';
      }
    });
  }

  if (videoScheduleDateTime) {
    videoScheduleDateTime.addEventListener('input', updateScheduleFriendlyDisplay);
    videoScheduleDateTime.addEventListener('change', updateScheduleFriendlyDisplay);
  }

  schedPresetChips.forEach(chip => {
    chip.addEventListener('click', () => {
      schedPresetChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const offset = chip.getAttribute('data-offset');
      const preset = chip.getAttribute('data-preset');
      const now = new Date();
      let target = new Date();

      if (offset) {
        target = new Date(now.getTime() + parseInt(offset, 10) * 60 * 1000);
      } else if (preset === 'today-1830') {
        target.setHours(18, 30, 0, 0);
      } else if (preset === 'today-2100') {
        target.setHours(21, 0, 0, 0);
      } else if (preset === 'tomorrow-0830') {
        target.setDate(now.getDate() + 1);
        target.setHours(8, 30, 0, 0);
      } else if (preset === 'tomorrow-1300') {
        target.setDate(now.getDate() + 1);
        target.setHours(13, 0, 0, 0);
      }

      if (videoScheduleDateTime) {
        videoScheduleDateTime.value = getLocalDateTimeInputValue(target);
        updateScheduleFriendlyDisplay();
      }
    });
  });

  // Scheduled Queue Management
  async function fetchScheduledQueue() {
    if (!scheduledQueueList) return;
    try {
      const res = await fetch('/api/video/scheduled-queue');
      const data = await res.json();
      if (data.success && data.queue) {
        renderScheduledQueue(data.queue);
      }
    } catch (err) {
      console.error('Fetch scheduled queue failed:', err);
    }
  }

  function renderScheduledQueue(queue) {
    if (!scheduledQueueList || !scheduledCountBadge) return;
    scheduledCountBadge.textContent = `${queue.length} Reels`;
    if (!queue || queue.length === 0) {
      scheduledQueueList.innerHTML = '<div class="empty-queue-hint">No reels currently scheduled. Select a time above to schedule.</div>';
      return;
    }

    scheduledQueueList.innerHTML = queue.map(item => {
      const friendlyTime = formatGujaratiDateTime(item.scheduledTime);
      const isReady = item.status === 'Ready to Post';
      const hasIg = !!item.lastPostUrl;
      const hasYt = !!item.youtubePostUrl;
      const isPosted = item.status?.includes('Posted') || hasIg || hasYt;

      let postBadges = '';
      if (hasIg) {
        postBadges += `<a href="${item.lastPostUrl}" target="_blank" class="step-badge" style="background: rgba(16,185,129,0.2); color: #059669; text-decoration: none;"><i class="fa-brands fa-instagram"></i> Live on IG ✓</a> `;
      }
      if (hasYt) {
        postBadges += `<a href="${item.youtubePostUrl}" target="_blank" class="step-badge" style="background: rgba(239,68,68,0.2); color: #dc2626; text-decoration: none;"><i class="fa-brands fa-youtube"></i> Live on Shorts ✓</a>`;
      }

      const recurringBadge = item.recurringDaily 
        ? `<span class="badge" style="background: rgba(168,85,247,0.25); color: #c084fc; font-size: 0.65rem; padding: 0.15rem 0.45rem;"><i class="fa-solid fa-repeat"></i> Every Day</span>` 
        : '';

      const isFailed = item.status?.includes('Failed');
      const isPublishing = item.status?.includes('Publishing');

      const statusBadge = (hasIg || hasYt)
        ? postBadges
        : isPublishing
        ? '<span class="step-badge" style="background: rgba(234,179,8,0.2); color: #d97706;"><i class="fa-solid fa-spinner fa-spin"></i> Publishing...</span>'
        : isFailed
        ? `<span class="step-badge" style="background: rgba(239,68,68,0.2); color: #dc2626;" title="${(item.lastError || item.lastYoutubeError || '').replace(/"/g, '&quot;')}"><i class="fa-solid fa-circle-exclamation"></i> Upload Failed ⚠️</span>`
        : isReady 
        ? '<span class="step-badge" style="background: rgba(16,185,129,0.15); color: #059669;"><i class="fa-solid fa-check"></i> Ready to Post</span>' 
        : '<span class="step-badge" style="background: rgba(79,70,229,0.15); color: #4f46e5;"><i class="fa-solid fa-clock"></i> Scheduled</span>';

      const safeTitle = (item.viralTitle || item.fileName || 'Reel 30s').replace(/"/g, '&quot;');

      return `
        <div class="queue-item" data-id="${item.id}">
          <div class="queue-item-meta">
            <div class="queue-item-title">${safeTitle}</div>
            <div class="queue-item-time">
              <i class="fa-solid fa-calendar-check"></i> ${friendlyTime} • ${statusBadge} ${recurringBadge}
            </div>
            ${isFailed ? `<div style="font-size:0.72rem;color:#dc2626;margin-top:0.25rem;"><i class="fa-solid fa-triangle-exclamation"></i> ${item.lastError || item.lastYoutubeError || 'Upload failed. Check settings and retry.'}</div>` : ''}
          </div>
          <div class="queue-item-actions">
            ${!isPosted ? `<button type="button" class="btn-queue-action btn-queue-run" onclick="triggerRunScheduledReel('${item.id}')" title="Upload now"><i class="fa-solid fa-bolt"></i> ${isFailed ? 'Retry Now' : 'Run Now'}</button>` : ''}
            <button type="button" class="btn-queue-action" onclick="triggerCancelScheduledReel('${item.id}')" title="Cancel schedule"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Poll queue every 6 seconds to show real-time changes
  setInterval(fetchScheduledQueue, 6000);

  window.triggerRunScheduledReel = async (id) => {
    try {
      showToast('🚀 Publishing Reel to Instagram now...');
      const res = await fetch('/api/video/scheduled-queue/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to publish reel');
      if (data.success) {
        showToast('🎉 Reel successfully posted to Instagram! Live now!');
        renderScheduledQueue(data.queue);
      }
    } catch (err) {
      showToast(`❌ Upload failed: ${err.message}`, true);
      fetchScheduledQueue();
    }
  };

  window.triggerCancelScheduledReel = async (id) => {
    try {
      const res = await fetch('/api/video/scheduled-queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Scheduled reel cancelled.');
        renderScheduledQueue(data.queue);
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Dropzone click & drag
  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileSelected(e.target.files[0]);
    }
  });

  function handleFileSelected(file) {
    if (!file.type.startsWith('video/')) {
      showToast('Please select a video file (MP4/MOV).', true);
      return;
    }
    selectedVideoFile = file;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    selectedFileNameBadge.textContent = `✓ Selected: ${file.name} (${mbSize} MB)`;
    selectedFileNameBadge.classList.remove('hidden');
    showToast(`Video loaded: ${file.name}`);
  }

  // ========================================================
  // 📸 PHOTOS-TO-REEL (IMAGE REEL GENERATOR) IMPLEMENTATION
  // ========================================================
  const tabSourceVideo = document.getElementById('tabSourceVideo');
  const tabSourcePhotos = document.getElementById('tabSourcePhotos');
  const videoSourcePanel = document.getElementById('videoSourcePanel');
  const photosSourcePanel = document.getElementById('photosSourcePanel');

  if (tabSourceVideo && tabSourcePhotos) {
    tabSourceVideo.addEventListener('click', () => {
      tabSourceVideo.classList.add('active');
      tabSourcePhotos.classList.remove('active');
      tabSourceVideo.style.background = '#ffffff';
      tabSourceVideo.style.color = '#1c1917';
      tabSourceVideo.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
      tabSourcePhotos.style.background = 'transparent';
      tabSourcePhotos.style.color = '#78716c';
      tabSourcePhotos.style.boxShadow = 'none';

      if (videoSourcePanel) {
        videoSourcePanel.classList.remove('hidden');
        videoSourcePanel.style.display = 'block';
      }
      if (photosSourcePanel) {
        photosSourcePanel.classList.add('hidden');
        photosSourcePanel.style.display = 'none';
      }
      if (btnProcessVideoText) {
        btnProcessVideoText.textContent = '🎬 AI Auto-Edit & Generate 30s Reel';
      }
    });

    tabSourcePhotos.addEventListener('click', () => {
      tabSourcePhotos.classList.add('active');
      tabSourceVideo.classList.remove('active');
      tabSourcePhotos.style.background = '#ffffff';
      tabSourcePhotos.style.color = '#1c1917';
      tabSourcePhotos.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
      tabSourceVideo.style.background = 'transparent';
      tabSourceVideo.style.color = '#78716c';
      tabSourceVideo.style.boxShadow = 'none';

      if (photosSourcePanel) {
        photosSourcePanel.classList.remove('hidden');
        photosSourcePanel.style.display = 'flex';
      }
      if (videoSourcePanel) {
        videoSourcePanel.classList.add('hidden');
        videoSourcePanel.style.display = 'none';
      }
      if (btnProcessVideoText) {
        btnProcessVideoText.textContent = '🎬 ✨ AI ફોટો રીલ બનાવો & પબ્લિશ કરો (Generate Reel)';
      }
      if (videoNicheSelect && videoNicheSelect.value.startsWith('Auto-Detect')) {
        videoNicheSelect.value = 'Patola Sarees, Ethnic & Traditional Wear';
      }
    });
  }

  const btnGoToStep2FromPhotos = document.getElementById('btnGoToStep2FromPhotos');
  if (btnGoToStep2FromPhotos) {
    btnGoToStep2FromPhotos.addEventListener('click', () => {
      if (typeof window.setReelStep === 'function') {
        window.setReelStep(2);
      }
    });
  }

  const photosDropzone = document.getElementById('photosDropzone');
  const photoFilesInput = document.getElementById('photoFilesInput');
  const btnLoadPatolaPresetPhotos = document.getElementById('btnLoadPatolaPresetPhotos');
  const selectedPhotosGallery = document.getElementById('selectedPhotosGallery');
  const selectedPhotosCountLabel = document.getElementById('selectedPhotosCountLabel');
  const selectedPhotosThumbs = document.getElementById('selectedPhotosThumbs');
  const btnClearPhotos = document.getElementById('btnClearPhotos');
  const btnGeneratePhotoReel = document.getElementById('btnGeneratePhotoReel');

  let selectedPhotoFilesList = [];
  let isPatolaPresetActive = false;

  if (photosDropzone && photoFilesInput) {
    photosDropzone.addEventListener('click', () => photoFilesInput.click());

    photosDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      photosDropzone.classList.add('dragover');
    });

    photosDropzone.addEventListener('dragleave', () => {
      photosDropzone.classList.remove('dragover');
    });

    photosDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      photosDropzone.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handlePhotoFilesSelected(Array.from(e.dataTransfer.files));
      }
    });

    photoFilesInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handlePhotoFilesSelected(Array.from(e.target.files));
      }
    });
  }

  function handlePhotoFilesSelected(files) {
    isPatolaPresetActive = false;
    const validImgs = files.filter(f => f.type.startsWith('image/'));
    if (validImgs.length === 0) {
      showToast('કૃપા કરીને ઇમેજ ફાઈલો (JPG, PNG, WEBP) પસંદ કરો.', true);
      return;
    }
    
    // Append to existing selection (strictly allow up to 6 photos max)
    const combined = [...selectedPhotoFilesList, ...validImgs];
    if (combined.length > 6) {
      showToast('મહત્તમ ૬ ફોટા જ ઉમેરી શકાય છે (૬ ફોટા રાખ્યા છે).', true);
      selectedPhotoFilesList = combined.slice(0, 6);
    } else {
      selectedPhotoFilesList = combined;
    }

    // Reset input value so user can click to add more photos immediately
    if (photoFilesInput) photoFilesInput.value = '';

    renderPhotosGalleryPreviews();
    showToast(`📸 કુલ ${selectedPhotoFilesList.length} ફોટા પસંદ થયા! (૨ થી ૬ ફોટાની રીલ બનશે)`);
  }

  if (btnLoadPatolaPresetPhotos) {
    btnLoadPatolaPresetPhotos.addEventListener('click', () => {
      isPatolaPresetActive = true;
      selectedPhotoFilesList = [];
      if (selectedPhotosGallery) {
        selectedPhotosGallery.classList.remove('hidden');
        selectedPhotosGallery.style.display = 'flex';
      }
      if (selectedPhotosCountLabel) {
        selectedPhotosCountLabel.innerHTML = '<i class="fa-solid fa-images" style="color: #b89758;"></i> <span>૬ Patola સાડી સેમ્પલ ફોટા (6 Photos Ready ✓)</span>';
      }
      if (selectedPhotosThumbs) {
        const presets = ['Royal Blue', 'Emerald', 'Nari Kunjar', 'Ratan Chowk', 'Rich Pallu', 'Royal Hero'];
        selectedPhotosThumbs.innerHTML = presets.map((name, i) => `
          <div style="position: relative; width: 62px; height: 82px; border-radius: 9px; overflow: hidden; border: 2px solid #b89758; flex-shrink: 0; background: #1c1917; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #e5c870; font-size: 0.68rem; text-align: center; font-weight: 700; padding: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.25);">
            <i class="fa-solid fa-gem" style="font-size: 1rem; margin-bottom: 2px;"></i>
            <span style="line-height: 1.1;">${name}</span>
            <span style="position: absolute; bottom: 2px; left: 2px; background: rgba(0,0,0,0.8); color: #fff; font-size: 8px; padding: 1px 3px; border-radius: 3px;">#${i+1}</span>
          </div>
        `).join('');
      }
      showToast('🥻 ૬ Patola સાડી સેમ્પલ ફોટા સિલેક્ટ થઈ ગયા! હવે "રીલ બનાવો" બટન દબાવો.');
    });
  }

  function renderPhotosGalleryPreviews() {
    if (!selectedPhotosGallery || !selectedPhotosThumbs) return;
    if (selectedPhotoFilesList.length === 0) {
      selectedPhotosGallery.classList.add('hidden');
      selectedPhotosGallery.style.display = 'none';
      return;
    }
    selectedPhotosGallery.classList.remove('hidden');
    selectedPhotosGallery.style.display = 'flex';
    if (selectedPhotosCountLabel) {
      selectedPhotosCountLabel.innerHTML = `<i class="fa-solid fa-images" style="color: #b89758;"></i> <span>${selectedPhotoFilesList.length} / 6 ફોટા પસંદ કર્યા</span>`;
    }
    selectedPhotosThumbs.innerHTML = '';
    selectedPhotoFilesList.forEach((file, idx) => {
      const url = URL.createObjectURL(file);
      const thumb = document.createElement('div');
      thumb.style.cssText = 'position: relative; width: 62px; height: 82px; border-radius: 9px; overflow: hidden; border: 2px solid rgba(197, 168, 128, 0.7); flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.08);';
      thumb.innerHTML = `
        <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
        <span style="position: absolute; bottom: 2px; left: 2px; background: rgba(0,0,0,0.7); color: #fff; font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 4px;">#${idx+1}</span>
        <button type="button" style="position: absolute; top: 2px; right: 2px; background: rgba(220,38,38,0.85); color: #fff; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 800;" title="Remove">✕</button>
      `;
      thumb.querySelector('button').addEventListener('click', (e) => {
        e.stopPropagation();
        selectedPhotoFilesList.splice(idx, 1);
        renderPhotosGalleryPreviews();
      });
      selectedPhotosThumbs.appendChild(thumb);
    });

    // Append "+ Add More" card at the end of the strip ONLY IF < 6 photos
    if (selectedPhotoFilesList.length < 6) {
      const addCard = document.createElement('div');
      addCard.style.cssText = 'width: 62px; height: 82px; border-radius: 9px; border: 2px dashed rgba(184, 151, 88, 0.8); background: rgba(184, 151, 88, 0.08); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; cursor: pointer; flex-shrink: 0; color: #b89758; transition: all 0.2s;';
      addCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 1.15rem;"></i><span style="font-size: 0.65rem; font-weight: 800;">ઉમેરો</span>`;
      addCard.addEventListener('click', () => {
        if (photoFilesInput) photoFilesInput.click();
      });
      selectedPhotosThumbs.appendChild(addCard);
    }
  }

  const btnAddMorePhotos = document.getElementById('btnAddMorePhotos');
  if (btnAddMorePhotos) {
    btnAddMorePhotos.addEventListener('click', () => {
      if (selectedPhotoFilesList.length >= 6) {
        showToast('મહત્તમ ૬ ફોટા જ ઉમેરી શકાય છે.', true);
        return;
      }
      if (photoFilesInput) photoFilesInput.click();
    });
  }

  if (btnClearPhotos) {
    btnClearPhotos.addEventListener('click', () => {
      selectedPhotoFilesList = [];
      isPatolaPresetActive = false;
      if (photoFilesInput) photoFilesInput.value = '';
      renderPhotosGalleryPreviews();
    });
  }

  let isGeneratingReelBusy = false;

  if (btnGeneratePhotoReel) {
    btnGeneratePhotoReel.addEventListener('click', async () => {
      if (isGeneratingReelBusy) {
        showToast('રીલ બનાવવાનું કામ ચાલુ છે, કૃપા કરીને થોડી સેકન્ડ રાહ જુઓ...', true);
        return;
      }

      if (!isPatolaPresetActive && selectedPhotoFilesList.length === 0) {
        showToast('કૃપા કરીને ઓછામાં ઓછો ૧ ફોટો પસંદ કરો અથવા "Patola સાડી સેમ્પલ" બટન દબાવો.', true);
        if (photoFilesInput) photoFilesInput.click();
        return;
      }

      isGeneratingReelBusy = true;
      btnGeneratePhotoReel.disabled = true;
      if (btnProcessVideo) btnProcessVideo.disabled = true;
      videoLoader.classList.remove('hidden');
      videoLoaderStatus.textContent = '📸 AI તમારા ફોટામાંથી ૩૦-સેકન્ડની સિનેમેટિક રીલ અને મ્યુઝિક રેન્ડર કરી રહ્યું છે... (લગભગ 10-15 સેકન્ડ)';

      try {
        const formData = new FormData();
        if (isPatolaPresetActive) {
          formData.append('usePreset', 'patola');
        } else {
          selectedPhotoFilesList.forEach(file => {
            formData.append('photoFiles', file);
          });
        }

        const titleEl = document.getElementById('photoProductTitle');
        const priceEl = document.getElementById('photoProductPrice');
        const badgeEl = document.getElementById('photoProductBadge');
        const bgmEl = document.getElementById('photoBgmTrack');
        const effectEl = document.getElementById('photoTransitionEffect');

        if (titleEl) formData.append('productTitle', titleEl.value.trim());
        if (priceEl) formData.append('productPrice', priceEl.value.trim());
        if (badgeEl) formData.append('badgeText', badgeEl.value.trim());
        if (effectEl) formData.append('transitionEffect', effectEl.value);

        // 🌟 Link All Video & AI Settings into Photo Reel
        if (videoNicheSelect) formData.append('niche', videoNicheSelect.value);
        if (videoDurationSelect) formData.append('targetDuration', videoDurationSelect.value);
        const videoStyleSelect = document.getElementById('videoStyleSelect');
        if (videoStyleSelect) formData.append('videoStyle', videoStyleSelect.value);
        const videoSubtitlesSelect = document.getElementById('videoSubtitlesSelect');
        if (videoSubtitlesSelect) formData.append('subtitlesStyle', videoSubtitlesSelect.value);

        // Background Music & Volume (Presets or Manual Custom Song Upload)
        if (selectedCustomAudioFile) {
          formData.append('customAudio', selectedCustomAudioFile);
          formData.append('bgmTrack', 'custom');
        } else if (videoBgmSelect && videoBgmSelect.value !== 'none') {
          formData.append('bgmTrack', videoBgmSelect.value);
        } else if (bgmEl) {
          formData.append('bgmTrack', bgmEl.value);
        }
        if (bgmVolumeSlider) formData.append('bgmVolume', bgmVolumeSlider.value);

        // Additional Instructions / Brand Name
        if (videoCustomPrompt && videoCustomPrompt.value.trim()) {
          formData.append('customInstructions', videoCustomPrompt.value.trim());
        }

        // Auto-Pilot Scheduling Support
        if (isScheduleModeActive && videoScheduleDateTime && videoScheduleDateTime.value) {
          formData.append('isScheduled', 'true');
          formData.append('scheduledTime', videoScheduleDateTime.value);
          if (isRecurringDailyMode) {
            formData.append('recurringDaily', 'true');
          }
        }

        const key = getSavedApiKey();
        if (key) formData.append('apiKey', key);

        const res = await fetch('/api/video/photos-to-reel', {
          method: 'POST',
          body: formData
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate reel from photos.');
        }

        currentRenderedReel = data;

        // 1. Play Rendered 9:16 Reel & Set Cover Poster
        if (reelPlaceholder) {
          reelPlaceholder.style.display = 'none';
          reelPlaceholder.classList.add('hidden');
        }
        if (data.coverUrl) {
          renderedVideoPlayer.poster = data.coverUrl;
        }
        renderedVideoPlayer.src = data.videoUrl;
        renderedVideoPlayer.classList.add('active');
        renderedVideoPlayer.style.display = 'block';
        renderedVideoPlayer.load();
        renderedVideoPlayer.play().catch(() => {});

        // 2. Set Recipe Stats & Theme
        if (recipePills) recipePills.classList.remove('hidden');
        if (pillTheme) pillTheme.textContent = data.recipe?.themeName || 'Luxury Saree Showcase';
        if (pillDuration) pillDuration.textContent = data.duration || '24s';

        // 3. Populate captions on social boxes
        if (viralTitleText) viralTitleText.textContent = data.recipe?.viralTitle || '✨ Royal Patola Saree Showcase';
        if (viralCaptionText) viralCaptionText.textContent = data.recipe?.viralCaption || '';
        if (viralHashtagsText) viralHashtagsText.textContent = data.recipe?.viralHashtags || '#PatolaSaree #TraditionalFashion #Handloom';

        // 4. Download buttons
        if (btnDownloadReel) {
          btnDownloadReel.href = data.videoUrl;
          btnDownloadReel.setAttribute('download', data.fileName || 'reel-photos.mp4');
        }
        const btnDownloadCover = document.getElementById('btnDownloadCover');
        if (btnDownloadCover && data.coverUrl) {
          btnDownloadCover.href = data.coverUrl;
          btnDownloadCover.setAttribute('download', (data.fileName || 'reel').replace('.mp4', '-cover.jpg'));
          btnDownloadCover.style.display = 'inline-flex';
        }

        if (videoActionButtons) videoActionButtons.classList.remove('hidden');

        // 5. Enable social publishing buttons
        const btnPublishBoth = document.getElementById('btnPublishBoth');
        const btnPublishInstagram = document.getElementById('btnPublishInstagram');
        const btnPublishYouTube = document.getElementById('btnPublishYouTube');
        if (btnPublishBoth) btnPublishBoth.disabled = false;
        if (btnPublishInstagram) btnPublishInstagram.disabled = false;
        if (btnPublishYouTube) btnPublishYouTube.disabled = false;

        // 6. Switch stepper on mobile to Step 3 (રીલ & પબ્લિશ)
        if (typeof window.setReelStep === 'function') {
          window.setReelStep(3);
        }

        showToast('🎉 ફોટામાંથી શાનદાર પ્રોફેશનલ રીલ સફળતાપૂર્વક બની ગઈ!');
      } catch (err) {
        console.error('Photo reel generation error:', err);
        showToast(`ભૂલ: ${err.message}`, true);
      } finally {
        isGeneratingReelBusy = false;
        btnGeneratePhotoReel.disabled = false;
        if (btnProcessVideo) btnProcessVideo.disabled = false;
        videoLoader.classList.add('hidden');
      }
    });
  }

  // Feature #3: Background Music (BGM) UI & Preview Controls + Custom Song Upload
  const videoBgmSelect = document.getElementById('videoBgmSelect');
  const btnPreviewBgm = document.getElementById('btnPreviewBgm');
  const bgmVolumeRow = document.getElementById('bgmVolumeRow');
  const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
  const bgmVolumeLabel = document.getElementById('bgmVolumeLabel');

  // Custom Song Manual Upload Elements
  const customAudioUploadBox = document.getElementById('customAudioUploadBox');
  const customAudioInput = document.getElementById('customAudioInput');
  const btnChooseCustomAudio = document.getElementById('btnChooseCustomAudio');
  const customAudioFileStatus = document.getElementById('customAudioFileStatus');
  const customAudioPlayerRow = document.getElementById('customAudioPlayerRow');
  const btnPlayCustomAudio = document.getElementById('btnPlayCustomAudio');
  const customAudioNameDisplay = document.getElementById('customAudioNameDisplay');
  const customAudioDurationDisplay = document.getElementById('customAudioDurationDisplay');
  const btnRemoveCustomAudio = document.getElementById('btnRemoveCustomAudio');

  let currentBgmAudio = null;
  let selectedCustomAudioFile = null;
  let customAudioPreviewObj = null;

  function stopAllBgmPlayback() {
    if (currentBgmAudio) {
      currentBgmAudio.pause();
      currentBgmAudio = null;
    }
    if (customAudioPreviewObj) {
      customAudioPreviewObj.pause();
    }
    if (btnPreviewBgm) btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
    if (btnPlayCustomAudio) btnPlayCustomAudio.innerHTML = '<i class="fa-solid fa-play"></i>';
  }

  if (videoBgmSelect) {
    videoBgmSelect.addEventListener('change', () => {
      stopAllBgmPlayback();

      if (videoBgmSelect.value === 'custom') {
        if (customAudioUploadBox) customAudioUploadBox.style.display = 'block';
        if (bgmVolumeRow) bgmVolumeRow.style.display = 'flex';
        // Auto-open file chooser if no custom song selected yet
        if (!selectedCustomAudioFile && customAudioInput) {
          customAudioInput.click();
        }
      } else if (videoBgmSelect.value !== 'none') {
        if (customAudioUploadBox) customAudioUploadBox.style.display = 'none';
        if (bgmVolumeRow) bgmVolumeRow.style.display = 'flex';
      } else {
        if (customAudioUploadBox) customAudioUploadBox.style.display = 'none';
        if (bgmVolumeRow) bgmVolumeRow.style.display = 'none';
      }
    });
  }

  if (btnChooseCustomAudio && customAudioInput) {
    btnChooseCustomAudio.addEventListener('click', () => {
      customAudioInput.click();
    });
  }

  if (customAudioInput) {
    customAudioInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
        showToast('કૃપા કરીને માન્ય ઑડિયો/સોંગ ફાઇલ (MP3, WAV, M4A) પસંદ કરો.', true);
        return;
      }

      stopAllBgmPlayback();
      selectedCustomAudioFile = file;

      if (videoBgmSelect) {
        videoBgmSelect.value = 'custom';
      }
      if (customAudioUploadBox) customAudioUploadBox.style.display = 'block';
      if (bgmVolumeRow) bgmVolumeRow.style.display = 'flex';

      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      if (customAudioFileStatus) {
        customAudioFileStatus.innerHTML = `<span style="color: #16a34a; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> ફાઈલ સિલેક્ટ થઈ</span>`;
      }
      if (customAudioNameDisplay) {
        customAudioNameDisplay.textContent = file.name;
      }
      if (customAudioDurationDisplay) {
        customAudioDurationDisplay.textContent = `${sizeMb} MB • લોડિંગ...`;
      }
      if (customAudioPlayerRow) {
        customAudioPlayerRow.style.display = 'flex';
      }

      try {
        const audioUrl = URL.createObjectURL(file);
        customAudioPreviewObj = new Audio(audioUrl);
        customAudioPreviewObj.volume = bgmVolumeSlider ? parseFloat(bgmVolumeSlider.value) : 0.25;

        customAudioPreviewObj.addEventListener('loadedmetadata', () => {
          const duration = Math.round(customAudioPreviewObj.duration);
          const mins = Math.floor(duration / 60);
          const secs = String(duration % 60).padStart(2, '0');
          if (customAudioDurationDisplay) {
            customAudioDurationDisplay.textContent = `${mins}:${secs} (${sizeMb} MB) • તૈયાર છે`;
          }
        });

        customAudioPreviewObj.addEventListener('ended', () => {
          if (btnPlayCustomAudio) btnPlayCustomAudio.innerHTML = '<i class="fa-solid fa-play"></i>';
          if (btnPreviewBgm) btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
        });

        showToast(`🎵 "${file.name}" સોંગ પસંદ થઈ ગયું!`);
      } catch (err) {
        console.warn('Audio preview object error:', err);
      }
    });
  }

  if (btnPlayCustomAudio) {
    btnPlayCustomAudio.addEventListener('click', () => {
      if (!customAudioPreviewObj) {
        if (customAudioInput) customAudioInput.click();
        return;
      }
      if (customAudioPreviewObj.paused) {
        if (currentBgmAudio) currentBgmAudio.pause();
        customAudioPreviewObj.volume = bgmVolumeSlider ? parseFloat(bgmVolumeSlider.value) : 0.25;
        customAudioPreviewObj.play().then(() => {
          btnPlayCustomAudio.innerHTML = '<i class="fa-solid fa-pause"></i>';
          if (btnPreviewBgm && videoBgmSelect?.value === 'custom') {
            btnPreviewBgm.innerHTML = '<i class="fa-solid fa-pause"></i>';
          }
        }).catch(err => console.warn('Play error:', err));
      } else {
        customAudioPreviewObj.pause();
        btnPlayCustomAudio.innerHTML = '<i class="fa-solid fa-play"></i>';
        if (btnPreviewBgm && videoBgmSelect?.value === 'custom') {
          btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
        }
      }
    });
  }

  if (btnRemoveCustomAudio) {
    btnRemoveCustomAudio.addEventListener('click', () => {
      stopAllBgmPlayback();
      selectedCustomAudioFile = null;
      customAudioPreviewObj = null;
      if (customAudioInput) customAudioInput.value = '';
      if (customAudioPlayerRow) customAudioPlayerRow.style.display = 'none';
      if (customAudioFileStatus) customAudioFileStatus.textContent = 'કોઈ ગીત પસંદ નથી કર્યું';
      if (videoBgmSelect) videoBgmSelect.value = 'none';
      if (customAudioUploadBox) customAudioUploadBox.style.display = 'none';
      if (bgmVolumeRow) bgmVolumeRow.style.display = 'none';
      showToast('કસ્ટમ સોંગ હટાવી દીધું.');
    });
  }

  if (bgmVolumeSlider && bgmVolumeLabel) {
    bgmVolumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      bgmVolumeLabel.textContent = `${Math.round(vol * 100)}%`;
      if (currentBgmAudio) {
        currentBgmAudio.volume = vol;
      }
      if (customAudioPreviewObj) {
        customAudioPreviewObj.volume = vol;
      }
    });
  }

  if (btnPreviewBgm && videoBgmSelect) {
    btnPreviewBgm.addEventListener('click', () => {
      const track = videoBgmSelect.value;
      if (track === 'none') {
        showToast('કૃપા કરીને પહેલા મ્યુઝિક ટ્રેક પસંદ કરો.');
        return;
      }
      if (track === 'custom') {
        if (btnPlayCustomAudio) {
          btnPlayCustomAudio.click();
        } else if (customAudioInput) {
          customAudioInput.click();
        }
        return;
      }
      if (currentBgmAudio && !currentBgmAudio.paused) {
        currentBgmAudio.pause();
        btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
        return;
      }
      if (!currentBgmAudio || currentBgmAudio.dataset.track !== track) {
        currentBgmAudio = new Audio(`/audio/bgm/${track}.mp3`);
        currentBgmAudio.dataset.track = track;
        currentBgmAudio.volume = bgmVolumeSlider ? parseFloat(bgmVolumeSlider.value) : 0.25;
        currentBgmAudio.addEventListener('ended', () => {
          btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
        });
      }
      currentBgmAudio.play().then(() => {
        btnPreviewBgm.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }).catch(err => {
        console.warn('Audio preview error:', err);
      });
    });
  }

  // Process Video or Photo Reel with AI Auto-Editing & Effects
  btnProcessVideo.addEventListener('click', async () => {
    if (isGeneratingReelBusy) {
      showToast('રીલ બનાવવાનું કામ ચાલુ છે, કૃપા કરીને થોડી સેકન્ડ રાહ જુઓ...', true);
      return;
    }

    if (tabSourcePhotos && tabSourcePhotos.classList.contains('active')) {
      if (btnGeneratePhotoReel) {
        btnGeneratePhotoReel.click();
        return;
      }
    }

    if (!selectedVideoFile) {
      showToast('Please upload a video file first.', true);
      fileInput.click();
      return;
    }

    isGeneratingReelBusy = true;
    btnProcessVideo.disabled = true;
    if (btnGeneratePhotoReel) btnGeneratePhotoReel.disabled = true;
    videoLoader.classList.remove('hidden');
    videoLoaderStatus.textContent = isScheduleModeActive 
      ? 'AI is analyzing video and configuring schedule...' 
      : 'AI is analyzing video and generating 30s 9:16 reel with color effects...';

    const formData = new FormData();
    formData.append('videoFile', selectedVideoFile);
    formData.append('niche', videoNicheSelect.value);
    formData.append('targetDuration', videoDurationSelect.value);
    formData.append('customInstructions', videoCustomPrompt.value);

    const videoSubtitlesSelect = document.getElementById('videoSubtitlesSelect');
    if (videoSubtitlesSelect) {
      formData.append('subtitlesStyle', videoSubtitlesSelect.value);
    }

    const videoStyleSelect = document.getElementById('videoStyleSelect');
    if (videoStyleSelect) {
      formData.append('videoStyle', videoStyleSelect.value);
    }

    // Feature #3: Append BGM Settings (Presets or Manual Custom Song Upload)
    if (selectedCustomAudioFile) {
      formData.append('customAudio', selectedCustomAudioFile);
      formData.append('bgmTrack', 'custom');
    } else if (videoBgmSelect) {
      formData.append('bgmTrack', videoBgmSelect.value);
    }
    if (bgmVolumeSlider) {
      formData.append('bgmVolume', bgmVolumeSlider.value);
    }

    if (isScheduleModeActive && videoScheduleDateTime && videoScheduleDateTime.value) {
      formData.append('isScheduled', 'true');
      formData.append('scheduledTime', videoScheduleDateTime.value);
      if (isRecurringDailyMode) {
        formData.append('recurringDaily', 'true');
      }
    }

    const key = getSavedApiKey();
    if (key) formData.append('apiKey', key);

    try {
      const res = await fetch('/api/video/auto-edit', {
        method: 'POST',
        body: formData
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to process video.');
      }

      currentRenderedReel = data;

      // 1. Play Rendered 9:16 Reel & Set Cover Poster
      reelPlaceholder.style.display = 'none';
      if (data.thumbnailUrl) {
        renderedVideoPlayer.poster = data.thumbnailUrl;
      }
      renderedVideoPlayer.src = data.reelUrl;
      renderedVideoPlayer.classList.add('active');
      renderedVideoPlayer.load();
      renderedVideoPlayer.play().catch(() => {});

      // 2. Set Recipe Stats & AI Vision Topic
      pillTheme.textContent = data.recipe?.themeName || 'Royal Vibrant';
      pillDuration.textContent = data.duration || '30s';
      recipePills.classList.remove('hidden');

      const pillSubtitles = document.getElementById('pillSubtitles');
      const lblPillSubtitles = document.getElementById('lblPillSubtitles');
      if (pillSubtitles && lblPillSubtitles) {
        if (data.subtitlesEnabled) {
          lblPillSubtitles.textContent = data.subtitlesStyle === 'electric-cyan' ? 'Cyan Subs' : 'Hormozi Subs';
          pillSubtitles.style.display = 'inline-flex';
        } else {
          pillSubtitles.style.display = 'none';
        }
      }

      const pillBgm = document.getElementById('pillBgm');
      const lblPillBgm = document.getElementById('lblPillBgm');
      if (pillBgm && lblPillBgm) {
        if (data.bgmEnabled) {
          const bgmLabels = {
            'royal-heritage': 'Royal Sitar BGM',
            'luxury-saree': 'Luxury Flute BGM',
            'cinematic-ambient': 'Ambient BGM',
            'lofi-aesthetic': 'Lo-Fi BGM'
          };
          lblPillBgm.textContent = bgmLabels[data.bgmTrack] || 'BGM Active';
          pillBgm.classList.remove('hidden');
        } else {
          pillBgm.classList.add('hidden');
        }
      }

      // Schedule Pill & Banner
      if (data.isScheduled && data.scheduledItem) {
        if (pillScheduleTime && lblPillScheduleTime) {
          lblPillScheduleTime.textContent = formatGujaratiDateTime(data.scheduledItem.scheduledTime);
          pillScheduleTime.classList.remove('hidden');
        }
        if (scheduledPublishBanner && scheduledBannerTime) {
          scheduledBannerTime.textContent = formatGujaratiDateTime(data.scheduledItem.scheduledTime);
          scheduledPublishBanner.classList.remove('hidden');
        }
      } else {
        if (pillScheduleTime) pillScheduleTime.classList.add('hidden');
        if (scheduledPublishBanner) scheduledPublishBanner.classList.add('hidden');
      }

      const aiDetectedTopicBadge = document.getElementById('aiDetectedTopicBadge');
      const detectedTopicText = document.getElementById('detectedTopicText');
      if (data.recipe?.detectedTopic) {
        detectedTopicText.textContent = data.recipe.detectedTopic;
        aiDetectedTopicBadge.classList.remove('hidden');
      }

      // 3. Set Social Media Texts
      viralTitleText.textContent = data.recipe?.viralTitle || '✨ Watch This Till The End! #Shorts #Reels';
      viralCaptionText.textContent = data.recipe?.viralCaption || 'Unbelievable moments captured in high aesthetic 4K!';
      viralHashtagsText.textContent = data.recipe?.viralHashtags || '#ViralReels #Trending #Shorts #Explore';

      // 4. Download Reel & Cover Thumbnail Buttons
      btnDownloadReel.href = data.downloadUrl;
      btnDownloadReel.setAttribute('download', data.fileName || 'reel-30s.mp4');

      const btnDownloadCover = document.getElementById('btnDownloadCover');
      const btnOpenThumbnailStudio = document.getElementById('btnOpenThumbnailStudio');
      const thumbQuickBar = document.getElementById('thumbQuickBar');
      const thumbMiniPreview = document.getElementById('thumbMiniPreview');
      const thumbMiniHeadline = document.getElementById('thumbMiniHeadline');

      if (data.thumbnailUrl) {
        if (btnDownloadCover) {
          btnDownloadCover.href = data.thumbnailUrl;
          btnDownloadCover.setAttribute('download', (data.fileName || 'reel').replace('.mp4', '-cover.jpg'));
          btnDownloadCover.style.display = 'inline-flex';
        }
        if (btnOpenThumbnailStudio) {
          btnOpenThumbnailStudio.style.display = 'inline-flex';
        }
        const rawHeadline = data.recipe?.viralTitle || 'MUST WATCH 🎬';
        const cleanHeadline = rawHeadline.replace(/#\w+/g, '').replace(/[:]/g, '').trim();

        if (thumbQuickBar && thumbMiniPreview && thumbMiniHeadline) {
          thumbMiniPreview.src = data.thumbnailUrl;
          thumbMiniHeadline.textContent = cleanHeadline || 'Viral 9:16';
          thumbQuickBar.classList.remove('hidden');
        }

        const timelineQuickBar = document.getElementById('timelineQuickBar');
        if (timelineQuickBar) {
          timelineQuickBar.classList.remove('hidden');
        }

        // Cache thumbnail studio state (Clean Frame default to eliminate duplicate names & clutter)
        window.activeReelThumbnail = {
          fileName: data.fileName,
          thumbnailUrl: data.thumbnailUrl,
          headlineText: cleanHeadline || 'MUST WATCH 🎬',
          hookBadge: '',
          bottomText: '',
          positionMode: 'none',
          fontStyle: 'classic',
          colorStyle: 'gold',
          timestamp: 6.5
        };
      }

      videoActionButtons.classList.remove('hidden');

      // 5. Enable Social Media Buttons
      btnPublishYouTube.disabled = false;
      btnPublishInstagram.disabled = false;
      const btnPublishBoth = document.getElementById('btnPublishBoth');
      if (btnPublishBoth) btnPublishBoth.disabled = false;

      if (data.isScheduled && data.scheduledItem) {
        if (data.scheduledItem.recurringDaily) {
          showToast(`🎉 Daily recurring auto-post set successfully for ${formatGujaratiDateTime(data.scheduledItem.scheduledTime)}! 🔁`);
        } else {
          showToast(`🎉 Reel scheduled successfully for ${formatGujaratiDateTime(data.scheduledItem.scheduledTime)}!`);
        }
      } else {
        showToast('🎉 30-second AI Reel generated successfully!');
      }

      // On mobile, auto-advance stepper to Step 3 (Preview & Publish)
      if (typeof window.setReelStep === 'function') {
        window.setReelStep(3);
      }

      fetchScheduledQueue();

    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message}`, true);
    } finally {
      isGeneratingReelBusy = false;
      btnProcessVideo.disabled = false;
      if (btnGeneratePhotoReel) btnGeneratePhotoReel.disabled = false;
      videoLoader.classList.add('hidden');
    }
  });

  // Instagram Guide Modal Elements
  const instagramGuideModal = document.getElementById('instagramGuideModal');
  const btnCloseIgModal = document.getElementById('btnCloseIgModal');
  const btnRedownloadReel = document.getElementById('btnRedownloadReel');
  const btnOpenInstagramAgain = document.getElementById('btnOpenInstagramAgain');

  function triggerReelFileDownload() {
    if (!currentRenderedReel) return;
    const dlLink = document.createElement('a');
    dlLink.href = currentRenderedReel.downloadUrl || currentRenderedReel.reelUrl;
    dlLink.download = currentRenderedReel.fileName || 'instagram-reel-30s.mp4';
    document.body.appendChild(dlLink);
    dlLink.click();
    document.body.removeChild(dlLink);
  }

  if (btnCloseIgModal) {
    btnCloseIgModal.addEventListener('click', () => {
      if (instagramGuideModal) instagramGuideModal.classList.add('hidden');
    });
  }

  if (btnRedownloadReel) {
    btnRedownloadReel.addEventListener('click', () => {
      triggerReelFileDownload();
      showToast('Re-downloading video...');
    });
  }

  if (btnOpenInstagramAgain) {
    btnOpenInstagramAgain.addEventListener('click', () => {
      window.open('https://www.instagram.com/', '_blank');
    });
  }

  // Direct YouTube Upload Action
  btnPublishYouTube.addEventListener('click', async () => {
    if (!currentRenderedReel) return;

    const ytToken = localStorage.getItem('YOUTUBE_ACCESS_TOKEN');

    // 100% Hands-Free YouTube Data API Direct Publishing (if token in local or server)
    if (ytToken || window.isYouTubeConnected) {
      btnPublishYouTube.disabled = true;
      btnPublishYouTube.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing YouTube Shorts...';
      showToast('🚀 Publishing Shorts directly via YouTube Data API...');

      try {
        const fullDesc = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
        const res = await fetch('/api/social/publish-youtube-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName: currentRenderedReel.fileName,
            title: viralTitleText.textContent,
            description: fullDesc,
            accessToken: ytToken || undefined
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'YouTube upload failed.');
        }

        showToast('🎉 YouTube Short published directly to your channel!');
        if (data.postUrl) {
          window.open(data.postUrl, '_blank');
        }
        return;
      } catch (err) {
        showToast(`YouTube API Error: ${err.message}`, true);
        triggerGuidedYouTubeFlow();
      } finally {
        btnPublishYouTube.disabled = false;
        btnPublishYouTube.innerHTML = '<i class="fa-brands fa-youtube"></i> <span>Upload to YouTube Shorts</span>';
      }
      return;
    }

    triggerGuidedYouTubeFlow();
  });

  // 1-Click Publish to BOTH (Instagram Reels + YouTube Shorts)
  const btnPublishBoth = document.getElementById('btnPublishBoth');
  if (btnPublishBoth) {
    btnPublishBoth.addEventListener('click', async () => {
      if (!currentRenderedReel) return;

      btnPublishBoth.disabled = true;
      btnPublishBoth.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing to Instagram & YouTube...';
      showToast('🚀 Publishing simultaneously to Instagram Reels & YouTube Shorts...');

      try {
        const fullDesc = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
        const res = await fetch('/api/social/publish-both-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName: currentRenderedReel.fileName,
            title: viralTitleText.textContent,
            caption: viralCaptionText.textContent,
            hashtags: viralHashtagsText.textContent,
            description: fullDesc,
            youtubeToken: localStorage.getItem('YOUTUBE_ACCESS_TOKEN') || undefined,
            igToken: localStorage.getItem('META_IG_TOKEN') || undefined,
            igUserId: localStorage.getItem('META_IG_USER_ID') || undefined
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Publishing failed.');
        }

        let msg = '🎉 Published successfully!';
        if (data.instagram && data.youtube) {
          msg = '🎉 Posted to BOTH Instagram Reels & YouTube Shorts!';
        } else if (data.instagram) {
          msg = '🎉 Posted to Instagram Reels!';
        } else if (data.youtube) {
          msg = '🎉 Posted to YouTube Shorts!';
        }
        showToast(msg);

        if (data.instagram?.postUrl) window.open(data.instagram.postUrl, '_blank');
        if (data.youtube?.postUrl) window.open(data.youtube.postUrl, '_blank');
      } catch (err) {
        showToast(`Publishing Error: ${err.message}`, true);
      } finally {
        btnPublishBoth.disabled = false;
        btnPublishBoth.innerHTML = '<i class="fa-solid fa-bolt"></i> <span>🚀 1-Click Publish to BOTH (Instagram Reels + YouTube Shorts)</span>';
      }
    });
  }

  function triggerGuidedYouTubeFlow() {
    try {
      // 1. Auto download video
      triggerReelFileDownload();

      // 2. Copy Title & Description
      const fullDesc = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
      navigator.clipboard.writeText(`${viralTitleText.textContent}\n\n${fullDesc}`);

      showToast('🎉 Video downloaded & title copied! Opening YouTube Studio...');
      window.open('https://studio.youtube.com/channel/upload', '_blank');
    } catch (err) {
      showToast(err.message, true);
    }
  }

  const btnOpenMetaSettings = document.getElementById('btnOpenMetaSettings');
  if (btnOpenMetaSettings) {
    btnOpenMetaSettings.addEventListener('click', () => {
      if (instagramGuideModal) instagramGuideModal.classList.add('hidden');
      if (settingsModal) settingsModal.classList.remove('hidden');
    });
  }

  // Direct Instagram Reels Upload Action
  // Direct Instagram Reels Upload Action
  btnPublishInstagram.addEventListener('click', async () => {
    if (!currentRenderedReel) return;

    btnPublishInstagram.disabled = true;
    btnPublishInstagram.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing Instagram Reel...';
    showToast('🚀 Uploading Reel directly via Meta Graph API...');

    try {
      const fullCaption = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
      const res = await fetch('/api/social/publish-instagram-direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoFileName: currentRenderedReel.fileName,
          caption: fullCaption
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error publishing Instagram Reel.');
      }

      showToast('🎉 100% Hands-Free: Reel published directly to Instagram (@kuldip__3868)!');
      if (data.postUrl) {
        window.open(data.postUrl, '_blank');
      }
      return;
    } catch (err) {
      console.warn('Direct upload error, falling back to guided flow:', err);
      showToast(`Auto-publish error: ${err.message}`, true);
      triggerGuidedInstagramFlow();
    } finally {
      btnPublishInstagram.disabled = false;
      btnPublishInstagram.innerHTML = '<i class="fa-brands fa-instagram"></i> <span>Upload to Instagram Reels (@kuldip__3868)</span>';
    }
  });

  function triggerGuidedInstagramFlow() {
    try {
      // 1. Auto-trigger video download directly to user's PC
      triggerReelFileDownload();

      // 2. Auto-copy caption & viral hashtags to clipboard
      const fullCaption = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
      try {
        navigator.clipboard.writeText(fullCaption);
      } catch (_) {}

      showToast('✅ Video downloaded and caption copied to clipboard!');

      // 3. Open Instagram Web
      window.open('https://www.instagram.com/', '_blank');

      // 4. Show the step-by-step guidance modal
      if (instagramGuideModal) {
        instagramGuideModal.classList.remove('hidden');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, true);
    }
  }

  // Fetch initial queue and poll
  fetchScheduledQueue();
  setInterval(fetchScheduledQueue, 30000);
}

// ========================================================
// ⏰ DAILY LONG-VIDEO AUTO-PILOT SCHEDULER IMPLEMENTATION
// ========================================================

let selectedSchedulerFile = null;

async function fetchSchedulerStatus() {
  try {
    const res = await fetch('/api/scheduler/status');
    const data = await res.json();
    if (data.success && data.state) {
      renderSchedulerState(data.state);
    }
  } catch (err) {
    console.error('Fetch scheduler status failed:', err);
  }
}

function renderSchedulerState(state) {
  const lblSchedStatus = document.getElementById('lblSchedStatus');
  const lblSchedTime = document.getElementById('lblSchedTime');
  const lblSchedVideoName = document.getElementById('lblSchedVideoName');
  const lblSchedTotalDur = document.getElementById('lblSchedTotalDur');
  const lblSchedNextPart = document.getElementById('lblSchedNextPart');
  const schedProgressLabel = document.getElementById('schedProgressLabel');
  const schedProgressBar = document.getElementById('schedProgressBar');
  const partsHistoryList = document.getElementById('partsHistoryList');
  const schedLatestPlayer = document.getElementById('schedLatestPlayer');
  const schedPlayerPlaceholder = document.getElementById('schedPlayerPlaceholder');

  if (!lblSchedStatus) return;

  // Status Labels
  lblSchedStatus.textContent = state.isActive ? 'Active (Auto-Pilot Active ✓)' : 'Paused';
  lblSchedStatus.style.color = state.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)';

  lblSchedTime.textContent = `Daily at ${state.scheduledTime || '08:30'}`;
  const timeInput = document.getElementById('scheduleDailyTime');
  if (timeInput) timeInput.value = state.scheduledTime || '08:30';

  if (state.masterVideo) {
    lblSchedVideoName.textContent = state.masterVideo.originalName || 'Master Video';
    lblSchedTotalDur.textContent = `${state.masterVideo.totalDurationFormatted || ''} (${state.masterVideo.totalParts || 0} total parts)`;
    lblSchedNextPart.textContent = `Part ${state.currentPart} (Seconds ${state.lastPostedSeconds} - ${state.lastPostedSeconds + 30})`;

    // Progress Bar
    const postedParts = state.currentPart - 1;
    const totalParts = state.masterVideo.totalParts || 1;
    const pct = Math.min(100, Math.round((postedParts / totalParts) * 100));
    schedProgressBar.style.width = `${pct}%`;
    schedProgressLabel.textContent = `${postedParts} / ${totalParts} Parts Posted (${pct}%) • ${totalParts - postedParts} Remaining`;
  } else {
    lblSchedVideoName.textContent = 'No long video uploaded';
    lblSchedTotalDur.textContent = '0 Seconds';
    lblSchedNextPart.textContent = 'Part 1 (Pending)';
    schedProgressBar.style.width = '0%';
    schedProgressLabel.textContent = '0 / 0 Parts Posted';
  }

  // Render History List
  const history = state.history || [];
  if (history.length === 0) {
    partsHistoryList.innerHTML = `
      <div class="empty-parts-notice">
        <i class="fa-regular fa-clock"></i>
        <p>No parts published yet. Click "Extract & Post Next Part Now" to test.</p>
      </div>`;
    schedLatestPlayer.style.display = 'none';
    schedPlayerPlaceholder.style.display = 'flex';
  } else {
    // Show latest reel in player
    const latest = history[0];
    schedLatestPlayer.src = latest.renderedReelUrl;
    schedLatestPlayer.style.display = 'block';
    schedPlayerPlaceholder.style.display = 'none';

    partsHistoryList.innerHTML = history.map(item => `
      <div class="part-card-item">
        <div class="part-card-header">
          <span class="part-badge-tag"><i class="fa-solid fa-play"></i> Part ${item.part} (${item.startSeconds}s - ${item.endSeconds}s)</span>
          <small style="color: var(--text-muted); font-size: 0.75rem;"><i class="fa-regular fa-calendar-check"></i> ${item.displayTime || ''}</small>
        </div>
        <div class="part-card-title">${item.viralTitle || 'Part ' + item.part}</div>
        <div style="font-size: 0.78rem; color: #a5b4fc;"><i class="fa-solid fa-wand-magic-sparkles"></i> ${item.detectedTopic || ''}</div>
        <div class="part-card-actions">
          <a href="${item.renderedReelUrl}" target="_blank" class="btn btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.75rem;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i> Play
          </a>
          <a href="${item.renderedReelUrl}" download="${item.fileName || 'part.mp4'}" class="btn btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.75rem;">
            <i class="fa-solid fa-download"></i> Download
          </a>
          ${item.instagramPostUrl ? `<a href="${item.instagramPostUrl}" target="_blank" class="btn btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.75rem; color: #ec4899; text-decoration: none;"><i class="fa-brands fa-instagram"></i> View IG</a>` : ''}
          ${item.youtubePostUrl ? `<a href="${item.youtubePostUrl}" target="_blank" class="btn btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.75rem; color: #ef4444; text-decoration: none;"><i class="fa-brands fa-youtube"></i> View Shorts</a>` : ''}
        </div>
      </div>
    `).join('');
  }
}

function initSchedulerView() {
  const dropzone = document.getElementById('schedulerDropzone');
  const fileInput = document.getElementById('schedulerFileInput');
  const fileNameBadge = document.getElementById('schedulerFileNameBadge');
  const timeInput = document.getElementById('scheduleDailyTime');
  const btnSaveSchedule = document.getElementById('btnSaveSchedule');
  const btnRunNextNow = document.getElementById('btnRunNextNow');
  const btnRefreshSched = document.getElementById('btnRefreshSched');

  if (!dropzone || !btnSaveSchedule) return;

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSchedulerFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSchedulerFile(e.target.files[0]);
    }
  });

  function handleSchedulerFile(file) {
    if (!file.type.startsWith('video/')) {
      showToast('Please select a video file.', true);
      return;
    }
    selectedSchedulerFile = file;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    fileNameBadge.textContent = `✓ Selected: ${file.name} (${mbSize} MB)`;
    fileNameBadge.classList.remove('hidden');
    showToast(`Long video selected: ${file.name}`);
  }

  // Time formatting & Quick Presets
  const timeDisplayHint = document.getElementById('timeDisplayHint');

  function updateTimeLabel(val) {
    if (!val) return;
    const [h, m] = val.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const padM = String(m).padStart(2, '0');
    const dayPeriod = (h < 12) ? 'Morning' : (h < 17) ? 'Afternoon' : (h < 20) ? 'Evening' : 'Night';
    if (timeDisplayHint) {
      timeDisplayHint.textContent = `Daily at ${displayHour}:${padM} ${period} (${dayPeriod})`;
    }
  }

  timeInput.addEventListener('input', (e) => {
    updateTimeLabel(e.target.value);
  });

  document.querySelectorAll('.time-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const t = chip.getAttribute('data-time');
      timeInput.value = t;
      updateTimeLabel(t);
      showToast(`Time selected: ${chip.getAttribute('data-label')}`);
    });
  });

  // Save Schedule / Upload Master Video
  btnSaveSchedule.addEventListener('click', async () => {
    const scheduledTime = timeInput.value || '08:30';

    btnSaveSchedule.disabled = true;
    btnSaveSchedule.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Activating...';

    const formData = new FormData();
    formData.append('scheduledTime', scheduledTime);
    if (selectedSchedulerFile) {
      formData.append('masterVideo', selectedSchedulerFile);
    }

    try {
      const res = await fetch('/api/scheduler/setup', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to configure scheduler.');
      }
      showToast(data.message || 'Scheduler auto-pilot activated successfully!');
      renderSchedulerState(data.state);
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnSaveSchedule.disabled = false;
      btnSaveSchedule.innerHTML = '<i class="fa-solid fa-play"></i> <span>⏰ Activate Scheduler (Auto-Pilot)</span>';
    }
  });

  // Run Next Part Right Now (Test Action)
  btnRunNextNow.addEventListener('click', async () => {
    btnRunNextNow.disabled = true;
    btnRunNextNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating next 30s part...';

    try {
      const res = await fetch('/api/scheduler/run-next', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract part.');
      }
      showToast(`🎉 Part ${data.item.part} generated successfully! (Will never repeat)`);
      renderSchedulerState(data.state);
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnRunNextNow.disabled = false;
      btnRunNextNow.innerHTML = '<i class="fa-solid fa-forward-step"></i> <span>⚡ Extract & Post Next Part (30s) Now</span>';
    }
  });

  const btnLoadSampleVideo = document.getElementById('btnLoadSampleVideo');
  if (btnLoadSampleVideo) {
    btnLoadSampleVideo.addEventListener('click', async () => {
      btnLoadSampleVideo.disabled = true;
      btnLoadSampleVideo.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading sample...';
      try {
        const scheduledTime = timeInput.value || '08:30';
        const res = await fetch('/api/scheduler/load-sample', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledTime })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load sample video.');
        }
        showToast('🎉 15-minute sample video loaded successfully! (30 parts)');
        renderSchedulerState(data.state);
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      } finally {
        btnLoadSampleVideo.disabled = false;
        btnLoadSampleVideo.innerHTML = '<i class="fa-solid fa-bolt"></i> ⚡ Load 15-Min Test Sample (Quick Test)';
      }
    });
  }

  btnRefreshSched.addEventListener('click', () => {
    fetchSchedulerStatus();
    showToast('Scheduler status refreshed.');
  });
}

// Check Social Media Integration Status
async function initSocialConnectionBadge() {
  try {
    const res = await fetch('/api/social/status');
    const data = await res.json();
    if (data.success) {
      window.isInstagramConnected = !!data.instagram?.connected;
      window.isYouTubeConnected = !!data.youtube?.connected;

      if (data.instagram?.connected) {
        const btnPublishIg = document.getElementById('btnPublishInstagram');
        if (btnPublishIg) {
          btnPublishIg.innerHTML = `<i class="fa-brands fa-instagram"></i> <span>Upload to Instagram Reels (@${data.instagram.username} Connected ⚡)</span>`;
        }
        console.log('✅ Instagram Connected:', data.instagram.username);
      }

      const ytPill = document.getElementById('youtubeStatusPill');
      const btnPublishYt = document.getElementById('btnPublishYouTube');

      if (data.youtube?.connected) {
        const title = data.youtube.channelTitle || 'Channel Connected';
        if (btnPublishYt) {
          btnPublishYt.innerHTML = `<i class="fa-brands fa-youtube"></i> <span>Upload to YouTube Shorts (${title} ⚡)</span>`;
        }
        if (ytPill) {
          ytPill.textContent = `${title} ✓`;
          ytPill.style.background = 'rgba(16, 185, 129, 0.15)';
          ytPill.style.color = '#059669';
        }
        console.log('✅ YouTube Connected:', title);
      } else if (ytPill) {
        ytPill.textContent = 'Not Connected';
        ytPill.style.background = 'rgba(239, 68, 68, 0.1)';
        ytPill.style.color = '#ef4444';
      }
    }
  } catch (_) {}
}

initSocialConnectionBadge();

// Test YouTube OAuth Access Token Listener
const btnTestYouTubeToken = document.getElementById('btnTestYouTubeToken');
if (btnTestYouTubeToken) {
  btnTestYouTubeToken.addEventListener('click', async () => {
    const tokenInput = document.getElementById('youtubeTokenInput');
    const token = tokenInput?.value.trim() || localStorage.getItem('YOUTUBE_ACCESS_TOKEN');
    const testResult = document.getElementById('youtubeTestResult');

    if (!token) {
      showToast('⚠️ Please enter a YouTube OAuth Access Token first.', 'error');
      return;
    }

    btnTestYouTubeToken.disabled = true;
    btnTestYouTubeToken.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Testing...';
    if (testResult) {
      testResult.style.display = 'block';
      testResult.innerHTML = '<span style="color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Testing YouTube API connection...</span>';
    }

    try {
      const res = await fetch('/api/social/test-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Connection failed.');
      }

      if (testResult) {
        testResult.innerHTML = `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 0.5rem 0.75rem; color: #065f46; display: flex; align-items: center; gap: 0.5rem;">
            <i class="fa-solid fa-circle-check" style="color: #059669; font-size: 1.1rem;"></i>
            <div>
              <b>Connected Channel: ${data.channel.title}</b>
              <div style="font-size: 0.72rem; color: #047857;">Subscribers: ${Number(data.channel.subscriberCount || 0).toLocaleString()} • Videos: ${data.channel.videoCount || 0}</div>
            </div>
          </div>
        `;
      }
      const pill = document.getElementById('youtubeStatusPill');
      if (pill) {
        pill.textContent = `${data.channel.title} ✓`;
        pill.style.background = 'rgba(16, 185, 129, 0.15)';
        pill.style.color = '#059669';
      }
      showToast(`🎉 YouTube channel "${data.channel.title}" connected successfully!`);
      initSocialConnectionBadge();
    } catch (err) {
      if (testResult) {
        testResult.innerHTML = `
          <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 0.5rem 0.75rem; color: #991b1b;">
            <i class="fa-solid fa-circle-exclamation"></i> ${err.message}
          </div>
        `;
      }
      showToast(`YouTube Error: ${err.message}`, true);
    } finally {
      btnTestYouTubeToken.disabled = false;
      btnTestYouTubeToken.innerHTML = '<i class="fa-solid fa-plug"></i> Test Connection';
    }
  });
}

// ==========================================
// 📦 STOCK & INVENTORY & BILLING SUITE
// ==========================================

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 🖼️ FEATURE #4: AI SMART THUMBNAIL STUDIO
// ==========================================
function initThumbnailStudio() {
  const modal = document.getElementById('thumbnailStudioModal');
  const btnOpen = document.getElementById('btnOpenThumbnailStudio');
  const btnEditMini = document.getElementById('btnEditThumbnailMini');
  const btnClose = document.getElementById('btnCloseThumbnailModal');
  const btnCloseFooter = document.getElementById('btnCloseThumbnailModalFooter');
  const previewImg = document.getElementById('thumbStudioPreviewImg');
  const headlineInput = document.getElementById('thumbHeadlineInput');
  const hookBadgeInput = document.getElementById('thumbHookBadgeInput');
  const timeSlider = document.getElementById('thumbTimeSlider');
  const timeDisplay = document.getElementById('thumbTimeDisplay');
  const colorBtns = document.querySelectorAll('#thumbColorOptions .btn-color-pick');
  const btnRegen = document.getElementById('btnRegenerateThumbnailInModal');
  const loadingOverlay = document.getElementById('thumbStudioLoading');
  const btnDownloadFinal = document.getElementById('btnDownloadThumbnailFinal');

  if (!modal) return;

  let selectedColor = 'gold';
  let selectedPosition = 'title-only';
  let selectedFont = 'classic';

  const posBtns = document.querySelectorAll('#thumbPositionOptions .btn-pos-pick');
  const fontBtns = document.querySelectorAll('#thumbFontOptions .btn-font-pick');

  // Position button toggle
  posBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      posBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPosition = btn.dataset.pos || 'title-only';
    });
  });

  // Font button toggle
  fontBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fontBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedFont = btn.dataset.font || 'classic';
    });
  });

  function openStudio() {
    const state = window.activeReelThumbnail || {};
    let headline = (state.headlineText || 'MUST WATCH 🎬')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}★✦✧✨🔥⚡👑🧵😱❌💡]/gu, '')
      .replace(/#\w+/g, '')
      .trim();
    let hook = (state.hookBadge || state.bottomText || '')
      .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}★✦✧✨🔥⚡👑🧵😱❌💡]/gu, '')
      .trim();

    // DEDUPLICATION: If bottom hook is duplicate of headline or contains same words, leave it empty!
    const nHead = headline.replace(/[^A-Z]/gi, '').toLowerCase();
    const nHook = hook.replace(/[^A-Z]/gi, '').toLowerCase();
    if (nHook && nHead && (nHead.includes(nHook) || nHook.includes(nHead))) {
      hook = '';
    }

    if (headlineInput) headlineInput.value = headline;
    if (hookBadgeInput) hookBadgeInput.value = hook;

    const defaultTime = state.timestamp || 6.5;
    if (timeSlider) {
      timeSlider.value = defaultTime;
      if (timeDisplay) timeDisplay.textContent = `${defaultTime}s`;
    }

    selectedPosition = state.positionMode || 'none';
    posBtns.forEach(b => {
      if (b.dataset.pos === selectedPosition) b.classList.add('active');
      else b.classList.remove('active');
    });

    selectedFont = state.fontStyle || 'classic';
    fontBtns.forEach(b => {
      if (b.dataset.font === selectedFont) b.classList.add('active');
      else b.classList.remove('active');
    });

    selectedColor = state.colorStyle || 'gold';
    colorBtns.forEach(b => {
      if (b.dataset.color === selectedColor) b.classList.add('active');
      else b.classList.remove('active');
    });

    if (previewImg && state.thumbnailUrl) {
      previewImg.src = state.thumbnailUrl;
    }
    if (btnDownloadFinal && state.thumbnailUrl) {
      btnDownloadFinal.href = state.thumbnailUrl;
      btnDownloadFinal.setAttribute('download', (state.fileName || 'reel').replace('.mp4', '-cover.jpg'));
    }
    modal.classList.remove('hidden');
  }

  function closeStudio() {
    modal.classList.add('hidden');
  }

  if (btnOpen) btnOpen.addEventListener('click', openStudio);
  if (btnEditMini) btnEditMini.addEventListener('click', openStudio);
  if (btnClose) btnClose.addEventListener('click', closeStudio);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeStudio);

  // Close modal when backdrop is clicked
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeStudio();
  });

  // Slider update
  if (timeSlider && timeDisplay) {
    timeSlider.addEventListener('input', (e) => {
      timeDisplay.textContent = `${e.target.value}s`;
    });
  }

  // Color button toggle
  colorBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      colorBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.color || 'gold';
    });
  });

  // Re-generate action
  if (btnRegen) {
    btnRegen.addEventListener('click', async () => {
      const state = window.activeReelThumbnail;
      if (!state || !state.fileName) {
        showToast('કૃપા કરીને પહેલા વિડીયો બનાવો અથવા પસંદ કરો.', true);
        return;
      }

      const headlineText = headlineInput ? headlineInput.value.trim() : '';
      const hookBadge = hookBadgeInput ? hookBadgeInput.value.trim() : '';
      const timestamp = timeSlider ? parseFloat(timeSlider.value) : 6.5;

      try {
        if (loadingOverlay) loadingOverlay.classList.remove('hidden');
        btnRegen.disabled = true;

        const res = await fetch('/api/video/generate-thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName: state.fileName,
            headlineText,
            hookBadge,
            bottomText: hookBadge,
            positionMode: selectedPosition,
            fontStyle: selectedFont,
            colorStyle: selectedColor,
            timestamp
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate thumbnail.');
        }

        // Update active state
        window.activeReelThumbnail = {
          ...window.activeReelThumbnail,
          thumbnailUrl: data.thumbnailUrl,
          headlineText,
          hookBadge,
          bottomText: hookBadge,
          positionMode: selectedPosition,
          fontStyle: selectedFont,
          colorStyle: selectedColor,
          timestamp
        };

        // Update UI
        if (previewImg) previewImg.src = data.thumbnailUrl;
        if (btnDownloadFinal) {
          btnDownloadFinal.href = data.thumbnailUrl;
          btnDownloadFinal.setAttribute('download', (state.fileName || 'reel').replace('.mp4', '-cover.jpg'));
        }

        const thumbMiniPreview = document.getElementById('thumbMiniPreview');
        const thumbMiniHeadline = document.getElementById('thumbMiniHeadline');
        if (thumbMiniPreview) thumbMiniPreview.src = data.thumbnailUrl;
        if (thumbMiniHeadline) thumbMiniHeadline.textContent = headlineText || 'Viral Cover';

        const btnDownloadCover = document.getElementById('btnDownloadCover');
        if (btnDownloadCover) {
          btnDownloadCover.href = data.thumbnailUrl;
          btnDownloadCover.setAttribute('download', (state.fileName || 'reel').replace('.mp4', '-cover.jpg'));
        }

        const renderedVideoPlayer = document.getElementById('renderedVideoPlayer');
        if (renderedVideoPlayer) {
          renderedVideoPlayer.poster = data.thumbnailUrl;
        }

        showToast('🎉 નવો HD 9:16 કવર ફોટો સફળતાપૂર્વક બની ગયો છે! 🖼️');
      } catch (err) {
        console.error(err);
        showToast(`ભૂલ: ${err.message}`, true);
      } finally {
        if (loadingOverlay) loadingOverlay.classList.add('hidden');
        btnRegen.disabled = false;
      }
    });
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initThumbnailStudio);
} else {
  initThumbnailStudio();
}

// ==========================================
// 📊 8. LIVE SOCIAL ANALYTICS & VIEWS TRACKER
// ==========================================
let isAnalyticsFetching = false;
let currentAnalyticsReels = [];
let currentAnalyticsSort = 'viral';

function initAnalyticsView() {
  const btnRefresh = document.getElementById('btnRefreshAnalytics');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      fetchAnalyticsOverview(true);
    });
  }

  // Sort buttons listeners
  const sortButtons = document.querySelectorAll('.analytics-sort-btn');
  sortButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      sortButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAnalyticsSort = btn.getAttribute('data-sort') || 'viral';
      applyAnalyticsSortingAndRender();
    });
  });

  const btnClean = document.getElementById('btnCleanStorage');
  if (btnClean) {
    btnClean.addEventListener('click', async () => {
      if (!confirm('શું તમે ૭ દિવસથી જૂની રેન્ડર વિડીયો ફાઈલો સાફ કરવા માંગો છો? (તાજેતરની ૫ રીલ્સ હંમેશા સુરક્ષિત રહેશે)')) {
        return;
      }
      try {
        btnClean.disabled = true;
        btnClean.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> સાફ થઈ રહ્યું છે...';
        const res = await fetch('/api/storage/clean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ daysOld: 7 })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`🧹 ${data.message}`);
          fetchAnalyticsOverview();
        } else {
          showToast(`ભૂલ: ${data.error}`, true);
        }
      } catch (err) {
        showToast(`ભૂલ: ${err.message}`, true);
      } finally {
        btnClean.disabled = false;
        btnClean.innerHTML = '<i class="fa-solid fa-broom" style="color: #f59e0b;"></i> <span>🧹 Clean Old Videos (> 7 Days)</span>';
      }
    });
  }
}

async function fetchAnalyticsOverview(showFeedback = false) {
  if (isAnalyticsFetching) return;
  isAnalyticsFetching = true;

  const syncIcon = document.getElementById('analyticsSyncIcon');
  if (syncIcon) syncIcon.classList.add('fa-spin');

  try {
    const res = await fetch('/api/social/analytics');
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Analytics fetch failed');

    // 1. Profile Information
    const profilePic = document.getElementById('analyticsProfilePic');
    const profileName = document.getElementById('analyticsProfileName');
    const usernameBadge = document.getElementById('analyticsUsernameBadge');
    const followersCount = document.getElementById('analyticsFollowersCount');
    const lastUpdated = document.getElementById('analyticsLastUpdated');

    if (profilePic && data.instagram?.profilePic) {
      profilePic.src = data.instagram.profilePic;
    }
    if (profileName) profileName.textContent = data.instagram?.name || 'Reel Creator';
    
    const igUsername = data.instagram?.username || 'moving.151120';
    const igProfileUrl = `https://www.instagram.com/${igUsername}/`;

    if (usernameBadge) {
      usernameBadge.href = igProfileUrl;
      const uText = document.getElementById('analyticsUsernameText');
      if (uText) uText.textContent = '@' + igUsername;
    }

    const btnOpenIg = document.getElementById('btnOpenInstagram');
    if (btnOpenIg) btnOpenIg.href = igProfileUrl;

    const btnHdrIg = document.getElementById('btnHeaderInstagram');
    if (btnHdrIg) {
      btnHdrIg.href = igProfileUrl;
      const s = btnHdrIg.querySelector('span');
      if (s) s.textContent = '@' + igUsername + ' ↗';
    }

    const kpiIgLink = document.getElementById('kpiFollowersProfileLink');
    if (kpiIgLink) {
      kpiIgLink.href = igProfileUrl;
      const s = kpiIgLink.querySelector('span');
      if (s) s.textContent = '@' + igUsername + ' ↗';
    }

    if (followersCount) followersCount.textContent = `${data.instagram?.followers || 0} Followers`;
    if (lastUpdated) lastUpdated.textContent = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    // 2. Top KPI Cards (100% Real Live Metrics)
    const kpiLikes = document.getElementById('kpiTotalLikes');
    const kpiComments = document.getElementById('kpiTotalComments');
    const kpiFollowers = document.getElementById('kpiTotalFollowers');
    const kpiReels = document.getElementById('kpiTotalReels');

    if (kpiLikes) kpiLikes.textContent = data.summary?.totalLikes || 0;
    if (kpiComments) kpiComments.textContent = data.summary?.totalComments || 0;
    if (kpiFollowers) kpiFollowers.textContent = data.summary?.totalFollowers || 0;
    if (kpiReels) kpiReels.textContent = data.summary?.totalReels || 0;

    // Platform Breakdown Badges
    const b = data.summary?.breakdown || {};
    const igLikes = b.instagram?.likes || 0;
    const ytLikes = b.youtube?.likes || 0;
    const igComments = b.instagram?.comments || 0;
    const ytComments = b.youtube?.comments || 0;
    const igReels = b.instagram?.reels || 0;
    const ytShorts = b.youtube?.shorts || 0;

    const likesBreakdown = document.getElementById('kpiLikesBreakdown');
    if (likesBreakdown) {
      likesBreakdown.innerHTML = `
        <span style="color: #ec4899; background: rgba(236,72,153,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-instagram"></i> IG: ${igLikes} Likes</span>
        <span style="color: #ef4444; background: rgba(239,68,68,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-youtube"></i> YT: ${ytLikes} Likes</span>
      `;
    }

    const commentsBreakdown = document.getElementById('kpiCommentsBreakdown');
    if (commentsBreakdown) {
      commentsBreakdown.innerHTML = `
        <span style="color: #8b5cf6; background: rgba(139,92,246,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-instagram"></i> IG: ${igComments}</span>
        <span style="color: #ef4444; background: rgba(239,68,68,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-youtube"></i> YT: ${ytComments}</span>
      `;
    }

    const followersBreakdown = document.getElementById('kpiFollowersBreakdown');
    if (followersBreakdown) {
      followersBreakdown.innerHTML = `
        <span style="color: #0284c7; background: rgba(2,132,199,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-instagram"></i> @${data.instagram?.username || 'moving.151120'} (Live)</span>
      `;
    }

    const reelsBreakdown = document.getElementById('kpiReelsBreakdown');
    if (reelsBreakdown) {
      reelsBreakdown.innerHTML = `
        <span style="color: #ec4899; background: rgba(236,72,153,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-instagram"></i> ${igReels} IG Reels</span>
        <span style="color: #ef4444; background: rgba(239,68,68,0.08); padding: 0.15rem 0.45rem; border-radius: 4px;"><i class="fa-brands fa-youtube"></i> ${ytShorts} YT Short</span>
      `;
    }

    // 3. Storage Info
    const storageSize = document.getElementById('storageSizeLabel');
    const storageFiles = document.getElementById('storageFilesLabel');
    if (storageSize) storageSize.textContent = `${data.storage?.totalMB || 0} MB`;
    if (storageFiles) storageFiles.textContent = `(${data.storage?.totalFiles || 0} Files)`;

    // 4. Cache Reels Data
    currentAnalyticsReels = Array.isArray(data.reels) ? data.reels : [];

    // 5. Populate Top Performing Reel Spotlight Card (Winner Banner)
    const topCard = document.getElementById('analyticsTopPerformerCard');
    const topThumb = document.getElementById('topReelThumb');
    const topPlaceholder = document.getElementById('topReelPlaceholder');
    const topTitle = document.getElementById('topReelTitle');
    const topDateBadge = document.getElementById('topReelDateBadge');
    const topLikes = document.getElementById('topReelLikes');
    const topComments = document.getElementById('topReelComments');
    const topLink = document.getElementById('topReelLink');

    const topReel = data.summary?.topReel || (currentAnalyticsReels.length > 0 ? currentAnalyticsReels[0] : null);

    if (topCard && topReel) {
      topCard.classList.remove('hidden');
      if (topTitle) topTitle.textContent = topReel.title || topReel.caption || 'Top Performer Reel';

      const tLikes = (topReel.instagram?.likes || 0) + (topReel.youtube?.likes || 0);
      const tComments = (topReel.instagram?.comments || 0) + (topReel.youtube?.comments || 0);
      if (topLikes) topLikes.textContent = tLikes;
      if (topComments) topComments.textContent = tComments;

      if (topDateBadge && topReel.publishedAt) {
        const d = new Date(topReel.publishedAt);
        topDateBadge.textContent = '• ' + d.toLocaleDateString('gu-IN', { day: 'numeric', month: 'short' });
      }

      if (topLink) {
        topLink.href = topReel.instagram?.url || topReel.youtube?.url || '#';
      }

      if (topReel.thumbnailUrl) {
        if (topThumb) {
          topThumb.src = topReel.thumbnailUrl;
          topThumb.style.display = 'block';
        }
        if (topPlaceholder) topPlaceholder.style.display = 'none';
      } else {
        if (topThumb) topThumb.style.display = 'none';
        if (topPlaceholder) topPlaceholder.style.display = 'flex';
      }
    } else if (topCard) {
      topCard.classList.add('hidden');
    }

    // 6. Update Total Count Badge
    const countBadge = document.getElementById('analyticsReelsCountBadge');
    if (countBadge) {
      countBadge.textContent = `${currentAnalyticsReels.length} Videos Found`;
    }

    // 7. Render Reels Performance Grid with Sorting
    applyAnalyticsSortingAndRender();

    if (showFeedback) {
      showToast('🎉 લાઈવ એનાલિટિક્સ અને વ્યુઝ સફળતાપૂર્વક અપડેટ થઈ ગયા! 📊');
    }
  } catch (err) {
    console.error('Analytics error:', err);
    if (showFeedback) showToast(`એનાલિટિક્સ અપડેટ કરવામાં ભૂલ: ${err.message}`, true);
  } finally {
    if (syncIcon) syncIcon.classList.remove('fa-spin');
    isAnalyticsFetching = false;
  }
}

function applyAnalyticsSortingAndRender() {
  if (!currentAnalyticsReels || currentAnalyticsReels.length === 0) {
    renderAnalyticsReelsGrid([]);
    return;
  }

  const sorted = [...currentAnalyticsReels];

  if (currentAnalyticsSort === 'viral') {
    // Sort by combined engagement: (Likes * 2) + (Comments * 3) descending
    sorted.sort((a, b) => {
      const likesA = (a.instagram?.likes || 0) + (a.youtube?.likes || 0);
      const commA = (a.instagram?.comments || 0) + (a.youtube?.comments || 0);
      const scoreA = (likesA * 2) + (commA * 3);

      const likesB = (b.instagram?.likes || 0) + (b.youtube?.likes || 0);
      const commB = (b.instagram?.comments || 0) + (b.youtube?.comments || 0);
      const scoreB = (likesB * 2) + (commB * 3);

      if (scoreB !== scoreA) return scoreB - scoreA;
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });
  } else if (currentAnalyticsSort === 'likes') {
    // Sort strictly by total likes descending
    sorted.sort((a, b) => {
      const likesA = (a.instagram?.likes || 0) + (a.youtube?.likes || 0);
      const likesB = (b.instagram?.likes || 0) + (b.youtube?.likes || 0);
      if (likesB !== likesA) return likesB - likesA;
      return new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0);
    });
  } else if (currentAnalyticsSort === 'recent') {
    // Sort by publication timestamp descending
    sorted.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
  }

  renderAnalyticsReelsGrid(sorted);
}

function renderAnalyticsReelsGrid(reels) {
  const container = document.getElementById('analyticsReelsGrid');
  if (!container) return;

  if (!reels || reels.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3.5rem 1rem; color: #a8a29e; background: #faf8f5; border: 1px dashed rgba(214, 205, 189, 0.8); border-radius: 16px;">
        <i class="fa-solid fa-clapperboard" style="font-size: 2.2rem; color: #c5a880; margin-bottom: 0.85rem;"></i>
        <h4 style="color: #44403c; margin: 0 0 0.35rem 0; font-family: var(--font-serif); font-size: 1.15rem;">હજી સુધી કોઈ રીલ્સ પબ્લિશ થઈ નથી</h4>
        <p style="font-size: 0.84rem; margin: 0; color: #78716c;">Reel Studio અથવા Daily Auto-Pilot માંથી તમારી પ્રથમ રીલ પબ્લિશ કરો!</p>
      </div>
    `;
    return;
  }

  // Find top performer globally across all reels
  let topPerformerId = null;
  let maxScore = -1;
  currentAnalyticsReels.forEach(r => {
    const s = ((r.instagram?.likes || 0) + (r.youtube?.likes || 0)) * 2 + ((r.instagram?.comments || 0) + (r.youtube?.comments || 0)) * 3;
    if (s > maxScore && s > 0) {
      maxScore = s;
      topPerformerId = r.id;
    }
  });

  container.innerHTML = reels.map((r, index) => {
    const formattedDate = r.publishedAt 
      ? new Date(r.publishedAt).toLocaleDateString('gu-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'હમણાં જ';

    const hasIg = !!(r.instagram?.url);
    const hasYt = !!(r.youtube?.url);

    const likesCount = (r.instagram?.likes || 0) + (r.youtube?.likes || 0);
    const commentsCount = (r.instagram?.comments || 0) + (r.youtube?.comments || 0);

    // Rank Badge determination
    let rankBadge = '';
    const isGlobalTop = (r.id === topPerformerId) || (currentAnalyticsSort !== 'recent' && index === 0 && (likesCount > 0 || commentsCount > 0));

    if (isGlobalTop) {
      rankBadge = `
        <div style="position: absolute; top: 10px; right: 10px; background: linear-gradient(135deg, #b89758 0%, #8a6828 100%); color: #ffffff; font-size: 0.68rem; font-weight: 800; padding: 0.22rem 0.65rem; border-radius: 9999px; box-shadow: 0 4px 12px rgba(184, 151, 88, 0.45); border: 1px solid #fef08a; display: flex; align-items: center; gap: 0.35rem; z-index: 2;">
          <i class="fa-solid fa-crown" style="color: #fef08a;"></i> #1 Top Performer
        </div>
      `;
    } else if (currentAnalyticsSort !== 'recent' && index === 1 && (likesCount > 0 || commentsCount > 0)) {
      rankBadge = `
        <div style="position: absolute; top: 10px; right: 10px; background: rgba(30, 41, 59, 0.9); color: #f1f5f9; font-size: 0.66rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 9999px; backdrop-filter: blur(4px); border: 1px solid rgba(226, 232, 240, 0.4); display: flex; align-items: center; gap: 0.3rem; z-index: 2;">
          <i class="fa-solid fa-medal" style="color: #cbd5e1;"></i> #2 High Reach
        </div>
      `;
    } else if (currentAnalyticsSort !== 'recent' && index === 2 && (likesCount > 0 || commentsCount > 0)) {
      rankBadge = `
        <div style="position: absolute; top: 10px; right: 10px; background: rgba(41, 37, 36, 0.9); color: #fed7aa; font-size: 0.66rem; font-weight: 700; padding: 0.2rem 0.55rem; border-radius: 9999px; backdrop-filter: blur(4px); border: 1px solid rgba(251, 146, 60, 0.4); display: flex; align-items: center; gap: 0.3rem; z-index: 2;">
          <i class="fa-solid fa-award" style="color: #fb923c;"></i> #3 Popular
        </div>
      `;
    }

    const thumbHtml = r.thumbnailUrl
      ? `<img src="${r.thumbnailUrl}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;">`
      : `<div class="analytics-reel-placeholder">
          <i class="fa-solid fa-clapperboard" style="font-size: 1.8rem; color: #e5c870;"></i>
          <span style="font-family: var(--font-serif); font-size: 0.78rem; letter-spacing: 0.05em; color: #faf7f2;">Instagram Reel</span>
         </div>`;

    return `
      <div class="analytics-reel-item ${isGlobalTop ? 'is-top-performer' : ''}">
        <!-- Card Visual Header -->
        <div class="analytics-reel-header">
          ${thumbHtml}
          ${rankBadge}
          <div style="position: absolute; top: 10px; left: 10px; display: flex; gap: 0.45rem; flex-wrap: wrap; z-index: 1;">
            ${hasIg ? '<span style="background: rgba(185, 92, 107, 0.95); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.18rem 0.55rem; border-radius: 9999px; backdrop-filter: blur(4px);"><i class="fa-brands fa-instagram"></i> Reel</span>' : ''}
            ${hasYt ? '<span style="background: rgba(220, 38, 38, 0.95); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.18rem 0.55rem; border-radius: 9999px; backdrop-filter: blur(4px);"><i class="fa-brands fa-youtube"></i> Shorts</span>' : ''}
          </div>
          <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(28, 25, 23, 0.78); color: #f5e6ca; font-size: 0.68rem; font-weight: 600; padding: 0.18rem 0.5rem; border-radius: 6px; backdrop-filter: blur(4px); border: 1px solid rgba(197, 168, 128, 0.25);">
            ${r.niche ? r.niche.substring(0, 22) : 'Viral Reel'}
          </span>
        </div>

        <!-- Card Body -->
        <div style="padding: 1.15rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            ${isGlobalTop ? `
              <div style="margin-bottom: 0.5rem; padding: 0.25rem 0.55rem; background: #fcf8ee; border: 1px solid rgba(184, 151, 88, 0.35); border-radius: 6px; font-size: 0.72rem; color: #946e2b; font-weight: 700; display: inline-flex; align-items: center; gap: 0.35rem;">
                <i class="fa-solid fa-fire" style="color: #e11d48;"></i> સૌથી વધુ ચાલ્યો (Top Engagement)
              </div>
            ` : ''}
            <h4 style="margin: 0 0 0.45rem 0; font-size: 0.95rem; font-weight: 700; color: #201d1a; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(r.title || 'Untitled Reel')}
            </h4>
            <div style="font-size: 0.74rem; color: #878077; display: flex; align-items: center; gap: 0.4rem;">
              <i class="fa-regular fa-clock" style="color: #b89758;"></i>
              <span>${formattedDate}</span>
            </div>
          </div>

          <!-- Metrics Row -->
          <div style="margin-top: 0.95rem; padding-top: 0.85rem; border-top: 1px solid rgba(215, 206, 192, 0.65); display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 0.85rem; align-items: center;">
              <span style="font-size: 0.82rem; font-weight: 700; color: #b95c6b; display: flex; align-items: center; gap: 0.3rem;" title="Likes">
                <i class="fa-solid fa-heart"></i> ${likesCount}
              </span>
              <span style="font-size: 0.82rem; font-weight: 700; color: #6d597a; display: flex; align-items: center; gap: 0.3rem;" title="Comments">
                <i class="fa-solid fa-comment"></i> ${commentsCount}
              </span>
            </div>
            
            <!-- External Links -->
            <div style="display: flex; gap: 0.45rem;">
              ${hasIg ? `
                <a href="${r.instagram.url}" target="_blank" rel="noopener noreferrer" class="analytics-reel-btn analytics-reel-btn-ig" title="View on Instagram">
                  <i class="fa-brands fa-instagram"></i> IG ↗
                </a>
              ` : ''}
              ${hasYt ? `
                <a href="${r.youtube.url}" target="_blank" rel="noopener noreferrer" class="analytics-reel-btn analytics-reel-btn-yt" title="View on YouTube">
                  <i class="fa-brands fa-youtube"></i> YT ↗
                </a>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// ==========================================
// 🎬 9. AI INTERACTIVE TIMELINE STUDIO & FX EDITOR
// ==========================================
function initTimelineStudio() {
  const modal = document.getElementById('timelineStudioModal');
  const btnOpen = document.getElementById('btnOpenTimelineStudio');
  const btnClose = document.getElementById('btnCloseTimelineModal');
  const btnCloseFooter = document.getElementById('btnCloseTimelineModalFooter');
  const videoPreview = document.getElementById('timelinePreviewVideo');
  const btnTogglePlay = document.getElementById('btnTimelineTogglePlay');
  const playIcon = document.getElementById('timelinePlayIcon');
  const lblCurrentTime = document.getElementById('lblTimelineCurrentTime');
  const lblClipDuration = document.getElementById('lblTimelineClipDuration');
  const lblRangeDisplay = document.getElementById('lblTimelineRangeDisplay');
  const rngTrimStart = document.getElementById('rngTrimStart');
  const rngTrimEnd = document.getElementById('rngTrimEnd');
  const lblTrimStartVal = document.getElementById('lblTrimStartVal');
  const lblTrimEndVal = document.getElementById('lblTrimEndVal');
  const btnAiAuto = document.getElementById('btnTimelineAiAuto');
  const subBadge = document.getElementById('timelineLiveSubBadge');
  const vignetteOverlay = document.getElementById('timelineVignetteOverlay');
  const customSubInput = document.getElementById('txtTimelineCustomSub');
  const chkZoom = document.getElementById('chkFxZoom');
  const chkVignette = document.getElementById('chkFxVignette');
  const btnReset = document.getElementById('btnTimelineReset');
  const btnApply = document.getElementById('btnApplyTimelineEdits');

  if (!modal) return;

  // State object
  let editorState = {
    trimStart: 0,
    trimEnd: 30,
    duration: 30,
    filter: 'none',
    textSize: 'large',
    textPosition: 'bottom',
    textColor: 'yellow',
    customText: 'VIRAL MOMENT 🔥',
    zoom: false,
    vignette: false
  };

  function openTimelineStudio() {
    const renderedVideo = document.getElementById('renderedVideoPlayer');
    const sourceVideo = (currentRenderedReel && (currentRenderedReel.reelUrl || currentRenderedReel.videoUrl)) 
      || (renderedVideo && renderedVideo.src) 
      || '/rendered-reels/reel-demo.mp4';

    if (!sourceVideo || sourceVideo.endsWith('/')) {
      showToast('કૃપા કરીને પહેલાં એક રીલ વિડીયો બનાવો અથવા અપલોડ કરો! 🎬', true);
      return;
    }

    videoPreview.src = sourceVideo;
    videoPreview.load();
    videoPreview.play().catch(() => {});
    modal.classList.remove('hidden');

    // Sync video duration when metadata loads
    videoPreview.onloadedmetadata = () => {
      const realDur = Math.round(videoPreview.duration) || 30;
      rngTrimStart.max = realDur;
      rngTrimEnd.max = realDur;
      rngTrimEnd.value = Math.min(realDur, 30);
      editorState.trimEnd = parseFloat(rngTrimEnd.value);
      editorState.duration = realDur;
      updateTrimDisplay();
    };

    updateLivePreview();
  }

  function closeTimelineStudio() {
    videoPreview.pause();
    modal.classList.add('hidden');
  }

  if (btnOpen) btnOpen.addEventListener('click', openTimelineStudio);
  if (btnClose) btnClose.addEventListener('click', closeTimelineStudio);
  if (btnCloseFooter) btnCloseFooter.addEventListener('click', closeTimelineStudio);

  // Play / Pause Toggle
  if (btnTogglePlay) {
    btnTogglePlay.addEventListener('click', () => {
      if (videoPreview.paused) {
        videoPreview.play();
        if (playIcon) playIcon.className = 'fa-solid fa-pause';
      } else {
        videoPreview.pause();
        if (playIcon) playIcon.className = 'fa-solid fa-play';
      }
    });
  }

  // Playhead constraints to trim boundaries
  videoPreview.ontimeupdate = () => {
    const cur = videoPreview.currentTime;
    if (lblCurrentTime) {
      const mins = Math.floor(cur / 60);
      const secs = Math.floor(cur % 60);
      lblCurrentTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    // Loop within trim range
    if (cur < editorState.trimStart) {
      videoPreview.currentTime = editorState.trimStart;
    } else if (cur > editorState.trimEnd) {
      videoPreview.currentTime = editorState.trimStart;
    }
  };

  // Tab Switching
  const tabBtns = modal.querySelectorAll('.editor-tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const targetId = btn.dataset.tab;
      modal.querySelectorAll('.editor-tab-pane').forEach(pane => {
        if (pane.id === targetId) {
          pane.classList.remove('hidden');
        } else {
          pane.classList.add('hidden');
        }
      });
    });
  });

  // Range Sliders (Trim Start & End)
  function updateTrimDisplay() {
    let s = parseFloat(rngTrimStart.value) || 0;
    let e = parseFloat(rngTrimEnd.value) || 30;
    if (s >= e - 2) {
      s = Math.max(0, e - 2);
      rngTrimStart.value = s;
    }
    editorState.trimStart = s;
    editorState.trimEnd = e;
    const clipDur = (e - s).toFixed(1);

    if (lblTrimStartVal) lblTrimStartVal.textContent = `${s.toFixed(1)}s`;
    if (lblTrimEndVal) lblTrimEndVal.textContent = `${e.toFixed(1)}s`;
    if (lblClipDuration) lblClipDuration.textContent = `${clipDur}s`;
    if (lblRangeDisplay) lblRangeDisplay.textContent = `${s.toFixed(1)}s – ${e.toFixed(1)}s (${clipDur}s)`;
  }

  if (rngTrimStart) {
    rngTrimStart.addEventListener('input', () => {
      updateTrimDisplay();
      videoPreview.currentTime = editorState.trimStart;
    });
  }

  if (rngTrimEnd) {
    rngTrimEnd.addEventListener('input', () => {
      updateTrimDisplay();
    });
  }

  // Quick Cut Chips
  modal.querySelectorAll('.btn-quick-cut').forEach(chip => {
    chip.addEventListener('click', () => {
      const s = parseFloat(chip.dataset.start) || 0;
      let e = chip.dataset.end === 'max' ? (parseFloat(rngTrimEnd.max) || 30) : parseFloat(chip.dataset.end);
      rngTrimStart.value = s;
      rngTrimEnd.value = e;
      updateTrimDisplay();
      videoPreview.currentTime = s;
    });
  });

  // Filters Selection
  const filterCards = modal.querySelectorAll('.timeline-filter-card');
  filterCards.forEach(card => {
    card.addEventListener('click', () => {
      filterCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      editorState.filter = card.dataset.filter || 'none';
      updateLivePreview();
    });
  });

  // Text Size Chips
  const textSizeChips = modal.querySelectorAll('.btn-text-size');
  textSizeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      textSizeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editorState.textSize = chip.dataset.size;
      updateLivePreview();
    });
  });

  // Text Position Chips
  const textPosChips = modal.querySelectorAll('.btn-text-pos');
  textPosChips.forEach(chip => {
    chip.addEventListener('click', () => {
      textPosChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editorState.textPosition = chip.dataset.pos;
      updateLivePreview();
    });
  });

  // Text Color Chips
  const textColorChips = modal.querySelectorAll('.btn-text-col');
  textColorChips.forEach(chip => {
    chip.addEventListener('click', () => {
      textColorChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editorState.textColor = chip.dataset.col;
      updateLivePreview();
    });
  });

  // Custom text input
  if (customSubInput) {
    customSubInput.addEventListener('input', () => {
      editorState.customText = customSubInput.value || 'VIRAL MOMENT 🔥';
      if (subBadge) subBadge.textContent = editorState.customText;
    });
  }

  // Effects Checkboxes
  if (chkZoom) {
    chkZoom.addEventListener('change', () => {
      editorState.zoom = chkZoom.checked;
      updateLivePreview();
    });
  }

  if (chkVignette) {
    chkVignette.addEventListener('change', () => {
      editorState.vignette = chkVignette.checked;
      updateLivePreview();
    });
  }

  // Live CSS Update Function (Instant 60fps response)
  function updateLivePreview() {
    // 1. Filter class on video
    videoPreview.className = '';
    videoPreview.classList.add(`v-filter-${editorState.filter}`);
    if (editorState.zoom) {
      videoPreview.classList.add('v-fx-zoom');
    }

    // 2. Vignette
    if (vignetteOverlay) {
      if (editorState.vignette) vignetteOverlay.classList.remove('hidden');
      else vignetteOverlay.classList.add('hidden');
    }

    // 3. Subtitle styling
    if (subBadge) {
      const sizePxMap = { small: '1.05rem', medium: '1.25rem', large: '1.5rem', huge: '1.85rem' };
      subBadge.style.fontSize = sizePxMap[editorState.textSize] || '1.45rem';

      const colorMap = {
        yellow: '#facc15',
        white: '#ffffff',
        green: '#22c55e',
        rose: '#fb7185',
        amethyst: '#c084fc'
      };
      subBadge.style.color = colorMap[editorState.textColor] || '#facc15';

      if (editorState.textPosition === 'top') {
        subBadge.style.top = '14%';
        subBadge.style.bottom = 'auto';
      } else if (editorState.textPosition === 'center') {
        subBadge.style.top = '45%';
        subBadge.style.bottom = 'auto';
      } else {
        subBadge.style.top = 'auto';
        subBadge.style.bottom = '18%';
      }

      subBadge.textContent = editorState.customText;
    }
  }

  // ✨ 1-Click AI Auto-Enhance Button
  if (btnAiAuto) {
    btnAiAuto.addEventListener('click', () => {
      // Pick best viral warm gold, large Hormozi text, zoom, and 30s cut
      editorState.filter = 'warm-gold';
      editorState.textSize = 'large';
      editorState.textPosition = 'bottom';
      editorState.textColor = 'yellow';
      editorState.zoom = true;
      editorState.vignette = true;
      if (chkZoom) chkZoom.checked = true;
      if (chkVignette) chkVignette.checked = true;

      // Update UI active buttons
      filterCards.forEach(c => c.classList.toggle('active', c.dataset.filter === 'warm-gold'));
      textSizeChips.forEach(c => c.classList.toggle('active', c.dataset.size === 'large'));
      textPosChips.forEach(c => c.classList.toggle('active', c.dataset.pos === 'bottom'));
      textColorChips.forEach(c => c.classList.toggle('active', c.dataset.col === 'yellow'));

      updateLivePreview();
      showToast('✨ AI Smart Auto-Enhance applied to live preview!');
    });
  }

  // Reset to original
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      editorState = {
        trimStart: 0,
        trimEnd: Math.min(30, parseFloat(rngTrimEnd.max) || 30),
        duration: 30,
        filter: 'none',
        textSize: 'large',
        textPosition: 'bottom',
        textColor: 'yellow',
        customText: 'VIRAL MOMENT 🔥',
        zoom: false,
        vignette: false
      };
      if (rngTrimStart) rngTrimStart.value = 0;
      if (rngTrimEnd) rngTrimEnd.value = editorState.trimEnd;
      if (chkZoom) chkZoom.checked = false;
      if (chkVignette) chkVignette.checked = false;

      filterCards.forEach(c => c.classList.toggle('active', c.dataset.filter === 'none'));
      textSizeChips.forEach(c => c.classList.toggle('active', c.dataset.size === 'large'));
      textPosChips.forEach(c => c.classList.toggle('active', c.dataset.pos === 'bottom'));
      textColorChips.forEach(c => c.classList.toggle('active', c.dataset.col === 'yellow'));

      updateTrimDisplay();
      updateLivePreview();
      showToast('↩️ Settings reset to original AI output');
    });
  }

  // ⚡ Apply & Re-Render Reel (HD)
  if (btnApply) {
    btnApply.addEventListener('click', async () => {
      if (!currentRenderedReel || !currentRenderedReel.fileName) {
        showToast('કોઈ વિડીયો ફાઈલ મળી નથી.', true);
        return;
      }

      const activeEffects = [];
      if (editorState.zoom) activeEffects.push('zoom');
      if (editorState.vignette) activeEffects.push('vignette');

      btnApply.disabled = true;
      btnApply.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>🎬 Re-Rendering HD Reel...</span>';
      showToast('⚡ FFmpeg થી તમારા કસ્ટમ કટ, ફિલ્ટર્સ અને ઇફેક્ટ્સ રેન્ડર થઈ રહ્યા છે...');

      try {
        const res = await fetch('/api/video/edit-timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName: currentRenderedReel.fileName,
            trimStart: editorState.trimStart,
            trimEnd: editorState.trimEnd,
            filter: editorState.filter,
            textSize: editorState.textSize,
            textPosition: editorState.textPosition,
            textColor: editorState.textColor,
            effects: activeEffects,
            customCaption: editorState.customText
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Re-rendering failed.');
        }

        // Update currentRenderedReel state
        currentRenderedReel.fileName = data.fileName;
        currentRenderedReel.reelUrl = data.videoUrl;
        currentRenderedReel.downloadUrl = data.downloadUrl;
        currentRenderedReel.duration = data.duration;

        // Update main video player
        const mainPlayer = document.getElementById('renderedVideoPlayer');
        if (mainPlayer) {
          mainPlayer.src = data.videoUrl;
          mainPlayer.load();
          mainPlayer.play().catch(() => {});
        }

        const btnDownload = document.getElementById('btnDownloadReel');
        if (btnDownload) {
          btnDownload.href = data.downloadUrl;
          btnDownload.setAttribute('download', data.fileName);
        }

        const pillDuration = document.getElementById('pillDuration');
        if (pillDuration) {
          pillDuration.textContent = data.duration;
        }

        closeTimelineStudio();
        showToast('🎉 નવો એડિટ કરેલો HD રીલ વિડીયો સફળતાપૂર્વક તૈયાર થઈ ગયો!');
      } catch (err) {
        console.error('Apply timeline error:', err);
        showToast(`ભૂલ આવી: ${err.message}`, true);
      } finally {
        btnApply.disabled = false;
        btnApply.innerHTML = '<i class="fa-solid fa-bolt" style="color: #e5c870;"></i> <span>⚡ Apply & Re-Render Reel (HD)</span>';
      }
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTimelineStudio);
} else {
  initTimelineStudio();
}

/* =========================================================================
   USER AUTHENTICATION & MULTI-USER CREDITS MANAGER (SaaS System)
   ========================================================================= */
let currentUser = null;

function initUserAuth() {
  const btnOpenAuthModal = document.getElementById('btnOpenAuthModal');
  const btnCloseAuthModal = document.getElementById('btnCloseAuthModal');
  const authModal = document.getElementById('authModal');
  const tabAuthLogin = document.getElementById('tabAuthLogin');
  const tabAuthRegister = document.getElementById('tabAuthRegister');
  const formAuthLogin = document.getElementById('formAuthLogin');
  const formAuthRegister = document.getElementById('formAuthRegister');
  const authAlertBox = document.getElementById('authAlertBox');

  const userProfileChip = document.getElementById('userProfileChip');
  const headerUserName = document.getElementById('headerUserName');
  const headerUserCredits = document.getElementById('headerUserCredits');
  const userAvatarInitials = document.getElementById('userAvatarInitials');

  const userProfileModal = document.getElementById('userProfileModal');
  const btnCloseProfileModal = document.getElementById('btnCloseProfileModal');
  const profileName = document.getElementById('profileName');
  const profileEmail = document.getElementById('profileEmail');
  const profileAvatarBig = document.getElementById('profileAvatarBig');
  const profileRoleBadge = document.getElementById('profileRoleBadge');
  const profileCreditsCount = document.getElementById('profileCreditsCount');
  const btnLogoutUser = document.getElementById('btnLogoutUser');
  const btnUpgradeProInModal = document.getElementById('btnUpgradeProInModal');

  // Helper: Show Auth Alert
  function showAuthAlert(msg, isSuccess = false) {
    if (!authAlertBox) return;
    authAlertBox.style.display = 'block';
    authAlertBox.classList.remove('hidden');
    if (isSuccess) {
      authAlertBox.style.background = '#f0fdf4';
      authAlertBox.style.border = '1px solid #bbf7d0';
      authAlertBox.style.color = '#15803d';
    } else {
      authAlertBox.style.background = '#fef2f2';
      authAlertBox.style.border = '1px solid #fecaca';
      authAlertBox.style.color = '#b91c1c';
    }
    authAlertBox.innerHTML = msg;
  }

  function hideAuthAlert() {
    if (authAlertBox) {
      authAlertBox.style.display = 'none';
      authAlertBox.innerHTML = '';
    }
  }

  // Update Header UI for logged-in user
  function renderLoggedInState(user) {
    currentUser = user;
    if (btnOpenAuthModal) btnOpenAuthModal.style.display = 'none';
    if (userProfileChip) {
      userProfileChip.style.display = 'inline-flex';
      userProfileChip.classList.remove('hidden');
    }
    const initials = (user.name || 'U').charAt(0).toUpperCase();
    if (userAvatarInitials) userAvatarInitials.textContent = initials;
    if (headerUserName) headerUserName.textContent = user.name.split(' ')[0] || user.name;
    if (headerUserCredits) {
      if (user.plan === 'pro') {
        headerUserCredits.textContent = '⭐ Pro Unlimited';
        headerUserCredits.style.background = 'rgba(217, 119, 6, 0.15)';
        headerUserCredits.style.color = '#b45309';
      } else {
        headerUserCredits.textContent = `✨ ${user.credits} Reels`;
        headerUserCredits.style.background = 'rgba(124, 58, 237, 0.1)';
        headerUserCredits.style.color = '#7c3aed';
      }
    }
  }

  function renderLoggedOutState() {
    currentUser = null;
    if (btnOpenAuthModal) btnOpenAuthModal.style.display = 'inline-flex';
    if (userProfileChip) {
      userProfileChip.style.display = 'none';
      userProfileChip.classList.add('hidden');
    }
  }

  // Open / Close Auth Modal
  if (btnOpenAuthModal) {
    btnOpenAuthModal.addEventListener('click', () => {
      hideAuthAlert();
      authModal.style.display = 'flex';
      authModal.classList.remove('hidden');
    });
  }

  if (btnCloseAuthModal) {
    btnCloseAuthModal.addEventListener('click', () => {
      authModal.style.display = 'none';
      authModal.classList.add('hidden');
    });
  }

  // Auth Tabs Toggle
  if (tabAuthLogin && tabAuthRegister) {
    tabAuthLogin.addEventListener('click', () => {
      tabAuthLogin.style.background = '#ffffff';
      tabAuthLogin.style.color = '#1e1b4b';
      tabAuthRegister.style.background = 'transparent';
      tabAuthRegister.style.color = '#c7d2fe';
      formAuthLogin.style.display = 'block';
      formAuthRegister.style.display = 'none';
      hideAuthAlert();
    });

    tabAuthRegister.addEventListener('click', () => {
      tabAuthRegister.style.background = '#ffffff';
      tabAuthRegister.style.color = '#1e1b4b';
      tabAuthLogin.style.background = 'transparent';
      tabAuthLogin.style.color = '#c7d2fe';
      formAuthRegister.style.display = 'block';
      formAuthLogin.style.display = 'none';
      hideAuthAlert();
    });
  }

  // Login Submit
  if (formAuthLogin) {
    formAuthLogin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value.trim();
      const password = document.getElementById('loginPassword').value;
      const btn = document.getElementById('btnSubmitLogin');

      hideAuthAlert();
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>ચકાસી રહ્યા છીએ...</span>';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'લોગિન નિષ્ફળ રહ્યું.');
        }

        localStorage.setItem('forgeai_token', data.token);
        renderLoggedInState(data.user);
        authModal.style.display = 'none';
        authModal.classList.add('hidden');
        showToast(`🎉 ${data.message}`);
      } catch (err) {
        showAuthAlert(`⚠️ ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>🚀 Log In કરો</span>';
      }
    });
  }

  // Register Submit
  if (formAuthRegister) {
    formAuthRegister.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value.trim();
      const email = document.getElementById('regEmail').value.trim();
      const phone = document.getElementById('regPhone').value.trim();
      const password = document.getElementById('regPassword').value;
      const btn = document.getElementById('btnSubmitRegister');

      hideAuthAlert();
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>એકાઉન્ટ બની રહ્યું છે...</span>';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'રજીસ્ટ્રેશન નિષ્ફળ રહ્યું.');
        }

        localStorage.setItem('forgeai_token', data.token);
        renderLoggedInState(data.user);
        authModal.style.display = 'none';
        authModal.classList.add('hidden');
        showToast(`🎉 ${data.message}`);
      } catch (err) {
        showAuthAlert(`⚠️ ${err.message}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>✨ એકાઉન્ટ બનાવો & 5 Free Reels મેળવો</span>';
      }
    });
  }

  // User Profile Modal Open / Close
  if (userProfileChip && userProfileModal) {
    userProfileChip.addEventListener('click', () => {
      if (!currentUser) return;
      if (profileName) profileName.textContent = currentUser.name;
      if (profileEmail) profileEmail.textContent = currentUser.email;
      if (profileAvatarBig) profileAvatarBig.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();
      if (profileRoleBadge) profileRoleBadge.textContent = (currentUser.role || 'user').toUpperCase();
      if (profileCreditsCount) {
        profileCreditsCount.textContent = currentUser.plan === 'pro' ? 'અનલિમિટેડ ⭐' : `${currentUser.credits} બાકી`;
      }
      updateSocialBadges(currentUser);
      userProfileModal.style.display = 'flex';
      userProfileModal.classList.remove('hidden');
    });
  }

  const btnConnectInstagramQuick = document.getElementById('btnConnectInstagramQuick');
  const btnConnectYouTubeQuick = document.getElementById('btnConnectYouTubeQuick');
  const profileInstaHandle = document.getElementById('profileInstaHandle');
  const profileInstaStatus = document.getElementById('profileInstaStatus');
  const profileYtHandle = document.getElementById('profileYtHandle');
  const profileYtStatus = document.getElementById('profileYtStatus');

  function updateSocialBadges(user) {
    if (!user) return;
    const insta = user.social?.instagram;
    if (insta && insta.connected) {
      if (profileInstaHandle) profileInstaHandle.textContent = `@${insta.username || 'patola_heritage'}`;
      if (profileInstaStatus) {
        profileInstaStatus.textContent = `🟢 કનેક્ટેડ (${insta.pageName || 'Page'})`;
        profileInstaStatus.style.color = '#15803d';
      }
      if (btnConnectInstagramQuick) {
        btnConnectInstagramQuick.textContent = '✓ Connected';
        btnConnectInstagramQuick.style.background = '#16a34a';
      }
    } else {
      if (profileInstaHandle) profileInstaHandle.textContent = 'Instagram Reels';
      if (profileInstaStatus) {
        profileInstaStatus.textContent = 'કનેક્ટ કરવા ક્લિક કરો';
        profileInstaStatus.style.color = '#9d174d';
      }
      if (btnConnectInstagramQuick) {
        btnConnectInstagramQuick.textContent = '🔗 Connect';
        btnConnectInstagramQuick.style.background = 'linear-gradient(135deg, #e1306c, #c13584)';
      }
    }

    const yt = user.social?.youtube;
    if (yt && yt.connected) {
      if (profileYtHandle) profileYtHandle.textContent = yt.channelTitle || 'Patola Shorts';
      if (profileYtStatus) {
        profileYtStatus.textContent = '🟢 કનેક્ટેડ (Active)';
        profileYtStatus.style.color = '#15803d';
      }
      if (btnConnectYouTubeQuick) {
        btnConnectYouTubeQuick.textContent = '✓ Connected';
        btnConnectYouTubeQuick.style.background = '#16a34a';
      }
    } else {
      if (profileYtHandle) profileYtHandle.textContent = 'YouTube Shorts';
      if (profileYtStatus) {
        profileYtStatus.textContent = 'કનેક્ટ કરવા ક્લિક કરો';
        profileYtStatus.style.color = '#b91c1c';
      }
      if (btnConnectYouTubeQuick) {
        btnConnectYouTubeQuick.textContent = '🔗 Connect';
        btnConnectYouTubeQuick.style.background = '#dc2626';
      }
    }
  }

  if (btnConnectInstagramQuick) {
    btnConnectInstagramQuick.addEventListener('click', async () => {
      const token = localStorage.getItem('forgeai_token');
      if (!token) return showToast('કૃપા કરીને પહેલા લોગિન કરો.', true);

      btnConnectInstagramQuick.disabled = true;
      btnConnectInstagramQuick.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const res = await fetch('/api/auth/social/connect-instagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ usePreset: true })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (currentUser) {
          if (!currentUser.social) currentUser.social = {};
          currentUser.social.instagram = data.instagram;
        }
        updateSocialBadges(currentUser);
        showToast(data.message);
      } catch (err) {
        showToast(`ઇન્સ્ટાગ્રામ એરર: ${err.message}`, true);
      } finally {
        btnConnectInstagramQuick.disabled = false;
      }
    });
  }

  if (btnConnectYouTubeQuick) {
    btnConnectYouTubeQuick.addEventListener('click', async () => {
      const token = localStorage.getItem('forgeai_token');
      if (!token) return showToast('કૃપા કરીને પહેલા લોગિન કરો.', true);

      btnConnectYouTubeQuick.disabled = true;
      btnConnectYouTubeQuick.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

      try {
        const res = await fetch('/api/auth/social/connect-youtube', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({ usePreset: true })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error);

        if (currentUser) {
          if (!currentUser.social) currentUser.social = {};
          currentUser.social.youtube = data.youtube;
        }
        updateSocialBadges(currentUser);
        showToast(data.message);
      } catch (err) {
        showToast(`YouTube એરર: ${err.message}`, true);
      } finally {
        btnConnectYouTubeQuick.disabled = false;
      }
    });
  }

  if (btnCloseProfileModal && userProfileModal) {
    btnCloseProfileModal.addEventListener('click', () => {
      userProfileModal.style.display = 'none';
      userProfileModal.classList.add('hidden');
    });
  }

  // Logout Click
  if (btnLogoutUser) {
    btnLogoutUser.addEventListener('click', async () => {
      const token = localStorage.getItem('forgeai_token');
      try {
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
          });
        }
      } catch (_) {}
      localStorage.removeItem('forgeai_token');
      renderLoggedOutState();
      if (userProfileModal) {
        userProfileModal.style.display = 'none';
        userProfileModal.classList.add('hidden');
      }
      showToast('સફળતાપૂર્વક Log Out થઈ ગયા છો.');
    });
  }

  // Upgrade Pro Button click
  if (btnUpgradeProInModal) {
    btnUpgradeProInModal.addEventListener('click', () => {
      showToast('⚡ Pro Plan (₹૧૯૯/માસ) સબસ્ક્રિપ્શન મોડ્યુલ ટૂંક સમયમાં શરૂ થઈ રહ્યું છે!');
    });
  }

  // Auto-Check Session on Page Load
  const savedToken = localStorage.getItem('forgeai_token');
  if (savedToken) {
    fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${savedToken}` }
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.user) {
          renderLoggedInState(data.user);
        } else {
          localStorage.removeItem('forgeai_token');
          renderLoggedOutState();
        }
      })
      .catch(() => {
        renderLoggedOutState();
      });
  } else {
    renderLoggedOutState();
  }
}

// Global Credit Deductor (used before rendering reel)
window.useReelCreditIfLoggedIn = async function() {
  const token = localStorage.getItem('forgeai_token');
  if (!token) return true; // guest mode allowed or handled

  try {
    const res = await fetch('/api/auth/use-credit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (!data.success && data.creditsExhausted) {
      showToast(data.error, true);
      return false;
    }
    if (data.success && typeof data.creditsRemaining !== 'undefined') {
      const headerUserCredits = document.getElementById('headerUserCredits');
      if (headerUserCredits) {
        headerUserCredits.textContent = `✨ ${data.creditsRemaining} Reels`;
      }
    }
    return true;
  } catch (err) {
    console.warn('Credit deduction error:', err);
    return true;
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserAuth);
} else {
  initUserAuth();
}

/* =========================================================================
   MOBILE REEL STEPPER PAGINATION LOGIC (Step 1 -> Step 2 -> Step 3)
   ========================================================================= */
function initMobileReelStepper() {
  const stepTabs = document.querySelectorAll('.stepper-tab');
  const promptPanel = document.getElementById('studioPromptPanel');
  const step1 = document.getElementById('stepSectionUpload');
  const step2 = document.getElementById('stepSectionSettings');
  const step3 = document.getElementById('stepSectionOutput');
  const btnGoToStep2 = document.getElementById('btnGoToStep2');
  const btnBackToStep1 = document.getElementById('btnBackToStep1');
  const videoFileInput = document.getElementById('videoFileInput');

  function isMobileView() {
    return window.innerWidth <= 768;
  }

  window.setReelStep = function(stepNum) {
    if (!isMobileView()) {
      if (promptPanel) promptPanel.style.display = 'flex';
      if (step1) step1.style.display = 'block';
      if (step2) step2.style.display = 'block';
      if (step3) step3.style.display = 'flex';
      return;
    }

    stepTabs.forEach(tab => {
      const num = parseInt(tab.getAttribute('data-step'), 10);
      if (num === stepNum) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    if (stepNum === 1) {
      if (promptPanel) promptPanel.style.display = 'flex';
      if (step1) step1.style.display = 'block';
      if (step2) step2.style.display = 'none';
      if (step3) step3.style.display = 'none';
    } else if (stepNum === 2) {
      if (promptPanel) promptPanel.style.display = 'flex';
      if (step1) step1.style.display = 'none';
      if (step2) step2.style.display = 'block';
      if (step3) step3.style.display = 'none';
    } else if (stepNum === 3) {
      if (promptPanel) promptPanel.style.display = 'none';
      if (step3) step3.style.display = 'flex';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  stepTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const step = parseInt(tab.getAttribute('data-step'), 10);
      window.setReelStep(step);
    });
  });

  if (btnGoToStep2) {
    btnGoToStep2.addEventListener('click', () => {
      window.setReelStep(2);
    });
  }

  if (btnBackToStep1) {
    btnBackToStep1.addEventListener('click', () => {
      window.setReelStep(1);
    });
  }

  // When a file is selected on mobile, auto-advance to Step 2
  if (videoFileInput) {
    videoFileInput.addEventListener('change', () => {
      if (videoFileInput.files && videoFileInput.files.length > 0 && isMobileView()) {
        setTimeout(() => {
          window.setReelStep(2);
        }, 400);
      }
    });
  }

  function updateStepVisibility() {
    if (isMobileView()) {
      const activeTab = document.querySelector('.stepper-tab.active');
      const activeNum = activeTab ? parseInt(activeTab.getAttribute('data-step'), 10) : 1;
      window.setReelStep(activeNum);
    } else {
      if (promptPanel) promptPanel.style.display = 'flex';
      if (step1) step1.style.display = 'block';
      if (step2) step2.style.display = 'block';
      if (step3) step3.style.display = 'flex';
    }
  }

  window.addEventListener('resize', updateStepVisibility);
  updateStepVisibility();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileReelStepper);
} else {
  initMobileReelStepper();
}



