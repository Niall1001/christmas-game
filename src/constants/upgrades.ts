import { Upgrade } from '../types';

export const UPGRADES: Record<string, Upgrade> = {
  // COMBAT UPGRADES
  squad_sync: {
    name: 'Squad Sync',
    icon: '👥',
    color: '#10B981',
    description: 'Increase fire rate (Knight: +sword directions)',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: '+6% Fire Rate', descKnight: '2 Sword Directions', effect: (g: any) => {
        if (g.player.weaponType === 'melee') { g.player.swordBurstDirections = 2; }
        else { g.player.shootSpeed *= 0.94; }
      }},
      { desc: '+13% Fire Rate', descKnight: '3 Sword Directions', effect: (g: any) => {
        if (g.player.weaponType === 'melee') { g.player.swordBurstDirections = 3; }
        else { g.player.shootSpeed *= 0.94; }
      }},
      { desc: '+20% Fire Rate', descKnight: '4 Sword Directions', effect: (g: any) => {
        if (g.player.weaponType === 'melee') { g.player.swordBurstDirections = 4; }
        else { g.player.shootSpeed *= 0.94; }
      }},
      { desc: '+27% Fire Rate', descKnight: '6 Sword Directions', effect: (g: any) => {
        if (g.player.weaponType === 'melee') { g.player.swordBurstDirections = 6; }
        else { g.player.shootSpeed *= 0.94; }
      }},
      { desc: '⚡ ULTIMATE: +36% Fire Rate + 1 Multi-Shot', descKnight: '⚡ ULTIMATE: 8 Sword Directions + 1 Blade', effect: (g: any) => {
        if (g.player.weaponType === 'melee') { g.player.swordBurstDirections = 8; g.player.multiShot += 1; }
        else { g.player.shootSpeed *= 0.90; g.player.multiShot += 1; }
      }}
    ]
  },
  power_boost: {
    name: 'Power Boost',
    icon: '💪',
    color: '#EF4444',
    description: 'Increase damage',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: '+12% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.12 }, // Nerfed from 1.15
      { desc: '+25% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.12 },
      { desc: '+40% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.12 },
      { desc: '+57% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.12 },
      { desc: '💪 ULTIMATE: +80% Damage + 2 Pierce', effect: (g: any) => { g.player.damageMultiplier *= 1.15; g.player.piercing += 2; } } // Nerfed from 1.20
    ]
  },
  multi_target: {
    name: 'Multi-Tasking',
    icon: '🎯',
    color: '#EC4899',
    description: 'Shoot multiple targets (Knight: max 3 blades)',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: 'Shoot 2 targets', descKnight: '2 Orbiting Blades', effect: (g: any) => g.player.multiShot = 2 },
      { desc: 'Shoot 3 targets', descKnight: '3 Orbiting Blades (MAX)', effect: (g: any) => g.player.multiShot = 3 },
      { desc: 'Shoot 4 targets', descKnight: '3 Orbiting Blades (MAX)', effect: (g: any) => g.player.multiShot = 4 },
      { desc: 'Shoot 5 targets', descKnight: '3 Orbiting Blades (MAX)', effect: (g: any) => g.player.multiShot = 5 },
      { desc: '🎯 ULTIMATE: Shoot 6 targets + 20% Size', descKnight: '🎯 ULTIMATE: 3 Blades + Sword Burst Size', effect: (g: any) => { g.player.multiShot = 6; g.player.projectileSize *= 1.2; } }
    ]
  },
  penetration: {
    name: 'CC Everyone',
    icon: '📝',
    color: '#F59E0B',
    description: 'Projectiles pierce through targets',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: 'Pierce 1 enemy', descKnight: 'Pierce 1 + Chain Lightning on sword hit', effect: (g: any) => { g.player.piercing = 1; if (g.player.weaponType === 'magic') g.player.chainLightning = true; } },
      { desc: 'Pierce 2 enemies', effect: (g: any) => g.player.piercing = 2 },
      { desc: 'Pierce 3 enemies', effect: (g: any) => g.player.piercing = 3 },
      { desc: 'Pierce 4 enemies', effect: (g: any) => g.player.piercing = 4 },
      { desc: '📝 ULTIMATE: Pierce 5 enemies + 15% Fire Rate', effect: (g: any) => { g.player.piercing = 5; g.player.shootSpeed *= 0.85; } }
    ]
  },
  large_size: {
    name: 'Big Impact',
    icon: '📏',
    color: '#A855F7',
    description: 'Larger projectiles (Knight: sword burst only)',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: '+20% Projectile Size', descKnight: '+20% Sword Burst Size', effect: (g: any) => g.player.projectileSize *= 1.20 },
      { desc: '+44% Projectile Size', descKnight: '+44% Sword Burst Size', effect: (g: any) => g.player.projectileSize *= 1.20 },
      { desc: '+73% Projectile Size', descKnight: '+50% Sword Burst (MAX)', effect: (g: any) => g.player.projectileSize *= 1.20 },
      { desc: '+107% Projectile Size', descKnight: '+50% Sword Burst (MAX)', effect: (g: any) => g.player.projectileSize *= 1.20 },
      { desc: '📏 ULTIMATE: +150% Proj Size + 1 Pierce', descKnight: '📏 ULTIMATE: +50% Sword + 1 Pierce', effect: (g: any) => { g.player.projectileSize *= 1.20; g.player.piercing += 1; } }
    ]
  },
  explosion: {
    name: 'Explosive Meetings',
    icon: '💥',
    color: '#DC2626',
    description: 'Projectiles explode on impact',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: 'Small explosion (55 radius)', descKnight: 'Small explosion + Shockwave on blade hit', effect: (g: any) => { g.player.explosionRadius = 55; if (g.player.weaponType === 'melee') g.player.bladeShockwave = true; } },
      { desc: 'Medium explosion (75 radius)', effect: (g: any) => g.player.explosionRadius = 75 },
      { desc: 'Large explosion (100 radius)', effect: (g: any) => g.player.explosionRadius = 100 },
      { desc: 'Huge explosion (125 radius)', effect: (g: any) => g.player.explosionRadius = 125 },
      { desc: '💥 ULTIMATE: Massive Blast (150 radius) + 40% Damage + Chain Explosions', effect: (g: any) => { g.player.explosionRadius = 150; g.player.damageMultiplier *= 1.40; g.player.chainExplosions = true; } }
    ]
  },

  // UTILITY UPGRADES
  agile_sprint: {
    name: 'Agile Sprint',
    icon: '🏃',
    color: '#14B8A6',
    description: 'Increase movement speed',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: '+12% Speed', effect: (g: any) => g.player.speed *= 1.12 },
      { desc: '+25% Speed', effect: (g: any) => g.player.speed *= 1.12 },
      { desc: '+40% Speed', effect: (g: any) => g.player.speed *= 1.12 },
      { desc: '+57% Speed', effect: (g: any) => g.player.speed *= 1.12 },
      { desc: '🏃 ULTIMATE: +76% Speed + Invincibility Dash', effect: (g: any) => g.player.speed *= 1.12 }
    ]
  },
  wellness_program: {
    name: 'Health Benefits',
    icon: '❤️',
    color: '#F43F5E',
    description: 'Increase max health',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: '+40 Max HP', effect: (g: any) => { g.player.maxHealth += 40; g.player.health = Math.min(g.player.maxHealth, g.player.health + 40); } },
      { desc: '+50 Max HP', effect: (g: any) => { g.player.maxHealth += 50; g.player.health = Math.min(g.player.maxHealth, g.player.health + 50); } },
      { desc: '+60 Max HP', effect: (g: any) => { g.player.maxHealth += 60; g.player.health = Math.min(g.player.maxHealth, g.player.health + 60); } },
      { desc: '+75 Max HP', effect: (g: any) => { g.player.maxHealth += 75; g.player.health = Math.min(g.player.maxHealth, g.player.health + 75); } },
      { desc: '❤️ ULTIMATE: +100 Max HP + 6 HP/sec Regen', effect: (g: any) => { g.player.maxHealth += 100; g.player.health = Math.min(g.player.maxHealth, g.player.health + 100); } }
    ]
  },
  slow_enemies: {
    name: 'Bureaucracy',
    icon: '📋',
    color: '#8B5CF6',
    description: 'Slow down enemies',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: 'Enemies -24% speed', effect: (g: any) => g.enemySpeedMod *= 0.758 },
      { desc: 'Enemies -42% speed', effect: (g: any) => g.enemySpeedMod *= 0.758 },
      { desc: 'Enemies -56% speed', effect: (g: any) => g.enemySpeedMod *= 0.758 },
      { desc: 'Enemies -67% speed', effect: (g: any) => g.enemySpeedMod *= 0.758 },
      { desc: '📋 ULTIMATE: Enemies -75% speed + 30% less spawns', effect: (g: any) => g.enemySpeedMod *= 0.758 }
    ]
  },
  productivity_boost: {
    name: 'Productivity+',
    icon: '📈',
    color: '#06B6D4',
    description: 'Gain more XP',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: '+25% XP Gain', effect: (g: any) => g.player.xpMultiplier *= 1.25 },
      { desc: '+50% XP Gain', effect: (g: any) => g.player.xpMultiplier *= 1.25 },
      { desc: '+75% XP Gain', effect: (g: any) => g.player.xpMultiplier *= 1.25 },
      { desc: '+100% XP Gain', effect: (g: any) => g.player.xpMultiplier *= 1.25 },
      { desc: '📈 ULTIMATE: Triple XP + Double Pickup Range', effect: (g: any) => g.player.xpMultiplier *= 1.25 }
    ]
  },
  magnet: {
    name: 'Resource Grab',
    icon: '🧲',
    color: '#FBBF24',
    description: 'Larger pickup radius',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: '+40% Pickup Range', effect: (g: any) => g.player.pickupRadius *= 1.4 },
      { desc: '+80% Pickup Range', effect: (g: any) => g.player.pickupRadius *= 1.4 },
      { desc: '+120% Pickup Range', effect: (g: any) => g.player.pickupRadius *= 1.4 },
      { desc: '+160% Pickup Range', effect: (g: any) => g.player.pickupRadius *= 1.4 },
      { desc: '🧲 ULTIMATE: +200% Pickup Range + Auto-Collect', effect: (g: any) => g.player.pickupRadius *= 1.4 }
    ]
  },
  regen: {
    name: 'Coffee Break',
    icon: '☕',
    color: '#22C55E',
    description: 'Regenerate health over time',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: '0.3 HP/sec', descKnight: '0.3 HP/sec + Lifesteal on hit (Ranger)', effect: (g: any) => { g.player.healthRegen = 0.3; if (g.player.weaponType === 'ranged') g.player.lifesteal = 0.02; } },
      { desc: '0.5 HP/sec', effect: (g: any) => g.player.healthRegen = 0.5 },
      { desc: '0.8 HP/sec', effect: (g: any) => g.player.healthRegen = 0.8 },
      { desc: '1.2 HP/sec', effect: (g: any) => g.player.healthRegen = 1.2 },
      { desc: '☕ ULTIMATE: 1.8 HP/sec + Overheal to 120%', effect: (g: any) => g.player.healthRegen = 1.8 }
    ]
  },
  dash_cooldown: {
    name: 'Quick Dash',
    icon: '💨',
    color: '#14B8A6',
    description: 'Reduce ability cooldown',
    category: 'utility',
    maxLevel: 5,
    levels: [
      { desc: '-15% Ability Cooldown', effect: (g: any) => g.player.abilityCooldownMod *= 0.85 },
      { desc: '-30% Ability Cooldown', effect: (g: any) => g.player.abilityCooldownMod *= 0.85 },
      { desc: '-45% Ability Cooldown', effect: (g: any) => g.player.abilityCooldownMod *= 0.85 },
      { desc: '-60% Ability Cooldown', effect: (g: any) => g.player.abilityCooldownMod *= 0.85 },
      { desc: '💨 ULTIMATE: -75% Cooldown + Double Duration', effect: (g: any) => g.player.abilityCooldownMod *= 0.85 }
    ]
  }
};
