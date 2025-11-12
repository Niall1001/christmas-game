import { Upgrade } from '../types';

export const UPGRADES: Record<string, Upgrade> = {
  // COMBAT UPGRADES
  squad_sync: {
    name: 'Squad Sync',
    icon: '👥',
    color: '#10B981',
    description: 'Increase fire rate',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: '+25% Fire Rate', effect: (g: any) => g.player.shootSpeed *= 0.75 },
      { desc: '+50% Fire Rate', effect: (g: any) => g.player.shootSpeed *= 0.75 },
      { desc: '+75% Fire Rate', effect: (g: any) => g.player.shootSpeed *= 0.75 },
      { desc: '+100% Fire Rate', effect: (g: any) => g.player.shootSpeed *= 0.75 },
      { desc: '+125% Fire Rate', effect: (g: any) => g.player.shootSpeed *= 0.75 }
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
      { desc: '+30% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.3 },
      { desc: '+60% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.3 },
      { desc: '+90% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.3 },
      { desc: '+120% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.3 },
      { desc: '+150% Damage', effect: (g: any) => g.player.damageMultiplier *= 1.5 }
    ]
  },
  multi_target: {
    name: 'Multi-Tasking',
    icon: '🎯',
    color: '#EC4899',
    description: 'Shoot multiple targets',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: 'Shoot 2 targets', effect: (g: any) => g.player.multiShot = 2 },
      { desc: 'Shoot 3 targets', effect: (g: any) => g.player.multiShot = 3 },
      { desc: 'Shoot 4 targets', effect: (g: any) => g.player.multiShot = 4 },
      { desc: 'Shoot 5 targets', effect: (g: any) => g.player.multiShot = 5 },
      { desc: 'Shoot 6 targets', effect: (g: any) => g.player.multiShot = 6 }
    ]
  },
  penetration: {
    name: 'CC Everyone',
    icon: '📝',
    color: '#F59E0B',
    description: 'Emails pierce through targets',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: 'Pierce 1 enemy', effect: (g: any) => g.player.piercing = 1 },
      { desc: 'Pierce 2 enemies', effect: (g: any) => g.player.piercing = 2 },
      { desc: 'Pierce 3 enemies', effect: (g: any) => g.player.piercing = 3 },
      { desc: 'Pierce 4 enemies', effect: (g: any) => g.player.piercing = 4 },
      { desc: 'Pierce 5 enemies', effect: (g: any) => g.player.piercing = 5 }
    ]
  },
  large_size: {
    name: 'Big Impact',
    icon: '📏',
    color: '#A855F7',
    description: 'Larger projectiles',
    category: 'combat',
    maxLevel: 5,
    levels: [
      { desc: '+35% Projectile Size', effect: (g: any) => g.player.projectileSize *= 1.35 },
      { desc: '+70% Projectile Size', effect: (g: any) => g.player.projectileSize *= 1.35 },
      { desc: '+105% Projectile Size', effect: (g: any) => g.player.projectileSize *= 1.35 },
      { desc: '+140% Projectile Size', effect: (g: any) => g.player.projectileSize *= 1.35 },
      { desc: '+175% Projectile Size', effect: (g: any) => g.player.projectileSize *= 1.35 }
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
      { desc: 'Small explosion', effect: (g: any) => g.player.explosionRadius = 40 },
      { desc: 'Medium explosion', effect: (g: any) => g.player.explosionRadius = 60 },
      { desc: 'Large explosion', effect: (g: any) => g.player.explosionRadius = 80 },
      { desc: 'Huge explosion', effect: (g: any) => g.player.explosionRadius = 100 },
      { desc: 'Massive explosion', effect: (g: any) => g.player.explosionRadius = 130 }
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
      { desc: '+25% Speed', effect: (g: any) => g.player.speed *= 1.25 },
      { desc: '+50% Speed', effect: (g: any) => g.player.speed *= 1.25 },
      { desc: '+75% Speed', effect: (g: any) => g.player.speed *= 1.25 },
      { desc: '+100% Speed', effect: (g: any) => g.player.speed *= 1.25 },
      { desc: '+125% Speed', effect: (g: any) => g.player.speed *= 1.25 }
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
      { desc: '+100 Max HP', effect: (g: any) => { g.player.maxHealth += 100; g.player.health = Math.min(g.player.maxHealth, g.player.health + 100); } }
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
      { desc: 'Enemies -12% speed', effect: (g: any) => g.enemySpeedMod *= 0.88 },
      { desc: 'Enemies -24% speed', effect: (g: any) => g.enemySpeedMod *= 0.88 },
      { desc: 'Enemies -36% speed', effect: (g: any) => g.enemySpeedMod *= 0.88 },
      { desc: 'Enemies -48% speed', effect: (g: any) => g.enemySpeedMod *= 0.88 },
      { desc: 'Enemies -60% speed', effect: (g: any) => g.enemySpeedMod *= 0.88 }
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
      { desc: '+125% XP Gain', effect: (g: any) => g.player.xpMultiplier *= 1.25 }
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
      { desc: '+200% Pickup Range', effect: (g: any) => g.player.pickupRadius *= 1.4 }
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
      { desc: '0.75 HP/sec', effect: (g: any) => g.player.healthRegen = 0.75 },
      { desc: '1.5 HP/sec', effect: (g: any) => g.player.healthRegen = 1.5 },
      { desc: '2.25 HP/sec', effect: (g: any) => g.player.healthRegen = 2.25 },
      { desc: '3 HP/sec', effect: (g: any) => g.player.healthRegen = 3 },
      { desc: '4 HP/sec', effect: (g: any) => g.player.healthRegen = 4 }
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
      { desc: '-75% Ability Cooldown', effect: (g: any) => g.player.abilityCooldownMod *= 0.85 }
    ]
  }
};
