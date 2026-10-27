/* =========================================================================
   PERSISTENT PORTAL - PRO EDITION (COMPLETE CORE ENGINE)
   ========================================================================= */

const DB_NAME = "PersistentPortalDB"; 
const DB_VERSION = 2; 
const STORE_NAME = "dataStore"; 
let dbInstance;

const EXCEL_ENDPOINTS = [
    "https://raw.githubusercontent.com/luckyjathar/testcalculator/main/master_data.xlsx",
    "https://raw.githubusercontent.com/luckyjathar/CALCULATOR/main/master_data.xlsx",
    "https://cdn.jsdelivr.net/gh/luckyjathar/testcalculator@main/master_data.xlsx"
];

let db_records = []; let current_products = []; let sortConfigs = []; 
let customerQueue = []; let recycleBin = []; 
let activeCustomerIndex = -1; let selectedQueueIndex = -1; 
let tempPendingProduct = null; let currentModalCategory = ""; let editingProductIdx = -1;
const SPECIAL_MODEL = "NON TIEUP"; 

let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById("toastNotification"); if (!toast) return;
    toast.className = "toast-notification show " + type; toast.innerText = message;
    clearTimeout(toastTimeout); toastTimeout = setTimeout(() => { toast.className = "toast-notification"; }, 3000);
}

const INLINE_SUB_PANELS = ['addProductModal', 'catSelectionModal', 'componentsModal', 'multiStackModal'];
function hideAllInlineSubPanels() { INLINE_SUB_PANELS.forEach(id => { let el = document.getElementById(id); if (el) el.style.display = 'none'; }); }
function showInlineSubPanel(id) { hideAllInlineSubPanels(); let el = document.getElementById(id); if (el) { el.style.display = 'block'; setTimeout(() => el.scrollIntoView({behavior: 'smooth', block: 'start'}), 100); } }

/* === IndexedDB Functions === */
function initDB() { 
    return new Promise((resolve) => { 
        let req = indexedDB.open(DB_NAME, DB_VERSION); 
        req.onupgradeneeded = e => { let db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME); }; 
        req.onsuccess = e => { dbInstance = e.target.result; resolve(dbInstance); }; req.onerror = () => resolve(null); 
    }); 
}
function saveToDB(key, data) { return new Promise((res) => { if (!dbInstance) return res(); try { let tx = dbInstance.transaction(STORE_NAME, 'readwrite'); tx.objectStore(STORE_NAME).put(JSON.stringify(data), key).onsuccess = res; } catch(e) { res(); } }); }
function getFromDB(key) { return new Promise((res) => { if (!dbInstance) return res(null); try { let req = dbInstance.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key); req.onsuccess = e => res(e.target.result ? JSON.parse(e.target.result) : null); req.onerror = () => res(null); } catch(e) { res(null); } }); }

/* === Master Data Sync & Parsing === */
async function fetchFromMasterStream(forceSync = false) {
    let cached = await getFromDB('cached_db_records');
    if (cached && cached.length > 0 && !forceSync) { db_records = cached; updateMasterBadgeUI(); fetchLatestExcelBackground(false); return; }
    await fetchLatestExcelBackground(true);
}
async function fetchLatestExcelBackground(showToasts) {
    let badge = document.getElementById('masterDataStatusBadge');
    if(showToasts && badge) badge.innerText = "🔄 Syncing...";
    let now = Date.now(); let dataBuffer = null;
    for (let url of EXCEL_ENDPOINTS) { try { let res = await fetch(url + '?t=' + now, { cache: "no-store" }); if (res.ok) { dataBuffer = await res.arrayBuffer(); break; } } catch(e) {} }
    if (dataBuffer) { await processArrayBufferToDB(dataBuffer); if(showToasts) showToast("Master Data Updated!", "success"); } 
    else { if(showToasts) showToast("Network Error! Try Manual Upload.", "error"); updateMasterBadgeUI(); }
}
function updateMasterBadgeUI() {
    let badge = document.getElementById('masterDataStatusBadge'); if (!badge) return;
    if (db_records.length > 0) { badge.innerHTML = `✅ Master Ready (${db_records.length})`; badge.style.background = '#d1fae5'; badge.style.color = '#059669'; badge.style.border = 'none'; } 
    else { badge.innerHTML = `⚠️ Master Data Missing (Tap to Sync)`; badge.style.background = '#fee2e2'; badge.style.color = '#ef4444'; badge.style.border = 'none'; }
}
async function forceRefreshMasterData() { await fetchFromMasterStream(true); }

function parseExcelDate(val) { if (!val) return null; if (typeof val === 'number') return new Date(Math.round((val - 25569) * 86400 * 1000)); let d = new Date(val); return isNaN(d.getTime()) ? null : d; }
function findValLocal(row, targets) { 
    let keys = Object.keys(row); let ek = keys.find(k => targets.includes(k.toUpperCase().replace(/[^A-Z0-9%]/g, ''))); 
    if (ek !== undefined) return row[ek]; let pk = keys.find(k => targets.some(t => k.toUpperCase().replace(/[^A-Z0-9%]/g, '').includes(t))); return pk !== undefined ? row[pk] : null; 
}
function standardizeCategoryName(cat) { let c = String(cat||"").toUpperCase().replace(/\s+/g, '').trim(); if (c.includes('PHONE') || c.includes('MOBILE') || c.includes('TABLET') || c.includes('SMARTWATCH')) return "PHONE(WEB-MOBILE)"; if (c.includes('AC') || c.includes('AIRCONDITIONER')) return "AC"; return c; }
function isMobileDeviceCat(cat) { return standardizeCategoryName(cat) === "PHONE(WEB-MOBILE)"; }
function getRfcSlabValue(v) { let a=parseFloat(v)||0; if(a<8000) return 0; if(a<=10000) return 1109; if(a<=15000) return 1631; if(a<=20000) return 2147; if(a<=25000) return 2695; if(a<=30000) return 3215; if(a<=35000) return 3648; if(a<=40000) return 4219; if(a<=50000) return 5720; if(a<=60000) return 8686; if(a<=100000) return 11438; return 0; }
function getGtlSlabValue(v) { let a=parseFloat(v)||0; return a>100000 ? 2398 : a>50000 ? 1799 : a>30000 ? 1499 : a>10000 ? 1199 : a>0 ? 699 : 0; }
function getNonTieupPfValue(cat, a) { let c=standardizeCategoryName(cat); let v=parseFloat(a)||0; if(c.includes('DESKTOP')||c.includes('LAPTOP')) return 699; if(c==='PHONE(WEB-MOBILE)') return v<=30000 ? 499 : v<=50000 ? 599 : 699; return null; }

