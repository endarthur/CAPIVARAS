# Three.js Files Comparison Report

**Generated:** 2025-11-23
**Repository:** CAPIVARAS

---

## Summary

You have **3 copies of Three.js** with the following characteristics:

| File | Version | Size | Lines | Status |
|------|---------|------|-------|--------|
| `three.js` | **r108** | 1.2MB | 48,937 | ⚠️ **MODIFIED** (custom patches) |
| `three_current.js` | **r115** | 1.2MB | 50,409 | ✅ Stock (unmodified) |
| `three.min.js` | **r108** (likely) | 570KB | minified | ✅ Stock (minified) |

**Current Latest:** Three.js **r181** (released 2024)
**Your versions:** r108 (2020), r115 (2020)
**Age:** ~4-5 years behind

---

## Detailed Analysis

### 1. three.js (r108) - CUSTOM MODIFICATIONS FOUND ⚠️

**File:** `viewer/js/three.js`
**Version:** r108
**Hash:** `3b7948036f93c70129e639d4a6f61ce3`
**Status:** **MODIFIED FROM OFFICIAL r108**

#### Custom Patches Applied:

**Patch 1: Respect drawRange in computeVertexNormals()**
```diff
--- official r108
+++ viewer/js/three.js
@@ -10269,13 +10269,17 @@
     var pA = new Vector3(), pB = new Vector3(), pC = new Vector3();
     var cb = new Vector3(), ab = new Vector3();

+    var drawRange = this.drawRange;
+
     // indexed elements

     if ( index ) {

         var indices = index.array;
+        var start = Math.max( 0, drawRange.start );
+        var end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

-        for ( var i = 0, il = index.count; i < il; i += 3 ) {
+        for ( var i = start, il = end; i < il; i += 3 ) {
```

**Purpose:** This modification ensures that normal computation only processes vertices within the geometry's `drawRange`, rather than all vertices. This is crucial for partial mesh rendering.

**Patch 2: Respect drawRange in raycast computation**
```diff
@@ -26970,12 +26974,16 @@
     var index = geometry.index;
     var attributes = geometry.attributes;
     var positions = attributes.position.array;
+    var drawRange = geometry.drawRange;
+    var start, end;

     if ( index !== null ) {

         var indices = index.array;
+        start = Math.max( 0, drawRange.start );
+        end = Math.min( index.count, ( drawRange.start + drawRange.count ) );

-        for ( var i = 0, il = indices.length; i < il; i ++ ) {
+        for ( var i = start, il = end; i < il; i ++ ) {
```

**Purpose:** Similar fix for raycasting - only test rays against visible geometry within drawRange.

**Impact:** These are **important optimizations** for your use case:
- Faster normal computation when using partial geometry
- Correct raycasting for dynamically updated meshes
- Enables progressive rendering of large meshes

**Verdict:** **KEEP THESE MODIFICATIONS** - They're legitimate performance/correctness fixes.

---

### 2. three_current.js (r115) - Stock Version ✅

**File:** `viewer/js/three_current.js`
**Version:** r115
**Hash:** `9aebc0fa3a4ecbce324304ec168368a4`
**Status:** Appears to be **unmodified** official r115

**Changes from r108 → r115:**
- 1,472 more lines of code
- Bug fixes and improvements
- No custom patches detected

**Question:** Why two versions?
- Possibly you were testing r115 but kept r108 for stability
- Or r115 introduced a regression and you reverted

---

### 3. three.min.js (r108) - Minified Stock ✅

**File:** `viewer/js/three.min.js`
**Version:** Likely r108 (based on file size matching r108 minified)
**Hash:** `72fe423c0c63fb3f892d533dd88c491e`
**Size:** 570KB
**Status:** Standard minified build (no custom modifications possible to verify)

---

## Contemporary Version Comparison

**Latest Three.js:** r181 (January 2024)

**What you're missing (r108/r115 → r181):**

### Major Improvements:
1. **WebGPU Support** (r152+) - Next-gen graphics API
2. **WebXR Updates** (various) - Better VR/AR support
3. **Performance Improvements:**
   - Better frustum culling
   - Improved instancing
   - Optimized shadow rendering
4. **New Features:**
   - `BatchedMesh` for ultra-fast multi-mesh rendering
   - `CSM` (Cascaded Shadow Maps)
   - Better TypeScript support
5. **Bug Fixes:** 100+ bug fixes since r115

### Breaking Changes:
- Some geometry APIs renamed (BufferGeometry is now default)
- Material system updates
- Renderer API changes

**Migration Risk:** MEDIUM
- Your custom patches would need to be re-applied
- Some APIs may have changed
- Testing required for all features

---

## Recommendations

### Option 1: Keep Current Setup (Conservative) ✅

**Keep:**
- `three.js` (r108, modified) - **ACTIVE USE**

**Delete:**
- ❌ `three_current.js` (r115) - unused, wasting 1.2MB
- ❌ `three.min.js` (r108) - minified version not needed for development

