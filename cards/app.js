/* ════════════════════════════════════════════════════════════════
   TIME CAPSULE TAPES — CONTENT CARD STUDIO · behaviours
   TSV → cards · ratio / background / layout / theme controls ·
   per-card type-autofit · inline text editing · focus view · PDF.
   ════════════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  const $  = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const CACHE_BUST = new URL(document.currentScript ? document.currentScript.src : location.href).searchParams.get("v") || "dev";

  const RATIOS = { "1x1":1080, "4x5":1350, "9x16":1920, "16x9":608, "3x4":1440 };
  const LIGHT  = { limestone:1, sand:1 };
  /* mixed-mode rhythm: an 8-beat motif repeated across the set so the light
     limestone/sand plates and the photo plate stay evenly spaced */
  const MIX = ["ember","deep","limestone","ember","oxblood","sand","ember","photo"];
  const BASE_HL = { quote:88, tip:62, cta:72, question:78, announcement:70, stat:150 };
  const RATIO_HL = {
    "16x9": { quote:82, tip:88, cta:96, question:84, announcement:86, stat:108 }
  };
  const PHOTO_TREATMENT = {
    on:  { scrim:0.46, vig:0.26, tex:0 },
    off: { scrim:0,    vig:0,    tex:0 }
  };

  const PHOTO_KEY = "tct_photo_v1";
  let photoSrc = "media/portrait.jpg";
  try { const p = localStorage.getItem(PHOTO_KEY); if (p) photoSrc = p; } catch(e){}

  const SETTINGS_KEY = "tct_cards_settings_v1";
  const SETTINGS_FIELDS = ["ratio","bg","layout","theme","vignette"];
  const EDITS_KEY    = "tct_cards_edits_v1";

  const state = Object.assign(
    { ratio:"4x5", bg:"mixed", layout:"editorial", theme:"all", vignette:"on", edit:false },
    load(SETTINGS_KEY, {})
  );
  if (state.vignette !== "off") state.vignette = "on";
  const edits = load(EDITS_KEY, {});
  let cards = [];

  function load(k, d){ try { return JSON.parse(localStorage.getItem(k)) || d; } catch(e){ return d; } }
  function save(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

  /* ───────── TSV ───────── */
  function parseTSV(txt){
    const lines = txt.replace(/\r/g,"").split("\n").filter(l=>l.length);
    const head = lines.shift().split("\t");
    return lines.map(line=>{
      const cells = line.split("\t");
      const o = {};
      head.forEach((h,i)=> o[h.trim()] = (cells[i]||"").trim());
      return o;
    });
  }
  async function getData(){
    try {
      const r = await fetch("content.tsv?v=" + encodeURIComponent(CACHE_BUST), { cache:"no-store" });
      if (r.ok){ const t = await r.text(); if (t.trim()) return parseTSV(t); }
    } catch(e){ /* file:// or offline — fall through to embedded */ }
    return parseTSV($("#tsv").textContent);
  }

  /* ───────── card markup ───────── */
  function bgFor(card, i){
    if (state.bg !== "mixed") return state.bg;
    return MIX[i % MIX.length];
  }
  function esc(s){ return (s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
  function textHTML(s){
    return esc(s)
      .replace(/&lt;br\s*\/?&gt;/g, "<br>")
      .replace(/tell the truth/g, "tell&nbsp;the&nbsp;truth")
      .replace(/not content/g, "not&nbsp;content");
  }
  function boxStyle(e, field){
    const box = e._boxes && e._boxes[field];
    const w = box && parseFloat(box.w);
    if (!Number.isFinite(w)) return "";
    const v = Math.max(120, Math.min(960, Math.round(w)));
    return ' style="width:min(100%,'+v+'px);max-width:100%"';
  }

  function cardHTML(d, i){
    const e = edits[d.id] || {};
    const eyebrow  = e.eyebrow  != null ? e.eyebrow  : d.eyebrow;
    const headline = e.headline != null ? e.headline : d.headline;
    const support  = e.support  != null ? e.support  : d.support;
    const total = String(cards.length).padStart(2,"0");
    return (
      '<div class="card" data-type="'+d.type+'" data-id="'+d.id+'">' +
        '<div class="photo"><img src="'+photoSrc+'" alt="" decoding="async"></div>' +
        '<div class="scrim"></div><div class="tex"></div><div class="vig"></div>' +
        '<div class="inner">' +
          '<div class="c-top">' +
            '<span class="eyebrow" data-edit="eyebrow">'+esc(eyebrow)+'</span>' +
            '<span class="c-idx">N&ordm; '+d.id+' / '+total+'</span>' +
          '</div>' +
          '<div class="c-body">' +
            '<p class="headline" data-edit="headline"'+boxStyle(e,"headline")+'>'+textHTML(headline)+'</p>' +
            '<p class="support" data-edit="support"'+boxStyle(e,"support")+'>'+textHTML(support)+'</p>' +
          '</div>' +
          '<div class="c-foot">' +
            '<img class="lockup" src="media/tct-logo-white-effects.webp" alt="Time Capsule Tapes" width="230" height="98" decoding="async">' +
            '<span class="sig">timecapsuletapes.com</span>' +
          '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ───────── render ───────── */
  const grid = $("#grid");
  function render(){
    const H = RATIOS[state.ratio];
    const filtered = cards.map((d,i)=>({d,i})).filter(({d})=> state.theme==="all" || d.theme===state.theme);
    grid.innerHTML = filtered.map(({d,i})=>{
      const bg = bgFor(d,i);
      return (
        '<div class="slot" data-h="'+H+'">' +
          '<span class="num">N&ordm; '+d.id+'</span>' +
          '<div class="frame" data-bg="'+bg+'" tabindex="0" data-i="'+i+'">' +
            wrapCard(d,i,bg) +
          '</div>' +
        '</div>'
      );
    }).join("");
    applyAll();
  }
  function wrapCard(d,i,bg){
    // returns a .card pre-tagged with bg + layout + ink class
    const html = cardHTML(d,i);
    return html;
  }

  function applyAll(){
    const H = RATIOS[state.ratio];
    $$(".frame").forEach(frame=>{
      const card = $(".card", frame);
      const bg = frame.dataset.bg;
      card.setAttribute("data-bg", bg);
      card.setAttribute("data-ratio", state.ratio);
      card.setAttribute("data-vignette", state.vignette);
      card.classList.toggle("on-ink", !!LIGHT[bg]);
      ["editorial","centered","statement","document"].forEach(l=> card.classList.remove("lay-"+l));
      card.classList.add("lay-"+state.layout);
      card.style.height = H + "px";
      applyPhotoTreatment(card, bg);
    });
    document.body.classList.toggle("editing", state.edit);
    setEditable(state.edit);
    afterFonts(()=>{ autofitAll(); scaleAll(); });
  }
  function applyPhotoTreatment(card, bg){
    const scrim = $(".scrim", card), vig = $(".vig", card), tex = $(".tex", card);
    if (!scrim || !vig || !tex) return;
    if (bg !== "photo"){
      scrim.style.opacity = "";
      vig.style.opacity = "";
      tex.style.opacity = "";
      tex.style.backgroundImage = "";
      return;
    }
    const t = PHOTO_TREATMENT[state.vignette] || PHOTO_TREATMENT.on;
    scrim.style.opacity = String(t.scrim);
    vig.style.opacity = String(t.vig);
    tex.style.opacity = String(t.tex);
    tex.style.backgroundImage = "none";
  }

  /* fit headline size so the card never overflows its ratio box */
  function autofit(card){
    const inner = $(".inner", card);
    const type = card.getAttribute("data-type");
    const H = parseFloat(card.style.height);
    const ratio = card.getAttribute("data-ratio") || state.ratio;
    let ratioBase = (RATIO_HL[ratio] && RATIO_HL[ratio][type]) || BASE_HL[type];
    if (type==="stat" && card.dataset.id==="08" && ratio!=="16x9") ratioBase = 132;
    let hl = (state.layout==="statement" ? (ratioBase*1.22) : ratioBase);
    if (state.layout==="document" && type!=="stat") hl = Math.min(hl, BASE_HL[type]*0.92);
    setTypeSize(card, hl);
    let guard = 0;
    while (hasTypeOverflow(card, inner, H) && hl > 24 && guard < 80){
      hl -= 3; setTypeSize(card, hl); guard++;
    }
  }
  function hasTypeOverflow(card, inner, H){
    return inner.scrollHeight > H + 0.5;
  }
  function setTypeSize(card, hl){
    card.style.setProperty("--hl", hl+"px");
    if (card.getAttribute("data-type")==="stat") card.style.setProperty("--stat-support", hl+"px");
  }
  function autofitAll(){ $$(".card").forEach(autofit); }

  /* scale each 1080 card down into its responsive frame */
  function scaleAll(){
    const H = RATIOS[state.ratio];
    $$(".frame").forEach(frame=>{
      const w = frame.clientWidth;
      const s = w / 1080;
      frame.style.height = (w * H / 1080) + "px";
      const card = $(".card", frame);
      card.style.transform = "scale(" + s + ")";
    });
  }

  /* ───────── editing ───────── */
  function setEditable(on){
    $$("[data-edit]").forEach(el=>{
      if (on){ el.setAttribute("contenteditable","true"); el.spellcheck=false; }
      else el.removeAttribute("contenteditable");
    });
  }
  function setEditMode(on){
    state.edit = !!on;
    document.body.classList.toggle("editing", state.edit);
    setEditable(state.edit);
    syncDock();
    if (state.edit && focus.classList.contains("open")) closeFocus();
  }
  grid.addEventListener("input", (ev)=>{
    const el = ev.target.closest("[data-edit]");
    if (!el || !state.edit) return;
    const card = el.closest(".card");
    const id = card.dataset.id, field = el.dataset.edit;
    edits[id] = edits[id] || {};
    edits[id][field] = el.textContent;
    save(EDITS_KEY, edits);
    autofit(card); scaleOne(card.closest(".frame"));
  });
  const RESIZABLE_TEXT = { headline:1, support:1 };
  let textResize = null, textResizeRAF = 0;
  grid.addEventListener("pointerdown", (ev)=>{
    if (!state.edit) return;
    const el = ev.target.closest("[data-edit]");
    if (!el || !RESIZABLE_TEXT[el.dataset.edit]) return;
    const r = el.getBoundingClientRect();
    if (ev.clientX < r.right - 22) return;
    ev.preventDefault();
    const card = el.closest(".card");
    const cr = card.getBoundingClientRect();
    textResize = {
      el,
      card,
      frame: card.closest(".frame"),
      field: el.dataset.edit,
      startX: ev.clientX,
      startW: el.offsetWidth,
      scale: cr.width / card.offsetWidth || 1
    };
    document.body.classList.add("resizing-textbox");
    window.addEventListener("pointermove", moveTextBox, { passive:false });
    window.addEventListener("pointerup", endTextBox, { once:true });
  });
  function textBoxWidthLimit(item){
    const body = $(".c-body", item.card);
    const min = item.field==="support" ? 160 : 180;
    const max = body ? body.clientWidth : 960;
    return { min, max: Math.max(min, max) };
  }
  function moveTextBox(ev){
    if (!textResize) return;
    ev.preventDefault();
    const lim = textBoxWidthLimit(textResize);
    const raw = textResize.startW + (ev.clientX - textResize.startX) / textResize.scale;
    const w = Math.round(Math.max(lim.min, Math.min(lim.max, raw)));
    setTextBoxWidth(textResize.el, w);
    cancelAnimationFrame(textResizeRAF);
    textResizeRAF = requestAnimationFrame(()=>{
      autofit(textResize.card);
      scaleOne(textResize.frame);
    });
  }
  function endTextBox(){
    if (!textResize) return;
    cancelAnimationFrame(textResizeRAF);
    saveTextBoxWidth(textResize.el);
    autofit(textResize.card);
    scaleOne(textResize.frame);
    textResize = null;
    document.body.classList.remove("resizing-textbox");
    window.removeEventListener("pointermove", moveTextBox);
  }
  function setTextBoxWidth(el, w){
    el.style.width = "min(100%," + w + "px)";
    el.style.maxWidth = "100%";
  }
  function saveTextBoxWidth(el){
    const card = el.closest(".card");
    if (!card) return;
    const id = card.dataset.id, field = el.dataset.edit;
    if (!RESIZABLE_TEXT[field]) return;
    const lim = textBoxWidthLimit({ card, field });
    const w = Math.round(Math.max(lim.min, Math.min(lim.max, el.offsetWidth)));
    edits[id] = edits[id] || {};
    edits[id]._boxes = edits[id]._boxes || {};
    edits[id]._boxes[field] = { w };
    save(EDITS_KEY, edits);
  }
  function scaleOne(frame){
    const H = RATIOS[state.ratio];
    const w = frame.clientWidth, s = w/1080;
    frame.style.height = (w*H/1080)+"px";
    $(".card",frame).style.transform = "scale("+s+")";
  }

  /* ───────── focus overlay ───────── */
  const focus = $("#focus"), stage = $("#focusStage");
  let focusIdx = -1, visibleList = [];
  function openFocus(i){
    visibleList = $$(".frame").map(f=>parseInt(f.dataset.i,10));
    focusIdx = i;
    renderFocus();
    focus.classList.add("open");
  }
  function renderFocus(){
    const d = cards[focusIdx];
    const realIndex = cards.indexOf(d);
    const bg = bgFor(d, realIndex);
    stage.innerHTML =
      '<div class="frame" data-bg="'+bg+'">'+cardHTML(d, realIndex)+
      '<div class="fmeta"><span>N&ordm; '+d.id+' / '+String(cards.length).padStart(2,"0")+'</span>'+
      '<span>'+d.theme.toUpperCase()+' &middot; '+d.type.toUpperCase()+'</span></div></div>';
    const frame = $(".frame", stage);
    const card = $(".card", frame);
    card.setAttribute("data-bg", bg);
    card.setAttribute("data-ratio", state.ratio);
    card.setAttribute("data-vignette", state.vignette);
    card.classList.toggle("on-ink", !!LIGHT[bg]);
    card.classList.add("lay-"+state.layout);
    const H = RATIOS[state.ratio];
    card.style.height = H+"px";
    applyPhotoTreatment(card, bg);
    // size the focus frame to the largest box that fits the viewport
    afterFonts(()=>{
      autofit(card);
      const isMobile = window.innerWidth <= 760;
      const maxW = Math.min(window.innerWidth * (isMobile ? 0.92 : 0.9), 1080);
      const maxH = isMobile ? Math.max(240, window.innerHeight - 160) : window.innerHeight*0.86;
      let w = maxW; if (w*H/1080 > maxH) w = maxH*1080/H;
      frame.style.width = w+"px";
      frame.style.height = (w*H/1080)+"px";
      card.style.transform = "scale("+(w/1080)+")";
    });
  }
  function stepFocus(dir){
    const pos = visibleList.indexOf(focusIdx);
    const next = visibleList[(pos+dir+visibleList.length)%visibleList.length];
    focusIdx = next; renderFocus();
  }
  function closeFocus(){ focus.classList.remove("open"); stage.innerHTML=""; }

  grid.addEventListener("click", (ev)=>{
    if (state.edit) return;
    const frame = ev.target.closest(".frame");
    if (frame) openFocus(parseInt(frame.dataset.i,10));
  });
  $("#focusClose").addEventListener("click", closeFocus);
  $("#focusPrev").addEventListener("click", ()=>stepFocus(-1));
  $("#focusNext").addEventListener("click", ()=>stepFocus(1));
  focus.addEventListener("click", (ev)=>{ if (ev.target===focus) closeFocus(); });
  window.addEventListener("keydown", (ev)=>{
    if (!focus.classList.contains("open")) return;
    if (ev.key==="Escape") closeFocus();
    if (ev.key==="ArrowLeft") stepFocus(-1);
    if (ev.key==="ArrowRight") stepFocus(1);
  });

  /* ───────── dock ───────── */
  function syncDock(){
    $$(".select[data-ctl]").forEach(sel=>{
      const ctl = sel.dataset.ctl;
      const active = $('.select-menu button[data-v="'+state[ctl]+'"]', sel);
      const current = $(".select-current", sel);
      if (current) current.textContent = active ? active.textContent : state[ctl];
      const trigger = $(".select-trigger", sel);
      if (trigger) trigger.setAttribute("aria-label", ctl + ": " + (current ? current.textContent : state[ctl]));
      $$(".select-menu button", sel).forEach(b=>{
        const on = b.dataset.v === state[ctl];
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
    });
    $("#editBtn").classList.toggle("on", state.edit);
    $("#editBtn").setAttribute("aria-pressed", state.edit ? "true" : "false");
  }
  function closeSelects(except){
    $$(".select.open").forEach(sel=>{
      if (sel === except) return;
      sel.classList.remove("open");
      const trigger = $(".select-trigger", sel);
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }
  $$(".select[data-ctl]").forEach(sel=>{
    const trigger = $(".select-trigger", sel);
    if (trigger) trigger.addEventListener("click", ()=>{
      const open = !sel.classList.contains("open");
      closeSelects(open ? sel : null);
      sel.classList.toggle("open", open);
      trigger.setAttribute("aria-expanded", open ? "true" : "false");
      if (open){
        const active = $(".select-menu button.on", sel) || $(".select-menu button", sel);
        if (active) active.focus({ preventScroll:true });
      }
    });
    sel.addEventListener("click", (ev)=>{
      const b = ev.target.closest(".select-menu button[data-v]"); if (!b) return;
      const ctl = sel.dataset.ctl;
      state[ctl] = b.dataset.v;
      save(SETTINGS_KEY, pick(state, SETTINGS_FIELDS));
      closeSelects();
      syncDock();
      if (ctl==="theme" || ctl==="bg") render(); else applyAll();
    });
    sel.addEventListener("keydown", (ev)=>{
      if (ev.key==="Escape"){ closeSelects(); if (trigger) trigger.focus(); return; }
      if (ev.key!=="ArrowDown" && ev.key!=="ArrowUp") return;
      ev.preventDefault();
      const items = $$(".select-menu button", sel);
      if (!items.length) return;
      if (!sel.classList.contains("open")){
        sel.classList.add("open");
        if (trigger) trigger.setAttribute("aria-expanded", "true");
      }
      const pos = Math.max(0, items.indexOf(document.activeElement));
      const next = ev.key==="ArrowDown" ? (pos+1)%items.length : (pos-1+items.length)%items.length;
      items[next].focus({ preventScroll:true });
    });
  });
  document.addEventListener("click", (ev)=>{ if (!ev.target.closest(".select")) closeSelects(); });
  $("#editBtn").addEventListener("click", (ev)=>{
    ev.stopPropagation();
    setEditMode(!state.edit);
  });
  document.addEventListener("pointerdown", (ev)=>{
    if (!state.edit) return;
    if (ev.target.closest("[data-edit], #editBtn")) return;
    setEditMode(false);
  });
  /* ───────── photo background upload ───────── */
  const photoInput = $("#photoInput");
  $("#photoBtn").addEventListener("click", ()=> photoInput.click());
  photoInput.addEventListener("change", ()=>{
    const file = photoInput.files && photoInput.files[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = ()=>{
      photoSrc = fr.result;
      try { localStorage.setItem(PHOTO_KEY, photoSrc); } catch(e){ /* too large to persist — keep in session */ }
      $$(".photo img").forEach(im=> im.src = photoSrc);
      if (state.bg !== "photo"){ state.bg = "photo"; save(SETTINGS_KEY, pick(state, SETTINGS_FIELDS)); syncDock(); render(); }
      if (focus.classList.contains("open")) renderFocus();
    };
    fr.readAsDataURL(file);
    photoInput.value = "";
  });

  /* ───────── PNG export (single + zip-all) ───────── */
  const EXPORT_FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Chivo:ital,wght@0,400;0,500;0,700;0,800;0,900;1,400&family=Chivo+Mono:wght@400;500;700&display=swap";
  let exportFontCSSPromise;

  async function blobToDataURL(blob){
    return new Promise((resolve, reject)=>{
      const fr = new FileReader();
      fr.onload = ()=>resolve(fr.result);
      fr.onerror = ()=>reject(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  async function buildExportFontCSS(){
    try {
      const r = await fetch(EXPORT_FONT_CSS_URL, { cache:"force-cache" });
      if (!r.ok) return "";
      const css = await r.text();
      const urlRE = /url\((['"]?)([^'")]+)\1\)/g;
      const urls = [];
      css.replace(urlRE, (_, q, url)=>{ urls.push(new URL(url, EXPORT_FONT_CSS_URL).href); return ""; });
      const fontMap = {};
      await Promise.all(Array.from(new Set(urls)).map(async url=>{
        try {
          const font = await fetch(url, { cache:"force-cache" });
          if (font.ok) fontMap[url] = await blobToDataURL(await font.blob());
        } catch(e){}
      }));
      return css.replace(urlRE, (match, q, url)=>{
        const abs = new URL(url, EXPORT_FONT_CSS_URL).href;
        return fontMap[abs] ? 'url("'+fontMap[abs]+'")' : match;
      });
    } catch(e){ return ""; }
  }

  async function getExportFontCSS(node){
    if (!exportFontCSSPromise) exportFontCSSPromise = buildExportFontCSS();
    const css = await exportFontCSSPromise;
    if (css) return css;
    try {
      const HTI = window.htmlToImage;
      return HTI && HTI.getFontEmbedCSS ? await HTI.getFontEmbedCSS(node, { cacheBust:true }) : "";
    }
    catch(e){ return ""; }
  }

  async function ensureExportFonts(){
    if (!document.fonts) return;
    const specs = [
      "400 30px Chivo",
      "700 88px Chivo",
      "900 88px Chivo",
      "400 30px \"Chivo Mono\"",
      "500 25px \"Chivo Mono\"",
      "700 21px \"Chivo Mono\""
    ];
    await Promise.all(specs.map(spec=>document.fonts.load(spec).catch(()=>[])));
    await document.fonts.ready;
  }

  async function cardToBlob(d, i){
    const HTI = window.htmlToImage;
    const H = RATIOS[state.ratio], bg = bgFor(d, i);
    const stage = document.createElement("div");
    stage.style.cssText = "position:fixed;left:-100000px;top:0;width:1080px;z-index:-1;pointer-events:none";
    stage.innerHTML = cardHTML(d, i);
    const card = stage.querySelector(".card");
    card.setAttribute("data-bg", bg);
    card.setAttribute("data-ratio", state.ratio);
    card.setAttribute("data-vignette", state.vignette);
    card.classList.toggle("on-ink", !!LIGHT[bg]);
    card.classList.add("lay-"+state.layout);
    card.style.position = "relative";
    card.style.transform = "none";
    card.style.height = H + "px";
    applyPhotoTreatment(card, bg);
    document.body.appendChild(stage);
    try {
      await ensureExportFonts();
      const fontEmbedCSS = await getExportFontCSS(card);
      await Promise.all($$("img", card).map(img=>{
        if (img.complete) return Promise.resolve();
        return new Promise(r=>{ img.onload = img.onerror = r; });
      }));
      autofit(card);
      const options = { width:1080, height:H, pixelRatio:1, cacheBust:true };
      if (fontEmbedCSS) options.fontEmbedCSS = fontEmbedCSS;
      return await HTI.toBlob(card, options);
    } finally { stage.remove(); }
  }
  function downloadBlob(blob, name){
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function fileName(d){ return "TCT-"+d.id+"-"+d.theme+"-"+state.ratio+".png"; }

  const exportBtn = $("#exportBtn");
  function setExportLabel(t){ exportBtn.setAttribute("aria-label", t); }
  let exporting = false;
  exportBtn.addEventListener("click", async ()=>{
    if (exporting || !window.htmlToImage || !window.JSZip){
      if (!window.htmlToImage || !window.JSZip){ setExportLabel("Loading…"); setTimeout(()=>setExportLabel("Export PNG"), 1400); }
      return;
    }
    exporting = true; exportBtn.classList.add("on"); closeFocus();
    const visible = $$(".frame").map(f=> parseInt(f.dataset.i,10));
    try {
      const zip = new JSZip();
      for (let k=0; k<visible.length; k++){
        setExportLabel("Rendering "+(k+1)+" / "+visible.length);
        const i = visible[k], d = cards[i];
        const blob = await cardToBlob(d, i);
        if (blob) zip.file(fileName(d), blob);
      }
      setExportLabel("Zipping\u2026");
      const out = await zip.generateAsync({ type:"blob" });
      downloadBlob(out, "time-capsule-tapes-cards.zip");
    } catch(e){ console.warn("export failed", e); }
    setExportLabel("Export PNG"); exportBtn.classList.remove("on"); exporting = false;
  });

  const focusDl = $("#focusDownload");
  focusDl.addEventListener("click", async ()=>{
    if (focusIdx < 0 || !window.htmlToImage) return;
    focusDl.classList.add("busy");
    try { const d = cards[focusIdx]; const blob = await cardToBlob(d, cards.indexOf(d)); if (blob) downloadBlob(blob, fileName(d)); }
    catch(e){ console.warn(e); }
    focusDl.classList.remove("busy");
  });

  function pick(o, keys){ const r={}; keys.forEach(k=>r[k]=o[k]); return r; }

  /* ───────── fonts / resize ───────── */
  let fontsDone = false;
  function afterFonts(cb){
    if (fontsDone) return cb();
    if (document.fonts && document.fonts.ready){
      document.fonts.ready.then(()=>{ fontsDone=true; cb(); });
      setTimeout(()=>{ if(!fontsDone){ fontsDone=true; cb(); } }, 800);
    } else { fontsDone=true; cb(); }
  }
  let rAF;
  window.addEventListener("resize", ()=>{
    cancelAnimationFrame(rAF);
    rAF = requestAnimationFrame(()=>{ scaleAll(); if(focus.classList.contains("open")) renderFocus(); });
  }, { passive:true });

  /* ───────── boot ───────── */
  getData().then(data=>{
    cards = data;
    const liveCount = $("#liveCount");
    if (liveCount) liveCount.textContent = cards.length;
    syncDock();
    render();
  });
})();
