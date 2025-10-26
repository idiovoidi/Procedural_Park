// Game Configuration Constants
export const GAME_CONFIG = {
  // Creature spawning
  CREATURE_COUNT: 60,
  WORLD_SEED: 1337,

  // Distance and detection
  MAX_CREATURE_DISTANCE: 25,
  CREATURE_INFO_DISTANCE: 25,

  // Camera and movement
  CAMERA_SPEED_DEFAULT: 0.025,
  CAMERA_SPEED_VERY_SLOW: 0.015,
  CAMERA_SPEED_NORMAL: 0.035,
  CAMERA_SPEED_FAST: 0.05,

  // Timing
  MAX_FRAME_TIME_MS: 50,
  LOADING_SCREEN_DELAY_MS: 1000,

  // Photo scoring thresholds
  PHOTO_SCORE_EXCELLENT: 80,
  PHOTO_SCORE_GREAT: 60,
  PHOTO_SCORE_GOOD: 40,

  // Audio volumes
  AUDIO_PHOTO_SCORE: 0.8,
  AUDIO_UI_CLICK: 0.5,
  AUDIO_UI_HOVER: 0.3,
  AUDIO_CREATURE_BASE: 0.4,
  AUDIO_CREATURE_MIN: 0.1,
  AUDIO_FOREST_AMBIENT: 0.6,
  AUDIO_WIND_GENTLE: 0.4,
  AUDIO_BIRDS_DISTANT: 0.3,

  // Mini-map
  MINIMAP_SIZE: 150,
  MINIMAP_BOUNDS: { minX: -60, maxX: 60, minZ: -60, maxZ: 60 },
  MINIMAP_PATH_STEP: 0.02,
  MINIMAP_BIOME_SAMPLE_STEP: 10,
  MINIMAP_BIOME_SAMPLE_RANGE: { min: -50, max: 50 },

  // UI
  TOAST_DURATION_MS: 800,
} as const

// Biome colors for mini-map
export const BIOME_COLORS: Record<string, string> = {
  forest: '#2d5016',
  meadow: '#4a7c59',
  rocky: '#666666',
  wetland: '#1e3a8a',
  crystal_cave: '#7c3aed',
  default: '#333333',
}
