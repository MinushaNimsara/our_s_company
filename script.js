/* ════════════════════════════════════════════════
   QUANTUMEXE Technologies
   GSAP 3 — ScrollTrigger — quickTo — Full Engine
   ════════════════════════════════════════════════ */

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

/* ── helpers ── */
const $ = sel => document.querySelector(sel);
const $$ = sel => gsap.utils.toArray(sel);
const isTouch = () => window.matchMedia('(hover:none) and (pointer:coarse)').matches;

/* ════════════════════════════════════════════════
   BOOT ORDER
   ════════════════════════════════════════════════ */
/* ─── Theme toggle ─── */
(function initThemeToggle() {
  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const isLight = document.documentElement.classList.toggle('light-theme');
      localStorage.setItem('nexusTheme', isLight ? 'light' : 'dark');
    });
  });
})();

window.addEventListener('DOMContentLoaded', () => {
  initCanvas();           // start canvas early (runs independently)
  initCursor();
  initMobileNav();
  initCountdown();
  initNewsletterForm();
  initSmoothScroll();
  initLoader();           // loader calls the rest when done
});

/* ════════════════════════════════════════════════
   1. LOADER  ─ GSAP timeline on close
   ════════════════════════════════════════════════ */
function initLoader() {
  const loader = $('#loader');
  const bar    = $('#loaderBar');
  const pct    = $('#loaderPercent');

  // From Services/About/Team/Blog/Projects → Contact
  if (window.location.hash === '#contact') {
    const loaderText = document.getElementById('loaderText');
    if (loaderText) {
      loaderText.classList.remove('cms-company');
      loaderText.setAttribute('data-text', 'CONTACT US');
      loaderText.innerHTML = 'CONTACT <span class="logo-accent">US</span>';
      document.documentElement.classList.add('loader-contact');
    }
  }

  if (!loader) { afterLoad(); return; }

  document.body.style.overflow = 'hidden';
  let p = 0;

  const tick = setInterval(() => {
    p += Math.random() * 16 + 5;
    if (p >= 100) p = 100;

    gsap.to(bar, { width: p + '%', duration: 0.07, ease: 'none' });
    pct.textContent = Math.floor(p) + '%';

    if (p === 100) {
      clearInterval(tick);

      gsap.timeline()
        .to(pct,    { opacity: 0, duration: 0.3, ease: 'power2.out' })
        .to(loader, {
            yPercent: -100, opacity: 0,
            duration: 0.8, ease: 'power4.inOut',
          }, '+=0.1')
        .call(() => {
          loader.style.display = 'none';
          document.body.style.overflow = '';
          afterLoad();
        });
    }
  }, 60);
}

function afterLoad() {
  initHeader();
  initHero();
  initShootingStar();
  initScrollAnimations();
  initTilt();
  initMagnetic();

  // Contact / section hashes from other pages (index.html#contact)
  settleHashScroll();

  // After all images/resources load, recalculate scroll positions
  // so cards that are already in view don't stay hidden
  window.addEventListener('load', () => {
    ScrollTrigger.refresh(true);
    settleHashScroll();
  });
  // Extra safety: refresh after 1s even if load already fired
  setTimeout(() => {
    ScrollTrigger.refresh(true);
    settleHashScroll();
  }, 1000);
}

/* ════════════════════════════════════════════════
   SHOOTING STAR  ─ fires every 10 s in hero
   ════════════════════════════════════════════════ */
