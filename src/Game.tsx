import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skull, Zap, Trophy, Play, RotateCcw, Star, Wind, Users, Pause, Info, Volume2 } from 'lucide-react';

// Import types
import type { GameState } from './types';

// Import constants
import { CHARACTER_CLASSES } from './constants/characters';
import { UPGRADES } from './constants/upgrades';
import { PROJECTILE_CONFIG } from './constants/enemies';

// Import game logic
import { whirlwindAbility, barrageAbility, stormAbility } from './game/abilities';
import { checkCollision, checkRectCollision, applyExplosionDamage, applyPlayerExplosionDamage, findNearestEnemies, shootAtTarget, enemyShoot, bossShoot, dropXP, createDamageNumber } from './game/combat';
import { spawnEnemyGroup, spawnBoss, spawnMinion, spawnMiniSplitters, spawnFinalTwinBosses } from './game/spawning';
import { render } from './game/rendering';
import {
  createParticles, createExplosion, createLevelUpEffect, createSmokeTrail,
  createMagicTrail, createArrowTrail, createTeleportEffect, createEnemyProjectileTrail,
  // Juicy Arcade effects
  flashEnemyKill, flashBossKill, flashPlayerDamage, flashLevelUp,
  hitStopBossKill, hitStopPlayerDamage,
  createImpactBurst, createJuicyExplosion, triggerScreenShake
} from './game/effects';
import { checkAndGenerateChunks } from './game/worldgen';

// Import utilities
import { formatTime, getXPForLevel, saveGameStats } from './utils/helpers';
import { loadGif, AnimatedGif } from './utils/gifLoader';

// Import components
import { Leaderboard } from './components/Leaderboard';

// Mobile detection and performance settings
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window) ||
                 (navigator.maxTouchPoints > 0);

const PERFORMANCE_SETTINGS = {
  desktop: {
    maxEnemies: 100,
    maxParticles: 500,
    shadowBlur: true,
    glowEffects: true,
    particleMultiplier: 1.0,
    enemySpawnMultiplier: 1.0
  },
  mobile: {
    maxEnemies: 50, // 50% fewer enemies
    maxParticles: 150, // 70% fewer particles
    shadowBlur: false, // Disable expensive shadow blur
    glowEffects: false, // Disable glow effects
    particleMultiplier: 0.3, // 70% fewer particles
    enemySpawnMultiplier: 0.7 // Spawn 30% fewer enemies
  }
};

