/* Exportación con el diseño de las hojas «Imprimir (1)» e «Imprimir (2)» del Excel original:
   mismas celdas, anchos, colores, bordes y formatos, con los números de la promoción calculada. */
(function (root) {
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const colNum = (s) => { let c = 0; for (const ch of s) c = c * 26 + ch.charCodeAt(0) - 64; return c; }; // A = 1
  const colName = (n) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const split = (a) => { const m = a.match(/^([A-Z]+)(\d+)$/); return [colNum(m[1]), +m[2]]; };
  const range = (r) => { const [a, b] = r.split(':'); const [c1, r1] = split(a); const [c2, r2] = split(b || a); return { c1, r1, c2, r2 }; };
  const serialDate = (n) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86400000);

  // ---------- formatos de número de Excel, en español ----------
  function sections(nf) { const out = []; let cur = '', q = false; for (let i = 0; i < nf.length; i++) { const ch = nf[i]; if (ch === '"') q = !q; if (ch === '\\' && !q) { cur += ch + nf[++i]; continue; } if (ch === ';' && !q) { out.push(cur); cur = ''; continue; } cur += ch; } out.push(cur); return out; }
  function group(s) { return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function general(v) {
    if (Number.isInteger(v)) return String(v);
    let s = Math.abs(v) >= 1e11 || (Math.abs(v) < 1e-9 && v !== 0) ? v.toExponential(5) : String(parseFloat(v.toPrecision(10)));
    return s.replace('.', ',');
  }
  function fmtExcel(v, nf) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'boolean') return v ? 'VERDADERO' : 'FALSO';
    if (typeof v === 'string') { if (/^#/.test(v)) return v; return v; }
    if (!isFinite(v)) return '';
    nf = nf || 'General';
    if (nf === 'General' || nf === '@') return general(v);
    const secs = sections(nf);
    let sec, neg = false;
    if (v > 0 || (v === 0 && secs.length < 3)) sec = secs[0];
    else if (v < 0) { if (secs.length > 1 && secs[1] !== '') { sec = secs[1]; } else { sec = secs[0]; neg = true; } }
    else sec = secs[2];
    if (v < 0 && secs.length > 1) v = Math.abs(v); // la sección negativa ya pone el signo
    if (sec === undefined) sec = secs[0];
    sec = sec.replace(/\[[^\]]*\]/g, ''); // colores, configuración regional
    // fecha
    const bare = sec.replace(/"[^"]*"/g, '').replace(/\\./g, '');
    if (/[ymd]/i.test(bare) && !/[0#]/.test(bare)) {
      const d = serialDate(v);
      return sec.replace(/"([^"]*)"|\\(.)|yyyy|yy|mmmm|mmm|mm|m|dd|d|@/gi, (t, q, e) => {
        if (q !== undefined) return q; if (e !== undefined) return e;
        const T = t.toLowerCase();
        if (T === 'yyyy') return String(d.getUTCFullYear()); if (T === 'yy') return String(d.getUTCFullYear()).slice(2);
        if (T === 'mmmm' || T === 'mmm') return MESES[d.getUTCMonth()]; if (T === 'mm') return String(d.getUTCMonth() + 1).padStart(2, '0'); if (T === 'm') return String(d.getUTCMonth() + 1);
        if (T === 'dd') return String(d.getUTCDate()).padStart(2, '0'); if (T === 'd') return String(d.getUTCDate());
        return '';
      });
    }
    // número
    let out = '', pattern = '', placed = false;
    const tokens = [];
    for (let i = 0; i < sec.length; i++) {
      const ch = sec[i];
      if (ch === '"') { const j = sec.indexOf('"', i + 1); tokens.push(['lit', sec.slice(i + 1, j < 0 ? undefined : j)]); i = j < 0 ? sec.length : j; continue; }
      if (ch === '\\') { tokens.push(['lit', sec[++i] || '']); continue; }
      if (ch === '_') { i++; tokens.push(['lit', ' ']); continue; }
      if (ch === '*') { i++; continue; }
      if ('#0?,.'.includes(ch)) { tokens.push(['num', ch]); continue; }
      if (ch === '%') { tokens.push(['pct', '%']); continue; }
      if (ch === '@') continue;
      tokens.push(['lit', ch]);
    }
    for (const [k, t] of tokens) if (k === 'num') pattern += t;
    if (tokens.some((t) => t[0] === 'pct')) v = v * 100;
    const [ip, dp = ''] = pattern.split('.');
    const decs = (dp.match(/[0#?]/g) || []).length;
    const grouping = /[#0?],[#0?]/.test(ip);
    const minInt = (ip.match(/0/g) || []).length;
    let numStr = '';
    if (pattern) {
      const r = Math.abs(v).toFixed(decs);
      let [i, d] = r.split('.');
      if (minInt === 0 && i === '0') i = '';
      i = i.padStart(minInt, '0');
      if (grouping) i = group(i);
      if (d && /#/.test(dp)) d = d.replace(/0+$/, '');
      numStr = i + (d ? ',' + d : '');
      if (!numStr && /0/.test(pattern)) numStr = '0';
    }
    for (const [k, t] of tokens) {
      if (k === 'num') { if (!placed) { out += numStr; placed = true; } continue; }
      out += t;
    }
    if ((neg || (v < 0 && secs.length === 1)) && Number(numStr.replace(/\./g, '').replace(',', '.')) !== 0) out = '-' + out.trimStart();
    return out.replace(/\s+$/, '').replace(/^\s+/, '');
  }

  // ---------- preparar las celdas ----------
  function prepare(which, { promo, res, layout }) {
    const L = layout.sheets[which], st = layout.styles, vals = (res.print || {})[which] || {};
    const cells = {};
    for (const a of Object.keys(L.cells)) cells[a] = { v: undefined, s: st[L.cells[a]] };
    for (const [a, v] of Object.entries(vals)) { cells[a] = cells[a] || { s: null }; cells[a].v = v; }
    for (const [s, a] of layout.especiales.nombre) if (s === which) { cells[a] = cells[a] || { s: null }; cells[a].v = promo.nombre || 'Promoción'; }
    for (const [s, a, i] of layout.especiales.trimestres) if (s === which) {
      const m = res.meses[i * 3]; cells[a] = cells[a] || { s: null };
      cells[a].v = m && m.fecha ? `Trimestre ${i + 1}\n${fmtMes(m.fecha)}` : '';
    }
    for (const c of Object.values(cells)) if (c.v === '0,00' || c.v === '0') c.v = 0;
    // formato condicional del Excel (números negativos en rojo, «ENTREGA LLAVES» resaltado…), ya aplicado
    for (const rule of L.cond || []) for (const rg of rule.ranges) {
      const g = range(rg);
      for (let r = g.r1; r <= g.r2; r++) for (let cc = g.c1; cc <= g.c2; cc++) {
        const a = colName(cc) + r, cell = cells[a]; if (!cell) continue;
        const v = cell.v;
        const hit = rule.op === 'lessThan' ? typeof v === 'number' && v < rule.value : rule.op === 'greaterThan' ? typeof v === 'number' && v > rule.value : rule.op === 'equal' ? v === rule.value : false;
        if (hit) cell.s = { ...(cell.s || { nf: 'General', sz: 10 }), ...rule.fmt };
      }
    }
    return { L, cells };
  }
  const fmtMes = (iso) => { const [y, m] = iso.split('-'); return MESES[+m - 1] + '-' + y.slice(2); };

  // ---------- Excel ----------
  function toXlsx(which, payload) {
    const { L, cells } = prepare(which, payload);
    const out = {};
    for (const [a, c] of Object.entries(cells)) {
      const x = c.s ? { ...c.s } : null;
      if (x) for (const k of Object.keys(x)) if (x[k] === null || x[k] === false) delete x[k];
      out[a] = { v: c.v === undefined ? null : c.v, x: x || { nf: 'General', sz: 10 } };
    }
    const colWidths = {}; for (const [k, v] of Object.entries(L.cols)) colWidths[k] = v.w;
    const rowHeights = {}; for (const [k, v] of Object.entries(L.rows)) if (v.h) rowHeights[k] = v.h;
    return root.XLSX.build([{ name: which, cells: out, colWidths, rowHeights, merges: L.merges, printArea: L.printArea, landscape: L.orientation === 'landscape', fitToPage: L.fitToPage, showGrid: L.showGrid, defaultRowHeight: L.defaultRowHeight, paperSize: L.paperSize, margins: L.margins, center: L.center, footer: L.footer }], { title: (payload.promo.nombre || 'Promoción') + ' · ' + which, font: 'Calibri' });
  }

  // ---------- PDF ----------
  const WIN = (s) => String(s).replace(/²/g, '2').replace(/³/g, '3').replace(/−/g, '-').replace(/[^\x00-\xff€…–—‘’“”•·]/g, '');
  const hex = (h, rgb) => { const n = parseInt(h, 16); return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };
  async function toPdf(which, payload) {
    const { PDFDocument, StandardFonts, rgb } = root.PDFLib;
    const { L, cells } = prepare(which, payload);
    const doc = await PDFDocument.create();
    doc.setTitle(WIN((payload.promo.nombre || 'Promoción') + ' · ' + which)); doc.setCreator('Calculadora de promociones'); doc.setProducer('Calculadora de promociones');
    const F = await doc.embedFont(StandardFonts.Helvetica), FB = await doc.embedFont(StandardFonts.HelveticaBold), FI = await doc.embedFont(StandardFonts.HelveticaOblique);
    const A = range(L.printArea);
    const colW = [], rowH = [];
    for (let c = A.c1; c <= A.c2; c++) { const d = L.cols[colName(c)]; const w = d ? (d.hidden ? 0 : d.w) : L.defaultColWidth || 8.43; colW.push(w ? (w * 7 + 5) * 0.75 : 0); }
    for (let r = A.r1; r <= A.r2; r++) { const d = L.rows[r]; rowH.push(d && d.hidden ? 0 : (d && d.h) || L.defaultRowHeight || 12.75); }
    const W = colW.reduce((a, b) => a + b, 0), H = rowH.reduce((a, b) => a + b, 0);
    // mismo papel, márgenes y centrado que el Excel (Imprimir (1): A3 vertical; Imprimir (2): A4 horizontal), ajustado a una página
    const land = L.orientation === 'landscape';
    const [pw, ph] = L.paperSize === 8 ? [842, 1191] : [595, 842];
    const PW = land ? ph : pw, PH = land ? pw : ph;
    const mg = L.margins || {}, ML = (mg.left ?? 0.2) * 72, MR = (mg.right ?? 0.2) * 72, MT = (mg.top ?? 0.2) * 72, MB = Math.max((mg.bottom ?? 0.2) * 72, L.footer ? 20 : 0);
    const k = Math.min((PW - ML - MR) / W, (PH - MT - MB) / H, 1);
    const page = doc.addPage([PW, PH]);
    const cen = L.center || {};
    const ox = ML + (cen.h ? ((PW - ML - MR) - W * k) / 2 : 0), oy = PH - MT - (cen.v ? ((PH - MT - MB) - H * k) / 2 : 0);
    const xs = [0]; colW.forEach((w) => xs.push(xs[xs.length - 1] + w * k));
    const ys = [0]; rowH.forEach((h) => ys.push(ys[ys.length - 1] + h * k));
    const X = (ci) => ox + xs[ci], Y = (ri) => oy - ys[ri]; // ci, ri relativos al área
    // combinadas
    const mergeAt = {}, covered = new Set();
    const inMerge = {};
    for (const mr of L.merges) { const g = range(mr); if (g.c2 < A.c1 || g.c1 > A.c2 || g.r2 < A.r1 || g.r1 > A.r2) continue; mergeAt[colName(g.c1) + g.r1] = g; for (let r = g.r1; r <= g.r2; r++) for (let c = g.c1; c <= g.c2; c++) { inMerge[colName(c) + r] = g; if (r !== g.r1 || c !== g.c1) covered.add(colName(c) + r); } }
    const box = (c, r) => { const a = colName(c) + r, g = mergeAt[a]; const c2 = g ? Math.min(g.c2, A.c2) : c, r2 = g ? Math.min(g.r2, A.r2) : r; return { x0: X(c - A.c1), x1: X(c2 - A.c1 + 1), y0: Y(r - A.r1), y1: Y(r2 - A.r1 + 1) }; };
    // 1. fondos
    for (let r = A.r1; r <= A.r2; r++) for (let c = A.c1; c <= A.c2; c++) {
      const a = colName(c) + r; if (covered.has(a)) continue; const cell = cells[a]; if (!cell || !cell.s || !cell.s.bg) continue;
      const b = box(c, r); if (b.x1 - b.x0 <= 0 || b.y0 - b.y1 <= 0) continue;
      page.drawRectangle({ x: b.x0, y: b.y1, width: b.x1 - b.x0, height: b.y0 - b.y1, color: hex(cell.s.bg, rgb) });
    }
    // 2. textos
    const hasVal = (c, r) => { const x = cells[colName(c) + r]; return x && x.v !== undefined && x.v !== null && x.v !== ''; };
    for (let r = A.r1; r <= A.r2; r++) for (let c = A.c1; c <= A.c2; c++) {
      const a = colName(c) + r; if (covered.has(a)) continue; const cell = cells[a]; if (!cell || cell.v === undefined || cell.v === null || cell.v === '') continue;
      const s = cell.s || { nf: 'General', sz: 10 };
      let txt = WIN(fmtExcel(cell.v, s.nf)); if (!txt) continue;
      const font = s.b ? FB : s.i ? FI : F, size = Math.max(3, (s.sz || 10) * k * 0.92);
      const b = box(c, r), cw = b.x1 - b.x0, ch = b.y0 - b.y1; if (cw <= 0 || ch <= 0) continue;
      const isNum = typeof cell.v === 'number';
      const ha = s.ha && s.ha !== 'general' ? s.ha : isNum ? 'right' : 'left';
      const pad = 2 * k;
      let lines = String(txt).split('\n');
      if (s.wrap) { const out = []; for (const ln of lines) { let cur = ''; for (const w of ln.split(' ')) { const t = cur ? cur + ' ' + w : w; if (font.widthOfTextAtSize(t, size) > cw - 2 * pad && cur) { out.push(cur); cur = w; } else cur = t; } out.push(cur); } lines = out; }
      else if (lines.length > 1 && ch < size * 1.15 * lines.length) lines = [lines.join(' ')];
      const lh = size * 1.15, tot = lh * lines.length;
      const va = s.va || 'bottom';
      let ty = va === 'top' ? b.y0 - pad - size * 0.85 : va === 'center' ? (b.y0 + b.y1) / 2 + tot / 2 - size * 0.85 : b.y1 + pad + (tot - lh) + size * 0.2;
      // ¿puede desbordar a la derecha? (como Excel, si las celdas de al lado están vacías)
      let room = cw - 2 * pad;
      if (!isNum && !s.wrap && ha === 'left') { let cc = (mergeAt[a] ? mergeAt[a].c2 : c) + 1; while (cc <= A.c2 && !hasVal(cc, r) && !covered.has(colName(cc) + r)) { room += xs[cc - A.c1 + 1] - xs[cc - A.c1]; cc++; } }
      for (const ln0 of lines) {
        let ln = ln0;
        if (isNum && font.widthOfTextAtSize(ln, size) > cw - pad) ln = '#'.repeat(Math.max(1, Math.floor(cw / font.widthOfTextAtSize('#', size))));
        else while (ln.length > 1 && font.widthOfTextAtSize(ln, size) > room) ln = ln.slice(0, -1);
        const tw = font.widthOfTextAtSize(ln, size);
        const tx = ha === 'center' || ha === 'centerContinuous' ? (b.x0 + b.x1) / 2 - tw / 2 : ha === 'right' ? b.x1 - pad - tw : b.x0 + pad;
        page.drawText(ln, { x: tx, y: ty, size, font, color: hex(s.fc || '000000', rgb) });
        ty -= lh;
      }
    }
    // 3. bordes
    const LW = { thin: 0.5, hair: 0.3, dotted: 0.5, dashed: 0.5, medium: 1.1, thick: 1.6, double: 1.2, mediumDashed: 1.1, slantDashDot: 1, dashDot: 0.5, mediumDashDot: 1.1, dashDotDot: 0.5, mediumDashDotDot: 1.1 };
    const line = (x1, y1, x2, y2, bd) => page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: Math.max(0.3, (LW[bd[0]] || 0.5) * Math.min(1, k * 1.2)), color: hex(bd[1] || '000000', rgb), dashArray: /dash|dot/i.test(bd[0]) ? [2, 1.5] : undefined });
    for (let r = A.r1; r <= A.r2; r++) for (let c = A.c1; c <= A.c2; c++) {
      const a = colName(c) + r; const cell = cells[a]; if (!cell || !cell.s) continue; const s = cell.s;
      const x0 = X(c - A.c1), x1 = X(c - A.c1 + 1), y0 = Y(r - A.r1), y1 = Y(r - A.r1 + 1);
      if (x1 - x0 <= 0 || y0 - y1 <= 0) continue;
      const g = inMerge[a]; // dentro de una celda combinada solo cuenta el borde exterior
      if (s.bt && (!g || r === g.r1)) line(x0, y0, x1, y0, s.bt); if (s.bb && (!g || r === g.r2)) line(x0, y1, x1, y1, s.bb);
      if (s.bl && (!g || c === g.c1)) line(x0, y0, x0, y1, s.bl); if (s.br && (!g || c === g.c2)) line(x1, y0, x1, y1, s.br);
    }
    // pie de página como el del Excel («&L&D»: la fecha a la izquierda)
    if (L.footer && /&D/.test(L.footer)) { const d = new Date(); page.drawText(`${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, { x: ML, y: Math.max(8, (mg.footer ?? 0.3) * 72 - 6), size: 9, font: F, color: rgb(0, 0, 0) }); }
    return await doc.save();
  }

  const API = { fmtExcel, toXlsx, toPdf, prepare };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.PRINTX = API;
})(typeof window !== 'undefined' ? window : globalThis);
