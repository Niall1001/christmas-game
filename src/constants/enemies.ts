import { EnemyType, BossType } from '../types';

// Pool of enemy images for random selection
export const ENEMY_IMAGE_POOL = [
  '/src/images/game-enemies/012d393cc7f2a7cb.png',
  '/src/images/game-enemies/142757abe011ad7d.png',
  '/src/images/game-enemies/3a1a27a461804813.png',
  '/src/images/game-enemies/4af7a997c8198282.png',
  '/src/images/game-enemies/4ebb3009152baae9.png',
  '/src/images/game-enemies/51b77fe8edcd1497.png',
  '/src/images/game-enemies/59a5222efbcd8246.png',
  '/src/images/game-enemies/5fc7226f7cd47d8d.png',
  '/src/images/game-enemies/73969fdbe01711a3.png',
  '/src/images/game-enemies/798449035ef9f78c.png',
  '/src/images/game-enemies/7ce8afc9f71aadcd.png',
  '/src/images/game-enemies/7ea67bb585f2d2bd.png',
  '/src/images/game-enemies/888105e5d197dad6.png',
  '/src/images/game-enemies/8a84f55dffa25d2c.png',
  '/src/images/game-enemies/abbecb277ba575af.png',
  '/src/images/game-enemies/aea27eda19cd0f8e.png',
  '/src/images/game-enemies/d6ffa1297ad563ca.png',
  '/src/images/game-enemies/ddf27f322f0a96bb.png',
  '/src/images/game-enemies/e01951a7dbbdc6ad.png',
  '/src/images/game-enemies/e18abd9926160679.png',
  '/src/images/game-enemies/ea0196265555b63f.png'
];

export const ENEMY_TYPES: Record<string, EnemyType> = {
  intern: {
    name: 'Intern',
    color: '#EF4444',
    speed: 1.8,
    health: 40,
    size: 14,
    damage: 8,
    scoreValue: 10,
    xpValue: 5,
    type: 'intern',
    emoji: '🙋'
  },
  manager: {
    name: 'Micromanager',
    color: '#F97316',
    speed: 2.8,
    health: 25,
    size: 12,
    damage: 5,
    scoreValue: 15,
    xpValue: 4,
    type: 'manager',
    emoji: '👔'
  },
  accountant: {
    name: 'Accountant',
    color: '#8B5CF6',
    speed: 1.0,
    health: 120,
    size: 22,
    damage: 15,
    scoreValue: 35,
    xpValue: 12,
    type: 'accountant',
    emoji: '💼'
  },
  emailer: {
    name: 'Email Spammer',
    color: '#3B82F6',
    speed: 1.2,
    health: 35,
    size: 15,
    damage: 7,
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
    speed: 2.2,
    health: 30,
    size: 13,
    damage: 4,
    scoreValue: 20,
    xpValue: 6,
    type: 'angry_client',
    explosionRadius: 90,
    explosionDamage: 25,
    emoji: '😡'
  },
  salesperson: {
    name: 'Salesperson',
    color: '#EC4899',
    speed: 4.0,
    health: 18,
    size: 10,
    damage: 4,
    scoreValue: 12,
    xpValue: 3,
    type: 'salesperson',
    emoji: '💁'
  },
  teleporter: {
    name: 'IT Support',
    color: '#06B6D4',
    speed: 1.5,
    health: 45,
    size: 14,
    damage: 10,
    scoreValue: 30,
    xpValue: 10,
    type: 'teleporter',
    teleportCooldown: 0,
    emoji: '🔧'
  },
  shielded: {
    name: 'Security Guard',
    color: '#10B981',
    speed: 1.2,
    health: 80,
    size: 18,
    damage: 12,
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
    speed: 0.8,
    health: 60,
    size: 16,
    damage: 5,
    scoreValue: 50,
    xpValue: 20,
    type: 'summoner',
    summonCooldown: 0,
    emoji: '👨‍💼'
  }
};

export const BOSS_TYPES: BossType[] = [
  {
    name: 'The CEO',
    color: '#DC2626',
    emoji: '👑',
    health: 1000,
    damage: 35,
    speed: 1.0,
    size: 55,
    scoreValue: 800,
    xpValue: 200,
    pattern: 'circle_shot',
    imagePath: '/src/images/boss_ceo.png'
  },
  {
    name: 'The Auditor',
    color: '#7C3AED',
    emoji: '🔍',
    health: 1200,
    damage: 30,
    speed: 0.8,
    size: 60,
    scoreValue: 1000,
    xpValue: 250,
    pattern: 'spiral',
    imagePath: '/src/images/boss2.png'
  },
  {
    name: 'The Consultant',
    color: '#0891B2',
    emoji: '📊',
    health: 900,
    damage: 40,
    speed: 1.3,
    size: 50,
    scoreValue: 900,
    xpValue: 225,
    pattern: 'charge',
    imagePath: '/src/images/boss3.png'
  },
  {
    name: 'The Director',
    color: '#F59E0B',
    emoji: '😎',
    health: 1100,
    damage: 38,
    speed: 1.1,
    size: 58,
    scoreValue: 950,
    xpValue: 240,
    pattern: 'spiral',
    imagePath: '/src/images/boss_director.png'
  }
];
