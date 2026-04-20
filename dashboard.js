/**
 * dashboard.js — LexLedger Dashboard View
 * KPI cards, monthly breakdown table, per-client breakdown table.
 */

const Dashboard = (() => {

  let _year = new Date().getFullYear();

  // ── Init ───────────────────────────────────────────────
  async function init() {
    // Populate year selector
    await UI.populateYearSelect('dashboard-year', _year);

    document.getElementById('dashboard-year').addEventListener('change', async (e) => {
      _year = parseInt(e.target.value, 10);
      await render();
    });

    await render();
  }

  // ── Render ─────────────────────────────────────────────
  async function render() {
    await Promise.all([
      renderKPIs(),
      renderMonthlyTable(),
      renderClientBreakdown(),
    ]);
  }

  // ── KPI Cards ──────────────────────────────────────────
  async function renderKPIs() {
    const ledger = await DB.balances.computeLedger(_year);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = UI.formatNumber(val);
    };

    set('kpi-opening',     ledger.openingBalance);
    set('kpi-commissions', ledger.totalCommissions);
    set('kpi-payments',    ledger.totalPayments);

    const balEl = document.getElementById('kpi-balance');
    if (balEl) {
      balEl.textContent = UI.formatNumber(ledger.closingBalance);
      balEl.className = 'kpi-value ' + (ledger.closingBalance >= 0 ? '' : 'negative');
    }
  }

  // ── Monthly Breakdown ──────────────────────────────────
  async function renderMonthlyTable() {
    const tbody = document.getElementById('monthly-tbody');
    if (!tbody) return;

    const [invByMonth, payByMonth, ledger] = await Promise.all([
      DB.invoices.byMonthForYear(_year),
      DB.payments.byMonthForYear(_year),
      DB.balances.computeLedger(_year),
    ]);

    let runningBalance = ledger.openingBalance;
    let totalAmt  = 0;
    let totalComm = 0;
    let totalPay  = 0;
    let rows = '';

    for (let m = 1; m <= 12; m++) {
      const inv = invByMonth[m] || { amount: 0, commission: 0 };
      const pay = payByMonth[m]  || 0;
      runningBalance += inv.commission - pay;
      totalAmt  += inv.amount;
      totalComm += inv.commission;
      totalPay  += pay;

      const hasData = inv.amount > 0 || pay > 0;
      rows += `<tr class="${!hasData ? 'text-muted' : ''}">
        <td class="month-label">${UI.monthName(m)}</td>
        <td class="num">${inv.amount  > 0 ? UI.formatNumber(inv.amount)     : '—'}</td>
        <td class="num text-gold">${inv.commission > 0 ? UI.formatNumber(inv.commission) : '—'}</td>
        <td class="num positive">${pay > 0 ? UI.formatNumber(pay) : '—'}</td>
        <td class="num ${runningBalance >= 0 ? '' : 'negative'}">${UI.formatNumber(runningBalance)}</td>
      </tr>`;
    }

    // Summary row
    rows += `<tr class="summary-row">
      <td>סה"כ</td>
      <td class="num">${UI.formatNumber(totalAmt)}</td>
      <td class="num">${UI.formatNumber(totalComm)}</td>
      <td class="num">${UI.formatNumber(totalPay)}</td>
      <td class="num">${UI.formatNumber(ledger.closingBalance)}</td>
    </tr>`;

    tbody.innerHTML = rows;
  }

  // ── Per-Client Breakdown ────────────────────────────────
  async function renderClientBreakdown() {
    const tbody = document.getElementById('client-breakdown-tbody');
    if (!tbody) return;

    const [allInvoices, allCases, allClients] = await Promise.all([
      DB.invoices.getByYear(_year),
      DB.cases.getAll(),
      DB.clients.getAll(),
    ]);

    if (!allInvoices.length) {
      tbody.innerHTML = UI.emptyRow(5, 'אין נתוני חשבוניות לשנה זו');
      return;
    }

    const clientMap = {};
    allClients.forEach(c => { clientMap[c.id] = c.name; });

    const caseMap = {};
    allCases.forEach(c => { caseMap[c.id] = c; });

    // Group by caseId
    const caseAgg = {};
    allInvoices.forEach(inv => {
      if (!caseAgg[inv.caseId]) {
        caseAgg[inv.caseId] = { amount: 0, commission: 0 };
      }
      caseAgg[inv.caseId].amount     += inv.amount;
      caseAgg[inv.caseId].commission += inv.commission;
    });

    // Sort by commission desc
    const sorted = Object.entries(caseAgg)
      .map(([caseId, agg]) => {
        const c = caseMap[parseInt(caseId)];
        return { ...agg, caseId, caseRec: c };
      })
      .filter(r => r.caseRec)
      .sort((a, b) => b.commission - a.commission);

    let totalAmt  = 0;
    let totalComm = 0;
    let rows = '';

    sorted.forEach(r => {
      const c = r.caseRec;
      totalAmt  += r.amount;
      totalComm += r.commission;
      rows += `<tr>
        <td>${clientMap[c.clientId] || '—'}</td>
        <td>
          <span style="font-family:var(--font-mono);font-size:0.8rem;color:var(--text-muted)">${c.caseNumber}</span>
          ${c.description && c.description !== c.caseNumber ? ` <span style="color:var(--text-secondary)">${c.description}</span>` : ''}
        </td>
        <td class="num">${UI.formatPct(c.commissionRate)}</td>
        <td class="num">${UI.formatNumber(r.amount)}</td>
        <td class="num text-gold">${UI.formatNumber(r.commission)}</td>
      </tr>`;
    });

    rows += `<tr class="summary-row">
      <td colspan="3">סה"כ</td>
      <td class="num">${UI.formatNumber(totalAmt)}</td>
      <td class="num">${UI.formatNumber(totalComm)}</td>
    </tr>`;

    tbody.innerHTML = rows;
  }

  return { init, render };
})();

window.Dashboard = Dashboard;
