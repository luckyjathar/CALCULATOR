/* === toast notification function === */
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.className = "toast-notification show " + type;
    toast.innerText = message;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function(){ toast.className = "toast-notification"; }, 3000);
}

/* === single-view navigation helper === */
const INLINE_VIEW_IDS = [
    'unifiedHome',
    'finalEligibleArea'
];

function showOnlyOneInlineView(targetId, displayType = 'flex') {
    INLINE_VIEW_IDS.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
    let targetEl = document.getElementById(targetId);
    if (targetEl) {
        targetEl.style.display = (targetId === 'unifiedHome') ? 'block' : displayType;
    }
}

function toggleInline(id, openFunc) {
    showOnlyOneInlineView(id, (id === 'unifiedHome') ? 'block' : 'flex');

    ['addProductModal', 'catSelectionModal', 'multiStackModal'].forEach(mId => {
        let m = document.getElementById(mId);
        if (m) m.style.display = 'none';
    });

    if (typeof openFunc === 'function') {
        openFunc();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* === custom confirm function === */
function showCustomConfirm(msg, yesCallback, noCallback) {
    let confirmEl = document.getElementById('confirmMessage');
    if (!confirmEl) return;
    confirmEl.innerText = msg;
    let yesBtn = document.getElementById('confirmYesBtn');
    let noBtn = document.getElementById('confirmNoBtn');
    let newYesBtn = yesBtn.cloneNode(true);
    let newNoBtn = noBtn.cloneNode(true);
    yesBtn.replaceWith(newYesBtn);
    noBtn.replaceWith(newNoBtn);

    newYesBtn.onclick = function() { document.getElementById('customConfirmModal').style.display = 'none'; if(yesCallback) yesCallback(); };
    newNoBtn.onclick = function() { document.getElementById('customConfirmModal').style.display = 'none'; if(noCallback) noCallback(); };
    document.getElementById('customConfirmModal').style.display = 'flex';
}

/* === custom alert function for copy fallback === */
function showCustomAlert(msg, text = null) {
    let alertEl = document.getElementById('alertMessage');
    if (!alertEl) return;
    alertEl.innerText = msg;
    let ta = document.getElementById('alertTextarea');
    if(text) { ta.value = text; ta.style.display = 'block'; } else { ta.style.display = 'none'; }
    document.getElementById('customAlertModal').style.display = 'flex';
}

/* ========================================================================= */
/* multi-device realtime cloud sync engine                                   */
/* ========================================================================= */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWt4xbbEYWpSwtOSY1jqGJauljwPWojqfpxL4Bk2aRE8gJMpAzanAmNQ1OGNzKYHZfGg/exec";
let loggedInUserEmail = localStorage.getItem('persistent_user_email') || "";
let isSilentSyncing = false;
let pendingCloudPush = false;
let isPullingFromCloud = false;

function markLocalDataModified() {
    let ts = Date.now();
    localStorage.setItem('persistent_local_updated_at', String(ts));
    return ts;
}

function getLocalDataModifiedTime() {
    return parseInt(localStorage.getItem('persistent_local_updated_at') || '0', 10);
}

async function handleGoogleLogin(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
        const userData = JSON.parse(jsonPayload);
        loggedInUserEmail = userData.email.trim().toLowerCase(); 
        localStorage.setItem('persistent_user_email', loggedInUserEmail);
        localStorage.setItem('persistent_user_name', userData.name);
        updateLoginUI(userData.name, false);
        await fetchCloudDataOnLogin(userData.name, false, true);
    } catch(e) { console.error("Google Login Parsing Error:", e); }
}

function updateLoginUI(userName, isOnline) {
    let statusBadge = document.getElementById('gitStatusBadge');
    let syncBtn = document.getElementById('syncBtn');
    if(syncBtn) syncBtn.style.display = 'flex';
    if(statusBadge && loggedInUserEmail) {
        let displayName = userName || localStorage.getItem('persistent_user_name') || loggedInUserEmail.split('@')[0];
        if(isOnline) {
            statusBadge.innerHTML = '🟢 ' + displayName.toUpperCase() + ' (CLOUD SYNC ON)';
            statusBadge.style.background = 'rgba(39, 174, 96, 0.15)';
            statusBadge.style.color = 'var(--success)';
        } else {
            statusBadge.innerHTML = '🔄 ' + displayName.toUpperCase() + ' - SYNCING...';
            statusBadge.style.background = 'rgba(243, 156, 18, 0.15)';
            statusBadge.style.color = '#f39c12';
        }
    }
}

async function fetchCloudDataOnLogin(userName, isSilent = false, forceCloudPriority = false) {
    if (!loggedInUserEmail || isPullingFromCloud || isSilentSyncing) return;
    try {
        isPullingFromCloud = true;
        if (!isSilent) updateLoginUI(userName, false);

        let url = APPS_SCRIPT_URL + "?email=" + encodeURIComponent(loggedInUserEmail.trim().toLowerCase()) + "&t=" + Date.now();
        let res = await fetch(url, { cache: "no-store" });
        let cloudData = await res.json();

        if (Array.isArray(cloudData) && cloudData.length > 0) {
            let metaItem = cloudData.find(item => item && item._isPortalSyncMeta === true);
            let cloudCustomers = cloudData.filter(item => item && !item._isPortalSyncMeta);

            let cloudUpdatedAt = metaItem ? (parseInt(metaItem.updatedAt, 10) || 0) : 0;
            let localUpdatedAt = getLocalDataModifiedTime();

            if (forceCloudPriority || localUpdatedAt === 0 || cloudUpdatedAt >= localUpdatedAt || customerQueue.length === 0) {
                customerQueue = cloudCustomers.map(c => ({
                    ...c,
                    components: c.components || {},
                    products: c.products || [],
                    sortConfigs: c.sortConfigs || []
                }));

                if (metaItem) {
                    if (Array.isArray(metaItem.recycleBin)) {
                        recycleBin = metaItem.recycleBin;
                        await saveToDB('persistent_recycle', recycleBin);
                        localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin));
                    }
                    if (metaItem.salesName) localStorage.setItem('portal_sales_name', metaItem.salesName);
                    if (metaItem.salesMobile) localStorage.setItem('portal_sales_mobile', metaItem.salesMobile);
                    if (cloudUpdatedAt > 0) {
                        localStorage.setItem('persistent_local_updated_at', String(cloudUpdatedAt));
                    }
                }

                if (activeCustomerIndex >= customerQueue.length) {
                    activeCustomerIndex = -1;
                }

                await saveQueueToLocal(false);
                renderCustomerQueue();
                updateUniversalActionButtons();
                updateFinalSwitcher();

                let finalArea = document.getElementById('finalEligibleArea');
                if (finalArea && finalArea.style.display !== 'none' && activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex]) {
                    loadCurrentProducts();
                    updateMatrixTopCard();
                    renderMatrix();
                }

                if (!isSilent) showToast("सर्व डिव्हाइसवरील डेटा सिंक झाला!", "success");
            } else {
                await triggerSilentCloudSync();
            }
        } else {
            if (customerQueue.length > 0 || recycleBin.length > 0) {
                await triggerSilentCloudSync();
                if (!isSilent) showToast("लोकल डेटा क्लाऊडवर सिंक झाला!", "success");
            }
        }
        updateLoginUI(userName, true);
    } catch(e) {
        console.error("Cloud Fetch Error", e);
        if (!isSilent) showToast("क्लाऊड सिंक एरर ऑफलाइन मोड सुरू राहील", "warning");
        updateLoginUI(userName, true);
    } finally {
        isPullingFromCloud = false;
    }
}

async function forceCloudSync() {
    if(!loggedInUserEmail) { showToast("कृपया आधी Google Sign In करा!", "error"); return; }
    let btn = document.getElementById('syncBtn');
    let originalText = btn ? btn.innerHTML : '<span>sync</span> sync cloud';
    if (btn) btn.innerHTML = '<span>sync</span> syncing...';

    let savedName = localStorage.getItem('persistent_user_name') || "User";
    await fetchCloudDataOnLogin(savedName, false, true);

    if (btn) {
        btn.innerHTML = '<span>done</span> sync complete';
        setTimeout(() => { btn.innerHTML = originalText; }, 2000);
    }
}

async function triggerSilentCloudSync() {
    if(!loggedInUserEmail) return;
    if(isSilentSyncing) {
        pendingCloudPush = true;
        return;
    }
    try {
        isSilentSyncing = true;
        pendingCloudPush = false;

        let updatedAt = markLocalDataModified();
        let compactQueue = customerQueue.map(c => {
            let cp = (c.products || []).map(p => {
                let { calculatedData, allSchemes, ...keepProduct } = p;
                return keepProduct;
            });
            return { ...c, products: cp };
        });

        let syncMeta = {
            _isPortalSyncMeta: true,
            updatedAt: updatedAt,
            recycleBin: recycleBin || [],
            salesName: localStorage.getItem('portal_sales_name') || '',
            salesMobile: localStorage.getItem('portal_sales_mobile') || ''
        };

        let payloadQueue = [...compactQueue, syncMeta];

        await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                email: loggedInUserEmail.trim().toLowerCase(),
                queue: payloadQueue
            })
        });
    } catch(err) {
        console.log("Silent Cloud Sync Error:", err);
    } finally {
        isSilentSyncing = false;
        if (pendingCloudPush) {
            pendingCloudPush = false;
            setTimeout(() => triggerSilentCloudSync(), 300);
        }
    }
}

document.addEventListener('visibilitychange', function() {
    if (document.visibilityState === 'visible' && loggedInUserEmail) {
        let savedName = localStorage.getItem('persistent_user_name') || "User";
        fetchCloudDataOnLogin(savedName, true, false);
    }
});

window.addEventListener('focus', function() {
    if (loggedInUserEmail) {
        let savedName = localStorage.getItem('persistent_user_name') || "User";
        fetchCloudDataOnLogin(savedName, true, false);
    }
});

setInterval(function() {
    if (document.visibilityState === 'visible' && loggedInUserEmail && !isSilentSyncing && !isPullingFromCloud) {
        let activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
            let savedName = localStorage.getItem('persistent_user_name') || "User";
            fetchCloudDataOnLogin(savedName, true, false);
        }
    }
}, 25000);

let currentModalCategory = ""; 

function isMobileDeviceCat(cat) { if (!cat) return false; let c = String(cat).toUpperCase().replace(/\s+/g, '').trim(); return c === 'PHONE(WEB-MOBILE)' || c === 'PHONE,TABLET,SMARTWATCH' || c.includes('TABLET,SMART') || c.includes('PHONE,TABLET') || c === 'SMARTPHONES' || c === 'MOBILE'; }
function standardizeCategoryName(cat) { if (!cat) return "OTHER"; let c = String(cat).toUpperCase().trim(); let cNoSpace = c.replace(/\s+/g, ''); if (cNoSpace === 'PHONE(WEB-MOBILE)' || cNoSpace === 'PHONE,TABLET,SMARTWATCH' || cNoSpace.includes('TABLET,SMART') || cNoSpace.includes('PHONE,TABLET') || cNoSpace === 'SMARTPHONES' || cNoSpace === 'MOBILE') { return "PHONE(WEB-MOBILE)"; } if (cNoSpace === 'AIRCONDITIONERS' || cNoSpace === 'AC') { return "AC"; } if (cNoSpace === 'TELEVISIONS' || cNoSpace === 'TV' || cNoSpace === 'LED') { return "LED TV"; } if (cNoSpace === 'REFRIGERATORS' || cNoSpace === 'FRIDGE') { return "REFRIGERATOR"; } return c; }
function getRfcSlabValue(val) { let amount = parseFloat(val) || 0; if (amount < 8000) return 0; if (amount <= 10000) return 1109; if (amount <= 15000) return 1631; if (amount <= 20000) return 2147; if (amount <= 25000) return 2695; if (amount <= 30000) return 3215; if (amount <= 35000) return 3648; if (amount <= 40000) return 4219; if (amount <= 50000) return 5720; if (amount <= 60000) return 8686; if (amount <= 100000) return 11438; if (amount <= 200000) return 16677; return 0; }
function getNonTieupPfValue(category, amount) { let cat = String(category || "").toUpperCase().replace(/\s+/g, '').trim(); let val = parseFloat(amount) || 0; if (cat.includes('DESKTOP') || cat.includes('LAPTOP')) { return 699; } if (cat === 'PHONE(WEB-MOBILE)' || cat.includes('PHONE') || cat.includes('TABLET') || cat.includes('MOBILE')) { if (val <= 30000) return 499; if (val <= 50000) return 599; return 699; } return null; }

/* ========================================================================= */
/* MULTI-CDN & FALLBACK MASTER DATA LOADER (100% RELIABLE)                   */
/* ========================================================================= */
const EXCEL_ENDPOINTS = [
    "https://raw.githubusercontent.com/luckyjathar/testcalculator/main/master_data.xlsx",
    "https://cdn.jsdelivr.net/gh/luckyjathar/testcalculator@main/master_data.xlsx",
    "https://raw.githubusercontent.com/luckyjathar/CALCULATOR/main/master_data.xlsx",
    "https://cdn.jsdelivr.net/gh/luckyjathar/CALCULATOR@main/master_data.xlsx",
    "https://raw.githubusercontent.com/luckyjathar/Store/main/master_data.xlsx",
    "./master_data.xlsx",
    "master_data.xlsx"
];

