# Implementation Plan

- [x] 1. Set up project structure and install dependencies





  - Create folder structure: `src/multiplayer/common/`, `src/multiplayer/webrtc/`, `src/multiplayer/colyseus/`
  - Install Simple Peer library: `npm install simple-peer @types/simple-peer`
  - Install Colyseus client: `npm install colyseus.js`
  - Add environment variable support for provider selection
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [-] 2. Implement common multiplayer interfaces and types



  - Create `IMultiplayerProvider` interface in `src/multiplayer/common/IMultiplayerProvider.ts`
  - Define `GameState` and `GameEvent` types in `src/multiplayer/common/types.ts`
  - Create shared configuration types and constants
  - _Requirements: 3.1, 3.2, 5.1, 5.2_

- [ ] 3. Implement shared PeerAvatar component

  - Create `PeerAvatar` class in `src/multiplayer/common/PeerAvatar.ts`
  - Implement avatar mesh creation with distinct visual style (glowing outline, different color)
  - Add camera direction indicator (cone or arrow showing where peer is looking)
  - Implement name label rendering using THREE.Sprite
  - Add position interpolation for smooth movement
  - _Requirements: 3.3, 3.4, 3.5_

- [ ] 4. Implement shared ConnectionUI component
  - Create `ConnectionUI` class in `src/multiplayer/common/ConnectionUI.ts`
  - Build modal overlay with connection options (Create/Join session)
  - Add status indicator for connection state
  - Implement notification system for game events
  - Add latency display
  - Create provider-specific UI panels (WebRTC signal data vs Colyseus room ID)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.3_

- [ ] 5. Implement WebRTC provider
- [ ] 5.1 Create WebRTCPeer wrapper
  - Create `WebRTCPeer` class in `src/multiplayer/webrtc/WebRTCPeer.ts`
  - Configure Simple Peer with Google STUN servers
  - Implement host initialization (initiator: true)
  - Implement guest initialization (initiator: false)
  - Set up signal event handlers for offer/answer exchange
  - Implement data channel event handlers (connect, data, close, error)
  - Add connection timeout handling (30 seconds)
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.3, 6.1, 6.2, 6.6, 6.7_

- [ ] 5.2 Create StateSync for manual state synchronization
  - Create `StateSync` class in `src/multiplayer/webrtc/StateSync.ts`
  - Implement binary serialization for GameState (using DataView)
  - Implement binary deserialization for GameState
  - Add update rate throttling (10 Hz default)
  - Implement state interpolation for smooth movement
  - Add event serialization/deserialization
  - Implement delta compression (only send changed values)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.4, 5.5, 7.1, 7.2, 7.3_

- [ ] 5.3 Create WebRTCProvider implementation
  - Create `WebRTCProvider` class in `src/multiplayer/webrtc/WebRTCProvider.ts`
  - Implement IMultiplayerProvider interface
  - Integrate WebRTCPeer and StateSync
  - Implement createSession() method (host flow)
  - Implement joinSession() method (guest flow)
  - Add disconnect() method with cleanup
  - Implement update() loop for state synchronization
  - Add sendGameState() method
  - Implement error handling and recovery
  - Add latency measurement (ping/pong)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.5, 7.4_

- [ ] 6. Implement Colyseus provider
- [ ] 6.1 Create Colyseus server
  - Create server folder: `src/multiplayer/colyseus/server/`
  - Set up Express server with Colyseus in `src/multiplayer/colyseus/server/index.ts`
  - Configure CORS for client origin
  - Add health check endpoint
  - Create package.json with server dependencies
  - Add server start script
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 6.2 Create Colyseus schema
  - Create `Player` schema class in `src/multiplayer/colyseus/schema/GameState.ts`
  - Add position fields (x, y, z) with @type decorators
  - Add rotation fields (rotX, rotY, rotZ) with @type decorators
  - Add cameraMode and rideProgress fields
  - Create `GameRoomState` schema with players MapSchema
  - _Requirements: 3.1, 3.2, 7.1_

- [ ] 6.3 Create GameRoom implementation
  - Create `GameRoom` class in `src/multiplayer/colyseus/server/GameRoom.ts`
  - Extend Colyseus Room with GameRoomState
  - Set maxClients to 2
  - Implement onCreate() to initialize room state
  - Implement onJoin() to add player to state
  - Implement onLeave() to remove player from state
  - Add onMessage() handler for game events
  - Implement automatic state synchronization
  - _Requirements: 3.1, 3.2, 4.1, 4.2, 5.1_

- [ ] 6.4 Create ColyseusProvider implementation
  - Create `ColyseusProvider` class in `src/multiplayer/colyseus/ColyseusProvider.ts`
  - Implement IMultiplayerProvider interface
  - Initialize Colyseus client with server URL
  - Implement createSession() to create new room
  - Implement joinSession() to join existing room by ID
  - Set up state change listeners
  - Implement disconnect() with room cleanup
  - Add update() method (minimal, Colyseus handles sync)
  - Implement sendGameState() to update room state
  - Add automatic reconnection handling
  - Implement latency measurement
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 7.4_

- [ ] 7. Integrate multiplayer into Game class
  - Add multiplayerProvider property to Game class
  - Add provider selection logic based on environment variable
  - Initialize WebRTCProvider or ColyseusProvider in constructor
  - Set up multiplayer callbacks (onConnected, onDisconnected, onPeerStateUpdate)
  - Add multiplayer update to game loop
  - Implement sendGameState() calls with current player state
  - Add peerAvatar management (create on connect, dispose on disconnect)
  - Update peerAvatar in game loop with received state
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 8. Add multiplayer UI to existing UI system
  - Add "Multiplayer" button to main menu in UIManager
  - Integrate ConnectionUI modal into existing UI
  - Add connection status indicator to HUD
  - Implement photo notification display when peer takes photo
  - Add keyboard shortcut for multiplayer menu (M key)
  - Style UI to match existing game aesthetic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3_

- [ ] 9. Implement game event synchronization
  - Add photo event transmission when player takes photo
  - Implement photo event handler to show peer notification
  - Add timestamp to events for ordering
  - Implement event queue for reliable delivery
  - Add creature interaction events (optional)
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 10. Add environment configuration
  - Create `.env.example` file with configuration options
  - Add VITE_USE_COLYSEUS flag (default: false)
  - Add VITE_COLYSEUS_SERVER URL configuration
  - Update README with configuration instructions
  - Add deployment instructions for both approaches
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 11. Testing and optimization
- [ ]* 11.1 Test WebRTC implementation
  - Test host session creation and signal data generation
  - Test guest joining with offer/answer exchange
  - Verify peer-to-peer connection establishment
  - Test state synchronization accuracy
  - Test disconnection handling
  - Test with simulated network latency
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2, 4.3_

- [ ]* 11.2 Test Colyseus implementation
  - Test room creation and room ID sharing
  - Test joining existing room
  - Verify automatic state synchronization
  - Test reconnection handling
  - Test server deployment
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2_

- [ ]* 11.3 Performance optimization
  - Measure and optimize bandwidth usage
  - Profile rendering performance with peer avatar
  - Optimize state update frequency
  - Test with multiple browser tabs
  - Verify smooth interpolation
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 11.4 Cross-browser testing
  - Test on Chrome
  - Test on Firefox
  - Test on Safari
  - Test on Edge
  - Verify WebRTC compatibility
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 12. Documentation
  - Create user guide for WebRTC connection process
  - Create user guide for Colyseus connection process
  - Document server deployment steps for Colyseus
  - Add troubleshooting section for common issues
  - Document environment variables and configuration
  - Add architecture diagrams to README
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 6.5_
