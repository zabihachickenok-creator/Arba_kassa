'use strict';

/* =========================================================================
   ARBA KASSA PWA
   Flutter main.dart ilovasining veb (PWA) ko'chirmasi.
   Barcha ekran, mantiq va brending saqlangan.
   ========================================================================= */

const CATEGORIES = ['Kassa', 'Kliklar', 'Zabiha Chicken', 'Arba Chicken', 'Valyuta'];
const TABS = ['Bosh menyu'].concat(CATEGORIES);
const STORE_KEY = 'arba_kassa_v1';

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
                'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'];

const CAT_META = {
  'Kassa':          { icon: '💵', color: '#C62828' },
  'Kliklar':        { icon: '💳', color: '#1976D2' },
  'Zabiha Chicken': { icon: '🍽️', color: '#EF6C00' },
  'Arba Chicken':   { icon: '🛒', color: '#B71C1C' },
  'Valyuta':        { icon: '💲', color: '#00796B' }
};

const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

/* ---------------------------- helpers ---------------------------- */

function uid() {
  return 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

function todayISO(d) {
  const t = d || new Date();
  return t.getFullYear() + '-' +
    String(t.getMonth() + 1).padStart(2, '0') + '-' +
    String(t.getDate()).padStart(2, '0');
}

function isoToDate(iso) {
  const p = String(iso).split('-');
  return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function formatDate(iso) {
  const d = isoToDate(iso);
  return d.getDate() + '-' + MONTHS[d.getMonth()] + '-' + d.getFullYear();
}

function nowTime() {
  const t = new Date();
  return String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
}

/* 1500000 -> "1'500'000" */
function group(n) {
  const neg = n < 0;
  const s = String(Math.round(Math.abs(n)));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += "'";
    out += s[i];
  }
  return (neg ? '-' : '') + out;
}

function money(n, isValyuta) {
  return isValyuta ? '$' + group(n) : group(n) + " so'm";
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.remove('show'), 2200);
}

/* ---------------------------- state ---------------------------- */

let state = {
  data: {},
  selectedDate: todayISO(),
  activeTab: 0
};

function seed() {
  const t = todayISO();
  const d = {};
  CATEGORIES.forEach((c) => { d[c] = []; });
  d['Kassa'] = [
    { id: uid(), date: t, time: '09:15', income: 1500000, expense: 0, description: 'Ali aka (Kirim)' },
    { id: uid(), date: t, time: '22:30', income: 0, expense: 50000, description: 'Choychaqqa' }
  ];
  return d;
}

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.data && typeof parsed.data === 'object') {
        state.data = parsed.data;
        CATEGORIES.forEach((c) => { if (!Array.isArray(state.data[c])) state.data[c] = []; });
        return;
      }
    }
  } catch (e) {
    console.warn('Saqlangan ma\'lumotni o\'qishda xatolik:', e);
  }
  state.data = seed();
  save();
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ data: state.data, savedAt: new Date().toISOString() }));
  } catch (e) {
    console.warn('Saqlashda xatolik:', e);
    toast('Saqlashda xatolik yuz berdi');
  }
}

/* ---------------------------- selectors ---------------------------- */

function itemsFor(cat) {
  const list = (state.data[cat] || []).filter((it) => it.date === state.selectedDate);
  list.sort((a, b) => {
    const am = Number(a.time.slice(0, 2)) * 60 + Number(a.time.slice(3, 5));
    const bm = Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3, 5));
    return am - bm;
  });
  return list;
}

function balanceFor(cat) {
  return itemsFor(cat).reduce((s, it) => s + (Number(it.income) || 0) - (Number(it.expense) || 0), 0);
}

/* ---------------------------- render ---------------------------- */

function renderTabs() {
  $('#tabs').innerHTML = TABS.map((t, i) =>
    '<button class="tab' + (i === state.activeTab ? ' active' : '') + '" data-tab="' + i + '">' +
    esc(t) + '</button>'
  ).join('');
  const active = $('.tab.active');
  if (active && active.scrollIntoView) {
    active.scrollIntoView({ block: 'nearest', inline: 'center' });
  }
}

function renderHeader() {
  $('#dateLabel').textContent = formatDate(state.selectedDate);
  $('#dateInput').value = state.selectedDate;
}

