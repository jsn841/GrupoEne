(function () {
  const NZ = (window.NZ = {});
  const L = d3.formatLocale({ decimal: ',', thousands: '.', grouping: [3], currency: ['', ' €'] });
  const NB = ' ';
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  NZ.MESES = MESES;
  NZ.int = (v) => (v == null || isNaN(v) ? '—' : L.format(',.0f')(v));
  NZ.eur = (v) => (v == null || isNaN(v) ? '—' : L.format(',.0f')(v) + NB + '€');
  NZ.eur1 = (v) => (v == null || isNaN(v) ? '—' : L.format(',.1f')(v) + NB + '€');
  NZ.eurC = (v) => {
    if (v == null || isNaN(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e6) return L.format(',.1f')(v / 1e6) + NB + 'M€';
    if (a >= 1e4) return L.format(',.0f')(v / 1e3) + NB + 'k€';
    return L.format(',.0f')(v) + NB + '€';
  };
  NZ.numC = (v) => {
    if (v == null || isNaN(v)) return '—';
    const a = Math.abs(v);
    if (a >= 1e6) return L.format(',.2f')(v / 1e6) + NB + 'M';
    if (a >= 1e4) return L.format(',.0f')(v / 1e3) + NB + 'k';
    return L.format(',.0f')(v);
  };
  NZ.pct = (v, d = 1) => (v == null || isNaN(v) ? '—' : L.format('.' + d + 'f')(v * 100) + NB + '%');
  NZ.dpct = (v) => (v == null || isNaN(v) ? '—' : (v > 0 ? '+' : v < 0 ? '−' : '') + L.format('.1f')(Math.abs(v) * 100) + NB + '%');
  NZ.mes = (m) => {
    const [y, mm] = String(m).split('-');
    return MESES[+mm - 1] + ' ' + y.slice(2);
  };
  NZ.fecha = (d) => {
    if (!d) return '—';
    const [y, m, dd] = d.split('-');
    return +dd + ' ' + MESES[+m - 1] + ' ' + y;
  };

  // ---- marks & tiles
  NZ.mark = (el, source, field, where) => {
    if (!el) return;
    el.setAttribute('data-source', source);
    if (field) el.setAttribute('data-field', field);
    if (where != null) el.setAttribute('data-where', where);
    else el.removeAttribute('data-where');
  };
  NZ.enc = (s) => String(s).replace(/%/g, '%25').replace(/&/g, '%26').replace(/=/g, '%3D');
  NZ.where = (obj) => Object.entries(obj).map(([k, v]) => NZ.enc(k) + '=' + NZ.enc(v)).join('&');
  NZ.set = (el, text) => {
    if (!el) return;
    el.textContent = text;
    el.classList.remove('dash-skeleton');
  };
  NZ.delta = (el, v, goodUp = true, fmt = NZ.dpct) => {
    if (!el) return;
    NZ.set(el, v == null ? '—' : fmt(v));
    el.classList.toggle('nz-good', v != null && (goodUp ? v > 0 : v < 0));
    el.classList.toggle('nz-bad', v != null && (goodUp ? v < 0 : v > 0));
  };
  NZ.fail = (box, status) => {
    if (status !== 'error' && status !== 'connect') return false;
    NZ.clear(box);
    const d = document.createElement('div');
    d.className = 'nz-failed';
    d.innerHTML = '<span class="nz-dot"></span>';
    d.appendChild(document.createTextNode('Failed to load'));
    box.appendChild(d);
    box.classList.remove('dash-skeleton');
    return true;
  };

  // ---- dom helpers
  NZ.el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  NZ.clear = (box) => {
    box.querySelectorAll(':scope > :not(.nz-tip)').forEach((n) => n.remove());
  };
  NZ.tip = (box) => {
    let t = box.querySelector(':scope > .nz-tip');
    if (!t) {
      t = NZ.el('div', 'nz-tip');
      t.hidden = true;
      box.appendChild(t);
    }
    return {
      show(ev, lines) {
        t.replaceChildren();
        lines.forEach((l, i) => {
          const d = NZ.el('div', i === 0 ? 'nz-tip-h' : 'nz-tip-l');
          if (l.color) {
            const s = NZ.el('span', 'nz-sw');
            s.style.background = l.color;
            d.appendChild(s);
          }
          d.appendChild(document.createTextNode(typeof l === 'string' ? l : l.text));
          t.appendChild(d);
        });
        t.hidden = false;
        const r = box.getBoundingClientRect();
        let x = ev.clientX - r.left + 14, y = ev.clientY - r.top + 14;
        const tw = t.offsetWidth, th = t.offsetHeight;
        if (x + tw > r.width) x = ev.clientX - r.left - tw - 14;
        if (x < 0) x = 0;
        if (y + th > r.height) y = Math.max(0, ev.clientY - r.top - th - 14);
        t.style.left = x + 'px';
        t.style.top = y + 'px';
      },
      hide() {
        t.hidden = true;
      },
    };
  };
  const measure = (svg, texts, cls) => {
    const g = svg.append('g').attr('class', cls).attr('opacity', 0);
    let w = 0;
    texts.forEach((s) => {
      const t = g.append('text').text(s);
      w = Math.max(w, t.node().getComputedTextLength());
    });
    g.remove();
    return w;
  };

  // ---- horizontal bars (HTML)
  NZ.hbars = (box, rows, o) => {
    NZ.clear(box);
    box.classList.remove('dash-skeleton');
    if (!rows.length) {
      box.appendChild(NZ.el('div', 'nz-empty', o.empty || 'Sin datos para esta selección'));
      return;
    }
    const max = d3.max(rows, o.value) || 1;
    const list = NZ.el('div', 'nz-hbars');
    rows.forEach((r, i) => {
      const row = NZ.el('div', 'nz-hb');
      if (o.onClick) {
        row.classList.add('nz-click');
        row.tabIndex = 0;
        row.addEventListener('click', () => o.onClick(r));
        row.addEventListener('keydown', (e) => { if (e.key === 'Enter') o.onClick(r); });
      }
      if (o.active && o.active(r)) row.classList.add('nz-active');
      const l = NZ.el('div', 'nz-hb-l', o.label(r));
      const track = NZ.el('div', 'nz-hb-t');
      const bar = NZ.el('div', 'nz-hb-b');
      bar.style.width = Math.max(0.5, (o.value(r) / max) * 100) + '%';
      bar.style.background = o.color ? o.color(r, i) : dash.colors[0];
      track.appendChild(bar);
      const v = NZ.el('div', 'nz-hb-v', (o.fmt || NZ.eurC)(o.value(r)));
      if (o.sub) {
        const sv = o.sub(r);
        if (sv) {
          const s = NZ.el('span', 'nz-hb-s ' + (sv.cls || ''), sv.text);
          v.appendChild(s);
        }
      }
      row.append(l, track, v);
      list.appendChild(row);
    });
    box.appendChild(list);
  };

  // ---- shared axis frame for svg charts
  function frame(box, height, yMax, fmtY, xs, xLabel, rightLabels) {
    NZ.clear(box);
    box.classList.remove('dash-skeleton');
    const W = Math.max(260, box.clientWidth);
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${height}`).attr('class', 'nz-svg');
    const y0 = d3.scaleLinear().domain([0, yMax || 1]).nice(4);
    const ticks = y0.ticks(4);
    const ml = Math.ceil(measure(svg, ticks.map(fmtY), 'nz-tick')) + 10;
    const mr = rightLabels ? Math.ceil(measure(svg, rightLabels, 'nz-endlab')) + 14 : 8;
    const m = { t: 10, r: mr, b: 24, l: ml };
    const iw = W - m.l - m.r, ih = height - m.t - m.b;
    const y = y0.range([m.t + ih, m.t]);
    const g = svg.append('g');
    g.selectAll('line.grid').data(ticks).join('line').attr('class', 'nz-grid')
      .attr('x1', m.l).attr('x2', m.l + iw).attr('y1', (d) => y(d)).attr('y2', (d) => y(d));
    g.selectAll('text.yt').data(ticks).join('text').attr('class', 'nz-tick').attr('x', m.l - 8).attr('y', (d) => y(d))
      .attr('dy', '0.32em').attr('text-anchor', 'end').text(fmtY);
    // x labels thinning
    const labels = xs.map(xLabel);
    const lw = measure(svg, labels, 'nz-tick') + 10;
    const step = Math.max(1, Math.ceil((lw * xs.length) / iw));
    return { svg, W, height, m, iw, ih, y, labels, step };
  }
  function xAxis(f, xpos) {
    const { svg, m, ih, labels, step, iw, W } = f;
    labels.forEach((s, i) => {
      if (i % step) return;
      let x = xpos(i);
      const t = svg.append('text').attr('class', 'nz-tick').attr('x', x).attr('y', m.t + ih + 17).attr('text-anchor', 'middle').text(s);
      const w = t.node().getComputedTextLength();
      if (x - w / 2 < 0) t.attr('x', w / 2);
      if (x + w / 2 > W) t.attr('x', W - w / 2);
    });
    svg.append('line').attr('class', 'nz-axis').attr('x1', m.l).attr('x2', m.l + iw).attr('y1', m.t + ih).attr('y2', m.t + ih);
  }

  // ---- grouped columns
  NZ.cols = (box, xs, series, o = {}) => {
    const fmtY = o.fmtY || NZ.numC;
    const xLabel = o.xLabel || ((d) => d);
    const yMax = d3.max(series, (s) => d3.max(s.values, (v) => v || 0));
    const f = frame(box, o.height || 220, yMax, fmtY, xs, xLabel);
    const { svg, m, iw, ih, y } = f;
    const x = d3.scaleBand().domain(d3.range(xs.length)).range([m.l, m.l + iw]).paddingInner(0.25).paddingOuter(0.1);
    const xi = d3.scaleBand().domain(d3.range(series.length)).range([0, x.bandwidth()]).padding(series.length > 1 ? 0.08 : 0);
    const bw = Math.min(32, xi.bandwidth());
    series.forEach((s, si) => {
      svg.append('g').selectAll('rect').data(s.values.map((v, i) => [i, v]).filter((d) => d[1] != null)).join('rect')
        .attr('x', (d) => x(d[0]) + xi(si) + (xi.bandwidth() - bw) / 2).attr('width', bw)
        .attr('y', (d) => Math.min(y(d[1]), y(0) - (d[1] > 0 ? 1 : 0))).attr('height', (d) => Math.max(d[1] > 0 ? 1 : 0, y(0) - y(d[1])))
        .attr('rx', Math.min(4, bw / 2)).attr('class', 'nz-bar').style('fill', s.color);
    });
    xAxis(f, (i) => x(i) + x.bandwidth() / 2);
    const tip = NZ.tip(box);
    svg.append('g').selectAll('rect').data(xs).join('rect').attr('x', (d, i) => x(i) - (x.step() - x.bandwidth()) / 2)
      .attr('width', x.step()).attr('y', m.t).attr('height', ih).attr('fill', 'transparent')
      .on('mousemove', (ev, d) => {
        const i = xs.indexOf(d);
        tip.show(ev, [o.tipTitle ? o.tipTitle(d) : xLabel(d), ...series.map((s) => ({ color: series.length > 1 ? s.color : null, text: (series.length > 1 ? s.name + ': ' : '') + (s.values[i] == null ? '—' : (o.fmtTip || fmtY)(s.values[i])) }))]);
      })
      .on('mouseleave', () => tip.hide())
      .on('click', (ev, d) => o.onClick && o.onClick(d));
  };

  // ---- lines over categories
  NZ.lines = (box, xs, series, o = {}) => {
    const fmtY = o.fmtY || NZ.numC;
    const xLabel = o.xLabel || ((d) => d);
    const yMax = d3.max(series, (s) => d3.max(s.values, (v) => v || 0));
    const ends = series.map((s) => s.name);
    const f = frame(box, o.height || 220, yMax, fmtY, xs, xLabel, ends);
    const { svg, m, iw, ih, y } = f;
    const x = d3.scalePoint().domain(d3.range(xs.length)).range([m.l + 6, m.l + iw - 6]);
    const line = d3.line().defined((d) => d[1] != null).x((d) => x(d[0])).y((d) => y(d[1]));
    const lastPts = [];
    series.forEach((s, si) => {
      const pts = s.values.map((v, i) => [i, v]);
      svg.append('path').datum(pts).attr('class', 'nz-line').attr('d', line).style('stroke', s.color)
        .style('stroke-dasharray', s.dash ? '4 3' : null).style('stroke-width', s.thin ? 1.5 : 2);
      const last = pts.filter((d) => d[1] != null).pop();
      if (last) lastPts.push({ s, y: y(last[1]), x: x(last[0]) });
    });
    // end labels, de-collided
    lastPts.sort((a, b) => a.y - b.y);
    for (let i = 1; i < lastPts.length; i++) if (lastPts[i].y - lastPts[i - 1].y < 13) lastPts[i].y = lastPts[i - 1].y + 13;
    const over = lastPts.length ? lastPts[lastPts.length - 1].y - (m.t + ih) : 0;
    if (over > 0) lastPts.forEach((p) => (p.y -= over));
    lastPts.forEach((p) => {
      svg.append('text').attr('class', 'nz-endlab').attr('x', m.l + iw + 6).attr('y', Math.max(m.t + 4, p.y)).attr('dy', '0.32em').style('fill', p.s.color).text(p.s.name);
    });
    xAxis(f, (i) => x(i));
    const tip = NZ.tip(box);
    const rule = svg.append('line').attr('class', 'nz-rule').attr('y1', m.t).attr('y2', m.t + ih).style('opacity', 0);
    const dots = svg.append('g');
    svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', iw).attr('height', ih).attr('fill', 'transparent')
      .on('mousemove', (ev) => {
        const [mx] = d3.pointer(ev);
        let i = Math.round((mx - (m.l + 6)) / (x.step() || 1));
        i = Math.max(0, Math.min(xs.length - 1, i));
        rule.attr('x1', x(i)).attr('x2', x(i)).style('opacity', 1);
        dots.selectAll('circle').data(series.filter((s) => s.values[i] != null)).join('circle').attr('r', 3.5)
          .attr('cx', x(i)).attr('cy', (s) => y(s.values[i])).style('fill', (s) => s.color);
        tip.show(ev, [o.tipTitle ? o.tipTitle(xs[i]) : xLabel(xs[i]), ...series.map((s) => ({ color: s.color, text: s.name + ': ' + (s.values[i] == null ? '—' : (o.fmtTip || fmtY)(s.values[i])) }))]);
      })
      .on('mouseleave', () => { tip.hide(); rule.style('opacity', 0); dots.selectAll('circle').remove(); });
  };

  // ---- iOS-style sliding pill for segmented controls and tabs
  NZ.slide = (box) => {
    const tabs = box.classList.contains('nz-tabs');
    const sel = box.querySelector(tabs ? '[aria-selected="true"]' : '[aria-pressed="true"]');
    let pill = box.querySelector(':scope > .nz-slide');
    if (!pill) {
      pill = NZ.el('span', 'nz-slide' + (tabs ? ' nz-slide-ink' : ''));
      pill.setAttribute('aria-hidden', 'true');
      box.prepend(pill);
    }
    if (!sel || !sel.offsetWidth) return;
    const x = sel.offsetLeft, y = sel.offsetTop, w = sel.offsetWidth, h = sel.offsetHeight;
    const first = !pill.classList.contains('nz-on');
    if (first) pill.style.transition = 'none';
    pill.style.width = w + 'px';
    pill.style.height = h + 'px';
    pill.style.transform = `translate(${x}px, ${tabs ? y + h - 2 : y}px)`;
    if (first) {
      void pill.offsetWidth;
      pill.style.transition = '';
      pill.classList.add('nz-on');
    }
  };
  NZ.slides = () => document.querySelectorAll('.nz-seg, .nz-tabs').forEach((b) => NZ.slide(b));

  // ---- legend
  NZ.legend = (el, items) => {
    el.replaceChildren();
    items.forEach((it) => {
      const s = NZ.el('span', 'nz-lg');
      const sw = NZ.el('span', 'nz-sw' + (it.dash ? ' nz-sw-dash' : ''));
      sw.style.background = it.color;
      s.append(sw, document.createTextNode(it.name));
      el.appendChild(s);
    });
  };

  // ---- heatmap (pivot)
  NZ.heat = (box, rows, o) => {
    NZ.clear(box);
    box.classList.remove('dash-skeleton');
    if (!rows.length) {
      box.appendChild(NZ.el('div', 'nz-empty', 'Sin datos para esta selección'));
      return;
    }
    const cells = new Map(rows.map((r) => [o.row(r) + '\u0000' + o.col(r), o.value(r)]));
    const max = d3.max(rows, o.value) || 1;
    const wrap = NZ.el('div', 'nz-heat-wrap');
    const t = NZ.el('table', 'nz-heat');
    const thead = NZ.el('thead');
    const hr = NZ.el('tr');
    hr.appendChild(NZ.el('th', 'nz-heat-corner', o.corner || ''));
    o.cols.forEach((c) => hr.appendChild(NZ.el('th', 'nz-heat-col', c)));
    thead.appendChild(hr);
    t.appendChild(thead);
    const tb = NZ.el('tbody');
    const tip = NZ.tip(box);
    o.rows.forEach((rn) => {
      const tr = NZ.el('tr');
      tr.appendChild(NZ.el('th', 'nz-heat-row', rn));
      o.cols.forEach((cn) => {
        const v = cells.get(rn + '\u0000' + cn);
        const td = NZ.el('td', 'nz-heat-cell', v == null ? '' : NZ.numC(v));
        if (v != null) {
          const a = Math.round(8 + 72 * Math.sqrt(v / max));
          td.style.background = `color-mix(in srgb, ${o.color || dash.colors[0]} ${a}%, transparent)`;
          if (a > 55) td.classList.add('nz-heat-strong');
          td.addEventListener('mousemove', (ev) => tip.show(ev, [rn, cn + ': ' + (o.fmt || NZ.int)(v) + (o.unit || '')]));
          td.addEventListener('mouseleave', () => tip.hide());
        }
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    t.appendChild(tb);
    wrap.appendChild(t);
    box.appendChild(wrap);
  };

  // ---- sortable table: <th data-field> set in HTML; spec per field
  NZ.table = (table, rows, spec, o = {}) => {
    const ths = [...table.querySelectorAll('thead th')];
    const st = (table._sort = table._sort || { f: o.sortField, dir: o.sortDir || -1 });
    if (!table._wired) {
      table._wired = true;
      ths.forEach((th) => {
        const fld = th.getAttribute('data-field');
        th.classList.add('nz-sortable');
        th.tabIndex = 0;
        const go = () => {
          if (st.f === fld) st.dir = -st.dir; else { st.f = fld; st.dir = (spec[fld] && spec[fld].num) ? -1 : 1; }
          table._redraw && table._redraw();
        };
        th.addEventListener('click', go);
        th.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
      });
    }
    table._redraw = () => NZ.table(table, rows, spec, o);
    let rr = rows.slice();
    if (o.filter) rr = rr.filter(o.filter);
    if (st.f) {
      const num = spec[st.f] && spec[st.f].num;
      rr.sort((a, b) => {
        const va = a[st.f], vb = b[st.f];
        if (va == null) return 1;
        if (vb == null) return -1;
        return (num ? va - vb : String(va).localeCompare(String(vb), 'es')) * st.dir;
      });
    }
    ths.forEach((th) => {
      const f = th.getAttribute('data-field');
      th.setAttribute('aria-sort', st.f === f ? (st.dir > 0 ? 'ascending' : 'descending') : 'none');
      if (spec[f] && spec[f].num) th.classList.add('nz-num');
    });
    let tb = table.querySelector('tbody');
    if (!tb) { tb = NZ.el('tbody'); table.appendChild(tb); }
    tb.replaceChildren();
    rr.forEach((r) => {
      const tr = NZ.el('tr');
      tr.setAttribute('data-key', String(r[o.key]));
      if (o.onRow) { tr.classList.add('nz-click'); tr.addEventListener('click', () => o.onRow(r)); }
      if (o.active && o.active(r)) tr.classList.add('nz-active');
      ths.forEach((th) => {
        const f = th.getAttribute('data-field');
        const sp = spec[f] || {};
        const td = NZ.el('td', sp.num ? 'nz-num' : '');
        if (sp.render) sp.render(td, r);
        else td.textContent = sp.fmt ? sp.fmt(r[f], r) : (r[f] == null ? '—' : String(r[f]));
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    if (o.count) o.count.textContent = rr.length === rows.length ? NZ.int(rows.length) + ' filas' : NZ.int(rr.length) + ' de ' + NZ.int(rows.length) + ' filas';
  };
  NZ.chip = (td, text, cls) => {
    td.replaceChildren(NZ.el('span', 'nz-chip ' + (cls || ''), text));
  };
  NZ.deltaCell = (v) => (v == null ? '—' : NZ.dpct(v));
  NZ.deltaRender = (f) => (td, r) => {
    const v = r[f];
    td.textContent = NZ.dpct(v);
    td.classList.add(v > 0 ? 'nz-good' : v < 0 ? 'nz-bad' : 'nz-flat');
  };

  // ---- Spain map
  const SPAIN = [[-9.3,43.0],[-8.9,43.33],[-8.2,43.7],[-7.7,43.78],[-7.0,43.56],[-5.8,43.65],[-4.5,43.42],[-3.8,43.48],[-3.0,43.38],[-1.8,43.38],[-1.4,43.27],[-0.7,42.85],[0.7,42.85],[1.45,42.6],[3.17,42.43],[3.2,41.9],[2.3,41.4],[1.0,41.05],[0.7,40.7],[0.0,40.0],[-0.3,39.4],[0.2,38.75],[-0.5,38.3],[-0.75,37.6],[-1.3,37.55],[-1.9,36.95],[-2.4,36.8],[-3.4,36.7],[-4.4,36.7],[-5.0,36.45],[-5.6,36.0],[-6.05,36.3],[-6.4,36.8],[-6.95,37.2],[-7.4,37.2],[-7.5,37.6],[-7.0,38.0],[-7.3,38.45],[-7.0,39.0],[-7.5,39.65],[-6.9,40.2],[-6.85,41.0],[-6.2,41.6],[-6.6,41.95],[-7.2,41.9],[-8.1,41.85],[-8.9,41.9],[-8.8,42.5]];
  const BALEARES = [[[2.35,39.6],[3.05,39.95],[3.47,39.73],[3.2,39.35],[2.7,39.5]], [[3.83,40.05],[4.3,39.95],[4.25,39.82],[3.85,39.92]], [[1.2,38.98],[1.6,39.1],[1.6,38.9],[1.35,38.85]]];
  NZ.map = (box, pts, o) => {
    NZ.clear(box);
    box.classList.remove('dash-skeleton');
    const W = Math.max(260, box.clientWidth);
    const k = Math.cos((40 * Math.PI) / 180);
    const lon = [-9.6, 4.5], lat = [35.8, 44.0];
    const sx = (W - 16) / ((lon[1] - lon[0]) * k);
    const H = Math.round((lat[1] - lat[0]) * sx + 16);
    const px = (lo) => 8 + (lo - lon[0]) * k * sx, py = (la) => 8 + (lat[1] - la) * sx;
    const svg = d3.select(box).append('svg').attr('width', '100%').attr('viewBox', `0 0 ${W} ${H}`).attr('class', 'nz-svg');
    const path = (ring) => 'M' + ring.map((p) => px(p[0]) + ',' + py(p[1])).join('L') + 'Z';
    svg.append('path').attr('d', path(SPAIN)).attr('class', 'nz-land');
    BALEARES.forEach((r) => svg.append('path').attr('d', path(r)).attr('class', 'nz-land'));
    const rmax = Math.max(7, W / 45);
    const rs = d3.scaleSqrt().domain([0, d3.max(pts, o.size) || 1]).range([0, rmax]);
    const tip = NZ.tip(box);
    const sorted = pts.slice().sort((a, b) => o.size(b) - o.size(a));
    svg.append('g').selectAll('circle').data(sorted).join('circle')
      .attr('cx', (d) => px(d.lon)).attr('cy', (d) => py(d.lat)).attr('r', (d) => Math.max(3.5, rs(o.size(d))))
      .attr('class', (d) => 'nz-pin' + (o.active && o.active(d) ? ' nz-pin-active' : ''))
      .style('fill', (d) => o.color(d))
      .on('mousemove', (ev, d) => tip.show(ev, o.tip(d)))
      .on('mouseleave', () => tip.hide())
      .on('click', (ev, d) => o.onClick && o.onClick(d));
    if (o.labels) {
      o.labels.forEach((l) => {
        svg.append('text').attr('class', 'nz-maplab').attr('x', px(l.lon)).attr('y', py(l.lat)).attr('text-anchor', l.anchor || 'middle').text(l.text);
      });
    }
  };
})();
