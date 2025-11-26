import {
  createParticles, createElectricEffect,
  hitStopAbility, triggerScreenShake, createJuicyExplosion, flashLevelUp
} from './effects';
import { dropXP, createDamageNumber } from './combat';

export const whirlwindAbility = (game: any) => {
  // Juicy Arcade: MASSIVE whirlwind ability - matching storm/barrage impact!
  triggerScreenShake(game, 30, 4);
  hitStopAbility(game);
  flashLevelUp(game);

  // Initial juicy explosion with red/orange warrior theme
  createJuicyExplosion(game, game.player.x, game.player.y, 130, '#EF4444');

  // Swirling blade particles around player
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60;
    const radius = 30 + Math.random() * 70;
    game.particles.push({
      x: game.player.x + Math.cos(angle) * radius,
      y: game.player.y + Math.sin(angle) * radius,
      vx: Math.cos(angle + Math.PI / 2) * 6,
      vy: Math.sin(angle + Math.PI / 2) * 6,
      size: 5 + Math.random() * 4,
      color: ['#EF4444', '#F87171', '#FCA5A5', '#FECACA'][Math.floor(Math.random() * 4)],
      life: 40,
      maxLife: 40,
      type: 'magic'
    });
  }

  // Multi-wave spinning slashes over 2 seconds
  const slashCount = 6; // 6 spinning slashes
  const whirlwindDuration = 2000; // 2 seconds total
  const slashDelay = whirlwindDuration / slashCount;
  const baseRadius = 180; // Larger radius for melee
  const knockbackForce = 120;
  let totalEnemiesHit = 0;
  let totalHealing = 0;

  for (let slash = 0; slash < slashCount; slash++) {
    setTimeout(() => {
      // Screen shake on each slash
      triggerScreenShake(game, 15 + slash * 2, 2);

      // Expanding radius for each slash
      const currentRadius = baseRadius + slash * 20;
      const damage = (45 + slash * 8) * game.player.damageMultiplier; // Increasing damage per slash

      // Hit all enemies in radius
      game.enemies.forEach((enemy: any) => {
        const dx = enemy.x - game.player.x;
        const dy = enemy.y - game.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < currentRadius) {
          enemy.health -= damage;
          createParticles(game, enemy.x, enemy.y, enemy.color, 10);
          createDamageNumber(game, enemy.x, enemy.y, damage, 'ability', false);
          totalEnemiesHit++;

          // Knockback - push enemies away
          if (dist > 0) {
            const knockbackX = (dx / dist) * knockbackForce;
            const knockbackY = (dy / dist) * knockbackForce;
            enemy.x += knockbackX;
            enemy.y += knockbackY;
          }
        }
      });

      // Lifesteal - heal 3 HP per enemy hit per slash
      const slashHits = game.enemies.filter((e: any) => {
        const dx = e.x - game.player.x;
        const dy = e.y - game.player.y;
        return Math.sqrt(dx * dx + dy * dy) < currentRadius;
      }).length;

      if (slashHits > 0) {
        const healAmount = slashHits * 3;
        totalHealing += healAmount;
        game.player.health = Math.min(game.player.maxHealth, game.player.health + healAmount);

        // Healing particles
        for (let i = 0; i < Math.min(slashHits, 5); i++) {
          game.particles.push({
            x: game.player.x + (Math.random() - 0.5) * 40,
            y: game.player.y + (Math.random() - 0.5) * 40,
            vx: (Math.random() - 0.5) * 2,
            vy: -3 - Math.random() * 2,
            size: 6,
            color: '#10B981',
            life: 20,
            maxLife: 20,
            type: 'heal'
          });
        }
      }

      // Spinning slash particles - blade arc effect
      const slashColors = ['#EF4444', '#F97316', '#FBBF24', '#EF4444', '#DC2626', '#B91C1C'];
      for (let i = 0; i < 30; i++) {
        const angle = (Math.PI * 2 * i) / 30 + (slash * Math.PI / 6);
        game.particles.push({
          x: game.player.x,
          y: game.player.y,
          vx: Math.cos(angle) * (10 + slash * 2),
          vy: Math.sin(angle) * (10 + slash * 2),
          size: 6 + Math.random() * 4,
          color: slashColors[slash],
          life: 18,
          maxLife: 18,
          type: 'spark',
          shape: 'star'
        });
      }

      // Ambient fire/blade particles throughout
      for (let p = 0; p < 10; p++) {
        const ambientAngle = Math.random() * Math.PI * 2;
        const dist = 60 + Math.random() * currentRadius;
        game.particles.push({
          x: game.player.x + Math.cos(ambientAngle) * dist,
          y: game.player.y + Math.sin(ambientAngle) * dist,
          vx: Math.cos(ambientAngle + Math.PI / 2) * 3,
          vy: Math.sin(ambientAngle + Math.PI / 2) * 3,
          size: 4 + Math.random() * 3,
          color: '#FCA5A5',
          life: 25,
          maxLife: 25,
          type: 'magic'
        });
      }
    }, slash * slashDelay);
  }

  // Final devastating slam at the end
  setTimeout(() => {
    triggerScreenShake(game, 35, 5);
    createJuicyExplosion(game, game.player.x, game.player.y, 200, '#EF4444');
    flashLevelUp(game);

    // Final slam damage - big hit to all nearby enemies
    const finalRadius = 250;
    const finalDamage = 80 * game.player.damageMultiplier;

    game.enemies.forEach((enemy: any) => {
      const dx = enemy.x - game.player.x;
      const dy = enemy.y - game.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < finalRadius) {
        enemy.health -= finalDamage;
        createParticles(game, enemy.x, enemy.y, '#EF4444', 20);
        createDamageNumber(game, enemy.x, enemy.y, finalDamage, 'ability', true); // Crit-style

        // Strong knockback on final slam
        if (dist > 0) {
          const knockbackX = (dx / dist) * 180;
          const knockbackY = (dy / dist) * 180;
          enemy.x += knockbackX;
          enemy.y += knockbackY;
        }
      }
    });

    // Final heal burst
    const finalHeal = 30;
    game.player.health = Math.min(game.player.maxHealth, game.player.health + finalHeal);

    // Big healing particle burst
    for (let i = 0; i < 15; i++) {
      game.particles.push({
        x: game.player.x + (Math.random() - 0.5) * 60,
        y: game.player.y + (Math.random() - 0.5) * 60,
        vx: (Math.random() - 0.5) * 4,
        vy: -4 - Math.random() * 3,
        size: 8,
        color: '#10B981',
        life: 30,
        maxLife: 30,
        type: 'heal'
      });
    }
  }, whirlwindDuration + 100);
};

