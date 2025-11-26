import { EnemyType, BossType } from '../types';

// Pool of enemy images for random selection
export const ENEMY_IMAGE_POOL = [
  '/images/game-enemies/012d393cc7f2a7cb.png',
  '/images/game-enemies/142757abe011ad7d.png',
  '/images/game-enemies/3a1a27a461804813.png',
  '/images/game-enemies/4af7a997c8198282.png',
  '/images/game-enemies/4ebb3009152baae9.png',
  '/images/game-enemies/51b77fe8edcd1497.png',
  '/images/game-enemies/59a5222efbcd8246.png',
  '/images/game-enemies/5fc7226f7cd47d8d.png',
  '/images/game-enemies/73969fdbe01711a3.png',
  '/images/game-enemies/798449035ef9f78c.png',
  '/images/game-enemies/7ce8afc9f71aadcd.png',
  '/images/game-enemies/7ea67bb585f2d2bd.png',
  '/images/game-enemies/888105e5d197dad6.png',
  '/images/game-enemies/8a84f55dffa25d2c.png',
  '/images/game-enemies/abbecb277ba575af.png',
  '/images/game-enemies/aea27eda19cd0f8e.png',
  '/images/game-enemies/d6ffa1297ad563ca.png',
  '/images/game-enemies/ddf27f322f0a96bb.png',
  '/images/game-enemies/e01951a7dbbdc6ad.png',
  '/images/game-enemies/e18abd9926160679.png',
  '/images/game-enemies/ea0196265555b63f.png'
];

// Projectile configuration for each enemy type - themed sprites with varied speeds
export const PROJECTILE_CONFIG: Record<string, {
  imagePath: string;
  speed: number;
  size: number;
  trailColor: string;
  glowColor: string;
}> = {
  intern: { imagePath: '/images/projectile/cofee-cup.png', speed: 5, size: 12, trailColor: '#EF4444', glowColor: '#EF4444' },
  manager: { imagePath: '/images/projectile/sitcky-note.png', speed: 7, size: 10, trailColor: '#F97316', glowColor: '#F97316' },
  accountant: { imagePath: '/images/projectile/sitcky-note.png', speed: 3, size: 16, trailColor: '#8B5CF6', glowColor: '#8B5CF6' },
  emailer: { imagePath: '/images/projectile/email.png', speed: 6, size: 14, trailColor: '#3B82F6', glowColor: '#3B82F6' },
  teleporter: { imagePath: '/images/projectile/office-chair.png', speed: 5, size: 12, trailColor: '#06B6D4', glowColor: '#06B6D4' },
  shielded: { imagePath: '/images/projectile/office-chair.png', speed: 4, size: 12, trailColor: '#10B981', glowColor: '#10B981' },
  summoner: { imagePath: '/images/projectile/sitcky-note.png', speed: 5, size: 14, trailColor: '#A855F7', glowColor: '#A855F7' },
  circler: { imagePath: '/images/projectile/office-chair.png', speed: 5, size: 11, trailColor: '#F472B6', glowColor: '#F472B6' },
  charger: { imagePath: '/images/projectile/cofee-cup.png', speed: 4, size: 13, trailColor: '#92400E', glowColor: '#92400E' },
  retreater: { imagePath: '/images/projectile/email.png', speed: 9, size: 10, trailColor: '#0EA5E9', glowColor: '#0EA5E9' },
  boss: { imagePath: '/images/projectile/office-chair.png', speed: 5, size: 18, trailColor: '#DC2626', glowColor: '#DC2626' },
  default: { imagePath: '/images/projectile/sitcky-note.png', speed: 6, size: 12, trailColor: '#EF4444', glowColor: '#EF4444' }
};

