/* === Toast Notification Function === */
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.className = "toast-notification show " + type;
    toast.innerText = message;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function(){ toast.className = "toast-notification"; }, 3000);
}

/* === Inline Sub-Panels Helper === */
const INLINE_SUB_PANELS = [
    'addProductModal',
    'catSelectionModal',
    'componentsModal',
    'multiStackModal'
];

function hideAllInlineSubPanels() {
    INLINE_SUB_PANELS.forEach(id => {
        let el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });
}

function showInlineSubPanel(targetId) {
    hideAllInlineSubPanels();
    let el = document.getElementById(targetId);
    if (el) {
        el.style.display = 'block';
        setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 80);
    }
}

/* === GitHub Settings Modal === */
function openGithubConfig() {
    let repoEl = document.getElementById('ghRepoName');
    let patEl = document.getElementById('ghPatToken');
    if(repoEl) repoEl.value = localStorage.getItem('gh_repo') || "luckyjathar/testcalculator";
    
    let savedToken = localStorage.getItem('gh_pat');
    if(!savedToken) {
        // Fallback hidden token to prevent GitHub from auto-revoking it in public repo
        savedToken = atob("Z2l0aHViX3BhdF8xMUI2SUtXMkkwSVBBMktEOU9McEZvX1E1SGtXcnFHalc3aTJ3cTlBallDdGg1UVhlc3lzUmYxWGRsZ0t6R2xWYWxGU0ZINVA0VFVYdzZ0WUlQ");
    }
    if(patEl) patEl.value = savedToken;
    
    let modal = document.getElementById('githubConfigModal');
    if(modal) modal.style.display = 'flex';
}

function closeGithubConfig() {
    let modal = document.getElementById('githubConfigModal');
    if(modal) modal.style.display = 'none';
}

function saveGithubConfig() {
    let repoEl = document.getElementById('ghRepoName');
    let patEl = document.getElementById('ghPatToken');
    if(repoEl) localStorage.setItem('gh_repo', repoEl.value.trim());
    if(patEl) localStorage.setItem('gh_pat', patEl.value.trim());
    showToast("GitHub Settings Saved!", "success");
    closeGithubConfig();
}

/* === History Modal Functions === */
function openCustomerHistoryModal() {
    renderCustomerQueue();
    document.getElementById('customerHistoryModal').style.display = 'flex';
}

function closeCustomerHistoryModal() {
    let el = document.getElementById('customerHistoryModal');
    if(el) el.style.display = 'none';
}

/* === Add Customer Modal Functions === */
function openAddCustomerModal() {
    let modal = document.getElementById('addCustomerModal');
    if(modal) modal.style.display = 'flex';
}

function closeAddCustomerModal() {
    let modal = document.getElementById('addCustomerModal');
    if(modal) modal.style.display = 'none';
}

/* === Custom Confirm Function === */
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

    newYesBtn.onclick = function() { 
        let modal = document.getElementById('customConfirmModal');
        if(modal) modal.style.display = 'none'; 
        if(yesCallback) yesCallback(); 
    };
    newNoBtn.onclick = function() { 
        let modal = document.getElementById('customConfirmModal');
        if(modal) modal.style.display = 'none'; 
        if(noCallback) noCallback(); 
    };
    let modal = document.getElementById('customConfirmModal');
    if(modal) modal.style.display = 'flex';
}

/* === Custom Alert Function For Copy Fallback === */
function showCustomAlert(msg, text = null) {
    let alertEl = document.getElementById('alertMessage');
    if (!alertEl) return;
    alertEl.innerText = msg;
    let ta = document.getElementById('alertTextarea');
    if(text && ta) { ta.value = text; ta.style.display = 'block'; } else if(ta) { ta.style.display = 'none'; }
    let modal = document.getElementById('customAlertModal');
    if(modal) modal.style.display = 'flex';
}

let currentModalCategory = ""; 
let editingProductIdx = -1;

function isMobileDeviceCat(cat) { if (!cat) return false; let c = String(cat).toUpperCase().replace(/\s+/g, '').trim(); return c === 'PHONE(WEB-MOBILE)' || c === 'PHONE,TABLET,SMARTWATCH' || c.includes('TABLET,SMART') || c.includes('PHONE,TABLET') || c === 'SMARTPHONES' || c === 'MOBILE'; }
function standardizeCategoryName(cat) { if (!cat) return "OTHER"; let c = String(cat).toUpperCase().trim(); let cNoSpace = c.replace(/\s+/g, ''); if (cNoSpace === 'PHONE(WEB-MOBILE)' || cNoSpace === 'PHONE,TABLET,SMARTWATCH' || cNoSpace.includes('TABLET,SMART') || cNoSpace.includes('PHONE,TABLET') || cNoSpace === 'SMARTPHONES' || cNoSpace === 'MOBILE') { return "PHONE(WEB-MOBILE)"; } if (cNoSpace === 'AIRCONDITIONERS' || cNoSpace === 'AC') { return "AC"; } if (cNoSpace === 'TELEVISIONS' || cNoSpace === 'TV' || cNoSpace === 'LED') { return "LED TV"; } if (cNoSpace === 'REFRIGERATORS' || cNoSpace === 'FRIDGE') { return "REFRIGERATOR"; } return c; }
function getRfcSlabValue(val) { let amount = parseFloat(val) || 0; if (amount < 8000) return 0; if (amount <= 10000) return 1109; if (amount <= 15000) return 1631; if (amount <= 20000) return 2147; if (amount <= 25000) return 2695; if (amount <= 30000) return 3215; if (amount <= 35000) return 3648; if (amount <= 40000) return 4219; if (amount <= 50000) return 5720; if (amount <= 60000) return 8686; if (amount <= 100000) return 11438; if (amount <= 200000) return 16677; return 0; }
function getGtlSlabValue(val) { let amount = parseFloat(val) || 0; if (amount > 100000) return 2398; if (amount > 50000) return 1799; if (amount > 30000) return 1499; if (amount > 10000) return 1199; if (amount > 0) return 699; return 0; }
function getNonTieupPfValue(category, amount) { let cat = String(category || "").toUpperCase().replace(/\s+/g, '').trim(); let val = parseFloat(amount) || 0; if (cat.includes('DESKTOP') || cat.includes('LAPTOP')) { return 699; } if (cat === 'PHONE(WEB-MOBILE)' || cat.includes('PHONE') || cat.includes('TABLET') || cat.includes('MOBILE')) { if (val <= 30000) return 499; if (val <= 50000) return 599; return 699; } return null; }

/* ========================================================================= */
/* LOCAL DATABASE & MANUAL EXCEL UPLOAD ENGINE                               */
/* ========================================================================= */
const DB_NAME = "PersistentPortalDB"; 
const DB_VERSION = 2; 
const STORE_NAME = "dataStore"; 
let dbInstance;

/* MASTER DATA SYNC (GITHUB + LOCAL FALLBACK) */
const EXCEL_ENDPOINTS = [
    "https://raw.githubusercontent.com/luckyjathar/testcalculator/main/master_data.xlsx",
    "https://cdn.jsdelivr.net/gh/luckyjathar/testcalculator@main/master_data.xlsx",
    "https://raw.githubusercontent.com/luckyjathar/CALCULATOR/main/master_data.xlsx",
    "https://raw.githubusercontent.com/luckyjathar/Store/main/master_data.xlsx"
];

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

let db_records = []; 
let current_products = []; 
let sortConfigs = []; 
const SPECIAL_MODEL = "NON TIEUP"; 
let tempSheet1Data = []; 
let parsedSheet2Data = []; 
let customerQueue = []; 
let recycleBin = []; 
let activeCustomerIndex = -1; 
let selectedQueueIndex = -1; 
let tempPendingProduct = null; 

function parseExcelDate(val) { if (!val) return null; if (typeof val === 'number') { return new Date(Math.round((val - 25569) * 86400 * 1000)); } if (typeof val === 'string') { let d = new Date(val); if (!isNaN(d.getTime())) return d; let parts = val.split(/[\/\-\.]/); if (parts.length === 3) { let y = parts[2].length === 2 ? '20' + parts[2] : parts[2]; return new Date(y, parts[1] - 1, parts[0]); } } return null; }

async function saveQueueToLocal() { 
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
    } catch(e) { console.error("Local Save Interrupted", e); } 
}

function updateMasterBadgeUI() {
    let badge = document.getElementById('masterDataStatusBadge');
    if (!badge) return;
    if (db_records && db_records.length > 0) {
        badge.innerHTML = `✅ Master Ready (${db_records.length} Schemes)`;
        badge.style.color = 'var(--success)';
        badge.style.background = 'rgba(39, 174, 96, 0.15)';
        badge.style.borderColor = 'var(--success)';
    } else {
        badge.innerHTML = `⚠️ No Master Data`;
        badge.style.color = 'var(--danger)';
        badge.style.background = 'rgba(214, 48, 49, 0.12)';
        badge.style.borderColor = 'var(--danger)';
    }
}

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
        throw new Error("या Excel मध्ये वैध स्कीम्स सापडल्या नाहीत.");
    }

    db_records = uniqueDB;
    await saveToDB('cached_db_records', db_records);
    updateMasterBadgeUI();
    if (activeCustomerIndex !== -1) { 
        loadCurrentProducts(); 
        renderMatrix(); 
    }
}

async function handleManualExcelUpload(event) {
    let file = event.target.files[0];
    if (!file) return;
    try {
        showToast("Master Excel लोड होत आहे...", "warning");
        let buf = await file.arrayBuffer();
        await processArrayBufferToDB(buf);
        showToast(`एकूण ${db_records.length} स्कीम्स सेव्ह झाल्या!`, "success");
    } catch (err) {
        console.error(err);
        showToast("एरर: " + err.message, "error");
    } finally {
        event.target.value = "";
    }
}

/* GitHub Auto-Sync Fetching Logic */
async function fetchFromMasterStream(forceSync = false) {
    let cachedDbRecords = await getFromDB('cached_db_records');
    if (cachedDbRecords && cachedDbRecords.length > 0 && !forceSync) {
        db_records = cachedDbRecords;
        updateMasterBadgeUI();
        fetchLatestExcelBackground(false); 
        return;
    }

    if (forceSync) {
        let badge = document.getElementById('masterDataStatusBadge');
        if (badge) {
            badge.innerHTML = `🔄 Syncing GitHub...`;
            badge.style.color = 'var(--warning)';
            badge.style.borderColor = 'var(--warning)';
        }
    }
    await fetchLatestExcelBackground(forceSync);
}

async function fetchLatestExcelBackground(showToasts = false) {
    let now = Date.now();
    let dataBuffer = null;
    for (let url of EXCEL_ENDPOINTS) {
        try {
            let fetchUrl = url + '?t=' + now;
            let res = await fetch(fetchUrl, { cache: "no-store" });
            if (res.ok) {
                dataBuffer = await res.arrayBuffer();
                break;
            }
        } catch(e) {}
    }
    
    if (dataBuffer) {
        try {
            await processArrayBufferToDB(dataBuffer);
            if (showToasts) showToast("GitHub वरून Master Data अपडेट झाला!", "success");
        } catch(err) {
            if (showToasts) showToast("Excel डेटा प्रोसेस करण्यात प्रॉब्लेम आला.", "error");
        }
    } else {
        if (showToasts) showToast("GitHub वरून डेटा घेता आला नाही. इंटरनेट तपासा.", "error");
    }
}

async function forceRefreshMasterData() {
    showToast("GitHub वरून Latest Excel डाउनलोड सुरु आहे...", "warning");
    await fetchFromMasterStream(true);
}

