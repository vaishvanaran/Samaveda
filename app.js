/* सामवेदग्रन्थसंहिता — reader app (no build step; data in data/*.json, made by app/build_data.py in the private repo) */
(() => {
  "use strict";
  const VERSION = "2026.11.13b";
  const REPO = "https://github.com/vaishvanaran/Samaveda";
  const T = window.Translit;
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const DEV = n => String(n).replace(/[0-9]/g, d => "०१२३४५६७८९"[d]);

  // ---------- prefs ----------
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem("sv-prefs") || "{}"); } catch (e) {}
  prefs = Object.assign({ sc: "deva", fs: 1.4, th: "auto", layer: false, last: {} }, prefs);
  const save = () => { try { localStorage.setItem("sv-prefs", JSON.stringify(prefs)); } catch (e) {} };
  let NOTES = [];
  try { NOTES = JSON.parse(localStorage.getItem("sv-notes") || "[]"); } catch (e) {}
  const saveNotes = () => { try { localStorage.setItem("sv-notes", JSON.stringify(NOTES)); } catch (e) {} countNotes(); };

  // ---------- data ----------
  let IDX = null;
  const BOOK = {};
  const getIdx = () => IDX ? Promise.resolve(IDX) : fetch("data/index.json").then(r => r.json()).then(j => (IDX = j));
  const getBook = id => BOOK[id] ? Promise.resolve(BOOK[id]) : fetch("data/" + id + ".json").then(r => r.json()).then(j => (BOOK[id] = j));
  const meta = id => IDX.books.find(b => b.id === id);
  const BH_LABEL = { arsheyakalpa: "विवृतिः" };

  // ---------- sāman svara (from the Pujanidhi app: each akṣara with its svara drawn above it) ----------
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
      const b2 = sc === "gran" ? base.replace(/[0-9]/g, d => "௦௧௨௩௪௫௬௭௮௯"[+d]) : base;
      if (/^[।॥|]+$/.test(base)) return `<span class="sak sad">${esc(base)}</span>`;
      const num = /^[0-9०-९௦-௯]+$/.test(base) ? " san" : "";
      if (!marks.length) return `<span class="sak${num}">${esc(b2)}</span>`;
      const lab = marks.map(m => { const cp = m.codePointAt(0);
        if (cp >= 0xA8E0 && cp <= 0xA8E9) return (sc === "deva" ? "०१२३४५६७८९" : "௦௧௨௩௪௫௬௭௮௯")[cp - 0xA8E0];
        const l = SAMA_L[m] || ""; return sc === "gran" && l !== "—" ? T.grantha(l) : l; }).join("");
      return `<span class="sak${num}"><span class="sav${lab === "—" ? " bar" : ""}">${lab === "—" ? "" : esc(lab)}</span>${esc(b2)}</span>`;
    };
    const words = []; let w = [];
    for (const k of cs) { if (k === " ") { if (w.length) words.push(w); w = []; } else w.push(k); }
    if (w.length) words.push(w);
    for (let i = words.length - 1; i > 0; i--) if (words[i].every(k => /^[।॥]+$/.test([...k].filter(x => !SAMA.test(x)).join("")))) { words[i - 1] = words[i - 1].concat([" "], words[i]); words.splice(i, 1); }
    return words.map(w => `<span class="saw">${w.map(one).join("")}</span>`).join(" ");
  }

  // ---------- text with layer markers ⁅b⁆…⁅/b⁆ (corrected), ⁅fN⁆ (footnote), ⁅?⁆ (doubt) ----------
  const tr = s => prefs.sc === "gran" ? T.grantha(s) : s;
  const MARK = /⁅(\/?b|f\d+|\?)⁆/g;
  const plain = s => s.replace(MARK, "");
  function textHTML(s) {
    if (SAMA.test(s)) return `<span class="saman s-${prefs.sc}">${samaHTML(tr(plain(s)), prefs.sc)}</span>`;
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

  // ---------- views ----------
  const VIEWS = ["home", "book", "reader", "results", "notes", "about"];
  function show(v) { VIEWS.forEach(x => ($(x).hidden = x !== v)); $("layerPill").hidden = v !== "reader"; }

  function applyPrefs() {
    document.documentElement.dataset.theme = prefs.th;
    document.documentElement.style.setProperty("--fs", prefs.fs + "rem");
    document.querySelectorAll("#scSeg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.sc === prefs.sc));
    document.querySelectorAll(".sw").forEach(s => s.classList.toggle("on", s.dataset.th === prefs.th));
    document.body.classList.toggle("L", !!prefs.layer);
    $("layerBtn").setAttribute("aria-pressed", !!prefs.layer);
  }

  const lvDot = l => l ? `<i class="lv ${l}" title="${l === "a" ? "அச்சோடு சோதித்தது" : "பகுதி சோதனை"}"></i>` : "";

  function renderHome() {
    show("home");
    const L = prefs.lastBook && meta(prefs.lastBook);
    $("lastRead").innerHTML = L ? (() => { const p = prefs.last[L.id] || { c: 0 }; const c = L.ch[p.c] || L.ch[0];
      return `<a class="last" href="#r/${L.id}/${p.c || 0}">↻ <span>கடைசியாகப் படித்தது:</span> <b>${esc(tr(L.title))} · ${esc(tr(c.t))}</b></a>`; })() : "";
    $("lib").innerHTML = IDX.groups.map(g => {
      const bs = IDX.books.filter(b => b.group === g.id);
      if (!bs.length) return "";
      return `<div class="grp"><h2>${esc(tr(g.t))}</h2><span>${esc(g.ta)}</span></div><div class="cards">` + bs.map(b =>
        `<a class="card" href="#b/${b.id}"><span class="cnt">${b.units ? DEV(b.units) : ""}</span><b>${lvDot(b.level)}${esc(tr(b.title))}</b><small>${esc(tr(b.sub || ""))}</small></a>`).join("") + "</div>";
    }).join("");
  }

  function renderDrawer() {
    $("dBooks").innerHTML = IDX.groups.map(g => `<h4>${esc(tr(g.t))}</h4>` + IDX.books.filter(b => b.group === g.id).map(b => `<a class="db" href="#b/${b.id}">${esc(tr(b.title))}</a>`).join("")).join("");
    countNotes();
  }
  function countNotes() { const n = NOTES.filter(x => !x.sent).length; const e = $("nCount"); if (e) e.textContent = n ? "(" + n + ")" : ""; }

  function renderBook(id) {
    const b = meta(id); if (!b) return renderHome();
    show("book");
    getBook(id).then(d => {
      const I = d.info || {};
      const p = prefs.last[id];
      $("book").innerHTML = `<a class="back" href="#">← நூல் பட்டியல்</a>
        <h1 class="btitle">${esc(tr(b.title))}</h1><p class="bsub">${esc(tr(b.sub || ""))}</p>
        <div class="info"><dl><dt>மூலம்</dt><dd>${esc(I.src || "—")}</dd><dt>பதிப்பு</dt><dd>${esc(I.ed || "—")}</dd><dt>சரிபார்ப்பு</dt><dd>${lvDot(I.level)}${esc(I.chk || "—")}</dd></dl></div>
        ${p ? `<p><a class="chip go" href="#r/${id}/${p.c}">↻ தொடர்ந்து படிக்க — ${esc(tr(d.ch[p.c] ? d.ch[p.c].t : ""))}</a></p>` : ""}
        <div class="toc">${d.ch.map((c, i) => `<details${d.ch.length <= 3 ? " open" : ""}><summary><b>${esc(tr(c.t))}</b><i>${esc(tr(c.sub || ""))}</i></summary>
          <div class="secs"><a class="chip go" href="#r/${id}/${i}">படிக்க ›</a>${c.s.length > 1 ? c.s.map((s, j) => s.t ? `<a class="chip" href="#r/${id}/${i}/s${j}">${esc(tr(s.t))}</a>` : "").join("") : ""}</div></details>`).join("")}</div>`;
    });
  }

  let RD = null;   // current reader {id, c}
  function renderReader(id, ci, anchor) {
    const b = meta(id); if (!b) return renderHome();
    show("reader");
    getBook(id).then(d => {
      ci = Math.max(0, Math.min(d.ch.length - 1, ci | 0));
      const c = d.ch[ci];
      RD = { id, c: ci };
      prefs.lastBook = id; prefs.last[id] = Object.assign(prefs.last[id] || {}, { c: ci }); save();
      $("rHead").innerHTML = `<a class="bk" href="#b/${id}">← ${esc(tr(b.title))}</a><h1>${esc(tr(c.t))}</h1>${c.sub ? `<div class="sub">${esc(tr(c.sub))}</div>` : ""}`;
      const named = c.s.filter(s => s.t).length;
      $("rChips").innerHTML = named > 1 ? c.s.map((s, j) => s.t ? `<a class="chip" href="#r/${id}/${ci}/s${j}">${esc(tr(s.t.replace(/खण्डः$/, "")))}</a>` : "").join("") : "";
      $("rChips").hidden = named <= 1;
      const bl = BH_LABEL[id] || "भाष्यम्";
      const noted = new Set(NOTES.map(n => n.k));
      let h = "";
      c.s.forEach((s, j) => {
        if (s.t) h += `<h2 class="sech" id="s${j}">${esc(tr(s.t))}</h2>`;
        s.u.forEach((u, k) => {
          const key = `${id}/${ci}/${j}/${k}`, uid = `u${j}-${k}`;
          if (u.k === "h") { h += `<div class="hd" id="${uid}">${textHTML(u.x)}</div>`; return; }
          if (u.k === "c") { h += `<div class="colo" id="${uid}">${textHTML(u.x)}</div>`; return; }
          if (u.k === "i") { h += `<details class="bh intro" id="${uid}"><summary>${esc(tr(u.x || "उपक्रमः"))}</summary><div class="bht">${textHTML(u.b)}</div></details>`; return; }
          const cls = ["u"]; if (u.k === "v" || /\n/.test(u.x)) cls.push("verse"); if (u.k === "r") cls.push("rk"); if (u.k === "p") cls.push("prose"); if (noted.has(key)) cls.push("hasnote");
          const notes = (u.f || []).map((f, i) => `<div><b>${i + 1}</b> <span class="dn">${esc(tr(f))}</span></div>`).concat((u.d || []).map(x => `<div>⚠ ${esc(x)}</div>`));
          h += `<div class="${cls.join(" ")}" id="${uid}" data-k="${key}">` +
            `<button class="no" aria-label="பிழை தெரிவி">${u.n ? esc(prefs.sc === "gran" ? u.n.replace(/[०-९]/g, d => "௦௧௨௩௪௫௬௭௮௯"["०१२३४५६७८९".indexOf(d)]) : u.n) : "•"}</button>` +
            `<span class="x">${textHTML(u.x)}</span>${notes.length ? `<div class="lnotes">${notes.join("")}</div>` : ""}</div>`;
          if (u.c) h += `<div class="hd">${textHTML(u.c)}</div>`;
          if (u.b) h += `<details class="bh"><summary>${bl}</summary><div class="bht">${textHTML(u.b)}</div></details>`;
        });
      });
      $("rBody").className = "txt " + prefs.sc;
      $("rBody").innerHTML = h;
      const prev = ci > 0 ? d.ch[ci - 1] : null, next = ci < d.ch.length - 1 ? d.ch[ci + 1] : null;
      $("rNav").innerHTML = (prev ? `<a href="#r/${id}/${ci - 1}"><small>← முந்தையது</small>${esc(tr(prev.t))}</a>` : "<span></span>") +
        (next ? `<a href="#r/${id}/${ci + 1}"><small>அடுத்தது →</small>${esc(tr(next.t))}</a>` : `<a href="#b/${id}"><small>நூல்</small>${esc(tr(b.title))}</a>`);
      requestAnimationFrame(() => {
        let el = anchor ? document.getElementById(anchor) : null;
        if (!el && !anchor && prefs.last[id].c === ci && prefs.last[id].a) el = document.getElementById(prefs.last[id].a);
        if (el) { el.closest("details") && (el.closest("details").open = true); el.scrollIntoView({ block: "start" }); if (anchor && anchor[0] === "u") { el.classList.add("flash"); } }
        else window.scrollTo(0, 0);
      });
    });
  }
  // remember the place inside a chapter
  let scT = 0;
  addEventListener("scroll", () => {
    if (!RD || $("reader").hidden) return;
    clearTimeout(scT);
    scT = setTimeout(() => {
      const els = $("rBody").querySelectorAll(".u,.hd,.sech");
      for (const e of els) { const r = e.getBoundingClientRect(); if (r.bottom > 110) { prefs.last[RD.id] = { c: RD.c, a: e.id }; save(); break; } }
    }, 300);
  }, { passive: true });

  // ---------- search ----------
  const NORM_DROP = /[꣠-॒꣱॑᳐-᳿̅̂\s।॥ऽ,;.\-–—()'"“”‘’!?0-9०-९⁅⁆]/;
  const NASAL = { "ङ": 1, "ञ": 1, "ण": 1, "न": 1, "म": 1 };
  // normalise one string; returns [norm, map] where map[i] = index in the source
  function norm(s) {
    let o = "", map = [];
    const a = [...s]; let pos = 0;
    for (let i = 0; i < a.length; i++) {
      let c = a[i]; const at = pos; pos += c.length;
      if (c === "⁅") { while (i < a.length && a[i] !== "⁆") { pos += (a[++i] || "").length; } continue; }
      if (NORM_DROP.test(c)) continue;
      if (c === "ँ" || c === "ꣳ") c = "ं";
      if (NASAL[c] && a[i + 1] === "्" && /[क-ह]/.test(a[i + 2] || "") && !/[यरलवशषसह]/.test(a[i + 2])) { o += "ं"; map.push(at); pos += 1; i++; continue; }
      o += c; map.push(at);
    }
    return [o, map];
  }
  let ALL = null;
  function loadAll() {
    if (ALL) return Promise.resolve(ALL);
    return Promise.all(IDX.books.map(b => getBook(b.id))).then(() => {
      ALL = [];
      IDX.books.forEach(b => BOOK[b.id].ch.forEach((c, ci) => c.s.forEach((s, j) => s.u.forEach((u, k) => {
        [["x", u.x], ["b", u.b]].forEach(([f, txt]) => { if (txt) ALL.push({ b: b.id, ci, j, k, f, t: txt }); });
      }))));
      return ALL;
    });
  }
  function search(q) {
    show("results");
    $("results").innerHTML = `<a class="back" href="#">← நூல் பட்டியல்</a><p class="muted">தேடுகிறது…</p>`;
    loadAll().then(all => {
      const latin = /[a-z]/i.test(q) && !/[ऀ-ॿ]/.test(q);
      const nq = latin ? T.looseLatin(q) : norm(q)[0];
      if (!nq || nq.length < 2) { $("results").innerHTML = `<a class="back" href="#">← நூல் பட்டியல்</a><p>குறைந்தது இரண்டு எழுத்து தேவை.</p>`; return; }
      const hits = [];
      for (const r of all) {
        if (latin) { r.lk = r.lk || T.key(plain(r.t)); const p = r.lk.indexOf(nq); if (p >= 0) hits.push([r, null]); }
        else { if (!r.n) r.n = norm(r.t); const p = r.n[0].indexOf(nq); if (p >= 0) hits.push([r, [r.n[1][p], r.n[1][p + nq.length - 1]]]); }
        if (hits.length >= 300) break;
      }
      const snip = (r, rg) => {
        const t = plain(r.t);
        if (!rg) return esc(tr(t.slice(0, 160))) + (t.length > 160 ? "…" : "");
        // marks were removed from t → recompute range on the plain text
        const raw = r.t; let a = rg[0], z = rg[1] + 1;
        const off = i => raw.slice(0, i).replace(MARK, "").length;
        a = off(a); z = off(z);
        while (z < t.length && /\p{M}/u.test(t[z])) z++;
        const s0 = Math.max(0, a - 60), s1 = Math.min(t.length, z + 60);
        const strip = x => x.replace(/[꣠-꣱]/g, "");
        return (s0 ? "…" : "") + esc(tr(strip(t.slice(s0, a)))) + "<em>" + esc(tr(strip(t.slice(a, z)))) + "</em>" + esc(tr(strip(t.slice(z, s1)))) + (s1 < t.length ? "…" : "");
      };
      $("results").innerHTML = `<a class="back" href="#">← நூல் பட்டியல்</a><div class="h2">«${esc(q)}» — ${hits.length >= 300 ? "300+" : hits.length} இடங்கள்</div>` +
        hits.map(([r, rg]) => { const B = BOOK[r.b], c = B.ch[r.ci], s = c.s[r.j], u = s.u[r.k];
          return `<a class="res" href="#r/${r.b}/${r.ci}/u${r.j}-${r.k}"><div class="w">${esc(tr(meta(r.b).title))} · ${esc(tr(c.t))}${s.t ? " · " + esc(tr(s.t)) : ""}${u.n ? " · " + esc(u.n) : ""}${r.f === "b" ? " · " + (BH_LABEL[r.b] || "भाष्यम्") : ""}</div><div class="s ${prefs.sc}">${snip(r, rg)}</div></a>`; }).join("") +
        (hits.length ? "" : "<p>ஒன்றும் கிடைக்கவில்லை.</p>");
    });
  }

  // ---------- «பிழை தெரிவி» ----------
  let SH = null;
  function openSheet(key) {
    const [id, ci, j, k] = key.split("/"); const B = BOOK[id]; const c = B.ch[+ci], s = c.s[+j], u = s.u[+k];
    const old = NOTES.find(n => n.k === key);
    SH = { key, id, where: `${meta(id).title} · ${c.t}${s.t ? " · " + s.t : ""}${u.n ? " · " + u.n : ""}`, orig: plain(u.x) };
    $("shWhere").textContent = SH.where;
    $("shOrig").textContent = SH.orig;
    $("shFix").value = old ? old.fix : SH.orig;
    $("shNote").value = old ? old.note : "";
    $("shDel").hidden = !old;
    $("sheet").hidden = false;
  }
  function closeSheet() { $("sheet").hidden = true; SH = null; }
  function toast(t) { const e = $("toast"); e.textContent = t; e.hidden = false; clearTimeout(e._t); e._t = setTimeout(() => (e.hidden = true), 2200); }

  function renderNotes() {
    show("notes");
    const pend = NOTES.filter(n => !n.sent);
    $("notes").innerHTML = `<a class="back" href="#">← நூல் பட்டியல்</a><div class="h2">என் பிழைக் குறிப்புகள்</div>
      <p class="muted">வரியின் எண்ணைத் தொட்டு «பிழை தெரிவி». குறிப்புகள் இந்தக் கருவியில் மட்டும் சேமிக்கப்படும்; கீழே உள்ள பொத்தானால் அனுப்புக.</p>
      <div class="btns"><button class="pri" id="nSend"${pend.length ? "" : " disabled"}>GitHub-இல் அனுப்பு (${pend.length})</button><button id="nCopy"${NOTES.length ? "" : " disabled"}>எல்லாம் நகலெடு</button><button id="nShare"${NOTES.length ? "" : " disabled"}>பகிர் (WhatsApp …)</button></div>` +
      NOTES.slice().reverse().map(n => `<div class="nt"><div class="w">${n.sent ? "✓ அனுப்பியது · " : ""}${esc(n.where)} · <a href="#r/${n.k.split("/").slice(0, 2).join("/")}/u${n.k.split("/").slice(2).join("-")}">இடம் ›</a></div>
        ${n.fix !== n.orig ? `<div class="o">${esc(n.orig)}</div><div class="f">${esc(n.fix)}</div>` : `<div class="f">${esc(n.orig)}</div>`}${n.note ? `<div>📝 ${esc(n.note)}</div>` : ""}</div>`).join("") +
      (NOTES.length ? `<div class="btns"><button id="nClear">அனுப்பியவற்றை நீக்கு</button></div>` : "<p>இன்னும் குறிப்பு இல்லை.</p>");
  }
  const notesText = list => list.map((n, i) => `${i + 1}. ${n.where}  [${n.k}]\nமூலம்: ${n.orig}\n${n.fix !== n.orig ? "திருத்தம்: " + n.fix + "\n" : ""}${n.note ? "குறிப்பு: " + n.note + "\n" : ""}`).join("\n");

  // ---------- router ----------
  function route() {
    const h = decodeURIComponent(location.hash.slice(1));
    const p = h.split("/");
    closeSheet(); $("drawer").hidden = true; $("themes").hidden = true;
    if (p[0] === "b") return renderBook(p[1]);
    if (p[0] === "r") return renderReader(p[1], +p[2] || 0, p[3] || null);
    if (p[0] === "q") return search(p.slice(1).join("/"));
    if (p[0] === "notes") return renderNotes();
    if (p[0] === "about") { show("about"); return renderAbout(); }
    RD = null; renderHome(); window.scrollTo(0, 0);
  }
  function renderAbout() {
    $("about").innerHTML = `<a class="back" href="#">← நூல் பட்டியல்</a><div class="about"><div class="h2">सामवेदग्रन्थसंहिता</div>
      <p>ஸாமவேத ஸம்ஹிதை, ப்ராஹ்மணங்கள், கல்ப ஸூத்ரங்கள், ஶிக்ஷை — பாராயணத்துக்கான பிழையற்ற பாடம் என்பது நோக்கம். ஒவ்வொரு நூலின் பக்கத்திலும் அதன் மூலம், பதிப்பு, சரிபார்ப்பு நிலை உள்ளன.</p>
      <p>மூலம் மட்டும் இயல்பாகத் தெரியும்; பாஷ்யம்/விவ்ருதி தொட்டால் விரியும். கீழே உள்ள «பாடபேதம் / ஐயம்» பொத்தான் தட்டச்சாளரின் திருத்தங்கள், பாடபேதங்கள், ஐயங்களைக் காட்டும்.</p>
      <p>பிழை கண்டால்: வரியின் எண்ணைத் தொட்டு «பிழை தெரிவி».</p>
      <p>ஆக்கியோன்: திருவிடைமருதூர் நிதீஶ்வர ஶர்மா.</p>
      <p class="muted">பதிப்பு ${VERSION} · இணையம் இல்லாமலும் இயங்கும் (முகப்புத் திரையில் சேர்க்கலாம்).</p></div>`;
  }

  // ---------- events ----------
  document.addEventListener("click", e => {
    const t = e.target;
    const no = t.closest(".u .no"); if (no) { openSheet(no.closest(".u").dataset.k); return; }
    const sc = t.closest("#scSeg button"); if (sc) { prefs.sc = sc.dataset.sc; save(); applyPrefs(); keepPlace(route); return; }
    const sw = t.closest(".sw"); if (sw) { prefs.th = sw.dataset.th; save(); applyPrefs(); return; }
    if (t.closest("#thBtn")) { $("themes").hidden = !$("themes").hidden; return; }
    if (t.closest("#menuBtn")) { $("drawer").hidden = false; return; }
    if (t.id === "drawer") { $("drawer").hidden = true; return; }
    if (!t.closest("#themes")) $("themes").hidden = true;
    if (t.closest("#aPlus") || t.closest("#aMinus")) { prefs.fs = Math.max(.9, Math.min(3.2, +(prefs.fs + (t.closest("#aPlus") ? .1 : -.1)).toFixed(2))); save(); keepPlace(applyPrefs); return; }
    if (t.closest("#layerBtn")) { prefs.layer = !prefs.layer; save(); keepPlace(applyPrefs); toast(prefs.layer ? "பாடபேதம் / ஐயம் காட்டப்படுகிறது" : "மூலம் மட்டும்"); return; }
    if (t.closest("#qGo")) { const q = $("q").value.trim(); if (q) location.hash = "q/" + q; return; }
    if (t.closest("#shX") || t.id === "sheet") { closeSheet(); return; }
    if (t.closest("#shSave")) {
      const fix = $("shFix").value.trim(), note = $("shNote").value.trim();
      const i = NOTES.findIndex(n => n.k === SH.key);
      const rec = { k: SH.key, where: SH.where, orig: SH.orig, fix, note, at: new Date().toISOString(), sent: false };
      if (i >= 0) NOTES[i] = rec; else NOTES.push(rec);
      saveNotes(); const el = document.querySelector(`[data-k="${SH.key}"]`); el && el.classList.add("hasnote"); closeSheet(); toast("சேமிக்கப்பட்டது ⚑"); return;
    }
    if (t.closest("#shDel")) { NOTES = NOTES.filter(n => n.k !== SH.key); saveNotes(); const el = document.querySelector(`[data-k="${SH.key}"]`); el && el.classList.remove("hasnote"); closeSheet(); return; }
    if (t.closest("#nSend")) {
      const pend = NOTES.filter(n => !n.sent); if (!pend.length) return;
      // a GitHub issue URL must stay short: send in parts of ~6000 characters
      let part = [], len = 0; const parts = [];
      pend.forEach(n => { const s = notesText([n]); if (len + s.length > 6000 && part.length) { parts.push(part); part = []; len = 0; } part.push(n); len += s.length; });
      if (part.length) parts.push(part);
      parts.forEach((pt, i) => {
        const title = `பிழைக் குறிப்புகள் ${new Date().toISOString().slice(0, 10)} (${pt.length})${parts.length > 1 ? " — " + (i + 1) + "/" + parts.length : ""}`;
        window.open(`${REPO}/issues/new?title=${encodeURIComponent(title)}&labels=${encodeURIComponent("பிழை")}&body=${encodeURIComponent(notesText(pt) + "\n— ஆப் " + VERSION)}`, "_blank", "noopener");
      });
      pend.forEach(n => (n.sent = true)); saveNotes(); renderNotes(); return;
    }
    if (t.closest("#nCopy")) { navigator.clipboard && navigator.clipboard.writeText(notesText(NOTES)).then(() => toast("நகலெடுக்கப்பட்டது")); return; }
    if (t.closest("#nShare")) { const txt = notesText(NOTES); if (navigator.share) navigator.share({ title: "ஸாமவேத ஆப் — பிழைக் குறிப்புகள்", text: txt }).catch(() => {}); else navigator.clipboard.writeText(txt).then(() => toast("நகலெடுக்கப்பட்டது")); return; }
    if (t.closest("#nClear")) { NOTES = NOTES.filter(n => !n.sent); saveNotes(); renderNotes(); return; }
  });
  $("q").addEventListener("keydown", e => { if (e.key === "Enter") { const q = $("q").value.trim(); if (q) location.hash = "q/" + q; } });
  addEventListener("keydown", e => { if (e.key === "Escape") { closeSheet(); $("drawer").hidden = true; $("themes").hidden = true; } });

  // keep the reading place across a re-render (script, size, layer)
  function keepPlace(fn) {
    let el = null, off = 0;
    if (!$("reader").hidden) for (const e of $("rBody").querySelectorAll(".u,.hd,.sech")) { const r = e.getBoundingClientRect(); if (r.bottom > 110) { el = e.id; off = r.top; break; } }
    fn();
    if (el) setTimeout(() => { const e = document.getElementById(el); if (e) window.scrollBy(0, e.getBoundingClientRect().top - off); }, 60);
  }

  addEventListener("hashchange", route);
  applyPrefs();
  getIdx().then(() => { renderDrawer(); route(); });

  // offline (service worker written by publish)
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
