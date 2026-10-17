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

/* === History Modal Functions === */
function openCustomerHistoryModal() {
    renderCustomerQueue();
    updateUniversalActionButtons();
    document.getElementById('customerHistoryModal').style.display = 'flex';
}

function closeCustomerHistoryModal() {
    document.getElementById('customerHistoryModal').style.display = 'none';
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

    newYesBtn.onclick = function() { document.getElementById('customConfirmModal').style.display = 'none'; if(yesCallback) yesCallback(); };
    newNoBtn.onclick = function() { document.getElementById('customConfirmModal').style.display = 'none'; if(noCallback) noCallback(); };
    document.getElementById('customConfirmModal').style.display = 'flex';
}

/* === Custom Alert Function For Copy Fallback === */
function showCustomAlert(msg, text = null) {
    let alertEl = document.getElementById('alertMessage');
    if (!alertEl) return;
    alertEl.innerText = msg;
    let ta = document.getElementById('alertTextarea');
    if(text) { ta.value = text; ta.style.display = 'block'; } else { ta.style.display = 'none'; }
    document.getElementById('customAlertModal').style.display = 'flex';
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
}

async function handleManualExcelUpload(event) {
    let file = event.target.files[0];
    if (!file) return;
    try {
        showToast("Master Excel लोड होत आहे...", "warning");
        let buf = await file.arrayBuffer();
        await processArrayBufferToDB(buf);
        if (activeCustomerIndex !== -1) { 
            loadCurrentProducts(); 
            renderMatrix(); 
        }
        showToast(`एकूण ${db_records.length} स्कीम्स सेव्ह झाल्या!`, "success");
    } catch (err) {
        console.error(err);
        showToast("एरर: " + err.message, "error");
    } finally {
        event.target.value = "";
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
        updateUniversalActionButtons();

        if (activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex] && db_records.length > 0) {
            goToFinalPage();
        }
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
        dd.innerHTML = `<div onclick="document.getElementById('masterExcelFileInput').click()" style="padding:10px; color:var(--danger); font-weight:bold; text-align:center; cursor:pointer;">⚠️ Master Data नाही! इथे क्लिक करून आधी Excel फाईल अपलोड करा.</div>`;
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
    let type = document.getElementById('cqType').value || "NEW"; 
    let cap = parseFloat(document.getElementById('cqCap').value) || "";

    if(!limit || limit <= 0 || isNaN(limit)) { 
        showToast("वैध NBFC Limit भरा!", "error"); 
        return; 
    }

    if(db_records.length === 0) {
        showToast("आधी वरच्या 'Upload Master Excel' बटणावरून एक्सेल फाईल अपलोड करा!", "warning");
        document.getElementById('masterExcelFileInput').click();
        return; 
    }

    let now = new Date(); 
    let ts = now.toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) + ' ' + now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    let newCustObj = { id: Date.now(), name, mobile, limit, ltv, type, cap, targetDp: "", timestamp: ts, components: {}, products: [], sortConfigs: [] };

    customerQueue.unshift(newCustObj); 

    activeCustomerIndex = 0; 
    selectedQueueIndex = 0;

    await saveQueueToLocal(); 

    document.getElementById('cqName').value = ''; 
    document.getElementById('cqMobile').value = ''; 
    document.getElementById('cqType').value = ''; 
    document.getElementById('cqLimit').value = ''; 
    document.getElementById('cqLtv').value = ''; 
    document.getElementById('cqCap').value = '';

    renderCustomerQueue(); 
    updateUniversalActionButtons();

    goToFinalPage();
}

function copyCustomerDetails(idx, btnElement) { let c = customerQueue[idx]; let cappingLine = (c.cap && c.cap !== "") ? `\nEMI Capping- ${c.cap}` : ""; let textToCopy = `Customer Name- ${c.name}\nLimit- ${c.limit}\nLTV- ${c.ltv}${cappingLine}`; function showSuccess() { let originalText = btnElement.innerText; btnElement.innerText = "Copied!"; btnElement.style.background = "var(--success)"; setTimeout(() => { btnElement.innerText = originalText; btnElement.style.background = "var(--warning)"; }, 2000); } if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(() => fallbackCopy(textToCopy, showSuccess)); } else { fallbackCopy(textToCopy, showSuccess); } }
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
    let c = customerQueue[selectedQueueIndex]; 
    let msg = `Namaskar ${c.name} Sir/Madam! 🎉\n\nAapki Bajaj Finance Ki *₹${c.limit}* Ki Limit Approve Ho Gayi Hai!\n\n👤 *${sName}*${sMobile ? `\n📞 ${sMobile}` : ''}`; 
    let encMsg = encodeURIComponent(msg); 
    let url = (c.mobile && c.mobile.length === 10) ? `https://wa.me/91${c.mobile}?text=${encMsg}` : `https://api.whatsapp.com/send?text=${encMsg}`;
    window.open(url, '_blank'); 
    document.getElementById('inviteModal').style.display = 'none'; 
}
function closeCustomerEdit() { document.getElementById('editCustomerModal').style.display='none'; }

async function saveCustomerEdit() { 
    if(selectedQueueIndex === -1) return; 
    let c = customerQueue[selectedQueueIndex]; 
    c.name = document.getElementById('ecName').value || 'Customer'; 
    c.mobile = document.getElementById('ecMobile').value; 
    c.limit = parseFloat(document.getElementById('ecLimit').value) || 0; 
    c.ltv = parseFloat(document.getElementById('ecLtv').value) || 100; 
    c.type = document.getElementById('ecType').value; 
    let cap = parseFloat(document.getElementById('ecCap').value); 
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
async function removeCustomer(idx) { let c = customerQueue[idx]; recycleBin.push(c); await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); if(activeCustomerIndex === idx) activeCustomerIndex = -1; else if (activeCustomerIndex > idx) activeCustomerIndex--; customerQueue.splice(idx, 1); if (selectedQueueIndex === idx) selectedQueueIndex = -1; else if (selectedQueueIndex > idx) selectedQueueIndex--; if(customerQueue.length > 0 && activeCustomerIndex === -1) activeCustomerIndex = 0; await saveQueueToLocal(); renderCustomerQueue(); updateUniversalActionButtons(); if(activeCustomerIndex === -1) goHome(); else goToFinalPage(); }

