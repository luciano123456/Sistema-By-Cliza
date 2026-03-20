/************************************************************
 * HOME – JS
 * - DnD secciones con guía visual (insert/swap) y ajuste de "Configuraciones"
 * - Tiles: DnD solo dentro de su tarjeta
 * - Favoritos Top-8 (colores propios, no hereda)
 * - Modal Colores: Header, Tiles, Fondo (de/ hasta + “usar degradado”)
 * - Reset: restaura header + tiles + fondo + orden
 ************************************************************/

/* ====================== HELPERS ====================== */
const qs = (s, r = document) => (typeof s === 'string' ? r.querySelector(s) : s);
const qsa = (s, r = document) => Array.from(r.querySelectorAll(s));
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, fb) => { try { const v = localStorage.getItem(k); return v != null ? JSON.parse(v) : (fb ?? null); } catch { return (fb ?? null); } };
const setCssVars = (el, vars) => { for (const [k, v] of Object.entries(vars)) if (v != null) el.style.setProperty(k, v); };
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
function toHex(color, fb = '#ffffff') {
    if (!color) return fb; const c = String(color).trim();
    if (c.startsWith('#')) return (c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c).toLowerCase();
    const m = c.match(/\d+(\.\d+)?/g); if (!m || m.length < 3) return fb;
    const [r, g, b] = m.map(n => clamp(Math.round(Number(n)), 0, 255));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/* ====================== LS KEYS ====================== */
const LS = {
    COLORS_CARD: id => `ui.colors.card.${id}`,   // header + fondo
    COLORS_TILE: id => `ui.colors.tile.${id}`,
    ORDER_GRID: 'ui.order.grid',               // tarjetas en #cols
    ORDER_TILES: id => `ui.order.tiles.${id}`,
    VISITS: 'ui.visits'
};

/* ====================== FÁBRICA ====================== */
let factoryTilesOrderByCard = new Map();
let factoryStyleByCard = new Map();

function captureFactory() {
    qsa('.dash-card').forEach(card => {
        const id = card.dataset.cardId;
        const tiles = qsa('.tile, .conf-tile', card); // 👈 ahora toma ambos tipos
        tiles.forEach((t, ix) => t.dataset.homeIndex = String(ix));
        factoryTilesOrderByCard.set(id, tiles.map(t => t.dataset.id));
        factoryStyleByCard.set(id, card.getAttribute('data-default-style') || card.getAttribute('style') || '');
    });
}


/* ====================== FAVORITOS ====================== */
function getVisits() { return load(LS.VISITS, {}); }
function bumpVisit(tileId) {
    const v = getVisits(); v[tileId] = (v[tileId] || 0) + 1; save(LS.VISITS, v);
    refreshFavorites();
}
function refreshFavorites() {
    const container = qs('#tiles-favoritos'); if (!container) return;
    container.innerHTML = '';
    const visits = Object.entries(getVisits()).sort((a, b) => b[1] - a[1]);
    const top = [];
    for (const [id] of visits) {
        const tile = document.querySelector(`.tile[data-id="${id}"]`);
        if (tile) top.push(tile);
        if (top.length === 8) break; // Top-8
    }
    if (top.length === 0) {
        const tpl = qs('#tpl-fav-empty'); if (tpl) container.append(tpl.content.firstElementChild.cloneNode(true));
        return;
    }
    top.forEach((tpl, ix) => {
        const clone = tpl.cloneNode(true);
        // NO heredar estilos de sección
        clone.removeAttribute('style');
        clone.querySelector('.tile-handle')?.remove();
        clone.addEventListener('click', () => tpl.click());
        const star = document.createElement('i'); star.className = 'fa fa-star fav-rank';
        clone.insertBefore(star, clone.firstChild);
        clone.classList.add(ix === 0 ? 'rank-1' : ix === 1 ? 'rank-2' : ix === 2 ? 'rank-3' : 'rank-4');
        container.append(clone);
    });
}

/* ====================== MODAL COLORES ====================== */
let colorTargetCard = null;

function buildApplyList(card) {
    const list = qs('#applyList'); if (!list) return; list.innerHTML = '';
    const mk = (val, txt) => {
        const l = document.createElement('label');
        l.className = 'list-group-item d-flex align-items-center gap-2';
        l.innerHTML = `<input class="form-check-input me-2" type="checkbox" value="${val}"><span>${txt}</span>`;
        return l;
    };
    list.append(mk('header', 'Cabecera'));
    list.append(mk('bg', 'Fondo de la sección'));
    qsa('.tile', card).forEach(t => {
        const title = t.dataset.title || t.textContent.trim();
        list.append(mk(t.dataset.id, title));
    });
    // reset "Seleccionar todos"
    const chkAll = qs('#chkAll'); if (chkAll) { chkAll.checked = false; }
}

function getSelectedTargets() {
    const list = qs('#applyList'); if (!list) return { header: false, bg: false, tiles: [] };
    const checks = Array.from(list.querySelectorAll('input[type="checkbox"]:checked')).map(c => c.value);
    return { header: checks.includes('header'), bg: checks.includes('bg'), tiles: checks.filter(v => v !== 'header' && v !== 'bg') };
}

function buildSimulator(card) {
    const sim = qs('#simulator'); if (!sim) return;
    const sh = sim.querySelector('.sim-header'); const box = sim.querySelector('.sim-tiles');
    const cs = getComputedStyle(card);
    // header ejemplo
    sh.style.background = `linear-gradient(90deg, ${toHex(cs.getPropertyValue('--hdr-from') || '#39475f')}, ${toHex(cs.getPropertyValue('--hdr-to') || '#53627a')})`;
    sh.style.color = toHex(cs.getPropertyValue('--hdr-text') || '#ffffff');
    sh.querySelector('i').style.color = toHex(cs.getPropertyValue('--hdr-icon') || '#ffffff');
    // tiles ejemplo (mantenemos 4)
    box.innerHTML = '';
    const count = Math.max(4, qsa('.tile', card).length);
    for (let i = 0; i < count; i++) {
        const t = qs('#tpl-sim-tile')?.content.firstElementChild.cloneNode(true) || Object.assign(document.createElement('div'), { className: 'sim-tile', innerHTML: '<i class="fa fa-check"></i><span>Tile ejemplo</span>' });
        t.style.background = `linear-gradient(180deg, ${toHex(cs.getPropertyValue('--tl-from') || '#2d3542')}, ${toHex(cs.getPropertyValue('--tl-to') || '#2a3240')})`;
        t.style.color = toHex(cs.getPropertyValue('--tl-text') || '#e8f0ff');
        t.style.borderColor = toHex(cs.getPropertyValue('--tl-b') || '#3a4457');
        t.querySelector('i').style.color = toHex(cs.getPropertyValue('--tl-icon') || '#e8f0ff');
        box.append(t);
    }
}

/* Inputs */
const inputs = {
    from: '#inpFrom',
    to: '#inpTo',
    text: '#inpText',
    icon: '#inpIcon',
    border: '#inpBorder',
    bgFrom: '#inpBgFrom',
    bgTo: '#inpBgTo',
    bgGrad: '#chkBgGrad',
    preview: '#chkPreview',
    selectAll: '#chkAll'
};

function enableBgTo(on) {
    const to = qs(inputs.bgTo);
    if (!to) return;
    to.disabled = !on;
    to.closest('.form-group-bgto')?.classList.toggle('disabled', !on);
}

/* Para saber si el cambio vino desde inputs de fondo */
let lastChangeWasBg = false;

function applyColorPreview() {
    if (!colorTargetCard) return;

    // reconstruyo simulador base
    buildSimulator(colorTargetCard);

    const vals = {
        from: qs(inputs.from)?.value,
        to: qs(inputs.to)?.value,
        text: qs(inputs.text)?.value,
        icon: qs(inputs.icon)?.value,
        border: qs(inputs.border)?.value,
        bgFrom: qs(inputs.bgFrom)?.value,
        bgTo: qs(inputs.bgTo)?.value,
        bgGrad: qs(inputs.bgGrad)?.checked
    };

    // selección actual
    let sel = getSelectedTargets();

    // si el cambio fue de "fondo", garantizo que se previsualice
    if (lastChangeWasBg) sel = { ...sel, bg: true };

    // ======== SIMULADOR ========
    const sim = qs('#simulator');

    // header (sim)
    if (sel.header) {
        const sh = sim.querySelector('.sim-header');
        sh.classList.add('active');
        sh.style.background = `linear-gradient(90deg, ${vals.from}, ${vals.to})`;
        sh.style.color = vals.text;
        sh.querySelector('i').style.color = vals.icon;
    }

    // tiles (sim)
    if (sel.tiles.length > 0) {
        qsa('.sim-tiles .sim-tile', sim).forEach(el => {
            el.classList.add('active');
            el.style.background = `linear-gradient(180deg, ${vals.from}, ${vals.to})`;
            el.style.color = vals.text;
            el.style.borderColor = vals.border;
            el.querySelector('i').style.color = vals.icon;
        });
    }

    // ======== TARJETA REAL (si preview está activo) ========
    if (!qs(inputs.preview)?.checked) return;

    // header (real)
    if (sel.header) {
        setCssVars(colorTargetCard, {
            '--hdr-from': vals.from,
            '--hdr-to': vals.to,
            '--hdr-text': vals.text,
            '--hdr-icon': vals.icon
        });
    }

    // tiles (reales seleccionados)
    if (sel.tiles.length > 0) {
        sel.tiles.forEach(tid => {
            const t = colorTargetCard.querySelector(`.tile[data-id="${tid}"]`);
            if (t) {
                setCssVars(t, {
                    '--tl-from': vals.from,
                    '--tl-to': vals.to,
                    '--tl-text': vals.text,
                    '--tl-icon': vals.icon,
                    '--tl-b': vals.border
                });
            }
        });
    }

    // fondo de sección (real, independiente)
    if (sel.bg) {
        if (vals.bgGrad) {
            colorTargetCard.style.background = `linear-gradient(180deg, ${vals.bgFrom}, ${vals.bgTo})`;
        } else {
            colorTargetCard.style.background = vals.bgFrom;
        }
    }
}


/* listeners live preview (sin autoseleccionar 'header') */
['input', 'change'].forEach(evt => {
    document.addEventListener(evt, (e) => {
        if (!colorTargetCard) return;

        const ids = [
            inputs.from, inputs.to, inputs.text, inputs.icon, inputs.border,
            inputs.bgFrom, inputs.bgTo, inputs.bgGrad, inputs.preview, inputs.selectAll
        ];
        if (!ids.some(sel => e.target.matches(sel))) return;

        // Fondo: habilitar/deshabilitar 'hasta' y asegurar preview del fondo
        if (e.target.matches(inputs.bgGrad)) {
            enableBgTo(e.target.checked);
            lastChangeWasBg = true;
            const chkBg = qs('#applyList input[value="bg"]');
            if (chkBg) chkBg.checked = true;
        }
        if (e.target.matches(inputs.bgFrom) || e.target.matches(inputs.bgTo)) {
            lastChangeWasBg = true;
            const chkBg = qs('#applyList input[value="bg"]');
            if (chkBg) chkBg.checked = true;
        }

        // NO autoseleccionar 'header' nunca: si el usuario no lo tilda, no se pinta.
        // (Dejamos 'border' igual; los tiles solo se pintan si están seleccionados)

        // Seleccionar todos
        if (e.target.matches(inputs.selectAll)) {
            const on = e.target.checked;
            qsa('#applyList input[type="checkbox"]').forEach(c => { c.checked = on; });
        }

        if (!(e.target.matches(inputs.bgFrom) || e.target.matches(inputs.bgTo) || e.target.matches(inputs.bgGrad))) {
            lastChangeWasBg = false;
        }

        applyColorPreview(); // respeta la selección actual (header/tiles/bg)
    });
});

qs('#btnSaveColors')?.addEventListener('click', () => {
    if (!colorTargetCard) return;
    const selected = getSelectedTargets();
    const vals = {
        from: qs(inputs.from)?.value,
        to: qs(inputs.to)?.value,
        text: qs(inputs.text)?.value,
        icon: qs(inputs.icon)?.value,
        border: qs(inputs.border)?.value,
        bgFrom: qs(inputs.bgFrom)?.value,
        bgTo: qs(inputs.bgTo)?.value,
        bgGrad: qs(inputs.bgGrad)?.checked
    };
    const cardId = colorTargetCard.dataset.cardId;

    // Header
    if (selected.header) {
        const base = load(LS.COLORS_CARD(cardId), {}) || {};
        save(LS.COLORS_CARD(cardId), { ...base, hdrFrom: vals.from, hdrTo: vals.to, hdrText: vals.text, hdrIcon: vals.icon });
        setCssVars(colorTargetCard, { '--hdr-from': vals.from, '--hdr-to': vals.to, '--hdr-text': vals.text, '--hdr-icon': vals.icon });
    }

    // Fondo (independiente)
    if (selected.bg) {
        const base = load(LS.COLORS_CARD(cardId), {}) || {};
        save(LS.COLORS_CARD(cardId), { ...base, bgFrom: vals.bgFrom, bgTo: vals.bgTo, bgGrad: !!vals.bgGrad });
        if (vals.bgGrad) {
            colorTargetCard.style.background = `linear-gradient(180deg, ${vals.bgFrom}, ${vals.bgTo})`;
        } else {
            colorTargetCard.style.background = vals.bgFrom;
        }
    }

    // Tiles
    selected.tiles.forEach(tid => {
        const cfg = { tileFrom: vals.from, tileTo: vals.to, tileText: vals.text, tileIcon: vals.icon, tileBorder: vals.border };
        save(LS.COLORS_TILE(tid), cfg);
        const t = colorTargetCard.querySelector(`.tile[data-id="${tid}"]`);
        if (t) setCssVars(t, { '--tl-from': cfg.tileFrom, '--tl-to': cfg.tileTo, '--tl-text': cfg.tileText, '--tl-icon': cfg.tileIcon, '--tl-b': cfg.tileBorder });
    });

    bootstrap.Modal.getInstance(qs('#colorModal'))?.hide();
    (window.exitoModal || ((m) => alert(m)))('Colores guardados');
});

function openColorModal(card) {
    colorTargetCard = card;
    buildApplyList(card);
    buildSimulator(card);

    // precargar
    const cs = getComputedStyle(card);
    qs(inputs.from).value = toHex(cs.getPropertyValue('--hdr-from') || '#39475f');
    qs(inputs.to).value = toHex(cs.getPropertyValue('--hdr-to') || '#53627a');
    qs(inputs.text).value = toHex(cs.getPropertyValue('--hdr-text') || '#ffffff');
    qs(inputs.icon).value = toHex(cs.getPropertyValue('--hdr-icon') || '#ffffff');
    qs(inputs.border).value = toHex(cs.getPropertyValue('--tl-b') || '#3a4457');

    // fondo guardado / actual
    const saved = load(LS.COLORS_CARD(card.dataset.cardId), null);
    const bgFrom = saved?.bgFrom || '#0f1724';
    const bgTo = saved?.bgTo || bgFrom;
    const bgGrad = !!saved?.bgGrad;
    qs(inputs.bgFrom).value = toHex(bgFrom);
    qs(inputs.bgTo).value = toHex(bgTo);
    qs(inputs.bgGrad).checked = bgGrad;
    enableBgTo(bgGrad);

    // desmarcar todo al abrir
    qsa('#applyList input[type="checkbox"]').forEach(c => c.checked = false);
    qs('#chkAll') && (qs('#chkAll').checked = false);
    lastChangeWasBg = false;

    new bootstrap.Modal(qs('#colorModal')).show();
    setTimeout(applyColorPreview, 0);
}

/* aplicar guardados */
function applySavedColors() {
    qsa('.dash-card').forEach(card => {
        const cfg = load(LS.COLORS_CARD(card.dataset.cardId), null);
        if (cfg) {
            setCssVars(card, { '--hdr-from': cfg.hdrFrom, '--hdr-to': cfg.hdrTo, '--hdr-text': cfg.hdrText, '--hdr-icon': cfg.hdrIcon });
            if (cfg.bgGrad) {
                card.style.background = `linear-gradient(180deg, ${cfg.bgFrom || '#0f1724'}, ${cfg.bgTo || cfg.bgFrom || '#0f1724'})`;
            } else if (cfg.bgFrom) {
                card.style.background = cfg.bgFrom;
            }
        }
        // tiles
        qsa('.tile', card).forEach(t => {
            const c2 = load(LS.COLORS_TILE(t.dataset.id), null);
            if (c2) setCssVars(t, { '--tl-from': c2.tileFrom, '--tl-to': c2.tileTo, '--tl-text': c2.tileText, '--tl-icon': c2.tileIcon, '--tl-b': c2.tileBorder });
        });
    });
}

/* ====================== RESET TARJETA ====================== */
function resetCardLive(card) {
    const id = card.dataset.cardId;

    // quitar colores guardados
    localStorage.removeItem(LS.COLORS_CARD(id));
    qsa('.tile, .conf-tile', card).forEach(t => localStorage.removeItem(LS.COLORS_TILE(t.dataset.id)));

    // restaurar estilo por defecto
    const def = factoryStyleByCard.get(id) || '';
    if (def) card.setAttribute('style', def); else card.removeAttribute('style');

    // restaurar orden (ahora con .tile y .conf-tile)
    const factory = factoryTilesOrderByCard.get(id) || [];
    const cont = qs('.tiles, .config-grid', card);
    const map = {}; qsa('.tile, .conf-tile', card).forEach(t => map[t.dataset.id] = t);
    if (cont) {
        cont.innerHTML = '';
        factory.forEach(tid => map[tid] && cont.append(map[tid]));
    }
    localStorage.removeItem(LS.ORDER_TILES(id));

    showReloadOverlay();
    setTimeout(() => location.reload(), 250);
}


/* ====================== DnD SECCIONES ====================== */
function saveGridOrder() {
    const ids = qsa('#cols .dash-card').map(d => d.dataset.cardId);
    save(LS.ORDER_GRID, ids);
}
function restoreGridOrder() {
    const data = load(LS.ORDER_GRID, null); if (!data) return;
    const cont = qs('#cols');
    data.forEach(id => {
        const el = document.querySelector(`.dash-card[data-card-id="${id}"]`);
        if (el) cont.append(el);
    });
    fixConfigState();
}
function fixConfigState() {
    const conf = document.querySelector('.dash-card[data-card-id="config"]');
    if (!conf) return;

    const pref = load(LS.CARD_SIZE('config'), null);
    if (pref) { // si el usuario eligió, se respeta
        setCardSize(conf, pref);
        return;
    }

    // Sin preferencia explícita: automático si queda sola en su fila
    if (isAloneInRow(conf)) conf.classList.add('fullwidth');
    else conf.classList.remove('fullwidth');

    updateSizeToggleIcon(conf);
}

/* Guía visual + Placeholder */
function bindCardDnD() {
    qsa('.dash-card .card-handle').forEach(handle => {
        const card = handle.closest('.dash-card');
        let ghost, placeholder, offX, offY;

        const onMove = (e) => {
            ghost.style.left = `${e.clientX - offX}px`; ghost.style.top = `${e.clientY - offY}px`;

            const container = qs('#cols');
            const nodes = qsa('.dash-card, .placeholder-card', container).filter(n => n !== ghost);
            let inserted = false;
            for (const n of nodes) {
                if (n === placeholder) continue;
                const r = n.getBoundingClientRect();
                // barra de inserción superior o inferior según posición del puntero
                if (e.clientY < r.top + r.height / 2) {
                    container.insertBefore(placeholder, n);
                    inserted = true; break;
                }
            }
            if (!inserted) container.append(placeholder);

            // guía de candidatos
            qsa('#cols .dash-card').forEach(c => c.classList.add('dz-candidate'));
            placeholder.classList.add('dz-candidate');
        };

        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            ghost.remove(); placeholder.replaceWith(card);
            card.style.removeProperty('width'); card.style.removeProperty('height');
            qsa('#cols .dash-card').forEach(c => c.classList.remove('dz-candidate'));
            saveGridOrder(); fixConfigState();
        };

        handle.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const rect = card.getBoundingClientRect();
            offX = e.clientX - rect.left; offY = e.clientY - rect.top;

            ghost = card.cloneNode(true); ghost.classList.add('drag-ghost');
            ghost.style.width = `${rect.width}px`; ghost.style.height = `${rect.height}px`;
            ghost.style.left = `${rect.left}px`; ghost.style.top = `${rect.top}px`;

            placeholder = document.createElement('div'); placeholder.className = 'placeholder-card';
            card.parentElement.insertBefore(placeholder, card); card.remove();

            document.body.append(ghost);
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    });
}

