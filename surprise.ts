export interface PhotoSlide {
  id: string;
  imageUrl: string;
  caption: string;
  order: number;
  duration: number; // in seconds
}

export interface Page1Config {
  headline: string;
  subtext?: string;
  buttonText: string;
  songUrl?: string;
  songTitle?: string;
  trimStart?: number;
  trimEnd?: number;
  ambientGlow?: 'romantic_pink' | 'royal_purple' | 'midnight_rose';
}

export interface Page2Config {
  title?: string;
  slides: PhotoSlide[];
  songUrl?: string;
  songTitle?: string;
  trimStart?: number;
  trimEnd?: number;
  autoPlayInterval?: number; // fallback slide interval
}

export interface Page3Config {
  title: string;
  instruction: string;
  wishGrantedText: string;
  candleCount: number;
  cakeStyle: 'chocolate' | 'strawberry' | 'velvet' | 'confetti';
  songUrl?: string; // defaults to /audio/happy-birthday.wav
  songTitle?: string;
  trimStart?: number;
  trimEnd?: number;
  micBlowSensitivity: number; // 0.05 to 0.4
}

export interface Page4Config {
  heading: string;
  question: string;
  answerYesLabel: string;
  answerNoLabel: string;
  answerYesResponse: string;
  actionThatOpensLetter: 'no' | 'yes'; // default 'no'
  envelopeStyle: 'crimson_wax' | 'golden_wax' | 'rose_seal';
  letterContent: string;
  songUrl?: string;
  songTitle?: string;
  trimStart?: number;
  trimEnd?: number;
  photos?: string[];
}

export interface Page5Config {
  heading: string;
  recipientName: string;
  finalMessage: string;
  bouquetStyle: 'luxury_roses' | 'peony_dream' | 'lavender_bliss';
  bouquetImageUrl?: string;
  photos?: string[];
  galleryLayout: 'collage' | 'slideshow' | 'none';
  songUrl?: string;
  songTitle?: string;
  trimStart?: number;
  trimEnd?: number;
}

export interface Surprise {
  id: string;
  slug: string;
  recipientName: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  page1: Page1Config;
  page2: Page2Config;
  page3: Page3Config;
  page4: Page4Config;
  page5: Page5Config;
}

export interface AdminUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  username: string;
  expiresAt: number;
}