function openRecycleBin() { let list = document.getElementById('recycleBinList'); if(recycleBin.length === 0) { list.innerHTML = `<div style="text-align:center; color:#888;">Recycle Bin Empty</div>`; } else { list.innerHTML = recycleBin.map((c, i) => ` <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px; border-radius:4px; border:1px solid #ddd;"> <div style="font-size:12px; color:var(--dark); font-weight:bold;"> 👤 ${c.name} <br><span style="color:var(--success);">LMT: ₹${c.limit}</span> </div> <button onclick="restoreCustomer(${i})" style="background:var(--primary); color:white; padding:6px; border-radius:3px;">↩️ Restore</button> </div> `).join(''); } document.getElementById('recycleBinModal').style.display='flex'; }
function closeRecycleBin() { document.getElementById('recycleBinModal').style.display='none'; }
async function restoreCustomer(idx) { let c = recycleBin.splice(idx, 1)[0]; customerQueue.unshift(c); if(activeCustomerIndex !== -1) activeCustomerIndex++; if(selectedQueueIndex !== -1) selectedQueueIndex++; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); await saveQueueToLocal(); openRecycleBin(); renderCustomerQueue(); updateUniversalActionButtons(); }

async function emptyRecycleBin() {
    if(recycleBin.length === 0) { showToast("Recycle Bin आधीच रिकामी आहे!", "warning"); return; }
    showCustomConfirm("सर्व रेकॉर्ड्स डिलीट करायचे?", async () => { recycleBin = []; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); openRecycleBin(); showToast("Recycle Bin रिकामी झाली!", "success"); });
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
        list.innerHTML = `<div style="text-align:center; color:#888; padding:15px;">No Saved Customers Found.</div>`; 
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
                <strong style="color:var(--indigo); text-transform:capitalize;">👤 ${displayName} ${c.mobile ? `<span style="color:#d35400;">(📞 ${c.mobile})</span>` : ''}</strong> 
                <span style="color:#888; font-weight:bold; font-size:11px;">${c.timestamp || ''}</span> 
            </div> 
            <div style="color:#555; font-weight:bold; font-size:12px;"> 
                LMT: <span style="color:var(--success)">₹${c.limit}</span> | LTV: ${c.ltv}% | Cap: ${c.cap ? '₹'+c.cap : 'No'} | ${c.type} ${isActive ? '<span style="float:right; color:var(--primary);">[Active ✓]</span>' : ''} 
            </div> 
        </div>`; 
    }).join(''); 
}

async function setActiveCustomer(idx) { 
    if(db_records.length === 0) { 
        showToast("आधी Master Excel फाईल अपलोड करा!", "error"); 
        document.getElementById('masterExcelFileInput').click();
        return; 
    } 
    activeCustomerIndex = idx; 
    await saveQueueToLocal(); 
    if(document.getElementById('queueSearch')) document.getElementById('queueSearch').value = ''; 
    closeCustomerHistoryModal();
    goToFinalPage(); 
}

function isLimitValid() { 
    if (activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) { 
        showToast("आधी Customer ॲड करा किंवा 🕒 History मधून सिलेक्ट करा!", "warning"); 
        return false; 
    } 
    return true; 
}

function generateStackCards() { let container = document.getElementById('stackInputsContainer'); if(!container) return; container.innerHTML = ""; for(let i=1; i<=10; i++) { container.innerHTML += ` <div class="stack-card"><div style="font-weight:900; color:var(--primary); margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:2px;">Scheme #${i}</div> <div class="inner-grid"> <div><label>Tenure (Max)</label><input type="number" id="msTen_${i}" placeholder="0"></div> <div><label>Advance</label><input type="number" id="msAdv_${i}" placeholder="0"></div> <div><label>DBD %</label><input type="number" id="msDbd_${i}" placeholder="0"></div> <div><label>PF (₹)</label><input type="number" id="msPf_${i}" placeholder="0"></div> <div><label>ROI %</label><input type="number" id="msRoi_${i}" placeholder="0"></div> <div><label>Fixed EMI (₹)</label><input type="number" id="msFix_${i}" placeholder="0"></div> </div> </div>`; } }

function openMultiStackModal() { 
    if (!isLimitValid()) return; 
    showInlineSubPanel('multiStackModal'); 
}

function closeMultiStackModal() { 
    document.getElementById('multiStackModal').style.display='none'; 
}

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
            let c = customerQueue[activeCustomerIndex];
            let sharedTarget = c.targetDp || c.components?.target || "";
            current_products.push({ name: msNameInput, schemes: validSchemes, category: "MANUAL", inputs: { mrp: "", inv: "", cap: c.cap || "", target: sharedTarget, gtl: 0, rfc: 0, exw: "", margin: "", dealer: "", surch: 0, manualLoans: {} }, isManual: true, isNonTieup: false }); 
            sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); 
            c.products = current_products; 
            c.sortConfigs = sortConfigs; 
            await saveQueueToLocal(); 
        }
        closeMultiStackModal(); 
        if (activeCustomerIndex !== -1) {
            renderMatrix();
        }
    } else { showToast("किमान एक Scheme भरा!", "error"); }
}

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
    hideAllInlineSubPanels();
    document.getElementById('finalEligibleArea').style.display = 'none';
    activeCustomerIndex = -1; 
    selectedQueueIndex = -1; 
    renderCustomerQueue(); 
    updateUniversalActionButtons(); 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function closeImageViewer() { document.getElementById('imageViewerModal').style.display='none'; }

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