function mapData(row, type) { 
    if(!row) return null; 
    let expDate = parseExcelDate(findValLocal(row, ['EXPIRY', 'ENDDATE', 'VALIDTILL'])); let isExp = false, expStr = ""; 
    if(expDate && !isNaN(expDate.getTime())) { if(expDate < new Date().setHours(0,0,0,0)) isExp = true; expStr = `${String(expDate.getDate()).padStart(2,'0')}/${String(expDate.getMonth()+1).padStart(2,'0')}/${expDate.getFullYear()}`; } 
    let rawTen = findValLocal(row, ['TOTALTENURE', 'TENURE']); let rawAdv = findValLocal(row, ['ADVANCEEMI', 'ADV']);
    if (rawTen && String(rawTen).includes('/')) { let p = String(rawTen).split('/'); rawTen = p[0]; if(!rawAdv) rawAdv = p[1]; }
    return { 
        model: type===SPECIAL_MODEL ? SPECIAL_MODEL : String(findValLocal(row,['MODEL','PRODUCT'])||"").trim().toUpperCase(), 
        brand: String(findValLocal(row,['BRAND'])||"").trim().toUpperCase(), mrp: parseFloat(findValLocal(row,['MRP','PRICE']))||0, 
        tenure: parseInt(rawTen)||0, advEmi: parseInt(rawAdv)||0, dbd: parseFloat(findValLocal(row,['DBD'])||0), 
        pf: parseInt(findValLocal(row,['PF'])||0), roi: parseFloat(findValLocal(row,['ROI'])||0), fixedEmi: parseFloat(findValLocal(row,['FIXEDEMI'])||0), 
        category: standardizeCategoryName(findValLocal(row,['CATEGORY'])), minLoan: parseFloat(findValLocal(row,['MINLOAN']))||0, maxLoan: parseFloat(findValLocal(row,['MAXLOAN']))||9999999, 
        isExpired: isExp, expiryDateStr: expStr, inactive: false 
    }; 
}

function parseSheetSmartly(sheet) {
    if (!sheet) return [];
    let rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });
    if (rows.length > 0) {
        if (Object.keys(rows[0]).some(k => k.includes('__EMPTY'))) {
            let matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
            let headerRowIdx = matrix.findIndex(r => Array.isArray(r) && r.some(cell => String(cell).toUpperCase().match(/MODEL|TENURE|CATEGORY|DBD/)));
            if (headerRowIdx > 0) rows = XLSX.utils.sheet_to_json(sheet, { range: headerRowIdx, raw: false, defval: "" });
        }
    }
    return rows;
}

// 3rd Sheet Logic Integration
async function processArrayBufferToDB(buf) {
    let wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    let s1 = parseSheetSmartly(wb.Sheets[wb.SheetNames[0]]).map(r=>mapData(r,"REG")).filter(x=>x&&x.model);
    let s2 = wb.SheetNames.length>1 ? parseSheetSmartly(wb.Sheets[wb.SheetNames[1]]).map(r=>mapData(r,SPECIAL_MODEL)).filter(x=>x&&x.model) : [];
    
    // 3rd Sheet Data Integration Rule
    let s3 = wb.SheetNames.length>2 ? parseSheetSmartly(wb.Sheets[wb.SheetNames[2]]).map(r=>mapData(r,"REG")).filter(x=>x&&x.model) : [];
    
    let unique = [], seen = new Set();
    [...s1, ...s2, ...s3].forEach(r => { 
        let k=`${r.model}|${r.brand}|${r.mrp}|${r.tenure}|${r.advEmi}|${r.dbd}|${r.pf}|${r.roi}|${r.fixedEmi}`; 
        if(!seen.has(k)) { seen.add(k); unique.push(r); } 
    });
    
    if(unique.length===0) throw new Error("No valid schemes found in Excel.");
    db_records = unique; await saveToDB('cached_db_records', db_records); updateMasterBadgeUI();
    if(activeCustomerIndex!==-1) { loadCurrentProducts(); renderMatrix(); }
}

async function handleManualExcelUpload(e) { 
    let f=e.target.files[0]; if(!f)return; 
    try{ showToast("Processing Excel...", "warning"); await processArrayBufferToDB(await f.arrayBuffer()); showToast(`Success! Loaded ${db_records.length} schemes.`, "success"); } 
    catch(err) { showToast(err.message,"error"); } e.target.value=""; 
}

/* === System Startup === */
window.onload = async function() {
    generateStackCards(); await initDB(); await fetchFromMasterStream(false);
    
    let sq = await getFromDB('persistent_queue') || JSON.parse(localStorage.getItem('persistent_queue_backup')||'[]');
    customerQueue = sq.map(c => ({ ...c, components: c.components||{}, products: c.products||[], sortConfigs: c.sortConfigs||[] }));
    
    let rec = await getFromDB('persistent_recycle') || JSON.parse(localStorage.getItem('persistent_recycle_backup')||'[]');
    recycleBin = rec;

    let aidx = await getFromDB('persistent_active_idx') ?? localStorage.getItem('persistent_active_idx_backup');
    activeCustomerIndex = (aidx !== null && parseInt(aidx) < customerQueue.length) ? parseInt(aidx) : -1;
    
    renderCustomerQueue(); if(activeCustomerIndex!==-1) goToFinalPage();
};

async function saveQueueToLocal() {
    let cq = customerQueue.map(c => ({...c, products: c.products.map(({calculatedData, ...p})=>p)}));
    localStorage.setItem('persistent_queue_backup', JSON.stringify(cq)); localStorage.setItem('persistent_active_idx_backup', activeCustomerIndex);
    await saveToDB('persistent_queue', cq); await saveToDB('persistent_active_idx', activeCustomerIndex);
}

function goHome() { 
    hideAllInlineSubPanels(); let fa = document.getElementById('finalEligibleArea'); if(fa) fa.style.display='none'; 
    let uh = document.getElementById('unifiedHome'); if(uh) uh.style.display='block'; 
    activeCustomerIndex=-1; renderCustomerQueue(); window.scrollTo({top:0, behavior:'smooth'}); 
}

