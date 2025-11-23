/**
 * Data models for CAPIVARAS web app
 * Ported from capivaras/data_models.py
 */

/**
 * Base class for individual items (planes, traces, points, sections)
 */
export class Item {
    constructor(name, parent, itemId, itemData = {}, binaryData = null) {
        this.id = itemId;
        this.name = name;
        this.parent = parent;
        this.data = itemData;
        this.binaryData = binaryData;
        this.visible = true;

        // Mesh data
        this.vertices = null;
        this.indices = null;
    }

    serialize() {
        return {
            name: this.name,
            id: this.id,
            data: this.data,
            visible: this.visible
        };
    }
}

export class Plane extends Item {}
export class Trace extends Item {}
export class Point extends Item {}
export class Section extends Item {}

/**
 * Base class for sets of items (plane sets, trace sets, etc.)
 */
export class ItemSet {
    static itemClass = Item;

    constructor(name, parent, setId, color, editState = false) {
        this.setId = setId;
        this.name = name;
        this.parent = parent;
        this.color = color; // CSS color string
        this.editState = editState;
        this.visible = true;
        this.items = [];
        this.displayPlanes = true;
    }

    addItem(name, itemId, itemData = {}) {
        const item = new this.constructor.itemClass(name, this, itemId, itemData);
        this.items.push(item);
        return item;
    }

    removeItem(itemId) {
        const index = this.items.findIndex(item => item.id === itemId);
        if (index !== -1) {
            this.items.splice(index, 1);
            return true;
        }
        return false;
    }

    getItemById(itemId) {
        return this.items.find(item => item.id === itemId);
    }

    serialize() {
        return {
            name: this.name,
            setId: this.setId,
            color: this.color,
            editState: this.editState,
            visible: this.visible,
            items: this.items.map(item => item.serialize())
        };
    }

    static deserialize(data, parent) {
        const set = new this(data.name, parent, data.setId, data.color, data.editState);
        set.visible = data.visible ?? true;
        if (data.items) {
            for (const itemData of data.items) {
                const item = set.addItem(itemData.name, itemData.id, itemData.data);
                item.visible = itemData.visible ?? true;
            }
        }
        return set;
    }
}

export class PlaneSet extends ItemSet {
    static itemClass = Plane;
}

export class TraceSet extends ItemSet {
    static itemClass = Trace;
}

export class PointSet extends ItemSet {
    static itemClass = Point;
}

export class SectionSet extends ItemSet {
    static itemClass = Section;
}

/**
 * Container for multiple sets of the same type
 */
export class SetGroup {
    constructor(name, parent, setClass) {
        this.name = name;
        this.parent = parent;
        this.setClass = setClass;
        this.sets = [];
        this.visible = true;
    }

    addSet(name, setId, color, editState = false) {
        const set = new this.setClass(name, this, setId, color, editState);
        this.sets.push(set);
        return set;
    }

    removeSet(setId) {
        const index = this.sets.findIndex(set => set.setId === setId);
        if (index !== -1) {
            this.sets.splice(index, 1);
            return true;
        }
        return false;
    }

    getSetById(setId) {
        return this.sets.find(set => set.setId === setId);
    }

    get setIds() {
        return new Set(this.sets.map(set => set.setId));
    }

    newId() {
        // Find first available ID from 1 to 2^23
        const existingIds = this.setIds;
        for (let i = 1; i < (1 << 23); i++) {
            if (!existingIds.has(i)) {
                return i;
            }
        }
        return null;
    }

    serialize() {
        return this.sets.map(set => [
            set.name,
            set.setId,
            set.editState,
            set.color
        ]);
    }

    deserialize(data) {
        for (const [name, setId, editState, color] of data) {
            this.addSet(name, setId, color, editState);
        }
    }

    getCheckState() {
        return {
            visible: this.visible,
            items: this.sets.map(set => [set.setId, set.visible])
        };
    }

    setCheckState(checkState) {
        this.visible = checkState.visible;
        const checkItems = Object.fromEntries(checkState.items);
        for (const set of this.sets) {
            set.visible = checkItems[set.setId] ?? true;
        }
    }
}

/**
 * Mesh - top-level item containing geometry and all sets
 */
export class Mesh extends Item {
    constructor(name, parent, itemId, itemData = {}, dataPath = null) {
        super(name, parent, itemId, itemData);

        this.dataPath = dataPath;
        this.planeSets = new SetGroup('planes', this, PlaneSet);
        this.traceSets = new SetGroup('traces', this, TraceSet);
        this.pointSets = new SetGroup('points', this, PointSet);
        this.sectionSets = new SetGroup('sections', this, SectionSet);

        this.materialSettings = {
            flatShading: true,
            color: 0xffffff,
            metalness: 0.0,
            roughness: 1.0,
            vertexColors: true,
            wireframe: false
        };

        // Three.js mesh object (will be set by ViewerEngine)
        this.mesh = null;
    }

    addPlaneSetsByColor(colors) {
        const newSets = [];
        for (const color of colors) {
            const setId = this.planeSets.newId();
            const newSet = this.planeSets.addSet(
                `plane set ${setId}`,
                setId,
                color
            );
            newSets.push({
                meshId: this.id,
                setId: newSet.setId,
                setClass: 'planeset',
                properties: { setColor: newSet.color }
            });
        }
        return newSets;
    }

    getCheckState() {
        return {
            visible: this.visible,
            id: this.id,
            planeSets: this.planeSets.getCheckState(),
            traceSets: this.traceSets.getCheckState(),
            pointSets: this.pointSets.getCheckState(),
            sectionSets: this.sectionSets.getCheckState()
        };
    }

    setCheckState(checkState) {
        this.visible = checkState.visible;
        this.planeSets.setCheckState(checkState.planeSets);
        this.traceSets.setCheckState(checkState.traceSets);
        this.pointSets.setCheckState(checkState.pointSets);
        this.sectionSets.setCheckState(checkState.sectionSets);
    }

    getSets() {
        return {
            planeSets: this.planeSets.serialize(),
            traceSets: this.traceSets.serialize(),
            pointSets: this.pointSets.serialize(),
            sectionSets: this.sectionSets.serialize()
        };
    }

    deserializeSets(sets) {
        for (const [setType, setItems] of Object.entries(sets)) {
            this[setType].deserialize(setItems);
        }
    }

    setStatistics(data) {
        this.data.statistics = `Vertices: ${data.vertices}
Faces: ${data.faces}
Edges: ${data.edges}
Average Orientation: ${data.orientation[0].toFixed(2)}/${data.orientation[1].toFixed(2)}
Center: ${data.center}`;
    }

    serialize() {
        return {
            ...super.serialize(),
            dataPath: this.dataPath,
            materialSettings: this.materialSettings,
            sets: this.getSets()
        };
    }

    static deserialize(data, parent) {
        const mesh = new Mesh(data.name, parent, data.id, data.data, data.dataPath);
        mesh.visible = data.visible ?? true;
        mesh.materialSettings = data.materialSettings || mesh.materialSettings;
        if (data.sets) {
            mesh.deserializeSets(data.sets);
        }
        return mesh;
    }
}
