# Multiplayer User Guide

This guide will help you connect with a friend and play AI Snap together using peer-to-peer multiplayer.

## Overview

AI Snap uses WebRTC for direct peer-to-peer connections between browsers. This means:
- ✅ No server required
- ✅ Works on static hosting (GitHub Pages, Vercel)
- ✅ Low latency direct connection
- ✅ Private - data goes directly between players
- ⚠️ Manual connection setup (copy/paste codes)
- ⚠️ Limited to 2 players

## Connection Process

The connection process involves exchanging two pieces of data between players:
1. **Offer** - Created by the host
2. **Answer** - Created by the guest in response to the offer

### Step-by-Step Instructions

#### For the Host (Player 1)

1. **Open the Game**
   - Launch AI Snap in your browser
   - Wait for the game to fully load

2. **Create a Session**
   - Click the "Multiplayer" button in the main menu (or press `M`)
   - Click "Create Session"
   - Wait a moment while the offer is generated

3. **Share the Offer**
   - A text box will appear with a long string of text (the offer)
   - Click "Copy Offer" or manually select and copy the entire text
   - Send this offer to your friend via:
     - Discord, Slack, or other messaging app
     - Email
     - Any secure communication channel

4. **Wait for the Answer**
   - Your friend will send you back an "answer" code
   - When you receive it, paste it into the "Paste Answer" text box
   - Click "Connect"

5. **Connected!**
   - You should see "Connected" status
   - Your friend's avatar will appear in your game world
   - You can now explore together!

#### For the Guest (Player 2)

1. **Open the Game**
   - Launch AI Snap in your browser
   - Wait for the game to fully load

2. **Receive the Offer**
   - Your friend (the host) will send you an offer code
   - Copy this code to your clipboard

3. **Join the Session**
   - Click the "Multiplayer" button in the main menu (or press `M`)
   - Click "Join Session"
   - Paste the offer code into the text box
   - Click "Connect"

4. **Share the Answer**
   - A text box will appear with your answer code
   - Click "Copy Answer" or manually select and copy the entire text
   - Send this answer back to your friend (the host)

5. **Connected!**
   - Once the host pastes your answer, you'll see "Connected" status
   - The host's avatar will appear in your game world
   - You can now explore together!

## What You Can Do Together

### Explore Together
- See your friend's position in real-time
- Watch where they're looking with the camera direction indicator
- Coordinate to find the best photo spots

### Photo Notifications
- When your friend takes a photo, you'll see a notification: "📸 Friend took a photo!"
- Great for coordinating group photography sessions

### Communication
- The game doesn't include voice or text chat
- Use a separate communication app (Discord, phone call, etc.) to talk while playing

## Connection Status Indicator

The multiplayer UI shows your connection status:

- **Disconnected** (Gray) - Not connected to anyone
- **Connecting** (Yellow) - Attempting to establish connection
- **Connected** (Green) - Successfully connected, shows latency (e.g., "Connected - 45ms")
- **Error** (Red) - Connection failed or lost

## Disconnecting

To end your multiplayer session:

1. Click the "Disconnect" button in the multiplayer UI
2. Or close the browser tab/window
3. The other player will see a "Disconnected" notification

To reconnect, you'll need to start the connection process again from the beginning.

## Tips for Best Experience

### Before Connecting

- ✅ Make sure both players have the game fully loaded
- ✅ Test your internet connection
- ✅ Close unnecessary browser tabs to free up resources
- ✅ Use Chrome or Edge for best compatibility

### During Connection

- ⏱️ Be patient - connection can take 10-30 seconds
- 📋 Copy the entire offer/answer code (they're long!)
- ✅ Make sure no extra spaces or characters are added when copying
- 🔄 If it fails, try again - sometimes it takes a couple attempts

### While Playing

- 📶 Keep your internet connection stable
- 🎮 Lower graphics settings if you experience lag
- 💬 Use voice chat (Discord, etc.) for better coordination
- 📸 Announce when you're taking photos for fun reactions!

## Understanding Latency

The connection status shows latency in milliseconds (ms):

- **< 50ms** - Excellent, very smooth
- **50-100ms** - Good, smooth gameplay
- **100-200ms** - Acceptable, slight delay
- **> 200ms** - High latency, may feel laggy

The game uses interpolation to smooth out movement even with higher latency.

## Privacy and Security

- Your connection is peer-to-peer (direct between browsers)
- No data is sent to any server
- Only game state is transmitted (position, camera, events)
- The offer/answer codes contain only WebRTC connection metadata
- Share codes only with people you trust

## Bandwidth Usage

The multiplayer system is designed to be bandwidth-efficient:

- **~3-4 KB/s** per direction during active play
- **10 updates per second** for smooth synchronization
- **Binary protocol** for minimal data size
- **~20-30 MB per hour** of gameplay

This should work fine on most internet connections, including mobile hotspots.

## Next Steps

- If you're having trouble connecting, see the [Troubleshooting Guide](troubleshooting.md)
- For technical details, see the [Architecture Documentation](architecture.md)
- Report bugs or issues on the project's issue tracker

Happy exploring together! 🦁📸