const PERF = isMobile ? PERFORMANCE_SETTINGS.mobile : PERFORMANCE_SETTINGS.desktop;

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

  // Volume refs for access in game loop (avoids stale closures)
  const sfxVolumeRef = useRef(0.5);
  const musicVolumeRef = useRef(0.25);

  // Initialize audio files
  useEffect(() => {
    gameStartAudio.current = new Audio('/audio/game-start-317318.mp3');
    gameOverAudio.current = new Audio('/audio/game-over-deep-male-voice-clip-352695.mp3');
    arrowSoundRef.current = new Audio('/audio/arrow-swish_03-306040.mp3');
    swordSoundRef.current = new Audio('/audio/fantasy-game-sword-cut-sound-effect-get-more-on-my-patreon-339824.mp3');
    magicSoundRef.current = new Audio('/audio/magic-smite-6012.mp3');
    levelUpSoundRef.current = new Audio('/audio/level-up-02-199574.mp3');

    // Load saved volume from localStorage (default 0.25 if not set)
    const savedMusicVolume = parseFloat(localStorage.getItem('officeGame_musicVolume') || '0.25');

    // Initialize background music with loop
    backgroundMusicRef.current = new Audio('/audio/8bit-music-for-game-68698.mp3');
    if (backgroundMusicRef.current) {
      backgroundMusicRef.current.loop = true;
      backgroundMusicRef.current.volume = savedMusicVolume;
    }

    // Initialize menu ambient music with loop
    menuMusicRef.current = new Audio('/audio/ambient-game-67014.mp3');
    if (menuMusicRef.current) {
      menuMusicRef.current.loop = true;
      menuMusicRef.current.volume = savedMusicVolume;
      // Start menu music immediately on load (if volume > 0)
      if (savedMusicVolume > 0) {
        menuMusicRef.current.play().catch(e => console.log('Menu music autoplay blocked:', e));
      }
    }
  }, []);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [musicVolume, setMusicVolume] = useState(() => {
    const saved = localStorage.getItem('officeGame_musicVolume');
    return saved !== null ? parseFloat(saved) : 0.25;
  });
  const [sfxVolume, setSfxVolume] = useState(() => {
    const saved = localStorage.getItem('officeGame_sfxVolume');
    return saved !== null ? parseFloat(saved) : 0.5;
  });

  // Apply volume changes to all audio and persist to localStorage
  useEffect(() => {
    // Persist volume settings to localStorage
    localStorage.setItem('officeGame_musicVolume', musicVolume.toString());
    localStorage.setItem('officeGame_sfxVolume', sfxVolume.toString());

    // Update refs for game loop access (avoids stale closures)
    sfxVolumeRef.current = sfxVolume;
    musicVolumeRef.current = musicVolume;

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
    if (gameOverAudio.current) gameOverAudio.current.volume = sfxVolume;
  }, [musicVolume, sfxVolume, gameState]);

  // Manage menu music based on game state - ensures only one music plays at a time
  useEffect(() => {
    const menuStates: GameState[] = ['menu', 'charSelect', 'paused'];

    if (menuStates.includes(gameState)) {
      // FIRST: Stop background music completely
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }
      // THEN: Start menu music (only if music volume > 0)
      if (menuMusicRef.current && musicVolumeRef.current > 0) {
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
        // Always start/resume background music when entering playing state (only if music volume > 0)
        // This handles both new games and resuming from pause
        if (backgroundMusicRef.current && musicVolumeRef.current > 0) {
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
    timeRemaining: 600, // 10 minutes in seconds
    dashCooldown: 0,
    maxDashCooldown: 300
  });
  const [upgradeChoices, setUpgradeChoices] = useState<any[]>([]);
  const [playerUpgrades, setPlayerUpgrades] = useState<Record<string, number>>({});
  const [abilityReady, setAbilityReady] = useState(true);
  const [abilityCooldown, setAbilityCooldown] = useState({ start: 0, duration: 0, remaining: 0 });
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
    damageNumbers: [], // Floating damage numbers
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
    // Juicy Arcade: Enhanced screen shake with rotation
    screenShakeRotation: 0,
    // Juicy Arcade: Screen flash overlay
    screenFlash: { color: '#FFFFFF', duration: 0, maxDuration: 0, intensity: 0 },
    // Juicy Arcade: Hit stop / freeze frames
    hitStop: 0,
    timeRemaining: 600,
    frameCounter: 0, // For trail particle frequency reduction
    maxEnemies: PERF.maxEnemies, // Performance-based cap (50 mobile, 100 desktop)
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

    // Scaled player dimensions - uses character-specific size multiplier
    const characterSize = charClass.startingStats.size || 1.0;
    const playerWidth = 60 * playerScale * characterSize;
    const playerHeight = 60 * playerScale * characterSize;

    // Pre-load weapon images for instant use
    const weaponImage = new Image();
    const weaponImagePromise = new Promise<void>((resolve) => {
      weaponImage.onload = () => resolve();
    });

    if (charClass.weaponType === 'melee') {
      weaponImage.src = '/images/Adobe Express - file.png';
    } else if (charClass.weaponType === 'ranged') {
      weaponImage.src = '/images/czNmcy1wcml2YXRlL3Jhd3BpeGVsX2ltYWdlcy93ZWJzaXRlX2NvbnRlbnQvbHIvcm0yMzRiYXRjaDMtYmlubi0xNS5wbmc.png';
    } else if (charClass.weaponType === 'magic') {
      weaponImage.src = '/images/Spell.png';
    }

    // Pre-load character images (animated GIFs) using gifuct-js decoder
    // This properly decodes GIF frames for canvas animation
    let characterGifUrl = '/images/characters/knight2.gif';
    if (charClass.weaponType === 'melee') {
      characterGifUrl = '/images/characters/knight2.gif';
    } else if (charClass.weaponType === 'ranged') {
      characterGifUrl = '/images/characters/archer-gif.gif';
    } else if (charClass.weaponType === 'magic') {
      characterGifUrl = '/images/characters/partywizard.gif';
    }

    // Load and decode the GIF into frames
    let animatedCharacter: AnimatedGif | null = null;
    const characterImagePromise = loadGif(characterGifUrl).then((decodedGif) => {
      animatedCharacter = new AnimatedGif(decodedGif);
    }).catch((err) => {
      console.error('Failed to load character GIF:', err);
    });

    // Pre-load desk texture images (two varieties)
    const deskImage1 = new Image();
    const deskImage1Promise = new Promise<void>((resolve) => {
      deskImage1.onload = () => resolve();
      deskImage1.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage1.src = '/images/Screenshot 2025-11-12 at 22.54.59.png';

    const deskImage2 = new Image();
    const deskImage2Promise = new Promise<void>((resolve) => {
      deskImage2.onload = () => resolve();
      deskImage2.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage2.src = '/images/Screenshot 2025-11-12 at 23.09.49.png';

    const deskImage3 = new Image();
    const deskImage3Promise = new Promise<void>((resolve) => {
      deskImage3.onload = () => resolve();
      deskImage3.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage3.src = '/images/Screenshot 2025-11-12 at 23.14.19.png';

    const deskImage4 = new Image();
    const deskImage4Promise = new Promise<void>((resolve) => {
      deskImage4.onload = () => resolve();
      deskImage4.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage4.src = '/images/Screenshot 2025-11-12 at 23.26.24.png';

    const deskImage5 = new Image();
    const deskImage5Promise = new Promise<void>((resolve) => {
      deskImage5.onload = () => resolve();
      deskImage5.onerror = () => resolve(); // Continue even if image fails to load
    });
    deskImage5.src = '/images/Screenshot 2025-11-13 at 19.56.22.png';

    // Pre-load sombrero image for powerup spawns
    const sombreroImage = new Image();
    const sombreroImagePromise = new Promise<void>((resolve) => {
      sombreroImage.onload = () => resolve();
      sombreroImage.onerror = () => resolve(); // Continue even if image fails to load
    });
    sombreroImage.src = '/images/sobrero.png';

    // Pre-load magnet image for magnet pickups
    const magnetImage = new Image();
    const magnetImagePromise = new Promise<void>((resolve) => {
      magnetImage.onload = () => resolve();
      magnetImage.onerror = () => resolve(); // Continue even if image fails to load
    });
    magnetImage.src = '/images/bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.png';

    // Pre-load enemy projectile images (themed sprites)
    const projectileImages: Record<string, HTMLImageElement> = {};
    const uniqueImagePaths = [...new Set(Object.values(PROJECTILE_CONFIG).map(c => c.imagePath))];
    const projectilePromises = uniqueImagePaths.map(imagePath => {
      const img = new Image();
      return new Promise<void>((resolve) => {
        img.onload = () => {
          // Map this image to all enemy types that use it
          Object.entries(PROJECTILE_CONFIG).forEach(([type, config]) => {
            if (config.imagePath === imagePath) {
              projectileImages[type] = img;
            }
          });
          resolve();
        };
        img.onerror = () => resolve(); // Continue even if image fails
        img.src = imagePath;
      });
    });

    // Wait for all images to load before starting the game
    await Promise.all([weaponImagePromise, characterImagePromise, deskImage1Promise, deskImage2Promise, deskImage3Promise, deskImage4Promise, deskImage5Promise, sombreroImagePromise, magnetImagePromise, ...projectilePromises]);

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
        characterImage: animatedCharacter, // AnimatedGif instance with frame cycling
        abilityCooldownMod: 1,
        abilityReady: true,
        aimX: 0, // Aiming direction X
        aimY: 1,  // Aiming direction Y (default: down)
        invincibilityTimer: 0, // I-frames: temporary damage immunity after getting hit
        swordBurstDirections: 1, // Knight: number of directions for sword burst (starts at 1)
        swordBurstCooldown: 0, // Knight: cooldown timer for sword burst
        // Dash ability
        dashCooldown: 0, // Frames until dash is ready again
        maxDashCooldown: 300, // Max cooldown for UI bar (5 seconds)
        dashTimer: 0, // Frames remaining in current dash
        dashVelX: 0, // Dash velocity X
        dashVelY: 0, // Dash velocity Y
        isDashing: false // Currently in dash animation
      },
      projectiles: [],
      enemyProjectiles: [],
      enemies: [],
      particles: [],
      orbitingBlades: [], // Warrior's orbiting sword blades
      damageNumbers: [], // Floating damage numbers for visual feedback
      xpOrbs: [],
      pickups: [],
      sombreros: [], // Sombreros that spawn magnet/bomb pickups
      obstacles: [], // Start empty - chunks will generate obstacles
      deskImages: [deskImage1, deskImage2, deskImage3, deskImage4, deskImage5], // Store all desk texture images
      sombreroImage: sombreroImage, // Store sombrero image for rendering
      magnetImage: magnetImage, // Store magnet image for rendering
      projectileImages: projectileImages, // Store enemy projectile sprite images
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
      maxedUpgrades: false, // Track if all upgrades are maxed (stop XP drops)
      gameTime: 0,
      timeRemaining: 600,
      upgrades: {},
      enemySpeedMod: 1, // Slow enemy multiplier (affected by Bureaucracy upgrade)
      baseEnemySpeedMod: 1, // Base difficulty scaling (separate from slow effect)
      spawnRateMod: 1,
      abilityTimer: 0,
      screenShake: 0,
      // Juicy Arcade: Visual effects state
      screenShakeRotation: 0,
      screenFlash: { color: '#FFFFFF', duration: 0, maxDuration: 0, intensity: 0 },
      hitStop: 0,
      maxEnemies: PERF.maxEnemies, // Performance-based cap (50 mobile, 100 desktop)
      camera: {
        x: startX - canvasSize.width / 2,
        y: startY - canvasSize.height / 2,
        targetX: startX - canvasSize.width / 2, // Smooth camera target
        targetY: startY - canvasSize.height / 2, // Smooth camera target
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
      timeRemaining: 600,
      dashCooldown: 0,
      maxDashCooldown: 300
    });

    setPlayerUpgrades({});
    setAbilityReady(true);

    // Play game start audio (only if sfx volume > 0)
    if (sfxVolume > 0) {
      gameStartAudio.current?.play().catch(e => console.log('Audio play failed:', e));
    }

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
        game.maxedUpgrades = true; // Stop dropping XP to prevent end-game lag
        return; // Don't level up
      }

      // Proceed with level up
      game.player.xp -= xpNeeded;
      game.player.level++;

      // Level up celebration effect
      createLevelUpEffect(game, game.player.x, game.player.y, PERF.particleMultiplier);
      flashLevelUp(game);
      triggerScreenShake(game, 12, 2);

      // Pause background music and play level-up sound only
      if (backgroundMusicRef.current) {
        backgroundMusicRef.current.pause();
      }

      if (levelUpSoundRef.current && sfxVolumeRef.current > 0) {
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
      createLevelUpEffect(game, game.player.x, game.player.y, PERF.particleMultiplier);
      flashLevelUp(game);
      triggerScreenShake(game, 20, 3);

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

      // Performance safeguard: Set minimum shootSpeed floor (max fire rate)
      // This prevents excessive projectile spam while still rewarding upgrades
      // Projectile cap of 120 also helps prevent lag
      const minShootSpeed = game.player.baseShootSpeed * 0.5; // Max 2x fire rate
      if (game.player.shootSpeed < minShootSpeed) {
        game.player.shootSpeed = minShootSpeed;
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
    // Only check game.player.abilityReady (ref) - not React state abilityReady
    // React state can be stale in event handler closures, causing ability to never reactivate
    if (!game.player.abilityReady) return;

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

    // Track cooldown for UI indicator
    const cooldownStart = Date.now();
    setAbilityCooldown({ start: cooldownStart, duration: cooldown, remaining: cooldown });

    // Update cooldown remaining every 100ms for smooth UI
    const cooldownInterval = setInterval(() => {
      const elapsed = Date.now() - cooldownStart;
      const remaining = Math.max(0, cooldown - elapsed);
      setAbilityCooldown(prev => ({ ...prev, remaining }));
      if (remaining <= 0) {
        clearInterval(cooldownInterval);
      }
    }, 100);

    setTimeout(() => {
      if (gameData.current.player) {
        gameData.current.player.abilityReady = true;
        setAbilityReady(true);
        setAbilityCooldown({ start: 0, duration: 0, remaining: 0 });
      }
      clearInterval(cooldownInterval);
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
        // SHIFT to dash
        if (e.key === 'Shift' && gameData.current) {
          e.preventDefault();
          const player = gameData.current.player;
          if (player.dashCooldown <= 0 && !player.isDashing) {
            // Get movement direction or use aim direction
            let dashDirX = player.aimX;
            let dashDirY = player.aimY;

            // Check if player is pressing movement keys
            const moveX = (keysPressed.current['d'] || keysPressed.current['arrowright'] ? 1 : 0) -
                         (keysPressed.current['a'] || keysPressed.current['arrowleft'] ? 1 : 0);
            const moveY = (keysPressed.current['s'] || keysPressed.current['arrowdown'] ? 1 : 0) -
                         (keysPressed.current['w'] || keysPressed.current['arrowup'] ? 1 : 0);

            if (moveX !== 0 || moveY !== 0) {
              const len = Math.sqrt(moveX * moveX + moveY * moveY);
              dashDirX = moveX / len;
              dashDirY = moveY / len;
            }

            // Start dash
            const dashSpeed = 32; // Increased dash speed for more distance
            player.dashVelX = dashDirX * dashSpeed;
            player.dashVelY = dashDirY * dashSpeed;
            player.dashTimer = 12; // ~0.2 seconds at 60fps (increased for more distance)
            player.dashCooldown = 300; // 5 second cooldown
            player.maxDashCooldown = 300; // For UI bar calculation
            player.isDashing = true;
            player.invincibilityTimer = Math.max(player.invincibilityTimer, 12); // i-frames during dash

            // Dash visual effect - trail particles
            const game = gameData.current;
            for (let i = 0; i < 8; i++) {
              game.particles.push({
                x: player.x + (Math.random() - 0.5) * 20,
                y: player.y + (Math.random() - 0.5) * 20,
                vx: -dashDirX * 3 + (Math.random() - 0.5) * 2,
                vy: -dashDirY * 3 + (Math.random() - 0.5) * 2,
                size: 6 + Math.random() * 4,
                color: player.color,
                life: 20,
                maxLife: 20,
                type: 'trail'
              });
            }
          }
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
      // Juicy Arcade: Hit stop / freeze frames
      if (game.hitStop > 0) {
        game.hitStop--;
        // Skip physics update but still render for freeze frame effect
        render(ctx, game, canvasSize, PERF);
        requestAnimationFrame(gameLoop);
        return;
      }

      // Snow effect disabled (was annoying)

      updateGame(game);
      render(ctx, game, canvasSize, PERF);

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
        timeRemaining: Math.max(0, Math.floor(game.timeRemaining)),
        dashCooldown: game.player.dashCooldown,
        maxDashCooldown: game.player.maxDashCooldown
      });

      if (game.player.health <= 0) {
        // Music will be stopped by the useEffect when gameState changes to 'gameover'
        // Play game over audio (only if sfx volume > 0)
        if (sfxVolumeRef.current > 0) {
          gameOverAudio.current?.play().catch(e => console.log('Audio play failed:', e));
        }

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
      render(ctx, game, canvasSize, PERF);

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

      // Update damage numbers (floating text)
      for (let i = game.damageNumbers.length - 1; i >= 0; i--) {
        const dn = game.damageNumbers[i];
        dn.x += dn.vx;
        dn.y += dn.vy;
        dn.vy += 0.1; // Gravity
        dn.life -= 1;
        if (dn.life <= 0) {
          game.damageNumbers.splice(i, 1);
        }
      }
      // Cap damage numbers to prevent overflow (30 on desktop, simplified on mobile)
      const maxDamageNumbers = PERF.maxParticles < 200 ? 15 : 30;
      if (game.damageNumbers.length > maxDamageNumbers) {
        game.damageNumbers.splice(0, game.damageNumbers.length - maxDamageNumbers);
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
                createTeleportEffect(game, enemy.x, enemy.y, enemy.color || '#FFFFFF', PERF.particleMultiplier);
                createExplosion(game, enemy.x, enemy.y, 80, enemy.color || '#FFFFFF', PERF.particleMultiplier);
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
                createParticles(game, game.player.x, game.player.y, '#FFFFFF', 10, PERF.particleMultiplier);
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
              createTeleportEffect(game, x, y, i % 2 === 0 ? '#DC2626' : '#7C3AED', PERF.particleMultiplier);
              createExplosion(game, x, y, 200, i % 2 === 0 ? '#DC2626' : '#7C3AED', PERF.particleMultiplier);
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

    // Update dash cooldown
    if (player.dashCooldown > 0) {
      player.dashCooldown--;
    }

    // Update player position (keyboard + touch)
    let moveX = 0;
    let moveY = 0;

    // If dashing, use dash velocity instead of normal movement
    if (player.isDashing && player.dashTimer > 0) {
      player.dashTimer--;

      // Calculate dash destination
      const dashNewX = player.x + player.dashVelX;
      const dashNewY = player.y + player.dashVelY;

      // Check obstacle collision for dash (don't get stuck!)
      let dashCanMove = true;
      for (const obstacle of obstacles) {
        if (checkRectCollision(
          { x: dashNewX, y: dashNewY, width: player.width, height: player.height },
          obstacle
        )) {
          dashCanMove = false;
          break;
        }
      }

      if (dashCanMove) {
        player.x = dashNewX;
        player.y = dashNewY;
      } else {
        // Hit obstacle - end dash early
        player.isDashing = false;
        player.dashVelX = 0;
        player.dashVelY = 0;
        // Impact effect
        game.screenShake = 6;
        for (let i = 0; i < 5; i++) {
          game.particles.push({
            x: player.x,
            y: player.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: 4,
            color: '#FFFFFF',
            life: 10,
            maxLife: 10,
            type: 'spark'
          });
        }
      }

      // Dash trail particles
      if (game.frameCounter % 2 === 0 && player.isDashing) {
        game.particles.push({
          x: player.x + (Math.random() - 0.5) * 15,
          y: player.y + (Math.random() - 0.5) * 15,
          vx: -player.dashVelX * 0.2 + (Math.random() - 0.5) * 1,
          vy: -player.dashVelY * 0.2 + (Math.random() - 0.5) * 1,
          size: 4 + Math.random() * 3,
          color: player.color,
          life: 15,
          maxLife: 15,
          type: 'trail'
        });
      }

      // End dash
      if (player.dashTimer <= 0) {
        player.isDashing = false;
        player.dashVelX = 0;
        player.dashVelY = 0;
      }
    } else {
      // Normal movement when not dashing
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
    }

    // SMOOTH CAMERA: Lerp towards target position for cinematic feel
    const cameraTargetX = player.x - canvasSize.width / 2;
    const cameraTargetY = player.y - canvasSize.height / 2;
    const cameraSmoothing = 0.12; // Lower = smoother/slower, Higher = snappier

    game.camera.x += (cameraTargetX - game.camera.x) * cameraSmoothing;
    game.camera.y += (cameraTargetY - game.camera.y) * cameraSmoothing;
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

    // WARRIOR: Orbiting blades system (replaces projectile shooting)
    if (player.weaponType === 'melee') {
      // BALANCED: Cap blade count at 3 to allow enemies through gaps
      const bladeCount = Math.min(player.multiShot, 3);
      // Larger orbit radius creates more space between blades for enemies to slip through
      const orbitRadius = 140 + (bladeCount * 15);
      // Slower rotation gives enemies more time to pass between blades
      const orbitSpeed = 0.045; // Reduced from 0.06
      const bladeDamage = 28 * player.damageMultiplier;
      const bladeHitCooldown = 30; // Frames between hits on same enemy (0.5 sec at 60fps)

      // Initialize or sync blade count
      if (game.orbitingBlades.length !== bladeCount) {
        game.orbitingBlades = [];
        for (let i = 0; i < bladeCount; i++) {
          game.orbitingBlades.push({
            angle: (Math.PI * 2 * i) / bladeCount,
            hitCooldowns: {} // Track per-enemy hit cooldowns
          });
        }
      }

      // Update each orbiting blade
      game.orbitingBlades.forEach((blade: any) => {
        // Rotate blade
        blade.angle += orbitSpeed;
        if (blade.angle > Math.PI * 2) blade.angle -= Math.PI * 2;

        // Calculate blade position
        const bladeX = player.x + Math.cos(blade.angle) * orbitRadius;
        const bladeY = player.y + Math.sin(blade.angle) * orbitRadius;
        // FIXED blade size - no scaling from upgrades
        const bladeSize = 20; // Fixed size, smaller hitbox

        // Decrement all hit cooldowns
        Object.keys(blade.hitCooldowns).forEach(enemyId => {
          blade.hitCooldowns[enemyId]--;
          if (blade.hitCooldowns[enemyId] <= 0) {
            delete blade.hitCooldowns[enemyId];
          }
        });

        // Check collision with enemies - tighter hitbox for balance
        enemies.forEach((enemy: any, enemyIndex: number) => {
          const enemyId = `enemy_${enemyIndex}_${enemy.x}_${enemy.y}`;

          // Skip if this enemy is on cooldown for this blade
          if (blade.hitCooldowns[enemyId]) return;

          const dx = bladeX - enemy.x;
          const dy = bladeY - enemy.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          // Smaller hit radius - blades must be closer to hit
          const hitRadius = bladeSize + (enemy.width || 20) / 3; // Reduced from /2 to /3

          if (dist < hitRadius) {
            // Deal damage
            enemy.health -= bladeDamage;
            blade.hitCooldowns[enemyId] = bladeHitCooldown;

            // Visual feedback - REDUCED particles for performance (was 8, now 3)
            createParticles(game, enemy.x, enemy.y, enemy.color, 3, PERF.particleMultiplier);
            createDamageNumber(game, enemy.x, enemy.y, bladeDamage, 'normal', false);

            // CLASS SYNERGY: Knight Blade Shockwave - AoE damage on blade hit
            if (player.bladeShockwave) {
              const shockwaveRadius = 60;
              const shockwaveDamage = bladeDamage * 0.3;
              enemies.forEach((nearby: any, nearbyIdx: number) => {
                if (nearbyIdx !== enemyIndex && nearby.health > 0) {
                  const sdx = nearby.x - enemy.x;
                  const sdy = nearby.y - enemy.y;
                  const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
                  if (sdist < shockwaveRadius) {
                    nearby.health -= shockwaveDamage;
                    // Shockwave visual - REDUCED cap for performance (was 800, now 400)
                    if (particles.length < 400 && Math.random() < 0.5) {
                      game.particles.push({
                        x: nearby.x,
                        y: nearby.y,
                        vx: (sdx / sdist) * 3,
                        vy: (sdy / sdist) * 3,
                        size: 4,
                        color: '#EF4444',
                        life: 8,
                        maxLife: 8,
                        type: 'spark'
                      });
                    }
                  }
                }
              });
              // Shockwave ring visual - REDUCED for performance (was 8, now 4)
              if (particles.length < 600) {
                for (let r = 0; r < 4; r++) {
                  const ringAngle = (Math.PI * 2 * r) / 4;
                  game.particles.push({
                    x: enemy.x,
                    y: enemy.y,
                    vx: Math.cos(ringAngle) * 4,
                    vy: Math.sin(ringAngle) * 4,
                    size: 4,
                    color: '#F87171',
                    life: 10,
                    maxLife: 10,
                    type: 'explosion'
                  });
                }
              }
            }

            // Play sword sound occasionally (not every hit, only if sfx volume > 0)
            if (Math.random() < 0.3 && swordSoundRef.current && sfxVolumeRef.current > 0) {
              swordSoundRef.current.currentTime = 0;
              swordSoundRef.current.play().catch(() => {});
            }

            // Small knockback
            if (dist > 0) {
              const knockback = 15;
              enemy.x -= (dx / dist) * knockback;
              enemy.y -= (dy / dist) * knockback;
            }

            // Check for enemy death - handle XP drop and kill effects
            if (enemy.health <= 0 && !enemy.markedForDeath) {
              enemy.markedForDeath = true; // Prevent double-processing
              game.score += enemy.scoreValue * game.wave;
              game.kills++;

              // Calculate impact direction for directional effects
              const impactDir = blade.angle;

              // Juicy Arcade: Varied death effects based on enemy type
              const isSpecialEnemy = enemy.type === 'angry_client' || enemy.type === 'summoner' || enemy.type === 'shielded';
              const isHighValueKill = enemy.scoreValue >= 15 || enemy.xpValue >= 8;

              // Impact burst: only 15% chance for regular enemies (was 25%), always for special
              if (!isMobile && (isSpecialEnemy || Math.random() < 0.15)) {
                const burstIntensity = isSpecialEnemy ? 'medium' : 'light';
                createImpactBurst(game, enemy.x, enemy.y, impactDir, enemy.color, burstIntensity);
              }

              // Regular particles: REDUCED count for performance (was 8-20, now 4-12)
              const particleCount = Math.min(12, 4 + Math.floor(enemy.size / 8));
              createParticles(game, enemy.x, enemy.y, enemy.color, particleCount, PERF.particleMultiplier);
              dropXP(game, enemy.x, enemy.y, enemy.xpValue);

              // Screen flash: only for special/high-value enemies
              if (isSpecialEnemy || isHighValueKill) {
                flashEnemyKill(game);
              }

              // 0.5% chance to drop a magnet
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
                if (!isMobile) {
                  createJuicyExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308');
                } else {
                  createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308', PERF.particleMultiplier);
                }
                triggerScreenShake(game, 15, 3);
              }

              // SPLITTER - Spawns mini-enemies when killed
              if (enemy.type === 'splitter' && game.enemies.length < game.maxEnemies) {
                const splitCount = enemy.splitCount || 3;
                spawnMiniSplitters(game, enemy.x, enemy.y, splitCount);
                createParticles(game, enemy.x, enemy.y, '#F59E0B', 20, PERF.particleMultiplier);
                triggerScreenShake(game, 8, 2);
              }

              // Boss kill handling
              if (enemy.isBoss) {
                game.bossMode = false;
                game.bossTimer = 0;
                dropXP(game, enemy.x, enemy.y, enemy.xpValue * 6, '#3B82F6'); // Blue XP for boss

                flashBossKill(game);
                hitStopBossKill(game);
                triggerScreenShake(game, 35, 4);
                if (!isMobile) {
                  createJuicyExplosion(game, enemy.x, enemy.y, 100, enemy.color);
                }

                // Drop 4 bombs on boss death (like Founder ability)
                const bombCount = 4;
                for (let b = 0; b < bombCount; b++) {
                  const angle = (Math.PI * 2 * b) / bombCount;
                  const distance = 100;
                  const bombX = enemy.x + Math.cos(angle) * distance;
                  const bombY = enemy.y + Math.sin(angle) * distance;

                  game.pickups.push({
                    x: bombX,
                    y: bombY,
                    type: 'boss_bomb',
                    size: 20,
                    width: 40,
                    height: 40,
                    detonateTimer: 180, // 3 seconds until explosion
                    explosionRadius: 150,
                    explosionDamage: 100,
                    color: enemy.color
                  });

                  createParticles(game, bombX, bombY, enemy.color, 10, PERF.particleMultiplier);
                }
              }
            }
          }
        });
      });

      // Remove enemies marked for death by blades
      game.enemies = game.enemies.filter((enemy: any) => !enemy.markedForDeath);

      // KNIGHT SWORD BURST: Fire sword projectiles in multiple directions
      if (player.swordBurstCooldown <= 0 && enemies.length > 0 && projectiles.length < 120) {
        const directions = player.swordBurstDirections;
        const swordSpeed = 8;
        const swordDamage = 38 * player.damageMultiplier; // Balanced: not too weak, not OP
        // Cap sword size scaling to prevent huge swords at max upgrades
        const cappedSizeMultiplier = Math.min(player.projectileSize, 1.5);
        const swordSize = 12 * cappedSizeMultiplier;

        // Fire swords in evenly-spaced directions
        for (let i = 0; i < directions; i++) {
          // Start at 45 degrees (northeast), spread evenly around
          const angle = (Math.PI / 4) + (Math.PI * 2 * i) / directions;

          const projectile: any = {
            x: player.x,
            y: player.y,
            vx: Math.cos(angle) * swordSpeed,
            vy: Math.sin(angle) * swordSpeed,
            size: swordSize,
            damage: swordDamage,
            color: '#EF4444',
            width: swordSize * 2,
            height: swordSize * 2,
            pierceCount: 0,
            maxPierce: 1, // Pierce through 1 enemy (balanced)
            trail: true,
            angle: angle,
            weaponType: 'melee',
            image: player.weaponImage,
            isSwordBurst: true, // Mark as sword burst for special rendering
            lifetime: 60 // 1 second lifetime
          };

          projectiles.push(projectile);
        }

        // Play sword sound (only if sfx volume > 0)
        if (swordSoundRef.current && sfxVolumeRef.current > 0) {
          swordSoundRef.current.currentTime = 0;
          swordSoundRef.current.play().catch(() => {});
        }

        // Visual burst effect - REDUCED for performance (was 10, now 4)
        createParticles(game, player.x, player.y, '#EF4444', 4, PERF.particleMultiplier);

        // Reset cooldown (based on shootSpeed for consistency)
        player.swordBurstCooldown = player.shootSpeed;
      } else {
        player.swordBurstCooldown--;
      }
    }

    // Shooting logic - ranger and mage use projectiles
    // Performance cap: limit max projectiles to 120
    if (player.shootCooldown <= 0 && enemies.length > 0 && projectiles.length < 120) {
      if (player.weaponType === 'ranged') {
        // Play arrow sound (only if sfx volume > 0)
        if (arrowSoundRef.current && sfxVolumeRef.current > 0) {
          arrowSoundRef.current.currentTime = 0; // Reset to start for rapid fire
          arrowSoundRef.current.play().catch(e => console.log('Audio play failed:', e));
        }

        // RANGER: Auto-aim at nearest enemies
        const targets = findNearestEnemies(player, enemies, player.multiShot);
        targets.forEach((target: any) => shootAtTarget(game, player, target));
      } else {
        // Play magic sound (only if sfx volume > 0)
        if (magicSoundRef.current && sfxVolumeRef.current > 0) {
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
      // PERFORMANCE: Skip trails for barrage arrows (too many projectiles)
      if (game.frameCounter % 2 === 0 && particles.length < 800 && !proj.isBarrageArrow) {
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
              createParticles(game, enemy.x, enemy.y, '#60A5FA', 8, PERF.particleMultiplier);
            }
          } else {
            // Apply damage with reduction for enraged final bosses
            const damageMultiplier = (enemy.isFinalBoss && enemy.isEnraged && enemy.damageReduction)
              ? enemy.damageReduction
              : 1;
            const actualDamage = proj.damage * damageMultiplier;
            enemy.health -= actualDamage;

            // ENHANCED HIT FEEDBACK
            // 1. More particles on hit
            if (particles.length < 800) {
              createParticles(game, enemy.x, enemy.y, enemy.color, 8, PERF.particleMultiplier);
              // Impact sparks in projectile direction
              const hitAngle = Math.atan2(proj.vy, proj.vx);
              for (let s = 0; s < 3; s++) {
                const sparkAngle = hitAngle + Math.PI + (Math.random() - 0.5) * 0.8;
                game.particles.push({
                  x: enemy.x,
                  y: enemy.y,
                  vx: Math.cos(sparkAngle) * (4 + Math.random() * 4),
                  vy: Math.sin(sparkAngle) * (4 + Math.random() * 4),
                  size: 3 + Math.random() * 2,
                  color: '#FFFFFF',
                  life: 10,
                  maxLife: 10,
                  type: 'spark'
                });
              }
            }

            // 2. Small screen shake on hit (scaled by damage)
            const hitShake = Math.min(4, actualDamage / 20);
            game.screenShake = Math.max(game.screenShake, hitShake);

            // 3. Knockback enemy slightly
            const knockbackForce = 8;
            const kbDist = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
            if (kbDist > 0 && !enemy.isBoss) {
              enemy.x += (proj.vx / kbDist) * knockbackForce;
              enemy.y += (proj.vy / kbDist) * knockbackForce;
            }

            // Create damage number for visual feedback
            createDamageNumber(game, enemy.x, enemy.y, actualDamage, 'normal', isMobile);

            // CLASS SYNERGY: Wizard Chain Lightning - hits nearby enemies
            if (player.chainLightning && player.weaponType === 'magic') {
              const chainRange = 80;
              const chainDamage = actualDamage * 0.4;
              enemies.forEach((nearby: any) => {
                if (nearby !== enemy && nearby.health > 0) {
                  const cdx = nearby.x - enemy.x;
                  const cdy = nearby.y - enemy.y;
                  const cdist = Math.sqrt(cdx * cdx + cdy * cdy);
                  if (cdist < chainRange) {
                    nearby.health -= chainDamage;
                    // Lightning visual
                    if (particles.length < 800) {
                      for (let l = 0; l < 4; l++) {
                        const t = l / 4;
                        game.particles.push({
                          x: enemy.x + cdx * t + (Math.random() - 0.5) * 10,
                          y: enemy.y + cdy * t + (Math.random() - 0.5) * 10,
                          vx: (Math.random() - 0.5) * 2,
                          vy: (Math.random() - 0.5) * 2,
                          size: 4,
                          color: '#8B5CF6',
                          life: 8,
                          maxLife: 8,
                          type: 'spark'
                        });
                      }
                    }
                  }
                }
              });
            }

            // CLASS SYNERGY: Ranger Lifesteal - heal on hit
            if (player.lifesteal && player.weaponType === 'ranged') {
              const healAmount = actualDamage * player.lifesteal;
              player.health = Math.min(player.maxHealth, player.health + healAmount);
              // Small green particle for heal feedback
              if (healAmount >= 1) {
                game.particles.push({
                  x: player.x,
                  y: player.y - 20,
                  vx: 0,
                  vy: -1,
                  size: 5,
                  color: '#22C55E',
                  life: 15,
                  maxLife: 15,
                  type: 'heal'
                });
              }
            }
          }

          // Explosion effect
          if (player.explosionRadius > 0) {
            applyExplosionDamage(game, proj.x, proj.y, player.explosionRadius, proj.damage * 0.6);
            // Only create explosion particles if under particle cap
            if (particles.length < 800) {
              createExplosion(game, proj.x, proj.y, player.explosionRadius, '#F59E0B', PERF.particleMultiplier);
            }
            game.screenShake = 8; // Enhanced explosion shake
          }

          // Pierce: use higher of projectile's maxPierce OR player's piercing upgrade
          // Pierce effectiveness reduced by 50% when explosions are active (performance balance)
          const playerPierce = player.explosionRadius > 50 ? Math.floor(player.piercing / 2) : player.piercing;
          const effectivePierce = Math.max(proj.maxPierce || 0, playerPierce);
          proj.pierceCount = (proj.pierceCount || 0) + 1;
          if (proj.pierceCount > effectivePierce) {
            projectiles.splice(i, 1);
          }

          if (enemy.health <= 0) {
            game.score += enemy.scoreValue * game.wave;
            game.kills++;

            // Calculate impact direction for directional effects
            const impactDir = Math.atan2(proj.vy, proj.vx);

            // Juicy Arcade: Varied death effects based on enemy type and randomness
            const isSpecialEnemy = enemy.type === 'angry_client' || enemy.type === 'summoner' || enemy.type === 'shielded';
            const isHighValueKill = enemy.scoreValue >= 15 || enemy.xpValue >= 8;

            // Impact burst: only 25% chance for regular enemies, always for special
            if (!isMobile && (isSpecialEnemy || Math.random() < 0.25)) {
              const burstIntensity = isSpecialEnemy ? 'medium' : 'light';
              createImpactBurst(game, enemy.x, enemy.y, impactDir, enemy.color, burstIntensity);
            }

            // Regular particles: reduced count, varies by enemy size
            const particleCount = Math.min(20, 8 + Math.floor(enemy.size / 5));
            createParticles(game, enemy.x, enemy.y, enemy.color, particleCount, PERF.particleMultiplier);
            dropXP(game, enemy.x, enemy.y, enemy.xpValue);

            // Screen flash: only for special/high-value enemies (not every kill)
            if (isSpecialEnemy || isHighValueKill) {
              flashEnemyKill(game);
            }

            // Hit stop: removed for regular enemies - only bosses get hit stop

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
              // Juicy Arcade: Use enhanced explosion effect
              if (!isMobile) {
                createJuicyExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308');
              } else {
                createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308', PERF.particleMultiplier);
              }
              triggerScreenShake(game, 15, 3); // Big explosion shake with rotation
            }

            // SPLITTER - Spawns mini-enemies when killed
            if (enemy.type === 'splitter' && game.enemies.length < game.maxEnemies) {
              const splitCount = enemy.splitCount || 3;
              spawnMiniSplitters(game, enemy.x, enemy.y, splitCount);
              createParticles(game, enemy.x, enemy.y, '#F59E0B', 20, PERF.particleMultiplier);
              triggerScreenShake(game, 8, 2);
            }

            enemies.splice(j, 1);

            if (enemy.isBoss) {
              game.bossMode = false;
              game.bossTimer = 0; // Reset boss timer when boss is defeated
              dropXP(game, enemy.x, enemy.y, enemy.xpValue * 6, '#3B82F6'); // Blue XP for boss

              // Juicy Arcade: Big boss defeat effects
              flashBossKill(game);
              hitStopBossKill(game);
              triggerScreenShake(game, 35, 4); // Massive boss defeat shake with rotation
              if (!isMobile) {
                createJuicyExplosion(game, enemy.x, enemy.y, 100, enemy.color);
              }

              // Drop 4 bombs on boss death (like Founder ability)
              const bombCount = 4;
              for (let b = 0; b < bombCount; b++) {
                const angle = (Math.PI * 2 * b) / bombCount;
                const distance = 100;
                const bombX = enemy.x + Math.cos(angle) * distance;
                const bombY = enemy.y + Math.sin(angle) * distance;

                game.pickups.push({
                  x: bombX,
                  y: bombY,
                  type: 'boss_bomb',
                  size: 20,
                  width: 40,
                  height: 40,
                  detonateTimer: 180, // 3 seconds until explosion
                  explosionRadius: 150,
                  explosionDamage: 100,
                  color: enemy.color
                });

                createParticles(game, bombX, bombY, enemy.color, 10, PERF.particleMultiplier);
              }
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

      // Create subtle trail for enemy projectiles (every 3rd frame, respect particle cap)
      if (game.frameCounter % 3 === 0 && particles.length < 800) {
        createEnemyProjectileTrail(game, proj.x, proj.y, proj.trailColor || proj.color, proj.size);
      }

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
          createParticles(game, proj.x, proj.y, '#EF4444', 10, PERF.particleMultiplier);
          createDamageNumber(game, player.x, player.y, proj.damage, 'player', isMobile);

          // Juicy Arcade: Player damage feedback
          flashPlayerDamage(game);
          if (!isMobile) {
            hitStopPlayerDamage(game);
          }
          triggerScreenShake(game, 12, 2);
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
            createParticles(game, enemy.x, enemy.y, enemy.color, 15, PERF.particleMultiplier);
            // Teleport 250-400 units away from player (safer distance)
            const angle = Math.random() * Math.PI * 2;
            const distance = 250 + Math.random() * 150;
            enemy.x = player.x + Math.cos(angle) * distance;
            enemy.y = player.y + Math.sin(angle) * distance;
            createParticles(game, enemy.x, enemy.y, enemy.color, 15, PERF.particleMultiplier);
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

        // CIRCLER (HR Rep) - Orbits around the player while shooting
        if (enemy.type === 'circler') {
          enemy.orbitAngle = (enemy.orbitAngle || Math.random() * Math.PI * 2) + 0.03;
          const orbitDist = enemy.orbitDistance || 180;

          // Target position orbiting player
          const targetX = player.x + Math.cos(enemy.orbitAngle) * orbitDist;
          const targetY = player.y + Math.sin(enemy.orbitAngle) * orbitDist;

          // Move toward orbit position instead of directly at player
          const orbDx = targetX - enemy.x;
          const orbDy = targetY - enemy.y;
          const orbDist = Math.sqrt(orbDx * orbDx + orbDy * orbDy);

          if (orbDist > 5) {
            enemy.orbitVx = (orbDx / orbDist) * enemy.speed * 2;
            enemy.orbitVy = (orbDy / orbDist) * enemy.speed * 2;
          }

          // Shoot while orbiting
          enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
          if (enemy.shootCooldown <= 0 && dist < 350) {
            enemyShoot(game, enemy, player);
            enemy.shootCooldown = 90;
          }
        }

        // CHARGER (Coffee Runner) - Periodically charges at high speed
        if (enemy.type === 'charger') {
          enemy.chargeCooldown = (enemy.chargeCooldown || 120) - 1;

          if (enemy.isCharging) {
            // Continue charging in the locked direction
            enemy.chargeTimer = (enemy.chargeTimer || 0) - 1;
            if (enemy.chargeTimer <= 0) {
              enemy.isCharging = false;
              enemy.chargeCooldown = 120 + Math.random() * 60; // Reset cooldown
              createParticles(game, enemy.x, enemy.y, enemy.color, 10, PERF.particleMultiplier);
            }
          } else if (enemy.chargeCooldown <= 0 && dist < 400 && dist > 100) {
            // Start charging - lock direction toward player
            enemy.isCharging = true;
            enemy.chargeTimer = 40; // Charge for ~0.67 seconds
            enemy.chargeDx = dx / dist;
            enemy.chargeDy = dy / dist;
            // Visual cue - particles
            createParticles(game, enemy.x, enemy.y, '#92400E', 15, PERF.particleMultiplier);
          }
        }

        // RETREATER (Remote Worker) - Maintains distance and backs away
        if (enemy.type === 'retreater') {
          const prefDist = enemy.preferredDistance || 280;

          // If player is too close, move away
          if (dist < prefDist - 50) {
            enemy.retreating = true;
          } else if (dist > prefDist + 50) {
            enemy.retreating = false;
          }

          // Shoot from a distance
          enemy.shootCooldown = (enemy.shootCooldown || 0) - 1;
          if (enemy.shootCooldown <= 0 && dist < 400) {
            enemyShoot(game, enemy, player);
            enemy.shootCooldown = 70; // Faster shooting to compensate for kiting
          }
        }

        // ZIGZAGGER (Caffeinated Intern) - Erratic movement
        if (enemy.type === 'zigzagger') {
          enemy.zigzagTimer = (enemy.zigzagTimer || 0) - 1;
          if (enemy.zigzagTimer <= 0) {
            enemy.zigzagDirection = enemy.zigzagDirection === 1 ? -1 : 1;
            enemy.zigzagTimer = 15 + Math.random() * 20; // Random interval
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
            createTeleportEffect(game, enemy.x, enemy.y, enemy.color, PERF.particleMultiplier);

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
            createTeleportEffect(game, enemy.x, enemy.y, enemy.color, PERF.particleMultiplier);
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
            createParticles(game, enemy.x, enemy.y, '#A855F7', 30, PERF.particleMultiplier);
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
                createParticles(game, bombX, bombY, enemy.color, 15, PERF.particleMultiplier);
              }

              createExplosion(game, enemy.x, enemy.y, 100, enemy.color, PERF.particleMultiplier);
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
              createTeleportEffect(game, enemy.x, enemy.y, enemy.color, PERF.particleMultiplier);
              createExplosion(game, enemy.x, enemy.y, 150, enemy.color, PERF.particleMultiplier);
              game.screenShake = 20;
              enemy.barrageCooldown = enemy.isEnraged ? 300 : 420; // Faster when enraged (was 420:540)
            }
          }

          // PHASE 2 ATTACK: CHARGE BEAM - Telegraphed laser attack
          if (enemy.isFinalBoss) {
            if (enemy.beamCooldown === undefined) enemy.beamCooldown = 600; // 10 seconds initial
            if (enemy.beamCharging === undefined) enemy.beamCharging = false;
            if (enemy.beamChargeTime === undefined) enemy.beamChargeTime = 0;

            enemy.beamCooldown -= 1;

            // Start charging beam
            if (enemy.beamCooldown <= 0 && !enemy.beamCharging) {
              enemy.beamCharging = true;
              enemy.beamChargeTime = 120; // 2 second charge
              enemy.beamTargetX = player.x;
              enemy.beamTargetY = player.y;

              // Warning particles
              for (let w = 0; w < 20; w++) {
                const wAngle = Math.random() * Math.PI * 2;
                game.particles.push({
                  x: enemy.x + Math.cos(wAngle) * 50,
                  y: enemy.y + Math.sin(wAngle) * 50,
                  vx: -Math.cos(wAngle) * 2,
                  vy: -Math.sin(wAngle) * 2,
                  size: 6,
                  color: '#FF0000',
                  life: 40,
                  maxLife: 40,
                  type: 'magic'
                });
              }
            }

            // Charging beam visual
            if (enemy.beamCharging && enemy.beamChargeTime > 0) {
              enemy.beamChargeTime -= 1;

              // Draw targeting line (red danger indicator)
              const beamAngle = Math.atan2(enemy.beamTargetY - enemy.y, enemy.beamTargetX - enemy.x);
              for (let b = 0; b < 10; b++) {
                const beamDist = 50 + b * 40;
                game.particles.push({
                  x: enemy.x + Math.cos(beamAngle) * beamDist,
                  y: enemy.y + Math.sin(beamAngle) * beamDist,
                  vx: 0,
                  vy: 0,
                  size: 8 - b * 0.5,
                  color: enemy.beamChargeTime > 60 ? '#FF6666' : '#FF0000',
                  life: 3,
                  maxLife: 3,
                  type: 'flash'
                });
              }

              // Fire beam when charge complete
              if (enemy.beamChargeTime <= 0) {
                enemy.beamCharging = false;
                enemy.beamCooldown = enemy.isEnraged ? 360 : 480; // 6-8 seconds

                // Fire rapid projectiles in a line
                const beamAngle = Math.atan2(enemy.beamTargetY - enemy.y, enemy.beamTargetX - enemy.x);
                const beamCount = enemy.isEnraged ? 20 : 12;
                for (let p = 0; p < beamCount; p++) {
                  setTimeout(() => {
                    if (!game || !game.enemyProjectiles) return;
                    const speed = 12;
                    const spread = (Math.random() - 0.5) * 0.15; // Slight spread
                    game.enemyProjectiles.push({
                      x: enemy.x,
                      y: enemy.y,
                      vx: Math.cos(beamAngle + spread) * speed,
                      vy: Math.sin(beamAngle + spread) * speed,
                      size: 15,
                      damage: 50,
                      color: '#FF0000',
                      width: 15,
                      height: 15
                    });
                  }, p * 50); // Stagger projectiles
                }

                // Massive beam effect
                createExplosion(game, enemy.x, enemy.y, 100, '#FF0000', PERF.particleMultiplier);
                game.screenShake = 25;
              }
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
              createExplosion(game, enemy.x, enemy.y, 200, enemy.color, PERF.particleMultiplier);
              createTeleportEffect(game, enemy.x, enemy.y, enemy.color, PERF.particleMultiplier);
              game.screenShake = 50; // Massive shake (was 40)

              // Flash effect with particles
              for (let i = 0; i < 150; i++) { // More particles (was 100)
                createParticles(game, enemy.x, enemy.y, '#FFFFFF', 50, PERF.particleMultiplier);
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

      // Move enemies based on their type (unique movement behaviors)
      if (dist > 0) {
        // CIRCLER - Uses orbit velocity instead of direct chase
        if (enemy.type === 'circler' && enemy.orbitVx !== undefined) {
          enemy.x += enemy.orbitVx * combinedSpeedMod;
          enemy.y += enemy.orbitVy * combinedSpeedMod;
        }
        // CHARGER - Fast charge or normal walk
        else if (enemy.type === 'charger') {
          if (enemy.isCharging && enemy.chargeDx !== undefined) {
            // Charging at high speed in locked direction
            const chargeSpeed = (enemy.chargeSpeed || 8) * combinedSpeedMod;
            enemy.x += enemy.chargeDx * chargeSpeed;
            enemy.y += enemy.chargeDy * chargeSpeed;
          } else {
            // Normal slow approach
            enemy.x += (dx / dist) * moveSpeed * 0.5;
            enemy.y += (dy / dist) * moveSpeed * 0.5;
          }
        }
        // RETREATER - Back away if too close
        else if (enemy.type === 'retreater') {
          if (enemy.retreating) {
            // Move away from player
            enemy.x -= (dx / dist) * moveSpeed * 1.2;
            enemy.y -= (dy / dist) * moveSpeed * 1.2;
          } else {
            // Slowly approach to preferred distance
            enemy.x += (dx / dist) * moveSpeed * 0.6;
            enemy.y += (dy / dist) * moveSpeed * 0.6;
          }
        }
        // ZIGZAGGER - Erratic side-to-side movement while advancing
        else if (enemy.type === 'zigzagger') {
          // Calculate perpendicular direction for zigzag
          const perpX = -dy / dist;
          const perpY = dx / dist;
          const zigzagStrength = 0.7;
          const zigDir = enemy.zigzagDirection || 1;

          // Move toward player with zigzag offset
          enemy.x += (dx / dist) * moveSpeed + perpX * moveSpeed * zigzagStrength * zigDir;
          enemy.y += (dy / dist) * moveSpeed + perpY * moveSpeed * zigzagStrength * zigDir;
        }
        // DEFAULT - Normal chase behavior
        else {
          enemy.x += (dx / dist) * moveSpeed;
          enemy.y += (dy / dist) * moveSpeed;
        }
      }

      if (checkCollision(enemy, player)) {
        // Only apply damage if not invincible
        if (player.invincibilityTimer <= 0) {
          player.health -= enemy.damage;
          player.invincibilityTimer = 60; // 1 second of invincibility at 60fps
          createParticles(game, player.x, player.y, '#EF4444', 12, PERF.particleMultiplier);
          createDamageNumber(game, player.x, player.y, enemy.damage, 'player', isMobile);

          // Juicy Arcade: Player damage feedback
          flashPlayerDamage(game);
          if (!isMobile) {
            hitStopPlayerDamage(game);
          }
          triggerScreenShake(game, 12, 2);

          if (enemy.type === 'angry_client') {
            applyPlayerExplosionDamage(game, enemy.x, enemy.y, enemy.explosionRadius, enemy.explosionDamage);
            createExplosion(game, enemy.x, enemy.y, enemy.explosionRadius, '#EAB308', PERF.particleMultiplier);
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
        createParticles(game, orb.x, orb.y, orb.color || '#FBBF24', 12, PERF.particleMultiplier);
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
          createParticles(game, pickup.x, pickup.y, pickup.color || '#FF0000', 8, PERF.particleMultiplier);
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
            createParticles(game, player.x, player.y, '#EF4444', 20, PERF.particleMultiplier);
            createDamageNumber(game, player.x, player.y, pickup.explosionDamage, 'player', isMobile);

            // Juicy Arcade: Player damage feedback
            flashPlayerDamage(game);
            if (!isMobile) {
              hitStopPlayerDamage(game);
            }
          }

          // Massive explosion effect - Juicy Arcade enhanced
          if (!isMobile) {
            createJuicyExplosion(game, pickup.x, pickup.y, pickup.explosionRadius, pickup.color || '#FF0000');
          } else {
            createExplosion(game, pickup.x, pickup.y, pickup.explosionRadius, pickup.color || '#FF0000', PERF.particleMultiplier);
          }
          createTeleportEffect(game, pickup.x, pickup.y, pickup.color || '#FF0000', PERF.particleMultiplier);
          triggerScreenShake(game, 25, 4);
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
            createParticles(game, orb.x, orb.y, orb.color || '#FBBF24', 8, PERF.particleMultiplier);
          });
          xpOrbs.length = 0; // Clear all XP orbs
          createParticles(game, pickup.x, pickup.y, '#3B82F6', 25, PERF.particleMultiplier);
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
            createParticles(game, enemy.x, enemy.y, '#EF4444', 15, PERF.particleMultiplier);
          });
          createExplosion(game, pickup.x, pickup.y, 300, '#EF4444', PERF.particleMultiplier);
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
        createParticles(game, sombrero.x, sombrero.y, sombrero.pickupType === 'magnet' ? '#3B82F6' : '#EF4444', 30, PERF.particleMultiplier);
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

    // Update damage numbers (floating combat text)
    const damageNumbers = game.damageNumbers;
    if (damageNumbers) {
      for (let i = damageNumbers.length - 1; i >= 0; i--) {
        const dn = damageNumbers[i];
        dn.x += dn.vx;
        dn.y += dn.vy;
        dn.vy += 0.1; // Gravity - makes numbers fall
        dn.life -= 1;
        if (dn.life <= 0) {
          damageNumbers.splice(i, 1);
        }
      }
      // Cap damage numbers to prevent overflow
      const maxDamageNumbers = PERF.maxParticles < 200 ? 15 : 30;
      if (damageNumbers.length > maxDamageNumbers) {
        damageNumbers.splice(0, damageNumbers.length - maxDamageNumbers);
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
            <img src="/images/images.png" className="w-10 h-10 md:w-12 md:h-12 rounded-full" alt="Unosquare Logo" />
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

            {/* Ability Button with Dash Bar above */}
            <div className={`absolute z-20 flex flex-col items-center gap-2 ${isMobile && isLandscape ? 'bottom-6 right-6' : 'bottom-20 md:bottom-6 right-6'}`}>
              {/* Dash/Stamina Bar - above ability button */}
              <div className="w-20 md:w-24 h-5 pixel-bar border-cyan-500 relative overflow-hidden rounded-lg">
                <div
                  className={`pixel-bar-fill h-full transition-all duration-100 ${
                    stats.dashCooldown === 0
                      ? 'bg-gradient-to-r from-cyan-400 to-cyan-300 animate-pulse'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0,
                      stats.maxDashCooldown > 0
                        ? ((stats.maxDashCooldown - stats.dashCooldown) / stats.maxDashCooldown) * 100
                        : 100
                    ))}%`
                  }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[9px] font-bold text-white drop-shadow-lg pixel-art">
                  {stats.dashCooldown === 0 ? '⚡ DASH' : `${Math.ceil(stats.dashCooldown / 60)}s`}
                </span>
              </div>

              {/* Ability Button with Cooldown Indicator */}
              <div className="relative">
                {/* Cooldown ring */}
                {!abilityReady && abilityCooldown.duration > 0 && (
                  <svg
                    className="absolute inset-0 w-16 h-16 md:w-20 md:h-20 -rotate-90 pointer-events-none"
                    viewBox="0 0 100 100"
                  >
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#374151"
                      strokeWidth="8"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${2 * Math.PI * 45}`}
                      strokeDashoffset={`${2 * Math.PI * 45 * (1 - abilityCooldown.remaining / abilityCooldown.duration)}`}
                      style={{ transition: 'stroke-dashoffset 0.1s linear' }}
                    />
                  </svg>
                )}
                <button
                  onClick={useAbility}
                  disabled={!abilityReady}
                  className={`relative w-16 h-16 md:w-20 md:h-20 rounded-full border-4 flex flex-col items-center justify-center transition-all ${
                    abilityReady
                      ? 'bg-gradient-to-br from-purple-600 to-pink-600 border-purple-400 hover:scale-110 cursor-pointer shadow-lg shadow-purple-500/50 animate-pulse'
                      : 'bg-gray-700 border-gray-600 cursor-not-allowed'
                  }`}
                >
                  <span className="text-2xl md:text-3xl">{selectedCharacter && CHARACTER_CLASSES[selectedCharacter].ability.icon}</span>
                  {/* Cooldown timer text */}
                  {!abilityReady && abilityCooldown.remaining > 0 && (
                    <span className="absolute text-xs md:text-sm font-bold text-white bg-black/60 px-1 rounded -bottom-1">
                      {Math.ceil(abilityCooldown.remaining / 1000)}s
                    </span>
                  )}
                </button>
              </div>
            </div>

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
                <img src="/images/images.png" className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4" style={{ imageRendering: 'pixelated' }} alt="Unosquare Logo" />
                <h2 className="text-xl md:text-2xl font-bold text-white pixel-art">Unosquare Office Survivor</h2>
                <p className="text-cyan-200 text-[10px] md:text-[12px] pixel-art">
                  Survive the corporate chaos for <span className="font-bold text-yellow-400">10 minutes</span>!
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[8px] md:text-[10px] text-gray-300 mb-2 text-left pixel-art">
                      Username <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => {
                        const newUsername = e.target.value;
                        setUsername(newUsername);
                        localStorage.setItem('officeGame_username', newUsername);
                      }}
                      placeholder="Enter your name to play..."
                      maxLength={20}
                      className={`w-full px-4 py-3 pixel-box text-white placeholder-gray-500 focus:outline-none text-[10px] md:text-[12px] ${
                        username.trim() ? 'border-cyan-500 focus:border-cyan-400' : 'border-red-500 focus:border-red-400'
                      }`}
                    />
                    {!username.trim() && (
                      <p className="text-red-400 text-[8px] mt-1 pixel-art">Username is required to start the game</p>
                    )}
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

              {!username.trim() && (
                <div className="col-span-full text-center mb-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
                  <p className="text-red-400 text-[10px] md:text-[12px] pixel-art">Please enter a username to select a character</p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                {Object.entries(CHARACTER_CLASSES).map(([key, charClass]) => (
                  <button
                    key={key}
                    disabled={!username.trim()}
                    onClick={() => {
                      if (!username.trim()) return;
                      const charKey = key as keyof typeof CHARACTER_CLASSES;
                      setSelectedCharacter(charKey);
                      startGame(charKey);
                    }}
                    className={`p-4 md:p-6 pixel-box transition-all text-left ${
                      username.trim()
                        ? 'hover:scale-105 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed grayscale'
                    }`}
                    style={{ borderColor: username.trim() ? charClass.color : '#666' }}
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
                      {selectedCharacter === 'warrior' && choice.levels[choice.currentLevel].descKnight
                        ? choice.levels[choice.currentLevel].descKnight
                        : choice.levels[choice.currentLevel].desc}
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
                      <img src="/images/bg,f8f8f8-flat,750x,075,f-pad,750x1000,f8f8f8.png" alt="Magnet" className="w-5 h-7 object-contain" />
                      <div>
                        <span className="font-bold text-green-400">Magnet:</span> Collect all XP around you
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <img src="/images/sobrero.png" alt="Bomb" className="w-6 h-5 object-contain" />
                      <div>
                        <span className="font-bold text-yellow-400">Bomb:</span> Deal massive damage to all enemies
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
