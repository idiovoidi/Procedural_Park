# State Machine Diagram

## State Transition Flow

```
                    ┌─────────┐
                    │ LOADING │
                    └────┬────┘
                         │
                    ┌────┴────┐
                    │         │
                    ▼         ▼
              ┌──────┐    ┌─────────┐
              │ MENU │◄───┤ PLAYING │
              └──┬───┘    └────┬────┘
                 │             │
                 │        ┌────┼────┬────────┬─────────┐
                 │        │    │    │        │         │
                 │        ▼    ▼    ▼        ▼         ▼
                 │    ┌───────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
                 │    │PAUSED │ │GALLERY │ │SETTINGS │ │GAME OVER │
                 │    └───┬───┘ └────┬───┘ └────┬────┘ └────┬─────┘
                 │        │          │          │            │
                 │        └──────────┴──────────┴────────────┘
                 │                   │
                 │                   ▼
                 │            ┌────────────┐
                 └───────────►│PHOTO MODE  │
                              └────────────┘
                                     │
                                     ▼
                              ┌─────────────────────┐
                              │MULTIPLAYER          │
                              │CONNECTING           │
                              └──────┬──────────────┘
                                     │
                                     ▼
                              ┌─────────────────────┐
                              │MULTIPLAYER          │
                              │CONNECTED            │
                              └─────────────────────┘
```

## State Details

### Loading State
**Purpose:** Initial game loading and asset initialization

**Characteristics:**
- Game loop: Paused
- Audio: Muted
- Input: Disabled
- Camera: Disabled

**Can transition to:**
- `menu` - After loading complete
- `playing` - Direct to game (skip menu)

---

### Menu State
**Purpose:** Main menu and game start screen

**Characteristics:**
- Game loop: Paused
- Audio: Playing (menu music)
- Input: Enabled (menu navigation)
- Camera: Disabled

**Can transition to:**
- `playing` - Start game
- `settings` - Open settings
- `multiplayer_connecting` - Join multiplayer

---

### Playing State
**Purpose:** Active gameplay

**Characteristics:**
- Game loop: Running
- Audio: Playing (full audio)
- Input: Enabled (all controls)
- Camera: Enabled (movement)
- Photos: Enabled

**Can transition to:**
- `paused` - Pause game
- `photo_mode` - Enter photo mode
- `gallery` - View photos
- `settings` - Open settings
- `game_over` - End game

---

### Paused State
**Purpose:** Game paused

**Characteristics:**
- Game loop: Paused
- Audio: Muted
- Input: Enabled (menu only)
- Camera: Disabled

**Can transition to:**
- `playing` - Resume game
- `menu` - Return to menu
- `settings` - Open settings

---

### Photo Mode State
**Purpose:** Taking photos with enhanced controls

**Characteristics:**
- Game loop: Paused (or slow-mo)
- Audio: Playing
- Input: Enabled (photo controls)
- Camera: Enabled (free look)
- Photos: Enabled

**Can transition to:**
- `playing` - Exit photo mode

---

### Gallery State
**Purpose:** Viewing captured photos

**Characteristics:**
- Game loop: Paused
- Audio: Playing
- Input: Enabled (gallery navigation)
- Camera: Disabled

**Can transition to:**
- `playing` - Return to game
- `paused` - Return to pause menu

---

### Settings State
**Purpose:** Game configuration

**Characteristics:**
- Game loop: Paused
- Audio: Playing
- Input: Enabled (settings controls)
- Camera: Disabled

**Can transition to:**
- `playing` - Return to game
- `paused` - Return to pause menu
- `menu` - Return to main menu

---

### Multiplayer Connecting State
**Purpose:** Establishing peer connection

**Characteristics:**
- Game loop: Paused
- Audio: Playing
- Input: Enabled (cancel connection)
- Camera: Disabled

**Can transition to:**
- `multiplayer_connected` - Connection successful
- `menu` - Cancel connection
- `playing` - Connection failed, continue solo

---

### Multiplayer Connected State
**Purpose:** Playing with peer

**Characteristics:**
- Game loop: Running
- Audio: Playing
- Input: Enabled (all controls)
- Camera: Enabled
- Photos: Enabled

**Can transition to:**
- `playing` - Peer disconnected
- `paused` - Pause game

---

### Game Over State
**Purpose:** End game screen

**Characteristics:**
- Game loop: Paused
- Audio: Playing (end music)
- Input: Enabled (menu navigation)
- Camera: Disabled

**Can transition to:**
- `menu` - Return to menu
- `playing` - Restart game

---

## State Groups

### Active States (Game Running)
- `playing`
- `multiplayer_connected`

### Paused States (Game Frozen)
- `loading`
- `menu`
- `paused`
- `photo_mode`
- `gallery`
- `settings`
- `multiplayer_connecting`
- `game_over`

### Interactive States (Input Allowed)
- `menu`
- `playing`
- `paused`
- `photo_mode`
- `gallery`
- `settings`
- `multiplayer_connecting`
- `multiplayer_connected`
- `game_over`

### Camera Active States
- `playing`
- `photo_mode`
- `multiplayer_connected`

### Photo Capture States
- `playing`
- `photo_mode`
- `multiplayer_connected`

## Common Transition Patterns

### Pause/Resume
```
playing ⇄ paused
```

### Open/Close Gallery
```
playing → gallery → playing
paused → gallery → paused
```

### Open/Close Settings
```
playing → settings → playing
paused → settings → paused
menu → settings → menu
```

### Multiplayer Flow
```
menu → multiplayer_connecting → multiplayer_connected → playing
```

### Game Restart
```
game_over → menu → playing
game_over → playing (direct restart)
```

## State Machine Rules

1. **No circular transitions** - States cannot transition to themselves
2. **Validated transitions** - Only predefined transitions are allowed
3. **Force override** - Can bypass validation with force flag
4. **History tracking** - All transitions are logged
5. **Callback execution** - onExit → transition → onEnter
6. **Configuration inheritance** - Each state has predefined behavior

## Implementation Notes

- State transitions are synchronous
- Callbacks execute immediately during transition
- Invalid transitions log errors but don't throw
- State machine is lightweight (~0.01ms per transition)
- History can be cleared to save memory
- Custom transitions can be added at runtime