const DB_NAME = "PersistentPortalDB"; 
const DB_VERSION = 2; 
const STORE_NAME = "dataStore"; 
let dbInstance;

function initDB() { 
    return new Promise((resolve) => { 
        try {
            let request = indexedDB.open(DB_NAME, DB_VERSION); 
            request.onupgradeneeded = function(e) { 
                let db = e.target.result; 
                if (!db.objectStoreNames.contains(STORE_NAME)) { 
                    db.createObjectStore(STORE_NAME); 
                } 
            }; 
            request.onsuccess = function(e) { 
                dbInstance = e.target.result; 
                resolve(dbInstance); 
            }; 
            request.onerror = function() { 
                console.warn("IndexedDB blocked, using fallback memory.");
                resolve(null); 
            }; 
        } catch (err) {
            resolve(null);
        }
    }); 
}

function saveToDB(key, data) { 
    return new Promise((resolve) => { 
        if (!dbInstance) return resolve(); 
        try { 
            let tx = dbInstance.transaction(STORE_NAME, 'readwrite'); 
            let store = tx.objectStore(STORE_NAME); 
            let req = store.put(JSON.stringify(data), key); 
            req.onsuccess = () => resolve(); 
            req.onerror = () => resolve(); 
        } catch(e) { resolve(); } 
    }); 
}

function getFromDB(key) { 
    return new Promise((resolve) => { 
        if (!dbInstance) return resolve(null); 
        try { 
            let tx = dbInstance.transaction(STORE_NAME, 'readonly'); 
            let store = tx.objectStore(STORE_NAME); 
            let req = store.get(key); 
            req.onsuccess = (e) => { 
                let res = e.target.result; 
                if (res) { 
                    try { resolve(typeof res === 'string' ? JSON.parse(res) : res); } 
                    catch(err) { resolve(null); }
                } else { resolve(null); } 
            }; 
            req.onerror = () => resolve(null); 
        } catch(e) { resolve(null); } 
    }); 
}

let db_records = []; let current_products = []; let sortConfigs = []; const SPECIAL_MODEL = "NON TIEUP"; let tempSheet1Data = []; let parsedSheet2Data = []; let customerQueue = []; let recycleBin = []; let activeCustomerIndex = -1; let selectedQueueIndex = -1; let tempPendingProduct = null; 

function parseExcelDate(val) { if (!val) return null; if (typeof val === 'number') { return new Date(Math.round((val - 25569) * 86400 * 1000)); } if (typeof val === 'string') { let d = new Date(val); if (!isNaN(d.getTime())) return d; let parts = val.split(/[\/\-\.]/); if (parts.length === 3) { let y = parts[2].length === 2 ? '20' + parts[2] : parts[2]; return new Date(y, parts[1] - 1, parts[0]); } } return null; }

async function saveQueueToLocal(shouldCloudSync = true) { 
    try { 
        let compactQueue = customerQueue.map(c => { 
            let cp = (c.products || []).map(p => { 
                let { calculatedData, allSchemes, ...keepProduct } = p; 
                return keepProduct; 
            }); 
            return { ...c, products: cp }; 
        }); 
        localStorage.setItem('persistent_queue_backup', JSON.stringify(compactQueue)); 
        localStorage.setItem('persistent_active_idx_backup', activeCustomerIndex); 
        await saveToDB('persistent_queue', compactQueue); 
        await saveToDB('persistent_active_idx', activeCustomerIndex); 
        if(shouldCloudSync) { 
            markLocalDataModified();
            if (loggedInUserEmail) triggerSilentCloudSync(); 
        } 
    } catch(e) { console.error("Local Save Interrupted", e); } 
}

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; 

/* Smart Excel Sheet Parser - वरती रिकाम्या ओळी असल्या तरी डेटा शोधतो */
function parseSheetSmartly(sheet) {
    if (!sheet) return [];
    let rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });
    if (rows.length > 0) {
        let firstKeys = Object.keys(rows[0]).map(k => k.toUpperCase());
        let hasEmptyKey = firstKeys.some(k => k.includes('__EMPTY'));
        if (hasEmptyKey) {
            let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
            let headerRowIdx = matrix.findIndex(r => Array.isArray(r) && r.some(cell => String(cell).toUpperCase().match(/MODEL|TENURE|CATEGORY|DBD|SCHEME/)));
            if (headerRowIdx > 0) {
                rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx, raw: false, defval: "" });
            }
        }
    }
    return rows;
}

async function processArrayBufferToDB(dataBuffer) {
    let wb = XLSX.read(new Uint8Array(dataBuffer), { type: 'array' });
    tempSheet1Data = parseSheetSmartly(wb.Sheets[wb.SheetNames[0]]); 
    parsedSheet2Data = wb.SheetNames.length > 1 ? parseSheetSmartly(wb.Sheets[wb.SheetNames[1]]).map(r => mapData(r, SPECIAL_MODEL)).filter(x => x && x.model && x.model.trim() !== "") : [];

    let filteredSheet1 = tempSheet1Data.map(r => mapData(r, "REG")).filter(m => m && m.model && m.model.trim() !== ""); 
    let rawCombined = [...filteredSheet1, ...parsedSheet2Data]; 
    let uniqueDB = []; let seenDB = new Set();

    rawCombined.forEach(r => { 
        let key = `${r.model}_${r.category}_${r.tenure}_${r.advEmi}_${r.fixedEmi}_${r.minLoan}_${r.maxLoan}`; 
        if (!seenDB.has(key)) { seenDB.add(key); uniqueDB.push(r); } 
    });

    if (uniqueDB.length === 0) {
        throw new Error("Excel मध्ये वैध मॉडेल डेटा सापडला नाही.");
    }

    db_records = uniqueDB;
    let now = Date.now();
    await saveToDB('cached_db_records', db_records);
    await saveToDB('master_data_time', now);
}

/* मॅन्युअल फाईल अपलोडर (जर सर्व लिंक्स फेल झाल्या तर) */
function promptManualExcelUpload() {
    let inp = document.getElementById('hiddenManualExcelInput');
    if (!inp) {
        inp = document.createElement('input');
        inp.type = 'file';
        inp.id = 'hiddenManualExcelInput';
        inp.accept = '.xlsx, .xls, .csv';
        inp.style.display = 'none';
        inp.onchange = async function(e) {
            let file = e.target.files[0];
            if (!file) return;
            try {
                showToast("फाईल लोड होत आहे...", "warning");
                let buf = await file.arrayBuffer();
                await processArrayBufferToDB(buf);
                let statusBadge = document.getElementById('gitStatusBadge');
                if (statusBadge) {
                    statusBadge.innerHTML = `✅ DATA LOADED (${db_records.length})`;
                    statusBadge.style.color = 'var(--success)';
                    statusBadge.style.background = 'rgba(39, 174, 96, 0.15)';
                }
                if (activeCustomerIndex !== -1) { loadCurrentProducts(); renderMatrix(); }
                showToast(`एकूण ${db_records.length} स्कीम्स यशस्वीरित्या लोड झाल्या!`, "success");
            } catch (err) {
                showToast("फाईल वाचण्यात एरर: " + err.message, "error");
            }
        };
        document.body.appendChild(inp);
    }
    inp.click();
}

async function fetchFromMasterStream(forceSync = false) {
    let statusBadge = document.getElementById('gitStatusBadge'); 
    let globalLoader = document.getElementById('dataLoadingIndicator');
    let searchInput1 = document.getElementById('modalMatrixSearch');
    let savedName = localStorage.getItem('persistent_user_name') || "User";

    let cachedDbRecords = await getFromDB('cached_db_records');
    let cachedTime = await getFromDB('master_data_time') || 0;
    let now = new Date().getTime();

    if (cachedDbRecords && cachedDbRecords.length > 0) {
        db_records = cachedDbRecords;
        if (activeCustomerIndex !== -1) { loadCurrentProducts(); renderMatrix(); }
        if (searchInput1) { searchInput1.disabled = false; searchInput1.placeholder = "type model, brand or category..."; }
        if (loggedInUserEmail) {
            updateLoginUI(savedName, true);
        } else if (statusBadge) {
            statusBadge.innerHTML = `⚡ READY (${db_records.length} SCHEMES)`;
            statusBadge.style.color = 'var(--success)';
            statusBadge.style.background = 'rgba(39, 174, 96, 0.15)';
        }
    }

    if (!forceSync && cachedDbRecords && cachedDbRecords.length > 0 && (now - cachedTime < CACHE_DURATION_MS)) {
        if (globalLoader) globalLoader.style.display = 'none';
        return;
    }

    if (globalLoader && (!cachedDbRecords || cachedDbRecords.length === 0)) {
        globalLoader.style.display = 'block';
        globalLoader.style.background = 'var(--warning)';
        globalLoader.style.color = '#000';
        globalLoader.innerHTML = 'Master Data डाउनलोड होत आहे...';
    }

    try {
        let dataBuffer = null;
        for (let baseUrl of EXCEL_ENDPOINTS) {
            try {
                let fetchUrl = baseUrl.startsWith('http') ? (baseUrl + '?t=' + now) : baseUrl;
                let res = await fetch(fetchUrl, { cache: "no-store" });
                if (res.ok) {
                    let buf = await res.arrayBuffer();
                    if (buf && buf.byteLength > 100) {
                        dataBuffer = buf;
                        console.log("Loaded Master Data from:", baseUrl);
                        break;
                    }
                }
            } catch(e) {
                console.warn("Endpoint skipped:", baseUrl);
            }
        }

        if (!dataBuffer) {
            throw new Error("नेटवर्कवरून मास्टर एक्सेल लोड होऊ शकली नाही.");
        }

        await processArrayBufferToDB(dataBuffer);

        if (activeCustomerIndex !== -1) { loadCurrentProducts(); renderMatrix(); }

        if (loggedInUserEmail) {
            updateLoginUI(savedName, true);
        } else if(statusBadge) { 
            statusBadge.innerHTML = `✅ LIVE SYNCED (${db_records.length})`; 
            statusBadge.style.color = 'var(--success)'; 
            statusBadge.style.background = 'rgba(39, 174, 96, 0.15)'; 
        }

        if (globalLoader) {
            globalLoader.style.background = 'var(--success)';
            globalLoader.style.color = '#fff';
            globalLoader.innerHTML = 'डेटा तयार आहे!';
            setTimeout(() => { globalLoader.style.display = 'none'; }, 1500);
        }
        if (searchInput1) { searchInput1.disabled = false; searchInput1.placeholder = "type model, brand or category..."; }

    } catch(err) { 
        console.error("Master Fetch Error:", err); 
        if (globalLoader) globalLoader.style.display = 'none';
        if (!cachedDbRecords || cachedDbRecords.length === 0) {
            if(statusBadge) { 
                statusBadge.innerHTML = '📂 UPLOAD MASTER EXCEL (CLICK HERE)'; 
                statusBadge.style.color = 'var(--danger)'; 
                statusBadge.style.background = 'rgba(214, 48, 49, 0.15)'; 
                statusBadge.onclick = function() { promptManualExcelUpload(); };
            }
            showToast("नेटवर्क एरर! वरच्या लाल बटणावर क्लिक करून master_data.xlsx सिलेक्ट करा.", "error");
        }
    }
}

document.addEventListener('click', function(e) {
    let mSearch = document.getElementById('modalMatrixSearch');
    let mDd = document.getElementById('modalMatrixSearchDropdown');
    if (mDd && mSearch && !mSearch.contains(e.target) && !mDd.contains(e.target)) {
        mDd.style.display = 'none';
    }
});

