# Multiplayer Troubleshooting Guide

This guide covers common issues with the multiplayer system and how to resolve them.

## Connection Issues

### "Connection Timeout" Error

**Symptoms**: Connection fails after 30 seconds with a timeout error.

**Possible Causes**:
- Firewall blocking WebRTC connections
- Strict NAT configuration
- Network restrictions (corporate/school networks)
- One player behind a symmetric NAT

**Solutions**:

1. **Check Firewall Settings**
   - Temporarily disable firewall to test
   - Add browser to firewall exceptions
   - Allow UDP traffic on ports used by WebRTC

2. **Try a Different Network**
   - Switch from WiFi to mobile hotspot
   - Try from a different location
   - Avoid corporate/school networks if possible

3. **Use a Different Browser**
   - Chrome and Edge have the best WebRTC support
   - Firefox is also good
   - Safari has limited support

4. **Check NAT Type**
   - If both players are behind symmetric NAT, connection may fail
   - Try connecting from a network with less restrictive NAT
   - Consider using a mobile hotspot as a workaround

### "Invalid Signal Data" Error

**Symptoms**: Error message when pasting offer or answer code.

**Possible Causes**:
- Incomplete copy/paste (code was truncated)
- Extra spaces or characters added
- Wrong code pasted (offer instead of answer, or vice versa)

**Solutions**:

1. **Verify the Code**
   - Make sure you copied the ENTIRE code
   - Check for extra spaces at the beginning or end
   - Ensure no line breaks were added

2. **Copy Again**
   - Click the "Copy" button instead of manually selecting
   - If manually copying, triple-click to select all
   - Paste into a text editor first to verify it looks correct

3. **Check the Order**
   - Host creates offer → Guest pastes offer
   - Guest creates answer → Host pastes answer
   - Don't mix them up!

### Connection Drops During Gameplay

**Symptoms**: "Disconnected" status appears while playing.

**Possible Causes**:
- Unstable internet connection
- One player closed the browser tab
- Network interruption
- Browser went to sleep/background

**Solutions**:

1. **Check Internet Connection**
   - Test your internet speed
   - Close bandwidth-heavy applications
   - Move closer to WiFi router

2. **Keep Browser Active**
   - Don't minimize the browser for long periods
   - Disable browser sleep/power saving features
   - Keep the game tab in focus

3. **Reconnect**
   - Click "Disconnect" if not already disconnected
   - Start the connection process again from scratch
   - Consider switching who hosts

## Performance Issues

### High Latency (> 200ms)

**Symptoms**: Peer avatar moves jerkily, high latency shown in status.

**Possible Causes**:
- Geographic distance between players
- Slow internet connection
- Network congestion
- Background downloads/uploads

**Solutions**:

1. **Optimize Network**
   - Close other applications using internet
   - Pause downloads/uploads
   - Ask others on your network to reduce usage

2. **Check Connection Quality**
   - Run a speed test
   - Check for packet loss
   - Try wired connection instead of WiFi

3. **Lower Graphics Settings**
   - Reduce visual quality to free up resources
   - Close other browser tabs
   - Close other applications

### Choppy Avatar Movement

**Symptoms**: Peer avatar stutters or teleports instead of moving smoothly.

**Possible Causes**:
- High latency
- Packet loss
- Low frame rate
- Browser performance issues

**Solutions**:

1. **Improve Performance**
   - Lower graphics settings
   - Close unnecessary browser tabs
   - Restart browser
   - Update graphics drivers

2. **Check Network**
   - Test for packet loss
   - Switch to wired connection
   - Reduce network congestion

3. **Browser Issues**
   - Clear browser cache
   - Disable browser extensions
   - Try a different browser

## Browser-Specific Issues

### Safari Issues

**Symptoms**: Connection fails or features don't work in Safari.

**Cause**: Safari has limited WebRTC support and restrictions.

**Solutions**:
- Use Chrome, Edge, or Firefox instead
- Update Safari to the latest version
- Enable WebRTC in Safari settings (if available)

### Firefox Issues

**Symptoms**: Connection works but with higher latency than Chrome.

**Cause**: Firefox's WebRTC implementation can be slightly slower.

**Solutions**:
- This is normal, Firefox is still usable
- Try Chrome/Edge for comparison
- Ensure Firefox is up to date

### Mobile Browser Issues

**Symptoms**: Connection fails or game runs poorly on mobile.

**Cause**: Mobile browsers have limited WebRTC support and less processing power.

**Solutions**:
- Use desktop browsers for best experience
- If using mobile, use Chrome on Android
- Reduce graphics settings significantly
- Expect higher latency on mobile

## Platform-Specific Issues

### GitHub Pages Deployment

**Symptoms**: Multiplayer doesn't work when deployed to GitHub Pages.

