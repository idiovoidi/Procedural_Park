# Requirements Document

## Introduction

This feature enables peer-to-peer multiplayer functionality for the creature photography game using WebRTC with manual signaling. The system allows two players to connect directly through their browsers without requiring a dedicated server, making it ideal for deployment on static hosting platforms like GitHub Pages or Vercel. Players will be able to see each other's positions, camera orientations, and share the experience of discovering and photographing creatures together.

## Glossary

- **WebRTC System**: The peer-to-peer communication system that establishes direct browser-to-browser connections for real-time data exchange
- **Signaling Process**: The manual exchange of connection data (offers and answers) between players through copy-paste to establish the WebRTC connection
- **Host Player**: The player who initiates the connection by creating an offer
- **Guest Player**: The player who joins by receiving the offer and creating an answer
- **Game State**: The synchronized data including player positions, camera orientations, ride progress, and creature interactions
- **Peer Avatar**: The visual representation of the other player in the 3D scene
- **Connection UI**: The user interface components for managing the connection process and displaying connection status

## Requirements

### Requirement 1

**User Story:** As a host player, I want to create a multiplayer session and share connection data, so that my friend can join my game

#### Acceptance Criteria

1. WHEN the Host Player clicks the "Create Session" button, THE WebRTC System SHALL generate a connection offer
2. WHEN the connection offer is generated, THE Connection UI SHALL display the offer data in a copyable text field
3. WHEN the Host Player receives answer data from the Guest Player, THE WebRTC System SHALL process the answer and establish the peer connection
4. THE Connection UI SHALL provide a text input field WHERE the Host Player can paste the answer data received from the Guest Player
5. WHEN the peer connection is successfully established, THE Connection UI SHALL display a "Connected" status indicator

### Requirement 2

**User Story:** As a guest player, I want to join a friend's session using their connection data, so that we can play together

#### Acceptance Criteria

1. WHEN the Guest Player clicks the "Join Session" button, THE Connection UI SHALL display a text input field for pasting the offer data
2. WHEN the Guest Player pastes valid offer data and clicks "Connect", THE WebRTC System SHALL generate an answer
3. WHEN the answer is generated, THE Connection UI SHALL display the answer data in a copyable text field for the Guest Player to send back to the Host Player
4. WHEN the peer connection is successfully established, THE Connection UI SHALL display a "Connected" status indicator
5. IF the offer data is invalid or malformed, THEN THE Connection UI SHALL display an error message indicating the connection failed

### Requirement 3

**User Story:** As a player in a multiplayer session, I want to see my friend's position and camera orientation in real-time, so that I know where they are in the game world

#### Acceptance Criteria

1. WHILE connected to a peer, THE Game State SHALL transmit the local player's position at a rate of at least 10 updates per second
2. WHILE connected to a peer, THE Game State SHALL transmit the local player's camera orientation at a rate of at least 10 updates per second
3. WHEN peer position data is received, THE Peer Avatar SHALL update its position in the 3D scene within 100 milliseconds
4. WHEN peer camera orientation data is received, THE Peer Avatar SHALL update its facing direction within 100 milliseconds
5. THE Peer Avatar SHALL be visually distinct from creatures and environment objects

### Requirement 4

**User Story:** As a player in a multiplayer session, I want the game to handle connection issues gracefully, so that I understand what's happening if the connection drops

#### Acceptance Criteria

1. WHEN the peer connection is lost, THE Connection UI SHALL display a "Disconnected" status indicator
2. WHEN the peer connection is lost, THE Peer Avatar SHALL be removed from the 3D scene
3. IF the connection fails to establish within 30 seconds, THEN THE Connection UI SHALL display a timeout error message
4. THE WebRTC System SHALL provide a "Disconnect" button WHERE players can manually terminate the connection
5. WHEN a player clicks "Disconnect", THE WebRTC System SHALL close the peer connection and reset the Connection UI to the initial state

### Requirement 5

**User Story:** As a player in a multiplayer session, I want to see when my friend takes a photo, so that we can coordinate our photography activities

#### Acceptance Criteria

1. WHEN a player takes a photo, THE Game State SHALL transmit a photo event to the connected peer
2. WHEN a photo event is received from the peer, THE Connection UI SHALL display a visual notification indicating the peer took a photo
3. THE visual notification SHALL be visible for at least 2 seconds
4. THE Game State SHALL include the timestamp of the photo event
5. WHILE connected to a peer, THE Game State SHALL transmit photo events with a latency of less than 500 milliseconds

### Requirement 6

**User Story:** As a player, I want the multiplayer system to work on static hosting platforms, so that I can easily share the game with friends without server costs

#### Acceptance Criteria

1. THE WebRTC System SHALL establish peer-to-peer connections without requiring a WebSocket server
2. THE WebRTC System SHALL use manual signaling through copy-paste for connection establishment
3. THE WebRTC System SHALL function correctly when hosted on GitHub Pages
4. THE WebRTC System SHALL function correctly when hosted on Vercel
5. THE WebRTC System SHALL not require any server-side code or persistent connections
6. THE WebRTC System SHALL use Google's free STUN servers for NAT traversal
7. THE WebRTC System SHALL configure ICE servers during peer connection initialization

### Requirement 7

**User Story:** As a player in a multiplayer session, I want smooth synchronization of game state, so that the multiplayer experience feels responsive

#### Acceptance Criteria

1. THE Game State SHALL use a binary data format for efficient transmission
2. THE Game State SHALL compress position data to reduce bandwidth usage
3. WHEN network latency exceeds 200 milliseconds, THE Peer Avatar SHALL use interpolation to smooth movement
4. THE WebRTC System SHALL monitor connection quality and display latency information in the Connection UI
5. THE Game State SHALL prioritize position and orientation updates over other game events
