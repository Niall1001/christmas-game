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
  const speed = 11;
  const angle = Math.atan2(dy, dx);

  const projectile: any = {
    x: player.x,
    y: player.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    size: 7 * player.projectileSize,
    damage: 30 * player.damageMultiplier,
    color: player.color,
    width: 14 * player.projectileSize,
    height: 14 * player.projectileSize,
    pierceCount: 0,
    trail: true,
    angle: angle
  };

  // Add arrow image for ranger class
  if (player.weaponType === 'ranged') {
    const arrowImg = new Image();
    arrowImg.src = '/src/images/arrow.webp';
    projectile.image = arrowImg;
  }

  game.projectiles.push(projectile);
};

export const enemyShoot = (game: any, enemy: any, target: any) => {
  const dx = target.x - enemy.x;
  const dy = target.y - enemy.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = 6;

  game.enemyProjectiles.push({
    x: enemy.x,
    y: enemy.y,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    size: 9,
    damage: 18,
    color: '#3B82F6',
    width: 18,
    height: 18
  });
};

export const dropXP = (game: any, x: number, y: number, value: number) => {
  const count = Math.min(3, Math.ceil(value / 3));
  for (let i = 0; i < count; i++) {
    game.xpOrbs.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      size: 9,
      value: Math.ceil(value / count),
      width: 18,
      height: 18
    });
  }
};
