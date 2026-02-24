/* =====================================================
   NEXUS Software Solutions
   GSAP + ScrollTrigger + Lenis Animation Engine
   ===================================================== */

gsap.registerPlugin(ScrollTrigger);

/* ─── TOUCH DETECTION ─── */
const isTouch = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

/* ─── BOOT ─── */
document.addEventListener('DOMContentLoaded', () => {
  initCursor();
  initHeroCanvas();
  initMobileNav();
  initCountdown();
  initNewsletterForm();
  initLoader(); // loader calls everything else on complete
});

/* ══════════════════════════════════════
   SMOOTH ANCHOR SCROLL (native — no
   Lenis, avoids touchpad double-inertia)
   ══════════════════════════════════════ */
function initLenis() {
  // Native smooth scroll for anchors works on all devices without conflict
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });
  return null;
}

/* ══════════════════════════════════════
   LOADER
   ══════════════════════════════════════ */
function initLoader() {
  const loader   = document.getElementById('loader');
  const bar      = document.getElementById('loaderBar');
  const pct      = document.getElementById('loaderPercent');
  if (!loader) { bootAfterLoad(); return; }

  document.body.style.overflow = 'hidden';
  let p = 0;

  const tick = setInterval(() => {
    p += Math.random() * 18 + 4;
    if (p >= 100) p = 100;
    gsap.to(bar, { width: p + '%', duration: 0.08, ease: 'none' });
    pct.textContent = Math.floor(p) + '%';

    if (p === 100) {
      clearInterval(tick);
      gsap.timeline()
        .to(pct,    { opacity: 0, duration: 0.25 })
        .to(loader, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, '+=0.15')
        .call(() => {
          loader.style.display = 'none';
          document.body.style.overflow = '';
          bootAfterLoad();
        });
    }
  }, 65);
}

function bootAfterLoad() {
  initLenis();          // smooth scroll
  initHeader();         // header scroll state
  initHeroAnimations(); // hero entrance
  initScrollAnimations(); // all scroll-triggered effects
  initTiltCards();
  initMagneticButtons();
}

/* ══════════════════════════════════════
   HEADER
   ══════════════════════════════════════ */
function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  ScrollTrigger.create({
    start: 'top -80',
    onEnter:     () => header.classList.add('scrolled'),
    onLeaveBack: () => header.classList.remove('scrolled'),
  });
}

/* ══════════════════════════════════════
   HERO ENTRANCE (runs once after loader)
   ══════════════════════════════════════ */
function initHeroAnimations() {
  const tl = gsap.timeline({ defaults: { ease: 'power4.out' } });

  tl.from('.hero-badge',   { y: 30, opacity: 0, duration: 0.8 })
    .from('.glitch-line',  { y: 110, opacity: 0, skewY: 4, duration: 1, stagger: 0.15 }, '-=0.4')
    .from('.hero-sub',     { y: 30, opacity: 0, duration: 0.8 }, '-=0.55')
    .from('.hero-cta .btn',{ y: 30, opacity: 0, duration: 0.7, stagger: 0.12 }, '-=0.5')
    .from('.hero-stats',   { y: 20, opacity: 0, duration: 0.7 }, '-=0.4')
    .from('.hero-scroll-indicator', { opacity: 0, duration: 0.6 }, '-=0.3')
    .from('.float-item',   { scale: 0, opacity: 0, duration: 1.2, stagger: 0.2, ease: 'elastic.out(1,0.5)' }, '-=0.8');

  // Continuous float loop per element
  gsap.utils.toArray('.float-item').forEach((el, i) => {
    gsap.to(el, {
      y:        i % 2 === 0 ? -28 : 28,
      rotation: i % 2 === 0 ? 180 : -180,
      duration: 4 + i * 1.5,
      repeat: -1, yoyo: true,
      ease: 'sine.inOut', delay: i * 0.6,
    });
  });
}

/* ══════════════════════════════════════
   ALL SCROLL-TRIGGERED ANIMATIONS
   ══════════════════════════════════════ */
