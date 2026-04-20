/**
 * ui.js — LexLedger UI Helpers
 * Modals, toasts, formatters, shared DOM utilities
 */

const UI = (() => {

  // ── Number Formatters ──────────────────────────────────
  const ILS = new Intl.NumberFormat('he-IL', {
    style: 'currency', currency: 'ILS',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const NUM = new Intl.NumberFormat('he-IL', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  function formatCurrency(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return ILS.format(n);
  }

  function formatNumber(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return NUM.format(n);
  }

  function formatPct(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return parseFloat(n).toFixed(1) + '%';
  }

  const MONTHS_HE = [
    '', 'ינואר','פברואר','מרץ','אפריל','מאי','יוני',
    'יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'
  ];

  const MONTHS_SHORT = [
    '', 'ינו','פבר','מרץ','אפר','מאי','יונ',
    'יול','אוג','ספט','אוק','נוב','דצמ'
  ];

  function monthName(m, short = false) {
    const list = short ? MONTHS_SHORT : MONTHS_HE;
    return list[parseInt(m, 10)] || '—';
  }

  function caseTypeBadge(type) {
    const map = {
      'שוטף':    '<span class="badge badge-ongoing">שוטף</span>',
      'ליטיגציה':'<span class="badge badge-litigation">ליטיגציה</span>',
      'עסקה':    '<span class="badge badge-deal">עסקה</span>',
    };
    return map[type] || `<span class="badge">${type || '—'}</span>`;
  }

  function sourceBadge(source) {
    const map = {
      'pdf':    '<span class="badge badge-pdf">PDF</span>',
      'manual': '<span class="badge badge-manual">ידני</span>',
      'import': '<span class="badge badge-import">ייבוא</span>',
    };
    return map[source] || `<span class="badge">${source || '—'}</span>`;
  }

  // ── Toast ──────────────────────────────────────────────
  const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };

  function toast(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${message}</span>`;
    container.appendChild(el);
    setTimeout(() => {
      el.style.animation = 'toastOut 0.25s ease forwards';
      setTimeout(() => el.remove(), 260);
    }, duration);
  }

  // ── Generic Modal ──────────────────────────────────────
  let _modalConfirmFn = null;

  function openModal({ title, bodyHTML, confirmLabel = 'שמור', cancelLabel = 'ביטול', onConfirm, wide = false }) {
    const overlay = document.getElementById('modal-overlay');
    const modal   = document.getElementById('modal');
    document.getElementById('modal-title').textContent   = title;
    document.getElementById('modal-body').innerHTML      = bodyHTML;
    document.getElementById('modal-confirm').textContent = confirmLabel;
    document.getElementById('modal-cancel').textContent  = cancelLabel;
    modal.style.maxWidth = wide ? '680px' : '520px';
    _modalConfirmFn = onConfirm || null;
    overlay.classList.remove('hidden');
  }

  function closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    _modalConfirmFn = null;
  }

  // Wire modal close/confirm buttons once
  function _initModal() {
    document.getElementById('modal-close').addEventListener('click', closeModal);
    document.getElementById('modal-cancel').addEventListener('click', closeModal);
    document.getElementById('modal-overlay').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal-overlay')) closeModal();
    });
    document.getElementById('modal-confirm').addEventListener('click', async () => {
      if (_modalConfirmFn) {
        try {
          await _modalConfirmFn();
        } catch(err) {
          toast(err.message || 'שגיאה', 'error');
        }
      }
    });
  }

  // ── Confirm Dialog ─────────────────────────────────────
  function confirm(message, onConfirm) {
    openModal({
      title: 'אישור פעולה',
      bodyHTML: `<p style="color:var(--text-secondary);font-size:0.95rem;">${message}</p>`,
      confirmLabel: 'אישור',
      onConfirm,
    });
  }

  // ── Year Selector Helper ───────────────────────────────
  async function populateYearSelect(selectId, selectedYear) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const years = await DB.settings.getKnownYears();
    // always include current year
    const curY = new Date().getFullYear();
    if (!years.includes(curY)) years.unshift(curY);

    sel.innerHTML = years
      .sort((a, b) => b - a)
      .map(y => `<option value="${y}" ${y == selectedYear ? 'selected' : ''}>${y}</option>`)
      .join('');
  }

  // ── Populate Clients Select ────────────────────────────
  async function populateClientSelect(selectId, includeAll = true, selectedId = null) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const clients = await DB.clients.getAll();
    let html = includeAll ? '<option value="">כל הלקוחות</option>' : '<option value="">בחר לקוח…</option>';
    clients.forEach(c => {
      html += `<option value="${c.id}" ${c.id == selectedId ? 'selected' : ''}>${c.name}</option>`;
    });
    sel.innerHTML = html;
  }

  // ── Populate Cases Select (filtered by client) ─────────
  async function populateCaseSelect(selectId, clientId = null, selectedId = null) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    let caseList;
    if (clientId) {
      caseList = await DB.cases.getByClient(parseInt(clientId));
    } else {
      caseList = await DB.cases.getAll();
    }
    let html = '<option value="">בחר תיק…</option>';
    caseList.forEach(c => {
      html += `<option value="${c.id}" data-rate="${c.commissionRate}" ${c.id == selectedId ? 'selected' : ''}>${c.caseNumber} — ${c.description}</option>`;
    });
    sel.innerHTML = html;
  }

  // ── Loading overlay for a container ───────────────────
  function setLoading(el, on) {
    if (!el) return;
    if (on) {
      el.style.opacity = '0.5';
      el.style.pointerEvents = 'none';
    } else {
      el.style.opacity = '';
      el.style.pointerEvents = '';
    }
  }

  // ── Empty state row ────────────────────────────────────
  function emptyRow(cols, message = 'אין נתונים להצגה') {
    return `<tr><td colspan="${cols}" class="empty-state">${message}</td></tr>`;
  }

  // ── Build a standard <form> inside modal body ──────────
  function buildForm(fields) {
    // fields: [{ id, label, type, value, options, required, step, min, max }]
    return fields.map(f => {
      let input;
      if (f.type === 'select') {
        const opts = (f.options || [])
          .map(o => `<option value="${o.value}" ${o.value == f.value ? 'selected' : ''}>${o.label}</option>`)
          .join('');
        input = `<select id="${f.id}" class="form-input">${opts}</select>`;
      } else if (f.type === 'textarea') {
        input = `<textarea id="${f.id}" class="form-input" rows="3">${f.value || ''}</textarea>`;
      } else {
        const extras = [
          f.step    ? `step="${f.step}"`   : '',
          f.min     ? `min="${f.min}"`     : '',
          f.max     ? `max="${f.max}"`     : '',
          f.required ? 'required'          : '',
        ].filter(Boolean).join(' ');
        input = `<input type="${f.type || 'text'}" id="${f.id}" class="form-input" value="${f.value !== undefined ? f.value : ''}" ${extras} />`;
      }
      return `
        <div class="form-group">
          <label class="form-label" for="${f.id}">${f.label}${f.required ? ' *' : ''}</label>
          ${input}
        </div>`;
    }).join('');
  }

  // ── Read form values ───────────────────────────────────
  function readForm(fieldIds) {
    const result = {};
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) result[id] = el.value;
    });
    return result;
  }

  // ── Init ───────────────────────────────────────────────
  function init() {
    _initModal();
  }

  return {
    formatCurrency, formatNumber, formatPct,
    monthName, MONTHS_HE, MONTHS_SHORT,
    caseTypeBadge, sourceBadge,
    toast,
    openModal, closeModal, confirm,
    populateYearSelect, populateClientSelect, populateCaseSelect,
    setLoading, emptyRow,
    buildForm, readForm,
    init,
  };
})();

window.UI = UI;