/* ====================== TILES DnD (intra-sección) ====================== */
function saveTilesOrder(card) {
    if (card.dataset.cardId === 'favoritos') return; // favoritos no se ordena manualmente
    const ids = qsa('.tile, .conf-tile', card).map(t => t.dataset.id);
    save(LS.ORDER_TILES(card.dataset.cardId), ids);
}

function restoreTilesOrder() {
    qsa('.dash-card').forEach(card => {
        const order = load(LS.ORDER_TILES(card.dataset.cardId), null);
        if (!order) return;
        const cont = qs('.tiles, .config-grid', card);
        if (!cont) return;
        const map = {};
        qsa('.tile, .conf-tile', card).forEach(t => map[t.dataset.id] = t);
        order.forEach(id => map[id] && cont.append(map[id]));
    });
}


function bindTileDnD() {
    // SOLO: tiles dentro de #cols .tiles (no .tiles-favs) + conf-tile de config
    const draggables = qsa('#cols .tiles .tile, .dash-card[data-card-id="config"] .conf-tile');

    draggables.forEach(tile => {
        const handle = tile.querySelector('.tile-handle');
        let ghost, placeholder, offX, offY, dragging = false, originCard = null, lastBox = null;

        const startDrag = (e) => {
            if (!handle) return;
            dragging = true; e.preventDefault(); e.stopPropagation();

            const rect = tile.getBoundingClientRect();
            offX = e.clientX - rect.left; offY = e.clientY - rect.top;
            originCard = tile.closest('.dash-card');

            ghost = tile.cloneNode(true);
            ghost.classList.add('drag-ghost');
            Object.assign(ghost.style, {
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                position: 'fixed',
                zIndex: 9999,
                pointerEvents: 'none'
            });

            placeholder = document.createElement('div');
            placeholder.className = 'placeholder-tile';

            tile.parentElement.insertBefore(placeholder, tile);
            tile.remove();

            document.body.append(ghost);
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        };

        const highlightBox = (box) => {
            if (lastBox && lastBox !== box) lastBox.classList.remove('dz-zone');
            if (box) box.classList.add('dz-zone');
            lastBox = box || null;
        };

        const onMove = (e) => {
            ghost.style.left = `${e.clientX - offX}px`;
            ghost.style.top = `${e.clientY - offY}px`;

            const box = document.elementFromPoint(e.clientX, e.clientY)?.closest('#cols .tiles, .dash-card[data-card-id="config"] .config-grid');
            if (!box || box.closest('.dash-card') !== originCard) { highlightBox(null); return; }

            highlightBox(box);
            const nodes = qsa('.tile, .conf-tile, .placeholder-tile', box).filter(n => n !== ghost);
            let inserted = false;
            for (const n of nodes) {
                if (n === placeholder) continue;
                const r = n.getBoundingClientRect();
                if (e.clientY < r.top + r.height / 2) { box.insertBefore(placeholder, n); inserted = true; break; }
            }
            if (!inserted) box.append(placeholder);
        };

        const cleanup = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            ghost?.remove();
            lastBox?.classList.remove('dz-zone'); lastBox = null;
        };

        const onUp = () => {
            cleanup();
            placeholder.replaceWith(tile);
            const destCard = tile.closest('.dash-card');
            saveTilesOrder(destCard);
            dragging = false;
        };

        handle?.addEventListener('pointerdown', startDrag);
        handle?.addEventListener('click', e => e.preventDefault());
        tile.addEventListener('click', (e) => { if (dragging) { e.preventDefault(); e.stopPropagation(); } }, true);
    });
}