function initScrollAnimations() {

  /* ── Section headers ── */
  gsap.utils.toArray('.section-head').forEach(head => {
    const tag   = head.querySelector('.s-tag');
    const title = head.querySelector('.s-title');
    const desc  = head.querySelector('.s-desc');
    const tl = gsap.timeline({
      scrollTrigger: { trigger: head, start: 'top 86%', toggleActions: 'play none none none' }
    });
    if (tag)   tl.from(tag,   { y: 20, opacity: 0, duration: 0.6, ease: 'power3.out' });
    if (title) tl.from(title, { y: 50, opacity: 0, duration: 0.85, ease: 'power3.out' }, '-=0.3');
    if (desc)  tl.from(desc,  { y: 20, opacity: 0, duration: 0.6,  ease: 'power3.out' }, '-=0.4');
  });

  /* ── Generic .reveal-up ── */
  gsap.utils.toArray('.reveal-up').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
      y: 60, opacity: 0,
      duration: 1,
      delay: (parseInt(el.dataset.delay) || 0) / 1000,
      ease: 'power3.out',
    });
  });

  /* ── Generic .reveal-fade ── */
  gsap.utils.toArray('.reveal-fade').forEach(el => {
    gsap.from(el, {
      scrollTrigger: { trigger: el, start: 'top 88%', toggleActions: 'play none none none' },
      y: 30, opacity: 0,
      duration: 1,
      delay: (parseInt(el.dataset.delay) || 0) / 1000,
      ease: 'power3.out',
    });
  });

  /* ── Service / game cards ── */
  gsap.utils.toArray('.game-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 92%', toggleActions: 'play none none none' },
      y: 80, opacity: 0, scale: 0.96,
      duration: 1, delay: i * 0.12,
      ease: 'power3.out',
    });
  });

  /* ── Team cards ── */
  gsap.utils.toArray('.team-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' },
      y: 60, opacity: 0, scale: 0.94,
      duration: 0.9, delay: i * 0.1,
      ease: 'power3.out',
    });
  });

  /* ── News cards ── */
  gsap.utils.toArray('.news-card').forEach((card, i) => {
    gsap.from(card, {
      scrollTrigger: { trigger: card, start: 'top 90%', toggleActions: 'play none none none' },
      y: 50, opacity: 0,
      duration: 0.9, delay: i * 0.1,
      ease: 'power3.out',
    });
  });

  /* ── About features (slide from left) ── */
  gsap.utils.toArray('.ab-feat').forEach((feat, i) => {
    gsap.from(feat, {
      scrollTrigger: { trigger: feat, start: 'top 90%', toggleActions: 'play none none none' },
      x: -50, opacity: 0,
      duration: 0.75, delay: i * 0.12,
      ease: 'power3.out',
    });
  });

  /* ── Channel items (slide from right) ── */
  gsap.utils.toArray('.channel-item').forEach((item, i) => {
    gsap.from(item, {
      scrollTrigger: { trigger: item, start: 'top 90%', toggleActions: 'play none none none' },
      x: 50, opacity: 0,
      duration: 0.7, delay: i * 0.1,
      ease: 'power3.out',
    });
  });

  /* ── Footer columns ── */
  gsap.utils.toArray('.footer-links').forEach((col, i) => {
    gsap.from(col, {
      scrollTrigger: { trigger: '.footer', start: 'top 90%', toggleActions: 'play none none none' },
      y: 30, opacity: 0,
      duration: 0.7, delay: i * 0.1,
      ease: 'power3.out',
    });
  });

  /* ── Marquee reveal ── */
  gsap.from('.marquee-track', {
    scrollTrigger: { trigger: '.marquee-wrap', start: 'top 90%', toggleActions: 'play none none none' },
    opacity: 0, duration: 0.8, ease: 'power2.out',
  });

  /* ── PARALLAX: hero content drifts up on scroll ── */
  gsap.to('.hero-content', {
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 1.5,
    },
    y: 140, opacity: 0.2, ease: 'none',
  });

  /* ── PARALLAX: hero canvas slower drift ── */
  gsap.to('.hero-canvas', {
    scrollTrigger: {
      trigger: '.hero',
      start: 'top top',
      end: 'bottom top',
      scrub: 2,
    },
    y: 70, ease: 'none',
  });

  /* ── PARALLAX: countdown background ── */
  gsap.to('.countdown-bg-img img', {
    scrollTrigger: {
      trigger: '.countdown-section',
      start: 'top bottom',
      end: 'bottom top',
      scrub: true,
    },
    y: -90, ease: 'none',
  });

  /* ── STAT COUNTERS via GSAP ScrollTrigger ── */
  document.querySelectorAll('.stat-n[data-target]').forEach(el => {
    const target = parseInt(el.getAttribute('data-target'));
    const proxy  = { val: 0 };
    el.textContent = '0';

    gsap.to(proxy, {
      val: target,
      duration: 2.5,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        toggleActions: 'play none none none',
      },
      onUpdate() { el.textContent = Math.floor(proxy.val); },
      onComplete() { el.textContent = target; },
    });
  });
}

