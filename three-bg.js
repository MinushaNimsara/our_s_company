/* ═══════════════════════════════════════════════════════════════════
   NEXUS  —  "WOW" 3D BACKGROUND ENGINE
   Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════════

   Hero scene  (full-page canvas)
   ─────────────────────────────
   ① 6 000 spring-physics particles  ← WOW layer #1
      • Each particle has a velocity and springs toward its formation.
      • Mouse within 22 units  →  repulsion field pushes them away.
      • Click anywhere         →  shockwave explodes particles outward.
      • Every 9 s morph eases to the next formation:
            Sphere  →  Galaxy disc  →  DNA double helix  →  Torus
      • Particle size pulses with velocity (motion-blur effect).
      • GSAP eases every formation change (power2.inOut, 3 s).

   ② 2 000 background "deep-field" stars  ← WOW layer #2
      • Static ring at z  –120 … –350 for depth.

   ③ Glowing central orb + halo ring  ← WOW layer #3
      • Breathes with a 4-second sin cycle.
      • Bursts on click.

   ④ Two large outer wireframe rings  ← WOW layer #4
      • Slowly rotate + sway.

   ⑤ Every 30 s a random "glitch burst" scatters all particles.

   Subpage banner (lightweight)
   ────────────────────────────
   1 200 particles in a sphere + mouse parallax + 3 rings.
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('[3DBG] Three.js not loaded'); return; }

  /* ── shared mouse state ── */
  const M = { x: 0, y: 0 };   // normalised –1…1
  document.addEventListener('mousemove', e => {
    M.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    M.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const TOUCH   = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  const DPR     = Math.min(window.devicePixelRatio, TOUCH ? 1.5 : 2);
  /* detect theme: light = particles need dark colours + normal blending */
  const IS_LIGHT = document.documentElement.classList.contains('light-theme');

  /* ════════════════════════════════════════════════════════
     GLSL SHADERS  (shared by hero + banner)
  ════════════════════════════════════════════════════════ */
  const VERT = `
    attribute float aSize;
    attribute vec3  aColor;
    attribute float aBright;
    varying   vec3  vColor;
    varying   float vBright;
    void main() {
      vColor  = aColor;
      vBright = aBright;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (460.0 / -mv.z);
      gl_Position  = projectionMatrix * mv;
    }`;

  const FRAG = `
    varying vec3  vColor;
    varying float vBright;
    uniform float uOpacity;
    uniform float uTime;
    void main() {
      vec2  uv   = gl_PointCoord - 0.5;
      float r    = length(uv);
      if (r > 0.5) discard;
      float core = 1.0 - smoothstep(0.0, 0.16, r);
      float mid  = (1.0 - smoothstep(0.16, 0.42, r)) * 0.45;
      float glow = exp(-r * 9.5) * 0.75;
      /* subtle time-driven brightness pulse per particle */
      float pulse = 0.88 + sin(uTime * 0.7 + vBright * 6.28) * 0.12;
      float alpha = (core + mid + glow) * uOpacity * vBright * pulse;
      /* hot-white core */
      vec3  col   = vColor + vec3(core * 0.55);
      gl_FragColor = vec4(col, alpha);
    }`;

  /* ════════════════════════════════════════════════════════
     FORMATION BUILDER
  ════════════════════════════════════════════════════════ */
  function buildFormations(N) {
    const f = [
      new Float32Array(N * 3), // 0 Sphere  (Fibonacci)
      new Float32Array(N * 3), // 1 Galaxy  (spiral arms)
      new Float32Array(N * 3), // 2 DNA     (double helix)
      new Float32Array(N * 3), // 3 Torus
    ];

    for (let i = 0; i < N; i++) {
      const o = i * 3;

      /* ── Sphere (Fibonacci lattice for even coverage) ── */
      const phiS   = Math.acos(1 - 2 * (i + 0.5) / N);
      const thetaS = Math.PI * (1 + Math.sqrt(5)) * i;
      const rS     = 28 + (Math.random() - 0.5) * 6;
      f[0][o]   = rS * Math.sin(phiS) * Math.cos(thetaS);
      f[0][o+1] = rS * Math.sin(phiS) * Math.sin(thetaS);
      f[0][o+2] = rS * Math.cos(phiS);

      /* ── Galaxy disc (3 logarithmic spiral arms) ── */
      const arm    = i % 3;
      const tG     = i / N;
      const rG     = 5 + tG * 40;
      const angG   = (arm / 3) * Math.PI * 2 + tG * Math.PI * 5;
      const scatG  = (Math.random() - 0.5) * rG * 0.18;
      f[1][o]   = Math.cos(angG) * rG + scatG;
      f[1][o+1] = (Math.random() - 0.5) * 5;
      f[1][o+2] = Math.sin(angG) * rG + scatG;

      /* ── DNA double helix ── */
      const strand = i % 2;
      const idx    = Math.floor(i / 2);
      const tD     = idx / (N / 2);
      const angD   = tD * Math.PI * 2 * 5 + (strand ? Math.PI : 0);
      f[2][o]   = Math.cos(angD) * 12;
      f[2][o+1] = (tD - 0.5) * 80;
      f[2][o+2] = Math.sin(angD) * 12;

      /* ── Torus ── */
      const R      = 26, Rt = 10;
      const thetaT = (i / N) * Math.PI * 2;
      const phiT   = ((i * 7) % N / N) * Math.PI * 2;
      f[3][o]   = (R + Rt * Math.cos(phiT)) * Math.cos(thetaT);
      f[3][o+1] = Rt * Math.sin(phiT);
      f[3][o+2] = (R + Rt * Math.cos(phiT)) * Math.sin(thetaT);
    }
    return f;
  }

  /* ════════════════════════════════════════════════════════
     HERO  SCENE
  ════════════════════════════════════════════════════════ */
  const heroCanvas = document.getElementById('bg-canvas');
  if (heroCanvas) initHero(heroCanvas);

  function initHero(canvas) {
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !TOUCH });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, W() / H(), 0.1, 1200);
    camera.position.z = 78;

    /* ── palette: dark = cool blue/violet; light = dark navy so they show on white ── */
    const P = IS_LIGHT ? [
      new THREE.Color(0x1e3a8a), // dark navy
      new THREE.Color(0x312e81), // dark indigo
      new THREE.Color(0x1e40af), // royal blue
      new THREE.Color(0x0f172a), // near-black blue
      new THREE.Color(0x3730a3), // deep violet
    ] : [
      new THREE.Color(0x4f8ef7), // electric blue     (dominant)
      new THREE.Color(0x6b3fd4), // muted violet      (secondary)
      new THREE.Color(0x2d7dd2), // mid-blue          (accent)
      new THREE.Color(0x8ab4f8), // pale blue         (rare)
      new THREE.Color(0xffffff), // hot-white core    (very few)
    ];

    /* ─────────────────────────────────────────────────────
       ①  MAIN PARTICLE SYSTEM
    ───────────────────────────────────────────────────── */
    const N     = TOUCH ? 2200 : 6000;
    const pos   = new Float32Array(N * 3);   // live positions
    const vel   = new Float32Array(N * 3);   // velocities
    const col   = new Float32Array(N * 3);   // colors
    const sz    = new Float32Array(N);       // current sizes (animated)
    const szB   = new Float32Array(N);       // base sizes
    const brt   = new Float32Array(N);       // brightness 0..1

    /* precompute formations */
    const formations = buildFormations(N);

    /* morph state */
    const morph = { from: 0, to: 0, t: 1 };
    const tgt   = new Float32Array(N * 3);   // interpolated targets

    /* ── init: random scatter (will spring into sphere) ── */
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      pos[o]   = (Math.random() - 0.5) * 140;
      pos[o+1] = (Math.random() - 0.5) * 140;
      pos[o+2] = (Math.random() - 0.5) * 100 - 30;

      const t = i / N;
      let c;
      if      (t < 0.50) c = P[0].clone().lerp(P[1], t / 0.50);        // blue → violet
      else if (t < 0.78) c = P[1].clone().lerp(P[2], (t-0.50)/0.28);   // violet → mid-blue
      else if (t < 0.93) c = P[2].clone().lerp(P[3], (t-0.78)/0.15);   // mid-blue → pale blue
      else               c = P[4].clone();                                // white core (7%)
      col[o]=c.r; col[o+1]=c.g; col[o+2]=c.b;

      szB[i] = 0.65 + Math.random() * 1.7;
      sz[i]  = szB[i];
      brt[i] = 0.45 + Math.random() * 0.55;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brt, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
      /* Light theme: NormalBlending so dark particles are visible on white.
         Dark theme: AdditiveBlending for the glowing neon look. */
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(geo, mat));

    /* ─────────────────────────────────────────────────────
       ②  DEEP-FIELD BACKGROUND STARS
    ───────────────────────────────────────────────────── */
    const NS    = TOUCH ? 800 : 2000;
    const sPos  = new Float32Array(NS * 3);
    const sSz   = new Float32Array(NS);
    const sCol  = new Float32Array(NS * 3);
    const sBrt  = new Float32Array(NS);
    for (let i = 0; i < NS; i++) {
      const r  = 90 + Math.random() * 220;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      sPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      sPos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      sPos[i*3+2] = r * Math.cos(ph);
      const b = 0.35 + Math.random() * 0.65;
      sCol[i*3]=b; sCol[i*3+1]=b*0.92; sCol[i*3+2]=b;
      sSz[i]  = 0.2 + Math.random() * 0.55;
      sBrt[i] = b * 0.6;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute('aColor',   new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute('aSize',    new THREE.BufferAttribute(sSz,  1));
    sGeo.setAttribute('aBright',  new THREE.BufferAttribute(sBrt, 1));
    const sMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    /* stars are hidden in light mode — they add no value on a white bg */
    if (!IS_LIGHT) scene.add(new THREE.Points(sGeo, sMat));

    /* ─────────────────────────────────────────────────────
       ③  GLOWING CENTRAL ORB  +  HALO
    ───────────────────────────────────────────────────── */
    /* orb + halo: use navy in light theme, blue in dark */
    const orbColor  = IS_LIGHT ? 0x1e3a8a : 0x4f8ef7;
    const haloColor = IS_LIGHT ? 0x1e3a8a : 0x4f8ef7;
    const orbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.8, 20, 20),
      new THREE.MeshBasicMaterial({ color: orbColor, transparent: true, opacity: 0 })
    );
    scene.add(orbMesh);

    const haloMesh = new THREE.Mesh(
      new THREE.TorusGeometry(5.5, 0.55, 8, 80),
      new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0 })
    );
    haloMesh.rotation.x = Math.PI / 2;
    scene.add(haloMesh);

    /* ─────────────────────────────────────────────────────
       ④  OUTER WIREFRAME RINGS
    ───────────────────────────────────────────────────── */
    function addRing(r, darkColor, lightColor, rx, ry) {
      const color = IS_LIGHT ? lightColor : darkColor;
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 0.16, 8, 140), m);
      mesh.rotation.set(rx, ry, 0);
      scene.add(mesh);
      return { mesh, mat: m };
    }
    const R1 = addRing(42, 0x4f8ef7, 0x1e3a8a, Math.PI / 5, 0);
    const R2 = addRing(30, 0x6b3fd4, 0x312e81, Math.PI / 3, Math.PI / 6);

    /* ─────────────────────────────────────────────────────
       GSAP  INTRO
    ───────────────────────────────────────────────────── */
    /* target opacity differs: light mode can go higher since dark particles on white bg */
    const PART_OPACITY = IS_LIGHT ? 0.82 : 1.0;
    const ORB_OPACITY  = IS_LIGHT ? 0.55 : 0.95;
    const HALO_OPACITY = IS_LIGHT ? 0.25 : 0.40;
    const R1_OPACITY   = IS_LIGHT ? 0.30 : 0.20;
    const R2_OPACITY   = IS_LIGHT ? 0.18 : 0.13;

    let introP = 0;
    gsap.to({ p: 0 }, {
      p: 1, duration: 3.2, ease: 'power3.out', delay: 0.25,
      onUpdate: function () { introP = this.targets()[0].p; }
    });
    gsap.to(mat.uniforms.uOpacity,  { value: PART_OPACITY, duration: 2.5, ease: 'power2.out', delay: 0.25 });
    if (!IS_LIGHT) gsap.to(sMat.uniforms.uOpacity, { value: 0.65, duration: 3.5, ease: 'power2.out', delay: 0.5 });
    gsap.to(orbMesh.material,       { opacity: ORB_OPACITY,  duration: 2.8, ease: 'power2.out', delay: 0.8  });
    gsap.to(haloMesh.material,      { opacity: HALO_OPACITY, duration: 2.8, ease: 'power2.out', delay: 1.0  });
    gsap.to(R1.mat,                 { opacity: R1_OPACITY,   duration: 2.2, ease: 'power2.out', delay: 1.2  });
    gsap.to(R2.mat,                 { opacity: R2_OPACITY,   duration: 2.2, ease: 'power2.out', delay: 1.4  });

    /* ─────────────────────────────────────────────────────
       FORMATION MORPHING
    ───────────────────────────────────────────────────── */
    let morphing = false;

    function nextMorph() {
      if (morphing) return;
      morphing = true;
      morph.from = morph.to;
      morph.to   = (morph.to + 1) % formations.length;
      morph.t    = 0;
      gsap.to(morph, {
        t: 1, duration: 3.0, ease: 'power2.inOut',
        onComplete: () => { morphing = false; setTimeout(nextMorph, 9000); }
      });
    }
    setTimeout(nextMorph, 5500);  // first morph 5.5 s after load

    /* ─────────────────────────────────────────────────────
       PHYSICS  CONSTANTS
    ───────────────────────────────────────────────────── */
    const SPRING    = 0.030;
    const DAMP      = 0.87;
    const REP_R     = TOUCH ? 0 : 22;    // repulsion radius (world units)
    const REP_F     = 3.5;               // repulsion force

    /* mouse → world coords (projection onto z=0 plane) */
    function mWorld() {
      const h = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      return { x: M.x * h * (W() / H()), y: -M.y * h };
    }

    /* ─────────────────────────────────────────────────────
       SHOCKWAVE  (on click)
    ───────────────────────────────────────────────────── */
    function shockwave(wx, wy) {
      for (let i = 0; i < N; i++) {
        const o  = i * 3;
        const dx = pos[o] - wx, dy = pos[o+1] - wy;
        const d  = Math.sqrt(dx*dx + dy*dy) || 1;
        const f  = Math.max(0, (38 - d) / 38) * 5.5;
        vel[o]   += (dx/d) * f;
        vel[o+1] += (dy/d) * f;
        vel[o+2] += (Math.random() - 0.5) * f * 0.6;
      }
      /* orb burst */
      gsap.to(orbMesh.scale, {
        x: 2.2, y: 2.2, z: 2.2, duration: 0.18, ease: 'power4.out',
        onComplete: () => gsap.to(orbMesh.scale, { x: 1, y: 1, z: 1, duration: 0.9, ease: 'elastic.out(1,0.5)' })
      });
    }

    canvas.addEventListener('click', e => {
      const mw = mWorld();
      shockwave(mw.x, mw.y);
    });

    /* ─────────────────────────────────────────────────────
       RANDOM GLITCH  every 30 s
    ───────────────────────────────────────────────────── */
    function glitch() {
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        vel[o]   += (Math.random() - 0.5) * 7;
        vel[o+1] += (Math.random() - 0.5) * 7;
        vel[o+2] += (Math.random() - 0.5) * 5;
      }
    }
    setInterval(glitch, 30000);

    /* ─────────────────────────────────────────────────────
       SCROLL
    ───────────────────────────────────────────────────── */
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ─────────────────────────────────────────────────────
       ANIMATION  LOOP
    ───────────────────────────────────────────────────── */
    const clock = new THREE.Clock();
    let camX = 0, camY = 0;

    function animate() {
      requestAnimationFrame(animate);
      const t   = clock.getElapsedTime();
      const sp  = Math.min(scrollY / H(), 1);
      const mw  = mWorld();

      /* update time uniforms */
      mat.uniforms.uTime.value  = t;
      sMat.uniforms.uTime.value = t;

      /* ── compute interpolated target positions ── */
      const fA = formations[morph.from];
      const fB = formations[morph.to];
      const mt = morph.t;
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        tgt[o]   = fA[o]   + (fB[o]   - fA[o])   * mt;
        tgt[o+1] = fA[o+1] + (fB[o+1] - fA[o+1]) * mt;
        tgt[o+2] = fA[o+2] + (fB[o+2] - fA[o+2]) * mt;
      }

      /* ── spring physics + mouse repulsion ── */
      for (let i = 0; i < N; i++) {
        const o = i * 3;

        /* spring toward target */
        vel[o]   += (tgt[o]   - pos[o])   * SPRING;
        vel[o+1] += (tgt[o+1] - pos[o+1]) * SPRING;
        vel[o+2] += (tgt[o+2] - pos[o+2]) * SPRING;

        /* mouse repulsion */
        if (REP_R > 0) {
          const dx = pos[o] - mw.x, dy = pos[o+1] - mw.y;
          const d2 = dx*dx + dy*dy;
          if (d2 < REP_R*REP_R && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const f = (1 - d/REP_R) * REP_F;
            vel[o]   += (dx/d) * f;
            vel[o+1] += (dy/d) * f;
          }
        }

        /* integrate + damping */
        pos[o]   += vel[o];   vel[o]   *= DAMP;
        pos[o+1] += vel[o+1]; vel[o+1] *= DAMP;
        pos[o+2] += vel[o+2]; vel[o+2] *= DAMP;

        /* size pulse with speed (motion-blur feel) */
        const spd = Math.sqrt(vel[o]*vel[o] + vel[o+1]*vel[o+1]);
        sz[i] = szB[i] * (1 + spd * 0.28);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate    = true;

      /* ── orb breathe ── */
      const breath = 1 + Math.sin(t * 1.6) * 0.12;
      orbMesh.scale.setScalar(breath);
      haloMesh.rotation.z = t * 0.55;
      haloMesh.rotation.x = Math.PI/2 + Math.sin(t * 0.4) * 0.18;

      /* ── rings ── */
      R1.mesh.rotation.z = t * 0.11;
      R1.mesh.rotation.x = Math.PI/5 + Math.sin(t * 0.22) * 0.1;
      R2.mesh.rotation.z = -t * 0.085;
      R2.mesh.rotation.y = t * 0.04;

      /* ── camera: mouse parallax + intro fly-in + scroll retreat ── */
      camX += (M.x * 11 - camX) * 0.042;
      camY += (-M.y * 8  - camY) * 0.042;
      camera.position.x  = camX;
      camera.position.y  = camY - (1 - introP) * 10;
      camera.position.z  = 78 + sp * 48;
      camera.lookAt(0, 0, 0);

      /* ── scroll fades ── */
      const fade = Math.max(0, 1 - sp * 1.45);
      mat.uniforms.uOpacity.value  = PART_OPACITY * fade;
      if (!IS_LIGHT) sMat.uniforms.uOpacity.value = fade * 0.65;
      orbMesh.material.opacity     = Math.max(0, ORB_OPACITY  * fade * breath);
      haloMesh.material.opacity    = Math.max(0, HALO_OPACITY * fade);
      R1.mat.opacity               = Math.max(0, R1_OPACITY   * fade);
      R2.mat.opacity               = Math.max(0, R2_OPACITY   * fade);

      renderer.render(scene, camera);
    }
    animate();

    /* ── resize ── */
    window.addEventListener('resize', () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
  }

  /* ════════════════════════════════════════════════════════
     SUBPAGE  BANNER  (lightweight)
  ════════════════════════════════════════════════════════ */
  const bannerCanvas = document.getElementById('banner-canvas');
  if (bannerCanvas) initBanner(bannerCanvas);

  function initBanner(canvas) {
    const parent = canvas.parentElement;
    const W  = () => parent ? parent.offsetWidth  : window.innerWidth;
    const H_ = () => parent ? parent.offsetHeight : 420;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !TOUCH });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W(), H_());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, W() / H_(), 0.1, 600);
    camera.position.z = 46;

    /* particles on sphere formation */
    const N   = TOUCH ? 600 : 1400;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz  = new Float32Array(N);
    const szB = new Float32Array(N);
    const brt = new Float32Array(N);
    const tgt = new Float32Array(N * 3);

    /* sphere formation (banner radius smaller) */
    for (let i = 0; i < N; i++) {
      const phi   = Math.acos(1 - 2 * (i + 0.5) / N);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r     = 22 + (Math.random() - 0.5) * 4;
      tgt[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      tgt[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      tgt[i*3+2] = r * Math.cos(phi);
      /* start scattered */
      pos[i*3]   = (Math.random() - 0.5) * 100;
      pos[i*3+1] = (Math.random() - 0.5) * 100;
      pos[i*3+2] = (Math.random() - 0.5) * 80;

      const t  = i / N;
      const c  = t < 0.5
        ? new THREE.Color(0x4f8ef7).lerp(new THREE.Color(0x7b2dff), t * 2)
        : new THREE.Color(0x7b2dff).lerp(new THREE.Color(0x00c4ff), (t-0.5)*2);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      szB[i] = 0.6 + Math.random() * 1.4;
      sz[i]  = szB[i];
      brt[i] = 0.5 + Math.random() * 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brt, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(geo, mat));

    /* rings */
    const makeR = (r, c, rx, ry) => {
      const m = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, 0.18, 8, 100), m);
      mesh.rotation.set(rx, ry, 0);
      scene.add(mesh);
      return { mesh, mat: m };
    };
    const br1 = makeR(26, 0x4f8ef7, Math.PI/4, 0);
    const br2 = makeR(16, 0x7b2dff, Math.PI/3, Math.PI/6);
    const br3 = makeR(9,  0x00c4ff, Math.PI/2, Math.PI/4);

    /* torus knot accent */
    const tkM = new THREE.MeshBasicMaterial({ color: 0x4f8ef7, wireframe: true, transparent: true, opacity: 0 });
    const tk  = new THREE.Mesh(new THREE.TorusKnotGeometry(7, 1.8, 100, 12, 2, 3), tkM);
    scene.add(tk);

    gsap.to(mat.uniforms.uOpacity, { value: 1,    duration: 1.8, ease: 'power2.out', delay: 0.1 });
    gsap.to(br1.mat, { opacity: 0.20, duration: 1.4, ease: 'power2.out', delay: 0.3 });
    gsap.to(br2.mat, { opacity: 0.14, duration: 1.4, ease: 'power2.out', delay: 0.5 });
    gsap.to(br3.mat, { opacity: 0.10, duration: 1.4, ease: 'power2.out', delay: 0.7 });
    gsap.to(tkM,     { opacity: 0.12, duration: 1.8, ease: 'power2.out', delay: 0.4 });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mat.uniforms.uTime.value = t;

      for (let i = 0; i < N; i++) {
        const o = i * 3;
        vel[o]   += (tgt[o]   - pos[o])   * 0.028;
        vel[o+1] += (tgt[o+1] - pos[o+1]) * 0.028;
        vel[o+2] += (tgt[o+2] - pos[o+2]) * 0.028;
        pos[o]   += vel[o];   vel[o]   *= 0.88;
        pos[o+1] += vel[o+1]; vel[o+1] *= 0.88;
        pos[o+2] += vel[o+2]; vel[o+2] *= 0.88;
        const spd = Math.sqrt(vel[o]*vel[o] + vel[o+1]*vel[o+1]);
        sz[i] = szB[i] * (1 + spd * 0.25);
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aSize.needsUpdate    = true;

      br1.mesh.rotation.z =  t * 0.18;
      br2.mesh.rotation.z = -t * 0.14;
      br3.mesh.rotation.z =  t * 0.22;
      tk.rotation.x = t * 0.12;
      tk.rotation.y = t * 0.08;

      camera.position.x += (M.x * 5 - camera.position.x) * 0.05;
      camera.position.y += (-M.y * 3.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = W() / H_();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H_());
    });
  }

})();