function openSchemeOnlyModal(pIdx) { if (!isLimitValid()) return; document.getElementById('modalTitle').innerText = "Add Custom Scheme"; document.getElementById('modelNameInputArea').style.display = 'none'; document.getElementById('targetPIdx').value = pIdx; document.getElementById('manualModal').style.display='flex'; }
function closeManualModal() { document.getElementById('manualModal').style.display='none'; }
function openEditSchemeModal(pIdx, dIdx) { let scheme = current_products[pIdx].schemes[dIdx]; document.getElementById('editPIdx').value = pIdx; document.getElementById('editDIdx').value = dIdx; document.getElementById('editTen').value = scheme.tenure || 0; document.getElementById('editAdv').value = scheme.advEmi || 0; document.getElementById('editDbd').value = scheme.dbd || 0; document.getElementById('editPf').value = scheme.pf || 0; document.getElementById('editRoi').value = scheme.roi || 0; document.getElementById('editFixed').value = scheme.fixedEmi || 0; document.getElementById('editSchemeModal').style.display = 'flex'; }
function closeEditSchemeModal() { document.getElementById('editSchemeModal').style.display = 'none'; }
function saveSchemeEdit() { let pIdx = parseInt(document.getElementById('editPIdx').value); let dIdx = parseInt(document.getElementById('editDIdx').value); let scheme = current_products[pIdx].schemes[dIdx]; scheme.tenure = parseInt(document.getElementById('editTen').value) || 0; scheme.advEmi = parseInt(document.getElementById('editAdv').value) || 0; scheme.dbd = parseFloat(document.getElementById('editDbd').value) || 0; scheme.pf = parseInt(document.getElementById('editPf').value) || 0; scheme.roi = parseFloat(document.getElementById('editRoi').value) || 0; scheme.fixedEmi = parseFloat(document.getElementById('editFixed').value) || 0; closeEditSchemeModal(); recalcModel(pIdx); saveQueueToLocal(); }

function selectModel(name) { 
    if (!isLimitValid()) return; 
    editingProductIdx = -1;
    let raw = db_records.filter(r => r.model === name); 
    let baseMrp = raw.find(s => s.mrp > 0)?.mrp || ""; 
    let cat = raw[0]?.category || "OTHER"; 
    tempPendingProduct = { name: name, isNT: false, category: cat }; 
    currentModalCategory = cat; 
    document.getElementById('modalMatrixSearchDropdown').style.display = 'none'; 
    document.getElementById('modalMatrixSearch').value = ''; 
    showComponentsModal(baseMrp); 
}

