const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const fsp = require('fs').promises;
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

// Core Engine: Publish Reel to Instagram Graph API Direct
async function publishReelDirectToInstagram(videoPath, caption, customToken, customUserId) {
  const token = customToken || process.env.META_INSTAGRAM_TOKEN;
  let userId = customUserId || process.env.META_INSTAGRAM_USER_ID;

  if (!token) throw new Error('Meta Instagram Access Token ઉપલબ્ધ નથી.');
  if (!userId) {
    const meAccounts = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=instagram_business_account{id,username}&access_token=${token}`).then(r => r.json());
    const igAcc = meAccounts.data?.find(a => a.instagram_business_account)?.instagram_business_account;
    if (igAcc && igAcc.id) userId = igAcc.id;
    else throw new Error('Instagram Business Account ID મળ્યો નથી.');
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
            // Direct Auto-Publish to Instagram if configured
            if (process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID) {
              const videoPath = path.join(REELS_DIR, item.fileName);
              const caption = `${item.viralCaption || ''}\n\n${item.viralHashtags || ''}`;
              console.log(`🚀 [Auto-Post Engine] Auto-uploading due Reel to Instagram @kuldip__3868...`);
              const pubResult = await publishReelDirectToInstagram(videoPath, caption);

              item.lastPostUrl = pubResult.postUrl;
              item.lastPostId = pubResult.postId;
              item.lastPostedAt = new Date().toISOString();
              item.status = 'Posted to Instagram ✓';
              console.log(`🎉 [Auto-Post Engine] Reel ${item.fileName} successfully posted: ${pubResult.postUrl}`);
            } else {
              item.status = 'Ready to Post';
              item.readyAt = new Date().toISOString();
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
            console.error(`❌ [Auto-Post Engine] Upload failed:`, err.message);
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
    const { niche = 'Patola Saree & Ethnic Fashion', targetDuration = '30', customInstructions = '' } = req.body;
    const apiKey = req.body.apiKey || process.env.GEMINI_API_KEY;

    console.log(`🎬 [Video AI] Processing video: ${req.file.originalname} (${(req.file.size / (1024*1024)).toFixed(1)}MB)`);

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
    let aiDirectorRecipe = {
      detectedTopic: 'Universal Video Showcase',
      themeName: 'Cinematic Vibrant Glow',
      saturation: 1.25,
      contrast: 1.12,
      brightness: 0.02,
      viralTitle: '✨ Watch This Till The End! #Viral #Shorts #Reels',
      viralCaption: 'Unbelievable moments captured in 4K quality! Hit Like and Share with your friends. 🔥\n\nFollow for more daily viral content! ✨',
      viralHashtags: '#ViralReels #TrendingNow #Shorts #ExplorePage #InstaDaily #ViralVideo #TrendingReels',
      hookOverlay: 'Wait For The End 🔥'
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
The user uploaded a video. It could be ANY topic (e.g. Cars, Gym/Fitness, Food & Cooking, Fashion, Nature & Travel, Gaming, Tech, Comedy, Vlog, Business, Jewelry, Sarees, etc.).
User note/instructions: "${customInstructions || niche || 'Analyze the visual content and automatically pick the best cinematic editing style'}".

Tasks:
1. Inspect the visual content (subject, lighting, colors, objects, environment).
2. Determine "detectedTopic": A concise 1-sentence description of what you SEE in this video.
3. Choose the optimal color grading parameters for this exact content:
   - "themeName": Catchy aesthetic style name (e.g. "Sunset Amber Drift", "Hyper-Crisp Gourmet", "Heavy Iron Gym Mood", "Royal Heritage Silk", "Neon Cyberpunk", "Vivid Nature Bloom")
   - "saturation": Number between 1.10 and 1.40 (higher for food/nature/fashion, moderate for dark scenes/gym)
   - "contrast": Number between 1.05 and 1.20
   - "brightness": Number between -0.02 and 0.04
4. Create Viral Metadata tailored to THIS SPECIFIC CONTENT:
   - "viralTitle": Irresistible YouTube Shorts title (with emojis & #Shorts)
   - "viralCaption": Engaging Instagram Reels caption with hook, description of the scene, question to audience & CTA
   - "viralHashtags": 12-15 targeted viral hashtags matching this exact niche
   - "hookOverlay": Catchy 3-4 word hook text to display on screen.

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

    const sat = Math.max(1.0, Math.min(1.5, Number(aiDirectorRecipe.saturation) || 1.25));
    const con = Math.max(1.0, Math.min(1.3, Number(aiDirectorRecipe.contrast) || 1.12));
    const bri = Math.max(-0.1, Math.min(0.1, Number(aiDirectorRecipe.brightness) || 0.02));

    console.log(`🎬 Rendering 30s 9:16 Reel with Saturation: ${sat}, Contrast: ${con}...`);

    // FFmpeg execution
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .setStartTime(0)
        .duration(maxSec)
        .videoFilters([
          // Scale & pad to 1080x1920 (9:16 vertical for Reels & Shorts)
          'scale=1080:1920:force_original_aspect_ratio=decrease',
          'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
          // Color grading
          `eq=saturation=${sat}:contrast=${con}:brightness=${bri}`,
          // Fade in at 0s, fade out at end
          'fade=t=in:st=0:d=0.8',
          `fade=t=out:st=${Math.max(1, maxSec - 1.5)}:d=1.5`
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
        .save(outputPath)
        .on('end', () => {
          console.log(`✅ 30-sec Reel render completed: ${outputFileName}`);
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg render error:', err);
          reject(err);
        });
    });

    // Cleanup raw uploaded video after render to save disk space
    try { await fsp.unlink(inputPath); } catch (_) {}

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
    res.json(result);
  } catch (err) {
    console.error('Meta Direct Publish Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// YouTube Data API v3 100% Direct Publishing (Shorts)
app.post('/api/social/publish-youtube-direct', async (req, res) => {
  try {
    const { videoFileName, title, description, tags, accessToken } = req.body;
    const token = accessToken || process.env.YOUTUBE_ACCESS_TOKEN;

    if (!token) {
      return res.status(400).json({ 
        error: 'YouTube Access Token જરૂરી છે. કૃપા કરીને સેટિંગ્સમાં ઉમેરો.' 
      });
    }

    if (!videoFileName) return res.status(400).json({ error: 'વિડીયો ફાઈલ પસંદ કરો.' });

    const videoPath = path.join(REELS_DIR, path.basename(videoFileName));
    if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'વિડીયો ફાઈલ મળી નથી.' });

    const fileStat = await fsp.stat(videoPath);
    const videoBuffer = await fsp.readFile(videoPath);

    console.log(`🚀 [YouTube API] Starting direct upload for ${videoFileName} (${fileStat.size} bytes)...`);

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
    const shortUrl = `https://www.youtube.com/shorts/${videoId}`;
    console.log(`🎉 [YouTube API] Short Published Successfully! Video ID: ${videoId} -> ${shortUrl}`);

    res.json({
      success: true,
      videoId: videoId,
      postUrl: shortUrl,
      message: '🎉 YouTube Short સીધું તમારા ચેનલ પર પબ્લિશ થઈ ગયું છે!'
    });

  } catch (err) {
    console.error('YouTube Direct Publish Error:', err);
    res.status(500).json({ error: err.message });
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
    item.status = 'Publishing to Instagram...';
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
    const pubResult = await publishReelDirectToInstagram(videoPath, caption);

    item.status = 'Posted to Instagram ✓';
    item.lastPostId = pubResult.postId;
    item.lastPostUrl = pubResult.postUrl;
    item.lastPostedAt = new Date().toISOString();
    delete item.lastError;
    saveScheduledQueue(queue);

    res.json({ success: true, queue: getScheduledQueue(), item, postUrl: pubResult.postUrl, message: 'Reel successfully posted to Instagram!' });
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

// Endpoint to save settings directly to server .env & process.env
app.post('/api/settings/save', (req, res) => {
  try {
    const { metaIgUserId, metaIgToken, geminiApiKey } = req.body;
    let envContent = '';
    if (fs.existsSync('.env')) {
      envContent = fs.readFileSync('.env', 'utf8');
    }

    if (metaIgToken) {
      process.env.META_INSTAGRAM_TOKEN = metaIgToken;
      if (envContent.includes('META_INSTAGRAM_TOKEN=')) {
        envContent = envContent.replace(/META_INSTAGRAM_TOKEN=.*/, `META_INSTAGRAM_TOKEN=${metaIgToken}`);
      } else {
        envContent += `\nMETA_INSTAGRAM_TOKEN=${metaIgToken}`;
      }
    }
    if (metaIgUserId) {
      process.env.META_INSTAGRAM_USER_ID = metaIgUserId;
      if (envContent.includes('META_INSTAGRAM_USER_ID=')) {
        envContent = envContent.replace(/META_INSTAGRAM_USER_ID=.*/, `META_INSTAGRAM_USER_ID=${metaIgUserId}`);
      } else {
        envContent += `\nMETA_INSTAGRAM_USER_ID=${metaIgUserId}`;
      }
    }
    if (geminiApiKey) {
      process.env.GEMINI_API_KEY = geminiApiKey;
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiApiKey}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${geminiApiKey}`;
      }
    }

    fs.writeFileSync('.env', envContent.trim() + '\n', 'utf8');
    console.log('✅ Settings saved to .env & process.env');
    res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

  await new Promise((resolve, reject) => {
    ffmpeg(state.masterVideo.path)
      .setStartTime(startSec)
      .duration(segDuration)
      .videoFilters([
        'scale=1080:1920:force_original_aspect_ratio=decrease',
        'pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
        `eq=saturation=${sat}:contrast=${con}:brightness=${bri}`,
        'fade=t=in:st=0:d=0.7',
        `fade=t=out:st=${Math.max(1, segDuration - 1.2)}:d=1.2`
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
      .save(outputPath)
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });

  // 4. Update Scheduler State (Increment progress so this 30s segment NEVER posts again!)
  const historyItem = {
    part: partNum,
    startSeconds: startSec,
    endSeconds: endSec,
    duration: `${segDuration}s`,
    renderedReelUrl: `/rendered-reels/${outputFileName}`,
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
      console.log(`🚀 [Auto-Pilot Master Video] Auto-publishing Part ${partNum} directly to Instagram @kuldip__3868...`);
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

app.get('/api/social/status', (req, res) => {
  const hasIg = !!(process.env.META_INSTAGRAM_TOKEN && process.env.META_INSTAGRAM_USER_ID);
  res.json({
    success: true,
    instagram: {
      connected: hasIg,
      userId: process.env.META_INSTAGRAM_USER_ID || null,
      username: hasIg ? 'kuldip__3868' : null
    },
    youtube: {
      connected: !!process.env.YOUTUBE_ACCESS_TOKEN
    }
  });
});

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

app.post('/api/social/publish-youtube-direct', async (req, res) => {
  try {
    const { videoFileName, title, description } = req.body;
    const token = req.body.accessToken || process.env.YOUTUBE_ACCESS_TOKEN;

    if (!token) {
      return res.status(400).json({ error: 'YouTube OAuth Access Token ઉપલબ્ધ નથી.' });
    }

    let videoPath = null;
    if (videoFileName) {
      const p1 = path.join(REELS_DIR, videoFileName);
      const p2 = path.join(UPLOADS_DIR, videoFileName);
      if (fs.existsSync(p1)) videoPath = p1;
      else if (fs.existsSync(p2)) videoPath = p2;
    }

    if (!videoPath || !fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'YouTube માટે વિડીયો ફાઈલ મળી નથી.' });
    }

    const videoBuffer = await fsp.readFile(videoPath);

    // Resumable YouTube Upload
    const initRes = await fetch('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Length': videoBuffer.length.toString(),
        'X-Upload-Content-Type': 'video/mp4'
      },
      body: JSON.stringify({
        snippet: {
          title: title || 'Viral AI Reel #Shorts',
          description: description || 'Created with AI Reel Studio #Shorts',
          tags: ['Shorts', 'Reels', 'AI', 'Viral']
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false
        }
      })
    });

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      const errBody = await initRes.json().catch(() => ({}));
      return res.status(400).json({ error: errBody.error?.message || 'YouTube upload session init failed' });
    }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoBuffer.length.toString()
      },
      body: videoBuffer
    }).then(r => r.json());

    if (uploadRes.error) {
      return res.status(400).json({ error: uploadRes.error.message || 'YouTube binary upload failed' });
    }

    const videoId = uploadRes.id;
    res.json({
      success: true,
      videoId,
      postUrl: `https://www.youtube.com/shorts/${videoId}`,
      message: 'YouTube Shorts સફળતાપૂર્વક તમારી ચેનલ પર અપલોડ થઈ ગયું! 🎉'
    });
  } catch (err) {
    console.error('YouTube direct publish error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 AI Full-Stack & Video Automation running at http://localhost:${PORT}`);
  console.log(`📁 Generated projects will be saved to: ${GENERATED_DIR}`);
  console.log(`🎬 Rendered 30s Reels stored in: ${REELS_DIR}`);
});
