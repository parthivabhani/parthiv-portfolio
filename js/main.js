/* Parthiv Abhani: portfolio interactions. No dependencies. */
(() => {
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ---------- Split headings into masked lines ---------- */
  const splitSources = new Map();
  function splitLines(el) {
    if (!splitSources.has(el)) splitSources.set(el, el.innerHTML);
    el.innerHTML = splitSources.get(el);

    // Turn the heading into a flat list of word tokens (inline elements stay whole).
    const tokens = [];
    el.childNodes.forEach((node) => {
      if (node.nodeType === 3) {
        node.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          tokens.push(/^\s+$/.test(part) ? ' ' : document.createTextNode(part));
        });
      } else {
        tokens.push(node.cloneNode(true));
      }
    });

    el.innerHTML = '';
    const words = [];
    tokens.forEach((t) => {
      if (t === ' ') { el.appendChild(document.createTextNode(' ')); return; }
      const w = document.createElement('span');
      w.style.display = 'inline-block';
      w.appendChild(t);
      el.appendChild(w);
      words.push(w);
    });

    // Group words by their rendered line.
    const lines = [];
    let lastTop = null;
    words.forEach((w) => {
      const top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 4) { lines.push([]); lastTop = top; }
      lines[lines.length - 1].push(w);
    });

    el.innerHTML = '';
    lines.forEach((ws, i) => {
      const line = document.createElement('span');
      line.className = 'line';
      const inner = document.createElement('span');
      inner.style.setProperty('--l', i);
      ws.forEach((w, j) => {
        inner.append(...w.childNodes);
        if (j < ws.length - 1) inner.append(' ');
      });
      line.appendChild(inner);
      el.appendChild(line);
    });
  }
  const splitEls = $$('[data-split]');
  const runSplits = () => splitEls.forEach(splitLines);

  /* ---------- Preloader ---------- */
  function finishLoad() {
    root.classList.add('is-loaded');
    document.body.classList.add('is-loaded');
    observeReveals();
  }
  const loader = $('.loader');
  const countEl = $('[data-loader-count]');
  const bar = $('.loader__bar span');
  let seen = false;
  try { seen = sessionStorage.getItem('seen') === '1'; sessionStorage.setItem('seen', '1'); } catch (e) {}

  const startPage = () => {
    runSplits();
    if (reduced || !loader) { finishLoad(); return; }
    const dur = seen ? 450 : 1300;
    const t0 = performance.now();
    const tick = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = 1 - Math.pow(1 - p, 3);
      const n = Math.round(e * 100);
      countEl.textContent = String(n).padStart(3, '0');
      bar.style.width = n + '%';
      if (p < 1) requestAnimationFrame(tick);
      else setTimeout(finishLoad, 180);
    };
    requestAnimationFrame(tick);
  };
  // Wait for fonts so line-splitting measures the real typeface.
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(startPage);
  setTimeout(() => { if (!root.classList.contains('is-loaded')) { runSplits(); finishLoad(); } }, 4000);

  let resizeT;
  let lastW = innerWidth;
  addEventListener('resize', () => {
    clearTimeout(resizeT);
    resizeT = setTimeout(() => {
      if (innerWidth === lastW) return; // ignore mobile URL-bar height changes
      lastW = innerWidth;
      splitEls.forEach((el) => {
        const wasIn = el.classList.contains('is-in');
        splitLines(el);
        if (wasIn) el.classList.add('is-in');
      });
    }, 200);
  });

  /* ---------- Reveal on scroll ---------- */
  let revealsStarted = false;
  function observeReveals() {
    if (revealsStarted) return;
    revealsStarted = true;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.classList.add('is-in');
        io.unobserve(el);
        $$('[data-count]', el).forEach(countUp);
        $$('[data-scramble]', el).forEach(scramble);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    // Stagger siblings that reveal together.
    $$('.reveal, [data-split]').forEach((el) => {
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains('reveal')) : [];
      const idx = sibs.indexOf(el);
      if (idx > 0 && !el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(idx * 0.08, 0.5) + 's');
      io.observe(el);
    });
  }

  // Letters cycle through random glyphs, then lock in left to right.
  function scramble(el) {
    const final = el.dataset.final || (el.dataset.final = el.textContent);
    if (reduced) { el.textContent = final; return; }
    const glyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const t0 = performance.now();
    const dur = 1100;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const locked = Math.floor(p * final.length);
      let out = final.slice(0, locked);
      for (let i = locked; i < final.length; i++) out += glyphs[(Math.random() * glyphs.length) | 0];
      el.textContent = p < 1 ? out : final;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function countUp(el) {
    const target = parseFloat(el.dataset.count);
    if (reduced) { el.textContent = target; return; }
    const t0 = performance.now();
    const dur = 1400;
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- Clock (Nagpur / IST) ---------- */
  const clock = $('[data-clock]');
  const fmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
  const setClock = () => { if (clock) clock.textContent = fmt.format(new Date()); };
  setClock(); setInterval(setClock, 15000);

  /* ---------- Theme ---------- */
  const themeBtn = $('[data-theme-toggle]');
  themeBtn && themeBtn.addEventListener('click', (ev) => {
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    const apply = () => {
      root.dataset.theme = next;
      $('meta[name="theme-color"]').setAttribute('content', next === 'dark' ? '#0E0E0D' : '#F2F1ED');
      try { localStorage.setItem('theme', next); } catch (e) {}
    };
    if (!document.startViewTransition || reduced) { apply(); return; }
    const r = themeBtn.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    document.startViewTransition(apply).ready.then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
        { duration: 700, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', pseudoElement: '::view-transition-new(root)' }
      );
    });
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menu.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  };
  menuBtn && menuBtn.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('a', menu).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- Nav: scrolled state, hide on scroll down, active link ---------- */
  const nav = $('[data-nav]');
  const progress = $('.progress span');
  let lastY = scrollY;

  const navLinks = $$('[data-link]');
  const sectionIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === '#' + e.target.id));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  ['work', 'about', 'experience', 'recognition', 'contact'].forEach((id) => { const s = document.getElementById(id); s && sectionIO.observe(s); });
  const clearActive = new IntersectionObserver(([e]) => { if (e.isIntersecting) navLinks.forEach((a) => a.classList.remove('is-active')); }, { rootMargin: '-45% 0px -50% 0px' });
  clearActive.observe($('.hero'));

  /* ---------- Stacked project cards ---------- */
  const projects = $$('[data-project]');
  projects.forEach((p) => {
    const shade = document.createElement('div');
    shade.className = 'project__shade';
    $('.project__inner', p).appendChild(shade);
  });
  const stackMQ = matchMedia('(min-width: 901px)');
  let stackNear = false;
  const stackEl = $('[data-stack]');
  if (stackEl) new IntersectionObserver(([e]) => { stackNear = e.isIntersecting; }, { rootMargin: '200px 0px' }).observe(stackEl);

  // Reads happen first and writes after, so the browser never has to re-run layout mid-frame.
  const shades = projects.map((p) => $('.project__shade', p));
  let stackReset = false;
  function readStack() {
    if (!stackMQ.matches || reduced || !stackNear) return null;
    return projects.map((p) => { const r = p.getBoundingClientRect(); return [r.top, p.offsetHeight]; });
  }
  function writeStack(rects) {
    if (!rects) {
      if (!stackReset && (!stackMQ.matches || reduced)) {
        projects.forEach((p, i) => { p.style.transform = ''; shades[i].style.opacity = 0; });
        stackReset = true;
      }
      return;
    }
    stackReset = false;
    for (let i = 0; i < projects.length - 1; i++) {
      const t = 1 - clamp((rects[i + 1][0] - rects[i][0]) / rects[i][1], 0, 1);
      const scale = (1 - t * 0.06).toFixed(4);
      if (projects[i]._s !== scale) {
        projects[i]._s = scale;
        projects[i].style.transform = t > 0 ? `scale(${scale})` : '';
        shades[i].style.opacity = (t * 0.35).toFixed(3);
      }
    }
  }

  /* ---------- Marquee (speeds up with scroll velocity) ---------- */
  const track = $('[data-marquee]');
  let mx = 0, mVel = 0, mDir = 1, mHalf = 0, mVisible = true;
  const measureMarquee = () => { if (track) mHalf = track.scrollWidth / 2; };
  measureMarquee();
  addEventListener('resize', measureMarquee);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(measureMarquee);
  if (track) new IntersectionObserver(([e]) => { mVisible = e.isIntersecting; }, { rootMargin: '100px 0px' }).observe(track.parentElement);

  /* ---------- Main scroll / frame loop ---------- */
  let ticking = false;
  let docMax = 1, navScrolled = null, navHidden = false;
  const measureDoc = () => { docMax = Math.max(1, document.documentElement.scrollHeight - innerHeight); };
  measureDoc();
  new ResizeObserver(measureDoc).observe(document.body);
  addEventListener('resize', measureDoc);

  function onScroll() {
    // read
    const y = scrollY;
    const dy = y - lastY;
    const rects = readStack();
    // write
    const scrolled = y > 20;
    if (scrolled !== navScrolled) { navScrolled = scrolled; nav.classList.toggle('is-scrolled', scrolled); }
    let hide = navHidden;
    if (!document.body.classList.contains('menu-open') && dy > 4 && y > 700) hide = true;
    if (dy < -4 || y <= 700) hide = false;
    if (hide !== navHidden) { navHidden = hide; nav.classList.toggle('is-hidden', hide); }
    progress.style.transform = `scaleX(${(y / docMax).toFixed(4)})`;
    mVel = clamp(mVel + Math.abs(dy) * 0.04, 0, 8);
    if (Math.abs(dy) > 1) mDir = dy > 0 ? 1 : -1;
    lastY = y;
    writeStack(rects);
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  function marqueeLoop() {
    if (track && !reduced && mVisible && mHalf) {
      const half = mHalf;
      mx -= (0.6 + mVel) * mDir;
      mVel *= 0.92;
      if (mx <= -half) mx += half;
      if (mx > 0) mx -= half;
      track.style.transform = `translate3d(${mx}px,0,0)`;
    }
    requestAnimationFrame(marqueeLoop);
  }
  requestAnimationFrame(marqueeLoop);

  /* ---------- Custom cursor ---------- */
  const cursor = $('.cursor');
  const cursorLabel = $('.cursor__label');
  let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
  if (finePointer && cursor) {
    let cursorRunning = false;
    const loop = () => {
      cx = lerp(cx, tx, 0.22); cy = lerp(cy, ty, 0.22);
      cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      if (Math.abs(tx - cx) + Math.abs(ty - cy) > 0.3) requestAnimationFrame(loop);
      else cursorRunning = false;
    };
    addEventListener('mousemove', (e) => {
      tx = e.clientX; ty = e.clientY;
      cursor.classList.add('is-visible');
      if (!cursorRunning) { cursorRunning = true; requestAnimationFrame(loop); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => cursor.classList.remove('is-visible'));
    document.addEventListener('mouseover', (e) => {
      const labelled = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button');
      if (labelled) {
        cursorLabel.textContent = labelled.dataset.cursor;
        cursor.classList.add('has-label'); cursor.classList.remove('is-link');
      } else {
        cursor.classList.remove('has-label');
        cursor.classList.toggle('is-link', !!link);
      }
    });
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${x * 0.22}px, ${y * 0.32}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transition = 'transform .6s cubic-bezier(.22,1,.36,1)';
        el.style.transform = '';
        setTimeout(() => (el.style.transition = ''), 600);
      });
    });

    /* Tilt */
    $$('[data-tilt]').forEach((el) => {
      const base = el.classList.contains('polaroid') ? -3 : 0;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) rotate(${base * 0.3}deg)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- Hover preview for "more work" ---------- */
  const box = $('[data-preview-box]');
  if (box && finePointer) {
    const img = $('img', box);
    let px = 0, py = 0, bx = 0, by = 0, on = false, running = false;
    const loop = () => {
      bx = lerp(bx, px + 190, 0.16); by = lerp(by, py, 0.16);
      box.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
      if (on || Math.abs(px + 190 - bx) > 0.5) requestAnimationFrame(loop);
      else running = false;
    };
    const kick = () => { if (!running) { running = true; requestAnimationFrame(loop); } };
    $$('[data-preview]').forEach((a) => {
      a.addEventListener('mouseenter', (e) => {
        img.src = a.dataset.preview;
        if (!on) { px = e.clientX; py = e.clientY; bx = px + 190; by = py; }
        on = true; box.classList.add('is-on'); kick();
      });
      a.addEventListener('mouseleave', () => { on = false; box.classList.remove('is-on'); });
      a.addEventListener('mousemove', (e) => { px = e.clientX; py = e.clientY; });
    });
  }

  /* ---------- Experience accordion ---------- */
  $$('[data-accordion] .xp__item').forEach((item) => {
    const head = $('.xp__head', item);
    head.addEventListener('click', () => {
      const open = !item.classList.contains('is-open');
      item.classList.toggle('is-open', open);
      head.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Copy email ---------- */
  const toast = $('[data-toast]');
  let toastT;
  const showToast = (msg) => {
    toast.textContent = msg;
    toast.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => toast.classList.remove('is-on'), 2200);
  };
  $$('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const value = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(value);
        showToast('Email copied. Talk soon!');
        const hint = $('.contact__copy', btn);
        if (hint) { hint.textContent = 'Copied ✓'; setTimeout(() => (hint.textContent = 'Click to copy'), 2200); }
      } catch (e) {
        location.href = 'mailto:' + value;
      }
    });
  });
})();
