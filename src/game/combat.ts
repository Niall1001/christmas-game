import { PROJECTILE_CONFIG } from '../constants/enemies';

// Create floating damage number for visual feedback
export const createDamageNumber = (
  game: any,
  x: number,
  y: number,
  damage: number,
  type: 'normal' | 'critical' | 'ability' | 'player' = 'normal',
  isMobile: boolean = false
) => {
  // On mobile, only show big hits (>50 damage) to reduce clutter
  if (isMobile && damage < 50 && type !== 'player') return;

  const colors: Record<string, string> = {
    normal: '#FFFFFF',
    critical: '#FBBF24',
    ability: '#8B5CF6',
    player: '#EF4444'
  };

  game.damageNumbers.push({
    x: x + (Math.random() - 0.5) * 20,
    y: y - 10,
    damage: Math.floor(damage),
    color: colors[type],
    life: 45,
    maxLife: 45,
    type,
    vx: (Math.random() - 0.5) * 1.5,
    vy: -3
  });
};

export const checkCollision = (a: any, b: any) => {
  const aSize = a.size || a.width / 2;
  const bSize = b.size || b.width / 2;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < aSize + bSize;
};

export const checkRectCollision = (a: any, b: any) => {
  return a.x < b.x + b.width &&
         a.x + a.width > b.x &&
         a.y < b.y + b.height &&
         a.y + a.height > b.y;
};

export const applyExplosionDamage = (game: any, x: number, y: number, radius: number, damage: number) => {
  game.enemies.forEach((enemy: any) => {
    const dx = enemy.x - x;
    const dy = enemy.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      if (enemy.hasShield && enemy.shield > 0) {
        enemy.shield--;
        if (enemy.shield <= 0) enemy.hasShield = false;
      } else {
        enemy.health -= damage;
      }
    }
  });
};

export const applyPlayerExplosionDamage = (game: any, x: number, y: number, radius: number, damage: number) => {
  const dx = game.player.x - x;
  const dy = game.player.y - y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < radius && game.player.invincibilityTimer <= 0) {
    game.player.health -= damage;
    game.player.invincibilityTimer = 60; // 1 second of invincibility at 60fps
  }
};

export const findNearestEnemies = (player: any, enemies: any[], count: number) => {
  const sorted = [...enemies].sort((a, b) => {
    const distA = Math.sqrt((a.x - player.x) ** 2 + (a.y - player.y) ** 2);
    const distB = Math.sqrt((b.x - player.x) ** 2 + (b.y - player.y) ** 2);
    return distA - distB;
  });
  return sorted.slice(0, count);
};

export const shootAtTarget = (game: any, player: any, target: any) => {
  const dx = target.x - player.x;
  const dy = target.y - player.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  // NOTE: Warrior now uses orbiting blades system in Game.tsx, not projectiles

  // RANGER - Arrow (slower speed)
  if (player.weaponType === 'ranged') {
    const arrowSpeed = 6;
    const projectile: any = {
      x: player.x,
      y: player.y,
      vx: (dx / dist) * arrowSpeed,
      vy: (dy / dist) * arrowSpeed,
      size: 7 * player.projectileSize,
      damage: 35 * player.damageMultiplier, // Buffed from 30 for base damage balance
      color: player.color,
      width: 14 * player.projectileSize,
      height: 14 * player.projectileSize,
      pierceCount: 0,
      trail: true,
      angle: angle,
      weaponType: 'ranged',
      image: player.weaponImage // Use pre-loaded image
    };

    game.projectiles.push(projectile);
  }
  // MAGE - Staff Spell (medium speed)
  else if (player.weaponType === 'magic') {
    const spellSpeed = 12;
    const projectile: any = {
      x: player.x,
      y: player.y,
      vx: (dx / dist) * spellSpeed,
      vy: (dy / dist) * spellSpeed,
      size: 10 * player.projectileSize,
      damage: 46 * player.damageMultiplier, // Buffed from 40 for base damage balance
      color: player.color,
      width: 20 * player.projectileSize,
      height: 20 * player.projectileSize,
      pierceCount: 0,
      trail: true,
      angle: angle,
      weaponType: 'magic',
      image: player.weaponImage // Use pre-loaded image
    };

    game.projectiles.push(projectile);
  }
};

export const enemyShoot = (game: any, enemy: any, target: any) => {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Get projectile config for this enemy type (or use default)
  const config = PROJECTILE_CONFIG[enemy.type] || PROJECTILE_CONFIG.default;

  // Damage values per enemy type (preserved from original)
  const damageByType: Record<string, number> = {
    emailer: 11,
    manager: 7,
    accountant: 15,
    teleporter: 9,
    summoner: 10,
    shielded: 8,
    circler: 8,
    retreater: 12,
    default: 11
  };

  const damage = damageByType[enemy.type] || damageByType.default;

  const projectile: any = {
    x: enemy.x,
    y: enemy.y,
    vx: (dx / dist) * config.speed,
    vy: (dy / dist) * config.speed,
    size: config.size,
    damage: damage,
    color: config.glowColor,
    trailColor: config.trailColor,
    width: config.size * 2,
    height: config.size * 2,
    angle: Math.atan2(dy, dx),
    enemyType: enemy.type,
    spawnTime: Date.now(),
    // Attach the pre-loaded image from game state
    image: game.projectileImages?.[enemy.type] || game.projectileImages?.default
  };

  game.enemyProjectiles.push(projectile);
};

export const bossShoot = (game: any, boss: any, target: any) => {
  const dx = target.x - boss.x;
  const dy = target.y - boss.y;

  // Get boss projectile config
  const config = PROJECTILE_CONFIG.boss;

  // Boss fires 2 projectiles in a spread pattern (balanced for difficulty)
  const spreadAngle = Math.PI / 12; // 15 degrees spread

  for (let i = 0; i < 2; i++) {
    const offset = i === 0 ? -spreadAngle / 2 : spreadAngle / 2;
    const angle = Math.atan2(dy, dx) + offset;
    const projectile: any = {
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * config.speed,
      vy: Math.sin(angle) * config.speed,
      size: config.size,
      damage: boss.damage || 20,
      color: config.glowColor,
      trailColor: config.trailColor,
      width: config.size * 2,
      height: config.size * 2,
      angle: angle,
      enemyType: 'boss',
      spawnTime: Date.now(),
      image: game.projectileImages?.boss
    };

    game.enemyProjectiles.push(projectile);
  }
};

export const dropXP = (game: any, x: number, y: number, value: number, color: string = '#FBBF24') => {
  // Performance cap: don't spawn more XP if there are already too many on the floor
  const MAX_XP_ORBS = 150;
  if (game.xpOrbs.length >= MAX_XP_ORBS) return;

  const count = Math.min(3, Math.ceil(value / 3));
  // Only spawn up to the cap
  const spawnCount = Math.min(count, MAX_XP_ORBS - game.xpOrbs.length);

  for (let i = 0; i < spawnCount; i++) {
    game.xpOrbs.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      size: 9,
      value: Math.ceil(value / count), // Keep original value distribution
      width: 18,
      height: 18,
      color: color
    });
  }
};
