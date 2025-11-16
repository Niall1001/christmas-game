import { createParticles, createElectricEffect, createExplosion } from './effects';
import { dropXP } from './combat';

export const whirlwindAbility = (game: any) => {
  game.screenShake = 15;
  const radius = 130; // Reduced from 150
  game.enemies.forEach((enemy: any) => {
    const dx = enemy.x - game.player.x;
    const dy = enemy.y - game.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < radius) {
      enemy.health -= 35 * game.player.damageMultiplier; // Reduced from 80 to 35 (56% reduction)
      createParticles(game, enemy.x, enemy.y, enemy.color, 15);
    }
  });

  for (let i = 0; i < 50; i++) {
    const angle = (Math.PI * 2 * i) / 50;
    game.particles.push({
      x: game.player.x,
      y: game.player.y,
      vx: Math.cos(angle) * 8,
      vy: Math.sin(angle) * 8,
      size: 6,
      color: game.player.color,
      life: 20,
      maxLife: 20,
      type: 'spark'
    });
  }
};

// Ultimate ability - clears all enemies on screen
export const ultimateAbility = (game: any, _canvasSize: { width: number; height: number }) => {
  game.screenShake = 30;

  // Kill all enemies on screen and drop XP
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];

    // Create massive explosion effect
    createExplosion(game, enemy.x, enemy.y, 80, enemy.color);
    createParticles(game, enemy.x, enemy.y, enemy.color, 30);

    // Award score and XP
    game.score += enemy.scoreValue * game.wave;
    game.kills++;
    dropXP(game, enemy.x, enemy.y, enemy.xpValue);

    // Remove enemy
    game.enemies.splice(i, 1);
  }

  // Create screen-wide particle effect
  for (let i = 0; i < 150; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 10;
    game.particles.push({
      x: game.player.x,
      y: game.player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 8 + Math.random() * 6,
      color: ['#F59E0B', '#EF4444', '#8B5CF6', '#10B981'][Math.floor(Math.random() * 4)],
      life: 40,
      maxLife: 40,
      type: 'explosion'
    });
  }

  // Clear enemy projectiles too
  game.enemyProjectiles = [];
};

export const barrageAbility = (game: any) => {
  for (let i = 0; i < 16; i++) { // Reduced from 20 to 16 arrows
    const angle = (Math.PI * 2 * i) / 16;
    const speed = 10;
    game.projectiles.push({
      x: game.player.x,
      y: game.player.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 8,
      damage: 18 * game.player.damageMultiplier, // Reduced from 32 to 18 (44% reduction)
      color: '#10B981',
      width: 16,
      height: 16,
      pierceCount: 0,
      trail: true
    });
  }
};

export const stormAbility = (game: any) => {
  game.screenShake = 20;
  for (let i = 0; i < 50; i++) { // Reduced from 100 to 50 hits
    setTimeout(() => {
      const randomEnemy = game.enemies[Math.floor(Math.random() * game.enemies.length)];
      if (randomEnemy) {
        randomEnemy.health -= 7 * game.player.damageMultiplier; // Reduced from 12 to 7 (42% reduction)
        createElectricEffect(game, randomEnemy.x, randomEnemy.y);
      }
    }, i * 40); // Increased from 30ms to 40ms for slower effect
  }
};
