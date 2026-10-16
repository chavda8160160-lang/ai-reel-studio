require('dotenv').config();
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

const REELS_DIR = path.join(__dirname, 'public', 'rendered-reels');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const DATA_DIR = path.join(__dirname, 'data');
const SCHEDULER_FILE = path.join(DATA_DIR, 'scheduler-state.json');
const OUTPUT_SCHEDULE_FILE = path.join(DATA_DIR, 'mangalvar-schedule-ready.json');

if (!fs.existsSync(REELS_DIR)) fs.mkdirSync(REELS_DIR, { recursive: true });

function formatAssTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.floor((s - Math.floor(s)) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

function generateAssSubtitleFile(captions, hookText, durationSec = 30, styleMode = 'hormozi', resX = 1080, resY = 1920) {
  const assPath = path.join(os.tmpdir(), `sub-${Date.now()}-${Math.round(Math.random() * 1000)}.ass`);
  let events = '';

  const primaryCol = styleMode === 'electric-cyan' ? '&H00FFFF00&' : '&H0000FFFF&'; // Cyan or Yellow
  const accentCol = styleMode === 'electric-cyan' ? '&H0000FFFF&' : '&H0000FF00&';  // Yellow or Neon Green

  const wordFontSize = 72;
  const hookFontSize = 58;
  const wordMarginV = 380;
  const hookMarginV = 220;

  if (hookText) {
    const cleanHook = String(hookText).toUpperCase().replace(/[{}]/g, '').trim();
    events += `Dialogue: 0,0:00:00.20,0:00:03.50,HormoziHook,,0,0,0,,{\\c${primaryCol}}★ ${cleanHook} ★\n`;
  }

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

async function generateViralThumbnail({ videoPath, outputPath, headlineText, hookBadge, timestamp = 1.5 }) {
  const safeTime = Math.max(0.1, Number(timestamp) || 1.5);
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
      .on('end', () => resolve({ success: true, outputPath }))
      .on('error', (err) => resolve({ success: false, error: err.message }))
      .run();
  });
}

function getSeriesLabel(fileName) {
  if (!fileName) return '';
  const clean = fileName
    .replace(/\.[a-z0-9]+$/i, '')
    .replace(/[._-]/g, ' ')
    .replace(/\b(720p|1080p|2160p|4k|web-dl|ds4k|hindi|english|dub|esub|x264|x265|hdhub4u|ag|extended|look|official|trailer|gameplay)\b/gi, '')
    .trim();
  return clean.length > 20 ? clean.slice(0, 20) : clean;
}

// 9 Parts: Friday Evening -> Tuesday Evening
const scheduleSlots = [
  { part: 5,  dateLabel: 'આજે શુક્રવાર (16 Oct) સાંજે 06:30 PM', timeStr: '18:30', startSec: 120, endSec: 150 },
  { part: 6,  dateLabel: 'શનિવાર (17 Oct) બપોરે 11:30 AM',       timeStr: '11:30', startSec: 150, endSec: 180 },
  { part: 7,  dateLabel: 'શનિવાર (17 Oct) સાંજે 06:30 PM',       timeStr: '18:30', startSec: 180, endSec: 210 },
  { part: 8,  dateLabel: 'રવિવાર (18 Oct) બપોરે 11:30 AM',       timeStr: '11:30', startSec: 210, endSec: 240 },
  { part: 9,  dateLabel: 'રવિવાર (18 Oct) સાંજે 06:30 PM',       timeStr: '18:30', startSec: 240, endSec: 270 },
  { part: 10, dateLabel: 'સોમવાર (19 Oct) બપોરે 11:30 AM',       timeStr: '11:30', startSec: 270, endSec: 300 },
  { part: 11, dateLabel: 'સોમવાર (19 Oct) સાંજે 06:30 PM',       timeStr: '18:30', startSec: 300, endSec: 330 },
  { part: 12, dateLabel: 'મંગળવાર (20 Oct) બપોરે 11:30 AM',       timeStr: '11:30', startSec: 330, endSec: 360 },
  { part: 13, dateLabel: 'મંગળવાર (20 Oct) સાંજે 06:30 PM',       timeStr: '18:30', startSec: 360, endSec: 390 }
];