function initShootingStar() {
  const hero = document.querySelector('.hero');
  if (!hero) return;

  // Create the element once and reuse it
  const star = document.createElement('div');
  star.className = 'shooting-star';
  hero.appendChild(star);

  let timeline = null;
  let nextShotAt = performance.now() + 3000;
  const INTERVAL_MS = 10000;

  function shoot() {
    if (document.hidden) return;
    if (timeline) timeline.kill();

    const W = hero.offsetWidth;
    const H = hero.offsetHeight;

    // Random start: somewhere in the upper-right 60% of the hero
    const startX = W * (0.3 + Math.random() * 0.6);
    const startY = H * (0.05 + Math.random() * 0.35);

    // Angle: 25–45° below horizontal, always moving upper-right → lower-left
    const angleDeg = 25 + Math.random() * 20;
    const angleRad = angleDeg * Math.PI / 180;
    const dist     = W * (0.35 + Math.random() * 0.25);
    const dx       = -Math.cos(angleRad) * dist;   // moves left
    const dy       =  Math.sin(angleRad) * dist;   // moves down

    // Random tail length
    const tailLen = 120 + Math.random() * 100;

    gsap.set(star, {
      x:       startX,
      y:       startY,
      width:   tailLen,
      rotate:  -angleDeg,         // tilts the tail upward-right
      opacity: 0,
      scaleX:  0,                 // tail starts collapsed at the head
    });

    timeline = gsap.timeline()
      // 1. tail sweeps in
      .to(star, {
        scaleX:  1,
        opacity: 1,
        duration: 0.12,
        ease: 'power2.out',
      })
      // 2. star flies across while fading out
      .to(star, {
        x:       startX + dx,
        y:       startY + dy,
        opacity: 0,
        duration: 0.7 + Math.random() * 0.3,
        ease: 'power1.in',
      });
  }

  // Schedule from rAF so background tabs don't queue dozens of shots
  function tick() {
    const now = performance.now();
    if (!document.hidden && now >= nextShotAt) {
      shoot();
      nextShotAt = now + INTERVAL_MS;
    }
    requestAnimationFrame(tick);
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      if (timeline) timeline.kill();
      gsap.set(star, { opacity: 0 });
      nextShotAt = performance.now() + INTERVAL_MS;
    }
  });
  requestAnimationFrame(tick);
}

/* ════════════════════════════════════════════════
   2. HEADER  ─ shrink on scroll
   ════════════════════════════════════════════════ */
function initHeader() {
  const header = $('#header');
  if (!header) return;

  ScrollTrigger.create({
    start: 'top -80',
    onEnter:     () => header.classList.add('scrolled'),
    onLeaveBack: () => header.classList.remove('scrolled'),
  });
}

/* ════════════════════════════════════════════════
   3. HERO ENTRANCE  ─ staggered GSAP timeline
   ════════════════════════════════════════════════ */
function initHero() {
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  tl.from('.hero-badge',            { y: 40, opacity: 0, duration: 0.9 })
    .from('.glitch-line',           { y: 100, opacity: 0, skewY: 5, duration: 1.1, stagger: 0.15 }, '-=0.5')
    .from('.hero-sub',              { y: 30, opacity: 0, duration: 0.85 }, '-=0.6')
    .from('.hero-cta .btn',         { y: 30, opacity: 0, duration: 0.75, stagger: 0.13 }, '-=0.55')
    .from('.hero-scroll-indicator', { opacity: 0, duration: 0.6 }, '-=0.3')
    .from('.float-item', {
        scale: 0, opacity: 0, duration: 1.4,
        stagger: 0.2, ease: 'elastic.out(1, 0.5)',
      }, '-=0.9');

  // Continuous float loops per element
  $$('.float-item').forEach((el, i) => {
    gsap.to(el, {
      y:        i % 2 === 0 ? -30 : 25,
      rotation: i % 2 === 0 ? 180 : -180,
      duration: 5 + i * 1.5,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut', delay: i * 0.5,
    });
  });

  // Hero parallax on scroll (desktop only — clips CTAs on mobile)
  if (!isTouch() && window.innerWidth > 768) {
    gsap.to('.hero-content', {
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1.5,
      },
      y: 150, opacity: 0.1, ease: 'none',
    });

    gsap.to('.hero-canvas', {
      scrollTrigger: {
        trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 2.5,
      },
      y: 80, ease: 'none',
    });
  }
}

/* ════════════════════════════════════════════════
   4. SCROLL ANIMATIONS  ─ every section
   ════════════════════════════════════════════════ */
