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

  // Office floor - carpet texture (scrolls with camera)
  ctx.fillStyle = '#2D3748';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // Calculate offset for scrolling floor pattern
  const cameraOffsetX = game.camera ? game.camera.x : 0;
  const cameraOffsetY = game.camera ? game.camera.y : 0;

  // Carpet texture pattern (subtle diagonal lines) - scrolling
  ctx.strokeStyle = '#1A202C';
  ctx.lineWidth = 2;
  const spacing = 8;
  const diagonalOffset = (cameraOffsetX + cameraOffsetY) % (spacing * 2);
  for (let i = -canvasSize.height - diagonalOffset; i < canvasSize.width + canvasSize.height; i += spacing) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + canvasSize.height, canvasSize.height);
    ctx.stroke();
  }

  // Carpet tile grid (subtle squares) - scrolling
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  const tileSize = 120;
  const tileOffsetX = cameraOffsetX % tileSize;
  const tileOffsetY = cameraOffsetY % tileSize;

  for (let i = -tileOffsetX; i < canvasSize.width + tileSize; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvasSize.height);
    ctx.stroke();
  }
  for (let i = -tileOffsetY; i < canvasSize.height + tileSize; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvasSize.width, i);
    ctx.stroke();
  }

  // Apply camera transformation for all world entities
  ctx.save();
  ctx.translate(-cameraOffsetX, -cameraOffsetY);

  // Draw obstacles (office desks with texture images)
  game.obstacles.forEach((obstacle: any) => {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.fillRect(obstacle.x + 4, obstacle.y + 4, obstacle.width, obstacle.height);

    // Get the appropriate desk image based on obstacle's imageIndex
    const deskImage = game.deskImages && game.deskImages[obstacle.imageIndex || 0];

    // Draw desk texture image if available
    if (deskImage && deskImage.complete) {
      // Calculate aspect ratio preserving dimensions
      const imgAspect = deskImage.naturalWidth / deskImage.naturalHeight;
      const obstacleAspect = obstacle.width / obstacle.height;

      let drawWidth, drawHeight, drawX, drawY;

      // Use "contain" approach - fit entire image within bounds without cropping
      if (imgAspect > obstacleAspect) {
        // Image is wider - fit to width
        drawWidth = obstacle.width;
        drawHeight = drawWidth / imgAspect;
        drawX = obstacle.x;
        drawY = obstacle.y + (obstacle.height - drawHeight) / 2;
      } else {
        // Image is taller - fit to height
        drawHeight = obstacle.height;
        drawWidth = drawHeight * imgAspect;
        drawX = obstacle.x + (obstacle.width - drawWidth) / 2;
        drawY = obstacle.y;
      }

      ctx.drawImage(
        deskImage,
        drawX,
        drawY,
        drawWidth,
        drawHeight
      );

      // Optional: Add subtle border for definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    } else {
      // Fallback: Draw with solid color if image not loaded
      ctx.fillStyle = obstacle.color;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);

      // Desk border (fallback)
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 2;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
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
    const orbColor = orb.color || '#FBBF24';
    ctx.shadowBlur = 20;
    ctx.shadowColor = orbColor;
    ctx.fillStyle = orbColor;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw pickups (magnets and bombs)
  game.pickups.forEach((pickup: any) => {
    if (pickup.type === 'magnet') {
      // Magnet - draw magnet image with blue glow
      if (game.magnetImage && game.magnetImage.complete) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#3B82F6';

        const imgSize = pickup.size * 2;
        ctx.drawImage(
          game.magnetImage,
          pickup.x - imgSize / 2,
          pickup.y - imgSize / 2,
          imgSize,
          imgSize
        );

        ctx.shadowBlur = 0;
      } else {
        // Fallback: blue circle with emoji if image not loaded
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#3B82F6';
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFF';
        ctx.font = `${pickup.size * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧲', pickup.x, pickup.y);
      }
    } else if (pickup.type === 'bomb') {
      // Bomb - draw sombrero image with red glow
      if (game.sombreroImage && game.sombreroImage.complete) {
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#EF4444';

        const imgSize = pickup.size * 2;
        ctx.drawImage(
          game.sombreroImage,
          pickup.x - imgSize / 2,
          pickup.y - imgSize / 2,
          imgSize,
          imgSize
        );

        ctx.shadowBlur = 0;
      } else {
        // Fallback: dark circle with bomb emoji if image not loaded
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#EF4444';
        ctx.fillStyle = '#1F2937';
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFF';
        ctx.font = `${pickup.size * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', pickup.x, pickup.y);
      }
    }
  });

  // Draw sombreros (powerup spawn points)
  game.sombreros.forEach((sombrero: any) => {
    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(sombrero.x, sombrero.y + sombrero.height / 2 + 4, sombrero.width / 2, sombrero.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Choose image based on pickup type: magnet image for magnet spawners, sombrero for bomb spawners
    const spawnerImage = sombrero.pickupType === 'magnet'
      ? (game.magnetImage && game.magnetImage.complete ? game.magnetImage : null)
      : (game.sombreroImage && game.sombreroImage.complete ? game.sombreroImage : null);

    // Draw spawn point image if available
    if (spawnerImage) {
      // Add glow effect to make it stand out - always yellow for spawn points
      ctx.shadowBlur = 20;
      ctx.shadowColor = sombrero.activated ? '#10B981' : '#FBBF24';

      ctx.drawImage(
        spawnerImage,
        sombrero.x - sombrero.width / 2,
        sombrero.y - sombrero.height / 2,
        sombrero.width,
        sombrero.height
      );

      ctx.shadowBlur = 0;
    } else {
      // Fallback: Draw emoji if image not loaded
      ctx.fillStyle = '#FFF';
      ctx.font = `${sombrero.width}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fallbackEmoji = sombrero.pickupType === 'magnet' ? '🧲' : '🎩';
      ctx.fillText(fallbackEmoji, sombrero.x, sombrero.y);
    }

    // Pulsing indicator ring to show interactivity
    const pulseScale = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(sombrero.x, sombrero.y, sombrero.size * pulseScale, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });

  // Draw projectiles with glow
  game.projectiles.forEach((proj: any) => {
    // Draw weapon image if available
    if (proj.image && proj.image.complete) {
      ctx.save();
      ctx.translate(proj.x, proj.y);

      // Different rendering for different weapon types
      if (proj.weaponType === 'melee') {
        // SWORD - Spinning slash effect
        const swordSize = proj.size * 3.5;
        // Continuous rotation for spinning effect
        const spinRotation = proj.angle + (Date.now() * 0.02);
        ctx.rotate(spinRotation);

        // Add red glow for sword
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#EF4444';

        ctx.drawImage(
          proj.image,
          -swordSize / 2,
          -swordSize / 2,
          swordSize,
          swordSize
        );

        ctx.shadowBlur = 0;
      } else if (proj.weaponType === 'magic') {
        // STAFF - Rotating spell with purple glow
        const staffSize = proj.size * 3;
        ctx.rotate(proj.angle + Math.PI / 2);

        // Purple glow for magic
        ctx.shadowBlur = 25;
        ctx.shadowColor = '#8B5CF6';

        ctx.drawImage(
          proj.image,
          -staffSize / 2,
          -staffSize / 2,
          staffSize,
          staffSize
        );

        ctx.shadowBlur = 0;
      } else {
        // ARROW - Points in direction of travel
        const arrowSize = proj.size * 4;
        ctx.rotate(proj.angle + Math.PI / 2);

        ctx.drawImage(
          proj.image,
          -arrowSize / 2,
          -arrowSize / 2,
          arrowSize,
          arrowSize
        );
      }

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

  // Draw player with character image or fallback to glow + emoji
  const { player } = game;

  // Draw character image if available
  if (player.characterImage && player.characterImage.complete) {
    ctx.save();

    // Add glow effect
    ctx.shadowBlur = 25;
    ctx.shadowColor = player.color;

    // Draw circular clipped character image
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.width / 2, 0, Math.PI * 2);
    ctx.clip();

    // Draw the character image
    const imgSize = player.width;
    ctx.drawImage(
      player.characterImage,
      player.x - imgSize / 2,
      player.y - imgSize / 2,
      imgSize,
      imgSize
    );

    ctx.restore();
  } else {
    // Fallback: Draw colored circle with emoji if image not loaded
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
  }

  // Restore camera transformation
  ctx.restore();

  if (game.screenShake > 0) {
    ctx.restore();
  }
};