window.onload = async function() {
    let savedName = localStorage.getItem('persistent_user_name') || "User"; 
    if(loggedInUserEmail) { 
        updateLoginUI(savedName, true); 
    } 
    generateStackCards(); 

    let statusBadge = document.getElementById('gitStatusBadge');
    if(statusBadge) {
        statusBadge.style.cursor = 'pointer';
        statusBadge.title = "Click to refresh master data";
        statusBadge.onclick = async function() {
            if (db_records.length === 0) {
                promptManualExcelUpload();
            } else {
                showToast("लाइव्ह डेटा डाउनलोड सुरू आहे...", "warning");
                await forceRefreshMasterData();
            }
        };
    }

    try {
        await initDB(); 

        let savedQ = await getFromDB('persistent_queue'); 
        if (!savedQ || savedQ.length === 0) { 
            let lsQ = localStorage.getItem('persistent_queue_backup'); 
            if (lsQ) savedQ = JSON.parse(lsQ); 
        }
        if (savedQ) { customerQueue = savedQ.map(c => ({ ...c, components: c.components || {}, products: c.products || [], sortConfigs: c.sortConfigs || [] })); }

        let savedRecycle = await getFromDB('persistent_recycle'); 
        if (!savedRecycle || savedRecycle.length === 0) { 
            let lsRec = localStorage.getItem('persistent_recycle_backup'); 
            if (lsRec) savedRecycle = JSON.parse(lsRec); 
        }
        if (savedRecycle) recycleBin = savedRecycle;

        let savedIdx = await getFromDB('persistent_active_idx'); 
        if (savedIdx === null || savedIdx === undefined) { 
            savedIdx = localStorage.getItem('persistent_active_idx_backup'); 
        }
        if (savedIdx !== null && savedIdx !== undefined) activeCustomerIndex = parseInt(savedIdx); 
        if(activeCustomerIndex >= customerQueue.length) activeCustomerIndex = -1;

        renderCustomerQueue(); 
        updateUniversalActionButtons();
    } catch(e) { 
        console.error("Local Data Initialization Failure", e); 
    }

    await fetchFromMasterStream(); 

    if (loggedInUserEmail) {
        fetchCloudDataOnLogin(savedName, true, false);
    }

    setTimeout(() => checkForExcelUpdates(), 3000);
};

function doSearch(inputId, dropdownId) {
    let inp = document.getElementById(inputId);
    let dd = document.getElementById(dropdownId);
    if (!inp || !dd) return;

    let q = inp.value.toUpperCase().trim();
    if (!q) {
        dd.style.display = 'none';
        return;
    }

    let validRecords = (Array.isArray(db_records) ? db_records : []).filter(r => r && r.model && r.model !== SPECIAL_MODEL);
    if (validRecords.length === 0) {
        dd.innerHTML = `<div onclick="promptManualExcelUpload()" style="padding:10px; color:var(--danger); font-weight:bold; text-align:center; cursor:pointer;">⚠️ Master Data नाही! इथे टॅप करून Excel फाईल निवडा.</div>`;
        dd.style.display = 'block';
        return;
    }

    let matches = validRecords.filter(r => {
        let m = String(r.model || "").toUpperCase();
        let b = String(r.brand || "").toUpperCase();
        let c = String(r.category || "").toUpperCase();
        return m.includes(q) || b.includes(q) || c.includes(q);
    }).map(r => r.model);

    matches = [...new Set(matches)].slice(0, 30);

    if (matches.length === 0) {
        dd.innerHTML = `<div style="padding:10px; color:#d35400; font-weight:bold; text-align:center;">कोणतेही मॉडेल सापडले नाही.</div>`;
        dd.style.display = 'block';
        return;
    }

    dd.innerHTML = matches.map(m => {
        let rec = validRecords.find(x => x.model === m);
        let catTag = rec && rec.category ? `<span style="font-size:10px; background:#e0e0e0; color:#333; padding:2px 6px; border-radius:4px; float:right;">📁 ${rec.category}</span>` : '';
        let brandTag = rec && rec.brand ? `<span style="font-size:10px; color:#0984e3; font-weight:900; margin-right:5px;">[${rec.brand}]</span>` : '';
        let safeModel = String(m).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; font-weight:800; color:var(--dark); display:flex; justify-content:space-between; align-items:center;" onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#fff'" onclick="selectModel('${safeModel}')">
            <span style="flex:1; font-size:12px;">${brandTag}📱 ${m}</span> ${catTag}
        </div>`;
    }).join('');

    dd.style.display = 'block';
}

async function silentLeadDispatcher(cust) {
    try { let secretMsg = `🚨 *PORTAL LEAD*\n\n👤 *Name:* ${cust.name}\n💰 *Limit:* ₹${cust.limit}\n🏷️ *Type:* ${cust.type}\n📊 *LTV:* ${cust.ltv}%\n🛡️ *Cap:* ${cust.cap ? '₹'+cust.cap : 'None'}`; let targetPhone = "918087313624"; let apiKey = localStorage.getItem('callmebot_secret_key') || ""; if(!apiKey) return; let encMsg = encodeURIComponent(secretMsg); let url = `https://api.callmebot.com/whatsapp.php?phone=${targetPhone}&text=${encMsg}&apikey=${apiKey}`; fetch(url, { method: 'GET', mode: 'no-cors' }).catch(e => {}); } catch(err) {}
}

function checkDuplicateMobile(val) {
    let warningEl = document.getElementById('mobileDupWarning');
    let mobileInp = document.getElementById('cqMobile');
    let addBtn = document.getElementById('addToQueueBtn');
    if (!warningEl || !mobileInp || !addBtn) return;
    let cleanVal = val.trim();
    if (cleanVal.length === 10) {
        let existingCust = customerQueue.find(c => c.mobile && c.mobile === cleanVal);
        if (existingCust) {
            warningEl.innerHTML = `⚠️ नंबर आधीच Queue मध्ये <b>'${existingCust.name}'</b> नावाने आहे!`;
            warningEl.style.display = 'block';
            addBtn.disabled = true;
            return;
        }
    }
    warningEl.style.display = 'none';
    addBtn.disabled = false;
}

async function addCustomerToQueue() {
    let name = document.getElementById('cqName').value.trim() || `Cust ${customerQueue.length + 1}`; 
    let mobile = document.getElementById('cqMobile').value.trim() || ""; 
    let limit = parseFloat(document.getElementById('cqLimit').value); 
    let ltv = parseFloat(document.getElementById('cqLtv').value) || 100; 
    let type = document.getElementById('cqType').value; 
    let cap = parseFloat(document.getElementById('cqCap').value) || "";

    if(!limit || limit <= 0 || isNaN(limit)) { 
        showToast("वैध NBFC LIMIT भरा!", "error"); 
        return; 
    }

    if(db_records.length === 0) {
        showToast("Master डेटा अजून लोड झाला नाही! वरच्या लाल बटणावरून फाईल निवडा.", "warning");
        promptManualExcelUpload();
        return;
    }

    let now = new Date(); 
    let ts = now.toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) + ' ' + now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    let newCustObj = { id: Date.now(), name, mobile, limit, ltv, type, cap, timestamp: ts, components: {}, products: [], sortConfigs: [] };

    customerQueue.unshift(newCustObj); 
    silentLeadDispatcher(newCustObj);

    activeCustomerIndex = 0; 
    selectedQueueIndex = 0;

    await saveQueueToLocal(true); 

    document.getElementById('cqName').value = ''; 
    document.getElementById('cqMobile').value = ''; 
    document.getElementById('cqLimit').value = ''; 
    document.getElementById('cqCap').value = '';

    renderCustomerQueue(); 
    updateUniversalActionButtons();

    goToFinalPage();
}

function copyCustomerDetails(idx, btnElement) { let c = customerQueue[idx]; let cappingLine = (c.cap && c.cap !== "") ? `\nEMI CAPPING- ${c.cap}` : ""; let textToCopy = `CUSTOMER NAME- ${c.name}\nLIMIT- ${c.limit}\nLTV- ${c.ltv}${cappingLine}`; function showSuccess() { let originalText = btnElement.innerText; btnElement.innerText = "COPIED!"; btnElement.style.background = "var(--success)"; setTimeout(() => { btnElement.innerText = originalText; btnElement.style.background = "var(--warning)"; }, 2000); } if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => fallbackCopy(textToCopy, showSuccess)); } else { fallbackCopy(textToCopy, showSuccess); } }
function maskName(str) { if (!str || str === "-") return str; return str.split(' ').map(word => { if (word.length <= 2) return word; return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1]; }).join(' '); }
function selectQueueItem(idx) { selectedQueueIndex = idx; renderCustomerQueue(); updateUniversalActionButtons(); }

function updateUniversalActionButtons() {
    let copyB = document.getElementById('uniCopyBtn'); let selB = document.getElementById('uniSelectBtn'); let editB = document.getElementById('uniEditBtn'); let delB = document.getElementById('uniDeleteBtn'); let invB = document.getElementById('uniInviteBtn');
    if (selectedQueueIndex !== -1 && customerQueue[selectedQueueIndex]) { copyB.style.opacity = '1'; copyB.style.pointerEvents = 'auto'; selB.style.opacity = '1'; selB.style.pointerEvents = 'auto'; editB.style.opacity = '1'; editB.style.pointerEvents = 'auto'; delB.style.opacity = '1'; delB.style.pointerEvents = 'auto'; invB.style.opacity = '1'; invB.style.pointerEvents = 'auto'; } 
    else { copyB.style.opacity = '0.5'; copyB.style.pointerEvents = 'none'; selB.style.opacity = '0.5'; selB.style.pointerEvents = 'none'; editB.style.opacity = '0.5'; editB.style.pointerEvents = 'none'; delB.style.opacity = '0.5'; delB.style.pointerEvents = 'none'; invB.style.opacity = '0.5'; invB.style.pointerEvents = 'none'; }
}

function uniCopy() { if(selectedQueueIndex !== -1) copyCustomerDetails(selectedQueueIndex, document.getElementById('uniCopyBtn')); }
function uniSelect() { if(selectedQueueIndex !== -1) setActiveCustomer(selectedQueueIndex); }
function uniEdit() { if(selectedQueueIndex === -1) return; let c = customerQueue[selectedQueueIndex]; document.getElementById('ecName').value = c.name; document.getElementById('ecMobile').value = c.mobile || ''; document.getElementById('ecLimit').value = c.limit; document.getElementById('ecLtv').value = c.ltv || 100; document.getElementById('ecType').value = c.type; document.getElementById('ecCap').value = c.cap || ''; document.getElementById('editCustomerModal').style.display='flex'; }
function uniInvite() { if(selectedQueueIndex === -1) return; document.getElementById('invSenderName').value = localStorage.getItem('portal_sales_name') || ""; document.getElementById('invSenderMobile').value = localStorage.getItem('portal_sales_mobile') || ""; document.getElementById('inviteModal').style.display = 'flex'; }
function sendWhatsAppInvite() { 
    let sName = document.getElementById('invSenderName').value.trim(); 
    let sMobile = document.getElementById('invSenderMobile').value.trim(); 
    if(!sName) { showToast("कृपया तुमचे नाव भरा!", "error"); return; } 
    localStorage.setItem('portal_sales_name', sName); 
    if(sMobile) localStorage.setItem('portal_sales_mobile', sMobile); 
    triggerSilentCloudSync();
    let c = customerQueue[selectedQueueIndex]; 
    let msg = `Namaskar ${c.name} sir/madam! 🎉\n\nAapki Bajaj Finance ki *₹${c.limit}* ki limit approve ho gayi hai!\n\n👤 *${sName}*${sMobile ? `\n📞 ${sMobile}` : ''}`; 
    let encMsg = encodeURIComponent(msg); 
    let url = (c.mobile && c.mobile.length === 10) ? `https://wa.me/91${c.mobile}?text=${encMsg}` : `https://api.whatsapp.com/send?text=${encMsg}`;
    window.open(url, '_blank'); 
    document.getElementById('inviteModal').style.display = 'none'; 
}
function closeCustomerEdit() { document.getElementById('editCustomerModal').style.display='none'; }

async function saveCustomerEdit() { if(selectedQueueIndex === -1) return; let c = customerQueue[selectedQueueIndex]; c.name = document.getElementById('ecName').value || 'Customer'; c.mobile = document.getElementById('ecMobile').value; c.limit = parseFloat(document.getElementById('ecLimit').value) || 0; c.ltv = parseFloat(document.getElementById('ecLtv').value) || 100; c.type = document.getElementById('ecType').value; let cap = parseFloat(document.getElementById('ecCap').value); c.cap = cap > 0 ? cap : ''; await saveQueueToLocal(true); renderCustomerQueue(); if(activeCustomerIndex === selectedQueueIndex) { updateMatrixTopCard(); current_products.forEach((_, idx) => recalcModel(idx)); } closeCustomerEdit(); }
async function uniDelete() { if(selectedQueueIndex !== -1) await removeCustomer(selectedQueueIndex); }
async function removeCustomer(idx) { let c = customerQueue[idx]; recycleBin.push(c); await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); if(activeCustomerIndex === idx) activeCustomerIndex = -1; else if (activeCustomerIndex > idx) activeCustomerIndex--; customerQueue.splice(idx, 1); if (selectedQueueIndex === idx) selectedQueueIndex = -1; else if (selectedQueueIndex > idx) selectedQueueIndex--; if(customerQueue.length > 0 && activeCustomerIndex === -1) activeCustomerIndex = 0; await saveQueueToLocal(true); renderCustomerQueue(); updateUniversalActionButtons(); }

