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

  if (dist < radius) {
    game.player.health -= damage;
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

  // WARRIOR - Sword Swipe (creates fan pattern based on multiShot)
  if (player.weaponType === 'melee') {
    const swordSpeed = 12;
    const multiShot = player.multiShot || 1;

    // Calculate spread angle between swipes (15 degrees between each)
    const spreadPerSwipe = Math.PI / 12; // 15 degrees
    const totalSpread = (multiShot - 1) * spreadPerSwipe;

    // Create swipes for front direction (0 degrees)
    for (let i = 0; i < multiShot; i++) {
      // Center the fan around the base angle
      const offset = -totalSpread / 2 + (i * spreadPerSwipe);
      const swipeAngle = angle + offset;

      const projectile: any = {
        x: player.x + Math.cos(swipeAngle) * 30,
        y: player.y + Math.sin(swipeAngle) * 30,
        vx: Math.cos(swipeAngle) * swordSpeed,
        vy: Math.sin(swipeAngle) * swordSpeed,
        size: 10 * player.projectileSize,
        damage: 35 * player.damageMultiplier,
        color: player.color,
        width: 20 * player.projectileSize,
        height: 20 * player.projectileSize,
        pierceCount: 0,
        trail: false,
        angle: swipeAngle,
        lifetime: 15, // Short lifetime for melee
        weaponType: 'melee',
        image: player.weaponImage // Use pre-loaded image
      };

      game.projectiles.push(projectile);
    }

    // Create swipes for back direction (180 degrees) - only if multishot <= 4 for performance
    if (multiShot <= 4) {
      for (let i = 0; i < multiShot; i++) {
        const offset = -totalSpread / 2 + (i * spreadPerSwipe);
        const swipeAngle = angle + Math.PI + offset; // 180 degrees opposite

        const projectile: any = {
          x: player.x + Math.cos(swipeAngle) * 30,
          y: player.y + Math.sin(swipeAngle) * 30,
          vx: Math.cos(swipeAngle) * swordSpeed,
          vy: Math.sin(swipeAngle) * swordSpeed,
          size: 10 * player.projectileSize,
          damage: 35 * player.damageMultiplier,
          color: player.color,
          width: 20 * player.projectileSize,
          height: 20 * player.projectileSize,
          pierceCount: 0,
          trail: false,
          angle: swipeAngle,
          lifetime: 15, // Short lifetime for melee
          weaponType: 'melee',
          image: player.weaponImage // Use pre-loaded image
        };

        game.projectiles.push(projectile);
      }
    }
  }
  // RANGER - Arrow (slower speed)
  else if (player.weaponType === 'ranged') {
    const arrowSpeed = 6;
    const projectile: any = {
      x: player.x,
      y: player.y,
      vx: (dx / dist) * arrowSpeed,
      vy: (dy / dist) * arrowSpeed,
      size: 7 * player.projectileSize,
      damage: 30 * player.damageMultiplier,
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
      damage: 40 * player.damageMultiplier,
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

  let projectile: any;

  // Different projectile types based on enemy type
  switch (enemy.type) {
    case 'emailer':
      // Email Spammer - Blue projectiles (reduced damage for survivability)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 6,
        vy: (dy / dist) * 6,
        size: 9,
        damage: 11,
        color: '#3B82F6',
        width: 18,
        height: 18
      };
      break;

    case 'manager':
      // Micromanager - Fast small orange projectiles (memos, reduced damage)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 7,
        vy: (dy / dist) * 7,
        size: 6,
        damage: 7,
        color: '#F97316',
        width: 12,
        height: 12
      };
      break;

    case 'accountant':
      // Accountant - Slow large purple projectiles (spreadsheets, reduced damage)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 3,
        vy: (dy / dist) * 3,
        size: 12,
        damage: 15,
        color: '#8B5CF6',
        width: 24,
        height: 24
      };
      break;

    case 'teleporter':
      // IT Support - Cyan tech projectiles (reduced damage)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 5,
        vy: (dy / dist) * 5,
        size: 8,
        damage: 9,
        color: '#06B6D4',
        width: 16,
        height: 16
      };
      break;

    case 'summoner':
      // Team Lead - Purple command projectiles (reduced damage)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 5,
        vy: (dy / dist) * 5,
        size: 9,
        damage: 10,
        color: '#A855F7',
        width: 18,
        height: 18
      };
      break;

    case 'shielded':
      // Security Guard - Green defensive projectiles (reduced damage)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 4,
        vy: (dy / dist) * 4,
        size: 8,
        damage: 8,
        color: '#10B981',
        width: 16,
        height: 16
      };
      break;

    default:
      // Default projectile (fallback, reduced damage)
      projectile = {
        x: enemy.x,
        y: enemy.y,
        vx: (dx / dist) * 6,
        vy: (dy / dist) * 6,
        size: 9,
        damage: 11,
        color: enemy.color || '#3B82F6',
        width: 18,
        height: 18
      };
  }

  game.enemyProjectiles.push(projectile);
};

export const bossShoot = (game: any, boss: any, target: any) => {
  const dx = target.x - boss.x;
  const dy = target.y - boss.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Boss fires 2 projectiles in a spread pattern (balanced for difficulty)
  const spreadAngle = Math.PI / 12; // 15 degrees spread

  for (let i = 0; i < 2; i++) {
    const offset = i === 0 ? -spreadAngle / 2 : spreadAngle / 2;
    const angle = Math.atan2(dy, dx) + offset;
    const projectile: any = {
      x: boss.x,
      y: boss.y,
      vx: Math.cos(angle) * 5, // Reduced speed for balanced difficulty (was 9)
      vy: Math.sin(angle) * 5,
      size: 12, // Larger projectiles
      damage: boss.damage || 20, // Use boss damage
      color: boss.color || '#DC2626',
      width: 24,
      height: 24
    };

    game.enemyProjectiles.push(projectile);
  }
};

export const dropXP = (game: any, x: number, y: number, value: number, color: string = '#FBBF24') => {
  const count = Math.min(3, Math.ceil(value / 3));
  for (let i = 0; i < count; i++) {
    game.xpOrbs.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      size: 9,
      value: Math.ceil(value / count),
      width: 18,
      height: 18,
      color: color
    });
  }
};
