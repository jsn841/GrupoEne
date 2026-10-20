/* Escritor mínimo de archivos Excel (.xlsx) sin librerías externas.
   XLSX.build([{ name, cols:[anchos] | colWidths:{A:12}, rowHeights:{3:20}, freeze:'B2', merges:['A1:B2'],
                 printArea:'A1:L108', landscape, fitToPage, showGrid, rows:[[celda,...],...] | cells:{A1:celda} }]) → Uint8Array
   celda: null | número | texto | { v, s } con s = estilo con nombre ('h', 't', 'b', 'eur', 'eurb', 'pct', 'pctb', 'int', 'date', 'num2', 'warn', 'note', 'hr')
          | { v, x } con x = estilo libre { nf, b, i, u, sz, fc, bg, ha, va, wrap, bl:[estilo,color], br, bt, bb }. */
(function (root) {
  const enc = new TextEncoder();
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

  function zip(files) { // [{name, data:Uint8Array}] sin compresión
    const parts = [], central = []; let off = 0;
    const dt = new Date(); const dosT = (dt.getHours() << 11) | (dt.getMinutes() << 5) | (dt.getSeconds() >> 1); const dosD = ((dt.getFullYear() - 1980) << 9) | ((dt.getMonth() + 1) << 5) | dt.getDate();
    for (const f of files) {
      const name = enc.encode(f.name), crc = crc32(f.data), n = f.data.length;
      const h = new DataView(new ArrayBuffer(30));
      h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dosT, true); h.setUint16(12, dosD, true);
      h.setUint32(14, crc, true); h.setUint32(18, n, true); h.setUint32(22, n, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
      parts.push(new Uint8Array(h.buffer), name, f.data);
      const c = new DataView(new ArrayBuffer(46));
      c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dosT, true); c.setUint16(14, dosD, true);
      c.setUint32(16, crc, true); c.setUint32(20, n, true); c.setUint32(24, n, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(new Uint8Array(c.buffer), name);
      off += 30 + name.length + n;
    }
    const cs = central.reduce((s, p) => s + p.length, 0);
    const e = new DataView(new ArrayBuffer(22));
    e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
    const all = [...parts, ...central, new Uint8Array(e.buffer)];
    const out = new Uint8Array(all.reduce((s, p) => s + p.length, 0)); let p = 0; for (const a of all) { out.set(a, p); p += a.length; }
    return out;
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
  const colName = (n) => { let s = ''; n++; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; };
  const colNum = (s) => { let c = 0; for (const ch of s) c = c * 26 + ch.charCodeAt(0) - 64; return c - 1; };

  // estilos con nombre de la «Nueva versión»
  const NAMED = {
    '': { nf: 'General', sz: 10 },
    h: { nf: 'General', b: true, sz: 10, fc: 'FFFFFF', bg: '2F4A6D' },
    hr: { nf: 'General', b: true, sz: 10, fc: 'FFFFFF', bg: '2F4A6D', ha: 'right' },
    t: { nf: 'General', b: true, sz: 14 },
    b: { nf: 'General', b: true, sz: 10 },
    eur: { nf: '#,##0\\ "€";[Red]\\-#,##0\\ "€"', sz: 10 },
    eurb: { nf: '#,##0\\ "€";[Red]\\-#,##0\\ "€"', b: true, sz: 10, bt: ['thin', '999999'] },
    pct: { nf: '0.00%', sz: 10 },
    pctb: { nf: '0.00%', b: true, sz: 10 },
    int: { nf: '#,##0', sz: 10 },
    date: { nf: 'dd/mm/yyyy', sz: 10 },
    num2: { nf: '#,##0.00', sz: 10 },
    warn: { nf: 'General', sz: 10, bg: 'FFF2CC' },
    note: { nf: 'General', i: true, sz: 9, fc: '666666', wrap: true, va: 'top' },
  };
  const BUILTIN = { General: 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10 };

  function Registry(font) {
    const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], numFmts = [], xfs = [];
    const idx = (arr, x) => { let i = arr.indexOf(x); if (i < 0) { arr.push(x); i = arr.length - 1; } return i; };
    const cache = new Map();
    const fontXml = (s) => `<font>${s.b ? '<b/>' : ''}${s.i ? '<i/>' : ''}${s.u ? '<u/>' : ''}<sz val="${s.sz || 10}"/><color rgb="FF${s.fc || '000000'}"/><name val="${font}"/></font>`;
    const side = (tag, v) => (v ? `<${tag} style="${v[0]}"><color rgb="FF${v[1] || '000000'}"/></${tag}>` : `<${tag}/>`);
    idx(fonts, fontXml({ sz: 10 }));
    function get(s) {
      const key = JSON.stringify(s);
      if (cache.has(key)) return cache.get(key);
      const f = idx(fonts, fontXml(s));
      const fl = s.bg ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${s.bg}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
      const bd = s.bl || s.br || s.bt || s.bb ? idx(borders, `<border>${side('left', s.bl)}${side('right', s.br)}${side('top', s.bt)}${side('bottom', s.bb)}<diagonal/></border>`) : 0;
      const nfc = s.nf || 'General';
      let nf = BUILTIN[nfc];
      if (nf === undefined) { let i = numFmts.indexOf(nfc); if (i < 0) { numFmts.push(nfc); i = numFmts.length - 1; } nf = 164 + i; }
      const al = s.ha || s.va || s.wrap ? `<alignment${s.ha ? ` horizontal="${s.ha}"` : ''}${s.va ? ` vertical="${s.va}"` : ''}${s.wrap ? ' wrapText="1"' : ''}/>` : '';
      xfs.push(`<xf numFmtId="${nf}" fontId="${f}" fillId="${fl}" borderId="${bd}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${al ? ' applyAlignment="1">' + al + '</xf>' : '/>'}`);
      cache.set(key, xfs.length - 1);
      return xfs.length - 1;
    }
    get(NAMED['']);
    function xml() {
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
        (numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.map((c, i) => `<numFmt numFmtId="${164 + i}" formatCode="${esc(c)}"/>`).join('')}</numFmts>` : '') +
        `<fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    }
    return { get, xml };
  }
  const dateSerial = (iso) => { const [y, m, d] = iso.split('-').map(Number); return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000; };

  function sheetXml(sh, R) {
    let x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
    if (sh.fitToPage) x += '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>';
    const sv = sh.showGrid === false ? ' showGridLines="0"' : '';
    if (sh.freeze) {
      const m = sh.freeze.match(/^([A-Z]+)(\d+)$/); const c = colNum(m[1]); const r = +m[2] - 1;
      x += `<sheetViews><sheetView${sv} workbookViewId="0"><pane${c ? ` xSplit="${c}"` : ''}${r ? ` ySplit="${r}"` : ''} topLeftCell="${sh.freeze}" activePane="${c && r ? 'bottomRight' : r ? 'bottomLeft' : 'topRight'}" state="frozen"/></sheetView></sheetViews>`;
    } else x += `<sheetViews><sheetView${sv} workbookViewId="0"/></sheetViews>`;
    x += `<sheetFormatPr defaultRowHeight="${sh.defaultRowHeight || 12.75}"/>`;
    if (sh.cols) x += '<cols>' + sh.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') + '</cols>';
    else if (sh.colWidths) { const ks = Object.keys(sh.colWidths).sort((a, b) => colNum(a) - colNum(b)); if (ks.length) x += '<cols>' + ks.map((k) => `<col min="${colNum(k) + 1}" max="${colNum(k) + 1}" width="${sh.colWidths[k]}" customWidth="1"/>`).join('') + '</cols>'; }
    x += '<sheetData>';
    // filas: desde rows (lista) o cells (mapa A1 → celda)
    let rows = sh.rows;
    if (!rows && sh.cells) {
      rows = [];
      for (const [a, c] of Object.entries(sh.cells)) { const m = a.match(/^([A-Z]+)(\d+)$/); const r = +m[2] - 1, ci = colNum(m[1]); (rows[r] = rows[r] || [])[ci] = c; }
    }
    const rh = sh.rowHeights || {};
    const nRows = Math.max(rows.length, ...Object.keys(rh).map(Number));
    for (let ri = 0; ri < nRows; ri++) {
      const row = rows[ri];
      const hgt = rh[ri + 1];
      if ((!row || !row.length) && !hgt) continue;
      x += `<row r="${ri + 1}"${hgt ? ` ht="${hgt}" customHeight="1"` : ''}>`;
      (row || []).forEach((cell, ci) => {
        if (cell === null || cell === undefined) return;
        const c = typeof cell === 'object' ? cell : { v: cell };
        const sidx = c.x ? R.get(c.x) : R.get(NAMED[c.s || ''] || NAMED['']);
        const ref = colName(ci) + (ri + 1);
        let v = c.v;
        if (v === null || v === undefined || v === '') { if (c.x || c.s) x += `<c r="${ref}" s="${sidx}"/>`; return; }
        if (c.s === 'date' && typeof v === 'string') v = dateSerial(v);
        if (typeof v === 'boolean') x += `<c r="${ref}" s="${sidx}" t="b"><v>${v ? 1 : 0}</v></c>`;
        else if (typeof v === 'number' && isFinite(v)) x += `<c r="${ref}" s="${sidx}"><v>${v}</v></c>`;
        else x += `<c r="${ref}" s="${sidx}" t="inlineStr"><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
      });
      x += '</row>';
    }
    x += '</sheetData>';
    if (sh.merges && sh.merges.length) x += `<mergeCells count="${sh.merges.length}">` + sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join('') + '</mergeCells>';
    if (sh.center && (sh.center.h || sh.center.v)) x += `<printOptions${sh.center.h ? ' horizontalCentered="1"' : ''}${sh.center.v ? ' verticalCentered="1"' : ''}/>`;
    const mg = sh.margins || {};
    x += `<pageMargins left="${mg.left ?? 0.4}" right="${mg.right ?? 0.4}" top="${mg.top ?? 0.5}" bottom="${mg.bottom ?? 0.5}" header="${mg.header ?? 0.3}" footer="${mg.footer ?? 0.3}"/>`;
    x += `<pageSetup paperSize="${sh.paperSize || 9}" orientation="${sh.landscape ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="${sh.fitToPage ? 1 : 0}"/>`;
    if (sh.footer) x += `<headerFooter><oddFooter>${esc(sh.footer)}</oddFooter></headerFooter>`;
    return x + '</worksheet>';
  }

  function build(sheets, meta) {
    const safe = (n) => n.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31);
    const R = Registry((meta && meta.font) || 'Arial');
    const files = [];
    const add = (name, s) => files.push({ name, data: enc.encode(s) });
    const sheetFiles = sheets.map((s) => sheetXml(s, R));
    add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>`);
    add('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>');
    add('docProps/core.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc((meta && meta.title) || 'Calculadora de promociones')}</dc:title><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>`);
    const defs = sheets.map((s, i) => (s.printArea ? `<definedName name="_xlnm.Print_Area" localSheetId="${i}">'${esc(safe(s.name)).replace(/'/g, "''")}'!${s.printArea.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : '')).join('');
    add('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(safe(s.name))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defs ? '<definedNames>' + defs + '</definedNames>' : ''}</workbook>`);
    add('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    add('xl/styles.xml', R.xml());
    sheetFiles.forEach((x, i) => add(`xl/worksheets/sheet${i + 1}.xml`, x));
    return zip(files);
  }
  const API = { build, zip, crc32, colNum, colName };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.XLSX = API;
})(typeof window !== 'undefined' ? window : globalThis);