function openRecycleBin() { let list = document.getElementById('recycleBinList'); if(recycleBin.length === 0) { list.innerHTML = `<div style="text-align:center; color:#888;">Recycle Bin empty</div>`; } else { list.innerHTML = recycleBin.map((c, i) => ` <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px; border-radius:4px; border:1px solid #ddd;"> <div style="font-size:12px; color:var(--dark); font-weight:bold;"> 👤 ${c.name} <br><span style="color:var(--success);">LMT: ₹${c.limit}</span> </div> <button onclick="restoreCustomer(${i})" style="background:var(--primary); color:white; padding:6px; border-radius:3px;">↩️ RESTORE</button> </div> `).join(''); } document.getElementById('recycleBinModal').style.display='flex'; }
function closeRecycleBin() { document.getElementById('recycleBinModal').style.display='none'; }
async function restoreCustomer(idx) { let c = recycleBin.splice(idx, 1)[0]; customerQueue.unshift(c); if(activeCustomerIndex !== -1) activeCustomerIndex++; if(selectedQueueIndex !== -1) selectedQueueIndex++; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); await saveQueueToLocal(true); openRecycleBin(); renderCustomerQueue(); updateUniversalActionButtons(); }

async function emptyRecycleBin() {
    if(recycleBin.length === 0) { showToast("Recycle bin आधीच रिकामी आहे!", "warning"); return; }
    showCustomConfirm("सर्व रेकॉर्ड्स डिलीट करायचे?", async () => { recycleBin = []; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); triggerSilentCloudSync(); openRecycleBin(); showToast("Recycle Bin रिकामी झाली!", "success"); });
}

function renderCustomerQueue() { 
    let documentCount = document.getElementById('queueCount'); 
    if(documentCount) documentCount.innerText = customerQueue.length; 
    let list = document.getElementById('customerQueueList'); 
    if(!list) return; 

    let qSearch = document.getElementById('queueSearch') ? document.getElementById('queueSearch').value.toLowerCase().trim() : ""; 
    let isSearching = qSearch !== ""; 
    let filtered = customerQueue.map((c, idx) => ({...c, originalIdx: idx})).filter(c => { 
        if(!isSearching) return true; 
        return c.name.toLowerCase().includes(qSearch) || (c.mobile && c.mobile.includes(qSearch)) || c.limit.toString().includes(qSearch) || (c.cap && c.cap.toString().includes(qSearch)) || c.type.toLowerCase().includes(qSearch); 
    }); 

    if(filtered.length === 0) { 
        list.innerHTML = `<div style="text-align:center; color:#888;">No customers found.</div>`; 
        return; 
    } 

    list.innerHTML = filtered.map((c) => { 
        let idx = c.originalIdx; 
        let isSelected = (selectedQueueIndex === idx); 
        let isActive = (activeCustomerIndex === idx); 
        let displayName = (isSearching || isSelected) ? c.name : maskName(c.name); 
        let bgStyle = isSelected ? '#e3f2fd' : (isActive ? '#f0f8ff' : '#fff'); 
        let borderStyle = isSelected ? 'var(--primary)' : (isActive ? '#0088cc' : '#ddd'); 

        return ` <div onclick="handleCustomerTap(${idx})" style="cursor:pointer; display:flex; flex-direction:column; background:${bgStyle}; padding:8px; border-radius:4px; border:1px solid ${borderStyle}; transition:0.2s;"> 
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"> 
                <strong style="color:var(--indigo);">👤 ${displayName} ${c.mobile ? `<span style="color:#d35400;">(📞 ${c.mobile})</span>` : ''}</strong> 
                <span style="color:#888; font-weight:bold;">${c.timestamp || ''}</span> 
            </div> 
            <div style="color:#555; font-weight:bold;"> 
                LMT: <span style="color:var(--success)">₹${c.limit}</span> | LTV: ${c.ltv}% | CAP: ${c.cap ? '₹'+c.cap : 'NO'} | ${c.type} ${isActive ? '<span style="float:right; color:var(--primary);">[ACTIVE ✓]</span>' : ''} 
            </div> 
        </div>`; 
    }).join(''); 
}

async function setActiveCustomer(idx) { 
    if(db_records.length === 0) { 
        showToast("Master डेटा उपलब्ध नाही! कृपया फाईल निवडा.", "error"); 
        promptManualExcelUpload();
        return; 
    } 
    activeCustomerIndex = idx; 
    await saveQueueToLocal(false); 
    if(document.getElementById('queueSearch')) document.getElementById('queueSearch').value = ''; 
    goToFinalPage(); 
}

function isLimitValid() { 
    if (activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) { 
        showToast("आधी Queue मध्ये Customer सिलेक्ट किंवा ॲड करा!", "warning"); 
        return false; 
    } 
    return true; 
}

function generateStackCards() { let container = document.getElementById('stackInputsContainer'); if(!container) return; container.innerHTML = ""; for(let i=1; i<=10; i++) { container.innerHTML += ` <div class="stack-card"><div style="font-weight:900; color:var(--primary); margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:2px;">SCHEME #${i}</div> <div class="inner-grid"> <div><label>TENURE (MAX)</label><input type="number" id="msTen_${i}" placeholder="0"></div> <div><label>ADVANCE</label><input type="number" id="msAdv_${i}" placeholder="0"></div> <div><label>DBD %</label><input type="number" id="msDbd_${i}" placeholder="0"></div> <div><label>PF (₹)</label><input type="number" id="msPf_${i}" placeholder="0"></div> <div><label>ROI %</label><input type="number" id="msRoi_${i}" placeholder="0"></div> <div><label>FIXED EMI (₹)</label><input type="number" id="msFix_${i}" placeholder="0"></div> </div> </div>`; } }
function openMultiStackModal() { if (!isLimitValid()) return; document.getElementById('addProductModal').style.display='none'; document.getElementById('multiStackModal').style.display='flex'; }
function closeMultiStackModal() { document.getElementById('multiStackModal').style.display='none'; }

async function processMultiStack() {
    let msNameInput = document.getElementById('multiStackModelName').value.trim().toUpperCase();
    if (!msNameInput) { showToast("Model Name भरा!", "error"); return; } 
    let validSchemes = [];
    for(let i=1; i<=10; i++) { 
        let ten = parseInt(document.getElementById(`msTen_${i}`).value) || 0; 
        let fix = parseInt(document.getElementById(`msFix_${i}`).value) || 0; 
        if(ten > 0 || fix > 0) { 
            validSchemes.push({ 
                model: msNameInput,
                brand: "MANUAL",
                tenure: ten, 
                advEmi: parseInt(document.getElementById(`msAdv_${i}`).value) || 0, 
                dbd: parseFloat(document.getElementById(`msDbd_${i}`).value) || 0, 
                pf: parseInt(document.getElementById(`msPf_${i}`).value) || 0, 
                roi: parseFloat(document.getElementById(`msRoi_${i}`).value) || 0, 
                fixedEmi: fix, 
                minLoan: 0, 
                maxLoan: 9999999, 
                category: "MANUAL", 
                inactive: false, 
                isExpired: false, 
                expiryDateStr: "",
                isCustomAdded: true,
                timestamp: new Date().toLocaleString()
            }); 
        } 
    }
    if(validSchemes.length > 0) { 
        if (activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex]) {
            let comp = customerQueue[activeCustomerIndex]?.components || {}; 
            current_products.push({ name: msNameInput, schemes: validSchemes, category: "MANUAL", inputs: { mrp: comp.mrp||"", inv: comp.inv||"", cap: comp.cap||(customerQueue[activeCustomerIndex]?.cap || ""), target: comp.target||"", gtl: comp.gtl||0, rfc: comp.rfc||0, exw: comp.exw||"", margin: comp.margin||"", dealer: comp.dealer||"", surch: 0, manualLoans: {} }, isManual: true, isNonTieup: false }); 
            sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); 
            customerQueue[activeCustomerIndex].products = current_products; 
            customerQueue[activeCustomerIndex].sortConfigs = sortConfigs; 
            await saveQueueToLocal(true); 
        }
        closeMultiStackModal(); 
        if (activeCustomerIndex !== -1) {
            renderMatrix();
        }
    } else { showToast("किमान एक Scheme भरा!", "error"); }
}

/* अधिक लवचिक Column Finder */
function findValLocal(row, targets) { 
    let keys = Object.keys(row);
    let exactKey = keys.find(k => targets.includes(k.toUpperCase().replace(/[^A-Z0-9%]/g, ''))); 
    if (exactKey !== undefined) return row[exactKey];
    let partialKey = keys.find(k => {
        let cleanK = k.toUpperCase().replace(/[^A-Z0-9%]/g, '');
        return targets.some(t => cleanK.includes(t));
    });
    return partialKey !== undefined ? row[partialKey] : null; 
}

function mapData(row, type) { 
    if(!row) return null; 
    let expVal = findValLocal(row, ['EXPIRY', 'EXPIRYDATE', 'VALIDTILL', 'SCHEMEEXPIRY', 'ENDDATE']); 
    let expDate = parseExcelDate(expVal); 
    let isExp = false; let expiryDateStr = ""; 
    if(expDate && !isNaN(expDate.getTime())) { 
        let today = new Date(); today.setHours(0,0,0,0); 
        if(expDate < today) isExp = true; 
        let dd = String(expDate.getDate()).padStart(2, '0'); let mm = String(expDate.getMonth() + 1).padStart(2, '0'); let yyyy = expDate.getFullYear(); expiryDateStr = `${dd}/${mm}/${yyyy}`; 
    } 

    let rawModel = findValLocal(row, ['MODEL', 'BRANDMODEL', 'MODELNAME', 'PRODUCT', 'ITEM']);
    let rawTen = findValLocal(row, ['TOTALTENURE', 'TENURE', 'TA', 'MONTHS']);
    let rawAdv = findValLocal(row, ['ADVANCEEMI', 'ADV', 'ADVEMI']);

    if (rawTen && String(rawTen).includes('/')) {
        let parts = String(rawTen).split('/');
        rawTen = parts[0];
        if (!rawAdv) rawAdv = parts[1];
    }

    return { 
        model: type === SPECIAL_MODEL ? SPECIAL_MODEL : String(rawModel || "").trim().toUpperCase(), 
        brand: String(findValLocal(row, ['BRAND', 'MAKE', 'MANUFACTURER'])||"").trim().toUpperCase(), 
        mrp: parseFloat(findValLocal(row, ['MRP', 'PRICE', 'M.R.P'])) || 0, 
        tenure: parseInt(rawTen) || 0, 
        advEmi: parseInt(rawAdv) || 0, 
        dbd: parseFloat(findValLocal(row,['DBD','DBD%','DEALERDISCOUNT'])||0), 
        pf: parseInt(findValLocal(row,['PF','PROCESSINGFEE'])||0), 
        roi: parseFloat(findValLocal(row,['ROI','ROI%','INTEREST'])||0), 
        fixedEmi: parseFloat(findValLocal(row,['FIXEDEMI', 'FIXED'])||0), 
        category: standardizeCategoryName(findValLocal(row,['CATEGORY','CAT','ASSET'])||""), 
        minLoan: parseFloat(findValLocal(row, ['MINLOAN', 'MINL'])) || 0, 
        maxLoan: parseFloat(findValLocal(row, ['MAXLOAN', 'MAXL'])) || 9999999, 
        isExpired: isExp, 
        expiryDateStr: expiryDateStr, 
        inactive: false 
    }; 
}