/* === Customer Add / Edit / Recycle Bin === */
function openAddCustomerModal() { let m = document.getElementById('addCustomerModal'); if(m) m.style.display='flex'; }
function closeAddCustomerModal() { let m = document.getElementById('addCustomerModal'); if(m) m.style.display='none'; }
function openCustomerHistoryModal() { renderCustomerQueue(); let m = document.getElementById('customerHistoryModal'); if(m) m.style.display='flex'; }
function closeCustomerHistoryModal() { let m = document.getElementById('customerHistoryModal'); if(m) m.style.display='none'; }

async function addCustomerToQueue() {
    let limitEl = document.getElementById('cqLimit'); let limit = limitEl ? parseFloat(limitEl.value) : 0;
    if(isNaN(limit) || limit<=0) return showToast("Enter a valid NBFC Limit!", "error");
    if(db_records.length===0) return showToast("Please wait for Master Data to Sync.", "warning");
    
    let typeEl = document.getElementById('cqType'); let type = typeEl ? typeEl.value : "NEW";
    let nameEl = document.getElementById('cqName'); let name = nameEl ? nameEl.value.trim() : "";
    let ltvEl = document.getElementById('cqLtv'); let capEl = document.getElementById('cqCap');
    
    let c = { id: Date.now(), name: name || `Cust ${customerQueue.length+1}`, limit: limit, ltv: ltvEl ? (parseFloat(ltvEl.value)||100) : 100, type: type, cap: capEl ? (parseFloat(capEl.value)||"") : "", targetDp: "", timestamp: new Date().toLocaleString(), components: {}, products: [], sortConfigs: [] };
    customerQueue.unshift(c); activeCustomerIndex = 0; await saveQueueToLocal();
    if(nameEl) nameEl.value = ""; if(limitEl) limitEl.value = ""; if(capEl) capEl.value = "";
    closeAddCustomerModal(); renderCustomerQueue(); goToFinalPage();
}

function renderCustomerQueue() {
    let qEl = document.getElementById('queueSearch'); let q = qEl ? qEl.value.toLowerCase().trim() : "";
    let list = document.getElementById('customerQueueList'); let hCount = document.getElementById('queueCountHome'); if(hCount) hCount.innerText = customerQueue.length;
    if(!list) return;
    let html = customerQueue.map((c, i) => ({...c, idx: i})).filter(c => c.name.toLowerCase().includes(q) || String(c.limit).includes(q) || c.type.toLowerCase().includes(q)).map(c => `
        <div style="background:#f8fafc; border:1px solid ${c.idx===activeCustomerIndex?'var(--primary)':'var(--border)'}; padding:12px; border-radius:12px; display:flex; justify-content:space-between; align-items:center;">
            <div onclick="setActiveCustomer(${c.idx})" style="flex:1; cursor:pointer;">
                <div style="font-weight:700; font-size:15px; color:var(--text-main); text-transform:capitalize;">👤 ${c.name}</div>
                <div style="font-size:12px; color:var(--text-muted); margin-top:4px;">Limit: <b style="color:var(--success)">₹${c.limit}</b> | LTV: ${c.ltv}% | ${c.type}</div>
            </div>
            <div style="display:flex; gap:8px;">
                <button onclick="selectedQueueIndex=${c.idx}; uniEdit();" style="background:var(--primary); color:white; border:none; padding:6px 10px; border-radius:6px; font-size:11px;">✏️</button>
                <button onclick="selectedQueueIndex=${c.idx}; uniDelete();" style="background:var(--danger); color:white; border:none; padding:6px 10px; border-radius:6px; font-size:11px;">🗑️</button>
            </div>
        </div>`).join('');
    list.innerHTML = html || "<div style='text-align:center; padding:20px; color:#999; font-weight:600;'>No customers found.</div>";
}

async function setActiveCustomer(idx) { activeCustomerIndex = idx; await saveQueueToLocal(); closeCustomerHistoryModal(); goToFinalPage(); }

function uniEdit() {
    if(selectedQueueIndex === -1) return; let c = customerQueue[selectedQueueIndex]; let modal = document.getElementById('editCustomerModal'); if(!modal) return;
    document.getElementById('ecName').value = c.name || ''; document.getElementById('ecLimit').value = c.limit; document.getElementById('ecType').value = c.type; document.getElementById('ecLtv').value = c.ltv || 100; document.getElementById('ecCap').value = c.cap || ''; modal.style.display = 'flex';
}
function closeCustomerEdit() { let m = document.getElementById('editCustomerModal'); if(m) m.style.display = 'none'; }
async function saveCustomerEdit() {
    if(selectedQueueIndex === -1) return; let c = customerQueue[selectedQueueIndex];
    c.name = document.getElementById('ecName').value || ''; c.limit = parseFloat(document.getElementById('ecLimit').value) || 0; c.type = document.getElementById('ecType').value; c.ltv = parseFloat(document.getElementById('ecLtv').value) || 100;
    let cap = parseFloat(document.getElementById('ecCap').value); c.cap = cap > 0 ? cap : '';
    await saveQueueToLocal(); renderCustomerQueue(); if(activeCustomerIndex === selectedQueueIndex) goToFinalPage(); closeCustomerEdit();
}

async function uniDelete() {
    if(selectedQueueIndex === -1) return; let c = customerQueue.splice(selectedQueueIndex, 1)[0]; recycleBin.push(c);
    await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin));
    if(activeCustomerIndex === selectedQueueIndex) activeCustomerIndex = -1; else if (activeCustomerIndex > selectedQueueIndex) activeCustomerIndex--;
    if(customerQueue.length > 0 && activeCustomerIndex === -1) activeCustomerIndex = 0;
    await saveQueueToLocal(); renderCustomerQueue(); if(activeCustomerIndex === -1) goHome(); else goToFinalPage();
}

function openRecycleBin() {
    let m = document.getElementById('recycleBinModal'); if(!m) return; let list = document.getElementById('recycleBinList');
    if(recycleBin.length === 0) { list.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-weight:bold;">Bin Empty</div>`; } else {
        list.innerHTML = recycleBin.map((c, i) => `
            <div style="display:flex; justify-content:space-between; align-items:center; background:#f8fafc; padding:10px; border-radius:8px; border:1px solid var(--border);">
                <div style="font-size:12px; font-weight:600; color:var(--text-main);">👤 ${c.name} <br><span style="color:var(--danger);">Deleted Limit: ₹${c.limit}</span></div>
                <button onclick="restoreCustomer(${i})" style="background:var(--success); color:white; border:none; padding:6px 12px; border-radius:6px; font-weight:bold;">Restore</button>
            </div>
        `).join('');
    } m.style.display = 'flex';
}
function closeRecycleBin() { let m = document.getElementById('recycleBinModal'); if(m) m.style.display = 'none'; }
async function restoreCustomer(idx) { let c = recycleBin.splice(idx, 1)[0]; customerQueue.unshift(c); if(activeCustomerIndex !== -1) activeCustomerIndex++; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); await saveQueueToLocal(); openRecycleBin(); renderCustomerQueue(); }
async function emptyRecycleBin() { recycleBin = []; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); openRecycleBin(); showToast("Recycle Bin Cleared", "success"); }

