export const createParticles = (game: any, x: number, y: number, color: string, count: number = 10) => {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const speed = 3 + Math.random() * 4;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 4 + Math.random() * 4,
      color,
      life: 35,
      maxLife: 35,
      type: 'normal'
    });
  }
};

export const createExplosion = (game: any, x: number, y: number, radius: number, color: string = '#F59E0B') => {
  const particleCount = 40;
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount;
    const speed = 4 + Math.random() * 6;
    game.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 5,
      color,
      life: 25,
      maxLife: 25,
      type: 'explosion'
    });
  }
};

export const createElectricEffect = (game: any, x: number, y: number) => {
  for (let i = 0; i < 5; i++) {
    game.particles.push({
      x: x + (Math.random() - 0.5) * 40,
      y: y + (Math.random() - 0.5) * 40,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      size: 4,
      color: '#8B5CF6',
      life: 15,
      maxLife: 15,
      type: 'spark'
    });
  }
};
