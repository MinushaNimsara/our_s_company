/* =====================================================
   OMERO – Indie Games Studio
   Full Animation Engine
   ===================================================== */

/* ─── TOUCH DEVICE DETECTION ─── */
function isTouchDevice() {
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

document.addEventListener('DOMContentLoaded', () => {
  initLoader();
  initCursor();
  initHeader();
  initMobileNav();
  initHeroCanvas();
  initRevealAnimations();
  initTiltCards();
  initMagneticButtons();
  initCountdown();
  initScrollCounters();
  initNewsletterForm();
  initSmoothScroll();
});

/* ─── LOADER ─── */
function initLoader() {
  const loader = document.getElementById('loader');
  const bar = document.getElementById('loaderBar');
  const percent = document.getElementById('loaderPercent');
  if (!loader) return;

  let p = 0;
  const interval = setInterval(() => {
    p += Math.random() * 15 + 5;
    if (p >= 100) p = 100;
    bar.style.width = p + '%';
    percent.textContent = Math.floor(p) + '%';
    if (p === 100) {
      clearInterval(interval);
      setTimeout(() => {
        loader.classList.add('hidden');
        document.body.style.overflow = '';
        startHeroAnimations();
      }, 400);
    }
  }, 80);

  document.body.style.overflow = 'hidden';
}

/* ─── HERO ENTRANCE ─── */
function startHeroAnimations() {
  const items = document.querySelectorAll('.hero-content [data-delay]');
  items.forEach(el => {
    const delay = parseInt(el.getAttribute('data-delay')) || 0;
    setTimeout(() => el.classList.add('visible'), delay);
  });
}

/* ─── CUSTOM CURSOR ─── */
function initCursor() {
  const cursor = document.getElementById('cursor');
  if (!cursor) return;
  if (isTouchDevice()) { cursor.style.display = 'none'; document.body.style.cursor = 'auto'; return; }
  const inner = cursor.querySelector('.cursor-inner');
  const outer = cursor.querySelector('.cursor-outer');

  let mx = 0, my = 0;
  let ox = 0, oy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    inner.style.left = mx + 'px';
    inner.style.top = my + 'px';
  });

  // Smooth outer cursor
  function animateOuter() {
    ox += (mx - ox) * 0.12;
    oy += (my - oy) * 0.12;
    outer.style.left = ox + 'px';
    outer.style.top = oy + 'px';
    requestAnimationFrame(animateOuter);
  }
  animateOuter();

  // Hover states
  const hoverTargets = document.querySelectorAll('a, button, .magnetic, .game-card, .team-card, .news-card, .channel-item');
  hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });

  document.addEventListener('mousedown', () => document.body.classList.add('cursor-click'));
  document.addEventListener('mouseup', () => document.body.classList.remove('cursor-click'));
}

/* ─── HEADER SCROLL ─── */
function initHeader() {
  const header = document.getElementById('header');
  if (!header) return;
  window.addEventListener('scroll', () => {
    header.classList.toggle('scrolled', window.scrollY > 80);
  }, { passive: true });
}

/* ─── MOBILE NAV ─── */
function initMobileNav() {
  const hamburger = document.getElementById('hamburger');
  const nav = document.getElementById('nav');
  const navClose = document.getElementById('navClose');

  if (!hamburger || !nav) return;

  const toggle = open => {
    nav.classList.toggle('open', open);
    hamburger.classList.toggle('active', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  hamburger.addEventListener('click', () => toggle(!nav.classList.contains('open')));
  navClose?.addEventListener('click', () => toggle(false));

  nav.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => toggle(false));
  });
}

/* ─── HERO CANVAS PARTICLES ─── */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], mouse = { x: null, y: null };
  const PARTICLE_COUNT = 120;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', resize);

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  function Particle() {
    this.reset = function () {
      this.x = Math.random() * W;
      this.y = Math.random() * H;
      this.size = Math.random() * 2 + 0.5;
      this.baseX = this.x;
      this.baseY = this.y;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = (Math.random() - 0.5) * 0.4;
      this.opacity = Math.random() * 0.6 + 0.1;
      this.color = Math.random() > 0.7 ? '#4f8ef7' : Math.random() > 0.5 ? '#7b2dff' : '#ffffff';
    };
    this.reset();
    this.update = function () {
      // Mouse repulsion
      if (mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const force = (120 - dist) / 120;
          this.vx += (dx / dist) * force * 0.6;
          this.vy += (dy / dist) * force * 0.6;
        }
      }
      this.vx *= 0.98;
      this.vy *= 0.98;
      this.x += this.vx;
      this.y += this.vy;
      // Wrap
      if (this.x < 0) this.x = W;
      if (this.x > W) this.x = 0;
      if (this.y < 0) this.y = H;
      if (this.y > H) this.y = 0;
    };
    this.draw = function () {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.globalAlpha = this.opacity;
      ctx.fill();
    };
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const p = new Particle();
    particles.push(p);
  }

  // Connecting lines
  function drawLines() {
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = '#4f8ef7';
          ctx.globalAlpha = (1 - dist / 120) * 0.12;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    drawLines();
    ctx.globalAlpha = 1;
    requestAnimationFrame(animate);
  }

  animate();
}

