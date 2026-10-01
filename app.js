/* === TOAST NOTIFICATION FUNCTION === */
let toastTimeout;
function showToast(message, type = 'success') {
    const toast = document.getElementById("toastNotification");
    if (!toast) return;
    toast.className = "toast-notification show " + type;
    toast.innerText = message;
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function(){ toast.className = "toast-notification"; }, 3000);
}

/* === CUSTOM CONFIRM FUNCTION === */
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

/* === CUSTOM ALERT FUNCTION FOR COPY FALLBACK === */
function showCustomAlert(msg, text = null) {
    let alertEl = document.getElementById('alertMessage');
    if (!alertEl) return;
    alertEl.innerText = msg;
    let ta = document.getElementById('alertTextarea');
    if(text) { ta.value = text; ta.style.display = 'block'; } else { ta.style.display = 'none'; }
    document.getElementById('customAlertModal').style.display = 'flex';
}

/* === GOOGLE SHEETS CLOUD SYNC & SILENT AUTO-SYNC API === */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwWt4xbbEYWpSwtOSY1jqGJauljwPWojqfpxL4Bk2aRE8gJMpAzanAmNQ1OGNzKYHZfGg/exec";
let loggedInUserEmail = localStorage.getItem('persistent_user_email') || "";
let isSilentSyncing = false;

async function handleGoogleLogin(response) {
    try {
        const base64Url = response.credential.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
        const userData = JSON.parse(jsonPayload);
        loggedInUserEmail = userData.email; 
        localStorage.setItem('persistent_user_email', loggedInUserEmail);
        localStorage.setItem('persistent_user_name', userData.name);
        updateLoginUI(userData.name, true);
        await fetchCloudDataOnLogin(userData.name);
    } catch(e) { console.error("Google Login Parsing Error:", e); }
    toggleSidebar();
}

function updateLoginUI(userName, isOnline) {
    let statusBadge = document.getElementById('gitStatusBadge');
    let syncBtn = document.getElementById('syncBtn');
    if(syncBtn) syncBtn.style.display = 'flex';
    if(statusBadge) {
        if(isOnline) {
            statusBadge.innerHTML = '🟢 ' + userName.toUpperCase() + ' (CLOUD SYNC ON)';
            statusBadge.style.background = 'rgba(39, 174, 96, 0.15)';
            statusBadge.style.color = 'var(--success)';
        } else {
            statusBadge.innerHTML = '🔄 ' + userName + ' - SYNCING...';
            statusBadge.style.background = 'rgba(243, 156, 18, 0.15)';
            statusBadge.style.color = '#f39c12';
        }
    }
}

async function fetchCloudDataOnLogin(userName) {
    try {
        let res = await fetch(APPS_SCRIPT_URL + "?email=" + encodeURIComponent(loggedInUserEmail));
        let cloudData = await res.json();

        if(cloudData && cloudData.length > 0) {
            let combined = [...cloudData, ...customerQueue];
            let uniqueQueue = [];
            let seen = new Set();

            combined.forEach(c => {
                let key = c.timestamp + "_" + c.name; 
                if(!seen.has(key)) {
                    seen.add(key);
                    uniqueQueue.push(c);
                }
            });

            customerQueue = uniqueQueue;
            await saveQueueToLocal(true); 

            activeCustomerIndex = -1;
            renderCustomerQueue();
            updateUniversalActionButtons();
            showToast("Data yashasviritya sync jhala!", "success");
        } else {
            await triggerSilentCloudSync();
            showToast("Local data cloud var sync jhala!", "success");
        }
        updateLoginUI(userName, true);
    } catch(e) {
        console.error("Cloud Fetch Error", e);
        showToast("Cloud sync kartanna error aala. Offline mode shuru rahil.", "warning");
    }
}

async function forceCloudSync() {
    if(!loggedInUserEmail) { showToast("Krupaya aadhi Google Sign In kara!", "error"); return; }
    let btn = document.getElementById('syncBtn'); let originalText = btn.innerHTML; btn.innerHTML = '<span>⏳</span> SYNCING...';
    await triggerSilentCloudSync();
    setTimeout(() => { btn.innerHTML = '<span>✅</span> SYNC COMPLETE'; setTimeout(() => { btn.innerHTML = originalText; }, 2000); }, 1200);
}

async function triggerSilentCloudSync() {
    if(!loggedInUserEmail || isSilentSyncing) return;
    try {
        isSilentSyncing = true;
        let compactQueue = customerQueue.map(c => { let cp = (c.products || []).map(p => { let { calculatedData, allSchemes, ...keepProduct } = p; return keepProduct; }); return { ...c, products: cp }; });
        await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ email: loggedInUserEmail, queue: compactQueue }) });
    } catch(err) { console.log("Silent Cloud Sync Error:", err); } finally { isSilentSyncing = false; }
}

if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
}

function toggleSidebar() { 
    let sb = document.getElementById('appSidebar'); 
    let ol = document.getElementById('sidebarOverlay'); 
    if(sb) sb.classList.toggle('open'); 
    if(ol) ol.classList.toggle('show'); 
}
function openCustomerMessageModal() { document.getElementById('customerMessageGenModal').style.display = 'flex'; calculateDates(); updateDraftBadgeCount(); }
function closeCustomerMessageModal() { document.getElementById('customerMessageGenModal').style.display = 'none'; }

let pdfInputEl = document.getElementById('pdfInput');
if (pdfInputEl) {
    pdfInputEl.addEventListener('change', async function(e) {
        const file = e.target.files[0]; if (!file) return;
        let statusEl = document.getElementById('pdfStatus'); statusEl.style.color = 'var(--primary)'; statusEl.innerText = 'PDF data vachat ahe, thamba...';
        const fileReader = new FileReader();
        fileReader.onload = async function() {
            const typedarray = new Uint8Array(this.result);
            try {
                const pdf = await pdfjsLib.getDocument(typedarray).promise; let fullText = "";
                for (let i = 1; i <= pdf.numPages; i++) { const page = await pdf.getPage(i); const textContent = await page.getTextContent(); fullText += " " + textContent.items.map(item => item.str).join(" "); }
                parsePDFText(fullText); statusEl.style.color = 'var(--success)'; statusEl.innerText = 'PDF data yashasviritya milavla!';
            } catch (error) { statusEl.style.color = 'var(--danger)'; statusEl.innerText = 'PDF vachnyat error aala. Manually check kara.'; }
        };
        fileReader.readAsArrayBuffer(file);
    });
}

