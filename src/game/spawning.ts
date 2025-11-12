import { ENEMY_TYPES, BOSS_TYPES, ENEMY_IMAGE_POOL } from '../constants/enemies';

export const spawnEnemyGroup = (game: any, groupSize: number, canvasSize: { width: number; height: number }) => {
  // Spawn each enemy from a random side at random position along that edge
  for (let i = 0; i < groupSize; i++) {
    const side = Math.floor(Math.random() * 4);
    let x, y;

    switch (side) {
      case 0: // top - spread across entire width
        x = Math.random() * canvasSize.width;
        y = -30;
        break;
      case 1: // right - spread across entire height
        x = canvasSize.width + 30;
        y = Math.random() * canvasSize.height;
        break;
      case 2: // bottom - spread across entire width
        x = Math.random() * canvasSize.width;
        y = canvasSize.height + 30;
        break;
      case 3: // left - spread across entire height
        x = -30;
        y = Math.random() * canvasSize.height;
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

    const enemy: any = {
      x,
      y,
      ...type,
      speed: type.speed * game.enemySpeedMod,
      maxHealth: type.health,
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
  const scaledHealth = bossType.health + game.wave * 300;

  const boss = {
    x: canvasSize.width / 2,
    y: -60,
    ...bossType,
    health: scaledHealth,
    maxHealth: scaledHealth,
    isBoss: true,
    width: bossType.size * 2,
    height: bossType.size * 2,
    shootCooldown: 0
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

export const generateOfficeObstacles = (width: number, height: number, scale: number = 1) => {
  const obstacles = [];
  const numDesks = 8;

  for (let i = 0; i < numDesks; i++) {
    const obstacleWidth = (80 + Math.random() * 40) * scale;
    const obstacleHeight = (60 + Math.random() * 30) * scale;

    obstacles.push({
      x: Math.random() * (width - 200) + 100,
      y: Math.random() * (height - 200) + 100,
      width: obstacleWidth,
      height: obstacleHeight,
      type: 'desk',
      color: '#64748B'
    });
  }

  return obstacles;
};
