/* ═══════════════════════════════════════════════════════════════
   NEXUS  —  AURORA  +  PARTICLE NETWORK  BACKGROUND
   No Three.js  •  Pure CSS aurora  •  Lightweight 2D canvas
   ═══════════════════════════════════════════════════════════════

   Two layers:

   ① CSS Aurora blobs  (always on — including mobile)
      • Absolutely-positioned blurred gradient divs injected
        into the hero / page-banner section.
      • Driven entirely by GPU-accelerated CSS keyframe animations.
      • Zero JavaScript per frame — no requestAnimationFrame needed.

   ② 2D Canvas particle network  (desktop / tablet only)
      • 110 small dots that drift slowly across the canvas.
      • Lines drawn between dots closer than 140 px.
      • Mouse moves near dots → gentle repulsion.
      • Skipped entirely on touch devices (perfect for mobile).

   Performance targets
      • Mobile  : ~0% CPU  (CSS only, GPU runs it)
      • Desktop : < 2% CPU  (2D canvas, 110 particles, O(N²) culled)
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── theme detection ── */
  const IS_LIGHT = document.documentElement.classList.contains('light-theme');
  const IS_TOUCH = window.matchMedia('(hover:none) and (pointer:coarse)').matches;

  /* ── mouse (desktop only) ── */
  const mouse = { x: -9999, y: -9999 };
  if (!IS_TOUCH) {
    document.addEventListener('mousemove', e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    });
  }

  /* ═══════════════════════════════════════════════════════
     ①  CSS AURORA BLOBS
  ═══════════════════════════════════════════════════════ */

  /* Blob definitions:  x/y = % position inside parent, size = vw */
  const BLOBS_DARK = [
    { col: '79,142,247',  a: 0.38, sz: 72, x: 25, y: 38, dur: 13, delay:  0 },
    { col: '107,63,212',  a: 0.30, sz: 58, x: 72, y: 22, dur: 17, delay: -5 },
    { col: '0,168,228',   a: 0.22, sz: 64, x: 58, y: 68, dur: 11, delay: -2 },
    { col: '79,142,247',  a: 0.18, sz: 48, x: 12, y: 72, dur: 15, delay: -8 },
    { col: '107,63,212',  a: 0.20, sz: 52, x: 88, y: 52, dur: 19, delay: -3 },
  ];

  const BLOBS_LIGHT = [
    { col: '30,58,138',   a: 0.13, sz: 72, x: 25, y: 38, dur: 13, delay:  0 },
    { col: '49,46,129',   a: 0.10, sz: 58, x: 72, y: 22, dur: 17, delay: -5 },
    { col: '30,64,175',   a: 0.09, sz: 64, x: 58, y: 68, dur: 11, delay: -2 },
    { col: '30,58,138',   a: 0.08, sz: 48, x: 12, y: 72, dur: 15, delay: -8 },
    { col: '49,46,129',   a: 0.09, sz: 52, x: 88, y: 52, dur: 19, delay: -3 },
  ];

  /* Inject one-time <style> for keyframes */
  function injectAuroraKeyframes() {
    if (document.getElementById('aurora-kf')) return;
    const moves = [
      [ 8, 6], [-6, 8], [ 5,-7], [-4,-5], [ 7, 4],
    ];
    let css = '';
    moves.forEach(([dx, dy], i) => {
      css += `
        @keyframes aur${i} {
          0%   { transform: translate(-50%,-50%) scale(1); }
          50%  { transform: translate(calc(-50% + ${dx}vw), calc(-50% + ${dy}vh)) scale(1.12); }
          100% { transform: translate(-50%,-50%) scale(1); }
        }`;
    });
    const el = document.createElement('style');
    el.id = 'aurora-kf';
    el.textContent = css;
    document.head.appendChild(el);
  }

  function injectAuroraBlobs(parent) {
    if (!parent) return;
    injectAuroraKeyframes();
    const blobs = IS_LIGHT ? BLOBS_LIGHT : BLOBS_DARK;
    blobs.forEach((b, i) => {
      const div = document.createElement('div');
      const blur = Math.round(b.sz * 0.55);
      div.style.cssText = [
        'position:absolute',
        `width:${b.sz}vw`,
        `height:${b.sz}vw`,
        `left:${b.x}%`,
        `top:${b.y}%`,
        'transform:translate(-50%,-50%)',
        `background:radial-gradient(circle,rgba(${b.col},${b.a}) 0%,transparent 70%)`,
        `filter:blur(${blur}px)`,
        'border-radius:50%',
        'pointer-events:none',
        'z-index:0',
        'will-change:transform',
        `animation:aur${i} ${b.dur}s ease-in-out ${b.delay}s infinite`,
      ].join(';');
      parent.insertBefore(div, parent.firstChild);
    });
  }

  /* ═══════════════════════════════════════════════════════
     ②  2D CANVAS PARTICLE NETWORK  (desktop only)
  ═══════════════════════════════════════════════════════ */

  function initParticleNet(canvas, isHero) {
    if (!canvas) return;
    if (IS_TOUCH) {
      /* on mobile hide the canvas (aurora alone is enough) */
      canvas.style.display = 'none';
      return;
    }

    const parent = canvas.parentElement;
    const getW   = () => parent ? parent.offsetWidth  : window.innerWidth;
    const getH   = () => parent ? parent.offsetHeight : window.innerHeight;

    canvas.width  = getW();
    canvas.height = getH();

    const ctx = canvas.getContext('2d');

    /* colour strings */
    const DOT_RGB  = IS_LIGHT ? '30,58,138'  : '100,160,255';
    const LINE_RGB = IS_LIGHT ? '30,58,138'  : '79,142,247';

    /* particles */
    const N    = isHero ? 110 : 60;
    const DIST = isHero ? 140 : 110;

    const pts = Array.from({ length: N }, () => ({
      x:  Math.random() * canvas.width,
      y:  Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: (Math.random() - 0.5) * 0.45,
      r:  1.0 + Math.random() * 1.8,
      a:  0.35 + Math.random() * 0.45,
    }));

    /* fade in */
    let opacity = 0;
    if (typeof gsap !== 'undefined') {
      const obj = { v: 0 };
      gsap.to(obj, {
        v: 1, duration: 2.2, ease: 'power2.out', delay: 0.4,
        onUpdate: () => { opacity = obj.v; },
      });
    } else {
      setTimeout(() => { opacity = 1; }, 400);
    }

    /* scroll progress (hero only) */
    let scrollY = 0;
    if (isHero) window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* animation loop */
    function tick() {
      requestAnimationFrame(tick);

      const w  = canvas.width;
      const h  = canvas.height;
      const sp = isHero ? Math.min(scrollY / (window.innerHeight || 800), 1) : 0;
      const fo = opacity * Math.max(0, 1 - sp * 1.5);  // final opacity

      ctx.clearRect(0, 0, w, h);
      if (fo < 0.01) return;

      /* move + mouse repulsion */
      pts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;

        /* wrap edges */
        if (p.x < -5) p.x = w + 5;
        if (p.x > w + 5) p.x = -5;
        if (p.y < -5) p.y = h + 5;
        if (p.y > h + 5) p.y = -5;

        /* repulsion from mouse */
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 6400 && d2 > 1) {       // within 80 px
          const d   = Math.sqrt(d2);
          const f   = (1 - d / 80) * 0.07;
          p.vx += (dx / d) * f;
          p.vy += (dy / d) * f;
          /* speed cap */
          const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
          if (spd > 2.0) { p.vx = (p.vx / spd) * 2.0; p.vy = (p.vy / spd) * 2.0; }
        }
      });

      /* draw connections */
      for (let i = 0; i < N - 1; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = pts[i].x - pts[j].x;
          const dy = pts[i].y - pts[j].y;
          const d2 = dx * dx + dy * dy;
          if (d2 < DIST * DIST) {
            const alpha = (1 - Math.sqrt(d2) / DIST) * 0.45 * fo;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${LINE_RGB},${alpha.toFixed(3)})`;
            ctx.lineWidth   = 0.7;
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.stroke();
          }
        }
      }

      /* draw dots */
      pts.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = `rgba(${DOT_RGB},${(p.a * fo).toFixed(3)})`;
        ctx.fill();
      });
    }
    tick();

    /* resize */
    window.addEventListener('resize', () => {
      canvas.width  = getW();
      canvas.height = getH();
      pts.forEach(p => {
        p.x = Math.random() * canvas.width;
        p.y = Math.random() * canvas.height;
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     WIRE  UP
  ═══════════════════════════════════════════════════════ */

  /* Hero */
  const heroSection = document.querySelector('#home.hero, section.hero, .hero');
  injectAuroraBlobs(heroSection);
  initParticleNet(document.getElementById('bg-canvas'), true);

  /* Page banner (subpages) */
  const banner = document.querySelector('.page-banner');
  injectAuroraBlobs(banner);
  initParticleNet(document.getElementById('banner-canvas'), false);

})();
