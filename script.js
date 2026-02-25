/* ════════════════════════════════════════════════
   NEXUS Software Solutions
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

  // After all images/resources load, recalculate scroll positions
  // so cards that are already in view don't stay hidden
  window.addEventListener('load', () => {
    ScrollTrigger.refresh(true);
  });
  // Extra safety: refresh after 1s even if load already fired
  setTimeout(() => ScrollTrigger.refresh(true), 1000);
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

  function shoot() {
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

    gsap.timeline()
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

  // First shot 3 s after page load, then every 10 s
  gsap.delayedCall(3, shoot);
  setInterval(shoot, 10000);
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
    .from('.hero-stats',            { y: 25, opacity: 0, duration: 0.75 }, '-=0.45')
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

  // Hero parallax on scroll
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

  function openNav() {
    nav.classList.add('open');
    hamburger.classList.add('active');
    document.body.style.overflow = 'hidden';

    gsap.timeline()
      .from('.nav-list', { opacity: 0, duration: 0.3 })
      .from('.nav-list .nav-link', {
          x: 60, opacity: 0, duration: 0.55,
          stagger: 0.08, ease: 'power3.out',
        }, '-=0.15');
  }

  function closeNav() {
    gsap.to('.nav-list .nav-link', {
      x: 40, opacity: 0, duration: 0.3,
      stagger: 0.05, ease: 'power2.in',
      onComplete() {
        nav.classList.remove('open');
        hamburger.classList.remove('active');
        document.body.style.overflow = '';
        gsap.set('.nav-list .nav-link', { clearProps: 'all' });
      },
    });
  }

  hamburger.addEventListener('click', () =>
    nav.classList.contains('open') ? closeNav() : openNav());
  navClose?.addEventListener('click', closeNav);
  $$('#nav .nav-link').forEach(l => l.addEventListener('click', closeNav));
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
   10. SMOOTH SCROLL  ─ GSAP ScrollToPlugin
   ════════════════════════════════════════════════ */
function initSmoothScroll() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = $(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      gsap.to(window, {
        scrollTo: { y: target, offsetY: 80 },
        duration: 1.1,
        ease: 'power3.inOut',
      });
    });
  });
}

/* ════════════════════════════════════════════════
   11. NEWSLETTER FORM  ─ GSAP button feedback
   ════════════════════════════════════════════════ */
function initNewsletterForm() {
  const form = $('#nlForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const input   = form.querySelector('input');
    const btn     = form.querySelector('.btn');
    const btnText = btn.querySelector('.btn-text');
    const orig    = btnText.textContent;

    gsap.timeline()
      .to(btn, { scale: 0.92, duration: 0.1, ease: 'power2.in' })
      .to(btn, { scale: 1,    duration: 0.35, ease: 'elastic.out(1.5, 0.5)' })
      .call(() => {
        btnText.textContent = '✓ Sent!';
        gsap.to(btn, { backgroundColor: '#1a7a50', duration: 0.3 });
        input.value = '';
        setTimeout(() => {
          btnText.textContent = orig;
          gsap.to(btn, { backgroundColor: '', clearProps: 'backgroundColor', duration: 0.4 });
        }, 3000);
      });
  });
}

/* ════════════════════════════════════════════════
   12. HERO CANVAS PARTICLES  ─ requestAnimationFrame
   ════════════════════════════════════════════════ */
