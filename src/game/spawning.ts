import { ENEMY_TYPES, BOSS_TYPES, ENEMY_IMAGE_POOL, FINAL_TWIN_BOSSES } from '../constants/enemies';

export const spawnEnemyGroup = (game: any, groupSize: number, canvasSize: { width: number; height: number }) => {
  // Spawn each enemy from a random side relative to player's world position
  for (let i = 0; i < groupSize; i++) {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    // Get player's world position
    const playerX = game.player.x;
    const playerY = game.player.y;

    // Spawn distance from viewport edge
    const spawnOffset = 50;

    switch (side) {
      case 0: // top - spread across viewport width, above player
        x = playerX + (Math.random() - 0.5) * canvasSize.width;
        y = playerY - canvasSize.height / 2 - spawnOffset;
        break;
      case 1: // right - spread across viewport height, right of player
        x = playerX + canvasSize.width / 2 + spawnOffset;
        y = playerY + (Math.random() - 0.5) * canvasSize.height;
        break;
      case 2: // bottom - spread across viewport width, below player
        x = playerX + (Math.random() - 0.5) * canvasSize.width;
        y = playerY + canvasSize.height / 2 + spawnOffset;
        break;
      case 3: // left - spread across viewport height, left of player
        x = playerX - canvasSize.width / 2 - spawnOffset;
        y = playerY + (Math.random() - 0.5) * canvasSize.height;
        break;
    }

    // Enemy type selection based on time (progressive unlocking)
    let typeKeys: (keyof typeof ENEMY_TYPES)[] = ['intern'];
    if (game.gameTime > 20) typeKeys.push('manager');
    if (game.gameTime > 40) typeKeys.push('accountant');
    if (game.gameTime > 60) typeKeys.push('emailer');
    if (game.gameTime > 80) typeKeys.push('angry_client');
    if (game.gameTime > 100) typeKeys.push('salesperson');
    if (game.gameTime > 120) typeKeys.push('teleporter');
    if (game.gameTime > 150) typeKeys.push('shielded');
    if (game.gameTime > 180) typeKeys.push('summoner');

    const typeKey = typeKeys[Math.floor(Math.random() * typeKeys.length)];
    const type = {...ENEMY_TYPES[typeKey]};

    // Late-game difficulty scaling (wave 7+)
    let healthMultiplier = 1;
    let damageMultiplier = 1;

    if (game.wave >= 7) {
      // Exponential scaling after wave 7 for very challenging endgame
      const wavesBeyond7 = game.wave - 6;
      healthMultiplier = 1 + (wavesBeyond7 * 0.4); // +40% health per wave
      damageMultiplier = 1 + (wavesBeyond7 * 0.25); // +25% damage per wave
    }

    const enemy: any = {
      x,
      y,
      ...type,
      speed: type.speed * game.enemySpeedMod,
      health: type.health * healthMultiplier,
      maxHealth: type.health * healthMultiplier,
      damage: type.damage * damageMultiplier,
      width: type.size * 2,
      height: type.size * 2
    };

    // Randomly select an image from the pool for this individual enemy
    const randomImagePath = ENEMY_IMAGE_POOL[Math.floor(Math.random() * ENEMY_IMAGE_POOL.length)];
    const img = new Image();
    img.src = randomImagePath;
    enemy.image = img;

    game.enemies.push(enemy);
  }
};

export const spawnBoss = (game: any, canvasSize: { width: number; height: number }) => {
  const bossType = BOSS_TYPES[Math.floor(Math.random() * BOSS_TYPES.length)];

  // EXPONENTIAL BOSS SCALING - Based on time survived (in minutes)
  const minutesSurvived = Math.floor(game.gameTime / 60);
  const timeMultiplier = Math.pow(1.4, minutesSurvived); // 40% increase per minute (exponential!)

  // Aggressive boss scaling for late game
  let healthScaling = bossType.health * timeMultiplier;
  let damageScaling = bossType.damage * (1 + minutesSurvived * 0.15); // +15% damage per minute

  if (game.wave >= 7) {
    // Additional wave-based scaling on top of time scaling
    const wavesBeyond7 = game.wave - 6;
    healthScaling *= (1 + wavesBeyond7 * 0.5); // +50% per wave beyond 7
    damageScaling *= (1 + wavesBeyond7 * 0.25); // +25% damage per wave
  }

  // Get player's world position
  const playerX = game.player.x;
  const playerY = game.player.y;

  const boss = {
    x: playerX, // Spawn at player's x (horizontally aligned)
    y: playerY - canvasSize.height / 2 - 60, // Spawn above viewport
    ...bossType,
    health: healthScaling,
    maxHealth: healthScaling,
    damage: damageScaling,
    isBoss: true,
    width: bossType.size * 2,
    height: bossType.size * 2,
    // Boss ability cooldowns (rapid shooting + summoning)
    shootCooldown: 0,
    summonCooldown: 0
  };

  // Load image if boss has an imagePath
  if (bossType.imagePath) {
    const img = new Image();
    img.src = bossType.imagePath;
    boss.image = img;
  }

  game.enemies.push(boss);
};

