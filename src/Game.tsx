import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skull, Heart, Zap, Trophy, Play, RotateCcw, Star, Sword, Sparkles, Shield, Bomb, Wind, Users, Pause, Info } from 'lucide-react';

// Import types
import type { Particle, GameState } from './types';

// Import constants
import { CHARACTER_CLASSES } from './constants/characters';
import { ENEMY_TYPES, BOSS_TYPES } from './constants/enemies';
import { UPGRADES } from './constants/upgrades';

// Import game logic
import { whirlwindAbility, barrageAbility, stormAbility } from './game/abilities';
import { checkCollision, checkRectCollision, applyExplosionDamage, applyPlayerExplosionDamage, findNearestEnemies, shootAtTarget, enemyShoot, dropXP } from './game/combat';
import { spawnEnemyGroup, spawnBoss, spawnMinion, generateOfficeObstacles } from './game/spawning';
import { render } from './game/rendering';
import { createParticles, createExplosion, createElectricEffect } from './game/effects';

// Import utilities
import { formatTime, getXPForLevel, saveGameStats } from './utils/helpers';

// Import components
import { Leaderboard } from './components/Leaderboard';

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const keysPressed = useRef<Record<string, boolean>>({});
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const joystickPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 1200, height: 800 });

  const [gameState, setGameState] = useState<GameState>('menu');
  const [selectedCharacter, setSelectedCharacter] = useState<keyof typeof CHARACTER_CLASSES | null>(null);
  const [stats, setStats] = useState({
    health: 100,
    maxHealth: 100,
    score: 0,
    wave: 1,
    kills: 0,
    time: 0,
    level: 1,
    xp: 0,
    xpToNext: 100,
    timeRemaining: 600 // 10 minutes in seconds
  });
  const [upgradeChoices, setUpgradeChoices] = useState<any[]>([]);
  const [playerUpgrades, setPlayerUpgrades] = useState<Record<string, number>>({});
  const [upgradeCategory, setUpgradeCategory] = useState<'combat' | 'utility' | null>(null);
  const [abilityReady, setAbilityReady] = useState(true);
  const [touchControls, setTouchControls] = useState({ visible: false, action: false });
  const [username, setUsername] = useState(localStorage.getItem('officeGame_username') || '');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalRank, setFinalRank] = useState<number | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Scale factors for mobile
  const playerScale = isMobile ? 0.7 : 1;
  const obstacleScale = isMobile ? 0.6 : 1;

  // Responsive canvas sizing
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight - 100; // Leave space for UI
        setCanvasSize({ width: Math.max(800, width), height: Math.max(600, height) });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const gameData = useRef<any>({
    player: null,
    projectiles: [],
    enemyProjectiles: [],
    enemies: [],
    particles: [],
    xpOrbs: [],
    obstacles: [],
    wave: 1,
    waveTimer: 0,
    score: 0,
    kills: 0,
    groupSpawnTimer: 0,
    bossMode: false,
    gameTime: 0,
    upgrades: {},
    enemySpeedMod: 1,
    spawnRateMod: 1,
    abilityTimer: 0,
    screenShake: 0,
    timeRemaining: 600
  });

  const startGame = useCallback(() => {
    if (!selectedCharacter) return;

    const charClass = CHARACTER_CLASSES[selectedCharacter];
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;

    // Scaled player dimensions
    const playerWidth = 40 * playerScale;
    const playerHeight = 40 * playerScale;

    gameData.current = {
      player: {
        x: centerX,
        y: centerY,
        width: playerWidth,
        height: playerHeight,
        ...charClass.startingStats,
        health: charClass.startingStats.maxHealth,
        baseSpeed: charClass.startingStats.speed,
        color: charClass.color,
        shootCooldown: 0,
        baseShootSpeed: charClass.startingStats.shootSpeed,
        multiShot: 1,
        piercing: 0,
        explosionRadius: 0,
        xpMultiplier: 1,
        pickupRadius: 120,
        healthRegen: 0,
        xp: 0,
        level: 1,
        characterClass: selectedCharacter,
        weaponType: charClass.weaponType,
        abilityCooldownMod: 1,
        abilityReady: true
      },
      projectiles: [],
      enemyProjectiles: [],
      enemies: [],
      particles: [],
      xpOrbs: [],
      obstacles: generateOfficeObstacles(canvasSize.width, canvasSize.height, obstacleScale),
      wave: 1,
      waveTimer: 0,
      score: 0,
      kills: 0,
      groupSpawnTimer: 0,
      bossMode: false,
      gameTime: 0,
      timeRemaining: 600,
      upgrades: {},
      enemySpeedMod: 1,
      spawnRateMod: 1,
      abilityTimer: 0,
      screenShake: 0
    };

    setStats({
      health: charClass.startingStats.maxHealth,
      maxHealth: charClass.startingStats.maxHealth,
      score: 0,
      wave: 1,
      kills: 0,
      time: 0,
      level: 1,
      xp: 0,
      xpToNext: 100,
      timeRemaining: 600
    });

    setPlayerUpgrades({});
    setAbilityReady(true);
    setGameState('playing');
  }, [selectedCharacter, canvasSize]);

  const checkLevelUp = (game: any) => {
    const xpNeeded = getXPForLevel(game.player.level);
    if (game.player.xp >= xpNeeded) {
      game.player.xp -= xpNeeded;
      game.player.level++;

      // Count current upgrades by category
      const combatCount = Object.entries(game.upgrades).filter(([key]) =>
        UPGRADES[key as keyof typeof UPGRADES]?.category === 'combat'
      ).length;
      const utilityCount = Object.entries(game.upgrades).filter(([key]) =>
        UPGRADES[key as keyof typeof UPGRADES]?.category === 'utility'
      ).length;

      // Filter available upgrades based on limits (3 combat, 3 utility max)
      const availableUpgrades = Object.entries(UPGRADES).filter(([key, upgrade]) => {
        const currentLevel = game.upgrades[key] || 0;

        // If already have this upgrade, can level it up
        if (currentLevel > 0 && currentLevel < upgrade.maxLevel) return true;

        // If don't have this upgrade yet, check category limits
        if (currentLevel === 0) {
          if (upgrade.category === 'combat' && combatCount >= 3) return false;
          if (upgrade.category === 'utility' && utilityCount >= 3) return false;
          return true;
        }

        return currentLevel < upgrade.maxLevel;
      });

      const choices = [];
      const shuffled = [...availableUpgrades].sort(() => Math.random() - 0.5);
      for (let i = 0; i < Math.min(3, shuffled.length); i++) {
        const [key, upgrade] = shuffled[i];
        const currentLevel = game.upgrades[key] || 0;
        choices.push({
          key,
          ...upgrade,
          currentLevel,
          nextLevel: currentLevel + 1
        });
      }

      setUpgradeChoices(choices);
      setGameState('levelup');
    }
  };

  const selectUpgrade = (upgradeKey: string) => {
    const game = gameData.current;
    const upgrade = UPGRADES[upgradeKey as keyof typeof UPGRADES];
    const currentLevel = game.upgrades[upgradeKey] || 0;

    upgrade.levels[currentLevel].effect(game);
    game.upgrades[upgradeKey] = currentLevel + 1;

    // Gentler difficulty scaling for longer survival
    const totalUpgradeLevels = Object.values(game.upgrades).reduce((sum: number, level: any) => sum + level, 0);

    // Much more gradual spawn rate increase
    game.spawnRateMod = 1 + (totalUpgradeLevels * 0.08);

    // Slower enemy speed increase
    game.enemySpeedMod = 1 + (totalUpgradeLevels * 0.025);

    setPlayerUpgrades({...game.upgrades});
    setGameState('playing');
  };

  const useAbility = () => {
    const game = gameData.current;
    if (!game.player.abilityReady || !abilityReady) return;

    const charClass = CHARACTER_CLASSES[game.player.characterClass];
    const cooldown = charClass.ability.cooldown * game.player.abilityCooldownMod;

    // Execute ability based on class
    switch (game.player.characterClass) {
      case 'warrior':
        whirlwindAbility(game);
        break;
      case 'ranger':
        barrageAbility(game);
        break;
      case 'mage':
        stormAbility(game);
        break;
    }

    game.player.abilityReady = false;
    setAbilityReady(false);

    setTimeout(() => {
      if (gameData.current.player) {
        gameData.current.player.abilityReady = true;
        setAbilityReady(true);
      }
    }, cooldown);
  };

  // Touch controls
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (gameState !== 'playing') return;

      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // Check if touch is on ability button area (bottom right)
      if (x > canvasSize.width - 100 && y > canvasSize.height - 100) {
        useAbility();
      } else {
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        setTouchControls({ visible: true, action: false });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartPos.current) return;

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;

      const magnitude = Math.sqrt(dx * dx + dy * dy);
      const maxDist = 50;

      joystickPos.current = {
        x: Math.max(-maxDist, Math.min(maxDist, dx)),
        y: Math.max(-maxDist, Math.min(maxDist, dy))
      };
    };

    const handleTouchEnd = () => {
      touchStartPos.current = null;
      joystickPos.current = { x: 0, y: 0 };
      setTouchControls({ visible: false, action: false });
    };

    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [gameState, canvasSize, abilityReady]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;

      if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'playing') {
          setGameState('paused');
        } else if (gameState === 'paused') {
          setGameState('playing');
        }
      }

      if (gameState === 'playing') {
        if (e.key === ' ' || e.key.toLowerCase() === 'e') {
          e.preventDefault();
          useAbility();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameData.current;

    const gameLoop = () => {
      updateGame(game, ctx);
      render(ctx, game, canvasSize);

      const xpToNext = getXPForLevel(game.player.level);
      setStats({
        health: Math.max(0, Math.floor(game.player.health)),
        maxHealth: game.player.maxHealth,
        score: game.score,
        wave: game.wave,
        kills: game.kills,
        time: Math.floor(game.gameTime),
        level: game.player.level,
        xp: Math.floor(game.player.xp),
        xpToNext,
        timeRemaining: Math.max(0, Math.floor(game.timeRemaining))
      });

      if (game.player.health <= 0) {
        saveGameStats(game, username).then(result => {
          if (result?.rank) setFinalRank(result.rank);
        });
        setGameState('gameover');
        return;
      }

      if (game.timeRemaining <= 0) {
        saveGameStats(game, username).then(result => {
          if (result?.rank) setFinalRank(result.rank);
        });
        setGameState('victory');
        return;
      }

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState]);

  const updateGame = (game: any, ctx: CanvasRenderingContext2D) => {
    const { player, enemies, projectiles, enemyProjectiles, particles, xpOrbs, obstacles } = game;

    game.gameTime += 1/60;
    game.timeRemaining -= 1/60;
    game.waveTimer += 1/60;

    // Screen shake decay
    if (game.screenShake > 0) {
      game.screenShake *= 0.9;
    }

    // Health regeneration
    if (player.healthRegen > 0) {
      player.health = Math.min(player.maxHealth, player.health + player.healthRegen / 60);
    }

    // Boss spawning every 60 seconds (easier difficulty)
    if (game.waveTimer >= 60 && !game.bossMode) {
      game.bossMode = true;
      spawnBoss(game, canvasSize);
      game.wave++;
      game.waveTimer = 0;
    }

    // Update player position (keyboard + touch)
    let moveX = 0;
    let moveY = 0;

    if (keysPressed.current['w'] || keysPressed.current['arrowup']) moveY -= 1;
    if (keysPressed.current['s'] || keysPressed.current['arrowdown']) moveY += 1;
    if (keysPressed.current['a'] || keysPressed.current['arrowleft']) moveX -= 1;
    if (keysPressed.current['d'] || keysPressed.current['arrowright']) moveX += 1;

    // Touch controls
    if (joystickPos.current.x !== 0 || joystickPos.current.y !== 0) {
      moveX = joystickPos.current.x / 50;
      moveY = joystickPos.current.y / 50;
    }

    // Normalize diagonal movement
    if (moveX !== 0 && moveY !== 0) {
      const factor = 1 / Math.sqrt(2);
      moveX *= factor;
      moveY *= factor;
    }

    const newX = player.x + moveX * player.speed;
    const newY = player.y + moveY * player.speed;

    // Check obstacle collision
    let canMove = true;
    for (const obstacle of obstacles) {
      if (checkRectCollision(
        { x: newX, y: newY, width: player.width, height: player.height },
        obstacle
      )) {
        canMove = false;
        break;
      }
    }

    if (canMove) {
      player.x = Math.max(player.width / 2, Math.min(canvasSize.width - player.width / 2, newX));
      player.y = Math.max(player.height / 2, Math.min(canvasSize.height - player.height / 2, newY));
    }

    // Auto-shoot
    if (player.shootCooldown <= 0 && enemies.length > 0) {
      const targets = findNearestEnemies(player, enemies, player.multiShot);
      targets.forEach((target: any) => shootAtTarget(game, player, target));
      player.shootCooldown = player.shootSpeed;
    } else {
      player.shootCooldown--;
    }

    // Update projectiles with trails
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Add trail effect
      if (proj.trail && Math.random() < 0.3) {
        game.particles.push({
          x: proj.x,
          y: proj.y,
          vx: 0,
          vy: 0,
          size: proj.size * 0.7,
          color: proj.color,
          life: 10,
          maxLife: 10,
          type: 'trail'
        });
      }

      if (proj.x < 0 || proj.x > canvasSize.width || proj.y < 0 || proj.y > canvasSize.height) {
        projectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];
        if (checkCollision(proj, enemy)) {

          // Handle shielded enemies
          if (enemy.hasShield && enemy.shield > 0) {
            enemy.shield--;
            if (enemy.shield <= 0) {
              enemy.hasShield = false;
            }
            createParticles(game, enemy.x, enemy.y, '#60A5FA', 8);
          } else {
            enemy.health -= proj.damage;
            createParticles(game, enemy.x, enemy.y, enemy.color, 6);
          }

          // Explosion effect
          if (player.explosionRadius > 0) {
            applyExplosionDamage(game, proj.x, proj.y, player.explosionRadius, proj.damage * 0.6);
            createExplosion(game, proj.x, proj.y, player.explosionRadius);
            game.screenShake = 5;
          }

          proj.pierceCount = (proj.pierceCount || 0) + 1;
          if (proj.pierceCount > player.piercing) {
            projectiles.splice(i, 1);
          }

          if (enemy.health <= 0) {
            game.score += enemy.scoreValue * game.wave;
            game.kills++;
            createParticles(game, enemy.x, enemy.y, enemy.color, 25);
            dropXP(game, enemy.x, enemy.y, enemy.xpValue);

            // Exploder enemy explosion
            if (enemy.type === 'angry_client') {
              applyExplosionDamage(game, enemy.x, enemy.y, enemy.explosionRadius, enemy.explosionDamage);
              createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308');
              game.screenShake = 8;
            }

            enemies.splice(j, 1);

            if (enemy.isBoss) {
              game.bossMode = false;
              dropXP(game, enemy.x, enemy.y, enemy.xpValue * 6);
              game.screenShake = 20;
            }
          }
          break;
        }
      }
    }

    // Update enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const proj = enemyProjectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      if (proj.x < 0 || proj.x > canvasSize.width || proj.y < 0 || proj.y > canvasSize.height) {
        enemyProjectiles.splice(i, 1);
        continue;
      }

      if (checkCollision(proj, player)) {
        player.health -= proj.damage;
        createParticles(game, proj.x, proj.y, '#EF4444', 10);
        game.screenShake = 3;
        enemyProjectiles.splice(i, 1);
      }
    }

    // Update enemies with special behaviors
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Shooter behavior
      if (enemy.type === 'emailer') {
        if (dist < enemy.shootRange) {
          enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
          if (enemy.shootCooldown <= 0) {
            enemyShoot(game, enemy, player);
            enemy.shootCooldown = 100;
          }
        }
      }

      // Teleporter behavior
      if (enemy.type === 'teleporter') {
        enemy.teleportCooldown = (enemy.teleportCooldown || 0) - 1;
        if (enemy.teleportCooldown <= 0 && dist > 150) {
          createParticles(game, enemy.x, enemy.y, enemy.color, 15);
          enemy.x = player.x + (Math.random() - 0.5) * 200;
          enemy.y = player.y + (Math.random() - 0.5) * 200;
          createParticles(game, enemy.x, enemy.y, enemy.color, 15);
          enemy.teleportCooldown = 180;
        }
      }

      // Summoner behavior
      if (enemy.type === 'summoner') {
        enemy.summonCooldown = (enemy.summonCooldown || 0) - 1;
        if (enemy.summonCooldown <= 0 && game.enemies.length < 50) {
          spawnMinion(game, enemy.x, enemy.y);
          enemy.summonCooldown = 240;
        }
      }

      // Swarm behavior
      let moveSpeed = enemy.speed * game.enemySpeedMod;
      if (enemy.type === 'salesperson' && dist < 250) {
        moveSpeed *= 1.6;
      }

      // Check obstacle collision for enemies (bosses bypass obstacles)
      let targetX = enemy.x + (dx / dist) * moveSpeed;
      let targetY = enemy.y + (dy / dist) * moveSpeed;

      let blocked = false;
      if (!enemy.isBoss) {
        for (const obstacle of obstacles) {
          if (checkRectCollision(
            { x: targetX, y: targetY, width: enemy.size * 2, height: enemy.size * 2 },
            obstacle
          )) {
            blocked = true;
            break;
          }
        }
      }

      if (!blocked && dist > 0) {
        enemy.x = targetX;
        enemy.y = targetY;
      }

      if (checkCollision(enemy, player)) {
        player.health -= enemy.damage;
        createParticles(game, player.x, player.y, '#EF4444', 12);
        game.screenShake = 5;

        if (enemy.type === 'angry_client') {
          applyPlayerExplosionDamage(game, enemy.x, enemy.y, enemy.explosionRadius, enemy.explosionDamage);
          createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308');
          game.screenShake = 10;
        }

        enemies.splice(i, 1);
      }
    }

    // Update XP orbs
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
      const orb = xpOrbs[i];

      const dx = player.x - orb.x;
      const dy = player.y - orb.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < player.pickupRadius) {
        const speed = 10;
        orb.x += (dx / dist) * speed;
        orb.y += (dy / dist) * speed;
      }

      if (checkCollision(orb, player)) {
        player.xp += orb.value * player.xpMultiplier;
        createParticles(game, orb.x, orb.y, '#FBBF24', 12);
        xpOrbs.splice(i, 1);
        checkLevelUp(game);
      }
    }

    // Smooth enemy spawning (gradual difficulty increase over 10 minutes)
    if (!game.bossMode) {
      game.groupSpawnTimer++;

      // Continuous time-based multiplier scaling over full 10 minutes
      const timeMultiplier = 1 + (game.gameTime / 400); // Reaches 2.5x at 10 minutes

      // Continuous spawn rate acceleration over full duration
      const baseRate = Math.max(45, 180 - game.gameTime * 0.2); // Continuous scaling to 10 minutes
      const groupSpawnRate = baseRate / game.spawnRateMod;

      if (game.groupSpawnTimer >= groupSpawnRate) {
        // Gradual group size increase scaling with time
        const baseGroupSize = Math.floor(1.5 + game.wave * 0.2 + timeMultiplier * 0.4);
        const groupSize = Math.floor(baseGroupSize * game.spawnRateMod);
        spawnEnemyGroup(game, groupSize, canvasSize);
        game.groupSpawnTimer = 0;
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'trail') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      p.life--;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center">
      {/* Title Bar */}
      <div className="w-full text-center py-4 bg-black/30 backdrop-blur-sm">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-1 flex items-center justify-center gap-3">
          <Zap className="w-10 h-10 md:w-12 md:h-12 text-yellow-400" />
          Office Survivor
        </h1>
        <p className="text-purple-300 text-sm md:text-base">Survive the corporate chaos for 10 minutes!</p>
      </div>

      <div className="relative flex-1 w-full flex items-center justify-center p-2">
        {/* HUD Overlay */}
        {gameState === 'playing' && (
          <>
            <div className="absolute top-2 left-2 right-2 bg-black/70 backdrop-blur-sm p-3 z-20 rounded-xl border border-purple-500/30">
              {/* Pause button */}
              <button
                onClick={() => setGameState('paused')}
                className="absolute top-2 right-2 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors z-30"
              >
                <Pause className="w-4 h-4 text-white" />
              </button>

              <div className="space-y-2">
                {/* Stats Row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs md:text-sm mb-2 pr-12">
                  <div className="flex items-center gap-1 bg-purple-900/40 rounded-lg px-2 py-1">
                    <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    <span className="text-gray-300 font-semibold truncate">{stats.score.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-blue-900/40 rounded-lg px-2 py-1">
                    <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="text-gray-300 font-semibold">Lv.{stats.level}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-red-900/40 rounded-lg px-2 py-1">
                    <Skull className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-gray-300 font-semibold">{stats.kills}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-orange-900/40 rounded-lg px-2 py-1">
                    <Wind className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span className="text-gray-300 font-semibold">W{stats.wave}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-green-900/40 rounded-lg px-2 py-1">
                    <span className="text-green-400 font-bold flex-shrink-0">⏱</span>
                    <span className="text-gray-300 font-semibold">{formatTime(stats.timeRemaining)}</span>
                  </div>
                </div>

                {/* Health Bar */}
                <div className="h-5 bg-gray-800 rounded-full overflow-hidden border border-red-900">
                  <div
                    className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all flex items-center justify-center"
                    style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-lg">❤️ {stats.health}/{stats.maxHealth}</span>
                  </div>
                </div>

                {/* XP Bar */}
                <div className="h-4 bg-gray-800 rounded-full overflow-hidden border border-yellow-900 relative">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all"
                    style={{ width: `${(stats.xp / stats.xpToNext) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white drop-shadow-lg">
                    ⭐ {stats.xp}/{stats.xpToNext}
                  </span>
                </div>
              </div>
            </div>

            {/* Ability Button */}
            <button
              onClick={useAbility}
              disabled={!abilityReady}
              className={`absolute bottom-20 md:bottom-6 right-6 z-20 w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center text-3xl md:text-4xl transition-all ${
                abilityReady
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 hover:scale-110 cursor-pointer shadow-lg shadow-purple-500/50'
                  : 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'
              }`}
            >
              {selectedCharacter && CHARACTER_CLASSES[selectedCharacter].ability.icon}
            </button>

            {/* Touch controls joystick visualization */}
            {touchControls.visible && touchStartPos.current && (
              <div
                className="absolute w-32 h-32 rounded-full border-4 border-white/30 bg-white/10 z-30 pointer-events-none"
                style={{
                  left: touchStartPos.current.x - 64,
                  top: touchStartPos.current.y - 64,
                }}
              >
                <div
                  className="absolute w-12 h-12 rounded-full bg-white/50 top-1/2 left-1/2"
                  style={{
                    transform: `translate(calc(-50% + ${joystickPos.current.x}px), calc(-50% + ${joystickPos.current.y}px))`
                  }}
                />
              </div>
            )}
          </>
        )}

        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="max-w-full max-h-full rounded-xl border-4 border-purple-500/30 shadow-2xl"
        />

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-xl flex items-center justify-center p-4 gap-4">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-purple-900/90 to-slate-900/90 border-purple-500/50 max-w-md w-full">
              <div className="text-center space-y-4 md:space-y-6">
                <div className="text-5xl md:text-6xl mb-4">💼</div>
                <h2 className="text-2xl md:text-3xl font-bold text-white">Office Survivor</h2>
                <p className="text-purple-200 text-sm md:text-base">
                  Survive the corporate chaos for <span className="font-bold text-yellow-400">10 minutes</span>!
                </p>
                <p className="text-green-300 font-semibold text-sm">
                  ⭐ Level up and choose powerful upgrades!
                </p>
                <p className="text-red-300 font-semibold text-sm">
                  💀 Bosses appear every 60 seconds!
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2 text-left">
                      Username (for leaderboard)
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const newUsername = e.target.value;
                        setUsername(newUsername);
                        localStorage.setItem('officeGame_username', newUsername);
                      }}
                      placeholder="Enter your name..."
                      maxLength={20}
                      className="w-full px-4 py-2 rounded bg-slate-800 border border-purple-500/50 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => setGameState('charSelect')}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-base md:text-lg py-4 md:py-6"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Select Character
                </Button>

                <Button
                  onClick={() => setShowLeaderboard(!showLeaderboard)}
                  variant="outline"
                  className="w-full border-purple-500/50 text-white hover:bg-purple-500/20"
                >
                  <Users className="w-5 h-5 mr-2" />
                  {showLeaderboard ? 'Hide' : 'View'} Leaderboard
                </Button>

                <div className="text-xs text-gray-400 mt-4">
                  Desktop: WASD to move, SPACE for ability<br />
                  Mobile: Touch to move, tap button for ability
                </div>
              </div>
            </Card>

            {showLeaderboard && (
              <div className="max-w-md w-full">
                <Leaderboard limit={10} />
              </div>
            )}
          </div>
        )}

        {/* Character Selection */}
        {gameState === 'charSelect' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center p-4 overflow-y-auto">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-blue-900/90 to-slate-900/90 border-blue-500/50 max-w-4xl w-full">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-2xl md:text-4xl font-bold text-white mb-2">Choose Your Character</h2>
                <p className="text-blue-200 text-sm md:text-lg">Each class has unique stats and a special ability</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {Object.entries(CHARACTER_CLASSES).map(([key, charClass]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setSelectedCharacter(key as keyof typeof CHARACTER_CLASSES);
                      startGame();
                    }}
                    className="p-4 md:p-6 rounded-xl border-4 hover:scale-105 transition-all bg-slate-800/50 hover:bg-slate-700/50 text-left"
                    style={{ borderColor: charClass.color }}
                  >
                    <div className="text-4xl md:text-5xl mb-3 text-center">{charClass.icon}</div>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 text-center">{charClass.name}</h3>
                    <p className="text-xs md:text-sm text-gray-300 mb-3 text-center">{charClass.description}</p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Health:</span>
                        <span className="text-red-400 font-bold">{charClass.startingStats.maxHealth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Speed:</span>
                        <span className="text-green-400 font-bold">{charClass.startingStats.speed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Damage:</span>
                        <span className="text-orange-400 font-bold">{charClass.startingStats.damageMultiplier}x</span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-600">
                      <div className="text-center">
                        <div className="text-2xl mb-1">{charClass.ability.icon}</div>
                        <div className="text-xs font-bold" style={{ color: charClass.color }}>{charClass.ability.name}</div>
                        <div className="text-xs text-gray-400 mt-1">{charClass.ability.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setGameState('menu')}
                variant="outline"
                className="w-full mt-6 border-blue-500/50 text-white hover:bg-blue-500/20"
              >
                Back to Menu
              </Button>
            </Card>
          </div>
        )}

        {/* Level Up - Upgrade Selection */}
        {gameState === 'levelup' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center p-4 overflow-y-auto">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-yellow-900/90 to-slate-900/90 border-yellow-500/50 max-w-4xl w-full">
              <div className="text-center mb-4 md:mb-6">
                <Star className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 mx-auto mb-3 animate-pulse" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">Level Up!</h2>
                <p className="text-yellow-200 mt-2 text-sm md:text-base">
                  Choose your upgrade
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {upgradeChoices.map((choice) => (
                  <button
                    key={choice.key}
                    onClick={() => selectUpgrade(choice.key)}
                    className="p-4 md:p-6 rounded-xl border-2 hover:scale-105 transition-all bg-slate-800/50 hover:bg-slate-700/50"
                    style={{ borderColor: choice.color }}
                  >
                    <div className="text-3xl md:text-4xl mb-3">{choice.icon}</div>
                    <h3 className="text-base md:text-lg font-bold text-white mb-2">{choice.name}</h3>
                    <p className="text-xs md:text-sm text-gray-300 mb-3">{choice.description}</p>
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {Array.from({length: 5}).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 md:w-3 md:h-3 rounded-full border"
                          style={{
                            backgroundColor: i < choice.nextLevel ? choice.color : 'transparent',
                            borderColor: choice.color
                          }}
                        />
                      ))}
                    </div>
                    <p className="text-xs font-semibold" style={{ color: choice.color }}>
                      {choice.levels[choice.currentLevel].desc}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Game Over */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-xl flex items-center justify-center p-4">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-red-900/90 to-slate-900/90 border-red-500/50 max-w-md w-full">
              <div className="text-center space-y-4 md:space-y-6">
                <Skull className="w-16 h-16 md:w-20 md:h-20 text-red-500 mx-auto" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">Game Over</h2>
                <div className="space-y-2 text-sm md:text-lg">
                  <p className="text-gray-300">Survived: <span className="font-bold text-yellow-400">{formatTime(stats.time)}</span></p>
                  <p className="text-gray-300">Final Score: <span className="font-bold text-yellow-400">{stats.score}</span></p>
                  {finalRank && username && (
                    <p className="text-gray-300">Global Rank: <span className="font-bold text-purple-400">#{finalRank}</span></p>
                  )}
                  <p className="text-gray-300">Level: <span className="font-bold text-purple-400">{stats.level}</span></p>
                  <p className="text-gray-300">Enemies Defeated: <span className="font-bold text-orange-400">{stats.kills}</span></p>
                </div>
                <Button
                  onClick={() => {
                    setFinalRank(null);
                    setGameState('charSelect');
                  }}
                  className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-base md:text-lg py-4 md:py-6"
                >
                  <RotateCcw className="w-5 h-5 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    setFinalRank(null);
                    setGameState('menu');
                  }}
                  variant="outline"
                  className="w-full border-red-500/50 text-white hover:bg-red-500/20"
                >
                  Back to Menu
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Victory Screen */}
        {gameState === 'victory' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-xl flex items-center justify-center p-4">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-green-900/90 to-slate-900/90 border-green-500/50 max-w-md w-full">
              <div className="text-center space-y-4 md:space-y-6">
                <Trophy className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 mx-auto animate-bounce" />
                <h2 className="text-2xl md:text-3xl font-bold text-white">Victory!</h2>
                <p className="text-green-300 text-base md:text-lg">You survived the full 10 minutes!</p>
                <div className="space-y-2 text-sm md:text-lg">
                  <p className="text-gray-300">Final Score: <span className="font-bold text-yellow-400">{stats.score}</span></p>
                  {finalRank && username && (
                    <p className="text-gray-300">Global Rank: <span className="font-bold text-purple-400">#{finalRank}</span></p>
                  )}
                  <p className="text-gray-300">Final Level: <span className="font-bold text-purple-400">{stats.level}</span></p>
                  <p className="text-gray-300">Enemies Defeated: <span className="font-bold text-orange-400">{stats.kills}</span></p>
                  <p className="text-gray-300">Waves Survived: <span className="font-bold text-blue-400">{stats.wave}</span></p>
                </div>
                <Button
                  onClick={() => {
                    setFinalRank(null);
                    setGameState('charSelect');
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-base md:text-lg py-4 md:py-6"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Play Again
                </Button>
                <Button
                  onClick={() => {
                    setFinalRank(null);
                    setGameState('menu');
                  }}
                  variant="outline"
                  className="w-full border-green-500/50 text-white hover:bg-green-500/20"
                >
                  Back to Menu
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Pause Screen */}
        {gameState === 'paused' && selectedCharacter && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center p-4 overflow-y-auto">
            <Card className="p-6 md:p-8 bg-gradient-to-br from-indigo-900/90 to-slate-900/90 border-indigo-500/50 max-w-2xl w-full">
              <div className="space-y-4 md:space-y-6">
                <div className="text-center">
                  <Pause className="w-12 h-12 md:w-16 md:h-16 text-indigo-400 mx-auto mb-3" />
                  <h2 className="text-2xl md:text-3xl font-bold text-white">Paused</h2>
                </div>

                {/* Character Ability Info */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-4xl">{CHARACTER_CLASSES[selectedCharacter].icon}</div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{CHARACTER_CLASSES[selectedCharacter].name}</h3>
                      <p className="text-sm text-gray-400">{CHARACTER_CLASSES[selectedCharacter].description}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{CHARACTER_CLASSES[selectedCharacter].ability.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white mb-1" style={{ color: CHARACTER_CLASSES[selectedCharacter].color }}>
                          {CHARACTER_CLASSES[selectedCharacter].ability.name}
                        </h4>
                        <p className="text-sm text-gray-300">{CHARACTER_CLASSES[selectedCharacter].ability.description}</p>
                        <p className="text-xs text-gray-500 mt-2">
                          Cooldown: {CHARACTER_CLASSES[selectedCharacter].ability.cooldown / 1000}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Upgrades */}
                {Object.keys(playerUpgrades).length > 0 && (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                    <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                      <Star className="w-5 h-5 text-yellow-400" />
                      Active Upgrades
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(playerUpgrades).map(([key, level]) => {
                        const upgrade = UPGRADES[key as keyof typeof UPGRADES];
                        return (
                          <div
                            key={key}
                            className="p-3 rounded border bg-slate-700/30"
                            style={{ borderColor: upgrade.color }}
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-2xl">{upgrade.icon}</span>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-white">{upgrade.name}</h4>
                                <p className="text-xs text-yellow-400">Level {level}</p>
                              </div>
                            </div>
                            <p className="text-xs text-gray-400">{upgrade.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Controls Info */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                  <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Controls
                  </h3>
                  <div className="text-xs text-gray-300 space-y-1">
                    <p><span className="font-bold">WASD/Arrows:</span> Move</p>
                    <p><span className="font-bold">SPACE/E:</span> Use Ability</p>
                    <p><span className="font-bold">ESC:</span> Pause/Resume</p>
                    {isMobile && <p className="text-yellow-400 mt-2">Touch controls active</p>}
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => setGameState('playing')}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-base md:text-lg py-4 md:py-6"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Resume Game
                  </Button>
                  <Button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
                        setGameState('menu');
                      }
                    }}
                    variant="outline"
                    className="w-full border-red-500/50 text-white hover:bg-red-500/20"
                  >
                    Quit to Menu
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
