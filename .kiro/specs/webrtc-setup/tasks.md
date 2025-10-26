# Implementation Plan

- [x] 1. Set up project structure and install dependencies
  - Create folder structure: `src/multiplayer/`
  - Install Simple Peer library: `npm install simple-peer @types/simple-peer`
  - Create types file with shared interfaces
  - _Requirements: 6.1, 6.2, 6.5_

- [x] 2. Implement StateSync for binary state serialization
  - Create `StateSync` class in `src/multiplayer/StateSync.ts`
  - Implement binary serialization for GameState using DataView
  - Implement binary deserialization for GameState
  - Add update rate throttling (10 Hz default)
  - Implement state interpolation buffer for smooth movement
  - Add event serialization/deserialization (photo events)
  - Implement message type enum (STATE_UPDATE, GAME_EVENT, PING, PONG)
  - _Requirements: 3.1, 3.2, 5.1, 5.4, 5.5, 7.1, 7.2, 7.3_

- [x] 3. Implement WebRTCPeer wrapper
  - Create `WebRTCPeer` class in `src/multiplayer/WebRTCPeer.ts`
  - Configure Simple Peer with Google STUN servers
  - Implement host initialization (initiator: true)
  - Implement guest initialization (initiator: false) with offer data
  - Set up signal event handlers for offer/answer exchange
  - Implement data channel event handlers (connect, data, close, error)
  - Add connection timeout handling (30 seconds)
  - Implement send() method for ArrayBuffer transmission
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 4.3, 6.1, 6.2, 6.6, 6.7_

- [x] 4. Implement PeerAvatar for 3D rendering

  - Create `PeerAvatar` class in `src/multiplayer/PeerAvatar.ts`
  - Implement avatar mesh creation with distinct visual style (glowing outline, different color)

  - Add camera direction indicator (cone or arrow showing where peer is looking)
  - Implement name label rendering using THREE.Sprite
  - Add position and rotation interpolation for smooth movement
  - Implement show/hide methods
  - Add proper disposal/cleanup of Three.js objects
  - _Requirements: 3.3, 3.4, 3.5_

- [x] 5. Implement ConnectionUI for user interface



  - Build modal overlay with connection options (Create/Join session)

  - Build modal overlay with connection options (Create/Join session)
  - Add "Create Session" button for host flow
  - Add "Join Session" button with text input for offer data
  - Implement copyable text fields for signal data (offer/answer)
  - Add status indicator for connection state (disconnected/connecting/connected/error)
  - Implement notification system for game events (photo taken)
  - Add latency display in status indicator
  - Add "Disconnect" button
  - Style UI to match existing game aesthetic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.2, 5.3_


- [x] 6. Implement WebRTCMultiplayer coordinator



  - Create `WebRTCMultiplayer` class in `src/multiplayer/WebRTCMultiplayer.ts`
  - Integrate WebRTCPeer, StateSync, PeerAvatar, and ConnectionUI
  - Implement createSession() method (host flow)
  - Implement joinSession() method (guest flow) with offer data parameter
  - Add disconnect() method with cleanup
  - Implement update() loop for state synchronization
  - Add sendGameState() method to serialize and send state
  - Add sendEvent() method for game events (photo taken)
  - Implement handleSignalData() to pass signal data to UI
  - Implement handleDataReceived() to deserialize and process messages
  - Add latency measurement using PING/PONG messages
  - Implement error handling and recovery
  - Set up event callbacks (onConnected, onDisconnected, onPeerStateUpdate, onGameEvent, onError)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.5, 7.4_


- [x] 7. Integrate multiplayer into Game class


  - Add multiplayer property to Game class
  - Initialize WebRTCMultiplayer in constructor with scene reference
  - Set up multiplayer callbacks (onConnected, onDisconnected, onPeerStateUpdate, onGameEvent, onError)
  - Add multiplayer update to game loop
  - Implement sendGameState() calls with current player state (position, rotation, camera mode, ride progress)
  - Hook photo system to send photo events when player takes photo
  - Add error handling for multiplayer errors
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1_





- [ ] 8. Add multiplayer UI to existing UI system
  - Add "Multiplayer" button to main menu in UIManager
  - Wire up button to show ConnectionUI modal
  - Add keyboard shortcut for multiplayer menu (M key)
  - Implement toast notification display when peer takes photo
  - Add connection status indicator to HUD (optional, shows latency when connected)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 5.2, 5.3_

- [ ]\* 9. Testing and validation
- [ ]\* 9.1 Test connection flow
  - Test host session creation and offer generation
  - Test guest joining with offer/answer exchange
  - Verify peer-to-peer connection establishment
  - Test connection timeout (30 seconds)
  - Test invalid signal data handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.3_

- [ ]\* 9.2 Test state synchronization
  - Verify bidirectional state updates
  - Test position and rotation synchronization
  - Verify avatar rendering and interpolation
  - Test photo event transmission
  - Measure latency and verify it's displayed
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5, 7.4_

- [ ]\* 9.3 Test disconnection handling
  - Test manual disconnect button
  - Test peer disconnection (close browser tab)
  - Verify avatar cleanup
  - Test reconnection (new session)
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ]\* 9.4 Test performance and optimization
  - Measure bandwidth usage
  - Profile rendering performance with peer avatar
  - Test with simulated network latency
  - Verify smooth interpolation
  - Test with multiple browser tabs
  - _Requirements: 7.1, 7.2, 7.3, 7.5_

- [ ]\* 9.5 Cross-browser and platform testing
  - Test on Chrome
  - Test on Firefox
  - Test on Safari
  - Test on Edge
  - Test deployment on GitHub Pages
  - Test deployment on Vercel
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 10. Documentation
  - Create user guide for connection process (how to copy/paste offer/answer)
  - Add troubleshooting section for common issues (firewall, NAT, timeout)
  - Document architecture and component responsibilities
  - Add code comments for binary protocol format
  - Update README with multiplayer feature description
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 6.5_
