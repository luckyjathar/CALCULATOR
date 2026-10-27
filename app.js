function recalcModel(pIdx) {
    let c = customerQueue[activeCustomerIndex]; 
    let prod = current_products[pIdx];
    let limit = c?.limit || 0; 
    let type = c?.type || 'NEW'; 
    let fee = (type === 'EMI CARD') ? 270 : (type === 'W/O CARD' ? 320 : 850);
    let inp = prod.inputs || {}; 
    let totalFees = fee + (parseFloat(inp.margin) || 0) + (parseFloat(inp.dealer) || 0); 
    let currentLimit = limit > 0 ? limit : 9999999; 
    let inputMrp = parseFloat(inp.mrp) || 0; 
    let inputInv = parseFloat(inp.inv) || 0; 

    if (inputInv <= 0) {
        document.getElementById(`cards_${pIdx}`).innerHTML = `<div style="text-align:center; color:var(--danger); padding:15px; font-weight:700;">⚠️ Tap '⚙️ Edit Inv' to calculate.</div>`;
        return;
    }

    let effectivePrice = inputInv; 
    let loanCapPrice = (inputMrp > 0 && inputInv > 0) ? Math.min(inputMrp, inputInv) : effectivePrice;
    let activeCap = parseFloat(inp.cap) || parseFloat(c?.cap) || 0;
    
    // Rule: 50% Minimum Loan Boundary
    let minAllowedLoanByInvoice = effectivePrice * 0.50;

    prod.calculatedData = prod.schemes.map((s, dIdx) => {
        let isFixed = s.fixedEmi > 0; 
        let loan = 0, nbfcMaxL = 0, dpExact = 0, dpRounded = 0, emi = 0, inst = 0, currentTenure = s.tenure; 
        nbfcMaxL = (currentLimit * s.tenure) / (s.tenure - s.advEmi || 1); 
        let dbdRate = (s.dbd * 1.18 / 100); 
        let roiRate = s.roi / 1200; 
        let roiRateDP = roiRate * s.advEmi; 
        
        let dynamicPf = s.pf;
        if (prod.isNonTieup) { 
            let slabPf = getNonTieupPfValue(prod.category, effectivePrice); 
            if (slabPf !== null) { dynamicPf = slabPf; } 
        }

        let insTot = (parseFloat(inp.gtl) || 0) + (parseFloat(inp.rfc) || 0) + (parseFloat(inp.exw) || 0);

        if (isFixed) {
            let maxRemainingEmis = Math.floor(currentLimit / s.fixedEmi); 
            let maxTotalTenure = maxRemainingEmis + s.advEmi; 
            nbfcMaxL = maxTotalTenure * s.fixedEmi; 

            currentTenure = Math.floor(effectivePrice / s.fixedEmi); 
            if (currentTenure > maxTotalTenure) currentTenure = maxTotalTenure; 
            if (currentTenure < 1) currentTenure = 1; 
            loan = currentTenure * s.fixedEmi; 
            if (loan > loanCapPrice) loan = loanCapPrice;

            // Rule: Target DP Reverse Calculation (Fixed)
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

            // Rule: Target DP Reverse Calculation (Regular)
            if (parseFloat(inp.target) > 0) { 
                let advRate = s.advEmi / s.tenure; 
                let numerator = parseFloat(inp.target) - effectivePrice - dynamicPf - totalFees; 
                let denominator = advRate + dbdRate + roiRateDP - 1; 
                let solvedLoan = numerator / denominator; 
                loan = Math.min(loan, Math.max(0, Math.floor(solvedLoan))); 
            } 
        }

        // Rule: Manual Override boundary checks
        let isManuallyOverridden = (inp.manualLoans && inp.manualLoans[dIdx] !== undefined);
        if (isManuallyOverridden) {
            loan = inp.manualLoans[dIdx];
            if (isFixed) currentTenure = Math.floor(loan / s.fixedEmi) || 1;
        }

        if (!isFixed && loan > effectivePrice) loan = effectivePrice;

        let isCapBreach = false;

        if (isFixed) {
            inst = currentTenure - s.advEmi; if (inst < 1) inst = 1; 
            let roiInEmi = loan * roiRate; 
            emi = s.fixedEmi + (insTot / inst) + roiInEmi;
            if (activeCap > 0 && Math.round(emi) > activeCap) isCapBreach = true;
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + (s.fixedEmi * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        } else {
            inst = s.tenure - s.advEmi; if (inst < 1) inst = 1; 
            let baseEmi = loan / s.tenure;
            // Rule: Minimum EMI 900
            if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 

            let roiInEmi = loan * roiRate; 
            emi = baseEmi + (insTot / inst) + roiInEmi;

            // Rule: EMI Capping Reverse Calculation
            if (activeCap > 0 && emi > activeCap) { 
                let maxLoanForCap = Math.floor((activeCap - (insTot / inst)) / ((1 / s.tenure) + roiRate));
                if (maxLoanForCap < 0) maxLoanForCap = 0;
                if (maxLoanForCap > effectivePrice) maxLoanForCap = effectivePrice;
                loan = maxLoanForCap;

                baseEmi = loan / s.tenure;
                if (baseEmi > 0 && baseEmi < 900) baseEmi = 900; 
                roiInEmi = loan * roiRate; 
                emi = baseEmi + (insTot / inst) + roiInEmi; 

                if (Math.round(emi) > activeCap || loan <= 0) isCapBreach = true;
            } 
            let roiInDp = loan * roiRateDP; 
            dpExact = effectivePrice - loan + ((loan / s.tenure) * s.advEmi) + (loan * dbdRate) + dynamicPf + totalFees + roiInDp;
        }

        // Rule: DP Rounding
        if (dpExact > 0) dpRounded = Math.ceil(dpExact / 10) * 10; else dpRounded = dpExact; 
        
        // Restored missing math calculations
        let extraVal = ((emi * inst) + dpRounded) - effectivePrice; 
        let dbdAmt = loan * dbdRate; 
        let roiAmt = (loan * roiRateDP) + (loan * roiRate * inst); 
        let marginMoney = parseFloat(inp.margin) || 0; 
        let roundupAdj = (dpRounded > dpExact) ? (dpRounded - dpExact) : 0; 
        let netDisb = effectivePrice - dpRounded - marginMoney - roundupAdj;

        let curLTV = currentTenure > 0 ? ((currentTenure - s.advEmi) / currentTenure) * 100 : 0; 
        
        // Final Rule enforcement checks
        let isInv50Breach = loan < minAllowedLoanByInvoice;
        let isRejected = isInv50Breach || isCapBreach || (curLTV > (c.ltv || 100)) || (prod.isNonTieup && (loan < s.minLoan || loan > s.maxLoan));

        return { 
            ...s, dIdx, pf: dynamicPf, currentTenure, loan, dp: dpRounded, emi, inst, daily: emi / 30, 
            curLTV, extra: extraVal, dbdAmt, roiAmt, netDisb, isRejected 
        };
    });

    renderCards(pIdx);
}

function renderCards(pIdx) {
    let conf = sortConfigs[pIdx] || {key: 'dp', dir: 1}; 
    let prod = current_products[pIdx];
    let vis = prod.calculatedData.sort((a,b) => a.isRejected - b.isRejected || (a.dp - b.dp) || (a.emi - b.emi));
    
    document.getElementById(`cards_${pIdx}`).innerHTML = vis.map(d => {
        // Formatted strings for accurate data display
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

            <!-- Detailed Breakdowns Restored in UI -->
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
    let prod = current_products[pIdx]; 
    if(!prod.inputs.manualLoans) prod.inputs.manualLoans = {};
    
    let loanVal = parseFloat(val) || 0;
    let effP = parseFloat(prod.inputs.inv) || 0;
    
    // Strict Input Enforcements for Manual Edits
    if(loanVal < effP * 0.50) {
        loanVal = effP * 0.50;
        showToast("Loan cannot be less than 50% of Invoice!", "error");
    }
    if(loanVal > effP) {
        loanVal = effP;
        showToast("Loan cannot exceed Invoice Value!", "warning");
    }
    
    prod.inputs.manualLoans[dIdx] = loanVal; 
    recalcModel(pIdx); 
    saveQueueToLocal();
}