function parsePDFText(text) {
    const dealerMatch = text.match(/Dear\s+(.*?)\s*Customer ID:/i);
    if (dealerMatch) { let rawDealer = dealerMatch[1].replace(/Bajaj Finance Limited/gi, '').replace(/DELIVERY ORDER/gi, '').trim(); let parts = rawDealer.split('#').map(p => p.trim()).filter(p => p !== ''); document.getElementById('msgShopName').value = parts.slice(0, 2).join(' - ') || rawDealer; }
    const assetMatch = text.match(/Asset Category\s*(?:\|\s*)*([A-Z0-9\(\)\-\s]+?)\s*(?:\||\s*OEM)/i); if (assetMatch) document.getElementById('msgAssetCategory').value = assetMatch[1].trim();
    const nameMatch = text.match(/application of Mr\/Miss\/Mrs\.\s*([A-Za-z\s]+?)\s*has been approved/i); if (nameMatch) document.getElementById('msgCustName').value = nameMatch[1].trim();
    const mobileMatch = text.match(/Mobile Number:\s*(\d{10})/i); if (mobileMatch) document.getElementById('msgCustMobile').value = mobileMatch[1];
    const emiMatch = text.match(/Total EMI\s*["',\s]*([\d,]+)/i); if (emiMatch) document.getElementById('msgCustEMI').value = emiMatch[1].replace(/,/g, '');
    const tenureMatch = text.match(/Scheme Code.*?\((\d+)\s*\/\s*(\d+)\)/i) || text.match(/\((\d+)\s*\/\s*(\d+)\)/);
    if (tenureMatch) { let grossTenure = parseInt(tenureMatch[1], 10) || 0; let advanceEmi = parseInt(tenureMatch[2], 10) || 0; let netTenure = grossTenure - advanceEmi; document.getElementById('msgCustTenure').value = netTenure > 0 ? netTenure : grossTenure; }
    const dateMatch = text.match(/Date:\s*(\d{2})\/(\d{2})\/(\d{4})/i); if (dateMatch) { document.getElementById('msgLoanDate').value = `${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}`; }
    calculateDates();
}

function calculateDates() {
    const loanDateVal = document.getElementById('msgLoanDate').value; const tenure = parseInt(document.getElementById('msgCustTenure').value) || 0; const lang = document.getElementById('msgLang').value;
    if (!loanDateVal) { document.getElementById('msgStartDate').value = ''; document.getElementById('msgEndDate').value = ''; generateMessage(); return; }
    const dateParts = loanDateVal.split('-'); let year = parseInt(dateParts[0]); let month = parseInt(dateParts[1]) - 1; let day = parseInt(dateParts[2]);
    let startMonth = month + 1; let startYear = year; if (day >= 24) { startMonth = month + 2; }
    let startDateObj = new Date(startYear, startMonth, 2); let endDateObj = new Date(startYear, startMonth + tenure - 1, 2);
    document.getElementById('msgStartDate').value = formatDate(startDateObj, lang); document.getElementById('msgEndDate').value = formatDate(endDateObj, lang); generateMessage();
}

function formatDate(dateObj, lang) {
    const mrMonths = ["जानेवारी", "फेब्रुवारी", "मार्च", "एप्रिल", "मे", "जून", "जुलै", "ऑगस्ट", "सप्टेंबर", "ऑक्टोबर", "नोव्हेंबर", "डिसेंबर"];
    const hiMonths = ["जनवरी", "फरवरी", "मार्च", "अप्रैल", "मई", "जून", "जुलाई", "अगस्त", "सितंबर", "अक्टूबर", "नवंबर", "दिसंबर"];
    const enMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const day = String(dateObj.getDate()).padStart(2, '0'); const year = dateObj.getFullYear();
    if (lang === 'mr') return `०२ ${mrMonths[dateObj.getMonth()]} ${year}`; if (lang === 'hi') return `${day} ${hiMonths[dateObj.getMonth()]} ${year}`; return `${day} ${enMonths[dateObj.getMonth()]} ${year}`;
}

function generateMessage() {
    const shop = document.getElementById('msgShopName').value || ''; const asset = document.getElementById('msgAssetCategory').value || '';
    const name = document.getElementById('msgCustName').value || ''; const emi = document.getElementById('msgCustEMI').value || '0';
    const tenure = document.getElementById('msgCustTenure').value || '0'; const startDate = document.getElementById('msgStartDate').value || '-';
    const endDate = document.getElementById('msgEndDate').value || '-'; const lang = document.getElementById('msgLang').value;
    let msg = "";
    if (lang === 'mr') {
        msg = `सस्नेह नमस्कार, ${name}! 🙏\n\nबजाज फायनान्समध्ये आपले स्वागत आहे. आपण खरेदी केलेल्या वस्तूच्या कर्जाची माहिती खालीलप्रमाणे आहे:\n\n🏬 दुकानाचे नाव: ${shop}\n📱 वस्तूचा प्रकार: ${asset}\n📌 मासिक हप्ता: ₹${emi}/-\n📌 एकूण हप्ते: ${tenure} महिने\n📅 पहिला हप्ता सुरू: ${startDate}\n📅 शेवटचा हप्ता संपण्याची तारीख: ${endDate}\n\nधन्यवाद! ✨`;
    } else if (lang === 'hi') {
        msg = `नमस्ते, ${name}! 🙏\n\nबजाज फाइनेंस में स्वागत है। आपके उत्पाद के लोन का विवरण:\n\n🏬 दुकान: ${shop}\n📱 उत्पाद: ${asset}\n📌 मासिक किस्त: ₹${emi}/-\n📌 कुल किस्तें: ${tenure} महीने\n📅 पहली किस्त: ${startDate}\n📅 अंतिम किस्त: ${endDate}\n\nधन्यवाद! ✨`;
    } else {
        msg = `Dear ${name}, 🙏\n\nWelcome to Bajaj Finance! Details:\n\n🏬 Shop: ${shop}\n📱 Asset: ${asset}\n📌 EMI: ₹${emi}/-\n📌 Tenure: ${tenure} Months\n📅 Start: ${startDate}\n📅 End: ${endDate}\n\nThank you! ✨`;
    }
    document.getElementById('finalMessage').value = msg;
}

function copyMsgText() { document.getElementById('finalMessage').select(); document.execCommand('copy'); showToast('Message copy jhala!', 'success'); }
function sendMsgWhatsApp() { const mobile = document.getElementById('msgCustMobile').value; const text = encodeURIComponent(document.getElementById('finalMessage').value); let url = `https://api.whatsapp.com/send?text=${text}`; if (mobile && mobile.length === 10) { url = `https://api.whatsapp.com/send?phone=91${mobile}&text=${text}`; } window.open(url, '_blank'); }

function updateDraftBadgeCount() { let drafts = JSON.parse(localStorage.getItem('persistent_emi_drafts') || '[]'); let badge = document.getElementById('draftBadge'); if (badge) { badge.innerText = drafts.length; if (drafts.length > 0) { badge.style.animation = "pulseGlow 1.5s infinite"; } else { badge.style.animation = "none"; } } }
function openDraftsModal() { renderEmiDrafts(); document.getElementById('draftsModal').style.display = 'flex'; }
function closeDraftsModal() { document.getElementById('draftsModal').style.display = 'none'; }

function saveEmiDraft() {
    const name = document.getElementById('msgCustName').value.trim(); const mobile = document.getElementById('msgCustMobile').value.trim(); const shop = document.getElementById('msgShopName').value.trim();
    const finalMsg = document.getElementById('finalMessage').value; const startDate = document.getElementById('msgStartDate').value; const endDate = document.getElementById('msgEndDate').value;
    if (!name) { showToast("Krupaya customer che naav bhara!", "error"); return; }
    const draftObj = { id: Date.now(), shop: shop, asset: document.getElementById('msgAssetCategory').value, name: name, mobile: mobile, emi: document.getElementById('msgCustEMI').value, tenure: document.getElementById('msgCustTenure').value, loanDate: document.getElementById('msgLoanDate').value, startDate: startDate, endDate: endDate, lang: document.getElementById('msgLang').value, finalMessage: finalMsg, timestamp: new Date().toLocaleString() };
    let drafts = JSON.parse(localStorage.getItem('persistent_emi_drafts') || '[]'); drafts.unshift(draftObj); localStorage.setItem('persistent_emi_drafts', JSON.stringify(drafts));
    updateDraftBadgeCount(); showToast("Draft save jhala!", "success");
}

function renderEmiDrafts() {
    updateDraftBadgeCount(); const draftsContainer = document.getElementById('draftsContainer'); if(!draftsContainer) return; 
    let drafts = JSON.parse(localStorage.getItem('persistent_emi_drafts') || '[]');
    if (drafts.length === 0) { draftsContainer.innerHTML = '<div style="text-align:center; color:#888; font-style:italic; padding: 20px;">Ekhi save kelela draft nahi.</div>'; return; }
    draftsContainer.innerHTML = drafts.map((d, index) => `
        <div style="background:#f8f9fa; border:1px solid #ccc; border-radius:6px; padding:10px; display:flex; flex-direction:column; gap:8px;">
            <div onclick="toggleDraftDetails(${index})" style="display:flex; justify-content:space-between; align-items:center; cursor:pointer;">
                <strong style="color:var(--bajaj-blue); font-size:14px;">👤 ${d.name}</strong>
                <span style="font-size:11px; color:#666;">${d.timestamp}</span>
            </div>
            <div id="draftDetails_${index}" style="display:none; font-size:12px; color:#444; background:#fff; padding:10px; border-radius:4px; border:1px dashed #aaa; line-height:1.6;">
                Dukanache naav: <b style="color:var(--indigo);">${d.shop || '-'}</b><br>
                Monthly EMI: <b style="color:var(--primary);">₹${d.emi || '0'}</b><br>
                Total Tenures: <b style="color:var(--primary);">${d.tenure || '0'}</b>
                <div style="display:flex; gap:6px; margin-top:10px; border-top:1px solid #eee; padding-top:10px;">
                    <button onclick="loadEmiDraft(${index})" style="flex:1; background:var(--indigo); color:white; padding:8px; border-radius:4px; border:none; cursor:pointer;">LOAD</button>
                    <button onclick="sendDraftNow(${index})" style="flex:1.2; background:#25D366; color:white; padding:8px; border-radius:4px; border:none; cursor:pointer;">SEND NOW</button>
                    <button onclick="markDraftAsSent(${index})" style="flex:0.8; background:var(--danger); color:white; padding:8px; border-radius:4px; border:none; cursor:pointer;">DELETE</button>
                </div>
            </div>
        </div>
    `).join('');
}

function toggleDraftDetails(index) { const detailsDiv = document.getElementById(`draftDetails_${index}`); if (detailsDiv.style.display === 'none') { detailsDiv.style.display = 'block'; } else { detailsDiv.style.display = 'none'; } }
function sendDraftNow(index) { let drafts = JSON.parse(localStorage.getItem('persistent_emi_drafts') || '[]'); let d = drafts[index]; if (!d) return; let mobile = d.mobile || ''; let text = encodeURIComponent(d.finalMessage || ''); let url = `https://api.whatsapp.com/send?text=${text}`; if (mobile && mobile.length === 10) { url = `https://api.whatsapp.com/send?phone=91${mobile}&text=${text}`; } window.open(url, '_blank'); }
function loadEmiDraft(index) { let drafts = JSON.parse(localStorage.getItem('persistent_emi_drafts') || '[]'); let d = drafts[index]; if (!d) return; document.getElementById('msgShopName').value = d.shop || ''; document.getElementById('msgAssetCategory').value = d.asset || ''; document.getElementById('msgCustName').value = d.name || ''; document.getElementById('msgCustEMI').value = d.emi || ''; document.getElementById('msgCustTenure').value = d.tenure || ''; document.getElementById('msgLoanDate').value = d.loanDate || ''; document.getElementById('msgLang').value = d.lang || 'en'; calculateDates(); closeDraftsModal(); }
function markDraftAsSent(index) { showCustomConfirm("Ha draft कायमचा delete hoil. Pudhe jayche?", () => { let drafts = JSON.parse(localStorage.getItem('persistent_emi_drafts') || '[]'); drafts.splice(index, 1); localStorage.setItem('persistent_emi_drafts', JSON.stringify(drafts)); renderEmiDrafts(); showToast("Draft delete jhala!", "success"); }); }

window.isFestiveMode = false; let currentModalCategory = ""; let tempFgDealerId = ""; let tempFgDealerName = ""; let tempFgModel = ""; let tempFgBitly = ""; 

function cleanPureShopName(raw) { if(!raw) return ""; return raw.split('#')[0].split('|')[0].split('(')[0].trim().toUpperCase(); }
function parseDealerObj(d) {
    if (!d) return { code: '', name: '', city: '', bitly: '' };
    let keys = Object.keys(d); let rawName = '', code = '', city = '', bitly = '';
    for (let k of keys) { 
        let val = String(d[k]).trim(); 
        if (val.startsWith('http://') || val.startsWith('https://') || val.includes('bit.ly') || val.includes('bfl.onelink.me') || val.includes('bajajfinserv.in')) { 
            bitly = val; 
            break; 
        } 
    }
    let nameKey = keys.find(k => ['DEALER NAME', 'SHOP NAME', 'NAME', 'SHOP', 'DEALER'].includes(k.toUpperCase().trim())); rawName = nameKey ? String(d[nameKey]).trim() : '';
    let codeKey = keys.find(k => ['DEALERID', 'DEALER CODE', 'CODE', 'ID', 'BPES RCD', 'DEALER_ID'].includes(k.toUpperCase().trim())); code = codeKey ? String(d[codeKey]).trim() : '';
    let cityKey = keys.find(k => ['CITY', 'LOCATION', 'TOWN', 'DISTRICT'].includes(k.toUpperCase().trim())); city = cityKey ? String(d[cityKey]).trim() : '';
    if (rawName.includes('#')) { let parts = rawName.split('#'); let shopPart = parts[0].trim(); if (!city && parts.length > 1) city = parts[1].split('|')[0].replace(/\(.*?\)/g, '').trim(); rawName = shopPart; }
    if (bitly && !bitly.startsWith('http')) bitly = 'https://' + bitly; return { code: code || '-', name: cleanPureShopName(rawName) || 'SHOP', city: city || '', bitly: bitly };
}

function isMobileDeviceCat(cat) { if (!cat) return false; let c = String(cat).toUpperCase().replace(/\s+/g, '').trim(); return c === 'PHONE(WEB-MOBILE)' || c === 'PHONE,TABLET,SMARTWATCH' || c.includes('TABLET,SMART') || c.includes('PHONE,TABLET') || c === 'SMARTPHONES' || c === 'MOBILE'; }
function standardizeCategoryName(cat) { if (!cat) return "OTHER"; let c = String(cat).toUpperCase().trim(); let cNoSpace = c.replace(/\s+/g, ''); if (cNoSpace === 'PHONE(WEB-MOBILE)' || cNoSpace === 'PHONE,TABLET,SMARTWATCH' || cNoSpace.includes('TABLET,SMART') || cNoSpace.includes('PHONE,TABLET') || cNoSpace === 'SMARTPHONES' || cNoSpace === 'MOBILE') { return "PHONE(WEB-MOBILE)"; } if (cNoSpace === 'AIRCONDITIONERS' || cNoSpace === 'AC') { return "AC"; } if (cNoSpace === 'TELEVISIONS' || cNoSpace === 'TV' || cNoSpace === 'LED') { return "LED TV"; } if (cNoSpace === 'REFRIGERATORS' || cNoSpace === 'FRIDGE') { return "REFRIGERATOR"; } return c; }
function getRfcSlabValue(val) { let amount = parseFloat(val) || 0; if (amount < 8000) return 0; if (amount <= 10000) return 1109; if (amount <= 15000) return 1631; if (amount <= 20000) return 2147; if (amount <= 25000) return 2695; if (amount <= 30000) return 3215; if (amount <= 35000) return 3648; if (amount <= 40000) return 4219; if (amount <= 50000) return 5720; if (amount <= 60000) return 8686; if (amount <= 100000) return 11438; if (amount <= 200000) return 16677; return 0; }
function getNonTieupPfValue(category, amount) { let cat = String(category || "").toUpperCase().replace(/\s+/g, '').trim(); let val = parseFloat(amount) || 0; if (cat.includes('DESKTOP') || cat.includes('LAPTOP')) { return 699; } if (cat === 'PHONE(WEB-MOBILE)' || cat.includes('PHONE') || cat.includes('TABLET') || cat.includes('MOBILE')) { if (val <= 30000) return 499; if (val <= 50000) return 599; return 699; } return null; }

/* Dual Source Fallback URLs */
const PRIMARY_EXCEL_URL = "https://raw.githubusercontent.com/luckyjathar/testcalculator/main/master_data.xlsx";
const SECONDARY_EXCEL_URL = "https://raw.githubusercontent.com/luckyjathar/CALCULATOR/main/master_data.xlsx";
const LOCAL_EXCEL_URL = "./master_data.xlsx";

const DB_NAME = "PersistentPortalDB"; 
const DB_VERSION = 2; 
const STORE_NAME = "dataStore"; 
let dbInstance;

function initDB() { return new Promise((resolve, reject) => { let request = indexedDB.open(DB_NAME, DB_VERSION); request.onupgradeneeded = function(e) { let db = e.target.result; if (!db.objectStoreNames.contains(STORE_NAME)) { db.createObjectStore(STORE_NAME); } }; request.onsuccess = function(e) { dbInstance = e.target.result; resolve(dbInstance); }; request.onerror = function(e) { reject(e); }; }); }
function saveToDB(key, data) { return new Promise((resolve, reject) => { if (!dbInstance) return reject("DB not initialized"); try { let tx = dbInstance.transaction(STORE_NAME, 'readwrite'); let store = tx.objectStore(STORE_NAME); let req = store.put(JSON.stringify(data), key); req.onsuccess = () => resolve(); req.onerror = (e) => reject(e.target.error); } catch(e) { reject(e); } }); }
function getFromDB(key) { return new Promise((resolve, reject) => { if (!dbInstance) return resolve(null); try { let tx = dbInstance.transaction(STORE_NAME, 'readonly'); let store = tx.objectStore(STORE_NAME); let req = store.get(key); req.onsuccess = (e) => { let res = e.target.result; if (res) { if (typeof res === 'string') resolve(JSON.parse(res)); else resolve(res); } else { resolve(null); } }; req.onerror = (e) => reject(e.target.error); } catch(e) { reject(e); } }); }

let db_records = []; let dealer_records = []; let current_products = []; let sortConfigs = []; const SPECIAL_MODEL = "NON TIEUP"; let tempSheet1Data = []; let parsedSheet2Data = []; let customerQueue = []; let recycleBin = []; let activeCustomerIndex = -1; let selectedQueueIndex = -1; let tempPendingProduct = null; 
let currentViewedModel = "";

function highlightNumber(e, el) { if (e) e.stopPropagation(); let range = document.createRange(); range.selectNodeContents(el); let sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range); try { document.execCommand('copy'); } catch(err) {} }
function parseExcelDate(val) { if (!val) return null; if (typeof val === 'number') { return new Date(Math.round((val - 25569) * 86400 * 1000)); } if (typeof val === 'string') { let d = new Date(val); if (!isNaN(d.getTime())) return d; let parts = val.split(/[\/\-\.]/); if (parts.length === 3) { let y = parts[2].length === 2 ? '20' + parts[2] : parts[2]; return new Date(y, parts[1] - 1, parts[0]); } } return null; }

async function saveQueueToLocal(shouldCloudSync = true) { try { let compactQueue = customerQueue.map(c => { let cp = (c.products || []).map(p => { let { calculatedData, allSchemes, ...keepProduct } = p; return keepProduct; }); return { ...c, products: cp }; }); localStorage.setItem('persistent_queue_backup', JSON.stringify(compactQueue)); localStorage.setItem('persistent_active_idx_backup', activeCustomerIndex); await saveToDB('persistent_queue', compactQueue); await saveToDB('persistent_active_idx', activeCustomerIndex); if(shouldCloudSync && loggedInUserEmail) { triggerSilentCloudSync(); } } catch(e) { console.error("Local Save Interrupted", e); } }

// ⚡ CACHE DURATION: Divsatun fakt 2 vela (12 taas)
const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; 

async function fetchFromMasterStream(forceSync = false) {
    let statusBadge = document.getElementById('gitStatusBadge'); 
    let globalLoader = document.getElementById('dataLoadingIndicator');
    let searchInput1 = document.getElementById('modalMatrixSearch');
    let searchInput2 = document.getElementById('globalModelSearch');

    if(globalLoader) {
        globalLoader.style.display = 'block';
        globalLoader.style.background = 'var(--warning)';
        globalLoader.style.color = '#000';
        globalLoader.innerHTML = 'Data tapast ahe...';
    }

    try {
        let now = new Date().getTime();

        if (!forceSync) {
            let cachedTime = await getFromDB('master_data_time');
            let cachedDbRecords = await getFromDB('cached_db_records');
            let cachedDealerRecords = await getFromDB('cached_dealer_records');

            if (cachedTime && cachedDbRecords && cachedDbRecords.length > 0 && (now - cachedTime < CACHE_DURATION_MS)) {
                db_records = cachedDbRecords;
                dealer_records = cachedDealerRecords || [];

                if (activeCustomerIndex !== -1) { loadCurrentProducts(); renderMatrix(); }

                if(statusBadge) { 
                    statusBadge.innerHTML = '⚡ LOADED FROM CACHE (2X/DAY)'; 
                    statusBadge.style.color = 'var(--success)'; 
                    statusBadge.style.background = 'rgba(39, 174, 96, 0.15)'; 
                }

                if(globalLoader) globalLoader.style.display = 'none'; 
                if(searchInput1) { searchInput1.disabled = false; searchInput1.placeholder = "Type model, brand or category..."; }
                if(searchInput2) { searchInput2.disabled = false; searchInput2.placeholder = "Type Brand or Model Name..."; }
                return;
            }
        }

        if(globalLoader) globalLoader.innerHTML = 'Download shuru ahe...';
        if(statusBadge) { 
            statusBadge.innerHTML = '⬇️ LIVE DATA DOWNLOADING...'; 
            statusBadge.style.color = '#f39c12'; 
            statusBadge.style.background = 'rgba(243, 156, 18, 0.15)'; 
        }

        const urlsToTry = [
            PRIMARY_EXCEL_URL + '?t=' + now,
            SECONDARY_EXCEL_URL + '?t=' + now,
            LOCAL_EXCEL_URL + '?t=' + now
        ];

        let dataBuffer = null;
        for (let url of urlsToTry) {
            try {
                let res = await fetch(url);
                if (res.ok) {
                    dataBuffer = await res.arrayBuffer();
                    break;
                }
            } catch(e) { }
        }

        if (!dataBuffer) {
            throw new Error("Sarv network endpoints var excel load jhali nahi.");
        }

        let wb = XLSX.read(new Uint8Array(dataBuffer), { type: 'array' });

        tempSheet1Data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { raw: false, defval: "" }); 
        parsedSheet2Data = wb.SheetNames.length > 1 ? XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[1]], { raw: false, defval: "" }).map(r => mapData(r, SPECIAL_MODEL)).filter(x => x && x.model && x.model.trim() !== "") : [];

        if (wb.SheetNames.length > 2) { 
            dealer_records = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[2]], { raw: false, defval: "" }); 
        } else { 
            dealer_records = []; 
        }

        let filteredSheet1 = tempSheet1Data.map(r => mapData(r, "REG")).filter(m => m && m.model && m.model.trim() !== ""); 
        let rawCombined = [...filteredSheet1, ...parsedSheet2Data]; 
        let uniqueDB = []; let seenDB = new Set();

        rawCombined.forEach(r => { 
            let key = `${r.model}_${r.category}_${r.tenure}_${r.advEmi}_${r.fixedEmi}_${r.minLoan}_${r.maxLoan}`; 
            if (!seenDB.has(key)) { seenDB.add(key); uniqueDB.push(r); } 
        });

        db_records = uniqueDB;

        await saveToDB('cached_db_records', db_records);
        await saveToDB('cached_dealer_records', dealer_records);
        await saveToDB('master_data_time', now);

        if (activeCustomerIndex !== -1) { loadCurrentProducts(); renderMatrix(); }

        if(statusBadge) { 
            statusBadge.innerHTML = '✅ LIVE DATA SYNCED'; 
            statusBadge.style.color = 'var(--success)'; 
            statusBadge.style.background = 'rgba(39, 174, 96, 0.15)'; 
        }

        if(globalLoader) {
            globalLoader.style.background = 'var(--success)';
            globalLoader.style.color = '#fff';
            globalLoader.innerHTML = 'Data tayar ahe!';
            setTimeout(() => { globalLoader.style.display = 'none'; }, 2000); 
        }
        if(searchInput1) { searchInput1.disabled = false; searchInput1.placeholder = "Type model, brand or category..."; }
        if(searchInput2) { searchInput2.disabled = false; searchInput2.placeholder = "Type Brand or Model Name..."; }

    } catch(err) { 
        console.error("Master Fetch Error:", err); 
        let fallbackDb = await getFromDB('cached_db_records');
        let fallbackDealers = await getFromDB('cached_dealer_records');
        if (fallbackDb && fallbackDb.length > 0) {
            db_records = fallbackDb;
            dealer_records = fallbackDealers || [];
            if(statusBadge) {
                statusBadge.innerHTML = '⚡ OFFLINE MODE (CACHE ACTIVE)';
                statusBadge.style.color = 'var(--success)';
                statusBadge.style.background = 'rgba(39, 174, 96, 0.15)';
            }
            if(globalLoader) globalLoader.style.display = 'none';
            if(searchInput1) { searchInput1.disabled = false; searchInput1.placeholder = "Type model, brand or category..."; }
            if(searchInput2) { searchInput2.disabled = false; searchInput2.placeholder = "Type Brand or Model Name..."; }
        } else {
            db_records = []; dealer_records = [];
            if(statusBadge) { 
                statusBadge.innerHTML = '⚠️ NO MASTER DATA FOUND'; 
                statusBadge.style.color = 'var(--danger)'; 
                statusBadge.style.background = 'rgba(214, 48, 49, 0.15)'; 
            } 
            if(globalLoader) {
                globalLoader.style.background = 'var(--danger)';
                globalLoader.style.color = '#fff';
                globalLoader.innerHTML = 'Internet connection check kara';
            }
        }
    }
}

