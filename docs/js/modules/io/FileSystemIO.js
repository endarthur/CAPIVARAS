/**
 * FileSystemIO - File System Access API wrapper with fallbacks
 * Handles saving/loading .capivaras project files
 */

/**
 * Check if File System Access API is supported
 */
export function isFileSystemAccessSupported() {
    return 'showSaveFilePicker' in window && 'showOpenFilePicker' in window;
}

/**
 * Open a file picker and return file handle
 */
export async function openFilePicker(options = {}) {
    const defaultOptions = {
        types: [{
            description: 'CAPIVARAS Project',
            accept: { 'application/x-capivaras': ['.capivaras'] }
        }],
        excludeAcceptAllOption: false,
        multiple: false
    };

    const pickerOptions = { ...defaultOptions, ...options };

    if (isFileSystemAccessSupported()) {
        try {
            const [fileHandle] = await window.showOpenFilePicker(pickerOptions);
            return fileHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // User cancelled
            }
            throw error;
        }
    } else {
        // Fallback: traditional file input
        return await openFilePickerFallback(pickerOptions);
    }
}

/**
 * Save a file picker and return file handle
 */
export async function saveFilePicker(suggestedName = 'project.capivaras', options = {}) {
    const defaultOptions = {
        suggestedName,
        types: [{
            description: 'CAPIVARAS Project',
            accept: { 'application/x-capivaras': ['.capivaras'] }
        }]
    };

    const pickerOptions = { ...defaultOptions, ...options };

    if (isFileSystemAccessSupported()) {
        try {
            const fileHandle = await window.showSaveFilePicker(pickerOptions);
            return fileHandle;
        } catch (error) {
            if (error.name === 'AbortError') {
                return null; // User cancelled
            }
            throw error;
        }
    } else {
        // Fallback: download file
        return { isFallback: true };
    }
}

/**
 * Read file from file handle
 */
export async function readFile(fileHandle) {
    if (fileHandle.getFile) {
        // Modern API
        const file = await fileHandle.getFile();
        return file;
    } else {
        // Fallback: already a File object
        return fileHandle;
    }
}

/**
 * Write data to file handle
 */
export async function writeFile(fileHandle, data) {
    if (fileHandle.isFallback) {
        // Fallback: trigger download
        downloadFile(data, fileHandle.name || 'project.capivaras');
        return true;
    }

    if (fileHandle.createWritable) {
        // Modern API
        const writable = await fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
        return true;
    }

    throw new Error('Unable to write file');
}

/**
 * Fallback: Traditional file input for opening files
 */
async function openFilePickerFallback(options) {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';

        // Set accept attribute from options
        if (options.types && options.types[0].accept) {
            const extensions = Object.values(options.types[0].accept).flat();
            input.accept = extensions.join(',');
        }

        input.onchange = () => {
            if (input.files && input.files[0]) {
                resolve(input.files[0]); // Return File object directly
            } else {
                reject(new Error('No file selected'));
            }
        };

        input.oncancel = () => resolve(null);
        input.click();
    });
}

/**
 * Fallback: Trigger browser download
 */
function downloadFile(data, filename) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Store file handle reference in IndexedDB for reopening
 */
export async function storeFileHandleReference(name, fileHandle) {
    if (!isFileSystemAccessSupported()) return false;

    try {
        const db = await openDatabase();
        const tx = db.transaction('fileHandles', 'readwrite');
        const store = tx.objectStore('fileHandles');

        await store.put({
            name,
            handle: fileHandle,
            lastOpened: new Date().toISOString()
        });

        return true;
    } catch (error) {
        console.warn('[FileSystemIO] Failed to store file handle:', error);
        return false;
    }
}

/**
 * Get stored file handle from IndexedDB
 */
export async function getStoredFileHandle(name) {
    if (!isFileSystemAccessSupported()) return null;

    try {
        const db = await openDatabase();
        const tx = db.transaction('fileHandles', 'readonly');
        const store = tx.objectStore('fileHandles');
        const result = await store.get(name);

        if (result && result.handle) {
            // Verify we still have permission
            const permission = await verifyFileHandlePermission(result.handle);
            if (permission) {
                return result.handle;
            }
        }

        return null;
    } catch (error) {
        console.warn('[FileSystemIO] Failed to retrieve file handle:', error);
        return null;
    }
}

/**
 * Verify and request permission for file handle
 */
async function verifyFileHandlePermission(fileHandle, readWrite = true) {
    const options = { mode: readWrite ? 'readwrite' : 'read' };

    // Check if permission is already granted
    if ((await fileHandle.queryPermission(options)) === 'granted') {
        return true;
    }

    // Request permission
    if ((await fileHandle.requestPermission(options)) === 'granted') {
        return true;
    }

    return false;
}

/**
 * Open IndexedDB for file handle storage
 */
function openDatabase() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('capivaras-storage', 1);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('fileHandles')) {
                db.createObjectStore('fileHandles', { keyPath: 'name' });
            }
        };
    });
}

export default {
    isFileSystemAccessSupported,
    openFilePicker,
    saveFilePicker,
    readFile,
    writeFile,
    storeFileHandleReference,
    getStoredFileHandle
};
