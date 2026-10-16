import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { db, verifyPassword, hashPassword } from './server/db.js';
import { Surprise } from './src/types/surprise.js';

const app = express();
const port = 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Also serve public audio folder
const publicAudioDir = path.resolve(process.cwd(), 'public/audio');
if (fs.existsSync(publicAudioDir)) {
  app.use('/audio', express.static(publicAudioDir));
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    cb(null, `${path.basename(sanitized, ext)}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30 MB max
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/webp', 'image/gif',
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/m4a', 'audio/aac'
    ];
    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp|gif|mp3|wav|ogg|m4a)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Only standard image and audio files are permitted.'));
    }
  },
});

// Active admin sessions tokens
const sessions = new Map<string, { username: string; expiresAt: number }>();

function generateSessionToken(username: string): string {
  const token = crypto.randomBytes(32).toString('hex');
  // 7 days expiration
  const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  sessions.set(token, { username, expiresAt });
  return token;
}

// Open admin middleware (username and password requirement removed per user request)
function requireAdmin(_req: Request, _res: Response, next: NextFunction): void {
  next();
}

// ==================
// AUTH API
// ==================
app.post('/api/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password are required' });
    return;
  }

  const admin = db.getAdmin();
  if (admin.username !== username) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  const isValid = verifyPassword(password, admin.passwordHash, admin.salt);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }

  const token = generateSessionToken(admin.username);
  res.json({ token, username: admin.username });
});

app.post('/api/admin/logout', requireAdmin, (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    sessions.delete(token);
  }
  res.json({ success: true });
});

app.get('/api/admin/me', requireAdmin, (req: Request, res: Response) => {
  const token = req.headers.authorization!.split(' ')[1];
  const session = sessions.get(token);
  res.json({ username: session?.username });
});

app.post('/api/admin/change-password', requireAdmin, (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const admin = db.getAdmin();
  if (!verifyPassword(currentPassword, admin.passwordHash, admin.salt)) {
    res.status(400).json({ error: 'Current password does not match.' });
    return;
  }

  const { hash, salt } = hashPassword(newPassword);
  db.updateAdminPassword(hash, salt);
  res.json({ success: true, message: 'Password updated successfully' });
});

// ==================
// ADMIN SURPRISE CRUD
// ==================
app.get('/api/admin/surprises', requireAdmin, (_req: Request, res: Response) => {
  const surprises = db.listSurprises();
  res.json(surprises);
});

app.get('/api/admin/surprises/:id', requireAdmin, (req: Request, res: Response) => {
  const surprise = db.getSurpriseById(req.params.id);
  if (!surprise) {
    res.status(404).json({ error: 'Surprise not found' });
    return;
  }
  res.json(surprise);
});

app.post('/api/admin/surprises', requireAdmin, (req: Request, res: Response) => {
  const { recipientName, slug } = req.body;
  if (!recipientName) {
    res.status(400).json({ error: 'Recipient name is required' });
    return;
  }

  const generatedSlug = (slug || `${recipientName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomBytes(3).toString('hex')}`).trim();
  
  // Ensure unique slug
  const existing = db.getSurpriseBySlug(generatedSlug);
  if (existing) {
    res.status(400).json({ error: 'Slug is already in use. Please choose another unique URL slug.' });
    return;
  }

  const newSurprise: Surprise = {
    id: `surprise-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    slug: generatedSlug,
    recipientName: recipientName.trim(),
    isPublished: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    page1: {
      headline: 'This surprise is only for you ❤️',
      subtext: 'Every moment with you is a memory worth celebrating.',
      buttonText: 'Continue to Your Surprise ✨',
      songUrl: '/audio/gentle-piano.wav',
      songTitle: 'Gentle Acoustic Piano Theme',
      trimStart: 0,
      trimEnd: 18,
      ambientGlow: 'romantic_pink',
    },
    page2: {
      title: 'Our Beautiful Memories Together',
      songUrl: '/audio/gentle-piano.wav',
      songTitle: 'Acoustic Memories Melody',
      trimStart: 2,
      trimEnd: 22,
      autoPlayInterval: 6,
      slides: [
        {
          id: `slide-${Date.now()}-1`,
          imageUrl: '',
          caption: 'A wonderful moment that always brings a smile.',
          order: 1,
          duration: 6,
        },
      ],
    },
    page3: {
      title: 'Make a Wish ✨',
      instruction: 'Take a deep breath and blow out your candles!',
      wishGrantedText: 'Your wish is waiting to come true ✨',
      candleCount: 3,
      cakeStyle: 'velvet',
      songUrl: '/audio/happy-birthday.wav',
      songTitle: 'Happy Birthday Music Box',
      trimStart: 0,
      trimEnd: 21,
      micBlowSensitivity: 0.15,
    },
    page4: {
      heading: 'Ek chhota sa sawaal tumhare liye 💌',
      question: 'Kya tum janti ho tum kitni khaas ho?',
      answerYesLabel: 'Haa.. ❤️',
      answerNoLabel: 'Naii.. 🙈',
      answerYesResponse: 'Achha ji, pehle thoda aur soch lo! 😜',
      actionThatOpensLetter: 'no',
      envelopeStyle: 'rose_seal',
      letterContent: `Dear ${recipientName.trim()},\n\nWishing you the happiest birthday filled with joy and laughter. May all your dreams come true this year! ❤️`,
      songUrl: '/audio/gentle-piano.wav',
      songTitle: 'Romantic Ambient Chimes',
      trimStart: 0,
      trimEnd: 20,
    },
    page5: {
      heading: 'HAPPY BIRTHDAY',
      recipientName: recipientName.trim(),
      finalMessage: 'Wishing you endless happiness and beautiful memories ❤️',
      bouquetStyle: 'luxury_roses',
      galleryLayout: 'collage',
      songUrl: '/audio/happy-birthday.wav',
      songTitle: 'Celebration Finale Theme',
      trimStart: 0,
      trimEnd: 20,
    },
  };

  const saved = db.saveSurprise(newSurprise);
  res.status(201).json(saved);
});