/* ====================== RESET GLOBAL ====================== */
function bindFactoryReset() {
    qs('#btn-factory')?.addEventListener('click', async () => {
        const ok = await (window.confirmarModal ? confirmarModal('¿Restablecer todo a fábrica?') : Promise.resolve(confirm('¿Restablecer todo a fábrica?')));
        if (!ok) return;
        Object.keys(localStorage).filter(k => k.startsWith('ui.')).forEach(k => localStorage.removeItem(k));
        location.reload();
    });
}

/* ====================== INIT ====================== */
function applySavedCardOrders() {
    restoreGridOrder();
    fixConfigState();
}
function init() {
    captureFactory();
    applySavedColors();
    applySavedCardOrders();
    restoreTilesOrder();

    ensureConfHandles();    // 👈 agrega manito a .conf-tile si falta
    bindCardDnD();
    bindTileDnD();          // 👈 ahora soporta .tile y .conf-tile
    bindFactoryReset();

    qsa('.dash-card').forEach(card => {
        qs('.color-open', card)?.addEventListener('click', () => openColorModal(card));
        qs('.reset-card', card)?.addEventListener('click', () => resetCardLive(card));
        qs('.size-toggle', card)?.addEventListener('click', () => toggleCardSize(card));
    });

    applyPreferredSizes();
    refreshFavorites();
}



