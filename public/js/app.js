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

// API Key Management
function getSavedApiKey() {
  return localStorage.getItem('GEMINI_API_KEY') || '';
}

async function loadApiKeyStatus() {
  const localKey = getSavedApiKey();
  const metaIgUserIdInput = document.getElementById('metaIgUserIdInput');
  const metaIgTokenInput = document.getElementById('metaIgTokenInput');
  const youtubeTokenInput = document.getElementById('youtubeTokenInput');

  if (metaIgUserIdInput) metaIgUserIdInput.value = localStorage.getItem('META_IG_USER_ID') || '';
  if (metaIgTokenInput) metaIgTokenInput.value = localStorage.getItem('META_IG_TOKEN') || '';
  if (youtubeTokenInput) youtubeTokenInput.value = localStorage.getItem('YOUTUBE_ACCESS_TOKEN') || '';

  if (localKey) {
    apiKeyStatusLabel.textContent = 'API Key સેટ છે ✓';
    apiKeyStatusLabel.style.color = 'var(--accent-emerald)';
    apiKeyInput.value = localKey;
    return;
  }

  // Check if server .env has key
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.hasEnvKey) {
      apiKeyStatusLabel.textContent = 'API Key એક્ટિવ છે ✓';
      apiKeyStatusLabel.style.color = 'var(--accent-emerald)';
      return;
    }
  } catch (_) {}

  apiKeyStatusLabel.textContent = 'API Key નાખો ⚠️';
  apiKeyStatusLabel.style.color = 'var(--accent-rose)';
}

btnSettings.addEventListener('click', () => {
  apiKeyInput.value = getSavedApiKey();
  const metaIgUserIdInput = document.getElementById('metaIgUserIdInput');
  const metaIgTokenInput = document.getElementById('metaIgTokenInput');
  const youtubeTokenInput = document.getElementById('youtubeTokenInput');
  if (metaIgUserIdInput) metaIgUserIdInput.value = localStorage.getItem('META_IG_USER_ID') || '';
  if (metaIgTokenInput) metaIgTokenInput.value = localStorage.getItem('META_IG_TOKEN') || '';
  if (youtubeTokenInput) youtubeTokenInput.value = localStorage.getItem('YOUTUBE_ACCESS_TOKEN') || '';
  settingsModal.classList.remove('hidden');
});

btnCloseModal.addEventListener('click', () => {
  settingsModal.classList.add('hidden');
});

btnSaveApiKey.addEventListener('click', () => {
  const val = apiKeyInput.value.trim();
  if (val) {
    localStorage.setItem('GEMINI_API_KEY', val);
  } else {
    localStorage.removeItem('GEMINI_API_KEY');
  }

  const metaIgUser = document.getElementById('metaIgUserIdInput')?.value.trim();
  const metaIgTok = document.getElementById('metaIgTokenInput')?.value.trim();
  const ytTok = document.getElementById('youtubeTokenInput')?.value.trim();

  if (metaIgUser) localStorage.setItem('META_IG_USER_ID', metaIgUser);
  else localStorage.removeItem('META_IG_USER_ID');

  if (metaIgTok) localStorage.setItem('META_IG_TOKEN', metaIgTok);
  else localStorage.removeItem('META_IG_TOKEN');

  if (ytTok) localStorage.setItem('YOUTUBE_ACCESS_TOKEN', ytTok);
  else localStorage.removeItem('YOUTUBE_ACCESS_TOKEN');

  showToast('સેટિંગ્સ સફળતાપૂર્વક સેવ થઈ ગયા!');
  loadApiKeyStatus();
  settingsModal.classList.add('hidden');
});

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
        btn.innerHTML = '<i class="fa-solid fa-check"></i> કોપી થઈ ગયું!';
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 2000);
      }
    });
  });
}

