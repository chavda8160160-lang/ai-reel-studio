// Global State
let currentProject = null;
let activeBackendFileIndex = 0;
let activeFrontendFileIndex = 0;

// DOM Elements
const promptInput = document.getElementById('promptInput');
const dbEngineSelect = document.getElementById('dbEngine');
const backendSelect = document.getElementById('backendFramework');
const frontendSelect = document.getElementById('frontendFramework');
const btnGenerate = document.getElementById('btnGenerate');
const generationLoader = document.getElementById('generationLoader');
const loaderStatus = document.getElementById('loaderStatus');

const projectTitleDisplay = document.getElementById('projectTitleDisplay');
const projectDescDisplay = document.getElementById('projectDescDisplay');
const projectActionButtons = document.getElementById('projectActionButtons');
const btnSaveToDisk = document.getElementById('btnSaveToDisk');
const btnDownloadZip = document.getElementById('btnDownloadZip');

// Preview & Code Elements
const previewIframe = document.getElementById('previewIframe');
const dbCodeArea = document.getElementById('dbCodeArea');
const dbFileName = document.getElementById('dbFileName');
const backendFileList = document.getElementById('backendFileList');
const backendCodeArea = document.getElementById('backendCodeArea');
const backendCurrentFileName = document.getElementById('backendCurrentFileName');
const frontendFileList = document.getElementById('frontendFileList');
const frontendCodeArea = document.getElementById('frontendCodeArea');
const frontendCurrentFileName = document.getElementById('frontendCurrentFileName');
const guideContent = document.getElementById('guideContent');

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
  initTabs();
  initCopyButtons();
  initChips();
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

// Generate Full-Stack App
if (btnGenerate) {
  btnGenerate.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showToast('Please enter your project requirements.', true);
    promptInput.focus();
    return;
  }

  const apiKey = getSavedApiKey();
  // Server will automatically use GEMINI_API_KEY from .env if frontend apiKey is empty.

  // Set Loading UI
  btnGenerate.disabled = true;
  generationLoader.classList.remove('hidden');
  loaderStatus.textContent = 'AI Architect is generating the full-stack project... (may take ~30s)';

  try {
    const payload = {
      prompt,
      apiKey,
      techStack: {
        dbEngine: dbEngineSelect.value,
        backendFramework: backendSelect.value,
        frontendFramework: frontendSelect.value
      }
    };

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to generate project.');
    }

    currentProject = data.project;
    renderProject(currentProject);
    showToast('🎉 Your Full-Stack project has been generated successfully!');

  } catch (err) {
    console.error(err);
    showToast(`Error: ${err.message}`, true);
  } finally {
    btnGenerate.disabled = false;
    generationLoader.classList.add('hidden');
  }
  });
}

// Render Generated Project to UI
function renderProject(project) {
  projectTitleDisplay.textContent = project.projectTitle || project.projectName;
  projectDescDisplay.textContent = `${project.description || ''} • Tech: ${project.techStack?.database} + ${project.techStack?.backend} + ${project.techStack?.frontend}`;
  projectActionButtons.classList.remove('hidden');

  // 1. Live Preview
  if (project.frontend?.previewHtml) {
    previewIframe.srcdoc = project.frontend.previewHtml;
  } else {
    previewIframe.srcdoc = '<body style="font-family:sans-serif;padding:2rem;"><h3>Preview not available</h3></body>';
  }

  // 2. Database
  dbFileName.innerHTML = `<i class="fa-solid fa-file-code"></i> ${project.database?.fileName || 'schema.sql'}`;
  dbCodeArea.textContent = project.database?.script || '-- No SQL generated';

  // 3. Backend Files
  renderBackendFiles(project.backend?.files || []);

  // 4. Frontend Files
  renderFrontendFiles(project.frontend?.files || []);

  // 5. Run Guide
  renderGuide(project);

  // Switch to preview tab by default
  const previewTabBtn = document.querySelector('.tab-btn[data-tab="preview"]');
  if (previewTabBtn) previewTabBtn.click();
}