/* ══════════════════════════════════════
   CUSTOM CURSOR (GSAP quickTo)
   ══════════════════════════════════════ */
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor || isTouch()) {
    if (cursor) cursor.style.display = 'none';
    document.body.style.cursor = 'auto';
    return;
  }

  const inner = cursor.querySelector('.cursor-inner');
  const outer = cursor.querySelector('.cursor-outer');

  // Use GSAP xPercent/yPercent for centering, x/y for position
  gsap.set([inner, outer], { xPercent: -50, yPercent: -50 });

  // quickTo gives buttery-smooth tracking
  const ix = gsap.quickTo(inner, 'x', { duration: 0.05 });
  const iy = gsap.quickTo(inner, 'y', { duration: 0.05 });
  const ox = gsap.quickTo(outer, 'x', { duration: 0.45, ease: 'power3.out' });
  const oy = gsap.quickTo(outer, 'y', { duration: 0.45, ease: 'power3.out' });

  window.addEventListener('mousemove', e => {
    ix(e.clientX); iy(e.clientY);
    ox(e.clientX); oy(e.clientY);
  });

  // Hover expand
  document.querySelectorAll('a, button, .magnetic, .game-card, .team-card, .news-card, .channel-item').forEach(el => {
    el.addEventListener('mouseenter', () => {
      gsap.to(outer, { scale: 1.8, opacity: 0.25, duration: 0.35 });
      gsap.to(inner, { scale: 1.8, duration: 0.25 });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(outer, { scale: 1, opacity: 0.6, duration: 0.35 });
      gsap.to(inner, { scale: 1, duration: 0.25 });
    });
  });

  // Click squeeze
  document.addEventListener('mousedown', () => gsap.to(inner, { scale: 0.5, duration: 0.1 }));
  document.addEventListener('mouseup',   () => gsap.to(inner, { scale: 1,   duration: 0.2, ease: 'back.out(2)' }));
}

/* ══════════════════════════════════════
   MOBILE NAV (GSAP stagger open)
   ══════════════════════════════════════ */
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('nav');
  const navClose  = document.getElementById('navClose');
  if (!hamburger || !nav) return;

  const toggle = open => {
    if (open) {
      nav.classList.add('open');
      hamburger.classList.add('active');
      document.body.style.overflow = 'hidden';
      gsap.from('.nav-list .nav-link', {
        x: 50, opacity: 0, duration: 0.5,
        stagger: 0.08, ease: 'power3.out', delay: 0.15,
      });
    } else {
      gsap.to('.nav-list .nav-link', {
        x: 30, opacity: 0, duration: 0.3,
        stagger: 0.05, ease: 'power2.in',
        onComplete: () => {
          nav.classList.remove('open');
          hamburger.classList.remove('active');
          document.body.style.overflow = '';
          gsap.set('.nav-list .nav-link', { clearProps: 'all' });
        }
      });
    }
  };

  hamburger.addEventListener('click', () => toggle(!nav.classList.contains('open')));
  navClose?.addEventListener('click', () => toggle(false));
  nav.querySelectorAll('.nav-link').forEach(link => link.addEventListener('click', () => toggle(false)));
}

