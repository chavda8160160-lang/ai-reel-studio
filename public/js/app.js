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

  // 🚀 Proactive Background Pre-fetch: Load live stats quietly so tab is 100% ready with 0 waiting time
  setTimeout(() => {
    fetchAnalyticsOverview(false);
  }, 1000);
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
      showToast('Please enter both WhatsApp Phone and CallMeBot API Key.', true);
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
      showToast('Please enter both Telegram Bot Token and Chat ID.', true);
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
  const mobileStepper = document.getElementById('mobileReelStepper');

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

      if (mobileStepper) {
        if (targetId === 'videoStudioView') {
          mobileStepper.style.display = '';
        } else {
          mobileStepper.style.display = 'none';
        }
      }

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

// ==========================================
// 🚀 REAL-TIME UPLOAD PROGRESS HELPER (XHR with %)
// ==========================================
function uploadWithProgress({ url, formData, onProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url, true);
    const startTime = Date.now();

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.min(100, Math.round((e.loaded / e.total) * 100));
        const loadedMB = (e.loaded / (1024 * 1024)).toFixed(1);
        const totalMB = (e.total / (1024 * 1024)).toFixed(1);
        const elapsedSec = (Date.now() - startTime) / 1000;
        const speed = elapsedSec > 0.4 
          ? ((e.loaded / (1024 * 1024)) / elapsedSec).toFixed(1) + ' MB/s' 
          : 'Calculating...';

        if (onProgress) {
          onProgress({ percent, loadedMB, totalMB, speed, loaded: e.loaded, total: e.total });
        }
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.success !== false) {
          resolve(data);
        } else {
          reject(new Error(data.error || `Upload failed with status ${xhr.status}`));
        }
      } catch (err) {
        reject(new Error(xhr.responseText || `Server responded with status ${xhr.status}`));
      }
    };

    xhr.onerror = () => {
      reject(new Error('Internet connection or server error occurred. Please try again.'));
    };

    xhr.ontimeout = () => {
      reject(new Error('Upload timed out. Please try again.'));
    };

    xhr.send(formData);
  });
}

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
  let selectedOnlineSong = null;

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
        badgeScheduleMode.innerHTML = '<i class="fa-solid fa-bolt"></i> Instant';
        badgeScheduleMode.className = 'schedule-mode-badge badge-instant';
        badgeScheduleMode.removeAttribute('style');
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
        badgeScheduleMode.innerHTML = '<i class="fa-regular fa-clock"></i> 1-Time';
        badgeScheduleMode.className = 'schedule-mode-badge badge-timed';
        badgeScheduleMode.removeAttribute('style');
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
        badgeScheduleMode.innerHTML = '<i class="fa-solid fa-repeat"></i> Daily Auto';
        badgeScheduleMode.className = 'schedule-mode-badge badge-daily';
        badgeScheduleMode.removeAttribute('style');
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

  // Direct Upload vs AI Auto-Edit Mode Switcher
  const btnModeAiEnhance = document.getElementById('btnModeAiEnhance');
  const btnModeDirectUpload = document.getElementById('btnModeDirectUpload');
  const directUploadNoticeBanner = document.getElementById('directUploadNoticeBanner');
  const inputIsDirectUpload = document.getElementById('inputIsDirectUpload');

  if (btnModeDirectUpload && btnModeAiEnhance) {
    btnModeDirectUpload.addEventListener('click', () => {
      btnModeDirectUpload.classList.add('active');
      btnModeAiEnhance.classList.remove('active');
      btnModeDirectUpload.style.background = '#ffffff';
      btnModeDirectUpload.style.color = '#059669';
      btnModeDirectUpload.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
      btnModeAiEnhance.style.background = 'transparent';
      btnModeAiEnhance.style.color = '#78716c';
      btnModeAiEnhance.style.boxShadow = 'none';

      if (inputIsDirectUpload) inputIsDirectUpload.value = 'true';
      if (directUploadNoticeBanner) directUploadNoticeBanner.classList.remove('hidden');

      if (videoDurationSelect) videoDurationSelect.value = 'original';
      if (videoStyleSelect) videoStyleSelect.value = 'original';
      const videoSubtitlesSelect = document.getElementById('videoSubtitlesSelect');
      if (videoSubtitlesSelect) videoSubtitlesSelect.value = 'none';
      if (videoBgmSelect) videoBgmSelect.value = 'none';

      if (btnProcessVideoText) {
        btnProcessVideoText.textContent = isScheduleModeActive 
          ? '🚀 Schedule Original Video (As-Is)' 
          : '🚀 Direct Upload Original Video (As-Is)';
      }
      showToast('⚡ Direct Upload Mode: Original video & audio preserved with zero alterations!');
    });

    btnModeAiEnhance.addEventListener('click', () => {
      btnModeAiEnhance.classList.add('active');
      btnModeDirectUpload.classList.remove('active');
      btnModeAiEnhance.style.background = '#ffffff';
      btnModeAiEnhance.style.color = '#1c1917';
      btnModeAiEnhance.style.boxShadow = '0 2px 6px rgba(0,0,0,0.06)';
      btnModeDirectUpload.style.background = 'transparent';
      btnModeDirectUpload.style.color = '#78716c';
      btnModeDirectUpload.style.boxShadow = 'none';

      if (inputIsDirectUpload) inputIsDirectUpload.value = 'false';
      if (directUploadNoticeBanner) directUploadNoticeBanner.classList.add('hidden');

      if (videoDurationSelect) videoDurationSelect.value = '30';
      if (videoStyleSelect) videoStyleSelect.value = 'auto';
      const videoSubtitlesSelect = document.getElementById('videoSubtitlesSelect');
      if (videoSubtitlesSelect) videoSubtitlesSelect.value = 'hormozi';

      if (btnProcessVideoText) {
        btnProcessVideoText.textContent = isScheduleModeActive
          ? (isRecurringDailyMode ? '🔁 Schedule Daily Auto-Pilot' : '⏰ Schedule 30s Reel')
          : '🎬 AI Auto-Edit & Generate 30s Reel';
      }
      showToast('✨ AI Smart Auto-Edit Mode Activated');
    });
  }

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

  let activeQueueFilter = 'scheduled'; // Default: ONLY upcoming scheduled reels!
  let cachedScheduledQueue = [];

  function renderScheduledQueue(queue) {
    if (!scheduledQueueList || !scheduledCountBadge) return;
    cachedScheduledQueue = queue || [];

    const upcomingList = cachedScheduledQueue.filter(item => {
      const hasIg = !!item.lastPostUrl;
      const hasYt = !!item.youtubePostUrl;
      return !(item.status?.includes('Posted') || hasIg || hasYt);
    });

    const publishedList = cachedScheduledQueue.filter(item => {
      const hasIg = !!item.lastPostUrl;
      const hasYt = !!item.youtubePostUrl;
      return item.status?.includes('Posted') || hasIg || hasYt;
    });

    const countUpcomingBadge = document.getElementById('countUpcomingBadge');
    const countPublishedBadge = document.getElementById('countPublishedBadge');
    const countAllBadge = document.getElementById('countAllBadge');
    if (countUpcomingBadge) countUpcomingBadge.textContent = upcomingList.length;
    if (countPublishedBadge) countPublishedBadge.textContent = publishedList.length;
    if (countAllBadge) countAllBadge.textContent = cachedScheduledQueue.length;

    // Auto-sync Column 3 Social Texts with latest reel if currently showing default placeholder text
    if (cachedScheduledQueue.length > 0 && !currentRenderedReel) {
      const latestItem = cachedScheduledQueue[0];
      if (latestItem && latestItem.viralTitle && viralTitleText && (viralTitleText.textContent.includes('Patola') || viralTitleText.textContent.includes('Auto-Generated Title'))) {
        viralTitleText.textContent = latestItem.viralTitle;
        if (viralCaptionText) viralCaptionText.textContent = latestItem.viralCaption || '';
        const h = Array.isArray(latestItem.viralHashtags) ? latestItem.viralHashtags.join(' ') : (latestItem.viralHashtags || '');
        if (viralHashtagsText) viralHashtagsText.textContent = h;
        if (typeof updateInteractiveHashtags === 'function' && h) {
          updateInteractiveHashtags(h);
        }
      }
    }

    if (scheduledCountBadge) {
      scheduledCountBadge.textContent = activeQueueFilter === 'scheduled'
        ? `${upcomingList.length} Scheduled`
        : activeQueueFilter === 'published'
        ? `${publishedList.length} Live`
        : `${cachedScheduledQueue.length} Reels`;
    }

    const lblHeaderSchedCount = document.getElementById('lblHeaderSchedCount');
    if (lblHeaderSchedCount) {
      lblHeaderSchedCount.textContent = `${upcomingList.length} Scheduled`;
    }

    // Filter list based on selected tab (Default: 'scheduled' - only upcoming!)
    let displayList = cachedScheduledQueue;
    if (activeQueueFilter === 'scheduled') {
      displayList = upcomingList;
    } else if (activeQueueFilter === 'published') {
      displayList = publishedList;
    }

    const btnClearPublishedQueue = document.getElementById('btnClearPublishedQueue');
    if (btnClearPublishedQueue) {
      if (publishedList.length > 0 && activeQueueFilter !== 'scheduled') {
        btnClearPublishedQueue.style.display = 'inline-flex';
        btnClearPublishedQueue.innerHTML = `<i class="fa-solid fa-trash-can"></i> <span>Clear History (${publishedList.length})</span>`;
      } else {
        btnClearPublishedQueue.style.display = 'none';
      }
    }

    if (displayList.length === 0) {
      const emptyMsg = activeQueueFilter === 'scheduled'
        ? '⏳ No pending scheduled reels. All reels are live!'
        : activeQueueFilter === 'published'
        ? '✅ No reels published yet.'
        : 'No reels available.';
      scheduledQueueList.innerHTML = `<div class="empty-queue-hint">${emptyMsg}</div>`;
      return;
    }

    scheduledQueueList.innerHTML = displayList.map(item => {
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
            <button type="button" class="btn-queue-action" onclick="triggerCancelScheduledReel('${item.id}')" title="Delete this reel" style="color: #ef4444;"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  }

  // Clear all published reels button listener
  const btnClearPublishedQueue = document.getElementById('btnClearPublishedQueue');
  if (btnClearPublishedQueue) {
    btnClearPublishedQueue.addEventListener('click', async () => {
      if (!confirm('Are you sure you want to clear the published reels history?')) return;
      try {
        btnClearPublishedQueue.disabled = true;
        const res = await fetch('/api/video/scheduled-queue/clear-published', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          showToast(`🧹 ${data.message}`);
          renderScheduledQueue(data.queue);
        } else {
          showToast(`Error: ${data.error}`, true);
        }
      } catch (err) {
        showToast(err.message, true);
      } finally {
        btnClearPublishedQueue.disabled = false;
      }
    });
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
    if (!confirm('Are you sure you want to delete this reel from queue and disk?')) return;
    try {
      const res = await fetch('/api/video/scheduled-queue/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, deleteFile: true })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Reel deleted successfully.');
        renderScheduledQueue(data.queue);
      }
    } catch (err) {
      showToast(err.message, true);
    }
  };

  // Queue Filter Tab Switcher (Upcoming vs Published vs All)
  document.querySelectorAll('.btn-queue-filter-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.btn-queue-filter-tab').forEach(t => {
        t.classList.remove('active');
        t.style.background = 'transparent';
        t.style.color = '#64748b';
        t.style.fontWeight = '600';
        t.style.boxShadow = 'none';
      });
      tab.classList.add('active');
      tab.style.background = '#ffffff';
      tab.style.color = '#4338ca';
      tab.style.fontWeight = '700';
      tab.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
      activeQueueFilter = tab.getAttribute('data-filter') || 'scheduled';
      renderScheduledQueue(cachedScheduledQueue);
    });
  });

  // Dropzone click & drag
  dropzone.addEventListener('click', (e) => {
    // Prevent triggering fileInput if clicking on buttons, badges, hints, or if a modal is open
    if (e.target.closest('button') || e.target.closest('.file-name-badge') || e.target.closest('#selectedFileName') || e.target.closest('#videoFileSelectedHint') || document.querySelector('.modal-backdrop:not(.hidden)')) {
      return;
    }
    fileInput.click();
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  let selectedBatchFiles = [];

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleVideoFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleVideoFiles(e.target.files);
    }
  });

  // Central function to remove selected upload file
  function removeSelectedUploadFile(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    selectedVideoFile = null;
    selectedBatchFiles = [];
    if (fileInput) fileInput.value = '';
    if (selectedFileNameBadge) {
      selectedFileNameBadge.innerHTML = '';
      selectedFileNameBadge.classList.add('hidden');
    }
    const hintCard = document.getElementById('videoFileSelectedHint');
    if (hintCard) hintCard.classList.add('hidden');
    const batchCard = document.getElementById('batchReelsManagerCard');
    if (batchCard) batchCard.classList.add('hidden');
  }

  // Central function to clear and reset the Reel Preview back to original placeholder
  function clearAndResetReelPreview() {
    currentRenderedReel = null;
    const player = document.getElementById('renderedVideoPlayer');
    if (player) {
      player.pause();
      player.removeAttribute('src');
      player.removeAttribute('poster');
      player.classList.remove('active');
      player.classList.remove('has-video');
      player.style.display = 'none';
      player.load();
    }
    const placeholder = document.getElementById('reelPlaceholder');
    if (placeholder) {
      placeholder.style.display = 'flex';
      placeholder.classList.remove('hidden');
    }
    const videoActions = document.getElementById('videoActionButtons');
    if (videoActions) videoActions.classList.add('hidden');

    const btnHeaderReset = document.getElementById('btnHeaderResetReel');
    if (btnHeaderReset) btnHeaderReset.style.display = 'none';

    const btnFloatingBack = document.getElementById('btnFloatingBackReel');
    if (btnFloatingBack) btnFloatingBack.style.display = 'none';

    // Also clear upload selection so user can start completely fresh
    removeSelectedUploadFile();

    // On mobile, auto-navigate back to step 1 (Upload Studio)
    if (typeof window.setReelStep === 'function') {
      window.setReelStep(1);
    }

    showToast('✨ Studio reset! Video cleared & ready to upload fresh.');
  }

  function handleVideoFiles(fileList) {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(f.name));
    if (validFiles.length === 0) {
      showToast('Please select valid video files (MP4/MOV/WEBM).', true);
      return;
    }

    const batchCard = document.getElementById('batchReelsManagerCard');
    const batchListDisplay = document.getElementById('batchFileListDisplay');
    const batchCountNum = document.getElementById('batchCountNum');

    if (validFiles.length > 1) {
      // Multi-Video Batch Flow
      selectedBatchFiles = validFiles;
      selectedVideoFile = validFiles[0]; // fallback
      if (batchCountNum) batchCountNum.textContent = validFiles.length;
      if (batchCard) batchCard.classList.remove('hidden');

      if (batchListDisplay) {
        batchListDisplay.innerHTML = validFiles.map((f, i) => `
          <div style="background: rgba(255,255,255,0.8); padding: 0.35rem 0.55rem; border-radius: 6px; border: 1px solid #e9d5ff; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-weight: 600; color: #581c87; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px;">
              ${i + 1}. ${f.name}
            </span>
            <span style="color: #7e22ce; font-size: 0.72rem; font-weight: 700;">${(f.size / (1024 * 1024)).toFixed(1)} MB</span>
          </div>
        `).join('');
      }

      const totalMB = (validFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(1);
      selectedFileNameBadge.textContent = `✓ Batch: ${validFiles.length} Videos Selected (${totalMB} MB Total)`;
      selectedFileNameBadge.classList.remove('hidden');
      showToast(`${validFiles.length} videos selected for batch processing!`);
    } else {
      // Single Video Flow
      selectedBatchFiles = [];
      if (batchCard) batchCard.classList.add('hidden');
      handleSingleVideoSelected(validFiles[0]);
    }
  }

  function handleSingleVideoSelected(file) {
    selectedVideoFile = file;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    selectedFileNameBadge.innerHTML = `
      <span style="display:inline-flex; align-items:center; gap:8px;">
        <span>✓ Selected: ${file.name} (${mbSize} MB)</span>
        <button type="button" id="btnCancelFromBadge" style="background: rgba(220, 38, 38, 0.15); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3); border-radius: 4px; padding: 2px 7px; font-size: 0.72rem; font-weight: 700; cursor: pointer;" title="Cancel & remove this video">✕ Cancel</button>
      </span>
    `;
    selectedFileNameBadge.classList.remove('hidden');

    const badgeCancelBtn = document.getElementById('btnCancelFromBadge');
    if (badgeCancelBtn) {
      badgeCancelBtn.addEventListener('click', (e) => {
        removeSelectedUploadFile(e);
        showToast('🗑️ Video selection canceled.');
      });
    }

    const hintCard = document.getElementById('videoFileSelectedHint');
    if (hintCard) hintCard.classList.remove('hidden');
    const txtSingleName = document.getElementById('txtSingleSelectedFileName');
    if (txtSingleName) txtSingleName.textContent = `${file.name} (${mbSize} MB)`;
    showToast(`Video loaded: ${file.name}`);
  }

  // Remove / Cancel Single Selected Video Button
  const btnRemoveSingleVideo = document.getElementById('btnRemoveSingleSelectedVideo');
  if (btnRemoveSingleVideo) {
    btnRemoveSingleVideo.addEventListener('click', (e) => {
      removeSelectedUploadFile(e);
      // If there's an active video in preview player, reset preview as well
      const player = document.getElementById('renderedVideoPlayer');
      if (player && (player.src || player.classList.contains('active'))) {
        clearAndResetReelPreview();
      } else {
        showToast('🗑️ Video canceled & removed. File upload closed.');
      }
    });
  }

  // Change Single Video Button
  const btnChangeSingleVideo = document.getElementById('btnChangeSingleVideo');
  if (btnChangeSingleVideo && fileInput) {
    btnChangeSingleVideo.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Remove / Reset Active Rendered Reel Button (Column 2)
  const btnResetActiveReel = document.getElementById('btnResetActiveReel');
  if (btnResetActiveReel) {
    btnResetActiveReel.addEventListener('click', (e) => {
      if (e) e.preventDefault();
      clearAndResetReelPreview();
    });
  }

  // Header Reset Reel Button (Column 2 Header)
  const btnHeaderResetReel = document.getElementById('btnHeaderResetReel');
  if (btnHeaderResetReel) {
    btnHeaderResetReel.addEventListener('click', (e) => {
      if (e) e.preventDefault();
      clearAndResetReelPreview();
    });
  }

  // Floating Back Reel Button (Inside iPhone Mockup)
  const btnFloatingBackReel = document.getElementById('btnFloatingBackReel');
  if (btnFloatingBackReel) {
    btnFloatingBackReel.addEventListener('click', (e) => {
      if (e) e.preventDefault();
      clearAndResetReelPreview();
    });
  }

  // Quick Generate Button directly from Step 1
  const btnQuickGenerateFromStep1 = document.getElementById('btnQuickGenerateFromStep1');
  if (btnQuickGenerateFromStep1 && btnProcessVideo) {
    btnQuickGenerateFromStep1.addEventListener('click', () => {
      btnProcessVideo.click();
    });
  }

  // Scroll to Scheduled Queue Link
  const btnScrollToQueue = document.getElementById('btnScrollToQueue');
  if (btnScrollToQueue) {
    btnScrollToQueue.addEventListener('click', () => {
      const qCard = document.getElementById('scheduledQueueCard');
      if (qCard) {
        qCard.scrollIntoView({ behavior: 'smooth' });
        qCard.style.outline = '2px solid #6366f1';
        setTimeout(() => { qCard.style.outline = 'none'; }, 2000);
      }
    });
  }

  // Batch Clear Button
  const btnClearBatchFiles = document.getElementById('btnClearBatchFiles');
  if (btnClearBatchFiles) {
    btnClearBatchFiles.addEventListener('click', () => {
      selectedBatchFiles = [];
      selectedVideoFile = null;
      fileInput.value = '';
      const batchCard = document.getElementById('batchReelsManagerCard');
      if (batchCard) batchCard.classList.add('hidden');
      const hintCard = document.getElementById('videoFileSelectedHint');
      if (hintCard) hintCard.classList.add('hidden');
      selectedFileNameBadge.classList.add('hidden');
      showToast('Batch selection cleared.');
    });
  }

  // Batch Process & Schedule Button
  const btnProcessBatchReels = document.getElementById('btnProcessBatchReels');
  if (btnProcessBatchReels) {
    btnProcessBatchReels.addEventListener('click', async () => {
      if (selectedBatchFiles.length === 0) {
        showToast('Please select multiple video files.', true);
        return;
      }

      const intervalSelect = document.getElementById('batchIntervalSelect');
      const intervalHours = intervalSelect ? intervalSelect.value : '24';
      const niche = videoNicheSelect ? videoNicheSelect.value : 'Auto-Detect';
      const targetDuration = videoDurationSelect ? videoDurationSelect.value : '30';

      const formData = new FormData();
      selectedBatchFiles.forEach(f => formData.append('reelFiles', f));
      formData.append('intervalHours', intervalHours);
      formData.append('niche', niche);
      formData.append('targetDuration', targetDuration);

      btnProcessBatchReels.disabled = true;
      btnProcessBatchReels.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Processing ${selectedBatchFiles.length} Reels...`;

      try {
        const uploadCard = document.getElementById('videoUploadProgressCard');
        const uploadBar = document.getElementById('videoUploadProgressBarFill');
        const uploadPercent = document.getElementById('videoUploadPercentBadge');
        const uploadSizeCounter = document.getElementById('videoUploadSizeCounter');
        const uploadSpeedIndicator = document.getElementById('videoUploadSpeedIndicator');
        const uploadPhaseText = document.getElementById('videoUploadPhaseText');

        if (uploadCard) {
          uploadCard.style.display = 'flex';
          uploadCard.classList.remove('hidden');
          if (uploadPhaseText) uploadPhaseText.textContent = `Batch upload (${selectedBatchFiles.length} videos)...`;
        }

        const data = await uploadWithProgress({
          url: '/api/video/batch-schedule',
          formData,
          onProgress: ({ percent, loadedMB, totalMB, speed }) => {
            if (uploadBar) uploadBar.style.width = `${percent}%`;
            if (uploadPercent) uploadPercent.textContent = `${percent}%`;
            if (uploadSizeCounter) {
              uploadSizeCounter.innerHTML = `<i class="fa-solid fa-file-arrow-up"></i> ${loadedMB} MB / ${totalMB} MB (${percent}%)`;
            }
            if (uploadSpeedIndicator) {
              uploadSpeedIndicator.innerHTML = `<i class="fa-solid fa-gauge-high"></i> ${speed}`;
            }
            if (percent >= 100 && uploadPhaseText) {
              uploadPhaseText.textContent = 'Server AI is processing and scheduling all reels... ⚙️';
            }
          }
        });

        showToast(`🎉 ${data.count} reels scheduled successfully!`);
        if (data.queue) {
          renderScheduledQueue(data.queue);
        }

        // Reset batch card
        selectedBatchFiles = [];
        fileInput.value = '';
        const batchCard = document.getElementById('batchReelsManagerCard');
        if (batchCard) batchCard.classList.add('hidden');
        selectedFileNameBadge.classList.add('hidden');
      } catch (err) {
        showToast(`Batch error: ${err.message}`, true);
      } finally {
        btnProcessBatchReels.disabled = false;
        btnProcessBatchReels.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> ⚡ Process & Schedule All Reels';
        const uploadCard = document.getElementById('videoUploadProgressCard');
        if (uploadCard) {
          setTimeout(() => {
            uploadCard.style.display = 'none';
            uploadCard.classList.add('hidden');
          }, 2000);
        }
      }
    });
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
        btnProcessVideoText.textContent = '🎬 ✨ Generate & Publish Photo Reel';
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
      showToast('Please select image files (JPG, PNG, WEBP).', true);
      return;
    }
    
    // Append to existing selection (strictly allow up to 6 photos max)
    const combined = [...selectedPhotoFilesList, ...validImgs];
    if (combined.length > 6) {
      showToast('Maximum 6 photos allowed (kept first 6 photos).', true);
      selectedPhotoFilesList = combined.slice(0, 6);
    } else {
      selectedPhotoFilesList = combined;
    }

    // Reset input value so user can click to add more photos immediately
    if (photoFilesInput) photoFilesInput.value = '';

    renderPhotosGalleryPreviews();
    showToast(`📸 ${selectedPhotoFilesList.length} photos selected! (2 to 6 photos reel)`);
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
        selectedPhotosCountLabel.innerHTML = '<i class="fa-solid fa-images" style="color: #b89758;"></i> <span>6 Sample Photos Ready ✓</span>';
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
      showToast('🥻 6 Patola Saree sample photos selected! Click "Generate Reel" now.');
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
      selectedPhotosCountLabel.innerHTML = `<i class="fa-solid fa-images" style="color: #b89758;"></i> <span>${selectedPhotoFilesList.length} / 6 Photos Selected</span>`;
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
      addCard.innerHTML = `<i class="fa-solid fa-plus" style="font-size: 1.15rem;"></i><span style="font-size: 0.65rem; font-weight: 800;">Add</span>`;
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
        showToast('Maximum 6 photos can be added.', true);
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
        showToast('Reel generation is already in progress, please wait...', true);
        return;
      }

      if (!isPatolaPresetActive && selectedPhotoFilesList.length === 0) {
        showToast('Please select at least 1 photo or load sample photos.', true);
        if (photoFilesInput) photoFilesInput.click();
        return;
      }

      isGeneratingReelBusy = true;
      btnGeneratePhotoReel.disabled = true;
      if (btnProcessVideo) btnProcessVideo.disabled = true;
      videoLoader.classList.remove('hidden');
      videoLoaderStatus.textContent = '📸 AI is rendering 30-second cinematic reel with music from your photos... (~10-15s)';

      const uploadBar = document.getElementById('uploadProgressBarFill');
      const uploadPercent = document.getElementById('uploadPercentBadge');
      const uploadSizeCounter = document.getElementById('uploadSizeCounter');
      const uploadSpeedIndicator = document.getElementById('uploadSpeedIndicator');
      const uploadPhaseText = document.getElementById('uploadPhaseText');
      const badgeStepUpload = document.getElementById('badgeStepUpload');
      const badgeStepAi = document.getElementById('badgeStepAi');
      const badgeStepSubtitles = document.getElementById('badgeStepSubtitles');
      const badgeStepRender = document.getElementById('badgeStepRender');
      const videoLoaderSpinner = document.getElementById('videoLoaderSpinner');

      if (uploadBar) {
        uploadBar.style.width = '0%';
        uploadBar.classList.remove('complete');
      }
      if (uploadPercent) uploadPercent.textContent = '0%';
      if (uploadPhaseText) uploadPhaseText.textContent = 'Uploading photos and audio...';
      if (uploadSizeCounter) uploadSizeCounter.innerHTML = '<i class="fa-solid fa-file-arrow-up"></i> 0.0 MB / 0.0 MB';
      if (uploadSpeedIndicator) uploadSpeedIndicator.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Connecting...';
      if (badgeStepUpload) {
        badgeStepUpload.className = 'step-badge current';
        badgeStepUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 1. Photos Upload (0%)';
      }
      if (badgeStepAi) badgeStepAi.className = 'step-badge';
      if (badgeStepSubtitles) badgeStepSubtitles.className = 'step-badge';
      if (badgeStepRender) badgeStepRender.className = 'step-badge';
      if (videoLoaderSpinner) videoLoaderSpinner.style.display = 'none';

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

        // Background Music & Volume (Presets, Instagram Online Song, or Manual Custom Song Upload)
        if (selectedCustomAudioFile) {
          formData.append('customAudio', selectedCustomAudioFile);
          formData.append('bgmTrack', 'custom');
        } else if (selectedOnlineSong && selectedOnlineSong.previewUrl && videoBgmSelect && videoBgmSelect.value === 'online') {
          formData.append('bgmTrack', 'online');
          formData.append('onlineAudioUrl', selectedOnlineSong.previewUrl);
          formData.append('onlineSongTitle', selectedOnlineSong.title || '');
          formData.append('onlineSongArtist', selectedOnlineSong.artist || '');
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

        let photoStageTimer = null;

        const data = await uploadWithProgress({
          url: '/api/video/photos-to-reel',
          formData,
          onProgress: ({ percent, loadedMB, totalMB, speed }) => {
            if (uploadBar) uploadBar.style.width = `${percent}%`;
            if (uploadPercent) uploadPercent.textContent = `${percent}%`;
            if (uploadSizeCounter) {
              uploadSizeCounter.innerHTML = `<i class="fa-solid fa-file-arrow-up"></i> ${loadedMB} MB / ${totalMB} MB (${percent}%)`;
            }
            if (uploadSpeedIndicator) {
              uploadSpeedIndicator.innerHTML = `<i class="fa-solid fa-gauge-high"></i> ${speed}`;
            }
            if (badgeStepUpload) {
              badgeStepUpload.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> 1. Photos Upload (${percent}%)`;
            }

            if (percent >= 100) {
              if (uploadBar) {
                uploadBar.classList.add('complete');
                uploadBar.style.width = '100%';
              }
              if (uploadPercent) uploadPercent.textContent = '100% ✓';
              if (uploadPhaseText) uploadPhaseText.textContent = 'Upload Complete ✓ (Rendering AI reel...)';
              if (uploadSpeedIndicator) uploadSpeedIndicator.innerHTML = '<i class="fa-solid fa-check"></i> Upload Successful ✓';
              if (badgeStepUpload) badgeStepUpload.className = 'step-badge active';
              if (badgeStepAi) badgeStepAi.className = 'step-badge current';
              if (videoLoaderSpinner) videoLoaderSpinner.style.display = 'block';
              videoLoaderStatus.textContent = 'AI is crafting a 30s reel with cinematic transitions & music...';

              photoStageTimer = setTimeout(() => {
                if (badgeStepAi) badgeStepAi.className = 'step-badge active';
                if (badgeStepSubtitles) badgeStepSubtitles.className = 'step-badge current';
                videoLoaderStatus.textContent = 'Syncing audio and exporting high-resolution 9:16 reel...';
              }, 3000);
            }
          }
        });

        if (photoStageTimer) clearTimeout(photoStageTimer);
        if (badgeStepSubtitles) badgeStepSubtitles.className = 'step-badge active';
        if (badgeStepRender) {
          badgeStepRender.className = 'step-badge active';
          badgeStepRender.innerHTML = '<i class="fa-solid fa-film"></i> 4. 9:16 Reel Ready ✓';
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
        const btnHeaderReset = document.getElementById('btnHeaderResetReel');
        if (btnHeaderReset) btnHeaderReset.style.display = 'inline-flex';
        const btnFloatingBack = document.getElementById('btnFloatingBackReel');
        if (btnFloatingBack) btnFloatingBack.style.display = 'inline-flex';

        // 5. Enable social publishing buttons
        const btnPublishBoth = document.getElementById('btnPublishBoth');
        const btnPublishInstagram = document.getElementById('btnPublishInstagram');
        const btnPublishYouTube = document.getElementById('btnPublishYouTube');
        if (btnPublishBoth) btnPublishBoth.disabled = false;
        if (btnPublishInstagram) btnPublishInstagram.disabled = false;
        if (btnPublishYouTube) btnPublishYouTube.disabled = false;

        // 6. Switch stepper on mobile to Step 2 (Reel Preview)
        if (typeof window.setReelStep === 'function') {
          window.setReelStep(2);
        }

        showToast('🎉 Professional photo reel created successfully!');
      } catch (err) {
        console.error('Photo reel generation error:', err);
        showToast(`Error: ${err.message}`, true);
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
        showToast('Please select a valid audio file (MP3, WAV, M4A).', true);
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
        customAudioFileStatus.innerHTML = `<span style="color: #16a34a; font-weight: 600;"><i class="fa-solid fa-circle-check"></i> File Selected</span>`;
      }
      if (customAudioNameDisplay) {
        customAudioNameDisplay.textContent = file.name;
      }
      if (customAudioDurationDisplay) {
        customAudioDurationDisplay.textContent = `${sizeMb} MB • Loading...`;
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
            customAudioDurationDisplay.textContent = `${mins}:${secs} (${sizeMb} MB) • Ready`;
          }
        });

        customAudioPreviewObj.addEventListener('ended', () => {
          if (btnPlayCustomAudio) btnPlayCustomAudio.innerHTML = '<i class="fa-solid fa-play"></i>';
          if (btnPreviewBgm) btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
        });

        showToast(`🎵 Song "${file.name}" selected!`);
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
      if (customAudioFileStatus) customAudioFileStatus.textContent = 'No custom audio selected';
      if (videoBgmSelect) videoBgmSelect.value = 'none';
      if (customAudioUploadBox) customAudioUploadBox.style.display = 'none';
      if (bgmVolumeRow) bgmVolumeRow.style.display = 'none';
      showToast('Custom song removed.');
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
        showToast('Please select a music track first.');
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

  // ========================================================
  // 🎵 INSTAGRAM-STYLE ONLINE MUSIC BROWSER & LIBRARY
  // ========================================================
  const songBrowserModal = document.getElementById('songBrowserModal');
  const btnOpenSongBrowser = document.getElementById('btnOpenSongBrowser');
  const btnBrowseSongShortcut = document.getElementById('btnBrowseSongShortcut');
  const btnCloseSongBrowserModal = document.getElementById('btnCloseSongBrowserModal');
  const btnConfirmSongSelection = document.getElementById('btnConfirmSongSelection');
  const selectedSongTitleDisplay = document.getElementById('selectedSongTitleDisplay');
  const selectedSongSubDisplay = document.getElementById('selectedSongSubDisplay');
  const selectedSongBadgeIcon = document.getElementById('selectedSongBadgeIcon');
  const btnPreviewSelectedSongMini = document.getElementById('btnPreviewSelectedSongMini');

  const songOnlineSearchInput = document.getElementById('songOnlineSearchInput');
  const btnClearSongSearch = document.getElementById('btnClearSongSearch');
  const songSearchSpinner = document.getElementById('songSearchSpinner');
  const lblSongListHeading = document.getElementById('lblSongListHeading');
  const lblSongResultsCount = document.getElementById('lblSongResultsCount');
  const songTrackList = document.getElementById('songTrackList');

  const songBrowserVolumeSlider = document.getElementById('songBrowserVolumeSlider');
  const lblSongBrowserVolume = document.getElementById('lblSongBrowserVolume');
  const songBrowserFileInput = document.getElementById('songBrowserFileInput');
  const btnUploadCustomSongInBrowser = document.getElementById('btnUploadCustomSongInBrowser');
  const customSongUploadedNameHint = document.getElementById('customSongUploadedNameHint');

  const trackMetaMap = {
    'luxury-saree': {
      title: '🥻 Luxury Saree Theme',
      subtitle: 'Acoustic Flute • Royal Patola Vibes',
      icon: '🥻',
      src: '/audio/bgm/luxury-saree.mp3'
    },
    'royal-heritage': {
      title: '👑 Royal Heritage',
      subtitle: 'Royal Sitar & Shehnai • Royal Heritage Music',
      icon: '👑',
      src: '/audio/bgm/royal-heritage.mp3'
    },
    'cinematic-ambient': {
      title: '🎬 Cinematic Ambient Glow',
      subtitle: 'Dreamy Soft Piano & Strings • Smooth Cinematic',
      icon: '🎬',
      src: '/audio/bgm/cinematic-ambient.mp3'
    },
    'lofi-aesthetic': {
      title: '☕ Lo-Fi Aesthetic Warmth',
      subtitle: 'Chill Cozy Beats • Social Media Vibes',
      icon: '☕',
      src: '/audio/bgm/lofi-aesthetic.mp3'
    },
    'none': {
      title: '🔇 Original Video Sound',
      subtitle: 'No Music • Original Video Audio',
      icon: '🔇',
      src: ''
    }
  };

  let modalActiveAudio = null;
  let onlineSearchDebounceTimer = null;
  let hasLoadedInitialTrending = false;

  function stopModalAudio() {
    if (modalActiveAudio) {
      modalActiveAudio.pause();
      modalActiveAudio = null;
    }
    document.querySelectorAll('.btn-track-play').forEach(btn => {
      btn.classList.remove('playing');
      btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Preview</span>';
    });
    if (btnPreviewSelectedSongMini) {
      btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
  }

  function openSongBrowserModal() {
    stopAllBgmPlayback();
    stopModalAudio();
    if (songBrowserModal) {
      songBrowserModal.classList.remove('hidden');
      if (!hasLoadedInitialTrending) {
        hasLoadedInitialTrending = true;
        fetchOnlineMusic('', 'reels');
      }
    }
  }

  function closeSongBrowserModal() {
    stopModalAudio();
    if (songBrowserModal) {
      songBrowserModal.classList.add('hidden');
    }
  }

  if (btnOpenSongBrowser) btnOpenSongBrowser.addEventListener('click', openSongBrowserModal);
  if (btnBrowseSongShortcut) btnBrowseSongShortcut.addEventListener('click', openSongBrowserModal);
  if (btnCloseSongBrowserModal) btnCloseSongBrowserModal.addEventListener('click', closeSongBrowserModal);
  if (btnConfirmSongSelection) {
    btnConfirmSongSelection.addEventListener('click', () => {
      closeSongBrowserModal();
      showToast('🎵 Background music applied successfully!');
    });
  }

  // Close modal when clicking outside card
  if (songBrowserModal) {
    songBrowserModal.addEventListener('click', (e) => {
      if (e.target === songBrowserModal) closeSongBrowserModal();
    });
  }

  // Online Music Search & Trending Fetcher
  async function fetchOnlineMusic(query = '', genre = 'reels') {
    if (!songTrackList) return;
    if (songSearchSpinner) songSearchSpinner.classList.remove('hidden');
    if (lblSongResultsCount) lblSongResultsCount.textContent = 'Searching...';

    try {
      let endpoint = '';
      if (query && query.trim().length > 0) {
        endpoint = `/api/music/search?q=${encodeURIComponent(query.trim())}`;
        if (lblSongListHeading) lblSongListHeading.textContent = `🔍 Results for "${query.trim()}"`;
      } else {
        endpoint = `/api/music/trending?genre=${encodeURIComponent(genre || 'reels')}`;
        const genreLabels = {
          'reels': '🔥 Trending Instagram Reels Music',
          'gujarati': '🥻 Garba & Gujarati Hits',
          'bollywood': '💖 Bollywood Romantic Hits',
          'punjabi': '⚡ Punjabi Trending Beats',
          'lofi': '☕ Lo-Fi Aesthetic Chill',
          'sitar': '👑 Royal Heritage Instrumental'
        };
        if (lblSongListHeading) lblSongListHeading.textContent = genreLabels[genre] || '🔥 Trending Instagram Music';
      }

      const res = await fetch(endpoint);
      const data = await res.json();

      if (data.success && Array.isArray(data.results) && data.results.length > 0) {
        renderOnlineSongs(data.results);
        if (lblSongResultsCount) {
          lblSongResultsCount.textContent = `${data.results.length} Songs Found`;
        }
      } else {
        renderOnlineSongs([]);
        if (lblSongResultsCount) lblSongResultsCount.textContent = '0 Songs';
      }
    } catch (err) {
      console.error('Music fetch error:', err);
      if (lblSongResultsCount) lblSongResultsCount.textContent = 'Connection Error';
    } finally {
      if (songSearchSpinner) songSearchSpinner.classList.add('hidden');
    }
  }

  // Render Track Cards with Artwork & Preview
  function renderOnlineSongs(songs) {
    if (!songTrackList) return;
    if (!songs || songs.length === 0) {
      songTrackList.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: #78716c;">
          <i class="fa-solid fa-music" style="font-size: 2.2rem; margin-bottom: 0.75rem; opacity: 0.35;"></i>
          <p style="font-weight: 700; margin: 0; color: #44403c; font-size: 0.95rem;">No songs found</p>
          <p style="font-size: 0.8rem; margin: 0.35rem 0 0 0;">Try searching another track or artist (e.g. Garba, Arijit, Kesariya, Patola, Khalasi, Lo-Fi...)</p>
        </div>
      `;
      return;
    }

    songTrackList.innerHTML = songs.map((track, idx) => {
      const isSelected = selectedOnlineSong && selectedOnlineSong.previewUrl === track.previewUrl;
      const artwork = track.artwork || 'https://via.placeholder.com/44x44/7c5a32/ffffff?text=🎵';
      const durationSec = track.duration || 30;
      return `
        <div class="song-track-card is-online ${isSelected ? 'selected' : ''}" data-online-index="${idx}">
          <div class="song-track-left">
            <img src="${artwork}" alt="${escapeHtml(track.title)}" class="song-track-thumb-img" onerror="this.src='https://via.placeholder.com/44x44/7c5a32/ffffff?text=🎵'">
            <div class="song-track-details">
              <div class="song-track-title">${escapeHtml(track.title)}</div>
              <div class="song-track-desc">${escapeHtml(track.artist)}${track.album ? ' • ' + escapeHtml(track.album) : ''}</div>
              <div class="song-track-tags">
                <span class="song-track-badge-online"><i class="fa-brands fa-instagram"></i> Live Online</span>
                <span class="track-tag">${durationSec}s HD Preview</span>
              </div>
            </div>
          </div>
          <div class="song-track-actions">
            <button type="button" class="btn-track-play btn-online-play" data-src="${track.previewUrl || ''}" title="Preview">
              <i class="fa-solid fa-play"></i> <span>Preview</span>
            </button>
            <button type="button" class="btn-track-select btn-online-select ${isSelected ? 'selected' : ''}" data-online-index="${idx}" title="Select for Reel">
              <i class="fa-solid ${isSelected ? 'fa-check' : 'fa-plus'}"></i>
              <span>${isSelected ? 'Selected' : 'Select'}</span>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Play Preview Listeners
    songTrackList.querySelectorAll('.btn-online-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const src = btn.getAttribute('data-src');
        if (!src) return;

        if (modalActiveAudio && modalActiveAudio.dataset.src === src && !modalActiveAudio.paused) {
          modalActiveAudio.pause();
          btn.classList.remove('playing');
          btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Preview</span>';
          return;
        }

        stopModalAudio();
        stopAllBgmPlayback();

        modalActiveAudio = new Audio(src);
        modalActiveAudio.dataset.src = src;
        const vol = songBrowserVolumeSlider ? parseFloat(songBrowserVolumeSlider.value) : 0.25;
        modalActiveAudio.volume = vol;

        btn.classList.add('playing');
        btn.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause</span> <span class="soundwave-anim"><span class="soundwave-bar"></span><span class="soundwave-bar"></span><span class="soundwave-bar"></span></span>';

        modalActiveAudio.addEventListener('ended', () => {
          btn.classList.remove('playing');
          btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Preview</span>';
        });

        modalActiveAudio.play().catch(err => {
          console.warn('Online audio playback error:', err);
          btn.classList.remove('playing');
          btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Preview</span>';
        });
      });
    });

    // Select Track Listeners
    songTrackList.querySelectorAll('.btn-online-select').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-online-index'), 10);
        const track = songs[idx];
        if (track) selectOnlineSongTrack(track);
      });
    });

    // Click entire card to select
    songTrackList.querySelectorAll('.song-track-card.is-online').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-track-play')) return;
        const idx = parseInt(card.getAttribute('data-online-index'), 10);
        const track = songs[idx];
        if (track) selectOnlineSongTrack(track);
      });
    });
  }

  // Select an Online Track
  function selectOnlineSongTrack(track) {
    selectedOnlineSong = track;
    selectedCustomAudioFile = null;

    if (videoBgmSelect) {
      videoBgmSelect.value = 'online';
    }

    // Update modal cards highlight
    songTrackList.querySelectorAll('.song-track-card').forEach(card => {
      const btn = card.querySelector('.btn-online-select');
      const isSelected = card.querySelector('.btn-online-play')?.getAttribute('data-src') === track.previewUrl;
      card.classList.toggle('selected', isSelected);
      if (btn) {
        if (isSelected) {
          btn.classList.add('selected');
          btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Selected</span>';
        } else {
          btn.classList.remove('selected');
          btn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Select</span>';
        }
      }
    });

    // Update Column 1 Music Box Display with Real Album Art & Title
    if (selectedSongTitleDisplay) {
      selectedSongTitleDisplay.textContent = `🎵 ${track.title}`;
    }
    if (selectedSongSubDisplay) {
      selectedSongSubDisplay.textContent = `${track.artist} • Instagram Live Audio`;
    }
    if (selectedSongBadgeIcon) {
      if (track.artwork) {
        selectedSongBadgeIcon.innerHTML = `<img src="${track.artwork}" alt="Album Art" style="width: 100%; height: 100%; border-radius: 8px; object-fit: cover;" />`;
      } else {
        selectedSongBadgeIcon.innerHTML = `<i class="fa-brands fa-instagram" style="color: #e1306c;"></i>`;
      }
    }

    showToast(`🎵 Online song selected: ${track.title} (${track.artist})`);
  }

  // Select Preset or Local Song
  function selectSongTrack(trackId, customFileName = '') {
    selectedOnlineSong = null;

    if (videoBgmSelect) {
      videoBgmSelect.value = trackId;
    }

    document.querySelectorAll('.song-track-card').forEach(card => {
      const isCardSelected = card.getAttribute('data-track-id') === trackId;
      card.classList.toggle('selected', isCardSelected);
      const selBtn = card.querySelector('.btn-track-select');
      if (selBtn) {
        if (isCardSelected) {
          selBtn.classList.add('selected');
          selBtn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Selected</span>';
        } else {
          selBtn.classList.remove('selected');
          selBtn.innerHTML = '<i class="fa-solid fa-plus"></i> <span>Select</span>';
        }
      }
    });

    if (trackId === 'custom') {
      const name = customFileName || selectedCustomAudioFile?.name || 'Custom Song';
      if (selectedSongTitleDisplay) selectedSongTitleDisplay.textContent = `🎵 ${name}`;
      if (selectedSongSubDisplay) selectedSongSubDisplay.textContent = 'Custom Song • From your device';
      if (selectedSongBadgeIcon) selectedSongBadgeIcon.innerHTML = '<i class="fa-solid fa-file-audio"></i>';
    } else {
      selectedCustomAudioFile = null;
      const meta = trackMetaMap[trackId] || trackMetaMap['luxury-saree'];
      if (selectedSongTitleDisplay) selectedSongTitleDisplay.textContent = meta.title;
      if (selectedSongSubDisplay) selectedSongSubDisplay.textContent = meta.subtitle;
      if (selectedSongBadgeIcon) selectedSongBadgeIcon.innerHTML = `<span style="font-size: 1.1rem;">${meta.icon}</span>`;
    }
  }

  // Search input with debounce
  if (songOnlineSearchInput) {
    songOnlineSearchInput.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      if (btnClearSongSearch) {
        if (val.length > 0) btnClearSongSearch.classList.remove('hidden');
        else btnClearSongSearch.classList.add('hidden');
      }

      clearTimeout(onlineSearchDebounceTimer);
      onlineSearchDebounceTimer = setTimeout(() => {
        if (val.length > 0) {
          fetchOnlineMusic(val);
        } else {
          fetchOnlineMusic('', 'reels');
        }
      }, 350);
    });
  }

  // Clear search button
  if (btnClearSongSearch && songOnlineSearchInput) {
    btnClearSongSearch.addEventListener('click', () => {
      songOnlineSearchInput.value = '';
      btnClearSongSearch.classList.add('hidden');
      fetchOnlineMusic('', 'reels');
      songOnlineSearchInput.focus();
    });
  }

  // Quick Trending Chips Row
  document.querySelectorAll('.quick-song-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.quick-song-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const q = chip.getAttribute('data-query') || chip.getAttribute('data-genre') || '';
      if (songOnlineSearchInput) songOnlineSearchInput.value = '';
      if (btnClearSongSearch) btnClearSongSearch.classList.add('hidden');
      fetchOnlineMusic(q);
    });
  });

  // Mini Play Button in Column 1
  if (btnPreviewSelectedSongMini) {
    btnPreviewSelectedSongMini.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentTrack = videoBgmSelect ? videoBgmSelect.value : 'luxury-saree';
      if (currentTrack === 'none') {
        showToast('No music selected.');
        return;
      }

      // 1. Online Instagram Track Preview
      if (currentTrack === 'online' && selectedOnlineSong && selectedOnlineSong.previewUrl) {
        if (currentBgmAudio && currentBgmAudio.dataset.track === 'online' && !currentBgmAudio.paused) {
          currentBgmAudio.pause();
          btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-play"></i>';
          return;
        }

        stopAllBgmPlayback();
        stopModalAudio();

        currentBgmAudio = new Audio(selectedOnlineSong.previewUrl);
        currentBgmAudio.dataset.track = 'online';
        const vol = bgmVolumeSlider ? parseFloat(bgmVolumeSlider.value) : 0.25;
        currentBgmAudio.volume = vol;

        btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-pause"></i>';
        currentBgmAudio.addEventListener('ended', () => {
          btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-play"></i>';
        });
        currentBgmAudio.play().catch(() => {});
        return;
      }

      // 2. Custom Uploaded Song Preview
      if (currentTrack === 'custom') {
        if (!selectedCustomAudioFile && customAudioInput) {
          customAudioInput.click();
          return;
        }
        if (customAudioPreviewObj) {
          if (!customAudioPreviewObj.paused) {
            customAudioPreviewObj.pause();
            btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-play"></i>';
          } else {
            customAudioPreviewObj.play().catch(() => {});
            btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-pause"></i>';
          }
        }
        return;
      }

      // 3. Preset Built-in Audio
      const meta = trackMetaMap[currentTrack] || trackMetaMap['luxury-saree'];
      if (!meta.src) return;

      if (currentBgmAudio && currentBgmAudio.dataset.track === currentTrack && !currentBgmAudio.paused) {
        currentBgmAudio.pause();
        btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-play"></i>';
        return;
      }

      stopAllBgmPlayback();
      stopModalAudio();

      currentBgmAudio = new Audio(meta.src);
      currentBgmAudio.dataset.track = currentTrack;
      const vol = bgmVolumeSlider ? parseFloat(bgmVolumeSlider.value) : 0.25;
      currentBgmAudio.volume = vol;

      btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-pause"></i>';
      currentBgmAudio.addEventListener('ended', () => {
        btnPreviewSelectedSongMini.innerHTML = '<i class="fa-solid fa-play"></i>';
      });
      currentBgmAudio.play().catch(() => {});
    });
  }

  // Custom Song Upload in Browser Modal
  if (btnUploadCustomSongInBrowser && songBrowserFileInput) {
    btnUploadCustomSongInBrowser.addEventListener('click', () => {
      songBrowserFileInput.click();
    });
  }

  if (songBrowserFileInput) {
    songBrowserFileInput.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|wav|m4a|aac|ogg)$/i)) {
        showToast('Please select a valid audio file (MP3/WAV).', true);
        return;
      }

      stopModalAudio();
      stopAllBgmPlayback();

      selectedCustomAudioFile = file;
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      if (customSongUploadedNameHint) {
        customSongUploadedNameHint.innerHTML = `<span style="color: #059669; font-weight: 700;"><i class="fa-solid fa-circle-check"></i> ${file.name} (${sizeMb} MB) - Ready!</span>`;
      }

      const audioUrl = URL.createObjectURL(file);
      customAudioPreviewObj = new Audio(audioUrl);
      const vol = songBrowserVolumeSlider ? parseFloat(songBrowserVolumeSlider.value) : 0.25;
      customAudioPreviewObj.volume = vol;

      selectSongTrack('custom', file.name);
      showToast(`🎵 Custom song selected: ${file.name}`);
    });
  }

  // Volume Slider in Modal
  if (songBrowserVolumeSlider) {
    songBrowserVolumeSlider.addEventListener('input', (e) => {
      const vol = parseFloat(e.target.value);
      if (lblSongBrowserVolume) lblSongBrowserVolume.textContent = `${Math.round(vol * 100)}%`;
      if (bgmVolumeSlider) bgmVolumeSlider.value = vol;
      if (bgmVolumeLabel) bgmVolumeLabel.textContent = `${Math.round(vol * 100)}%`;
      if (modalActiveAudio) modalActiveAudio.volume = vol;
      if (currentBgmAudio) currentBgmAudio.volume = vol;
      if (customAudioPreviewObj) customAudioPreviewObj.volume = vol;
    });
  }
  btnProcessVideo.addEventListener('click', async () => {
    if (isGeneratingReelBusy) {
      showToast('Reel generation is already in progress, please wait...', true);
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

    const inputIsDirectUpload = document.getElementById('inputIsDirectUpload');
    if (inputIsDirectUpload && inputIsDirectUpload.value === 'true') {
      formData.append('isDirectUpload', 'true');
    }

    // Feature #3: Append BGM Settings (Presets, Instagram Online Song, or Manual Custom Song Upload)
    if (selectedCustomAudioFile) {
      formData.append('customAudio', selectedCustomAudioFile);
      formData.append('bgmTrack', 'custom');
    } else if (selectedOnlineSong && selectedOnlineSong.previewUrl && videoBgmSelect && videoBgmSelect.value === 'online') {
      formData.append('bgmTrack', 'online');
      formData.append('onlineAudioUrl', selectedOnlineSong.previewUrl);
      formData.append('onlineSongTitle', selectedOnlineSong.title || '');
      formData.append('onlineSongArtist', selectedOnlineSong.artist || '');
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

    const uploadBar = document.getElementById('uploadProgressBarFill');
    const uploadPercent = document.getElementById('uploadPercentBadge');
    const uploadSizeCounter = document.getElementById('uploadSizeCounter');
    const uploadSpeedIndicator = document.getElementById('uploadSpeedIndicator');
    const uploadPhaseText = document.getElementById('uploadPhaseText');
    const badgeStepUpload = document.getElementById('badgeStepUpload');
    const badgeStepAi = document.getElementById('badgeStepAi');
    const badgeStepSubtitles = document.getElementById('badgeStepSubtitles');
    const badgeStepRender = document.getElementById('badgeStepRender');
    const videoLoaderSpinner = document.getElementById('videoLoaderSpinner');

    if (uploadBar) {
      uploadBar.style.width = '0%';
      uploadBar.classList.remove('complete');
    }
    if (uploadPercent) uploadPercent.textContent = '0%';
    if (uploadPhaseText) uploadPhaseText.textContent = 'Uploading video...';
    if (uploadSizeCounter) uploadSizeCounter.innerHTML = '<i class="fa-solid fa-file-arrow-up"></i> 0.0 MB / 0.0 MB';
    if (uploadSpeedIndicator) uploadSpeedIndicator.innerHTML = '<i class="fa-solid fa-gauge-high"></i> Connecting...';
    if (badgeStepUpload) {
      badgeStepUpload.className = 'step-badge current';
      badgeStepUpload.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> 1. Video Upload (0%)';
    }
    if (badgeStepAi) badgeStepAi.className = 'step-badge';
    if (badgeStepSubtitles) badgeStepSubtitles.className = 'step-badge';
    if (badgeStepRender) badgeStepRender.className = 'step-badge';
    if (videoLoaderSpinner) videoLoaderSpinner.style.display = 'none';

    let stageTimer = null;

    try {
      const data = await uploadWithProgress({
        url: '/api/video/auto-edit',
        formData,
        onProgress: ({ percent, loadedMB, totalMB, speed }) => {
          if (uploadBar) uploadBar.style.width = `${percent}%`;
          if (uploadPercent) uploadPercent.textContent = `${percent}%`;
          if (uploadSizeCounter) {
            uploadSizeCounter.innerHTML = `<i class="fa-solid fa-file-arrow-up"></i> ${loadedMB} MB / ${totalMB} MB (${percent}%)`;
          }
          if (uploadSpeedIndicator) {
            uploadSpeedIndicator.innerHTML = `<i class="fa-solid fa-gauge-high"></i> ${speed}`;
          }
          if (badgeStepUpload) {
            badgeStepUpload.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i> 1. Video Upload (${percent}%)`;
          }

          if (percent >= 100) {
            if (uploadBar) {
              uploadBar.classList.add('complete');
              uploadBar.style.width = '100%';
            }
            if (uploadPercent) uploadPercent.textContent = '100% ✓';
            if (uploadPhaseText) uploadPhaseText.textContent = 'Video 100% Uploaded ✓ (AI is rendering reel...)';
            if (uploadSpeedIndicator) uploadSpeedIndicator.innerHTML = '<i class="fa-solid fa-check"></i> Upload Successful ✓';
            if (badgeStepUpload) badgeStepUpload.className = 'step-badge active';
            if (badgeStepAi) badgeStepAi.className = 'step-badge current';
            if (videoLoaderSpinner) videoLoaderSpinner.style.display = 'block';
            videoLoaderStatus.textContent = 'AI is scanning video frames and composing 9:16 reel... (~5-10s)';

            stageTimer = setTimeout(() => {
              if (badgeStepAi) badgeStepAi.className = 'step-badge active';
              if (badgeStepSubtitles) badgeStepSubtitles.className = 'step-badge current';
              videoLoaderStatus.textContent = 'Applying cinematic color grading and dynamic subtitles...';
            }, 3000);
          }
        }
      });

      if (stageTimer) clearTimeout(stageTimer);
      if (badgeStepSubtitles) badgeStepSubtitles.className = 'step-badge active';
      if (badgeStepRender) {
        badgeStepRender.className = 'step-badge active';
        badgeStepRender.innerHTML = '<i class="fa-solid fa-film"></i> 4. 9:16 Reel Ready ✓';
      }

      currentRenderedReel = data;

      // 1. Play Rendered 9:16 Reel & Set Cover Poster
      reelPlaceholder.style.display = 'none';
      if (data.thumbnailUrl) {
        renderedVideoPlayer.poster = data.thumbnailUrl;
      }
      renderedVideoPlayer.src = data.reelUrl;
      renderedVideoPlayer.classList.add('active');
      renderedVideoPlayer.classList.add('has-video');
      renderedVideoPlayer.load();
      renderedVideoPlayer.play().catch(() => {});

      // 2. Set Recipe Stats & AI Vision Topic
      if (pillTheme) pillTheme.textContent = data.recipe?.themeName || 'Royal Vibrant';
      if (pillDuration) pillDuration.textContent = data.duration || '30s';
      if (recipePills) recipePills.classList.remove('hidden');

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
        if (detectedTopicText) detectedTopicText.textContent = data.recipe.detectedTopic;
        if (aiDetectedTopicBadge) aiDetectedTopicBadge.classList.remove('hidden');
      }

      // 3. Set Social Media Texts tailored to the video
      if (viralTitleText) {
        viralTitleText.textContent = data.recipe?.viralTitle || '✨ Watch This Till The End! #Shorts #Reels';
      }
      if (viralCaptionText) {
        viralCaptionText.textContent = data.recipe?.viralCaption || 'Unbelievable moments captured in high aesthetic 4K!';
      }
      const rawHashtags = data.recipe?.viralHashtags;
      const formattedHashtags = Array.isArray(rawHashtags)
        ? rawHashtags.map(t => String(t).trim().startsWith('#') ? String(t).trim() : `#${String(t).trim()}`).join(' ')
        : (typeof rawHashtags === 'string' && rawHashtags.trim() ? rawHashtags.trim() : '#ViralReels #Trending #Shorts #Explore');

      if (viralHashtagsText) {
        viralHashtagsText.textContent = formattedHashtags;
      }
      if (typeof updateInteractiveHashtags === 'function') {
        updateInteractiveHashtags(formattedHashtags);
      }

      // 4. Download Reel & Cover Thumbnail Buttons
      if (btnDownloadReel) {
        btnDownloadReel.href = data.downloadUrl || data.reelUrl || '#';
        btnDownloadReel.setAttribute('download', data.fileName || 'reel-30s.mp4');
      }

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
      const btnHeaderReset = document.getElementById('btnHeaderResetReel');
      if (btnHeaderReset) btnHeaderReset.style.display = 'inline-flex';
      const btnFloatingBack = document.getElementById('btnFloatingBackReel');
      if (btnFloatingBack) btnFloatingBack.style.display = 'inline-flex';

      // 5. Enable Social Media Buttons
      if (btnPublishYouTube) btnPublishYouTube.disabled = false;
      if (btnPublishInstagram) btnPublishInstagram.disabled = false;
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

      // On mobile, auto-advance stepper to Step 2 (Reel Preview)
      if (typeof window.setReelStep === 'function') {
        window.setReelStep(2);
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

  // ----------------------------------------------------
  // ✨ Luxury Editorial UI Helpers: Interactive Hashtags & Phone Controls
  // ----------------------------------------------------
  function syncHashtagsFromPills() {
    const container = document.getElementById('viralHashtagsContainer');
    const hiddenText = document.getElementById('viralHashtagsText');
    if (!container || !hiddenText) return;
    const remainingPills = Array.from(container.querySelectorAll('.hashtag-pill'));
    const combined = remainingPills.map(p => p.textContent.replace('×', '').trim()).join(' ');
    hiddenText.textContent = combined;
  }

  function updateInteractiveHashtags(hashtagsInput) {
    const container = document.getElementById('viralHashtagsContainer');
    const hiddenText = document.getElementById('viralHashtagsText');
    if (!container) return;

    let tagList = [];
    if (Array.isArray(hashtagsInput)) {
      tagList = hashtagsInput;
    } else if (typeof hashtagsInput === 'string' && hashtagsInput.trim()) {
      tagList = hashtagsInput.split(/[\s,]+/);
    } else if (hiddenText && hiddenText.textContent) {
      tagList = hiddenText.textContent.split(/[\s,]+/);
    }

    const rawTags = tagList
      .map(t => String(t).trim())
      .filter(t => t.length > 0 && t !== '#');

    if (rawTags.length === 0) return;

    container.innerHTML = '';
    rawTags.forEach(tag => {
      const cleanTag = tag.startsWith('#') ? tag : `#${tag}`;
      const pill = document.createElement('span');
      pill.className = 'hashtag-pill';
      pill.innerHTML = `${cleanTag} <i class="fa-solid fa-xmark" title="Remove hashtag"></i>`;
      pill.querySelector('i')?.addEventListener('click', (e) => {
        e.stopPropagation();
        pill.remove();
        syncHashtagsFromPills();
      });
      container.appendChild(pill);
    });

    syncHashtagsFromPills();
  }

  // Setup click listeners on initial interactive hashtags
  document.querySelectorAll('#viralHashtagsContainer .hashtag-pill i').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      icon.parentElement?.remove();
      syncHashtagsFromPills();
    });
  });

  // Choose Files Proxy Button
  const btnChooseFilesProxy = document.getElementById('btnChooseFilesProxy');
  if (btnChooseFilesProxy && fileInput) {
    btnChooseFilesProxy.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }

  // Floating Center Play Button Overlay on iPhone Screen
  const btnCenterPlayOverlay = document.getElementById('btnCenterPlayOverlay');
  if (btnCenterPlayOverlay && renderedVideoPlayer) {
    btnCenterPlayOverlay.addEventListener('click', (e) => {
      e.stopPropagation();
      if (renderedVideoPlayer.src && renderedVideoPlayer.src !== window.location.href) {
        if (renderedVideoPlayer.paused) {
          renderedVideoPlayer.play().catch(() => {});
          btnCenterPlayOverlay.style.opacity = '0.35';
        } else {
          renderedVideoPlayer.pause();
          btnCenterPlayOverlay.style.opacity = '1';
        }
      } else {
        const btnGen = document.getElementById('btnProcessVideo');
        if (btnGen) btnGen.click();
      }
    });
  }

  // Sync reset and back buttons when video plays
  if (renderedVideoPlayer) {
    renderedVideoPlayer.addEventListener('play', () => {
      const btnHeaderReset = document.getElementById('btnHeaderResetReel');
      if (btnHeaderReset) btnHeaderReset.style.display = 'inline-flex';
      const btnFloatingBack = document.getElementById('btnFloatingBackReel');
      if (btnFloatingBack) btnFloatingBack.style.display = 'inline-flex';
      const videoActions = document.getElementById('videoActionButtons');
      if (videoActions) videoActions.classList.remove('hidden');
    });

    if (renderedVideoPlayer.src && renderedVideoPlayer.src !== window.location.href && !renderedVideoPlayer.src.endsWith('/')) {
      const btnHeaderReset = document.getElementById('btnHeaderResetReel');
      if (btnHeaderReset) btnHeaderReset.style.display = 'inline-flex';
      const btnFloatingBack = document.getElementById('btnFloatingBackReel');
      if (btnFloatingBack) btnFloatingBack.style.display = 'inline-flex';
      const videoActions = document.getElementById('videoActionButtons');
      if (videoActions) videoActions.classList.remove('hidden');
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

  // Render Master Videos Queue / Playlist Card
  const queueList = document.getElementById('masterVideosQueueList');
  const queueCountBadge = document.getElementById('lblQueueCountBadge');
  const queue = state.masterVideosQueue || [];

  if (queueCountBadge) {
    const totalCount = (state.masterVideo ? 1 : 0) + queue.length;
    queueCountBadge.textContent = `${totalCount} Videos (${state.masterVideo ? '1 Active' : '0'} + ${queue.length} In Queue)`;
  }

  if (queueList) {
    let qHtml = '';
    if (state.masterVideo) {
      qHtml += `
        <div style="background: #eef2ff; border: 1.5px solid #6366f1; border-radius: 8px; padding: 0.55rem 0.75rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 700; font-size: 0.82rem; color: #1e1b4b; display: flex; align-items: center; gap: 0.4rem;">
              <span style="background: #4338ca; color: #fff; font-size: 0.65rem; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 800;">▶ ACTIVE NOW</span>
              ${state.masterVideo.originalName || 'Master Video'}
            </div>
            <div style="font-size: 0.72rem; color: #4f46e5; margin-top: 0.2rem;">
              ${state.masterVideo.totalDurationFormatted || ''} • Part ${state.currentPart} of ${state.masterVideo.totalParts || 0}
            </div>
          </div>
          <span style="font-size: 0.72rem; font-weight: 700; color: #059669; background: #ecfdf5; padding: 0.2rem 0.5rem; border-radius: 4px;">
            Cutting Part ${state.currentPart}
          </span>
        </div>
      `;
    }

    if (queue.length > 0) {
      queue.forEach((item, idx) => {
        qHtml += `
          <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.5rem 0.7rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem;">
            <div style="min-width: 0; flex: 1;">
              <div style="font-weight: 600; font-size: 0.8rem; color: #334155; display: flex; align-items: center; gap: 0.4rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                <span style="background: #94a3b8; color: #fff; font-size: 0.65rem; padding: 0.15rem 0.4rem; border-radius: 4px; font-weight: 700;">⏳ QUEUE #${idx + 1}</span>
                <span title="${item.originalName}">${item.originalName || 'Queued Video'}</span>
              </div>
              <div style="font-size: 0.72rem; color: #64748b; margin-top: 0.15rem;">
                ${item.totalDurationFormatted || ''} • ${item.totalParts || 0} 30s parts
              </div>
            </div>
            <div style="display: flex; gap: 0.35rem; align-items: center;">
              <button type="button" class="btn btn-ghost btn-promote-queue" data-id="${item.id}" style="padding: 0.25rem 0.55rem; font-size: 0.72rem; color: #4338ca; border: 1px solid #c7d2fe; background: #eef2ff;" title="Make Active Now">⚡ Make Active</button>
              <button type="button" class="btn btn-ghost btn-remove-queue" data-id="${item.id}" style="padding: 0.25rem 0.45rem; font-size: 0.72rem; color: #ef4444;" title="Remove from queue"><i class="fa-solid fa-trash-can"></i></button>
            </div>
          </div>
        `;
      });
    } else if (!state.masterVideo) {
      qHtml = '<div style="font-size: 0.78rem; color: #94a3b8; font-style: italic;">No videos in queue. Drag & drop above to add.</div>';
    }

    queueList.innerHTML = qHtml;

    // Attach listeners
    queueList.querySelectorAll('.btn-remove-queue').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await fetch('/api/scheduler/queue/remove', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          const d = await res.json();
          if (d.success) {
            showToast('Video removed from queue.');
            renderSchedulerState(d.state);
          }
        } catch (_) {}
      });
    });

    queueList.querySelectorAll('.btn-promote-queue').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        try {
          const res = await fetch('/api/scheduler/queue/promote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
          });
          const d = await res.json();
          if (d.success) {
            showToast('New video is now active! ✓');
            renderSchedulerState(d.state);
          }
        } catch (_) {}
      });
    });
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
    const btnSchedDownloadLatest = document.getElementById('btnSchedDownloadLatest');
    if (btnSchedDownloadLatest) {
      btnSchedDownloadLatest.classList.add('hidden');
      btnSchedDownloadLatest.style.display = 'none';
    }
  } else {
    // Show latest reel in player
    const latest = history[0];
    schedLatestPlayer.src = latest.renderedReelUrl;
    schedLatestPlayer.style.display = 'block';
    schedPlayerPlaceholder.style.display = 'none';

    const btnSchedDownloadLatest = document.getElementById('btnSchedDownloadLatest');
    if (btnSchedDownloadLatest) {
      btnSchedDownloadLatest.href = latest.renderedReelUrl;
      btnSchedDownloadLatest.download = latest.fileName || 'reel-part.mp4';
      btnSchedDownloadLatest.classList.remove('hidden');
      btnSchedDownloadLatest.style.display = 'inline-flex';
    }

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
          <a href="${item.renderedReelUrl}" download="${item.fileName || 'part.mp4'}" class="btn btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.75rem; font-weight: 700; color: #047857;" title="Download this 30s Reel">
            <i class="fa-solid fa-download"></i> ⬇️ Download 30s MP4
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

  let selectedSchedulerFiles = [];

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleSchedulerFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleSchedulerFiles(e.target.files);
    }
  });

  function handleSchedulerFiles(fileList) {
    const validFiles = Array.from(fileList).filter(f => f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv)$/i.test(f.name));
    if (validFiles.length === 0) {
      showToast('Please select valid video file(s).', true);
      return;
    }
    selectedSchedulerFiles = validFiles;
    selectedSchedulerFile = validFiles[0];

    if (validFiles.length === 1) {
      const mbSize = (validFiles[0].size / (1024 * 1024)).toFixed(1);
      fileNameBadge.textContent = `✓ Selected: ${validFiles[0].name} (${mbSize} MB)`;
      fileNameBadge.classList.remove('hidden');
      showToast(`Long video selected: ${validFiles[0].name}`);
    } else {
      const totalMB = (validFiles.reduce((sum, f) => sum + f.size, 0) / (1024 * 1024)).toFixed(1);
      fileNameBadge.textContent = `✓ Playlist: ${validFiles.length} Long Videos Selected (${totalMB} MB Total)`;
      fileNameBadge.classList.remove('hidden');
      showToast(`${validFiles.length} long videos added to queue playlist!`);
    }
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
    const hasFiles = selectedSchedulerFiles && selectedSchedulerFiles.length > 0;
    if (hasFiles) {
      selectedSchedulerFiles.forEach(f => formData.append('masterVideos', f));
    } else if (selectedSchedulerFile) {
      formData.append('masterVideos', selectedSchedulerFile);
    }

    const schedUploadCard = document.getElementById('schedulerUploadProgressCard');
    const schedUploadBar = document.getElementById('schedulerUploadProgressBarFill');
    const schedUploadPercent = document.getElementById('schedulerUploadPercentBadge');
    const schedUploadSizeCounter = document.getElementById('schedulerUploadSizeCounter');
    const schedUploadSpeedIndicator = document.getElementById('schedulerUploadSpeedIndicator');
    const schedUploadPhaseText = document.getElementById('schedulerUploadPhaseText');

    if ((hasFiles || selectedSchedulerFile) && schedUploadCard) {
      schedUploadCard.style.display = 'flex';
      schedUploadCard.classList.remove('hidden');
      if (schedUploadBar) {
        schedUploadBar.style.width = '0%';
        schedUploadBar.classList.remove('complete');
      }
      if (schedUploadPercent) schedUploadPercent.textContent = '0%';
      if (schedUploadPhaseText) {
        schedUploadPhaseText.textContent = hasFiles && selectedSchedulerFiles.length > 1
          ? `Uploading ${selectedSchedulerFiles.length} master videos...`
          : 'Uploading master video...';
      }
    }

    try {
      let data;
      if (hasFiles || selectedSchedulerFile) {
        data = await uploadWithProgress({
          url: '/api/scheduler/setup',
          formData,
          onProgress: ({ percent, loadedMB, totalMB, speed }) => {
            if (schedUploadBar) schedUploadBar.style.width = `${percent}%`;
            if (schedUploadPercent) schedUploadPercent.textContent = `${percent}%`;
            if (schedUploadSizeCounter) {
              schedUploadSizeCounter.innerHTML = `<i class="fa-solid fa-file-arrow-up"></i> ${loadedMB} MB / ${totalMB} MB (${percent}%)`;
            }
            if (schedUploadSpeedIndicator) {
              schedUploadSpeedIndicator.innerHTML = `<i class="fa-solid fa-gauge-high"></i> ${speed}`;
            }
            if (percent >= 100) {
              if (schedUploadBar) {
                schedUploadBar.classList.add('complete');
                schedUploadBar.style.width = '100%';
              }
              if (schedUploadPercent) schedUploadPercent.textContent = '100% ✓';
              if (schedUploadPhaseText) schedUploadPhaseText.textContent = 'Video upload complete ✓ (Activating scheduler...)';
              if (schedUploadSpeedIndicator) schedUploadSpeedIndicator.innerHTML = '<i class="fa-solid fa-check"></i> Upload Successful ✓';
            }
          }
        });
      } else {
        const res = await fetch('/api/scheduler/setup', {
          method: 'POST',
          body: formData
        });
        data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to configure scheduler.');
        }
      }

      showToast(data.message || 'Scheduler auto-pilot activated successfully!');
      renderSchedulerState(data.state);
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnSaveSchedule.disabled = false;
      btnSaveSchedule.innerHTML = '<i class="fa-solid fa-play"></i> <span>⏰ Activate Scheduler (Auto-Pilot)</span>';
      if (schedUploadCard) {
        setTimeout(() => {
          schedUploadCard.style.display = 'none';
          schedUploadCard.classList.add('hidden');
        }, 2000);
      }
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
        showToast('Please create or select a video first.', true);
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

        showToast('🎉 New HD 9:16 cover poster created successfully! 🖼️');
      } catch (err) {
        console.error(err);
        showToast(`Error: ${err.message}`, true);
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
const ANALYTICS_LOCAL_CACHE_KEY = 'INSTA_ANALYTICS_PAYLOAD_CACHE';
let isAnalyticsFetching = false;
let currentAnalyticsReels = [];
let currentAnalyticsSort = 'viral';

function initAnalyticsView() {
  // ⚡ 1. INSTANT LOCAL RENDER: Load cached metrics from localStorage immediately (0ms wait time)
  loadAnalyticsFromLocalCache();

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
  const cleanModeSelect = document.getElementById('cleanStorageMode');
  if (btnClean) {
    btnClean.addEventListener('click', async () => {
      const selectedVal = cleanModeSelect ? cleanModeSelect.value : 'smart';
      let payload = { mode: 'smart', keepCount: 5, cleanFrames: true };
      let confirmMsg = 'Do you want to clean up older video and temp files? (Latest 5 reels are always preserved)';

      if (selectedVal !== 'smart') {
        const days = parseFloat(selectedVal) || 1;
        payload = { mode: 'days', daysOld: days, keepCount: 5, cleanFrames: true };
        confirmMsg = `Do you want to clean up video files older than ${days} days? (Latest 5 reels are preserved)`;
      }

      if (!confirm(confirmMsg)) {
        return;
      }

      try {
        btnClean.disabled = true;
        btnClean.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Cleaning files...';
        const res = await fetch('/api/storage/clean', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          // Immediately update storage UI labels
          const sSize = document.getElementById('storageSizeLabel');
          const sFiles = document.getElementById('storageFilesLabel');
          if (sSize && data.remainingMB !== undefined) sSize.textContent = `${data.remainingMB} MB`;
          if (sFiles && data.remainingFiles !== undefined) sFiles.textContent = `(${data.remainingFiles} Files)`;

          // Update local cache
          try {
            const raw = localStorage.getItem(ANALYTICS_LOCAL_CACHE_KEY);
            if (raw) {
              const cached = JSON.parse(raw);
              if (cached && cached.storage) {
                cached.storage.totalMB = data.remainingMB;
                cached.storage.totalFiles = data.remainingFiles;
                localStorage.setItem(ANALYTICS_LOCAL_CACHE_KEY, JSON.stringify(cached));
              }
            }
          } catch (_) {}

          showToast(`🧹 ${data.message}`);
          fetchAnalyticsOverview(true);
        } else {
          showToast(`Error: ${data.error}`, true);
        }
      } catch (err) {
        showToast(`Error: ${err.message}`, true);
      } finally {
        btnClean.disabled = false;
        btnClean.innerHTML = '<i class="fa-solid fa-broom"></i> <span>Clean Now</span>';
      }
    });
  }
}

// ⚡ Load cached payload instantly on page load
function loadAnalyticsFromLocalCache() {
  try {
    const raw = localStorage.getItem(ANALYTICS_LOCAL_CACHE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data && data.success) {
      populateAnalyticsUI(data, false);
      return true;
    }
  } catch (e) {
    console.warn('Local analytics cache read warning:', e);
  }
  return false;
}

// 🎨 Safely populate all UI elements with zero risk of unhandled DOM null errors
function populateAnalyticsUI(data, isLive = true) {
  if (!data) return;

  try {
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
    if (lastUpdated) {
      lastUpdated.textContent = isLive 
        ? new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        : 'Cached Data';
    }

    // 2. Top KPI Cards
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
        try {
          const d = new Date(topReel.publishedAt);
          topDateBadge.textContent = '• ' + d.toLocaleDateString('gu-IN', { day: 'numeric', month: 'short' });
        } catch (_) {}
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
  } catch (renderErr) {
    console.error('Error populating analytics UI:', renderErr);
  }
}

async function fetchAnalyticsOverview(showFeedback = false) {
  if (isAnalyticsFetching) return;
  isAnalyticsFetching = true;

  const syncIcon = document.getElementById('analyticsSyncIcon');
  if (syncIcon) syncIcon.classList.add('fa-spin');

  // If we don't have reels displayed yet, make sure local cache is checked first
  if (currentAnalyticsReels.length === 0) {
    loadAnalyticsFromLocalCache();
  }

  try {
    const fetchUrl = showFeedback ? '/api/social/analytics?refresh=true' : '/api/social/analytics';
    
    // Strict 8-second fetch timeout to guarantee it never hangs indefinitely
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(fetchUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) throw new Error(`HTTP Error ${res.status}`);
    const data = await res.json();
    if (!data || !data.success) throw new Error(data?.error || 'Analytics fetch failed');

    // Save to local cache for instant future loads
    try {
      localStorage.setItem(ANALYTICS_LOCAL_CACHE_KEY, JSON.stringify(data));
    } catch (_) {}

    // Populate UI with live data
    populateAnalyticsUI(data, true);

    if (showFeedback) {
      showToast('🎉 Live analytics and view stats updated successfully! 📊');
    }
  } catch (err) {
    console.warn('Analytics fetch note:', err.message);

    // If we have cached reels, keep them on screen!
    if (currentAnalyticsReels.length === 0) {
      const hasLocalCache = loadAnalyticsFromLocalCache();
      if (!hasLocalCache) {
        // Render a friendly retry state card instead of leaving an infinite spinner
        const container = document.getElementById('analyticsReelsGrid');
        if (container) {
          container.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1.5rem; background: #faf8f5; border: 1.5px dashed rgba(215, 206, 192, 0.9); border-radius: 16px;">
              <i class="fa-solid fa-cloud-arrow-down" style="font-size: 2.2rem; color: #b89758; margin-bottom: 0.85rem;"></i>
              <h4 style="color: #44403c; margin: 0 0 0.35rem 0; font-family: var(--font-serif); font-size: 1.15rem;">Live Analytics Connection Slow</h4>
              <p style="font-size: 0.85rem; color: #78716c; max-width: 480px; margin: 0 auto 1.25rem auto;">Connecting to social servers took longer than expected. Click below to retry.</p>
              <button type="button" class="btn btn-primary" onclick="fetchAnalyticsOverview(true)" style="padding: 0.55rem 1.3rem; border-radius: 10px; font-weight: 700;">
                <i class="fa-solid fa-rotate"></i> 🔄 Retry Now
              </button>
            </div>
          `;
        }
      }
    }

    if (showFeedback) {
      showToast(`Analytics update: ${err.message}`, true);
    }
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
        <h4 style="color: #44403c; margin: 0 0 0.35rem 0; font-family: var(--font-serif); font-size: 1.15rem;">No Reels Published Yet</h4>
        <p style="font-size: 0.84rem; margin: 0; color: #78716c;">Publish your first reel from Reel Studio or Daily Auto-Pilot to see live stats!</p>
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
      : 'Just now';

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
                <i class="fa-solid fa-fire" style="color: #e11d48;"></i> Top Engagement (Most Viral)
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
// 🎬 9. AI INTERACTIVE TIMELINE STUDIO & FX EDITOR (CapCut / Premiere Rush Style Workstation)
// ================================================================================================
function initTimelineStudio() {
  const modal = document.getElementById('timelineStudioModal');
  const btnOpen = document.getElementById('btnOpenTimelineStudio');
  const btnOpenCapCut = document.getElementById('btnOpenCapCutEditor');
  const btnOpenCol1 = document.getElementById('btnOpenTimelineFromCol1');
  const btnClose = document.getElementById('btnCloseTimelineModal');
  const btnCloseFooter = document.getElementById('btnCloseTimelineModalFooter');
  const videoPreview = document.getElementById('timelinePreviewVideo');
  const monitorFrame = document.getElementById('proMonitorFrame');
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
  const btnInspectorAiQuick = document.getElementById('btnInspectorAiQuick');
  const subBadge = document.getElementById('timelineLiveSubBadge');
  const stickerOverlay = document.getElementById('timelineStickerOverlay');
  const stickerIconContent = document.getElementById('stickerIconContent');
  const vignetteOverlay = document.getElementById('timelineVignetteOverlay');
  const flashOverlay = document.getElementById('timelineFlashOverlay');
  const glitchOverlay = document.getElementById('timelineGlitchOverlay');
  const customSubInput = document.getElementById('txtTimelineCustomSub');
  const trackSubLabel = document.getElementById('timelineTrackSubLabel');
  const chkZoom = document.getElementById('chkFxZoom');
  const chkVignette = document.getElementById('chkFxVignette');
  const chkFlash = document.getElementById('chkFxFlash');
  const rngVideoSpeed = document.getElementById('rngVideoSpeed');
  const lblSpeedDisplay = document.getElementById('lblSpeedDisplay');
  const lblSpeedSliderVal = document.getElementById('lblSpeedSliderVal');
  const rngOriginalVolume = document.getElementById('rngOriginalVolume');
  const lblOrigVolDisplay = document.getElementById('lblOrigVolDisplay');
  const chkMuteOrigAudio = document.getElementById('chkMuteOrigAudio');
  const btnReset = document.getElementById('btnTimelineReset');
  const btnApply = document.getElementById('btnApplyTimelineEdits');
  const btnExportFromPublishTab = document.getElementById('btnExportFromPublishTab');

  // Adjust sliders
  const rngAdjBrightness = document.getElementById('rngAdjBrightness');
  const rngAdjContrast = document.getElementById('rngAdjContrast');
  const rngAdjSaturation = document.getElementById('rngAdjSaturation');
  const rngAdjExposure = document.getElementById('rngAdjExposure');
  const rngAdjTemp = document.getElementById('rngAdjTemp');
  const rngAdjSharp = document.getElementById('rngAdjSharp');
  const lblAdjBrightness = document.getElementById('lblAdjBrightness');
  const lblAdjContrast = document.getElementById('lblAdjContrast');
  const lblAdjSaturation = document.getElementById('lblAdjSaturation');
  const lblAdjExposure = document.getElementById('lblAdjExposure');
  const lblAdjTemp = document.getElementById('lblAdjTemp');
  const lblAdjSharp = document.getElementById('lblAdjSharp');

  // Inspector labels
  const lblInspectorDuration = document.getElementById('lblInspectorDuration');
  const lblInspectorSpeed = document.getElementById('lblInspectorSpeed');
  const lblInspectorFilter = document.getElementById('lblInspectorFilter');
  const lblInspectorAspect = document.getElementById('lblInspectorAspect');
  const lblProAspectBadge = document.getElementById('lblProAspectBadge');
  const lblProResBadge = document.getElementById('lblProResBadge');
  const needle = document.getElementById('timelinePlayheadNeedle');

  if (!modal) return;

  // CapCut Pro Editor State
  let editorState = {
    trimStart: 0,
    trimEnd: 30,
    duration: 30,
    speed: 1.0,
    origVolume: 1.0,
    filter: 'none',
    rotate: 0,
    flipH: false,
    flipV: false,
    adjust: {
      brightness: 0,
      contrast: 100,
      saturation: 100,
      exposure: 0,
      temp: 0,
      sharp: 0
    },
    voice: 'normal',
    transition: 'none',
    sticker: 'none',
    aspect: '9:16',
    res: '1080p',
    fps: '30',
    textSize: 'large',
    textPosition: 'bottom',
    textColor: 'yellow',
    customText: '',
    zoom: false,
    vignette: false,
    flash: false
  };

  function openTimelineStudio() {
    let sourceVideo = '';
    let fileName = 'Main_Video_Clip.mp4';

    // 1. Check if user selected/uploaded a video file in Step 1
    if (selectedVideoFile) {
      try {
        sourceVideo = URL.createObjectURL(selectedVideoFile);
        fileName = selectedVideoFile.name || 'Custom_Upload.mp4';
      } catch (err) {
        console.warn('Could not create ObjectURL for selectedVideoFile:', err);
      }
    }

    // 2. Check if an AI reel was already rendered
    if (!sourceVideo && currentRenderedReel) {
      sourceVideo = currentRenderedReel.reelUrl || currentRenderedReel.videoUrl || '';
      if (currentRenderedReel.fileName) fileName = currentRenderedReel.fileName;
    }

    // 3. Check if main player has active video src
    const renderedVideo = document.getElementById('renderedVideoPlayer');
    if (!sourceVideo && renderedVideo && renderedVideo.src && !renderedVideo.src.endsWith('/')) {
      sourceVideo = renderedVideo.src;
    }

    // 4. Guaranteed demo video clip fallback
    if (!sourceVideo || sourceVideo.endsWith('/')) {
      sourceVideo = '/rendered-reels/reel-demo.mp4';
      fileName = 'reel-demo.mp4';
    }

    if (videoPreview) {
      if (!videoPreview.src || videoPreview.src !== sourceVideo) {
        videoPreview.src = sourceVideo;
        videoPreview.playbackRate = editorState.speed || 1.0;
        videoPreview.volume = Math.min(1.0, editorState.origVolume ?? 1.0);
        videoPreview.load();
      }
      videoPreview.play().catch(() => {});
    }
    modal.classList.remove('hidden');

    // Sync timeline video clip name
    const vidClipLabel = document.getElementById('timelineVideoClipLabel');
    if (vidClipLabel) {
      vidClipLabel.textContent = fileName;
    }

    // Sync duration when metadata loads
    if (videoPreview) {
      videoPreview.onloadedmetadata = () => {
        const realDur = Math.round(videoPreview.duration) || 30;
        if (rngTrimStart) rngTrimStart.max = realDur;
        if (rngTrimEnd) {
          rngTrimEnd.max = realDur;
          rngTrimEnd.value = Math.min(realDur, 30);
        }
        editorState.trimEnd = parseFloat(rngTrimEnd ? rngTrimEnd.value : 30);
        editorState.duration = realDur;
        updateTrimDisplay();
        updateLivePreview();
      };
    }

    updateTrimDisplay();
    updateLivePreview();
  }

  function closeTimelineStudio(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    if (videoPreview) videoPreview.pause();
    modal.classList.add('hidden');
  }

  // Bind Open Triggers
  if (btnOpen) btnOpen.addEventListener('click', openTimelineStudio);
  if (btnOpenCapCut) btnOpenCapCut.addEventListener('click', openTimelineStudio);
  if (btnOpenCol1) btnOpenCol1.addEventListener('click', openTimelineStudio);

  // Bind Close Triggers
  if (btnClose) {
    btnClose.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeTimelineStudio(e);
    });
  }
  if (btnCloseFooter) {
    btnCloseFooter.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeTimelineStudio(e);
    });
  }

  // 🚀 Next Button: Exit CapCut Pro Studio & Return to Upload / Content Studio Section
  function goToUploadSection(e) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    closeTimelineStudio();

    // Scroll to the main Upload Dropzone / Reel Creator Card
    const uploadSection = document.getElementById('videoDropzone') || document.getElementById('step-1') || document.querySelector('.studio-upload-card');
    if (uploadSection) {
      uploadSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
      uploadSection.style.transition = 'box-shadow 0.4s ease, border-color 0.4s ease';
      uploadSection.style.boxShadow = '0 0 0 4px rgba(148, 110, 43, 0.4), 0 10px 30px rgba(148, 110, 43, 0.2)';
      uploadSection.style.borderColor = '#946e2b';
      setTimeout(() => {
        uploadSection.style.boxShadow = '';
        uploadSection.style.borderColor = '';
      }, 2200);
    }
    showToast('🚀 Exited Studio and proceeded to Video Upload section!');
  }

  const btnProNextToUpload = document.getElementById('btnProNextToUpload');
  if (btnProNextToUpload) {
    btnProNextToUpload.addEventListener('click', goToUploadSection);
  }

  const btnExportNextToUpload = document.getElementById('btnExportNextToUpload');
  if (btnExportNextToUpload) {
    btnExportNextToUpload.addEventListener('click', goToUploadSection);
  }

  // Close on Backdrop Click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      e.preventDefault();
      e.stopPropagation();
      closeTimelineStudio(e);
    }
  });

  // Play / Pause Toggle
  if (btnTogglePlay && videoPreview) {
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

  // Transport Extra Controls
  const btnStepBack = document.getElementById('btnStepBack');
  const btnStepForward = document.getElementById('btnStepForward');
  const btnToggleLoop = document.getElementById('btnToggleLoop');
  const btnToggleFullscreen = document.getElementById('btnToggleFullscreen');

  if (btnStepBack && videoPreview) {
    btnStepBack.addEventListener('click', () => {
      videoPreview.currentTime = Math.max(editorState.trimStart, videoPreview.currentTime - 1.0);
    });
  }
  if (btnStepForward && videoPreview) {
    btnStepForward.addEventListener('click', () => {
      videoPreview.currentTime = Math.min(editorState.trimEnd, videoPreview.currentTime + 1.0);
    });
  }
  if (btnToggleLoop && videoPreview) {
    btnToggleLoop.addEventListener('click', () => {
      videoPreview.loop = !videoPreview.loop;
      btnToggleLoop.classList.toggle('active', videoPreview.loop);
      showToast(videoPreview.loop ? '🔁 Loop playback enabled' : '➡️ Play-once mode');
    });
  }
  if (btnToggleFullscreen && monitorFrame) {
    btnToggleFullscreen.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        monitorFrame.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });
  }

  // Playhead constraints to trim boundaries & Needle animation
  if (videoPreview) {
    videoPreview.ontimeupdate = () => {
      const cur = videoPreview.currentTime;
      if (lblCurrentTime) {
        const mins = Math.floor(cur / 60);
        const secs = Math.floor(cur % 60);
        const frac = Math.floor((cur % 1) * 100);
        lblCurrentTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${frac.toString().padStart(2, '0')}`;
      }

      // Move needle across timeline
      if (needle && editorState.duration > 0) {
        const pct = (cur / editorState.duration) * 100;
        needle.style.left = `${Math.min(100, Math.max(0, pct))}%`;
      }

      // Loop within trim range
      if (cur < editorState.trimStart) {
        videoPreview.currentTime = editorState.trimStart;
      } else if (cur > editorState.trimEnd) {
        videoPreview.currentTime = editorState.trimStart;
        if (editorState.flash && flashOverlay) {
          flashOverlay.style.opacity = '0.9';
          setTimeout(() => { flashOverlay.style.opacity = '0'; }, 320);
        }
      }
    };
  }

  // Master Category Tab Switching (CapCut Pro Desktop & Mobile style)
  window.switchTimelineTab = function(tabId) {
    if (!tabId) return;
    const modalEl = document.getElementById('timelineStudioModal');
    if (!modalEl) return;

    // 1. Update tab ribbon button active classes
    modalEl.querySelectorAll('.pro-cat-tab, .editor-tab-btn').forEach(btn => {
      const bTab = btn.getAttribute('data-tab') || btn.dataset.tab;
      if (bTab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // 2. Switch tool drawer panes
    modalEl.querySelectorAll('.pro-tab-pane, .editor-tab-pane').forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.remove('hidden');
        pane.classList.add('active');
        pane.style.display = 'block';
      } else {
        pane.classList.add('hidden');
        pane.classList.remove('active');
        pane.style.display = 'none';
      }
    });
  };

  const allCatTabs = modal.querySelectorAll('.pro-cat-tab, .editor-tab-btn');
  allCatTabs.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = btn.getAttribute('data-tab') || btn.dataset.tab;
      if (targetId) window.switchTimelineTab(targetId);
    });
  });

  // Curve Speed Presets (Hero, Jump, Flash, Standard)
  modal.querySelectorAll('.btn-curve-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.querySelectorAll('.btn-curve-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const curve = btn.getAttribute('data-curve') || btn.dataset.curve;
      if (curve === 'hero') applySpeed(0.5);
      else if (curve === 'jump') applySpeed(2.0);
      else if (curve === 'flash') applySpeed(3.0);
      else applySpeed(1.0);
      showToast(`⚡ Speed curve active: ${btn.textContent.trim()}`);
    });
  });

  // Range Sliders (Trim Start & End)
  function updateTrimDisplay() {
    let s = parseFloat(rngTrimStart ? rngTrimStart.value : 0) || 0;
    let e = parseFloat(rngTrimEnd ? rngTrimEnd.value : 30) || 30;
    if (s >= e - 1.5) {
      s = Math.max(0, e - 1.5);
      if (rngTrimStart) rngTrimStart.value = s;
    }
    editorState.trimStart = s;
    editorState.trimEnd = e;
    const clipDur = Math.max(1, e - s).toFixed(1);

    if (lblTrimStartVal) lblTrimStartVal.textContent = `${s.toFixed(1)}s`;
    if (lblTrimEndVal) lblTrimEndVal.textContent = `${e.toFixed(1)}s`;
    if (lblClipDuration) lblClipDuration.textContent = `${clipDur}s`;
    if (lblInspectorDuration) lblInspectorDuration.textContent = `${clipDur}s`;
    if (lblRangeDisplay) lblRangeDisplay.textContent = `${s.toFixed(1)}s – ${e.toFixed(1)}s (${clipDur}s)`;
  }

  if (rngTrimStart) {
    rngTrimStart.addEventListener('input', () => {
      updateTrimDisplay();
      if (videoPreview) videoPreview.currentTime = editorState.trimStart;
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
      let e = chip.dataset.end === 'max' ? (parseFloat(rngTrimEnd ? rngTrimEnd.max : 30) || 30) : parseFloat(chip.dataset.end);
      if (rngTrimStart) rngTrimStart.value = s;
      if (rngTrimEnd) rngTrimEnd.value = e;
      updateTrimDisplay();
      if (videoPreview) videoPreview.currentTime = s;
    });
  });

  // ✂️ Split Tool & Timeline Shortcuts
  const btnTimelineSplit = document.getElementById('btnTimelineSplit');
  const btnTimelineSplitTool = document.getElementById('btnTimelineSplitTool');
  function handleSplitAtPlayhead() {
    if (!videoPreview) return;
    const cur = videoPreview.currentTime;
    if (cur > editorState.trimStart && cur < editorState.trimEnd) {
      if (rngTrimEnd) rngTrimEnd.value = cur.toFixed(1);
      updateTrimDisplay();
      showToast(`✂️ Clip trimmed to playhead position (${cur.toFixed(1)}s)!`);
    } else {
      showToast('Position playhead between start & end to split.', true);
    }
  }
  if (btnTimelineSplit) btnTimelineSplit.addEventListener('click', handleSplitAtPlayhead);
  if (btnTimelineSplitTool) btnTimelineSplitTool.addEventListener('click', handleSplitAtPlayhead);

  const btnTimelineDelete = document.getElementById('btnTimelineDelete');
  if (btnTimelineDelete) {
    btnTimelineDelete.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const removeBtn = document.getElementById('btnCapCutRemoveVideo');
      if (removeBtn) {
        removeBtn.click();
      } else {
        if (rngTrimStart) rngTrimStart.value = 0;
        if (rngTrimEnd) rngTrimEnd.value = editorState.duration;
        updateTrimDisplay();
        showToast('↩️ Clip bounds restored to full length');
      }
    });
  }

  const btnTimelineSpeedRampQuick = document.getElementById('btnTimelineSpeedRampQuick');
  if (btnTimelineSpeedRampQuick) {
    btnTimelineSpeedRampQuick.addEventListener('click', () => {
      const speedTab = modal.querySelector('[data-tab="tabTimelineSpeed"]');
      if (speedTab) speedTab.click();
    });
  }

  // 🔄 Transform Controls: Rotate & Flip
  function applyTransform() {
    updateLivePreview();
  }

  const btnToolRotate90 = document.getElementById('btnToolRotate90');
  const btnInspectorRotate = document.getElementById('btnInspectorRotate');
  function handleRotate() {
    editorState.rotate = (editorState.rotate + 90) % 360;
    applyTransform();
    showToast(`🔄 Rotated to ${editorState.rotate}°`);
  }
  if (btnToolRotate90) btnToolRotate90.addEventListener('click', handleRotate);
  if (btnInspectorRotate) btnInspectorRotate.addEventListener('click', handleRotate);

  const btnToolFlipH = document.getElementById('btnToolFlipH');
  const btnInspectorFlipH = document.getElementById('btnInspectorFlipH');
  function handleFlipH() {
    editorState.flipH = !editorState.flipH;
    applyTransform();
    showToast(editorState.flipH ? '↔️ Horizontal flip ON' : '↔️ Horizontal flip OFF');
  }
  if (btnToolFlipH) btnToolFlipH.addEventListener('click', handleFlipH);
  if (btnInspectorFlipH) btnInspectorFlipH.addEventListener('click', handleFlipH);

  const btnToolFlipV = document.getElementById('btnToolFlipV');
  const btnInspectorFlipV = document.getElementById('btnInspectorFlipV');
  function handleFlipV() {
    editorState.flipV = !editorState.flipV;
    applyTransform();
    showToast(editorState.flipV ? '↕️ Vertical flip ON' : '↕️ Vertical flip OFF');
  }
  if (btnToolFlipV) btnToolFlipV.addEventListener('click', handleFlipV);
  if (btnInspectorFlipV) btnInspectorFlipV.addEventListener('click', handleFlipV);

  const btnInspectorResetTransform = document.getElementById('btnInspectorResetTransform');
  if (btnInspectorResetTransform) {
    btnInspectorResetTransform.addEventListener('click', () => {
      editorState.rotate = 0;
      editorState.flipH = false;
      editorState.flipV = false;
      applyTransform();
      showToast('↩️ Video transform reset to standard');
    });
  }

  const btnToolFreezeFrame = document.getElementById('btnToolFreezeFrame');
  if (btnToolFreezeFrame && videoPreview) {
    btnToolFreezeFrame.addEventListener('click', () => {
      videoPreview.pause();
      showToast('❄️ Freeze Frame preview active for 2s...');
      setTimeout(() => { videoPreview.play().catch(() => {}); }, 2000);
    });
  }

  const btnToolReverseVideo = document.getElementById('btnToolReverseVideo');
  if (btnToolReverseVideo) {
    btnToolReverseVideo.addEventListener('click', () => {
      showToast('⏪ Reverse motion will be rendered during HD Export!');
    });
  }

  // 🗑️ Cancel / Remove Video from CapCut Pro Studio (Does NOT open file upload!)
  const btnCapCutRemoveVideo = document.getElementById('btnCapCutRemoveVideo');
  if (btnCapCutRemoveVideo) {
    btnCapCutRemoveVideo.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (videoPreview) {
        videoPreview.pause();
        videoPreview.removeAttribute('src');
        videoPreview.load();
      }
      currentRenderedReel = null;
      selectedVideoFile = null;
      if (capcutVideoFileInput) capcutVideoFileInput.value = '';
      if (fileInput) fileInput.value = '';

      const vidClipLabel = document.getElementById('timelineVideoClipLabel');
      if (vidClipLabel) vidClipLabel.textContent = 'No Video Selected';

      if (selectedFileNameBadge) {
        selectedFileNameBadge.innerHTML = '';
        selectedFileNameBadge.classList.add('hidden');
      }
      const hintCard = document.getElementById('videoFileSelectedHint');
      if (hintCard) hintCard.classList.add('hidden');

      if (renderedVideoPlayer) {
        renderedVideoPlayer.pause();
        renderedVideoPlayer.removeAttribute('src');
        renderedVideoPlayer.load();
        renderedVideoPlayer.classList.add('hidden');
      }
      if (reelPlaceholder) reelPlaceholder.classList.remove('hidden');

      showToast('🗑️ Video canceled and removed. No upload opened.');
    });
  }

  // 📁 Upload / Change Video in CapCut Pro Editor
  const btnCapCutReplace = document.getElementById('btnCapCutReplaceVideo');
  const capcutVideoFileInput = document.getElementById('capcutVideoFileInput');
  if (btnCapCutReplace && capcutVideoFileInput) {
    btnCapCutReplace.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      capcutVideoFileInput.click();
    });

    capcutVideoFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && videoPreview) {
        const url = URL.createObjectURL(file);
        videoPreview.src = url;
        videoPreview.load();
        videoPreview.play().catch(() => {});
        currentRenderedReel = {
          fileName: file.name,
          reelUrl: url,
          videoUrl: url
        };
        const vidClipLabel = document.getElementById('timelineVideoClipLabel');
        if (vidClipLabel) vidClipLabel.textContent = file.name;
        showToast(`📂 Replaced active video with: ${file.name}`);
      }
    });
  }

  // ⚡ CapCut Speed Ramping Controls
  const speedChips = modal.querySelectorAll('.speed-chip-btn');
  function applySpeed(spd) {
    editorState.speed = Math.min(10.0, Math.max(0.1, parseFloat(spd) || 1.0));
    if (videoPreview) videoPreview.playbackRate = Math.min(4.0, Math.max(0.25, editorState.speed));

    if (rngVideoSpeed) rngVideoSpeed.value = editorState.speed;
    if (lblSpeedSliderVal) lblSpeedSliderVal.textContent = `${editorState.speed.toFixed(2)}x`;
    if (lblSpeedDisplay) {
      let tag = 'Custom';
      if (editorState.speed <= 0.3) tag = 'Super Slow';
      else if (editorState.speed <= 0.55) tag = 'Slow-Mo';
      else if (editorState.speed <= 0.8) tag = 'Chill';
      else if (Math.abs(editorState.speed - 1.0) < 0.05) tag = 'Normal';
      else if (editorState.speed <= 1.3) tag = 'Dynamic Hook';
      else if (editorState.speed <= 1.6) tag = 'Fast Paced';
      else if (editorState.speed <= 2.2) tag = 'Double';
      else if (editorState.speed <= 5.5) tag = 'Fast Reel';
      else tag = 'Hyperlapse';
      lblSpeedDisplay.textContent = `${editorState.speed.toFixed(2)}x (${tag})`;
    }
    if (lblInspectorSpeed) lblInspectorSpeed.textContent = `${editorState.speed.toFixed(2)}x`;

    speedChips.forEach(chip => {
      const cSpd = parseFloat(chip.dataset.speed);
      chip.classList.toggle('active', Math.abs(cSpd - editorState.speed) < 0.04);
    });
  }

  speedChips.forEach(chip => {
    chip.addEventListener('click', () => {
      applySpeed(chip.dataset.speed);
    });
  });

  if (rngVideoSpeed) {
    rngVideoSpeed.addEventListener('input', () => {
      applySpeed(rngVideoSpeed.value);
    });
  }

  // 🌈 Pro Color Adjustments (Live 60fps sliders)
  function bindAdjustSlider(slider, labelEl, key, unit = '') {
    if (!slider) return;
    slider.addEventListener('input', () => {
      const val = parseFloat(slider.value) || 0;
      editorState.adjust[key] = val;
      if (labelEl) labelEl.textContent = `${val > 0 && unit !== '%' ? '+' : ''}${val}${unit}`;
      updateLivePreview();
    });
  }
  bindAdjustSlider(rngAdjBrightness, lblAdjBrightness, 'brightness', '%');
  bindAdjustSlider(rngAdjContrast, lblAdjContrast, 'contrast', '%');
  bindAdjustSlider(rngAdjSaturation, lblAdjSaturation, 'saturation', '%');
  bindAdjustSlider(rngAdjExposure, lblAdjExposure, 'exposure', '');
  bindAdjustSlider(rngAdjTemp, lblAdjTemp, 'temp', '°');
  bindAdjustSlider(rngAdjSharp, lblAdjSharp, 'sharp', '%');

  // 🔄 Reset Color Sliders Button
  const btnResetAdjustments = document.getElementById('btnResetAdjustments');
  if (btnResetAdjustments) {
    btnResetAdjustments.addEventListener('click', () => {
      editorState.adjust = {
        brightness: 0,
        contrast: 100,
        saturation: 100,
        exposure: 0,
        temp: 0,
        sharp: 0
      };
      if (rngAdjBrightness) rngAdjBrightness.value = 0;
      if (lblAdjBrightness) lblAdjBrightness.textContent = '0%';
      if (rngAdjContrast) rngAdjContrast.value = 100;
      if (lblAdjContrast) lblAdjContrast.textContent = '100%';
      if (rngAdjSaturation) rngAdjSaturation.value = 100;
      if (lblAdjSaturation) lblAdjSaturation.textContent = '100%';
      if (rngAdjExposure) rngAdjExposure.value = 0;
      if (lblAdjExposure) lblAdjExposure.textContent = '0';
      if (rngAdjTemp) rngAdjTemp.value = 0;
      if (lblAdjTemp) lblAdjTemp.textContent = '0';
      if (rngAdjSharp) rngAdjSharp.value = 0;
      if (lblAdjSharp) lblAdjSharp.textContent = '0%';

      updateLivePreview();
      showToast('🔄 Color adjustment sliders reset to defaults!');
    });
  }

  // 🔊 Audio Mixer Controls
  if (rngOriginalVolume && videoPreview) {
    rngOriginalVolume.addEventListener('input', () => {
      const vol = parseFloat(rngOriginalVolume.value) || 0;
      editorState.origVolume = vol;
      videoPreview.volume = Math.min(1.0, vol);
      if (lblOrigVolDisplay) {
        lblOrigVolDisplay.textContent = `${Math.round(vol * 100)}%`;
      }
      if (chkMuteOrigAudio && vol > 0) {
        chkMuteOrigAudio.checked = false;
      }
    });
  }

  if (chkMuteOrigAudio && videoPreview) {
    chkMuteOrigAudio.addEventListener('change', () => {
      if (chkMuteOrigAudio.checked) {
        editorState.origVolume = 0;
        videoPreview.volume = 0;
        if (rngOriginalVolume) rngOriginalVolume.value = 0;
        if (lblOrigVolDisplay) lblOrigVolDisplay.textContent = 'Muted (0%)';
      } else {
        editorState.origVolume = 1.0;
        videoPreview.volume = 1.0;
        if (rngOriginalVolume) rngOriginalVolume.value = 1.0;
        if (lblOrigVolDisplay) lblOrigVolDisplay.textContent = '100%';
      }
    });
  }

  // 🎙️ Voice Changer Presets
  const voiceChips = modal.querySelectorAll('.btn-voice-preset');
  voiceChips.forEach(chip => {
    chip.addEventListener('click', () => {
      voiceChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editorState.voice = chip.dataset.voice || 'normal';
      showToast(`🎙️ Voice preset set to: ${chip.textContent.trim()}`);
    });
  });

  // 🎬 Transitions
  const transChips = modal.querySelectorAll('.btn-transition-chip');
  transChips.forEach(chip => {
    chip.addEventListener('click', () => {
      transChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const tr = chip.dataset.transition || 'none';
      editorState.transition = tr;
      showToast(`🎬 Transition: ${chip.textContent.trim()}`);

      // Live Visual Transition Preview on Monitor
      if (videoPreview) {
        if (tr === 'fade') {
          videoPreview.style.opacity = '0.1';
          setTimeout(() => { videoPreview.style.opacity = '1'; }, 350);
        } else if (tr === 'flash') {
          const fl = document.getElementById('timelineFlashOverlay');
          if (fl) {
            fl.style.opacity = '0.9';
            setTimeout(() => { fl.style.opacity = '0'; }, 350);
          }
        } else if (tr === 'zoom') {
          videoPreview.style.transform = `${videoPreview.style.transform || ''} scale(1.15)`;
          setTimeout(() => { updateLivePreview(); }, 350);
        } else if (tr === 'glitch') {
          const gl = document.getElementById('timelineGlitchOverlay');
          if (gl) {
            gl.classList.remove('hidden');
            setTimeout(() => { gl.classList.add('hidden'); }, 500);
          }
        } else if (tr === 'dissolve') {
          videoPreview.style.filter = `${videoPreview.style.filter || ''} blur(4px)`;
          setTimeout(() => { updateLivePreview(); }, 350);
        }
      }
    });
  });

  // 📐 Canvas Aspect Ratio
  const aspectBtns = modal.querySelectorAll('.pro-aspect-btn');
  aspectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      aspectBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const asp = btn.dataset.aspect || '9:16';
      editorState.aspect = asp;

      if (monitorFrame) {
        monitorFrame.className = 'pro-monitor-frame';
        if (asp === '16:9') monitorFrame.classList.add('aspect-landscape');
        else if (asp === '1:1') monitorFrame.classList.add('aspect-square');
        else if (asp === '4:5') monitorFrame.classList.add('aspect-portrait');
      }

      if (lblProAspectBadge) lblProAspectBadge.innerHTML = `<i class="fa-solid fa-mobile-screen"></i> ${asp}`;
      if (lblInspectorAspect) lblInspectorAspect.textContent = `${asp}`;
      showToast(`📐 Canvas set to ${asp}`);
    });
  });

  // 😀 Stickers Picker
  const stickerBtns = modal.querySelectorAll('.pro-sticker-btn');
  stickerBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      stickerBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const stk = btn.dataset.sticker || 'none';
      editorState.sticker = stk;

      if (stk === 'none') {
        if (stickerOverlay) stickerOverlay.classList.add('hidden');
        showToast('Sticker removed');
      } else {
        const emojiEl = btn.querySelector('.sticker-emoji');
        if (stickerIconContent && emojiEl) {
          stickerIconContent.textContent = emojiEl.textContent;
        }
        if (stickerOverlay) stickerOverlay.classList.remove('hidden');
        showToast(`Sticker added: ${btn.querySelector('.sticker-name')?.textContent || stk}`);
      }
    });
  });

  // Filters Selection
  const filterCards = modal.querySelectorAll('.timeline-filter-card');
  filterCards.forEach(card => {
    card.addEventListener('click', () => {
      filterCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      editorState.filter = card.dataset.filter || 'none';
      if (lblInspectorFilter) lblInspectorFilter.textContent = card.querySelector('b')?.textContent || editorState.filter.toUpperCase();
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
      editorState.customText = customSubInput.value ? customSubInput.value.trim() : '';
      if (subBadge) {
        subBadge.textContent = editorState.customText;
        subBadge.classList.toggle('hidden', !editorState.customText);
      }
      if (trackSubLabel) {
        trackSubLabel.textContent = editorState.customText ? `💬 ${editorState.customText}` : '💬 Text & Subtitles Layer';
      }
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

  if (chkFlash) {
    chkFlash.addEventListener('change', () => {
      editorState.flash = chkFlash.checked;
      if (editorState.flash && flashOverlay) {
        flashOverlay.style.opacity = '0.9';
        setTimeout(() => { flashOverlay.style.opacity = '0'; }, 320);
      }
    });
  }

  const chkFxGlitch = document.getElementById('chkFxGlitch');
  if (chkFxGlitch) {
    chkFxGlitch.addEventListener('change', () => {
      const gOverlay = document.getElementById('timelineGlitchOverlay');
      if (gOverlay) gOverlay.classList.toggle('hidden', !chkFxGlitch.checked);
      showToast(chkFxGlitch.checked ? '⚡ Glitch pulse effect enabled' : 'Glitch disabled');
    });
  }

  const chkFxVhs = document.getElementById('chkFxVhs');
  if (chkFxVhs) {
    chkFxVhs.addEventListener('change', () => {
      showToast(chkFxVhs.checked ? '📺 VHS scanlines active' : 'VHS disabled');
    });
  }

  const chkFxSparkle = document.getElementById('chkFxSparkle');
  if (chkFxSparkle) {
    chkFxSparkle.addEventListener('change', () => {
      showToast(chkFxSparkle.checked ? '✨ Luxury sparkle glow enabled' : 'Sparkle disabled');
    });
  }

  // 🤖 AI Studio Tools Buttons
  const btnAiFaceEnhance = document.getElementById('btnAiFaceEnhance');
  let isAiFaceActive = false;
  if (btnAiFaceEnhance) {
    btnAiFaceEnhance.addEventListener('click', () => {
      isAiFaceActive = !isAiFaceActive;
      btnAiFaceEnhance.classList.toggle('active', isAiFaceActive);
      const badge = document.getElementById('badgeAiFace');
      if (badge) badge.textContent = isAiFaceActive ? '✨ ACTIVE' : 'OFF';

      if (isAiFaceActive) {
        editorState.filter = 'beauty';
        editorState.adjust.brightness = Math.min(50, (editorState.adjust.brightness || 0) + 6);
        editorState.adjust.contrast = Math.min(200, (editorState.adjust.contrast || 100) + 8);
        editorState.adjust.saturation = Math.min(250, (editorState.adjust.saturation || 100) + 12);
        if (rngAdjBrightness) rngAdjBrightness.value = editorState.adjust.brightness;
        if (lblAdjBrightness) lblAdjBrightness.textContent = `${editorState.adjust.brightness}%`;
        if (rngAdjContrast) rngAdjContrast.value = editorState.adjust.contrast;
        if (lblAdjContrast) lblAdjContrast.textContent = `${editorState.adjust.contrast}%`;
        if (rngAdjSaturation) rngAdjSaturation.value = editorState.adjust.saturation;
        if (lblAdjSaturation) lblAdjSaturation.textContent = `${editorState.adjust.saturation}%`;
        updateLivePreview();
        showToast('👤 AI Face & Beauty Glow activated! Skin smoothed & illuminated.');
      } else {
        editorState.filter = 'none';
        updateLivePreview();
        showToast('👤 AI Face & Beauty Glow turned OFF.');
      }
    });
  }

  const btnAiUpscale4k = document.getElementById('btnAiUpscale4k');
  let isAiUpscaleActive = false;
  if (btnAiUpscale4k) {
    btnAiUpscale4k.addEventListener('click', () => {
      isAiUpscaleActive = !isAiUpscaleActive;
      btnAiUpscale4k.classList.toggle('active', isAiUpscaleActive);
      const badge = document.getElementById('badgeAiUpscale');
      if (badge) badge.textContent = isAiUpscaleActive ? '💎 4K ON' : 'OFF';

      if (isAiUpscaleActive) {
        editorState.res = '4k';
        editorState.adjust.sharp = 80;
        if (rngAdjSharp) rngAdjSharp.value = 80;
        if (lblAdjSharp) lblAdjSharp.textContent = '80%';
        const resBadge = document.getElementById('lblProResBadge');
        if (resBadge) resBadge.textContent = '2160 × 3840 (4K UHD)';
        updateLivePreview();
        showToast('💎 AI 4K Upscale & Sharpen activated! Live super-resolution crisp edge enhancement active.');
      } else {
        editorState.res = '1080p';
        editorState.adjust.sharp = 0;
        if (rngAdjSharp) rngAdjSharp.value = 0;
        if (lblAdjSharp) lblAdjSharp.textContent = '0%';
        const resBadge = document.getElementById('lblProResBadge');
        if (resBadge) resBadge.textContent = '1080 × 1920 (FHD)';
        updateLivePreview();
        showToast('💎 AI 4K Upscale turned OFF.');
      }
    });
  }

  const btnAiSilenceCut = document.getElementById('btnAiSilenceCut');
  let isAiSilenceActive = false;
  if (btnAiSilenceCut) {
    btnAiSilenceCut.addEventListener('click', () => {
      isAiSilenceActive = !isAiSilenceActive;
      btnAiSilenceCut.classList.toggle('active', isAiSilenceActive);
      const badge = document.getElementById('badgeAiSilence');
      if (badge) badge.textContent = isAiSilenceActive ? '✂️ TRIMMED' : 'OFF';

      if (isAiSilenceActive) {
        const dur = editorState.duration || 30;
        editorState.trimStart = Math.min(1.0, parseFloat((dur * 0.04).toFixed(1)));
        editorState.trimEnd = Math.max(editorState.trimStart + 3, parseFloat((dur - 1.0).toFixed(1)));
        if (rngTrimStart) rngTrimStart.value = editorState.trimStart;
        if (rngTrimEnd) rngTrimEnd.value = editorState.trimEnd;
        updateTrimDisplay();
        if (videoPreview) {
          videoPreview.currentTime = editorState.trimStart;
          videoPreview.play().catch(() => {});
        }
        showToast('✂️ AI Silence Remover applied! Dead pauses trimmed automatically for viral pacing.');
      } else {
        editorState.trimStart = 0;
        editorState.trimEnd = editorState.duration || 30;
        if (rngTrimStart) rngTrimStart.value = 0;
        if (rngTrimEnd) rngTrimEnd.value = editorState.trimEnd;
        updateTrimDisplay();
        if (videoPreview) {
          videoPreview.currentTime = 0;
          videoPreview.play().catch(() => {});
        }
        showToast('✂️ Silence trim reset to full clip duration.');
      }
    });
  }

  const btnAiAutoCaptionsGen = document.getElementById('btnAiAutoCaptionsGen');
  let isAiCaptionsActive = false;
  if (btnAiAutoCaptionsGen) {
    btnAiAutoCaptionsGen.addEventListener('click', () => {
      isAiCaptionsActive = !isAiCaptionsActive;
      btnAiAutoCaptionsGen.classList.toggle('active', isAiCaptionsActive);
      const badge = document.getElementById('badgeAiCaptions');
      if (badge) badge.textContent = isAiCaptionsActive ? '📝 SYNCED' : 'OFF';

      if (isAiCaptionsActive) {
        const viralPhrases = [
          '✨ Exclusive Royal Heritage',
          '🔥 Trending Luxury Masterpiece',
          '👑 Handcrafted Pure Elegance',
          '🌟 Unmatched Premium Style'
        ];
        const chosenCaption = viralPhrases[Math.floor(Math.random() * viralPhrases.length)];
        editorState.customText = chosenCaption;
        editorState.textSize = 'large';
        editorState.textColor = 'yellow';
        editorState.textPosition = 'bottom';

        const customSubInput = document.getElementById('txtTimelineCustomSub');
        if (customSubInput) customSubInput.value = chosenCaption;

        const trackSubLabel = document.getElementById('trackSubtitlesLabel');
        if (trackSubLabel) trackSubLabel.textContent = `💬 ${chosenCaption}`;

        updateLivePreview();
        showToast(`📝 AI Auto-Captions generated: "${chosenCaption}"!`);
      } else {
        editorState.customText = '';
        const customSubInput = document.getElementById('txtTimelineCustomSub');
        if (customSubInput) customSubInput.value = '';

        const trackSubLabel = document.getElementById('trackSubtitlesLabel');
        if (trackSubLabel) trackSubLabel.textContent = '💬 Text & Subtitles Layer';

        updateLivePreview();
        showToast('📝 AI Auto-Captions removed.');
      }
    });
  }

  // Export Resolution & FPS Chips
  modal.querySelectorAll('.btn-export-res').forEach(chip => {
    chip.addEventListener('click', () => {
      modal.querySelectorAll('.btn-export-res').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editorState.res = chip.dataset.res || '1080p';
      if (lblProResBadge) {
        lblProResBadge.textContent = editorState.res === '4k' ? '2160 × 3840' : (editorState.res === '720p' ? '720 × 1280' : '1080 × 1920');
      }
    });
  });

  modal.querySelectorAll('.btn-export-fps').forEach(chip => {
    chip.addEventListener('click', () => {
      modal.querySelectorAll('.btn-export-fps').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      editorState.fps = chip.dataset.fps || '30';
    });
  });

  if (btnExportFromPublishTab && btnApply) {
    btnExportFromPublishTab.addEventListener('click', () => {
      btnApply.click();
    });
  }

  // Live CSS Update Function (Instant 60fps real-time preview)
  function updateLivePreview() {
    if (!videoPreview) return;

    // 1. Color Grading & Adjustments (CSS Filters)
    const filterPresetMap = {
      none: '',
      vintage: 'sepia(0.42) contrast(1.08) brightness(1.02) saturate(0.92)',
      cinema: 'contrast(1.22) brightness(0.95) saturate(1.12) sepia(0.12)',
      hdr: 'contrast(1.32) saturate(1.38) brightness(1.04)',
      fashion: 'contrast(1.18) saturate(1.25) brightness(1.06) hue-rotate(352deg)',
      cool: 'hue-rotate(185deg) contrast(1.12) saturate(1.15) brightness(1.02)',
      beauty: 'brightness(1.08) contrast(1.05) saturate(1.15)',
      food: 'contrast(1.18) saturate(1.35) sepia(0.15) brightness(1.04)',
      neon: 'contrast(1.32) saturate(1.65) hue-rotate(280deg) brightness(1.06)',
      noir: 'grayscale(1) contrast(1.35) brightness(1.02)',
      'warm-gold': 'sepia(0.25) contrast(1.15) brightness(1.04) saturate(1.25)',
      vibrant: 'contrast(1.25) saturate(1.45) brightness(1.04)',
      'teal-orange': 'contrast(1.2) saturate(1.2) hue-rotate(185deg)'
    };

    // Calculate Brightness & Exposure combined
    const adjB = (editorState.adjust.brightness || 0) / 100;
    const adjExp = (editorState.adjust.exposure || 0) / 35;
    const finalBrightness = Math.max(0.05, (1 + adjB) * (1 + adjExp));

    // Contrast with Sharpness boost
    const baseC = (editorState.adjust.contrast || 100) / 100;
    const sharpFactor = (editorState.adjust.sharp || 0);
    const finalContrast = Math.max(0.1, baseC * (1 + sharpFactor * 0.003));

    // Saturation with Sharpness/Vibrance boost
    const baseS = (editorState.adjust.saturation || 100) / 100;
    const finalSaturation = Math.max(0, baseS * (1 + sharpFactor * 0.002));

    // Temperature (Warm / Cool)
    const tempDeg = editorState.adjust.temp || 0;
    let tempFilter = '';
    if (tempDeg > 0) {
      tempFilter = `hue-rotate(${(tempDeg * 0.3).toFixed(1)}deg) sepia(${(tempDeg * 0.006).toFixed(2)})`;
    } else if (tempDeg < 0) {
      tempFilter = `hue-rotate(${(tempDeg * 0.8).toFixed(1)}deg)`;
    }

    // Sharpness subtle edge clarity
    let sharpFilter = '';
    if (sharpFactor > 0) {
      sharpFilter = `drop-shadow(0 0 ${(sharpFactor * 0.015).toFixed(2)}px rgba(0,0,0,${(sharpFactor * 0.008).toFixed(2)}))`;
    }

    const presetFilterStr = (editorState.filter && editorState.filter !== 'none') ? (filterPresetMap[editorState.filter] || '') : '';

    const filterComponents = [];
    if (presetFilterStr) filterComponents.push(presetFilterStr);
    filterComponents.push(`brightness(${finalBrightness.toFixed(3)})`);
    filterComponents.push(`contrast(${finalContrast.toFixed(3)})`);
    filterComponents.push(`saturate(${finalSaturation.toFixed(3)})`);
    if (tempFilter) filterComponents.push(tempFilter);
    if (sharpFilter) filterComponents.push(sharpFilter);

    const fullFilterStyle = filterComponents.join(' ');
    videoPreview.style.setProperty('filter', fullFilterStyle, 'important');

    // 2. Transform: Rotate, Flip, Zoom
    const scaleX = editorState.flipH ? -1 : 1;
    const scaleY = editorState.flipV ? -1 : 1;
    const zoomScale = editorState.zoom ? 1.12 : 1.0;
    videoPreview.style.transform = `rotate(${editorState.rotate}deg) scale(${scaleX * zoomScale}, ${scaleY * zoomScale})`;

    // 3. Preset Filter Class
    videoPreview.className = 'pro-video-screen';
    if (editorState.filter && editorState.filter !== 'none') {
      videoPreview.classList.add(`v-filter-${editorState.filter}`);
    }

    // 4. Playback speed
    videoPreview.playbackRate = Math.min(4.0, Math.max(0.25, editorState.speed || 1.0));

    // 5. Vignette & Glitch
    if (vignetteOverlay) {
      if (editorState.vignette) vignetteOverlay.classList.remove('hidden');
      else vignetteOverlay.classList.add('hidden');
    }

    // 6. Subtitle styling
    if (subBadge) {
      if (!editorState.customText) {
        subBadge.classList.add('hidden');
        subBadge.textContent = '';
      } else {
        subBadge.classList.remove('hidden');
        subBadge.textContent = editorState.customText;

        const sizePxMap = { small: '1.05rem', medium: '1.25rem', large: '1.45rem', huge: '1.8rem' };
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
      }
    }
  }

  // ✨ 1-Click AI Auto-Enhance Button
  function handleAiAuto() {
    editorState.filter = 'warm-gold';
    editorState.speed = 1.25;
    editorState.adjust = { brightness: 5, contrast: 115, saturation: 125, exposure: 2, temp: 4, sharp: 25 };
    editorState.textSize = 'large';
    editorState.textPosition = 'bottom';
    editorState.textColor = 'yellow';
    editorState.zoom = true;
    editorState.vignette = true;
    editorState.flash = true;

    if (chkZoom) chkZoom.checked = true;
    if (chkVignette) chkVignette.checked = true;
    if (chkFlash) chkFlash.checked = true;

    if (rngAdjBrightness) rngAdjBrightness.value = 5;
    if (rngAdjContrast) rngAdjContrast.value = 115;
    if (rngAdjSaturation) rngAdjSaturation.value = 125;
    if (rngAdjExposure) rngAdjExposure.value = 2;
    if (rngAdjTemp) rngAdjTemp.value = 4;
    if (rngAdjSharp) rngAdjSharp.value = 25;
    if (lblAdjBrightness) lblAdjBrightness.textContent = '+5%';
    if (lblAdjContrast) lblAdjContrast.textContent = '115%';
    if (lblAdjSaturation) lblAdjSaturation.textContent = '125%';
    if (lblAdjExposure) lblAdjExposure.textContent = '+2';
    if (lblAdjTemp) lblAdjTemp.textContent = '+4°';
    if (lblAdjSharp) lblAdjSharp.textContent = '25%';

    applySpeed(1.25);

    filterCards.forEach(c => c.classList.toggle('active', c.dataset.filter === 'warm-gold'));
    if (lblInspectorFilter) lblInspectorFilter.textContent = 'WARM GOLD';
    textSizeChips.forEach(c => c.classList.toggle('active', c.dataset.size === 'large'));
    textPosChips.forEach(c => c.classList.toggle('active', c.dataset.pos === 'bottom'));
    textColorChips.forEach(c => c.classList.toggle('active', c.dataset.col === 'yellow'));

    updateLivePreview();
    showToast('✨ AI Smart Auto-Enhance applied (1.25x Dynamic Speed + Warm Gold + Flash)!');
  }

  if (btnAiAuto) btnAiAuto.addEventListener('click', handleAiAuto);
  if (btnInspectorAiQuick) btnInspectorAiQuick.addEventListener('click', handleAiAuto);

  // Reset to original
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      editorState = {
        trimStart: 0,
        trimEnd: Math.min(30, parseFloat(rngTrimEnd ? rngTrimEnd.max : 30) || 30),
        duration: 30,
        speed: 1.0,
        origVolume: 1.0,
        filter: 'none',
        rotate: 0,
        flipH: false,
        flipV: false,
        adjust: { brightness: 0, contrast: 100, saturation: 100, exposure: 0, temp: 0, sharp: 0 },
        voice: 'normal',
        transition: 'none',
        sticker: 'none',
        aspect: '9:16',
        res: '1080p',
        fps: '30',
        textSize: 'large',
        textPosition: 'bottom',
        textColor: 'yellow',
        customText: '',
        zoom: false,
        vignette: false,
        flash: false
      };
      if (rngTrimStart) rngTrimStart.value = 0;
      if (rngTrimEnd) rngTrimEnd.value = editorState.trimEnd;
      if (chkZoom) chkZoom.checked = false;
      if (chkVignette) chkVignette.checked = false;
      if (chkFlash) chkFlash.checked = false;
      if (chkMuteOrigAudio) chkMuteOrigAudio.checked = false;
      if (rngOriginalVolume) rngOriginalVolume.value = 1.0;
      if (lblOrigVolDisplay) lblOrigVolDisplay.textContent = '100%';

      if (customSubInput) customSubInput.value = '';
      if (subBadge) {
        subBadge.textContent = '';
        subBadge.classList.add('hidden');
      }
      if (trackSubLabel) trackSubLabel.textContent = '💬 Text & Subtitles Layer';

      if (rngAdjBrightness) rngAdjBrightness.value = 0;
      if (rngAdjContrast) rngAdjContrast.value = 100;
      if (rngAdjSaturation) rngAdjSaturation.value = 100;
      if (rngAdjExposure) rngAdjExposure.value = 0;
      if (rngAdjTemp) rngAdjTemp.value = 0;
      if (rngAdjSharp) rngAdjSharp.value = 0;
      if (lblAdjBrightness) lblAdjBrightness.textContent = '0%';
      if (lblAdjContrast) lblAdjContrast.textContent = '100%';
      if (lblAdjSaturation) lblAdjSaturation.textContent = '100%';
      if (lblAdjExposure) lblAdjExposure.textContent = '0';
      if (lblAdjTemp) lblAdjTemp.textContent = '0';
      if (lblAdjSharp) lblAdjSharp.textContent = '0%';

      applySpeed(1.0);

      filterCards.forEach(c => c.classList.toggle('active', c.dataset.filter === 'none'));
      if (lblInspectorFilter) lblInspectorFilter.textContent = 'ORIGINAL';
      textSizeChips.forEach(c => c.classList.toggle('active', c.dataset.size === 'large'));
      textPosChips.forEach(c => c.classList.toggle('active', c.dataset.pos === 'bottom'));
      textColorChips.forEach(c => c.classList.toggle('active', c.dataset.col === 'yellow'));
      if (stickerOverlay) stickerOverlay.classList.add('hidden');

      updateTrimDisplay();
      updateLivePreview();
      showToast('↩️ Settings reset to original AI output');
    });
  }

  // ⚡ Apply & Re-Render Reel (HD via FFmpeg)
  if (btnApply) {
    btnApply.addEventListener('click', async () => {
      const fileToRender = (currentRenderedReel && currentRenderedReel.fileName)
        || (selectedVideoFile && selectedVideoFile.name)
        || 'reel-demo.mp4';

      if (!currentRenderedReel) {
        currentRenderedReel = {
          fileName: fileToRender,
          reelUrl: `/rendered-reels/${fileToRender}`,
          videoUrl: `/rendered-reels/${fileToRender}`
        };
      }

      const activeEffects = [];
      if (editorState.zoom) activeEffects.push('zoom');
      if (editorState.vignette) activeEffects.push('vignette');
      if (editorState.flash) activeEffects.push('flash');
      if (editorState.transition && editorState.transition !== 'none') {
        activeEffects.push(editorState.transition);
      }

      btnApply.disabled = true;
      btnApply.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>🎬 Re-Rendering HD Reel...</span>';
      showToast('⚡ CapCut Pro Workstation is rendering your custom cuts, speed, color & effects...');

      try {
        const res = await fetch('/api/video/edit-timeline', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName: currentRenderedReel.fileName || fileToRender,
            trimStart: editorState.trimStart,
            trimEnd: editorState.trimEnd,
            speed: editorState.speed,
            origVolume: editorState.origVolume,
            filter: editorState.filter,
            rotate: editorState.rotate,
            flipH: editorState.flipH,
            flipV: editorState.flipV,
            adjust: editorState.adjust,
            voice: editorState.voice,
            transition: editorState.transition,
            resolution: editorState.res,
            fps: editorState.fps,
            aspect: editorState.aspect,
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
        showToast('🎉 CapCut Pro custom edited HD reel ready successfully!');
      } catch (err) {
        console.error('Apply timeline error:', err);
        showToast(`Error: ${err.message}`, true);
      } finally {
        btnApply.disabled = false;
        btnApply.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i> <span>Export HD Reel</span>';
        const pubExportBtn = document.getElementById('btnExportFromPublishTab');
        if (pubExportBtn) {
          pubExportBtn.disabled = false;
          pubExportBtn.innerHTML = '<i class="fa-solid fa-arrow-up-from-bracket"></i> <span>Render & Download HD Reel</span>';
        }
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
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Verifying...</span>';

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Login failed.');
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
        btn.innerHTML = '<span>🚀 Log In</span>';
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
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Creating account...</span>';

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, phone, password })
        });
        const data = await res.json();

        if (!data.success) {
          throw new Error(data.error || 'Registration failed.');
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
        btn.innerHTML = '<span>✨ Create Account & Get 5 Free Reels</span>';
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
        profileCreditsCount.textContent = currentUser.plan === 'pro' ? 'Unlimited ⭐' : `${currentUser.credits} Left`;
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
        profileInstaStatus.textContent = `🟢 Connected (${insta.pageName || 'Page'})`;
        profileInstaStatus.style.color = '#15803d';
      }
      if (btnConnectInstagramQuick) {
        btnConnectInstagramQuick.textContent = '✓ Connected';
        btnConnectInstagramQuick.style.background = '#16a34a';
      }
    } else {
      if (profileInstaHandle) profileInstaHandle.textContent = 'Instagram Reels';
      if (profileInstaStatus) {
        profileInstaStatus.textContent = 'Click to Connect';
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
        profileYtStatus.textContent = '🟢 Connected (Active)';
        profileYtStatus.style.color = '#15803d';
      }
      if (btnConnectYouTubeQuick) {
        btnConnectYouTubeQuick.textContent = '✓ Connected';
        btnConnectYouTubeQuick.style.background = '#16a34a';
      }
    } else {
      if (profileYtHandle) profileYtHandle.textContent = 'YouTube Shorts';
      if (profileYtStatus) {
        profileYtStatus.textContent = 'Click to Connect';
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
      if (!token) return showToast('Please log in first.', true);

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
        showToast(`Instagram error: ${err.message}`, true);
      } finally {
        btnConnectInstagramQuick.disabled = false;
      }
    });
  }

  if (btnConnectYouTubeQuick) {
    btnConnectYouTubeQuick.addEventListener('click', async () => {
      const token = localStorage.getItem('forgeai_token');
      if (!token) return showToast('Please log in first.', true);

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
        showToast(`YouTube error: ${err.message}`, true);
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
      showToast('Logged out successfully.');
    });
  }

  // Upgrade Pro Button click
  if (btnUpgradeProInModal) {
    btnUpgradeProInModal.addEventListener('click', () => {
      showToast('⚡ Pro Plan subscription upgrade is coming soon!');
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
  const col1 = document.getElementById('studioPromptPanel');
  const col2 = document.getElementById('stepSectionOutput');
  const col3 = document.getElementById('studioPublishPanel');

  function isMobileView() {
    return window.innerWidth <= 860;
  }

  window.setReelStep = function(stepNum) {
    if (!isMobileView()) {
      if (col1) col1.style.display = '';
      if (col2) col2.style.display = '';
      if (col3) col3.style.display = '';
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
      if (col1) col1.style.display = 'flex';
      if (col2) col2.style.display = 'none';
      if (col3) col3.style.display = 'none';
    } else if (stepNum === 2) {
      if (col1) col1.style.display = 'none';
      if (col2) col2.style.display = 'flex';
      if (col3) col3.style.display = 'none';
    } else if (stepNum === 3) {
      if (col1) col1.style.display = 'none';
      if (col2) col2.style.display = 'none';
      if (col3) col3.style.display = 'flex';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  stepTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const step = parseInt(tab.getAttribute('data-step'), 10);
      window.setReelStep(step);
    });
  });

  const btnMobileToPreview = document.getElementById('btnMobileToPreview');
  const btnMobileBackToStudio = document.getElementById('btnMobileBackToStudio');
  const btnMobileToPublish = document.getElementById('btnMobileToPublish');
  const btnMobileBackToPreview = document.getElementById('btnMobileBackToPreview');

  if (btnMobileToPreview) {
    btnMobileToPreview.addEventListener('click', () => window.setReelStep(2));
  }
  if (btnMobileBackToStudio) {
    btnMobileBackToStudio.addEventListener('click', () => window.setReelStep(1));
  }
  if (btnMobileToPublish) {
    btnMobileToPublish.addEventListener('click', () => window.setReelStep(3));
  }
  if (btnMobileBackToPreview) {
    btnMobileBackToPreview.addEventListener('click', () => window.setReelStep(2));
  }

  function updateStepVisibility() {
    if (isMobileView()) {
      const activeTab = document.querySelector('.stepper-tab.active');
      const activeNum = activeTab ? parseInt(activeTab.getAttribute('data-step'), 10) : 1;
      window.setReelStep(activeNum);
    } else {
      if (col1) col1.style.display = '';
      if (col2) col2.style.display = '';
      if (col3) col3.style.display = '';
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