/* === Workflow logic & Selection === */
function goToFinalPage() {
    let c = customerQueue[activeCustomerIndex]; if(!c) return;
    let uh = document.getElementById('unifiedHome'); if(uh) uh.style.display = 'none';
    let fa = document.getElementById('finalEligibleArea'); if(fa) fa.style.display = 'flex';
    let n = document.getElementById('infoName'); if(n) n.innerText = c.name || "Customer";
    let l = document.getElementById('infoLimit'); if(l) l.innerText = "₹" + (c.limit||0).toLocaleString();
    let t = document.getElementById('infoType'); if(t) t.innerText = c.type;
    let ltv = document.getElementById('infoLtv'); if(ltv) ltv.innerText = c.ltv + "%";
    let cap = document.getElementById('infoCap'); if(cap) cap.innerText = c.cap ? "₹"+c.cap : "None";
    loadCurrentProducts(); renderMatrix(); setTimeout(() => { if(current_products.length === 0) openAddProductModal(); }, 100);
}
function loadCurrentProducts() { let c = customerQueue[activeCustomerIndex]; current_products = c.products||[]; sortConfigs = c.sortConfigs||[]; }

function openAddProductModal() { showInlineSubPanel('addProductModal'); let s = document.getElementById('modalMatrixSearch'); if(s) { s.value=''; s.focus(); } let dd = document.getElementById('modalMatrixSearchDropdown'); if(dd) dd.style.display='none'; }
function doSearch(inpId, ddId) {
    let q = document.getElementById(inpId).value.toUpperCase().trim(); let dd = document.getElementById(ddId); if(!q) return dd.style.display='none';
    let matches = [...new Set(db_records.filter(r=>r.model!==SPECIAL_MODEL && r.model.includes(q)).map(r=>r.model))].slice(0,30);
    if (matches.length === 0) { dd.innerHTML = `<div style="padding:10px; text-align:center; color:var(--text-muted); font-weight:600;">No models found</div>`; } else {
        dd.innerHTML = matches.map(m => `<div style="padding:12px 10px; border-bottom:1px solid #f1f5f9; font-weight:600; font-size:13px; cursor:pointer; color:var(--text-main);" onclick="selectModel('${m.replace(/'/g,"\\'")}')">${m}</div>`).join('');
    } dd.style.display='block';
}
function selectModel(name) {
    editingProductIdx = -1; let raw = db_records.filter(r=>r.model===name);
    tempPendingProduct = { name: name, isNT: false, category: raw[0]?.category||"OTHER" }; currentModalCategory = tempPendingProduct.category;
    showComponentsModal(raw.find(s=>s.mrp>0)?.mrp || "");
}
function quickNonTieup() {
    editingProductIdx = -1; let cats = [...new Set(db_records.filter(r=>r.model===SPECIAL_MODEL).map(r=>r.category))].sort();
    let cg = document.getElementById('categoryGrid'); if(cg) { cg.innerHTML = cats.map(c => `<button onclick="selectCategory('${c}')" class="btn-outline" style="border:1px solid var(--primary); color:var(--primary); font-size:12px; border-radius:8px;">${c==='PHONE(WEB-MOBILE)'?'Phone/Tablet':c}</button>`).join(''); } showInlineSubPanel('catSelectionModal');
}
function selectCategory(cat) { editingProductIdx = -1; tempPendingProduct = { name: SPECIAL_MODEL+" - "+cat, isNT: true, category: cat }; currentModalCategory = cat; showComponentsModal(""); }

function generateStackCards() {
    let box = document.getElementById('stackInputsContainer'); if(!box) return; box.innerHTML = "";
    for(let i=1; i<=10; i++) {
        box.innerHTML += `
        <div style="background:#f8fafc; border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:10px;">
            <div style="font-weight:700; color:var(--primary); margin-bottom:6px; font-size:13px;">Scheme #${i}</div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                <div><label>Tenure Max</label><input type="number" id="msTen_${i}"></div>
                <div><label>Advance</label><input type="number" id="msAdv_${i}"></div>
                <div><label>DBD %</label><input type="number" id="msDbd_${i}"></div>
                <div><label>PF ₹</label><input type="number" id="msPf_${i}"></div>
                <div><label>ROI %</label><input type="number" id="msRoi_${i}"></div>
                <div><label>Fixed EMI ₹</label><input type="number" id="msFix_${i}"></div>
            </div>
        </div>`;
    }
}
function openMultiStackModal() { showInlineSubPanel('multiStackModal'); }
function closeMultiStackModal() { let m = document.getElementById('multiStackModal'); if(m) m.style.display='none'; }
function processMultiStack() {
    let name = document.getElementById('multiStackModelName').value.trim().toUpperCase(); if (!name) return showToast("Model Name Required!", "error");
    let valid = [];
    for(let i=1; i<=10; i++) {
        let t = parseInt(document.getElementById(`msTen_${i}`).value)||0; let f = parseInt(document.getElementById(`msFix_${i}`).value)||0;
        if(t>0 || f>0) {
            valid.push({ model: name, brand: "MANUAL", tenure: t, fixedEmi: f, advEmi: parseInt(document.getElementById(`msAdv_${i}`).value)||0, dbd: parseFloat(document.getElementById(`msDbd_${i}`).value)||0, pf: parseInt(document.getElementById(`msPf_${i}`).value)||0, roi: parseFloat(document.getElementById(`msRoi_${i}`).value)||0, minLoan: 0, maxLoan: 9999999, category: "MANUAL", inactive: false, isExpired: false });
        }
    }
    if(valid.length > 0) { closeMultiStackModal(); tempPendingProduct = { name: name, isNT: false, isManual: true, manualSchemes: valid, category: "MANUAL" }; currentModalCategory = "MANUAL"; showComponentsModal(""); } else { showToast("Enter at least 1 Scheme!", "error"); }
}