function renderView() {
  const view = $('#view');
  const bar = $('#bottomBar');

  if (state.activeTab === 0) {
    bar.classList.add('hidden');
    view.className = 'view';
    view.innerHTML = renderHome();
  } else {
    const cat = TABS[state.activeTab];
    bar.classList.remove('hidden');
    bar.innerHTML =
      '<button class="btn-add" id="addBtn">' +
      '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">' +
      '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line>' +
      '<line x1="8" y1="12" x2="16" y2="12"></line></svg>' +
      'Yangi yozuv qo\'shish</button>';
    $('#addBtn').addEventListener('click', () => openTxModal(cat, null));
    view.className = 'view no-pad';
    view.innerHTML = renderCategory(cat);
  }
}

function renderHome() {
  const caption = formatDate(state.selectedDate) + ' kunlik qoldiqlar:';
  const cards = CATEGORIES.map((cat) => {
    const meta = CAT_META[cat];
    const bal = balanceFor(cat);
    const isValyuta = cat === 'Valyuta';
    const label = isValyuta ? 'Valyuta (USD):' : cat + ':';
    return '' +
      '<div class="card"><div class="balance-row">' +
        '<div class="balance-icon" style="background:' + meta.color + '1F;color:' + meta.color + '">' + meta.icon + '</div>' +
        '<div class="balance-label">' + esc(label) + '</div>' +
        '<div class="balance-value' + (bal < 0 ? ' neg' : '') + '">' + money(bal, isValyuta) + '</div>' +
      '</div></div>';
  }).join('');
  return '<div class="section-caption">' + esc(caption) + '</div>' + cards;
}

function renderCategory(cat) {
  const items = itemsFor(cat);
  const bal = balanceFor(cat);
  const isValyuta = cat === 'Valyuta';

  const rows = items.map((it) => {
    const inTxt = Number(it.income) > 0 ? '+' + group(it.income) : '-';
    const outTxt = Number(it.expense) > 0 ? '-' + group(it.expense) : '-';
    return '' +
      '<div class="tx-row" data-id="' + it.id + '">' +
        '<div class="tx-time">' + esc(it.time) + '</div>' +
        '<div class="tx-in">' + esc(inTxt) + '</div>' +
        '<div class="tx-out">' + esc(outTxt) + '</div>' +
        '<div class="tx-desc"><span>' + esc(it.description) + '</span><span class="pen">✎</span></div>' +
      '</div>';
  }).join('');

  const body = items.length
    ? '<div class="tx-list">' + rows + '</div>'
    : '<div class="empty-state"><div class="big">🗒️</div><div>Ushbu sanada yozuvlar mavjud emas</div></div>';

  return '' +
    '<div class="banner">' +
      '<span class="banner-label">Kunlik Qoldiq:</span>' +
      '<span class="banner-value' + (bal < 0 ? ' neg' : '') + '">' + money(bal, isValyuta) + '</span>' +
    '</div>' +
    '<div class="table-head">' +
      '<div>Vaqt</div><div class="h-in">Kirim</div><div class="h-out">Chiqim</div><div>Izoh</div>' +
    '</div>' +
    body;
}

function renderAll() {
  renderHeader();
  renderTabs();
  renderView();
}

/* ---------------------------- modal ---------------------------- */

function closeModal() {
  const m = $('.modal-backdrop');
  if (m) m.remove();
}

function openModal(html, onMount) {
  closeModal();
  const wrap = document.createElement('div');
  wrap.className = 'modal-backdrop';
  wrap.innerHTML = '<div class="modal">' + html + '</div>';
  wrap.addEventListener('click', (e) => { if (e.target === wrap) closeModal(); });
  $('#modalRoot').appendChild(wrap);
  if (onMount) onMount(wrap);
  return wrap;
}