// Generate Full-Stack App
btnGenerate.addEventListener('click', async () => {
  const prompt = promptInput.value.trim();
  if (!prompt) {
    showToast('કૃપા કરીને તમે શું બનાવવા માંગો છો તે લખો.', true);
    promptInput.focus();
    return;
  }

  const apiKey = getSavedApiKey();
  // Server will automatically use GEMINI_API_KEY from .env if frontend apiKey is empty.

  // Set Loading UI
  btnGenerate.disabled = true;
  generationLoader.classList.remove('hidden');
  loaderStatus.textContent = 'AI Architect આખો પ્રોજેક્ટ તૈયાર કરી રહ્યું છે... (આમાં ૩૦ સેકન્ડ લાગી શકે છે)';

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
      throw new Error(data.error || 'પ્રોજેક્ટ જનરેટ કરવામાં ભૂલ આવી.');
    }

    currentProject = data.project;
    renderProject(currentProject);
    showToast('🎉 તમારો Full-Stack પ્રોજેક્ટ સફળતાપૂર્વક બની ગયો!');

  } catch (err) {
    console.error(err);
    showToast(`ભૂલ: ${err.message}`, true);
  } finally {
    btnGenerate.disabled = false;
    generationLoader.classList.add('hidden');
  }
});

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
  let guideHtml = `<h3>🚀 ${project.projectTitle || project.projectName} કેવી રીતે રન કરવો?</h3>`;
  guideHtml += `<p><strong>વર્ણન:</strong> ${project.description || ''}</p><br/>`;
  guideHtml += `<h4>૧. ડેટાબેઝ સેટઅપ (${project.techStack?.database || 'SQL'}):</h4>`;
  guideHtml += `<pre>${project.database?.notes || 'SSMS માં schema.sql રન કરીને ડેટાબેઝ બનાવો.'}</pre>`;
  
  guideHtml += `<h4>૨. બેકએન્ડ સેટઅપ (${project.techStack?.backend || 'Backend'}):</h4>`;
  guideHtml += `<pre>${project.backend?.setupInstructions || 'dotnet run અથવા npm start થી બેકએન્ડ રન કરો.'}</pre>`;

  guideHtml += `<h4>૩. સ્ટેપ-બાય-સ્ટેપ સંપૂર્ણ ગાઈડ:</h4>`;
  guideHtml += `<pre>${project.runGuide || 'README.md ફાઈલ જુઓ.'}</pre>`;

  guideContent.innerHTML = guideHtml;
}

// Save Project directly to PC Disk
btnSaveToDisk.addEventListener('click', async () => {
  if (!currentProject) return;
  btnSaveToDisk.disabled = true;
  btnSaveToDisk.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> સેવ થઈ રહ્યું છે...';

  try {
    const res = await fetch('/api/save-project', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: currentProject })
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'પ્રોજેક્ટ સેવ કરવામાં ભૂલ આવી.');
    }
    showToast(`✅ પ્રોજેક્ટ કમ્પ્યુટરમાં સેવ થઈ ગયો:\n${data.savedPath}`);
    alert(`પ્રોજેક્ટ તમારા કમ્પ્યુટરમાં આ ફોલ્ડરમાં સેવ થયો છે:\n\n${data.savedPath}`);
  } catch (err) {
    showToast(`ભૂલ: ${err.message}`, true);
  } finally {
    btnSaveToDisk.disabled = false;
    btnSaveToDisk.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> PC માં સેવ કરો';
  }
});