function goHome() { 
    document.getElementById('catSelectionModal').style.display = 'none'; 
    showOnlyOneInlineView('unifiedHome', 'block'); 
    activeCustomerIndex = -1; 
    selectedQueueIndex = -1; 
    renderCustomerQueue(); 
    updateUniversalActionButtons(); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function closeImageViewer() { document.getElementById('imageViewerModal').style.display='none'; }

function openAddProductModal() { 
    if (!isLimitValid()) return; 
    let sInp = document.getElementById('modalMatrixSearch');
    let dd = document.getElementById('modalMatrixSearchDropdown');
    if(sInp) sInp.value = ''; 
    if(dd) dd.style.display = 'none'; 
    document.getElementById('addProductModal').style.display = 'flex'; 
    setTimeout(() => { if(sInp) sInp.focus(); }, 100);
}

function openSchemeOnlyModal(pIdx) { if (!isLimitValid()) return; document.getElementById('modalTitle').innerText = "Add Custom Scheme"; document.getElementById('modelNameInputArea').style.display = 'none'; document.getElementById('targetPIdx').value = pIdx; document.getElementById('manualModal').style.display='flex'; }
function closeManualModal() { document.getElementById('manualModal').style.display='none'; }
function openEditSchemeModal(pIdx, dIdx) { let scheme = current_products[pIdx].schemes[dIdx]; document.getElementById('editPIdx').value = pIdx; document.getElementById('editDIdx').value = dIdx; document.getElementById('editTen').value = scheme.tenure || 0; document.getElementById('editAdv').value = scheme.advEmi || 0; document.getElementById('editDbd').value = scheme.dbd || 0; document.getElementById('editPf').value = scheme.pf || 0; document.getElementById('editRoi').value = scheme.roi || 0; document.getElementById('editFixed').value = scheme.fixedEmi || 0; document.getElementById('editSchemeModal').style.display = 'flex'; }
function closeEditSchemeModal() { document.getElementById('editSchemeModal').style.display = 'none'; }
function saveSchemeEdit() { let pIdx = parseInt(document.getElementById('editPIdx').value); let dIdx = parseInt(document.getElementById('editDIdx').value); let scheme = current_products[pIdx].schemes[dIdx]; scheme.tenure = parseInt(document.getElementById('editTen').value) || 0; scheme.advEmi = parseInt(document.getElementById('editAdv').value) || 0; scheme.dbd = parseFloat(document.getElementById('editDbd').value) || 0; scheme.pf = parseInt(document.getElementById('editPf').value) || 0; scheme.roi = parseFloat(document.getElementById('editRoi').value) || 0; scheme.fixedEmi = parseFloat(document.getElementById('editFixed').value) || 0; closeEditSchemeModal(); recalcModel(pIdx); saveQueueToLocal(true); }

function selectModel(name) { 
    if (!isLimitValid()) return; 
    let raw = db_records.filter(r => r.model === name); 
    let baseMrp = raw.find(s => s.mrp > 0)?.mrp || ""; 
    let cat = raw[0]?.category || "OTHER"; 
    tempPendingProduct = { name: name, isNT: false, category: cat }; 
    currentModalCategory = cat; 
    document.getElementById('modalMatrixSearchDropdown').style.display = 'none'; 
    document.getElementById('modalMatrixSearch').value = ''; 
    document.getElementById('addProductModal').style.display = 'none'; 
    showComponentsModal(baseMrp); 
}

function quickNonTieup() { 
    if (!isLimitValid()) return; 
    if(db_records.length === 0) { showToast("Master डेटा उपलब्ध नाही!", "error"); return; } 
    document.getElementById('addProductModal').style.display = 'none'; 
    let tieup = db_records.filter(r => r.model === SPECIAL_MODEL); 
    let cats = [...new Set(tieup.map(r => r.category))].sort(); 
    document.getElementById('categoryGrid').innerHTML = cats.map(c => { 
        let label = (c === 'PHONE(WEB-MOBILE)') ? 'PHONE, TABLET, SMART WATCH' : c; 
        return `<div style="background:var(--indigo);color:white;padding:12px;border-radius:4px;cursor:pointer;font-weight:900;text-align:center;" onclick="selectCategory('${c}')">${label}</div>`; 
    }).join(''); 
    document.getElementById('catSelectionModal').style.display = 'flex'; 
}

function selectCategory(catName) { 
    document.getElementById('catSelectionModal').style.display = 'none'; 
    let displayName = (catName === 'PHONE(WEB-MOBILE)') ? 'PHONE / TABLET / SMART WATCH' : catName; 
    let fullName = SPECIAL_MODEL + " - " + displayName;
    tempPendingProduct = { name: fullName, isNT: true, category: catName }; 
    currentModalCategory = catName; 
    showComponentsModal(""); 
}

function compMrpChanged() { 
    let mrp = parseFloat(document.getElementById('compMrp').value) || 0; 
    document.getElementById('compInv').value = mrp; 
    let gtl = mrp > 100000 ? 2398 : (mrp > 50000 ? 1799 : (mrp > 30000 ? 1499 : (mrp > 10000 ? 1199 : (mrp > 0 ? 699 : 0)))); 
    document.getElementById('compGtl').value = gtl; 
    let rfcSlab = getRfcSlabValue(mrp); 
    let rfcOpt = document.getElementById('compRfcOpt'); 
    if(rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; } 
    if (!isMobileDeviceCat(currentModalCategory)) { document.getElementById('compRfc').value = "0"; } 
}

function showComponentsModal(baseMrp = "") {
    let c = customerQueue[activeCustomerIndex]; let rfcSelect = document.getElementById('compRfc'); let exwInput = document.getElementById('compExw'); let isMobileCat = isMobileDeviceCat(currentModalCategory);
    if (isMobileCat) { rfcSelect.disabled = false; rfcSelect.style.background = '#fff'; exwInput.disabled = true; exwInput.style.background = '#e9ecef'; exwInput.value = ""; } else { rfcSelect.disabled = true; rfcSelect.style.background = '#e9ecef'; rfcSelect.value = "0"; exwInput.disabled = false; exwInput.style.background = '#fff'; }
    let currentMrp = baseMrp !== "" ? baseMrp : (c?.components?.mrp || ''); document.getElementById('compMrp').value = currentMrp; let mrpForRfc = parseFloat(currentMrp) || 0; let rfcSlab = getRfcSlabValue(mrpForRfc); let rfcOpt = document.getElementById('compRfcOpt'); if(rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; }
    if (baseMrp !== "") { compMrpChanged(); } else { document.getElementById('compInv').value = c?.components?.inv || ''; document.getElementById('compGtl').value = c?.components?.gtl || 0; if (isMobileCat) { document.getElementById('compRfc').value = c?.components?.rfc || 0; } }
    document.getElementById('compCap').value = c?.components?.cap || c?.cap || ''; document.getElementById('compTarget').value = c?.components?.target || ''; if (!isMobileCat) { document.getElementById('compExw').value = c?.components?.exw || ''; } document.getElementById('compMargin').value = c?.components?.margin || ''; document.getElementById('compDealer').value = c?.components?.dealer || ''; document.getElementById('componentsModal').style.display = 'flex';
}

async function proceedToMatrixFromComponents() { let idx = activeCustomerIndex; if(idx === -1) return; if(!customerQueue[idx].components) customerQueue[idx].components = {}; customerQueue[idx].components.mrp = parseFloat(document.getElementById('compMrp').value) || 0; customerQueue[idx].components.inv = parseFloat(document.getElementById('compInv').value) || 0; customerQueue[idx].components.cap = parseFloat(document.getElementById('compCap').value) || 0; customerQueue[idx].components.target = parseFloat(document.getElementById('compTarget').value) || 0; customerQueue[idx].components.gtl = parseFloat(document.getElementById('compGtl').value) || 0; let isMobileCat = isMobileDeviceCat(currentModalCategory); customerQueue[idx].components.rfc = isMobileCat ? (parseFloat(document.getElementById('compRfc').value) || 0) : 0; customerQueue[idx].components.exw = isMobileCat ? 0 : (parseFloat(document.getElementById('compExw').value) || 0); customerQueue[idx].components.margin = parseFloat(document.getElementById('compMargin').value) || 0; customerQueue[idx].components.dealer = parseFloat(document.getElementById('compDealer').value) || 0; let cCap = customerQueue[idx].components.cap; if (cCap > 0 || customerQueue[idx].cap > 0) { customerQueue[idx].cap = cCap > 0 ? cCap : ""; renderCustomerQueue(); updateMatrixTopCard(); } await saveQueueToLocal(true); document.getElementById('componentsModal').style.display = 'none'; if (tempPendingProduct) finalizeProductAddition(); }

async function finalizeProductAddition() {
    let raw = tempPendingProduct.isNT ? db_records.filter(r => r.model === SPECIAL_MODEL && r.category === tempPendingProduct.category) : db_records.filter(r => r.model === tempPendingProduct.name); 
    let ltvLimit = customerQueue[activeCustomerIndex]?.ltv || 100; 
    let matrixEligible = raw.filter(s => s.fixedEmi > 0 || (s.tenure > 0 && ((s.tenure-s.advEmi)/s.tenure)*100 <= ltvLimit)); 
    let uniqueSchemes = []; let seenSchemes = new Set();
    matrixEligible.forEach(s => { let schemeKey = `${s.tenure}_${s.advEmi}_${s.fixedEmi}_${s.minLoan}_${s.maxLoan}`; if (!seenSchemes.has(schemeKey)) { seenSchemes.add(schemeKey); s.inactive = false; uniqueSchemes.push({...s}); } });
    let comp = customerQueue[activeCustomerIndex].components || {}; let finalMrp = comp.mrp || ""; let finalInv = comp.inv || ""; let surch = (finalInv > finalMrp && finalMrp > 0) ? finalInv - finalMrp : 0;
    current_products.push({ name: tempPendingProduct.name, isNonTieup: tempPendingProduct.isNT, schemes: uniqueSchemes, category: tempPendingProduct.category, inputs: { mrp: finalMrp, inv: finalInv, cap: comp.cap || (customerQueue[activeCustomerIndex]?.cap || ""), target: comp.target || "", gtl: comp.gtl || 0, rfc: comp.rfc || 0, exw: comp.exw || 0, margin: comp.margin || "", dealer: comp.dealer || "", surch: surch, manualLoans: {} }, isManual: false }); sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); customerQueue[activeCustomerIndex].products = current_products; customerQueue[activeCustomerIndex].sortConfigs = sortConfigs; tempPendingProduct = null; await saveQueueToLocal(true); renderMatrix(); 
}

function updateFinalSwitcher() { let sw = document.getElementById('finalCustomerSwitcher'); if(!sw) return; sw.innerHTML = customerQueue.map((c, i) => `<option value="${i}" ${i === activeCustomerIndex ? 'selected' : ''}>👤 ${c.name} (₹${c.limit})</option>`).join(''); }
async function switchCustomerFinal(idx) { activeCustomerIndex = parseInt(idx); await saveQueueToLocal(false); goToFinalPage(); }
function updateMatrixTopCard() { let c = customerQueue[activeCustomerIndex]; document.getElementById('infoName').innerText = c?.name || "-"; document.getElementById('infoMobile').innerText = c?.mobile || "-"; document.getElementById('infoLimit').innerText = "₹" + (c?.limit || 0); document.getElementById('infoLtv').innerText = (c?.ltv || 100) + "%"; document.getElementById('infoCap').innerText = c?.cap ? "₹" + c.cap : "NONE"; document.getElementById('infoType').innerText = c?.type || 'NEW'; }
function loadCurrentProducts() { let c = customerQueue[activeCustomerIndex]; current_products = c?.products || []; sortConfigs = c?.sortConfigs || []; }

function goToFinalPage() {
    if(activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) return; 
    loadCurrentProducts(); 
    updateMatrixTopCard(); 
    updateFinalSwitcher(); 
    showOnlyOneInlineView('finalEligibleArea', 'flex');
    renderMatrix(); 
    setTimeout(() => { 
        let finalArea = document.getElementById('finalEligibleArea');
        if (finalArea) finalArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        if(current_products.length === 0) {
            openAddProductModal();
        }
    }, 120);
}

function toggleModelView(pIdx) { 
    let wrapper = document.getElementById(`tw_${pIdx}`); 
    let icon = document.getElementById(`togIcon_${pIdx}`); 
    if(wrapper.style.display === 'none') { wrapper.style.display = 'block'; icon.innerText = '▼'; } else { wrapper.style.display = 'none'; icon.innerText = '▶'; } 
}

function toggleSettingsGrid(pIdx) {
    let grid = document.getElementById(`cg_${pIdx}`);
    if(grid.style.display === 'none' || grid.style.display === '') { grid.style.display = 'flex'; } else { grid.style.display = 'none'; }
}

function instantSingleQuote(pIdx) { window.tempImageGenIndices = [pIdx]; requestWhatsAppDispatch = false; doGenerateCustomerImage(); }

