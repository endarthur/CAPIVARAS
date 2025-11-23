# CAPIVARAS Development Roadmap

**Last Updated:** 2025-11-23
**Current Version:** 0.2.0

This roadmap outlines planned improvements, features, and architectural changes for CAPIVARAS.

---

## 🎯 Strategic Vision

**Mission:** Make 3D structural geology analysis accessible, fast, and collaborative.

**Long-term Goal:** Transform CAPIVARAS from a desktop application to a modern, web-based platform that works seamlessly across devices while maintaining the performance and precision required for professional geological analysis.

---

## 📅 Release Timeline

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│ v0.3.0      │ v1.0.0      │ v2.0.0      │ v2.5.0      │ v3.0.0      │
│ (Q1 2026)   │ (Q2 2026)   │ (Q4 2026)   │ (Q2 2027)   │ (Q4 2027)   │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│ Cleanup &   │ Feature     │ Web         │ Advanced    │ Platform    │
│ Stabilization│ Complete   │ Migration   │ Analysis    │ Features    │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

---

## 🔴 Phase 0: Critical Fixes (Immediate - 2 Weeks)

**Priority:** 🔥 CRITICAL
**Target:** Patch release v0.2.1

### Issues to Address

#### 1. Fix Project Metadata
**Problem:** setup.py has wrong package name
```python
# setup.py:60 - Currently wrong
name="OpenSlope",

# Should be:
name="capivaras",
```

**Impact:** Prevents correct PyPI publication
**Effort:** 15 minutes
**Files:** setup.py, entry points

#### 2. Remove Duplicate Dependencies
**Problem:** Three copies of Three.js (3.6MB wasted)
```
viewer/js/three.js          (1.2M)
viewer/js/three.min.js      (570K)
viewer/js/three_current.js  (1.2M) - DELETE
```

**Action:**
- Remove `three_current.js`
- Use `three.min.js` for production
- Consider CDN loading for development

**Impact:** Reduces repository size by 1.2MB
**Effort:** 30 minutes

#### 3. Fix Unsafe Pickle Usage
**Problem:** Security risk - pickle can execute arbitrary code
```python
# main_window.py:586
item_binary_data = pickle.load(czf.open(item_binary_fname))  # UNSAFE
```

**Solution:** Migrate to JSON format for binary data
**Impact:** Security improvement, better compatibility
**Effort:** 2-3 days

#### 4. Add Input Validation
**Problem:** App crashes on invalid input
```python
# main_window.py:727-728 - No validation
orientation = [float(d) for d in split_attitude(data)]  # Can crash
```

**Solution:** Add try/except with user feedback
**Impact:** Prevents crashes, better UX
**Effort:** 1 day

#### 5. Fix Hard-coded Paths
**Problem:** Breaks when installed as package
```python
# main_window.py:96
QtCore.QUrl.fromLocalFile(os.path.abspath("viewer/viewer.html"))
```

**Solution:** Use `pkg_resources` or `importlib.resources`
**Impact:** Works when installed via pip
**Effort:** 2 hours

### Success Metrics
- ✅ All critical bugs fixed
- ✅ No crashes on normal usage
- ✅ Can install via `pip install capivaras`
- ✅ Repository size reduced

---

## 🟡 Phase 1: Code Quality & Documentation (Q1 2026)

**Priority:** HIGH
**Target:** v0.3.0 Release
**Duration:** 6-8 weeks

### 1.1 Code Refactoring

#### Split main_window.py
**Problem:** 1273 lines, too many responsibilities

**Solution:** Extract into modules:
```
capivaras/
├── app.py (main entry point)
├── main_window.py (UI coordination only - 300 lines)
├── project_manager.py (save/load/recent files)
├── state_manager.py (application state)
├── bridge_coordinator.py (Python/JS communication)
└── ui/
    ├── dialogs.py
    ├── toolbars.py
    └── layer_tree.py
```

**Effort:** 2 weeks
**Benefits:**
- Easier testing
- Better code organization
- Simpler onboarding for contributors

#### Modularize JavaScript
**Problem:** capivaras.js is 1247 lines

**Solution:** ES6 modules:
```
viewer/js/
├── main.js
├── modules/
│   ├── Slope.js
│   ├── PlaneSet.js
│   ├── TraceSet.js
│   ├── Renderer.js
│   ├── InteractionController.js
│   └── Tools.js
└── utils/
    ├── pathfinding.js
    ├── geometry.js
    └── picking.js
```

**Effort:** 1.5 weeks
**Benefits:**
- Easier to understand
- Reusable components
- Better testing