function showComponentsModal(baseMrp="") {
    let isMob = isMobileDeviceCat(currentModalCategory); let n = document.getElementById('compPendingModelName'); if(n) n.innerText = tempPendingProduct ? tempPendingProduct.name : (current_products[editingProductIdx]?.name||"");
    document.getElementById('compMrp').value = baseMrp; document.getElementById('compInv').value = ""; document.getElementById('compTarget').value = customerQueue[activeCustomerIndex]?.targetDp||""; document.getElementById('compCap').value = customerQueue[activeCustomerIndex]?.cap||""; document.getElementById('compExw').value = ""; document.getElementById('compMargin').value = ""; document.getElementById('compDealer').value = "";
    document.getElementById('compRfc').disabled = !isMob; document.getElementById('compExw').disabled = isMob;
    compPriceChanged(); showInlineSubPanel('componentsModal'); setTimeout(() => document.getElementById('compInv').focus(), 100);
}
function compPriceChanged() {
    let mrp = parseFloat(document.getElementById('compMrp').value)||0; let inv = parseFloat(document.getElementById('compInv').value)||0; let eff = inv>0 ? inv : mrp;
    document.getElementById('compGtl').value = String(getGtlSlabValue(eff)); let rfcS = getRfcSlabValue(eff); document.getElementById('compRfcOpt').value = rfcS; document.getElementById('compRfcOpt').innerText = rfcS;
    if(!isMobileDeviceCat(currentModalCategory)) document.getElementById('compRfc').value = "0";
}
function cancelComponentsModal() { hideAllInlineSubPanels(); tempPendingProduct = null; editingProductIdx = -1; }

async function proceedToMatrixFromComponents() {
    let inv = parseFloat(document.getElementById('compInv').value); if(isNaN(inv) || inv<=0) return showToast("Invoice Value is Required!", "error");
    let c = customerQueue[activeCustomerIndex]; let cap = parseFloat(document.getElementById('compCap').value)||""; let tar = parseFloat(document.getElementById('compTarget').value)||"";
    
    let inputs = {
        mrp: parseFloat(document.getElementById('compMrp').value)||"", inv: inv, cap: cap, target: tar,
        gtl: parseFloat(document.getElementById('compGtl').value)||0, rfc: isMobileDeviceCat(currentModalCategory) ? parseFloat(document.getElementById('compRfc').value)||0 : 0,
        exw: isMobileDeviceCat(currentModalCategory) ? "" : parseFloat(document.getElementById('compExw').value)||"",
        margin: parseFloat(document.getElementById('compMargin').value)||"", dealer: parseFloat(document.getElementById('compDealer').value)||"",
        surch: Math.max(0, inv - (parseFloat(document.getElementById('compMrp').value)||0)), manualLoans: {}
    };

    if(cap !== "") c.cap = cap; if(tar !== "") c.targetDp = tar;
    if (editingProductIdx !== -1) { current_products[editingProductIdx].inputs = inputs; } else {
        let uniq = [];
        if(tempPendingProduct.isManual) { uniq = tempPendingProduct.manualSchemes; }
        else { let raw = tempPendingProduct.isNT ? db_records.filter(r=>r.model===SPECIAL_MODEL && r.category===tempPendingProduct.category) : db_records.filter(r=>r.model===tempPendingProduct.name); let seen=new Set(); raw.forEach(s => { let k = `${s.mrp}|${s.tenure}|${s.advEmi}|${s.dbd}|${s.pf}|${s.roi}|${s.fixedEmi}`; if(!seen.has(k)){seen.add(k); uniq.push({...s, inactive:false});} }); }
        current_products.push({ name: tempPendingProduct.name, isNonTieup: tempPendingProduct.isNT, category: tempPendingProduct.category, schemes: uniq, inputs: inputs, isManual: tempPendingProduct.isManual });
        sortConfigs.push({key: 'dp', dir: 'asc'});
    }
    c.products = current_products; c.sortConfigs = sortConfigs; await saveQueueToLocal(); hideAllInlineSubPanels(); renderMatrix();
}

function openEditModelComponents(pIdx) {
    editingProductIdx = pIdx; let prod = current_products[pIdx]; currentModalCategory = prod.category; showComponentsModal(prod.inputs.mrp);
    document.getElementById('compInv').value = prod.inputs.inv||""; document.getElementById('compCap').value = prod.inputs.cap||""; document.getElementById('compTarget').value = prod.inputs.target||""; document.getElementById('compExw').value = prod.inputs.exw||""; document.getElementById('compMargin').value = prod.inputs.margin||""; document.getElementById('compDealer').value = prod.inputs.dealer||"";
    compPriceChanged();
}
function removeModelFromMatrix(pIdx) { current_products.splice(pIdx, 1); sortConfigs.splice(pIdx, 1); customerQueue[activeCustomerIndex].products = current_products; saveQueueToLocal(); renderMatrix(); }

/* === MAIN UNDERWRITING LOGIC === */
function renderMatrix() {
    let box = document.getElementById('multiModelContainer'); if(!box) return; box.innerHTML = "";
    current_products.forEach((prod, pIdx) => {
        let inp = prod.inputs||{}; let isMob = isMobileDeviceCat(prod.category); if(!isMob) inp.rfc = 0; if(isMob) inp.exw = "";
        let chipsHtml = ""; if(inp.mrp>0) chipsHtml += `<span class="chip">MRP: ₹${inp.mrp}</span>`; if(inp.inv>0) chipsHtml += `<span class="chip" style="background:#e0f2fe; color:#0284c7; border-color:#bae6fd;">Inv: ₹${inp.inv}</span>`; if(inp.surch>0) chipsHtml += `<span class="chip">Var: ₹${inp.surch}</span>`; if(inp.gtl>0) chipsHtml += `<span class="chip">GTL: ₹${inp.gtl}</span>`; if(inp.rfc>0) chipsHtml += `<span class="chip">RFC: ₹${inp.rfc}</span>`; if(!inp.inv) chipsHtml = `<span class="chip" style="background:#fef2f2; color:#ef4444; border-color:#fecaca; font-weight:bold;">⚠️ Invoice Value Required</span>`;

        let h = `
        <div class="scheme-card" style="border: 1.5px solid var(--bajaj-blue); box-shadow: 0 4px 12px rgba(0,0,0,0.08); margin-bottom:20px; padding:0; overflow:visible;">
            <div style="background:var(--bajaj-blue); color:white; padding:12px; border-radius:10px 10px 0 0; display:flex; justify-content:space-between; align-items:center;">
                <div style="font-weight:700; font-size:15px; letter-spacing:0.5px;">📱 ${prod.name}</div>
                <div style="display:flex; gap:6px;">
                    <button onclick="instantSingleQuote(${pIdx})" style="background:#fff; color:var(--bajaj-blue); border:none; padding:4px 10px; border-radius:6px; font-weight:700; font-size:11px;">📋 Quote</button>
                    <button onclick="removeModelFromMatrix(${pIdx})" style="background:var(--danger); color:white; border:none; padding:4px 8px; border-radius:6px; font-weight:700; font-size:11px;">✖</button>
                </div>
            </div>
            <div style="padding:10px; border-bottom:1px solid #e2e8f0; background:#f8fafc; display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; flex-wrap:wrap; gap:6px;">${chipsHtml}</div>
                <button onclick="openEditModelComponents(${pIdx})" style="background:var(--primary); color:white; border:none; padding:4px 10px; border-radius:6px; font-weight:700; font-size:11px;">⚙️ Edit Inv</button>
            </div>
            <div style="padding:10px; background:#fff;" id="cards_${pIdx}"></div>
        </div>`;
        box.innerHTML += h; recalcModel(pIdx);
    });
}

