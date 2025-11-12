import { Particle } from '../types';
import { CHARACTER_CLASSES } from '../constants/characters';

export const render = (
  ctx: CanvasRenderingContext2D,
  game: any,
  canvasSize: { width: number; height: number }
) => {
  // Screen shake
  if (game.screenShake > 0) {
    ctx.save();
    ctx.translate(
      (Math.random() - 0.5) * game.screenShake,
      (Math.random() - 0.5) * game.screenShake
    );
  }

  // Office floor
  ctx.fillStyle = '#1E293B';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // Grid pattern
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvasSize.width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvasSize.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvasSize.height; i += 60) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvasSize.width, i);
    ctx.stroke();
  }

  // Draw obstacles (desks)
  game.obstacles.forEach((obstacle: any) => {
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
  });

  // Draw particles
  game.particles.forEach((p: Particle) => {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Draw XP orbs with glow
  game.xpOrbs.forEach((orb: any) => {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#FBBF24';
    ctx.fillStyle = '#FBBF24';
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw projectiles with glow
  game.projectiles.forEach((proj: any) => {
    // Draw arrow image if available
    if (proj.image && proj.image.complete) {
      ctx.save();
      ctx.translate(proj.x, proj.y);
      ctx.rotate(proj.angle);

      // Add slight glow
      ctx.shadowBlur = 10;
      ctx.shadowColor = proj.color;

      // Draw arrow image
      const arrowSize = proj.size * 4; // Make arrow bigger than projectile size
      ctx.drawImage(
        proj.image,
        -arrowSize / 2,
        -arrowSize / 2,
        arrowSize,
        arrowSize
      );

      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
      // Draw regular circular projectile
      ctx.fillStyle = proj.color;
      ctx.shadowBlur = 15;
      ctx.shadowColor = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  });

  // Draw enemy projectiles
  game.enemyProjectiles.forEach((proj: any) => {
    ctx.fillStyle = proj.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw enemies with images or emojis
  game.enemies.forEach((enemy: any) => {
    // Shield indicator
    if (enemy.hasShield && enemy.shield > 0) {
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Draw enemy with image if available (boss or regular enemy)
    if (enemy.image && enemy.image.complete) {
      ctx.save();

      // Add glow effect
      ctx.shadowBlur = enemy.isBoss ? 30 : 18;
      ctx.shadowColor = enemy.color;

      // Draw circular clipped image
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.clip();

      // Draw the image
      const imgSize = enemy.size * 2;
      ctx.drawImage(
        enemy.image,
        enemy.x - imgSize / 2,
        enemy.y - imgSize / 2,
        imgSize,
        imgSize
      );

      ctx.restore();

      // Draw colored border around image
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = enemy.isBoss ? 4 : 2;
      ctx.shadowBlur = enemy.isBoss ? 20 : 10;
      ctx.shadowColor = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
    } else {
      // Draw fallback circle and emoji if image not loaded
      ctx.fillStyle = enemy.color;
      ctx.shadowBlur = 18;
      ctx.shadowColor = enemy.color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Emoji indicator
      ctx.fillStyle = '#FFF';
      ctx.font = `${enemy.size}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(enemy.emoji, enemy.x, enemy.y);
    }

    // Boss health bar
    if (enemy.isBoss) {
      const barWidth = enemy.size * 3;
      const barHeight = 10;
      const healthPercent = enemy.health / enemy.maxHealth;

      ctx.fillStyle = '#1E293B';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 25, barWidth, barHeight);

      ctx.fillStyle = '#EF4444';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 25, barWidth * healthPercent, barHeight);

      ctx.strokeStyle = '#FFF';
      ctx.lineWidth = 2;
      ctx.strokeRect(enemy.x - barWidth / 2, enemy.y - enemy.size - 25, barWidth, barHeight);

      // Boss name
      ctx.fillStyle = '#FFF';
      ctx.font = '16px Arial';
      ctx.fillText(enemy.name || 'BOSS', enemy.x, enemy.y - enemy.size - 35);
    }
  });

  // Draw player with glow
  const { player } = game;
  ctx.fillStyle = player.color;
  ctx.shadowBlur = 25;
  ctx.shadowColor = player.color;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.width / 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = '#60A5FA';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.width / 2 + 6, 0, Math.PI * 2);
  ctx.stroke();

  // Player character emoji
  const charClass = CHARACTER_CLASSES[player.characterClass];
  ctx.fillStyle = '#FFF';
  ctx.font = '24px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(charClass.emoji, player.x, player.y);

  if (game.screenShake > 0) {
    ctx.restore();
  }
};