### 1.2 Testing Infrastructure

#### Unit Tests
**Target:** 40% code coverage minimum

```
tests/
├── test_math_operations.py
├── test_project_io.py
├── test_data_models.py
└── test_bridge.py
```

**Tools:**
- `pytest` for Python
- `vitest` for JavaScript (when migrating to web)

**Effort:** 2 weeks

#### Integration Tests
**Scenarios:**
- Load mesh → paint planes → save project
- Load project → export to Excel
- Multi-mesh project workflow

**Effort:** 1 week

### 1.3 Documentation

#### User Documentation
- Installation guide (all platforms)
- Getting started tutorial
- Feature documentation
- Video tutorials (3-5 minutes each)
- FAQ section
- Troubleshooting guide

**Effort:** 2 weeks

#### Developer Documentation
- Architecture overview
- API reference (Sphinx for Python)
- Contributing guidelines
- Code style guide
- Development setup instructions

**Effort:** 1 week

### 1.4 Internationalization (i18n)

**Support languages:**
- English (primary)
- Portuguese (secondary - many comments already in Portuguese)
- Spanish (future)

**Implementation:**
- Use Qt's translation system for desktop app
- Prepare for web version (i18next)

**Effort:** 1 week

### Success Metrics
- ✅ Test coverage ≥ 40%
- ✅ All major functions have docstrings
- ✅ User guide complete
- ✅ Contributor guide published
- ✅ Code complexity reduced by 30%

---

## 🟢 Phase 2: Feature Completion (Q2 2026)

**Priority:** MEDIUM-HIGH
**Target:** v1.0.0 Release
**Duration:** 8-10 weeks

### 2.1 Missing Features

#### Enhanced Stereonet Integration
**Current:** Basic integration with OpenStereo
**Goal:** Seamless workflow

**Features:**
- Right-click plane set → "Plot on Stereonet"
- Interactive stereonet in side panel
- Live updates as planes are painted
- Export stereonet as SVG/PNG/PDF

**Effort:** 2 weeks

#### Batch Processing
**Use case:** Process multiple models automatically

**Features:**
- Load multiple PLY files
- Apply template settings
- Auto-detect discontinuity sets
- Batch export to Excel

**Effort:** 1.5 weeks

#### Mesh Editing Tools
**New capabilities:**
- Crop mesh by polygon
- Crop mesh by bounding box
- Simplify mesh (decimation)
- Merge multiple meshes
- Remove outliers/noise

**Effort:** 2 weeks

#### Advanced Filtering
**Filter planes by:**
- Orientation (within tolerance)
- Size (area, vertex count)
- Quality (eigenvalue ratios)
- Spatial location (bounding box)

**Effort:** 1 week

#### Measurement Tools
**New tools:**
- Distance measurement
- Area calculation
- Volume calculation
- Spacing measurement (between parallel planes)

**Effort:** 1.5 weeks

### 2.2 Performance Improvements

#### Optimize Large Mesh Loading
**Target:** 50MB+ meshes load in < 10 seconds

