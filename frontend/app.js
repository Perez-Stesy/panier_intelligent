/* ═══════════════════════════════════════════════════
   PURCHASEFLOW — APP.JS
   Full client-side logic with Django REST backend
   ═══════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────────────
  const API = {
    PRODUCTS: '/api/produits/',
    PURCHASES: '/api/achats/',
    TOP_PRODUCT: '/api/achats/top_produit/',
    BILAN: '/api/achats/bilan/',
  };
  const DEVISE = 'FCFA';

  // ─── STATE ─────────────────────────────────────
  let purchases  = [];   // cache local
  let products   = [];   // cache local
  let deleteTarget = null; // id à supprimer

  // ─── HELPERS ───────────────────────────────────
  function fmt(n) {
    return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ' + DEVISE;
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  }
  function today() {
    return new Date().toISOString().slice(0, 10);
  }
  async function api(method, url, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    // Django CSRF
    const csrf = getCookie('csrftoken');
    if (csrf) opts.headers['X-CSRFToken'] = csrf;
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || `HTTP ${res.status}`);
    }
    return res.status === 204 ? null : res.json();
  }
  function getCookie(name) {
    let val = `; ${document.cookie}`;
    let parts = val.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';')[0];
    return null;
  }

  // ─── FETCH CACHE ───────────────────────────────
  async function fetchAll() {
    try {
      [purchases, products] = await Promise.all([
        api('GET', API.PURCHASES),
        api('GET', API.PRODUCTS),
      ]);
    } catch (e) {
      console.warn('Backend indisponible — mode démonstration activé.', e);
      // Si pas de backend, on utilise un localStorage fallback pour la démo
      loadDemoData();
    }
    refreshUI();
  }

  // ─── DEMO DATA (localStorage fallback sans backend) ─
  function loadDemoData() {
    const raw = localStorage.getItem('pf_purchases');
    purchases = raw ? JSON.parse(raw) : [];
    const rawP = localStorage.getItem('pf_products');
    products  = rawP ? JSON.parse(rawP) : [];
  }
  function saveDemoData() {
    localStorage.setItem('pf_purchases', JSON.stringify(purchases));
    localStorage.setItem('pf_products',  JSON.stringify(products));
  }
  let useDemo = false; // se détermine après le premier appel

  async function smartFetch() {
    try {
      [purchases, products] = await Promise.all([
        api('GET', API.PURCHASES),
        api('GET', API.PRODUCTS),
      ]);
      useDemo = false;
    } catch {
      useDemo = true;
      loadDemoData();
    }
    refreshUI();
  }

  async function smartPost(body) {
    if (useDemo) {
      // créer produit si nécessaire
      let prod = products.find(p => p.nom_produit.toLowerCase() === body.nom_produit.toLowerCase());
      if (!prod) {
        prod = { id: Date.now(), nom_produit: body.nom_produit };
        products.push(prod);
      }
      const achat = {
        id: Date.now() + 1,
        produit: prod.id,
        produit_nom: prod.nom_produit,
        prix: parseFloat(body.prix),
        date_achat: body.date_achat,
      };
      purchases.push(achat);
      saveDemoData();
      return achat;
    }
    // backend réel
    // D'abord créer/récupérer le produit
    let prod = products.find(p => p.nom_produit.toLowerCase() === body.nom_produit.toLowerCase());
    if (!prod) {
      prod = await api('POST', API.PRODUCTS, { nom_produit: body.nom_produit });
      products.push(prod);
    }
    const achat = await api('POST', API.PURCHASES, {
      produit: prod.id,
      prix: body.prix,
      date_achat: body.date_achat,
    });
    purchases.push(achat);
    return achat;
  }

  async function smartDelete(id) {
    if (useDemo) {
      purchases = purchases.filter(a => a.id !== id);
      saveDemoData();
      return;
    }
    await api('DELETE', `${API.PURCHASES}${id}/`);
    purchases = purchases.filter(a => a.id !== id);
  }

  // ─── INIT ──────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    // defaults dates
    document.getElementById('dateAchat').value = today();
    document.getElementById('topDateStart').value = today();
    document.getElementById('topDateEnd').value   = today();
    document.getElementById('bilanDateStart').value = '2020-01-01';
    document.getElementById('bilanDateEnd').value   = today();

    bindTabs();
    bindForm();
    bindHistory();
    bindAnalysis();
    bindModal();
    bindScrollHeader();

    smartFetch();
  });

  // ─── TAB NAVIGATION ────────────────────────────
  function bindTabs() {
    const allTabs = document.querySelectorAll('.nav-tab, .mobile-nav-btn');
    allTabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        // activate btn in desktop + mobile
        document.querySelectorAll('.nav-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('.mobile-nav-btn').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        // panels
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${tab}`).classList.add('active');
        // close mobile
        closeMobileNav();
        // refresh data on switch
        if (tab === 'history')   renderHistory();
        if (tab === 'analysis')  renderAnalysis();
      });
    });
    // hamburger
    document.getElementById('hamburger').addEventListener('click', toggleMobileNav);
    document.getElementById('mobileClose').addEventListener('click', closeMobileNav);
  }
  function toggleMobileNav() {
    document.getElementById('hamburger').classList.toggle('open');
    document.getElementById('mobileOverlay').classList.toggle('open');
  }
  function closeMobileNav() {
    document.getElementById('hamburger').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('open');
  }

  // ─── SCROLL HEADER ─────────────────────────────
  function bindScrollHeader() {
    window.addEventListener('scroll', () => {
      document.getElementById('header').classList.toggle('scrolled', window.scrollY > 10);
    });
  }

  // ─── FORM ──────────────────────────────────────
  function bindForm() {
    const input = document.getElementById('produitName');
    const dropdown = document.getElementById('suggestions');

    // autocomplete suggestions
    input.addEventListener('input', () => {
      const val = input.value.trim().toLowerCase();
      if (val.length < 1) { dropdown.classList.remove('open'); return; }
      const matches = products.filter(p => p.nom_produit.toLowerCase().includes(val));
      if (matches.length === 0) { dropdown.classList.remove('open'); return; }
      dropdown.innerHTML = matches.map(p =>
        `<div class="suggestion-item" data-name="${p.nom_produit}">${p.nom_produit}</div>`
      ).join('');
      dropdown.querySelectorAll('.suggestion-item').forEach(el => {
        el.addEventListener('mousedown', () => {
          input.value = el.dataset.name;
          dropdown.classList.remove('open');
        });
      });
      dropdown.classList.add('open');
    });
    input.addEventListener('blur', () => setTimeout(() => dropdown.classList.remove('open'), 150));
    input.addEventListener('focus', () => { input.dispatchEvent(new Event('input')); });

    // submit
    document.getElementById('purchaseForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!validateForm()) return;

      const body = {
        nom_produit: document.getElementById('produitName').value.trim(),
        prix: document.getElementById('prix').value,
        date_achat: document.getElementById('dateAchat').value,
      };

      try {
        await smartPost(body);
        showToast('Achat ajouté avec succès !');
        document.getElementById('purchaseForm').reset();
        document.getElementById('dateAchat').value = today();
        await smartFetch();
      } catch (err) {
        showToast('Erreur lors de l\'ajout.', true);
        console.error(err);
      }
    });
  }

  function validateForm() {
    let ok = true;
    const name  = document.getElementById('produitName').value.trim();
    const prix  = document.getElementById('prix').value;
    const date  = document.getElementById('dateAchat').value;

    setError('err-produit', name ? '' : 'Le nom du produit est obligatoire.');
    if (!name) ok = false;

    if (!prix || isNaN(prix) || Number(prix) <= 0) {
      setError('err-prix', 'Le prix doit être un nombre strictement positif.');
      ok = false;
    } else {
      setError('err-prix', '');
    }

    if (!date) {
      setError('err-date', 'La date est obligatoire.');
      ok = false;
    } else {
      setError('err-date', '');
    }
    return ok;
  }

  function setError(id, msg) {
    const el = document.getElementById(id);
    el.textContent = msg;
    el.classList.toggle('show', !!msg);
  }

  // ─── TOAST ─────────────────────────────────────
  let toastTimeout;
  function showToast(msg, isErr = false) {
    const toast = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.style.borderColor = isErr ? 'var(--danger)' : 'var(--accent-teal)';
    toast.style.color       = isErr ? 'var(--danger)' : 'var(--accent-teal)';
    toast.classList.add('show');
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  // ─── REFRESH DASHBOARD ─────────────────────────
  function refreshUI() {
    renderKPIs();
    renderRecentList();
    renderHistory();
    renderAnalysis();
  }

  function renderKPIs() {
    const total   = purchases.reduce((s, a) => s + Number(a.prix), 0);
    const count   = purchases.length;
    const avg     = count ? total / count : 0;

    animateKPI('kpi-total', fmt(total));
    animateKPI('kpi-count', count.toString());
    animateKPI('kpi-avg',   fmt(avg));
  }
  function animateKPI(id, val) {
    const el = document.getElementById(id);
    if (el.textContent !== val) {
      el.textContent = val;
      el.classList.remove('bump');
      void el.offsetWidth; // reflow
      el.classList.add('bump');
    }
  }

  function renderRecentList() {
    const container = document.getElementById('recentList');
    const sorted = [...purchases].sort((a, b) => (b.date_achat || '').localeCompare(a.date_achat || ''));
    const recent = sorted.slice(0, 6);
    if (recent.length === 0) {
      container.innerHTML = `<div class="empty-state"><svg width="48" height="48" viewBox="0 0 48 48"><circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3"/><path d="M18 24 h12 M24 18 v12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/></svg><p>Aucun achat pour le moment</p></div>`;
      return;
    }
    container.innerHTML = recent.map((a, i) => `
      <div class="recent-item" style="animation-delay:${i * .06}s">
        <span class="recent-dot"></span>
        <div class="recent-info">
          <div class="recent-name">${escHtml(a.produit_nom || getProduitNom(a.produit))}</div>
          <div class="recent-date">${fmtDate(a.date_achat)}</div>
        </div>
        <span class="recent-price">${fmt(a.prix)}</span>
      </div>
    `).join('');
  }

  function getProduitNom(id) {
    const p = products.find(pr => pr.id === id);
    return p ? p.nom_produit : 'Inconnu';
  }

  // ─── HISTORY ───────────────────────────────────
  function bindHistory() {
    document.getElementById('searchInput').addEventListener('input', renderHistory);
    document.getElementById('sortSelect').addEventListener('change', renderHistory);
  }

  function renderHistory() {
    const search = document.getElementById('searchInput').value.trim().toLowerCase();
    const sort   = document.getElementById('sortSelect').value;

    let list = purchases.map(a => ({
      ...a,
      _nom: a.produit_nom || getProduitNom(a.produit),
    }));

    // filter
    if (search) list = list.filter(a => a._nom.toLowerCase().includes(search));

    // sort
    list.sort((a, b) => {
      switch (sort) {
        case 'date-desc': return (b.date_achat || '').localeCompare(a.date_achat || '');
        case 'date-asc':  return (a.date_achat || '').localeCompare(b.date_achat || '');
        case 'prix-desc': return Number(b.prix) - Number(a.prix);
        case 'prix-asc':  return Number(a.prix) - Number(b.prix);
        default: return 0;
      }
    });

    const totalFiltre = list.reduce((s, a) => s + Number(a.prix), 0);
    document.getElementById('hs-total-count').textContent = list.length;
    document.getElementById('hs-total-price').textContent = fmt(totalFiltre);

    const tbody = document.getElementById('historyBody');
    const empty = document.getElementById('historyEmpty');

    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.style.display = 'flex';
      return;
    }
    empty.style.display = 'none';

    tbody.innerHTML = list.map((a, i) => `
      <tr style="animation-delay:${i * .04}s">
        <td>${i + 1}</td>
        <td class="td-product">${escHtml(a._nom)}</td>
        <td class="td-price">${fmt(a.prix)}</td>
        <td>${fmtDate(a.date_achat)}</td>
        <td><button class="btn-delete" data-id="${a.id}" title="Supprimer">×</button></td>
      </tr>
    `).join('');

    // delete btns
    tbody.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => openDeleteModal(Number(btn.dataset.id)));
    });
  }

  // ─── MODAL DELETE ───────────────────────────────
  function bindModal() {
    document.getElementById('btnCancelDelete').addEventListener('click', closeDeleteModal);
    document.getElementById('btnConfirmDelete').addEventListener('click', async () => {
      if (deleteTarget === null) return;
      try {
        await smartDelete(deleteTarget);
        showToast('Achat supprimé.');
        deleteTarget = null;
        closeDeleteModal();
        refreshUI();
      } catch {
        showToast('Erreur lors de la suppression.', true);
      }
    });
    document.getElementById('deleteModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('deleteModal')) closeDeleteModal();
    });
  }
  function openDeleteModal(id)  { deleteTarget = id; document.getElementById('deleteModal').classList.add('open'); }
  function closeDeleteModal()   { document.getElementById('deleteModal').classList.remove('open'); }

  // ─── ANALYSIS ──────────────────────────────────
  function bindAnalysis() {
    document.getElementById('btnAnalyse').addEventListener('click', renderTopProduct);
    document.getElementById('bilanDateStart').addEventListener('input', renderBilan);
    document.getElementById('bilanDateEnd').addEventListener('input', renderBilan);
  }

  function renderAnalysis() {
    renderTopProduct();
    renderBilan();
    renderDoughnut();
  }

  function getFiltered(startId, endId) {
    const s = document.getElementById(startId).value;
    const e = document.getElementById(endId).value;
    if (!s || !e) return purchases;
    return purchases.filter(a => a.date_achat >= s && a.date_achat <= e);
  }

  // ── Top Produit ──
  function renderTopProduct() {
    const filtered = getFiltered('topDateStart', 'topDateEnd');
    const countMap = {};
    filtered.forEach(a => {
      const nom = a.produit_nom || getProduitNom(a.produit);
      countMap[nom] = (countMap[nom] || 0) + 1;
    });

    const sorted = Object.entries(countMap).sort((a, b) => b[1] - a[1]);

    const nameEl  = document.getElementById('topProdName');
    const countEl = document.getElementById('topProdCount');
    const rankContainer = document.getElementById('rankingList');

    if (sorted.length === 0) {
      nameEl.textContent  = '—';
      countEl.textContent = 'Aucun achat sur cette période';
      rankContainer.innerHTML = '';
      return;
    }

    const maxCount = sorted[0][1];
    const tops     = sorted.filter(([, c]) => c === maxCount);

    if (tops.length > 1) {
      nameEl.textContent  = tops.map(t => t[0]).join(' = ');
      countEl.textContent = `Égalité à ${maxCount} achat(s)`;
    } else {
      nameEl.textContent  = tops[0][0];
      countEl.textContent = `${maxCount} achat(s)`;
    }
    // pulse animation
    nameEl.classList.remove('pulse');
    void nameEl.offsetWidth;
    nameEl.classList.add('pulse');

    // Ranking top 5
    const classes = ['first','second','third','',''];
    rankContainer.innerHTML = sorted.slice(0, 5).map(([nom, cnt], i) => `
      <div class="rank-item" style="animation-delay:${i*.07}s">
        <span class="rank-badge ${classes[i] || ''}">${i + 1}</span>
        <span class="rank-name">${escHtml(nom)}</span>
        <span class="rank-count">${cnt}×</span>
      </div>
    `).join('');
  }

  // ── Bilan ──
  function renderBilan() {
    const filtered = getFiltered('bilanDateStart', 'bilanDateEnd');
    const total = filtered.reduce((s, a) => s + Number(a.prix), 0);
    const count = filtered.length;
    const avg   = count ? total / count : 0;
    const prices = filtered.map(a => Number(a.prix));
    const max   = prices.length ? Math.max(...prices) : 0;
    const min   = prices.length ? Math.min(...prices) : 0;

    // animate amount
    const amountEl = document.getElementById('bilanAmount');
    amountEl.textContent = fmt(total);
    amountEl.classList.remove('bump');
    void amountEl.offsetWidth;
    amountEl.classList.add('bump');

    // bar: relative to a "target" — we use max*count or a sensible scale
    const barPct = total > 0 ? Math.min(100, (total / (max * count || 1)) * 100) : 0;
    document.getElementById('bilanBar').style.width = barPct + '%';

    document.getElementById('bs-count').textContent = count;
    document.getElementById('bs-avg').textContent   = fmt(avg);
    document.getElementById('bs-max').textContent   = fmt(max);
    document.getElementById('bs-min').textContent   = fmt(min);
  }

  // ── Doughnut Chart (vanilla canvas) ──
  const PALETTE = [
    '#e8c87a','#5ecfb8','#e8807a','#7aade8','#c49a6c',
    '#9b8ec4','#6ecf6e','#e8c45a','#7ac8e8','#d46ea0',
  ];

  function renderDoughnut() {
    const canvas = document.getElementById('doughnutChart');
    const ctx    = canvas.getContext('2d');
    const legend = document.getElementById('chartLegend');

    // aggregate by product
    const map = {};
    purchases.forEach(a => {
      const nom = a.produit_nom || getProduitNom(a.produit);
      map[nom] = (map[nom] || 0) + Number(a.prix);
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);

    if (entries.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      legend.innerHTML = '<span style="color:var(--text-muted);font-size:.78rem;font-style:italic">Aucune donnée</span>';
      return;
    }

    const total = entries.reduce((s, [, v]) => s + v, 0);

    // DPR scaling
    const dpr    = window.devicePixelRatio || 1;
    const size   = 260;
    canvas.width  = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';
    ctx.scale(dpr, dpr);

    const cx = size / 2, cy = size / 2;
    const outer = size * 0.42, inner = size * 0.24;

    ctx.clearRect(0, 0, size, size);

    // background ring
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.lineWidth = outer - inner;
    ctx.strokeStyle = 'rgba(255,255,255,.04)';
    ctx.stroke();

    // segments
    let startAngle = -Math.PI / 2;
    const segments = entries.map(([nom, val], i) => {
      const slice = (val / total) * Math.PI * 2;
      const color = PALETTE[i % PALETTE.length];
      ctx.beginPath();
      ctx.arc(cx, cy, outer, startAngle, startAngle + slice);
      ctx.arc(cx, cy, inner, startAngle + slice, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      const mid = startAngle + slice / 2;
      startAngle += slice;
      return { nom, val, color, mid };
    });

    // center text
    ctx.fillStyle = '#f0ece4';
    ctx.font = `bold ${14 * dpr / dpr}px Syne, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Total', cx, cy - 8);
    ctx.fillStyle = '#e8c87a';
    ctx.font = `bold ${16}px Syne, sans-serif`;
    ctx.fillText(fmt(total), cx, cy + 12);

    // legend
    legend.innerHTML = entries.slice(0, 6).map(([nom, val], i) => `
      <div class="legend-item" style="animation-delay:${i*.08}s">
        <span class="legend-swatch" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="legend-label">${escHtml(nom)}</span>
        <span class="legend-value">${fmt(val)}</span>
      </div>
    `).join('');
  }

  // ─── UTILITY ───────────────────────────────────
  function escHtml(s) {
    const d = document.createElement('div');
    d.appendChild(document.createTextNode(String(s)));
    return d.innerHTML;
  }

  // ─── RESIZE → redraw chart ─────────────────────
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderDoughnut, 150);
  });

})();
