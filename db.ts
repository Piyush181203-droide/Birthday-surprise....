import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Surprise, AdminUser } from '../src/types/surprise.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const UPLOADS_DIR = path.resolve(process.cwd(), 'uploads');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, actualSalt, 64).toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const computed = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(computed, 'hex'));
}

interface DatabaseSchema {
  admin: AdminUser;
  surprises: Surprise[];
}

const defaultAdminUsername = process.env.ADMIN_USERNAME || 'heysweety';
const defaultAdminPassword = process.env.ADMIN_PASSWORD || '968526';
const initialAdminSalt = crypto.randomBytes(16).toString('hex');
const initialAdminHash = crypto.scryptSync(defaultAdminPassword, initialAdminSalt, 64).toString('hex');

const initialSurprise: Surprise = {
  id: 'demo-surprise-001',
  slug: 'for-priya',
  recipientName: 'Priya',
  isPublished: true,
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
        id: 'slide-1',
        imageUrl: '',
        caption: 'The day we laughed until our stomachs hurt. You light up every room you walk into.',
        order: 1,
        duration: 6,
      },
      {
        id: 'slide-2',
        imageUrl: '',
        caption: 'Quiet evenings, long conversations, and moments where time seemed to stand completely still.',
        order: 2,
        duration: 6,
      },
      {
        id: 'slide-3',
        imageUrl: '',
        caption: 'Your courage, kindness, and gentle smile remind me daily of what truly matters in life.',
        order: 3,
        duration: 6,
      },
      {
        id: 'slide-4',
        imageUrl: '',
        caption: 'To countless more spontaneous adventures, midnight conversations, and golden sunsets.',
        order: 4,
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
    question: 'Kya tum janti ho tum meri zindagi mein kitni zaroori ho?',
    answerYesLabel: 'Haa.. ❤️',
    answerNoLabel: 'Naii.. 🙈',
    answerYesResponse: 'Achha ji, pehle thoda aur soch lo! 😜 Itna aasan nahi hai!',
    actionThatOpensLetter: 'no',
    envelopeStyle: 'rose_seal',
    letterContent: `Meri sabse pyaari Priya,\n\nAaj ka din mere liye saal ka sabse khaas din hai, kyunki aaj ke din tum is duniya mein aayi thi. Tumhari muskurahat mere sabse thake hue din ko bhi roshan kar deti hai.\n\nHar vo choti baat—tumhara bewajah hasna, tumhari pyari baatein, aur tumhara mera itna khayaal rakhna—meri zindagi ka sabse khoobsurat hissa hai.\n\nMay this year bring you as much happiness, warmth, and peace as you bring to everyone around you. Always stay the radiant, kind-hearted soul that you are.\n\nHappy Birthday, with all my love! ❤️`,
    songUrl: '/audio/gentle-piano.wav',
    songTitle: 'Romantic Ambient Chimes',
    trimStart: 4,
    trimEnd: 20,
  },
  page5: {
    heading: 'HAPPY BIRTHDAY',
    recipientName: 'Priya',
    finalMessage: 'Wishing you endless happiness, boundless dreams, and a year full of love ❤️',
    bouquetStyle: 'luxury_roses',
    galleryLayout: 'collage',
    songUrl: '/audio/happy-birthday.wav',
    songTitle: 'Celebration Finale Theme',
    trimStart: 0,
    trimEnd: 20,
  },
};

function readDb(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const initialData: DatabaseSchema = {
      admin: {
        id: 'admin-1',
        username: defaultAdminUsername,
        passwordHash: initialAdminHash,
        salt: initialAdminSalt,
        createdAt: new Date().toISOString(),
      },
      surprises: [initialSurprise],
    };
    writeDb(initialData);
    return initialData;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading db.json, returning empty structure', err);
    return {
      admin: {
        id: 'admin-1',
        username: defaultAdminUsername,
        passwordHash: initialAdminHash,
        salt: initialAdminSalt,
        createdAt: new Date().toISOString(),
      },
      surprises: [],
    };
  }
}

function writeDb(data: DatabaseSchema): void {
  const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

// Public API
export const db = {
  getAdmin(): AdminUser {
    return readDb().admin;
  },

  updateAdminPassword(newPasswordHash: string, newSalt: string): void {
    const current = readDb();
    current.admin.passwordHash = newPasswordHash;
    current.admin.salt = newSalt;
    writeDb(current);
  },

  listSurprises(): Surprise[] {
    return readDb().surprises;
  },

  getSurpriseById(id: string): Surprise | undefined {
    return readDb().surprises.find(s => s.id === id);
  },

  getSurpriseBySlug(slug: string): Surprise | undefined {
    return readDb().surprises.find(s => s.slug === slug);
  },

  saveSurprise(surprise: Surprise): Surprise {
    const current = readDb();
    const existingIndex = current.surprises.findIndex(s => s.id === surprise.id);
    surprise.updatedAt = new Date().toISOString();
    if (existingIndex >= 0) {
      current.surprises[existingIndex] = surprise;
    } else {
      current.surprises.unshift(surprise);
    }
    writeDb(current);
    return surprise;
  },

  deleteSurprise(id: string): boolean {
    const current = readDb();
    const initialLen = current.surprises.length;
    current.surprises = current.surprises.filter(s => s.id !== id);
    if (current.surprises.length !== initialLen) {
      writeDb(current);
      return true;
    }
    return false;
  },
};
