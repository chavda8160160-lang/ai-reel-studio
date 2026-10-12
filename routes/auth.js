const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper: Read / Write Users
function getUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading users.json:', err.message);
  }
  return [];
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving users.json:', err.message);
  }
}

// Helper: Read / Write Sessions
function getSessions() {
  try {
    if (fs.existsSync(SESSIONS_FILE)) {
      return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading sessions.json:', err.message);
  }
  return {};
}

function saveSessions(sessions) {
  try {
    fs.writeFileSync(SESSIONS_FILE, JSON.stringify(sessions, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving sessions.json:', err.message);
  }
}

// Password hashing with salt
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

// Sanitize user object (remove secrets before sending to frontend)
function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, salt, ...safe } = user;
  return safe;
}

// Middleware: Authenticate Request Token
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  const sessions = getSessions();
  const session = sessions[token];

  if (!session || Date.now() > session.expiresAt) {
    if (session) {
      delete sessions[token];
      saveSessions(sessions);
    }
    return res.status(401).json({ success: false, error: 'Session expired. Please log in again.' });
  }

  const users = getUsers();
  const user = users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(401).json({ success: false, error: 'User not found' });
  }

  req.user = user;
  req.token = token;
  next();
}

// Optional Auth (doesn't block if guest, but attaches req.user if logged in)
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.query.token;

  if (token) {
    const sessions = getSessions();
    const session = sessions[token];
    if (session && Date.now() <= session.expiresAt) {
      const users = getUsers();
      const user = users.find(u => u.id === session.userId);
      if (user) req.user = user;
    }
  }
  next();
}

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// 1. REGISTER NEW USER
router.post('/register', (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'કૃપા કરીને તમારું પૂરું નામ લખો.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'માન્ય ઇમેઇલ એડ્રેસ દાખલ કરો.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, error: 'પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરોનો હોવો જોઈએ.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = getUsers();

    // Check existing email
    if (users.some(u => u.email === cleanEmail)) {
      return res.status(400).json({ success: false, error: 'આ ઇમેઇલ સાથે પહેલેથી એકાઉન્ટ ઉપલબ્ધ છે. કૃપા કરીને Log In કરો.' });
    }

    // Hash password
    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    // Initial role & free credits
    const isFirstUser = users.length === 0;
    const newUser = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      name: name.trim(),
      email: cleanEmail,
      phone: (phone || '').trim(),
      passwordHash,
      salt,
      role: isFirstUser ? 'admin' : 'user',
      plan: 'free',
      credits: 5, // 5 Free Starting Reels!
      social: {
        instagram: { connected: false, username: '', pageId: '', token: '' },
        youtube: { connected: false, channelTitle: '', refreshToken: '' }
      },
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    // Create session token (valid for 30 days)
    const token = `tok_${crypto.randomBytes(32).toString('hex')}`;
    const sessions = getSessions();
    sessions[token] = {
      userId: newUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
    saveSessions(sessions);

    console.log(`✅ [Auth] New user registered: ${newUser.name} (${newUser.email}) - Credits: ${newUser.credits}`);

    res.json({
      success: true,
      message: 'એકાઉન્ટ સફળતાપૂર્વક બની ગયું છે! તમને 5 મફત રીલ્સ ક્રેડિટ્સ મળ્યા છે.',
      token,
      user: sanitizeUser(newUser)
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, error: 'સર્વર એરર: રજીસ્ટ્રેશન નિષ્ફળ રહ્યું.' });
  }
});

// 2. LOGIN USER
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'ઇમેઇલ અને પાસવર્ડ બંને જરૂરી છે.' });
    }

    const inputKey = email.trim().toLowerCase();
    const cleanDigits = email.trim().replace(/\D/g, '');
    const users = getUsers();
    
    // Match by either email OR mobile phone number
    const user = users.find(u => {
      if (u.email && u.email.toLowerCase() === inputKey) return true;
      if (cleanDigits && cleanDigits.length >= 7 && u.phone) {
        const userDigits = u.phone.replace(/\D/g, '');
        if (userDigits.endsWith(cleanDigits) || cleanDigits.endsWith(userDigits)) return true;
      }
      return false;
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'આ ઇમેઇલ અથવા મોબાઇલ નંબર સાથે કોઈ એકાઉન્ટ મળ્યું નથી.' });
    }

    // Verify password
    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return res.status(401).json({ success: false, error: 'ખોટો પાસવર્ડ! કૃપા કરીને ફરી પ્રયાસ કરો.' });
    }

    // Create session token
    const token = `tok_${crypto.randomBytes(32).toString('hex')}`;
    const sessions = getSessions();
    sessions[token] = {
      userId: user.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
    };
    saveSessions(sessions);

    console.log(`🔑 [Auth] User logged in: ${user.name} (${user.email})`);

    res.json({
      success: true,
      message: `સ્વાગત છે, ${user.name}!`,
      token,
      user: sanitizeUser(user)
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'સર્વર એરર: લોગિન નિષ્ફળ રહ્યું.' });
  }
});

// 3. GET CURRENT LOGGED-IN USER PROFILE
router.get('/me', authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: sanitizeUser(req.user)
  });
});

// 4. LOGOUT
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : req.body.token;

  if (token) {
    const sessions = getSessions();
    delete sessions[token];
    saveSessions(sessions);
  }

  res.json({ success: true, message: 'સફળતાપૂર્વક Logout થઈ ગયા છો.' });
});