document.addEventListener('DOMContentLoaded', init);

/* ====================== FALLBACKS MODALES ====================== */
window.exitoModal = window.exitoModal || (msg => console.log('OK:', msg));
window.errorModal = window.errorModal || (msg => console.error('ERROR:', msg));
window.advertenciaModal = window.advertenciaModal || (msg => console.warn('WARN:', msg));
window.confirmarModal = window.confirmarModal || (msg => Promise.resolve(confirm(msg)));
window.addEventListener('resize', debounce(fixConfigState, 120));


// --- utils ---
function debounce(fn, wait = 120) {
    let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}

// ¿la card está sola en su fila del grid?
function isAloneInRow(card) {
    if (!card) return false;
    const cards = qsa('#cols .dash-card');
    if (cards.length === 1) return true; // único en el grid -> fullwidth

    const myTop = card.getBoundingClientRect().top;
    // otros en la misma fila (misma línea de grid = misma coordenada top ± 1px)
    const peersSameRow = cards.filter(c => {
        if (c === card) return false;
        return Math.abs(c.getBoundingClientRect().top - myTop) <= 1;
    });
    return peersSameRow.length === 0;
}


function showReloadOverlay(msg = 'Restableciendo...') {
    const overlay = document.createElement('div');
    overlay.id = 'reload-overlay';
    overlay.style.cssText = `
    position:fixed; inset:0; z-index:99999;
    display:flex; align-items:center; justify-content:center;
    background:rgba(5,10,20,.65); backdrop-filter:blur(2px);
  `;
    overlay.innerHTML = `
    <div style="
      padding:18px 22px; border-radius:14px; 
      background:#0f1724; color:#e8efff; 
      box-shadow:0 12px 28px rgba(0,0,0,.35);
      display:flex; align-items:center; gap:12px;
    ">
      <div class="spinner-border spinner-border-sm text-info" role="status"></div>
      <span>${msg}</span>
    </div>`;
    document.body.appendChild(overlay);
}