function initCanvas() {
  const canvas = $('#heroCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let W, H, mouse = { x: null, y: null };
  const particles = [];
  const COUNT = window.innerWidth < 768 ? 50 : 110;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  class Particle {
    constructor() { this.init(); }
    init() {
      this.x    = Math.random() * W;
      this.y    = Math.random() * H;
      this.size = Math.random() * 1.8 + 0.4;
      this.vx   = (Math.random() - 0.5) * 0.35;
      this.vy   = (Math.random() - 0.5) * 0.35;
      this.alpha = Math.random() * 0.5 + 0.1;
      this.color = Math.random() > 0.65
        ? '#4f8ef7'
        : Math.random() > 0.5 ? '#7b2dff' : '#ffffff';
    }
    update() {
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130) {
          const f = (130 - dist) / 130;
          this.vx += (dx / dist) * f * 0.55;
          this.vy += (dy / dist) * f * 0.55;
        }
      }
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx;
      this.y += this.vy;
      if (this.x < 0) this.x = W;
      if (this.x > W) this.x = 0;
      if (this.y < 0) this.y = H;
      if (this.y > H) this.y = 0;
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.alpha;
      ctx.fill();
    }
  }

  for (let i = 0; i < COUNT; i++) particles.push(new Particle());

  /* ── Shooting Star ── */
  const shootingStars = [];

  class ShootingStar {
    constructor() {
      // Start from top edge (left 75% of width) or left edge (upper 50%)
      if (Math.random() > 0.35) {
        this.x = Math.random() * W * 0.75;
        this.y = -10;
      } else {
        this.x = -10;
        this.y = Math.random() * H * 0.5;
      }
      const angle  = (22 + Math.random() * 22) * Math.PI / 180; // 22–44°
      const speed  = 13 + Math.random() * 9;
      this.vx      = Math.cos(angle) * speed;
      this.vy      = Math.sin(angle) * speed;
      this.tailLen = 130 + Math.random() * 100;
      this.hw      = 1.8 + Math.random() * 1.4;  // head width
      this.alive   = true;
      this.alpha   = 0;
      this.traveled = 0;
      this.totalDist = Math.hypot(W, H) * 1.15;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.traveled += Math.hypot(this.vx, this.vy);
      const p = this.traveled / this.totalDist;
      // Fade in first 8%, full brightness to 85%, fade out to end
      this.alpha = p < 0.08 ? p / 0.08
                 : p > 0.82 ? Math.max(0, (1 - p) / 0.18)
                 : 1;
      if (this.x > W + 150 || this.y > H + 150) this.alive = false;
    }

    draw() {
      if (!this.alive || this.alpha <= 0) return;
      const len   = Math.hypot(this.vx, this.vy);
      const nx    = this.vx / len;
      const ny    = this.vy / len;
      const tailX = this.x - nx * this.tailLen;
      const tailY = this.y - ny * this.tailLen;

      ctx.save();
      ctx.globalAlpha = 1;

      // Gradient tail
      const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
      grad.addColorStop(0,   `rgba(200,230,255,0)`);
      grad.addColorStop(0.6, `rgba(210,235,255,${this.alpha * 0.35})`);
      grad.addColorStop(1,   `rgba(255,255,255,${this.alpha * 0.95})`);
      ctx.strokeStyle = grad;
      ctx.lineWidth   = this.hw;
      ctx.lineCap     = 'round';
      ctx.shadowColor  = 'rgba(160,210,255,0.8)';
      ctx.shadowBlur   = 6;
      ctx.beginPath();
      ctx.moveTo(tailX, tailY);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();

      // Outer glow at head
      ctx.shadowBlur = 0;
      const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.hw * 7);
      glow.addColorStop(0,   `rgba(180,220,255,${this.alpha * 0.9})`);
      glow.addColorStop(0.4, `rgba(140,190,255,${this.alpha * 0.45})`);
      glow.addColorStop(1,   `rgba(100,170,255,0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.hw * 7, 0, Math.PI * 2);
      ctx.fill();

      // Bright white core
      ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.hw, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  function launchShootingStar() {
    shootingStars.push(new ShootingStar());
  }

  // First appearance after 3 s, then every 30 s
  setTimeout(launchShootingStar, 3000);
  setInterval(launchShootingStar, 30000);

  (function loop() {
    ctx.clearRect(0, 0, W, H);

    // Draw particle connections
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d  = Math.hypot(dx, dy);
        if (d < 115) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = '#4f8ef7';
          ctx.globalAlpha = (1 - d / 115) * 0.13;
          ctx.lineWidth   = 0.5;
          ctx.stroke();
        }
      }
    }

    particles.forEach(p => { p.update(); p.draw(); });

    // Draw shooting stars (on top of particles)
    for (let i = shootingStars.length - 1; i >= 0; i--) {
      shootingStars[i].update();
      shootingStars[i].draw();
      if (!shootingStars[i].alive) shootingStars.splice(i, 1);
    }

    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();
}