function initScrollAnimations() {

  const st = (trigger) => ({
    trigger, start: 'top bottom', toggleActions: 'play none none none', once: true,
  });

  /* Section headers — tag → title → desc cascade */
  $$('.section-head').forEach(head => {
    const tl = gsap.timeline({ scrollTrigger: st(head) });
    if (head.querySelector('.s-tag'))
      tl.fromTo(head.querySelector('.s-tag'),
        { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' });
    if (head.querySelector('.s-title'))
      tl.fromTo(head.querySelector('.s-title'),
        { y: 55, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, '-=0.3');
    if (head.querySelector('.s-desc'))
      tl.fromTo(head.querySelector('.s-desc'),
        { y: 25, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }, '-=0.45');
  });

  /* Generic reveals */
  $$('.reveal-up').forEach(el => {
    gsap.fromTo(el,
      { y: 70, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1,
        delay: (parseInt(el.dataset.delay) || 0) / 1000,
        ease: 'power3.out',
        scrollTrigger: st(el),
      }
    );
  });

  $$('.reveal-fade').forEach(el => {
    gsap.fromTo(el,
      { y: 30, opacity: 0 },
      {
        y: 0, opacity: 1, duration: 1,
        delay: (parseInt(el.dataset.delay) || 0) / 1000,
        ease: 'power3.out',
        scrollTrigger: st(el),
      }
    );
  });

  /* ── Shared ScrollTrigger config for cards ── */
  // 'bottom bottom' = fires even when element is already above fold
  function cardST(trigger, extra = {}) {
    return {
      trigger,
      start: 'top bottom',   // fires as soon as top edge enters viewport bottom
      end:   'bottom top',
      toggleActions: 'play none none none',
      once: true,            // never re-run (prevents re-hide on back-scroll)
      ...extra,
    };
  }

  /* Service / project cards — pop up + scale */
  $$('.game-card').forEach((card, i) => {
    gsap.fromTo(card,
      { y: 80, opacity: 0, scale: 0.95 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 1.1, delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: cardST(card),
      }
    );
  });

  /* Team cards */
  $$('.team-card').forEach((card, i) => {
    gsap.fromTo(card,
      { y: 60, opacity: 0, scale: 0.94 },
      {
        y: 0, opacity: 1, scale: 1,
        duration: 0.95, delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: cardST(card),
      }
    );
  });

  /* News cards */
  $$('.news-card').forEach((card, i) => {
    gsap.fromTo(card,
      { y: 50, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.9, delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: cardST(card),
      }
    );
  });

  /* About features — slide in from left */
  $$('.ab-feat').forEach((feat, i) => {
    gsap.fromTo(feat,
      { x: -60, opacity: 0 },
      {
        x: 0, opacity: 1,
        duration: 0.8, delay: i * 0.12,
        ease: 'power3.out',
        scrollTrigger: cardST(feat),
      }
    );
  });

  /* Channel items — slide in from right */
  $$('.channel-item').forEach((item, i) => {
    gsap.fromTo(item,
      { x: 60, opacity: 0 },
      {
        x: 0, opacity: 1,
        duration: 0.75, delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: cardST(item),
      }
    );
  });

  /* Footer columns */
  $$('.footer-links').forEach((col, i) => {
    gsap.fromTo(col,
      { y: 35, opacity: 0 },
      {
        y: 0, opacity: 1,
        duration: 0.7, delay: i * 0.1,
        ease: 'power3.out',
        scrollTrigger: cardST('.footer'),
      }
    );
  });

  /* Marquee strip */
  gsap.fromTo('.marquee-track',
    { opacity: 0 },
    {
      opacity: 1, duration: 1, ease: 'power2.out',
      scrollTrigger: cardST('.marquee-wrap'),
    }
  );

  /* Countdown bg parallax */
  gsap.to('.countdown-bg-img img', {
    scrollTrigger: {
      trigger: '.countdown-section',
      start: 'top bottom', end: 'bottom top',
      scrub: true,
    },
    y: -100, ease: 'none',
  });

  /* About image parallax */
  gsap.to('.about-img-wrap img', {
    scrollTrigger: {
      trigger: '.about-section',
      start: 'top bottom', end: 'bottom top',
      scrub: 1.5,
    },
    y: -50, ease: 'none',
  });

  /* ── GSAP Stat Counters (scroll-triggered) ── */
  $$('.stat-n[data-target]').forEach(el => {
    const target = parseInt(el.getAttribute('data-target'));
    const obj    = { val: 0 };
    el.textContent = '0';

    gsap.to(obj, {
      val: target,
      duration: 2.5,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate()  { el.textContent = Math.floor(obj.val); },
      onComplete() { el.textContent = target; },
    });
  });
}

/* ════════════════════════════════════════════════
   5. CUSTOM CURSOR  ─ GSAP quickTo
   ════════════════════════════════════════════════ */
function initCursor() {
  const cursor = $('#cursor');
  if (!cursor || isTouch()) {
    if (cursor) cursor.style.display = 'none';
    document.body.style.cursor = 'auto';
    return;
  }

  const inner = cursor.querySelector('.cursor-inner');
  const outer = cursor.querySelector('.cursor-outer');

  gsap.set([inner, outer], { xPercent: -50, yPercent: -50 });

  const ix = gsap.quickTo(inner, 'x', { duration: 0.04 });
  const iy = gsap.quickTo(inner, 'y', { duration: 0.04 });
  const ox = gsap.quickTo(outer, 'x', { duration: 0.5, ease: 'power3.out' });
  const oy = gsap.quickTo(outer, 'y', { duration: 0.5, ease: 'power3.out' });

  window.addEventListener('mousemove', e => {
    ix(e.clientX); iy(e.clientY);
    ox(e.clientX); oy(e.clientY);
  });

  // Hover effects
  $$('a, button, .magnetic, .game-card, .team-card, .news-card, .channel-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      gsap.to(outer, { scale: 1.9, opacity: 0.2, duration: 0.35, ease: 'power2.out' });
      gsap.to(inner, { scale: 1.7, duration: 0.25, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(outer, { scale: 1, opacity: 0.6, duration: 0.35, ease: 'power2.out' });
      gsap.to(inner, { scale: 1, duration: 0.25, ease: 'power2.out' });
    });
  });

  document.addEventListener('mousedown', () =>
    gsap.to(inner, { scale: 0.4, duration: 0.1 }));
  document.addEventListener('mouseup', () =>
    gsap.to(inner, { scale: 1, duration: 0.25, ease: 'back.out(3)' }));
}

/* ════════════════════════════════════════════════
   6. MOBILE NAV  ─ GSAP stagger on open/close
   ════════════════════════════════════════════════ */
function initMobileNav() {
  const hamburger = $('#hamburger');
  const nav       = $('#nav');
  const navClose  = $('#navClose');
  if (!hamburger || !nav) return;

  // Keep a marker of original parent so desktop layout stays intact if needed
  const originalParent = nav.parentElement;
  const originalNext   = nav.nextElementSibling;

  function ensureNavLayer() {
    // Move nav to <body> on small screens so position:fixed covers the viewport
    // (header backdrop-filter otherwise traps fixed descendants)
    if (window.innerWidth <= 768) {
      if (nav.parentElement !== document.body) document.body.appendChild(nav);
    } else if (originalParent && nav.parentElement !== originalParent) {
      if (originalNext && originalNext.parentElement === originalParent) {
        originalParent.insertBefore(nav, originalNext);
      } else {
        originalParent.appendChild(nav);
      }
    }
  }
  ensureNavLayer();
  window.addEventListener('resize', ensureNavLayer);

  function unlockScroll() {
    document.body.style.overflow = '';
    document.body.classList.remove('nav-open');
  }

  function openNav() {
    ensureNavLayer();
    gsap.killTweensOf('.nav-list .nav-link');
    gsap.killTweensOf('.nav-list');
    nav.classList.add('open');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';
    document.body.classList.add('nav-open');

    gsap.timeline()
      .from('.nav-list', { opacity: 0, duration: 0.3 })
      .from('.nav-list .nav-link', {
          x: 60, opacity: 0, duration: 0.55,
          stagger: 0.08, ease: 'power3.out',
        }, '-=0.15');
  }

  function closeNav(immediate) {
    const finish = () => {
      nav.classList.remove('open');
      hamburger.classList.remove('active');
      unlockScroll();
      gsap.set('.nav-list .nav-link', { clearProps: 'all' });
      gsap.set('.nav-list', { clearProps: 'all' });
    };

    gsap.killTweensOf('.nav-list .nav-link');
    gsap.killTweensOf('.nav-list');

    // Always unlock scroll immediately so hash scrolls are not blocked
    unlockScroll();

    if (immediate || !nav.classList.contains('open')) {
      finish();
      return;
    }

    gsap.to('.nav-list .nav-link', {
      x: 40, opacity: 0, duration: 0.25,
      stagger: 0.04, ease: 'power2.in',
      onComplete: finish,
    });
  }

  // Expose for smooth-scroll / hash navigation
  window.__closeMobileNav = closeNav;

  hamburger.addEventListener('click', () =>
    nav.classList.contains('open') ? closeNav(true) : openNav());
  navClose?.addEventListener('click', () => closeNav(true));

  // Hash / in-page links: close instantly then let smooth-scroll handle movement.
  // External page links: close instantly before navigation.
  $$('#nav .nav-link').forEach(l => {
    l.addEventListener('click', () => {
      closeNav(true);
    });
  });
}

/* ════════════════════════════════════════════════
   7. 3D TILT CARDS  ─ GSAP quickTo
   ════════════════════════════════════════════════ */
function initTilt() {
  if (isTouch()) return;

  $$('.tilt-card').forEach(card => {
    gsap.set(card, { transformPerspective: 900 });

    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.55, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.55, ease: 'power3.out' });
    const rz = gsap.quickTo(card, 'z',         { duration: 0.4,  ease: 'power3.out' });

    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      ry(dx * 9);
      rx(dy * -9);
      rz(12);
    });

    card.addEventListener('mouseleave', () => { rx(0); ry(0); rz(0); });
  });
}