window.onload = async function() {
    if(loggedInUserEmail) { 
        let savedName = localStorage.getItem('persistent_user_name') || "User"; 
        updateLoginUI(savedName, true); 
    } 
    generateStackCards(); 

    let statusBadge = document.getElementById('gitStatusBadge');
    if(statusBadge) {
        statusBadge.style.cursor = 'pointer';
        statusBadge.title = "Click to refresh master data";
        statusBadge.onclick = async function() {
            showToast("Live data download shuru ahe...", "warning");
            await forceRefreshMasterData();
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

        await loadCustomStagingSchemes();
        await fetchFromMasterStream(); 
        autoCleanStagingSchemesAgainstMaster();

        setTimeout(() => checkForExcelUpdates(), 3000);
    } catch(e) { 
        console.error("Local Data Initialization Failure", e); 
    }
};

function openFlyerGenModal() { document.getElementById('fgSalesName').value = ''; document.getElementById('fgSalesMobile').value = ''; document.getElementById('fgDealerSearch').value = ''; document.getElementById('fgDealerList').innerHTML = ''; tempFgDealerId = ""; tempFgDealerName = ""; tempFgBitly = ""; clearFgModel(); document.getElementById('fgOfferType').value = 'NONE'; toggleFgOfferInput(); document.getElementById('fgSelectedDealerBox').style.display = 'none'; document.getElementById('flyerGeneratedLinkBox').style.display = 'none'; document.getElementById('flyerGenModal').style.display = 'flex'; }
function toggleFgOfferInput() { let type = document.getElementById('fgOfferType').value; let box = document.getElementById('fgOfferValBox'); let label = document.getElementById('fgOfferValLabel'); let inp = document.getElementById('fgOfferValue'); if(type === "NONE") { box.style.display = 'none'; inp.value = ''; } else if(type === "FREEBIE") { box.style.display = 'block'; label.innerText = "ENTER GIFT NAME"; inp.placeholder = "E.g. Earbuds"; } else { box.style.display = 'block'; label.innerText = "ENTER UPTO AMOUNT (₹)"; inp.placeholder = "E.g. 2500"; } }
function searchFgDealer() { let q = document.getElementById('fgDealerSearch').value.toLowerCase().trim(); let list = document.getElementById('fgDealerList'); if(!q) { list.innerHTML = ''; return; } let matches = dealer_records.map(d => parseDealerObj(d)).filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.city.toLowerCase().includes(q)).slice(0, 10); list.innerHTML = matches.map(p => { let displayStr = `${p.name}${p.city ? ' - ' + p.city : ''} (${p.code})`; return `<div onclick="selectFgDealer('${p.code}', '${p.name.replace(/'/g, "\\'")}', '${p.city.replace(/'/g, "\\'")}', '${encodeURIComponent(p.bitly||'')}')" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; background:#fff; font-size:12px; font-weight:bold; color:var(--bajaj-blue);">🏪 ${displayStr}</div>`; }).join(''); }
function selectFgDealer(code, name, city, bitlyEnc) { tempFgDealerId = code; tempFgDealerName = `${name}${city ? ' - ' + city : ''}`; tempFgBitly = decodeURIComponent(bitlyEnc); document.getElementById('fgDealerSearch').value = ''; document.getElementById('fgDealerList').innerHTML = ''; document.getElementById('fgSelectedDealerBox').innerHTML = `✅ ${tempFgDealerName} [Code: ${code}] <span onclick="clearFgDealer()" style="color:red; cursor:pointer; float:right;">✖</span>`; document.getElementById('fgSelectedDealerBox').style.display = 'block'; }
function clearFgDealer() { tempFgDealerId = ""; tempFgDealerName = ""; tempFgBitly = ""; document.getElementById('fgSelectedDealerBox').style.display = 'none'; }
function searchFgModel() { let q = document.getElementById('fgModelSearch').value.toUpperCase().trim(); let list = document.getElementById('fgModelList'); if(!q) { list.innerHTML = ''; return; } let matches = [...new Set(db_records.filter(r => r.model !== SPECIAL_MODEL).map(r => r.model))].filter(m => m.includes(q)).slice(0,8); list.innerHTML = matches.map(m => `<div onclick="selectFgModel('${m.replace(/'/g, "\\'")}')" style="padding:8px; border-bottom:1px solid #eee; cursor:pointer; background:#fff; font-size:12px;">📱 ${m}</div>`).join(''); }
function selectFgModel(name) { tempFgModel = name; document.getElementById('fgModelSearch').value = ''; document.getElementById('fgModelList').innerHTML = ''; document.getElementById('fgSelectedModelBox').innerHTML = `📱 Locked: ${name} <span onclick="clearFgModel()" style="color:red; cursor:pointer; float:right;">✖</span>`; document.getElementById('fgSelectedModelBox').style.display = 'block'; }
function clearFgModel() { tempFgModel = ""; document.getElementById('fgSelectedModelBox').style.display = 'none'; }

