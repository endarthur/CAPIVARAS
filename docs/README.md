# CAPIVARAS Web Version

**Pure Vanilla JavaScript • No Build Step • Progressive Web App**

This is the pure web version of CAPIVARAS - a complete rewrite using modern web technologies without any build tools or frameworks.

---

## 🎯 Goals

- ✅ **Zero Build Step:** Just open `index.html` in a browser
- ✅ **ES6 Modules:** Modern JavaScript with clean imports
- ✅ **PWA Ready:** Installable, works offline
- ✅ **Vanilla JS:** No frameworks, pure web standards
- ✅ **CDN Dependencies:** Three.js loaded from CDN
- ✅ **GitHub Pages:** Deployable directly to GitHub Pages

---

## 🚀 Quick Start

### Local Development

1. **Clone & Navigate:**
   ```bash
   cd CAPIVARAS/docs
   ```

2. **Start a local server:**
   ```bash
   # Python 3
   python -m http.server 8000

   # OR Node.js
   npx http-server -p 8000

   # OR PHP
   php -S localhost:8000
   ```

3. **Open in browser:**
   ```
   http://localhost:8000
   ```

**Note:** File API and ES modules require a server (won't work with `file:///`)

### Deploy to GitHub Pages

1. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from branch
   - Branch: `main` (or your branch)
   - Folder: `/docs`
   - Save

2. **Access your app:**
   ```
   https://[username].github.io/CAPIVARAS/
   ```

3. **Done!** The app is now live and installable as a PWA.

---

## 📁 Project Structure

```
docs/
├── index.html                 # Main HTML file
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker (offline support)
│
├── styles/
│   ├── main.css              # Core application styles
│   ├── components.css        # UI component styles
│   └── viewer.css            # 3D viewer specific styles
│
├── js/
│   ├── main.js               # Application entry point
│   │
│   ├── modules/              # Core application modules
│   │   ├── ViewerEngine.js   # Three.js 3D rendering engine
│   │   ├── ProjectManager.js # Project save/load logic
│   │   ├── UIController.js   # UI interactions & dialogs
│   │   ├── ToolController.js # Drawing tools (plane, trace)
│   │   ├── LayerManager.js   # Layer tree management
│   │   ├── Slope.js          # Slope mesh class
│   │   ├── PlaneSet.js       # Plane discontinuity sets
│   │   └── TraceSet.js       # Trace discontinuity sets
│   │
│   └── utils/                # Utility functions
│       ├── fileHandlers.js   # File I/O (PLY, project files)
│       ├── mathUtils.js      # Mathematical operations
│       ├── geometry.js       # Geometry calculations
│       └── pathfinding.js    # A* / Dijkstra for traces
│
└── assets/
    ├── icon-192.png          # PWA icon (192x192)
    ├── icon-512.png          # PWA icon (512x512)
    └── screenshots/          # App screenshots
```

---

## 🔧 Technology Stack

### Core Technologies
- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, Flexbox
- **ES6+ JavaScript** - Modern JavaScript, modules
- **Web APIs:**
  - File System Access API (with fallback)
  - IndexedDB (caching & offline storage)
  - Service Workers (PWA & offline)
  - Web Workers (heavy computation)

### 3D Graphics
- **Three.js r161** - Loaded from CDN via import map
- **WebGL 2.0** - Hardware-accelerated rendering
- **OrbitControls** - Camera navigation
- **PLYLoader** - Mesh file loading

### External Libraries (CDN)
```javascript
"three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js"
```

No npm, no bundler, no build step!

---

## 🎨 Features Implemented

### ✅ Phase 1 - Foundation (Current)

**UI & Layout:**
- ✅ Responsive toolbar with file operations
- ✅ Collapsible side panels (layers, properties)
- ✅ 3D viewer container with status bar
- ✅ Loading screen with animations
- ✅ Dark mode support (system preference)

**Core Architecture:**
- ✅ Modular ES6 structure
- ✅ Event-driven communication
- ✅ State management
- ✅ Error handling

### 🔄 Phase 2 - Core Features (In Progress)

**File Operations:**
- 🔄 Import PLY meshes
- 🔄 Save/load project files (.capivaras)
- 🔄 Export to Excel (SheetJS)

**3D Viewer:**
- 🔄 Three.js scene setup
- 🔄 Camera controls (perspective/orthographic)
- 🔄 Mesh rendering
- 🔄 GPU picking

**Tools:**
- 🔄 Plane painting
- 🔄 Trace digitizing
- 🔄 Measurement tools

### 📅 Phase 3 - Advanced (Planned)

- ⏳ Stereonet plotting (Canvas 2D)
- ⏳ Statistical analysis
- ⏳ Data export (JSON, Excel)
- ⏳ PWA offline support
- ⏳ Installability

---

## 🛠️ Development Guide

### Module Development

**Creating a new module:**

```javascript
// js/modules/MyModule.js
export class MyModule {
    constructor(app) {
        this.app = app;  // Reference to main app
    }

    async init() {
        // Initialize module
    }

    // Public methods
    myMethod() {
        // Implementation
    }
}
```

**Using in main.js:**

```javascript
import { MyModule } from './modules/MyModule.js';

// In CapivarasApp class
this.myModule = new MyModule(this);
await this.myModule.init();
```

### Adding Dependencies

**Via import map (recommended):**

```html
<!-- In index.html -->
<script type="importmap">
{
    "imports": {
        "my-library": "https://cdn.jsdelivr.net/npm/my-library@1.0.0/dist/index.js"
    }
}
</script>
```

**Then use:**

```javascript
import { Something } from 'my-library';
```

### Styling Guidelines

**Use CSS custom properties:**

```css
.my-component {
    background: var(--surface);
    color: var(--text-primary);
    padding: var(--spacing-md);
}
```

**Dark mode automatically handled:**

```css
@media (prefers-color-scheme: dark) {
    :root {
        --surface: #1e1e1e;
        --text-primary: #ffffff;
    }
}
```

---

## 🧪 Testing

### Manual Testing Checklist

- [ ] Load in Chrome, Firefox, Safari, Edge
- [ ] Test file import (PLY files)
- [ ] Test project save/load
- [ ] Test all keyboard shortcuts
- [ ] Test touch controls (mobile/tablet)
- [ ] Test offline functionality
- [ ] Test PWA installation
- [ ] Test with large meshes (50MB+)

### Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| ES6 Modules | ✅ | ✅ | ✅ | ✅ |
| File System Access API | ✅ | ❌* | ❌* | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| Service Workers | ✅ | ✅ | ✅ | ✅ |
| WebGL 2.0 | ✅ | ✅ | ✅ | ✅ |

*\* Fallback provided (download/upload)*

---

## 📝 To-Do List

### High Priority
- [ ] Implement ViewerEngine.js (Three.js integration)
- [ ] Implement PLY file loader
- [ ] Implement project save/load (JSZip)
- [ ] Add plane painting tool
- [ ] Add trace digitizing tool

### Medium Priority
- [ ] Create service worker for offline support
- [ ] Add keyboard shortcut hints
- [ ] Implement undo/redo system
- [ ] Add mesh statistics display

### Low Priority
- [ ] Add touch gesture support
- [ ] Create app icon and screenshots
- [ ] Write user documentation
- [ ] Add analytics (optional)

---

## 🤝 Contributing

Since this is a no-build-step project, contributing is easy:

1. Edit files directly in `docs/` folder
2. Test in browser (`python -m http.server`)
3. Commit changes
4. Push to GitHub (auto-deploys if Pages is enabled)

No npm install, no build command, no webpack config!

---

## 📊 Performance Targets

| Metric | Target | Notes |
|--------|--------|-------|
| Initial Load | < 2s | On 3G connection |
| Time to Interactive | < 3s | App fully usable |
| FPS (rendering) | 60 | Smooth animations |
| Mesh Load (10MB) | < 2s | PLY file |
| Mesh Load (50MB) | < 10s | With streaming |
| Memory Usage | < 500MB | For 10M vertices |

---

## 🔐 Security

**File Upload Safety:**
- Only accept `.ply`, `.obj`, `.capivaras` files
- Validate file contents before parsing
- No arbitrary code execution

**XSS Prevention:**
- Use `textContent` instead of `innerHTML` for user data
- Sanitize any HTML from user input

**CSP (Content Security Policy):**
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               script-src 'self' https://cdn.jsdelivr.net;
               style-src 'self' 'unsafe-inline';">
```

---

## 📱 PWA Installation

**Desktop (Chrome/Edge):**
1. Visit the site
2. Click install icon in address bar
3. Or: Menu → Install CAPIVARAS

**Mobile (iOS/Android):**
1. Visit the site
2. iOS: Share → Add to Home Screen
3. Android: Menu → Install App

---

## 🐛 Troubleshooting

**Problem:** "Cannot use import statement outside a module"
- **Solution:** Ensure `<script type="module">` in HTML

**Problem:** File System Access API not working
- **Solution:** Browser fallback automatically used

**Problem:** Three.js not loading
- **Solution:** Check network connection, CDN may be down

**Problem:** Service Worker not registering
- **Solution:** Must be served over HTTPS (or localhost)

---

## 📄 License

GPL-3.0 - Same as main CAPIVARAS project

---

## 🎉 Acknowledgments

This web version builds on the solid foundation of the desktop CAPIVARAS application, bringing geological analysis to the web with modern technologies.

**Libraries Used:**
- Three.js - MIT License
- (More will be added as development progresses)

---

**Last Updated:** 2025-11-23
**Version:** 0.1.0-alpha
**Status:** 🚧 In Active Development
