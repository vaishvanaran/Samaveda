/* सामवेदग्रन्थसंहिता — reader app. Look and structure follow the Pujanidhi app (base.css is Pujanidhi's stylesheet).
   Data: data/index.json + data/<book>.json, made by app/build_data.py in the private repo (format: app/README.md). */
(() => {
  "use strict";
  const VERSION = "2026.11.13c";
  const REPO = "https://github.com/vaishvanaran/Samaveda";
  const T = window.Translit;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DD = "०१२३४५६७८९", TD = "௦௧௨௩௪௫௬௭௮௯";
  const dnum = n => String(n).replace(/[0-9]/g, d => DD[d]);

  // ---------- prefs ----------
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("sv-prefs") || "{}"); } catch (e) {}
  prefs = Object.assign({ script: "deva", fs: 1.45, theme: "auto", layer: false, last: {} }, prefs);
  if (prefs.script !== "gran") prefs.script = "deva";
  const save = () => { try { localStorage.setItem("sv-prefs", JSON.stringify(prefs)); } catch (e) {} };
  let NOTES = [];
  try { NOTES = JSON.parse(localStorage.getItem("sv-notes") || "[]"); } catch (e) {}
  const saveNotes = () => { try { localStorage.setItem("sv-notes", JSON.stringify(NOTES)); } catch (e) {} countNotes(); };

  // ---------- data ----------
  let IDX = null;
  const BOOK = {};
  const getBook = id => BOOK[id] ? Promise.resolve(BOOK[id]) : fetch("data/" + id + ".json").then(r => r.json()).then(j => (BOOK[id] = j));
  const meta = id => IDX.books.find(b => b.id === id);
  const cat = id => IDX.cats.find(c => c.id === id);
  const booksOf = c => IDX.books.filter(b => b.cat === c);
  const doorOf = c => IDX.doors.find(d => d.cats.includes(c));
  const BH_LABEL = { arsheyakalpa: "विवृतिः" };

  // ---------- script ----------
  const sc = () => prefs.script;
  const tr = s => sc() === "gran" ? T.grantha(s) : s;
  const num = n => sc() === "gran" ? String(n).replace(/[०-९]/g, d => TD[DD.indexOf(d)]) : String(n);
  const tam = s => T.tamil(s);   // Tamil-letter reading line for titles only (never for mantra text)

  // ---------- sāman svara: the Pujanidhi method (svara drawn above each akṣara) ----------
  const SAMA = /[꣠-꣱̅̂]/;
  const SAMA_L = { "꣪": "अ", "꣫": "उ", "꣬": "क", "꣭": "न", "꣮": "प", "꣯": "र", "꣰": "वि", "꣱": "ऽ", "̅": "—", "̂": "^" };
  function samaHTML(s, sc) {
    const ch = [...s], cs = [];
    for (let i = 0; i < ch.length; i++) {
      const c = ch[i], p = ch[i - 1], p2 = ch[i - 2];
      const vir = x => x === "्" || x === "\u{1134D}";
      const cons = /[क-हक़-य़\u{11315}-\u{11339}]/u.test(c);
      if (cs.length && c !== " " && (/\p{M}/u.test(c) || c === "‌" || c === "‍" || c === "ꣳ" || (cons && (vir(p) || (p === "‌" && vir(p2)))))) cs[cs.length - 1] += c; else cs.push(c);
    }
    const one = k => {
      const marks = [...k].filter(x => SAMA.test(x)), base = [...k].filter(x => !SAMA.test(x)).join("");
      const b2 = sc === "gran" ? base.replace(/[0-9]/g, d => TD[+d]) : base;
      if (/^[।॥|]+$/.test(base)) return `<span class="sak sad">${esc(base)}</span>`;
      const nm = /^[0-9०-९௦-௯]+$/.test(base) ? " san" : "";
      if (!marks.length) return `<span class="sak${nm}">${esc(b2)}</span>`;
      const lab = marks.map(m => { const cp = m.codePointAt(0);
        if (cp >= 0xA8E0 && cp <= 0xA8E9) return (sc === "deva" ? DD : TD)[cp - 0xA8E0];
        const l = SAMA_L[m] || ""; return sc === "gran" && l !== "—" ? T.grantha(l) : l; }).join("");
      return `<span class="sak${nm}"><span class="sav${lab === "—" ? " bar" : ""}">${lab === "—" ? "" : esc(lab)}</span>${esc(b2)}</span>`;
    };
    const words = []; let w = [];
    for (const k of cs) { if (k === " ") { if (w.length) words.push(w); w = []; } else w.push(k); }
    if (w.length) words.push(w);
    for (let i = words.length - 1; i > 0; i--) if (words[i].every(k => /^[।॥]+$/.test([...k].filter(x => !SAMA.test(x)).join("")))) { words[i - 1] = words[i - 1].concat([" "], words[i]); words.splice(i, 1); }
    return words.map(w => `<span class="saw">${w.map(one).join("")}</span>`).join(" ");
  }

  // ---------- text with layer markers ⁅b⁆…⁅/b⁆ (corrected), ⁅fN⁆ (pāṭhabheda), ⁅?⁆ (doubt) ----------
  const MARK = /⁅(\/?b|f\d+|\?)⁆/g;
  const plain = s => String(s || "").replace(MARK, "");
  function textHTML(s) {
    s = String(s || "");
    if (SAMA.test(s)) return `<span class="saman s-${sc()}">${samaHTML(tr(plain(s)), sc())}</span>`;
    let out = "", last = 0, m;
    MARK.lastIndex = 0;
    while ((m = MARK.exec(s))) {
      out += esc(tr(s.slice(last, m.index)));
      const t = m[1];
      if (t === "b") out += '<mark class="cor">'; else if (t === "/b") out += "</mark>";
      else if (t === "?") out += '<span class="dq" title="ஐயம்">?</span>';
      else out += `<sup class="fnm">${t.slice(1)}</sup>`;
      last = MARK.lastIndex;
    }
    return out + esc(tr(s.slice(last)));
  }

  // ---------- icons ----------
  const ICO = {
    veda: '<svg viewBox="0 0 64 64"><rect x="8" y="16" width="48" height="10" rx="5" fill="currentColor" opacity=".55"/><rect x="8" y="30" width="48" height="10" rx="5" fill="currentColor" opacity=".75"/><rect x="8" y="44" width="48" height="10" rx="5" fill="currentColor" opacity=".9"/><path d="M32 6v52" stroke="currentColor" stroke-width="2" opacity=".5"/></svg>',
    kalpa: '<svg viewBox="0 0 64 64"><path d="M32 8c5 8 8 13 8 18a8 8 0 0 1-16 0c0-5 3-10 8-18z" fill="currentColor" opacity=".9"/><path d="M12 38h40l-6 10H18z" fill="currentColor" opacity=".6"/><path d="M14 52h36v4H14z" fill="currentColor" opacity=".8"/></svg>',
    lakshana: '<svg viewBox="0 0 64 64"><g fill="currentColor"><rect x="6" y="22" width="10" height="10" rx="2" opacity=".5"/><rect x="19" y="22" width="10" height="10" rx="2"/><rect x="32" y="22" width="10" height="10" rx="2" opacity=".5"/><rect x="45" y="22" width="10" height="10" rx="2"/><path d="M8 40h8M21 40c2-3 6-3 8 0M34 40h8M47 40c2-3 6-3 8 0" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></g></svg>',
    bhashya: '<svg viewBox="0 0 64 64"><path d="M10 14c8-3 15-3 22 2v36c-7-5-14-5-22-2z" fill="currentColor" opacity=".6"/><path d="M54 14c-8-3-15-3-22 2v36c7-5 14-5 22-2z" fill="currentColor" opacity=".9"/></svg>'
  };
  const DOOR_ICON = { veda: "📜", kalpa: "🔥", lakshana: "✍️", bhashya: "📖" };

  // ---------- views ----------
  const VIEWS = ["home", "serix", "stotra", "notes", "about"];
  let view = "home";
  function show(v) {
    view = v; VIEWS.forEach(x => ($(x).hidden = x !== v));
    $("rtools").hidden = v !== "stotra";
    $("notePill").hidden = !(v === "stotra" && document.body.classList.contains("notemode"));
  }

  const THEMES = [
    ["auto", "தானாக", "linear-gradient(135deg,#F6F3EE 50%,#141011 50%)", "#8E1B2C", 0],
    ["light", "பகல்", "#F6F3EE", "#24191A", 0],
    ["sepia", "தாள்", "#F3EAD7", "#3A2C1E", 0],
    ["olai", "ஓலை", "repeating-linear-gradient(0deg,rgba(110,80,20,.18) 0 1px,transparent 1px 6px),#E6D5A2", "#33240E", 0],
    ["mint", "இலை", "#E4EEDF", "#1E2B1C", 0],
    ["dusk", "அந்தி", "#232830", "#E3E6EA", 1],
    ["dark", "இரவு", "#141011", "#F2EAE5", 1],
    ["black", "கருமை", "#000000", "#D9D2C6", 1],
  ];
  const isDark = () => { const th = THEMES.find(x => x[0] === prefs.theme); return th && th[0] !== "auto" ? !!th[4] : matchMedia("(prefers-color-scheme: dark)").matches; };
  function applyPrefs() {
    const de = document.documentElement;
    if (prefs.theme && prefs.theme !== "auto") de.dataset.theme = prefs.theme; else delete de.dataset.theme;
    de.dataset.script = sc();
    de.style.setProperty("--script", sc() === "gran" ? "var(--gran)" : "var(--deva)");
    de.style.setProperty("--fs", prefs.fs + "rem");
    document.querySelectorAll("#scripts button").forEach(b => b.setAttribute("aria-pressed", b.dataset.s === sc()));
    document.body.classList.toggle("L", !!prefs.layer);
    $("layerBtn").setAttribute("aria-pressed", !!prefs.layer);
    const cur = prefs.theme || "auto";
    const html = THEMES.map(([k, ta, bg, fg]) => `<button class="thsw" data-th="${k}" aria-pressed="${k === cur}"><span class="saw" style="background:${bg};color:${fg}">${k === "auto" ? "" : "அ"}</span><span class="sl">${esc(ta)}</span></button>`).join("");
    $("themeSeg").innerHTML = html;
    $("thPop").innerHTML = `<p class="tl">வாசிப்பு வண்ணம்</p><div class="thgrid">${html}</div>`;
    $("thBtn").textContent = isDark() ? "☀" : "☾";
    const m = document.querySelector('meta[name="theme-color"]');
    if (m) m.content = getComputedStyle(de).getPropertyValue("--paper").trim() || "#5B1530";
  }

  // ---------- drawer ----------
  function drawer(open) {
    $("drawer").classList.toggle("open", open); $("scrim").hidden = !open;
    $("drawer").setAttribute("aria-hidden", !open); $("menuBtn").setAttribute("aria-expanded", open);
    document.body.classList.toggle("noscroll", open);
  }
  function renderDrawer() {
    $("dDoors").innerHTML = IDX.doors.map(d => `<div class="dgrp"><span class="dgi">${DOOR_ICON[d.id] || "•"}</span><span>${esc(d.tn)}</span></div>` +
      d.cats.map(c => { const C = cat(c), bs = booksOf(c);
        return `<details class="dfold" data-k="${c}"><summary class="dsec dfs"><span>${esc(C.ta)}</span><span class="dn dfn">${bs.length || ""}</span><span class="chev" aria-hidden="true">›</span></summary><div>` +
          (bs.length ? bs.map(b => `<a class="dl sub" href="#b/${b.id}"><span class="sym xs num">${esc(C.s)}</span><span><span class="dd">${esc(tr(b.title))}</span><span class="dt">${esc(tam(b.title))}</span></span></a>`).join("")
            : `<p class="hint" style="margin:4px 10px 10px">விரைவில்</p>`) + `</div></details>`; }).join("")).join("");
    countNotes();
  }
  function countNotes() { const n = NOTES.filter(x => !x.sent).length; $("dNoteN").textContent = n || ""; }

  // ---------- home: doors ----------
  function renderHome() {
    show("home");
    $("results").hidden = true; $("catBox").hidden = false; $("tilesBox").hidden = true; document.querySelector("#home .welcome").hidden = false;
    const L = prefs.lastBook && meta(prefs.lastBook);
    if (L) { const p = prefs.last[L.id] || { c: 0 }; const c = L.ch[p.c] || L.ch[0];
      $("hCont").hidden = false; $("hCont").href = `#r/${L.id}/${p.c || 0}`;
      $("hCont").innerHTML = `<span class="xcl">கடைசியாகப் படித்த இடத்திலிருந்து தொடர</span><span class="xct">${esc(tr(L.title))} · ${esc(tr(c.t))}</span><span aria-hidden="true">▶</span>`;
    } else $("hCont").hidden = true;
    $("catGrid").innerHTML = IDX.doors.map((d, i) => {
      const parts = d.cats.map(c => { const n = booksOf(c).length; return `<i>${esc(cat(c).ta.split(" — ")[0])}${n ? " " + n : ""}</i>`; }).join("");
      return `<a class="door ${d.dc}" style="--i:${i}" href="#d/${d.id}"><span class="dico" aria-hidden="true">${ICO[d.id]}</span><span class="dtx"><span class="d">${esc(tr(d.t))}</span><span class="t">${esc(d.ta)}</span><span class="dparts">${parts}</span></span><span class="dgo" aria-hidden="true">›</span></a>`;
    }).join("");
  }
  function renderDoor(id) {
    const d = IDX.doors.find(x => x.id === id); if (!d) return renderHome();
    show("home");
    $("results").hidden = true; $("catBox").hidden = true; $("hCont").hidden = true; $("tilesBox").hidden = false; document.querySelector("#home .welcome").hidden = true;
    $("tilesBox").innerHTML = `<a href="#" class="back" style="display:inline-block;margin-top:12px">← முகப்பு</a><div class="sechead"><span class="d">${esc(tr(d.t))}</span><span class="t">${esc(d.ta)}</span></div><div class="stotiles">` +
      d.cats.map((c, i) => { const C = cat(c), n = booksOf(c).length;
        return `<a class="stile${n ? "" : " soon"}" style="--i:${i}" href="#c/${c}"><span class="sym num">${esc(tr(C.s))}</span><span class="d">${esc(tr(C.t))}</span><span class="t">${esc(C.ta)}</span>${n ? `<span class="n">${n}</span>` : ""}</a>`; }).join("") + "</div>";
    window.scrollTo(0, 0);
  }

  // ---------- category: list of books ----------
  function renderCat(c) {
    const C = cat(c); if (!C) return renderHome();
    show("serix");
    const d = doorOf(c);
    $("xBack").href = "#d/" + d.id; $("xBack").textContent = "← " + tr(d.t);
    $("xSym").innerHTML = `<span style="font-family:var(--deva);font-size:1.5rem">${esc(tr(C.s))}</span>`;
    $("xDeva").textContent = tr(C.t); $("xAlt").textContent = C.ta;
    $("xCont").hidden = true;
    const bs = booksOf(c);
    $("xTree").innerHTML = bs.length ? `<div class="xf l1" style="padding:6px"><div class="xfin">` + bs.map(b =>
      `<a class="xrow" href="#b/${b.id}"><span class="xt">${esc(tr(b.title))}</span><span class="xs xtop">${esc(tr(b.sub || ""))}</span><span class="xn">${b.units}</span></a>`).join("") + `</div></div>`
      : `<div class="soonbox">இந்தப் பிரிவு நூல்கள் விரைவில் சேர்க்கப்படும்.</div>`;
    window.scrollTo(0, 0);
  }

  // ---------- book index ----------
  function renderBook(id) {
    const b = meta(id); if (!b) return renderHome();
    show("serix");
    const C = cat(b.cat);
    $("xBack").href = "#c/" + b.cat; $("xBack").textContent = "← " + tr(C.t);
    $("xSym").innerHTML = `<span style="font-family:var(--deva);font-size:1.5rem">${esc(tr(C.s))}</span>`;
    $("xDeva").textContent = tr(b.title); $("xAlt").textContent = tr(b.sub || "");
    const p = prefs.last[id];
    if (p && b.ch[p.c]) { $("xCont").hidden = false; $("xCont").href = `#r/${id}/${p.c}`;
      $("xCont").innerHTML = `<span class="xcl">கடைசியாகப் படித்த இடத்திலிருந்து தொடர</span><span class="xct">${esc(tr(b.ch[p.c].t))}</span><span aria-hidden="true">▶</span>`; }
    else $("xCont").hidden = true;
    const one = b.ch.length === 1;
    $("xTree").innerHTML = b.ch.map((c, i) => {
      const secs = c.s.filter(s => s[0]);
      const rows = secs.length > 1 ? c.s.map((s, j) => s[0] ? `<a class="xrow" href="#r/${id}/${i}/s${j}"><span class="xt">${esc(tr(s[0]))}</span>${s[1] ? `<span class="xn">${s[1]}</span>` : ""}</a>` : "").join("")
        : `<a class="xrow" href="#r/${id}/${i}"><span class="xt">${esc(tr(c.t))}</span><span class="xs xtop">${esc(tr(c.sub || ""))}</span></a>`;
      const tot = c.s.reduce((a, s) => a + (s[1] || 0), 0);
      return `<details class="xf l1"${one || p && p.c === i ? " open" : ""}><summary><span class="xft">${esc(tr(c.t))}${c.sub ? ` <small class="muted">· ${esc(tr(c.sub))}</small>` : ""}</span><span class="dn">${tot || ""}</span><span class="chev" aria-hidden="true">›</span></summary><div class="xfin"><a class="xrow" href="#r/${id}/${i}"><span class="xt">▶ ${esc(tr(c.t))} — முழுதும் படிக்க</span></a>${secs.length > 1 ? rows : ""}</div></details>`;
    }).join("");
    window.scrollTo(0, 0);
  }

  // ---------- reader ----------
  let RD = null;
  function renderReader(id, ci, anchor) {
    const b = meta(id); if (!b) return renderHome();
    show("stotra");
    getBook(id).then(d => {
      ci = Math.max(0, Math.min(d.ch.length - 1, ci | 0));
      const c = d.ch[ci];
      RD = { id, c: ci };
      prefs.lastBook = id; prefs.last[id] = Object.assign({}, prefs.last[id], { c: ci }); if (prefs.last[id].c !== ci) delete prefs.last[id].a; save();
      $("sBack").href = "#b/" + id; $("sBack").textContent = "← " + tr(b.title);
      $("sTitle").textContent = tr(c.t);
      $("sAlt").innerHTML = c.sub ? `<span class="stopic">${esc(tr(c.sub))}</span>` : "";
      // contents fold (like Pujanidhi's series contents)
      $("sParts").innerHTML = d.ch.length > 1 ? `<details class="stoc"><summary><span class="sert">${esc(tr(b.title))} · <b>${esc(tr(c.t))}</b></span><span class="stocb">எல்லா அத்தியாயங்களும் <span class="chev" aria-hidden="true">›</span></span></summary><div class="stocin"><a class="stocx" href="#b/${id}">📖 முழு அட்டவணை</a><div class="stl">` +
        d.ch.map((x, i) => `<a class="stlr" href="#r/${id}/${i}"${i === ci ? ' aria-current="true"' : ""}><b>${esc(tr(x.t))}</b> <span>${esc(tr(x.sub || ""))}</span></a>`).join("") + `</div></div></details>` : "";
      const named = c.s.filter(s => s.t).length;
      $("sHeads").hidden = named < 2;
      $("sHeads").innerHTML = named < 2 ? "" : c.s.map((s, j) => s.t ? `<a class="chip" href="#r/${id}/${ci}/s${j}">${esc(tr(s.t.replace(/\s*खण्डः$/, "")))}</a>` : "").join("");
      const bl = BH_LABEL[id] || "भाष्यम्";
      const noted = new Set(NOTES.map(n => n.k));
      let h = "";
      c.s.forEach((s, j) => {
        if (s.t) h += `<div class="blk-head" id="s${j}">${esc(tr(s.t))}</div>`;
        s.u.forEach((u, k) => {
          const key = `${id}/${ci}/${j}/${k}`, uid = `u${j}-${k}`;
          if (u.k === "h") { h += `<div class="blk-sub" id="${uid}">${textHTML(u.x)}</div>`; return; }
          if (u.k === "c") { h += `<div class="blk-end" id="${uid}">${textHTML(u.x)}</div>`; return; }
          if (u.k === "i") { h += `<details class="bhf intro" id="${uid}"><summary>${esc(tr(u.x || "उपक्रमः"))}</summary><div class="bht">${textHTML(u.b)}</div></details>`; return; }
          const verse = u.k === "v" || u.k === "r" || /\n/.test(u.x);
          const cls = [verse ? "blk-shloka" : "blk-para"]; if (!u.n && u.k === "p") cls.push("np"); if (noted.has(key)) cls.push("hasnote");
          const no = u.n ? `<span class="vno">&nbsp;॥&nbsp;${esc(num(u.n))}&nbsp;॥</span>` : "";
          const x = textHTML(String(u.x).replace(/\s*॥\s*$/, ""));
          const notes = (u.f || []).map((f, i) => `<div>${i + 1}. <span class="dn">${esc(tr(f))}</span></div>`).concat((u.d || []).map(z => `<div>⚠ ${esc(z)}</div>`));
          h += `<div class="${cls.join(" ")}" id="${uid}" data-k="${key}"><p>${x}${no}</p>` +
            (u.c ? `<div class="blk-sub">${textHTML(u.c)}</div>` : "") +
            (notes.length ? `<div class="lnotes">${notes.join("")}</div>` : "") +
            (u.b ? `<details class="bhf"><summary>${bl}</summary><div class="bht">${textHTML(u.b)}</div></details>` : "") + `</div>`;
        });
      });
      $("sBody").innerHTML = h;
      const prev = ci > 0 ? d.ch[ci - 1] : null, next = ci < d.ch.length - 1 ? d.ch[ci + 1] : null;
      $("sNav").innerHTML = (prev ? `<a href="#r/${id}/${ci - 1}"><small>← முந்தையது</small>${esc(tr(prev.t))}</a>` : "") +
        (next ? `<a class="nx" href="#r/${id}/${ci + 1}"><small>அடுத்தது →</small>${esc(tr(next.t))}</a>` : `<a class="nx" href="#b/${id}"><small>அட்டவணை</small>${esc(tr(b.title))}</a>`);
      requestAnimationFrame(() => {
        let el = anchor ? document.getElementById(anchor) : null;
        if (!el && !anchor && prefs.last[id].a) el = document.getElementById(prefs.last[id].a);
        if (el) { const dt = el.closest("details"); if (dt) dt.open = true; el.scrollIntoView({ block: "start" }); if (anchor && anchor[0] === "u") el.classList.add("flash"); }
        else window.scrollTo(0, 0);
      });
    });
  }
  let scT = 0;
  addEventListener("scroll", () => {
    if (!RD || view !== "stotra") return;
    clearTimeout(scT);
    scT = setTimeout(() => {
      for (const e of $("sBody").querySelectorAll("[id]")) { const r = e.getBoundingClientRect(); if (r.bottom > 120) { prefs.last[RD.id] = { c: RD.c, a: e.id }; save(); break; } }
    }, 300);
  }, { passive: true });
  function keepPlace(fn) {
    let el = null, off = 0;
    if (view === "stotra") for (const e of $("sBody").querySelectorAll("[id]")) { const r = e.getBoundingClientRect(); if (r.bottom > 120) { el = e.id; off = r.top; break; } }
    fn();
    if (el) setTimeout(() => { const e = document.getElementById(el); if (e) window.scrollBy(0, e.getBoundingClientRect().top - off); }, 80);
  }

  // ---------- search ----------
  const NORM_DROP = /[꣠-॒꣱॑᳐-᳿̅̂\s।॥ऽ,;.\-–—()'"“”‘’!?0-9०-९]/;
  const NASAL = { "ङ": 1, "ञ": 1, "ण": 1, "न": 1, "म": 1 };
  function norm(s) {
    let o = "", map = [];
    const a = [...s]; let pos = 0;
    for (let i = 0; i < a.length; i++) {
      let c = a[i]; const at = pos; pos += c.length;
      if (c === "⁅") { while (i + 1 < a.length && a[i] !== "⁆") { i++; pos += a[i].length; } continue; }
      if (NORM_DROP.test(c)) continue;
      if (c === "ँ" || c === "ꣳ") c = "ं";
      if (NASAL[c] && a[i + 1] === "्" && /[क-ह]/.test(a[i + 2] || "") && !/[यरलवशषसह]/.test(a[i + 2])) { o += "ं"; map.push(at); pos += 1; i++; continue; }
      o += c; map.push(at);
    }
    return [o, map];
  }
  let ALL = null;
  const loadAll = () => ALL ? Promise.resolve(ALL) : Promise.all(IDX.books.map(b => getBook(b.id))).then(() => {
    ALL = [];
    IDX.books.forEach(b => BOOK[b.id].ch.forEach((c, ci) => c.s.forEach((s, j) => s.u.forEach((u, k) => {
      [["x", u.x], ["b", u.b]].forEach(([f, txt]) => { if (txt) ALL.push({ b: b.id, ci, j, k, f, t: txt }); });
    }))));
    return ALL;
  });
  let qT = 0;
  function search(q) {
    q = q.trim();
    if (!q) { renderHome(); return; }
    $("catBox").hidden = true; $("hCont").hidden = true; $("tilesBox").hidden = true;
    $("results").hidden = false; $("results").innerHTML = `<p class="rcount">தேடுகிறது…</p>`;
    loadAll().then(all => {
      const latin = /[a-z]/i.test(q) && !/[ऀ-ॿ]/.test(q);
      const nq = latin ? T.looseLatin(q) : norm(q)[0];
      if (!nq || nq.length < 2) { $("results").innerHTML = `<p class="rcount">குறைந்தது இரண்டு எழுத்து தேவை.</p>`; return; }
      const hits = [];
      for (const r of all) {
        if (latin) { r.lk = r.lk || T.key(plain(r.t)); if (r.lk.indexOf(nq) >= 0) hits.push([r, null]); }
        else { if (!r.n) r.n = norm(r.t); const p = r.n[0].indexOf(nq); if (p >= 0) hits.push([r, [r.n[1][p], r.n[1][p + nq.length - 1]]]); }
        if (hits.length >= 300) break;
      }
      const strip = x => x.replace(/[꣠-꣱]/g, "");
      const snip = (r, rg) => {
        const t = plain(r.t);
        if (!rg) return esc(tr(strip(t.slice(0, 160)))) + (t.length > 160 ? "…" : "");
        const off = i => r.t.slice(0, i).replace(MARK, "").length;
        let a = off(rg[0]), z = off(rg[1] + 1);
        while (z < t.length && /[\p{M}꣠-꣱]/u.test(t[z])) z++;
        const s0 = Math.max(0, a - 60), s1 = Math.min(t.length, z + 60);
        return (s0 ? "…" : "") + esc(tr(strip(t.slice(s0, a)))) + "<em>" + esc(tr(strip(t.slice(a, z)))) + "</em>" + esc(tr(strip(t.slice(z, s1)))) + (s1 < t.length ? "…" : "");
      };
      $("results").innerHTML = `<p class="rcount">${hits.length >= 300 ? "300+" : hits.length} இடங்கள்</p>` +
        hits.map(([r, rg]) => { const B = BOOK[r.b], c = B.ch[r.ci], s = c.s[r.j], u = s.u[r.k];
          return `<a class="res" href="#r/${r.b}/${r.ci}/u${r.j}-${r.k}"><div class="w"><b>${esc(tr(meta(r.b).title))}</b> · ${esc(tr(c.t))}${s.t ? " · " + esc(tr(s.t)) : ""}${u.n ? " · " + esc(num(u.n)) : ""}${r.f === "b" ? " · " + (BH_LABEL[r.b] || "भाष्यम्") : ""}</div><div class="s">${snip(r, rg)}</div></a>`; }).join("") +
        (hits.length ? "" : `<p class="rcount">ஒன்றும் கிடைக்கவில்லை.</p>`);
    });
  }
  $("q").addEventListener("input", () => { clearTimeout(qT); qT = setTimeout(() => search($("q").value), 350); });

  // ---------- «பிழை தெரிவி» ----------
  let SH = null;
  function openSheet(key) {
    const [id, ci, j, k] = key.split("/"); const B = BOOK[id]; const c = B.ch[+ci], s = c.s[+j], u = s.u[+k];
    const old = NOTES.find(n => n.k === key);
    SH = { key, where: `${meta(id).title} · ${c.t}${s.t ? " · " + s.t : ""}${u.n ? " · " + u.n : ""}`, orig: plain(u.x) };
    $("shWhere").textContent = SH.where; $("shOrig").textContent = SH.orig;
    $("shFix").value = old ? old.fix : SH.orig; $("shNote").value = old ? old.note : "";
    $("shDel").hidden = !old; $("sheet").hidden = false;
  }
  const closeSheet = () => { $("sheet").hidden = true; SH = null; };
  const toast = t => { const e = $("toast"); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => (e.hidden = true), 2200); };
  const notesText = list => list.map((n, i) => `${i + 1}. ${n.where}  [${n.k}]\nமூலம்: ${n.orig}\n${n.fix !== n.orig ? "திருத்தம்: " + n.fix + "\n" : ""}${n.note ? "குறிப்பு: " + n.note + "\n" : ""}`).join("\n");
  function renderNotes() {
    show("notes");
    const pend = NOTES.filter(n => !n.sent);
    $("notes").innerHTML = `<div class="ghead"><a class="back" href="#">← முகப்பு</a><div class="gtitle"><span class="sym big lsym">✎</span><div><h1>என் பிழைக் குறிப்புகள்</h1></div></div></div>
      <p class="hint">வாசிக்கும்போது மேலே உள்ள ✎ பொத்தானைத் தொட்டு, திருத்த வேண்டிய வரியைத் தொடுக. குறிப்புகள் இந்தக் கருவியில் மட்டும் சேமிக்கப்படும்; இங்கிருந்து அனுப்புக.</p>
      <div class="lacts"><button class="pbtn" id="nSend"${pend.length ? "" : " disabled"}>அனுப்பு (${pend.length})</button><button class="btn2" id="nCopy"${NOTES.length ? "" : " disabled"}>நகலெடு</button><button class="btn2" id="nShare"${NOTES.length ? "" : " disabled"}>பகிர்</button></div>` +
      NOTES.slice().reverse().map(n => { const p = n.k.split("/");
        return `<div class="nt"><div class="w">${n.sent ? "✓ அனுப்பியது · " : ""}<span class="deva">${esc(n.where)}</span> · <a href="#r/${p[0]}/${p[1]}/u${p[2]}-${p[3]}">இடம் ›</a></div>${n.fix !== n.orig ? `<div class="o">${esc(n.orig)}</div><div class="f">${esc(n.fix)}</div>` : `<div class="f">${esc(n.orig)}</div>`}${n.note ? `<div>📝 ${esc(n.note)}</div>` : ""}</div>`; }).join("") +
      (NOTES.some(n => n.sent) ? `<div class="lacts"><button class="btn2" id="nClear">அனுப்பியவற்றை நீக்கு</button></div>` : "") + (NOTES.length ? "" : `<p class="hint">இன்னும் குறிப்பு இல்லை.</p>`);
  }
  function renderAbout() {
    show("about");
    $("about").innerHTML = `<div class="ghead"><a class="back" href="#">← முகப்பு</a></div><div class="welcome"><div class="shrih">॥ श्रीः ॥</div><h1 class="deva">सामवेदग्रन्थसंहिता</h1></div>
      <div class="about"><p>ஆக்கியோன்: திருவிடைமருதூர் நிதீஶ்வர ஶர்மா</p><p class="hint">பதிப்பு ${VERSION}</p></div>`;
  }

  // ---------- router ----------
  function route() {
    const h = decodeURIComponent(location.hash.slice(1)); const p = h.split("/");
    closeSheet(); drawer(false); $("thPop").hidden = true;
    if (p[0] === "d") return renderDoor(p[1]);
    if (p[0] === "c") return renderCat(p[1]);
    if (p[0] === "b") return renderBook(p[1]);
    if (p[0] === "r") return renderReader(p[1], +p[2] || 0, p[3] || null);
    if (p[0] === "notes") return renderNotes();
    if (p[0] === "about") return renderAbout();
    RD = null; $("q").value = ""; renderHome(); window.scrollTo(0, 0);
  }

  // ---------- events ----------
  $("menuBtn").onclick = () => drawer(true);
  $("drawerClose").onclick = () => drawer(false);
  $("scrim").onclick = () => drawer(false);
  $("thBtn").onclick = e => { e.stopPropagation(); $("thPop").hidden = !$("thPop").hidden; };
  document.addEventListener("click", e => {
    const t = e.target;
    const th = t.closest(".thsw"); if (th) { prefs.theme = th.dataset.th; save(); applyPrefs(); setTimeout(() => ($("thPop").hidden = true), 180); return; }
    if (!t.closest("#thPop")) $("thPop").hidden = true;
    const s = t.closest("#scripts button"); if (s) { prefs.script = s.dataset.s; save(); applyPrefs(); keepPlace(() => { renderDrawer(); route(); }); return; }
    if (t.closest("#fsUp") || t.closest("#fsDown")) { prefs.fs = Math.max(1, Math.min(3.2, +(prefs.fs + (t.closest("#fsUp") ? .1 : -.1)).toFixed(2))); save(); keepPlace(applyPrefs); return; }
    if (t.closest("#layerBtn")) { prefs.layer = !prefs.layer; save(); keepPlace(applyPrefs); toast(prefs.layer ? "பாடபேதம் / ஐயம் காட்டப்படுகிறது" : "மூலம் மட்டும்"); return; }
    if (t.closest("#noteBtn")) { const on = !document.body.classList.contains("notemode"); document.body.classList.toggle("notemode", on); $("noteBtn").setAttribute("aria-pressed", on); $("notePill").hidden = !on; return; }
    if (document.body.classList.contains("notemode") && !t.closest("summary,a,button")) { const u = t.closest("#sBody [data-k]"); if (u) { openSheet(u.dataset.k); return; } }
    if (t.closest("#shX") || t.id === "sheet") { closeSheet(); return; }
    if (t.closest("#shSave")) {
      const rec = { k: SH.key, where: SH.where, orig: SH.orig, fix: $("shFix").value.trim(), note: $("shNote").value.trim(), at: new Date().toISOString(), sent: false };
      const i = NOTES.findIndex(n => n.k === SH.key); if (i >= 0) NOTES[i] = rec; else NOTES.push(rec);
      saveNotes(); const el = document.querySelector(`[data-k="${SH.key}"]`); if (el) el.classList.add("hasnote");
      closeSheet(); document.body.classList.remove("notemode"); $("noteBtn").setAttribute("aria-pressed", false); $("notePill").hidden = true; toast("சேமிக்கப்பட்டது ✎"); return;
    }
    if (t.closest("#shDel")) { NOTES = NOTES.filter(n => n.k !== SH.key); saveNotes(); const el = document.querySelector(`[data-k="${SH.key}"]`); if (el) el.classList.remove("hasnote"); closeSheet(); return; }
    if (t.closest("#nSend")) {
      const pend = NOTES.filter(n => !n.sent); if (!pend.length) return;
      let part = [], len = 0; const parts = [];
      pend.forEach(n => { const x = notesText([n]); if (len + x.length > 6000 && part.length) { parts.push(part); part = []; len = 0; } part.push(n); len += x.length; });
      if (part.length) parts.push(part);
      parts.forEach((pt, i) => window.open(`${REPO}/issues/new?title=${encodeURIComponent(`பிழைக் குறிப்புகள் ${new Date().toISOString().slice(0, 10)} (${pt.length})${parts.length > 1 ? " " + (i + 1) + "/" + parts.length : ""}`)}&body=${encodeURIComponent(notesText(pt) + "\n— " + VERSION)}`, "_blank", "noopener"));
      pend.forEach(n => (n.sent = true)); saveNotes(); renderNotes(); return;
    }
    if (t.closest("#nCopy")) { navigator.clipboard && navigator.clipboard.writeText(notesText(NOTES)).then(() => toast("நகலெடுக்கப்பட்டது")); return; }
    if (t.closest("#nShare")) { const x = notesText(NOTES); if (navigator.share) navigator.share({ title: "ஸாமவேதம் — பிழைக் குறிப்புகள்", text: x }).catch(() => {}); else navigator.clipboard.writeText(x).then(() => toast("நகலெடுக்கப்பட்டது")); return; }
    if (t.closest("#nClear")) { NOTES = NOTES.filter(n => !n.sent); saveNotes(); renderNotes(); return; }
  });
  addEventListener("keydown", e => { if (e.key === "Escape") { closeSheet(); drawer(false); $("thPop").hidden = true; } });
  addEventListener("hashchange", route);

  applyPrefs();
  $("ver").textContent = "பதிப்பு " + VERSION;
  fetch("data/index.json").then(r => r.json()).then(j => { IDX = j; renderDrawer(); route(); });
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