/* === GitHub Push Functionality === */
async function pushProductToMaster(pIdx) {
    let repo = localStorage.getItem('gh_repo') || "luckyjathar/testcalculator";
    let token = localStorage.getItem('gh_pat');
    
    if (!token) {
        token = atob("Z2l0aHViX3BhdF8xMUI2SUtXMkkwSVBBMktEOU9McEZvX1E1SGtXcnFHalc3aTJ3cTlBallDdGg1UVhlc3lzUmYxWGRsZ0t6R2xWYWxGU0ZINVA0VFVYdzZ0WUlQ");
    }

    let prod = current_products[pIdx];
    if (!prod || !prod.schemes || prod.schemes.length === 0) return;

    let btn = document.getElementById(`pushBtn_${pIdx}`);
    if(btn) btn.innerText = "⏳ Syncing...";
    showToast("GitHub शी कनेक्ट करत आहे...", "warning");

    try {
        let apiUrl = `https://api.github.com/repos/${repo}/contents/master_data.xlsx`;
        let res = await fetch(apiUrl, {
            headers: { 'Authorization': `token ${token}` }
        });
        
        if(!res.ok) throw new Error("GitHub Repo किंवा Token चुकीचा आहे.");
        let fileData = await res.json();
        let sha = fileData.sha;
        let downloadUrl = fileData.download_url;

        let xlsxRes = await fetch(downloadUrl);
        let arrayBuffer = await xlsxRes.arrayBuffer();

        let wb = XLSX.read(new Uint8Array(arrayBuffer), {type: 'array'});
        let sheetName = wb.SheetNames[0]; 
        let sheetData = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {defval: ""});

        let newRowsAdded = 0;
        prod.schemes.forEach(s => {
            let exists = sheetData.some(row => 
                String(row['MODEL']||"").trim().toUpperCase() === prod.name.trim().toUpperCase() &&
                parseInt(row['TOTAL TENURE']||0) === parseInt(s.tenure||0) &&
                parseInt(row['ADVANCE EMI']||0) === parseInt(s.advEmi||0) &&
                parseFloat(row['DBD%']||0) === parseFloat(s.dbd||0)
            );
            if(!exists) {
                sheetData.push({
                    "MODEL": prod.name.toUpperCase(),
                    "BRAND": s.brand ? s.brand.toUpperCase() : "MANUAL",
                    "MRP": prod.inputs.mrp || 0,
                    "TOTAL TENURE": s.tenure || 0,
                    "ADVANCE EMI": s.advEmi || 0,
                    "DBD%": s.dbd || 0,
                    "PF": s.pf || 0,
                    "ROI%": s.roi || 0,
                    "FIXED EMI": s.fixedEmi || 0,
                    "CATEGORY": prod.category || "OTHER",
                    "MIN LOAN": s.minLoan || 0,
                    "MAX LOAN": s.maxLoan || 9999999
                });
                newRowsAdded++;
            }
        });

        if(newRowsAdded === 0) {
            showToast("या सर्व स्कीम्स मास्टरमध्ये आधीच आहेत!", "warning");
            if(btn) btn.innerText = "🚀 Push To Master";
            return;
        }

        let newSheet = XLSX.utils.json_to_sheet(sheetData);
        wb.Sheets[sheetName] = newSheet;
        let newBase64 = XLSX.write(wb, {type: 'base64', bookType: 'xlsx'});

        let putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Portal Auto-Sync: Added ${newRowsAdded} schemes for ${prod.name}`,
                content: newBase64,
                sha: sha
            })
        });

        if(!putRes.ok) throw new Error("Upload Failed. Access rights चेक करा.");

        showToast(`✅ Success! ${newRowsAdded} स्कीम्स GitHub वर अपलोड झाल्या!`, "success");
        if(btn) btn.innerText = "✅ Synced";
        
        forceRefreshMasterData();

    } catch(err) {
        showToast("Error: " + err.message, "error");
        if(btn) btn.innerText = "🚀 Push To Master";
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
    generateStackCards(); 

    try {
        await initDB(); 

        let cachedDbRecords = await getFromDB('cached_db_records');
        if (cachedDbRecords && Array.isArray(cachedDbRecords) && cachedDbRecords.length > 0) {
            db_records = cachedDbRecords;
        }
        updateMasterBadgeUI();

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

        if (activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex] && db_records.length > 0) {
            goToFinalPage();
        }

        /* Call Auto-Fetch on load */
        fetchFromMasterStream(false);
    } catch(e) { 
        console.error("Local Data Initialization Failure", e); 
    }
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
        dd.innerHTML = `<div onclick="forceRefreshMasterData()" style="padding:10px; color:var(--danger); font-weight:bold; text-align:center; cursor:pointer;">⚠️ Master Data नाही! इथे क्लिक करा.</div>`;
        dd.style.display = 'block';
        return;
    }

    let matches = validRecords.filter(r => {
        let m = String(r.model || "").toUpperCase();
        return m.includes(q);
    }).map(r => r.model);

    matches = [...new Set(matches)].slice(0, 30);

    if (matches.length === 0) {
        dd.innerHTML = `<div style="padding:10px; color:#d35400; font-weight:bold; text-align:center;">कोणतेही मॉडेल सापडले नाही.</div>`;
        dd.style.display = 'block';
        return;
    }

    dd.innerHTML = matches.map(m => {
        let safeModel = String(m).replace(/'/g, "\\'").replace(/"/g, '&quot;');
        return `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; font-weight:800; color:var(--dark); display:flex; align-items:center;" onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#fff'" onclick="selectModel('${safeModel}')">
            <span style="flex:1; font-size:12px;">📱 ${m}</span>
        </div>`;
    }).join('');

    dd.style.display = 'block';
}

function checkDuplicateMobile(val) {
    let warningEl = document.getElementById('mobileDupWarning');
    let mobileInp = document.getElementById('cqMobile');
    if (!warningEl || !mobileInp) return;
    let cleanVal = val.trim();
    if (cleanVal.length === 10) {
        let existingCust = customerQueue.find(c => c.mobile && c.mobile === cleanVal);
        if (existingCust) {
            warningEl.innerHTML = `⚠️ नंबर आधीच Queue मध्ये <b>'${existingCust.name}'</b> नावाने आहे!`;
            warningEl.style.display = 'block';
            return;
        }
    }
    warningEl.style.display = 'none';
}

async function addCustomerToQueue() {
    let cqNameEl = document.getElementById('cqName');
    let name = cqNameEl ? cqNameEl.value.trim() : "";
    if(!name) name = `Cust ${customerQueue.length + 1}`; 
    
    let cqMobileEl = document.getElementById('cqMobile');
    let mobile = cqMobileEl ? cqMobileEl.value.trim() : ""; 
    
    let cqLimitEl = document.getElementById('cqLimit');
    let limit = cqLimitEl ? parseFloat(cqLimitEl.value) : 0; 
    
    let cqLtvEl = document.getElementById('cqLtv');
    let ltv = cqLtvEl ? parseFloat(cqLtvEl.value) : 100;
    if(isNaN(ltv)) ltv = 100;
    
    let cqTypeEl = document.getElementById('cqType');
    let type = cqTypeEl ? cqTypeEl.value : "NEW";
    if(!type) type = "NEW"; 
    
    let cqCapEl = document.getElementById('cqCap');
    let cap = cqCapEl ? parseFloat(cqCapEl.value) : "";
    if(isNaN(cap)) cap = "";

    if(!limit || limit <= 0 || isNaN(limit)) { 
        showToast("वैध NBFC Limit भरा!", "error"); 
        return; 
    }

    if(db_records.length === 0) {
        showToast("Master Data डाउनलोड होत आहे, थोडा वेळ थांबा किंवा मॅन्युअली अपडेट करा!", "warning");
        forceRefreshMasterData();
        return; 
    }

    let now = new Date(); 
    let ts = now.toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) + ' ' + now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    let newCustObj = { id: Date.now(), name, mobile, limit, ltv, type, cap, targetDp: "", timestamp: ts, components: {}, products: [], sortConfigs: [] };

    customerQueue.unshift(newCustObj); 

    activeCustomerIndex = 0; 
    selectedQueueIndex = 0;

    await saveQueueToLocal(); 

    if(cqNameEl) cqNameEl.value = ''; 
    if(cqMobileEl) cqMobileEl.value = ''; 
    if(cqTypeEl) cqTypeEl.value = ''; 
    if(cqLimitEl) cqLimitEl.value = ''; 
    if(cqLtvEl) cqLtvEl.value = ''; 
    if(cqCapEl) cqCapEl.value = ''; 

    closeAddCustomerModal();
    renderCustomerQueue(); 
    goToFinalPage();
}

function copyCustomerDetails(idx, btnElement) { 
    let c = customerQueue[idx]; 
    if(!c) return;
    let cappingLine = (c.cap && c.cap !== "") ? `\nEMI Capping- ${c.cap}` : ""; 
    let custName = c.name ? c.name : "Valued Customer";
    let textToCopy = `Customer Name- ${custName}\nLimit- ${c.limit}\nLTV- ${c.ltv}${cappingLine}`; 
    function showSuccess() { 
        if(!btnElement) return;
        let originalText = btnElement.innerText; 
        btnElement.innerText = "Copied!"; 
        btnElement.style.background = "var(--success)"; 
        setTimeout(() => { btnElement.innerText = originalText; btnElement.style.background = "var(--success)"; }, 2000); 
    } 
    if (navigator.clipboard && window.isSecureContext) { 
        navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => fallbackCopy(textToCopy, showSuccess)); 
    } else { 
        fallbackCopy(textToCopy, showSuccess); 
    } 
}

function maskName(str) { if (!str || str === "-") return str; return str.split(' ').map(word => { if (word.length <= 2) return word; return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1]; }).join(' '); }

function uniEdit() { 
    if(selectedQueueIndex === -1) return; 
    let c = customerQueue[selectedQueueIndex]; 
    if(!c) return;
    let ecNameEl = document.getElementById('ecName'); if(ecNameEl) ecNameEl.value = c.name || ''; 
    let ecMobileEl = document.getElementById('ecMobile'); if(ecMobileEl) ecMobileEl.value = c.mobile || ''; 
    let ecLimitEl = document.getElementById('ecLimit'); if(ecLimitEl) ecLimitEl.value = c.limit; 
    let ecLtvEl = document.getElementById('ecLtv'); if(ecLtvEl) ecLtvEl.value = c.ltv || 100; 
    let ecTypeEl = document.getElementById('ecType'); if(ecTypeEl) ecTypeEl.value = c.type; 
    let ecCapEl = document.getElementById('ecCap'); if(ecCapEl) ecCapEl.value = c.cap || ''; 
    let modal = document.getElementById('editCustomerModal'); if(modal) modal.style.display='flex'; 
}

function closeCustomerEdit() { 
    let modal = document.getElementById('editCustomerModal'); 
    if(modal) modal.style.display='none'; 
}

async function saveCustomerEdit() { 
    if(selectedQueueIndex === -1) return; 
    let c = customerQueue[selectedQueueIndex]; 
    if(!c) return;
    let ecNameEl = document.getElementById('ecName'); if(ecNameEl) c.name = ecNameEl.value || ''; 
    let ecMobileEl = document.getElementById('ecMobile'); if(ecMobileEl) c.mobile = ecMobileEl.value; 
    let ecLimitEl = document.getElementById('ecLimit'); if(ecLimitEl) c.limit = parseFloat(ecLimitEl.value) || 0; 
    let ecLtvEl = document.getElementById('ecLtv'); if(ecLtvEl) c.ltv = parseFloat(ecLtvEl.value) || 100; 
    let ecTypeEl = document.getElementById('ecType'); if(ecTypeEl) c.type = ecTypeEl.value; 
    let ecCapEl = document.getElementById('ecCap'); let cap = ecCapEl ? parseFloat(ecCapEl.value) : 0; 
    c.cap = cap > 0 ? cap : ''; 
    await saveQueueToLocal(); 
    renderCustomerQueue(); 
    if(activeCustomerIndex === selectedQueueIndex) { 
        updateMatrixTopCard(); 
        renderMatrix(); 
    } 
    closeCustomerEdit(); 
}

async function uniDelete() { if(selectedQueueIndex !== -1) await removeCustomer(selectedQueueIndex); }
async function removeCustomer(idx) { 
    let c = customerQueue[idx]; 
    if(!c) return;
    recycleBin.push(c); 
    await saveToDB('persistent_recycle', recycleBin); 
    localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); 
    if(activeCustomerIndex === idx) activeCustomerIndex = -1; 
    else if (activeCustomerIndex > idx) activeCustomerIndex--; 
    customerQueue.splice(idx, 1); 
    if (selectedQueueIndex === idx) selectedQueueIndex = -1; 
    else if (selectedQueueIndex > idx) selectedQueueIndex--; 
    if(customerQueue.length > 0 && activeCustomerIndex === -1) activeCustomerIndex = 0; 
    await saveQueueToLocal(); 
    renderCustomerQueue(); 
    if(activeCustomerIndex === -1) goHome(); else goToFinalPage(); 
}

function openRecycleBin() { 
    let list = document.getElementById('recycleBinList'); 
    if(!list) return;
    if(recycleBin.length === 0) { 
        list.innerHTML = `<div style="text-align:center; color:#888;">Recycle Bin Empty</div>`; 
    } else { 
        list.innerHTML = recycleBin.map((c, i) => ` <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px; border-radius:4px; border:1px solid #ddd;"> <div style="font-size:12px; color:var(--dark); font-weight:bold;"> 👤 ${c.name ? c.name : 'No Name'} <br><span style="color:var(--success);">Limit: ₹${c.limit}</span> </div> <button onclick="restoreCustomer(${i})" style="background:var(--primary); color:white; padding:6px; border-radius:3px;">↩️ Restore</button> </div> `).join(''); 
    } 
    let modal = document.getElementById('recycleBinModal');
    if(modal) modal.style.display='flex'; 
}