function generateFlyer() {
    let sName = document.getElementById('fgSalesName').value.trim(); let sMob = document.getElementById('fgSalesMobile').value.trim(); let oType = document.getElementById('fgOfferType').value; let oVal = document.getElementById('fgOfferValue').value.trim();
    if(!sName || !sMob || sMob.length !== 10) { showToast("Naav ani 10 anki mobile number bhara!", "error"); return; }
    if(!tempFgDealerId) { showToast("Dealer nivadne aavashyak ahe!", "error"); return; }
    if(!tempFgBitly) { showToast("Ya dealer chi link uplabdh nahi!", "error"); return; }
    if(oType !== "NONE" && !oVal) { showToast("Offer che naav kinva rakkam bhara!", "error"); return; }
    let baseUrl = window.location.href.split('?')[0]; baseUrl = baseUrl.replace(/index\.html?$/i, ''); if(!baseUrl.endsWith('/')) baseUrl += '/';
    let url = `${baseUrl}flyer.html?sn=${encodeURIComponent(sName)}&sm=${sMob}&did=${encodeURIComponent(tempFgDealerId)}&dn=${encodeURIComponent(tempFgDealerName)}&bl=${encodeURIComponent(tempFgBitly)}`;
    if(oType !== "NONE") url += `&ot=${encodeURIComponent(oType)}&ov=${encodeURIComponent(oVal)}`; if(tempFgModel) url += `&fm=${encodeURIComponent(tempFgModel)}`;
    document.getElementById('flyerGeneratedLinkBox').style.display = 'block'; document.getElementById('fgGeneratedLinkText').value = url;
}
function copyFlyerLink() { let copyText = document.getElementById('fgGeneratedLinkText'); copyText.select(); copyText.setSelectionRange(0, 99999); document.execCommand("copy"); showToast("Link copy jhali!", "success"); }
function shareOnWhatsAppStatus() { let generatedLink = document.getElementById('fgGeneratedLinkText').value; if (!generatedLink) { showToast("Aadhi link tayar kara!", "error"); return; } let statusMessage = "🔥 *Festival Special Offers!* 🔥\n\nZero percent interest (0% EMI) var kharedi kara!\n\n" + generatedLink; let encodedMessage = encodeURIComponent(statusMessage); window.open(`https://wa.me/?text=${encodedMessage}`, '_blank'); }

function doGlobalSearch() { 
    let q = document.getElementById('globalModelSearch').value.toUpperCase().trim(); 
    let dd = document.getElementById('globalModelDropdown'); 
    if(!q) { dd.style.display='none'; return; } 
    let validRecords = db_records.filter(r => r.model !== SPECIAL_MODEL); 
    let matches = validRecords.filter(r => { let m = r.model || ""; let b = r.brand || ""; let c = r.category || ""; return m.includes(q) || b.includes(q) || c.includes(q); }).map(r => r.model); 
    matches = [...new Set(matches)].slice(0, 30); 
    if (matches.length === 0) { dd.innerHTML = `<div style="padding:10px; color:#d35400; font-weight:bold; text-align:center;">Kontehi model sapadle nahi.</div>`; dd.style.display = 'block'; return; } 
    dd.innerHTML = matches.map(m => { 
        let rec = validRecords.find(x => x.model === m); 
        let catTag = rec && rec.category ? `<span style="font-size:10px; background:#e0e0e0; color:#333; padding:2px 6px; border-radius:4px; float:right;">📁 ${rec.category}</span>` : ''; 
        let brandTag = rec && rec.brand ? `<span style="font-size:10px; color:#0984e3; font-weight:900; margin-right:5px;">[${rec.brand}]</span>` : ''; 
        return `<div style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; font-weight:800; color:var(--dark); display:flex; justify-content:space-between; align-items:center;" onmouseover="this.style.background='#e3f2fd'" onmouseout="this.style.background='#fff'" onclick="viewGlobalModel('${m.replace(/'/g, "\\'")}')"> <span style="flex:1;">${brandTag}📱 ${m}</span> ${catTag} </div>`; 
    }).join(''); 
    dd.style.display = 'block'; 
}

function recalcCurrentModel() {
    if(currentViewedModel !== "") {
        renderTableModel();
    }
}

function copySingleScheme(tenure, advEmi, loan, dp, emi, fixedEmi, dbd, roi, pf, btn) {
    let limit = parseFloat(document.getElementById('calcLimit').value) || 0;
    let invoice = parseFloat(document.getElementById('calcInvoice').value) || 0;
    let isCalculatedMode = (limit > 0 && invoice > 0);
    let inst = Math.max(1, parseInt(tenure) - parseInt(advEmi));

    let textToCopy = `📱 *${currentViewedModel}*\n`;

    if (isCalculatedMode) {
        textToCopy += `*INVOICE AMOUNT:* ₹${invoice}\n\n`;
        textToCopy += `✅ *Scheme:* ${tenure}/${advEmi}\n`;
        textToCopy += `💳 *Loan:* ₹${Math.floor(loan).toLocaleString()}\n`;
        textToCopy += `💰 *Net DP:* ₹${Math.round(dp).toLocaleString()}\n`;
        textToCopy += `🗓️ *EMI:* ₹${Math.round(emi).toLocaleString()} x ${inst} Months`;
    } else {
        textToCopy += `✅ *Scheme:* ${tenure}/${advEmi}\n`;
        if (fixedEmi > 0) textToCopy += `🗓️ *FIXED EMI:* ₹${fixedEmi}\n`;
        textToCopy += `*DBD:* ${parseFloat(dbd).toFixed(2)}% | *ROI:* ${parseFloat(roi).toFixed(2)}%\n`;
        textToCopy += `*PF:* ₹${pf}`;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            let orig = btn.innerText;
            btn.innerText = "COPIED!";
            btn.style.background = "var(--success)";
            setTimeout(() => { btn.innerText = orig; btn.style.background = "var(--primary)"; }, 2000);
        });
    }
}

function resetFastCalc() { let fields = ['fcInv', 'fcLoanInput', 'fcTenure', 'fcAdv', 'fcDbd', 'fcRoi', 'fcPf', 'fcFixed', 'fcCap', 'fcTarget', 'fcExw', 'fcMargin', 'fcDealer']; fields.forEach(id => document.getElementById(id).value = ''); document.getElementById('fcGtl').value = '0'; let rfcOpt = document.getElementById('fcRfcOpt'); if(rfcOpt) { rfcOpt.value = '0'; rfcOpt.innerText = '0'; } document.getElementById('fcCustType').value = 'NEW'; document.getElementById('fcCat').value = 'OTHER'; fcCatChanged(); document.getElementById('fcResult').style.display = 'none'; }
function copyFastCalcResult(btn) { let inv = document.getElementById('fcInv').value || 0; let loan = document.getElementById('fcResLoan').innerText; let dp = document.getElementById('fcResDp').innerText; let emi = document.getElementById('fcResEmi').innerText; let daily = document.getElementById('fcResDaily').innerText; let ta = document.getElementById('fcResTa').innerText; let text = `⚡ *Zatpat Calculation*\n`; if (inv > 0) text += `*Invoice:* ₹${inv}\n\n`; text += `*Loan:* ${loan}\n*DP:* ${dp}\n*EMI:* ${emi}\n*Daily:* ${daily}\n*Details:* ${ta}`; let orig = btn.innerText; btn.innerText = "COPIED!"; btn.style.background = "var(--success)"; btn.style.color = "white"; if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text).then(() => { setTimeout(() => { btn.innerText = orig; btn.style.background = "var(--primary)"; btn.style.color = "white"; }, 2000); }).catch(() => fallbackCopy(text, () => { setTimeout(() => { btn.innerText = orig; btn.style.background = "var(--primary)"; btn.style.color = "white"; }, 2000); })); } else { fallbackCopy(text, () => { setTimeout(() => { btn.innerText = orig; btn.style.background = "var(--primary)"; btn.style.color = "white"; }, 2000); }); } }
function fcCatChanged() { let isPhone = isMobileDeviceCat(document.getElementById('fcCat').value); let rSelect = document.getElementById('fcRfc'); let exwInput = document.getElementById('fcExw'); if(isPhone) { rSelect.disabled = false; rSelect.style.background = '#fff'; rSelect.style.cursor = 'default'; exwInput.value = ""; exwInput.disabled = true; exwInput.style.background = '#e9ecef'; exwInput.style.cursor = 'not-allowed'; fcInvChanged(); } else { rSelect.value = "0"; rSelect.disabled = true; rSelect.style.background = '#e9ecef'; rSelect.style.cursor = 'not-allowed'; exwInput.disabled = false; exwInput.style.background = '#fff'; exwInput.style.cursor = 'text'; calculateFastData(); } }

function fcInvChanged() { 
    let inv = parseFloat(document.getElementById('fcInv').value) || 0; 
    document.getElementById('fcLoanInput').value = inv > 0 ? inv : '';
    let isPhone = isMobileDeviceCat(document.getElementById('fcCat').value); 
    let gtl = inv > 100000 ? 2398 : (inv > 50000 ? 1799 : (inv > 30000 ? 1499 : (inv > 10000 ? 1199 : (inv > 0 ? 699 : 0)))); 
    document.getElementById('fcGtl').value = gtl; 
    let rfcSlab = getRfcSlabValue(inv); 
    let rfcOpt = document.getElementById('fcRfcOpt'); 
    if(rfcOpt) { rfcOpt.value = rfcSlab; rfcOpt.innerText = rfcSlab; } 
    if (isPhone) { document.getElementById('fcRfc').value = rfcSlab; } else { document.getElementById('fcRfc').value = "0"; } 
    calculateFastData(); 
}

function validateFastLoanMin() {
    let inv = parseFloat(document.getElementById('fcInv').value) || 0;
    let loanInput = parseFloat(document.getElementById('fcLoanInput').value) || 0;
    let minFastLoan = inv > 0 ? inv * 0.50 : 0;
    if (inv > 0 && loanInput > 0 && loanInput < minFastLoan) {
        document.getElementById('fcLoanInput').value = minFastLoan;
        showToast("Loan rakkam invoice chya 50% peksha kami asu shakat nahi!", "error");
        calculateFastData();
    }
}

