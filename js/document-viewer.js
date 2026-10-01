/**
 * Sigma ELMS - Shared Document Viewer Integration
 * Universal IndexedDB + in-memory + fallback document preview launcher across Admin, Teacher, and Student modules.
 */

(function () {
    const SIGMA_DOC_DB_NAME = 'SigmaDocumentDB';
    const SIGMA_DOC_STORE = 'documents';
    const SIGMA_DOC_VERSION = 1;

    let _cachedDb = null;

    function getSigmaDocDB() {
        if (_cachedDb) return Promise.resolve(_cachedDb);
        return new Promise((resolve) => {
            if (!window.indexedDB) {
                resolve(null);
                return;
            }
            try {
                const req = indexedDB.open(SIGMA_DOC_DB_NAME, SIGMA_DOC_VERSION);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(SIGMA_DOC_STORE)) {
                        db.createObjectStore(SIGMA_DOC_STORE);
                    }
                };
                req.onsuccess = (e) => {
                    _cachedDb = e.target.result;
                    resolve(_cachedDb);
                };
                req.onerror = () => resolve(null);
                req.onblocked = () => resolve(null);
            } catch (err) {
                resolve(null);
            }
        });
    }

    window.sigmaStoreDocument = async function (key, fileOrBlobOrBuffer, meta = {}) {
        if (!key || !fileOrBlobOrBuffer) return false;
        try {
            const db = await getSigmaDocDB();
            if (!db) return false;

            let binaryData = fileOrBlobOrBuffer;
            if (fileOrBlobOrBuffer instanceof File || fileOrBlobOrBuffer instanceof Blob) {
                binaryData = await fileOrBlobOrBuffer.arrayBuffer();
            } else if (typeof fileOrBlobOrBuffer === 'string' && fileOrBlobOrBuffer.startsWith('data:')) {
                const comma = fileOrBlobOrBuffer.indexOf(',');
                const bstr = atob(fileOrBlobOrBuffer.slice(comma + 1));
                const bytes = new Uint8Array(bstr.length);
                for (let i = 0; i < bstr.length; i++) bytes[i] = bstr.charCodeAt(i);
                binaryData = bytes.buffer;
            } else if (fileOrBlobOrBuffer.buffer && (fileOrBlobOrBuffer.buffer instanceof ArrayBuffer || fileOrBlobOrBuffer.buffer.constructor?.name === 'ArrayBuffer')) {
                binaryData = fileOrBlobOrBuffer.buffer.slice(fileOrBlobOrBuffer.byteOffset || 0, (fileOrBlobOrBuffer.byteOffset || 0) + (fileOrBlobOrBuffer.byteLength || fileOrBlobOrBuffer.buffer.byteLength));
            }

            const cleanName = meta.name || key;
            const baseName = cleanName.split('/').pop().split('\\').pop();
            const ext = (meta.type || cleanName.split('.').pop() || 'docx').toLowerCase();
            const docId = meta.docId || key;
            const metaTitle = (meta.title || '').trim();
            const metaUrl = (meta.url || '').trim();
            const metaUrlBase = metaUrl ? metaUrl.split('/').pop().split('\\').pop() : '';

            const payload = {
                id: docId,
                name: cleanName,
                baseName: baseName,
                type: ext,
                title: metaTitle,
                url: metaUrl,
                data: binaryData,
                timestamp: Date.now()
            };

            // Register in memory map
            window._sigmaUploadedFiles = window._sigmaUploadedFiles || new Map();
            if (fileOrBlobOrBuffer instanceof File || fileOrBlobOrBuffer instanceof Blob) {
                window._sigmaUploadedFiles.set(cleanName, fileOrBlobOrBuffer);
                window._sigmaUploadedFiles.set(cleanName.toLowerCase(), fileOrBlobOrBuffer);
                window._sigmaUploadedFiles.set(baseName, fileOrBlobOrBuffer);
                window._sigmaUploadedFiles.set(baseName.toLowerCase(), fileOrBlobOrBuffer);
                if (docId) window._sigmaUploadedFiles.set(docId, fileOrBlobOrBuffer);
                if (metaTitle) {
                    window._sigmaUploadedFiles.set(metaTitle, fileOrBlobOrBuffer);
                    window._sigmaUploadedFiles.set(metaTitle.toLowerCase(), fileOrBlobOrBuffer);
                }
                if (metaUrl) {
                    window._sigmaUploadedFiles.set(metaUrl, fileOrBlobOrBuffer);
                    window._sigmaUploadedFiles.set(metaUrl.toLowerCase(), fileOrBlobOrBuffer);
                }
                if (metaUrlBase) {
                    window._sigmaUploadedFiles.set(metaUrlBase, fileOrBlobOrBuffer);
                    window._sigmaUploadedFiles.set(metaUrlBase.toLowerCase(), fileOrBlobOrBuffer);
                }
            }

            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(SIGMA_DOC_STORE, 'readwrite');
                    const store = tx.objectStore(SIGMA_DOC_STORE);
                    store.put(payload, 'active_preview_doc');
                    store.put(payload, cleanName);
                    store.put(payload, cleanName.toLowerCase());
                    store.put(payload, baseName);
                    store.put(payload, baseName.toLowerCase());
                    if (docId) store.put(payload, docId);
                    if (key !== cleanName && key !== docId) {
                        store.put(payload, key);
                        store.put(payload, String(key).toLowerCase());
                    }
                    if (metaTitle) {
                        store.put(payload, metaTitle);
                        store.put(payload, metaTitle.toLowerCase());
                    }
                    if (metaUrl) {
                        store.put(payload, metaUrl);
                        store.put(payload, metaUrl.toLowerCase());
                    }
                    if (metaUrlBase) {
                        store.put(payload, metaUrlBase);
                        store.put(payload, metaUrlBase.toLowerCase());
                    }
                    tx.oncomplete = () => resolve(true);
                    tx.onerror = () => resolve(false);
                } catch (err) {
                    resolve(false);
                }
            });
        } catch (e) {
            console.warn('sigmaStoreDocument error:', e);
            return false;
        }
    };

    window.sigmaGetStoredDocument = async function (key) {
        if (!key) return null;
        try {
            const db = await getSigmaDocDB();
            if (!db) return null;
            return new Promise((resolve) => {
                try {
                    const tx = db.transaction(SIGMA_DOC_STORE, 'readonly');
                    const store = tx.objectStore(SIGMA_DOC_STORE);
                    const cleanKey = String(key).trim();
                    const lowerKey = cleanKey.toLowerCase();
                    const baseKey = cleanKey.split('/').pop().split('\\').pop().toLowerCase();
                    const noImageKey = cleanKey.replace(/^image\//i, '').trim().toLowerCase();

                    const req = store.get(cleanKey);
                    req.onsuccess = () => {
                        if (req.result && req.result.data) {
                            resolve(req.result);
                            return;
                        }
                        const reqLow = store.get(lowerKey);
                        reqLow.onsuccess = () => {
                            if (reqLow.result && reqLow.result.data) {
                                resolve(reqLow.result);
                                return;
                            }
                            const reqBase = store.get(baseKey);
                            reqBase.onsuccess = () => {
                                if (reqBase.result && reqBase.result.data) {
                                    resolve(reqBase.result);
                                    return;
                                }
                                const reqNoImg = store.get(noImageKey);
                                reqNoImg.onsuccess = () => {
                                    if (reqNoImg.result && reqNoImg.result.data) {
                                        resolve(reqNoImg.result);
                                        return;
                                    }
                                    // Full scan cursor fallback
                                    if (store.openCursor) {
                                        const cursorReq = store.openCursor();
                                        cursorReq.onsuccess = (e) => {
                                            const cursor = e.target.result;
                                            if (cursor) {
                                                const val = cursor.value;
                                                if (val && val.data) {
                                                    const vName = (val.name || '').toLowerCase();
                                                    const vBase = (val.baseName || '').toLowerCase();
                                                    const vId = String(val.id || '').toLowerCase();
                                                    const vTitle = (val.title || '').toLowerCase();
                                                    const vUrl = (val.url || '').toLowerCase();
                                                    if (
                                                        vId === lowerKey || vName === lowerKey || vBase === baseKey ||
                                                        vName === baseKey || vBase === noImageKey || vTitle === lowerKey ||
                                                        vUrl === lowerKey || (baseKey && (vName.includes(baseKey) || baseKey.includes(vName)))
                                                    ) {
                                                        resolve(val);
                                                        return;
                                                    }
                                                }
                                                cursor.continue();
                                            } else {
                                                resolve(null);
                                            }
                                        };
                                        cursorReq.onerror = () => resolve(null);
                                    } else {
                                        resolve(null);
                                    }
                                };
                                reqNoImg.onerror = () => resolve(null);
                            };
                            reqBase.onerror = () => resolve(null);
                        };
                        reqLow.onerror = () => resolve(null);
                    };
                    req.onerror = () => resolve(null);
                } catch (err) {
                    resolve(null);
                }
            });
        } catch (e) {
            return null;
        }
    };

    window.openDocumentViewer = async function (fileName, fileOrUrl, fileType) {
        let actualName = fileName || 'Document';
        if (typeof actualName === 'string' && actualName.includes('%')) {
            try { actualName = decodeURIComponent(actualName); } catch (e) {}
        }

        let urlString = (typeof fileOrUrl === 'string') ? fileOrUrl.trim() : '';
        while (urlString.includes('%25') || urlString.includes('%2F') || urlString.includes('%20')) {
            try {
                const dec = decodeURIComponent(urlString);
                if (dec === urlString) break;
                urlString = dec;
            } catch (e) { break; }
        }
        const extractedFileName = urlString ? urlString.split('/').pop().split('\\').pop() : '';

        const determinedType = (fileType || (actualName ? actualName.split('.').pop() : '') || (extractedFileName ? extractedFileName.split('.').pop() : '') || 'docx').toLowerCase();
        const docId = 'doc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);

        let targetFile = null;
        let targetUrl = null;

        // 1. Resolve File or Blob object
        if (fileOrUrl instanceof File || fileOrUrl instanceof Blob) {
            targetFile = fileOrUrl;
            actualName = fileName || fileOrUrl.name || 'Document';
            targetUrl = URL.createObjectURL(fileOrUrl);
        } else if (urlString && urlString !== '#' && !urlString.startsWith('javascript:')) {
            // Data URL (base64) — convert synchronously to Blob so viewer + PDF tab work after reload
            if (urlString.startsWith('data:')) {
                try {
                    const commaIdx = urlString.indexOf(',');
                    const meta = urlString.slice(0, commaIdx);
                    const mimeMatch = meta.match(/:(.*?);/);
                    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
                    const bstr = atob(urlString.slice(commaIdx + 1));
                    const n = bstr.length;
                    const u8 = new Uint8Array(n);
                    for (let i = 0; i < n; i++) u8[i] = bstr.charCodeAt(i);
                    targetFile = new Blob([u8], { type: mime });
                    targetUrl = URL.createObjectURL(targetFile);
                } catch (_) {
                    targetUrl = urlString;
                }
            } else {
                targetUrl = urlString;
                if (window._sigmaUploadedFiles) {
                    targetFile = window._sigmaUploadedFiles.get(targetUrl) ||
                                 (extractedFileName ? window._sigmaUploadedFiles.get(extractedFileName) : null) ||
                                 (extractedFileName ? window._sigmaUploadedFiles.get(extractedFileName.toLowerCase()) : null);
                }
            }
        }

        // Check in-memory registry by fileName/actualName if not found yet
        if (!targetFile && window._sigmaUploadedFiles) {
            targetFile = window._sigmaUploadedFiles.get(actualName) ||
                         window._sigmaUploadedFiles.get(actualName.toLowerCase()) ||
                         (fileName ? window._sigmaUploadedFiles.get(fileName) : null) ||
                         (extractedFileName ? window._sigmaUploadedFiles.get(extractedFileName) : null) ||
                         (extractedFileName ? window._sigmaUploadedFiles.get(extractedFileName.toLowerCase()) : null);
        }

        // Check editingMaterialState if available
        if (!targetFile && window.editingMaterialState) {
            const em = window.editingMaterialState;
            if (em.file && (em.fileName === actualName || em.fileName === extractedFileName || em.title === actualName)) {
                targetFile = em.file;
            } else if (em.rubricFile && (em.rubricFileName === actualName || em.rubricFileName === extractedFileName)) {
                targetFile = em.rubricFile;
            } else if (em.perfGuidelinesFile && (em.perfGuidelinesFileName === actualName || em.perfGuidelinesFileName === extractedFileName)) {
                targetFile = em.perfGuidelinesFile;
            } else if (em.perfRubricFile && (em.perfRubricFileName === actualName || em.perfRubricFileName === extractedFileName)) {
                targetFile = em.perfRubricFile;
            }
        }

        // Check IndexedDB (SigmaDocumentDB) if file/blob is not yet resolved
        if (!targetFile && typeof window.sigmaGetStoredDocument === 'function') {
            try {
                const keysToTry = [
                    actualName,
                    extractedFileName,
                    urlString,
                    fileName,
                    actualName.toLowerCase(),
                    extractedFileName ? extractedFileName.toLowerCase() : null
                ].filter(Boolean);

                let stored = null;
                for (const k of keysToTry) {
                    stored = await window.sigmaGetStoredDocument(k);
                    if (stored && stored.data) break;
                }

                if (stored && stored.data) {
                    const mime = (determinedType === 'pdf') ? 'application/pdf' : 'application/octet-stream';
                    let bytes = stored.data;
                    if (typeof bytes === 'string' && bytes.startsWith('data:')) {
                        const comma = bytes.indexOf(',');
                        const bstr = atob(bytes.slice(comma + 1));
                        const arr = new Uint8Array(bstr.length);
                        for (let i = 0; i < bstr.length; i++) arr[i] = bstr.charCodeAt(i);
                        bytes = arr.buffer;
                    } else if (bytes instanceof Blob) {
                        bytes = await bytes.arrayBuffer();
                    } else if (bytes.buffer && (bytes.buffer instanceof ArrayBuffer || bytes.buffer.constructor?.name === 'ArrayBuffer')) {
                        bytes = bytes.buffer.slice(bytes.byteOffset || 0, (bytes.byteOffset || 0) + (bytes.byteLength || bytes.buffer.byteLength));
                    }
                    targetFile = new Blob([bytes], { type: mime });
                    targetUrl = URL.createObjectURL(targetFile);
                    if (window._sigmaUploadedFiles) {
                        window._sigmaUploadedFiles.set(actualName, targetFile);
                        window._sigmaUploadedFiles.set(actualName.toLowerCase(), targetFile);
                        if (extractedFileName) {
                            window._sigmaUploadedFiles.set(extractedFileName, targetFile);
                            window._sigmaUploadedFiles.set(extractedFileName.toLowerCase(), targetFile);
                        }
                        if (urlString) window._sigmaUploadedFiles.set(urlString, targetFile);
                    }
                }
            } catch (e) {}
        }

        // 2. Images: Always open using Announcement Image Lightbox (without like button)
        const isImage = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(determinedType) || (actualName && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(actualName)) || (extractedFileName && /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(extractedFileName));
        if (isImage) {
            const finalImgUrl = targetUrl || (targetFile ? URL.createObjectURL(targetFile) : null) || (urlString ? urlString : '');
            if (finalImgUrl) {
                if (typeof window.openUniversalImageLightbox === 'function') {
                    window.openUniversalImageLightbox(finalImgUrl);
                    return;
                } else if (typeof window.SigmaAnnouncements?.openPostLightbox === 'function') {
                    window.SigmaAnnouncements.openPostLightbox(finalImgUrl);
                    return;
                } else if (typeof window.enlargeAnnouncementImage === 'function') {
                    window.enlargeAnnouncementImage(finalImgUrl);
                    return;
                } else {
                    window.open(finalImgUrl, '_blank');
                    return;
                }
            }
        }

        // 3. PDF: Always use browser's native built-in PDF viewer tab
        if (determinedType === 'pdf' || (actualName && actualName.toLowerCase().endsWith('.pdf')) || (extractedFileName && extractedFileName.toLowerCase().endsWith('.pdf'))) {
            if (targetFile) {
                window.open(URL.createObjectURL(targetFile), '_blank');
            } else if (targetUrl && !targetUrl.startsWith('image/')) {
                window.open(targetUrl, '_blank');
            } else {
                alert('PDF document file not found.');
            }
            return;
        }

        // 3.5 Mobile Version: Make user download DOCX and TXT directly
        const isMobileViewer = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobileViewer && (determinedType === 'docx' || determinedType === 'txt' || (actualName && /\.(docx|txt)$/i.test(actualName)))) {
            const dlFileName = actualName || extractedFileName || `document.${determinedType}`;
            let dlUrl = null;
            let shouldRevoke = false;

            if (targetFile) {
                dlUrl = URL.createObjectURL(targetFile);
                shouldRevoke = true;
            } else if (targetUrl) {
                dlUrl = targetUrl;
            } else if (urlString) {
                dlUrl = urlString;
            }

            if (dlUrl) {
                const a = document.createElement('a');
                a.href = dlUrl;
                a.download = dlFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                if (shouldRevoke) {
                    setTimeout(() => URL.revokeObjectURL(dlUrl), 10000);
                }
                return;
            }
        }

        // 4. Save binary data to In-Memory Map & IndexedDB immediately, awaiting completion
        if (targetFile) {
            window._sigmaUploadedFiles = window._sigmaUploadedFiles || new Map();
            window._sigmaUploadedFiles.set(docId, targetFile);
            window._sigmaUploadedFiles.set(actualName, targetFile);
            window._sigmaUploadedFiles.set(actualName.toLowerCase(), targetFile);
            if (extractedFileName) {
                window._sigmaUploadedFiles.set(extractedFileName, targetFile);
                window._sigmaUploadedFiles.set(extractedFileName.toLowerCase(), targetFile);
            }
            if (targetUrl) window._sigmaUploadedFiles.set(targetUrl, targetFile);

            // Store in IndexedDB and await write completion before opening viewer window
            try {
                await window.sigmaStoreDocument(actualName, targetFile, {
                    name: actualName,
                    title: actualName,
                    url: targetUrl || urlString,
                    type: determinedType,
                    docId: docId
                });
                if (extractedFileName && extractedFileName !== actualName) {
                    await window.sigmaStoreDocument(extractedFileName, targetFile, {
                        name: extractedFileName,
                        title: actualName,
                        url: targetUrl || urlString,
                        type: determinedType,
                        docId: docId
                    });
                }
            } catch (e) {}
        }

        // 5. Open Viewer Window
        const queryParts = [
            `docId=${encodeURIComponent(docId)}`,
            `name=${encodeURIComponent(actualName)}`,
            `type=${encodeURIComponent(determinedType)}`,
            `t=${Date.now()}`
        ];
        if (extractedFileName) {
            queryParts.push(`realName=${encodeURIComponent(extractedFileName)}`);
        }
        if (urlString) {
            queryParts.push(`src=${encodeURIComponent(urlString)}`);
        } else if (targetUrl && !targetUrl.startsWith('blob:')) {
            queryParts.push(`src=${encodeURIComponent(targetUrl)}`);
        }

        const viewerUrl = `viewer.html?${queryParts.join('&')}`;
        try {
            const a = document.createElement('a');
            a.href = viewerUrl;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (e) {
            window.open(viewerUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Real-Time Cross-Window Document Bus for zero-delay instant document delivery
    if (typeof BroadcastChannel !== 'undefined') {
        try {
            const docBus = new BroadcastChannel('sigma_document_bus');
            docBus.onmessage = async function (e) {
                if (!e.data || e.data.type !== 'REQUEST_DOCUMENT') return;
                const reqDocId = e.data.docId;
                const reqName = (e.data.name || '').toLowerCase();
                const reqBase = reqName.split('/').pop().split('\\').pop();

                let foundFile = null;
                if (window._sigmaUploadedFiles) {
                    foundFile = (reqDocId ? window._sigmaUploadedFiles.get(reqDocId) : null)
                        || (reqName ? window._sigmaUploadedFiles.get(reqName) : null)
                        || (reqBase ? window._sigmaUploadedFiles.get(reqBase) : null);
                }

                if (!foundFile && window.editingMaterialState) {
                    if (window.editingMaterialState.file) foundFile = window.editingMaterialState.file;
                    else if (window.editingMaterialState.rubricFile) foundFile = window.editingMaterialState.rubricFile;
                    else if (window.editingMaterialState.perfGuidelinesFile) foundFile = window.editingMaterialState.perfGuidelinesFile;
                    else if (window.editingMaterialState.perfRubricFile) foundFile = window.editingMaterialState.perfRubricFile;
                }

                if (!foundFile && typeof window.sigmaGetStoredDocument === 'function') {
                    const stored = (reqDocId ? await window.sigmaGetStoredDocument(reqDocId) : null)
                        || (reqName ? await window.sigmaGetStoredDocument(reqName) : null)
                        || (reqBase ? await window.sigmaGetStoredDocument(reqBase) : null);
                    if (stored && stored.data) {
                        foundFile = stored.data;
                    }
                }

                if (foundFile) {
                    let arrayBuffer = null;
                    if (foundFile instanceof ArrayBuffer) arrayBuffer = foundFile;
                    else if (foundFile.buffer && (foundFile.buffer instanceof ArrayBuffer || foundFile.buffer.constructor?.name === 'ArrayBuffer')) arrayBuffer = foundFile.buffer;
                    else if (foundFile instanceof Blob || foundFile instanceof File) arrayBuffer = await foundFile.arrayBuffer();
                    if (arrayBuffer) {
                        docBus.postMessage({
                            type: 'DELIVER_DOCUMENT',
                            docId: reqDocId,
                            name: e.data.name,
                            data: arrayBuffer
                        });
                    }
                }
            };
        } catch (e) {}
    }
})();