/* ══════════════════════════════════════
   HERO CANVAS PARTICLES
   ══════════════════════════════════════ */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], mouse = { x: null, y: null };

  function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });

  function Particle() {
    this.reset = () => {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.size = Math.random() * 2 + 0.5;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.opacity = Math.random() * 0.6 + 0.1;
      this.color = Math.random() > 0.7 ? '#4f8ef7' : Math.random() > 0.5 ? '#7b2dff' : '#ffffff';
    };
    this.reset();
    this.update = () => {
      if (mouse.x !== null) {
        const dx = this.x - mouse.x, dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const f = (120 - dist) / 120;
          this.vx += (dx / dist) * f * 0.6;
          this.vy += (dy / dist) * f * 0.6;
        }
      }
      this.vx *= 0.98; this.vy *= 0.98;
      this.x += this.vx; this.y += this.vy;
      if (this.x < 0) this.x = W; if (this.x > W) this.x = 0;
      if (this.y < 0) this.y = H; if (this.y > H) this.y = 0;
    };
    this.draw = () => {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
    };
  }

  for (let i = 0; i < 120; i++) { const p = new Particle(); particles.push(p); }

  (function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    // draw connecting lines
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = '#4f8ef7';
          ctx.globalAlpha = (1 - d / 120) * 0.12;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(loop);
  })();
}

/* ══════════════════════════════════════
   3D TILT CARDS (GSAP quickTo)
   ══════════════════════════════════════ */
function initTiltCards() {
  if (isTouch()) return;
  document.querySelectorAll('.tilt-card').forEach(card => {
    gsap.set(card, { transformPerspective: 1000 });
    const rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3.out' });
    const ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3.out' });
    const rz = gsap.quickTo(card, 'z',         { duration: 0.4, ease: 'power3.out' });

    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      ry(dx *  9);
      rx(dy * -9);
      rz(14);
    });
    card.addEventListener('mouseleave', () => { rx(0); ry(0); rz(0); });
  });
}

/* ══════════════════════════════════════
   MAGNETIC BUTTONS (GSAP quickTo)
   ══════════════════════════════════════ */
function initMagneticButtons() {
  if (isTouch()) return;
  document.querySelectorAll('.magnetic').forEach(btn => {
    const bx = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3.out' });
    const by = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3.out' });

    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      bx((e.clientX - r.left - r.width  / 2) * 0.38);
      by((e.clientY - r.top  - r.height / 2) * 0.38);
    });
    btn.addEventListener('mouseleave', () => { bx(0); by(0); });
  });
}

/* ══════════════════════════════════════
   COUNTDOWN (GSAP flip on digit change)
   ══════════════════════════════════════ */
function initCountdown() {
  const launch = new Date();
  launch.setDate(launch.getDate() + 42);
  const els = {
    d: document.getElementById('days'),
    h: document.getElementById('hours'),
    m: document.getElementById('minutes'),
    s: document.getElementById('seconds'),
  };
  if (!els.d) return;

  function flip(el, val) {
    const padded = String(val).padStart(2, '0');
    if (el.textContent === padded) return;
    gsap.fromTo(el, { y: -22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' });
    el.textContent = padded;
  }

  function update() {
    const diff = launch - new Date();
    if (diff <= 0) return;
    flip(els.d, Math.floor(diff / 86400000));
    flip(els.h, Math.floor((diff % 86400000) / 3600000));
    flip(els.m, Math.floor((diff % 3600000)  / 60000));
    flip(els.s, Math.floor((diff % 60000)    / 1000));
  }
  update();
  setInterval(update, 1000);
}

/* ══════════════════════════════════════
   NEWSLETTER FORM
   ══════════════════════════════════════ */
function initNewsletterForm() {
  const form = document.getElementById('nlForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const input   = form.querySelector('input[type="email"]');
    const btn     = form.querySelector('.btn');
    const btnText = btn.querySelector('.btn-text');
    const orig    = btnText.textContent;

    gsap.timeline()
      .to(btn, { scale: 0.93, duration: 0.1 })
      .to(btn, { scale: 1, duration: 0.2, ease: 'back.out(3)' })
      .call(() => {
        btnText.textContent = '✓ Sent!';
        gsap.to(btn, { backgroundColor: '#1a9e6a', duration: 0.3 });
        input.value = '';
        setTimeout(() => {
          btnText.textContent = orig;
          gsap.to(btn, { backgroundColor: '', duration: 0.4, clearProps: 'backgroundColor' });
        }, 3000);
      });
  });
}