// Download ZIP
btnDownloadZip.addEventListener('click', async () => {
  if (!currentProject) return;
  btnDownloadZip.disabled = true;
  btnDownloadZip.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ઝિપ બની રહી છે...';

  try {
    const res = await fetch('/api/download-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: currentProject })
    });
    if (!res.ok) throw new Error('ZIP ડાઉનલોડ કરવામાં ભૂલ આવી.');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.projectName || 'project'}.zip`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
    showToast('📦 ZIP ફાઈલ સફળતાપૂર્વક ડાઉનલોડ થઈ ગઈ!');
  } catch (err) {
    showToast(`ભૂલ: ${err.message}`, true);
  } finally {
    btnDownloadZip.disabled = false;
    btnDownloadZip.innerHTML = '<i class="fa-solid fa-file-zipper"></i> ZIP ડાઉનલોડ';
  }
});

// ==========================================
// 🎬 MODE SWITCHER & VIDEO STUDIO IMPLEMENTATION
// ==========================================

function initModeSwitcher() {
  const navTabs = document.querySelectorAll('.mode-tab');
  const appView = document.getElementById('appBuilderView');
  const videoView = document.getElementById('videoStudioView');
  const schedView = document.getElementById('schedulerView');

  navTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      const targetId = tab.getAttribute('data-target');
      appView.classList.add('hidden');
      videoView.classList.add('hidden');
      schedView.classList.add('hidden');

      const targetEl = document.getElementById(targetId);
      if (targetEl) targetEl.classList.remove('hidden');

      if (targetId === 'schedulerView') {
        fetchSchedulerStatus();
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
    if (!isoOrLocalString) return 'અત્યારે જ';
    const d = new Date(isoOrLocalString);
    if (isNaN(d.getTime())) return isoOrLocalString;

    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = d.toDateString() === tomorrow.toDateString();

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    let period = 'સવારે';
    if (hours >= 12 && hours < 16) period = 'બપોરે';
    else if (hours >= 16 && hours < 20) period = 'સાંજે';
    else if (hours >= 20 || hours < 5) period = 'રાત્રે';

    const displayHours = hours % 12 || 12;
    const timeStr = `${String(displayHours).padStart(2, '0')}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`;

    if (isToday) return `આજે ${period} ${timeStr}`;
    if (isTomorrow) return `આવતીકાલે ${period} ${timeStr}`;

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
      videoScheduleFriendlyText.innerHTML = '<i class="fa-solid fa-bell"></i> પસંદ કરેલ સમય: <span>અત્યારે જ</span>';
      return;
    }
    const friendly = formatGujaratiDateTime(val);
    videoScheduleFriendlyText.innerHTML = `<i class="fa-solid fa-bell"></i> પસંદ કરેલ સમય: <span>${friendly}</span>`;
    if (isScheduleModeActive && btnProcessVideoText) {
      btnProcessVideoText.textContent = `⏰ ${friendly} માટે Reel શેડ્યૂલ કરો`;
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
        badgeScheduleMode.textContent = '⚡ અત્યારે (Instant)';
        badgeScheduleMode.style.background = 'rgba(99, 102, 241, 0.2)';
      }
      if (btnProcessVideoText) btnProcessVideoText.textContent = '🎬 AI Auto-Edit & 30s Reel તૈયાર કરો';
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
        badgeScheduleMode.textContent = '⏰ ૧ વાર શેડ્યૂલ (Once)';
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
        badgeScheduleMode.textContent = '🔁 દરરોજ (Every Day Auto-Post)';
        badgeScheduleMode.style.background = 'rgba(168, 85, 247, 0.35)';
      }
      if (btnProcessVideoIcon) btnProcessVideoIcon.className = 'fa-solid fa-repeat';
      initSchedulePickerDefault();
      if (btnProcessVideoText) {
        btnProcessVideoText.textContent = '🔁 દરરોજ આ સમયે ઓટો-પોસ્ટ શેડ્યૂલ કરો';
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
      scheduledQueueList.innerHTML = '<div class="empty-queue-hint">કોઈ Reel શેડ્યૂલ થયેલી નથી. ઉપરથી સમય પસંદ કરીને શેડ્યૂલ કરી શકો છો.</div>';
      return;
    }

    scheduledQueueList.innerHTML = queue.map(item => {
      const friendlyTime = formatGujaratiDateTime(item.scheduledTime);
      const isReady = item.status === 'Ready to Post';
      const isPosted = item.status?.includes('Posted') || item.status?.includes('Instagram');

      const recurringBadge = item.recurringDaily 
        ? `<span class="badge" style="background: rgba(168,85,247,0.25); color: #c084fc; font-size: 0.65rem; padding: 0.15rem 0.45rem;"><i class="fa-solid fa-repeat"></i> દરરોજ (Every Day)</span>` 
        : '';

      const statusBadge = isPosted
        ? `<a href="${item.lastPostUrl || '#'}" target="_blank" class="step-badge" style="background: rgba(16,185,129,0.2); color: #34d399; text-decoration: none;"><i class="fa-brands fa-instagram"></i> Live on IG ✓</a>`
        : isReady 
        ? '<span class="step-badge" style="background: rgba(16,185,129,0.15); color: #34d399;"><i class="fa-solid fa-check"></i> Ready to Post</span>' 
        : '<span class="step-badge" style="background: rgba(6,182,212,0.15); color: #38bdf8;"><i class="fa-solid fa-clock"></i> Scheduled</span>';

      const safeTitle = (item.viralTitle || item.fileName || 'Reel 30s').replace(/"/g, '&quot;');

      return `
        <div class="queue-item" data-id="${item.id}">
          <div class="queue-item-meta">
            <div class="queue-item-title">${safeTitle}</div>
            <div class="queue-item-time">
              <i class="fa-solid fa-calendar-check"></i> ${friendlyTime} • ${statusBadge} ${recurringBadge}
            </div>
          </div>
          <div class="queue-item-actions">
            ${!isReady && !isPosted ? `<button type="button" class="btn-queue-action btn-queue-run" onclick="triggerRunScheduledReel('${item.id}')" title="અત્યારે જ રન કરો"><i class="fa-solid fa-bolt"></i> અત્યારે</button>` : ''}
            <button type="button" class="btn-queue-action" onclick="triggerCancelScheduledReel('${item.id}')" title="શેડ્યૂલ રદ કરો"><i class="fa-solid fa-trash"></i></button>
          </div>
        </div>
      `;
    }).join('');
  }

  window.triggerRunScheduledReel = async (id) => {
    try {
      const res = await fetch('/api/video/scheduled-queue/run-now', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        showToast('⚡ Reel તાત્કાલિક પોસ્ટ માટે રેડી થઈ ગઈ!');
        renderScheduledQueue(data.queue);
      }
    } catch (err) {
      showToast(err.message, true);
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
        showToast('શેડ્યૂલ રદ કરવામાં આવ્યું.');
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
      showToast('કૃપા કરીને વિડીયો ફાઈલ (MP4/MOV) પસંદ કરો.', true);
      return;
    }
    selectedVideoFile = file;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    selectedFileNameBadge.textContent = `✓ પસંદ થયેલ: ${file.name} (${mbSize} MB)`;
    selectedFileNameBadge.classList.remove('hidden');
    showToast(`વિડીયો લોડ થયો: ${file.name}`);
  }

  // Process Video with AI Auto-Editing & Effects
  btnProcessVideo.addEventListener('click', async () => {
    if (!selectedVideoFile) {
      showToast('કૃપા કરીને પહેલા કોઈપણ વિડીયો ફાઈલ અપલોડ કરો.', true);
      fileInput.click();
      return;
    }

    btnProcessVideo.disabled = true;
    videoLoader.classList.remove('hidden');
    videoLoaderStatus.textContent = isScheduleModeActive 
      ? 'AI વિડીયોનું એનાલિસિસ અને નિર્ધારિત સમય માટે શેડ્યૂલ સેટ કરી રહ્યું છે...' 
      : 'AI વિડીયોનું એનાલિસિસ કરીને 30s 9:16 રીલ અને કલર ઈફેક્ટ્સ લગાવી રહ્યું છે...';

    const formData = new FormData();
    formData.append('videoFile', selectedVideoFile);
    formData.append('niche', videoNicheSelect.value);
    formData.append('targetDuration', videoDurationSelect.value);
    formData.append('customInstructions', videoCustomPrompt.value);

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
        throw new Error(data.error || 'વિડીયો પ્રોસેસ કરવામાં ભૂલ આવી.');
      }

      currentRenderedReel = data;

      // 1. Play Rendered 9:16 Reel
      reelPlaceholder.style.display = 'none';
      renderedVideoPlayer.src = data.reelUrl;
      renderedVideoPlayer.classList.add('active');
      renderedVideoPlayer.load();
      renderedVideoPlayer.play().catch(() => {});

      // 2. Set Recipe Stats & AI Vision Topic
      pillTheme.textContent = data.recipe?.themeName || 'Royal Vibrant';
      pillDuration.textContent = data.duration || '30s';
      recipePills.classList.remove('hidden');

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

      // 4. Download Button
      btnDownloadReel.href = data.downloadUrl;
      btnDownloadReel.setAttribute('download', data.fileName || 'reel-30s.mp4');
      videoActionButtons.classList.remove('hidden');

      // 5. Enable Social Media Buttons
      btnPublishYouTube.disabled = false;
      btnPublishInstagram.disabled = false;

      if (data.isScheduled && data.scheduledItem) {
        if (data.scheduledItem.recurringDaily) {
          showToast(`🎉 દરરોજ આ જ સમયે (${formatGujaratiDateTime(data.scheduledItem.scheduledTime)}) ઓટો-પોસ્ટ સફળતાપૂર્વક સેટ થઈ ગયું! 🔁`);
        } else {
          showToast(`🎉 Reel સફળતાપૂર્વક ${formatGujaratiDateTime(data.scheduledItem.scheduledTime)} માટે શેડ્યૂલ થઈ ગઈ!`);
        }
      } else {
        showToast('🎉 ૩૦ સેકન્ડની AI એડિટ થયેલી Reel સફળતાપૂર્વક બની ગઈ!');
      }

      fetchScheduledQueue();

    } catch (err) {
      console.error(err);
      showToast(`ભૂલ: ${err.message}`, true);
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
      showToast('વિડીયો ફરી ડાઉનલોડ થઈ રહ્યો છે...');
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

    // 100% Hands-Free YouTube Data API Direct Publishing
    if (ytToken) {
      btnPublishYouTube.disabled = true;
      btnPublishYouTube.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> YouTube Shorts પબ્લિશ થઈ રહ્યું છે...';
      showToast('🚀 YouTube Data API દ્વારા Shorts સીધું પબ્લિશ થઈ રહ્યું છે...');

      try {
        const fullDesc = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
        const res = await fetch('/api/social/publish-youtube-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            videoFileName: currentRenderedReel.fileName,
            title: viralTitleText.textContent,
            description: fullDesc,
            accessToken: ytToken
          })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'YouTube Upload નિષ્ફળ થયું.');
        }

        showToast('🎉 YouTube Short સીધું તમારી ચેનલ પર પબ્લિશ થઈ ગયું!');
        if (data.postUrl) {
          window.open(data.postUrl, '_blank');
        }
        return;
      } catch (err) {
        showToast(`YouTube API ભૂલ: ${err.message}`, true);
        triggerGuidedYouTubeFlow();
      } finally {
        btnPublishYouTube.disabled = false;
        btnPublishYouTube.innerHTML = '<i class="fa-brands fa-youtube"></i> <span>YouTube Shorts પર અપલોડ</span>';
      }
      return;
    }

    triggerGuidedYouTubeFlow();
  });

  function triggerGuidedYouTubeFlow() {
    try {
      // 1. Auto download video
      triggerReelFileDownload();

      // 2. Copy Title & Description
      const fullDesc = `${viralCaptionText.textContent}\n\n${viralHashtagsText.textContent}`;
      navigator.clipboard.writeText(`${viralTitleText.textContent}\n\n${fullDesc}`);

      showToast('🎉 વિડીયો ડાઉનલોડ થયો & ટાઈટલ કોપી થઈ ગયું! YouTube Studio ખૂલી રહ્યું છે...');
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
    btnPublishInstagram.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Instagram Reels પબ્લિશ થઈ રહી છે...';
    showToast('🚀 Meta Graph API દ્વારા વિડીયો Instagram Reels પર અપલોડ થઈ રહ્યો છે...');

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
        throw new Error(data.error || 'Meta Reels પબ્લિશ કરવામાં સમસ્યા આવી.');
      }

      showToast('🎉 ૧૦૦% હેન્ડ્સ-ફ્રી: રીલ સીધી જ તમારા Instagram (@kuldip__3868) પર પબ્લિશ થઈ ગઈ!');
      if (data.postUrl) {
        window.open(data.postUrl, '_blank');
      }
      return;
    } catch (err) {
      console.warn('Direct upload error, falling back to guided flow:', err);
      showToast(`ઓટોમેટિક પબ્લિશ ભૂલ: ${err.message}`, true);
      triggerGuidedInstagramFlow();
    } finally {
      btnPublishInstagram.disabled = false;
      btnPublishInstagram.innerHTML = '<i class="fa-brands fa-instagram"></i> <span>Instagram Reels પર અપલોડ (@kuldip__3868)</span>';
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

      showToast('✅ વિડીયો ડાઉનલોડ થઈ ગયો & કેપ્શન કોપી થઈ ગયું!');

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
  lblSchedStatus.textContent = state.isActive ? 'Active (રોજ સવારે રન થશે ✓)' : 'Paused (બંધ છે)';
  lblSchedStatus.style.color = state.isActive ? 'var(--accent-emerald)' : 'var(--accent-rose)';

  lblSchedTime.textContent = `દરરોજ ${state.scheduledTime || '08:30'} વાગ્યે`;
  const timeInput = document.getElementById('scheduleDailyTime');
  if (timeInput) timeInput.value = state.scheduledTime || '08:30';

  if (state.masterVideo) {
    lblSchedVideoName.textContent = state.masterVideo.originalName || 'Master Video';
    lblSchedTotalDur.textContent = `${state.masterVideo.totalDurationFormatted || ''} (કુલ ${state.masterVideo.totalParts || 0} ભાગો)`;
    lblSchedNextPart.textContent = `Part ${state.currentPart} (સેકન્ડ ${state.lastPostedSeconds} થી ${state.lastPostedSeconds + 30})`;

    // Progress Bar
    const postedParts = state.currentPart - 1;
    const totalParts = state.masterVideo.totalParts || 1;
    const pct = Math.min(100, Math.round((postedParts / totalParts) * 100));
    schedProgressBar.style.width = `${pct}%`;
    schedProgressLabel.textContent = `${postedParts} / ${totalParts} Parts Posted (${pct}%) • ${totalParts - postedParts} બાકી છે`;
  } else {
    lblSchedVideoName.textContent = 'કોઈ લોંગ વિડીયો અપલોડ કરેલ નથી';
    lblSchedTotalDur.textContent = '0 સેકન્ડ';
    lblSchedNextPart.textContent = 'Part 1 (અપલોડ બાકી)';
    schedProgressBar.style.width = '0%';
    schedProgressLabel.textContent = '0 / 0 Parts Posted';
  }

  // Render History List
  const history = state.history || [];
  if (history.length === 0) {
    partsHistoryList.innerHTML = `
      <div class="empty-parts-notice">
        <i class="fa-regular fa-clock"></i>
        <p>હજી સુધી કોઈ ભાગ પોસ્ટ થયો નથી. "આગામી Part અત્યારે જ કટ કરો" દબાવીને ટેસ્ટ કરો.</p>
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
            <i class="fa-solid fa-arrow-up-right-from-square"></i> પ્લે કરો
          </a>
          <a href="${item.renderedReelUrl}" download="${item.fileName || 'part.mp4'}" class="btn btn-ghost" style="padding: 0.3rem 0.7rem; font-size: 0.75rem;">
            <i class="fa-solid fa-download"></i> ડાઉનલોડ
          </a>
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
      showToast('કૃપા કરીને વિડીયો ફાઈલ પસંદ કરો.', true);
      return;
    }
    selectedSchedulerFile = file;
    const mbSize = (file.size / (1024 * 1024)).toFixed(1);
    fileNameBadge.textContent = `✓ પસંદ થયેલ: ${file.name} (${mbSize} MB)`;
    fileNameBadge.classList.remove('hidden');
    showToast(`લોંગ વિડીયો પસંદ થયો: ${file.name}`);
  }

  // Time formatting & Quick Presets
  const timeDisplayHint = document.getElementById('timeDisplayHint');

  function updateTimeLabel(val) {
    if (!val) return;
    const [h, m] = val.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h % 12 || 12;
    const padM = String(m).padStart(2, '0');
    const dayPeriod = (h >= 5 && h < 12) ? 'સવારે' : (h >= 12 && h < 17) ? 'બપોરે' : (h >= 17 && h < 20) ? 'સાંજે' : 'રાત્રે';
    if (timeDisplayHint) {
      timeDisplayHint.textContent = `${dayPeriod} ${displayHour}:${padM} ${period} વાગ્યે`;
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
      showToast(`સમય પસંદ થયો: ${chip.getAttribute('data-label')}`);
    });
  });

  // Save Schedule / Upload Master Video
  btnSaveSchedule.addEventListener('click', async () => {
    const scheduledTime = timeInput.value || '08:30';

    btnSaveSchedule.disabled = true;
    btnSaveSchedule.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> સેટ થઈ રહ્યું છે...';

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
        throw new Error(data.error || 'શેડ્યૂલર સેટ કરવામાં ભૂલ આવી.');
      }
      showToast(data.message || 'શેડ્યૂલર સફળતાપૂર્વક ચાલુ થઈ ગયું!');
      renderSchedulerState(data.state);
    } catch (err) {
      showToast(`ભૂલ: ${err.message}`, true);
    } finally {
      btnSaveSchedule.disabled = false;
      btnSaveSchedule.innerHTML = '<i class="fa-solid fa-play"></i> <span>⏰ શેડ્યૂલર ચાલુ કરો (Auto-Pilot Activate)</span>';
    }
  });

  // Run Next Part Right Now (Test Action)
  btnRunNextNow.addEventListener('click', async () => {
    btnRunNextNow.disabled = true;
    btnRunNextNow.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> આગામી 30s ભાગ બની રહ્યો છે...';

    try {
      const res = await fetch('/api/scheduler/run-next', {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'ભાગ કટ કરવામાં ભૂલ આવી.');
      }
      showToast(`🎉 Part ${data.item.part} સફળતાપૂર્વક તૈયાર થઈ ગયું! (આ ભાગ ફરી ક્યારેય રીપીટ નહીં થાય)`);
      renderSchedulerState(data.state);
    } catch (err) {
      showToast(`ભૂલ: ${err.message}`, true);
    } finally {
      btnRunNextNow.disabled = false;
      btnRunNextNow.innerHTML = '<i class="fa-solid fa-forward-step"></i> <span>⚡ આગામી Part (30s) અત્યારે જ કટ & પબ્લિશ કરો</span>';
    }
  });

  const btnLoadSampleVideo = document.getElementById('btnLoadSampleVideo');
  if (btnLoadSampleVideo) {
    btnLoadSampleVideo.addEventListener('click', async () => {
      btnLoadSampleVideo.disabled = true;
      btnLoadSampleVideo.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> લોડ થઈ રહ્યો છે...';
      try {
        const scheduledTime = timeInput.value || '08:30';
        const res = await fetch('/api/scheduler/load-sample', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scheduledTime })
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'સેમ્પલ વિડીયો લોડ કરવામાં ભૂલ આવી.');
        }
        showToast('🎉 ૧૫ મિનિટનો ટેસ્ટ વિડીયો સફળતાપૂર્વક લોડ થઈ ગયો! (૩૦ ભાગો)');
        renderSchedulerState(data.state);
      } catch (err) {
        showToast(`ભૂલ: ${err.message}`, true);
      } finally {
        btnLoadSampleVideo.disabled = false;
        btnLoadSampleVideo.innerHTML = '<i class="fa-solid fa-bolt"></i> ⚡ ૧૫ મિનિટનો સેમ્પલ વિડીયો લોડ કરો (Quick Test)';
      }
    });
  }

  btnRefreshSched.addEventListener('click', () => {
    fetchSchedulerStatus();
    showToast('શેડ્યૂલર સ્ટેટસ અપડેટ થઈ ગયું.');
  });
}

// Check Social Media Integration Status
async function initSocialConnectionBadge() {
  try {
    const res = await fetch('/api/social/status');
    const data = await res.json();
    if (data.success && data.instagram?.connected) {
      const btnPublishIg = document.getElementById('btnPublishInstagram');
      if (btnPublishIg) {
        btnPublishIg.innerHTML = `<i class="fa-brands fa-instagram"></i> <span>Instagram Reels પર અપલોડ (@${data.instagram.username} કનેક્ટેડ ⚡)</span>`;
      }
      console.log('✅ Instagram Connected:', data.instagram.username);
    }
  } catch (_) {}
}

initSocialConnectionBadge();