export const spawnMinion = (game: any, x: number, y: number) => {
  const type = {...ENEMY_TYPES.intern};
  const minion: any = {
    x: x + (Math.random() - 0.5) * 60,
    y: y + (Math.random() - 0.5) * 60,
    ...type,
    health: type.health * 0.5,
    speed: type.speed * game.enemySpeedMod * 1.2,
    maxHealth: type.health * 0.5,
    width: type.size * 2,
    height: type.size * 2
  };

  // Randomly select an image from the pool for this individual minion
  const randomImagePath = ENEMY_IMAGE_POOL[Math.floor(Math.random() * ENEMY_IMAGE_POOL.length)];
  const img = new Image();
  img.src = randomImagePath;
  minion.image = img;

  game.enemies.push(minion);
};

export const spawnFinalTwinBosses = (game: any, canvasSize: { width: number; height: number }) => {
  // Get player's world position
  const playerX = game.player.x;
  const playerY = game.player.y;

  // Clear all existing enemies for dramatic entrance
  game.enemies.length = 0;
  game.enemyProjectiles.length = 0;

  // Spawn both twin bosses symmetrically around the player
  FINAL_TWIN_BOSSES.forEach((twinType, index) => {
    // Position twins on opposite sides of the player
    const angle = index === 0 ? 0 : Math.PI; // 0° and 180°
    const distance = canvasSize.width * 0.4; // 40% of viewport width away

    const twin = {
      x: playerX + Math.cos(angle) * distance,
      y: playerY + Math.sin(angle) * distance,
      ...twinType,
      health: twinType.health,
      maxHealth: twinType.health,
      damage: twinType.damage,
      isBoss: true,
      isFinalBoss: true,
      twinId: twinType.twinId,
      width: twinType.size * 2,
      height: twinType.size * 2,
      // Boss ability cooldowns
      shootCooldown: 0,
      summonCooldown: 0,
      teleportCooldown: 0, // Initialize teleport cooldown
      isEnraged: false, // Track if twin is enraged (when other twin dies)
      twinPartner: null // Will be set to reference the other twin
    };

    // Load image
    if (twinType.imagePath) {
      const img = new Image();
      img.src = twinType.imagePath;
      twin.image = img;
    }

    game.enemies.push(twin);
  });

  // Link twins to each other for coordinated behavior
  if (game.enemies.length >= 2) {
    game.enemies[game.enemies.length - 1].twinPartner = game.enemies[game.enemies.length - 2];
    game.enemies[game.enemies.length - 2].twinPartner = game.enemies[game.enemies.length - 1];
  }
};

export const generateOfficeObstacles = (width: number, height: number, scale: number = 1) => {
  const obstacles = [];
  const numDesks = 8; // Original count

  // Character spawns at center - define safe zone
  const centerX = width / 2;
  const centerY = height / 2;
  const safeRadius = 200; // Safe radius around player spawn point

  let attempts = 0;
  const maxAttempts = 100; // Prevent infinite loop

  while (obstacles.length < numDesks && attempts < maxAttempts) {
    attempts++;

    const obstacleWidth = (80 + Math.random() * 40) * scale;
    const obstacleHeight = (60 + Math.random() * 30) * scale;

    // Generate random position
    const x = Math.random() * (width - 200) + 100;
    const y = Math.random() * (height - 200) + 100;

    // Calculate distance from center (player spawn)
    const dx = x - centerX;
    const dy = y - centerY;
    const distanceFromCenter = Math.sqrt(dx * dx + dy * dy);

    // Only place obstacle if it's outside the safe radius
    if (distanceFromCenter > safeRadius) {
      obstacles.push({
        x,
        y,
        width: obstacleWidth,
        height: obstacleHeight,
        type: 'desk',
        color: '#64748B'
      });
    }
  }

  return obstacles;
};
