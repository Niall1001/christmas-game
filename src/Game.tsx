import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skull, Zap, Trophy, Play, RotateCcw, Star, Wind, Users, Pause, Info, Volume2 } from 'lucide-react';

// Import types
import type { GameState } from './types';

// Import constants
import { CHARACTER_CLASSES } from './constants/characters';
import { UPGRADES } from './constants/upgrades';

// Import game logic
import { whirlwindAbility, barrageAbility, stormAbility } from './game/abilities';
import { checkCollision, checkRectCollision, applyExplosionDamage, applyPlayerExplosionDamage, findNearestEnemies, shootAtTarget, enemyShoot, bossShoot, dropXP } from './game/combat';
import { spawnEnemyGroup, spawnBoss, spawnMinion, spawnFinalTwinBosses } from './game/spawning';
import { render } from './game/rendering';
import { createParticles, createExplosion, createLevelUpEffect, createSmokeTrail, createMagicTrail, createArrowTrail, createTeleportEffect } from './game/effects';
import { checkAndGenerateChunks } from './game/worldgen';

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

  // Audio refs
  const gameStartAudio = useRef<HTMLAudioElement | null>(null);
  const gameOverAudio = useRef<HTMLAudioElement | null>(null);
  const arrowSoundRef = useRef<HTMLAudioElement | null>(null);
  const swordSoundRef = useRef<HTMLAudioElement | null>(null);
  const magicSoundRef = useRef<HTMLAudioElement | null>(null);
  const levelUpSoundRef = useRef<HTMLAudioElement | null>(null);
  const backgroundMusicRef = useRef<HTMLAudioElement | null>(null);
  const menuMusicRef = useRef<HTMLAudioElement | null>(null);

  // Initialize audio files
  useEffect(() => {
    gameStartAudio.current = new Audio('/src/audio/game-start-317318.mp3');
    gameOverAudio.current = new Audio('/src/audio/game-over-deep-male-voice-clip-352695.mp3');
    arrowSoundRef.current = new Audio('/src/audio/arrow-swish_03-306040.mp3');
    swordSoundRef.current = new Audio('/src/audio/fantasy-game-sword-cut-sound-effect-get-more-on-my-patreon-339824.mp3');
    magicSoundRef.current = new Audio('/src/audio/magic-smite-6012.mp3');
    levelUpSoundRef.current = new Audio('/src/audio/level-up-02-199574.mp3');

    // Initialize background music with loop
    backgroundMusicRef.current = new Audio('/src/audio/8bit-music-for-game-68698.mp3');
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = 0.5; // Set volume to 50% so it doesn't overpower other sounds
    }

    // Initialize menu ambient music with loop and quiet volume
    menuMusicRef.current = new Audio('/src/audio/ambient-game-67014.mp3');
    if (menuMusicRef.current) {
      menuMusicRef.current.loop = true;
      menuMusicRef.current.volume = 0.25; // Quiet ambient music
      // Start menu music immediately on load
      menuMusicRef.current.play().catch(e => console.log('Menu music autoplay blocked:', e));
    }
  }, []);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [musicVolume, setMusicVolume] = useState(0.25); // Background music volume
  const [sfxVolume, setSfxVolume] = useState(0.5); // Sound effects volume

  // Apply volume changes to all audio
  useEffect(() => {
    // Music volume - mute/pause when volume is 0
    if (menuMusicRef.current) {
      menuMusicRef.current.volume = musicVolume;
      if (musicVolume === 0) {
        menuMusicRef.current.pause();
      } else if (menuMusicRef.current.paused && (gameState === 'menu' || gameState === 'charSelect')) {
        menuMusicRef.current.play().catch(e => console.log('Menu music play failed:', e));
      }
    }
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.volume = musicVolume;
      if (musicVolume === 0) {
        backgroundMusicRef.current.pause();
      } else if (backgroundMusicRef.current.paused && gameState === 'playing') {
        backgroundMusicRef.current.play().catch(e => console.log('Background music play failed:', e));
      }
    }

    // Sound effects volume
    if (swordSoundRef.current) swordSoundRef.current.volume = sfxVolume;
    if (arrowSoundRef.current) arrowSoundRef.current.volume = sfxVolume;
    if (magicSoundRef.current) magicSoundRef.current.volume = sfxVolume;
    if (levelUpSoundRef.current) levelUpSoundRef.current.volume = sfxVolume;
    if (gameStartAudio.current) gameStartAudio.current.volume = sfxVolume;
  }, [musicVolume, sfxVolume, gameState]);

  // Manage menu music based on game state - ensures only one music plays at a time
  useEffect(() => {
    const menuStates: GameState[] = ['menu', 'charSelect', 'paused'];

    if (menuStates.includes(gameState)) {
      // FIRST: Stop background music completely
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
      // THEN: Start menu music
      if (menuMusicRef.current) {
        menuMusicRef.current.currentTime = 0;
        menuMusicRef.current.play().catch(e => console.log('Menu music play failed:', e));
      }
    } else {
      // For any non-menu state, FIRST stop menu music
      if (menuMusicRef.current) {
        menuMusicRef.current.pause();
        menuMusicRef.current.currentTime = 0;
      }

      // THEN handle background music based on specific state
      if (gameState === 'playing') {
        // Always start/resume background music when entering playing state
        // This handles both new games and resuming from pause
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.play().catch(e => console.log('Background music play failed:', e));
        }
      } else if (gameState === 'gameover' || gameState === 'victory') {
        // Stop background music completely for game over/victory
        if (backgroundMusicRef.current) {
          backgroundMusicRef.current.pause();
          backgroundMusicRef.current.currentTime = 0;
        }
      }
      // For 'levelup' state, don't touch backgroundMusicRef - it's managed by checkLevelUp function
    }
  }, [gameState]);
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
  const [abilityReady, setAbilityReady] = useState(true);
  const [touchControls, setTouchControls] = useState({ visible: false, action: false });
  const [username, setUsername] = useState(localStorage.getItem('officeGame_username') || '');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalRank, setFinalRank] = useState<number | null>(null);
  const [transitionPhase, setTransitionPhase] = useState<'clearing' | 'preparing' | null>(null);

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      setIsMobile(mobile);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Landscape orientation detection
  useEffect(() => {
    const checkOrientation = () => {
      const landscape = window.matchMedia('(orientation: landscape)').matches;
      setIsLandscape(landscape);
    };
    checkOrientation();
    window.addEventListener('orientationchange', checkOrientation);
    window.addEventListener('resize', checkOrientation);
    return () => {
      window.removeEventListener('orientationchange', checkOrientation);
      window.removeEventListener('resize', checkOrientation);
    };
  }, []);

  // Scale factors for mobile
  const playerScale = isMobile ? 0.7 : 1;
  const obstacleScale = isMobile ? 0.6 : 1;

  // Responsive canvas sizing - optimized for mobile
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = window.innerWidth;
        const height = window.innerHeight;

        if (isMobile) {
          if (isLandscape) {
            // Mobile landscape: swap dimensions for rotated canvas - FULLSCREEN
            // Canvas will be rotated 90deg, so use height for width and vice versa
            setCanvasSize({
              width: Math.max(600, height), // Swapped - full viewport height
              height: Math.max(400, width) // Swapped - full viewport width
            });
          } else {
            // Mobile portrait: fullscreen sizing
            setCanvasSize({
              width: Math.max(800, width),
              height: Math.max(600, height)
            });
          }
        } else {
          // Desktop: leave more space for UI
          setCanvasSize({
            width: Math.max(800, width),
            height: Math.max(600, height - 100)
          });
        }
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    window.addEventListener('orientationchange', updateSize);
    return () => {
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('orientationchange', updateSize);
    };
  }, [isMobile, isLandscape]);

  const gameData = useRef<any>({
    player: null,
    projectiles: [],
    enemyProjectiles: [],
    enemies: [],
    particles: [],
    xpOrbs: [],
    pickups: [],
    sombreros: [],
    obstacles: [],
    wave: 1,
    waveTimer: 0,
    score: 0,
    kills: 0,
    groupSpawnTimer: 0,
    sombreroSpawnTimer: 0,
    bossMode: false,
    bossTimer: 0,
    finalBossMode: false, // NEW: Track if final twin bosses are active
    finalBossSpawned: false, // NEW: Track if final bosses have been spawned
    gameTime: 0,
    upgrades: {},
    enemySpeedMod: 1,
    spawnRateMod: 1,
    abilityTimer: 0,
    screenShake: 0,
    timeRemaining: 600,
    frameCounter: 0, // For trail particle frequency reduction
    maxEnemies: 100, // Hard cap to prevent performance issues
    camera: {
      x: 0,
      y: 0,
      viewportWidth: 1200,
      viewportHeight: 800
    },
    generatedChunks: new Set<string>()
  });

  const startGame = useCallback(async (characterKey?: keyof typeof CHARACTER_CLASSES) => {
    // Use passed character or fall back to selectedCharacter state
    const character = characterKey || selectedCharacter;
    if (!character) return;

    const charClass = CHARACTER_CLASSES[character];
    // Player starts at world origin (0, 0)
    const startX = 0;
    const startY = 0;

    // Scaled player dimensions (50% larger for better visibility)
    const playerWidth = 60 * playerScale;
    const playerHeight = 60 * playerScale;

    // Pre-load weapon images for instant use
    const weaponImage = new Image();
    const weaponImagePromise = new Promise<void>((resolve) => {
      weaponImage.onload = () => resolve();
    });

    if (charClass.weaponType === 'melee') {
      weaponImage.src = '/src/images/Adobe Express - file.png';
    } else if (charClass.weaponType === 'ranged') {
      weaponImage.src = '/src/images/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcm0yMzRiYXRjaDMtYmlubi0xNS5wbmc.png';
    } else if (charClass.weaponType === 'magic') {
      weaponImage.src = '/src/images/Spell.png';
    }

    // Pre-load character images (animated GIFs) and wait for them to load
    const characterImage = new Image();
    const characterImagePromise = new Promise<void>((resolve) => {
      characterImage.onload = () => resolve();
    });

    if (charClass.weaponType === 'melee') {
      characterImage.src = '/src/images/characters/knight.gif';
    } else if (charClass.weaponType === 'ranged') {
      characterImage.src = '/src/images/characters/archer.gif';
    } else if (charClass.weaponType === 'magic') {
      characterImage.src = '/src/images/characters/partywizard.gif';
    }

    // Pre-load desk texture images (two varieties)
    const deskImage1 = new Image();
    const deskImage1Promise = new Promise<void>((resolve) => {
      deskImage1.onload = () => resolve();
      deskImage1.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage1.src = '/src/images/Screenshot 2025-11-12 at 22.54.59.png';

    const deskImage2 = new Image();
    const deskImage2Promise = new Promise<void>((resolve) => {
      deskImage2.onload = () => resolve();
      deskImage2.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage2.src = '/src/images/Screenshot 2025-11-12 at 23.09.49.png';

    const deskImage3 = new Image();
    const deskImage3Promise = new Promise<void>((resolve) => {
      deskImage3.onload = () => resolve();
      deskImage3.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage3.src = '/src/images/Screenshot 2025-11-12 at 23.14.19.png';

    const deskImage4 = new Image();
    const deskImage4Promise = new Promise<void>((resolve) => {
      deskImage4.onload = () => resolve();
      deskImage4.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage4.src = '/src/images/Screenshot 2025-11-12 at 23.26.24.png';

    const deskImage5 = new Image();
    const deskImage5Promise = new Promise<void>((resolve) => {
      deskImage5.onload = () => resolve();
      deskImage5.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage5.src = '/src/images/Screenshot 2025-11-13 at 19.56.22.png';

    // Pre-load sombrero image for powerup spawns
    const sombreroImage = new Image();
    const sombreroImagePromise = new Promise<void>((resolve) => {
      sombreroImage.onload = () => resolve();
      sombreroImage.onerror = () => resolve(); // Continue even if image fails to load
    });
    sombreroImage.src = '/src/images/sobrero.png';

    // Pre-load magnet image for magnet pickups
    const magnetImage = new Image();
    const magnetImagePromise = new Promise<void>((resolve) => {
      magnetImage.onload = () => resolve();
      magnetImage.onerror = () => resolve(); // Continue even if image fails to load
    });
    magnetImage.src = '/src/images/bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.png';

    // Wait for all images to load before starting the game
    await Promise.all([weaponImagePromise, characterImagePromise, deskImage1Promise, deskImage2Promise, deskImage3Promise, deskImage4Promise, deskImage5Promise, sombreroImagePromise, magnetImagePromise]);

    gameData.current = {
      player: {
        x: startX,
        y: startY,
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
        characterClass: character,
        weaponType: charClass.weaponType,
        weaponImage: weaponImage,
        characterImage: characterImage,
        abilityCooldownMod: 1,
        abilityReady: true,
        aimX: 0, // Aiming direction X
        aimY: 1,  // Aiming direction Y (default: down)
        invincibilityTimer: 0 // I-frames: temporary damage immunity after getting hit
      },
      projectiles: [],
      enemyProjectiles: [],
      enemies: [],
      particles: [],
      xpOrbs: [],
      pickups: [],
      sombreros: [], // Sombreros that spawn magnet/bomb pickups
      obstacles: [], // Start empty - chunks will generate obstacles
      deskImages: [deskImage1, deskImage2, deskImage3, deskImage4, deskImage5], // Store all desk texture images
      sombreroImage: sombreroImage, // Store sombrero image for rendering
      magnetImage: magnetImage, // Store magnet image for rendering
      wave: 1,
      waveTimer: 0,
      score: 0,
      kills: 0,
      groupSpawnTimer: 0,
      sombreroSpawnTimer: 0,
      bossMode: false,
      bossTimer: 0,
      finalBossMode: false, // NEW: Track if final twin bosses are active
      finalBossSpawned: false, // NEW: Track if final bosses have been spawned
      gameTime: 0,
      timeRemaining: 600,
      upgrades: {},
      enemySpeedMod: 1, // Slow enemy multiplier (affected by Bureaucracy upgrade)
      baseEnemySpeedMod: 1, // Base difficulty scaling (separate from slow effect)
      spawnRateMod: 1,
      abilityTimer: 0,
      screenShake: 0,
      maxEnemies: 100, // Hard cap to prevent performance issues
      camera: {
        x: startX - canvasSize.width / 2,
        y: startY - canvasSize.height / 2,
        viewportWidth: canvasSize.width,
        viewportHeight: canvasSize.height
      },
      generatedChunks: new Set<string>()
    };

    // Generate initial chunks around player spawn
    const game = gameData.current;
    checkAndGenerateChunks(game.player, game, obstacleScale);

    // Failsafe: Ensure player didn't spawn inside an obstacle
    let spawnAttempts = 0;
    const maxAttempts = 50;
    while (spawnAttempts < maxAttempts) {
      let isBlocked = false;

      // Check if current spawn position collides with any obstacle
      for (const obstacle of game.obstacles) {
        if (checkRectCollision(
          { x: game.player.x, y: game.player.y, width: game.player.width, height: game.player.height },
          obstacle
        )) {
          isBlocked = true;
          break;
        }
      }

      if (!isBlocked) {
        break; // Safe spawn found
      }

      // Try new spawn position in a spiral pattern
      const angle = (spawnAttempts / maxAttempts) * Math.PI * 8; // 4 full rotations
      const radius = 100 + spawnAttempts * 10; // Spiral outward
      game.player.x = Math.cos(angle) * radius;
      game.player.y = Math.sin(angle) * radius;

      spawnAttempts++;
    }

    // Update camera to new spawn position
    game.camera.x = game.player.x - canvasSize.width / 2;
    game.camera.y = game.player.y - canvasSize.height / 2;

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

    // Play game start audio
    gameStartAudio.current?.play().catch(e => console.log('Audio play failed:', e));

    // Background music will be started by the useEffect when gameState changes to 'playing'
    // Reset background music to beginning for new game
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.currentTime = 0;
    }

    setGameState('playing');
  }, [selectedCharacter, canvasSize]);

  const checkLevelUp = (game: any) => {
    const xpNeeded = getXPForLevel(game.player.level);
    if (game.player.xp >= xpNeeded) {
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

      // If no upgrades available, cap XP and don't level up
      if (availableUpgrades.length === 0) {
        game.player.xp = xpNeeded - 1; // Keep XP just below threshold
        return; // Don't level up
      }

      // Proceed with level up
      game.player.xp -= xpNeeded;
      game.player.level++;

      // Level up celebration effect
      createLevelUpEffect(game, game.player.x, game.player.y);
      game.screenShake = 12;

      // Pause background music and play level-up sound only
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }

      if (levelUpSoundRef.current) {
        levelUpSoundRef.current.currentTime = 0;
        levelUpSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
      }

      // Note: Background music will resume when user selects an upgrade
      // and game state changes back to 'playing' (handled by useEffect)

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

    // ULTIMATE ABILITY - Massive bonus when reaching level 5
    if (currentLevel + 1 === 5) {
      createLevelUpEffect(game, game.player.x, game.player.y);
      game.screenShake = 20;

      // Apply ultimate bonuses based on upgrade type (reduced significantly for harder difficulty)
      switch(upgradeKey) {
        case 'squad_sync':
          game.player.shootSpeed *= 0.909; // 1.1x fire rate (10% increase for performance)
          // No multi-shot bonus at ultimate level (performance optimization)
          break;
        case 'power_boost':
          game.player.damageMultiplier *= 1.3; // 1.3x damage (reduced further)
          game.player.explosionRadius = Math.max(game.player.explosionRadius, 50); // Smaller guaranteed explosions
          break;
        case 'multi_target':
          game.player.multiShot += 1; // +1 target (reduced from +2 for performance)
          game.player.shootSpeed *= 0.95; // Very minimal fire rate bonus (reduced for performance)
          break;
        case 'penetration':
          game.player.piercing += 2; // Pierce 7 total enemies (reduced further)
          game.player.damageMultiplier *= 1.2; // Smaller damage bonus
          break;
        case 'large_size':
          game.player.projectileSize *= 1.3; // Moderately larger projectiles (reduced further)
          game.player.explosionRadius += 20; // Smaller explosion bonus
          break;
        case 'explosion':
          game.player.explosionRadius += 40; // Moderate explosion increase (reduced further)
          game.player.damageMultiplier *= 1.25; // Smaller damage boost
          break;
        case 'agile_sprint':
          game.player.speed *= 1.3; // 1.3x speed (reduced further)
          game.player.abilityCooldownMod *= 0.75; // Less cooldown reduction
          break;
        case 'wellness_program':
          game.player.maxHealth += 100; // Health boost only (reduced further)
          game.player.health = game.player.maxHealth; // Full heal
          // NO health regen bonus - avoids conflict with coffee break
          break;
        case 'slow_enemies':
          game.enemySpeedMod *= 0.7; // Less enemy slowdown (reduced further)
          game.spawnRateMod *= 0.85; // Less spawn rate reduction
          break;
        case 'productivity_boost':
          game.player.xpMultiplier *= 1.6; // 1.6x XP (reduced further)
          game.player.pickupRadius *= 1.3; // Smaller pickup range increase
          break;
        case 'magnet':
          game.player.pickupRadius *= 1.6; // 1.6x range (reduced further)
          game.player.xpMultiplier *= 1.2; // Minimal XP bonus
          break;
        case 'regen':
          game.player.healthRegen *= 1.6; // 1.6x regen (reduced further)
          game.player.maxHealth += 80; // Smaller health boost
          game.player.health = Math.min(game.player.health + 80, game.player.maxHealth);
          break;
        case 'dash_cooldown':
          game.player.abilityCooldownMod *= 0.6; // Less cooldown reduction (reduced further)
          game.player.speed *= 1.2; // Minimal speed bonus
          break;
      }

      // Performance safeguard: Cap multiShot at 6 to prevent lag
      if (game.player.multiShot > 6) {
        game.player.multiShot = 6;
      }

      // Performance balance: If both squad_sync and multi_target are maxed, reduce fire rate
      const hasSquadSync = game.upgrades['squad_sync'] === 5;
      const hasMultiTarget = game.upgrades['multi_target'] === 5;

      if (hasSquadSync && hasMultiTarget) {
        // Normalize fire rate to prevent excessive projectile spam
        // Reset to base and apply conservative multiplier
        game.player.shootSpeed = game.player.baseShootSpeed * 0.85; // Only 1.18x faster than base
      }
    }

    // Gentler difficulty scaling for longer survival
    const totalUpgradeLevels = Object.values(game.upgrades).reduce((sum: number, level: any) => sum + level, 0);

    // Much more gradual spawn rate increase
    game.spawnRateMod = 1 + (totalUpgradeLevels * 0.05);

    // BUG FIX: Don't overwrite enemySpeedMod - it's modified by slow enemy upgrades!
    // Instead, track difficulty scaling separately
    if (!game.baseEnemySpeedMod) {
      game.baseEnemySpeedMod = 1; // Initialize if not set
    }
    game.baseEnemySpeedMod = 1 + (totalUpgradeLevels * 0.015);
    // enemySpeedMod is now: baseEnemySpeedMod * slowMultiplier (applied by Bureaucracy upgrade)

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

  // Touch controls - Enhanced for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (gameState !== 'playing') return;
      e.preventDefault(); // Prevent scrolling and zooming

      const touch = e.touches[0];
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      // Get touch position relative to canvas
      let relativeX = touch.clientX - rect.left;
      let relativeY = touch.clientY - rect.top;

      // Transform coordinates if canvas is rotated (landscape mobile)
      if (isMobile && isLandscape) {
        // For 90° clockwise rotation, inverse transform is 90° counter-clockwise
        // Map from rotated screen space to canvas internal space
        const temp = relativeX;
        relativeX = relativeY;
        relativeY = rect.width - temp;
      }

      // Scale touch coordinates to match canvas internal size
      const scaleX = canvasSize.width / (isMobile && isLandscape ? rect.height : rect.width);
      const scaleY = canvasSize.height / (isMobile && isLandscape ? rect.width : rect.height);
      const x = relativeX * scaleX;
      const y = relativeY * scaleY;

      // Larger ability button hit area for easier tapping
      const abilityButtonSize = isMobile ? 120 : 100;
      if (x > canvasSize.width - abilityButtonSize && y > canvasSize.height - abilityButtonSize) {
        useAbility();
      } else {
        touchStartPos.current = { x: touch.clientX, y: touch.clientY };
        setTouchControls({ visible: true, action: false });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartPos.current) return;
      e.preventDefault(); // Prevent scrolling

      const touch = e.touches[0];
      const dx = touch.clientX - touchStartPos.current.x;
      const dy = touch.clientY - touchStartPos.current.y;

      // Increased max distance for better mobile control
      const maxDist = isMobile ? 80 : 50;

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

    const handleTouchCancel = () => {
      touchStartPos.current = null;
      joystickPos.current = { x: 0, y: 0 };
      setTouchControls({ visible: false, action: false });
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
      canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
      canvas.addEventListener('touchend', handleTouchEnd);
      canvas.addEventListener('touchcancel', handleTouchCancel);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
        canvas.removeEventListener('touchcancel', handleTouchCancel);
      }
    };
  }, [gameState, canvasSize, abilityReady, isMobile, isLandscape]);

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
      updateGame(game);
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
        // Music will be stopped by the useEffect when gameState changes to 'gameover'
        // Play game over audio
        gameOverAudio.current?.play().catch(e => console.log('Audio play failed:', e));

        saveGameStats(game, username).then(result => {
          if (result?.rank) setFinalRank(result.rank);
        });
        setGameState('gameover');
        return;
      }

      // FINAL BOSS TRIGGER - Start transition when time runs out
      if (game.timeRemaining <= 0 && !game.finalBossSpawned) {
        game.timeRemaining = 0; // Lock timer at zero
        game.transitionStartTime = game.gameTime; // Track when transition started
        setGameState('finalBossTransition');
        return;
      }

      // Victory condition: Final bosses must be defeated
      if (game.finalBossMode && game.enemies.length === 0) {
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

  // Final Boss Transition Loop - Clear enemies and prepare for battle
  useEffect(() => {
    if (gameState !== 'finalBossTransition') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const game = gameData.current;

    // Initialize transition tracking
    if (!game.transitionPhase) {
      game.transitionPhase = 'clearing'; // Phase: 'clearing' or 'preparing'
      game.transitionTimer = 0;
      setTransitionPhase('clearing'); // Update React state for UI rendering
    }

    const transitionLoop = () => {
      // Safety check
      if (!game || !game.player) return;

      // INCREMENT TIMER (FIX: This was missing!)
      game.transitionTimer += 1/60; // Track transition time in seconds

      // Continue rendering the game world
      render(ctx, game, canvasSize);

      // Update particles for visual effects
      game.screenShake *= 0.95;
      for (let i = game.particles.length - 1; i >= 0; i--) {
        const p = game.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'trail') {
          p.vx *= 0.95;
          p.vy *= 0.95;
        }
        p.life -= 1;
        if (p.life <= 0) {
          game.particles.splice(i, 1);
        }
      }

      // PHASE 1: CLEARING ENEMIES (aggressive, fast clearing)
      if (game.transitionPhase === 'clearing') {
        // Rapidly clear enemies (clear up to 3 per frame = ~1-2 seconds total)
        if (game.enemies && game.enemies.length > 0) {
          const enemiesToClear = Math.min(3, game.enemies.length); // Clear up to 3 per frame

          for (let i = 0; i < enemiesToClear; i++) {
            if (game.enemies.length === 0) break;

            const randomIndex = Math.floor(Math.random() * game.enemies.length);
            const enemy = game.enemies[randomIndex];

            // Safety check for enemy
            if (enemy && enemy.x !== undefined && enemy.y !== undefined) {
              // Dramatic disappear effect (limit particles to prevent overflow)
              if (game.particles.length < 500) {
                createTeleportEffect(game, enemy.x, enemy.y, enemy.color || '#FFFFFF');
                createExplosion(game, enemy.x, enemy.y, 80, enemy.color || '#FFFFFF');
              }

              // Remove enemy
              game.enemies.splice(randomIndex, 1);
            }
          }

          // Clear projectiles too
          game.enemyProjectiles = [];
        } else {
          // All enemies cleared - WAIT 1 second before moving to prepare phase
          // This ensures the clearing phase is visible
          if (game.transitionTimer >= 1.0) {
            // Move to prepare phase
            game.transitionPhase = 'preparing';
            game.transitionTimer = 0; // Reset timer for prepare phase
            game.screenShake = 40; // Big shake to mark transition
            setTransitionPhase('preparing'); // Update React state for UI rendering

            // Dramatic transition effect
            if (game.particles.length < 400) {
              for (let i = 0; i < 50; i++) {
                createParticles(game, game.player.x, game.player.y, '#FFFFFF', 10);
              }
            }
          }
        }
      }

      // PHASE 2: PREPARING (show message for 5 seconds)
      if (game.transitionPhase === 'preparing') {
        // After 5 seconds of "PREPARE FOR FINAL BATTLE", spawn bosses
        if (game.transitionTimer >= 5.0) {
          // Safety check before spawning
          if (!game.player) return;

          game.finalBossSpawned = true;
          game.finalBossMode = true;

          // Clear all remaining enemies and projectiles (safety)
          game.enemies = [];
          game.enemyProjectiles = [];

          // Reset transition tracking
          delete game.transitionPhase;
          delete game.transitionTimer;
          setTransitionPhase(null); // Reset React state

          // Spawn the twin final bosses with MASSIVE effects
          spawnFinalTwinBosses(game, canvasSize);

          // Screen-wide dramatic effects (limit particles to prevent crash)
          game.screenShake = 80; // Extreme shake
          if (game.particles.length < 400) {
            for (let i = 0; i < 10; i++) {
              const angle = (i / 10) * Math.PI * 2;
              const distance = 300;
              const x = game.player.x + Math.cos(angle) * distance;
              const y = game.player.y + Math.sin(angle) * distance;
              createTeleportEffect(game, x, y, i % 2 === 0 ? '#DC2626' : '#7C3AED');
              createExplosion(game, x, y, 200, i % 2 === 0 ? '#DC2626' : '#7C3AED');
            }
          }

          // Return to playing state
          setGameState('playing');
          return;
        }
      }

      gameLoopRef.current = requestAnimationFrame(transitionLoop);
    };

    gameLoopRef.current = requestAnimationFrame(transitionLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, canvasSize]);

  const updateGame = (game: any) => {
    const { player, enemies, projectiles, enemyProjectiles, particles, xpOrbs, obstacles, pickups, sombreros } = game;

    game.gameTime += 1/60;
    game.timeRemaining -= 1/60;
    game.waveTimer += 1/60;
    game.frameCounter++; // Increment frame counter for trail frequency

    // Screen shake decay
    if (game.screenShake > 0) {
      game.screenShake *= 0.9;
    }

    // Health regeneration
    if (player.healthRegen > 0) {
      player.health = Math.min(player.maxHealth, player.health + player.healthRegen / 60);
    }

    // Invincibility frames timer countdown
    if (player.invincibilityTimer > 0) {
      player.invincibilityTimer--;
    }

    // Boss spawning every 60 seconds (easier difficulty)
    // Don't spawn regular bosses during final boss mode
    if (game.waveTimer >= 60 && !game.bossMode && !game.finalBossMode) {
      game.bossMode = true;
      game.bossTimer = 0; // Initialize boss timer
      spawnBoss(game, canvasSize);
      game.wave++;
      game.waveTimer = 0;
      game.screenShake = 25; // Dramatic boss entrance
    }

    // Boss mode timeout - automatically end boss mode after 45 seconds
    if (game.bossMode) {
      game.bossTimer += 1/60;
      // Force boss mode to end after 45 seconds, even if boss is still alive
      if (game.bossTimer >= 45) {
        game.bossMode = false;
        game.bossTimer = 0;
      }
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
      // Free movement in infinite world - no boundary clamping
      player.x = newX;
      player.y = newY;
    }

    // Update camera to follow player (keep player centered)
    game.camera.x = player.x - canvasSize.width / 2;
    game.camera.y = player.y - canvasSize.height / 2;
    game.camera.viewportWidth = canvasSize.width;
    game.camera.viewportHeight = canvasSize.height;

    // Generate new chunks as player explores
    checkAndGenerateChunks(player, game, obstacleScale);

    // Update aim direction based on movement (used by warrior for manual aim)
    if (moveX !== 0 || moveY !== 0) {
      // Normalize the aim direction
      const length = Math.sqrt(moveX * moveX + moveY * moveY);
      player.aimX = moveX / length;
      player.aimY = moveY / length;
    }

    // Shooting logic - warrior uses manual aim, others use auto-aim
    // Performance cap: limit max projectiles to 120
    if (player.shootCooldown <= 0 && enemies.length > 0 && projectiles.length < 120) {
      if (player.weaponType === 'melee') {
        // Play sword sound
        if (swordSoundRef.current) {
          swordSoundRef.current.currentTime = 0; // Reset to start for rapid fire
          swordSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        // WARRIOR: Manual aim - shoot in the direction player is moving
        const aimDistance = 1000; // Arbitrary large distance
        const virtualTarget = {
          x: player.x + player.aimX * aimDistance,
          y: player.y + player.aimY * aimDistance
        };

        // Call once - shootAtTarget handles multiShot fan pattern internally
        shootAtTarget(game, player, virtualTarget);
      } else if (player.weaponType === 'ranged') {
        // Play arrow sound
        if (arrowSoundRef.current) {
          arrowSoundRef.current.currentTime = 0; // Reset to start for rapid fire
          arrowSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        // RANGER: Auto-aim at nearest enemies
        const targets = findNearestEnemies(player, enemies, player.multiShot);
        targets.forEach((target: any) => shootAtTarget(game, player, target));
      } else {
        // Play magic sound
        if (magicSoundRef.current) {
          magicSoundRef.current.currentTime = 0; // Reset to start for rapid fire
          magicSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        // MAGE: Auto-aim at nearest enemies (cap multishot at 5 for wizard)
        const effectiveMultiShot = Math.min(player.multiShot, 5);
        const targets = findNearestEnemies(player, enemies, effectiveMultiShot);
        targets.forEach((target: any) => shootAtTarget(game, player, target));
      }
      player.shootCooldown = player.shootSpeed;
    } else {
      player.shootCooldown--;
    }

    // Update projectiles with trails
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];
      proj.x += proj.vx;
      proj.y += proj.vy;

      // Decrease lifetime for melee projectiles (keeps them short-range)
      if (proj.lifetime !== undefined) {
        proj.lifetime--;
        if (proj.lifetime <= 0) {
          projectiles.splice(i, 1);
          continue;
        }
      }

      // Add weapon-specific trail effects (50% reduced frequency for performance)
      // Only create trails every other frame AND if particle count is below 800
      if (game.frameCounter % 2 === 0 && particles.length < 800) {
        if (proj.weaponType === 'melee') {
          // Sword: Dark smoke trail
          createSmokeTrail(game, proj.x, proj.y, proj.size);
        } else if (proj.weaponType === 'magic') {
          // Mage: Magical sparkle trail
          createMagicTrail(game, proj.x, proj.y, proj.size, proj.color);
        } else if (proj.weaponType === 'ranged') {
          // Arrow: Subtle trail
          createArrowTrail(game, proj.x, proj.y, proj.size, proj.color);
        }
      }

      // Remove projectiles that are too far from player (infinite world - use distance check)
      const projDx = proj.x - player.x;
      const projDy = proj.y - player.y;
      const projDist = Math.sqrt(projDx * projDx + projDy * projDy);
      const maxProjectileDistance = canvasSize.width * 1.5; // 1.5 viewports away

      if (projDist > maxProjectileDistance) {
        projectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      // PERFORMANCE: Broad-phase collision detection - only check enemies near projectile
      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];

        // PERFORMANCE: Quick distance check before expensive collision check
        const dx = proj.x - enemy.x;
        const dy = proj.y - enemy.y;
        const quickDist = dx * dx + dy * dy; // Squared distance (faster than sqrt)
        const maxDist = (proj.size + enemy.size + 50) * (proj.size + enemy.size + 50); // Squared

        // Skip if too far away (broad-phase culling)
        if (quickDist > maxDist) continue;

        if (checkCollision(proj, enemy)) {

          // Handle shielded enemies
          if (enemy.hasShield && enemy.shield > 0) {
            enemy.shield--;
            if (enemy.shield <= 0) {
              enemy.hasShield = false;
            }
            if (particles.length < 800) {
              createParticles(game, enemy.x, enemy.y, '#60A5FA', 8);
            }
          } else {
            // Apply damage with reduction for enraged final bosses
            const damageMultiplier = (enemy.isFinalBoss && enemy.isEnraged && enemy.damageReduction)
              ? enemy.damageReduction
              : 1;
            enemy.health -= proj.damage * damageMultiplier;
            if (particles.length < 800) {
              createParticles(game, enemy.x, enemy.y, enemy.color, 6);
            }
          }

          // Explosion effect
          if (player.explosionRadius > 0) {
            applyExplosionDamage(game, proj.x, proj.y, player.explosionRadius, proj.damage * 0.6);
            // Only create explosion particles if under particle cap
            if (particles.length < 800) {
              createExplosion(game, proj.x, proj.y, player.explosionRadius);
            }
            game.screenShake = 8; // Enhanced explosion shake
          }

          // Pierce effectiveness reduced by 50% when explosions are active (performance balance)
          const effectivePierce = player.explosionRadius > 50 ? Math.floor(player.piercing / 2) : player.piercing;
          proj.pierceCount = (proj.pierceCount || 0) + 1;
          if (proj.pierceCount > effectivePierce) {
            projectiles.splice(i, 1);
          }

          if (enemy.health <= 0) {
            game.score += enemy.scoreValue * game.wave;
            game.kills++;
            createParticles(game, enemy.x, enemy.y, enemy.color, 25);
            dropXP(game, enemy.x, enemy.y, enemy.xpValue);

            // 0.5% chance to drop a magnet (very rare)
            if (Math.random() < 0.005) {
              game.pickups.push({
                x: enemy.x,
                y: enemy.y,
                type: 'magnet',
                size: 15,
                width: 30,
                height: 30
              });
            }

            // Exploder enemy explosion
            if (enemy.type === 'angry_client') {
              applyExplosionDamage(game, enemy.x, enemy.y, enemy.explosionRadius, enemy.explosionDamage);
              createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308');
              game.screenShake = 15; // Big explosion shake
            }

            enemies.splice(j, 1);

            if (enemy.isBoss) {
              game.bossMode = false;
              game.bossTimer = 0; // Reset boss timer when boss is defeated
              dropXP(game, enemy.x, enemy.y, enemy.xpValue * 6, '#3B82F6'); // Blue XP for boss
              game.screenShake = 35; // Massive boss defeat shake
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

      // Remove enemy projectiles that are too far from player (infinite world - use distance check)
      const enemyProjDx = proj.x - player.x;
      const enemyProjDy = proj.y - player.y;
      const enemyProjDist = Math.sqrt(enemyProjDx * enemyProjDx + enemyProjDy * enemyProjDy);
      const maxEnemyProjectileDistance = canvasSize.width * 1.5; // 1.5 viewports away

      if (enemyProjDist > maxEnemyProjectileDistance) {
        enemyProjectiles.splice(i, 1);
        continue;
      }

      if (checkCollision(proj, player)) {
        // Only apply damage if not invincible
        if (player.invincibilityTimer <= 0) {
          player.health -= proj.damage;
          player.invincibilityTimer = 60; // 1 second of invincibility at 60fps
          createParticles(game, proj.x, proj.y, '#EF4444', 10);
          game.screenShake = 3;
        }
        enemyProjectiles.splice(i, 1);
      }
    }

    // Update enemies with special behaviors
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];

      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // PERFORMANCE: Skip AI updates for enemies far off-screen (but keep them moving toward player)
      const aiUpdateDistance = canvasSize.width * 1.8; // Only update AI within 1.8 viewports
      const skipAI = dist > aiUpdateDistance && !enemy.isBoss;

      // PERFORMANCE: Only run AI behaviors for enemies on or near screen
      if (!skipAI) {
        // Shooter behaviors for different enemy types
        if (enemy.type === 'emailer') {
          // Email Spammer - Medium range, medium cooldown
          if (dist < 300) {
            enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
            if (enemy.shootCooldown <= 0) {
              enemyShoot(game, enemy, player);
              enemy.shootCooldown = 100;
            }
          }
        } else if (enemy.type === 'manager') {
          // Micromanager - Short range, rapid fire
          if (dist < 250) {
            enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
            if (enemy.shootCooldown <= 0) {
              enemyShoot(game, enemy, player);
              enemy.shootCooldown = 50; // Fast firing
            }
          }
        } else if (enemy.type === 'accountant') {
          // Accountant - Long range, slow but powerful
          if (dist < 350) {
            enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
            if (enemy.shootCooldown <= 0) {
              enemyShoot(game, enemy, player);
              enemy.shootCooldown = 150; // Slow firing
            }
          }
        } else if (enemy.type === 'shielded') {
          // Security Guard - Medium range, medium cooldown
          if (dist < 280) {
            enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
            if (enemy.shootCooldown <= 0) {
              enemyShoot(game, enemy, player);
              enemy.shootCooldown = 100;
            }
          }
        }

        // Teleporter behavior - now teleports farther away for better gameplay
        if (enemy.type === 'teleporter') {
          enemy.teleportCooldown = (enemy.teleportCooldown || 0) - 1;
          if (enemy.teleportCooldown <= 0 && dist > 150) {
            createParticles(game, enemy.x, enemy.y, enemy.color, 15);
            // Teleport 250-400 units away from player (safer distance)
            const angle = Math.random() * Math.PI * 2;
            const distance = 250 + Math.random() * 150;
            enemy.x = player.x + Math.cos(angle) * distance;
            enemy.y = player.y + Math.sin(angle) * distance;
            createParticles(game, enemy.x, enemy.y, enemy.color, 15);
            enemy.teleportCooldown = 180;

            // Shoot immediately after teleporting
            enemyShoot(game, enemy, player);
          }
        }

        // Summoner behavior
        if (enemy.type === 'summoner') {
          enemy.summonCooldown = (enemy.summonCooldown || 0) - 1;
          if (enemy.summonCooldown <= 0 && game.enemies.length < game.maxEnemies) {
            spawnMinion(game, enemy.x, enemy.y);
            enemy.summonCooldown = 240;
          }

          // Also shoot projectiles when not summoning
          enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
          if (enemy.shootCooldown <= 0 && dist < 300) {
            enemyShoot(game, enemy, player);
            enemy.shootCooldown = 120;
          }
        }

        // BOSS BEHAVIOR - Balanced shooting + summoning + TELEPORTING
        if (enemy.isBoss) {
          // BOSS TELEPORT MECHANIC - All bosses can teleport
          enemy.teleportCooldown = (enemy.teleportCooldown || 0) - 1;

          // Determine teleport frequency based on boss type
          const teleportFrequency = enemy.isFinalBoss
            ? (enemy.isEnraged ? 90 : 150) // BUFFED: Final bosses teleport more (was 120:180)
            : 360; // Regular bosses: 6 seconds

          if (enemy.teleportCooldown <= 0) {
            // Teleport effect at current position
            createTeleportEffect(game, enemy.x, enemy.y, enemy.color);

            // Choose teleport strategy based on distance and boss type
            let newX, newY;

            if (enemy.isFinalBoss) {
              // Final bosses: Strategic positioning around player
              // If too close, teleport away; if too far, teleport closer
              if (dist < 200) {
                // Too close - teleport away
                const angle = Math.random() * Math.PI * 2;
                const distance = 300 + Math.random() * 150;
                newX = player.x + Math.cos(angle) * distance;
                newY = player.y + Math.sin(angle) * distance;
              } else if (dist > 500) {
                // Too far - teleport closer
                const angle = Math.random() * Math.PI * 2;
                const distance = 250 + Math.random() * 100;
                newX = player.x + Math.cos(angle) * distance;
                newY = player.y + Math.sin(angle) * distance;
              } else {
                // Good distance - teleport to flanking position
                const angleToPlayer = Math.atan2(dy, dx);
                const flankAngle = angleToPlayer + (Math.random() < 0.5 ? Math.PI/2 : -Math.PI/2);
                const distance = 250 + Math.random() * 150;
                newX = player.x + Math.cos(flankAngle) * distance;
                newY = player.y + Math.sin(flankAngle) * distance;
              }
            } else {
              // Regular bosses: Random teleport around player
              const angle = Math.random() * Math.PI * 2;
              const distance = 250 + Math.random() * 200;
              newX = player.x + Math.cos(angle) * distance;
              newY = player.y + Math.sin(angle) * distance;
            }

            // Update position
            enemy.x = newX;
            enemy.y = newY;

            // Teleport effect at new position
            createTeleportEffect(game, enemy.x, enemy.y, enemy.color);
            enemy.teleportCooldown = teleportFrequency;
            game.screenShake = 12;

            // Shoot immediately after teleporting (aggressive!)
            if (dist < 400) {
              bossShoot(game, enemy, player);
              enemy.shootCooldown = 300; // Shorter cooldown after teleport
            }
          }

          // 1. Boss Shooting - Fires 2 projectiles for balanced difficulty
          enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
          if (enemy.shootCooldown <= 0 && dist < 400) {
            bossShoot(game, enemy, player); // Fires slower projectiles in limited bursts
            const shootFrequency = enemy.isFinalBoss
              ? (enemy.isEnraged ? 210 : 300) // BUFFED: Final bosses shoot much faster (was 300:400)
              : 600; // Regular bosses: 10 seconds
            enemy.shootCooldown = shootFrequency;
          }

          // 2. Summoning - Boss summons minions periodically
          enemy.summonCooldown = (enemy.summonCooldown || 0) - 1;
          if (enemy.summonCooldown <= 0 && game.enemies.length < game.maxEnemies) {
            // Summon minions (more for final bosses)
            const summonCount = enemy.isFinalBoss ? 3 : 2;
            for (let j = 0; j < summonCount; j++) {
              spawnMinion(game, enemy.x, enemy.y);
            }
            createParticles(game, enemy.x, enemy.y, '#A855F7', 30);
            const summonFrequency = enemy.isFinalBoss ? 240 : 180; // Final bosses summon more frequently
            enemy.summonCooldown = summonFrequency;
            game.screenShake = 8;
          }

          // 3. FINAL BOSS DEVASTATING ATTACKS - Bomb Drop & Arrow Barrage
          if (enemy.isFinalBoss) {
            // Initialize attack cooldowns (BUFFED: Faster, more aggressive)
            if (enemy.bombCooldown === undefined) enemy.bombCooldown = 300; // 5 seconds (was 7)
            if (enemy.barrageCooldown === undefined) enemy.barrageCooldown = 420; // 7 seconds (was 9)

            // BOMB DROP ATTACK - Drops explosive bombs that detonate after delay
            enemy.bombCooldown -= 1;
            if (enemy.bombCooldown <= 0) {
              // Drop 3-6 bombs in formation around boss (BUFFED count)
              const bombCount = enemy.isEnraged ? 6 : 4; // More bombs when enraged (was 5:3)
              for (let i = 0; i < bombCount; i++) {
                const angle = (Math.PI * 2 * i) / bombCount;
                const distance = 120;
                const bombX = enemy.x + Math.cos(angle) * distance;
                const bombY = enemy.y + Math.sin(angle) * distance;

                // Create bomb projectile (delayed explosion)
                game.pickups.push({
                  x: bombX,
                  y: bombY,
                  type: 'boss_bomb',
                  size: 20,
                  width: 40,
                  height: 40,
                  detonateTimer: 180, // 3 seconds until explosion
                  explosionRadius: 150,
                  explosionDamage: 130, // EXTREME DAMAGE: 100% increase (was 65)
                  color: enemy.color
                });

                // Visual effect for bomb drop
                createParticles(game, bombX, bombY, enemy.color, 15);
              }

              createExplosion(game, enemy.x, enemy.y, 100, enemy.color);
              game.screenShake = 15;
              enemy.bombCooldown = enemy.isEnraged ? 240 : 300; // Faster when enraged (was 300:420)
            }

            // ARROW BARRAGE ATTACK - Fires projectiles in all directions (like ranger ultimate)
            enemy.barrageCooldown -= 1;
            if (enemy.barrageCooldown <= 0) {
              const projectileCount = enemy.isEnraged ? 36 : 24; // More projectiles when enraged (was 30:20)
              for (let i = 0; i < projectileCount; i++) {
                const angle = (Math.PI * 2 * i) / projectileCount;
                const speed = 6;

                game.enemyProjectiles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  size: 12,
                  damage: 40, // BUFFED: Devastating damage (was 25)
                  color: enemy.color,
                  width: 12,
                  height: 12
                });
              }

              // Massive visual effect
              createTeleportEffect(game, enemy.x, enemy.y, enemy.color);
              createExplosion(game, enemy.x, enemy.y, 150, enemy.color);
              game.screenShake = 20;
              enemy.barrageCooldown = enemy.isEnraged ? 300 : 420; // Faster when enraged (was 420:540)
            }
          }

          // 4. TWIN BOSS COORDINATION - Check if partner died
          if (enemy.isFinalBoss && enemy.twinPartner) {
            const partnerAlive = game.enemies.some((e: any) => e.twinId === enemy.twinPartner.twinId);
            if (!partnerAlive && !enemy.isEnraged) {
              // Partner died - EXTREME ENRAGE!
              enemy.isEnraged = true;
              enemy.health = enemy.maxHealth; // Full heal on enrage
              enemy.speed *= 1.75; // BUFFED: 75% faster (was 50%)
              enemy.damage *= 1.6; // BUFFED: 60% more damage (was 30%)
              enemy.damageReduction = 0.75; // NEW: Takes only 75% damage when enraged

              // Dramatic enrage effect
              createExplosion(game, enemy.x, enemy.y, 200, enemy.color);
              createTeleportEffect(game, enemy.x, enemy.y, enemy.color);
              game.screenShake = 50; // Massive shake (was 40)

              // Flash effect with particles
              for (let i = 0; i < 150; i++) { // More particles (was 100)
                createParticles(game, enemy.x, enemy.y, '#FFFFFF', 50);
              }
            }
          }
        }
      }

      // Swarm behavior - Apply BOTH slow effect AND difficulty scaling
      const combinedSpeedMod = game.enemySpeedMod * (game.baseEnemySpeedMod || 1);
      let moveSpeed = enemy.speed * combinedSpeedMod;
      if (enemy.type === 'salesperson' && dist < 250) {
        moveSpeed *= 1.6;
      }

      // Move enemies freely through obstacles (no collision check)
      if (dist > 0) {
        enemy.x += (dx / dist) * moveSpeed;
        enemy.y += (dy / dist) * moveSpeed;
      }

      if (checkCollision(enemy, player)) {
        // Only apply damage if not invincible
        if (player.invincibilityTimer <= 0) {
          player.health -= enemy.damage;
          player.invincibilityTimer = 60; // 1 second of invincibility at 60fps
          createParticles(game, player.x, player.y, '#EF4444', 12);
          game.screenShake = 8; // Enhanced damage shake

          if (enemy.type === 'angry_client') {
            applyPlayerExplosionDamage(game, enemy.x, enemy.y, enemy.explosionRadius, enemy.explosionDamage);
            createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308');
            game.screenShake = 18; // Massive explosion shake when player hit
          }
        }

        // Only remove regular enemies on collision, bosses stay and continue fighting
        if (!enemy.isBoss) {
          enemies.splice(i, 1);
        }
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
        createParticles(game, orb.x, orb.y, orb.color || '#FBBF24', 12);
        xpOrbs.splice(i, 1);
        checkLevelUp(game);
      }
    }

    // Update pickups (magnets, bombs, and BOSS BOMBS)
    for (let i = pickups.length - 1; i >= 0; i--) {
      const pickup = pickups[i];

      // BOSS BOMB LOGIC - Delayed explosion
      if (pickup.type === 'boss_bomb') {
        // Tick down detonation timer
        pickup.detonateTimer = (pickup.detonateTimer || 180) - 1;

        // Visual warning as bomb gets close to detonating
        if (pickup.detonateTimer < 60 && pickup.detonateTimer % 10 === 0) {
          createParticles(game, pickup.x, pickup.y, pickup.color || '#FF0000', 8);
          game.screenShake = 2;
        }

        // DETONATE!
        if (pickup.detonateTimer <= 0) {
          // Check if player is in explosion radius
          const dx = player.x - pickup.x;
          const dy = player.y - pickup.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < pickup.explosionRadius && player.invincibilityTimer <= 0) {
            player.health -= pickup.explosionDamage;
            player.invincibilityTimer = 60;
            createParticles(game, player.x, player.y, '#EF4444', 20);
          }

          // Massive explosion effect
          createExplosion(game, pickup.x, pickup.y, pickup.explosionRadius, pickup.color || '#FF0000');
          createTeleportEffect(game, pickup.x, pickup.y, pickup.color || '#FF0000');
          game.screenShake = 25;

          // Remove bomb
          pickups.splice(i, 1);
        }

        continue; // Skip normal pickup logic for boss bombs
      }

      const dx = player.x - pickup.x;
      const dy = player.y - pickup.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Move towards player if within range (only for normal pickups, not boss bombs)
      if (dist < player.pickupRadius) {
        const speed = 8;
        pickup.x += (dx / dist) * speed;
        pickup.y += (dy / dist) * speed;
      }

      // Check collision with player
      if (checkCollision(pickup, player)) {
        if (pickup.type === 'magnet') {
          // Magnet effect - collect all XP on map
          xpOrbs.forEach((orb: any) => {
            player.xp += orb.value * player.xpMultiplier;
            createParticles(game, orb.x, orb.y, orb.color || '#FBBF24', 8);
          });
          xpOrbs.length = 0; // Clear all XP orbs
          createParticles(game, pickup.x, pickup.y, '#3B82F6', 25);
          game.screenShake = 10;
          checkLevelUp(game);
        } else if (pickup.type === 'bomb') {
          // Bomb effect - damage all enemies on screen
          enemies.forEach((enemy: any) => {
            if (enemy.hasShield && enemy.shield > 0) {
              enemy.shield--;
              if (enemy.shield <= 0) enemy.hasShield = false;
            } else {
              enemy.health -= 375; // Massive damage (increased by 150%)
            }
            createParticles(game, enemy.x, enemy.y, '#EF4444', 15);
          });
          createExplosion(game, pickup.x, pickup.y, 300, '#EF4444');
          game.screenShake = 25; // Big explosion
        }
        pickups.splice(i, 1);
      }
    }

    // Sombrero spawning timer (every 30 seconds)
    game.sombreroSpawnTimer += 1/60;
    if (game.sombreroSpawnTimer >= 30) {
      // Spawn sombrero near player
      const angle = Math.random() * Math.PI * 2;
      const distance = 200 + Math.random() * 200; // 200-400 units away
      // Randomly determine if this spawner will drop magnet or bomb (50/50 chance)
      const pickupType = Math.random() < 0.5 ? 'magnet' : 'bomb';
      sombreros.push({
        x: player.x + Math.cos(angle) * distance,
        y: player.y + Math.sin(angle) * distance,
        width: 50,
        height: 50,
        size: 25, // For collision detection
        activated: false, // Track if player has activated it yet
        pickupType: pickupType // Track what pickup this spawner will drop
      });
      game.sombreroSpawnTimer = 0;
    }

    // Update sombreros - check collision with player (stand over to activate)
    for (let i = sombreros.length - 1; i >= 0; i--) {
      const sombrero = sombreros[i];

      // Check if player is standing over the sombrero
      const dx = player.x - sombrero.x;
      const dy = player.y - sombrero.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Player needs to be within 40 units to activate
      if (dist < 40 && !sombrero.activated) {
        sombrero.activated = true;

        // Drop the pickup type determined when this spawner was created
        pickups.push({
          x: sombrero.x,
          y: sombrero.y,
          type: sombrero.pickupType,
          size: 15,
          width: 30,
          height: 30
        });

        // Visual feedback
        createParticles(game, sombrero.x, sombrero.y, sombrero.pickupType === 'magnet' ? '#3B82F6' : '#EF4444', 30);
        game.screenShake = 10;

        // Remove the sombrero after activation
        sombreros.splice(i, 1);
      }
    }

    // Smooth enemy spawning (gradual difficulty increase over 10 minutes)
    // PERFORMANCE: Only spawn if below enemy cap
    // Don't spawn regular enemies during final boss mode
    if (!game.bossMode && !game.finalBossMode && enemies.length < game.maxEnemies) {
      game.groupSpawnTimer++;

      // Continuous time-based multiplier scaling over full 10 minutes
      const timeMultiplier = 1 + (game.gameTime / 400); // Reaches 2.5x at 10 minutes

      // Continuous spawn rate acceleration over full duration - SLOWER
      const baseRate = Math.max(45, 200 - game.gameTime * 0.1); // Slower scaling, higher starting rate
      const groupSpawnRate = baseRate / game.spawnRateMod;

      if (game.groupSpawnTimer >= groupSpawnRate) {
        // Gradual group size increase scaling with time - REDUCED SCALING
        const baseGroupSize = Math.floor(4 + game.wave * 0.15 + timeMultiplier * 0.3);
        const groupSize = Math.floor(baseGroupSize * game.spawnRateMod);

        // PERFORMANCE: Cap spawn size to not exceed maxEnemies
        const remainingCapacity = game.maxEnemies - enemies.length;
        const actualGroupSize = Math.min(groupSize, remainingCapacity);

        if (actualGroupSize > 0) {
          spawnEnemyGroup(game, actualGroupSize, canvasSize);
        }
        game.groupSpawnTimer = 0;
      }
    }

    // PERFORMANCE: Cull enemies that are extremely far from player (off-screen culling)
    const cullDistance = canvasSize.width * 2.5; // 2.5 viewports away
    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      // Don't cull bosses
      if (enemy.isBoss) continue;

      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > cullDistance) {
        enemies.splice(i, 1);
      }
    }

    // Update particles
    // PERFORMANCE: More aggressive cleanup when near particle cap
    const particleDecayMultiplier = particles.length > 600 ? 2 : 1;

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.type === 'trail') {
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      p.life -= particleDecayMultiplier;

      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // PERFORMANCE: Emergency particle cleanup if still over cap
    if (particles.length > 800) {
      particles.splice(0, particles.length - 700); // Remove oldest 100+ particles
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center">
      {/* Title Bar - Hidden on mobile */}
      {!isMobile && (
        <div className="w-full text-center py-4 bg-black/30 backdrop-blur-sm">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-1 flex items-center justify-center gap-3">
            <img src="/src/images/images.png" className="w-10 h-10 md:w-12 md:h-12 rounded-full" alt="Unosquare Logo" />
            Unosquare Office Survivor
          </h1>
        </div>
      )}

      <div className={`relative flex-1 w-full flex items-center justify-center ${isMobile ? 'p-0' : 'p-2'}`}>
        {/* HUD Overlay */}
        {gameState === 'playing' && (
          <>
            <div className={`absolute top-2 z-20 pixel-box border-purple-400 ${
              isMobile && isLandscape ? 'left-2 right-auto max-w-xs p-2' : 'left-2 right-2 p-3'
            }`}>
              {/* Pause button */}
              <button
                onClick={() => setGameState('paused')}
                className="absolute top-2 right-2 p-2 rounded-lg bg-purple-600 hover:bg-purple-700 transition-colors z-30"
              >
                <Pause className="w-4 h-4 text-white" />
              </button>

              <div className="space-y-2">
                {/* Stats Row */}
                <div className={`grid gap-2 text-xs md:text-sm mb-2 pr-12 pixel-art ${
                  isMobile && isLandscape ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-5'
                }`}>
                  <div className="flex items-center gap-1 pixel-box border-yellow-400 px-2 py-1">
                    <Trophy className="w-3 h-3 text-yellow-400 flex-shrink-0" />
                    <span className="text-yellow-100 font-bold truncate text-[8px] md:text-[10px]">{stats.score.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 pixel-box border-blue-400 px-2 py-1">
                    <Zap className="w-3 h-3 text-blue-400 flex-shrink-0" />
                    <span className="text-blue-100 font-bold text-[8px] md:text-[10px]">Lv.{stats.level}</span>
                  </div>
                  <div className="flex items-center gap-1 pixel-box border-red-400 px-2 py-1">
                    <Skull className="w-3 h-3 text-red-400 flex-shrink-0" />
                    <span className="text-red-100 font-bold text-[8px] md:text-[10px]">{stats.kills}</span>
                  </div>
                  <div className="flex items-center gap-1 pixel-box border-orange-400 px-2 py-1">
                    <Wind className="w-3 h-3 text-orange-400 flex-shrink-0" />
                    <span className="text-orange-100 font-bold text-[8px] md:text-[10px]">W{stats.wave}</span>
                  </div>
                  <div className="flex items-center gap-1 pixel-box border-green-400 px-2 py-1">
                    <span className="text-green-400 font-bold flex-shrink-0 text-[10px]">⏱</span>
                    <span className="text-green-100 font-bold text-[8px] md:text-[10px]">{formatTime(stats.timeRemaining)}</span>
                  </div>
                </div>

                {/* Health Bar */}
                <div className="h-6 pixel-bar border-red-500 overflow-hidden">
                  <div
                    className="pixel-bar-fill bg-gradient-to-r from-red-600 to-red-400 transition-all flex items-center justify-center"
                    style={{ width: `${(stats.health / stats.maxHealth) * 100}%` }}
                  >
                    <span className="text-[8px] md:text-[10px] font-bold text-white drop-shadow-lg pixel-art">HP {stats.health}/{stats.maxHealth}</span>
                  </div>
                </div>

                {/* XP Bar */}
                <div className="h-5 pixel-bar border-yellow-500 relative overflow-hidden">
                  <div
                    className="pixel-bar-fill bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all"
                    style={{ width: `${(stats.xp / stats.xpToNext) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] font-bold text-white drop-shadow-lg pixel-art">
                    XP {stats.xp}/{stats.xpToNext}
                  </span>
                </div>
              </div>
            </div>

            {/* Ability Button */}
            <button
              onClick={useAbility}
              disabled={!abilityReady}
              className={`absolute z-20 w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex items-center justify-center text-3xl md:text-4xl transition-all ${
                isMobile && isLandscape ? 'bottom-6 right-6' : 'bottom-20 md:bottom-6 right-6'
              } ${
                abilityReady
                  ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 hover:scale-110 cursor-pointer shadow-lg shadow-purple-500/50'
                  : 'bg-gray-700 border-gray-600 opacity-50 cursor-not-allowed'
              }`}
            >
              {selectedCharacter && CHARACTER_CLASSES[selectedCharacter].ability.icon}
            </button>

            {/* Touch controls joystick visualization - Enhanced for mobile */}
            {touchControls.visible && touchStartPos.current && (
              <div
                className={`absolute rounded-full border-4 z-30 pointer-events-none ${
                  isMobile ? 'w-48 h-48 border-white/50' : 'w-32 h-32 border-white/30'
                } bg-gradient-to-br from-white/20 to-white/5 shadow-lg`}
                style={{
                  left: touchStartPos.current.x - (isMobile ? 96 : 64),
                  top: touchStartPos.current.y - (isMobile ? 96 : 64),
                }}
              >
                <div
                  className={`absolute rounded-full bg-gradient-to-br from-purple-400/70 to-pink-400/70 shadow-xl border-2 border-white/50 top-1/2 left-1/2 ${
                    isMobile ? 'w-20 h-20' : 'w-12 h-12'
                  }`}
                  style={{
                    transform: `translate(calc(-50% + ${joystickPos.current.x}px), calc(-50% + ${joystickPos.current.y}px))`
                  }}
                />
                {/* Center dot */}
                <div className="absolute w-4 h-4 rounded-full bg-white/60 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
            )}
          </>
        )}

        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          className="max-w-full max-h-full rounded-xl border-4 border-purple-500/30 shadow-2xl"
          style={isMobile && isLandscape ? {
            transform: 'rotate(90deg)',
            transformOrigin: 'center center'
          } : undefined}
        />

        {/* Menu Screen */}
        {gameState === 'menu' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-xl flex items-center justify-center p-4">
            <Card className="p-6 md:p-8 pixel-box border-cyan-500 max-w-md w-full">
              <div className="text-center space-y-4 md:space-y-6">
                <img src="/src/images/images.png" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4" style={{ imageRendering: 'pixelated' }} alt="Unosquare Logo" />
                <h2 className="text-xl md:text-2xl font-bold text-white pixel-art">Unosquare Office Survivor</h2>
                <p className="text-cyan-200 text-[10px] md:text-[12px] pixel-art">
                  Survive the corporate chaos for <span className="font-bold text-yellow-400">10 minutes</span>!
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] md:text-[10px] text-gray-300 mb-2 text-left pixel-art">
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
                      className="w-full px-4 py-3 pixel-box border-cyan-500 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 text-[10px] md:text-[12px]"
                    />
                  </div>

                  {/* Volume Controls */}
                  <div className="bg-slate-800/50 p-3 md:p-4 rounded-lg border border-cyan-500/30 space-y-3">
                    <h3 className="text-[10px] md:text-[12px] font-bold text-cyan-300 pixel-art mb-2">Audio Settings</h3>

                    {/* Music Volume */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] md:text-[10px] text-gray-300 pixel-art">Music Volume</label>
                        <span className="text-[8px] text-gray-400 pixel-art">{Math.round(musicVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume * 100}
                        onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${musicVolume * 100}%, #374151 ${musicVolume * 100}%, #374151 100%)`
                        }}
                      />
                    </div>

                    {/* SFX Volume */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] md:text-[10px] text-gray-300 pixel-art">Sound Effects</label>
                        <span className="text-[8px] text-gray-400 pixel-art">{Math.round(sfxVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sfxVolume * 100}
                        onChange={(e) => setSfxVolume(parseInt(e.target.value) / 100)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${sfxVolume * 100}%, #374151 ${sfxVolume * 100}%, #374151 100%)`
                        }}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setGameState('charSelect')}
                  className="w-full pixel-box border-cyan-500 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-700 hover:to-cyan-600 text-white text-[10px] md:text-[12px] py-4 md:py-6 pixel-art"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Select Character
                </Button>

                <Button
                  onClick={() => setShowLeaderboard(true)}
                  variant="outline"
                  className="w-full pixel-box border-cyan-500 text-white hover:bg-cyan-500/20 text-[10px] md:text-[12px] pixel-art"
                >
                  <Users className="w-4 h-4 mr-2" />
                  View Leaderboard
                </Button>

                <div className="text-[8px] md:text-[10px] text-gray-400 mt-4 pixel-art">
                  Desktop: WASD to move, SPACE for ability<br />
                  Mobile: Touch to move, tap button for ability
                </div>
              </div>
            </Card>

            {/* Leaderboard Modal */}
            {showLeaderboard && (
              <div
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                onClick={() => setShowLeaderboard(false)}
              >
                <div
                  className="max-w-2xl w-full relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Close Button */}
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="absolute -top-2 -right-2 md:top-2 md:right-2 z-10 w-8 h-8 md:w-10 md:h-10 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-white font-bold shadow-lg transition-all hover:scale-110"
                  >
                    ✕
                  </button>
                  <Leaderboard limit={50} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Character Selection */}
        {gameState === 'charSelect' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center p-4 overflow-y-auto">
            <Card className="p-6 md:p-8 pixel-box border-cyan-500 max-w-4xl w-full">
              <div className="text-center mb-6 md:mb-8">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2 pixel-art">Choose Your Character</h2>
                <p className="text-cyan-200 text-[10px] md:text-[12px] pixel-art">Each class has unique stats and a special ability</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {Object.entries(CHARACTER_CLASSES).map(([key, charClass]) => (
                  <button
                    key={key}
                    onClick={() => {
                      const charKey = key as keyof typeof CHARACTER_CLASSES;
                      setSelectedCharacter(charKey);
                      startGame(charKey);
                    }}
                    className="p-4 md:p-6 pixel-box hover:scale-105 transition-all text-left"
                    style={{ borderColor: charClass.color }}
                  >
                    <div className="text-4xl md:text-5xl mb-3 text-center">{charClass.icon}</div>
                    <h3 className="text-[12px] md:text-[14px] font-bold text-white mb-2 text-center pixel-art">{charClass.name}</h3>
                    <p className="text-[8px] md:text-[10px] text-gray-300 mb-3 text-center pixel-art">{charClass.description}</p>
                    <div className="space-y-1 text-[8px] md:text-[10px] pixel-art">
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
                        <div className="text-[8px] md:text-[10px] font-bold pixel-art" style={{ color: charClass.color }}>{charClass.ability.name}</div>
                        <div className="text-[8px] text-gray-400 mt-1 pixel-art">{charClass.ability.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Button
                onClick={() => setGameState('menu')}
                variant="outline"
                className="w-full mt-6 pixel-box border-cyan-500 text-white hover:bg-cyan-500/20 text-[10px] md:text-[12px] pixel-art"
              >
                Back to Menu
              </Button>
            </Card>
          </div>
        )}

        {/* Level Up - Upgrade Selection */}
        {gameState === 'levelup' && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center p-4 overflow-y-auto">
            <Card className="p-6 md:p-8 pixel-box border-yellow-400 max-w-4xl w-full">
              <div className="text-center mb-4 md:mb-6">
                <Star className="w-12 h-12 md:w-16 md:h-16 text-yellow-400 mx-auto mb-3 animate-pulse" />
                <h2 className="text-xl md:text-2xl font-bold text-white pixel-art">LEVEL UP!</h2>
                <p className="text-yellow-200 mt-2 text-[10px] md:text-[12px] pixel-art">
                  Choose upgrade
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
                {upgradeChoices.map((choice) => (
                  <button
                    key={choice.key}
                    onClick={() => selectUpgrade(choice.key)}
                    className="p-4 md:p-6 pixel-box hover:scale-105 transition-all"
                    style={{ borderColor: choice.color }}
                  >
                    <div className="text-3xl md:text-4xl mb-3">{choice.icon}</div>
                    <h3 className="text-[12px] md:text-[14px] font-bold text-white mb-2 pixel-art">{choice.name}</h3>
                    <p className="text-[8px] md:text-[10px] text-gray-300 mb-3 pixel-art">{choice.description}</p>
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
                    <p className="text-[8px] md:text-[10px] font-semibold pixel-art" style={{ color: choice.color }}>
                      {choice.levels[choice.currentLevel].desc}
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Final Boss Transition */}
        {gameState === 'finalBossTransition' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
            {/* Clearing Phase - Show clearing message */}
            {transitionPhase === 'clearing' && (
              <div className="text-center space-y-4 bg-black/80 p-8 rounded-lg border-4 border-cyan-500 animate-pulse">
                <div className="text-4xl md:text-6xl font-bold text-cyan-400 pixel-art">
                  CLEARING BATTLEFIELD
                </div>
                <div className="text-xl md:text-2xl text-gray-300 pixel-art">
                  {gameData.current?.enemies?.length || 0} enemies remaining...
                </div>
              </div>
            )}

            {/* Preparing Phase - Show final battle message */}
            {transitionPhase === 'preparing' && (
              <div className="text-center space-y-6 bg-black/90 p-12 rounded-lg border-4 border-red-600 shadow-2xl shadow-red-600/50">
                <div className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-red-500 pixel-art animate-pulse">
                  PREPARE
                </div>
                <div className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-red-500 to-purple-500 pixel-art">
                  FOR
                </div>
                <div className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-purple-500 to-red-500 pixel-art animate-pulse">
                  FINAL BATTLE
                </div>
                <div className="text-xl md:text-3xl text-yellow-400 pixel-art mt-8">
                  The Founders Approach...
                </div>
              </div>
            )}
          </div>
        )}

        {/* Game Over */}
        {gameState === 'gameover' && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md rounded-xl flex items-center justify-center p-4">
            <Card className="p-6 md:p-8 pixel-box border-red-500 max-w-md w-full">
              <div className="text-center space-y-4 md:space-y-6">
                <Skull className="w-16 h-16 md:w-20 md:h-20 text-red-500 mx-auto" />
                <h2 className="text-xl md:text-2xl font-bold text-white pixel-art">Game Over</h2>
                <div className="space-y-2 text-[10px] md:text-[12px] pixel-art">
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
                  className="w-full pixel-box border-red-500 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white text-[10px] md:text-[12px] py-4 md:py-6 pixel-art"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
                <Button
                  onClick={() => {
                    setFinalRank(null);
                    setGameState('menu');
                  }}
                  variant="outline"
                  className="w-full pixel-box border-red-500 text-white hover:bg-red-500/20 text-[10px] md:text-[12px] pixel-art"
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
            <Card className="p-6 md:p-8 pixel-box border-green-500 max-w-md w-full">
              <div className="text-center space-y-4 md:space-y-6">
                <Trophy className="w-16 h-16 md:w-20 md:h-20 text-yellow-500 mx-auto animate-bounce" />
                <h2 className="text-xl md:text-2xl font-bold text-white pixel-art">Victory!</h2>
                <p className="text-green-300 text-[10px] md:text-[12px] pixel-art">You survived the full 10 minutes!</p>
                <div className="space-y-2 text-[10px] md:text-[12px] pixel-art">
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
                  className="w-full pixel-box border-green-500 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white text-[10px] md:text-[12px] py-4 md:py-6 pixel-art"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play Again
                </Button>
                <Button
                  onClick={() => {
                    setFinalRank(null);
                    setGameState('menu');
                  }}
                  variant="outline"
                  className="w-full pixel-box border-green-500 text-white hover:bg-green-500/20 text-[10px] md:text-[12px] pixel-art"
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
            <Card className="p-6 md:p-8 pixel-box border-indigo-500 max-w-2xl w-full">
              <div className="space-y-4 md:space-y-6">
                <div className="text-center">
                  <Pause className="w-12 h-12 md:w-16 md:h-16 text-indigo-400 mx-auto mb-3" />
                  <h2 className="text-xl md:text-2xl font-bold text-white pixel-art">Paused</h2>
                </div>

                {/* Character Ability Info */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-4xl">{CHARACTER_CLASSES[selectedCharacter].icon}</div>
                    <div>
                      <h3 className="text-[12px] md:text-[14px] font-bold text-white pixel-art">{CHARACTER_CLASSES[selectedCharacter].name}</h3>
                      <p className="text-[8px] md:text-[10px] text-gray-400 pixel-art">{CHARACTER_CLASSES[selectedCharacter].description}</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-700 pt-3 mt-3">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{CHARACTER_CLASSES[selectedCharacter].ability.icon}</div>
                      <div className="flex-1">
                        <h4 className="text-[10px] md:text-[12px] font-bold text-white mb-1 pixel-art" style={{ color: CHARACTER_CLASSES[selectedCharacter].color }}>
                          {CHARACTER_CLASSES[selectedCharacter].ability.name}
                        </h4>
                        <p className="text-[8px] md:text-[10px] text-gray-300 pixel-art">{CHARACTER_CLASSES[selectedCharacter].ability.description}</p>
                        <p className="text-[8px] text-gray-500 mt-2 pixel-art">
                          Cooldown: {CHARACTER_CLASSES[selectedCharacter].ability.cooldown / 1000}s
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Current Upgrades */}
                {Object.keys(playerUpgrades).length > 0 && (
                  <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                    <h3 className="text-[12px] md:text-[14px] font-bold text-white mb-3 flex items-center gap-2 pixel-art">
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
                                <h4 className="text-[10px] font-bold text-white pixel-art">{upgrade.name}</h4>
                                <p className="text-[8px] text-yellow-400 pixel-art">Level {level}</p>
                              </div>
                            </div>
                            <p className="text-[8px] text-gray-400 pixel-art">{upgrade.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Controls Info */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                  <h3 className="text-[10px] md:text-[12px] font-bold text-white mb-2 flex items-center gap-2 pixel-art">
                    <Info className="w-4 h-4" />
                    Controls
                  </h3>
                  <div className="text-[8px] md:text-[10px] text-gray-300 space-y-1 pixel-art">
                    <p><span className="font-bold">WASD/Arrows:</span> Move</p>
                    <p><span className="font-bold">SPACE/E:</span> Use Ability</p>
                    <p><span className="font-bold">ESC:</span> Pause/Resume</p>
                    {isMobile && <p className="text-yellow-400 mt-2">Touch controls active</p>}
                  </div>
                </div>

                {/* Pickups Info */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                  <h3 className="text-[10px] md:text-[12px] font-bold text-white mb-2 pixel-art">Pickups</h3>
                  <div className="text-[8px] md:text-[10px] text-gray-300 space-y-2 pixel-art">
                    <div className="flex items-start gap-2">
                      <span className="text-blue-400 text-base">🧲</span>
                      <div>
                        <span className="font-bold text-blue-400">Magnet:</span> Collect all XP around you
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-red-400 text-base">💣</span>
                      <div>
                        <span className="font-bold text-red-400">Bomb:</span> Deal massive damage to all enemies
                      </div>
                    </div>
                  </div>
                </div>

                {/* Audio Controls */}
                <div className="bg-slate-800/50 p-4 rounded-lg border border-indigo-500/30">
                  <h3 className="text-[10px] md:text-[12px] font-bold text-white mb-3 flex items-center gap-2 pixel-art">
                    <Volume2 className="w-4 h-4" />
                    Audio Settings
                  </h3>
                  <div className="space-y-4">
                    {/* Music Volume */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] md:text-[10px] text-gray-300 pixel-art">Music Volume</label>
                        <span className="text-[8px] text-gray-400 pixel-art">{Math.round(musicVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={musicVolume * 100}
                        onChange={(e) => setMusicVolume(parseInt(e.target.value) / 100)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${musicVolume * 100}%, #374151 ${musicVolume * 100}%, #374151 100%)`
                        }}
                      />
                    </div>

                    {/* SFX Volume */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[8px] md:text-[10px] text-gray-300 pixel-art">Sound Effects</label>
                        <span className="text-[8px] text-gray-400 pixel-art">{Math.round(sfxVolume * 100)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={sfxVolume * 100}
                        onChange={(e) => setSfxVolume(parseInt(e.target.value) / 100)}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                        style={{
                          background: `linear-gradient(to right, #8b5cf6 0%, #8b5cf6 ${sfxVolume * 100}%, #374151 ${sfxVolume * 100}%, #374151 100%)`
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => setGameState('playing')}
                    className="w-full pixel-box border-indigo-500 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-[10px] md:text-[12px] py-4 md:py-6 pixel-art"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume Game
                  </Button>
                  <Button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to quit? Your progress will be lost.')) {
                        setGameState('menu');
                      }
                    }}
                    variant="outline"
                    className="w-full pixel-box border-red-500 text-white hover:bg-red-500/20 text-[10px] md:text-[12px] pixel-art"
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