function quickNonTieup() { 
    if (!isLimitValid()) return; 
    if(db_records.length === 0) { 
        showToast("Master डेटा उपलब्ध नाही! आधी एक्सेल अपलोड करा.", "error"); 
        document.getElementById('masterExcelFileInput').click();
        return; 
    } 
    editingProductIdx = -1;
    let tieup = db_records.filter(r => r.model === SPECIAL_MODEL); 
    let cats = [...new Set(tieup.map(r => r.category))].sort(); 
    document.getElementById('categoryGrid').innerHTML = cats.map(c => { 
        let label = (c === 'PHONE(WEB-MOBILE)') ? 'Phone, Tablet, Smart Watch' : c; 
        return `<div style="background:var(--indigo);color:white;padding:12px;border-radius:4px;cursor:pointer;font-weight:900;text-align:center;text-transform:capitalize;" onclick="selectCategory('${c}')">${label}</div>`; 
    }).join(''); 
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

/* MRP किंवा INV बदलल्यावर GTL स्लॅबनुसार आपोआप सिलेक्ट होतो आणि RFC ऑप्शन अपडेट होतो (RFC डिफॉल्ट 0 राहतो) */
function compPriceChanged() { 
    let mrp = parseFloat(document.getElementById('compMrp').value) || 0; 
    let inv = parseFloat(document.getElementById('compInv').value) || 0; 
    let effectiveAmt = inv > 0 ? inv : mrp;

    let gtl = getGtlSlabValue(effectiveAmt);
    document.getElementById('compGtl').value = String(gtl);

    let rfcSlab = getRfcSlabValue(effectiveAmt); 
    let rfcOpt = document.getElementById('compRfcOpt'); 
    if(rfcOpt) { 
        rfcOpt.value = rfcSlab; 
        rfcOpt.innerText = rfcSlab; 
    } 
    if (!isMobileDeviceCat(currentModalCategory)) { 
        document.getElementById('compRfc').value = "0"; 
    } 
}

function cancelComponentsModal() {
    editingProductIdx = -1;
    tempPendingProduct = null;
    document.getElementById('componentsModal').style.display = 'none';
}

/* नवीन मॉडेलसाठी: फक्त MRP आणि GTL (स्लॅबनुसार) प्री-सिलेक्ट होईल, RFC बाय-डिफॉल्ट 0 राहील */
function showComponentsModal(baseMrp = "") {
    editingProductIdx = -1;
    let c = customerQueue[activeCustomerIndex]; 
    let rfcSelect = document.getElementById('compRfc'); 
    let exwInput = document.getElementById('compExw'); 
    let isMobileCat = isMobileDeviceCat(currentModalCategory);

    document.getElementById('compModalHeadingText').innerText = "Fill Components";
    let pendingNameEl = document.getElementById('compPendingModelName');
    if (pendingNameEl && tempPendingProduct) {
        pendingNameEl.innerText = tempPendingProduct.name;
    }

    if (isMobileCat) { 
        rfcSelect.disabled = false; 
        rfcSelect.style.background = '#fff'; 
        exwInput.disabled = true; 
        exwInput.style.background = '#e9ecef'; 
        exwInput.value = ""; 
    } else { 
        rfcSelect.disabled = true; 
        rfcSelect.style.background = '#e9ecef'; 
        rfcSelect.value = "0"; 
        exwInput.disabled = false; 
        exwInput.style.background = '#fff'; 
    }

    let currentMrp = baseMrp !== "" ? baseMrp : ""; 
    document.getElementById('compMrp').value = currentMrp; 
    let mrpNum = parseFloat(currentMrp) || 0; 

    /* GTL स्लॅबनुसार ऑटो-सिलेक्ट आणि RFC बाय-डिफॉल्ट 0 */
    document.getElementById('compGtl').value = String(getGtlSlabValue(mrpNum));
    let rfcSlab = getRfcSlabValue(mrpNum); 
    let rfcOpt = document.getElementById('compRfcOpt'); 
    if(rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; }
    document.getElementById('compRfc').value = "0"; 

    /* INV व इतर इनपुट्स कोरे */
    document.getElementById('compInv').value = ""; 
    document.getElementById('compCap').value = ""; 
    document.getElementById('compExw').value = ""; 
    document.getElementById('compMargin').value = ""; 
    document.getElementById('compDealer').value = ""; 

    /* जर या कस्टमरच्या आधीच्या मॉडेलमध्ये Target DP टाकला असेल तरच तो प्री-फिल्ड येईल */
    let sharedTargetDp = c?.targetDp || c?.components?.target || "";
    document.getElementById('compTarget').value = sharedTargetDp > 0 ? sharedTargetDp : ""; 
    
    showInlineSubPanel('componentsModal');
}

/* मॉडेलमधील ✏️ Edit आयकॉनवर क्लिक केल्यावर त्या मॉडेलच्या व्हॅल्यूज एडिट करण्यासाठी उघडतो */
function openEditModelComponents(pIdx, event) {
    if (event) event.stopPropagation();
    let prod = current_products[pIdx];
    if (!prod) return;

    editingProductIdx = pIdx;
    tempPendingProduct = null;
    currentModalCategory = prod.category;

    document.getElementById('compModalHeadingText').innerText = "Edit Components";
    document.getElementById('compPendingModelName').innerText = prod.name;

    let rfcSelect = document.getElementById('compRfc'); 
    let exwInput = document.getElementById('compExw'); 
    let isMobileCat = isMobileDeviceCat(currentModalCategory);

    if (isMobileCat) { 
        rfcSelect.disabled = false; 
        rfcSelect.style.background = '#fff'; 
        exwInput.disabled = true; 
        exwInput.style.background = '#e9ecef'; 
        exwInput.value = ""; 
    } else { 
        rfcSelect.disabled = true; 
        rfcSelect.style.background = '#e9ecef'; 
        rfcSelect.value = "0"; 
        exwInput.disabled = false; 
        exwInput.style.background = '#fff'; 
    }

    let inp = prod.inputs;
    document.getElementById('compMrp').value = inp.mrp !== "" ? inp.mrp : "";
    document.getElementById('compInv').value = inp.inv !== "" ? inp.inv : "";
    document.getElementById('compCap').value = inp.cap !== "" ? inp.cap : "";
    document.getElementById('compTarget').value = inp.target !== "" ? inp.target : "";

    let effectiveAmt = (parseFloat(inp.inv) || 0) > 0 ? parseFloat(inp.inv) : (parseFloat(inp.mrp) || 0);
    let rfcSlab = getRfcSlabValue(effectiveAmt);
    let rfcOpt = document.getElementById('compRfcOpt');
    if (rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; }

    document.getElementById('compGtl').value = String(inp.gtl || 0);
    document.getElementById('compRfc').value = isMobileCat && inp.rfc > 0 ? String(rfcSlab) : "0";
    if (!isMobileCat) {
        document.getElementById('compExw').value = inp.exw !== "" ? inp.exw : "";
    }
    document.getElementById('compMargin').value = inp.margin !== "" ? inp.margin : "";
    document.getElementById('compDealer').value = inp.dealer !== "" ? inp.dealer : "";

    showInlineSubPanel('componentsModal');
}

async function proceedToMatrixFromComponents() { 
    let idx = activeCustomerIndex; 
    if(idx === -1) return; 
    let c = customerQueue[idx];
    if(!c.components) c.components = {}; 
    
    let mrpVal = document.getElementById('compMrp').value;
    let invVal = document.getElementById('compInv').value;
    let capVal = document.getElementById('compCap').value;
    let targetVal = document.getElementById('compTarget').value;
    let exwVal = document.getElementById('compExw').value;
    let marginVal = document.getElementById('compMargin').value;
    let dealerVal = document.getElementById('compDealer').value;

    let parsedMrp = mrpVal !== "" ? (parseFloat(mrpVal) || 0) : ""; 
    let parsedInv = invVal !== "" ? (parseFloat(invVal) || 0) : ""; 
    let parsedCap = capVal !== "" ? (parseFloat(capVal) || 0) : ""; 
    let parsedTarget = targetVal !== "" ? (parseFloat(targetVal) || 0) : ""; 
    let parsedGtl = parseFloat(document.getElementById('compGtl').value) || 0; 
    
    let isMobileCat = isMobileDeviceCat(currentModalCategory); 
    let parsedRfc = isMobileCat ? (parseFloat(document.getElementById('compRfc').value) || 0) : 0; 
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

    /* जर Target DP दिला किंवा बदलला असेल, तर तो कस्टमरच्या सर्व मॉडेल्ससाठी लागू करतो */
    if (parsedTarget !== "") {
        c.targetDp = parsedTarget;
        current_products.forEach(cp => {
            cp.inputs.target = parsedTarget;
            cp.inputs.manualLoans = {};
        });
    } else if (editingProductIdx !== -1) {
        c.targetDp = "";
        current_products.forEach(cp => {
            cp.inputs.target = "";
            cp.inputs.manualLoans = {};
        });
    }

    /* जर EMI Capping दिला असेल तर कस्टमर लेव्हलला सुद्धा अपडेट करतो */
    if (parsedCap !== "") { 
        c.cap = parsedCap > 0 ? parsedCap : ""; 
        current_products.forEach(cp => {
            cp.inputs.cap = c.cap;
            cp.inputs.manualLoans = {};
        });
        renderCustomerQueue(); 
        updateMatrixTopCard(); 
    }

    if (editingProductIdx !== -1 && current_products[editingProductIdx]) {
        let p = current_products[editingProductIdx];
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
    let raw = tempPendingProduct.isNT ? db_records.filter(r => r.model === SPECIAL_MODEL && r.category === tempPendingProduct.category) : db_records.filter(r => r.model === tempPendingProduct.name); 
    let c = customerQueue[activeCustomerIndex];
    let ltvLimit = c?.ltv || 100; 
    let matrixEligible = raw.filter(s => s.fixedEmi > 0 || (s.tenure > 0 && ((s.tenure-s.advEmi)/s.tenure)*100 <= ltvLimit)); 
    let uniqueSchemes = []; let seenSchemes = new Set();
    matrixEligible.forEach(s => { let schemeKey = `${s.tenure}_${s.advEmi}_${s.fixedEmi}_${s.minLoan}_${s.maxLoan}`; if (!seenSchemes.has(schemeKey)) { seenSchemes.add(schemeKey); s.inactive = false; uniqueSchemes.push({...s}); } });
    
    let comp = c.components || {}; 
    let finalMrp = comp.mrp !== undefined ? comp.mrp : ""; 
    let finalInv = comp.inv !== undefined ? comp.inv : ""; 
    let surch = (parseFloat(finalInv) > parseFloat(finalMrp) && parseFloat(finalMrp) > 0) ? (parseFloat(finalInv) - parseFloat(finalMrp)) : 0;
    let sharedTarget = c.targetDp !== undefined && c.targetDp !== "" ? c.targetDp : (comp.target || "");
    let sharedCap = comp.cap !== undefined && comp.cap !== "" ? comp.cap : (c.cap || "");

    current_products.push({ 
        name: tempPendingProduct.name, 
        isNonTieup: tempPendingProduct.isNT, 
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
        isManual: false 
    }); 
    sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); 
    c.products = current_products; 
    c.sortConfigs = sortConfigs; 
    tempPendingProduct = null; 
    await saveQueueToLocal(); 
    renderMatrix(); 
}

function updateFinalSwitcher() { let sw = document.getElementById('finalCustomerSwitcher'); if(!sw) return; sw.innerHTML = customerQueue.map((c, i) => `<option value="${i}" ${i === activeCustomerIndex ? 'selected' : ''}>👤 ${c.name} (₹${c.limit})</option>`).join(''); }
async function switchCustomerFinal(idx) { activeCustomerIndex = parseInt(idx); await saveQueueToLocal(); goToFinalPage(); }
function updateMatrixTopCard() { let c = customerQueue[activeCustomerIndex]; document.getElementById('infoName').innerText = c?.name || "-"; document.getElementById('infoMobile').innerText = c?.mobile || "-"; document.getElementById('infoLimit').innerText = "₹" + (c?.limit || 0); document.getElementById('infoLtv').innerText = (c?.ltv || 100) + "%"; document.getElementById('infoCap').innerText = c?.cap ? "₹" + c.cap : "None"; document.getElementById('infoType').innerText = c?.type || 'NEW'; }
function loadCurrentProducts() { let c = customerQueue[activeCustomerIndex]; current_products = c?.products || []; sortConfigs = c?.sortConfigs || []; }

function goToFinalPage() {
    if(activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) return; 
    loadCurrentProducts(); 
    updateMatrixTopCard(); 
    updateFinalSwitcher(); 
    
    document.getElementById('unifiedHome').style.display = 'block';
    let finalArea = document.getElementById('finalEligibleArea');
    finalArea.style.display = 'flex';
    
    renderMatrix(); 
    setTimeout(() => { 
        if(current_products.length === 0) {
            openAddProductModal();
        } else {
            hideAllInlineSubPanels();
            finalArea.scrollIntoView({ behavior: 'smooth', block: 'start' }); 
        }
    }, 100);
}

function toggleModelView(pIdx) { 
    let wrapper = document.getElementById(`tw_${pIdx}`); 
    let icon = document.getElementById(`togIcon_${pIdx}`); 
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

/* मॉडेल पॅनेलमध्ये एकही इनपुट बॉक्स नाही; सर्व सेट केलेल्या व्हॅल्यूज चिप्समध्ये दिसतात आणि एडिटसाठी ✏️ व काढण्यासाठी ✖ आयकॉन */
function renderMatrix() {
    let container = document.getElementById('multiModelContainer'); container.innerHTML = "";
    let c = customerQueue[activeCustomerIndex];

    current_products.forEach((prod, pIdx) => {
        let div = document.createElement('div'); div.className = 'premium-model-panel'; 
        let isCollapsed = (current_products.length > 1 && pIdx < current_products.length - 1); 
        let displayStyle = isCollapsed ? 'none' : 'block'; 
        let toggleIcon = isCollapsed ? '▶' : '▼'; 
        let isPhoneWebMobile = isMobileDeviceCat(prod.category); 
        if (!isPhoneWebMobile) prod.inputs.rfc = 0; 
        if (isPhoneWebMobile) prod.inputs.exw = ""; 

        let inp = prod.inputs;
        let effectiveCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;

        /* फक्त ज्या व्हॅल्यूज सेट केल्या आहेत त्यांचेच Read-Only Chips तयार करतो */
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
        if (!chipsHtml) chipsHtml = `<span class="val-chip" style="color:#64748b;">No Price Components Set (Tap ✏️ To Edit)</span>`;

        div.innerHTML = `
            <div class="pmp-header" style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:10px 12px;">
                <div class="pmp-title" onclick="toggleModelView(${pIdx})" style="flex:1; min-width:140px; cursor:pointer;">
                    <span id="togIcon_${pIdx}" class="pmp-icon">${toggleIcon}</span>
                    ${prod.name}
                </div>
                <div style="display:flex; align-items:center; gap:6px;">
                    <button class="model-action-icon model-edit-icon" onclick="openEditModelComponents(${pIdx}, event)" title="Edit Values">✏️</button>
                    <button class="model-action-icon model-close-icon" onclick="removeModelFromMatrix(${pIdx}, event)" title="Close / Remove Model">✖</button>
                </div>
            </div>

            <div class="val-summary-bar">
                ${chipsHtml}
            </div>

            <div id="tw_${pIdx}" style="display:${displayStyle};">
                <div class="pmp-toolbar">
                    <button class="pmp-btn btn-quote" onclick="instantSingleQuote(${pIdx})">Quote</button>
                    <button class="pmp-btn btn-manual" onclick="openSchemeOnlyModal(${pIdx})">+ Manual</button>
                </div>

                <div class="table-wrapper pmp-table-wrapper">
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead style="background: #f1f5f9; color: #475569; border-bottom: 2px solid #cbd5e1;">
                            <tr style="font-size: 11px; font-weight: 900; letter-spacing: 0.5px; text-align:center;">
                                <th style="padding: 10px 4px; width: 12%;">T/A</th>
                                <th style="padding: 10px 4px; width: 18%;">Loan</th>
                                <th style="padding: 10px 4px; width: 18%;">Net DP</th>
                                <th style="padding: 10px 4px; width: 16%;">EMI</th>
                                <th style="padding: 10px 4px; width: 10%;">M</th>
                                <th style="padding: 10px 4px; width: 14%;">Daily</th>
                                <th style="padding: 10px 4px; width: 12%;">Act</th>
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
    let isPhoneWebMobile = isMobileDeviceCat(prod.category); 
    let inp = prod.inputs;
    if (!isPhoneWebMobile) inp.rfc = 0; 
    if (isPhoneWebMobile) inp.exw = ""; 
}

/* Capping नियम: जर Capping असेल तर EMI त्यापेक्षा जास्त कधीही जाणार नाही, आणि कमी झालेल्या लोननुसार DP आपोआप वाढेल */
function recalcModel(pIdx) {
    if(!current_products[pIdx]) return; 

    let c = customerQueue[activeCustomerIndex];
    let prod = current_products[pIdx], limit = c?.limit || 0, type = c?.type || 'NEW'; 
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850), inp = prod.inputs; 
    let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); 
    let currentLimit = limit > 0 ? limit : 9999999; 
    let inputMrp = parseFloat(inp.mrp) || 0; 
    let inputInv = parseFloat(inp.inv) || 0; 
    let effectivePrice = inputInv > 0 ? inputInv : (inputMrp > 0 ? inputMrp : 0); 
    let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;
    let activeCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;

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

            /* जर EMI Capping असेल तर EMI कॅपिंगच्या आत ठेवण्यासाठी लोन कमी करतो आणि त्यानुसार DP आपोआप वाढतो */
            if (activeCap > 0 && emi > activeCap) { 
                let maxLoanForCap = Math.floor((activeCap - (insTotal / inst)) / ((1 / s.tenure) + roiRate));
                if (maxLoanForCap < 0) maxLoanForCap = 0;
                if (effectivePrice > 0 && maxLoanForCap > effectivePrice) maxLoanForCap = effectivePrice;
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
        let extraVal = effectivePrice > 0 ? (((emi * inst) + dpRounded) - effectivePrice) : 0; 
        let dbdAmt = loan * dbdRate; 
        let roiAmt = (loan * roiRateDP) + (loan * roiRate * inst); 
        let curLTV = currentTenure > 0 ? ((currentTenure - s.advEmi) / currentTenure) * 100 : 0; 
        let marginMoney = parseFloat(inp.margin) || 0; 
        let roundupAdj = (dpRounded > dpExact) ? (dpRounded - dpExact) : 0; 
        let netDisb = effectivePrice > 0 ? (effectivePrice - dpRounded - marginMoney - roundupAdj) : 0;

        let isInv50Breach = effectivePrice > 0 && (loan < minAllowedLoanByInvoice);

        return { ...s, pf: dynamicPf, currentTenure, nbfcMaxL, loan, dp: dpRounded, emi, inst, daily: emi/30, dIdx, isFixed, curLTV, extra: extraVal, dbdAmt, roiAmt, netDisb, inactive: s.inactive || false, expiryDateStr: s.expiryDateStr, isInv50Breach: isInv50Breach, isCapBreach: isCapBreach };
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
        if (isNT && (prod.inputs.mrp > 0 || prod.inputs.inv > 0)) { 
            if (d.loan < d.minLoan || d.loan > d.maxLoan) isBoundB = true; 
        }
        if (d.isInv50Breach || d.isCapBreach) { isBoundB = true; }
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
        let actionMenuBtnHtml = `<button onclick="openRowActionModal(${pIdx}, ${d.dIdx}, ${isInactive})" style="background:var(--primary); color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:900; cursor:pointer; font-size: 11px;">Act</button>`;
        let bgCol = isInactive ? '#f8f9fa' : (d.isExpired ? '#fff4e6' : '#ffffff');
        let textOpacity = isInactive ? '0.5' : '1';
        let subRowBg = isInactive ? '#f8f9fa' : '#f8fafc';
        let dbdStr = `${+parseFloat(d.dbd).toFixed(3)}% (₹${Math.round(d.dbdAmt||0)})`;
        let roiStr = `${+parseFloat(d.roi).toFixed(2)}% (₹${Math.round(d.roiAmt||0)})`;
        let limitStr = isNT ? `Min:₹${d.minLoan} Max:${d.maxLoan < 9999999 ? d.maxLoan : 'No'}` : `Lmt:₹${Math.floor(d.nbfcMaxL)}`;

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
            <td style="padding: 12px 4px; text-align: center;">${actionMenuBtnHtml}</td>
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
                    <span><b style="color:#8b5cf6;">${limitStr}</b></span>
                    <span id="extra_${pIdx}_${d.dIdx}" onclick="sortM(${pIdx}, 'extra')" style="cursor:pointer; background:#fee2e2; color:#b91c1c; padding:3px 8px; border-radius:4px; font-weight:900; margin-left:auto;">Extra: ₹${Math.round(d.extra).toLocaleString()} ↕</span>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

function manual(pIdx, dIdx) {
    let c = customerQueue[activeCustomerIndex];
    let el = document.getElementById(`l_${pIdx}_${dIdx}`), loan = parseFloat(el.value) || 0, prod = current_products[pIdx], d = prod.calculatedData.find(x => x.dIdx === dIdx), inp = prod.inputs, type = c?.type || 'NEW';
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850); let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); 
    let limit = c?.limit || 0; 
    let currentLimit = limit > 0 ? limit : 9999999; let inputMrp = parseFloat(inp.mrp) || 0; let inputInv = parseFloat(inp.inv) || 0; 
    let effectivePrice = inputInv > 0 ? inputInv : (inputMrp > 0 ? inputMrp : 0); let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;
    let activeCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;

    let minAllowedLoanByInvoice = effectivePrice > 0 ? effectivePrice * 0.50 : 0;
    if (effectivePrice > 0 && loan < minAllowedLoanByInvoice) {
        loan = minAllowedLoanByInvoice;
        showToast("लोन रक्कम ५०% पेक्षा कमी असू शकत नाही!", "error");
    }

    if (effectivePrice > 0 && loan > effectivePrice) {
        loan = effectivePrice;
        showToast("लोन रक्कम इनव्हॉइसपेक्षा जास्त असू शकत नाही!", "warning");
    }

    syncInsurance(pIdx, inputMrp, loan); 
    let appliedPf = d.pf; if (prod.isNonTieup) { let checkAmount = effectivePrice > 0 ? effectivePrice : loan; let slabPf = getNonTieupPfValue(prod.category, checkAmount); if (slabPf !== null) appliedPf = slabPf; d.pf = appliedPf; }
    let dbdRate = (d.dbd * 1.18 / 100); let roiRate = d.roi / 1200; let roiRateDP = roiRate * d.advEmi; let dpE = 0; let dpR = 0;
    let insTotal = (parseFloat(inp.gtl)||0)+(parseFloat(inp.rfc)||0)+(parseFloat(inp.exw)||0);

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
        let emi = d.fixedEmi + (insTotal / inst) + roiInEmi; 
        d.loan = loan; d.currentTenure = calcTenure; d.dp = dpR; d.inst = inst; d.emi = emi; 
    } else { 
        let inst = d.tenure - d.advEmi; if(inst < 1) inst = 1;
        let nbfcMaxL = (currentLimit * d.tenure) / (d.tenure - d.advEmi || 1); 
        let maxBoundary = Math.min(loanCapPrice > 0 ? loanCapPrice : 999999, nbfcMaxL, prod.isNonTieup ? d.maxLoan : 9999999); 
        
        /* मॅन्युअल लोन टाकताना सुद्धा EMI Capping च्या वर जाणार नाही याची काळजी घेतो */
        if (activeCap > 0) {
            let maxLoanForCap = Math.floor((activeCap - (insTotal / inst)) / ((1 / d.tenure) + roiRate));
            if (loan > maxLoanForCap) {
                loan = Math.max(0, maxLoanForCap);
                showToast(`EMI Capping (₹${activeCap}) नुसार कमाल लोन ₹${loan} सेट केले!`, "warning");
            }
        }

        if(loan > maxBoundary) { loan = maxBoundary; } 
        if (effectivePrice > 0 && loan < minAllowedLoanByInvoice) { loan = minAllowedLoanByInvoice; }
        if (effectivePrice > 0 && loan > effectivePrice) { loan = effectivePrice; }
        el.value = Math.floor(loan); 

        let roiInEmi = loan * roiRate; let roiInDp = loan * roiRateDP; 
        dpE = effectivePrice - loan + ((loan/d.tenure) * d.advEmi) + (loan * dbdRate) + appliedPf + totalFees + roiInDp; 
        dpR = Math.ceil(dpE / 10) * 10; 
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
    saveQueueToLocal();
    renderRows(pIdx);
}

function sortM(pIdx, key) { 
    let conf = sortConfigs[pIdx]; 
    if(conf.key === key) { conf.dir = conf.dir === 'asc' ? 'desc' : 'asc'; } 
    else { conf.key = key; conf.dir = key === 'curLTV' ? 'desc' : 'asc'; }
    renderRows(pIdx); 
    customerQueue[activeCustomerIndex].products = current_products; 
    saveQueueToLocal(); 
}

function copySchemeText(pIdx, dIdx, btnElement) {
    let prod = current_products[pIdx], d = prod.calculatedData.find(x => x.dIdx === dIdx); let invAmt = prod.inputs.inv > 0 ? prod.inputs.inv : prod.inputs.mrp; let c = customerQueue[activeCustomerIndex]; let cappingLine = (c.cap && c.cap !== "") ? `\nEMI Capping- ${c.cap}` : ""; let custDetails = `Customer Name- ${c.name}\nLimit- ${c.limit}\nLTV- ${c.ltv}${cappingLine}\n\n`;
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
    let mode = document.getElementById('targetPIdx').value; 
    let manNameInput = document.getElementById('manName').value.toUpperCase().trim();
    let scheme = { tenure: parseInt(document.getElementById('manTen').value)||0, advEmi: parseInt(document.getElementById('manAdv').value)||0, dbd: parseFloat(document.getElementById('manDbd').value)||0, pf: parseInt(document.getElementById('manPf').value)||0, roi: parseFloat(document.getElementById('manRoi').value)||0, fixedEmi: parseInt(document.getElementById('manFixed').value)||0, minLoan: 0, maxLoan: 9999999, category: "MANUAL", inactive: false, isExpired: false, expiryDateStr: "" };
    if(mode === "NEW") { 
        let name = manNameInput !== "" ? manNameInput : "MANUAL MODEL"; 
        let c = customerQueue[activeCustomerIndex];
        let sharedTarget = c?.targetDp || c?.components?.target || ""; 
        current_products.push({ name: name, schemes: [scheme], category: "MANUAL", inputs: { mrp: "", inv: "", cap: c?.cap || "", target: sharedTarget, gtl: 0, rfc: 0, exw: "", margin: "", dealer: "", surch: 0, manualLoans: {} }, isManual: true }); 
        sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); 
        customerQueue[activeCustomerIndex].products = current_products; 
        customerQueue[activeCustomerIndex].sortConfigs = sortConfigs; 
        await saveQueueToLocal(); renderMatrix(); 
    } else { 
        current_products[mode].schemes.push(scheme); 
        customerQueue[activeCustomerIndex].products = current_products;
        await saveQueueToLocal();
        recalcModel(parseInt(mode)); 
    } 
    closeManualModal();
}

function openQuoteSelectionModal() {
    if(current_products.length === 0) { showToast("आधी Matrix मध्ये Product Add करा!", "warning"); return; }
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
            <h2 style="margin: 0 0 10px 0; font-size: 26px; font-weight: 900;">🎉 Special Loan Offers</h2> 
            <div style="display: flex; gap: 14px; font-size: 15px; font-weight: 900; justify-content: center; background: rgba(255,255,255,0.1); padding: 8px; border-radius: 8px;">
                <span>👤 ${custName}</span>
                <span>| Limit: ₹${c?.limit ? c.limit.toLocaleString() : 0}</span>
                <span>| Max LTV: ${ltvLimit}%</span>
                <span>| ${c?.type || 'NEW'}</span>
            </div>
        </div>
        <div style="padding: 16px;">
    `;

    let hasV = false; 
    let productsToRender = window.tempImageGenIndices.map(idx => current_products[idx]);

    productsToRender.forEach((prod) => {
        let validS = prod.calculatedData.filter(d => !d.inactive && !d.isInv50Breach && !d.isCapBreach && d.loan > 0);
        if(validS.length === 0) return; 
        hasV = true; 
        let invAmt = prod.inputs.inv > 0 ? prod.inputs.inv : prod.inputs.mrp;

        html += `
            <div style="border-left: 10px solid #034887; background: #ffffff; margin-bottom: 16px; border: 1px solid #cbd5e1;">
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; border-bottom: 2px solid #e2e8f0;">
                    <div style="font-size: 20px; font-weight: 900; color: #034887;">📱 ${prod.name.toUpperCase()}</div>
                    <div style="background: #034887; color: #fff; padding: 6px 14px; border-radius: 6px; font-weight: 900;">Inv: ₹${invAmt ? invAmt.toLocaleString() : 0}</div>
                </div>
                <table style="width: 100%; border-collapse: collapse; text-align: center;">
                    <thead style="background: #f8fafc; border-bottom: 2px solid #cbd5e1; font-size: 14px;">
                        <tr><th style="padding:10px;">Scheme</th><th style="padding:10px;">DP</th><th style="padding:10px;">EMI</th><th style="padding:10px;">Months</th><th style="padding:10px;">Daily</th></tr>
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

function openRowActionModal(pIdx, dIdx, isInactive) {
    let container = document.getElementById('rowActionButtons');
    container.innerHTML = `
        <button onclick="copySchemeText(${pIdx}, ${dIdx}, this); closeRowActionModal();" style="background:#f8fafc; color:var(--dark); border:1px solid #cbd5e1; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">Copy Scheme</button>
        <button onclick="openEditSchemeModal(${pIdx}, ${dIdx}); closeRowActionModal();" style="background:#fff7ed; color:#d97706; border:1px solid #fed7aa; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">Edit Scheme</button>
        <button onclick="toggleInactive(${pIdx}, ${dIdx}); closeRowActionModal();" style="background:${isInactive ? '#ecfdf5' : '#fef2f2'}; color:${isInactive ? '#059669' : '#dc2626'}; border:1px solid ${isInactive ? '#a7f3d0' : '#fecaca'}; padding:14px; border-radius:8px; font-weight:900; font-size:14px; width:100%;">${isInactive ? 'Add To Active' : 'Disable Scheme'}</button>
    `;
    document.getElementById('rowActionModal').style.display = 'flex';
}

function closeRowActionModal() { document.getElementById('rowActionModal').style.display = 'none'; }
