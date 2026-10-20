/* Evaluador de fórmulas tipo Excel (subconjunto: + - * / ^ & % comparaciones, SUM, IF, ROUND,
   ROUNDUP, EDATE, NOT, NPV, IRR). Funciona en el navegador (window.FX) y en Node (module.exports).
   Reglas de Excel en configuración regional española: el texto "0,00" vale 0 en operaciones, SUM
   ignora el texto de las celdas, un texto nunca es igual a un número, etc. */
(function (root) {
  'use strict';
  const ERR = (e) => ({ err: e });
  const isErr = (v) => v !== null && typeof v === 'object' && 'err' in v;

  // ---------- tokenizer
  const RE = {
    ws: /^\s+/,
    str: /^"((?:[^"]|"")*)"/,
    qsheet: /^'((?:[^']|'')+)'!/,
    sheet: /^([A-Za-z_À-ɏ][\w.À-ɏ]*)!/,
    cell: /^\$?([A-Z]{1,3})\$?(\d+)/,
    num: /^(\d+(?:\.\d+)?(?:[Ee][+-]?\d+)?|\.\d+(?:[Ee][+-]?\d+)?)/,
    func: /^([A-Z][A-Z0-9.]*)\(/,
    bool: /^(TRUE|FALSE)(?![A-Z0-9(])/,
    op: /^(<=|>=|<>|[-+*/^&=<>%(),:])/,
  };
  function tokenize(s) {
    const t = [];
    let i = 0;
    while (i < s.length) {
      const r = s.slice(i);
      let m;
      if ((m = RE.ws.exec(r))) { i += m[0].length; continue; }
      if ((m = RE.str.exec(r))) { t.push({ k: 'str', v: m[1].replace(/""/g, '"') }); i += m[0].length; continue; }
      if ((m = RE.qsheet.exec(r)) || (m = RE.sheet.exec(r))) {
        const sheet = m[1].replace(/''/g, "'");
        i += m[0].length;
        const r2 = s.slice(i);
        const c = RE.cell.exec(r2);
        if (!c) throw new Error('Referencia no válida en ' + s);
        t.push({ k: 'ref', sheet, col: colNum(c[1]), row: +c[2] });
        i += c[0].length;
        continue;
      }
      if ((m = RE.func.exec(r))) { t.push({ k: 'func', v: m[1] }); i += m[0].length; continue; }
      if ((m = RE.bool.exec(r))) { t.push({ k: 'bool', v: m[1] === 'TRUE' }); i += m[0].length; continue; }
      if ((m = RE.cell.exec(r))) { t.push({ k: 'ref', sheet: null, col: colNum(m[1]), row: +m[2] }); i += m[0].length; continue; }
      if ((m = RE.num.exec(r))) { t.push({ k: 'num', v: parseFloat(m[1]) }); i += m[0].length; continue; }
      if ((m = RE.op.exec(r))) { t.push({ k: 'op', v: m[1] }); i += m[0].length; continue; }
      throw new Error('No entiendo la fórmula: ' + s + ' (en «' + r.slice(0, 12) + '»)');
    }
    return t;
  }
  function colNum(L) { let n = 0; for (const ch of L) n = n * 26 + ch.charCodeAt(0) - 64; return n; }
  function colName(n) { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function parseAddr(a) { const m = /^([A-Z]{1,3})(\d+)$/.exec(a); return { col: colNum(m[1]), row: +m[2] }; }

  // ---------- parser
  function parse(src, sheet) {
    const t = tokenize(src);
    let p = 0;
    const peek = () => t[p];
    const isOp = (v) => t[p] && t[p].k === 'op' && t[p].v === v;
    const eat = (v) => { if (!isOp(v)) throw new Error('Se esperaba «' + v + '» en ' + src); p++; };
    function expr() { return comparison(); }
    function comparison() {
      let a = concat();
      while (t[p] && t[p].k === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(t[p].v)) { const o = t[p++].v; a = { t: 'bin', o, a, b: concat() }; }
      return a;
    }
    function concat() { let a = additive(); while (isOp('&')) { p++; a = { t: 'bin', o: '&', a, b: additive() }; } return a; }
    function additive() { let a = term(); while (isOp('+') || isOp('-')) { const o = t[p++].v; a = { t: 'bin', o, a, b: term() }; } return a; }
    function term() { let a = power(); while (isOp('*') || isOp('/')) { const o = t[p++].v; a = { t: 'bin', o, a, b: power() }; } return a; }
    function power() { let a = unary(); while (isOp('^')) { p++; a = { t: 'bin', o: '^', a, b: unary() }; } return a; }
    function unary() {
      if (isOp('-')) { p++; return { t: 'neg', a: unary() }; }
      if (isOp('+')) { p++; return unary(); }
      return postfix();
    }
    function postfix() { let a = primary(); while (isOp('%')) { p++; a = { t: 'pct', a }; } return a; }
    function primary() {
      const k = peek();
      if (!k) throw new Error('Fórmula incompleta: ' + src);
      if (k.k === 'num') { p++; return { t: 'lit', v: k.v }; }
      if (k.k === 'str') { p++; return { t: 'lit', v: k.v }; }
      if (k.k === 'bool') { p++; return { t: 'lit', v: k.v }; }
      if (k.k === 'ref') {
        p++;
        const s1 = k.sheet || sheet;
        if (isOp(':') && t[p + 1] && t[p + 1].k === 'ref') {
          p++;
          const k2 = t[p++];
          return { t: 'range', sheet: s1, r1: Math.min(k.row, k2.row), c1: Math.min(k.col, k2.col), r2: Math.max(k.row, k2.row), c2: Math.max(k.col, k2.col) };
        }
        return { t: 'ref', sheet: s1, row: k.row, col: k.col };
      }
      if (k.k === 'func') {
        p++;
        const args = [];
        if (!isOp(')')) {
          for (;;) {
            if (isOp(',')) { args.push({ t: 'lit', v: null, missing: true }); p++; continue; }
            if (isOp(')')) { args.push({ t: 'lit', v: null, missing: true }); break; }
            args.push(expr());
            if (isOp(',')) { p++; if (isOp(')')) { args.push({ t: 'lit', v: null, missing: true }); break; } continue; }
            break;
          }
        }
        eat(')');
        return { t: 'fn', name: k.v, args };
      }
      if (isOp('(')) { p++; const e = expr(); eat(')'); return e; }
      throw new Error('Algo inesperado en la fórmula: ' + src);
    }
    const ast = expr();
    if (p !== t.length) throw new Error('Sobra texto en la fórmula: ' + src);
    return ast;
  }

  // ---------- value helpers
  function textToNum(s) {
    const x = s.trim();
    if (/^[-+]?\d+(,\d+)?$/.test(x)) return parseFloat(x.replace(',', '.'));
    if (/^[-+]?\d*\.\d+$/.test(x)) return parseFloat(x);
    if (/^[-+]?\d+(,\d+)?%$/.test(x)) return parseFloat(x.replace(',', '.')) / 100;
    return null;
  }
  function toNum(v) {
    if (isErr(v)) return v;
    if (v === null || v === undefined) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'string') { const n = textToNum(v); return n === null ? ERR('#VALUE!') : n; }
    return ERR('#VALUE!');
  }
  function toBool(v) {
    if (isErr(v)) return v;
    if (v === null || v === undefined) return false;
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v !== 0;
    if (typeof v === 'string') { const u = v.toUpperCase(); if (u === 'TRUE') return true; if (u === 'FALSE') return false; return ERR('#VALUE!'); }
    return ERR('#VALUE!');
  }
  const typeRank = (v) => (typeof v === 'number' ? 0 : typeof v === 'string' ? 1 : 2);
  function compare(a, b) {
    if (a === null || a === undefined) a = (typeof b === 'string') ? '' : (typeof b === 'boolean' ? false : 0);
    if (b === null || b === undefined) b = (typeof a === 'string') ? '' : (typeof a === 'boolean' ? false : 0);
    const ra = typeRank(a), rb = typeRank(b);
    if (ra !== rb) return ra < rb ? -1 : 1;
    if (ra === 1) { const x = a.toLowerCase(), y = b.toLowerCase(); return x < y ? -1 : x > y ? 1 : 0; }
    if (ra === 2) return a === b ? 0 : (a ? 1 : -1);
    if (Math.abs(a - b) <= 1e-12 * Math.max(1, Math.abs(a), Math.abs(b))) return 0;
    return a < b ? -1 : 1;
  }
  function roundHalfAway(x, d) {
    const f = Math.pow(10, d);
    const y = Math.abs(x) * f;
    const r = Math.round(y + 1e-9 * Math.max(1, y) * 1e-6);
    return Math.sign(x) * r / f;
  }
  function roundUp(x, d) {
    const f = Math.pow(10, d);
    const y = Math.abs(x) * f;
    const r = Math.ceil(y - 1e-9);
    return Math.sign(x) * r / f;
  }
  // Excel serial dates
  function serialToDate(n) { return new Date(Date.UTC(1899, 11, 30) + Math.round(n * 86400000)); }
  function dateToSerial(d) { return (d.getTime() - Date.UTC(1899, 11, 30)) / 86400000; }
  function edate(n, m) {
    const d = serialToDate(Math.floor(n));
    const y = d.getUTCFullYear(), mo = d.getUTCMonth() + m, day = d.getUTCDate();
    const last = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
    return dateToSerial(new Date(Date.UTC(y, mo, Math.min(day, last))));
  }
  function irr(vals, guess) {
    const f = (r) => vals.reduce((s, v, i) => s + v / Math.pow(1 + r, i), 0);
    const df = (r) => vals.reduce((s, v, i) => s - i * v / Math.pow(1 + r, i + 1), 0);
    let r = guess;
    for (let k = 0; k < 200; k++) {
      const y = f(r), d = df(r);
      if (!isFinite(y) || !isFinite(d) || d === 0) break;
      const nr = r - y / d;
      if (Math.abs(nr - r) < 1e-14) { r = nr; return r; }
      r = nr;
      if (r <= -0.999999) r = -0.999999;
    }
    if (Math.abs(f(r)) < 1e-6) return r;
    // bisection fallback
    let lo = -0.9999, hi = 10, flo = f(lo), fhi = f(hi);
    if (flo * fhi > 0) return ERR('#NUM!');
    for (let k = 0; k < 400; k++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) { hi = mid; } else { lo = mid; flo = fm; } }
    return (lo + hi) / 2;
  }

  // ---------- workbook
  class Workbook {
    constructor(model) {
      this.cells = new Map(); // key -> {f?:string, v?:any, ast?}
      this.sheetRows = new Map(); // sheet -> Map(row -> Map(col -> key))
      for (const [sheet, cells] of Object.entries(model)) {
        if (sheet.startsWith('_')) continue;
        for (const [addr, c] of Object.entries(cells)) this._put(sheet, addr, c.f !== undefined ? { f: c.f } : { v: decode(c.v) });
      }
      this.values = new Map();
      this.order = null;
    }
    _put(sheet, addr, cell) {
      const key = sheet + '!' + addr;
      this.cells.set(key, cell);
      const { row, col } = parseAddr(addr);
      if (!this.sheetRows.has(sheet)) this.sheetRows.set(sheet, new Map());
      const rows = this.sheetRows.get(sheet);
      if (!rows.has(row)) rows.set(row, new Map());
      rows.get(row).set(col, key);
    }
    setValue(sheet, addr, v) { const k = sheet + '!' + addr; const c = this.cells.get(k); if (c && c.f !== undefined) this.order = null; if (c) { delete c.f; delete c.ast; c.v = v; } else { this._put(sheet, addr, { v }); this.order = null; } }
    setFormula(sheet, addr, f) { this._put(sheet, addr, { f: f.replace(/^=/, '') }); this.order = null; }
    get(sheet, addr) { const k = sheet + '!' + addr; if (this.values.has(k)) return this.values.get(k); const c = this.cells.get(k); return c ? (c.f !== undefined ? undefined : c.v) : null; }
    _ast(key, c) {
      if (!c.ast) { const sheet = key.slice(0, key.lastIndexOf('!')); c.ast = parse(c.f, sheet); }
      return c.ast;
    }
    _deps(ast, out) {
      switch (ast.t) {
        case 'ref': out.push(ast.sheet + '!' + colName(ast.col) + ast.row); break;
        case 'range': {
          const rows = this.sheetRows.get(ast.sheet);
          if (!rows) break;
          for (let r = ast.r1; r <= ast.r2; r++) { const rr = rows.get(r); if (!rr) continue; for (const [c, key] of rr) if (c >= ast.c1 && c <= ast.c2) out.push(key); }
          break;
        }
        case 'bin': this._deps(ast.a, out); this._deps(ast.b, out); break;
        case 'neg': case 'pct': this._deps(ast.a, out); break;
        case 'fn': for (const a of ast.args) this._deps(a, out); break;
      }
    }
    _buildOrder() {
      const state = new Map(); // 1 visiting, 2 done
      const order = [];
      const deps = new Map();
      const getDeps = (k) => { if (!deps.has(k)) { const c = this.cells.get(k); const out = []; if (c && c.f !== undefined) this._deps(this._ast(k, c), out); deps.set(k, out); } return deps.get(k); };
      for (const [k, c] of this.cells) {
        if (c.f === undefined || state.get(k) === 2) continue;
        const stack = [[k, 0]];
        state.set(k, 1);
        while (stack.length) {
          const top = stack[stack.length - 1];
          const ds = getDeps(top[0]);
          if (top[1] < ds.length) {
            const d = ds[top[1]++];
            const dc = this.cells.get(d);
            if (!dc || dc.f === undefined) continue;
            const st = state.get(d);
            if (st === 2) continue;
            if (st === 1) { this.cycles = (this.cycles || []).concat([d]); continue; }
            state.set(d, 1);
            stack.push([d, 0]);
          } else {
            state.set(top[0], 2);
            order.push(top[0]);
            stack.pop();
          }
        }
      }
      this.order = order;
    }
    recalc() {
      if (!this.order) { this.cycles = []; this._buildOrder(); }
      this.values = new Map();
      for (const k of this.order) {
        const c = this.cells.get(k);
        let v;
        try { v = this._eval(this._ast(k, c), k); } catch (e) { v = ERR('#ERROR'); this.lastError = e; }
        if (v && typeof v === 'object' && !isErr(v)) v = this._deref(v);
        if (v === null || v === undefined) v = 0; // a formula pointing at an empty cell shows 0
        this.values.set(k, v);
      }
      return this;
    }
    _cellValue(key) {
      if (this.values.has(key)) return this.values.get(key);
      const c = this.cells.get(key);
      if (!c) return null;
      if (c.f !== undefined) return ERR('#CYCLE');
      return c.v;
    }
    _deref(v) {
      if (v && typeof v === 'object') {
        if (v.ref) return this._cellValue(v.ref);
        if (v.range) { const r = v.range; if (r.r1 === r.r2 && r.c1 === r.c2) return this._cellValue(r.sheet + '!' + colName(r.c1) + r.r1); return ERR('#VALUE!'); }
      }
      return v;
    }
    *_rangeVals(ast) {
      const rows = this.sheetRows.get(ast.sheet);
      if (!rows) return;
      for (let r = ast.r1; r <= ast.r2; r++) { const rr = rows.get(r); if (!rr) continue; const cols = [...rr.keys()].filter((c) => c >= ast.c1 && c <= ast.c2).sort((a, b) => a - b); for (const c of cols) yield this._cellValue(rr.get(c)); }
    }
    _eval(ast, key) {
      switch (ast.t) {
        case 'lit': return ast.v;
        case 'ref': return { ref: ast.sheet + '!' + colName(ast.col) + ast.row };
        case 'range': return { range: ast };
        case 'neg': { const v = toNum(this._deref(this._eval(ast.a, key))); return isErr(v) ? v : -v; }
        case 'pct': { const v = toNum(this._deref(this._eval(ast.a, key))); return isErr(v) ? v : v / 100; }
        case 'bin': {
          const a = this._deref(this._eval(ast.a, key)), b = this._deref(this._eval(ast.b, key));
          if (isErr(a)) return a;
          if (isErr(b)) return b;
          switch (ast.o) {
            case '+': case '-': case '*': case '/': case '^': {
              const x = toNum(a), y = toNum(b);
              if (isErr(x)) return x;
              if (isErr(y)) return y;
              if (ast.o === '+') return x + y;
              if (ast.o === '-') return x - y;
              if (ast.o === '*') return x * y;
              if (ast.o === '/') return y === 0 ? ERR('#DIV/0!') : x / y;
              return Math.pow(x, y);
            }
            case '&': return String(a ?? '') + String(b ?? '');
            default: {
              const c = compare(a, b);
              return ast.o === '=' ? c === 0 : ast.o === '<>' ? c !== 0 : ast.o === '<' ? c < 0 : ast.o === '>' ? c > 0 : ast.o === '<=' ? c <= 0 : c >= 0;
            }
          }
        }
        case 'fn': return this._fn(ast, key);
      }
      return ERR('#ERROR');
    }
    _fn(ast, key) {
      const A = ast.args;
      const val = (i) => this._deref(this._eval(A[i], key));
      switch (ast.name) {
        case 'IF': {
          const c = toBool(val(0));
          if (isErr(c)) return c;
          if (c) return A.length > 1 ? (A[1].missing ? 0 : this._eval(A[1], key)) : true;
          return A.length > 2 ? (A[2].missing ? 0 : this._eval(A[2], key)) : false;
        }
        case 'SUM': {
          let s = 0;
          for (const a of A) {
            const r = this._eval(a, key);
            if (r && typeof r === 'object' && r.range) { for (const v of this._rangeVals(r.range)) { if (isErr(v)) return v; if (typeof v === 'number') s += v; } continue; }
            if (r && typeof r === 'object' && r.ref) { const v = this._cellValue(r.ref); if (isErr(v)) return v; if (typeof v === 'number') s += v; continue; }
            if (isErr(r)) return r;
            const n = toNum(r);
            if (isErr(n)) return n;
            s += n;
          }
          return s;
        }
        case 'ROUND': { const x = toNum(val(0)), d = toNum(val(1)); if (isErr(x)) return x; if (isErr(d)) return d; return roundHalfAway(x, Math.trunc(d)); }
        case 'ROUNDUP': { const x = toNum(val(0)), d = toNum(val(1)); if (isErr(x)) return x; if (isErr(d)) return d; return roundUp(x, Math.trunc(d)); }
        case 'NOT': { const b = toBool(val(0)); return isErr(b) ? b : !b; }
        case 'EDATE': { const d = toNum(val(0)), m = toNum(val(1)); if (isErr(d)) return d; if (isErr(m)) return m; return edate(d, Math.trunc(m)); }
        case 'NPV': {
          const rate = toNum(val(0));
          if (isErr(rate)) return rate;
          let s = 0, i = 1;
          for (let k = 1; k < A.length; k++) {
            const r = this._eval(A[k], key);
            const list = (r && typeof r === 'object' && r.range) ? [...this._rangeVals(r.range)] : [this._deref(r)];
            for (const v of list) { if (isErr(v)) return v; if (typeof v === 'number') { s += v / Math.pow(1 + rate, i); i++; } }
          }
          return s;
        }
        case 'IRR': {
          const r = this._eval(A[0], key);
          const list = (r && typeof r === 'object' && r.range) ? [...this._rangeVals(r.range)] : [this._deref(r)];
          const nums = [];
          for (const v of list) { if (isErr(v)) return v; if (typeof v === 'number') nums.push(v); }
          const g = A.length > 1 && !A[1].missing ? toNum(val(1)) : 0.1;
          return irr(nums, isErr(g) ? 0.1 : g);
        }
      }
      return ERR('#NAME?');
    }
  }
  function decode(v) { return (v && typeof v === 'object' && 'd' in v) ? v.d : v; }

  const FX = { Workbook, parse, tokenize, colName, colNum, isErr, serialToDate, dateToSerial, edate };
  if (typeof module !== 'undefined' && module.exports) module.exports = FX; else root.FX = FX;
})(typeof window !== 'undefined' ? window : globalThis);