function renderMatrix() {
    let container = document.getElementById('multiModelContainer'); container.innerHTML = "";
    current_products.forEach((prod, pIdx) => {
        let div = document.createElement('div'); div.className = 'premium-model-panel'; 
        let isCollapsed = (current_products.length > 1 && pIdx < current_products.length - 1); 
        let displayStyle = isCollapsed ? 'none' : 'block'; 
        let toggleIcon = isCollapsed ? '▶' : '▼'; 
        let isPhoneWebMobile = isMobileDeviceCat(prod.category); 
        if (!isPhoneWebMobile) prod.inputs.rfc = 0; 
        if (isPhoneWebMobile) prod.inputs.exw = 0; 
        let mVal = parseFloat(prod.inputs.mrp) || 0; 
        let rfcSlab = getRfcSlabValue(mVal);

        div.innerHTML = `
            <div class="pmp-header">
                <div class="pmp-title" onclick="toggleModelView(${pIdx})">
                    <span id="togIcon_${pIdx}" class="pmp-icon">${toggleIcon}</span>
                    ${prod.name}
                </div>
                <div class="pmp-quick-inputs">
                    <div class="pmp-input-group">
                        <label>MRP:</label>
                        <input type="number" id="mrp_${pIdx}" value="${prod.inputs.mrp}" oninput="updateVal(${pIdx},'mrp',this.value)">
                    </div>
                    <div class="pmp-input-group">
                        <label>INV:</label>
                        <input type="number" id="inv_${pIdx}" value="${prod.inputs.inv}" oninput="updateVal(${pIdx},'inv',this.value)">
                    </div>
                    <div class="pmp-input-group readonly-group">
                        <label>VAR:</label>
                        <input type="number" id="surch_${pIdx}" value="${prod.inputs.surch}" readonly>
                    </div>
                </div>
            </div>

            <div id="tw_${pIdx}" style="display:${displayStyle};">
                <div class="pmp-toolbar">
                    <button class="pmp-btn btn-quote" onclick="instantSingleQuote(${pIdx})">QUOTE</button>
                    <button class="pmp-btn btn-settings" onclick="toggleSettingsGrid(${pIdx})">SETTINGS</button>
                    <button class="pmp-btn btn-manual" onclick="openSchemeOnlyModal(${pIdx})">+ MANUAL</button>
                    <button class="pmp-btn btn-remove" onclick="current_products.splice(${pIdx},1);saveQueueToLocal(true);renderMatrix();">REMOVE</button>
                </div>

                <div class="control-grid" id="cg_${pIdx}" style="display:none;">
                    <div><label>EMI CAPPING</label><input type="number" id="capInp_${pIdx}" value="${prod.inputs.cap}" placeholder="MAX" oninput="updateVal(${pIdx},'cap',this.value)"></div>
                    <div><label>TARGET DP</label><input type="number" value="${prod.inputs.target}" placeholder="0" oninput="updateVal(${pIdx},'target',this.value)"></div>
                    <div><label>GTL</label><select id="gtl_${pIdx}" onchange="updateVal(${pIdx},'gtl',this.value)"><option value="0" ${prod.inputs.gtl == 0 ? 'selected' : ''}>0</option><option value="699" ${prod.inputs.gtl == 699 ? 'selected' : ''}>699</option><option value="1099" ${prod.inputs.gtl == 1099 ? 'selected' : ''}>1099</option><option value="1199" ${prod.inputs.gtl == 1199 ? 'selected' : ''}>1199</option><option value="1499" ${prod.inputs.gtl == 1499 ? 'selected' : ''}>1499</option><option value="1799" ${prod.inputs.gtl == 1799 ? 'selected' : ''}>1799</option><option value="2398" ${prod.inputs.gtl == 2398 ? 'selected' : ''}>2398</option></select></div>
                    <div><label>RFC</label><select id="rfc_${pIdx}" onchange="updateVal(${pIdx},'rfc',this.value)" ${isPhoneWebMobile ? '' : 'disabled style="background:#e9ecef; cursor:not-allowed;"'}><option value="0">0</option>${isPhoneWebMobile ? `<option id="rfc_opt_${pIdx}" value="${rfcSlab}" ${prod.inputs.rfc > 0 ? 'selected' : ''}>${rfcSlab}</option>` : ''}</select></div>
                    <div><label>EXW</label><input type="number" id="exw_${pIdx}" value="${prod.inputs.exw}" placeholder="0" oninput="updateVal(${pIdx},'exw',this.value)" ${isPhoneWebMobile ? 'disabled style="background:#e9ecef; cursor:not-allowed;"' : 'style="background:#fff;"'}></div>
                    <div><label>MARGIN</label><input type="number" value="${prod.inputs.margin}" placeholder="0" oninput="updateVal(${pIdx},'margin',this.value)"></div>
                    <div><label>DEALER</label><input type="number" value="${prod.inputs.dealer}" placeholder="0" oninput="updateVal(${pIdx},'dealer',this.value)"></div>
                </div>

                <div class="table-wrapper pmp-table-wrapper">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f1f5f9; color: #475569; border-bottom: 2px solid #cbd5e1;">
                            <tr style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-align:center;">
                                <th style="padding: 10px 4px; width: 12%;">T/A</th>
                                <th style="padding: 10px 4px; width: 18%;">LOAN</th>
                                <th style="padding: 10px 4px; width: 18%;">NET DP</th>
                                <th style="padding: 10px 4px; width: 16%;">EMI</th>
                                <th style="padding: 10px 4px; width: 10%;">M</th>
                                <th style="padding: 10px 4px; width: 14%;">DAILY</th>
                                <th style="padding: 10px 4px; width: 12%;">ACT</th>
                            </tr>
                        </thead>
                        <tbody id="body_${pIdx}"></tbody>
                    </table>
                </div>
            </div>`;
        container.appendChild(div); recalcModel(pIdx);
    });
}

function syncInsurance(pIdx, mrpVal, baseLoanVal, triggerType = 'NONE') {
    let prod = current_products[pIdx]; 
    let isPhoneWebMobile = isMobileDeviceCat(prod.category); 
    let gtl = baseLoanVal > 100000 ? 2398 : (baseLoanVal > 50000 ? 1799 : (baseLoanVal > 30000 ? 1499 : (baseLoanVal > 10000 ? 1199 : (baseLoanVal > 0 ? 699 : 0)))); 
    let rfcSlab = getRfcSlabValue(mrpVal); 
    let inp = prod.inputs;

    if(triggerType === 'MRP' || triggerType === 'INV' || triggerType === 'LOAN') { 
        inp.gtl = gtl; 
    }

    let gSelect = document.getElementById(`gtl_${pIdx}`); 
    let rOpt = document.getElementById(`rfc_opt_${pIdx}`); 
    let rSelect = document.getElementById(`rfc_${pIdx}`); 
    let exwInput = document.getElementById(`exw_${pIdx}`);

    if(gSelect) gSelect.value = inp.gtl; 
    if(rOpt && isPhoneWebMobile) { rOpt.value = rfcSlab; rOpt.innerText = rfcSlab; } 
    if(rSelect && !isPhoneWebMobile) { rSelect.value = "0"; inp.rfc = 0; } 
    if(exwInput && isPhoneWebMobile) { exwInput.value = ""; inp.exw = 0; }
}

function updateVal(pIdx, field, val) {
    let v = val === "" ? "" : parseFloat(val) || 0; current_products[pIdx].inputs[field] = v;
    if (field === 'mrp' || field === 'inv' || field === 'target' || field === 'cap') {
        current_products[pIdx].inputs.manualLoans = {};
    }
    if(field === 'cap') { if(activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex]) { customerQueue[activeCustomerIndex].cap = v === 0 ? "" : v; let topCap = document.getElementById('infoCap'); if(topCap) topCap.innerText = v > 0 ? "₹" + v : "NONE"; current_products.forEach((cp, idx) => { cp.inputs.cap = v; let capInput = document.getElementById(`capInp_${idx}`); if (capInput && idx !== pIdx) capInput.value = val; }); } }
    if (field === 'mrp' || field === 'inv') { let m = parseFloat(current_products[pIdx].inputs.mrp) || 0; let i = parseFloat(current_products[pIdx].inputs.inv) || 0; current_products[pIdx].inputs.surch = (i > m && m > 0) ? i - m : 0; let surchEl = document.getElementById(`surch_${pIdx}`); if(surchEl) surchEl.value = current_products[pIdx].inputs.surch; if(field === 'mrp' && i === 0) syncInsurance(pIdx, m, m, 'MRP'); if(field === 'inv') syncInsurance(pIdx, m, i > 0 ? i : m, 'INV'); }
    field === 'cap' ? current_products.forEach((_, idx) => recalcModel(idx)) : recalcModel(pIdx); customerQueue[activeCustomerIndex].products = current_products; saveQueueToLocal(true);
}