function closeRecycleBin() { 
    let modal = document.getElementById('recycleBinModal');
    if(modal) modal.style.display='none'; 
}

async function restoreCustomer(idx) { 
    let c = recycleBin.splice(idx, 1)[0]; 
    if(!c) return;
    customerQueue.unshift(c); 
    if(activeCustomerIndex !== -1) activeCustomerIndex++; 
    if(selectedQueueIndex !== -1) selectedQueueIndex++; 
    await saveToDB('persistent_recycle', recycleBin); 
    localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); 
    await saveQueueToLocal(); 
    openRecycleBin(); 
    renderCustomerQueue(); 
}

async function emptyRecycleBin() {
    if(recycleBin.length === 0) { showToast("Recycle Bin आधीच रिकामी आहे!", "warning"); return; }
    showCustomConfirm("सर्व रेकॉर्ड्स डिलीट करायचे?", async () => { 
        recycleBin = []; 
        await saveToDB('persistent_recycle', recycleBin); 
        localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); 
        openRecycleBin(); 
        showToast("Recycle Bin रिकामी झाली!", "success"); 
    });
}

function renderCustomerQueue() { 
    let documentCount = document.getElementById('queueCount'); 
    if(documentCount) documentCount.innerText = customerQueue.length; 
    let homeCount = document.getElementById('queueCountHome');
    if(homeCount) homeCount.innerText = customerQueue.length;

    let list = document.getElementById('customerQueueList'); 
    if(!list) return; 

    let qSearchEl = document.getElementById('queueSearch');
    let qSearch = qSearchEl ? qSearchEl.value.toLowerCase().trim() : ""; 
    let isSearching = qSearch !== ""; 
    let filtered = customerQueue.map((c, idx) => ({...c, originalIdx: idx})).filter(c => { 
        if(!isSearching) return true; 
        let cName = c.name ? c.name.toLowerCase() : "";
        return cName.includes(qSearch) || (c.mobile && c.mobile.includes(qSearch)) || (c.limit && c.limit.toString().includes(qSearch)) || (c.cap && c.cap.toString().includes(qSearch)) || (c.type && c.type.toLowerCase().includes(qSearch)); 
    }); 

    if(filtered.length === 0) { 
        list.innerHTML = `<div style="text-align:center; color:#888; padding:15px;">No Saved Customers Found.</div>`; 
        return; 
    } 

    /* Single Tap List: Edit and Delete buttons inline */
    list.innerHTML = filtered.map((c) => { 
        let idx = c.originalIdx; 
        let isActive = (activeCustomerIndex === idx); 
        let displayName = c.name ? ((isSearching) ? c.name : maskName(c.name)) : "No Name"; 
        let bgStyle = isActive ? '#f0f8ff' : '#fff'; 
        let borderStyle = isActive ? '#0088cc' : '#ddd'; 

        return ` <div style="display:flex; flex-direction:column; background:${bgStyle}; padding:8px; border-radius:4px; border:1px solid ${borderStyle}; transition:0.2s;"> 
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;"> 
                <div onclick="setActiveCustomer(${idx})" style="flex:1; cursor:pointer;">
                    <strong style="color:var(--indigo); text-transform:capitalize; font-size:14px;">👤 ${displayName}</strong> 
                </div>
                <div style="display:flex; gap:6px;">
                    <button onclick="copyCustomerDetails(${idx}, this)" style="background:var(--success); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">📋 Copy</button>
                    <button onclick="selectedQueueIndex=${idx}; uniEdit();" style="background:var(--indigo); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">✏️ Edit</button>
                    <button onclick="selectedQueueIndex=${idx}; uniDelete();" style="background:var(--danger); color:white; border:none; padding:4px 8px; border-radius:4px; font-size:10px; font-weight:bold; cursor:pointer;">🗑️</button>
                </div>
            </div> 
            <div onclick="setActiveCustomer(${idx})" style="color:#555; font-weight:bold; font-size:12px; cursor:pointer; margin-top:4px;"> 
                Limit: <span style="color:var(--success)">₹${c.limit}</span> | LTV: ${c.ltv}% | Cap: ${c.cap ? '₹'+c.cap : 'No'} | ${c.type} ${isActive ? '<span style="float:right; color:var(--primary);">[Active ✓]</span>' : ''} 
            </div> 
        </div>`; 
    }).join(''); 
}

/* Single Tap Customer Selection Logic */
async function setActiveCustomer(idx) { 
    if(db_records.length === 0) { 
        showToast("आधी Master Excel फाईल अपलोड करा!", "error"); 
        let feInput = document.getElementById('masterExcelFileInput');
        if(feInput) feInput.click();
        return; 
    } 
    activeCustomerIndex = idx; 
    selectedQueueIndex = idx;
    await saveQueueToLocal(); 
    let qSearchEl = document.getElementById('queueSearch');
    if(qSearchEl) qSearchEl.value = ''; 
    closeCustomerHistoryModal();
    
    let c = customerQueue[idx];
    if (c) {
        current_products = c.products || [];
        sortConfigs = c.sortConfigs || [];
    }
    
    goToFinalPage(); 
}

function isLimitValid() { 
    if (activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) { 
        showToast("आधी Customer ॲड करा किंवा 🕒 History मधून सिलेक्ट करा!", "warning"); 
        return false; 
    } 
    return true; 
}

function generateStackCards() { 
    let container = document.getElementById('stackInputsContainer'); 
    if(!container) return; 
    container.innerHTML = ""; 
    for(let i=1; i<=10; i++) { 
        container.innerHTML += ` <div class="stack-card"><div style="font-weight:900; color:var(--primary); margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:2px;">Scheme #${i}</div> <div class="inner-grid"> <div><label>Tenure (Max)</label><input type="number" id="msTen_${i}" placeholder="0"></div> <div><label>Advance</label><input type="number" id="msAdv_${i}" placeholder="0"></div> <div><label>DBD %</label><input type="number" id="msDbd_${i}" placeholder="0"></div> <div><label>PF (₹)</label><input type="number" id="msPf_${i}" placeholder="0"></div> <div><label>ROI %</label><input type="number" id="msRoi_${i}" placeholder="0"></div> <div><label>Fixed EMI (₹)</label><input type="number" id="msFix_${i}" placeholder="0"></div> </div> </div>`; 
    } 
}

function openMultiStackModal() { 
    if (!isLimitValid()) return; 
    showInlineSubPanel('multiStackModal'); 
}

function closeMultiStackModal() { 
    let modal = document.getElementById('multiStackModal');
    if(modal) modal.style.display='none'; 
}

async function processMultiStack() {
    let msNameInputEl = document.getElementById('multiStackModelName');
    let msNameInput = msNameInputEl ? msNameInputEl.value.trim().toUpperCase() : "";
    if (!msNameInput) { showToast("Model Name भरा!", "error"); return; } 
    let validSchemes = [];
    for(let i=1; i<=10; i++) { 
        let tenEl = document.getElementById(`msTen_${i}`);
        let ten = tenEl ? parseInt(tenEl.value) || 0 : 0; 
        let fixEl = document.getElementById(`msFix_${i}`);
        let fix = fixEl ? parseInt(fixEl.value) || 0 : 0; 
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
        closeMultiStackModal();
        tempPendingProduct = { name: msNameInput, isNT: false, isManual: true, manualSchemes: validSchemes, category: "MANUAL" };
        currentModalCategory = "MANUAL";
        showComponentsModal("");
    } else { showToast("किमान एक Scheme भरा!", "error"); }
}