//CONFIGURACIONES

async function listaConfiguracion() {
    const url = `/${controllerConfiguracion}/Lista`;
    const response = await fetch(url, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });
    if (!response.ok) throw new Error('Error al cargar configuraciones');

    const data = await response.json();
    return data.map(configuracion => ({
        Id: configuracion.Id,
        Nombre: configuracion.Nombre,
        NombreCombo: configuracion.NombreCombo
    }));
}


async function abrirConfiguracion(_nombreConfiguracion, _controllerConfiguracion, _comboNombre = null, _comboController = null, _lblComboNombre) {

    try {

        nombreConfiguracion = _nombreConfiguracion;
        controllerConfiguracion = _controllerConfiguracion,
            comboNombre = _comboNombre,
            comboController = _comboController,
            lblComboNombre = _lblComboNombre;

        var result = await llenarConfiguraciones()

        if (!result) {
            await errorModal("Ha ocurrido un error al cargar la lista")
            return;
        }

        $('#ModalEdicionConfiguraciones').modal('hide');
        $('#modalConfiguracion').modal('show');

        cancelarModificarConfiguracion();

        $('#txtNombreConfiguracion').on('input', function () {
            validarCamposConfiguracion()
        });


        $('#cmbConfiguracion').on('change', function () {
            validarCamposConfiguracion()
        });


        document.getElementById("modalConfiguracionLabel").innerText = "Configuracion de " + nombreConfiguracion;
    } catch (ex) {
        errorModal("Ha ocurrido un error al cargar la lista")
    }

}

