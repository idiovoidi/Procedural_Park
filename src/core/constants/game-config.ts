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

    /** Sim ticks spent as a hatchling, then as a juvenile, before becoming an adult. */
    AGE_STAGE_TICKS: { hatchling: 600, juvenile: 1800 },

    /** Stats (0..100) a newly owned creature starts with. */
    STARTING_STATS: { fullness: 80, happiness: 60, trust: 50 },

    /** Happiness (0..1) maps linearly onto this output multiplier range. */
    HAPPINESS_MULTIPLIER: { min: 0.25, max: 1.25 },

    /** Resource units a medium, common, adult creature yields per cycle at 75 happiness (1x). */
    BASE_OUTPUT_PER_CYCLE: {
      terrestrial: 6,
      aerial: 5,
      aquatic: 5,
      ethereal: 3,
      crystalline: 3,
    },

    /** Food servings a medium creature eats per feeding cycle at 100% diet efficiency. */
    BASE_FOOD_PER_CYCLE: 1,

    /** Market prices and demand (GDD 7.2, 7.7; decision Q7: base price with demand saturation). */
    MARKET: {
      /** Coins per unit at full demand. */
      BASE_UNIT_PRICE: { fibre: 4, down: 5, brine: 6, essence: 12, shards: 14 },
      /** Demand lost for every unit sold (demand starts at 1). */
      DEMAND_DROP_PER_UNIT: 0.01,
      /** Demand never falls below this, so a flooded market still pays something. */
      MIN_DEMAND: 0.25,
      /** Demand regained per economy tick while below 1. */
      DEMAND_RECOVERY_PER_TICK: 0.0005,

      /** Coins for a medium, common, adult creature with no extra parts. */
      CREATURE_BASE_VALUE: 40,
      /** Younger creatures sell for less. */
      CREATURE_AGE_FACTOR: { hatchling: 0.4, juvenile: 0.7, adult: 1 },
      /** Each optional body part (wings, horns, tails ...) adds this, up to the maximum. */
      CREATURE_PART_PREMIUM: 0.04,
      CREATURE_MAX_PART_PREMIUM: 0.5,
    },

    /** Build mode: what each piece costs, and how aiming works. */
    BUILD: {
      COSTS: {
        fence: 3,
        tallFence: 6,
        gate: 10,
        trough: 20,
        bin: 25,
        toy: 15,
        shelter: 20,
        plant: 10,
        roof: 8,
      },
      /** Share of a piece's cost returned when it is removed. */
      REFUND_FRACTION: 0.5,
      /** How far ahead (metres) the player can aim a placement. */
      MAX_REACH_M: 14,
      /** Aiming closer than this fraction of a cell to an edge selects that edge for removal. */
      EDGE_PICK_FRACTION: 0.3,
    },

    /** Collector bins: how much output a pen can store before the rest is wasted. */
    PRODUCTION: {
      /** Units (all resource types combined) one collector bin holds. */
      BIN_CAPACITY_UNITS: 100,
    },

    /** Care loop: feeding, hunger and mood. All values per feeding cycle unless noted. */
    CARE: {
      /** Fullness lost every feeding cycle. */
      FULLNESS_DECAY_PER_CYCLE: 20,
      /** Fullness gained from a complete meal (scaled down for a partial one). */
      FULLNESS_PER_MEAL: 25,
      /** A creature only eats when its fullness has dropped to this or below. */
      EAT_AT_OR_BELOW: 85,
      /** Servings one trough holds. */
      TROUGH_CAPACITY_SERVINGS: 20,

      /** Happiness moves this far toward its target each cycle. */
      HAPPINESS_DRIFT_PER_CYCLE: 10,
      /** Target happiness for a creature with no closed pen (it is not looked after). */
      UNPENNED_HAPPINESS_TARGET: 30,
      /** Below this fullness the happiness target is halved. */
      HUNGRY_BELOW: 20,
      /** Extra happiness from a meal, as a share of the food's happiness x diet efficiency. */
      MEAL_HAPPINESS_SCALE: 0.3,
      /** Trust gained from a meal, as a share of the food's trust bonus x diet efficiency. */
      MEAL_TRUST_SCALE: 0.5,
    },

    /** Floor for diet efficiency when computing food use, so a bad match is costly but finite. */
    MIN_DIET_EFFICIENCY: 0.1,

    /**
     * Rarer creatures are pickier: a food's effectiveness is raised to the power
     * 1 + this * tierIndex, so a mismatch hurts more as rarity rises while a perfect
     * match (1.0) is unaffected (GDD 6.4).
     */
    DIET_PICKINESS_PER_TIER: 0.25,

    /** Pen floor space (square metres) each creature needs, by size. Huge is 8x tiny. */
    HABITAT_AREA_M2: { tiny: 4, small: 6, medium: 10, large: 20, huge: 32 },
  },

  /** Hub build grid and pen quality tuning (GDD section 5.2). */
  PARK: {
    /** Edge length of one build-grid cell in metres. */
    CELL_SIZE_M: 2,
    /** Build zone at the start, in inclusive cell coordinates (grows by purchase). */
    INITIAL_BOUNDS: { minX: -6, minZ: -6, maxX: 5, maxZ: 5 },

    /** Share of a pen's cells that must be water for a water-loving creature to be content. */
    WATER_FRACTION_REQUIRED: 0.15,
    /** Enrichment props (toys, shelters, plants) wanted per creature, by enrichment need. */
    ENRICHMENT_PROPS_PER_CREATURE: { low: 0, medium: 0.5, high: 1 },
    /** Score when the pen's enclosure falls 0, 1 or 2 levels short of what a creature needs. */
    ENCLOSURE_SHORTFALL_SCORE: [1, 0.4, 0],

    /** Weights of each requirement in the overall quality score (sum to 1). */
    QUALITY_WEIGHTS: {
      space: 0.2,
      water: 0.2,
      enclosure: 0.2,
      enrichment: 0.1,
      biome: 0.2,
      company: 0.1,
    },
    /** Score at or above which a requirement shows green / amber (below amber is red). */
    STATUS_THRESHOLDS: { good: 0.9, warn: 0.5 },
  },
} as const