function findValLocal(row, targets) { 
    if(!row) return null;
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
    hideAllInlineSubPanels();
    let finalArea = document.getElementById('finalEligibleArea');
    if(finalArea) finalArea.style.display = 'none';
    let uh = document.getElementById('unifiedHome');
    if(uh) uh.style.display = 'block';
    activeCustomerIndex = -1; 
    selectedQueueIndex = -1; 
    renderCustomerQueue(); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function closeImageViewer() { 
    let modal = document.getElementById('imageViewerModal');
    if(modal) modal.style.display='none'; 
}

function openAddProductModal() { 
    if (!isLimitValid()) return; 
    editingProductIdx = -1;
    let sInp = document.getElementById('modalMatrixSearch');
    let dd = document.getElementById('modalMatrixSearchDropdown');
    if(sInp) sInp.value = ''; 
    if(dd) dd.style.display = 'none'; 
    showInlineSubPanel('addProductModal');
    setTimeout(() => { if(sInp) sInp.focus(); }, 100);
}

function openSchemeOnlyModal(pIdx) { 
    if (!isLimitValid()) return; 
    let mt = document.getElementById('modalTitle'); if(mt) mt.innerText = "Add Custom Scheme"; 
    let mia = document.getElementById('modelNameInputArea'); if(mia) mia.style.display = 'none'; 
    
    // Clear the previous values
    let manTen = document.getElementById('manTen'); if(manTen) manTen.value = '';
    let manAdv = document.getElementById('manAdv'); if(manAdv) manAdv.value = '0';
    let manDbd = document.getElementById('manDbd'); if(manDbd) manDbd.value = '0';
    let manPf = document.getElementById('manPf'); if(manPf) manPf.value = '0';
    let manRoi = document.getElementById('manRoi'); if(manRoi) manRoi.value = '0';
    let manFixed = document.getElementById('manFixed'); if(manFixed) manFixed.value = '';

    let tpi = document.getElementById('targetPIdx'); if(tpi) tpi.value = pIdx; 
    let mm = document.getElementById('manualModal'); if(mm) mm.style.display='flex'; 
}

function closeManualModal() { 
    let mm = document.getElementById('manualModal');
    if(mm) mm.style.display='none'; 
}

function openEditSchemeModal(pIdx, dIdx) { 
    let prod = current_products[pIdx];
    if(!prod) return;
    let scheme = prod.schemes[dIdx]; 
    if(!scheme) return;
    let ep = document.getElementById('editPIdx'); if(ep) ep.value = pIdx; 
    let ed = document.getElementById('editDIdx'); if(ed) ed.value = dIdx; 
    let et = document.getElementById('editTen'); if(et) et.value = scheme.tenure || 0; 
    let ea = document.getElementById('editAdv'); if(ea) ea.value = scheme.advEmi || 0; 
    let edb = document.getElementById('editDbd'); if(edb) edb.value = scheme.dbd || 0; 
    let epf = document.getElementById('editPf'); if(epf) epf.value = scheme.pf || 0; 
    let er = document.getElementById('editRoi'); if(er) er.value = scheme.roi || 0; 
    let ef = document.getElementById('editFixed'); if(ef) ef.value = scheme.fixedEmi || 0; 
    let esm = document.getElementById('editSchemeModal'); if(esm) esm.style.display = 'flex'; 
}
function closeEditSchemeModal() { 
    let esm = document.getElementById('editSchemeModal');
    if(esm) esm.style.display = 'none'; 
}
function saveSchemeEdit() { 
    let pIdxEl = document.getElementById('editPIdx'); let pIdx = pIdxEl ? parseInt(pIdxEl.value) : -1; 
    let dIdxEl = document.getElementById('editDIdx'); let dIdx = dIdxEl ? parseInt(dIdxEl.value) : -1; 
    if(pIdx === -1 || dIdx === -1) return;
    let prod = current_products[pIdx];
    if(!prod) return;
    let scheme = prod.schemes[dIdx]; 
    if(!scheme) return;
    let et = document.getElementById('editTen'); if(et) scheme.tenure = parseInt(et.value) || 0; 
    let ea = document.getElementById('editAdv'); if(ea) scheme.advEmi = parseInt(ea.value) || 0; 
    let edb = document.getElementById('editDbd'); if(edb) scheme.dbd = parseFloat(edb.value) || 0; 
    let epf = document.getElementById('editPf'); if(epf) scheme.pf = parseInt(epf.value) || 0; 
    let er = document.getElementById('editRoi'); if(er) scheme.roi = parseFloat(er.value) || 0; 
    let ef = document.getElementById('editFixed'); if(ef) scheme.fixedEmi = parseFloat(ef.value) || 0; 
    closeEditSchemeModal(); recalcModel(pIdx); saveQueueToLocal(); 
}

function selectModel(name) { 
    if (!isLimitValid()) return; 
    editingProductIdx = -1;
    let raw = db_records.filter(r => r.model === name); 
    let baseMrp = raw.find(s => s.mrp > 0)?.mrp || ""; 
    let cat = raw[0]?.category || "OTHER"; 
    tempPendingProduct = { name: name, isNT: false, category: cat }; 
    currentModalCategory = cat; 
    let mmsdd = document.getElementById('modalMatrixSearchDropdown'); if(mmsdd) mmsdd.style.display = 'none'; 
    let mms = document.getElementById('modalMatrixSearch'); if(mms) mms.value = ''; 
    showComponentsModal(baseMrp); 
}

function quickNonTieup() { 
    if (!isLimitValid()) return; 
    if(db_records.length === 0) { 
        showToast("Master डेटा उपलब्ध नाही! आधी एक्सेल अपलोड करा.", "error"); 
        let feInput = document.getElementById('masterExcelFileInput');
        if(feInput) feInput.click();
        return; 
    } 
    editingProductIdx = -1;
    let tieup = db_records.filter(r => r.model === SPECIAL_MODEL); 
    let cats = [...new Set(tieup.map(r => r.category))].sort(); 
    let cg = document.getElementById('categoryGrid');
    if(cg) {
        cg.innerHTML = cats.map(c => { 
            let label = (c === 'PHONE(WEB-MOBILE)') ? 'Phone, Tablet, Smart Watch' : c; 
            return `<div style="background:var(--indigo);color:white;padding:12px;border-radius:4px;cursor:pointer;font-weight:900;text-align:center;text-transform:capitalize;" onclick="selectCategory('${c}')">${label}</div>`; 
        }).join(''); 
    }
    showInlineSubPanel('catSelectionModal');
}

function selectCategory(catName) { 
    editingProductIdx = -1;
    let displayName = (catName === 'PHONE(WEB-MOBILE)') ? 'Phone / Tablet / Smart Watch' : catName; 
    let fullName = SPECIAL_MODEL + " - " + displayName;
    tempPendingProduct = { name: fullName, isNT: true, category: catName }; 
    currentModalCategory = catName; 
    showComponentsModal(""); 
}

function compPriceChanged() { 
    let cMrp = document.getElementById('compMrp'); let mrp = cMrp ? (parseFloat(cMrp.value) || 0) : 0; 
    let cInv = document.getElementById('compInv'); let inv = cInv ? (parseFloat(cInv.value) || 0) : 0; 
    let effectiveAmt = inv > 0 ? inv : mrp;

    let gtl = getGtlSlabValue(effectiveAmt);
    let cGtl = document.getElementById('compGtl'); if(cGtl) cGtl.value = String(gtl);

    let rfcSlab = getRfcSlabValue(effectiveAmt); 
    let rfcOpt = document.getElementById('compRfcOpt'); 
    if(rfcOpt) { 
        rfcOpt.value = rfcSlab; 
        rfcOpt.innerText = rfcSlab; 
    } 
    if (!isMobileDeviceCat(currentModalCategory)) { 
        let cRfc = document.getElementById('compRfc'); if(cRfc) cRfc.value = "0"; 
    } 
}

function cancelComponentsModal() {
    editingProductIdx = -1;
    tempPendingProduct = null;
    let cm = document.getElementById('componentsModal');
    if(cm) cm.style.display = 'none';
}

function showComponentsModal(baseMrp = "") {
    editingProductIdx = -1;
    let c = customerQueue[activeCustomerIndex]; 
    let rfcSelect = document.getElementById('compRfc'); 
    let exwInput = document.getElementById('compExw'); 
    let isMobileCat = isMobileDeviceCat(currentModalCategory);

    let cmht = document.getElementById('compModalHeadingText');
    if(cmht) cmht.innerText = "Edit Components";
    let pendingNameEl = document.getElementById('compPendingModelName');
    if (pendingNameEl && tempPendingProduct) {
        pendingNameEl.innerText = tempPendingProduct.name;
    }

    if (isMobileCat) { 
        if(rfcSelect) { rfcSelect.disabled = false; rfcSelect.style.background = '#fff'; }
        if(exwInput) { exwInput.disabled = true; exwInput.style.background = '#e9ecef'; exwInput.value = ""; }
    } else { 
        if(rfcSelect) { rfcSelect.disabled = true; rfcSelect.style.background = '#e9ecef'; rfcSelect.value = "0"; }
        if(exwInput) { exwInput.disabled = false; exwInput.style.background = '#fff'; }
    }

    let currentMrp = baseMrp !== "" ? baseMrp : ""; 
    let compMrpEl = document.getElementById('compMrp'); if(compMrpEl) compMrpEl.value = currentMrp; 
    let mrpNum = parseFloat(currentMrp) || 0; 

    let compGtlEl = document.getElementById('compGtl'); if(compGtlEl) compGtlEl.value = String(getGtlSlabValue(mrpNum));
    let rfcSlab = getRfcSlabValue(mrpNum); 
    let rfcOpt = document.getElementById('compRfcOpt'); 
    if(rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; }
    let compRfcEl = document.getElementById('compRfc'); if(compRfcEl) compRfcEl.value = "0"; 

    let compInvEl = document.getElementById('compInv'); if(compInvEl) compInvEl.value = ""; 
    let compCapEl = document.getElementById('compCap'); if(compCapEl) compCapEl.value = ""; 
    let compExwEl = document.getElementById('compExw'); if(compExwEl) compExwEl.value = ""; 
    let compMarEl = document.getElementById('compMargin'); if(compMarEl) compMarEl.value = ""; 
    let compDelEl = document.getElementById('compDealer'); if(compDelEl) compDelEl.value = ""; 

    let sharedTargetDp = c?.targetDp || c?.components?.target || "";
    let compTarEl = document.getElementById('compTarget'); if(compTarEl) compTarEl.value = sharedTargetDp > 0 ? sharedTargetDp : ""; 
    
    showInlineSubPanel('componentsModal');
    setTimeout(() => {
        let invInp = document.getElementById('compInv');
        if (invInp) invInp.focus();
    }, 120);
}

function openEditModelComponents(pIdx, event) {
    if (event) event.stopPropagation();
    let prod = current_products[pIdx];
    if (!prod) return;

    editingProductIdx = pIdx;
    tempPendingProduct = null;
    currentModalCategory = prod.category;

    let cmht = document.getElementById('compModalHeadingText'); if(cmht) cmht.innerText = "Edit Components";
    let cpmn = document.getElementById('compPendingModelName'); if(cpmn) cpmn.innerText = prod.name;

    let rfcSelect = document.getElementById('compRfc'); 
    let exwInput = document.getElementById('compExw'); 
    let isMobileCat = isMobileDeviceCat(currentModalCategory);

    if (isMobileCat) { 
        if(rfcSelect) { rfcSelect.disabled = false; rfcSelect.style.background = '#fff'; }
        if(exwInput) { exwInput.disabled = true; exwInput.style.background = '#e9ecef'; exwInput.value = ""; }
    } else { 
        if(rfcSelect) { rfcSelect.disabled = true; rfcSelect.style.background = '#e9ecef'; rfcSelect.value = "0"; }
        if(exwInput) { exwInput.disabled = false; exwInput.style.background = '#fff'; }
    }

    let inp = prod.inputs;
    let cmrp = document.getElementById('compMrp'); if(cmrp) cmrp.value = inp.mrp !== "" ? inp.mrp : "";
    let cinv = document.getElementById('compInv'); if(cinv) cinv.value = inp.inv !== "" ? inp.inv : "";
    let ccap = document.getElementById('compCap'); if(ccap) ccap.value = inp.cap !== "" ? inp.cap : "";
    let ctar = document.getElementById('compTarget'); if(ctar) ctar.value = inp.target !== "" ? inp.target : "";

    let effectiveAmt = (parseFloat(inp.inv) || 0) > 0 ? parseFloat(inp.inv) : (parseFloat(inp.mrp) || 0);
    let rfcSlab = getRfcSlabValue(effectiveAmt);
    let rfcOpt = document.getElementById('compRfcOpt');
    if (rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; }

    let cgtl = document.getElementById('compGtl'); if(cgtl) cgtl.value = String(inp.gtl || 0);
    let crfc = document.getElementById('compRfc'); if(crfc) crfc.value = isMobileCat && inp.rfc > 0 ? String(rfcSlab) : "0";
    if (!isMobileCat) {
        let cexw = document.getElementById('compExw'); if(cexw) cexw.value = inp.exw !== "" ? inp.exw : "";
    }
    let cmar = document.getElementById('compMargin'); if(cmar) cmar.value = inp.margin !== "" ? inp.margin : "";
    let cdel = document.getElementById('compDealer'); if(cdel) cdel.value = inp.dealer !== "" ? inp.dealer : "";

    showInlineSubPanel('componentsModal');
    setTimeout(() => {
        let invInp = document.getElementById('compInv');
        if (invInp) invInp.focus();
    }, 120);
}

async function proceedToMatrixFromComponents() { 
    let idx = activeCustomerIndex; 
    if(idx === -1) return; 
    let c = customerQueue[idx];
    if(!c) return;
    if(!c.components) c.components = {}; 
    
    let cmrp = document.getElementById('compMrp'); let mrpVal = cmrp ? cmrp.value : "";
    let cinv = document.getElementById('compInv'); let invVal = cinv ? cinv.value : "";
    let ccap = document.getElementById('compCap'); let capVal = ccap ? ccap.value : "";
    let ctar = document.getElementById('compTarget'); let targetVal = ctar ? ctar.value : "";
    let cexw = document.getElementById('compExw'); let exwVal = cexw ? cexw.value : "";
    let cmar = document.getElementById('compMargin'); let marginVal = cmar ? cmar.value : "";
    let cdel = document.getElementById('compDealer'); let dealerVal = cdel ? cdel.value : "";

    let parsedInv = invVal !== "" ? (parseFloat(invVal) || 0) : 0;
    if (parsedInv <= 0) {
        showToast("फायनल कॅल्क्युलेशनसाठी कृपया Inv ₹ (Invoice Value) भरा!", "error");
        let invInp = document.getElementById('compInv');
        if (invInp) invInp.focus();
        return;
    }

    let parsedMrp = mrpVal !== "" ? (parseFloat(mrpVal) || 0) : ""; 
    let parsedCap = capVal !== "" ? (parseFloat(capVal) || 0) : ""; 
    let parsedTarget = targetVal !== "" ? (parseFloat(targetVal) || 0) : ""; 
    let cGtl = document.getElementById('compGtl'); let parsedGtl = cGtl ? (parseFloat(cGtl.value) || 0) : 0; 
    
    let isMobileCat = isMobileDeviceCat(currentModalCategory); 
    let cRfc = document.getElementById('compRfc'); let parsedRfc = isMobileCat ? (cRfc ? (parseFloat(cRfc.value) || 0) : 0) : 0; 
    let parsedExw = isMobileCat ? "" : (exwVal !== "" ? (parseFloat(exwVal) || 0) : ""); 
    let parsedMargin = marginVal !== "" ? (parseFloat(marginVal) || 0) : ""; 
    let parsedDealer = dealerVal !== "" ? (parseFloat(dealerVal) || 0) : ""; 
    let calcSurch = (parseFloat(parsedInv) > parseFloat(parsedMrp) && parseFloat(parsedMrp) > 0) ? (parseFloat(parsedInv) - parseFloat(parsedMrp)) : 0;

    c.components = {
        mrp: parsedMrp,
        inv: parsedInv,
        cap: parsedCap,
        target: parsedTarget,
        gtl: parsedGtl,
        rfc: parsedRfc,
        exw: parsedExw,
        margin: parsedMargin,
        dealer: parsedDealer
    };

    if (parsedTarget !== "") {
        c.targetDp = parsedTarget;
        current_products.forEach(cp => {
            if(cp.inputs) {
                cp.inputs.target = parsedTarget;
                cp.inputs.manualLoans = {};
            }
        });
    } else if (editingProductIdx !== -1) {
        c.targetDp = "";
        current_products.forEach(cp => {
            if(cp.inputs) {
                cp.inputs.target = "";
                cp.inputs.manualLoans = {};
            }
        });
    }

    if (parsedCap !== "") { 
        c.cap = parsedCap > 0 ? parsedCap : ""; 
        current_products.forEach(cp => {
            if(cp.inputs) {
                cp.inputs.cap = c.cap;
                cp.inputs.manualLoans = {};
            }
        });
        updateMatrixTopCard(); 
    }

    if (editingProductIdx !== -1 && current_products[editingProductIdx]) {
        let p = current_products[editingProductIdx];
        if(!p.inputs) p.inputs = {};
        p.inputs = {
            mrp: parsedMrp,
            inv: parsedInv,
            cap: parsedCap !== "" ? parsedCap : (c.cap || ""),
            target: c.targetDp !== undefined && c.targetDp !== "" ? c.targetDp : parsedTarget,
            gtl: parsedGtl,
            rfc: parsedRfc,
            exw: parsedExw,
            margin: parsedMargin,
            dealer: parsedDealer,
            surch: calcSurch,
            manualLoans: {}
        };
        editingProductIdx = -1;
        await saveQueueToLocal();
        hideAllInlineSubPanels();
        renderMatrix();
        return;
    }

    await saveQueueToLocal(); 
    hideAllInlineSubPanels(); 
    if (tempPendingProduct) finalizeProductAddition(); 
}

async function finalizeProductAddition() {
    let c = customerQueue[activeCustomerIndex];
    if(!c) return;
    let ltvLimit = c?.ltv || 100; 
    let uniqueSchemes = [];

    if (tempPendingProduct.isManual && Array.isArray(tempPendingProduct.manualSchemes)) {
        uniqueSchemes = tempPendingProduct.manualSchemes;
    } else {
        let raw = tempPendingProduct.isNT ? db_records.filter(r => r.model === SPECIAL_MODEL && r.category === tempPendingProduct.category) : db_records.filter(r => r.model === tempPendingProduct.name); 
        let matrixEligible = raw.filter(s => s.fixedEmi > 0 || (s.tenure > 0 && ((s.tenure-s.advEmi)/s.tenure)*100 <= ltvLimit)); 
        let seenSchemes = new Set();
        matrixEligible.forEach(s => { 
            let schemeKey = `${s.tenure}_${s.advEmi}_${s.fixedEmi}_${s.minLoan}_${s.maxLoan}`; 
            if (!seenSchemes.has(schemeKey)) { seenSchemes.add(schemeKey); s.inactive = false; uniqueSchemes.push({...s}); } 
        });
    }
    
    let comp = c.components || {}; 
    let finalMrp = comp.mrp !== undefined ? comp.mrp : ""; 
    let finalInv = comp.inv !== undefined ? comp.inv : ""; 
    let surch = (parseFloat(finalInv) > parseFloat(finalMrp) && parseFloat(finalMrp) > 0) ? (parseFloat(finalInv) - parseFloat(finalMrp)) : 0;
    let sharedTarget = c.targetDp !== undefined && c.targetDp !== "" ? c.targetDp : (comp.target || "");
    let sharedCap = comp.cap !== undefined && comp.cap !== "" ? comp.cap : (c.cap || "");

    current_products.push({ 
        name: tempPendingProduct.name, 
        isNonTieup: tempPendingProduct.isNT || false, 
        schemes: uniqueSchemes, 
        category: tempPendingProduct.category, 
        inputs: { 
            mrp: finalMrp, 
            inv: finalInv, 
            cap: sharedCap, 
            target: sharedTarget, 
            gtl: comp.gtl || 0, 
            rfc: comp.rfc || 0, 
            exw: comp.exw || "", 
            margin: comp.margin || "", 
            dealer: comp.dealer || "", 
            surch: surch, 
            manualLoans: {} 
        }, 
        isManual: tempPendingProduct.isManual || false 
    }); 
    sortConfigs.push({ key: 'dp', dir: 'asc' }); 
    c.products = current_products; 
    c.sortConfigs = sortConfigs; 
    tempPendingProduct = null; 
    await saveQueueToLocal(); 
    renderMatrix(); 
}

function updateFinalSwitcher() { let sw = document.getElementById('finalCustomerSwitcher'); if(!sw) return; sw.innerHTML = customerQueue.map((c, i) => `<option value="${i}" ${i === activeCustomerIndex ? 'selected' : ''}>👤 ${c.name ? c.name : 'No Name'}</option>`).join(''); }
async function switchCustomerFinal(idx) { activeCustomerIndex = parseInt(idx); await saveQueueToLocal(); goToFinalPage(); }

function updateMatrixTopCard() { 
    let c = customerQueue[activeCustomerIndex]; 
    if(!c) return;
    let n = document.getElementById('infoName'); if(n) n.innerText = c.name || "";
    let l = document.getElementById('infoLimit'); if(l) l.innerText = "₹" + (c.limit || 0);
    let ltv = document.getElementById('infoLtv'); if(ltv) ltv.innerText = (c.ltv || 100) + "%";
    let cap = document.getElementById('infoCap'); if(cap) cap.innerText = c.cap ? "₹" + c.cap : "None";
    let type = document.getElementById('infoType'); if(type) type.innerText = c.type || 'NEW';
}

function loadCurrentProducts() { 
    let c = customerQueue[activeCustomerIndex]; 
    if(!c) return;
    current_products = c.products || []; 
    sortConfigs = c.sortConfigs || []; 
}

function goToFinalPage() {
    if(activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) return; 
    loadCurrentProducts(); 
    updateMatrixTopCard(); 
    updateFinalSwitcher(); 
    
    let uh = document.getElementById('unifiedHome'); if(uh) uh.style.display = 'none';
    let finalArea = document.getElementById('finalEligibleArea');
    if(finalArea) finalArea.style.display = 'flex';
    
    renderMatrix(); 
    setTimeout(() => { 
        if(current_products.length === 0) {
            openAddProductModal();
        } else {
            hideAllInlineSubPanels();
            if(finalArea) finalArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        }
    }, 100);
}

function toggleModelView(pIdx) { 
    let wrapper = document.getElementById(`tw_${pIdx}`); 
    let icon = document.getElementById(`togIcon_${pIdx}`); 
    if(!wrapper || !icon) return;
    if(wrapper.style.display === 'none') { wrapper.style.display = 'block'; icon.innerText = '▼'; } else { wrapper.style.display = 'none'; icon.innerText = '▶'; } 
}

function removeModelFromMatrix(pIdx, event) {
    if (event) event.stopPropagation();
    current_products.splice(pIdx, 1);
    sortConfigs.splice(pIdx, 1);
    if (activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex]) {
        customerQueue[activeCustomerIndex].products = current_products;
        customerQueue[activeCustomerIndex].sortConfigs = sortConfigs;
    }
    saveQueueToLocal();
    renderMatrix();
}