async function editarConfiguracion(id) {
    fetch(controllerConfiguracion + "/EditarInfo?id=" + id, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token // 👈 tu token aquí
        }
    })
        .then(response => {
            if (!response.ok) throw new Error("Ha ocurrido un error.");
            return response.json();
        })
        .then(dataJson => {
            if (dataJson !== null) {

                document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Modificar";
                document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
                document.getElementById("txtNombreConfiguracion").value = dataJson.Nombre;
                document.getElementById("txtIdConfiguracion").value = dataJson.Id;

                document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");

                if (comboNombre != null) {
                    document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
                    document.getElementById("cmbConfiguracion").value = dataJson.IdCombo;
                }

                validarCamposConfiguracion();
            } else {
                throw new Error("Ha ocurrido un error.");
            }
        })
        .catch(error => {
            errorModal("Ha ocurrido un error.");
        });
}


async function llenarConfiguraciones() {

    try {
        let configuraciones = await listaConfiguracion();

        if (comboNombre != null) {
            llenarComboConfiguracion();
            document.getElementById("divConfiguracionCombo").removeAttribute("hidden", "");
        } else {
            document.getElementById("divConfiguracionCombo").setAttribute("hidden", "hidden");
        }


        document.getElementById("lblListaVacia").innerText = "";
        document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");

        $("#configuracion-list").empty();

        if (configuraciones.length == 0) {
            document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;

            document.getElementById("lblListaVacia").style.color = 'red';
            document.getElementById("lblListaVacia").removeAttribute("hidden");
            listaVacia = true;

        } else {

            listaVacia = false;
            configuraciones.forEach((configuracion, index) => {

                nombreConfig = configuracion.Nombre;

                if (configuracion.NombreCombo != null) {
                    nombreConfig += " - " + configuracion.NombreCombo;
                }

                var indexado = configuracion.Id
                $("#configuracion-list").append(`
                         <div class="list-item" data-id="${configuracion.Id}">
                    <span>${nombreConfig}</span>
                    
                    <i class="fa fa-pencil-square-o edit-icon text-white" data-index="${indexado}" onclick="editarConfiguracion(${indexado})" style="float: right;"></i>
                    <i class="fa fa-trash eliminar-icon text-danger" data-index="${indexado}" onclick="eliminarConfiguracion(${indexado})"></i>
                </div>
                    `);
            });


        }
        return true;
    } catch (ex) {
        return false;

    }
}