app.put('/api/admin/surprises/:id', requireAdmin, (req: Request, res: Response) => {
  const id = req.params.id;
  const existing = db.getSurpriseById(id);
  if (!existing) {
    res.status(404).json({ error: 'Surprise not found' });
    return;
  }

  const updatedData: Surprise = {
    ...existing,
    ...req.body,
    id, // preserve immutable ID
  };

  // If slug changed, verify uniqueness
  if (updatedData.slug !== existing.slug) {
    const slugCollision = db.getSurpriseBySlug(updatedData.slug);
    if (slugCollision && slugCollision.id !== id) {
      res.status(400).json({ error: 'The specified URL slug is already taken by another surprise.' });
      return;
    }
  }

  const saved = db.saveSurprise(updatedData);
  res.json(saved);
});

app.delete('/api/admin/surprises/:id', requireAdmin, (req: Request, res: Response) => {
  const success = db.deleteSurprise(req.params.id);
  if (!success) {
    res.status(404).json({ error: 'Surprise not found' });
    return;
  }
  res.json({ success: true });
});

app.post('/api/admin/surprises/:id/toggle-publish', requireAdmin, (req: Request, res: Response) => {
  const surprise = db.getSurpriseById(req.params.id);
  if (!surprise) {
    res.status(404).json({ error: 'Surprise not found' });
    return;
  }
  surprise.isPublished = !surprise.isPublished;
  const saved = db.saveSurprise(surprise);
  res.json({ isPublished: saved.isPublished, slug: saved.slug });
});

// ==================
// FILE UPLOAD API
// ==================
app.post('/api/admin/upload', requireAdmin, upload.single('file'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded or file format rejected' });
    return;
  }

  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: fileUrl,
    filename: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// ==================
// PUBLIC RECIPIENT API
// ==================
app.get('/api/public/surprise/:slug', (req: Request, res: Response) => {
  const slug = req.params.slug;
  const surprise = db.getSurpriseBySlug(slug);

  // CRITICAL SECURITY RULE: Recipients can ONLY access published surprises.
  // Drafts, private admin settings, and other surprises must remain inaccessible.
  if (!surprise || !surprise.isPublished) {
    res.status(404).json({
      error: 'This surprise link is either private, unpublished, or has not been created yet.',
    });
    return;
  }

  // Return only recipient-safe surprise payload (no private system secrets)
  res.json(surprise);
});

// ==================
// FRONTEND SERVING
// ==================
async function startServer() {
  if (!isProduction) {
    // Development mode: Vite middleware
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve dist
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Velvet Moments Birthday Server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