// Ultimate ability - clears all enemies on screen
export const ultimateAbility = (game: any, _canvasSize: { width: number; height: number }) => {
  // Juicy Arcade: Big ultimate feedback
  triggerScreenShake(game, 30, 4);
  hitStopAbility(game);
  flashLevelUp(game); // Golden flash for ultimate

  // Kill all enemies on screen and drop XP
  for (let i = game.enemies.length - 1; i >= 0; i--) {
    const enemy = game.enemies[i];

    // Juicy Arcade: Enhanced explosion effect
    createJuicyExplosion(game, enemy.x, enemy.y, 80, enemy.color);
    createParticles(game, enemy.x, enemy.y, enemy.color, 30);

    // Award score and XP
    game.score += enemy.scoreValue * game.wave;
    game.kills++;
    dropXP(game, enemy.x, enemy.y, enemy.xpValue);

    // Remove enemy
    game.enemies.splice(i, 1);
  }

  // Juicy Arcade: Screen-wide particle effect with varied shapes
  const ultimateShapes = ['star', 'circle', 'triangle', 'square'];
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
      type: 'explosion',
      shape: ultimateShapes[Math.floor(Math.random() * 4)]
    });
  }

  // Clear enemy projectiles too
  game.enemyProjectiles = [];
};

export const barrageAbility = (game: any) => {
  // Juicy Arcade: MASSIVE barrage ability feedback - matching storm's impact!
  triggerScreenShake(game, 30, 4);
  hitStopAbility(game);
  flashLevelUp(game); // Golden flash for dramatic effect

  // Initial juicy explosion with emerald theme
  createJuicyExplosion(game, game.player.x, game.player.y, 120, '#10B981');

  // Swirling wind/energy particles around player (like storm's swirling particles)
  for (let i = 0; i < 60; i++) {
    const angle = (Math.PI * 2 * i) / 60;
    const radius = 40 + Math.random() * 80;
    game.particles.push({
      x: game.player.x + Math.cos(angle) * radius,
      y: game.player.y + Math.sin(angle) * radius,
      vx: Math.cos(angle + Math.PI / 2) * 5,
      vy: Math.sin(angle + Math.PI / 2) * 5,
      size: 4 + Math.random() * 3,
      color: ['#10B981', '#34D399', '#6EE7B7', '#ECFDF5'][Math.floor(Math.random() * 4)],
      life: 35,
      maxLife: 35,
      type: 'magic'
    });
  }

  // Fire arrows in multiple waves for sustained dramatic effect
  const arrowCount = 24; // Arrows per wave
  const waveCount = 3; // 3 waves of arrows (reduced for performance)
  const barrageDuration = 900; // 0.9 seconds total
  const waveDelay = barrageDuration / waveCount; // 300ms between waves

  for (let wave = 0; wave < waveCount; wave++) {
    setTimeout(() => {
      // Screen shake on each wave
      triggerScreenShake(game, 12 + wave * 2, 2);

      for (let i = 0; i < arrowCount; i++) {
        const angle = (Math.PI * 2 * i) / arrowCount + (wave * Math.PI / arrowCount); // Offset each wave
        const speed = 10 + wave * 2; // Each wave slightly faster
        game.projectiles.push({
          x: game.player.x,
          y: game.player.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          size: 10,
          damage: 24 * game.player.damageMultiplier,
          color: '#10B981',
          width: 20,
          height: 20,
          pierceCount: 0,
          maxPierce: 3,
          trail: true,
          angle: angle, // Direction for arrow rotation
          weaponType: 'ranged', // Render as arrow
          image: game.player.weaponImage, // Use the arrow image
          isBarrageArrow: true
        });
      }

      // Burst particles for each wave with varying emerald shades
      const waveColors = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#ECFDF5'];
      for (let i = 0; i < 25; i++) {
        const angle = Math.random() * Math.PI * 2;
        game.particles.push({
          x: game.player.x,
          y: game.player.y,
          vx: Math.cos(angle) * (8 + Math.random() * 6),
          vy: Math.sin(angle) * (8 + Math.random() * 6),
          size: 5 + Math.random() * 4,
          color: waveColors[wave],
          life: 20,
          maxLife: 20,
          type: 'spark',
          shape: 'star'
        });
      }

      // Ambient wind/energy particles throughout barrage
      for (let p = 0; p < 8; p++) {
        const ambientAngle = Math.random() * Math.PI * 2;
        const dist = 80 + Math.random() * 150;
        game.particles.push({
          x: game.player.x + Math.cos(ambientAngle) * dist,
          y: game.player.y + Math.sin(ambientAngle) * dist,
          vx: Math.cos(ambientAngle) * 2,
          vy: Math.sin(ambientAngle) * 2 - 1,
          size: 3 + Math.random() * 3,
          color: '#6EE7B7',
          life: 25,
          maxLife: 25,
          type: 'magic'
        });
      }
    }, wave * waveDelay);
  }

  // Final big explosion at the end
  setTimeout(() => {
    triggerScreenShake(game, 25, 3);
    createJuicyExplosion(game, game.player.x, game.player.y, 150, '#10B981');
    flashLevelUp(game);

    // Final burst damage to nearby enemies
    game.enemies.forEach((enemy: any) => {
      const dx = enemy.x - game.player.x;
      const dy = enemy.y - game.player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 200) {
        const damage = 18 * game.player.damageMultiplier;
        enemy.health -= damage;
        createDamageNumber(game, enemy.x, enemy.y, damage, 'ability', false);
      }
    });
  }, barrageDuration + 100);
};

