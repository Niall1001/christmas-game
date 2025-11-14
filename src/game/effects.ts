export const createParticles = (game: any, x: number, y: number, color: string, count: number = 15) => {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
    const speed = 4 + Math.random() * 6;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      color,
      life: 40,
      maxLife: 40,
      type: 'normal'
    });
  }
};

export const createExplosion = (game: any, x: number, y: number, _radius: number, color: string = '#F59E0B') => {
  // Reduced from 60 to 25 for performance (60% reduction)
  const particleCount = 25;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
    const speed = 5 + Math.random() * 8;
    const size = 6 + Math.random() * 8;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color,
      life: 30,
      maxLife: 30,
      type: 'explosion'
    });
  }

  // Reduced from 30 to 10 for performance (60% reduction)
  for (let i = 0; i < 10; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.random() * 4,
      color: '#FCD34D',
      life: 35,
      maxLife: 35,
      type: 'explosion'
    });
  }
};

export const createElectricEffect = (game: any, x: number, y: number) => {
  for (let i = 0; i < 12; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 50,
      y: y + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: 5 + Math.random() * 3,
      color: '#8B5CF6',
      life: 20,
      maxLife: 20,
      type: 'spark'
    });
  }
  // Add bright flashes
  for (let i = 0; i < 6; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      size: 8 + Math.random() * 4,
      color: '#C4B5FD',
      life: 15,
      maxLife: 15,
      type: 'spark'
    });
  }
};

export const createLevelUpEffect = (game: any, x: number, y: number) => {
  // Golden explosion burst
  const particleCount = 80;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const speed = 6 + Math.random() * 10;
    const size = 6 + Math.random() * 8;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size,
      color: i % 2 === 0 ? '#FBBF24' : '#FCD34D',
      life: 50,
      maxLife: 50,
      type: 'levelup'
    });
  }

  // Rising stars
  for (let i = 0; i < 20; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 60,
      vx: (Math.random() - 0.5) * 2,
      vy: -5 - Math.random() * 5,
      size: 8 + Math.random() * 6,
      color: '#FEF3C7',
      life: 60,
      maxLife: 60,
      type: 'star'
    });
  }
};

export const createSmokeTrail = (game: any, x: number, y: number, size: number) => {
  // Create dark smoke particles for sword swipes
  const smokeCount = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < smokeCount; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * size,
      y: y + (Math.random() - 0.5) * size,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      size: size * 0.7 + Math.random() * size * 0.5,
      color: '#4B5563',
      life: 18 + Math.random() * 12,
      maxLife: 30,
      type: 'smoke'
    });
  }
};

export const createMagicTrail = (game: any, x: number, y: number, size: number, _color: string) => {
  // Create magical sparkle particles for mage spells
  if (Math.random() < 0.5) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * size,
      y: y + (Math.random() - 0.5) * size,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      size: 3 + Math.random() * 4,
      color: Math.random() < 0.5 ? '#C4B5FD' : '#8B5CF6',
      life: 20 + Math.random() * 15,
      maxLife: 35,
      type: 'magic'
    });
  }
};

export const createArrowTrail = (game: any, x: number, y: number, size: number, _color: string) => {
  // Create subtle trail for arrows
  if (Math.random() < 0.25) {
    game.particles.push({
      x,
      y,
      vx: 0,
      vy: 0,
      size: size * 0.5,
      color: '#10B981',
      life: 10 + Math.random() * 8,
      maxLife: 18,
      type: 'trail'
    });
  }
};

export const createTeleportEffect = (game: any, x: number, y: number, color: string) => {
  // Dimensional rift effect with expanding ring
  const particleCount = 40;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const speed = 4 + Math.random() * 6;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 8 + Math.random() * 6,
      color: color,
      life: 35,
      maxLife: 35,
      type: 'teleport'
    });
  }

  // Inner burst of lighter particles
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 6 + Math.random() * 4,
      color: '#FFFFFF',
      life: 25,
      maxLife: 25,
      type: 'teleport'
    });
  }

  // Vertical energy beams
  for (let i = 0; i < 8; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 30,
      y: y + (Math.random() - 0.5) * 30,
      vx: 0,
      vy: -8 - Math.random() * 4,
      size: 10 + Math.random() * 5,
      color: color,
      life: 30,
      maxLife: 30,
      type: 'beam'
    });
  }
};