/* ---- yozuv qo'shish / tahrirlash ---- */
function openTxModal(cat, existing) {
  const isEdit = !!existing;
  let isIncome = existing ? Number(existing.income) > 0 : true;
  let time = existing ? existing.time : nowTime();

  const initialAmount = existing
    ? (Number(existing.income) > 0 ? Number(existing.income) : Number(existing.expense))
    : 0;

  const html = '' +
    '<div class="modal-title">' + esc(cat) + (isEdit ? ': Tahrirlash' : ': Yangi yozuv') + '</div>' +
    '<div class="modal-body">' +
      '<div class="meta-row">' +
        '<span class="meta-date">Sana: ' + esc(formatDate(state.selectedDate)) + '</span>' +
        '<button class="time-btn" id="timeBtn">🕐 <span id="timeLabel">' + esc(time) + '</span></button>' +
      '</div>' +
      '<div class="chips">' +
        '<button class="chip in' + (isIncome ? ' on' : '') + '" id="chipIn">Kirim (Prixod)</button>' +
        '<button class="chip out' + (!isIncome ? ' on' : '') + '" id="chipOut">Chiqim (Rasxod)</button>' +
      '</div>' +
      '<div class="field-label" id="amountLabel">' + (isIncome ? 'Kirim summasi' : 'Chiqim summasi') + '</div>' +
      '<input type="text" inputmode="numeric" id="amountInput" placeholder="0" value="' +
        (initialAmount > 0 ? group(initialAmount).replace(/'/g, '') : '') + '">' +
      '<div class="field-label" id="descLabel">' +
        (isIncome ? 'Kimdan olindi (Izoh)' : 'Kimga berildi (Izoh)') + '</div>' +
      '<input type="text" id="descInput" placeholder="Izoh..." value="' +
        esc(existing ? existing.description : '') + '">' +
      '<div style="height:6px"></div>' +
    '</div>' +
    '<div class="modal-actions">' +
      (isEdit ? '<button class="btn btn-danger" id="delBtn">O\'chirish</button>' : '') +
      '<div class="spacer"></div>' +
      '<button class="btn" id="cancelBtn">Bekor qilish</button>' +
      '<button class="btn btn-primary' + (isIncome ? '' : ' expense') + '" id="saveBtn">Saqlash</button>' +
    '</div>';

  openModal(html, (wrap) => {
    const amountInput = $('#amountInput', wrap);
    const descInput = $('#descInput', wrap);
    const saveBtn = $('#saveBtn', wrap);
    const chipIn = $('#chipIn', wrap);
    const chipOut = $('#chipOut', wrap);
    const amountLabel = $('#amountLabel', wrap);
    const descLabel = $('#descLabel', wrap);
    const timeLabel = $('#timeLabel', wrap);

    function syncKind() {
      chipIn.classList.toggle('on', isIncome);
      chipOut.classList.toggle('on', !isIncome);
      amountLabel.textContent = isIncome ? 'Kirim summasi' : 'Chiqim summasi';
      descLabel.textContent = isIncome ? 'Kimdan olindi (Izoh)' : 'Kimga berildi (Izoh)';
      saveBtn.classList.toggle('expense', !isIncome);
    }

    chipIn.addEventListener('click', () => { isIncome = true; syncKind(); });
    chipOut.addEventListener('click', () => { isIncome = false; syncKind(); });

    /* raqamli kiritishni faqat raqam bilan cheklash */
    amountInput.addEventListener('input', () => {
      const digits = amountInput.value.replace(/[^\d]/g, '');
      amountInput.value = digits ? group(Number(digits)).replace(/'/g, '') : '';
    });

    $('#timeBtn', wrap).addEventListener('click', () => {
      const tmp = document.createElement('input');
      tmp.type = 'time';
      tmp.value = time;
      tmp.style.position = 'fixed';
      tmp.style.opacity = '0';
      tmp.style.pointerEvents = 'none';
      document.body.appendChild(tmp);
      const done = () => {
        if (tmp.value) { time = tmp.value; timeLabel.textContent = time; }
        tmp.remove();
      };
      tmp.addEventListener('change', done);
      tmp.addEventListener('blur', done);
      if (tmp.showPicker) { try { tmp.showPicker(); } catch (e) { tmp.focus(); } } else { tmp.focus(); }
    });

    $('#cancelBtn', wrap).addEventListener('click', closeModal);

    if (isEdit) {
      $('#delBtn', wrap).addEventListener('click', () => {
        state.data[cat] = state.data[cat].filter((x) => x.id !== existing.id);
        save(); closeModal(); renderAll();
        toast('Yozuv o\'chirildi');
      });
    }

    saveBtn.addEventListener('click', () => {
      const amount = Number(amountInput.value.replace(/[^\d]/g, '')) || 0;
      if (amount <= 0) { toast('Summani kiriting'); amountInput.focus(); return; }
      const desc = descInput.value.trim() || (isIncome ? 'Kirim' : 'Chiqim');

      if (isEdit) {
        existing.income = isIncome ? amount : 0;
        existing.expense = isIncome ? 0 : amount;
        existing.description = desc;
        existing.time = time;
      } else {
        state.data[cat].push({
          id: uid(),
          date: state.selectedDate,
          time: time,
          income: isIncome ? amount : 0,
          expense: isIncome ? 0 : amount,
          description: desc
        });
      }
      save(); closeModal(); renderAll();
      toast('Saqlandi');
    });

    setTimeout(() => amountInput.focus(), 120);
  });
}

/* ---- Excel (CSV) hisoboti ---- */
function buildCSV() {
  const lines = ["Bo'lim,Sana,Vaqt,Kirim (Prixod),Chiqim (Rasxod),Izoh"];
  CATEGORIES.forEach((cat) => {
    (state.data[cat] || []).forEach((it) => {
      lines.push([
        cat,
        formatDate(it.date),
        it.time,
        Number(it.income) || 0,
        Number(it.expense) || 0,
        '"' + String(it.description).replace(/"/g, '""') + '"'
      ].join(','));
    });
  });
  return lines.join('\r\n');
}

function openExportModal() {
  const csv = buildCSV();
  const rows = csv.split('\r\n').length - 1;

  const html = '' +
    '<div class="modal-title">Excel (CSV) Hisoboti</div>' +
    '<div class="modal-body">' +
      '<div class="hint">Hisobot muvaffaqiyatli shakllantirildi: ' + rows + ' ta yozuv.</div>' +
      '<div class="csv-box">' + esc(csv) + '</div>' +
      '<div style="height:10px"></div>' +
    '</div>' +
    '<div class="modal-actions">' +
      '<div class="spacer"></div>' +
      '<button class="btn" id="closeBtn">Yopish</button>' +
      '<button class="btn btn-primary" id="dlBtn">CSV yuklab olish</button>' +
    '</div>';

  openModal(html, (wrap) => {
    $('#closeBtn', wrap).addEventListener('click', closeModal);
    $('#dlBtn', wrap).addEventListener('click', () => {
      /* Excelda o'zbekcha harflar to'g'ri chiqishi uchun BOM qo'shamiz */
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'arba_kassa_hisobot_' + todayISO() + '.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
      toast('CSV fayl yuklab olindi');
    });
  });
}

/* ---------------------------- events ---------------------------- */

function bindEvents() {
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    state.activeTab = Number(btn.dataset.tab);
    renderAll();
    $('#view').scrollTop = 0;
  });

  $('#view').addEventListener('click', (e) => {
    const row = e.target.closest('.tx-row');
    if (!row) return;
    const cat = TABS[state.activeTab];
    const item = (state.data[cat] || []).find((x) => x.id === row.dataset.id);
    if (item) openTxModal(cat, item);
  });

  $('#dateBtn').addEventListener('click', () => {
    const inp = $('#dateInput');
    if (inp.showPicker) { try { inp.showPicker(); return; } catch (e) { /* fallback */ } }
    inp.focus(); inp.click();
  });

  $('#dateInput').addEventListener('change', (e) => {
    if (e.target.value) {
      state.selectedDate = e.target.value;
      renderAll();
    }
  });

  $('#exportBtn').addEventListener('click', openExportModal);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ---------------------------- boot ---------------------------- */

function hideSplash() {
  const s = $('#splash');
  if (!s) return;
  s.classList.add('gone');
  setTimeout(() => s.remove(), 500);
}

function boot() {
  const params = new URLSearchParams(location.search);

  load();
  bindEvents();

  /* ?tab=N - manifest shortcut orqali ochilganda */
  if (params.has('tab')) {
    const n = Number(params.get('tab'));
    if (n >= 0 && n < TABS.length) state.activeTab = n;
  }

  renderAll();

  const noSplash = params.get('splash') === '0' || sessionStorage.getItem('arba_splash') === '1';
  if (noSplash) {
    $('#splash').remove();
    $('#app').classList.remove('hidden');
  } else {
    sessionStorage.setItem('arba_splash', '1');
    setTimeout(() => {
      $('#app').classList.remove('hidden');
      hideSplash();
    }, 2600);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}

/* service worker */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('Service worker ro\'yxatdan o\'tdi:', reg.scope))
      .catch((err) => console.warn('Service worker xatoligi:', err));
  });
}
