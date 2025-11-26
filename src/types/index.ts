// Particle system types
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  alpha?: number;
  type?: 'normal' | 'trail' | 'explosion' | 'spark';
}

// Character class types
export interface CharacterStats {
  maxHealth: number;
  speed: number;
  damageMultiplier: number;
  shootSpeed: number;
  projectileSize: number;
  range: number;
}

export interface CharacterAbility {
  name: string;
  icon: string;
  cooldown: number;
  description: string;
}

export interface CharacterClass {
  name: string;
  icon: string;
  emoji: string;
  description: string;
  color: string;
  startingStats: CharacterStats;
  weaponType: 'melee' | 'ranged' | 'magic';
  ability: CharacterAbility;
}

// Enemy types
export interface EnemyType {
  name: string;
  color: string;
  speed: number;
  health: number;
  size: number;
  damage: number;
  scoreValue: number;
  xpValue: number;
  type: string;
  emoji: string;
  shootCooldown?: number;
  shootRange?: number;
  explosionRadius?: number;
  explosionDamage?: number;
  teleportCooldown?: number;
  shield?: number;
  hasShield?: boolean;
  summonCooldown?: number;
  imagePath?: string;
  image?: HTMLImageElement;
  // Special enemy behavior properties
  orbitAngle?: number;
  orbitDistance?: number;
  chargeCooldown?: number;
  isCharging?: boolean;
  chargeSpeed?: number;
  preferredDistance?: number;
  zigzagTimer?: number;
  zigzagDirection?: number;
  splitCount?: number;
}

export interface BossType {
  name: string;
  color: string;
  emoji: string;
  health: number;
  damage: number;
  speed: number;
  size: number;
  scoreValue: number;
  xpValue: number;
  pattern: 'circle_shot' | 'spiral' | 'charge' | 'teleport_assault';
  imagePath?: string;
  image?: HTMLImageElement;
  isFinalBoss?: boolean;
  twinId?: string;
}

// Upgrade types
export interface UpgradeLevel {
  desc: string;
  descKnight?: string; // Optional knight-specific description
  effect: (game: any) => void;
}

export interface Upgrade {
  name: string;
  icon: string;
  color: string;
  description: string;
  category: 'combat' | 'utility';
  maxLevel: number;
  levels: UpgradeLevel[];
}

// Game state types
export interface Stats {
  health: number;
  maxHealth: number;
  score: number;
  wave: number;
  kills: number;
  time: number;
  level: number;
  xp: number;
  xpToNext: number;
  timeRemaining: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  color: string;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  damage: number;
  color: string;
  width: number;
  height: number;
  pierceCount?: number;
  trail?: boolean;
  image?: HTMLImageElement;
  angle?: number;
}

export interface XPOrb {
  x: number;
  y: number;
  size: number;
  value: number;
  width: number;
  height: number;
}

export type GameState = 'menu' | 'charSelect' | 'playing' | 'paused' | 'levelup' | 'gameover' | 'victory' | 'finalBossTransition';
