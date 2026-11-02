// Game Configuration Constants
export const GAME_CONFIG = {
  // Creature spawning
  CREATURE_COUNT: 60,
  WORLD_SEED: 1337,

  // Distance and detection
  MAX_CREATURE_DISTANCE: 25,
  CREATURE_INFO_DISTANCE: 25,
  STORE_PROXIMITY_M: 10,
  FEED_CREATURE_RANGE_M: 15,

  // Camera and movement
  CAMERA_SPEED_DEFAULT: 0.025,
  CAMERA_SPEED_VERY_SLOW: 0.015,
  CAMERA_SPEED_NORMAL: 0.035,
  CAMERA_SPEED_FAST: 0.05,

  // Timing
  MAX_FRAME_TIME_MS: 50,
  LOADING_SCREEN_DELAY_MS: 1000,
  AUTO_SAVE_INTERVAL_MS: 120_000,

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

  // Economy
  STARTING_CURRENCY: 100,

  /**
   * Park economy tuning. Starting values from GDD sections 5-7; expect to retune after
   * playtesting. Everything the simulation multiplies or counts lives here so balance
   * changes never touch logic.
   */
  ECONOMY: {
    // Simulation clock: the economy advances in fixed steps, independent of frame rate.
    TICK_SECONDS: 1,
    /** Most ticks one rendered frame may run; extra time is dropped, not queued. */
    MAX_STEPS_PER_FRAME: 10,
    /** Fastest allowed time scale (1 = real time, 0 = paused). */
    MAX_SPEED: 8,
    /** Longest gap simulated when loading a save (GDD 13.2, decision Q6). */
    OFFLINE_CAP_SECONDS: 8 * 60 * 60,

    /** Ticks per production cycle: a creature yields output once per cycle. */
    PRODUCTION_CYCLE_TICKS: 60,
    /** Ticks per feeding cycle: hunger and food use advance once per cycle. */
    FEED_CYCLE_TICKS: 60,

    /** Output and food scale with body size. */
    SIZE_MULTIPLIER: { tiny: 0.5, small: 0.75, medium: 1, large: 1.5, huge: 2 },

    /** Value multiplier by rarity tier; `min` is the lowest rarity (0..1) in the tier. */
    RARITY_TIERS: [
      { name: 'common', min: 0, multiplier: 1 },
      { name: 'uncommon', min: 0.4, multiplier: 1.6 },
      { name: 'rare', min: 0.6, multiplier: 2.5 },
      { name: 'epic', min: 0.8, multiplier: 4 },
      { name: 'legendary', min: 0.92, multiplier: 7 },
    ],

    /** Output multiplier by growth stage (no lifespan: adults stay adults, decision Q4). */
    AGE_MULTIPLIER: { hatchling: 0.25, juvenile: 0.6, adult: 1 },

    /** Happiness (0..1) maps linearly onto this output multiplier range. */
    HAPPINESS_MULTIPLIER: { min: 0.25, max: 1.25 },

    /** Resource units a medium, common, adult, neutral-happiness creature yields per cycle. */
    BASE_OUTPUT_PER_CYCLE: {
      terrestrial: 6,
      aerial: 5,
      aquatic: 5,
      ethereal: 3,
      crystalline: 3,
    },

    /** Food servings a medium creature eats per feeding cycle at 100% diet efficiency. */
    BASE_FOOD_PER_CYCLE: 1,
  },
} as const