function renderBackendFiles(files) {
  backendFileList.innerHTML = '<span class="file-list-heading">Backend Files</span>';
  if (files.length === 0) {
    backendFileList.innerHTML += '<div class="file-item">No files</div>';
    backendCodeArea.textContent = '// No backend files';
    return;
  }

  files.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = `file-item ${idx === 0 ? 'active' : ''}`;
    item.innerHTML = `<i class="fa-regular fa-file"></i> ${file.path}`;
    item.addEventListener('click', () => {
      document.querySelectorAll('#backendFileList .file-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      activeBackendFileIndex = idx;
      backendCurrentFileName.innerHTML = `<i class="fa-solid fa-file-code"></i> ${file.path}`;
      backendCodeArea.textContent = file.content;
    });
    backendFileList.appendChild(item);
  });

  // Select first
  activeBackendFileIndex = 0;
  backendCurrentFileName.innerHTML = `<i class="fa-solid fa-file-code"></i> ${files[0].path}`;
  backendCodeArea.textContent = files[0].content;
}

function renderFrontendFiles(files) {
  frontendFileList.innerHTML = '<span class="file-list-heading">Frontend Files</span>';
  if (files.length === 0) {
    frontendFileList.innerHTML += '<div class="file-item">No files</div>';
    frontendCodeArea.textContent = '// No frontend files';
    return;
  }

  files.forEach((file, idx) => {
    const item = document.createElement('div');
    item.className = `file-item ${idx === 0 ? 'active' : ''}`;
    item.innerHTML = `<i class="fa-regular fa-file"></i> ${file.path}`;
    item.addEventListener('click', () => {
      document.querySelectorAll('#frontendFileList .file-item').forEach(el => el.classList.remove('active'));
      item.classList.add('active');
      activeFrontendFileIndex = idx;
      frontendCurrentFileName.innerHTML = `<i class="fa-solid fa-file-code"></i> ${file.path}`;
      frontendCodeArea.textContent = file.content;
    });
    frontendFileList.appendChild(item);
  });

  // Select first
  activeFrontendFileIndex = 0;
  frontendCurrentFileName.innerHTML = `<i class="fa-solid fa-file-code"></i> ${files[0].path}`;
  frontendCodeArea.textContent = files[0].content;
}

function renderGuide(project) {
  let guideHtml = `<h3>🚀 How to Run ${project.projectTitle || project.projectName}?</h3>`;
  guideHtml += `<p><strong>Description:</strong> ${project.description || ''}</p><br/>`;
  guideHtml += `<h4>1. Database Setup (${project.techStack?.database || 'SQL'}):</h4>`;
  guideHtml += `<pre>${project.database?.notes || 'Execute schema.sql to create database and tables.'}</pre>`;
  
  guideHtml += `<h4>2. Backend Setup (${project.techStack?.backend || 'Backend'}):</h4>`;
  guideHtml += `<pre>${project.backend?.setupInstructions || 'Run backend with dotnet run or npm start.'}</pre>`;

  guideHtml += `<h4>3. Complete Step-by-Step Guide:</h4>`;
  guideHtml += `<pre>${project.runGuide || 'See README.md for details.'}</pre>`;

  guideContent.innerHTML = guideHtml;
}

// Save Project directly to PC Disk
if (btnSaveToDisk) {
  btnSaveToDisk.addEventListener('click', async () => {
    if (!currentProject) return;
    btnSaveToDisk.disabled = true;
    btnSaveToDisk.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to PC...';

    try {
      const res = await fetch('/api/save-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save project.');
      }
      showToast(`✅ Project saved to PC:\n${data.savedPath}`);
      alert(`Project has been saved to your PC at:\n\n${data.savedPath}`);
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnSaveToDisk.disabled = false;
      btnSaveToDisk.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Save to PC';
    }
  });
}