**Pros:**
- No risk of breakage
- Keeps your important custom patches
- Simplifies the codebase

**Cons:**
- Missing 4 years of improvements
- No access to new features
- Potential security issues

**Implementation:**
```bash
# Delete unused files
rm viewer/js/three_current.js
rm viewer/js/three.min.js

# Document the custom patches
echo "# Using Three.js r108 with custom drawRange patches" > viewer/js/THREE_VERSION.md
```

---

### Option 2: Upgrade to Latest (Aggressive) ⚡

**Steps:**
1. Download Three.js r181
2. Re-apply your custom patches (if still needed)
3. Test thoroughly
4. Use minified version for production

**Pros:**
- Modern features and performance
- Better browser compatibility
- Security fixes

**Cons:**
- Risk of breaking changes
- Patches might need adjustment
- 1-2 days of testing work

**Check if patches are still needed:**
The drawRange modifications might already be fixed in newer versions. The Three.js team may have addressed these issues.

---

### Option 3: Hybrid - Modern + CDN (For Web Version) 🌐

When you migrate to pure web app:

**Development:**
```html
<!-- Load from CDN - always latest -->
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.161.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.161.0/examples/jsm/"
  }
}
</script>
<script type="module">
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PLYLoader } from 'three/addons/loaders/PLYLoader.js';
</script>
```

**Production:**
- Bundle specific version
- Include only what you need
- Tree-shake unused code

**Pros:**
- No committed library files
- Always up to date (dev)
- Smaller repository
- Easy to update

**Cons:**
- Requires internet for development
- Need to verify patches aren't needed

---

## Testing Your Custom Patches

To verify if your patches are still necessary in modern Three.js:

```javascript
// Test case 1: drawRange in computeVertexNormals
const geometry = new THREE.BufferGeometry();
// ... set positions, indices
geometry.setDrawRange(100, 500); // Only draw vertices 100-600
geometry.computeVertexNormals(); // Should only compute for drawRange

// Test case 2: drawRange in raycasting
const mesh = new THREE.Mesh(geometry, material);
mesh.geometry.setDrawRange(0, 1000);
raycaster.intersectObject(mesh); // Should only test drawRange
```

If these work correctly in r181 without patches, you're good to upgrade!

---

## Immediate Action Items

**Priority 1: Cleanup (15 minutes)**
```bash
# Remove duplicate
git rm viewer/js/three_current.js

# Document current version
cat > viewer/js/THREE_VERSION.md << 'EOF'
# Three.js Version: r108 (Modified)

**Status:** Custom build with drawRange optimizations

## Modifications:
1. computeVertexNormals respects geometry.drawRange
2. Raycasting respects geometry.drawRange

## Why:
These patches enable progressive mesh rendering and correct
normal computation for dynamically updated geometries.

## Upgrade Path:
Before upgrading to newer Three.js:
1. Test if patches are still needed
2. Check if issues were fixed upstream
3. Re-apply patches if necessary

Last verified: 2025-11-23
EOF
```

**Priority 2: Verification (30 minutes)**
- Test your app still works after removing three_current.js
- Verify three.js is the one actually being used
- Check HTML files for script tags

**Priority 3: Future Planning**
- Add to roadmap: "Evaluate Three.js upgrade to r181"
- Test in separate branch first
- Budget 2-3 days for upgrade + testing

---

## File Usage Analysis

**Which file is actually loaded?**

Let me check your HTML files:

```html
<!-- viewer/viewer.html:82 -->
<script src="js/three.js"></script>

<!-- viewer/webgl_loader_ply_qt.html:70 -->
<script src="js/three.js"></script>
```

**Verdict:** ✅ **`three.js` (r108, modified) is actively used**

- `three_current.js` (r115) - **NOT USED** ❌ Safe to delete
- `three.min.js` (r108) - **NOT USED** ❌ Safe to delete

---

## Conclusion

You have custom patches in `three.js` r108 that are **valuable and should be preserved**. The other two files are unused and waste repository space.

**Recommended Action:**
1. ✅ **Keep** `three.js` (r108, modified) - actively used with important patches
2. ❌ **Delete** `three_current.js` - unused, 1.2MB wasted
3. ❌ **Delete** `three.min.js` - unused, 570KB wasted
4. 📝 **Document** the custom patches (see action items above)
5. 🔮 **Plan** upgrade to r181 in future (test patches first)

**Space Savings:** 1.77MB (repository size reduction)

---

## Next Steps for Web Migration

When you migrate to the pure web version, consider:

1. **Use ES6 Modules:**
   ```javascript
   import * as THREE from 'three';
   ```

2. **CDN for Development:**
   - Fast iteration
   - No build step needed
   - Easy updates

3. **Bundle for Production:**
   - Tree-shake unused code
   - Minify
   - Re-apply patches if needed

4. **Test Your Patches:**
   - Modern Three.js might have fixed the drawRange issues
   - Could eliminate need for custom build
   - Easier maintenance

---

**Report Generated:** 2025-11-23
**Next Review:** Before web migration (Q3-Q4 2026)
