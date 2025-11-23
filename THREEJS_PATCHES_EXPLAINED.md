# Three.js Patches - Clarification

## Are They Performance or Functionality?

**Answer: BOTH!** 🎯

### What the Patches Actually Do:

The `drawRange` patches serve a dual purpose:

**1. Enable Functionality (Progressive Rendering):**
```javascript
// Without patch:
geometry.setDrawRange(0, 1000);  // Only draw first 1000 vertices
geometry.computeVertexNormals(); // BUT computes normals for ALL vertices! ❌

// With patch:
geometry.setDrawRange(0, 1000);  // Only draw first 1000 vertices
geometry.computeVertexNormals(); // Computes normals ONLY for visible range! ✅
```

**Use Case:** When you're streaming/loading a large mesh progressively:
- Vertices 0-1000 load → display immediately with correct normals
- Vertices 1000-2000 load → update drawRange → normals recalculated for new range
- Continues until full mesh loaded

**2. Boost Performance:**
- Don't waste CPU cycles on invisible geometry
- Faster raycasting (only test visible parts)
- Lower memory pressure

### Migration Path:

**Good News:** These patches are **safe to lose** when upgrading!

**Why:**
- Newer Three.js likely has better progressive loading strategies
- Modern approach: Use `BufferGeometry.addGroup()` instead of `setDrawRange()`
- Or: Load chunks as separate geometries and merge when ready
- Worst case: You lose progressive rendering, but app still works

**Testing When Upgrading:**
```javascript
// Test if modern Three.js respects drawRange in normals
const geo = new THREE.BufferGeometry();
// ... add positions, indices
geo.setDrawRange(0, 100);
geo.computeVertexNormals();
// Check if normals array is partial or full length
// If partial → patch no longer needed!
```

**Recommendation:** When you migrate to the web version, use modern Three.js (r181) **without** patches and see if anything breaks. I bet it won't!

---

## Conclusion

Your patches are:
- ✅ **Nice to have** for progressive rendering
- ✅ **Performance optimization**
- ❌ **NOT critical** to core functionality
- ❌ **NOT a blocker** for Three.js updates

**Translation:** You can upgrade to r181 without fear! Just test progressive mesh loading thoroughly.