// Download ZIP
if (btnDownloadZip) {
  btnDownloadZip.addEventListener('click', async () => {
    if (!currentProject) return;
    btnDownloadZip.disabled = true;
    btnDownloadZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating ZIP...';

    try {
      const res = await fetch('/api/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project: currentProject })
      });
      if (!res.ok) throw new Error('Failed to download ZIP file.');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject.projectName || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast('📦 ZIP file downloaded successfully!');
    } catch (err) {
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnDownloadZip.disabled = false;
      btnDownloadZip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> Download ZIP';
    }
  });
}

// ==========================================
// 🎬 MODE SWITCHER & VIDEO STUDIO IMPLEMENTATION
// ==========================================

function initModeSwitcher() {
  const navTabs = document.querySelectorAll('.mode-tab');
  const allViews = [
    document.getElementById('appBuilderView'),
    document.getElementById('videoStudioView'),
    document.getElementById('schedulerView'),
    document.getElementById('analyticsView')
  ];

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

  // Feature #3: Background Music (BGM) UI & Preview Controls
  const videoBgmSelect = document.getElementById('videoBgmSelect');
  const btnPreviewBgm = document.getElementById('btnPreviewBgm');
  const bgmVolumeRow = document.getElementById('bgmVolumeRow');
  const bgmVolumeSlider = document.getElementById('bgmVolumeSlider');
  const bgmVolumeLabel = document.getElementById('bgmVolumeLabel');
  let currentBgmAudio = null;

  if (videoBgmSelect) {
    videoBgmSelect.addEventListener('change', () => {
      if (currentBgmAudio) {
        currentBgmAudio.pause();
        currentBgmAudio = null;
        if (btnPreviewBgm) btnPreviewBgm.innerHTML = '<i class="fa-solid fa-play"></i>';
      }
      if (videoBgmSelect.value !== 'none') {
        if (bgmVolumeRow) bgmVolumeRow.style.display = 'flex';
      } else {
        if (bgmVolumeRow) bgmVolumeRow.style.display = 'none';
      }
    });
  }

  if (bgmVolumeSlider && bgmVolumeLabel) {
    bgmVolumeSlider.addEventListener('input', (e) => {
      bgmVolumeLabel.textContent = `${Math.round(e.target.value * 100)}%`;
      if (currentBgmAudio) {
        currentBgmAudio.volume = parseFloat(e.target.value);
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

  // Process Video with AI Auto-Editing & Effects
  btnProcessVideo.addEventListener('click', async () => {
    if (!selectedVideoFile) {
      showToast('Please upload a video file first.', true);
      fileInput.click();
      return;
    }

    btnProcessVideo.disabled = true;
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

    // Feature #3: Append BGM Settings
    if (videoBgmSelect) {
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

      fetchScheduledQueue();

    } catch (err) {
      console.error(err);
      showToast(`Error: ${err.message}`, true);
    } finally {
      btnProcessVideo.disabled = false;
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

function initAnalyticsView() {
  const btnRefresh = document.getElementById('btnRefreshAnalytics');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      fetchAnalyticsOverview(true);
    });
  }

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
    if (usernameBadge) usernameBadge.textContent = '@' + (data.instagram?.username || 'moving.151120');
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

    // 4. Render Reels Performance Grid
    renderAnalyticsReelsGrid(data.reels || []);

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

function renderAnalyticsReelsGrid(reels) {
  const container = document.getElementById('analyticsReelsGrid');
  if (!container) return;

  if (!reels || reels.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 3rem 1rem; color: #94a3b8; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px;">
        <i class="fa-solid fa-clapperboard" style="font-size: 2.2rem; color: #cbd5e1; margin-bottom: 0.75rem;"></i>
        <h4 style="color: #475569; margin: 0 0 0.35rem 0;">હજી સુધી કોઈ રીલ્સ પબ્લિશ થઈ નથી</h4>
        <p style="font-size: 0.85rem; margin: 0;">Reel Studio અથવા Daily Auto-Pilot માંથી તમારી પ્રથમ રીલ પબ્લિશ કરો!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = reels.map(r => {
    const formattedDate = r.publishedAt 
      ? new Date(r.publishedAt).toLocaleDateString('gu-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
      : 'હમણાં જ';

    const hasIg = !!(r.instagram?.url);
    const hasYt = !!(r.youtube?.url);

    const likesCount = r.instagram?.likes || 0;
    const commentsCount = r.instagram?.comments || 0;

    const thumbHtml = r.thumbnailUrl
      ? `<img src="${r.thumbnailUrl}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;">`
      : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1e1b4b, #312e81); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #a5b4fc; gap: 0.4rem;">
          <i class="fa-solid fa-film" style="font-size: 1.8rem;"></i>
          <span style="font-size: 0.7rem; font-weight: 700; letter-spacing: 0.05em;">9:16 REEL</span>
         </div>`;

    return `
      <div class="glass-card" style="border-radius: 14px; overflow: hidden; display: flex; flex-direction: column; border: 1px solid #e2e8f0; background: #ffffff; transition: transform 0.2s ease, box-shadow 0.2s ease;">
        <!-- Card Header: Visual Preview & Badges -->
        <div style="position: relative; width: 100%; height: 160px; background: #0f172a; overflow: hidden;">
          ${thumbHtml}
          <div style="position: absolute; top: 8px; left: 8px; display: flex; gap: 0.4rem; flex-wrap: wrap;">
            ${hasIg ? '<span style="background: rgba(236,72,153,0.9); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; backdrop-filter: blur(4px);"><i class="fa-brands fa-instagram"></i> Reel</span>' : ''}
            ${hasYt ? '<span style="background: rgba(239,68,68,0.9); color: #fff; font-size: 0.68rem; font-weight: 700; padding: 0.15rem 0.5rem; border-radius: 9999px; backdrop-filter: blur(4px);"><i class="fa-brands fa-youtube"></i> Shorts</span>' : ''}
          </div>
          <span style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.7); color: #fff; font-size: 0.68rem; font-weight: 600; padding: 0.15rem 0.45rem; border-radius: 4px;">
            ${r.niche ? r.niche.substring(0, 22) : 'Viral Reel'}
          </span>
        </div>

        <!-- Card Body -->
        <div style="padding: 1rem; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h4 style="margin: 0 0 0.35rem 0; font-size: 0.92rem; font-weight: 700; color: #0f172a; line-height: 1.35; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
              ${escapeHtml(r.title || 'Untitled Reel')}
            </h4>
            <div style="font-size: 0.74rem; color: #94a3b8; display: flex; align-items: center; gap: 0.35rem;">
              <i class="fa-regular fa-clock"></i>
              <span>${formattedDate}</span>
            </div>
          </div>

          <!-- Metrics Row -->
          <div style="margin-top: 0.85rem; padding-top: 0.75rem; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; gap: 0.85rem; align-items: center;">
              <span style="font-size: 0.82rem; font-weight: 700; color: #ec4899; display: flex; align-items: center; gap: 0.25rem;" title="Likes">
                <i class="fa-solid fa-heart"></i> ${likesCount}
              </span>
              <span style="font-size: 0.82rem; font-weight: 700; color: #6366f1; display: flex; align-items: center; gap: 0.25rem;" title="Comments">
                <i class="fa-solid fa-comment"></i> ${commentsCount}
              </span>
            </div>
            
            <!-- External Links -->
            <div style="display: flex; gap: 0.4rem;">
              ${hasIg ? `
                <a href="${r.instagram.url}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding: 0.3rem 0.6rem; font-size: 0.74rem; color: #ec4899; border: 1px solid rgba(236,72,153,0.3); border-radius: 6px; text-decoration: none;" title="Open in Instagram">
                  <i class="fa-brands fa-instagram"></i> IG ↗
                </a>
              ` : ''}
              ${hasYt ? `
                <a href="${r.youtube.url}" target="_blank" rel="noopener noreferrer" class="btn btn-ghost" style="padding: 0.3rem 0.6rem; font-size: 0.74rem; color: #ef4444; border: 1px solid rgba(239,68,68,0.3); border-radius: 6px; text-decoration: none;" title="Open in YouTube">
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

