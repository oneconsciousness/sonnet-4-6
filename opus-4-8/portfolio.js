(function() {
  // PUBLISHED-MODE CONTRACT (see the matching CSS block by the same title):
  // a published copy carries data-hope-mode="published" on <html>; the local
  // generated file never does. Every EDITING affordance below checks this
  // flag; visitor FEATURES (theme toggle, Share, Save-as-PDF, section
  // navigation, card expansion) deliberately do not.
  var isPublished = document.documentElement.dataset.hopeMode === 'published';
  const STORAGE_KEY = 'hope-portfolio-theme';
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (e) {}
  }
  let savedTheme = 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') savedTheme = stored;
  } catch (e) {}
  applyTheme(savedTheme);
  document.getElementById('theme-toggle').addEventListener('click', () => {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });
  // Share — #share-btn opens the #share-menu popover.
  // Items: Copy link · LinkedIn · X · WhatsApp · Email. Canonical URL: the
  // <meta name="hope:share-url"> content, which the publish skill rewrites to
  // the live GitHub Pages URL. Empty (un-published) → window.location.href.
  var shareBtn = document.getElementById('share-btn');
  var shareMenu = document.getElementById('share-menu');
  var shareLabel = shareBtn ? shareBtn.querySelector('span') : null;
  if (shareLabel) shareLabel.dataset.idle = shareLabel.textContent;
  var flash = function (text, ok) {
    if (shareLabel) shareLabel.textContent = text;
    if (ok) shareBtn.classList.add('copied');
    setTimeout(function () {
      if (shareLabel) shareLabel.textContent = shareLabel.dataset.idle;
      shareBtn.classList.remove('copied');
    }, 1600);
  };
  var getCanonicalUrl = function () {
    var meta = document.querySelector('meta[name="hope:share-url"]');
    return meta && meta.content ? meta.content.trim() : '';
  };
  var getShareUrl = function () { return getCanonicalUrl() || window.location.href; };
  // A share only works when it points at a public URL. Before publishing, the
  // page is opened from disk (file://) or a local preview server (localhost) and
  // the canonical meta is still empty — sharing that gives a dead/empty card on
  // LinkedIn / X / WhatsApp / email. Every share target gates on this.
  var canShare = function () {
    if (getCanonicalUrl()) return true; // publish stamped a real URL
    var u = window.location.href;
    if (u.indexOf('file:') === 0) return false;
    return !/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:|\/|$)/i.test(u);
  };
  var getName = function () {
    var el = document.querySelector('h1.name');
    return el ? el.textContent.trim() : '';
  };
  var getShareText = function () {
    var el = document.querySelector('.headline');
    var headline = el ? el.textContent.trim() : '';
    return headline ? getName() + ' — ' + headline : getName();
  };
  var copyFallback = function (url) {
    // Non-secure context (file://, http) — navigator.clipboard is undefined there.
    // document.execCommand('copy') is deprecated but the only path that works.
    try {
      var ta = document.createElement('textarea');
      ta.value = url; ta.setAttribute('readonly', '');
      ta.style.position = 'absolute'; ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select(); ta.setSelectionRange(0, url.length);
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      flash(ok ? 'Copied!' : 'Copy: ' + url, ok);
    } catch (e) { flash('Copy: ' + url, false); }
  };
  var copyShareUrl = function () {
    var canonical = getCanonicalUrl();
    var url = canonical || window.location.href;
    // No published link yet (opened from disk or a local preview server) →
    // don't leak the local path; tell them to publish first.
    if (!canShare()) { flash('Publish first to share a link', false); return; }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(
        function () { flash('Copied!', true); },
        function () { copyFallback(url); }
      );
      return;
    }
    copyFallback(url);
  };
  var closeShareMenu = function () {
    if (shareMenu && !shareMenu.hidden) {
      shareMenu.hidden = true;
      if (shareBtn) shareBtn.setAttribute('aria-expanded', 'false');
    }
  };
  if (shareBtn && shareMenu) {
    shareBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      if (shareMenu.hidden) {
        shareMenu.hidden = false;
        shareBtn.setAttribute('aria-expanded', 'true');
      } else {
        closeShareMenu();
      }
    });
    shareMenu.addEventListener('click', function (e) {
      var item = e.target.closest('[data-share]');
      if (!item) return;
      var action = item.getAttribute('data-share');
      closeShareMenu();
      if (action === 'copy') { copyShareUrl(); return; }
      // Same guard as copy: never open a social share pointing at a local/preview URL.
      if (!canShare()) { flash('Publish first to share a link', false); return; }
      var url = getShareUrl();
      var text = getShareText();
      var href = '';
      if (action === 'linkedin') {
        href = 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url);
      } else if (action === 'x') {
        href = 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(text);
      } else if (action === 'whatsapp') {
        href = 'https://wa.me/?text=' + encodeURIComponent(text + ' ' + url);
      } else if (action === 'email') {
        // %0D%0A%0D%0A = RFC 6068 blank line between the text and the link.
        href = 'mailto:?subject=' + encodeURIComponent(getName() + ' — Portfolio') +
               '&body=' + encodeURIComponent(text) + '%0D%0A%0D%0A' + encodeURIComponent(url);
      }
      if (href) window.open(href, '_blank', 'noopener');
    });
    document.addEventListener('click', function (e) {
      if (!shareMenu.hidden && !e.target.closest('.share-wrap')) closeShareMenu();
    });
  }
  // Save as PDF — #pdf-btn opens the #export-modal chooser. THIS RELEASE the
  // export is RESUME-ONLY: the dialog picks style + font + fit, "Save as PDF"
  // sets body.print-doc-resume + .print-style-<style>, applies the chosen
  // family via --resume-font on #resume-view, optionally runs floor-aware
  // auto-fit (--rfs), closes the modal and calls window.print(); 'afterprint'
  // tears it all down (classes, --rfs, --resume-font, width pin). The last
  // choice persists in localStorage ('hope-resume-pref') and is preselected
  // next time. The default no-class browser print (Cmd+P) still prints the
  // paginated classic portfolio — the browser's native path, untouched.
  var pdfBtn = document.getElementById('pdf-btn');
  var exportModal = document.getElementById('export-modal');
  var resumeView = document.getElementById('resume-view');

  // ── READABILITY FLOOR — recruiters reject smaller. Hard constraints:
  // body text never below 10pt; line-height never below 1.2 (encoded in the
  // resume style blocks — auto-fit never touches leading); page margins never
  // below 0.5in (the @page rule already sits at the floor).
  var RESUME_MIN_BODY_PT = 10;
  var RESUME_MIN_LEADING = 1.2;
  // Per-style base body size in pt. Auto-fit's floor scale is
  // RESUME_MIN_BODY_PT / base: classic → 0.909, modern → 0.952,
  // compact → 1.0 (compact never shrinks — it already sits at the floor).
  var RESUME_BASE_PT = { classic: 11, modern: 10.5, compact: 10 };

  var RESUME_PREF_KEY = 'hope-resume-pref';
  var RESUME_STYLES = ['classic', 'modern', 'compact'];
  var RESUME_FONTS = ['georgia', 'times', 'inter'];
  var RESUME_FITS = ['comfortable', 'auto'];
  // ATS-safe system families only — no decorative faces, no icon fonts.
  var RESUME_FONT_STACKS = {
    georgia: "Georgia, 'Times New Roman', serif",
    times: "'Times New Roman', Times, serif",
    inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  };
  var RESUME_DEFAULT_FONT = { classic: 'georgia', modern: 'inter', compact: 'inter' };
  // {style, font, fit} — validated field-by-field; anything unexpected falls
  // back to the defaults (font's default depends on the resolved style).
  var readResumePref = function () {
    var pref = { style: 'classic', font: '', fit: 'comfortable' };
    try {
      var raw = localStorage.getItem(RESUME_PREF_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && RESUME_STYLES.indexOf(p.style) !== -1) pref.style = p.style;
        if (p && RESUME_FONTS.indexOf(p.font) !== -1) pref.font = p.font;
        if (p && RESUME_FITS.indexOf(p.fit) !== -1) pref.fit = p.fit;
      }
    } catch (e) {}
    if (!pref.font) pref.font = RESUME_DEFAULT_FONT[pref.style] || 'georgia';
    return pref;
  };

  /* PORTFOLIO PDF — gated for the next release; re-enable by restoring the
     Document fieldset. Everything from here through enableContinuousPrint is
     the portfolio print engine's plumbing: kept intact, but no UI path
     reaches it this release. hope-export-pref (the old combined pref) is
     still read harmlessly by readExportPref; the resume dialog persists to
     hope-resume-pref instead. */
  var EXPORT_PREF_KEY = 'hope-export-pref';
  var EXPORT_STYLES = { portfolio: ['classic', 'ink', 'showcase'], resume: ['classic', 'modern', 'compact'] };
  var EXPORT_LAYOUTS = ['continuous', 'paginated'];
  var readExportPref = function () {
    var pref = { doc: 'portfolio', style: 'classic', layout: 'continuous' };
    try {
      var raw = localStorage.getItem(EXPORT_PREF_KEY);
      if (raw) {
        var p = JSON.parse(raw);
        if (p && EXPORT_STYLES[p.doc]) {
          pref.doc = p.doc;
          if (EXPORT_STYLES[p.doc].indexOf(p.style) !== -1) pref.style = p.style;
          if (EXPORT_LAYOUTS.indexOf(p.layout) !== -1) pref.layout = p.layout;
        }
      }
    } catch (e) {}
    return pref;
  };
  // Continuous single-page export. The @page rule cannot be selector-scoped,
  // so it is injected as the LAST style in <head> (wins the @page cascade over
  // the base Letter rule) sized to the measured document height. The height is
  // measured ON SCREEN under body.print-continuous — its rules live outside
  // @media print so the measured layout IS the printed layout — at the exact
  // print width (816px = 8.5in @ 96dpi; px only: exact 0.75 px→pt). +1px
  // absorbs fractional rounding; the 19200px cap (200in) is Acrobat's MediaBox
  // ceiling — past it Chrome flows the remainder onto N continuous pages.
  // enable() is idempotent: it clears stale state first, so a killed print
  // dialog (afterprint never fired) can't leak into the next export.
  var CONT_PAGE_W_PX = 816;
  var CONT_MAX_H_PX = 19200;
  var disableContinuousPrint = function () {
    document.body.classList.remove('print-continuous');
    document.body.style.width = '';
    var stale = document.getElementById('continuous-page');
    if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
  };
  var enableContinuousPrint = function () {
    disableContinuousPrint();
    // The 816px body pin below does NOT un-match the ≥1440px viewport media
    // query (MQs read the viewport, not body width) — the rails CSS is gated
    // off via body:not(.print-continuous), but the relocated summary NODE
    // must also be back in the identity card before the height is measured.
    // unmountRails is a hoisted function declaration (rails block below).
    unmountRails();
    document.body.classList.add('print-continuous');
    document.body.style.width = CONT_PAGE_W_PX + 'px'; // measure at print width
    void document.body.offsetHeight;                   // force reflow before measuring
    var h = Math.ceil(document.documentElement.scrollHeight) + 1;
    if (h > CONT_MAX_H_PX) h = CONT_MAX_H_PX;
    var pageStyle = document.createElement('style');
    pageStyle.id = 'continuous-page';
    pageStyle.textContent = '@page { size: ' + CONT_PAGE_W_PX + 'px ' + h + 'px; margin: 0; }';
    document.head.appendChild(pageStyle);
  };
  /* end PORTFOLIO PDF gate */

  // ── Resume auto-fit ──
  // Paginated Letter geometry at 96dpi: page = 816×1056px; @page margin is
  // 0.5in (vertical) / 0.55in (horizontal) → printable content 710.4×960px.
  var RESUME_PAGE_CONTENT_W_PX = 816 - 2 * (0.55 * 96); // 710.4
  var RESUME_PAGE_CONTENT_H_PX = 1056 - 2 * (0.5 * 96); // 960
  var RESUME_RFS_STEP = 0.02;
  var measureResumePages = function () {
    void resumeView.offsetHeight; // force reflow before measuring
    return Math.max(1, Math.ceil(resumeView.scrollHeight / RESUME_PAGE_CONTENT_H_PX));
  };
  // Step --rfs down 0.02 per iteration, re-measuring, until either the
  // estimated page count drops (target: one page less than start, or a
  // single page) or the chosen style's floor scale is hit. Compact's floor
  // scale is 1.0 — it never shrinks. If the floor is hit before fitting,
  // print anyway at the floor — that's correct behavior, never go smaller.
  var runResumeAutoFit = function (style) {
    var basePt = RESUME_BASE_PT[style] || RESUME_BASE_PT.classic;
    var floorScale = RESUME_MIN_BODY_PT / basePt;
    document.body.style.width = RESUME_PAGE_CONTENT_W_PX + 'px'; // pin measurement to print width
    resumeView.style.setProperty('--rfs', '1');
    var startPages = measureResumePages();
    if (startPages <= 1) return; // already a single page — nothing to tighten
    var targetPages = Math.max(1, startPages - 1);
    var scale = 1;
    while (scale > floorScale) {
      scale = Math.max(floorScale, +(scale - RESUME_RFS_STEP).toFixed(4));
      resumeView.style.setProperty('--rfs', String(scale));
      if (measureResumePages() <= targetPages) return; // page-count drop — stop
    }
    // Floor reached without fitting: keep the floor scale and print.
  };
  var checkedValue = function (name) {
    var el = exportModal ? exportModal.querySelector('input[name="' + name + '"]:checked') : null;
    return el ? el.value : '';
  };
  var syncExportUI = function () {
    exportModal.querySelectorAll('.export-opt').forEach(function (opt) {
      var input = opt.querySelector('input');
      opt.classList.toggle('selected', !!(input && input.checked));
    });
  };
  var closeExportModal = function () { if (exportModal) exportModal.hidden = true; };
  if (pdfBtn && exportModal && resumeView) {
    pdfBtn.addEventListener('click', function () {
      var pref = readResumePref();
      var styleRadio = exportModal.querySelector('input[name="export-style-resume"][value="' + pref.style + '"]');
      if (styleRadio) styleRadio.checked = true;
      var fontRadio = exportModal.querySelector('input[name="export-font-resume"][value="' + pref.font + '"]');
      if (fontRadio) fontRadio.checked = true;
      var fitRadio = exportModal.querySelector('input[name="export-fit-resume"][value="' + pref.fit + '"]');
      if (fitRadio) fitRadio.checked = true;
      syncExportUI();
      exportModal.hidden = false;
    });
    exportModal.addEventListener('change', function (e) {
      // Style drives the Font default: switching style pre-selects that
      // style's default family (the user can still override it after).
      if (e.target && e.target.name === 'export-style-resume') {
        var def = RESUME_DEFAULT_FONT[e.target.value] || 'georgia';
        var defRadio = exportModal.querySelector('input[name="export-font-resume"][value="' + def + '"]');
        if (defRadio) defRadio.checked = true;
      }
      syncExportUI();
    });
    exportModal.addEventListener('click', function (e) {
      if (e.target.closest('[data-export-close]')) closeExportModal();
    });
    document.getElementById('export-confirm').addEventListener('click', function () {
      var style = checkedValue('export-style-resume') || 'classic';
      var font = checkedValue('export-font-resume') || RESUME_DEFAULT_FONT[style] || 'georgia';
      var fit = checkedValue('export-fit-resume') || 'comfortable';
      try { localStorage.setItem(RESUME_PREF_KEY, JSON.stringify({ style: style, font: font, fit: fit })); } catch (e) {}
      document.body.classList.add('print-doc-resume', 'print-style-' + style);
      resumeView.style.setProperty('--resume-font', RESUME_FONT_STACKS[font] || RESUME_FONT_STACKS.georgia);
      closeExportModal();
      if (fit === 'auto') runResumeAutoFit(style);
      window.print();
    });
    window.addEventListener('afterprint', function () {
      var stale = [];
      document.body.classList.forEach(function (c) {
        if (c.indexOf('print-doc-') === 0 || c.indexOf('print-style-') === 0) stale.push(c);
      });
      stale.forEach(function (c) { document.body.classList.remove(c); });
      // Resume teardown: auto-fit scale, font override, measurement width pin.
      resumeView.style.removeProperty('--rfs');
      resumeView.style.removeProperty('--resume-font');
      document.body.style.width = '';
      disableContinuousPrint(); // gated portfolio engine — keep its state clean too
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (exportModal && !exportModal.hidden) closeExportModal();
    closeShareMenu();
  });
  // Default-open app: Overview when its pane shipped (show_summary kept),
  // else the markup's static Experience fallback stands. This script runs
  // synchronously before first paint, so there's no active-tab flash.
  var overviewPane = document.getElementById('pane-overview');
  if (overviewPane) {
    document.querySelectorAll('.section-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-section') === 'overview');
    });
    document.querySelectorAll('.section-pane').forEach(function (p) {
      p.classList.toggle('active', p === overviewPane);
    });
  }
  document.querySelectorAll('.section-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-section');
      document.querySelectorAll('.section-btn').forEach(b => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.section-pane').forEach(p => p.classList.toggle('active', p.getAttribute('data-pane') === target));
    });
  });
  document.querySelectorAll('.item-card[data-expand] .item-head').forEach(head => {
    head.addEventListener('click', (e) => {
      if (e.target.closest('a, button')) return;
      head.closest('.item-card').classList.toggle('expanded');
    });
  });

  // ── THE SPOTLIGHT — show-before-you-ask (#spotlight=<key> hash directive) ──
  // AUTHORING NOTE — Hope's SKILLS use this to POINT while asking: when a
  // question is about something visual, the skill hands the user this page's
  // URL with #spotlight=<key> appended (file://, localhost, or the published
  // link — a location hash needs no server), says in plain words what will be
  // glowing, THEN asks. Visitors who never use the hash never see any of
  // this. Registry keys → targets:
  //   timeline → #throughline · highlights → #pane-overview (tile activated
  //   first) · share → #share-btn · pdf → #pdf-btn · photo → the photo box ·
  //   summary → the summary paragraph · experience / skills / education /
  //   certifications / projects → that pane (tile activated first).
  // Plays on load AND on hashchange: scroll into view (smooth; auto under
  // prefers-reduced-motion), then ~3 soft pulses over ~3s via .hope-spotlight
  // (token glow — beside the tl-flash block in portfolio.css). Cleanup is
  // total: the class is removed when the run ends and the hash is cleared via
  // history.replaceState — no URL pollution, no history entry, and nothing
  // for print to see (interactive-only, the class lives ~3s).
  (function () {
    var SPOTLIGHT = {
      timeline: { sel: '#throughline' },
      highlights: { sel: '#pane-overview', pane: 'overview' },
      share: { sel: '#share-btn' },
      pdf: { sel: '#pdf-btn' },
      photo: { sel: '#photo-upload' },
      summary: { sel: '.summary' },
      experience: { sel: '.section-pane[data-pane="experience"]', pane: 'experience' },
      skills: { sel: '.section-pane[data-pane="skills"]', pane: 'skills' },
      education: { sel: '.section-pane[data-pane="education"]', pane: 'education' },
      certifications: { sel: '.section-pane[data-pane="certifications"]', pane: 'certifications' },
      projects: { sel: '.section-pane[data-pane="projects"]', pane: 'projects' },
      social: { sel: '.section-pane[data-pane="social"]', pane: 'social' }
    };
    var spotEl = null;
    var spotCleanup = null;
    var spotTimer = 0;
    function clearSpotlightHash() {
      // replaceState, not location.hash = '' — no history entry, no stray '#'.
      try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
    }
    function playSpotlight() {
      var m = /^#spotlight=([a-z]+)$/.exec(window.location.hash || '');
      var entry = m && SPOTLIGHT.hasOwnProperty(m[1]) ? SPOTLIGHT[m[1]] : null;
      if (!entry) return; // not a spotlight hash — plain anchors (#pane-overview) stay untouched
      var el = document.querySelector(entry.sel);
      if (!el) { clearSpotlightHash(); return; } // feature not in this build (e.g. show_summary stripped)
      if (entry.pane) {
        // Activate the tile via the EXISTING section-grid code path — the
        // button's own click handler owns the tab + pane class state, the
        // same doctrine as the throughline's click-navigate.
        var paneBtn = document.querySelector('.section-btn[data-section="' + entry.pane + '"]');
        if (paneBtn) paneBtn.click();
      }
      if (el.getClientRects().length === 0) { clearSpotlightHash(); return; } // hidden (e.g. empty throughline) — directive is inert
      var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
      if (spotTimer) { clearTimeout(spotTimer); spotTimer = 0; }
      if (spotCleanup) { spotCleanup(); spotCleanup = null; }
      if (spotEl && spotEl !== el) spotEl.classList.remove('hope-spotlight');
      el.classList.remove('hope-spotlight');
      void el.offsetWidth; // restart the pulse on a repeated directive
      el.classList.add('hope-spotlight');
      spotEl = el;
      // Pulse until the user actually ENGAGES — the whole point is being
      // seen, and a fixed 3s could finish before they even look. First
      // pointer move / click / wheel / touch / key counts as "they're
      // looking": then exactly TWO more full flashes and stop. The smooth
      // scrollIntoView above fires no pointer/wheel events, so it can't
      // self-trigger. 60s hard cap so an untouched tab never pulses forever.
      var engaged = false, flashesLeft = 2;
      var ENGAGE_EVENTS = ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown'];
      function spotTeardown() {
        el.removeEventListener('animationiteration', onIter);
        ENGAGE_EVENTS.forEach(function (t) { window.removeEventListener(t, onEngage, true); });
      }
      function spotDone() {
        el.classList.remove('hope-spotlight');
        if (spotTimer) { clearTimeout(spotTimer); spotTimer = 0; }
        spotTeardown(); spotCleanup = null; spotEl = null;
      }
      function onIter() { if (engaged && --flashesLeft <= 0) spotDone(); }
      function onEngage() { engaged = true; ENGAGE_EVENTS.forEach(function (t) { window.removeEventListener(t, onEngage, true); }); }
      spotCleanup = spotTeardown;
      el.addEventListener('animationiteration', onIter);
      ENGAGE_EVENTS.forEach(function (t) { window.addEventListener(t, onEngage, true); });
      spotTimer = setTimeout(spotDone, 60000);
      clearSpotlightHash();
    }
    // One tick deferred: the throughline strip is built LATER in this same
    // synchronous pass (its IIFE below un-hides #throughline), so targets are
    // resolved only after the outer IIFE has finished.
    window.setTimeout(playSpotlight, 0);
    window.addEventListener('hashchange', playSpotlight);
  })();

  // ── WIDE-SCREEN RAILS (≥1440px) — minimal JS relocation, one node, no clones ──
  // AUTHORING NOTE — approach: the summary lives INSIDE .identity-card, whose
  // overflow:hidden + border/background chrome make a pure-CSS escape
  // impossible without dissolving the card (display:contents — the reverted
  // v0.8.0 mistake). So: minimal JS relocation on a matchMedia listener. At
  // ≥1440px the summary <p> (the ORIGINAL node — never cloned) moves into a
  // .summary-rail <aside> appended to .wrap; below the breakpoint the summary
  // moves back to its original slot — it is .identity-info's LAST child, so a
  // plain appendChild restores the exact generated markup — and the aside is
  // removed from the DOM entirely, leaving the narrow document identical to
  // what the generator wrote. The section-grid is NEVER moved: it is already
  // a direct .wrap child, so the rails grid in portfolio.css re-columns it in
  // place — its click wiring, the Overview default-open promotion above, and
  // the {{#show_summary}}-stripped 5-tile variant all work untouched.
  // This block runs synchronously here (classic script, end of body) — same
  // before-first-paint doctrine as the Overview promotion above, so there is
  // no relocation flash at load. The MQ 'change' listener covers resize in
  // BOTH directions. Print stays single-column with the summary in-card:
  // beforeprint moves it home (afterprint re-syncs), and the continuous
  // engine calls unmountRails() before measuring — the 816px body pin does
  // NOT un-match a viewport media query, so the DOM must be restored
  // explicitly there (the CSS side is gated with body:not(...) classes).
  var railsMql = window.matchMedia ? window.matchMedia('(min-width: 1440px)') : null;
  // When there's the width for a rail, the WHOLE identity (photo + the full
  // .identity-info — name, headline, LIVE pill, stats, contact, summary) rides
  // into the left rail, photo on top. Only the timeline (#throughline) stays in
  // the centre card, where it picks up a "Career Timeline" header. nextSibling
  // captures the exact in-card slot for an exact restore.
  var railInfo = document.querySelector('.identity-card > .identity-row > .identity-info');
  var railInfoHome = railInfo ? railInfo.parentNode : null; // .identity-row
  var railInfoNext = railInfo ? railInfo.nextSibling : null;
  var railPhoto = document.getElementById('photo-upload');
  var railPhotoHome = railPhoto ? railPhoto.parentNode : null; // .identity-row
  var railPhotoNext = railPhoto ? railPhoto.nextSibling : null; // restore exact slot
  var railAside = null;
  function mountEyebrows() {
    // "Career Timeline" header above the standalone strip. CSS :has() gates it to
    // a visible strip, so empty/absent timeline data shows no orphan header.
    var strip = document.querySelector('.identity-card > .tl-strip');
    if (!strip) return;
    var prev = strip.previousElementSibling;
    if (prev && prev.classList.contains('tl-rail-eyebrow')) return;
    var eb = document.createElement('div');
    eb.className = 'tl-rail-eyebrow';
    eb.setAttribute('aria-hidden', 'true');
    eb.textContent = 'Career Timeline';
    strip.parentNode.insertBefore(eb, strip);
  }
  function unmountEyebrows() {
    var eb = document.querySelector('.tl-rail-eyebrow');
    if (eb && eb.parentNode) eb.parentNode.removeChild(eb);
  }
  function mountRails() {
    if (!railInfo || !railInfoHome) return; // no identity in this build — grid-only rails via CSS
    if (!railAside) {
      railAside = document.createElement('aside');
      railAside.className = 'summary-rail';
      railAside.setAttribute('aria-label', 'Profile');
    }
    if (!railAside.parentNode) {
      var wrap = document.querySelector('.wrap');
      if (wrap) wrap.appendChild(railAside);
    }
    if (railPhoto && railPhoto.parentNode !== railAside) railAside.appendChild(railPhoto); // photo on top
    if (railInfo.parentNode !== railAside) railAside.appendChild(railInfo);
    mountEyebrows();
  }
  function unmountRails() {
    // Restore each node to its exact pre-rail slot in .identity-row.
    if (railInfo && railInfoHome && railInfo.parentNode !== railInfoHome) railInfoHome.insertBefore(railInfo, railInfoNext);
    if (railPhoto && railPhotoHome && railPhoto.parentNode !== railPhotoHome) railPhotoHome.insertBefore(railPhoto, railPhotoNext);
    unmountEyebrows();
    if (railAside && railAside.parentNode) railAside.parentNode.removeChild(railAside);
  }
  function syncRails() {
    if (railsMql && railsMql.matches) mountRails(); else unmountRails();
  }
  syncRails(); // before first paint
  if (railsMql) {
    if (railsMql.addEventListener) railsMql.addEventListener('change', syncRails);
    else if (railsMql.addListener) railsMql.addListener(syncRails);
  }
  window.addEventListener('beforeprint', unmountRails); // every print mode is single-column; identity prints in-card
  window.addEventListener('afterprint', syncRails);
  const PHOTO_KEY = 'hope_headshot_data_url';
  const photoInput = document.getElementById('photo-input');
  const photoPreview = document.getElementById('photo-preview');
  const photoUpload = document.getElementById('photo-upload');
  const photoRemove = document.getElementById('photo-remove');
  // A photo baked into the file at generation time arrives as the img's src +
  // the .has-photo class already on the label. Remember it so "remove" reverts
  // to it instead of wiping the published photo. A localStorage upload (the
  // "change your photo" fallback) overrides it in this browser only.
  const bakedPhoto = (photoPreview && photoPreview.getAttribute('src')) || '';
  function setPhoto(dataUrl) {
    if (dataUrl) { photoPreview.src = dataUrl; photoUpload.classList.add('has-photo'); }
    else { photoPreview.removeAttribute('src'); photoUpload.classList.remove('has-photo'); }
  }
  // Normalize the load-time state: drop an empty src="" (no baked photo) so it
  // never fires a spurious request, and honor whatever's correct on first paint.
  if (photoPreview) { if (bakedPhoto) setPhoto(bakedPhoto); else setPhoto(null); }
  // PUBLISHED-MODE CONTRACT: on a published copy the photo is the owner's
  // baked-in one, full stop. The file input is disabled (the CSS gate already
  // makes the box inert) and the photo localStorage is neither read nor
  // written — a visitor's stale local photo must never shadow the owner's
  // baked photo.
  if (photoInput && isPublished) {
    photoInput.disabled = true;
  }
  if (photoInput && !isPublished) {
    photoInput.addEventListener('change', () => {
      const file = photoInput.files && photoInput.files[0];
      if (!file || !file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        setPhoto(ev.target.result);
        try { localStorage.setItem(PHOTO_KEY, ev.target.result); } catch (e) {}
      };
      reader.readAsDataURL(file);
    });
    // A locally-uploaded photo wins over the baked-in one for this viewer.
    try { const stored = localStorage.getItem(PHOTO_KEY); if (stored) setPhoto(stored); } catch (e) {}
  }
  if (photoRemove && !isPublished) {
    photoRemove.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      try { localStorage.removeItem(PHOTO_KEY); } catch (e) {}
      // Revert to the baked-in photo if the file shipped with one; else clear.
      setPhoto(bakedPhoto || null);
    });
  }

  // ── THE THROUGHLINE — chronological strip in the identity card ──
  // ── Social Feed (optional app) ───────────────────────────────────────────
  // Renders window.HOPE_DATA.social into #social-grid as a MASONRY of cards.
  // Each post becomes ONE of two templates, chosen by what the URL is:
  //   • EMBED card   — a live embed when the URL is an embeddable post/video
  //   • PROFILE card — a designed, brand-coloured tile when it's a profile,
  //                    channel, or site (or when an embed can't be resolved)
  // There are NO bland link cards — a profile card IS the designed result when
  // there's nothing to embed. Embeds need an http origin + a connection; the
  // embed card also carries a quiet "View on …" link for the offline case.
  // (The one app that loads third-party embed scripts/iframes — Hope is
  // otherwise self-contained; a disclosed trade-off, see skills/portfolio.)
  (function () {
    var grid = document.getElementById('social-grid');             // the full Social pane
    var latestEl = document.getElementById('overview-latest');     // Overview · "Latest from"
    var hlEl = document.getElementById('overview-highlights');      // Overview · "Highlights"
    var posts = (window.HOPE_DATA && Array.isArray(window.HOPE_DATA.social)) ? window.HOPE_DATA.social : [];
    var timeline = (window.HOPE_DATA && Array.isArray(window.HOPE_DATA.timeline)) ? window.HOPE_DATA.timeline : [];
    if (!grid && !latestEl && !hlEl) return;

    function esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
      });
    }
    // Platform registry. cls 'iframe' → src(url) returns an <iframe> URL (or
    // null → link card only); 'script' → block(url) returns the platform's
    // blockquote + names the async script to load once; 'link' → link card only.
    var P = {
      youtube:    { name: 'YouTube',     cls: 'iframe', h: 220, src: function (u) { var m = u.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/); return m ? 'https://www.youtube.com/embed/' + m[1] : null; } },
      vimeo:      { name: 'Vimeo',       cls: 'iframe', h: 220, src: function (u) { var m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/); return m ? 'https://player.vimeo.com/video/' + m[1] : null; } },
      spotify:    { name: 'Spotify',     cls: 'iframe', h: 152, src: function (u) { var m = u.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(track|album|playlist|episode|show|artist)\/(\w+)/); return m ? 'https://open.spotify.com/embed/' + m[1] + '/' + m[2] : null; } },
      soundcloud: { name: 'SoundCloud',  cls: 'iframe', h: 166, src: function (u) { return 'https://w.soundcloud.com/player/?url=' + encodeURIComponent(u) + '&color=%23d97706&visual=false'; } },
      applemusic: { name: 'Apple Music', cls: 'iframe', h: 175, src: function (u) { return u.replace('music.apple.com', 'embed.music.apple.com'); } },
      figma:      { name: 'Figma',       cls: 'iframe', h: 300, src: function (u) { return 'https://www.figma.com/embed?embed_host=hope&url=' + encodeURIComponent(u); } },
      codepen:    { name: 'CodePen',     cls: 'iframe', h: 300, src: function (u) { var m = u.match(/codepen\.io\/([^\/]+)\/(?:pen|details)\/(\w+)/); return m ? 'https://codepen.io/' + m[1] + '/embed/' + m[2] + '?default-tab=result' : null; } },
      loom:       { name: 'Loom',        cls: 'iframe', h: 240, src: function (u) { return u.indexOf('/embed/') > -1 ? u : u.replace('/share/', '/embed/'); } },
      bluesky:    { name: 'Bluesky',     cls: 'iframe', h: 300, src: function (u) { var m = u.match(/bsky\.app\/profile\/([^\/]+)\/post\/(\w+)/); return m ? 'https://embed.bsky.app/embed/' + m[1] + '/app.bsky.feed.post/' + m[2] : null; } },
      linkedin:   { name: 'LinkedIn',    cls: 'iframe', h: 320, src: function (u) { var m = u.match(/(urn:li:(?:share|ugcPost|activity):[\w-]+)/) || u.match(/activity-(\d+)/); return m ? 'https://www.linkedin.com/embed/feed/update/' + (m[1].indexOf('urn:') === 0 ? m[1] : 'urn:li:activity:' + m[1]) : null; } },
      substack:   { name: 'Substack',    cls: 'iframe', h: 320, src: function (u) { return u; } },
      flickr:     { name: 'Flickr',      cls: 'iframe', h: 280, src: function (u) { return u; } },
      tiktok:     { name: 'TikTok',      cls: 'script', script: 'https://www.tiktok.com/embed.js', block: function (u) { var m = u.match(/video\/(\d+)/); return '<blockquote class="tiktok-embed" cite="' + esc(u) + '"' + (m ? ' data-video-id="' + m[1] + '"' : '') + ' style="max-width:325px;min-width:240px"><a href="' + esc(u) + '"></a></blockquote>'; } },
      instagram:  { name: 'Instagram',   cls: 'script', script: '//www.instagram.com/embed.js', global: 'instgrm', process: function () { window.instgrm && window.instgrm.Embeds && window.instgrm.Embeds.process(); }, block: function (u) { return '<blockquote class="instagram-media" data-instgrm-permalink="' + esc(u) + '" data-instgrm-version="14"></blockquote>'; } },
      x:          { name: 'X',           cls: 'script', script: 'https://platform.twitter.com/widgets.js', block: function (u) { return '<blockquote class="twitter-tweet"><a href="' + esc(String(u).replace('//x.com', '//twitter.com')) + '"></a></blockquote>'; } },
      threads:    { name: 'Threads',     cls: 'script', script: 'https://www.threads.net/embed.js', block: function (u) { return '<blockquote class="text-post-media" data-text-post-permalink="' + esc(u) + '"></blockquote>'; } },
      pinterest:  { name: 'Pinterest',   cls: 'script', script: '//assets.pinterest.com/js/pinit.js', block: function (u) { return '<a data-pin-do="embedPin" href="' + esc(u) + '"></a>'; } },
      dribbble:   { name: 'Dribbble',    cls: 'link' },
      behance:    { name: 'Behance',     cls: 'link' },
      medium:     { name: 'Medium',      cls: 'link' },
      gist:       { name: 'GitHub',      cls: 'link' },
      link:       { name: 'Link',        cls: 'link' }
    };

    // Brand identity per platform: chip colour + a white single-path glyph
    // (app-icon style → legible on both themes). No glyph → lettermark fallback.
    var B = {
      youtube:    { c: '#FF0000', i: '<path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>' },
      vimeo:      { c: '#1AB7EA', i: '<path d="M23.9765 6.4168c-.105 2.338-1.739 5.5429-4.894 9.6088-3.2679 4.247-6.0258 6.3699-8.2898 6.3699-1.409 0-2.578-1.294-3.553-3.881l-1.9179-7.1138c-.719-2.584-1.488-3.878-2.312-3.878-.179 0-.806.378-1.881 1.132L0 7.3008c1.185-1.042 2.351-2.084 3.501-3.128C5.08 2.8169 6.266 2.0769 7.055 2.0049c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.5069.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.794 2.265-2.385 1.004-1.589 1.54-2.798 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.493 4.797z"/>' },
      spotify:    { c: '#1DB954' },
      soundcloud: { c: '#FF5500' },
      applemusic: { c: '#FA243C' },
      figma:      { c: '#F24E1E' },
      codepen:    { c: '#0EA5E9' },
      loom:       { c: '#625DF5' },
      bluesky:    { c: '#0085FF' },
      linkedin:   { c: '#0A66C2', i: '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>' },
      substack:   { c: '#FF6719' },
      flickr:     { c: '#0063DC' },
      tiktok:     { c: '#EE1D52' },
      instagram:  { c: '#E1306C', i: '<path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>' },
      x:          { c: '#0F1419', i: '<path d="M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z"/>' },
      threads:    { c: '#000000' },
      pinterest:  { c: '#BD081C' },
      dribbble:   { c: '#EA4C89', i: '<path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>' },
      behance:    { c: '#1769FF', i: '<path d="M16.969 16.927a2.561 2.561 0 0 0 1.901.677 2.501 2.501 0 0 0 1.531-.475c.362-.235.636-.584.779-.99h2.585a5.091 5.091 0 0 1-1.9 2.896 5.292 5.292 0 0 1-3.091.88 5.839 5.839 0 0 1-2.284-.433 4.871 4.871 0 0 1-1.723-1.211 5.657 5.657 0 0 1-1.08-1.874 7.057 7.057 0 0 1-.383-2.393c-.005-.8.129-1.595.396-2.349a5.313 5.313 0 0 1 5.088-3.604 4.87 4.87 0 0 1 2.376.563c.661.362 1.231.87 1.668 1.485a6.2 6.2 0 0 1 .943 2.133c.194.821.263 1.666.205 2.508h-7.699c-.063.79.184 1.574.688 2.187ZM6.947 4.084a8.065 8.065 0 0 1 1.928.198 4.29 4.29 0 0 1 1.49.638c.418.303.748.711.958 1.182.241.579.357 1.203.341 1.83a3.506 3.506 0 0 1-.506 1.961 3.726 3.726 0 0 1-1.503 1.287 3.588 3.588 0 0 1 2.027 1.437c.464.747.697 1.615.67 2.494a4.593 4.593 0 0 1-.423 2.032 3.945 3.945 0 0 1-1.163 1.413 5.114 5.114 0 0 1-1.683.807 7.135 7.135 0 0 1-1.928.259H0V4.084h6.947Zm-.235 12.9c.308.004.616-.029.916-.099a2.18 2.18 0 0 0 .766-.332c.228-.158.411-.371.534-.619.142-.317.208-.663.191-1.009a2.08 2.08 0 0 0-.642-1.715 2.618 2.618 0 0 0-1.696-.505h-3.54v4.279h3.471Zm13.635-5.967a2.13 2.13 0 0 0-1.654-.619 2.336 2.336 0 0 0-1.163.259 2.474 2.474 0 0 0-.738.62 2.359 2.359 0 0 0-.396.792c-.074.239-.12.485-.137.734h4.769a3.239 3.239 0 0 0-.679-1.785l-.002-.001Zm-13.813-.648a2.254 2.254 0 0 0 1.423-.433c.399-.355.607-.88.56-1.413a1.916 1.916 0 0 0-.178-.891 1.298 1.298 0 0 0-.495-.533 1.851 1.851 0 0 0-.711-.274 3.966 3.966 0 0 0-.835-.073H3.241v3.631h3.293v-.014ZM21.62 5.122h-5.976v1.527h5.976V5.122Z"/>' },
      medium:     { c: '#12100E', i: '<path d="M13.54 12a6.8 6.8 0 0 1-6.77 6.82A6.8 6.8 0 0 1 0 12a6.8 6.8 0 0 1 6.77-6.82A6.8 6.8 0 0 1 13.54 12zm7.42 0c0 3.54-1.51 6.42-3.38 6.42-1.87 0-3.39-2.88-3.39-6.42s1.52-6.42 3.39-6.42 3.38 2.88 3.38 6.42zM24 12c0 3.17-.53 5.75-1.19 5.75-.66 0-1.19-2.58-1.19-5.75s.53-5.75 1.19-5.75C23.47 6.25 24 8.83 24 12z"/>' },
      gist:       { c: '#181717', i: '<path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>' },
      link:       { c: '#D97706', i: '<path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/>' }
    };
    function chip(key, name) {
      var b = B[key] || B.link;
      var glyph = b.i ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + b.i + '</svg>'
                      : '<span class="social-letter">' + esc((name || '?').charAt(0)) + '</span>';
      return '<span class="social-chip" style="background:' + b.c + '">' + glyph + '</span>';
    }
    function brandColor(key) { return (B[key] || B.link).c; }
    function handle(url) {
      var u = String(url).replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');
      return u.length > 36 ? u.slice(0, 35) + '…' : u;
    }
    // Script embeds are for a single POST. A profile/channel URL has no post id
    // → it becomes a profile card instead of an empty/foreign embed.
    var POST_RE = {
      tiktok: /\/video\/\d+/, instagram: /\/(p|reel|reels|tv)\//,
      x: /\/status\/\d+/, threads: /\/(post|t)\//, pinterest: /\/pin\//
    };

    var loaded = {};
    function loadScript(src) {
      if (!src || loaded[src]) return;
      loaded[src] = 1;
      var s = document.createElement('script');
      s.async = true; s.src = src;
      document.body.appendChild(s);
    }

    var needsProcess = {};
    function buildSocialCard(post) {
      var key = String(post.platform || 'link').toLowerCase();
      var cfg = P[key] || P.link;
      var url = String(post.url);
      var name = cfg.name;
      // Resolve an embed if the URL is embeddable; otherwise it's a profile card.
      var embed = '';
      if (cfg.cls === 'iframe') {
        var src = null; try { src = cfg.src(url); } catch (e) { src = null; }
        if (src) embed = '<div class="social-embed"><iframe src="' + esc(src) + '" height="' + (cfg.h || 240)
          + '" loading="lazy" frameborder="0" scrolling="no" allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write" allowfullscreen title="' + esc(name) + ' embed"></iframe></div>';
      } else if (cfg.cls === 'script' && (!POST_RE[key] || POST_RE[key].test(url))) {
        try { embed = '<div class="social-embed">' + cfg.block(url) + '</div>'; } catch (e) { embed = ''; }
        loadScript(cfg.script);
        if (cfg.process) needsProcess[key] = cfg;
      }
      var card = document.createElement('article');
      var meta = '<span class="social-meta"><span class="social-plat">' + esc(name) + '</span>'
        + (post.caption ? '<span class="social-cap">' + esc(post.caption) + '</span>' : '');
      if (embed) {
        // EMBED CARD — branded header + the live embed + a quiet view link.
        card.className = 'social-card social-' + key + ' social-cls-embed';
        card.innerHTML = '<div class="social-head">' + chip(key, name) + meta + '</span></div>' + embed
          + '<a class="social-link" href="' + esc(url) + '" target="_blank" rel="noopener">'
          + esc(post.title || ('View on ' + name)) + '<span class="material-symbols-rounded ext">open_in_new</span></a>';
      } else {
        // PROFILE CARD — the whole card is a designed, brand-coloured link tile.
        card.className = 'social-card social-' + key + ' social-cls-profile';
        card.innerHTML = '<a class="social-profile" href="' + esc(url) + '" target="_blank" rel="noopener" style="--brand:' + brandColor(key) + '">'
          + chip(key, name) + meta + '<span class="social-handle">' + esc(handle(url)) + '</span></span>'
          + '<span class="social-go material-symbols-rounded">arrow_outward</span></a>';
      }
      return card;
    }

    // Featured WORK item (from the timeline) → a compact card that jumps to its
    // full entry. type drives the kicker + accent (same palette as the rail).
    var FT_LABEL = { experience: 'Experience', project: 'Project', education: 'Education', certification: 'Certification' };
    var FT_COLOR = { experience: 'var(--app-experience)', project: 'var(--app-projects)', education: 'var(--app-education)', certification: 'var(--app-certifications)' };
    var FT_ICON = { experience: 'work', project: 'rocket_launch', education: 'school', certification: 'verified' };
    function buildFeatureCard(e) {
      var type = String(e.type || 'experience').toLowerCase();
      var sub = [e.org, e.metric].filter(Boolean).map(String).join(' · ');
      var a = document.createElement('a');
      a.className = 'feature-card feature-' + type;
      a.href = '#' + String(e.anchor || ('tl-' + e.id));
      a.setAttribute('data-jump', String(e.anchor || ('tl-' + e.id)));
      a.setAttribute('data-pane', String(e.pane || 'experience'));
      a.style.setProperty('--accent', FT_COLOR[type] || 'var(--accent-slate)');
      a.innerHTML = '<span class="feature-chip">'
        + (e.domain ? '<img src="https://www.google.com/s2/favicons?domain=' + esc(String(e.domain)) + '&sz=64" alt="" loading="lazy" onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'\'">' : '')
        + '<span class="material-symbols-rounded"' + (e.domain ? ' style="display:none"' : '') + '>' + (FT_ICON[type] || 'work') + '</span></span>'
        + '<span class="feature-body"><span class="feature-kicker">' + esc(FT_LABEL[type] || type) + '</span>'
        + '<span class="feature-title">' + esc(e.label || '') + '</span>'
        + (sub ? '<span class="feature-sub">' + esc(sub) + '</span>' : '') + '</span>'
        + '<span class="feature-go material-symbols-rounded">arrow_forward</span>';
      return a;
    }
    var valid = function (p) { return p && typeof p === 'object' && p.url; };

    // FEED — the full Social pane (every post; masonry via .social-grid CSS).
    if (grid) posts.filter(valid).forEach(function (post) { grid.appendChild(buildSocialCard(post)); });

    // A social produces a real EMBED only when its platform resolves one — an
    // iframe src, or a script embed pointed at a single POST (not a profile).
    // Profile / link cards have nothing to embed → they belong in the headline.
    function isEmbeddable(p) {
      if (!valid(p)) return false;
      var k = String(p.platform || 'link').toLowerCase();
      var cfg = P[k];
      if (!cfg) return false;
      if (cfg.cls === 'iframe') { try { return !!cfg.src(String(p.url)); } catch (e) { return false; } }
      if (cfg.cls === 'script') { return !POST_RE[k] || POST_RE[k].test(String(p.url)); }
      return false; // 'link' / unknown
    }
    function platLabel(p) {
      var k = String(p.platform || 'link').toLowerCase();
      return k === 'link' ? 'Website' : ((P[k] || P.link).name);
    }
    var embeddable = posts.filter(isEmbeddable);

    // HEADLINE — every NON-embeddable social (a profile/link card) joins the
    // identity's contact row as an app-name pill (LinkedIn, Dribbble, …) instead
    // of a bland link card in the overview. The pills ride with the contact row
    // into the wide-screen rail.
    (function injectHeadlineLinks() {
      var row = document.querySelector('.contact-row');
      if (!row) return;
      row.querySelectorAll('.social-headline-link').forEach(function (el) { if (el.parentNode) el.parentNode.removeChild(el); });
      posts.filter(function (p) { return valid(p) && !isEmbeddable(p); }).forEach(function (p) {
        var k = String(p.platform || 'link').toLowerCase();
        var b = B[k] || B.link;
        var glyph = b.i ? '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' + b.i + '</svg>'
                        : '<span class="material-symbols-rounded">link</span>';
        var a = document.createElement('a');
        a.className = 'item social-headline-link';
        a.href = String(p.url); a.target = '_blank'; a.rel = 'noopener';
        a.setAttribute('data-platform', k);
        a.innerHTML = glyph + esc(platLabel(p));
        row.appendChild(a);
      });
    })();

    // OVERVIEW · "Latest from" — EMBEDS ONLY (a link card would stretch to the
    // embed's height and leave a dead gap; those go to the headline above). Default
    // = pinned embeds, else the first 2 embeddable.
    var FEATURED_MAX = 2;
    function defaultFeatured() {
      var pinned = embeddable.filter(function (p) { return p.pinned; }).map(function (p) { return String(p.url); });
      return (pinned.length ? pinned : embeddable.map(function (p) { return String(p.url); })).slice(0, FEATURED_MAX);
    }
    function renderLatest(urls) {
      if (!latestEl) return;
      var list = (urls && typeof urls.length === 'number') ? urls : defaultFeatured();
      latestEl.innerHTML = '';
      var n = 0;
      list.slice(0, FEATURED_MAX).forEach(function (u) {
        var post = null;
        embeddable.forEach(function (p) { if (String(p.url) === String(u)) post = p; });
        if (post) { latestEl.appendChild(buildSocialCard(post)); n++; }
      });
      var lw = document.getElementById('ov-latest-wrap');
      if (lw) lw.hidden = !n;
    }
    if (latestEl) {
      renderLatest();
      document.addEventListener('hope:set-featured', function (ev) { renderLatest(ev && ev.detail && ev.detail.urls); });
      try {
        window.HOPE_SOCIAL_PICKER = {
          max: Math.min(FEATURED_MAX, embeddable.length),
          list: embeddable.map(function (p) { return { url: String(p.url), label: platLabel(p), pinned: !!p.pinned }; })
        };
      } catch (e) {}
    }

    // OVERVIEW · "Highlights" — featured work items (timeline) that jump to entry.
    if (hlEl) {
      var feat = timeline.filter(function (e) { return e && e.featured; });
      feat.forEach(function (e) { hlEl.appendChild(buildFeatureCard(e)); });
      var hw = document.getElementById('ov-highlights-wrap');
      if (hw && feat.length) {
        hw.hidden = false;
        hlEl.addEventListener('click', function (ev) {
          var a = ev.target.closest('[data-jump]'); if (!a) return;
          ev.preventDefault();
          var anchor = a.getAttribute('data-jump');
          var btn = document.querySelector('.section-btn[data-section="' + a.getAttribute('data-pane') + '"]');
          if (btn) btn.click();
          var card = document.getElementById(anchor);
          if (card) {
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            card.classList.add('hope-spotlight');
            setTimeout(function () { card.classList.remove('hope-spotlight'); }, 2400);
          }
          try { document.dispatchEvent(new CustomEvent('hope:scrub', { detail: { anchor: anchor } })); } catch (e) {} // two-way: scrub the timeline
        });
        // Sync: light up the Highlight card the timeline playhead is on. A
        // non-featured node keeps the last-lit card, so a "current" always shows.
        document.addEventListener('hope:tlnode', function (ev) {
          var anchor = ev && ev.detail && ev.detail.anchor; if (!anchor) return;
          var match = hlEl.querySelector('[data-jump="' + anchor + '"]');
          if (!match) return;
          var cs = hlEl.querySelectorAll('.feature-card');
          for (var ci = 0; ci < cs.length; ci++) cs[ci].classList.toggle('tl-live', cs[ci] === match);
        });
      }
    }

    // Script-class platforms that need an explicit processor once their script
    // lands and the blockquotes are in the DOM (Instagram). Twitter/TikTok
    // widgets auto-observe new nodes, so they need no nudge.
    Object.keys(needsProcess).forEach(function (k) {
      var cfg = needsProcess[k];
      var t = setInterval(function () { if (window[cfg.global]) { try { cfg.process(); } catch (e) {} clearInterval(t); } }, 400);
      setTimeout(function () { clearInterval(t); }, 8000);
    });
  })();

  // Data: window.HOPE_DATA (data.js — the single authoring source; loaded
  // before this script). Shell: #throughline in index.html; visuals: the
  // tl-* block in portfolio.css. This code BUILDS the rail (track, year
  // ticks, hex nodes, playhead + traveler, tooltip) and DRIVES the play
  // loop: the playhead advances one node per second, looping. Every DOM
  // write (class swaps + the playhead transform) is scheduled through
  // requestAnimationFrame; motion is transform/opacity only. Paused while
  // the strip is hovered or focused, while the tab is hidden
  // (visibilitychange), while the strip is off-viewport
  // (IntersectionObserver), and entirely under prefers-reduced-motion
  // (static rail — .tl-static). Published mode: deliberately NOT gated —
  // the Throughline is a visitor feature, like theme toggle and Share.
  (function () {
    var strip = document.getElementById('throughline');
    var hopeData = window.HOPE_DATA || {};
    var timeline = Array.isArray(hopeData.timeline) ? hopeData.timeline : [];
    var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    function parseYM(s) { // "YYYY-MM" → months since year 0, or null
      var m = /^(\d{4})-(\d{2})$/.exec(String(s || ''));
      if (!m) return null;
      var mo = +m[2];
      if (mo < 1 || mo > 12) return null;
      return +m[1] * 12 + (mo - 1);
    }
    function fmtYM(months) { return MONTHS[months % 12] + ' ' + Math.floor(months / 12); }
    // Validate each entry at the data boundary — generated data is untrusted
    // here. Invalid date_start or missing label → entry skipped, not crashed.
    var TL_TYPES = { experience: 1, education: 1, project: 1, certification: 1 };
    var TL_PANES = { experience: 1, education: 1, projects: 1, certifications: 1 };
    var entries = [];
    timeline.forEach(function (e) {
      if (!e || typeof e !== 'object') return;
      var startM = parseYM(e.date_start);
      if (startM === null || !e.label) return;
      entries.push({
        type: TL_TYPES[e.type] ? String(e.type) : 'experience',
        startM: startM,
        endM: e.date_end ? parseYM(e.date_end) : null,
        label: String(e.label),
        org: e.org ? String(e.org) : '',
        metric: e.metric ? String(e.metric) : '',
        skills: Array.isArray(e.skills) ? e.skills.slice(0, 4) : [],
        pane: TL_PANES[e.pane] ? String(e.pane) : '',
        anchor: e.anchor ? String(e.anchor) : ''
      });
    });
    if (!strip || entries.length === 0) return; // template ships [] — strip stays hidden

    var now = new Date();
    var nowM = now.getFullYear() * 12 + now.getMonth();
    var minM = Infinity, maxM = -Infinity;
    entries.forEach(function (e) {
      if (e.startM < minM) minM = e.startM;
      var end = e.endM === null ? nowM : e.endM;
      if (end > maxM) maxM = end;
      if (e.startM > maxM) maxM = e.startM;
    });
    var span = Math.max(1, maxM - minM);
    entries.forEach(function (e) {
      e.pct = ((e.startM - minM) / span) * 100; // positioned by start date
      e.dateText = fmtYM(e.startM) + ' – ' + (e.endM === null ? 'Present' : fmtYM(e.endM));
    });

    // ── The ridge — the rail's vertical dimension ("mountain peaks"). ──
    // Density at any month = how many entries are active then (ongoing runs
    // to now); smoothed into terrain (two 5-tap passes), normalized min→max
    // so a single-thread career stays FLAT — the ridge degrades to the
    // classic rail — while concurrency rises into peaks. Every career gets
    // its own silhouette. RIDGE_H pairs with the .tl-has-ridge headroom in
    // portfolio.css — change both together.
    var RIDGE_H = 28;
    var SAMPLES = 120;
    var density = [];
    var s, j, k;
    for (s = 0; s <= SAMPLES; s++) {
      var mAt = minM + span * s / SAMPLES;
      var cnt = 0;
      entries.forEach(function (e) {
        var end = e.endM === null ? nowM : Math.max(e.endM, e.startM + 1);
        if (mAt >= e.startM && mAt <= end) cnt++;
      });
      density.push(cnt);
    }
    for (var pass = 0; pass < 2; pass++) {
      var sm = density.slice();
      for (j = 0; j < density.length; j++) {
        var acc = 0, n = 0;
        for (k = -2; k <= 2; k++) { if (density[j + k] !== undefined) { acc += density[j + k]; n++; } }
        sm[j] = acc / n;
      }
      density = sm;
    }
    var dMin = Infinity, dMax = -Infinity;
    density.forEach(function (v) { if (v < dMin) dMin = v; if (v > dMax) dMax = v; });
    var hasRidge = (dMax - dMin) >= 0.25;
    function liftAt(pct) { // px of lift at a 0–100 rail position
      if (!hasRidge) return 0;
      var f = pct / 100 * SAMPLES;
      var i0 = Math.floor(f), i1 = Math.min(SAMPLES, i0 + 1), t = f - i0;
      var v = density[i0] * (1 - t) + density[i1] * t;
      return (v - dMin) / (dMax - dMin) * RIDGE_H;
    }
    entries.forEach(function (e) { e.lift = liftAt(e.pct); });

    var rail = document.createElement('div');
    rail.className = 'tl-rail';
    var track = document.createElement('span');
    track.className = 'tl-track';
    rail.appendChild(track);

    // The ridge area — inline SVG (vector: prints crisp; colors ride the
    // tokens, so dark theme and ink's monochrome override cover it for
    // free). z-index 0 in CSS: under the ticks, nodes, and traveler.
    if (hasRidge) {
      rail.classList.add('tl-has-ridge'); // unlocks the taller label headroom in CSS
      var NS = 'http://www.w3.org/2000/svg';
      var ridge = document.createElementNS(NS, 'svg');
      ridge.setAttribute('class', 'tl-ridge');
      ridge.setAttribute('viewBox', '0 0 ' + SAMPLES + ' ' + (RIDGE_H + 2));
      ridge.setAttribute('preserveAspectRatio', 'none');
      ridge.setAttribute('aria-hidden', 'true');
      var pts = '';
      for (s = 0; s <= SAMPLES; s++) {
        var lift = (density[s] - dMin) / (dMax - dMin) * RIDGE_H;
        pts += (s === 0 ? 'M' : 'L') + s + ' ' + (RIDGE_H + 1 - lift).toFixed(2);
      }
      var fillPath = document.createElementNS(NS, 'path');
      fillPath.setAttribute('class', 'tl-ridge-fill');
      fillPath.setAttribute('d', pts + 'L' + SAMPLES + ' ' + (RIDGE_H + 2) + 'L0 ' + (RIDGE_H + 2) + 'Z');
      var linePath = document.createElementNS(NS, 'path');
      linePath.setAttribute('class', 'tl-ridge-line');
      linePath.setAttribute('d', pts);
      linePath.setAttribute('vector-effect', 'non-scaling-stroke');
      ridge.appendChild(fillPath);
      ridge.appendChild(linePath);
      rail.appendChild(ridge);
    }

    // Year ticks — at most ~7, January-aligned, styled by .tl-tick/-year.
    var firstYear = Math.ceil(minM / 12);
    var lastYear = Math.floor(maxM / 12);
    var stepYears = Math.max(1, Math.ceil((lastYear - firstYear + 1) / 7));
    for (var y = firstYear; y <= lastYear; y += stepYears) {
      var tickM = y * 12;
      if (tickM < minM || tickM > maxM) continue;
      var tickEl = document.createElement('span'); // tickEl, not tick — `var tick` would clobber the hoisted play-engine function tick() below
      tickEl.className = 'tl-tick';
      tickEl.style.left = (((tickM - minM) / span) * 100) + '%';
      var yearEl = document.createElement('span');
      yearEl.className = 'tl-tick-year';
      yearEl.textContent = String(y);
      tickEl.appendChild(yearEl);
      rail.appendChild(tickEl);
    }

    // Nodes — keyboard-accessible buttons. Print tiers: .tl-below (every 2nd
    // node) puts the label under the rail, .tl-far (every 3rd+4th of each
    // quartet) pushes it to an outer row — four label tiers total, so even
    // date-clustered neighbors print without overlap (T8 print block in
    // portfolio.css). On screen only the active label shows; tiers are inert.
    var nodes = [];
    entries.forEach(function (e, i) {
      var node = document.createElement('button');
      node.type = 'button';
      node.className = 'tl-node tl-' + e.type +
        (e.endM === null ? ' tl-ongoing' : '') +
        (i % 2 ? ' tl-below' : '') +
        (i % 4 >= 2 ? ' tl-far' : '');
      node.style.left = e.pct + '%';
      if (e.lift) node.style.top = 'calc(50% - ' + e.lift.toFixed(1) + 'px)'; // riding the ridge
      node.setAttribute('aria-label', e.label + ', ' + e.dateText);
      var hex = document.createElement('span');
      hex.className = 'tl-hex';
      node.appendChild(hex);
      var lab = document.createElement('span');
      lab.className = 'tl-node-label';
      var labText = document.createElement('span');
      labText.className = 'tl-node-text';
      labText.textContent = e.label;
      var labDate = document.createElement('span');
      labDate.className = 'tl-node-date';
      labDate.textContent = e.dateText;
      lab.appendChild(labText);
      lab.appendChild(labDate);
      node.appendChild(lab);
      rail.appendChild(node);
      nodes.push(node);
    });

    // Traveler (T7): "dot" (default) → the soft orange glow dot (pure CSS);
    // a curated slug → its monochrome single-path SVG below (embedded from
    // assets/icons/travelers/ — classic-script law: no fetch, ever);
    // { inline: "<svg…>" } → a generator-inlined custom SVG. Anything else
    // falls back to the dot. No picker UI here — the choice arrives via
    // data.js (window.HOPE_DATA.traveler).
    var TRAVELER_SVGS = {
      'paper-plane': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>',
      'car': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
      'train': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm5.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-7h-5V6h5v4z"/></svg>',
      'sailboat': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M13 3l7 11h-7zM11 6v8H5zM3 16h18l-2.5 4h-13z"/></svg>',
      'bicycle': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5S3.1 13.5 5 13.5s3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>',
      'rocket': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5s4.5 2.04 4.5 10.5c0 2.49-1.04 5.57-1.6 7H9.1c-.56-1.43-1.6-4.51-1.6-7C7.5 4.54 12 2.5 12 2.5zm2 8.5c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2zm-6.31 9.52c-.48-1.23-1.52-4.17-1.67-6.87l-1.13.75c-.56.38-.89 1-.89 1.67V22l3.69-1.48zM20 22v-5.93c0-.67-.33-1.29-.89-1.66l-1.13-.75c-.15 2.69-1.2 5.64-1.67 6.87L20 22z"/></svg>',
      'footprints': '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 2a2.5 4 0 1 0 0 8 2.5 4 0 1 0 0-8zM8 11.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6zM16 8.5a2.5 4 0 1 0 0 8 2.5 4 0 1 0 0-8zM16 18a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 1 0 0-3.6z"/></svg>'
    };
    var playhead = document.createElement('span');
    playhead.className = 'tl-playhead';
    var traveler = document.createElement('span');
    traveler.className = 'tl-traveler';
    var travPref = hopeData.traveler;
    var travSvg = '';
    if (travPref && typeof travPref === 'object' && typeof travPref.inline === 'string' &&
        travPref.inline.lastIndexOf('<svg', 0) === 0) {
      travSvg = travPref.inline;
    } else if (typeof travPref === 'string' && TRAVELER_SVGS.hasOwnProperty(travPref)) {
      travSvg = TRAVELER_SVGS[travPref];
    }
    if (travSvg) { traveler.className += ' tl-svg'; traveler.innerHTML = travSvg; }
    else { traveler.className += ' tl-dot'; }
    playhead.appendChild(traveler);
    rail.appendChild(playhead);
    strip.appendChild(rail);
    strip.hidden = false;

    // Tooltip — appended to <body>, not the strip: the identity card clips
    // (overflow:hidden + the materialize transform makes it the containing
    // block even for position:fixed), so a card-level tooltip could never
    // escape it. Hidden in all print modes by the CSS.
    var tip = document.createElement('div');
    tip.className = 'tl-tooltip';
    tip.setAttribute('role', 'tooltip');
    tip.hidden = true;
    document.body.appendChild(tip);
    function showTip(node, e) {
      tip.innerHTML = '';
      var l = document.createElement('div'); l.className = 'tl-tip-label'; l.textContent = e.label; tip.appendChild(l);
      if (e.org) { var o = document.createElement('div'); o.className = 'tl-tip-org'; o.textContent = e.org; tip.appendChild(o); }
      var d = document.createElement('div'); d.className = 'tl-tip-dates'; d.textContent = e.dateText; tip.appendChild(d);
      if (e.metric) { var m = document.createElement('div'); m.className = 'tl-tip-metric'; m.textContent = e.metric; tip.appendChild(m); }
      if (e.skills.length) {
        var chips = document.createElement('div'); chips.className = 'tl-tip-skills';
        e.skills.forEach(function (s) {
          var chip = document.createElement('span'); chip.className = 'skill-chip'; chip.textContent = String(s); chips.appendChild(chip);
        });
        tip.appendChild(chips);
      }
      tip.hidden = false;
      // Clamp inside the viewport (T5): horizontally pinned to [8, vw-8];
      // above the node by default, flipped below when the top would clip.
      var nr = node.getBoundingClientRect();
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      var vx = nr.left + nr.width / 2 - tw / 2;
      vx = Math.max(8, Math.min(vx, window.innerWidth - tw - 8));
      var vy = nr.top - th - 10;
      if (vy < 8) vy = nr.bottom + 10;
      tip.style.left = (vx + window.scrollX) + 'px';
      tip.style.top = (vy + window.scrollY) + 'px';
    }
    function hideTip() { tip.hidden = true; }

    // Edge-clamp the labels near the rail ends (px-measured, viewport-aware).
    function classifyClamps() {
      var rw = rail.clientWidth;
      if (!rw) return;
      nodes.forEach(function (node, i) {
        var x = rw * entries[i].pct / 100;
        node.classList.toggle('tl-clamp-start', x < 110);
        node.classList.toggle('tl-clamp-end', rw - x < 110);
      });
    }
    classifyClamps();

    // ── Play engine (T4) — advance every 1s; DOM writes ride rAF. ──
    var current = -1;
    var rafId = 0;
    var reducedMq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
    var reduced = !!(reducedMq && reducedMq.matches);
    var hovered = false, focused = false, inView = true;
    function playheadX(i) { return rail.clientWidth * entries[i].pct / 100; }
    function applyStep(i, backward) {
      if (current >= 0 && nodes[current]) nodes[current].classList.remove('tl-active');
      nodes[i].classList.add('tl-active');
      playhead.style.transform = 'translate(' + playheadX(i) + 'px, ' + (-entries[i].lift).toFixed(1) + 'px)'; // transform-only motion — the traveler climbs the ridge
      traveler.classList.toggle('tl-flip', !!backward); // face backward on the loop wrap
      current = i;
      // Sync the Overview Highlights to the playhead — the curated card whose
      // entry the timeline is on lights up (option A: keep curation, add sync).
      try { document.dispatchEvent(new CustomEvent('hope:tlnode', { detail: { anchor: entries[i].anchor } })); } catch (e) {}
    }
    function schedule(i, backward) {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(function () { rafId = 0; applyStep(i, backward); });
    }
    function shouldRun() {
      return !reduced && entries.length > 1 && !hovered && !focused && inView && !document.hidden;
    }
    function tick() {
      if (!shouldRun()) return;
      var next = (current + 1) % entries.length;
      schedule(next, next < current);
    }
    function setStatic(on) { // prefers-reduced-motion branch
      strip.classList.toggle('tl-static', on);
      if (on) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (current >= 0 && nodes[current]) nodes[current].classList.remove('tl-active');
        current = -1;
      } else if (current < 0) {
        schedule(0, false);
      }
    }
    if (reduced) setStatic(true); else schedule(0, false); // park on the first node
    window.setInterval(tick, 1000); // the 1s cadence; tick() no-ops while paused
    // Two-way: a Highlight card (or any UI) can scrub the playhead to its entry.
    document.addEventListener('hope:scrub', function (ev) {
      var anchor = ev && ev.detail && ev.detail.anchor; if (!anchor) return;
      for (var si = 0; si < entries.length; si++) {
        if (entries[si].anchor === anchor) { if (!reduced) schedule(si, si < current); break; }
      }
    });
    if (reducedMq) {
      var onReducedChange = function () { reduced = reducedMq.matches; setStatic(reduced); };
      if (reducedMq.addEventListener) reducedMq.addEventListener('change', onReducedChange);
      else if (reducedMq.addListener) reducedMq.addListener(onReducedChange);
    }
    // Pause sources: hover/focus anywhere on the strip…
    strip.addEventListener('mouseenter', function () { hovered = true; });
    strip.addEventListener('mouseleave', function () { hovered = false; hideTip(); });
    strip.addEventListener('focusin', function () { focused = true; });
    strip.addEventListener('focusout', function (e) {
      if (!strip.contains(e.relatedTarget)) { focused = false; hideTip(); }
    });
    // …a hidden tab (shouldRun also reads document.hidden each tick)…
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    });
    // …and the strip scrolled off-viewport.
    if (typeof IntersectionObserver === 'function') {
      new IntersectionObserver(function (recs) {
        inView = !!(recs[0] && recs[0].isIntersecting);
      }, { threshold: 0.1 }).observe(strip);
    }
    window.addEventListener('resize', function () {
      if (current >= 0) playhead.style.transform = 'translateX(' + playheadX(current) + 'px)';
      classifyClamps();
      hideTip();
    });

    // Hover/focus tooltip + click-navigate (T5/T6).
    nodes.forEach(function (node, i) {
      var e = entries[i];
      node.addEventListener('mouseenter', function () { showTip(node, e); });
      node.addEventListener('mouseleave', hideTip);
      node.addEventListener('focus', function () { showTip(node, e); });
      node.addEventListener('blur', hideTip);
      node.addEventListener('click', function () {
        // Navigate via the EXISTING pane-activation path — the section-grid
        // button's own click handler owns the tab + pane class state.
        if (e.pane) {
          var paneBtn = document.querySelector('.section-btn[data-section="' + e.pane + '"]');
          if (paneBtn) paneBtn.click();
        }
        if (!reduced) schedule(i, i < current); // park the playhead on the chosen entry
        var card = e.anchor ? document.getElementById(e.anchor) : null;
        if (!card) return;
        if (card.hasAttribute('data-expand')) card.classList.add('expanded'); // expand collapsibles
        card.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
        card.classList.remove('tl-flash');
        void card.offsetWidth; // restart the pulse on re-click
        card.classList.add('tl-flash');
        setTimeout(function () { card.classList.remove('tl-flash'); }, 1300);
      });
    });
  })();
})();