async function eliminarConfiguracion(id) {


    let resultado = await confirmarModal("¿Desea eliminar el/la" + nombreConfiguracion + "?");
    if (!resultado) return;

    if (resultado) {
        try {
            const response = await fetch(controllerConfiguracion + "/Eliminar?id=" + id, {
                method: "DELETE",
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error("Error al eliminar " + nombreConfiguracion);
            }

            const dataJson = await response.json();

            if (dataJson.valor) {
                llenarConfiguraciones()

                exitoModal(nombreConfiguracion + " eliminada correctamente")
            }
        } catch (error) {
            console.error("Ha ocurrido un error:", error);
        }
    }
}


async function llenarComboConfiguracion() {
    const res = await fetch(`${comboController}/Lista`, {
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
        }
    });
    if (!res.ok) throw new Error('Error al cargar combo');

    const data = await res.json();
    llenarSelect("cmbConfiguracion", data);
}

function validarCamposConfiguracion() {
    const nombre = $("#txtNombreConfiguracion").val();
    const combo = $("#cmbConfiguracion").val();

    const camposValidos = nombre !== "";
    const selectValido = combo !== "";

    // estilos
    $("#lblNombreConfiguracion").css("color", camposValidos ? "" : "red");
    $("#txtNombreConfiguracion").css("border-color", camposValidos ? "" : "red");
    $("#cmbConfiguracion").css("border-color", selectValido ? "" : "red");

    // lógica de validación
    if (comboNombre != null) {
        return camposValidos && selectValido;
    } else {
        return camposValidos;
    }
}