async function runBatchGeneration() {
  console.log('🚀 Starting Batch Generation for 9 Parts (Part 5 to Part 13)...');
  const state = JSON.parse(fs.readFileSync(SCHEDULER_FILE, 'utf8'));
  const masterPath = state.masterVideo.path;
  const seriesName = getSeriesLabel(state.masterVideo.originalName || state.masterVideo.fileName);
  const apiKey = process.env.GEMINI_API_KEY;

  console.log(`🎬 Master Video: ${masterPath}`);
  console.log(`🎮 Series Name: ${seriesName}`);

  const results = [];

  for (const slot of scheduleSlots) {
    const partNum = slot.part;
    const startSec = slot.startSec;
    const endSec = slot.endSec;
    const segDuration = endSec - startSec;
    console.log(`\n--------------------------------------------------`);
    console.log(`⏳ Processing Part ${partNum} (${slot.dateLabel}) [${startSec}s - ${endSec}s]...`);

    // 1. Snapshot for AI Vision
    const snapshotPath = path.join(UPLOADS_DIR, `snap-part${partNum}-${Date.now()}.jpg`);
    let frameBase64 = null;
    try {
      await new Promise((resolve) => {
        ffmpeg(masterPath)
          .setStartTime(startSec + 2)
          .outputOptions(['-vframes 1', '-q:v 2'])
          .save(snapshotPath)
          .on('end', () => resolve(true))
          .on('error', () => resolve(false));
      });
      if (fs.existsSync(snapshotPath)) {
        frameBase64 = await fsp.readFile(snapshotPath, { encoding: 'base64' });
      }
    } catch (_) {}

    // 2. Gemini AI Recipe
    const hookLabel = `${seriesName} • PART ${partNum} 🔥`;
    let partRecipe = {
      detectedTopic: `${seriesName} Part ${partNum} Action Scene`,
      themeName: 'Cinematic Vibrant',
      saturation: 1.25,
      contrast: 1.12,
      brightness: 0.02,
      viralTitle: `🎮 ${seriesName} - Part ${partNum}: Watch What Happens! 🔥 #Shorts`,
      viralCaption: `🎮 ${seriesName} Part ${partNum} | Don't miss this gameplay! Follow for Part ${partNum + 1} next. ✨\n\n#${seriesName.replace(/\s+/g, '')} #Part${partNum} #Gaming #GTA6 #GTA6Clips #TrendingReels #Shorts #DailyVideo`,
      viralHashtags: `#${seriesName.replace(/\s+/g, '')} #Part${partNum} #Gaming #GTA6 #Shorts #Viral`,
      hookOverlay: hookLabel,
      captions: [
        { startSec: 0.5, endSec: 3.5, text: `${seriesName} PART ${partNum}`, highlightColor: '&H0000FFFF&' },
        { startSec: 4.0, endSec: 8.0, text: 'WATCH WHAT HAPPENS', highlightColor: '&H0000FF00&' },
        { startSec: 8.5, endSec: 14.0, text: 'THE GRAPHICS ARE INSANE', highlightColor: '&H0000FFFF&' },
        { startSec: 14.5, endSec: 20.0, text: 'VICE CITY IN NEXT GEN', highlightColor: '&H0000FF00&' },
        { startSec: 20.5, endSec: 29.5, text: 'FOLLOW FOR PART ' + (partNum + 1), highlightColor: '&H00FFFFFF&' }
      ]
    };

    if (apiKey) {
      try {
        const parts = [];
        if (frameBase64) {
          parts.push({ inlineData: { mimeType: 'image/jpeg', data: frameBase64 } });
        }
        parts.push({
          text: `You are an elite YouTube Shorts & Instagram Reels Director.
This is Part ${partNum} of a multi-part daily series from "${seriesName}".
Generate JSON with:
1. "detectedTopic": 1-sentence scene description
2. "viralTitle": Irresistible title starting with "${seriesName} - Part ${partNum}: " (include emojis & #Shorts)
3. "viralCaption": Captivating caption referencing "${seriesName} Part ${partNum}" with follow reminder for Part ${partNum + 1}
4. "viralHashtags": 10-12 viral hashtags including #${seriesName.replace(/\s+/g, '')} #Part${partNum} #Gaming #Shorts #TrendingReels
5. "captions": Array of 4-5 punchy uppercase subtitle items for 30s video.
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
          }
        }
      } catch (e) {
        console.warn('⚠️ Gemini error for part ' + partNum + ':', e.message);
      }
    }
    try { if (fs.existsSync(snapshotPath)) await fsp.unlink(snapshotPath); } catch (_) {}

    // 3. Render 30s 9:16 Video
    const outputFileName = `daily-part${partNum}-${Date.now()}.mp4`;
    const outputPath = path.join(REELS_DIR, outputFileName);
    const thumbFileName = outputFileName.replace('.mp4', '-cover.jpg');
    const thumbOutputPath = path.join(REELS_DIR, thumbFileName);

    const vFilters = [
      'scale=1080:1920:force_original_aspect_ratio=decrease',
      'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      'eq=saturation=1.25:contrast=1.12:brightness=0.02',
      'fade=t=in:st=0:d=0.7',
      `fade=t=out:st=${Math.max(1, segDuration - 1.2)}:d=1.2`
    ];

    let assFilePath = null;
    try {
      assFilePath = generateAssSubtitleFile(partRecipe.captions, hookLabel, segDuration, 'hormozi');
      if (assFilePath && fs.existsSync(assFilePath)) {
        const escapedAss = path.resolve(assFilePath).replace(/\\/g, '/').replace(/:/g, '\\:');
        vFilters.push(`subtitles='${escapedAss}'`);
      }
    } catch (_) {}

    console.log(`🎬 Rendering Part ${partNum} video with FFmpeg...`);
    await new Promise((resolve, reject) => {
      ffmpeg(masterPath)
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

    // 4. Generate Thumbnail
    try {
      await generateViralThumbnail({
        videoPath: outputPath,
        outputPath: thumbOutputPath,
        headlineText: partRecipe.viralTitle,
        hookBadge: hookLabel,
        timestamp: 1.5
      });
      console.log(`🖼️ Cover generated: ${thumbFileName}`);
    } catch (_) {}

    const item = {
      part: partNum,
      slotLabel: slot.dateLabel,
      timeStr: slot.timeStr,
      startSeconds: startSec,
      endSeconds: endSec,
      duration: '30s',
      fileName: outputFileName,
      videoUrl: `/rendered-reels/${outputFileName}`,
      downloadUrl: `/rendered-reels/${outputFileName}`,
      thumbnailUrl: `/rendered-reels/${thumbFileName}`,
      coverFileName: thumbFileName,
      viralTitle: partRecipe.viralTitle,
      viralCaption: partRecipe.viralCaption,
      viralHashtags: typeof partRecipe.viralHashtags === 'string' ? partRecipe.viralHashtags : (partRecipe.viralHashtags || []).join(' '),
      detectedTopic: partRecipe.detectedTopic,
      status: 'Ready for Meta Schedule',
      generatedAt: new Date().toISOString()
    };

    results.push(item);
    console.log(`✅ Part ${partNum} successfully rendered!`);
  }

  // Save generated schedule to JSON
  fs.writeFileSync(OUTPUT_SCHEDULE_FILE, JSON.stringify(results, null, 2), 'utf8');

  // Update Scheduler State so that master video pointer advances to Part 14 (390s)
  state.currentPart = 14;
  state.lastPostedSeconds = 390;
  // Prepend new parts into state history
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i];
    state.history.unshift({
      part: r.part,
      startSeconds: r.startSeconds,
      endSeconds: r.endSeconds,
      duration: '30s',
      renderedReelUrl: r.videoUrl,
      thumbnailUrl: r.thumbnailUrl,
      fileName: r.fileName,
      postedAt: r.generatedAt,
      displayTime: r.slotLabel,
      viralTitle: r.viralTitle,
      viralCaption: r.viralCaption,
      viralHashtags: r.viralHashtags,
      detectedTopic: r.detectedTopic,
      status: 'Pre-rendered for Schedule'
    });
  }
  // Pause automatic cron so it doesn't double-cut while user is away
  state.isActive = false;
  fs.writeFileSync(SCHEDULER_FILE, JSON.stringify(state, null, 2), 'utf8');

  console.log(`\n🎉🎉 ALL 9 PARTS (PART 5 TO 13) SUCCESSFULLY GENERATED! 🎉🎉`);
  console.log(`Saved schedule list to: ${OUTPUT_SCHEDULE_FILE}`);
}

runBatchGeneration().catch(err => {
  console.error('Fatal batch generation error:', err);
  process.exit(1);
});