**Optimizations:**
- Streaming PLY parser (don't load entire file to memory)
- Progressive rendering (show partial mesh while loading)
- Web Workers for neighborhood computation
- Indexed DB caching of processed data

**Effort:** 2 weeks

#### Improve Rendering Performance
**Target:** 60 FPS with 10M+ vertices

**Optimizations:**
- Level of Detail (LOD) system
- Frustum culling
- Octree spatial indexing
- Instanced rendering for plane markers

**Effort:** 1.5 weeks

### 2.3 UX Improvements

#### Better Visualization
- Color-coded quality indicators
- Heatmaps (orientation, spacing, etc.)
- 3D annotations
- Measurement overlays

**Effort:** 1 week

#### Improved Layer Management
- Layer groups
- Bulk operations (hide/show, export)
- Layer search/filter
- Drag-and-drop reorganization (already partially implemented)

**Effort:** 1 week

#### Undo/Redo System
**Scope:** All digitizing operations
- Paint planes → undo
- Draw trace → undo
- Delete set → undo

**Implementation:** Command pattern
**Effort:** 1.5 weeks

### Success Metrics
- ✅ All planned features implemented
- ✅ User satisfaction survey ≥ 4/5 stars
- ✅ Performance targets met
- ✅ v1.0.0 released as "feature complete"

---

## 🔵 Phase 3: Web Migration (Q3-Q4 2026)

**Priority:** HIGH (Strategic)
**Target:** v2.0.0 Release (Web Beta)
**Duration:** 12-14 weeks

See **FEASIBILITY_ANALYSIS.md** for detailed migration plan.

### 3.1 Prototype & Validation (2 weeks)

**Build:**
- Basic web app
- Load PLY files via File API
- Three.js rendering
- Test large file performance

**Validate:**
- Performance acceptable?
- UX feels native?
- File operations work?

**Go/No-Go Decision**

### 3.2 Core Migration (6 weeks)

#### Week 1-2: Foundation
- Project structure
- Build system (Vite)
- UI framework (vanilla JS + Web Components)
- File handling (JSZip, File API)

#### Week 3-4: 3D Engine
- Port viewer.js
- Port capivaras.js modules
- GPU picking
- Rendering optimization

#### Week 5-6: Features
- Plane painting
- Trace digitizing
- Data management
- Settings

### 3.3 Library Ports (4 weeks)

#### Math Library (1 week)
- Port auttitude (attitude calculations)
- Port op_math (rotations, transformations)
- Use math.js or THREE.Math

#### Stereonet (3 weeks)
- Port OpenStereo core functionality
- Canvas-based rendering
- Interactive stereonet
- PDF/SVG export

### 3.4 PWA Features (2 weeks)

#### Service Worker
- Cache app assets
- Offline support
- Background processing

#### Installability
- Web App Manifest
- Install prompts
- Desktop icon
- Standalone mode

#### Optimization
- Code splitting
- Lazy loading
- Compression
- CDN usage

### 3.5 Testing & Polish (2 weeks)

#### Cross-browser Testing
- Chrome (primary)
- Firefox (with fallbacks)
- Safari (with fallbacks)
- Edge

#### Mobile Testing
- Tablets (iPad, Android)
- Touch controls
- Responsive layout

#### Performance Testing
- 10MB mesh: < 2s load
- 50MB mesh: < 10s load
- 60 FPS rendering
- Memory usage < 2GB

### Migration Strategy

**Parallel Support (6 months):**
- v1.x (Desktop) - maintenance mode
- v2.x (Web) - active development
- Provide migration guide
- Offer project file converter

**Gradual Rollout:**
1. Beta testers (weeks 1-2)
2. Early adopters (weeks 3-4)
3. General availability (week 5+)
4. Desktop deprecation announcement (month 6)

### Success Metrics
- ✅ Web app feature parity with desktop
- ✅ Performance within 20% of desktop
- ✅ 80%+ users successfully migrated
- ✅ Mobile/tablet support working
- ✅ Positive user feedback

---

## 🟣 Phase 4: Advanced Analysis (Q1-Q2 2027)

**Priority:** MEDIUM
**Target:** v2.5.0 Release
**Duration:** 12 weeks

### 4.1 Statistical Analysis

#### Advanced Stereonet Features
- Contour plots (Fisher, Kamb)
- Best-fit great circles
- Pole density analysis
- Rose diagrams
- Concentration statistics

**Effort:** 3 weeks

#### Kinematic Analysis
- Planar sliding analysis
- Wedge failure analysis
- Toppling analysis
- Factor of safety calculations

**Effort:** 3 weeks

#### Discontinuity Spacing Analysis
- Scanline surveys
- Window sampling
- Spacing distribution
- RQD calculation

**Effort:** 2 weeks

### 4.2 Machine Learning Features

#### Auto-classification
- Train models on user-painted planes
- Auto-classify new planes
- Suggest discontinuity sets

**Technology:** TensorFlow.js
**Effort:** 4 weeks

#### Anomaly Detection
- Detect unusual orientations
- Find outliers in spacing
- Identify data quality issues

**Effort:** 2 weeks

### 4.3 Advanced Visualization

#### Heatmaps & Overlays
- Orientation heatmap on mesh
- Spacing heatmap
- Quality indicators
- Block size visualization

**Effort:** 2 weeks

#### 3D Block Modeling
- Generate discrete blocks from discontinuities
- Volume calculations
- Stability analysis
- Export to mining software

**Effort:** 3 weeks

### Success Metrics
- ✅ Advanced analysis tools working
- ✅ ML models achieve ≥ 85% accuracy
- ✅ Positive reception from research community
- ✅ Published case studies

---

## 🟠 Phase 5: Collaboration & Platform (Q3-Q4 2027)

**Priority:** LOW-MEDIUM
**Target:** v3.0.0 Release
**Duration:** 16 weeks

### 5.1 Cloud Backend (Optional)

**Features:**
- User accounts (authentication)
- Cloud storage for projects
- Share projects via link
- Version history
- Team workspaces

**Technology:**
- Backend: Node.js or Python (FastAPI)
- Database: PostgreSQL + S3
- Auth: Auth0 or Firebase

**Effort:** 6 weeks

### 5.2 Real-time Collaboration

**Features:**
- Multiple users editing same project
- Live cursors showing other users
- Chat/comments on features
- Change tracking
- Conflict resolution

**Technology:** WebRTC + WebSockets
**Effort:** 4 weeks

### 5.3 API & Integrations

#### Public API
- REST API for automation
- Webhooks for events
- API keys for authentication

**Effort:** 2 weeks

#### Integrations
- Export to Rocscience software
- Import from photogrammetry software (RealityCapture, Pix4D)
- GIS integration (QGIS, ArcGIS)
- CAD export (DXF, DWG)

**Effort:** 4 weeks

### 5.4 Marketplace (Future)

**Concept:**
- Community plugins
- Analysis templates
- Mesh libraries
- Custom tools

**Effort:** TBD (post-v3.0)

### Success Metrics
- ✅ Cloud backend stable
- ✅ Collaboration features working
- ✅ API adoption ≥ 100 users
- ✅ Revenue model sustainable

---

## 🔧 Continuous Improvements (Ongoing)

### Code Quality
- Maintain ≥ 60% test coverage
- Regular dependency updates
- Security audits quarterly
- Performance profiling monthly

### Documentation
- Keep docs up-to-date with releases
- Add tutorials as features are added
- Collect user feedback
- FAQ updates

### Community
- Monthly releases (minor versions)
- Active issue triage
- Respond to PRs within 1 week
- Community office hours (optional)

---

## 📊 Success Metrics Dashboard

### Key Performance Indicators (KPIs)

| Metric | Current | Q1 2026 | Q2 2026 | Q4 2026 | Q4 2027 |
|--------|---------|---------|---------|---------|---------|
| **Users** | ~100 | 200 | 500 | 2,000 | 10,000 |
| **GitHub Stars** | 15 | 50 | 100 | 500 | 2,000 |
| **Test Coverage** | 0% | 40% | 60% | 70% | 80% |
| **Load Time (50MB)** | 8s | 6s | 5s | 3s | 2s |
| **Documentation Pages** | 1 | 10 | 20 | 30 | 50 |
| **Contributors** | 1 | 3 | 5 | 10 | 20 |
| **Monthly Active Users** | ~20 | 50 | 150 | 800 | 4,000 |

---

## 🚀 How to Contribute to Roadmap

### Suggest Features
1. Open a [GitHub Discussion](https://github.com/endarthur/capivaras/discussions)
2. Describe your use case
3. Explain why this would benefit the community
4. Community votes on priorities

### Volunteer for Tasks
1. Find items marked `help wanted` in roadmap
2. Comment on issue expressing interest
3. Coordinate with maintainers
4. Submit PR when ready

### Sponsor Development
- Priority features for sponsors
- Company logos on homepage
- Recognition in release notes

---

## 📝 Roadmap Updates

This roadmap is a living document and will be updated:

- **Quarterly:** Major updates based on progress and feedback
- **After Releases:** Post-mortems and lessons learned
- **Community Input:** Feature requests and suggestions
- **Technology Changes:** New web capabilities, library updates

**Last Updated:** 2025-11-23
**Next Review:** 2026-02-01

---

## 🤔 Decision Points

### Open Questions

**Q: Should we maintain desktop version long-term?**
- **Option A:** Deprecate after web version is stable (recommended)
- **Option B:** Maintain both versions indefinitely
- **Decision deadline:** End of Phase 3

**Q: Freemium vs. fully open source?**
- **Option A:** Keep 100% open source (current)
- **Option B:** Basic version free, advanced features paid
- **Option C:** Open source + optional cloud features (paid)
- **Decision deadline:** Before Phase 5

**Q: Native mobile apps vs. PWA only?**
- **Option A:** PWA only (web standards)
- **Option B:** React Native apps for iOS/Android
- **Decision deadline:** After web version ships

---

## 📞 Feedback

Have thoughts on this roadmap?

- **Email:** [project maintainer]
- **Discussions:** https://github.com/endarthur/capivaras/discussions
- **Issues:** https://github.com/endarthur/capivaras/issues (for specific features)

**We want to hear from you!** Your feedback shapes the future of CAPIVARAS.

---

*This roadmap is ambitious but achievable. With community support and focused development, CAPIVARAS can become the go-to tool for 3D structural geology analysis.*

**Together, let's make geological analysis accessible to everyone! 🎉**
