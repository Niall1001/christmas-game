import { CharacterClass } from '../types';

export const CHARACTER_CLASSES: Record<string, CharacterClass> = {
  warrior: {
    name: 'Coffee Warrior',
    icon: '☕',
    emoji: '⚔️',
    description: 'Melee fighter - visually distinct sword attacks',
    color: '#EF4444',
    startingStats: {
      maxHealth: 120,
      speed: 4.5,
      damageMultiplier: 1.2,
      shootSpeed: 12,
      projectileSize: 1.0,
      range: 300,
    },
    weaponType: 'melee',
    ability: {
      name: 'Whirlwind Strike',
      icon: '🌪️',
      cooldown: 10000,
      description: 'Spin attack damaging all nearby enemies'
    }
  },
  ranger: {
    name: 'Email Archer',
    icon: '📧',
    emoji: '🏹',
    description: 'Ranged attacker - visually distinct arrow attacks',
    color: '#10B981',
    startingStats: {
      maxHealth: 120,
      speed: 4.5,
      damageMultiplier: 1.2,
      shootSpeed: 12,
      projectileSize: 1.0,
      range: 300,
    },
    weaponType: 'ranged',
    ability: {
      name: 'Arrow Barrage',
      icon: '🎯',
      cooldown: 10000,
      description: 'Fire 20 arrows in all directions'
    }
  },
  mage: {
    name: 'Excel Wizard',
    icon: '📊',
    emoji: '🔮',
    description: 'Magic user - visually distinct spell attacks',
    color: '#8B5CF6',
    startingStats: {
      maxHealth: 120,
      speed: 4.5,
      damageMultiplier: 1.2,
      shootSpeed: 12,
      projectileSize: 1.0,
      range: 300,
    },
    weaponType: 'magic',
    ability: {
      name: 'Spreadsheet Storm',
      icon: '⚡',
      cooldown: 10000,
      description: 'Create an electrical storm that damages all enemies'
    }
  }
};