// 5. USE REEL CREDIT (Deduct 1 credit on generation)
router.post('/use-credit', authMiddleware, (req, res) => {
  const users = getUsers();
  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  // Pro users have unlimited credits
  if (user.plan === 'pro') {
    return res.json({ success: true, unlimited: true, credits: user.credits });
  }

  if (user.credits <= 0) {
    return res.status(403).json({
      success: false,
      error: 'તમારી મફત રીલ્સ ક્રેડિટ્સ પૂર્ણ થઈ ગઈ છે. વધુ રીલ્સ બનાવવા માટે Pro પ્લાન અપગ્રેડ કરો.',
      creditsExhausted: true
    });
  }

  user.credits -= 1;
  saveUsers(users);

  res.json({
    success: true,
    creditsRemaining: user.credits,
    message: `૧ ક્રેડિટ વપરાઈ. બાકી ક્રેડિટ: ${user.credits}`
  });
});

// 6. CONNECT INSTAGRAM (1-Click or Custom OAuth)
router.post('/social/connect-instagram', authMiddleware, async (req, res) => {
  try {
    const { token, usePreset } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let finalToken = token;
    let finalPageId = '';
    let finalUserId = '';
    let finalUsername = '';
    let pageName = 'Instagram Business Page';

    if (usePreset || !token) {
      // Connect to Verified Studio Account
      finalToken = process.env.META_INSTAGRAM_TOKEN;
      finalPageId = process.env.META_INSTAGRAM_PAGE_ID || '1320416261160842';
      finalUserId = process.env.META_INSTAGRAM_USER_ID || '17841440190157378';
      finalUsername = 'patola_heritage';
      pageName = 'Patola Heritage Studio';
    } else {
      // Validate Custom Provided Token with Meta Graph API
      try {
        const meRes = await fetch(`https://graph.facebook.com/v20.0/me?fields=id,name&access_token=${finalToken}`).then(r => r.json());
        if (meRes.error) {
          return res.status(400).json({ success: false, error: `Meta Error: ${meRes.error.message}` });
        }
        pageName = meRes.name;

        // Query accounts for linked Instagram Business Profile
        const accRes = await fetch(`https://graph.facebook.com/v20.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=${finalToken}`).then(r => r.json());
        if (accRes.data && accRes.data.length > 0) {
          const matched = accRes.data.find(p => p.instagram_business_account?.id) || accRes.data[0];
          finalPageId = matched.id;
          if (matched.instagram_business_account) {
            finalUserId = matched.instagram_business_account.id;
            finalUsername = matched.instagram_business_account.username || '';
          }
          if (matched.access_token) {
            finalToken = matched.access_token; // Upgrade to permanent page token
          }
        }
      } catch (err) {
        return res.status(400).json({ success: false, error: `ઇન્સ્ટાગ્રામ ચકાસણી નિષ્ફળ: ${err.message}` });
      }
    }

    if (!user.social) user.social = {};
    user.social.instagram = {
      connected: true,
      username: finalUsername || 'Connected Page',
      pageName,
      pageId: finalPageId,
      userId: finalUserId,
      token: finalToken,
      connectedAt: new Date().toISOString()
    };

    saveUsers(users);
    console.log(`📸 [Social Connect] User ${user.name} linked Instagram: @${user.social.instagram.username}`);

    res.json({
      success: true,
      message: `🎉 Instagram એકાઉન્ટ (${pageName}) ૧-ક્લિકમાં સફળતાપૂર્વક કનેક્ટ થઈ ગયું!`,
      instagram: user.social.instagram
    });
  } catch (err) {
    console.error('Connect Instagram error:', err);
    res.status(500).json({ success: false, error: 'ઇન્સ્ટાગ્રામ કનેક્ટ કરવામાં ભૂલ આવી.' });
  }
});

// 7. CONNECT YOUTUBE (1-Click or Custom)
router.post('/social/connect-youtube', authMiddleware, async (req, res) => {
  try {
    const { usePreset, refreshToken } = req.body;
    const users = getUsers();
    const user = users.find(u => u.id === req.user.id);

    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    let finalRefresh = refreshToken || process.env.YOUTUBE_REFRESH_TOKEN;
    let channelTitle = 'Patola Reels & Shorts Channel';

    if (!user.social) user.social = {};
    user.social.youtube = {
      connected: true,
      channelTitle,
      refreshToken: finalRefresh,
      connectedAt: new Date().toISOString()
    };

    saveUsers(users);
    console.log(`🎥 [Social Connect] User ${user.name} linked YouTube: ${channelTitle}`);

    res.json({
      success: true,
      message: `🎉 YouTube Shorts ચેનલ (${channelTitle}) સફળતાપૂર્વક કનેક્ટ થઈ ગઈ!`,
      youtube: user.social.youtube
    });
  } catch (err) {
    console.error('Connect YouTube error:', err);
    res.status(500).json({ success: false, error: 'YouTube કનેક્ટ કરવામાં ભૂલ આવી.' });
  }
});

// 8. DISCONNECT SOCIAL ACCOUNT
router.post('/social/disconnect', authMiddleware, (req, res) => {
  const { platform } = req.body;
  const users = getUsers();
  const user = users.find(u => u.id === req.user.id);

  if (!user || !user.social) {
    return res.json({ success: true });
  }

  if (platform === 'instagram') {
    user.social.instagram = { connected: false };
  } else if (platform === 'youtube') {
    user.social.youtube = { connected: false };
  }

  saveUsers(users);
  res.json({ success: true, message: `${platform} ડિસ્કનેક્ટ થઈ ગયું છે.` });
});


// Export router and helpers
module.exports = {
  authRouter: router,
  authMiddleware,
  optionalAuth,
  getUsers,
  saveUsers,
  sanitizeUser
};
