# Deployment Guide

This guide covers deploying AI Snap to various static hosting platforms.

## Prerequisites

- Node.js 20+ installed
- Repository pushed to GitHub
- All dependencies installed (`npm install`)
- Build passes locally (`npm run build`)

## GitHub Pages

### Automatic Deployment (Recommended)

1. Go to your GitHub repository settings
2. Navigate to **Pages** section
3. Under **Source**, select **GitHub Actions**
4. The workflow in `.github/workflows/deploy.yml` will automatically deploy on push to main

Your site will be available at: `https://[username].github.io/[repository-name]/`

### Manual Deployment

```bash
npm run build
# Use gh-pages or manually upload the dist/ folder
```

**Important**: If deploying to a subdirectory (like GitHub Pages), update `vite.config.ts`:

```typescript
export default defineConfig({
  base: '/Procedural_Park/', // Your repository name
  // ... rest of config
})
```

## Vercel

### Automatic Deployment

1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Vercel will auto-detect Vite and use the settings from `vercel.json`
4. Click **Deploy**

Your site will be available at: `https://[project-name].vercel.app`

### Manual Deployment

```bash
npm install -g vercel
npm run build
vercel --prod
```

## Netlify

### Automatic Deployment

1. Go to [netlify.com](https://netlify.com)
2. Click **Add new site** → **Import an existing project**
3. Connect your GitHub repository
4. Netlify will use settings from `netlify.toml`
5. Click **Deploy**

Your site will be available at: `https://[site-name].netlify.app`

### Manual Deployment

```bash
npm install -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
```

## Environment Variables

The game uses optional environment variables for multiplayer configuration:

- `VITE_USE_COLYSEUS` - Set to `true` to use Colyseus server (default: `false` for WebRTC)
- `VITE_COLYSEUS_SERVER` - Colyseus server URL (only needed if using Colyseus)

For static hosting, the default WebRTC peer-to-peer multiplayer works without any configuration.

### Setting Environment Variables

**Vercel/Netlify**: Add environment variables in the dashboard under project settings.

**GitHub Pages**: Not needed for WebRTC multiplayer (default mode).

## Build Verification

Before deploying, verify your build:

```bash
# Type check
npm run type-check

# Build
npm run build

# Preview locally
npm run preview
```

Visit `http://localhost:4173` to test the production build.

## Troubleshooting

### Build Fails

- Check Node.js version (should be 20+)
- Clear cache: `rm -rf node_modules package-lock.json && npm install`
- Check for TypeScript errors: `npm run type-check`

### Assets Not Loading

- Verify `base` path in `vite.config.ts` matches your deployment URL
- Check browser console for 404 errors
- Ensure all assets are in the `public/` folder or imported in code

### Multiplayer Not Working

- WebRTC requires HTTPS in production (all platforms provide this)
- Check browser console for WebRTC errors
- Ensure both users are on supported browsers (Chrome/Edge recommended)
- See [Troubleshooting Guide](docs/troubleshooting.md) for more details

## Performance Optimization

The build is already optimized with:

- Code splitting for Three.js and dependencies
- Minification with Terser
- Tree shaking to remove unused code
- Console logs removed in production
- Optimized chunk sizes

For further optimization:

1. Enable gzip/brotli compression (most platforms do this automatically)
2. Use a CDN (Vercel/Netlify include this)
3. Monitor bundle size: `npm run build` shows chunk sizes

## Post-Deployment

After deployment:

1. Test the game on the live URL
2. Test multiplayer with a friend
3. Check browser console for errors
4. Test on mobile devices
5. Verify all features work (camera, gallery, settings)

## Custom Domain

All platforms support custom domains:

- **GitHub Pages**: Settings → Pages → Custom domain
- **Vercel**: Project Settings → Domains
- **Netlify**: Site Settings → Domain management

## Monitoring

Consider adding:

- Analytics (Google Analytics, Plausible)
- Error tracking (Sentry)
- Performance monitoring (Web Vitals)

These can be added via script tags in `index.html` or as Vite plugins.