**Possible Causes**:
- HTTPS requirement for WebRTC
- Incorrect build configuration
- Missing dependencies

**Solutions**:

1. **Ensure HTTPS**
   - GitHub Pages uses HTTPS by default
   - Custom domains must have HTTPS enabled
   - WebRTC requires secure context (HTTPS)

2. **Check Build**
   - Verify all multiplayer files are included in build
   - Check browser console for errors
   - Test locally with `npm run preview` first

3. **Verify Dependencies**
   - Ensure `simple-peer` is in dependencies (not devDependencies)
   - Check that all imports are correct
   - Rebuild and redeploy

### Vercel Deployment

**Symptoms**: Similar issues as GitHub Pages.

**Solutions**:
- Same as GitHub Pages solutions
- Check Vercel build logs for errors
- Ensure build command is correct: `npm run build`
- Verify output directory is set to `dist`

## Advanced Troubleshooting

### Enable Browser Console Logging

To see detailed error messages:

1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for errors in red
4. Share error messages when reporting issues

### Test WebRTC Support

To verify your browser supports WebRTC:

1. Visit: https://test.webrtc.org/
2. Run the connectivity test
3. Check for any failures
4. Note your NAT type

### Check STUN Server Connectivity

The game uses Google's STUN servers. To verify they're accessible:

1. Open browser console
2. Look for "ICE candidate" messages
3. If you see "srflx" candidates, STUN is working
4. If only "host" candidates, STUN may be blocked

### Network Diagnostics

Run these tests to diagnose network issues:

1. **Speed Test**: https://fast.com/
   - Check download/upload speeds
   - Should be at least 1 Mbps each direction

2. **Packet Loss Test**: https://packetlosstest.com/
   - Should be < 1% packet loss
   - Higher loss causes connection issues

3. **Firewall Test**
   - Temporarily disable firewall
   - If connection works, firewall is the issue
   - Add browser to firewall exceptions

## Common Error Messages

### "Failed to create peer connection"

**Cause**: Browser doesn't support WebRTC or it's disabled.

**Solution**: Use Chrome, Edge, or Firefox. Update browser to latest version.

### "ICE connection failed"

**Cause**: Firewall or NAT preventing connection.

**Solution**: Check firewall settings, try different network, or use mobile hotspot.

### "Data channel error"

**Cause**: Connection was established but data transmission failed.

**Solution**: Check network stability, try reconnecting, or restart browsers.

### "Signal data malformed"

**Cause**: Offer or answer code was corrupted during copy/paste.

**Solution**: Copy the code again carefully, ensure no extra characters.

## Still Having Issues?

If you've tried everything and still can't connect:

1. **Gather Information**
   - Browser and version (both players)
   - Operating system (both players)
   - Network type (WiFi, wired, mobile)
   - Error messages from console
   - NAT type (from WebRTC test)

2. **Try Basic Troubleshooting**
   - Both players restart browsers
   - Both players restart computers
   - Try from different locations
   - Switch who hosts

3. **Report the Issue**
   - Include all gathered information
   - Describe exact steps to reproduce
   - Share console error messages
   - Note if it worked before

## Known Limitations

These are current limitations of the system:

- **Two players only** - No support for more than 2 players
- **Manual signaling** - Must copy/paste codes (no automatic matchmaking)
- **No reconnection** - Must restart connection process if disconnected
- **Symmetric NAT** - May fail if both players behind symmetric NAT
- **No relay** - No TURN server for difficult network scenarios

## Workarounds for Difficult Networks

If you're on a restrictive network (school, work, etc.):

1. **Use Mobile Hotspot**
   - Connect one or both players via mobile hotspot
   - Usually has less restrictive NAT
   - Watch data usage (20-30 MB/hour)

2. **Use VPN**
   - Some VPNs improve NAT traversal
   - Others make it worse - test both ways
   - Free VPNs may be too slow

3. **Try Different Times**
   - Network congestion varies by time of day
   - Try during off-peak hours
   - Weekends may have less congestion

## Prevention Tips

To avoid issues in the future:

- ✅ Test connection before planning a session
- ✅ Keep browsers updated
- ✅ Use wired connection when possible
- ✅ Close unnecessary applications
- ✅ Have a backup communication method (Discord, phone)
- ✅ Save working network configurations
- ✅ Note which player hosting works better

## Getting Help

If you need additional help:

- Check the [Multiplayer User Guide](multiplayer-guide.md) for basic instructions
- Review the [Architecture Documentation](architecture.md) for technical details
- Search existing issues on the project repository
- Create a new issue with detailed information
- Ask in the community Discord/forum (if available)

Remember: WebRTC peer-to-peer connections can be tricky due to firewalls and NAT configurations. Don't get discouraged if it takes a few tries to get connected!