/* ════════════════════════════════════════════════
   8. MAGNETIC BUTTONS  ─ GSAP quickTo
   ════════════════════════════════════════════════ */
function initMagnetic() {
  if (isTouch()) return;

  $$('.magnetic').forEach(btn => {
    const bx = gsap.quickTo(btn, 'x', { duration: 0.5, ease: 'power3.out' });
    const by = gsap.quickTo(btn, 'y', { duration: 0.5, ease: 'power3.out' });

    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      bx((e.clientX - r.left - r.width  / 2) * 0.38);
      by((e.clientY - r.top  - r.height / 2) * 0.38);
    });

    btn.addEventListener('mouseleave', () => { bx(0); by(0); });
  });
}

/* ════════════════════════════════════════════════
   9. COUNTDOWN  ─ GSAP flip on digit change
   ════════════════════════════════════════════════ */
function initCountdown() {
  const launch = new Date();
  launch.setDate(launch.getDate() + 42);

  const els = {
    d: $('#days'),
    h: $('#hours'),
    m: $('#minutes'),
    s: $('#seconds'),
  };
  if (!els.d) return;

  function flip(el, val) {
    const v = String(val).padStart(2, '0');
    if (el.textContent === v) return;
    gsap.fromTo(el,
      { y: -20, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
    );
    el.textContent = v;
  }

  function tick() {
    const diff = launch - Date.now();
    if (diff <= 0) return;
    flip(els.d, Math.floor(diff / 86400000));
    flip(els.h, Math.floor((diff % 86400000) / 3600000));
    flip(els.m, Math.floor((diff % 3600000)  / 60000));
    flip(els.s, Math.floor((diff % 60000)    / 1000));
  }

  tick();
  setInterval(tick, 1000);
}

/* ════════════════════════════════════════════════
   10. SMOOTH SCROLL  ─ GSAP ScrollToPlugin + hash
   ════════════════════════════════════════════════ */
function getHeaderOffset() {
  const header = document.getElementById('header');
  return ((header && header.offsetHeight) || 80) + 16;
}

function scrollToTarget(target, instant) {
  if (!target) return;
  const y = Math.max(0, target.getBoundingClientRect().top + window.pageYOffset - getHeaderOffset());

  // Ensure mobile nav lock is not blocking the scroll
  document.body.style.overflow = '';
  document.body.classList.remove('nav-open');

  if (instant || typeof gsap === 'undefined') {
    window.scrollTo(0, y);
    return;
  }

  gsap.to(window, {
    scrollTo: { y, autoKill: true },
    duration: 0.9,
    ease: 'power3.inOut',
    overwrite: true,
  });
}

function scrollToHash(opts) {
  const options = Object.assign({ instant: false, retries: 0 }, opts || {});
  const hash = window.location.hash;
  if (!hash || hash === '#') return false;
  const target = document.querySelector(hash);
  if (!target) {
    if (options.retries > 0) {
      setTimeout(() => scrollToHash({
        instant: options.instant,
        retries: options.retries - 1,
      }), 120);
    }
    return false;
  }
  scrollToTarget(target, options.instant);
  return true;
}

function initSmoothScroll() {
  // Avoid the browser's early jump to #contact before layout/CMS settle
  if (window.location.hash && window.location.hash !== '#') {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();

      // Close mobile menu immediately and unlock body scroll
      if (typeof window.__closeMobileNav === 'function') {
        window.__closeMobileNav(true);
      } else {
        const nav = document.getElementById('nav');
        const hamburger = document.getElementById('hamburger');
        if (nav) nav.classList.remove('open');
        if (hamburger) hamburger.classList.remove('active');
        document.body.style.overflow = '';
        document.body.classList.remove('nav-open');
      }

      if (history.pushState) history.pushState(null, '', href);
      else window.location.hash = href;

      // Wait a frame so layout unlocks after the overlay closes, then scroll
      requestAnimationFrame(() => {
        scrollToTarget(target, false);
        // Retry once — iOS sometimes ignores the first scroll while the menu paints away
        setTimeout(() => scrollToTarget(target, true), 80);
      });
    });
  });

  window.addEventListener('cms:ready', () => {
    if (window.location.hash) scrollToHash({ instant: true, retries: 8 });
  });
}