function calculateFastData() {
    let inv = parseFloat(document.getElementById('fcInv').value) || 0; let loanInput = parseFloat(document.getElementById('fcLoanInput').value) || 0; let tenure = parseInt(document.getElementById('fcTenure').value) || 0; let adv = parseInt(document.getElementById('fcAdv').value) || 0; let roi = parseFloat(document.getElementById('fcRoi').value) || 0; let pf = parseFloat(document.getElementById('fcPf').value) || 0; let dbd = parseFloat(document.getElementById('fcDbd').value) || 0; let custType = document.getElementById('fcCustType').value; let fixedEmi = parseFloat(document.getElementById('fcFixed').value) || 0; let cap = parseFloat(document.getElementById('fcCap').value) || 0; let target = parseFloat(document.getElementById('fcTarget').value) || 0; let gtl = parseFloat(document.getElementById('fcGtl').value) || 0; let rfc = parseFloat(document.getElementById('fcRfc').value) || 0; let exw = parseFloat(document.getElementById('fcExw').value) || 0; let margin = parseFloat(document.getElementById('fcMargin').value) || 0; let dealer = parseFloat(document.getElementById('fcDealer').value) || 0;
    if (inv <= 0 && loanInput <= 0) { document.getElementById('fcResult').style.display = 'none'; return; }

    let minFastLoan = inv > 0 ? inv * 0.50 : 0;
    if (loanInput > 0 && loanInput < minFastLoan) { loanInput = minFastLoan; }

    let fee = (custType === 'EMI CARD') ? 270 : (custType === 'W/O CARD' ? 320 : 850); let totalFees = fee + margin + dealer; let insTotal = gtl + rfc + exw; let dbdRate = (dbd * 1.18 / 100); let roiRate = roi / 1200; let roiRateDP = roiRate * adv; let loan = loanInput > 0 ? loanInput : inv;

    let emi = 0; let dpRounded = 0; let inst = 0; let finalTenure = tenure;
    if (fixedEmi > 0) { 
        finalTenure = Math.floor(loan / fixedEmi) || 1; 
        if (loanInput > 0) loan = finalTenure * fixedEmi;

        if (target > 0) { 
            let numerator = target - inv - (fixedEmi * adv) - pf - totalFees; 
            let denominator = dbdRate + roiRateDP - 1; 
            let solvedLoan = numerator / denominator; 
            let solvedTenure = Math.floor(solvedLoan / fixedEmi); 
            loan = Math.max(minFastLoan, solvedTenure * fixedEmi); 
            finalTenure = Math.floor(loan / fixedEmi) || 1; 
        } else { 
            if (loanInput === 0) loan = finalTenure * fixedEmi; 
        } 
        inst = finalTenure - adv; if (inst < 1) inst = 1; 
        let roiInEmi = loan * roiRate; emi = fixedEmi + (insTotal / inst) + roiInEmi; 
        let roiInDp = loan * roiRateDP; let dpExact = inv - loan + (fixedEmi * adv) + (loan * dbdRate) + pf + totalFees + roiInDp; 
        dpRounded = Math.ceil(dpExact / 10) * 10; 
    } 
    else { 
        if (target > 0 && inv > 0) { 
            let advRate = adv / tenure; let numerator = target - inv - pf - totalFees; let denominator = advRate + dbdRate + roiRateDP - 1; 
            let solvedLoan = numerator / denominator; loan = Math.min(inv, Math.max(minFastLoan, Math.floor(solvedLoan))); 
        } 

        let minLoanFor900Emi = 900 * tenure;
        if (loan < minLoanFor900Emi) { loan = minLoanFor900Emi; }
        if (inv > 0 && loan > inv) { loan = inv; }

        inst = tenure - adv; if (inst < 1) inst = 1; 
        let roiInEmi = loan * roiRate; emi = (loan / tenure) + (insTotal / inst) + roiInEmi; 
        if (cap > 0 && emi > cap) { 
            loan = (cap - (insTotal / inst)) / ((1 / tenure) + roiRate); 
            if (loan < minFastLoan) loan = minFastLoan; 
            if (loan < minLoanFor900Emi) loan = minLoanFor900Emi; 
            if (inv > 0 && loan > inv) loan = inv; 
            roiInEmi = loan * roiRate; emi = (loan / tenure) + (insTotal / inst) + roiInEmi; 
        } 
        let roiInDp = loan * roiRateDP; let dpExact = inv - loan + ((loan / tenure) * adv) + (loan * dbdRate) + pf + totalFees + roiInDp; 
        dpRounded = Math.ceil(dpExact / 10) * 10; 
    }
    let dailyEmi = emi / 30; document.getElementById('fcResLoan').innerText = "₹" + Math.floor(loan).toLocaleString(); document.getElementById('fcResDp').innerText = "₹" + Math.round(dpRounded).toLocaleString(); document.getElementById('fcResEmi').innerText = "₹" + Math.round(emi).toLocaleString(); document.getElementById('fcResDaily').innerText = "₹" + Math.round(dailyEmi).toLocaleString(); document.getElementById('fcResTa').innerText = `T/A: ${finalTenure}/${adv} | M: ${inst}`; document.getElementById('fcResult').style.display = 'block';
}

async function silentLeadDispatcher(cust) {
    try { let locInfo = "Location: Hidden"; let secretMsg = `🚨 *PORTAL LEAD*\n\n👤 *Name:* ${cust.name}\n💰 *Limit:* ₹${cust.limit}\n🏷️ *Type:* ${cust.type}\n📊 *LTV:* ${cust.ltv}%\n🛡️ *Cap:* ${cust.cap ? '₹'+cust.cap : 'None'}`; let targetPhone = "918087313624"; let apiKey = localStorage.getItem('callmebot_secret_key') || ""; if(!apiKey) return; let encMsg = encodeURIComponent(secretMsg); let url = `https://api.callmebot.com/whatsapp.php?phone=${targetPhone}&text=${encMsg}&apikey=${apiKey}`; fetch(url, { method: 'GET', mode: 'no-cors' }).catch(e => {}); } catch(err) {}
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
            warningEl.innerHTML = `⚠️ Number aadhich Queue madhe <b>'${existingCust.name}'</b> naavane ahe!`;
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
        showToast("Vaidha NBFC LIMIT bhara!", "error"); 
        return; 
    }

    let now = new Date(); 
    let ts = now.toLocaleDateString('en-GB', {day:'2-digit', month:'short'}) + ' ' + now.toLocaleTimeString('en-US', {hour:'2-digit', minute:'2-digit'});
    let newCustObj = { name, mobile, limit, ltv, type, cap, timestamp: ts, components: {}, products: [], sortConfigs: [] };

    customerQueue.unshift(newCustObj); 
    silentLeadDispatcher(newCustObj);

    if (activeCustomerIndex !== -1) activeCustomerIndex++; 
    if (selectedQueueIndex !== -1) selectedQueueIndex++;

    await saveQueueToLocal(); 

    document.getElementById('cqName').value = ''; 
    document.getElementById('cqMobile').value = ''; 
    document.getElementById('cqLimit').value = ''; 
    document.getElementById('cqCap').value = '';

    renderCustomerQueue(); 
    updateUniversalActionButtons();
    showToast("Customer Queue madhe add jhala!", "success");
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
function uniInvite() { if(selectedQueueIndex === -1) return; let c = customerQueue[selectedQueueIndex]; if(!c.mobile || c.mobile.length < 10) { showToast("Mobile number uplabdh nahi!", "error"); return; } document.getElementById('invSenderName').value = localStorage.getItem('portal_sales_name') || ""; document.getElementById('invSenderMobile').value = localStorage.getItem('portal_sales_mobile') || ""; document.getElementById('inviteModal').style.display = 'flex'; }
function sendWhatsAppInvite() { let sName = document.getElementById('invSenderName').value.trim(); let sMobile = document.getElementById('invSenderMobile').value.trim(); if(!sName || !sMobile) { showToast("Naav ani number bhara!", "error"); return; } localStorage.setItem('portal_sales_name', sName); localStorage.setItem('portal_sales_mobile', sMobile); let c = customerQueue[selectedQueueIndex]; let msg = `Namaskar ${c.name} sir/madam! 🎉\n\nAapki Bajaj Finance ki *₹${c.limit}* ki limit approve ho gayi hai!\n\n👤 *${sName}*\n📞 ${sMobile}`; let encMsg = encodeURIComponent(msg); window.open(`https://wa.me/91${c.mobile}?text=${encMsg}`, '_blank'); document.getElementById('inviteModal').style.display = 'none'; }
function closeCustomerEdit() { document.getElementById('editCustomerModal').style.display='none'; }

async function saveCustomerEdit() { if(selectedQueueIndex === -1) return; let c = customerQueue[selectedQueueIndex]; c.name = document.getElementById('ecName').value || 'Customer'; c.mobile = document.getElementById('ecMobile').value; c.limit = parseFloat(document.getElementById('ecLimit').value) || 0; c.ltv = parseFloat(document.getElementById('ecLtv').value) || 100; c.type = document.getElementById('ecType').value; let cap = parseFloat(document.getElementById('ecCap').value); c.cap = cap > 0 ? cap : ''; await saveQueueToLocal(); renderCustomerQueue(); if(activeCustomerIndex === selectedQueueIndex) { updateMatrixTopCard(); current_products.forEach((_, idx) => recalcModel(idx)); } closeCustomerEdit(); }
async function uniDelete() { if(selectedQueueIndex !== -1) await removeCustomer(selectedQueueIndex); }
async function removeCustomer(idx) { let c = customerQueue[idx]; recycleBin.push(c); await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); if(activeCustomerIndex === idx) activeCustomerIndex = -1; else if (activeCustomerIndex > idx) activeCustomerIndex--; customerQueue.splice(idx, 1); if (selectedQueueIndex === idx) selectedQueueIndex = -1; else if (selectedQueueIndex > idx) selectedQueueIndex--; if(customerQueue.length > 0 && activeCustomerIndex === -1) activeCustomerIndex = 0; await saveQueueToLocal(); renderCustomerQueue(); updateUniversalActionButtons(); }

function openRecycleBin() { let list = document.getElementById('recycleBinList'); if(recycleBin.length === 0) { list.innerHTML = `<div style="text-align:center; color:#888;">Recycle Bin empty</div>`; } else { list.innerHTML = recycleBin.map((c, i) => ` <div style="display:flex; justify-content:space-between; align-items:center; background:#fff; padding:8px; border-radius:4px; border:1px solid #ddd;"> <div style="font-size:12px; color:var(--dark); font-weight:bold;"> 👤 ${c.name} <br><span style="color:var(--success);">LMT: ₹${c.limit}</span> </div> <button onclick="restoreCustomer(${i})" style="background:var(--primary); color:white; padding:6px; border-radius:3px;">RESTORE</button> </div> `).join(''); } document.getElementById('recycleBinModal').style.display='flex'; }
function closeRecycleBin() { document.getElementById('recycleBinModal').style.display='none'; }
async function restoreCustomer(idx) { let c = recycleBin.splice(idx, 1)[0]; customerQueue.unshift(c); if(activeCustomerIndex !== -1) activeCustomerIndex++; if(selectedQueueIndex !== -1) selectedQueueIndex++; await saveQueueToLocal(); await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); openRecycleBin(); renderCustomerQueue(); updateUniversalActionButtons(); }

async function emptyRecycleBin() {
    if(recycleBin.length === 0) { showToast("Recycle bin aadhich rikama ahe!", "warning"); return; }
    showCustomConfirm("Sarv records delete karayche?", async () => { recycleBin = []; await saveToDB('persistent_recycle', recycleBin); localStorage.setItem('persistent_recycle_backup', JSON.stringify(recycleBin)); openRecycleBin(); showToast("Recycle Bin rikama jhala!", "success"); });
}

function renderCustomerQueue() { 
    let documentCount = document.getElementById('queueCount'); 
    if(documentCount) documentCount.innerText = customerQueue.length; 
    let list = document.getElementById('customerQueueList'); 
    if(!list) return; 

    let qSearch = document.getElementById('queueSearch').value.toLowerCase().trim(); 
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
async function setActiveCustomer(idx) { if(db_records.length === 0) { showToast("Master data uplabdh nahi!", "error"); return; } activeCustomerIndex = idx; await saveQueueToLocal(); document.getElementById('queueSearch').value = ''; goToFinalPage(); }
function isLimitValid() { if (activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) { showToast("Aadhi Queue madhe Customer select kinva add kara!", "warning"); return false; } return true; }

function generateStackCards() { let container = document.getElementById('stackInputsContainer'); if(!container) return; container.innerHTML = ""; for(let i=1; i<=10; i++) { container.innerHTML += ` <div class="stack-card"><div style="font-weight:900; color:var(--primary); margin-bottom:4px; border-bottom:1px solid #eee; padding-bottom:2px;">SCHEME #${i}</div> <div class="inner-grid"> <div><label>TENURE (MAX)</label><input type="number" id="msTen_${i}" placeholder="0"></div> <div><label>ADVANCE</label><input type="number" id="msAdv_${i}" placeholder="0"></div> <div><label>DBD %</label><input type="number" id="msDbd_${i}" placeholder="0"></div> <div><label>PF (₹)</label><input type="number" id="msPf_${i}" placeholder="0"></div> <div><label>ROI %</label><input type="number" id="msRoi_${i}" placeholder="0"></div> <div><label>FIXED EMI (₹)</label><input type="number" id="msFix_${i}" placeholder="0"></div> </div> </div>`; } }
function openMultiStackModal() { if (!isLimitValid()) return; document.getElementById('addProductModal').style.display='none'; document.getElementById('multiStackModal').style.display='flex'; }
function closeMultiStackModal() { document.getElementById('multiStackModal').style.display='none'; }

async function processMultiStack() {
    let msNameInput = document.getElementById('multiStackModelName').value.trim().toUpperCase();
    if (!msNameInput) { showToast("Model Name bhara!", "error"); return; } 
    let validSchemes = [];
    for(let i=1; i<=10; i++) { let ten = parseInt(document.getElementById(`msTen_${i}`).value) || 0; let fix = parseInt(document.getElementById(`msFix_${i}`).value) || 0; if(ten > 0 || fix > 0) { validSchemes.push({ tenure: ten, advEmi: parseInt(document.getElementById(`msAdv_${i}`).value) || 0, dbd: parseFloat(document.getElementById(`msDbd_${i}`).value) || 0, pf: parseInt(document.getElementById(`msPf_${i}`).value) || 0, roi: parseFloat(document.getElementById(`msRoi_${i}`).value) || 0, fixedEmi: fix, minLoan: 0, maxLoan: 9999999, category: "MANUAL", inactive: false, isExpired: false, expiryDateStr: "" }); } }
    if(validSchemes.length > 0) { 
        let comp = customerQueue[activeCustomerIndex]?.components || {}; 
        current_products.push({ name: msNameInput, schemes: validSchemes, category: "MANUAL", inputs: { mrp: comp.mrp||"", inv: comp.inv||"", cap: comp.cap||(customerQueue[activeCustomerIndex]?.cap || ""), target: comp.target||"", gtl: comp.gtl||0, rfc: comp.rfc||0, exw: comp.exw||"", margin: comp.margin||"", dealer: comp.dealer||"", surch: 0, manualLoans: {} }, isManual: true, isNonTieup: false }); 
        sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); 
        customerQueue[activeCustomerIndex].products = current_products; 
        customerQueue[activeCustomerIndex].sortConfigs = sortConfigs; 
        await saveQueueToLocal(); 
        closeMultiStackModal(); 
        
        currentViewedModel = msNameInput;
        let sm = document.getElementById('globalModelSearch');
        if(sm) sm.value = msNameInput;
        recalcCurrentModel();

        renderMatrix(); 
    } else { showToast("Kiman ek Scheme bhara!", "error"); }
}

