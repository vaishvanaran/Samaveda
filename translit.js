/* Devanagari → Tamil (with ² ³ ⁴), Grantha, IAST.  Text is stored once, in Devanagari. */
(function (g) {
  const SVARA = /[॒᳝॑᳚॓॔꣠-꣱]/g;
  const DIG = "०१२३४५६७८९";

  const TA_C = { "क":["க",1],"ख":["க",2],"ग":["க",3],"घ":["க",4],"ङ":["ங",0],"च":["ச",1],"छ":["ச",2],"ज":["ஜ",1],"झ":["ஜ",2],"ञ":["ஞ",0],
    "ट":["ட",1],"ठ":["ட",2],"ड":["ட",3],"ढ":["ட",4],"ण":["ண",0],"त":["த",1],"थ":["த",2],"द":["த",3],"ध":["த",4],"न":["ந",0],
    "प":["ப",1],"फ":["ப",2],"ब":["ப",3],"भ":["ப",4],"म":["ம",0],"य":["ய",0],"र":["ர",0],"ल":["ல",0],"व":["வ",0],
    "श":["ஶ",0],"ष":["ஷ",0],"स":["ஸ",0],"ह":["ஹ",0],"ळ":["ள",0] };
  const TA_V = { "अ":"அ","आ":"ஆ","इ":"இ","ई":"ஈ","उ":"உ","ऊ":"ஊ","ऋ":"ரு","ॠ":"ரூ","ऌ":"லு","ए":"ஏ","ऐ":"ஐ","ओ":"ஓ","औ":"ஔ" };
  const TA_M = { "ा":"ா","ि":"ி","ी":"ீ","ु":"ு","ू":"ூ","े":"ே","ै":"ை","ो":"ோ","ौ":"ௌ","्":"்" };
  const SUP = ["", "", "²", "³", "⁴"];
  const isDeva = c => c && /[ऀ-ॿ]/.test(c);

  const NA_MEMBERS = ["नामाव", "नामानि", "नामस्तोत्र", "नारायण", "नाथ", "नायक", "नायिका", "निधि", "निधये", "नेत्र", "निलय", "निवास", "नाशन", "नाशिन", "नमः", "नमो", "नन्दन", "नन्दिन", "नारद"];
  function tamil(s) {
    s = s.replace(/[१३](?=[\u0951\u0952\u1CDA])/g, "").replace(SVARA, ""); // Vedic kampa numeral (१॒॑) goes with the svara marks
    let o = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i], c = TA_C[ch];
      if (c) {
        let base = c[0];
        if (ch === "न") {
          const wordStart = !isDeva(s[i - 1]);
          const beforeDental = s[i + 1] === "्" && "तथदध".includes(s[i + 2] || "");
          // inside a word ன, but ந where a compound member starts (…नामावलिः, …नारायण, विनायक, त्रिनेत्र …)
          // and right after the prefix श्री (श्रीनारद, श्रीनिवास, श्रीनाथ …): the next word starts there
          const memberStart = NA_MEMBERS.some(w => s.startsWith(w, i)) || s.slice(Math.max(0, i - 4), i) === "श्री";
          if (!wordStart && !beforeDental && !memberStart) base = "ன";
        }
        const sup = SUP[c[1]] || "", m = s[i + 1];
        if (m === "ृ" || m === "ॄ") { o += base + "்" + sup + (m === "ृ" ? "ரு" : "ரூ"); i++; continue; }
        if (TA_M[m]) { o += base + TA_M[m] + sup; i++; continue; }
        o += base + sup; continue;
      }
      if (TA_V[ch]) { o += TA_V[ch]; continue; }
      if (ch === "ं" || ch === "ँ") { o += "ம்"; continue; }
      if (ch === "ः") { o += ":"; continue; }
      if (ch === "ऽ") { o += "'"; continue; }
      if (ch === "ॐ") { o += "ஓம்"; continue; }
      const d = DIG.indexOf(ch); if (d >= 0) { o += d; continue; }
      o += ch;
    }
    return o;
  }

  // Clusters of three or more stacked consonants (e.g. त्स्न, त्त्व, न्द्व) grow so deep in Grantha that
  // they run into the next line. Keep the last two stacked and show the earlier ones with a visible
  // virama (ZWNJ after the virama). A leading repha and a final ya / ra add no depth, so they are not counted.
  const GC = "[\u0915-\u0939\u0958-\u095F]";
  const CLUSTER = new RegExp(`(?:${GC}\u094D){2,}${GC}`, "g");
  function unstack(s) {
    return s.replace(CLUSTER, m => {
      // क्ष and ज्ञ are read and written as one letter, so they count as one
      const cs = m.split("\u094D").reduce((a, c) => { const l = a[a.length - 1];
        if (l && ((l === "क" && c === "ष") || (l === "ज" && c === "ञ"))) a[a.length - 1] = l + "\u094D" + c; else a.push(c); return a; }, []);
      let lo = cs[0] === "र" ? 1 : 0, hi = cs.length;
      if (/[यर]/.test(cs[hi - 1]) && hi - lo > 2) hi--;
      let out = cs.slice(0, lo).map(c => c + "\u094D").join("");
      const depth = hi - lo, free = Math.max(0, depth - 2);
      for (let i = lo; i < cs.length; i++) out += cs[i] + (i < cs.length - 1 ? "\u094D" + (i < lo + free ? "\u200C" : "") : "");
      return out;
    });
  }
  function grantha(s) {
    s = unstack(s);
    let o = "";
    for (const ch of s) {
      const cp = ch.codePointAt(0);
      if (ch === "ॐ") { o += "\u{11350}"; continue; }
      const d = DIG.indexOf(ch); if (d >= 0) { o += d; continue; }
      if ((cp >= 0x0901 && cp <= 0x094D) || (cp >= 0x0960 && cp <= 0x0963)) { o += String.fromCodePoint(cp + 0x10A00); continue; }
      o += ch; // danda, svaras (font supports ॑ ॒), spaces
    }
    return o;
  }

  const LC = { "क":"k","ख":"kh","ग":"g","घ":"gh","ङ":"ṅ","च":"c","छ":"ch","ज":"j","झ":"jh","ञ":"ñ","ट":"ṭ","ठ":"ṭh","ड":"ḍ","ढ":"ḍh","ण":"ṇ",
    "त":"t","थ":"th","द":"d","ध":"dh","न":"n","प":"p","फ":"ph","ब":"b","भ":"bh","म":"m","य":"y","र":"r","ल":"l","व":"v",
    "श":"ś","ष":"ṣ","स":"s","ह":"h","ळ":"ḻ" };
  const LV = { "अ":"a","आ":"ā","इ":"i","ई":"ī","उ":"u","ऊ":"ū","ऋ":"ṛ","ॠ":"ṝ","ऌ":"ḷ","ए":"e","ऐ":"ai","ओ":"o","औ":"au" };
  const LM = { "ा":"ā","ि":"i","ी":"ī","ु":"u","ू":"ū","ृ":"ṛ","ॄ":"ṝ","े":"e","ै":"ai","ो":"o","ौ":"au" };
  function iast(s) {
    s = s.replace(SVARA, "");
    let o = "";
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (LC[ch]) {
        o += LC[ch]; const m = s[i + 1];
        if (m === "्") { i++; continue; }
        if (LM[m]) { o += LM[m]; i++; continue; }
        o += "a"; continue;
      }
      if (LV[ch]) { o += LV[ch]; continue; }
      if (ch === "ं") { o += "ṃ"; continue; }
      if (ch === "ँ") { o += "m̐"; continue; }
      if (ch === "ः") { o += "ḥ"; continue; }
      if (ch === "ऽ") { o += "'"; continue; }
      if (ch === "ॐ") { o += "oṃ"; continue; }
      if (ch === "।") { o += "|"; continue; }
      if (ch === "॥") { o += "||"; continue; }
      const d = DIG.indexOf(ch); if (d >= 0) { o += d; continue; }
      o += ch;
    }
    return o;
  }
  // loose ASCII key for search: "dakshinamurti" finds दक्षिणामूर्ति
  function key(s) {
    return iast(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/sh|s/g, "s").replace(/ksh|ks/g, "ks").replace(/aa/g, "a").replace(/ee/g, "i").replace(/oo/g, "u")
      .replace(/([kgcjtdpb])h/g, "$1").replace(/[^a-z]/g, "");
  }
  const looseLatin = q => q.toLowerCase().replace(/sh|s/g, "s").replace(/ksh|ks/g, "ks").replace(/aa/g, "a").replace(/ee/g, "i")
      .replace(/oo/g, "u").replace(/([kgcjtdpb])h/g, "$1").replace(/[^a-z]/g, "");

  g.Translit = { tamil, grantha, iast, key, looseLatin, deva: s => s, stripSvara: s => s.replace(SVARA, "") };
})(window);