function settleHashScroll() {
  if (!window.location.hash || window.location.hash === '#') return;
  scrollToHash({ instant: true, retries: 10 });
  setTimeout(() => scrollToHash({ instant: true }), 250);
  setTimeout(() => scrollToHash({ instant: false }), 700);
  setTimeout(() => scrollToHash({ instant: true }), 1200);
}

/* ════════════════════════════════════════════════
   11. CONTACT FORM  ─ Formspree submit + validation
   ════════════════════════════════════════════════ */
function initNewsletterForm() {
  const form = $('#nlForm');
  if (!form) return;

  const note = $('#contactFormNote');
  const status = $('#contactFormStatus');
  const btn = form.querySelector('.contact-submit, .btn');
  const btnText = btn && btn.querySelector('.btn-text');
  const service = $('#contact-service');
  const otherWrap = $('#contactOtherWrap');
  const otherInput = $('#contact-other');
  const endpoint = form.getAttribute('action') || 'https://formspree.io/f/mykrgewv';
  const defaultNote = 'We respond within 24 hours. No commitment required.';
  let busy = false;

  const fields = {
    fullName: $('#contact-name'),
    email: $('#contact-email'),
    phone: $('#contact-phone'),
    company: $('#contact-company'),
    service,
    otherService: otherInput,
    message: $('#contact-message'),
  };

  function setOtherVisible(show) {
    if (!otherWrap || !otherInput) return;
    if (show) {
      otherWrap.hidden = false;
      requestAnimationFrame(() => otherWrap.classList.add('is-open'));
      otherInput.required = true;
    } else {
      otherWrap.classList.remove('is-open');
      otherInput.required = false;
      otherInput.value = '';
      clearFieldError(otherInput);
      setTimeout(() => {
        if (!otherWrap.classList.contains('is-open')) otherWrap.hidden = true;
      }, 300);
    }
  }

  function clearFieldError(el) {
    if (!el) return;
    const field = el.closest('.contact-field');
    if (field) field.classList.remove('is-invalid');
    el.removeAttribute('aria-invalid');
    const err = field && field.querySelector('.field-error');
    if (err) err.textContent = '';
  }

  function setFieldError(el, message) {
    if (!el) return;
    const field = el.closest('.contact-field');
    if (field) field.classList.add('is-invalid');
    el.setAttribute('aria-invalid', 'true');
    const err = field && field.querySelector('.field-error');
    if (err) err.textContent = message;
  }

  function clearAllErrors() {
    form.querySelectorAll('.contact-field').forEach(f => f.classList.remove('is-invalid'));
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.field-error').forEach(el => { el.textContent = ''; });
  }

  function showStatus(type, message) {
    if (!status) return;
    status.hidden = false;
    status.className = 'contact-form-status ' + (type === 'success' ? 'is-success' : 'is-error');
    status.textContent = message;
  }

  function hideStatus() {
    if (!status) return;
    status.hidden = true;
    status.textContent = '';
    status.className = 'contact-form-status';
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function validate() {
    clearAllErrors();
    let firstInvalid = null;

    const name = (fields.fullName.value || '').trim();
    const email = (fields.email.value || '').trim();
    const serviceVal = (fields.service.value || '').trim();
    const message = (fields.message.value || '').trim();
    const otherVal = (fields.otherService.value || '').trim();

    if (!name) {
      setFieldError(fields.fullName, 'Please enter your full name.');
      firstInvalid = firstInvalid || fields.fullName;
    }

    if (!email) {
      setFieldError(fields.email, 'Please enter your email address.');
      firstInvalid = firstInvalid || fields.email;
    } else if (!isValidEmail(email)) {
      setFieldError(fields.email, 'Please enter a valid email address.');
      firstInvalid = firstInvalid || fields.email;
    }

    if (!serviceVal) {
      setFieldError(fields.service, 'Please select a service.');
      firstInvalid = firstInvalid || fields.service;
    }

    if (serviceVal === 'Other' && !otherVal) {
      setFieldError(fields.otherService, 'Please specify the service you need.');
      firstInvalid = firstInvalid || fields.otherService;
    }

    if (!message) {
      setFieldError(fields.message, 'Please tell us about your project.');
      firstInvalid = firstInvalid || fields.message;
    }

    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  if (service) {
    service.addEventListener('change', () => {
      clearFieldError(service);
      setOtherVisible(service.value === 'Other');
    });
  }

  Object.values(fields).forEach(el => {
    if (!el) return;
    el.addEventListener('input', () => clearFieldError(el));
    el.addEventListener('change', () => clearFieldError(el));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy || !btn || !btnText) return;
    hideStatus();

    if (!validate()) return;

    // Trim values before submit
    ['fullName', 'email', 'phone', 'company', 'otherService', 'message'].forEach(key => {
      const el = fields[key];
      if (el && typeof el.value === 'string') el.value = el.value.trim();
    });

    busy = true;
    const orig = btnText.textContent;
    btn.disabled = true;
    btn.classList.add('is-loading');
    btnText.textContent = 'Sending…';
    if (note) note.textContent = 'Sending your message…';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });

      if (!res.ok) throw new Error('Formspree error');

      form.reset();
      setOtherVisible(false);
      clearAllErrors();
      btnText.textContent = '✓ Sent!';
      if (note) note.textContent = '';
      showStatus('success', 'Thanks — we received your message and will reply within 24 hours.');

      setTimeout(() => {
        btnText.textContent = orig;
        btn.disabled = false;
        btn.classList.remove('is-loading');
        busy = false;
        if (note) note.textContent = defaultNote;
      }, 4500);
    } catch (err) {
      btnText.textContent = 'Try again';
      btn.disabled = false;
      btn.classList.remove('is-loading');
      busy = false;
      if (note) note.textContent = defaultNote;
      showStatus('error', 'Something went wrong. Please try again in a moment.');
      setTimeout(() => { btnText.textContent = orig; }, 4000);
    }
  });
}

function initCanvas() {
  if (typeof initAllSpaceFx === 'function') {
    initAllSpaceFx();
    return;
  }
  const canvas = $('#heroCanvas');
  if (canvas && typeof initSpaceFx === 'function') {
    initSpaceFx(canvas);
  }
}
