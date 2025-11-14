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

  // Pixel art style floor - retro tile pattern (scrolls with camera)
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

  // Calculate offset for scrolling floor pattern
  const cameraOffsetX = game.camera ? game.camera.x : 0;
  const cameraOffsetY = game.camera ? game.camera.y : 0;

  // Disable image smoothing for crisp pixel art look
  ctx.imageSmoothingEnabled = false;

  // Pixel art tile pattern - large distinct tiles
  const pixelTileSize = 32; // Larger tiles for visible pixel art effect
  const tileOffsetX = cameraOffsetX % pixelTileSize;
  const tileOffsetY = cameraOffsetY % pixelTileSize;

  // Draw alternating tile pattern (checkerboard-ish with variation)
  for (let y = -tileOffsetY; y < canvasSize.height + pixelTileSize; y += pixelTileSize) {
    for (let x = -tileOffsetX; x < canvasSize.width + pixelTileSize; x += pixelTileSize) {
      // Create subtle variation in tiles
      const tileX = Math.floor((x + cameraOffsetX) / pixelTileSize);
      const tileY = Math.floor((y + cameraOffsetY) / pixelTileSize);
      const seed = (tileX * 73 + tileY * 37) % 4;

      // Base tile color with variation
      let tileColor;
      switch(seed) {
        case 0: tileColor = '#2a2a4e'; break;
        case 1: tileColor = '#252545'; break;
        case 2: tileColor = '#2d2d52'; break;
        default: tileColor = '#272748'; break;
      }

      ctx.fillStyle = tileColor;
      ctx.fillRect(x, y, pixelTileSize, pixelTileSize);

      // Pixel art style highlights (top-left corner)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.fillRect(x, y, pixelTileSize / 4, pixelTileSize / 4);

      // Pixel art style shadows (bottom-right corner)
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(x + pixelTileSize * 3/4, y + pixelTileSize * 3/4, pixelTileSize / 4, pixelTileSize / 4);
    }
  }

  // Draw tile borders - thick pixel art style
  ctx.strokeStyle = '#0f0f1a';
  ctx.lineWidth = 2;
  for (let i = -tileOffsetX; i < canvasSize.width + pixelTileSize; i += pixelTileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvasSize.height);
    ctx.stroke();
  }
  for (let i = -tileOffsetY; i < canvasSize.height + pixelTileSize; i += pixelTileSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvasSize.width, i);
    ctx.stroke();
  }

  // Re-enable smoothing for other elements
  ctx.imageSmoothingEnabled = true;

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

  // PERFORMANCE: Viewport culling bounds (only render what's visible)
  const viewLeft = cameraOffsetX - 100;
  const viewRight = cameraOffsetX + canvasSize.width + 100;
  const viewTop = cameraOffsetY - 100;
  const viewBottom = cameraOffsetY + canvasSize.height + 100;

  // Draw particles
  // PERFORMANCE: Only render particles on screen
  game.particles.forEach((p: Particle) => {
    // Skip if off-screen
    if (p.x < viewLeft || p.x > viewRight ||
        p.y < viewTop || p.y > viewBottom) {
      return;
    }

    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Draw XP orbs with glow
  // PERFORMANCE: Only render orbs on screen
  game.xpOrbs.forEach((orb: any) => {
    // Skip if off-screen
    if (orb.x < viewLeft || orb.x > viewRight ||
        orb.y < viewTop || orb.y > viewBottom) {
      return;
    }

    const orbColor = orb.color || '#FBBF24';
    // PERFORMANCE: Reduced glow for orbs
    ctx.shadowBlur = 10;
    ctx.shadowColor = orbColor;
    ctx.fillStyle = orbColor;
    ctx.beginPath();
    ctx.arc(orb.x, orb.y, orb.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw pickups (magnets and bombs)
  // PERFORMANCE: Only render pickups on screen
  game.pickups.forEach((pickup: any) => {
    // Skip if off-screen
    if (pickup.x < viewLeft || pickup.x > viewRight ||
        pickup.y < viewTop || pickup.y > viewBottom) {
      return;
    }

    if (pickup.type === 'magnet') {
      // MAGNET - Clean pulsing animation
      const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.25; // Pulsing animation
      const pulseGlow = 30 + Math.sin(Date.now() * 0.008) * 15; // Pulsing glow intensity

      if (game.magnetImage && game.magnetImage.complete) {
        // Bright glow for magnet image
        ctx.shadowBlur = pulseGlow;
        ctx.shadowColor = '#60A5FA';

        const imgSize = pickup.size * 3 * pulseScale; // LARGER + pulsing
        ctx.drawImage(
          game.magnetImage,
          pickup.x - imgSize / 2,
          pickup.y - imgSize / 2,
          imgSize,
          imgSize
        );

        ctx.shadowBlur = 0;
      } else {
        // Fallback with pulsing visuals
        ctx.shadowBlur = pulseGlow;
        ctx.shadowColor = '#60A5FA';
        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.size * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFF';
        ctx.font = `${pickup.size * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🧲', pickup.x, pickup.y);
      }

    } else if (pickup.type === 'bomb') {
      // SOMBRERO - Clean pulsing animation
      const pulseScale = 1 + Math.sin(Date.now() * 0.008) * 0.25; // Pulsing animation
      const pulseGlow = 30 + Math.sin(Date.now() * 0.008) * 15; // Pulsing glow intensity

      if (game.sombreroImage && game.sombreroImage.complete) {
        // Bright glow for sombrero image
        ctx.shadowBlur = pulseGlow;
        ctx.shadowColor = '#F87171';

        const imgSize = pickup.size * 3 * pulseScale; // LARGER + pulsing
        ctx.drawImage(
          game.sombreroImage,
          pickup.x - imgSize / 2,
          pickup.y - imgSize / 2,
          imgSize,
          imgSize
        );

        ctx.shadowBlur = 0;
      } else {
        // Fallback with pulsing visuals
        ctx.shadowBlur = pulseGlow;
        ctx.shadowColor = '#F87171';
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(pickup.x, pickup.y, pickup.size * pulseScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#FFF';
        ctx.font = `${pickup.size * 2}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('💣', pickup.x, pickup.y);
      }
    } else if (pickup.type === 'boss_bomb') {
      // BOSS BOMB - Pulsing warning bomb with countdown
      const timeLeft = (pickup.detonateTimer || 180) / 60; // Convert to seconds
      const isWarning = timeLeft < 1; // Last second warning

      // Pulsing effect - gets faster as timer runs down
      const pulseSpeed = isWarning ? 0.02 : 0.005;
      const pulseScale = 1 + Math.sin(Date.now() * pulseSpeed) * (isWarning ? 0.3 : 0.15);

      // Outer warning circle
      ctx.shadowBlur = 20;
      ctx.shadowColor = pickup.color || '#FF0000';
      ctx.strokeStyle = pickup.color || '#FF0000';
      ctx.lineWidth = 4;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, pickup.size * 2 * pulseScale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Main bomb circle
      ctx.shadowBlur = 15;
      ctx.fillStyle = isWarning ? '#FF0000' : '#8B0000';
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, pickup.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Inner glow
      ctx.fillStyle = '#FF6666';
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, pickup.size * 0.6, 0, Math.PI * 2);
      ctx.fill();

      // Bomb emoji and countdown
      ctx.fillStyle = '#FFF';
      ctx.font = `${pickup.size * 1.2}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('💣', pickup.x, pickup.y - pickup.size * 0.3);

      // Countdown timer
      ctx.font = `${pickup.size * 0.8}px Arial`;
      ctx.fillText(Math.ceil(timeLeft).toString(), pickup.x, pickup.y + pickup.size * 0.4);
    }
  });

  // Draw sombreros (powerup spawn points) - Clean pulsing animation
  // PERFORMANCE: Only render sombreros on screen
  game.sombreros.forEach((sombrero: any) => {
    // Skip if off-screen
    if (sombrero.x < viewLeft || sombrero.x > viewRight ||
        sombrero.y < viewTop || sombrero.y > viewBottom) {
      return;
    }

    const pulseScale = 1 + Math.sin(Date.now() * 0.006) * 0.2; // Pulsing animation
    const pulseGlow = 25 + Math.sin(Date.now() * 0.006) * 10; // Pulsing glow
    const glowColor = sombrero.pickupType === 'magnet' ? '#60A5FA' : '#F87171';

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(sombrero.x, sombrero.y + sombrero.height / 2 + 4, sombrero.width / 2, sombrero.height / 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Choose image based on pickup type: magnet image for magnet spawners, sombrero for bomb spawners
    const spawnerImage = sombrero.pickupType === 'magnet'
      ? (game.magnetImage && game.magnetImage.complete ? game.magnetImage : null)
      : (game.sombreroImage && game.sombreroImage.complete ? game.sombreroImage : null);

    // Draw spawn point image if available
    if (spawnerImage) {
      // Bright glow for spawner
      ctx.shadowBlur = pulseGlow;
      ctx.shadowColor = sombrero.activated ? '#10B981' : glowColor;

      const imgSize = sombrero.width * 1.5 * pulseScale; // LARGER + pulsing
      ctx.drawImage(
        spawnerImage,
        sombrero.x - imgSize / 2,
        sombrero.y - imgSize / 2,
        imgSize,
        imgSize
      );

      ctx.shadowBlur = 0;
    } else {
      // Fallback: Draw emoji if image not loaded
      ctx.shadowBlur = pulseGlow;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = '#FFF';
      ctx.font = `${sombrero.width * 1.5}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const fallbackEmoji = sombrero.pickupType === 'magnet' ? '🧲' : '🎩';
      ctx.fillText(fallbackEmoji, sombrero.x, sombrero.y);
      ctx.shadowBlur = 0;
    }
  });

  // Draw projectiles with glow
  // PERFORMANCE: Only render projectiles on screen
  game.projectiles.forEach((proj: any) => {
    // PERFORMANCE: Skip if off-screen
    if (proj.x < viewLeft || proj.x > viewRight ||
        proj.y < viewTop || proj.y > viewBottom) {
      return;
    }

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

        // PERFORMANCE: Reduced glow for sword
        ctx.shadowBlur = 10;
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

        // PERFORMANCE: Reduced glow for magic
        ctx.shadowBlur = 12;
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
        // ARROW - Points in direction of travel (no glow for performance)
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
      // Draw regular circular projectile (no shadow for performance)
      ctx.fillStyle = proj.color;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Draw enemy projectiles
  // PERFORMANCE: Only render enemy projectiles on screen
  game.enemyProjectiles.forEach((proj: any) => {
    // Skip if off-screen
    if (proj.x < viewLeft || proj.x > viewRight ||
        proj.y < viewTop || proj.y > viewBottom) {
      return;
    }

    ctx.fillStyle = proj.color;
    // PERFORMANCE: Reduced glow for enemy projectiles
    ctx.shadowBlur = 8;
    ctx.shadowColor = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  });

  // Draw enemies with images or emojis
  // PERFORMANCE: Only render enemies on or near screen
  game.enemies.forEach((enemy: any) => {
    // PERFORMANCE: Skip if off-screen (viewport culling)
    if (enemy.x < viewLeft || enemy.x > viewRight ||
        enemy.y < viewTop || enemy.y > viewBottom) {
      return; // Skip rendering this enemy
    }

    // Shield indicator
    if (enemy.hasShield && enemy.shield > 0) {
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size + 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Calculate distance from player for LOD
    const dx = enemy.x - game.player.x;
    const dy = enemy.y - game.player.y;
    const distSq = dx * dx + dy * dy;
    const distThreshold = canvasSize.width * canvasSize.width; // Use squared distance
    const useLOD = distSq > distThreshold; // Far enemies use simple rendering

    // Draw enemy with image if available (boss or regular enemy)
    if (enemy.image && enemy.image.complete) {
      ctx.save();

      // PERFORMANCE: Only add glow for bosses or close enemies
      if (enemy.isBoss && !useLOD) {
        ctx.shadowBlur = 20;
        ctx.shadowColor = enemy.color;
      }

      // PERFORMANCE: Simplified rendering for distant enemies (LOD)
      if (useLOD) {
        // Simple circle for distant enemies (much faster)
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Full rendering for close enemies
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
      }

      ctx.restore();

      // Draw colored border around image (simplified, no shadow)
      ctx.strokeStyle = enemy.color;
      ctx.lineWidth = enemy.isBoss ? 4 : 2;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Draw fallback circle and emoji if image not loaded
      ctx.fillStyle = enemy.color;
      // PERFORMANCE: No shadow blur (too expensive)
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, enemy.size, 0, Math.PI * 2);
      ctx.fill();

      // Emoji indicator (only for close enemies)
      if (!useLOD) {
        ctx.fillStyle = '#FFF';
        ctx.font = `${enemy.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(enemy.emoji, enemy.x, enemy.y);
      }
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

  // Apply invincibility visual effect (flashing transparency)
  const isInvincible = player.invincibilityTimer > 0;
  if (isInvincible) {
    // Flash effect: alternate between visible and semi-transparent every 5 frames
    const flashRate = Math.floor(player.invincibilityTimer / 5) % 2;
    ctx.globalAlpha = flashRate === 0 ? 0.3 : 1.0;
  }

  // Draw character image if available
  if (player.characterImage && player.characterImage.complete) {
    ctx.save();

    // Add glow effect (white glow if invincible, normal color otherwise)
    ctx.shadowBlur = 25;
    ctx.shadowColor = isInvincible ? '#FFFFFF' : player.color;

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
    ctx.shadowColor = isInvincible ? '#FFFFFF' : player.color;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.width / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = isInvincible ? '#FFFFFF' : '#60A5FA';
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

  // Reset global alpha after invincibility effect
  if (isInvincible) {
    ctx.globalAlpha = 1.0;
  }

  // Restore camera transformation
  ctx.restore();

  if (game.screenShake > 0) {
    ctx.restore();
  }
};
