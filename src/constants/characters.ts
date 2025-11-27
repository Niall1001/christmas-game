import { CharacterClass } from '../types';

export const CHARACTER_CLASSES: Record<string, CharacterClass> = {
  warrior: {
    name: 'Compiler Knight',
    icon: '⚙️',
    emoji: '⚔️',
    description: 'Melee fighter with devastating sword swipes',
    color: '#EF4444',
    startingStats: {
      maxHealth: 180, // Buffed from 140 for melee survivability
      speed: 4.5,
      damageMultiplier: 1.7, // Buffed from 1.5 to reward close-range risk
      shootSpeed: 60, // Buffed from 72 for faster attacks
      projectileSize: 1.2,
      range: 150,
      size: 1.3, // Increased for better visibility
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
    name: 'Request Ranger',
    icon: '📡',
    emoji: '🏹',
    description: 'Ranged attacker with rapid arrow fire',
    color: '#10B981',
    startingStats: {
      maxHealth: 100,
      speed: 4.5,
      damageMultiplier: 1.0,
      shootSpeed: 30,
      projectileSize: 1.0,
      range: 300,
      size: 1.6, // Larger character sprite for better visibility
    },
    weaponType: 'ranged',
    ability: {
      name: 'Arrow Barrage',
      icon: '🎯',
      cooldown: 20000,
      description: 'Fire 20 arrows in all directions'
    }
  },
  mage: {
    name: 'Code Wizard',
    icon: '💻',
    emoji: '🔮',
    description: 'Magic user with powerful but slow spells',
    color: '#8B5CF6',
    startingStats: {
      maxHealth: 120,
      speed: 4.5,
      damageMultiplier: 1.8,
      shootSpeed: 36, // Slower than ranger (30) to match "powerful but slow spells"
      projectileSize: 1.3,
      range: 300,
      size: 1.0, // Default size
    },
    weaponType: 'magic',
    ability: {
      name: 'Spreadsheet Storm',
      icon: '⚡',
      cooldown: 20000,
      description: 'Paralyze nearby enemies then explode them!'
    }
  }
};