export const stormAbility = (game: any) => {
  // Juicy Arcade: MASSIVE storm ability - PARALYZE & EXPLODE!
  triggerScreenShake(game, 30, 4);
  hitStopAbility(game);
  flashLevelUp(game);

  // Initial big lightning burst at player position
  createJuicyExplosion(game, game.player.x, game.player.y, 150, '#8B5CF6');

  // Create swirling storm particles around player
  for (let i = 0; i < 80; i++) {
    const angle = (Math.PI * 2 * i) / 80;
    const radius = 50 + Math.random() * 100;
    game.particles.push({
      x: game.player.x + Math.cos(angle) * radius,
      y: game.player.y + Math.sin(angle) * radius,
      vx: Math.cos(angle + Math.PI / 2) * 4,
      vy: Math.sin(angle + Math.PI / 2) * 4,
      size: 4 + Math.random() * 4,
      color: ['#8B5CF6', '#A855F7', '#C4B5FD', '#FFFFFF'][Math.floor(Math.random() * 4)],
      life: 40,
      maxLife: 40,
      type: 'magic'
    });
  }

  // PHASE 1: PARALYZE all enemies in range
  const paralyzeRadius = 350;
  const paralyzedEnemies: any[] = [];

  game.enemies.forEach((enemy: any) => {
    const dx = enemy.x - game.player.x;
    const dy = enemy.y - game.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < paralyzeRadius) {
      enemy.paralyzed = true;
      enemy.originalSpeed = enemy.speed;
      enemy.speed = 0; // Stop movement
      paralyzedEnemies.push(enemy);

      // Electric effect on paralyzed enemy
      createElectricEffect(game, enemy.x, enemy.y);

      // Purple "paralyzed" particles around enemy
      for (let p = 0; p < 8; p++) {
        const pAngle = (Math.PI * 2 * p) / 8;
        game.particles.push({
          x: enemy.x + Math.cos(pAngle) * 20,
          y: enemy.y + Math.sin(pAngle) * 20,
          vx: Math.cos(pAngle) * 2,
          vy: Math.sin(pAngle) * 2,
          size: 5,
          color: '#8B5CF6',
          life: 90,
          maxLife: 90,
          type: 'magic'
        });
      }
    }
  });

  // Continuous lightning effects during paralyze phase (1.5 seconds)
  const paralyzeTime = 1500;
  const lightningStrikes = 30;

  for (let i = 0; i < lightningStrikes; i++) {
    setTimeout(() => {
      // Random lightning on paralyzed enemies
      if (paralyzedEnemies.length > 0) {
        const target = paralyzedEnemies[Math.floor(Math.random() * paralyzedEnemies.length)];
        if (target && !target.markedForDeath) {
          createElectricEffect(game, target.x, target.y);

          // Small tick damage during paralyze
          const tickDamage = 5 * game.player.damageMultiplier;
          target.health -= tickDamage;
          createDamageNumber(game, target.x, target.y, tickDamage, 'ability', false);
        }
      }

      // Periodic screen shake
      if (i % 5 === 0) {
        triggerScreenShake(game, 10, 2);
      }

      // Ambient storm particles
      for (let p = 0; p < 3; p++) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 100 + Math.random() * 250;
        game.particles.push({
          x: game.player.x + Math.cos(angle) * dist,
          y: game.player.y + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 3,
          vy: -1 - Math.random() * 2,
          size: 3 + Math.random() * 3,
          color: '#C4B5FD',
          life: 20,
          maxLife: 20,
          type: 'magic'
        });
      }
    }, (i / lightningStrikes) * paralyzeTime);
  }

  // PHASE 2: EXPLODE all paralyzed enemies after 1.5 seconds
  setTimeout(() => {
    triggerScreenShake(game, 45, 5);
    flashLevelUp(game);

    const explosionDamage = 100 * game.player.damageMultiplier;
    const chainExplosionRadius = 100;

    // Explode each paralyzed enemy
    game.enemies.forEach((enemy: any) => {
      if (enemy.paralyzed) {
        // Massive damage to paralyzed enemy
        enemy.health -= explosionDamage;
        createJuicyExplosion(game, enemy.x, enemy.y, 70, '#8B5CF6');
        createDamageNumber(game, enemy.x, enemy.y, explosionDamage, 'ability', true);

        // Chain explosion damages nearby enemies
        game.enemies.forEach((nearby: any) => {
          if (nearby !== enemy && !nearby.paralyzed) {
            const ndx = nearby.x - enemy.x;
            const ndy = nearby.y - enemy.y;
            const ndist = Math.sqrt(ndx * ndx + ndy * ndy);
            if (ndist < chainExplosionRadius) {
              const chainDamage = 50 * game.player.damageMultiplier;
              nearby.health -= chainDamage;
              createDamageNumber(game, nearby.x, nearby.y, chainDamage, 'ability', false);
              createElectricEffect(game, nearby.x, nearby.y);
            }
          }
        });

        // Reset paralyzed state
        enemy.paralyzed = false;
        if (enemy.originalSpeed) {
          enemy.speed = enemy.originalSpeed;
        }
      }
    });

    // Final massive explosion at player
    createJuicyExplosion(game, game.player.x, game.player.y, 180, '#8B5CF6');
  }, paralyzeTime + 100);
};