function recalcModel(pIdx) {
    let c = customerQueue[activeCustomerIndex]; let prod = current_products[pIdx];
    let limit = c?.limit || 0; let type = c?.type || 'NEW'; let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850);
    let inp = prod.inputs || {}; let totalFees = fee + (parseFloat(inp.margin) || 0) + (parseFloat(inp.dealer) || 0); 
    let currentLimit = limit > 0 ? limit : 9999999; let inputMrp = parseFloat(inp.mrp) || 0; let inputInv = parseFloat(inp.inv) || 0; 

    if (inputInv <= 0) { document.getElementById(`cards_${pIdx}`).innerHTML = `<div style="text-align:center; color:var(--danger); padding:15px; font-weight:700;">⚠️ Tap '⚙️ Edit Inv' to calculate.</div>`; return; }

    let effectivePrice = inputInv; let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;
    let activeCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;
    
    // RULE 1: Minimum Loan = 50% of Invoice
    let minAllowedLoanByInvoice = effectivePrice * 0.50;

    prod.calculatedData = prod.schemes.map((s, dIdx) => {
        let isFixed = s.fixedEmi > 0; let loan = 0, nbfcMaxL = 0, dpExact = 0, dpRounded = 0, emi = 0, inst = 0, currentTenure = s.tenure; 
        nbfcMaxL = (currentLimit * s.tenure) / (s.tenure - s.advEmi || 1); 
        let dbdRate = (s.dbd * 1.18 / 100); let roiRate = s.roi / 1200; let roiRateDP = roiRate * s.advEmi; 
        
        let dynamicPf = s.pf;
        if (prod.isNonTieup) { let slabPf = getNonTieupPfValue(prod.category, effectivePrice); if (slabPf !== null) { dynamicPf = slabPf; } }
        let insTot = (parseFloat(inp.gtl) || 0) + (parseFloat(inp.rfc) || 0) + (parseFloat(inp.exw) || 0);

        if (isFixed) {
            let maxRemainingEmis = Math.floor(currentLimit / s.fixedEmi); let maxTotalTenure = maxRemainingEmis + s.advEmi; 
            nbfcMaxL = maxTotalTenure * s.fixedEmi; 
            currentTenure = Math.floor(effectivePrice / s.fixedEmi); 
            if (currentTenure > maxTotalTenure) currentTenure = maxTotalTenure; 
            if (currentTenure < 1) currentTenure = 1; 
            loan = currentTenure * s.fixedEmi; 
            if (loan > loanCapPrice) loan = loanCapPrice;

            // RULE 2: Target DP Calculation (Fixed EMI)
            if (parseFloat(inp.target) > 0) { 
                let numerator = parseFloat(inp.target) - effectivePrice - (s.fixedEmi * s.advEmi) - dynamicPf - totalFees; 
                let denominator = dbdRate + roiRateDP - 1; let solvedLoan = numerator / denominator; 
                let solvedTenure = Math.floor(solvedLoan / s.fixedEmi); 
                if (solvedTenure > maxTotalTenure) solvedTenure = maxTotalTenure; 
                loan = Math.max(0, solvedTenure * s.fixedEmi); 
                if (loan > loanCapPrice) loan = loanCapPrice; 
                currentTenure = Math.floor(loan / s.fixedEmi) || 1; 
            } 
        } else {
            let absoluteMax = Math.min(loanCapPrice, nbfcMaxL); 
            if (prod.isNonTieup) { if (s.maxLoan < 9999999) absoluteMax = Math.min(absoluteMax, s.maxLoan); } 
            loan = absoluteMax;

            // RULE 3: Target DP Calculation (Regular EMI)
            if (parseFloat(inp.target) > 0) { 
                let advRate = s.advEmi / s.tenure; let numerator = parseFloat(inp.target) - effectivePrice - dynamicPf - totalFees; 
                let denominator = advRate + dbdRate + roiRateDP - 1; let solvedLoan = numerator / denominator; 
                loan = Math.min(loan, Math.max(0, Math.floor(solvedLoan))); 
            } 
        }

        // RULE 4: Manual Override checks
        let isManuallyOverridden = (inp.manualLoans && inp.manualLoans[dIdx] !== undefined);
        if (isManuallyOverridden) { loan = inp.manualLoans[dIdx]; if (isFixed) currentTenure = Math.floor(loan / s.fixedEmi) || 1; }
        if (!isFixed && loan > effectivePrice) loan = effectivePrice;

        let isCapBreach = false;

        if (isFixed) {
            inst = currentTenure - s.advEmi; if (inst < 1) inst = 1; 
            let roiInEmi = loan * roiRate; emi = s.fixedEmi + (insTot / inst) + roiInEmi;
            if (activeCap > 0 && Math.round(emi) > activeCap) isCapBreach = true;
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + (s.fixedEmi * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        } else {
            inst = s.tenure - s.advEmi; if (inst < 1) inst = 1; 
            let baseEmi = loan / s.tenure;
            // RULE 5: Minimum EMI 900
            if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 

            let roiInEmi = loan * roiRate; emi = baseEmi + (insTot / inst) + roiInEmi;

            // RULE 6: EMI Capping Reverse Math
            if (activeCap > 0 && emi > activeCap) { 
                let maxLoanForCap = Math.floor((activeCap - (insTot / inst)) / ((1 / s.tenure) + roiRate));
                if (maxLoanForCap < 0) maxLoanForCap = 0; if (maxLoanForCap > effectivePrice) maxLoanForCap = effectivePrice;
                loan = maxLoanForCap;
                baseEmi = loan / s.tenure; if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 
                roiInEmi = loan * roiRate; emi = baseEmi + (insTot / inst) + roiInEmi; 
                if (Math.round(emi) > activeCap || loan <= 0) isCapBreach = true;
            } 
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + ((loan / s.tenure) * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        }

        // RULE 7: DP Rounding
        if (dpExact > 0) dpRounded = Math.ceil(dpExact / 10) * 10; else dpRounded = dpExact; 
        
        let extraVal = ((emi * inst) + dpRounded) - effectivePrice; 
        let dbdAmt = loan * dbdRate; let roiAmt = (loan * roiRateDP) + (loan * roiRate * inst); 
        let marginMoney = parseFloat(inp.margin) || 0; let roundupAdj = (dpRounded > dpExact) ? (dpRounded - dpExact) : 0; 
        let netDisb = effectivePrice - dpRounded - marginMoney - roundupAdj;
        let curLTV = currentTenure > 0 ? ((currentTenure - s.advEmi) / currentTenure) * 100 : 0; 
        
        // Final Breaches
        let isInv50Breach = loan < minAllowedLoanByInvoice;
        let isRejected = isInv50Breach || isCapBreach || (curLTV > (c.ltv || 100)) || (prod.isNonTieup && (loan < s.minLoan || loan > s.maxLoan));

        return { ...s, dIdx, pf: dynamicPf, currentTenure, loan, dp: dpRounded, emi, inst, daily: emi / 30, curLTV, extra: extraVal, dbdAmt, roiAmt, netDisb, isRejected };
    });

    renderCards(pIdx);
}

function renderCards(pIdx) {
    let conf = sortConfigs[pIdx] || {key: 'dp', dir: 1}; let prod = current_products[pIdx];
    let vis = prod.calculatedData.sort((a,b) => a.isRejected - b.isRejected || (a.dp - b.dp) || (a.emi - b.emi));
    
    document.getElementById(`cards_${pIdx}`).innerHTML = vis.map(d => {
        let dbdStr = `${+parseFloat(d.dbd).toFixed(3)}% (₹${Math.round(d.dbdAmt||0)})`;
        let roiStr = `${+parseFloat(d.roi).toFixed(2)}% (₹${Math.round(d.roiAmt||0)})`;

        return `
        <div class="scheme-card ${d.isRejected?'rejected':''}" style="${d.inactive?'opacity:0.5; background:#f1f5f9;':''}">
            <div class="sc-header">
                <span class="sc-badge">${d.currentTenure}/${d.advEmi} 
                    ${d.isRejected?'<span style="color:var(--danger); font-size:10px;">🚫 Limit/Cap Exceeded</span>':''} 
                    ${d.inactive?'<span style="color:var(--warning); font-size:10px;">⏸ Disabled</span>':''}
                </span>
                <button onclick="openRowActionModal(${pIdx}, ${d.dIdx}, ${d.inactive})" style="background:var(--bg-color); color:var(--text-muted); border:1px solid var(--border); border-radius:6px; padding:4px 10px; font-size:11px; font-weight:700;">⚙️ Act</button>
            </div>
            
            <div class="sc-main-data">
                <div class="sc-data-block">
                    <span class="sc-label">Net DP</span>
                    <span class="sc-val dp">₹${Math.round(d.dp).toLocaleString()}</span>
                </div>
                <div class="sc-data-block" style="text-align:right;">
                    <span class="sc-label">Monthly EMI (${d.inst}M)</span>
                    <span class="sc-val emi">₹${Math.round(d.emi).toLocaleString()}</span>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; font-size:10px; color:var(--text-muted); font-weight:600; background:#f8fafc; padding:8px; border-radius:6px; margin-bottom:8px;">
                <div>DBD: <span style="color:var(--text-main);">${dbdStr}</span></div>
                <div>ROI: <span style="color:var(--text-main);">${roiStr}</span></div>
                <div>Extra: <span style="color:var(--danger);">₹${Math.round(d.extra).toLocaleString()}</span></div>
                <div>Net Disb: <span style="color:var(--success);">₹${Math.round(d.netDisb).toLocaleString()}</span></div>
            </div>

            <div class="sc-footer" style="border-top:1px dashed #e2e8f0; padding-top:8px; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span class="sc-label">Loan:</span>
                    <input type="number" class="sc-loan-input" value="${Math.floor(d.loan)}" onblur="updateManualLoan(${pIdx}, ${d.dIdx}, this.value)">
                </div>
                <div style="display:flex; gap:10px;">
                    <span class="sc-label">LTV: <span style="color:var(--text-main); font-size:12px;">${Math.round(d.curLTV)}%</span></span>
                    <span class="sc-label">PF: <span style="color:var(--text-main); font-size:12px;">₹${d.pf}</span></span>
                </div>
            </div>
        </div>`;
    }).join('');
}

function updateManualLoan(pIdx, dIdx, val) {
    let prod = current_products[pIdx]; if(!prod.inputs.manualLoans) prod.inputs.manualLoans = {};
    let loanVal = parseFloat(val) || 0; let effP = parseFloat(prod.inputs.inv) || 0;
    if(loanVal < effP * 0.50) { loanVal = effP * 0.50; showToast("Loan cannot be < 50% Invoice!", "error"); }
    if(loanVal > effP) { loanVal = effP; showToast("Loan cannot exceed Invoice Value!", "warning"); }
    prod.inputs.manualLoans[dIdx] = loanVal; recalcModel(pIdx); saveQueueToLocal();
}

/* === Action Modal & Image Share === */
function openRowActionModal(pIdx, dIdx, isInactive) {
    let c = document.getElementById('rowActionButtons'); if(!c) return;
    c.innerHTML = `
        <button onclick="copySchemeText(${pIdx}, ${dIdx}); closeRowActionModal();" class="btn-primary" style="width:100%; margin-bottom:8px;">📋 Copy Text</button>
        <button onclick="toggleInactive(${pIdx}, ${dIdx}); closeRowActionModal();" class="btn-outline" style="width:100%; margin-bottom:8px; border-color:${isInactive?'var(--success)':'var(--danger)'}; color:${isInactive?'var(--success)':'var(--danger)'};">${isInactive ? '✅ Enable Scheme' : '⏸ Disable Scheme'}</button>
    `;
    let m = document.getElementById('rowActionModal'); if(m) m.style.display = 'flex';
}
function closeRowActionModal() { let m = document.getElementById('rowActionModal'); if(m) m.style.display = 'none'; }
async function toggleInactive(pIdx, dIdx) { current_products[pIdx].schemes[dIdx].inactive = !current_products[pIdx].schemes[dIdx].inactive; recalcModel(pIdx); await saveQueueToLocal(); }

function copySchemeText(pIdx, dIdx) {
    let prod = current_products[pIdx], d = prod.calculatedData.find(x=>x.dIdx===dIdx); let c = customerQueue[activeCustomerIndex];
    let txt = `Customer- ${c.name}\nLimit- ${c.limit} | LTV- ${c.ltv}\n\n📱 *${prod.name}*\nInv: ₹${prod.inputs.inv}\n\n✅ Scheme: ${d.currentTenure}/${d.advEmi}\n💰 DP: ₹${Math.round(d.dp).toLocaleString()}\n🗓️ EMI: ₹${Math.round(d.emi).toLocaleString()} x ${d.inst}`;
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(txt).then(()=>showToast("Copied!")).catch(()=>showToast("Copy failed", "error")); } else { showToast("Copy Not Supported", "error"); }
}