function guardarCambiosConfiguracion() {
    if (validarCamposConfiguracion()) {
        const idConfiguracion = $("#txtIdConfiguracion").val();
        const idCombo = $("#cmbConfiguracion").val();
        const nuevoModelo = {
            "Id": idConfiguracion !== "" ? idConfiguracion : 0,
            "IdCombo": comboNombre !== "" ? idCombo : 0,
            "Nombre": $("#txtNombreConfiguracion").val(),
        };

        const url = idConfiguracion === "" ? controllerConfiguracion + "/Insertar" : controllerConfiguracion + "/Actualizar";
        const method = idConfiguracion === "" ? "POST" : "PUT";

        fetch(url, {
            method: method,
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(nuevoModelo)
        })
            .then(response => {
                if (!response.ok) throw new Error(response.statusText);
                return response.json();
            })
            .then(dataJson => {
                const mensaje = idConfiguracion === "" ? nombreConfiguracion + " registrado/a correctamente" : nombreConfiguracion + " modificado/a correctamente";
                llenarConfiguraciones()
                cancelarModificarConfiguracion();
                exitoModal(mensaje)
            })
            .catch(error => {
                console.error('Error:', error);
            });
    } else {
        errorModal('Debes completar los campos requeridos');
    }
}

function cancelarModificarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("agregarConfiguracion").removeAttribute("hidden");

    if (listaVacia == true) {
        document.getElementById("lblListaVacia").innerText = `La lista de ${nombreConfiguracion} esta vacia.`;
        document.getElementById("lblListaVacia").style.color = 'red';
        document.getElementById("lblListaVacia").removeAttribute("hidden");
    }
}

function agregarConfiguracion() {
    document.getElementById("txtNombreConfiguracion").value = "";
    document.getElementById("txtIdConfiguracion").value = "";
    document.getElementById("contenedorNombreConfiguracion").removeAttribute("hidden");
    document.getElementById("agregarConfiguracion").setAttribute("hidden", "hidden");
    document.getElementById("lblListaVacia").innerText = "";
    document.getElementById("lblListaVacia").setAttribute("hidden", "hidden");
    document.getElementById("btnRegistrarModificarConfiguracion").textContent = "Agregar";

    $('#lblNombreConfiguracion').css('color', 'red');
    $('#txtNombreConfiguracion').css('border-color', 'red');

    if (comboNombre != null) {
        document.getElementById("lblConfiguracionCombo").innerText = lblComboNombre;
        document.getElementById("cmbConfiguracion").value = "";
        $('#cmbConfiguracion').css('border-color', 'red');
    }
}

    function abrirConfiguraciones() {
        $('#ModalEdicionConfiguraciones').modal('show');
        $("#btnGuardarConfiguracion").text("Aceptar");
        $("#modalEdicionLabel").text("Configuraciones");
}

LS.CARD_SIZE = id => `ui.card.size.${id}`; // 'full' | 'normal'

function getCardSizePref(card) {
    const id = card.dataset.cardId;
    // si no hay preferencia guardada, partimos de cómo está en el DOM
    const def = card.classList.contains('fullwidth') ? 'full' : 'normal';
    return load(LS.CARD_SIZE(id), def);
}

function updateSizeToggleIcon(card) {
    const btn = qs('.size-toggle i', card);
    if (!btn) return;
    const mode = getCardSizePref(card);
    btn.className = `fa ${mode === 'full' ? 'fa-compress' : 'fa-expand'}`;
    const bwrap = btn.parentElement;
    if (bwrap) bwrap.title = (mode === 'full') ? 'Achicar (tamaño normal)' : 'Agrandar (full width)';
}

function setCardSize(card, mode) {
    if (mode === 'full') card.classList.add('fullwidth');
    else card.classList.remove('fullwidth'); // tamaño normal
    save(LS.CARD_SIZE(card.dataset.cardId), mode);
    updateSizeToggleIcon(card);
}

function toggleCardSize(card) {
    const next = getCardSizePref(card) === 'full' ? 'normal' : 'full';
    setCardSize(card, next);
}

function applyPreferredSizes() {
    qsa('.dash-card').forEach(card => {
        const pref = load(LS.CARD_SIZE(card.dataset.cardId), null);
        if (pref) setCardSize(card, pref);
        else updateSizeToggleIcon(card);
    });
}


function ensureConfHandles() {
    qsa('.dash-card[data-card-id="config"] .conf-tile').forEach(btn => {
        if (!btn.querySelector('.tile-handle')) {
            const h = document.createElement('span');
            h.className = 'tile-handle';
            h.title = 'Arrastrar';
            h.innerHTML = '<i class="fa fa-hand-paper-o"></i>';
            btn.appendChild(h);
        }
    });
}


document.addEventListener('click', (e) => {
    const a = e.target.closest('#cols .tiles .tile'); // anclas de tiles en secciones
    if (!a) return;

    // si estuvimos arrastrando, bindTileDnD ya frenó el click y no llegamos acá
    const id = a.dataset.id;
    if (id) bumpVisit(id); // suma 1 en LS y luego refreshFavorites()
}, true);