export const ENEMY_TYPES: Record<string, EnemyType> = {
  intern: {
    name: 'Intern',
    color: '#EF4444',
    speed: 1.4,
    health: 60, // Increased from 40 (+50%)
    size: 26,
    damage: 6,
    scoreValue: 10,
    xpValue: 5,
    type: 'intern',
    emoji: '🙋'
  },
  manager: {
    name: 'Micromanager',
    color: '#F97316',
    speed: 2.2,
    health: 38, // Increased from 25 (+52%)
    size: 22,
    damage: 4,
    scoreValue: 15,
    xpValue: 4,
    type: 'manager',
    emoji: '👔'
  },
  accountant: {
    name: 'Accountant',
    color: '#8B5CF6',
    speed: 0.8,
    health: 180, // Increased from 120 (+50%)
    size: 38,
    damage: 11,
    scoreValue: 35,
    xpValue: 12,
    type: 'accountant',
    emoji: '💼'
  },
  emailer: {
    name: 'Email Spammer',
    color: '#3B82F6',
    speed: 1.0,
    health: 53, // Increased from 35 (+51%)
    size: 27,
    damage: 5,
    scoreValue: 25,
    xpValue: 8,
    type: 'emailer',
    shootCooldown: 0,
    shootRange: 300,
    emoji: '📧'
  },
  angry_client: {
    name: 'Angry Client',
    color: '#EAB308',
    speed: 1.8,
    health: 45, // Increased from 30 (+50%)
    size: 24,
    damage: 3,
    scoreValue: 20,
    xpValue: 6,
    type: 'angry_client',
    explosionRadius: 90,
    explosionDamage: 15,
    emoji: '😡'
  },
  salesperson: {
    name: 'Salesperson',
    color: '#EC4899',
    speed: 3.2,
    health: 28, // Increased from 18 (+56%)
    size: 19,
    damage: 3,
    scoreValue: 12,
    xpValue: 3,
    type: 'salesperson',
    emoji: '💁'
  },
  teleporter: {
    name: 'IT Support',
    color: '#06B6D4',
    speed: 1.2,
    health: 68, // Increased from 45 (+51%)
    size: 26,
    damage: 7,
    scoreValue: 30,
    xpValue: 10,
    type: 'teleporter',
    teleportCooldown: 0,
    emoji: '🔧'
  },
  shielded: {
    name: 'Security Guard',
    color: '#10B981',
    speed: 1.0,
    health: 120, // Increased from 80 (+50%)
    size: 32,
    damage: 8,
    scoreValue: 40,
    xpValue: 15,
    type: 'shielded',
    shield: 3,
    hasShield: true,
    emoji: '🛡️'
  },
  summoner: {
    name: 'Team Lead',
    color: '#A855F7',
    speed: 0.6,
    health: 90, // Increased from 60 (+50%)
    size: 30,
    damage: 4,
    scoreValue: 50,
    xpValue: 20,
    type: 'summoner',
    summonCooldown: 0,
    emoji: '👨‍💼'
  },
  // NEW UNIQUE BEHAVIOR ENEMIES
  circler: {
    name: 'HR Rep',
    color: '#F472B6',
    speed: 2.0,
    health: 55,
    size: 24,
    damage: 5,
    scoreValue: 30,
    xpValue: 10,
    type: 'circler',
    shootCooldown: 0,
    orbitAngle: 0,
    orbitDistance: 180,
    emoji: '💅'
  },
  charger: {
    name: 'Coffee Runner',
    color: '#92400E',
    speed: 1.0,
    health: 70,
    size: 22,
    damage: 12, // High contact damage
    scoreValue: 25,
    xpValue: 8,
    type: 'charger',
    chargeCooldown: 0,
    isCharging: false,
    chargeSpeed: 8,
    emoji: '☕'
  },
  retreater: {
    name: 'Remote Worker',
    color: '#0EA5E9',
    speed: 1.5,
    health: 40,
    size: 23,
    damage: 4,
    scoreValue: 28,
    xpValue: 9,
    type: 'retreater',
    shootCooldown: 0,
    preferredDistance: 280,
    emoji: '🏠'
  },
  zigzagger: {
    name: 'Caffeinated Intern',
    color: '#84CC16',
    speed: 2.8,
    health: 35,
    size: 20,
    damage: 5,
    scoreValue: 18,
    xpValue: 6,
    type: 'zigzagger',
    zigzagTimer: 0,
    zigzagDirection: 1,
    emoji: '🤪'
  },
  splitter: {
    name: 'Project Manager',
    color: '#F59E0B',
    speed: 1.2,
    health: 100,
    size: 34,
    damage: 6,
    scoreValue: 45,
    xpValue: 15,
    type: 'splitter',
    splitCount: 3,
    emoji: '📋'
  }
};

export const BOSS_TYPES: BossType[] = [
  {
    name: 'The CEO',
    color: '#DC2626',
    emoji: '👑',
    health: 2200, // Increased from 1000 (120% increase)
    damage: 25,
    speed: 0.8,
    size: 78,
    scoreValue: 800,
    xpValue: 200,
    pattern: 'circle_shot',
    imagePath: '/images/boss_ceo.png'
  },
  {
    name: 'The Auditor',
    color: '#7C3AED',
    emoji: '🔍',
    health: 2600, // Increased from 1200 (117% increase)
    damage: 21,
    speed: 0.6,
    size: 85,
    scoreValue: 1000,
    xpValue: 250,
    pattern: 'spiral',
    imagePath: '/images/boss2.png'
  },
  {
    name: 'The Consultant',
    color: '#0891B2',
    emoji: '📊',
    health: 2000, // Increased from 900 (122% increase)
    damage: 28,
    speed: 1.0,
    size: 72,
    scoreValue: 900,
    xpValue: 225,
    pattern: 'charge',
    imagePath: '/images/boss3.png'
  },
  {
    name: 'The Director',
    color: '#F59E0B',
    emoji: '😎',
    health: 2400, // Increased from 1100 (118% increase)
    damage: 27,
    speed: 0.9,
    size: 82,
    scoreValue: 950,
    xpValue: 240,
    pattern: 'spiral',
    imagePath: '/images/boss_director.png'
  },
  {
    name: 'The President',
    color: '#DB2777',
    emoji: '💼',
    health: 2300, // Increased from 1050 (119% increase)
    damage: 24,
    speed: 0.85,
    size: 80,
    scoreValue: 875,
    xpValue: 220,
    pattern: 'circle_shot',
    imagePath: '/images/boss1.png'
  }
];

// Twin Final Bosses - Ultimate Challenge
export const FINAL_TWIN_BOSSES: BossType[] = [
  {
    name: 'The First Founder',
    color: '#DC2626',
    emoji: '👔',
    health: 25000, // EXTREME HP - harder than any scaled boss
    damage: 85, // Devastating contact damage
    speed: 1.8, // Very fast - hard to kite
    size: 100,
    scoreValue: 20000, // 4x score reward
    xpValue: 3500, // Massive XP reward
    pattern: 'teleport_assault',
    imagePath: '/images/game-enemies/888105e5d197dad6.png',
    isFinalBoss: true,
    twinId: 'twin1'
  },
  {
    name: 'The Second Founder',
    color: '#7C3AED',
    emoji: '💼',
    health: 25000, // EXTREME HP - harder than any scaled boss
    damage: 85, // Devastating contact damage
    speed: 1.8, // Very fast - hard to kite
    size: 100,
    scoreValue: 20000, // 4x score reward
    xpValue: 3500, // Massive XP reward
    pattern: 'teleport_assault',
    imagePath: '/images/game-enemies/ea0196265555b63f.png',
    isFinalBoss: true,
    twinId: 'twin2'
  }
];