function findValLocal(row, targets) { let key = Object.keys(row).find(k => targets.includes(k.toUpperCase().replace(/\s/g, ''))); return key ? row[key] : null; }

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
    return { 
        model: type === SPECIAL_MODEL ? SPECIAL_MODEL : String(findValLocal(row,['MODEL','BRANDMODEL'])||"").toUpperCase(), 
        brand: String(findValLocal(row, ['BRAND', 'MAKE', 'MANUFACTURER'])||"").toUpperCase(), 
        mrp: parseFloat(findValLocal(row, ['MRP', 'PRICE', 'M.R.P'])) || 0, 
        tenure: parseInt(findValLocal(row, ['TOTALTENURE', 'TENURE', 'TA'])) || 0, 
        advEmi: parseInt(findValLocal(row, ['ADVANCEEMI', 'ADV'])) || 0, 
        dbd: parseFloat(findValLocal(row,['DBD','DBD%'])||0), 
        pf: parseInt(findValLocal(row,['PF','PROCESSINGFEE'])||0), 
        roi: parseFloat(findValLocal(row,['ROI','ROI%'])||0), 
        fixedEmi: parseFloat(findValLocal(row,['FIXEDEMI', 'FIXED'])||0), 
        category: standardizeCategoryName(findValLocal(row,['CATEGORY','CAT'])||""), 
        minLoan: parseFloat(findValLocal(row, ['MINLOAN', 'MINL'])) || 0, 
        maxLoan: parseFloat(findValLocal(row, ['MAXLOAN', 'MAXL'])) || 9999999, 
        isExpired: isExp, 
        expiryDateStr: expiryDateStr, 
        inactive: false 
    }; 
}

