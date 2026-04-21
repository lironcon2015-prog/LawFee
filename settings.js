/**
 * settings.js — LexLedger Settings View
 * Displays current version, supports manual version update,
 * and checks for newer versions against GitHub releases.
 */

const Settings = (() => {

  const CURRENT_VERSION = '1.0.0';
  const GITHUB_RELEASES = 'https://api.github.com/repos/lironcon2015-prog/LawFee/releases/latest';
  // ↑ Replace with your actual GitHub repo URL if you publish there.
  //   If not using GitHub, the "check updates" button will show a message accordingly.

  // ── Init ───────────────────────────────────────────────
  async function init() {
    document.getElementById('btn-check-update').addEventListener('click', checkForUpdates);
    document.getElementById('btn-set-version').addEventListener('click', openSetVersionModal);
    await render();
  }

  // ── Render ─────────────────────────────────────────────
  async function render() {
    // Load stored version (or fall back to built-in constant)
    const stored = await DB.settings.get('app_version');
    const version = stored || CURRENT_VERSION;

    const storedDate = await DB.settings.get('app_version_date');
    const dateLabel  = storedDate
      ? new Date(storedDate).toLocaleDateString('he-IL')
      : '—';

    const verEl  = document.getElementById('settings-current-version');
    const dateEl = document.getElementById('settings-update-date');
    if (verEl)  verEl.textContent  = 'v' + version;
    if (dateEl) dateEl.textContent = dateLabel;

    _hideStatus();
  }

  // ── Check for Updates ──────────────────────────────────
  async function checkForUpdates() {
    const btn = document.getElementById('btn-check-update');
    if (btn) { btn.textContent = '⏳ בודק…'; btn.disabled = true; }

    try {
      const res  = await fetch(GITHUB_RELEASES);
      if (res.status === 404) {
        _showStatus('לא נמצאו releases בריפו — צור Release ב-GitHub כדי לאפשר בדיקת עדכונים.', 'warning');
        return;
      }
      if (!res.ok) throw new Error('שגיאת רשת');

      const data   = await res.json();
      const latest = (data.tag_name || '').replace(/^v/, '');
      const stored = (await DB.settings.get('app_version')) || CURRENT_VERSION;

      if (!latest) throw new Error('לא נמצאה גרסה');

      if (_versionGt(latest, stored)) {
        _showStatus(
          `✦ גרסה חדשה זמינה: <strong>v${latest}</strong> — <a href="${data.html_url}" target="_blank" style="color:var(--color-gold)">הורד כאן</a>`,
          'info'
        );
      } else {
        _showStatus('✓ המערכת מעודכנת לגרסה האחרונה', 'success');
      }
    } catch (err) {
      _showStatus('לא ניתן לבדוק עדכונים כעת — המערכת עובדת מקומית ללא חיבור לשרת עדכונים.', 'warning');
    } finally {
      if (btn) { btn.textContent = '🔍 בדוק עדכונים'; btn.disabled = false; }
    }
  }

  // ── Manual Version Set ─────────────────────────────────
  function openSetVersionModal() {
    const bodyHTML = `
      <div class="form-group">
        <label class="form-label" for="f-version-input">מספר גרסה חדש</label>
        <input type="text" id="f-version-input" class="form-input"
          placeholder="לדוגמה: 1.2.0"
          pattern="[0-9]+\\.[0-9]+\\.[0-9]+" />
        <small style="color:var(--text-muted);font-size:0.75rem;margin-top:4px;display:block">
          פורמט: major.minor.patch — לדוגמה 1.2.0
        </small>
      </div>`;

    UI.openModal({
      title: 'עדכון גרסה ידני',
      bodyHTML,
      confirmLabel: 'שמור גרסה',
      onConfirm: async () => {
        const val = document.getElementById('f-version-input').value.trim();
        if (!val) throw new Error('יש להזין מספר גרסה');
        if (!/^\d+\.\d+\.\d+$/.test(val)) throw new Error('פורמט לא תקין — השתמש בפורמט x.y.z');

        await DB.settings.set('app_version',      val);
        await DB.settings.set('app_version_date', new Date().toISOString());

        UI.toast(`גרסה עודכנה ל־v${val}`, 'success');
        UI.closeModal();
        await render();
      },
    });

    setTimeout(() => {
      const el = document.getElementById('f-version-input');
      if (el) el.focus();
    }, 60);
  }

  // ── Helpers ────────────────────────────────────────────
  function _showStatus(html, type) {
    const el = document.getElementById('settings-update-status');
    if (!el) return;
    const colors = {
      success: { bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.25)', color: '#4ade80' },
      info:    { bg: 'rgba(212,175,55,0.08)',  border: 'rgba(212,175,55,0.25)',  color: 'var(--color-gold)' },
      warning: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)', color: '#fbbf24' },
    };
    const s = colors[type] || colors.info;
    el.style.display    = 'block';
    el.style.background = s.bg;
    el.style.border     = `1px solid ${s.border}`;
    el.style.color      = s.color;
    el.innerHTML        = html;
  }

  function _hideStatus() {
    const el = document.getElementById('settings-update-status');
    if (el) el.style.display = 'none';
  }

  /** Returns true if vA > vB (semver comparison) */
  function _versionGt(vA, vB) {
    const a = vA.split('.').map(Number);
    const b = vB.split('.').map(Number);
    for (let i = 0; i < 3; i++) {
      if ((a[i] || 0) > (b[i] || 0)) return true;
      if ((a[i] || 0) < (b[i] || 0)) return false;
    }
    return false;
  }

  return { init, render };
})();

window.Settings = Settings;
