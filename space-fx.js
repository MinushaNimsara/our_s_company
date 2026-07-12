/* ══════════════════════════════════════════════
   Space FX — stars, particle links, shooting stars
   Works on hero or page banners via .space-fx-canvas
   ══════════════════════════════════════════════ */
(function (global) {
  function initSpaceFx(canvas, options) {
    if (!canvas || canvas.dataset.spaceFxInit === '1') return;

    const opts = Object.assign({
      particleCount: null,
      shootIntervalMs: 30000,
      firstShotMs: 3000,
      maxStars: 2,
      fitParent: false,
    }, options || {});

    const parent = canvas.parentElement;

    // Don't lock init until the banner has a real height
    if (opts.fitParent && parent) {
      const h = parent.getBoundingClientRect().height || parent.clientHeight || 0;
      if (h < 80) {
        setTimeout(() => initSpaceFx(canvas, options), 80);
        return;
      }
    }

    canvas.dataset.spaceFxInit = '1';

    const ctx = canvas.getContext('2d');
    let W = 0, H = 0;
    const mouse = { x: null, y: null };
    const particles = [];
    const shootingStars = [];
    const MAX_SHOOTING_STARS = opts.maxStars;
    const SHOOT_INTERVAL_MS = opts.shootIntervalMs;
    let nextShotAt = performance.now() + opts.firstShotMs;
    let lastW = 0, lastH = 0;

    function size() {
      if (opts.fitParent && parent) {
        const rect = parent.getBoundingClientRect();
        W = Math.max(1, Math.floor(rect.width || parent.clientWidth || window.innerWidth));
        H = Math.max(1, Math.floor(rect.height || parent.clientHeight || 320));
      } else {
        W = window.innerWidth;
        H = window.innerHeight;
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function scatterParticles() {
      particles.forEach(p => {
        p.x = Math.random() * W;
        p.y = Math.random() * H;
      });
    }

    size();
    // Wait for banner layout — zero/tiny height would trap all stars in one line
    if (opts.fitParent && H < 80) {
      size();
    }

    const COUNT = opts.particleCount != null
      ? opts.particleCount
      : (window.innerWidth < 768 ? 40 : (opts.fitParent ? 90 : 110));

    class Particle {
      constructor() { this.init(); }
      init() {
        this.x = Math.random() * Math.max(W, 1);
        this.y = Math.random() * Math.max(H, 1);
        this.size = Math.random() * 2.2 + 0.6;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.alpha = Math.random() * 0.55 + 0.25;
        this.color = Math.random() > 0.65
          ? '#4f8ef7'
          : Math.random() > 0.5 ? '#7b2dff' : '#ffffff';
      }
      update() {
        if (mouse.x !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 130 && dist > 0.01) {
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
    lastW = W;
    lastH = H;

    class ShootingStar {
      constructor() {
        if (Math.random() > 0.35) {
          this.x = Math.random() * W * 0.75;
          this.y = -10;
        } else {
          this.x = -10;
          this.y = Math.random() * H * 0.5;
        }
        const angle = (22 + Math.random() * 22) * Math.PI / 180;
        const speed = 10 + Math.random() * 8;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.tailLen = 90 + Math.random() * 80;
        this.hw = 1.5 + Math.random() * 1.2;
        this.alive = true;
        this.alpha = 0;
        this.traveled = 0;
        this.totalDist = Math.hypot(W, H) * 1.15;
      }
      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.traveled += Math.hypot(this.vx, this.vy);
        const p = this.traveled / this.totalDist;
        this.alpha = p < 0.08 ? p / 0.08
                   : p > 0.82 ? Math.max(0, (1 - p) / 0.18)
                   : 1;
        if (this.x > W + 150 || this.y > H + 150 || p >= 1) this.alive = false;
      }
      draw() {
        if (!this.alive || this.alpha <= 0) return;
        const len = Math.hypot(this.vx, this.vy) || 1;
        const nx = this.vx / len;
        const ny = this.vy / len;
        const tailX = this.x - nx * this.tailLen;
        const tailY = this.y - ny * this.tailLen;

        ctx.save();
        const grad = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        grad.addColorStop(0, `rgba(200,230,255,0)`);
        grad.addColorStop(0.6, `rgba(210,235,255,${this.alpha * 0.35})`);
        grad.addColorStop(1, `rgba(255,255,255,${this.alpha * 0.95})`);
        ctx.strokeStyle = grad;
        ctx.lineWidth = this.hw;
        ctx.lineCap = 'round';
        ctx.shadowColor = 'rgba(160,210,255,0.8)';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();

        ctx.shadowBlur = 0;
        const glow = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.hw * 7);
        glow.addColorStop(0, `rgba(180,220,255,${this.alpha * 0.9})`);
        glow.addColorStop(0.4, `rgba(140,190,255,${this.alpha * 0.45})`);
        glow.addColorStop(1, `rgba(100,170,255,0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hw * 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255,255,255,${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.hw, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    function launchShootingStar() {
      if (document.hidden) return;
      if (shootingStars.length >= MAX_SHOOTING_STARS) return;
      shootingStars.push(new ShootingStar());
    }

    function onResize() {
      const prevW = lastW;
      const prevH = lastH;
      size();
      // If banner grew from a tiny/zero size, re-scatter stars across the real area
      if (opts.fitParent && (prevH < 80 || H > prevH * 1.5 || W > prevW * 1.5)) {
        scatterParticles();
      } else {
        particles.forEach(p => {
          p.x = Math.min(W, Math.max(0, p.x));
          p.y = Math.min(H, Math.max(0, p.y));
        });
      }
      lastW = W;
      lastH = H;
    }

    function onMove(e) {
      if (opts.fitParent && parent) {
        const rect = parent.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        if (mouse.x < 0 || mouse.y < 0 || mouse.x > rect.width || mouse.y > rect.height) {
          mouse.x = null;
          mouse.y = null;
        }
      } else {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
      }
    }

    window.addEventListener('resize', onResize);
    window.addEventListener('mousemove', onMove);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) return;
      shootingStars.length = 0;
      nextShotAt = performance.now() + SHOOT_INTERVAL_MS;
    });

    if (opts.fitParent && parent && typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => onResize());
      ro.observe(parent);
    }

    // Re-measure after layout settles (important for page banners)
    requestAnimationFrame(() => {
      onResize();
      setTimeout(onResize, 120);
    });

    (function loop() {
      const now = performance.now();
      if (!document.hidden && now >= nextShotAt) {
        launchShootingStar();
        nextShotAt = now + SHOOT_INTERVAL_MS;
      }

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const d = Math.hypot(dx, dy);
          if (d < 115) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = '#4f8ef7';
            ctx.globalAlpha = (1 - d / 115) * 0.18;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      particles.forEach(p => { p.update(); p.draw(); });

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        shootingStars[i].update();
        shootingStars[i].draw();
        if (!shootingStars[i].alive) shootingStars.splice(i, 1);
      }

      ctx.globalAlpha = 1;
      requestAnimationFrame(loop);
    })();
  }

  function initAllSpaceFx() {
    const start = () => {
      document.querySelectorAll('.space-fx-canvas').forEach(canvas => {
        const fitParent = canvas.dataset.fit === 'parent';
        initSpaceFx(canvas, {
          fitParent,
          particleCount: fitParent
            ? (window.innerWidth < 768 ? 55 : 110)
            : null,
          firstShotMs: fitParent ? 800 : 3000,
          shootIntervalMs: fitParent ? 7000 : 30000,
        });
      });
    };

    // Defer so page-banner has its final height (About/Team were initializing too early)
    if (document.readyState === 'complete') {
      requestAnimationFrame(() => setTimeout(start, 50));
    } else {
      window.addEventListener('load', () => setTimeout(start, 50));
      // Also try once on DOM ready, then again after layout
      start();
      setTimeout(start, 300);
    }
  }

  global.initSpaceFx = initSpaceFx;
  global.initAllSpaceFx = initAllSpaceFx;
})(window);
