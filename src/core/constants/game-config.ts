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

    /**
     * Rarity tiers; `min` is the lowest rarity (0..1) in the tier. `multiplier` scales what a
     * creature sells for; `outputMultiplier` scales what it produces. Output is deliberately
     * gentler than value, so a rare creature is worth far more to sell without a single
     * legendary out-earning a whole ranch of ordinary ones.
     */
    RARITY_TIERS: [
      { name: 'common', min: 0, multiplier: 1, outputMultiplier: 1 },
      { name: 'uncommon', min: 0.4, multiplier: 1.6, outputMultiplier: 1.3 },
      { name: 'rare', min: 0.6, multiplier: 2.5, outputMultiplier: 1.7 },
      { name: 'epic', min: 0.8, multiplier: 4, outputMultiplier: 2.3 },
      { name: 'legendary', min: 0.92, multiplier: 7, outputMultiplier: 3 },
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
      /**
       * Coins per unit at full demand. Set so a well-kept common creature of every archetype
       * earns a similar margin over its own cheapest adequate food: fibre 3 vs a 10-coin berry,
       * down 5 vs berry at 70%, brine 9 vs fish, essence 12 vs berry at 50%, shards 30 vs a
       * 50-coin crystal. (See docs/BALANCE.md.)
       */
      BASE_UNIT_PRICE: { fibre: 3, down: 5, brine: 9, essence: 12, shards: 30 },
      /** Demand lost for every unit sold (demand starts at 1). */
      DEMAND_DROP_PER_UNIT: 0.005,
      /** Demand never falls below this, so a flooded market still pays something. */
      MIN_DEMAND: 0.25,
      /**
       * Share of the missing demand regained every economy tick. Recovery is proportional to
       * how far demand has fallen, so a flooded market bounces back faster than a slightly
       * dented one, and steady selling settles at a price instead of sinking to the floor.
       */
      DEMAND_RECOVERY_RATE: 0.008,

      /** Coins for a medium, common, adult creature with no extra parts. */
      CREATURE_BASE_VALUE: 40,
      /** Younger creatures sell for less. */
      CREATURE_AGE_FACTOR: { hatchling: 0.4, juvenile: 0.7, adult: 1 },
      /** Each optional body part (wings, horns, tails ...) adds this, up to the maximum. */
      CREATURE_PART_PREMIUM: 0.04,
      CREATURE_MAX_PART_PREMIUM: 0.5,
    },

    /** Contract Board (GDD 7.3): buyers who pay a premium for creatures with specific traits. */
    CONTRACTS: {
      BOARD_SLOTS: 4,
      /** Sim ticks a contract stays on the board before it is replaced. */
      DURATION_TICKS: 7200,
      /** Sim ticks before a fulfilled slot posts a new contract. */
      REPLACE_DELAY_TICKS: 120,
      /**
       * Reward = value of an ideal matching adult x SCALE x (BASE + PER_REQUIREMENT x requirements).
       * SCALE is large because a creature is worth far more as a producer than at market: a contract
       * has to beat what the bot loses by giving one up (see docs/BALANCE.md).
       */
      REWARD_SCALE: 8,
      REWARD_BASE: 1.15,
      REWARD_PER_REQUIREMENT: 0.35,
      /** How many requirements a contract has, by slot number (the last entry repeats). */
      REQUIREMENTS_BY_SLOT: [1, 2, 2, 3],
    },

    /** Breeding (GDD 6): pairing rules, costs, timers and the odds preview. */
    BREEDING: {
      /** Sim ticks an egg takes to hatch. */
      GESTATION_TICKS: 300,
      /** Sim ticks a parent must rest after a litter before breeding again. */
      COOLDOWN_TICKS: 900,
      /** A parent must be at least this happy (0..100) and trusting, and not starving. */
      MIN_HAPPINESS: 50,
      MIN_TRUST: 40,
      /** Parents may differ by at most this many size classes (tiny..huge). */
      MAX_SIZE_GAP: 1,
      /** Coins to start a breeding, multiplied by 1 + COST_PER_TIER x the parents' average rarity tier. */
      BASE_COST: 40,
      COST_PER_TIER: 0.5,
      /** Chance a hatchling mutates a little, and how strongly (see `mutate`). */
      /**
       * Rarity ratchet: when both parents are at least `RARITY_LIFT_MIN_PARENT` rarity, the child's
       * rarity gets `RARITY_LIFT` added to the parents' average, so a line of good parents climbs.
       */
      RARITY_LIFT: 0.03,
      RARITY_LIFT_MIN_PARENT: 0.3,
      MUTATION_CHANCE: 0.2,
      MUTATION_RATE: 0.12,
      /** How many example offspring the preview shows, and how many crossovers it samples for odds. */
      PREVIEW_CHILDREN: 3,
      PREVIEW_SAMPLES: 200,
      /** Stats a newborn starts with (0..100). */
      NEWBORN_STATS: { fullness: 70, happiness: 70, trust: 60 },
    },

    /** Codex: how species become known (GDD 9). */
    CODEX: {
      /** Photos of a wild species needed before its diet and habitat are revealed. */
      STUDY_PHOTOS_REQUIRED: 2,
    },

    /** Capturing wild creatures: trust from feeding, lures and the transport crate (GDD 10.2). */
    CAPTURE: {
      /** Trust (0..100) gained per feeding: the food's trust bonus x diet efficiency x this. */
      TRUST_FEED_SCALE: 2.5,
      /** How readily each temperament warms up to being fed. */
      TRUST_TEMPERAMENT_MULT: {
        shy: 0.6,
        curious: 1.2,
        playful: 1.2,
        aggressive: 0.5,
        territorial: 0.7,
      },
      /** Trust needed before a creature will enter a crate: base plus this per rarity tier. */
      TRUST_REQUIRED_BASE: 60,
      TRUST_REQUIRED_PER_TIER: 8,
      /** How close the player must be to crate a creature, in metres. */
      CAPTURE_RANGE_M: 10,
      /** Coins for one transport crate. */
      CRATE_COST: 25,
      LURE: {
        DURATION_S: 30,
        RADIUS_M: 12,
        /** Trust per second for a creature in range, before multipliers. */
        TRUST_PER_SEC: 1.2,
        /** Lures draw shy creatures best; aggressive ones barely respond. */
        TEMPERAMENT_MULT: { shy: 1.6, curious: 1.2, playful: 1, aggressive: 0.4, territorial: 0.6 },
        /** Metres per second a lured creature drifts toward the bait. */
        PULL_SPEED_M_S: 1.5,
      },
    },

    /** Build mode: what each piece costs, and how aiming works. */
    BUILD: {
      COSTS: {
        fence: 3,
        tallFence: 6,
        gate: 10,
        trough: 20,
        hopper: 45,
        bin: 25,
        collector: 80,
        silo: 120,
        valve: 150,
        farm: 150,
        den: 60,
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
      /** Units of each resource the player can carry without a silo. */
      INVENTORY_BASE_CAPACITY: 150,
      /** Extra units of each resource every resource silo adds (silos work park-wide). */
      SILO_CAPACITY: 500,
      /**
       * Auto-sell valve: while at least one valve stands, every production cycle sells a resource
       * as long as its price stays at or above `floor` x its base price. The player sets the floor.
       */
      AUTO_SELL: { DEFAULT_FLOOR: 0.7, MIN_FLOOR: 0.3, MAX_FLOOR: 1, FLOOR_STEP: 0.05 },
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
      /** Servings one feeder hopper holds; it tops the pen's troughs up every cycle. */
      HOPPER_CAPACITY_SERVINGS: 80,
      /**
       * Food farms: each farm grows `SERVINGS_PER_CYCLE` servings every feeding cycle of the
       * cheap staple its pen's residents like best (only these foods can be farmed; meat, crystal
       * and energy stay in the store). The servings go to the troughs, then the hoppers.
       */
      FARM: { FOODS: ['berry', 'fish'], SERVINGS_PER_CYCLE: 1.5, MIN_EFFICIENCY: 0.5 },

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
