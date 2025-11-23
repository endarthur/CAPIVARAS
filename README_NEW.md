# CAPIVARAS

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.5500572.svg)](https://doi.org/10.5281/zenodo.5500572)
[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

**3D Geological Slope Analysis & Structural Mapping Tool**

CAPIVARAS is a specialized desktop application for analyzing 3D mesh models of geological slopes, rock faces, and outcrops. It enables geologists and geotechnical engineers to digitize structural features, measure orientations, and perform statistical analysis on discontinuities directly from high-resolution 3D models.

![CAPIVARAS Screenshot](docs/images/screenshot.png)
*Example: Analyzing discontinuity sets on a slope model*

---

## ✨ Features

### 🎨 Interactive 3D Visualization
- Load and view high-resolution mesh models (PLY format)
- Real-time 3D rendering powered by Three.js
- Perspective and orthographic camera modes
- Intuitive orbit controls with customizable reference frames

### 🖌️ Structural Mapping Tools
- **Plane Painting:** Paint discontinuity planes directly on mesh surfaces with adjustable brush size
- **Trace Digitizing:** Draw discontinuity traces with automatic pathfinding along mesh topology
- **Section Profiles:** Extract cross-sections through the model
- **Point Sampling:** Mark and analyze specific locations

### 📐 Geological Analysis
- Automatic attitude (strike/dip or dip/dip direction) calculation for painted planes
- Discontinuity set detection and classification
- Statistical analysis of orientation data
- Stereonet plotting integration (via OpenStereo)
- Topology analysis (T-junctions, intersections)

### 💾 Data Management
- Project-based workflow with .capivaras files (ZIP format)
- Export discontinuity data to Excel spreadsheets
- Export traces and sections to JSON
- Support for multiple meshes and data sets per project

### ⌨️ Productivity Features
- Keyboard shortcuts for common operations
- Multi-layer management with visibility controls
- Customizable color schemes for discontinuity sets
- Undo/redo support for digitizing operations

---

## 📋 Requirements

### System Requirements
- **OS:** Windows 10+, macOS 10.14+, or Linux (Ubuntu 20.04+)
- **RAM:** 8GB minimum, 16GB recommended for large meshes
- **GPU:** OpenGL 3.3+ compatible graphics card
- **Display:** 1920x1080 resolution or higher recommended

### Software Dependencies
- Python 3.8 or higher
- PyQt5
- PyQtWebEngine
- OpenGL drivers (usually pre-installed)

---

## 🚀 Installation

### Option 1: Install from PyPI (Recommended)

```bash
pip install capivaras
```

### Option 2: Install from Source

1. **Clone the repository:**
```bash
git clone https://github.com/endarthur/capivaras.git
cd capivaras
```

2. **Create a virtual environment (recommended):**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies:**
```bash
pip install pipenv
pipenv install
```

4. **Build UI files:**
```bash
python setup.py buildui
```

5. **Run the application:**
```bash
python -m capivaras
```

---

## 📖 Quick Start Guide

### 1. Import a Mesh Model

1. Launch CAPIVARAS
2. Go to **File → Import Mesh** (or press `Ctrl+O`)
3. Select your PLY mesh file
4. The model will load in the 3D viewer

**Coordinate Systems:**
- **Standard:** X-right, Y-forward, Z-up
- **East-North-Up:** Use **File → Import Mesh (East, North, Up)** for survey data
- **West-Down-South:** Use for specific coordinate conventions

### 2. Navigate the 3D View

| Action | Control |
|--------|---------|
| Rotate view | Left mouse button + drag |
| Pan view | Right mouse button + drag |
| Zoom | Mouse wheel |
| Measure orientation | Shift + hover over surface |
| Top view | NumPad 7 |
| Front view | NumPad 1 |
| Right view | NumPad 3 |
| Fit to view | Shift + Home |

### 3. Paint Discontinuity Planes

1. Hold **Ctrl** to activate painting mode
2. Mouse wheel adjusts brush size (or Shift + wheel for fine adjustment)
3. Click and drag on the mesh to paint discontinuities
4. Release **Ctrl** to return to navigation mode

**Tips:**
- Larger brush size = faster painting
- Smaller brush size = more precision
- Shift + W toggles wireframe for better visibility
- Shift + C toggles vertex colors

### 4. Digitize Traces

1. Hold **Ctrl** + **Alt** to activate trace mode
2. Left-click to start a trace
3. Left-click to add waypoints (automatic pathfinding between points)
4. Right-click to finish the trace
5. Press **Backspace** to undo last segment
6. Press **Esc** to cancel current trace

### 5. Manage Data Sets

- Right-click on items in the **Layers** panel for options:
  - **Add Set:** Create a new discontinuity set
  - **Change Set Color:** Customize visualization
  - **Edit Set:** Make this set active for new features
  - **Update Planes:** Recalculate plane orientations
  - **Export Set:** Save data to Excel/JSON

### 6. Save Your Work

1. **File → Save** (Ctrl+S) - Save current project
2. **File → Save As** - Save to new location
3. Projects are saved as `.capivaras` files (ZIP archives containing meshes, data, and settings)

---

## 📐 Coordinate Systems & Conventions

### Attitude Conventions

CAPIVARAS supports two attitude notation systems:

1. **Dip Direction/Dip** (Default)
   - Dip direction: 0-360° (azimuth of maximum dip)
   - Dip: 0-90° (angle from horizontal)
   - Example: 135/45 = SE dipping 45°

2. **Strike/Dip** (Geological)
   - Strike: 0-360° (azimuth of horizontal line)
   - Dip: 0-90° (angle from horizontal)
   - Example: N45E/45SE

Configure in **Settings → Project Settings → Reference System**

### Reference Frames

- **Azimuth:** Measured clockwise from North (0°)
- **Compass:** Can display N-E-S-W or 0-90-180-270
- **Axes:** Toggle display of coordinate axes

---

## ⌨️ Keyboard Shortcuts

### Navigation
| Shortcut | Action |
|----------|--------|
| NumPad 1 | Front view |
| NumPad 3 | Right view |
| NumPad 7 | Top view |
| NumPad 9 | Left view |
| Shift + Home | Fit view to model |

### View Controls
| Shortcut | Action |
|----------|--------|
| Shift + W | Toggle wireframe |
| Shift + C | Toggle vertex colors |
| H | Hide/show selected model |

### Tools
| Shortcut | Action |
|----------|--------|
| Ctrl + Paint | Plane painting mode |
| Ctrl + Alt + Click | Trace digitizing mode |
| Backspace | Undo last trace segment |
| Esc | Cancel current operation |

---

## 📊 Data Export Formats

### Excel Export (.xlsx)

Discontinuity planes export includes:
- Plane ID
- Dip Direction and Dip (or Strike/Dip)
- Center coordinates (X, Y, Z)
- Eigenvalues (plane fit quality)
- Number of vertices
- Average Resultant Length (dispersion measure)
- Radius

### JSON Export

Traces and sections export as JSON with:
```json
{
    "set_id": 1,
    "traces": [
        {
            "id": 0,
            "points": [[x1, y1, z1], [x2, y2, z2], ...],
            "length": 12.45,
            "attitude": [135, 45]
        }
    ]
}
```

---

## 🛠️ Advanced Features

### Set Detection

Automatically detect discontinuity sets based on painted colors:
1. Paint different discontinuity orientations with different colors
2. Right-click mesh → **Detect Plane Set Colors**
3. Right-click mesh → **Classify Plane Sets by Color**
4. Sets are automatically organized in the layer tree

### Topology Analysis

Analyze discontinuity trace networks:
- **T-junctions:** Where one trace terminates at another
- **X-nodes:** Where traces intersect
- Right-click trace set → **Update Topology Markers**

### Custom Orientation

Set camera to specific geological orientation:
1. **View → Set Orientation**
2. Enter attitude (e.g., "135/45" or "N45E/45SE")
3. Camera aligns to view down that direction

---

## 🗂️ Project File Format

`.capivaras` files are ZIP archives containing:

```
project.capivaras (ZIP)
├── project_data.json          # Project metadata
├── mesh_name.capyr            # Mesh settings (JSON)
├── mesh_name.pickle           # Binary mesh data
├── plane_set_1.capyr          # Plane set metadata
├── plane_set_1.pickle         # Plane set data
└── ... (other sets)
```

This format allows:
- Version tracking
- Incremental saves
- Data portability
- Future compatibility

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Setup

1. Fork the repository
2. Create a feature branch
3. Install development dependencies:
```bash
pipenv install --dev
```

4. Make your changes
5. Run tests:
```bash
python -m pytest tests/
```

6. Submit a pull request

### Code Style

- Python: Follow PEP 8, use type hints
- JavaScript: ESLint configuration in `.eslintrc.js`
- Format with Black (Python) and Prettier (JavaScript)

---

## 📚 Documentation

- **User Manual:** [docs/user-guide.md](docs/user-guide.md) *(coming soon)*
- **API Reference:** [docs/api.md](docs/api.md) *(coming soon)*
- **Tutorials:** [docs/tutorials/](docs/tutorials/) *(coming soon)*
- **FAQ:** [docs/faq.md](docs/faq.md) *(coming soon)*

---

## 🐛 Troubleshooting

### Common Issues

**Problem:** Application won't start / blank window
- **Solution:** Update graphics drivers, ensure OpenGL 3.3+ support
- **Check:** Run `python -c "from PyQt5.QtWebEngineWidgets import QWebEngineView; print('OK')"`

**Problem:** Large mesh files are slow to load
- **Solution:**
  - Simplify mesh in MeshLab/CloudCompare before importing
  - Use decimation to reduce vertex count
  - Target: < 5 million vertices for best performance

**Problem:** Can't see painted planes
- **Solution:**
  - Check that plane set is visible (checkbox in Layers panel)
  - Right-click plane set → "Display fit plane" (enable)
  - Right-click mesh → "Update planes"

**Problem:** Trace digitizing doesn't work
- **Solution:**
  - Ensure Ctrl + Alt keys are held while clicking
  - Check that correct trace set is selected (pencil icon in Layers)
  - Verify mesh topology is valid

### Reporting Bugs

Please report bugs on [GitHub Issues](https://github.com/endarthur/capivaras/issues) with:
1. CAPIVARAS version (`Help → About`)
2. Operating system and version
3. Steps to reproduce
4. Screenshots if applicable
5. Sample data (if possible)

---

## 📄 License

CAPIVARAS is licensed under the **GNU General Public License v3.0**.

See [LICENSE](LICENSE) for full text.

**Summary:** You can freely use, modify, and distribute this software, but any derivative works must also be open source under GPL-3.0.

---

## 🙏 Acknowledgments

CAPIVARAS builds on these excellent open-source projects:

- **[Three.js](https://threejs.org/)** - 3D graphics library
- **[PyQt5](https://www.riverbankcomputing.com/software/pyqt/)** - Qt bindings for Python
- **[OpenStereo](https://github.com/endarthur/os)** - Stereonet plotting for structural geology
- **[auttitude](https://github.com/endarthur/auttitude)** - Attitude calculation library

Special thanks to:
- Contributors and testers
- The structural geology community
- Open source maintainers

---

## 📖 Citation

If you use CAPIVARAS in research, please cite:

```bibtex
@software{capivaras2021,
  author = {Arthur Endlein Correia},
  title = {CAPIVARAS: 3D Geological Slope Analysis Tool},
  year = {2021},
  publisher = {Zenodo},
  doi = {10.5281/zenodo.5500572},
  url = {https://doi.org/10.5281/zenodo.5500572}
}
```

---

## 🔗 Links

- **Homepage:** [https://github.com/endarthur/capivaras](https://github.com/endarthur/capivaras)
- **Documentation:** [https://capivaras.readthedocs.io](https://capivaras.readthedocs.io) *(coming soon)*
- **Issues:** [https://github.com/endarthur/capivaras/issues](https://github.com/endarthur/capivaras/issues)
- **Discussions:** [https://github.com/endarthur/capivaras/discussions](https://github.com/endarthur/capivaras/discussions)

---

## 📞 Contact

- **Author:** Arthur Endlein Correia
- **Email:** *(check repository for contact info)*
- **Institution:** *(affiliation information)*

---

## 🗺️ Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

**Near-term goals:**
- Web-based version (PWA)
- Mobile support (tablets)
- Enhanced stereonet integration
- Batch processing tools
- Cloud collaboration features

---

**Made with ❤️ for the geoscience community**

*CAPIVARAS: Because analyzing rock slopes should be as friendly as a capybara!* 🦫