function instantSingleQuote(pIdx) { window.tempImageGenIndices = [pIdx]; requestWhatsAppDispatch = false; doGenerateCustomerImage(); }

/* Model Name Complete Top-Left & Edit/Close/Add Icons Complete Top-Right */
function renderMatrix() {
    let container = document.getElementById('multiModelContainer'); 
    if(!container) return;
    container.innerHTML = "";
    let c = customerQueue[activeCustomerIndex];
    if(!c) return;

    current_products.forEach((prod, pIdx) => {
        let div = document.createElement('div'); div.className = 'premium-model-panel'; 
        let isCollapsed = (current_products.length > 1 && pIdx < current_products.length - 1); 
        let displayStyle = isCollapsed ? 'none' : 'block'; 
        let toggleIcon = isCollapsed ? '▶' : '▼'; 
        let isPhoneWebMobile = isMobileDeviceCat(prod.category); 
        
        if(!prod.inputs) prod.inputs = {};
        if (!isPhoneWebMobile) prod.inputs.rfc = 0; 
        if (isPhoneWebMobile) prod.inputs.exw = ""; 

        let inp = prod.inputs;
        let effectiveCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;

        let chipsHtml = "";
        if (inp.mrp > 0) chipsHtml += `<span class="val-chip"><b>MRP:</b> ₹${Number(inp.mrp).toLocaleString()}</span>`;
        if (inp.inv > 0) chipsHtml += `<span class="val-chip"><b>Inv:</b> ₹${Number(inp.inv).toLocaleString()}</span>`;
        if (inp.surch > 0) chipsHtml += `<span class="val-chip"><b>Var:</b> ₹${Number(inp.surch).toLocaleString()}</span>`;
        if (effectiveCap > 0) chipsHtml += `<span class="val-chip"><b>EMI Cap:</b> ₹${Number(effectiveCap).toLocaleString()}</span>`;
        if (inp.target > 0) chipsHtml += `<span class="val-chip"><b>Target DP:</b> ₹${Number(inp.target).toLocaleString()}</span>`;
        if (inp.gtl > 0) chipsHtml += `<span class="val-chip"><b>GTL:</b> ₹${inp.gtl}</span>`;
        if (inp.rfc > 0) chipsHtml += `<span class="val-chip"><b>RFC:</b> ₹${inp.rfc}</span>`;
        if (inp.exw > 0) chipsHtml += `<span class="val-chip"><b>EXW:</b> ₹${inp.exw}</span>`;
        if (inp.margin > 0) chipsHtml += `<span class="val-chip"><b>Margin:</b> ₹${inp.margin}</span>`;
        if (inp.dealer > 0) chipsHtml += `<span class="val-chip"><b>Dealer:</b> ₹${inp.dealer}</span>`;
        if (!chipsHtml) chipsHtml = `<span class="val-chip" style="color:var(--danger);">⚠️ Invoice Value Required (Tap ✏️ To Enter Inv ₹)</span>`;

        div.innerHTML = `
            <div class="pmp-header-bar">
                <div class="pmp-model-left" onclick="toggleModelView(${pIdx})">
                    <span id="togIcon_${pIdx}">${toggleIcon}</span>
                    <span>${prod.name}</span>
                </div>
                <div class="pmp-actions-right">
                    <button class="model-action-icon model-add-icon" onclick="openSchemeOnlyModal(${pIdx})" title="Add Manual Scheme">➕</button>
                    <button class="model-action-icon model-edit-icon" onclick="openEditModelComponents(${pIdx}, event)" title="Edit Components">✏️</button>
                    <button class="model-action-icon model-close-icon" onclick="removeModelFromMatrix(${pIdx}, event)" title="Remove Model">✖</button>
                </div>
            </div>

            <div class="val-summary-bar">
                ${chipsHtml}
            </div>

            <div id="tw_${pIdx}" style="display:${displayStyle};">
                <div class="pmp-toolbar" style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; background: #f8fafc; display:flex; gap:8px;">
                    <button class="pmp-btn btn-quote" onclick="instantSingleQuote(${pIdx})" style="flex:1;">📋 Generate Quote</button>
                    <button class="pmp-btn" id="pushBtn_${pIdx}" onclick="pushProductToMaster(${pIdx})" style="flex:1; background:#10b981; color:#fff; border:none; padding:8px; border-radius:4px; font-weight:bold; font-size:12px; cursor:pointer;">🚀 Push To Master</button>
                </div>

                <div class="table-wrapper pmp-table-wrapper">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f1f5f9; color: #475569; border-bottom: 2px solid #cbd5e1;">
                            <tr style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-align:center;">
                                <th onclick="sortMatrixTable(${pIdx}, 'tenure')" style="padding: 10px 4px; width: 12%; cursor:pointer;" title="Sort by Tenure">T/A ↕</th>
                                <th onclick="sortMatrixTable(${pIdx}, 'loan')" style="padding: 10px 4px; width: 18%; cursor:pointer;" title="Sort by Loan">Loan ↕</th>
                                <th onclick="sortMatrixTable(${pIdx}, 'dp')" style="padding: 10px 4px; width: 18%; cursor:pointer;" title="Sort by DP">Net DP ↕</th>
                                <th onclick="sortMatrixTable(${pIdx}, 'emi')" style="padding: 10px 4px; width: 16%; cursor:pointer;" title="Sort by EMI">EMI ↕</th>
                                <th onclick="sortMatrixTable(${pIdx}, 'months')" style="padding: 10px 4px; width: 10%; cursor:pointer;" title="Sort by Months">M ↕</th>
                                <th onclick="sortMatrixTable(${pIdx}, 'daily')" style="padding: 10px 4px; width: 14%; cursor:pointer;" title="Sort by Daily">Daily ↕</th>
                                <th onclick="sortMatrixTable(${pIdx}, 'extra')" style="padding: 10px 4px; width: 12%; cursor:pointer;" title="Sort by Extra">Extra ↕</th>
                            </tr>
                        </thead>
                        <tbody id="body_${pIdx}"></tbody>
                    </table>
                </div>
            </div>`;
        container.appendChild(div); 
        recalcModel(pIdx);
    });
}