/* ─── SCROLL REVEAL ─── */
function initRevealAnimations() {
  const items = document.querySelectorAll('.reveal-up, .reveal-fade');

  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = parseInt(entry.target.getAttribute('data-delay')) || 0;
        setTimeout(() => entry.target.classList.add('visible'), delay);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  items.forEach(el => obs.observe(el));
}

/* ─── 3D TILT CARDS ─── */
function initTiltCards() {
  if (isTouchDevice()) return;   // skip on mobile
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (r.width / 2);
      const dy = (e.clientY - cy) / (r.height / 2);
      card.style.transform = `perspective(1000px) rotateX(${-dy * 6}deg) rotateY(${dx * 6}deg) translateZ(8px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) translateZ(0)';
    });
  });
}

/* ─── MAGNETIC BUTTONS ─── */
function initMagneticButtons() {
  if (isTouchDevice()) return;   // skip on mobile
  document.querySelectorAll('.magnetic').forEach(btn => {
    btn.addEventListener('mousemove', e => {
      const r = btn.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) * 0.3;
      const dy = (e.clientY - cy) * 0.3;
      btn.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

/* ─── COUNTDOWN ─── */
function initCountdown() {
  const launch = new Date();
  launch.setDate(launch.getDate() + 42);

  const dEl = document.getElementById('days');
  const hEl = document.getElementById('hours');
  const mEl = document.getElementById('minutes');
  const sEl = document.getElementById('seconds');

  if (!dEl) return;

  // Flip animation helper
  function flip(el, val) {
    const padded = String(val).padStart(2, '0');
    if (el.textContent !== padded) {
      el.style.animation = 'none';
      el.offsetHeight; // reflow
      el.style.animation = 'flipNum 0.3s ease';
      el.textContent = padded;
    }
  }

  function update() {
    const now = new Date();
    const diff = launch - now;
    if (diff <= 0) return;
    flip(dEl, Math.floor(diff / 86400000));
    flip(hEl, Math.floor((diff % 86400000) / 3600000));
    flip(mEl, Math.floor((diff % 3600000) / 60000));
    flip(sEl, Math.floor((diff % 60000) / 1000));
  }

  update();
  setInterval(update, 1000);
}

/* ─── SCROLL-TRIGGERED STAT COUNTERS ─── */
function initScrollCounters() {
  const counters = document.querySelectorAll('.stat-n[data-target]');

  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCounter(el) {
    if (el.dataset.animated) return;          // run only once per element
    el.dataset.animated = 'true';

    const target   = parseInt(el.getAttribute('data-target'));
    const duration = 2000;
    const startTime = performance.now();

    function tick(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = easeOutQuart(progress);

      el.textContent = Math.floor(eased * target);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target;
      }
    }

    requestAnimationFrame(tick);
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach(el => {
    el.textContent = '0';
    observer.observe(el);
  });
}

/* ─── NEWSLETTER ─── */
function initNewsletterForm() {
  const form = document.getElementById('nlForm');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const btn = form.querySelector('.btn');
    const original = btn.querySelector('.btn-text').textContent;

    btn.querySelector('.btn-text').textContent = '✓ Subscribed!';
    btn.style.background = '#00a87a';
    input.value = '';

    setTimeout(() => {
      btn.querySelector('.btn-text').textContent = original;
      btn.style.background = '';
    }, 3000);
  });
}

/* ─── SMOOTH SCROLL ─── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

/* ─── CSS FLIP ANIMATION ─── */
const style = document.createElement('style');
style.textContent = `
  @keyframes flipNum {
    0% { transform: translateY(-20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }
`;
document.head.appendChild(style);