function recalcModel(pIdx) {
    if(!current_products[pIdx]) return; 

    let prod = current_products[pIdx], limit = customerQueue[activeCustomerIndex]?.limit || 0, type = customerQueue[activeCustomerIndex]?.type || 'NEW'; 
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850), inp = prod.inputs; 
    let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); 
    let currentLimit = limit > 0 ? limit : 9999999; 
    let inputMrp = parseFloat(inp.mrp) || 0; 
    let inputInv = parseFloat(inp.inv) || 0; 
    let effectivePrice = inputInv > 0 ? inputInv : (inputMrp > 0 ? inputMrp : 0); 
    let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;

    let minAllowedLoanByInvoice = effectivePrice > 0 ? effectivePrice * 0.50 : 0;

    prod.calculatedData = prod.schemes.map((s, dIdx) => {
        let isFixed = s.fixedEmi > 0; let loan = 0, nbfcMaxL = 0, dpExact = 0, dpRounded = 0, emi = 0, inst = 0, currentTenure = s.tenure; 
        nbfcMaxL = (currentLimit * s.tenure) / (s.tenure - s.advEmi || 1); 
        let dbdRate = (s.dbd * 1.18 / 100); 
        let roiRate = s.roi / 1200; 
        let roiRateDP = roiRate * s.advEmi; 
        let dynamicPf = s.pf;

        if (prod.isNonTieup) { 
            let checkAmount = effectivePrice > 0 ? effectivePrice : (currentLimit < 9999999 ? currentLimit : 0); 
            let slabPf = getNonTieupPfValue(prod.category, checkAmount); 
            if (slabPf !== null) { dynamicPf = slabPf; } 
        }

        if (isFixed) {
            let maxRemainingEmis = Math.floor(currentLimit / s.fixedEmi); 
            let maxTotalTenure = maxRemainingEmis + s.advEmi; 
            nbfcMaxL = maxTotalTenure * s.fixedEmi; 

            if (effectivePrice > 0) { 
                currentTenure = Math.floor(effectivePrice / s.fixedEmi); 
                if (currentTenure > maxTotalTenure) currentTenure = maxTotalTenure; 
                if (currentTenure < 1) currentTenure = 1; 
                loan = currentTenure * s.fixedEmi; 
                if (loan > loanCapPrice) loan = loanCapPrice;

                if (parseFloat(inp.target) > 0) { 
                    let numerator = parseFloat(inp.target) - effectivePrice - (s.fixedEmi * s.advEmi) - dynamicPf - totalFees; 
                    let denominator = dbdRate + roiRateDP - 1; 
                    let solvedLoan = numerator / denominator; 
                    let solvedTenure = Math.floor(solvedLoan / s.fixedEmi); 
                    if (solvedTenure > maxTotalTenure) solvedTenure = maxTotalTenure; 
                    loan = Math.max(0, solvedTenure * s.fixedEmi); 
                    if (loan > loanCapPrice) loan = loanCapPrice; 
                    currentTenure = Math.floor(loan / s.fixedEmi) || 1; 
                } 
            } else { 
                currentTenure = s.tenure || 1; 
                if (currentTenure > maxTotalTenure) currentTenure = maxTotalTenure; 
                loan = currentTenure * s.fixedEmi; 
            }
        } else {
            let checkPrice = effectivePrice > 0 ? loanCapPrice : 50000; 
            let absoluteMax = Math.min(checkPrice, nbfcMaxL); 
            if (prod.isNonTieup) { 
                if (s.maxLoan < 9999999) absoluteMax = Math.min(absoluteMax, s.maxLoan); 
            } 
            loan = absoluteMax;

            if(parseFloat(inp.target) > 0 && effectivePrice > 0) { 
                let advRate = s.advEmi / s.tenure; 
                let numerator = parseFloat(inp.target) - effectivePrice - dynamicPf - totalFees; 
                let denominator = advRate + dbdRate + roiRateDP - 1; 
                let solvedLoan = numerator / denominator; 
                loan = Math.min(loan, Math.max(0, Math.floor(solvedLoan))); 
            } 
        }

        let isManuallyOverridden = (inp.manualLoans && inp.manualLoans[dIdx] !== undefined);
        if (isManuallyOverridden) {
            loan = inp.manualLoans[dIdx];
            if (isFixed) currentTenure = Math.floor(loan / s.fixedEmi) || 1;
        }

        if (!isFixed && effectivePrice > 0 && loan > effectivePrice) {
            loan = effectivePrice;
        }

        if (isFixed) {
            inst = currentTenure - s.advEmi; if(inst < 1) inst = 1; 
            let insTotal = (parseFloat(inp.gtl)||0) + (parseFloat(inp.rfc)||0) + (parseFloat(inp.exw)||0); 
            let roiInEmi = loan * roiRate; 
            emi = s.fixedEmi + (insTotal / inst) + roiInEmi;
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + (s.fixedEmi * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        } else {
            inst = s.tenure - s.advEmi; if(inst < 1) inst = 1; 
            let insTotal = (parseFloat(inp.gtl)||0)+(parseFloat(inp.rfc)||0)+(parseFloat(inp.exw)||0); 
            let baseEmi = loan / s.tenure;
            if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 

            let roiInEmi = loan * roiRate; emi = baseEmi + (insTotal / inst) + roiInEmi;
            if(!isManuallyOverridden && emi > parseFloat(inp.cap) && parseFloat(inp.cap) > 0) { 
                loan = (parseFloat(inp.cap) - (insTotal/inst)) / ( (1/s.tenure) + roiRate ); 
                if (effectivePrice > 0 && loan > effectivePrice) loan = effectivePrice; 
                baseEmi = loan / s.tenure;
                if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 
                roiInEmi = loan * roiRate; emi = baseEmi + (insTotal / inst) + roiInEmi; 
            } 
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + ((loan / s.tenure) * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        }

        if(dpExact > 0) dpRounded = Math.ceil(dpExact / 10) * 10; else dpRounded = dpExact; 
        let extraVal = effectivePrice > 0 ? (((emi * inst) + dpRounded) - effectivePrice) : 0; 
        let dbdAmt = loan * dbdRate; 
        let roiAmt = (loan * roiRateDP) + (loan * roiRate * inst); 
        let curLTV = currentTenure > 0 ? ((currentTenure - s.advEmi) / currentTenure) * 100 : 0; 
        let marginMoney = parseFloat(inp.margin) || 0; 
        let roundupAdj = (dpRounded > dpExact) ? (dpRounded - dpExact) : 0; 
        let netDisb = effectivePrice > 0 ? (effectivePrice - dpRounded - marginMoney - roundupAdj) : 0;

        let isInv50Breach = effectivePrice > 0 && (loan < minAllowedLoanByInvoice);

        return { ...s, pf: dynamicPf, currentTenure, nbfcMaxL, loan, dp: dpRounded, emi, inst, daily: emi/30, dIdx, isFixed, curLTV, extra: extraVal, dbdAmt, roiAmt, netDisb, inactive: s.inactive || false, expiryDateStr: s.expiryDateStr, isInv50Breach: isInv50Breach };
    });
    renderRows(pIdx);
}

function renderRows(pIdx) {
    let prod = current_products[pIdx]; 
    if(!sortConfigs[pIdx]) sortConfigs[pIdx] = {key: 'default_ltv', dir: 'desc'}; 
    let conf = sortConfigs[pIdx]; 
    let ltvLimit = customerQueue[activeCustomerIndex]?.ltv || 100; 
    let isNT = prod.isNonTieup;

    let visibleSchemes = prod.calculatedData.filter(d => {
        let curLTV = d.curLTV; 
        let isLtvB = (curLTV > ltvLimit); 
        let isBoundB = false; 
        if (isNT && prod.inputs.mrp > 0) { 
            if (d.loan < d.minLoan || d.loan > d.maxLoan) isBoundB = true; 
        }
        if (d.isInv50Breach) { isBoundB = true; }
        if ((isLtvB || isBoundB) && !d.inactive) { return false; }
        return true;
    });

    visibleSchemes.sort((a,b) => {
        if (conf.key === 'extra') {
            return conf.dir === 'asc' ? a.extra - b.extra : b.extra - a.extra;
        } else {
            if (Math.round(b.curLTV) !== Math.round(a.curLTV)) { return b.curLTV - a.curLTV; }
            if (a.dp !== b.dp) { return a.dp - b.dp; }
            return a.emi - b.emi;
        }
    });

    document.getElementById(`body_${pIdx}`).innerHTML = visibleSchemes.map(d => {
        let isInactive = d.inactive; 
        let actionMenuBtnHtml = `<button onclick="openRowActionModal(${pIdx}, ${d.dIdx}, ${isInactive})" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:900; cursor:pointer; font-size: 11px;">ACT</button>`;
        let bgCol = isInactive ? '#f8f9fa' : (d.isExpired ? '#fff4e6' : '#ffffff');
        let textOpacity = isInactive ? '0.5' : '1';
        let subRowBg = isInactive ? '#f8f9fa' : '#f8fafc';
        let dbdStr = `${+parseFloat(d.dbd).toFixed(3)}% (₹${Math.round(d.dbdAmt||0)})`;
        let roiStr = `${+parseFloat(d.roi).toFixed(2)}% (₹${Math.round(d.roiAmt||0)})`;
        let limitStr = isNT ? `MIN:₹${d.minLoan} MAX:${d.maxLoan < 9999999 ? d.maxLoan : 'NO'}` : `LMT:₹${Math.floor(d.nbfcMaxL)}`;

        return `
        <tr id="row_${pIdx}_${d.dIdx}" style="background: ${bgCol}; opacity: ${textOpacity};">
            <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 15px; font-weight: 900; color: var(--indigo);"><span id="ta_${pIdx}_${d.dIdx}">${d.currentTenure}/${d.advEmi}</span></div>
                ${d.isExpired && !isInactive ? `<div style="color:#d35400; font-size:9px; font-weight:900;">⚠️ EXPIRED</div>` : ''}
            </td>
            <td style="padding:12px 4px; text-align:center; vertical-align:middle; white-space:nowrap;">
                <div style="display:inline-flex; justify-content:center; align-items:center; background: #e0f2fe; padding: 2px 6px; border-radius: 4px; border: 1px solid #bae6fd;">
                    <span style="color:var(--primary); font-weight:900; font-size:13px;">₹</span>
                    <input id="l_${pIdx}_${d.dIdx}" type="number" value="${Math.floor(d.loan)}" onchange="manual(${pIdx},${d.dIdx})" onblur="manual(${pIdx},${d.dIdx})" style="width: 55px; padding: 0; border: none; background: transparent; outline: none; font-weight: 900; font-size: 13px; color: var(--primary);">
                </div>
            </td>
            <td id="dp_${pIdx}_${d.dIdx}" style="padding: 12px 4px; text-align: center; font-size: 15px; font-weight: 900; color:var(--success);">₹${Math.round(d.dp).toLocaleString()}</td>
            <td id="emi_${pIdx}_${d.dIdx}" style="padding: 12px 4px; text-align: center; font-size: 15px; font-weight: 900; color: var(--primary);">₹${Math.round(d.emi).toLocaleString()}</td>
            <td id="inst_${pIdx}_${d.dIdx}" style="padding: 12px 4px; text-align: center; font-size: 14px; font-weight: 900; color: #475569;">${d.inst}</td>
            <td id="day_${pIdx}_${d.dIdx}" style="padding: 12px 4px; text-align: center; font-size: 14px; font-weight: 900; color: #ea580c;">₹${Math.round(d.daily).toLocaleString()}</td>
            <td style="padding: 12px 4px; text-align: center;">${actionMenuBtnHtml}</td>
        </tr>
        <tr style="background: ${subRowBg}; border-bottom: 2px solid #e2e8f0; opacity: ${textOpacity};">
            <td colspan="7" style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left;">
                <div style="display:flex; flex-wrap:wrap; column-gap: 12px; row-gap: 6px; align-items:center;">
                    <span><b style="color:var(--bajaj-blue);">LTV:</b> <span id="ltv_${pIdx}_${d.dIdx}">${Math.round(d.curLTV)}%</span></span>
                    <span><b style="color:var(--bajaj-blue);">PF:</b> ₹<span id="pf_${pIdx}_${d.dIdx}">${d.pf}</span></span>
                    <span><b style="color:var(--bajaj-blue);">DBD:</b> <span id="dbd_${pIdx}_${d.dIdx}">${dbdStr}</span></span>
                    <span><b style="color:var(--bajaj-blue);">ROI:</b> <span id="roi_${pIdx}_${d.dIdx}">${roiStr}</span></span>
                    <span><b style="color:var(--success);">NET DISB:</b> <span id="nd_${pIdx}_${d.dIdx}">₹${Math.round(d.netDisb).toLocaleString()}</span></span>
                    ${d.fixedEmi > 0 ? `<span><b style="color:var(--bajaj-blue);">FIXED:</b> ₹${d.fixedEmi}</span>` : ''}
                    <span><b style="color:#8b5cf6;">${limitStr}</b></span>
                    <span id="extra_${pIdx}_${d.dIdx}" onclick="sortM(${pIdx}, 'extra')" style="cursor:pointer; background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:4px; font-weight:900; margin-left:auto;">EXTRA: ₹${Math.round(d.extra).toLocaleString()} ↕</span>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function manual(pIdx, dIdx) {
    let el = document.getElementById(`l_${pIdx}_${dIdx}`), loan = parseFloat(el.value) || 0, prod = current_products[pIdx], d = prod.calculatedData.find(x => x.dIdx === dIdx), inp = prod.inputs, type = customerQueue[activeCustomerIndex]?.type || 'NEW';
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850); let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); 
    let limit = customerQueue[activeCustomerIndex]?.limit || 0; 
    let currentLimit = limit > 0 ? limit : 9999999; let inputMrp = parseFloat(inp.mrp) || 0; let inputInv = parseFloat(inp.inv) || 0; 
    let effectivePrice = inputInv > 0 ? inputInv : (inputMrp > 0 ? inputMrp : 0); let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;

    let minAllowedLoanByInvoice = effectivePrice > 0 ? effectivePrice * 0.50 : 0;
    if (effectivePrice > 0 && loan < minAllowedLoanByInvoice) {
        loan = minAllowedLoanByInvoice;
        showToast("लोन रक्कम ५०% पेक्षा कमी असू शकत नाही!", "error");
    }

    if (effectivePrice > 0 && loan > effectivePrice) {
        loan = effectivePrice;
        showToast("लोन रक्कम इनव्हॉइसपेक्षा जास्त असू शकत नाही!", "warning");
    }

    syncInsurance(pIdx, inputMrp, loan, 'LOAN'); 
    let appliedPf = d.pf; if (prod.isNonTieup) { let checkAmount = effectivePrice > 0 ? effectivePrice : loan; let slabPf = getNonTieupPfValue(prod.category, checkAmount); if (slabPf !== null) appliedPf = slabPf; d.pf = appliedPf; }
    let dbdRate = (d.dbd * 1.18 / 100); let roiRate = d.roi / 1200; let roiRateDP = roiRate * d.advEmi; let dpE = 0; let dpR = 0;

    if (d.isFixed) { 
        let calcTenure = Math.floor(loan / d.fixedEmi) || 1; 
        if (effectivePrice > 0 && (calcTenure * d.fixedEmi) < minAllowedLoanByInvoice) { calcTenure = Math.ceil(minAllowedLoanByInvoice / d.fixedEmi); }
        loan = calcTenure * d.fixedEmi; 
        let maxBoundary = Math.min(d.nbfcMaxL, prod.isNonTieup ? d.maxLoan : 9999999, loanCapPrice > 0 ? loanCapPrice : 9999999); 
        if (loan > maxBoundary) { loan = Math.floor(maxBoundary / d.fixedEmi) * d.fixedEmi; calcTenure = Math.floor(loan / d.fixedEmi) || 1; } 
        el.value = loan; 

        let roiInEmi = loan * roiRate; let roiInDp = loan * roiRateDP; 
        dpE = effectivePrice - loan + (d.fixedEmi * d.advEmi) + (loan * dbdRate) + appliedPf + totalFees + roiInDp; dpR = Math.ceil(dpE / 10) * 10; 
        let inst = calcTenure - d.advEmi; if(inst < 1) inst = 1; 
        let emi = d.fixedEmi + (((parseFloat(inp.gtl)||0) + (parseFloat(inp.rfc)||0) + (parseFloat(inp.exw)||0)) / inst) + roiInEmi; 
        d.loan = loan; d.currentTenure = calcTenure; d.dp = dpR; d.inst = inst; d.emi = emi; 
    } else { 
        let nbfcMaxL = (currentLimit * d.tenure) / (d.tenure - d.advEmi || 1); 
        let maxBoundary = Math.min(loanCapPrice > 0 ? loanCapPrice : 999999, nbfcMaxL, prod.isNonTieup ? d.maxLoan : 9999999); 
        if(loan > maxBoundary) { loan = maxBoundary; } 
        if (effectivePrice > 0 && loan < minAllowedLoanByInvoice) { loan = minAllowedLoanByInvoice; }
        if (effectivePrice > 0 && loan > effectivePrice) { loan = effectivePrice; }
        el.value = Math.floor(loan); 

        let roiInEmi = loan * roiRate; let roiInDp = loan * roiRateDP; 
        dpE = effectivePrice - loan + ((loan/d.tenure) * d.advEmi) + (loan * dbdRate) + appliedPf + totalFees + roiInDp; 
        dpR = Math.ceil(dpE / 10) * 10; let inst = d.tenure - d.advEmi; if(inst < 1) inst = 1; 
        let insTotal = (parseFloat(inp.gtl)||0)+(parseFloat(inp.rfc)||0)+(parseFloat(inp.exw)||0); 
        let baseEmi = loan / d.tenure;
        if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 
        let emi = baseEmi + (insTotal / inst) + roiInEmi; 
        d.loan = loan; d.dp = dpR; d.emi = emi; 
    }

    d.extra = effectivePrice > 0 ? (((d.emi * d.inst) + d.dp) - effectivePrice) : 0; d.dbdAmt = loan * dbdRate; d.roiAmt = (loan * roiRateDP) + (loan * roiRate * d.inst); 
    let marginMoney = parseFloat(inp.margin) || 0; let roundupAdj = (dpR > dpE) ? (dpR - dpE) : 0; 
    d.netDisb = effectivePrice > 0 ? (effectivePrice - dpR - marginMoney - roundupAdj) : 0;

    prod.inputs.manualLoans = prod.inputs.manualLoans || {};
    prod.inputs.manualLoans[dIdx] = loan;
    customerQueue[activeCustomerIndex].products = current_products;
    saveQueueToLocal(true);
    renderRows(pIdx);
}

function sortM(pIdx, key) { 
    let conf = sortConfigs[pIdx]; 
    if(conf.key === key) { conf.dir = conf.dir === 'asc' ? 'desc' : 'asc'; } 
    else { conf.key = key; conf.dir = key === 'curLTV' ? 'desc' : 'asc'; }
    renderRows(pIdx); 
    customerQueue[activeCustomerIndex].products = current_products; 
    saveQueueToLocal(true); 
}

function copySchemeText(pIdx, dIdx, btnElement) {
    let prod = current_products[pIdx], d = prod.calculatedData.find(x => x.dIdx === dIdx); let invAmt = prod.inputs.inv > 0 ? prod.inputs.inv : prod.inputs.mrp; let c = customerQueue[activeCustomerIndex]; let cappingLine = (c.cap && c.cap !== "") ? `\nEMI CAPPING- ${c.cap}` : ""; let custDetails = `Customer Name- ${c.name}\nLimit- ${c.limit}\nLTV- ${c.ltv}${cappingLine}\n\n`;
    let textToCopy = `${custDetails}📱 *${prod.name}*\n${invAmt > 0 ? `*INVOICE AMOUNT:* ₹${invAmt}\n\n` : "" }✅ *Scheme:* ${d.currentTenure}/${d.advEmi}\n💰 *DP:* ₹${Math.round(d.dp).toLocaleString()}\n🗓️ *EMI:* ₹${Math.round(d.emi).toLocaleString()} x ${d.inst}\n✨ *Daily EMI:* ₹${Math.round(d.daily).toLocaleString()}`;
    function showSuccess() { let originalText = btnElement.innerText; btnElement.innerText = "COPIED!"; btnElement.style.background = "var(--success)"; setTimeout(() => { btnElement.innerText = originalText; btnElement.style.background = "var(--primary)"; }, 2000); }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => fallbackCopy(textToCopy, showSuccess)); } else { fallbackCopy(textToCopy, showSuccess); }
}

function fallbackCopy(text, successCb) {
    let ta = document.createElement("textarea"); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = "absolute"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, 99999); 
    try { let success = document.execCommand('copy'); if (success) { successCb(); } else { showCustomAlert("Auto-copy blocked:", text); } } catch (err) { showCustomAlert("Auto-copy failed:", text); } document.body.removeChild(ta);
}

async function toggleInactive(pIdx, dIdx) { let prod = current_products[pIdx]; let scheme = prod.schemes[dIdx]; scheme.inactive = !scheme.inactive; recalcModel(pIdx); customerQueue[activeCustomerIndex].products = current_products; await saveQueueToLocal(true); }

async function executeManualAction() {
    let mode = document.getElementById('targetPIdx').value; 
    let manNameInput = document.getElementById('manName').value.toUpperCase().trim();
    let scheme = { tenure: parseInt(document.getElementById('manTen').value)||0, advEmi: parseInt(document.getElementById('manAdv').value)||0, dbd: parseFloat(document.getElementById('manDbd').value)||0, pf: parseInt(document.getElementById('manPf').value)||0, roi: parseFloat(document.getElementById('manRoi').value)||0, fixedEmi: parseInt(document.getElementById('manFixed').value)||0, minLoan: 0, maxLoan: 9999999, category: "MANUAL", inactive: false, isExpired: false, expiryDateStr: "" };
    let cCap = customerQueue[activeCustomerIndex]?.cap || "";
    if(mode === "NEW") { 
        let name = manNameInput !== "" ? manNameInput : "MANUAL MODEL"; 
        let comp = customerQueue[activeCustomerIndex]?.components || {}; 
        current_products.push({ name: name, schemes: [scheme], category: "MANUAL", inputs: { mrp: "", inv: "", cap: cCap, target: "", gtl: 0, rfc: 0, exw: comp.exw||"", margin: comp.margin||"", dealer: comp.dealer||"", surch: 0, manualLoans: {} }, isManual: true }); 
        sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); 
        customerQueue[activeCustomerIndex].products = current_products; 
        customerQueue[activeCustomerIndex].sortConfigs = sortConfigs; 
        await saveQueueToLocal(true); renderMatrix(); 
    } else { 
        current_products[mode].schemes.push(scheme); 
        customerQueue[activeCustomerIndex].products = current_products;
        await saveQueueToLocal(true);
        recalcModel(parseInt(mode)); 
    } 
    closeManualModal();
}

function openQuoteSelectionModal() {
    if(current_products.length === 0) { showToast("आधी matrix मध्ये product add करा!", "warning"); return; }
    let html = current_products.map((p, idx) => ` <div style="display:flex; align-items:center; gap:8px; padding:8px; background:#f8f9fa; border:1px solid #ddd; border-radius:4px;"> <input type="checkbox" id="qchk_${idx}" class="quote-model-chk" value="${idx}" style="width:16px; height:16px; cursor:pointer;"> <label for="qchk_${idx}" style="font-size:14px; font-weight:bold; cursor:pointer; flex:1; margin:0;">${p.name}</label> </div> `).join('');
    document.getElementById('quoteModelCheckboxes').innerHTML = html; document.getElementById('quoteSelectionModal').style.display = 'flex';
}

function promptForSelectedImageGeneration() {
    let chks = document.querySelectorAll('.quote-model-chk:checked'); if(chks.length === 0) { showToast("किमान एक मॉडेल निवडा!", "warning"); return; }
    window.tempImageGenIndices = Array.from(chks).map(c => parseInt(c.value)); document.getElementById('quoteSelectionModal').style.display = 'none'; requestWhatsAppDispatch = false; doGenerateCustomerImage();
}

let requestWhatsAppDispatch = false;
function proceedGenerateImage() { requestWhatsAppDispatch = false; document.getElementById('custInfoPromptModal').style.display = 'none'; doGenerateCustomerImage(); }
function proceedGenerateImageAndWhatsAppCopy() { requestWhatsAppDispatch = true; document.getElementById('custInfoPromptModal').style.display = 'none'; doGenerateCustomerImage(); }

function doGenerateCustomerImage() {
    let quoteDiv = document.createElement('div'); 
    quoteDiv.style.width = "780px"; 
    quoteDiv.style.padding = "16px"; 
    quoteDiv.style.background = "#f8fafc"; 
    quoteDiv.style.position = "absolute"; 
    quoteDiv.style.top = "-9999px"; 
    quoteDiv.style.boxSizing = "border-box";
    quoteDiv.style.fontFamily = "sans-serif";

    let c = customerQueue[activeCustomerIndex]; 
    let ltvLimit = c?.ltv || 100;
    let rawName = c?.name && c.name !== "-" ? c.name : "Valued Customer";
    let custName = rawName.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');

    let html = `
    <div style="background: #ffffff; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e2e8f0;">
        <div style="background: linear-gradient(180deg, #095797 0%, #153e75 100%); padding: 20px 16px; color: #ffffff; text-align: center;">
            <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 900;">🎉 SPECIAL LOAN OFFERS</h2> 
            <div style="display: flex; gap: 14px; font-size: 15px; font-weight: 900; justify-content: center; background: rgba(255,255,255,0.1); padding: 8px; border-radius: 8px;">
                <span>👤 ${custName}</span>
                <span>| LIMIT: ₹${c?.limit ? c.limit.toLocaleString() : 0}</span>
                <span>| MAX LTV: ${ltvLimit}%</span>
                <span>| ${c?.type || 'NEW'}</span>
            </div>
        </div>
        <div style="padding: 16px;">
    `;

    let hasV = false; 
    let productsToRender = window.tempImageGenIndices.map(idx => current_products[idx]);

    productsToRender.forEach((prod) => {
        let validS = prod.calculatedData.filter(d => !d.inactive && !d.isInv50Breach && d.loan > 0);
        if(validS.length === 0) return; 
        hasV = true; 
        let invAmt = prod.inputs.inv > 0 ? prod.inputs.inv : prod.inputs.mrp;

        html += `
            <div style="border-left: 10px solid #034887; background: #ffffff; margin-bottom: 16px; border: 1px solid #cbd5e1;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 2px solid #e2e8f0;">
                    <div style="font-size: 20px; font-weight: 900; color: #034887;">📱 ${prod.name.toUpperCase()}</div>
                    <div style="background: #034887; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900;">INV: ₹${invAmt.toLocaleString()}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <thead style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 14px;">
                        <tr><th style="padding:10px;">SCHEME</th><th style="padding:10px;">DP</th><th style="padding:10px;">EMI</th><th style="padding:10px;">MONTHS</th><th style="padding:10px;">DAILY</th></tr>
                    </thead>
                    <tbody>
        `;

        validS.forEach((d) => {
            html += `
                <tr style="border-bottom: 1px solid #e2e8f0; font-size: 15px; font-weight: bold;">
                    <td style="padding: 12px; font-weight: 900; color: #0f172a;">${d.currentTenure}/${d.advEmi}</td>
                    <td style="padding: 12px; color: #059669; font-weight: 900;">₹${Math.round(d.dp).toLocaleString()}</td>
                    <td style="padding: 12px; color: #095797; font-weight: 900;">₹${Math.round(d.emi).toLocaleString()}</td>
                    <td style="padding: 12px; color: #1e293b;">${d.inst}</td>
                    <td style="padding: 12px; color: #ea580c;">₹${Math.round(d.daily).toLocaleString()}</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    });

    if(!hasV) { showToast("कोणतीही Eligible Scheme नाही!", "error"); return; }
    html += `</div></div>`;
    quoteDiv.innerHTML = html; 
    document.body.appendChild(quoteDiv);

    html2canvas(quoteDiv, {scale: 2, useCORS: true}).then(canvas => { 
        let imgDataUrl = canvas.toDataURL("image/png"); 
        document.getElementById('generatedImage').src = imgDataUrl; 
        document.getElementById('imageViewerModal').style.display = 'flex'; 
        document.body.removeChild(quoteDiv); 
    });
}

let lastTapTime = 0; let lastTapIdx = -1;
function handleCustomerTap(idx) {
    let currentTime = new Date().getTime();
    let tapLength = currentTime - lastTapTime;
    if (tapLength < 400 && tapLength > 0 && lastTapIdx === idx) {
        setActiveCustomer(idx); lastTapTime = 0; 
    } else {
        selectQueueItem(idx); lastTapTime = currentTime; lastTapIdx = idx;
    }
}

async function checkForExcelUpdates() {
    try {
        let repoUrl = "https://api.github.com/repos/luckyjathar/testcalculator/commits?path=master_data.xlsx&page=1&per_page=1";
        let res = await fetch(repoUrl);
        if (res.ok) {
            let data = await res.json();
            if (data && data.length > 0) {
                let latestCommitTime = new Date(data[0].commit.committer.date).getTime();
                let localSavedTime = await getFromDB('master_data_version_time') || 0;
                if (localSavedTime > 0 && latestCommitTime > localSavedTime) {
                    showUpdateNotification();
                } else if (localSavedTime === 0) {
                    await saveToDB('master_data_version_time', latestCommitTime);
                }
            }
        }
    } catch(e) { }
}

function showUpdateNotification() {
    let updateDiv = document.getElementById('updateNotificationBar');
    if (!updateDiv) {
        updateDiv = document.createElement('div');
        updateDiv.id = 'updateNotificationBar';
        updateDiv.innerHTML = `
            <div style="background: var(--danger); color: white; text-align: center; padding: 10px; font-weight: bold; position: fixed; top: 0; width: 100%; z-index: 9999;">
                🚀 नवीन स्कीम्स आणि ऑफर्स अपडेट झाल्या आहेत! 
                <button onclick="forceRefreshMasterData()" style="background: white; color: var(--danger); border: none; padding: 5px 10px; margin-left: 10px; font-weight: bold; border-radius: 4px; cursor: pointer;">
                    UPDATE NOW
                </button>
            </div>
        `;
        document.body.prepend(updateDiv);
    }
    updateDiv.style.display = 'block';
}

async function forceRefreshMasterData() {
    let updateDiv = document.getElementById('updateNotificationBar');
    if(updateDiv) updateDiv.innerHTML = "डाउनलोड सुरू आहे...";
    await saveToDB('master_data_time', 0); 
    await fetchFromMasterStream(true); 
    if(updateDiv) updateDiv.style.display = 'none';
    showToast("डेटा यशस्वीरित्या अपडेट झाला!", "success");
}

function openRowActionModal(pIdx, dIdx, isInactive) {
    let container = document.getElementById('rowActionButtons');
    container.innerHTML = `
        <button onclick="copySchemeText(${pIdx}, ${dIdx}, this); closeRowActionModal();" style="background:#f8fafc; color:var(--dark); border:1px solid #cbd5e1; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">COPY SCHEME</button>
        <button onclick="openEditSchemeModal(${pIdx}, ${dIdx}); closeRowActionModal();" style="background:#fff7ed; color:#d97706; border:1px solid #fed7aa; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">EDIT SCHEME</button>
        <button onclick="toggleInactive(${pIdx}, ${dIdx}); closeRowActionModal();" style="background:${isInactive ? '#ecfdf5' : '#fef2f2'}; color:${isInactive ? '#059669' : '#dc2626'}; border:1px solid ${isInactive ? '#a7f3d0' : '#fecaca'}; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">${isInactive ? 'ADD TO ACTIVE' : 'DISABLE SCHEME'}</button>
    `;
    document.getElementById('rowActionModal').style.display = 'flex';
}

function closeRowActionModal() { document.getElementById('rowActionModal').style.display = 'none'; }