function instantSingleQuote(pIdx) { window.tempImageGenIndices = [pIdx]; document.getElementById('custInfoPromptModal').style.display='flex'; }
async function proceedGenerateImageAndWhatsAppShare() { document.getElementById('custInfoPromptModal').style.display='none'; await renderImage(true); }
async function proceedGenerateImage() { document.getElementById('custInfoPromptModal').style.display='none'; await renderImage(false); }

async function renderImage(shouldShare) {
    showToast("Generating Quote...", "success");
    let wrap = document.createElement('div'); wrap.style.cssText = "width:600px; padding:30px; background:#fff; position:fixed; top:-9999px; font-family:'Poppins', sans-serif; color:#1e293b;";
    
    let c = customerQueue[activeCustomerIndex]; let prods = window.tempImageGenIndices.map(i=>current_products[i]);
    let topInv = prods[0]?.inputs?.inv||0;
    
    let html = `
        <div style="border:3px solid #0369a1; padding:20px; border-radius:16px; margin-bottom:20px; background:#f8fafc;">
            <h2 style="color:#0369a1; text-align:center; font-size:26px; border-bottom:2px dashed #cbd5e1; padding-bottom:10px; margin-bottom:15px;">BAJAJ FINSERV OFFER</h2>
            <div style="display:flex; justify-content:space-between; font-size:16px; font-weight:700;">
                <span>Type: ${c.type}</span>
                <span style="color:#10b981;">Limit: ₹${Number(c.limit).toLocaleString()}</span>
            </div>
            <div style="font-size:18px; font-weight:800; text-align:center; margin-top:15px; color:#0f172a;">Total Invoice: ₹${Number(topInv).toLocaleString()}</div>
        </div>`;

    let hasV=false;
    prods.forEach(prod => {
        let valid = prod.calculatedData.filter(d=>!d.isRejected && !d.inactive).sort((a,b)=>a.dp-b.dp);
        if(!valid.length) return; hasV=true;
        html += `<h3 style="color:#0369a1; font-size:22px; margin-bottom:8px;">📱 ${prod.name}</h3>
        <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-size:16px; font-weight:700; border:2px solid #0284c7;">
            <tr style="background:#0369a1; color:#fff;"><th style="padding:10px; border:1px solid #0284c7;">Scheme</th><th style="padding:10px; border:1px solid #0284c7;">Net DP</th><th style="padding:10px; border:1px solid #0284c7;">EMI</th></tr>`;
        valid.forEach(d => {
            html += `<tr><td style="padding:10px; border:1px solid #cbd5e1; text-align:center; color:#1e293b;">${d.currentTenure}/${d.advEmi}</td><td style="padding:10px; border:1px solid #cbd5e1; text-align:center; color:#10b981;">₹${Math.round(d.dp).toLocaleString()}</td><td style="padding:10px; border:1px solid #cbd5e1; text-align:center; color:#2563eb;">₹${Math.round(d.emi).toLocaleString()} x ${d.inst}</td></tr>`;
        }); html += `</table>`;
    });
    
    if(!hasV) return showToast("No Eligible Schemes to Generate Quote!", "error");

    wrap.innerHTML = html; document.body.appendChild(wrap);
    let canvas = await html2canvas(wrap, {scale:2, useCORS:true, backgroundColor:"#ffffff"}); document.body.removeChild(wrap);
    let dataUrl = canvas.toDataURL("image/png");
    
    if (shouldShare && navigator.canShare) {
        try {
            let blob = await (await fetch(dataUrl)).blob(); let file = new File([blob], "Bajaj_Quote.png", {type: "image/png"});
            await navigator.share({ files: [file], title: 'Bajaj Finserv Quote', text: `Quotation for ${c.name}` });
        } catch(e) { showToast("Share API Failed. Long press image to save.", "warning"); showImageInModal(dataUrl); }
    } else { showImageInModal(dataUrl); }
}
function showImageInModal(dataUrl) { document.getElementById('generatedImage').src = dataUrl; document.getElementById('imageViewerModal').style.display = 'flex'; }

/* === GitHub API Config === */
function openGithubConfig() { 
    let r = document.getElementById('ghRepoName'); if(r) r.value = localStorage.getItem('gh_repo')||"luckyjathar/testcalculator";
    let p = document.getElementById('ghPatToken'); if(p) p.value = localStorage.getItem('gh_pat')||"";
    document.getElementById('githubConfigModal').style.display = 'flex'; 
}
function closeGithubConfig() { document.getElementById('githubConfigModal').style.display = 'none'; }
function saveGithubConfig() { 
    localStorage.setItem('gh_repo', document.getElementById('ghRepoName').value.trim()); 
    localStorage.setItem('gh_pat', document.getElementById('ghPatToken').value.trim()); 
    showToast("GitHub Setup Saved!"); closeGithubConfig(); 
}