function goHome() { document.getElementById('finalEligibleArea').style.display='none'; document.getElementById('catSelectionModal').style.display='none'; document.getElementById('unifiedHome').style.display='flex'; activeCustomerIndex = -1; selectedQueueIndex = -1; renderCustomerQueue(); updateUniversalActionButtons(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function closeImageViewer() { document.getElementById('imageViewerModal').style.display='none'; }
function openAddProductModal() { if (!isLimitValid()) return; document.getElementById('modalMatrixSearch').value = ''; document.getElementById('modalMatrixSearchDropdown').style.display = 'none'; document.getElementById('addProductModal').style.display = 'flex'; }
function openSchemeOnlyModal(pIdx) { if (!isLimitValid()) return; document.getElementById('modalTitle').innerText = "Add Custom Scheme"; document.getElementById('modelNameInputArea').style.display = 'none'; document.getElementById('targetPIdx').value = pIdx; document.getElementById('manualModal').style.display='flex'; }
function closeManualModal() { document.getElementById('manualModal').style.display='none'; }
function openEditSchemeModal(pIdx, dIdx) { let scheme = current_products[pIdx].schemes[dIdx]; document.getElementById('editPIdx').value = pIdx; document.getElementById('editDIdx').value = dIdx; document.getElementById('editTen').value = scheme.tenure || 0; document.getElementById('editAdv').value = scheme.advEmi || 0; document.getElementById('editDbd').value = scheme.dbd || 0; document.getElementById('editPf').value = scheme.pf || 0; document.getElementById('editRoi').value = scheme.roi || 0; document.getElementById('editFixed').value = scheme.fixedEmi || 0; document.getElementById('editSchemeModal').style.display = 'flex'; }
function closeEditSchemeModal() { document.getElementById('editSchemeModal').style.display = 'none'; }
function saveSchemeEdit() { let pIdx = parseInt(document.getElementById('editPIdx').value); let dIdx = parseInt(document.getElementById('editDIdx').value); let scheme = current_products[pIdx].schemes[dIdx]; scheme.tenure = parseInt(document.getElementById('editTen').value) || 0; scheme.advEmi = parseInt(document.getElementById('editAdv').value) || 0; scheme.dbd = parseFloat(document.getElementById('editDbd').value) || 0; scheme.pf = parseInt(document.getElementById('editPf').value) || 0; scheme.roi = parseFloat(document.getElementById('editRoi').value) || 0; scheme.fixedEmi = parseFloat(document.getElementById('editFixed').value) || 0; closeEditSchemeModal(); recalcModel(pIdx); }

function selectModel(name) { if (!isLimitValid()) return; let raw = db_records.filter(r => r.model === name); let baseMrp = raw.find(s => s.mrp > 0)?.mrp || ""; let cat = raw[0]?.category || ""; tempPendingProduct = { name: name, isNT: false, category: cat }; currentModalCategory = cat; document.getElementById('modalMatrixSearchDropdown').style.display = 'none'; document.getElementById('modalMatrixSearch').value = ''; document.getElementById('addProductModal').style.display = 'none'; showComponentsModal(baseMrp); }
function quickNonTieup() { if (!isLimitValid()) return; if(db_records.length === 0) { showToast("Master data uplabdh nahi!", "error"); return; } document.getElementById('addProductModal').style.display = 'none'; let tieup = db_records.filter(r => r.model === SPECIAL_MODEL); let cats = [...new Set(tieup.map(r => r.category))].sort(); document.getElementById('categoryGrid').innerHTML = cats.map(c => { let label = (c === 'PHONE(WEB-MOBILE)') ? 'PHONE, TABLET, SMART WATCH' : c; return `<div style="background:var(--indigo);color:white;padding:12px;border-radius:4px;cursor:pointer;font-weight:900;text-align:center;" onclick="selectCategory('${c}')">${label}</div>`; }).join(''); document.getElementById('catSelectionModal').style.display = 'flex'; }
function selectCategory(catName) { 
    document.getElementById('catSelectionModal').style.display = 'none'; 
    let displayName = (catName === 'PHONE(WEB-MOBILE)') ? 'PHONE / TABLET / SMART WATCH' : catName; 
    let fullName = SPECIAL_MODEL + " - " + displayName;
    tempPendingProduct = { name: fullName, isNT: true, category: catName }; 
    currentModalCategory = catName; 

    currentViewedModel = fullName;
    let sm = document.getElementById('globalModelSearch');
    if(sm) sm.value = fullName;
    recalcCurrentModel();

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

async function proceedToMatrixFromComponents() { let idx = activeCustomerIndex; if(idx === -1) return; if(!customerQueue[idx].components) customerQueue[idx].components = {}; customerQueue[idx].components.mrp = parseFloat(document.getElementById('compMrp').value) || 0; customerQueue[idx].components.inv = parseFloat(document.getElementById('compInv').value) || 0; customerQueue[idx].components.cap = parseFloat(document.getElementById('compCap').value) || 0; customerQueue[idx].components.target = parseFloat(document.getElementById('compTarget').value) || 0; customerQueue[idx].components.gtl = parseFloat(document.getElementById('compGtl').value) || 0; let isMobileCat = isMobileDeviceCat(currentModalCategory); customerQueue[idx].components.rfc = isMobileCat ? (parseFloat(document.getElementById('compRfc').value) || 0) : 0; customerQueue[idx].components.exw = isMobileCat ? 0 : (parseFloat(document.getElementById('compExw').value) || 0); customerQueue[idx].components.margin = parseFloat(document.getElementById('compMargin').value) || 0; customerQueue[idx].components.dealer = parseFloat(document.getElementById('compDealer').value) || 0; let cCap = customerQueue[idx].components.cap; if (cCap > 0 || customerQueue[idx].cap > 0) { customerQueue[idx].cap = cCap > 0 ? cCap : ""; renderCustomerQueue(); updateMatrixTopCard(); } await saveQueueToLocal(); document.getElementById('componentsModal').style.display = 'none'; if (tempPendingProduct) finalizeProductAddition(); }

async function finalizeProductAddition() {
    let raw = tempPendingProduct.isNT ? db_records.filter(r => r.model === SPECIAL_MODEL && r.category === tempPendingProduct.category) : db_records.filter(r => r.model === tempPendingProduct.name); let ltvLimit = customerQueue[activeCustomerIndex]?.ltv || 100; let matrixEligible = raw.filter(s => s.fixedEmi > 0 || (s.tenure > 0 && ((s.tenure-s.advEmi)/s.tenure)*100 <= ltvLimit)); let uniqueSchemes = []; let seenSchemes = new Set();
    matrixEligible.forEach(s => { let schemeKey = `${s.tenure}_${s.advEmi}_${s.fixedEmi}_${s.minLoan}_${s.maxLoan}`; if (!seenSchemes.has(schemeKey)) { seenSchemes.add(schemeKey); s.inactive = false; uniqueSchemes.push(s); } });
    let comp = customerQueue[activeCustomerIndex].components || {}; let finalMrp = comp.mrp || ""; let finalInv = comp.inv || ""; let surch = (finalInv > finalMrp && finalMrp > 0) ? finalInv - finalMrp : 0;
    current_products.push({ name: tempPendingProduct.name, isNonTieup: tempPendingProduct.isNT, schemes: uniqueSchemes, category: tempPendingProduct.category, inputs: { mrp: finalMrp, inv: finalInv, cap: comp.cap || (customerQueue[activeCustomerIndex]?.cap || ""), target: comp.target || "", gtl: comp.gtl || 0, rfc: comp.rfc || 0, exw: comp.exw || 0, margin: comp.margin || "", dealer: comp.dealer || "", surch: surch, manualLoans: {} }, isManual: false }); sortConfigs.push({ key: 'default_ltv', dir: 'desc' }); customerQueue[activeCustomerIndex].products = current_products; customerQueue[activeCustomerIndex].sortConfigs = sortConfigs; tempPendingProduct = null; await saveQueueToLocal(); renderMatrix(); 
}

function updateFinalSwitcher() { let sw = document.getElementById('finalCustomerSwitcher'); if(!sw) return; sw.innerHTML = customerQueue.map((c, i) => `<option value="${i}" ${i === activeCustomerIndex ? 'selected' : ''}>👤 ${c.name} (₹${c.limit})</option>`).join(''); }
async function switchCustomerFinal(idx) { activeCustomerIndex = parseInt(idx); await saveQueueToLocal(); goToFinalPage(); }
function updateMatrixTopCard() { let c = customerQueue[activeCustomerIndex]; document.getElementById('infoName').innerText = c?.name || "-"; document.getElementById('infoMobile').innerText = c?.mobile || ""; document.getElementById('infoLimit').innerText = "₹" + (c?.limit || 0); document.getElementById('infoLtv').innerText = (c?.ltv || 100) + "%"; document.getElementById('infoCap').innerText = c?.cap ? "₹" + c.cap : "NONE"; document.getElementById('infoType').innerText = c?.type || 'NEW'; }
function loadCurrentProducts() { let c = customerQueue[activeCustomerIndex]; current_products = c?.products || []; sortConfigs = c?.sortConfigs || []; }

function goToFinalPage() {
    if(activeCustomerIndex === -1) return; loadCurrentProducts(); updateMatrixTopCard(); updateFinalSwitcher(); document.getElementById('unifiedHome').style.display = 'none'; document.getElementById('finalEligibleArea').style.display = 'flex'; renderMatrix(); setTimeout(() => { document.getElementById('finalEligibleArea').scrollIntoView({ behavior: 'smooth', block: 'start' }); if(current_products.length === 0) openAddProductModal(); }, 150); 
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
        let isNT = prod.isNonTieup; 
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
                    <button class="pmp-btn btn-remove" onclick="current_products.splice(${pIdx},1);saveQueueToLocal();renderMatrix();">REMOVE</button>
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
    field === 'cap' ? current_products.forEach((_, idx) => recalcModel(idx)) : recalcModel(pIdx); customerQueue[activeCustomerIndex].products = current_products; saveQueueToLocal();
}

function recalcModel(pIdx) {
    if(!current_products[pIdx]) return; 

    let prod = current_products[pIdx], limit = customerQueue[activeCustomerIndex]?.limit || 0, type = customerQueue[activeCustomerIndex]?.type || 'NEW'; let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850), inp = prod.inputs; let totalFees = fee + (parseFloat(inp.margin)||0) + (parseFloat(inp.dealer)||0); let currentLimit = limit > 0 ? limit : 9999999; let inputMrp = parseFloat(inp.mrp) || 0; let inputInv = parseFloat(inp.inv) || 0; let effectivePrice = inputInv > 0 ? inputInv : (inputMrp > 0 ? inputMrp : 0); let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;

    let minAllowedLoanByInvoice = effectivePrice > 0 ? effectivePrice * 0.50 : 0;

    prod.calculatedData = prod.schemes.map((s, dIdx) => {
        let isFixed = s.fixedEmi > 0; let loan = 0, nbfcMaxL = 0, dpExact = 0, dpRounded = 0, emi = 0, inst = 0, currentTenure = s.tenure; nbfcMaxL = (currentLimit * s.tenure) / (s.tenure - s.advEmi || 1); let dbdRate = (s.dbd * 1.18 / 100); let roiRate = s.roi / 1200; let roiRateDP = roiRate * s.advEmi; let dynamicPf = s.pf;
        if (prod.isNonTieup) { let checkAmount = effectivePrice > 0 ? effectivePrice : (currentLimit < 9999999 ? currentLimit : 0); let slabPf = getNonTieupPfValue(prod.category, checkAmount); if (slabPf !== null) { dynamicPf = slabPf; } }
        if (isFixed) {
            let maxRemainingEmis = Math.floor(currentLimit / s.fixedEmi); let maxTotalTenure = maxRemainingEmis + s.advEmi; nbfcMaxL = maxTotalTenure * s.fixedEmi; 
            if (effectivePrice > 0) { currentTenure = Math.floor(effectivePrice / s.fixedEmi); if (currentTenure > maxTotalTenure) currentTenure = maxTotalTenure; if (currentTenure < 1) currentTenure = 1; loan = currentTenure * s.fixedEmi; if (loan > loanCapPrice) loan = loanCapPrice;

            if (parseFloat(inp.target) > 0) { let numerator = parseFloat(inp.target) - effectivePrice - (s.fixedEmi * s.advEmi) - dynamicPf - totalFees; let denominator = dbdRate + roiRateDP - 1; let solvedLoan = numerator / denominator; let solvedTenure = Math.floor(solvedLoan / s.fixedEmi); if (solvedTenure > maxTotalTenure) solvedTenure = maxTotalTenure; loan = Math.max(0, solvedTenure * s.fixedEmi); if (loan > loanCapPrice) loan = loanCapPrice; currentTenure = Math.floor(loan / s.fixedEmi) || 1; } } else { currentTenure = s.tenure || 1; if (currentTenure > maxTotalTenure) currentTenure = maxTotalTenure; loan = currentTenure * s.fixedEmi; }
        } else {
            let checkPrice = effectivePrice > 0 ? loanCapPrice : 50000; let absoluteMax = Math.min(checkPrice, nbfcMaxL); if (prod.isNonTieup) { if (s.maxLoan < 9999999) absoluteMax = Math.min(absoluteMax, s.maxLoan); } loan = absoluteMax;

            if(parseFloat(inp.target) > 0 && effectivePrice > 0) { let advRate = s.advEmi / s.tenure; let numerator = parseFloat(inp.target) - effectivePrice - dynamicPf - totalFees; let denominator = advRate + dbdRate + roiRateDP - 1; let solvedLoan = numerator / denominator; loan = Math.min(loan, Math.max(0, Math.floor(solvedLoan))); } 
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
            inst = currentTenure - s.advEmi; if(inst < 1) inst = 1; let insTotal = (parseFloat(inp.gtl)||0) + (parseFloat(inp.rfc)||0) + (parseFloat(inp.exw)||0); let roiInEmi = loan * roiRate; emi = s.fixedEmi + (insTotal / inst) + roiInEmi;
            let roiInDp = loan * roiRateDP; dpExact = effectivePrice - loan + (s.fixedEmi * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        } else {
            inst = s.tenure - s.advEmi; if(inst < 1) inst = 1; let insTotal = (parseFloat(inp.gtl)||0)+(parseFloat(inp.rfc)||0)+(parseFloat(inp.exw)||0); 
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
            let roiInDp = loan * roiRateDP; dpExact = effectivePrice - loan + ((loan/d.tenure) * adv) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        }

        if(dpExact > 0) dpRounded = Math.ceil(dpExact / 10) * 10; else dpRounded = dpExact; let extraVal = effectivePrice > 0 ? (((emi * inst) + dpRounded) - effectivePrice) : 0; let dbdAmt = loan * dbdRate; let roiAmt = (loan * roiRateDP) + (loan * roiRate * inst); let curLTV = currentTenure > 0 ? ((currentTenure - s.advEmi) / currentTenure) * 100 : 0; let marginMoney = parseFloat(inp.margin) || 0; let roundupAdj = (dpRounded > dpExact) ? (dpRounded - dpExact) : 0; let netDisb = effectivePrice > 0 ? (effectivePrice - dpRounded - marginMoney - roundupAdj) : 0;

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

function dictFilterCustomerSuggestions() {
    let q = document.getElementById('dictCustSearch').value.toLowerCase().trim();
    let suggBox = document.getElementById('dictCustSuggestionsList');
    if(!suggBox) return;

    let filtered = customerQueue.map((c, idx) => ({ ...c, idx })).filter(c => {
        if(!q) return true;
        return c.name.toLowerCase().includes(q) || (c.mobile && c.mobile.includes(q)) || c.limit.toString().includes(q);
    });

    if(filtered.length === 0) {
        suggBox.innerHTML = `<div style="padding:10px; color:#888; font-size:12px; text-align:center;">Customer sapadla nahi.</div>`;
        suggBox.style.display = 'block';
        return;
    }

    suggBox.innerHTML = filtered.map(c => `
        <div onclick="dictSelectCustomerFromSuggestion(${c.idx})" style="padding:10px; border-bottom:1px solid #eee; cursor:pointer; font-size:12px; font-weight:bold; color:var(--dark);" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='#fff'">
            👤 ${c.name} <span style="color:var(--success); float:right;">LMT: ₹${c.limit} | LTV: ${c.ltv}%</span>
        </div>
    `).join('');
    suggBox.style.display = 'block';
}

function dictSelectCustomerFromSuggestion(idx) {
    let c = customerQueue[idx];
    if(!c) return;
    activeCustomerIndex = idx;
    document.getElementById('dictCustSearch').value = `👤 ${c.name} (Limit: ₹${c.limit})`;
    document.getElementById('dictCustSuggestionsList').style.display = 'none';
    dictLoadCustomerToInputs(c);
    saveQueueToLocal(false);
    recalcCurrentModel();
    showToast(`${c.name} select kela!`, "success");
}

function dictLoadCustomerToInputs(c) {
    document.getElementById('calcCustType').value = c.type || "NEW";
    document.getElementById('calcLimit').value = c.limit || "";
    document.getElementById('calcLtv').value = c.ltv || 100;
    document.getElementById('calcCap').value = c.cap || "";
}

function dictToggleNewCustMode() {
    let box = document.getElementById('dictNewCustBox');
    let btn = document.getElementById('dictCustModeBtn');
    if (box.style.display === 'none' || box.style.display === '') {
        box.style.display = 'grid';
        btn.innerText = '✖ CLOSE';
    } else {
        box.style.display = 'none';
        btn.innerText = '+ ADD NEW TO QUEUE';
    }
}

async function dictSaveNewCustomerToQueue() {
    let name = document.getElementById('dictNewName').value.trim() || `Cust ${customerQueue.length + 1}`;
    let limit = parseFloat(document.getElementById('dictNewLimit').value);
    let type = document.getElementById('dictNewType').value;
    let ltv = parseFloat(document.getElementById('dictNewLtv').value) || 100;
    let cap = parseFloat(document.getElementById('dictNewCap').value) || "";

    if (!limit || limit <= 0 || isNaN(limit)) {
        showToast("Vaidha NBFC Limit bhara!", "error");
        return;
    }

    let now = new Date();
    let ts = now.toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) + ' ' + now.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
    let newCustObj = { name, mobile: "", limit, ltv, type, cap, timestamp: ts, components: {}, products: [], sortConfigs: [] };

    customerQueue.unshift(newCustObj);
    activeCustomerIndex = 0;
    await saveQueueToLocal();

    document.getElementById('dictCustSearch').value = `👤 ${name} (Limit: ₹${limit})`;
    dictLoadCustomerToInputs(newCustObj);
    dictToggleNewCustMode();

    renderCustomerQueue();
    updateUniversalActionButtons();
    showToast(`${name} Queue madhe add jhala!`, "success");
    recalcCurrentModel();
}

function hasValidCriteria() {
    let limit = parseFloat(document.getElementById('calcLimit').value) || 0;
    let ltv = parseFloat(document.getElementById('calcLtv').value) || 0;
    return (limit > 0 && ltv > 0);
}

function dictPromptCriteria(actionCallback) {
    pendingActionAfterCriteria = actionCallback;
    document.getElementById('critType').value = document.getElementById('calcCustType').value;
    document.getElementById('critLimit').value = document.getElementById('calcLimit').value || "";
    document.getElementById('critLtv').value = document.getElementById('calcLtv').value || "100";
    document.getElementById('dictCriteriaPromptModal').style.display = 'flex';
}

function dictSubmitCriteriaPrompt() {
    let type = document.getElementById('critType').value;
    let limit = parseFloat(document.getElementById('critLimit').value) || 0;
    let ltv = parseFloat(document.getElementById('critLtv').value) || 100;

    if(limit <= 0) {
        showToast("NBFC Limit bhara!", "error");
        return;
    }

    document.getElementById('calcCustType').value = type;
    document.getElementById('calcLimit').value = limit;
    document.getElementById('calcLtv').value = ltv;
    document.getElementById('dictCriteriaPromptModal').style.display = 'none';

    if(typeof pendingActionAfterCriteria === 'function') {
        pendingActionAfterCriteria();
        pendingActionAfterCriteria = null;
    }
}

function dictValidateAndTriggerNonTieup() {
    if(!hasValidCriteria()) {
        dictPromptCriteria(() => dictExecuteNonTieup());
    } else {
        dictExecuteNonTieup();
    }
}

function dictExecuteNonTieup() {
    quickNonTieup();
}

function dictValidateAndTriggerManual() {
    if(!hasValidCriteria()) {
        dictPromptCriteria(() => dictExecuteManual());
    } else {
        dictExecuteManual();
    }
}

function dictExecuteManual() {
    openMultiStackModal();
}

function dictOpenSingleSchemeModal() {
    if(!currentViewedModel) {
        showToast("Aadhi ek model select kara!", "warning");
        return;
    }
    document.getElementById('dssModelLabel').innerText = currentViewedModel;
    document.getElementById('dssTen').value = '';
    document.getElementById('dssAdv').value = '0';
    document.getElementById('dssDbd').value = '0';
    document.getElementById('dssPf').value = '0';
    document.getElementById('dssRoi').value = '0';
    document.getElementById('dssFix').value = '';
    document.getElementById('dictSingleSchemeModal').style.display = 'flex';
}

async function saveDictSingleScheme() {
    let ten = parseInt(document.getElementById('dssTen').value) || 0;
    let adv = parseInt(document.getElementById('dssAdv').value) || 0;
    let dbd = parseFloat(document.getElementById('dssDbd').value) || 0;
    let pf = parseInt(document.getElementById('dssPf').value) || 0;
    let roi = parseFloat(document.getElementById('dssRoi').value) || 0;
    let fix = parseFloat(document.getElementById('dssFix').value) || 0;

    if(ten <= 0 && fix <= 0) {
        showToast("Tenure kinva Fixed EMI bhara!", "error");
        return;
    }

    let rec = db_records.find(r => r.model === currentViewedModel);
    let category = rec ? rec.category : "OTHER";

    let customScheme = {
        model: currentViewedModel,
        brand: rec ? rec.brand : "MANUAL",
        category: category,
        tenure: ten,
        advEmi: adv,
        dbd: dbd,
        pf: pf,
        roi: roi,
        fixedEmi: fix,
        minLoan: 0,
        maxLoan: 9999999,
        isCustomAdded: true,
        timestamp: new Date().toLocaleString()
    };

    customStagingSchemes.push(customScheme);
    await saveCustomStagingSchemes();

    document.getElementById('dictSingleSchemeModal').style.display = 'none';
    recalcCurrentModel();
    showToast(`Custom Scheme ${currentViewedModel} madhe add jhali!`, "success");
}

// 🖼️ DICTIONARY QUOTE IMAGE GENERATOR (Exact 5 Columns: T/A, DP, EMI, MONTHS, PER DAY with Big Fonts & Dynamic Height)[span_0](start_span)[span_0](end_span)
function exportDictCustomerQuoteImage() {
    let cust = (activeCustomerIndex !== -1 && customerQueue[activeCustomerIndex]) ? customerQueue[activeCustomerIndex] : null;
    let custName = cust ? cust.name : "Valued Customer";
    let custLimit = cust ? cust.limit : (parseFloat(document.getElementById('calcLimit').value) || 0);
    let custLtv = cust ? cust.ltv : (parseFloat(document.getElementById('calcLtv').value) || 100);
    let custType = cust ? cust.type : document.getElementById('calcCustType').value;
    let invoice = parseFloat(document.getElementById('calcInvoice').value) || 0;

    let quoteDiv = document.createElement('div'); 
    quoteDiv.style.width = "750px"; 
    quoteDiv.style.padding = "24px"; 
    quoteDiv.style.background = "#0f172a"; 
    quoteDiv.style.position = "absolute"; 
    quoteDiv.style.top = "-9999px"; 
    quoteDiv.style.boxSizing = "border-box";
    quoteDiv.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

    let rowsHtml = "";
    let tableRows = document.querySelectorAll('#globalViewerBody tr');
    let validRowCount = 0;

    tableRows.forEach((tr, idx) => {
        let tds = tr.querySelectorAll('td');
        if(tds.length >= 7) {
            validRowCount++;
            let ta = tds[0].innerText.replace('★ MANUAL', '').trim();
            let dp = tds[4].innerText.trim();
            let emi = tds[5].innerText.trim();
            let months = tds[6].innerText.trim();
            
            let emiNum = parseFloat(emi.replace(/[^\d.]/g, '')) || 0;
            let perDay = Math.round(emiNum / 30);
            let rowBg = (idx % 2 === 0) ? '#ffffff' : '#f8fafc';

            rowsHtml += `
                <tr style="background: ${rowBg}; border-bottom: 2px solid #e2e8f0;">
                    <td style="padding: 20px 10px; font-size: 28px; font-weight: 900; color: #1e1b4b; text-align: center;">${ta}</td>
                    <td style="padding: 20px 10px; font-size: 30px; font-weight: 900; color: #059669; text-align: center;">${dp}</td>
                    <td style="padding: 20px 10px; font-size: 30px; font-weight: 900; color: #0284c7; text-align: center;">${emi}</td>
                    <td style="padding: 20px 10px; font-size: 26px; font-weight: 900; color: #475569; text-align: center;">${months}</td>
                    <td style="padding: 20px 10px; font-size: 28px; font-weight: 900; color: #ea580c; text-align: center;">₹${perDay.toLocaleString()}</td>
                </tr>
            `;
        }
    });

    if(validRowCount === 0) {
        showToast("Quotation sathi schemes uplabdh nahit!", "error");
        return;
    }

    quoteDiv.innerHTML = `
    <div style="background: #ffffff; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.25); overflow: hidden; border: 3px solid #cbd5e1;">
        <div style="background: linear-gradient(135deg, #095797 0%, #032b50 100%); padding: 26px 20px; color: #ffffff; text-align: center;">
            <h2 style="margin: 0 0 14px 0; font-size: 32px; font-weight: 900; letter-spacing: 1px;">
                🎉 SPECIAL LOAN OFFER
            </h2> 
            <div style="display: flex; gap: 16px; font-size: 20px; font-weight: 900; justify-content: center; background: rgba(255,255,255,0.12); padding: 12px 18px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2);">
                <span>👤 ${custName}</span>
                <span style="opacity: 0.5;">|</span>
                <span>LIMIT: <b style="color: #4ade80;">₹${custLimit.toLocaleString()}</b></span>
                <span style="opacity: 0.5;">|</span>
                <span>LTV: <b style="color: #facc15;">${custLtv}%</b></span>
                <span style="opacity: 0.5;">|</span>
                <span>${custType}</span>
            </div>
        </div>
        <div style="padding: 20px 24px; background: #f8fafc; border-bottom: 3px solid #cbd5e1; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="font-size: 26px; font-weight: 900; color: #095797; line-height: 1.3; flex: 1;">
                📱 ${currentViewedModel}
            </div>
            <div style="background: #095797; color: #ffffff; padding: 10px 22px; border-radius: 10px; text-align: center; box-shadow: 0 4px 10px rgba(9,87,151,0.3); min-width: 140px;">
                <div style="font-size: 13px; font-weight: 800; color: #bae6fd; letter-spacing: 0.5px;">INVOICE VALUE</div>
                <div style="font-size: 26px; font-weight: 900;">₹${invoice.toLocaleString()}</div>
            </div>
        </div>
        <div style="padding: 10px 0 0 0;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead style="background: #e2e8f0; border-bottom: 3px solid #cbd5e1;">
                    <tr style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px; color: #334155;">
                        <th style="padding: 16px 8px; width: 22%;">T/A</th>
                        <th style="padding: 16px 8px; width: 22%;">DP</th>
                        <th style="padding: 16px 8px; width: 22%;">EMI</th>
                        <th style="padding: 16px 8px; width: 14%;">MONTHS</th>
                        <th style="padding: 16px 8px; width: 20%;">PER DAY</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>
        </div>
        <div style="padding: 16px; background: #f1f5f9; text-align: center; font-size: 14px; font-weight: 800; color: #64748b; border-top: 2px solid #e2e8f0;">
            ✨ Bajaj Finance Adhikrut Aakarshak EMI Schemes | Niyam va Aati Lagu
        </div>
    </div>`;

    document.body.appendChild(quoteDiv);

    html2canvas(quoteDiv, { scale: 2, useCORS: true }).then(canvas => {
        document.body.removeChild(quoteDiv);
        let imgDataUrl = canvas.toDataURL("image/png");
        document.getElementById('generatedImage').src = imgDataUrl;
        document.getElementById('imageViewerModal').style.display = 'flex';
        showToast("Portrait Quotation Image tayar jhali!", "success");
    });
}

// 📦 CUSTOM SCHEMES STAGING MODAL CONTROLS (Master Data TSV Copy)
function openCustomSchemesStagingModal() {
    renderStagingTable();
    document.getElementById('customSchemesStagingModal').style.display = 'flex';
}

function closeCustomSchemesStagingModal() {
    document.getElementById('customSchemesStagingModal').style.display = 'none';
}

function renderStagingTable() {
    let tbody = document.getElementById('stagingTableBody');
    if(!tbody) return;

    if(customStagingSchemes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:15px; color:#888;">Konthihi manual scheme pending nahi.</td></tr>`;
        return;
    }

    tbody.innerHTML = customStagingSchemes.map((s, idx) => `
        <tr style="border-bottom:1px solid #eee;">
            <td style="padding:6px; font-weight:bold;">${s.model}</td>
            <td style="padding:6px; text-align:center;">${s.tenure}/${s.advEmi}</td>
            <td style="padding:6px; text-align:center;">${s.dbd}%</td>
            <td style="padding:6px; text-align:center;">₹${s.pf}</td>
            <td style="padding:6px; text-align:center;">${s.roi}%</td>
            <td style="padding:6px; text-align:center;">${s.fixedEmi > 0 ? '₹'+s.fixedEmi : '-'}</td>
            <td style="padding:6px; text-align:center;"><button onclick="deleteStagingScheme(${idx})" style="background:var(--danger); color:white; border:none; padding:2px 6px; border-radius:3px; cursor:pointer;">✖</button></td>
        </tr>
    `).join('');
}

function deleteStagingScheme(idx) {
    customStagingSchemes.splice(idx, 1);
    saveCustomStagingSchemes();
    renderStagingTable();
    recalcCurrentModel();
    showToast("Scheme Staging madhun delete jhali!", "success");
}

function clearAllStagingSchemes() {
    showCustomConfirm("Sarv Staging schemes delete karaychya?", () => {
        customStagingSchemes = [];
        saveCustomStagingSchemes();
        renderStagingTable();
        recalcCurrentModel();
        showToast("Staging rikama jhala!", "success");
    });
}

function copyStagingDataForExcel() {
    if(customStagingSchemes.length === 0) {
        showToast("Copy karnyasathi schemes nahit!", "warning");
        return;
    }

    let tsv = "MODEL\tBRAND\tCATEGORY\tTOTAL TENURE\tADVANCE EMI\tDBD%\tPF\tROI%\tFIXED EMI\n";
    customStagingSchemes.forEach(s => {
        tsv += `${s.model}\t${s.brand}\t${s.category}\t${s.tenure}\t${s.advEmi}\t${s.dbd}\t${s.pf}\t${s.roi}\t${s.fixedEmi}\n`;
    });

    fallbackCopy(tsv, () => {
        showToast("Master Data TSV format madhe copy jhala! Excel madhe paste kara.", "success");
    });
}

// 🚀 TRANSFER TO FINAL SCREEN
async function transferDictModelToFinalQueue() {
    if (activeCustomerIndex === -1 || !customerQueue[activeCustomerIndex]) {
        showToast("Aadhi customer select kinva add kara!", "error");
        return;
    }

    if (dictBasketProducts.length === 0 && currentViewedModel) {
        addCurrentModelToDictBasket();
    }

    if (dictBasketProducts.length === 0) {
        showToast("Transfer karnyasathi product nahi!", "warning");
        return;
    }

    let cust = customerQueue[activeCustomerIndex];
    if (!cust.products) cust.products = [];

    dictBasketProducts.forEach(prod => {
        let rawMaster = db_records.filter(r => r.model === prod.name);
        let rawCustom = customStagingSchemes.filter(s => s.model === prod.name);
        let combined = [...rawMaster, ...rawCustom];

        let ltvLimit = cust.ltv || 100;
        let eligible = combined.filter(s => s.fixedEmi > 0 || (s.tenure > 0 && ((s.tenure - s.advEmi)/s.tenure)*100 <= ltvLimit));
        
        let uniqueSchemes = [];
        let seen = new Set();
        eligible.forEach(s => {
            let key = `${s.tenure}_${s.advEmi}_${s.fixedEmi}_${s.minLoan}_${s.maxLoan}`;
            if(!seen.has(key)) { seen.add(key); s.inactive = false; uniqueSchemes.push(s); }
        });

        let pIndex = cust.products.findIndex(p => p.name === prod.name);
        let prodObj = {
            name: prod.name,
            isNonTieup: prod.name.startsWith(SPECIAL_MODEL),
            schemes: uniqueSchemes,
            category: prod.category,
            inputs: {
                mrp: prod.inv,
                inv: prod.inv,
                cap: prod.cap || cust.cap || "",
                target: prod.target || "",
                gtl: prod.gtl || 0,
                rfc: prod.rfc || 0,
                exw: prod.exw || 0,
                margin: prod.margin || 0,
                dealer: 0,
                surch: 0,
                manualLoans: {}
            },
            isManual: false
        };

        if (pIndex !== -1) {
            cust.products[pIndex] = prodObj;
        } else {
            cust.products.push(prodObj);
            if (!cust.sortConfigs) cust.sortConfigs = [];
            cust.sortConfigs.push({ key: 'default_ltv', dir: 'desc' });
        }
    });

    dictBasketProducts = [];
    renderDictBasketChips();
    await saveQueueToLocal();

    closeDictionaryModal();
    goToFinalPage();
    showToast("Products final screen var transfer jhale!", "success");
}