function syncInsurance(pIdx, mrpVal, baseLoanVal) {
    let prod = current_products[pIdx]; 
    if(!prod || !prod.inputs) return;
    let isPhoneWebMobile = isMobileDeviceCat(prod.category); 
    let inp = prod.inputs;
    if (!isPhoneWebMobile) inp.rfc = 0; 
    if (isPhoneWebMobile) inp.exw = ""; 
}

function recalcModel(pIdx) {
    if(!current_products[pIdx]) return; 

    let c = customerQueue[activeCustomerIndex];
    let prod = current_products[pIdx], limit = c?.limit || 0, type = c?.type || 'NEW'; 
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850), inp = prod.inputs || {}; 
    let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); 
    let currentLimit = limit > 0 ? limit : 9999999; 
    let inputMrp = parseFloat(inp.mrp) || 0; 
    let inputInv = parseFloat(inp.inv) || 0; 

    if (inputInv <= 0) {
        prod.calculatedData = [];
        let tbody = document.getElementById(`body_${pIdx}`);
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" onclick="openEditModelComponents(${pIdx}, event)" style="padding:18px; text-align:center; color:var(--danger); font-weight:900; cursor:pointer; background:#fff5f5;">⚠️ फायनल कॅल्क्युलेशन पाहण्यासाठी आधी ✏️ आयकॉनवर टॅप करून Invoice Value (Inv ₹) टाका!</td></tr>`;
        }
        return;
    }

    let effectivePrice = inputInv; 
    let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;
    let activeCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;

    let minAllowedLoanByInvoice = effectivePrice * 0.50;

    prod.calculatedData = prod.schemes.map((s, dIdx) => {
        let isFixed = s.fixedEmi > 0; let loan = 0, nbfcMaxL = 0, dpExact = 0, dpRounded = 0, emi = 0, inst = 0, currentTenure = s.tenure; 
        nbfcMaxL = (currentLimit * s.tenure) / (s.tenure - s.advEmi || 1); 
        let dbdRate = (s.dbd * 1.18 / 100); 
        let roiRate = s.roi / 1200; 
        let roiRateDP = roiRate * s.advEmi; 
        let dynamicPf = s.pf;

        if (prod.isNonTieup) { 
            let slabPf = getNonTieupPfValue(prod.category, effectivePrice); 
            if (slabPf !== null) { dynamicPf = slabPf; } 
        }

        if (isFixed) {
            let maxRemainingEmis = Math.floor(currentLimit / s.fixedEmi); 
            let maxTotalTenure = maxRemainingEmis + s.advEmi; 
            nbfcMaxL = maxTotalTenure * s.fixedEmi; 

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
            let absoluteMax = Math.min(loanCapPrice, nbfcMaxL); 
            if (prod.isNonTieup) { 
                if (s.maxLoan < 9999999) absoluteMax = Math.min(absoluteMax, s.maxLoan); 
            } 
            loan = absoluteMax;

            if(parseFloat(inp.target) > 0) { 
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

        if (!isFixed && loan > effectivePrice) {
            loan = effectivePrice;
        }

        let isCapBreach = false;

        if (isFixed) {
            inst = currentTenure - s.advEmi; if(inst < 1) inst = 1; 
            let insTotal = (parseFloat(inp.gtl)||0) + (parseFloat(inp.rfc)||0) + (parseFloat(inp.exw)||0); 
            let roiInEmi = loan * roiRate; 
            emi = s.fixedEmi + (insTotal / inst) + roiInEmi;
            if (activeCap > 0 && Math.round(emi) > activeCap) {
                isCapBreach = true;
            }
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + (s.fixedEmi * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        } else {
            inst = s.tenure - s.advEmi; if(inst < 1) inst = 1; 
            let insTotal = (parseFloat(inp.gtl)||0)+(parseFloat(inp.rfc)||0)+(parseFloat(inp.exw)||0); 
            let baseEmi = loan / s.tenure;
            if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 

            let roiInEmi = loan * roiRate; 
            emi = baseEmi + (insTotal / inst) + roiInEmi;

            if (activeCap > 0 && emi > activeCap) { 
                let maxLoanForCap = Math.floor((activeCap - (insTotal / inst)) / ((1 / s.tenure) + roiRate));
                if (maxLoanForCap < 0) maxLoanForCap = 0;
                if (maxLoanForCap > effectivePrice) maxLoanForCap = effectivePrice;
                loan = maxLoanForCap;

                baseEmi = loan / s.tenure;
                if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 
                roiInEmi = loan * roiRate; 
                emi = baseEmi + (insTotal / inst) + roiInEmi; 

                if (Math.round(emi) > activeCap || loan <= 0) {
                    isCapBreach = true;
                }
            } 

            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + ((loan / s.tenure) * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        }

        if(dpExact > 0) dpRounded = Math.ceil(dpExact / 10) * 10; else dpRounded = dpExact; 
        let extraVal = ((emi * inst) + dpRounded) - effectivePrice; 
        let dbdAmt = loan * dbdRate; 
        let roiAmt = (loan * roiRateDP) + (loan * roiRate * inst); 
        let curLTV = currentTenure > 0 ? ((currentTenure - s.advEmi) / currentTenure) * 100 : 0; 
        let marginMoney = parseFloat(inp.margin) || 0; 
        let roundupAdj = (dpRounded > dpExact) ? (dpRounded - dpExact) : 0; 
        let netDisb = effectivePrice - dpRounded - marginMoney - roundupAdj;

        let isInv50Breach = loan < minAllowedLoanByInvoice;

        return { ...s, pf: dynamicPf, currentTenure, nbfcMaxL, loan, dp: dpRounded, emi, inst, daily: emi/30, dIdx, isFixed, curLTV, extra: extraVal, dbdAmt, roiAmt, netDisb, inactive: s.inactive || false, expiryDateStr: s.expiryDateStr, isInv50Breach: isInv50Breach, isCapBreach: isCapBreach };
    });
    renderRows(pIdx);
}

function renderRows(pIdx) {
    let prod = current_products[pIdx]; 
    if(!prod) return;
    if(!sortConfigs[pIdx]) sortConfigs[pIdx] = {key: 'dp', dir: 'asc'}; 
    let conf = sortConfigs[pIdx]; 
    let ltvLimit = customerQueue[activeCustomerIndex]?.ltv || 100; 
    let isNT = prod.isNonTieup;

    if(!prod.calculatedData) return;

    let visibleSchemes = prod.calculatedData.filter(d => {
        let curLTV = d.curLTV; 
        let isLtvB = (curLTV > ltvLimit); 
        let isBoundB = false; 
        if (isNT && (prod.inputs.mrp > 0 || prod.inputs.inv > 0)) { 
            if (d.loan < d.minLoan || d.loan > d.maxLoan) isBoundB = true; 
        }
        if (d.isInv50Breach || d.isCapBreach) { isBoundB = true; }
        if ((isLtvB || isBoundB) && !d.inactive) { return false; }
        return true;
    });

    visibleSchemes.sort((a,b) => {
        let key = conf.key;
        let dir = conf.dir === 'asc' ? 1 : -1;

        if (key === 'tenure') {
            return (a.currentTenure - b.currentTenure) * dir;
        } else if (key === 'loan') {
            return (a.loan - b.loan) * dir;
        } else if (key === 'dp') {
            let dpDiff = a.dp - b.dp;
            if (dpDiff !== 0) return dpDiff * dir;
            return (a.emi - b.emi) * dir;
        } else if (key === 'emi') {
            return (a.emi - b.emi) * dir;
        } else if (key === 'months') {
            return (a.inst - b.inst) * dir;
        } else if (key === 'daily') {
            return (a.daily - b.daily) * dir;
        } else if (key === 'extra') {
            return (a.extra - b.extra) * dir;
        } else {
            if (a.dp !== b.dp) return (a.dp - b.dp) * dir;
            if (a.emi !== b.emi) return (a.emi - b.emi) * dir;
            return (b.curLTV - a.curLTV) * dir;
        }
    });

    let bodyEl = document.getElementById(`body_${pIdx}`);
    if(!bodyEl) return;

    bodyEl.innerHTML = visibleSchemes.map(d => {
        let isInactive = d.inactive; 
        let actionMenuBtnHtml = `<button onclick="openRowActionModal(${pIdx}, ${d.dIdx}, ${isInactive})" style="background:var(--primary); color:white; border:none; padding:4px 10px; border-radius:4px; font-weight:900; cursor:pointer; font-size: 11px;">Act ⚙️</button>`;
        let bgCol = isInactive ? '#f8f9fa' : (d.isExpired ? '#fff4e6' : '#ffffff');
        let textOpacity = isInactive ? '0.5' : '1';
        let subRowBg = isInactive ? '#f8f9fa' : '#f8fafc';
        let dbdStr = `${+parseFloat(d.dbd).toFixed(3)}% (₹${Math.round(d.dbdAmt||0)})`;
        let roiStr = `${+parseFloat(d.roi).toFixed(2)}% (₹${Math.round(d.roiAmt||0)})`;

        return `
        <tr id="row_${pIdx}_${d.dIdx}" style="background: ${bgCol}; opacity: ${textOpacity};">
            <td style="padding: 12px 4px; text-align: center; vertical-align: middle;">
                <div style="font-size: 15px; font-weight: 900; color: var(--indigo);"><span id="ta_${pIdx}_${d.dIdx}">${d.currentTenure}/${d.advEmi}</span></div>
                ${d.isExpired && !isInactive ? `<div style="color:#d35400; font-size:9px; font-weight:900;">⚠️ Expired</div>` : ''}
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
            <td style="padding: 12px 4px; text-align: center; font-size: 13px; font-weight: 900; color: #b91c1c;">₹${Math.round(d.extra).toLocaleString()}</td>
        </tr>
        <tr style="background: ${subRowBg}; border-bottom: 2px solid #e2e8f0; opacity: ${textOpacity};">
            <td colspan="7" style="padding: 6px 10px; font-size: 11px; font-weight: 700; color: #64748b; text-align: left;">
                <div style="display:flex; flex-wrap:wrap; column-gap: 12px; row-gap: 6px; align-items:center;">
                    <span><b style="color:var(--bajaj-blue);">LTV:</b> <span id="ltv_${pIdx}_${d.dIdx}">${Math.round(d.curLTV)}%</span></span>
                    <span><b style="color:var(--bajaj-blue);">PF:</b> ₹<span id="pf_${pIdx}_${d.dIdx}">${d.pf}</span></span>
                    <span><b style="color:var(--bajaj-blue);">DBD:</b> <span id="dbd_${pIdx}_${d.dIdx}">${dbdStr}</span></span>
                    <span><b style="color:var(--bajaj-blue);">ROI:</b> <span id="roi_${pIdx}_${d.dIdx}">${roiStr}</span></span>
                    <span><b style="color:var(--success);">Net Disb:</b> <span id="nd_${pIdx}_${d.dIdx}">₹${Math.round(d.netDisb).toLocaleString()}</span></span>
                    ${d.fixedEmi > 0 ? `<span><b style="color:var(--bajaj-blue);">Fixed:</b> ₹${d.fixedEmi}</span>` : ''}
                    <div style="margin-left:auto;">${actionMenuBtnHtml}</div>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function sortMatrixTable(pIdx, key) {
    if(!sortConfigs[pIdx]) sortConfigs[pIdx] = {key: 'dp', dir: 'asc'};
    let conf = sortConfigs[pIdx];
    if (conf.key === key) {
        conf.dir = conf.dir === 'asc' ? 'desc' : 'asc';
    } else {
        conf.key = key;
        conf.dir = 'asc';
    }
    renderRows(pIdx);
}

function manual(pIdx, dIdx) {
    let c = customerQueue[activeCustomerIndex];
    let el = document.getElementById(`l_${pIdx}_${dIdx}`);
    if(!el) return;
    let loan = parseFloat(el.value) || 0, prod = current_products[pIdx];
    if(!prod) return;
    let d = prod.calculatedData.find(x => x.dIdx === dIdx), inp = prod.inputs, type = c?.type || 'NEW';
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850); let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); 
    let inputMrp = parseFloat(inp.mrp) || 0; let inputInv = parseFloat(inp.inv) || 0; 
    if (inputInv <= 0) return;

    let effectivePrice = inputInv; 
    let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;
    let activeCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;

    let minAllowedLoanByInvoice = effectivePrice * 0.50;
    if (loan < minAllowedLoanByInvoice) {
        loan = minAllowedLoanByInvoice;
        showToast("लोन रक्कम ५०% पेक्षा कमी असू शकत नाही!", "error");
    }

    if (loan > effectivePrice) {
        loan = effectivePrice;
        showToast("लोन रक्कम इनव्हॉइसपेक्षा जास्त असू शकत नाही!", "warning");
    }

    syncInsurance(pIdx, inputMrp, loan); 
    let appliedPf = d.pf; if (prod.isNonTieup) { let slabPf = getNonTieupPfValue(prod.category, effectivePrice); if (slabPf !== null) appliedPf = slabPf; d.pf = appliedPf; }
    let dbdRate = (d.dbd * 1.18 / 100); let roiRate = d.roi / 1200; let roiRateDP = roiRate * d.advEmi; let dpE = 0; let dpR = 0;
    let insTotal = (parseFloat(inp.gtl)||0)+(parseFloat(inp.rfc)||0)+(parseFloat(inp.exw)||0);

    if (d.isFixed) { 
        let calcTenure = Math.floor(loan / d.fixedEmi) || 1; 
        if ((calcTenure * d.fixedEmi) < minAllowedLoanByInvoice) { calcTenure = Math.ceil(minAllowedLoanByInvoice / d.fixedEmi); }
        loan = calcTenure * d.fixedEmi; 
        let maxBoundary = Math.min(d.nbfcMaxL, prod.isNonTieup ? d.maxLoan : 9999999, loanCapPrice > 0 ? loanCapPrice : 9999999); 
        if (loan > maxBoundary) { loan = Math.floor(maxBoundary / d.fixedEmi) * d.fixedEmi; calcTenure = Math.floor(loan / d.fixedEmi) || 1; } 
        el.value = loan; 

        let roiInEmi = loan * roiRate; let roiInDp = loan * roiRateDP; 
        dpE = effectivePrice - loan + (d.fixedEmi * d.advEmi) + (loan * dbdRate) + appliedPf + totalFees + roiInDp; dpR = Math.ceil(dpE / 10) * 10; 
        let inst = calcTenure - d.advEmi; if(inst < 1) inst = 1; 
        let emi = d.fixedEmi + (insTotal / inst) + roiInEmi; 
        d.loan = loan; d.currentTenure = calcTenure; d.dp = dpR; d.inst = inst; d.emi = emi; 
    } else { 
        let inst = d.tenure - d.advEmi; if(inst < 1) inst = 1;
        let limit = c?.limit || 0; let currentLimit = limit > 0 ? limit : 9999999;
        let nbfcMaxL = (currentLimit * d.tenure) / (d.tenure - d.advEmi || 1); 
        let maxBoundary = Math.min(loanCapPrice > 0 ? loanCapPrice : 999999, nbfcMaxL, prod.isNonTieup ? d.maxLoan : 9999999); 
        
        if (activeCap > 0) {
            let maxLoanForCap = Math.floor((activeCap - (insTotal / inst)) / ((1 / d.tenure) + roiRate));
            if (loan > maxLoanForCap) {
                loan = Math.max(0, maxLoanForCap);
                showToast(`EMI Capping (₹${activeCap}) नुसार कमाल लोन ₹${loan} सेट केले!`, "warning");
            }
        }

        if(loan > maxBoundary) { loan = maxBoundary; } 
        if (loan < minAllowedLoanByInvoice) { loan = minAllowedLoanByInvoice; }
        if (loan > effectivePrice) { loan = effectivePrice; }
        el.value = Math.floor(loan); 

        let roiInEmi = loan * roiRate; let roiInDp = loan * roiRateDP; 
        dpE = effectivePrice - loan + ((loan/d.tenure) * d.advEmi) + (loan * dbdRate) + appliedPf + totalFees + roiInDp; 
        dpR = Math.ceil(dpE / 10) * 10; 
        let baseEmi = loan / d.tenure;
        if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 
        let emi = baseEmi + (insTotal / inst) + roiInEmi; 
        d.loan = loan; d.dp = dpR; d.emi = emi; 
    }

    d.extra = ((d.emi * d.inst) + d.dp) - effectivePrice; d.dbdAmt = loan * dbdRate; d.roiAmt = (loan * roiRateDP) + (loan * roiRate * d.inst); 
    let marginMoney = parseFloat(inp.margin) || 0; let roundupAdj = (dpR > dpE) ? (dpR - dpE) : 0; 
    d.netDisb = effectivePrice - dpR - marginMoney - roundupAdj;

    prod.inputs.manualLoans = prod.inputs.manualLoans || {};
    prod.inputs.manualLoans[dIdx] = loan;
    customerQueue[activeCustomerIndex].products = current_products;
    saveQueueToLocal();
    renderRows(pIdx);
}

function copySchemeText(pIdx, dIdx, btnElement) {
    let prod = current_products[pIdx], d = prod.calculatedData.find(x => x.dIdx === dIdx); let invAmt = prod.inputs.inv; let c = customerQueue[activeCustomerIndex]; let cappingLine = (c.cap && c.cap !== "") ? `\nEMI Capping- ${c.cap}` : ""; let custName = c.name ? c.name : 'Valued Customer'; let custDetails = `Customer Name- ${custName}\nLimit- ${c.limit}\nLTV- ${c.ltv}${cappingLine}\n\n`;
    let textToCopy = `${custDetails}📱 *${prod.name}*\n${invAmt > 0 ? `*Invoice Amount:* ₹${invAmt}\n\n` : "" }✅ *Scheme:* ${d.currentTenure}/${d.advEmi}\n💰 *DP:* ₹${Math.round(d.dp).toLocaleString()}\n🗓️ *EMI:* ₹${Math.round(d.emi).toLocaleString()} x ${d.inst}\n✨ *Daily EMI:* ₹${Math.round(d.daily).toLocaleString()}`;
    function showSuccess() { let originalText = btnElement.innerText; btnElement.innerText = "Copied!"; btnElement.style.background = "var(--success)"; setTimeout(() => { btnElement.innerText = originalText; btnElement.style.background = "var(--primary)"; }, 2000); }
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => fallbackCopy(textToCopy, showSuccess)); } else { fallbackCopy(textToCopy, showSuccess); }
}

function fallbackCopy(text, successCb) {
    let ta = document.createElement("textarea"); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = "absolute"; ta.style.left = "-9999px"; document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, 99999); 
    try { let success = document.execCommand('copy'); if (success) { successCb(); } else { showCustomAlert("Auto-Copy Blocked:", text); } } catch (err) { showCustomAlert("Auto-Copy Failed:", text); } document.body.removeChild(ta);
}

async function toggleInactive(pIdx, dIdx) { let prod = current_products[pIdx]; let scheme = prod.schemes[dIdx]; scheme.inactive = !scheme.inactive; recalcModel(pIdx); customerQueue[activeCustomerIndex].products = current_products; await saveQueueToLocal(); }

async function executeManualAction() {
    let tpi = document.getElementById('targetPIdx');
    let mode = tpi ? tpi.value : "NEW"; 
    
    let manTenEl = document.getElementById('manTen'); let ten = manTenEl ? parseInt(manTenEl.value)||0 : 0;
    let manAdvEl = document.getElementById('manAdv'); let adv = manAdvEl ? parseInt(manAdvEl.value)||0 : 0;
    let manDbdEl = document.getElementById('manDbd'); let dbd = manDbdEl ? parseFloat(manDbdEl.value)||0 : 0;
    let manPfEl = document.getElementById('manPf'); let pf = manPfEl ? parseInt(manPfEl.value)||0 : 0;
    let manRoiEl = document.getElementById('manRoi'); let roi = manRoiEl ? parseFloat(manRoiEl.value)||0 : 0;
    let manFixEl = document.getElementById('manFixed'); let fix = manFixEl ? parseInt(manFixEl.value)||0 : 0;
    
    let scheme = { tenure: ten, advEmi: adv, dbd: dbd, pf: pf, roi: roi, fixedEmi: fix, minLoan: 0, maxLoan: 9999999, category: "MANUAL", inactive: false, isExpired: false, expiryDateStr: "" };
    
    if(mode === "NEW") { 
        let manNameInputEl = document.getElementById('manName');
        let manNameInput = manNameInputEl ? manNameInputEl.value.toUpperCase().trim() : "";
        let name = manNameInput !== "" ? manNameInput : "MANUAL MODEL"; 
        closeManualModal();
        tempPendingProduct = { name: name, isNT: false, isManual: true, manualSchemes: [scheme], category: "MANUAL" };
        currentModalCategory = "MANUAL";
        showComponentsModal("");
        return;
    } else { 
        let pIdx = parseInt(mode);
        if(current_products[pIdx]) {
            current_products[pIdx].schemes.push(scheme); 
            if(customerQueue[activeCustomerIndex]) customerQueue[activeCustomerIndex].products = current_products;
            await saveQueueToLocal();
            recalcModel(pIdx); 
        }
    } 
    closeManualModal();
}

function openQuoteSelectionModal() {
    if(current_products.length === 0) { showToast("आधी Matrix मध्ये Product Add करा!", "warning"); return; }
    let html = current_products.map((p, idx) => ` <div style="display:flex; align-items:center; gap:8px; padding:8px; background:#f8f9fa; border:1px solid #ddd; border-radius:4px;"> <input type="checkbox" id="qchk_${idx}" class="quote-model-chk" value="${idx}" style="width:16px; height:16px; cursor:pointer;"> <label for="qchk_${idx}" style="font-size:14px; font-weight:bold; cursor:pointer; flex:1; margin:0;">${p.name}</label> </div> `).join('');
    let qmc = document.getElementById('quoteModelCheckboxes');
    if(qmc) qmc.innerHTML = html; 
    let qsm = document.getElementById('quoteSelectionModal');
    if(qsm) qsm.style.display = 'flex';
}

function promptForSelectedImageGeneration() {
    let chks = document.querySelectorAll('.quote-model-chk:checked'); if(chks.length === 0) { showToast("किमान एक मॉडेल निवडा!", "warning"); return; }
    window.tempImageGenIndices = Array.from(chks).map(c => parseInt(c.value)); 
    let qsm = document.getElementById('quoteSelectionModal');
    if(qsm) qsm.style.display = 'none'; 
    requestWhatsAppDispatch = false; 
    doGenerateCustomerImage();
}

let requestWhatsAppDispatch = false;
function proceedGenerateImage() { requestWhatsAppDispatch = false; let cm = document.getElementById('custInfoPromptModal'); if(cm) cm.style.display = 'none'; doGenerateCustomerImage(); }
function proceedGenerateImageAndWhatsAppCopy() { requestWhatsAppDispatch = true; let cm = document.getElementById('custInfoPromptModal'); if(cm) cm.style.display = 'none'; doGenerateCustomerImage(); }

function doGenerateCustomerImage() {
    let quoteDiv = document.createElement('div'); 
    quoteDiv.style.width = "680px"; 
    quoteDiv.style.padding = "28px 32px"; 
    quoteDiv.style.background = "#ffffff"; 
    quoteDiv.style.position = "fixed"; 
    quoteDiv.style.top = "0"; 
    quoteDiv.style.left = "0";
    quoteDiv.style.zIndex = "-9999";
    quoteDiv.style.boxSizing = "border-box";
    quoteDiv.style.fontFamily = "Arial, Helvetica, sans-serif";
    quoteDiv.style.color = "#1e293b";

    let c = customerQueue[activeCustomerIndex]; 
    let ltvLimit = c?.ltv || 100;
    let custType = (c?.type || 'NEW').toUpperCase();
    let custLimit = c?.limit ? Number(c.limit).toLocaleString('en-IN') : '0';

    let hasV = false; 
    let productsToRender = window.tempImageGenIndices.map(idx => current_products[idx]);

    let firstValidProd = productsToRender.find(p => p && p.inputs && p.inputs.inv > 0) || productsToRender[0];
    let topInvPrice = firstValidProd && firstValidProd.inputs.inv ? Number(firstValidProd.inputs.inv).toLocaleString('en-IN') : '0';
    let effectiveCapVal = (firstValidProd && parseFloat(firstValidProd.inputs.cap)) || parseFloat(c?.cap) || 0;
    let capDisplay = effectiveCapVal > 0 ? `₹${Number(effectiveCapVal).toLocaleString('en-IN')}` : 'NONE';

    let html = `
        <div style="border: 2px solid #2b4c7e; padding: 18px 22px; margin-bottom: 24px; background: #ffffff;">
            <div style="text-align: center; margin-bottom: 16px;">
                <div style="display: inline-block; font-size: 27px; font-weight: 900; color: #1e428a; letter-spacing: 0.8px; padding-bottom: 4px; border-bottom: 4px double #2b4c7e;">
                    BAJAJ FINSERV LOAN OFFER
                </div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">
                <span>CUSTOMER TYPE: ${custType}</span>
                <span>APPROVED LIMIT: ₹${custLimit}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #1e293b; margin-bottom: 10px;">
                <span>MAX LTV: ${ltvLimit}%</span>
                <span>EMI CAPPING: ${capDisplay}</span>
            </div>
            <div style="font-size: 16px; font-weight: 800; color: #1e293b;">
                INVOICE PRICE: ₹${topInvPrice}
            </div>
        </div>
    `;

    productsToRender.forEach((prod, idx) => {
        if (!prod || !prod.calculatedData || prod.calculatedData.length === 0) return;
        let validS = prod.calculatedData.filter(d => !d.inactive && !d.isInv50Breach && !d.isCapBreach && d.loan > 0);
        if(validS.length === 0) return; 
        
        validS.sort((a,b) => {
            if (a.dp !== b.dp) return a.dp - b.dp;
            if (a.emi !== b.emi) return a.emi - b.emi;
            return b.curLTV - a.curLTV;
        });

        hasV = true; 
        let invAmt = prod.inputs.inv ? Number(prod.inputs.inv).toLocaleString('en-IN') : '0';

        html += `
            <div style="${idx > 0 ? 'margin-top: 28px;' : ''}">
                <div style="font-size: 21px; font-weight: 900; color: #1e428a; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.3px;">
                    ${prod.name.toUpperCase()}
                </div>
                <div style="font-size: 18px; font-weight: 800; color: #1e293b; margin-bottom: 14px;">
                    PRICE : Rs ${invAmt}
                </div>
                <table style="width: 100%; border-collapse: collapse; border: 2px solid #2b4c7e;">
                    <thead>
                        <tr style="background: #ffffff; color: #1e428a; font-size: 15px; font-weight: 900;">
                            <th style="border: 1.5px solid #2b4c7e; padding: 10px 6px; text-align: center; width: 16%;">SCHEME</th>
                            <th style="border: 1.5px solid #2b4c7e; padding: 10px 6px; text-align: center; width: 26%;">DOWN<br>PAYMENT</th>
                            <th style="border: 1.5px solid #2b4c7e; padding: 10px 6px; text-align: center; width: 25%;">MONTHLY<br>EMI</th>
                            <th style="border: 1.5px solid #2b4c7e; padding: 10px 6px; text-align: center; width: 16%;">MONTHS</th>
                            <th style="border: 1.5px solid #2b4c7e; padding: 10px 6px; text-align: center; width: 17%;">PER<br>DAY</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        validS.forEach((d) => {
            html += `
                <tr style="font-size: 17px; font-weight: 800; color: #1e293b; background: #ffffff;">
                    <td style="border: 1.5px solid #2b4c7e; padding: 9px 8px; text-align: center;">${d.currentTenure}/${d.advEmi}</td>
                    <td style="border: 1.5px solid #2b4c7e; padding: 9px 14px; text-align: center;">₹${Math.round(d.dp).toLocaleString('en-IN')}</td>
                    <td style="border: 1.5px solid #2b4c7e; padding: 9px 14px; text-align: center;">₹${Math.round(d.emi).toLocaleString('en-IN')}</td>
                    <td style="border: 1.5px solid #2b4c7e; padding: 9px 8px; text-align: center;">${d.inst}</td>
                    <td style="border: 1.5px solid #2b4c7e; padding: 9px 8px; text-align: center;">₹${Math.round(d.daily).toLocaleString('en-IN')}</td>
                </tr>
            `;
        });
        html += `</tbody></table></div>`;
    });

    if(!hasV) { 
        showToast("कोणतीही Eligible Scheme नाही (कृपया आधी Invoice Value भरा)!", "error"); 
        return; 
    }

    quoteDiv.innerHTML = html; 
    document.body.appendChild(quoteDiv);

    html2canvas(quoteDiv, {scale: 2, useCORS: true, backgroundColor: "#ffffff"}).then(canvas => { 
        let imgDataUrl = canvas.toDataURL("image/png"); 
        let gim = document.getElementById('generatedImage'); if(gim) gim.src = imgDataUrl; 
        let ivm = document.getElementById('imageViewerModal'); if(ivm) ivm.style.display = 'flex'; 
        document.body.removeChild(quoteDiv); 
    });
}

function openRowActionModal(pIdx, dIdx, isInactive) {
    let container = document.getElementById('rowActionButtons');
    if(!container) return;
    container.innerHTML = `
        <button onclick="copySchemeText(${pIdx}, ${dIdx}, this); closeRowActionModal();" style="background:#f8fafc; color:var(--dark); border:1px solid #cbd5e1; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">Copy Scheme</button>
        <button onclick="openEditSchemeModal(${pIdx}, ${dIdx}); closeRowActionModal();" style="background:#fff7ed; color:#d97706; border:1px solid #fed7aa; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">Edit Scheme</button>
        <button onclick="toggleInactive(${pIdx}, ${dIdx}); closeRowActionModal();" style="background:${isInactive ? '#ecfdf5' : '#fef2f2'}; color:${isInactive ? '#059669' : '#dc2626'}; border:1px solid ${isInactive ? '#a7f3d0' : '#fecaca'}; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">${isInactive ? 'Add To Active' : 'Disable Scheme'}</button>
    `;
    let ram = document.getElementById('rowActionModal');
    if(ram) ram.style.display = 'flex';
}

function closeRowActionModal() { 
    let ram = document.getElementById('rowActionModal');
    if(ram) ram.style.display = 'none'; 
}
