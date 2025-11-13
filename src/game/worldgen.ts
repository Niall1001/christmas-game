// World generation system for infinite expanding world

export const CHUNK_SIZE = 1000; // Size of each chunk in world units

// Convert world position to chunk coordinates
export const getChunkKey = (worldX: number, worldY: number): string => {
  const chunkX = Math.floor(worldX / CHUNK_SIZE);
  const chunkY = Math.floor(worldY / CHUNK_SIZE);
  return `${chunkX},${chunkY}`;
};

// Generate obstacles for a specific chunk
export const generateChunk = (chunkX: number, chunkY: number, game: any, scale: number = 1) => {
  const chunkKey = `${chunkX},${chunkY}`;

  // Skip if chunk already generated
  if (game.generatedChunks && game.generatedChunks.has(chunkKey)) {
    return;
  }

  // Initialize generatedChunks set if it doesn't exist
  if (!game.generatedChunks) {
    game.generatedChunks = new Set<string>();
  }

  // Mark chunk as generated
  game.generatedChunks.add(chunkKey);

  // Calculate world position of chunk
  const chunkWorldX = chunkX * CHUNK_SIZE;
  const chunkWorldY = chunkY * CHUNK_SIZE;

  // Generate obstacles for this chunk
  const obstaclesPerChunk = 3; // Number of desks per chunk (reduced for more open space)
  const centerChunk = chunkX === 0 && chunkY === 0; // Is this the starting chunk?

  // Generate regular desks (using image 0 or 1)
  for (let i = 0; i < obstaclesPerChunk; i++) {
    const obstacleWidth = (80 + Math.random() * 40) * scale;
    const obstacleHeight = (60 + Math.random() * 30) * scale;

    // Random position within chunk
    const x = chunkWorldX + Math.random() * CHUNK_SIZE;
    const y = chunkWorldY + Math.random() * CHUNK_SIZE;

    // If center chunk, avoid spawning area (player starts at 0,0 in world coordinates)
    if (centerChunk) {
      // Calculate obstacle center position
      const obstacleCenterX = x + obstacleWidth / 2;
      const obstacleCenterY = y + obstacleHeight / 2;

      // Check distance from spawn point (0, 0) to obstacle center
      const distanceFromSpawn = Math.sqrt(obstacleCenterX * obstacleCenterX + obstacleCenterY * obstacleCenterY);

      // Larger safe zone: 300 units + half the diagonal of the obstacle
      const obstacleDiagonal = Math.sqrt(obstacleWidth * obstacleWidth + obstacleHeight * obstacleHeight);
      const safeDistance = 300 + obstacleDiagonal / 2;

      if (distanceFromSpawn < safeDistance) {
        continue; // Skip this obstacle, too close to spawn
      }
    }

    // Randomly select one of the regular desk images (0, 1, or 3)
    const randomValue = Math.random();
    let imageIndex;
    if (randomValue < 0.33) {
      imageIndex = 0;
    } else if (randomValue < 0.66) {
      imageIndex = 1;
    } else {
      imageIndex = 3;
    }

    game.obstacles.push({
      x,
      y,
      width: obstacleWidth,
      height: obstacleHeight,
      type: 'desk',
      color: '#64748B',
      imageIndex: imageIndex // Store which image this obstacle should use
    });
  }

  // Sparse special obstacle (30% chance per chunk, uses image 2)
  if (Math.random() < 0.3) {
    const obstacleWidth = (80 + Math.random() * 40) * scale;
    const obstacleHeight = (60 + Math.random() * 30) * scale;

    // Random position within chunk
    const x = chunkWorldX + Math.random() * CHUNK_SIZE;
    const y = chunkWorldY + Math.random() * CHUNK_SIZE;

    // If center chunk, avoid spawning area
    if (centerChunk) {
      const obstacleCenterX = x + obstacleWidth / 2;
      const obstacleCenterY = y + obstacleHeight / 2;
      const distanceFromSpawn = Math.sqrt(obstacleCenterX * obstacleCenterX + obstacleCenterY * obstacleCenterY);
      const obstacleDiagonal = Math.sqrt(obstacleWidth * obstacleWidth + obstacleHeight * obstacleHeight);
      const safeDistance = 300 + obstacleDiagonal / 2;

      if (distanceFromSpawn >= safeDistance) {
        // Only add if safe distance check passes
        game.obstacles.push({
          x,
          y,
          width: obstacleWidth,
          height: obstacleHeight,
          type: 'special',
          color: '#64748B',
          imageIndex: 2 // Use the third image
        });
      }
    } else {
      // Not center chunk, add freely
      game.obstacles.push({
        x,
        y,
        width: obstacleWidth,
        height: obstacleHeight,
        type: 'special',
        color: '#64748B',
        imageIndex: 2 // Use the third image
      });
    }
  }
};

// Check if player is near ungenerated chunks and generate them
export const checkAndGenerateChunks = (player: any, game: any, scale: number = 1) => {
  const generationRadius = 1.5; // Generate chunks within 1.5 chunks of player

  // Get player's chunk coordinates
  const playerChunkX = Math.floor(player.x / CHUNK_SIZE);
  const playerChunkY = Math.floor(player.y / CHUNK_SIZE);

  // Generate surrounding chunks
  for (let dx = -generationRadius; dx <= generationRadius; dx++) {
    for (let dy = -generationRadius; dy <= generationRadius; dy++) {
      const chunkX = playerChunkX + dx;
      const chunkY = playerChunkY + dy;
      generateChunk(chunkX, chunkY, game, scale);
    }
  }
};

// Get nearby obstacles (for collision optimization)
export const getNearbyObstacles = (x: number, y: number, obstacles: any[], radius: number = 500) => {
  return obstacles.filter(obstacle => {
    const dx = obstacle.x - x;
    const dy = obstacle.y - y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < radius;
  });
};
