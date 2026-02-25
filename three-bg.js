/* ═══════════════════════════════════════════════════════════════════
   NEXUS  —  BRAIN / NEURAL  3D BACKGROUND ENGINE
   Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════════

   Formations (cycle every 10 s):
     0  Human Brain   — two folded lobes with cortical ridges
     1  Neural Cloud  — loose spherical scatter, dense synapse lines
     2  Axon Spiral   — helical neural-pathway ribbons
     3  Synaptic Ring — toroidal ring of firing neurons

   Special effects:
     • Synapse fires  — random bright pulses ripple outward every 1.5 s
     • Mouse repulsion field (desktop)
     • Click shockwave
     • Glitch burst every 30 s
     • Slow brain rotation on Y axis for 3-D depth

   Mobile optimisation:
     • 1 000 particles  (vs 5 000 on desktop)
     • 120 neural lines (vs 450 on desktop)
     • Physics update every 2nd frame
     • No background star layer
     • DPR capped at 1.5
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('[3DBG] Three.js not loaded'); return; }

  /* ── global mouse ── */
  const M = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    M.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    M.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const TOUCH    = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  const DPR      = Math.min(window.devicePixelRatio, TOUCH ? 1.5 : 2);
  const IS_LIGHT = document.documentElement.classList.contains('light-theme');

  /* ════════════════════════════════════════════════════
     SHADERS
  ════════════════════════════════════════════════════ */
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
      float core = 1.0 - smoothstep(0.0, 0.15, r);
      float mid  = (1.0 - smoothstep(0.15, 0.42, r)) * 0.45;
      float glow = exp(-r * 9.5) * 0.75;
      /* per-particle breathing pulse driven by vBright as phase */
      float pulse = 0.85 + sin(uTime * 1.1 + vBright * 12.56) * 0.15;
      float alpha = (core + mid + glow) * uOpacity * vBright * pulse;
      /* hot-white centre */
      vec3  col   = vColor + vec3(core * 0.6);
      gl_FragColor = vec4(col, alpha);
    }`;

  /* neural-line shader — flashes for synapse fires */
  const LINE_VERT = `
    attribute float aAlpha;
    varying   float vAlpha;
    void main() {
      vAlpha      = aAlpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  const LINE_FRAG = `
    varying float vAlpha;
    uniform float uOpacity;
    uniform vec3  uColor;
    void main() {
      gl_FragColor = vec4(uColor, vAlpha * uOpacity);
    }`;

  /* ════════════════════════════════════════════════════
     BRAIN FORMATIONS
  ════════════════════════════════════════════════════ */
  function buildBrainFormations(N) {
    const F = [
      new Float32Array(N * 3),  // 0  Human Brain (two lobes)
      new Float32Array(N * 3),  // 1  Neural Cloud (loose scatter)
      new Float32Array(N * 3),  // 2  Axon Spiral  (helix ribbons)
      new Float32Array(N * 3),  // 3  Synaptic Ring (torus)
    ];

    for (let i = 0; i < N; i++) {
      const o = i * 3;

      /* ── 0: Brain — two folded lobes ── */
      {
        const isRight = i >= Math.floor(N / 2);
        const j = isRight ? i - Math.floor(N / 2) : i;
        const M_ = isRight ? N - Math.floor(N / 2) : Math.floor(N / 2);

        /* Fibonacci sphere for even surface coverage */
        const phi_   = Math.acos(1 - 2 * (j + 0.5) / M_);
        const theta_ = Math.PI * (1 + Math.sqrt(5)) * j;

        const nx = Math.sin(phi_) * Math.cos(theta_);
        const ny = Math.sin(phi_) * Math.sin(theta_);
        const nz = Math.cos(phi_);

        /* ellipsoidal brain shape: wider than tall, slight front bulge */
        const rBase = 16 + Math.random() * 2;
        let x = nx * rBase * 1.1;      // wider L/R
        let y = ny * rBase * 0.78;     // flatter top/bottom
        let z = nz * rBase * 0.88 + nx * 2; // slight front puff

        /* hemisphere offset — corpus callosum gap */
        const side = isRight ? 1 : -1;
        x += side * 9;

        /* cortical folding: multi-frequency radial displacement */
        const f1 = Math.sin(theta_ * 4.2) * Math.cos(phi_ * 3.5) * 3.0;
        const f2 = Math.sin(theta_ * 8.1 + 0.5) * Math.cos(phi_ * 6.2) * 1.2;
        const f3 = Math.sin(theta_ * 2.0) * Math.sin(phi_ * 5.0 + 1.0) * 0.8;
        const fold = f1 + f2 + f3;

        F[0][o]   = x + nx * fold;
        F[0][o+1] = y + ny * fold;
        F[0][o+2] = z + nz * fold;
      }

      /* ── 1: Neural Cloud — random clusters like cell bodies ── */
      {
        /* mix: 70% surface-of-sphere, 30% interior for depth */
        const inner = Math.random() < 0.3;
        const r_  = inner ? 5 + Math.random() * 18 : 22 + Math.random() * 10;
        const th_ = Math.random() * Math.PI * 2;
        const ph_ = Math.acos(2 * Math.random() - 1);
        F[1][o]   = r_ * Math.sin(ph_) * Math.cos(th_);
        F[1][o+1] = r_ * Math.sin(ph_) * Math.sin(th_) * 0.75;
        F[1][o+2] = r_ * Math.cos(ph_);
      }

      /* ── 2: Axon Spiral — multiple helical ribbons (neural pathways) ── */
      {
        const ribbons   = 6;
        const ribbon    = i % ribbons;
        const t_        = (Math.floor(i / ribbons)) / Math.ceil(N / ribbons);
        const turns     = 3;
        const angle     = (ribbon / ribbons) * Math.PI * 2 + t_ * Math.PI * 2 * turns;
        const R_axon    = 16 + Math.sin(t_ * Math.PI * 2) * 4; // pulsing radius
        const height_   = (t_ - 0.5) * 55;
        const scatter   = (Math.random() - 0.5) * 3;
        F[2][o]   = Math.cos(angle) * R_axon + scatter;
        F[2][o+1] = height_;
        F[2][o+2] = Math.sin(angle) * R_axon + scatter;
      }

      /* ── 3: Synaptic Ring — torus of firing neurons ── */
      {
        const R_t   = 24, r_t = 9;
        const thetaT = (i / N) * Math.PI * 2;
        const phiT   = ((i * 11) % N / N) * Math.PI * 2;
        F[3][o]   = (R_t + r_t * Math.cos(phiT)) * Math.cos(thetaT);
        F[3][o+1] = r_t * Math.sin(phiT);
        F[3][o+2] = (R_t + r_t * Math.cos(phiT)) * Math.sin(thetaT);
      }
    }

    return F;
  }

  /* ════════════════════════════════════════════════════
     HERO SCENE
  ════════════════════════════════════════════════════ */
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
    camera.position.z = 80;

    /* ── neural colour palettes ── */
    const P = IS_LIGHT ? [
      new THREE.Color(0x0f2460),  // deep navy
      new THREE.Color(0x1a3a8a),  // royal navy
      new THREE.Color(0x1e40af),  // mid blue
      new THREE.Color(0x0c1a45),  // darkest
      new THREE.Color(0x2d5a9e),  // lighter blue
    ] : [
      new THREE.Color(0x00a8ff),  // neural cyan    (dominant)
      new THREE.Color(0x4f8ef7),  // electric blue  (secondary)
      new THREE.Color(0x00ffcc),  // synapse green  (accent)
      new THREE.Color(0x6b3fd4),  // deep violet    (rare)
      new THREE.Color(0xffffff),  // synapse-fire white
    ];

    const LINE_COLOR = IS_LIGHT
      ? new THREE.Color(0x1e3a8a)
      : new THREE.Color(0x00a8ff);

    /* ── particles ── */
    const N   = TOUCH ? 1000 : 5000;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz  = new Float32Array(N);
    const szB = new Float32Array(N);
    const brt = new Float32Array(N);   // base brightness
    const brtLive = new Float32Array(N); // live (for synapse fires)
    const tgt = new Float32Array(N * 3);

    const formations = buildBrainFormations(N);
    const morph = { from: 0, to: 0, t: 1 };

    /* scatter init */
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      pos[o]   = (Math.random() - 0.5) * 150;
      pos[o+1] = (Math.random() - 0.5) * 150;
      pos[o+2] = (Math.random() - 0.5) * 100 - 30;

      /* neural gradient: cyan core → blue → violet edge */
      const t = i / N;
      let c;
      if      (t < 0.45) c = P[0].clone().lerp(P[1], t / 0.45);
      else if (t < 0.72) c = P[1].clone().lerp(P[2], (t-0.45)/0.27);
      else if (t < 0.90) c = P[2].clone().lerp(P[3], (t-0.72)/0.18);
      else               c = P[4].clone();
      col[o]=c.r; col[o+1]=c.g; col[o+2]=c.b;

      szB[i]     = 0.6 + Math.random() * 1.5;
      sz[i]      = szB[i];
      brt[i]     = 0.4 + Math.random() * 0.6;
      brtLive[i] = brt[i];
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,     3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col,     3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,      1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brtLive, 1));

    const BLEND = IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    scene.add(new THREE.Points(geo, mat));

    /* ── neural lines ── */
    const MAX_LINES  = TOUCH ? 120 : 450;
    const linePos    = new Float32Array(MAX_LINES * 2 * 3);
    const lineAlpha  = new Float32Array(MAX_LINES * 2);
    const lineGeo    = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos,   3).setUsage(35048));
    lineGeo.setAttribute('aAlpha',   new THREE.BufferAttribute(lineAlpha, 1).setUsage(35048));
    const lineMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uColor: { value: LINE_COLOR } },
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    let lineFrame = 0;
    function updateLines() {
      const p    = geo.attributes.position.array;
      let   n    = 0;
      const step = TOUCH ? 15 : 8;
      const MAX_D = 18;
      for (let i = 0; i < N && n < MAX_LINES; i += step) {
        for (let j = i + step; j < N && n < MAX_LINES; j += step) {
          const dx = p[i*3]-p[j*3], dy = p[i*3+1]-p[j*3+1], dz = p[i*3+2]-p[j*3+2];
          const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (d < MAX_D) {
            const a = (1 - d/MAX_D) * 0.75;
            const b = n * 6;
            linePos[b]  =p[i*3];   linePos[b+1]=p[i*3+1]; linePos[b+2]=p[i*3+2];
            linePos[b+3]=p[j*3];   linePos[b+4]=p[j*3+1]; linePos[b+5]=p[j*3+2];
            lineAlpha[n*2]   = a;
            lineAlpha[n*2+1] = a;
            n++;
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.aAlpha.needsUpdate   = true;
      lineGeo.setDrawRange(0, n * 2);
    }

    /* ── brain wireframe overlay (very subtle) ── */
    const brainWireColor = IS_LIGHT ? 0x1e3a8a : 0x00a8ff;
    const brainGeo = new THREE.SphereGeometry(19, 8, 6);
    brainGeo.scale(1.1, 0.78, 0.9);
    const brainMat = new THREE.MeshBasicMaterial({
      color: brainWireColor, wireframe: true, transparent: true, opacity: 0,
    });
    const brainWire = new THREE.Mesh(brainGeo, brainMat);
    scene.add(brainWire);

    /* ── glowing central orb ── */
    const orbColor = IS_LIGHT ? 0x1e3a8a : 0x00a8ff;
    const orbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 16, 16),
      new THREE.MeshBasicMaterial({ color: orbColor, transparent: true, opacity: 0 })
    );
    scene.add(orbMesh);

    /* ── GSAP intro ── */
    const BASE_OP = IS_LIGHT ? 0.80 : 1.0;
    const ORB_OP  = IS_LIGHT ? 0.50 : 0.90;

    let introP = 0;
    gsap.to({ p: 0 }, {
      p: 1, duration: 3.2, ease: 'power3.out', delay: 0.2,
      onUpdate: function () { introP = this.targets()[0].p; }
    });
    gsap.to(mat.uniforms.uOpacity,  { value: BASE_OP, duration: 2.5, ease: 'power2.out', delay: 0.2 });
    gsap.to(lineMat.uniforms.uOpacity, { value: 1,    duration: 2.0, ease: 'power2.out', delay: 1.0 });
    gsap.to(brainMat,               { opacity: IS_LIGHT ? 0.06 : 0.04, duration: 3, ease: 'power2.out', delay: 0.8 });
    gsap.to(orbMesh.material,       { opacity: ORB_OP, duration: 2.8, ease: 'power2.out', delay: 0.6 });

    /* ── formation morphing ── */
    let morphing = false;
    function nextMorph() {
      if (morphing) return;
      morphing = true;
      morph.from = morph.to;
      morph.to   = (morph.to + 1) % formations.length;
      morph.t    = 0;
      gsap.to(morph, {
        t: 1, duration: 3.0, ease: 'power2.inOut',
        onComplete: () => { morphing = false; setTimeout(nextMorph, 10000); }
      });
    }
    setTimeout(nextMorph, 6000);

    /* ── synapse fire system ── */
    /* Each "fire" is an expanding sphere of brightness */
    const fires = [];
    function triggerFire() {
      fires.push({
        x: pos[(Math.floor(Math.random() * N)) * 3],
        y: pos[(Math.floor(Math.random() * N)) * 3 + 1],
        z: pos[(Math.floor(Math.random() * N)) * 3 + 2],
        r: 0,          // current radius
        maxR: 14 + Math.random() * 10,
        speed: 0.35 + Math.random() * 0.25,
        intensity: 1.0,
      });
    }
    setInterval(triggerFire, TOUCH ? 2500 : 1500);

    function applyFires() {
      /* reset live brightness */
      for (let i = 0; i < N; i++) brtLive[i] = brt[i];

      for (let f = fires.length - 1; f >= 0; f--) {
        const fire = fires[f];
        fire.r += fire.speed;
        fire.intensity = Math.max(0, 1 - fire.r / fire.maxR);

        if (fire.r > fire.maxR) { fires.splice(f, 1); continue; }

        /* brighten particles within a thin shell around fire.r */
        for (let i = 0; i < N; i++) {
          const dx = pos[i*3] - fire.x;
          const dy = pos[i*3+1] - fire.y;
          const dz = pos[i*3+2] - fire.z;
          const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
          const shell = Math.abs(d - fire.r);
          if (shell < 3.5) {
            const boost = (1 - shell / 3.5) * fire.intensity * (IS_LIGHT ? 0.4 : 0.7);
            brtLive[i] = Math.min(1, brtLive[i] + boost);
          }
        }
      }
      geo.attributes.aBright.needsUpdate = true;
    }

    /* ── physics constants ── */
    const SPRING   = 0.028;
    const DAMP     = 0.87;
    const REP_R    = TOUCH ? 0 : 20;
    const REP_F    = 3.0;

    function mWorld() {
      const h = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      return { x: M.x * h * (W() / H()), y: -M.y * h };
    }

    /* ── shockwave ── */
    canvas.addEventListener('click', () => {
      const mw = mWorld();
      for (let i = 0; i < N; i++) {
        const o  = i * 3;
        const dx = pos[o]-mw.x, dy = pos[o+1]-mw.y;
        const d  = Math.sqrt(dx*dx+dy*dy) || 1;
        const f  = Math.max(0, (35-d)/35) * 5;
        vel[o]   += (dx/d)*f;
        vel[o+1] += (dy/d)*f;
        vel[o+2] += (Math.random()-0.5)*f*0.5;
      }
      triggerFire(); // fire synapse on click too
      gsap.to(orbMesh.scale, {
        x: 2.5, y: 2.5, z: 2.5, duration: 0.2, ease: 'power4.out',
        onComplete: () => gsap.to(orbMesh.scale, { x:1,y:1,z:1, duration:1, ease:'elastic.out(1,0.5)' })
      });
    });

    /* ── glitch ── */
    setInterval(() => {
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        vel[o]   += (Math.random()-0.5)*7;
        vel[o+1] += (Math.random()-0.5)*7;
        vel[o+2] += (Math.random()-0.5)*5;
      }
    }, 30000);

    /* ── scroll ── */
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ── main loop ── */
    const clock = new THREE.Clock();
    let   camX = 0, camY = 0, frame = 0;

    function animate() {
      requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const sp = Math.min(scrollY / H(), 1);

      mat.uniforms.uTime.value = t;

      /* interpolated targets */
      const fA = formations[morph.from];
      const fB = formations[morph.to];
      const mt = morph.t;
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        tgt[o]   = fA[o]   + (fB[o]   - fA[o])   * mt;
        tgt[o+1] = fA[o+1] + (fB[o+1] - fA[o+1]) * mt;
        tgt[o+2] = fA[o+2] + (fB[o+2] - fA[o+2]) * mt;
      }

      /* physics (skip 1 frame on mobile) */
      const doPhysics = !TOUCH || frame % 2 === 0;
      if (doPhysics) {
        const mw = mWorld();
        for (let i = 0; i < N; i++) {
          const o = i * 3;
          vel[o]   += (tgt[o]   - pos[o])   * SPRING;
          vel[o+1] += (tgt[o+1] - pos[o+1]) * SPRING;
          vel[o+2] += (tgt[o+2] - pos[o+2]) * SPRING;

          if (REP_R > 0) {
            const dx = pos[o]-mw.x, dy = pos[o+1]-mw.y;
            const d2 = dx*dx+dy*dy;
            if (d2 < REP_R*REP_R && d2 > 0.01) {
              const d = Math.sqrt(d2);
              const f = (1-d/REP_R)*REP_F;
              vel[o]   += (dx/d)*f;
              vel[o+1] += (dy/d)*f;
            }
          }

          pos[o]   += vel[o];   vel[o]   *= DAMP;
          pos[o+1] += vel[o+1]; vel[o+1] *= DAMP;
          pos[o+2] += vel[o+2]; vel[o+2] *= DAMP;

          const spd = Math.sqrt(vel[o]*vel[o]+vel[o+1]*vel[o+1]);
          sz[i] = szB[i] * (1 + spd * 0.3);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate    = true;
      }

      /* synapse fires */
      applyFires();

      /* neural lines (every 4 frames) */
      if (frame % 4 === 0) updateLines();

      /* brain wireframe slow rotation */
      brainWire.rotation.y = t * 0.06;
      brainWire.rotation.x = Math.sin(t * 0.04) * 0.15;

      /* orb breathe */
      const breath = 1 + Math.sin(t * 1.8) * 0.12;
      orbMesh.scale.setScalar(breath);

      /* camera */
      camX += (M.x * 10 - camX) * 0.04;
      camY += (-M.y * 7  - camY) * 0.04;
      camera.position.set(camX, camY - (1-introP)*10, 80 + sp*45);
      camera.lookAt(0, 0, 0);

      /* fades */
      const fade = Math.max(0, 1 - sp*1.4);
      mat.uniforms.uOpacity.value       = BASE_OP * fade;
      lineMat.uniforms.uOpacity.value   = fade * (IS_LIGHT ? 0.35 : 0.55);
      brainMat.opacity                  = Math.max(0, (IS_LIGHT?0.06:0.04) * fade);
      orbMesh.material.opacity          = Math.max(0, ORB_OP * fade * breath);

      renderer.render(scene, camera);
      frame++;
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
  }

  /* ════════════════════════════════════════════════════
     SUBPAGE BANNER  (lightweight)
  ════════════════════════════════════════════════════ */
  const bannerCanvas = document.getElementById('banner-canvas');
  if (bannerCanvas) initBanner(bannerCanvas);

  function initBanner(canvas) {
    const parent = canvas.parentElement;
    const W_  = () => parent ? parent.offsetWidth  : window.innerWidth;
    const H_  = () => parent ? parent.offsetHeight : 420;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !TOUCH });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W_(), H_());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, W_() / H_(), 0.1, 600);
    camera.position.z = 46;

    const N   = TOUCH ? 500 : 1200;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz  = new Float32Array(N);
    const szB = new Float32Array(N);
    const brt = new Float32Array(N);
    const tgt = new Float32Array(N * 3);

    const C0 = IS_LIGHT ? new THREE.Color(0x0f2460) : new THREE.Color(0x00a8ff);
    const C1 = IS_LIGHT ? new THREE.Color(0x1e40af) : new THREE.Color(0x4f8ef7);
    const C2 = IS_LIGHT ? new THREE.Color(0x2d5a9e) : new THREE.Color(0x00ffcc);

    for (let i = 0; i < N; i++) {
      /* brain formation for banner */
      const isR = i >= N/2;
      const j  = isR ? i-Math.floor(N/2) : i;
      const M_ = isR ? N-Math.floor(N/2) : Math.floor(N/2);
      const phi_ = Math.acos(1-2*(j+0.5)/M_);
      const the_ = Math.PI*(1+Math.sqrt(5))*j;
      const nx=Math.sin(phi_)*Math.cos(the_), ny=Math.sin(phi_)*Math.sin(the_), nz=Math.cos(phi_);
      const rb=12+Math.random();
      const fold=(Math.sin(the_*4)*Math.cos(phi_*3))*2;
      tgt[i*3]  = nx*rb*1.1 + (isR?6:-6) + nx*fold;
      tgt[i*3+1]= ny*rb*0.78 + ny*fold;
      tgt[i*3+2]= nz*rb*0.88 + nz*fold;

      pos[i*3]  =(Math.random()-0.5)*80;
      pos[i*3+1]=(Math.random()-0.5)*50;
      pos[i*3+2]=(Math.random()-0.5)*60;

      const t = i/N;
      const c = t<0.5 ? C0.clone().lerp(C1,t*2) : C1.clone().lerp(C2,(t-0.5)*2);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      szB[i]=0.55+Math.random()*1.3; sz[i]=szB[i];
      brt[i]=0.45+Math.random()*0.55;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brt, 1));
    const BLEND = IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending;
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    scene.add(new THREE.Points(geo, mat));

    /* brain wire overlay */
    const bwGeo = new THREE.SphereGeometry(14, 7, 5);
    bwGeo.scale(1.1, 0.78, 0.9);
    const bwMat = new THREE.MeshBasicMaterial({
      color: IS_LIGHT ? 0x1e3a8a : 0x00a8ff,
      wireframe: true, transparent: true, opacity: 0
    });
    scene.add(new THREE.Mesh(bwGeo, bwMat));

    gsap.to(mat.uniforms.uOpacity, { value: IS_LIGHT?0.75:1, duration: 1.8, ease:'power2.out', delay:0.1 });
    gsap.to(bwMat, { opacity: IS_LIGHT?0.08:0.05, duration:2, ease:'power2.out', delay:0.4 });

    const clock = new THREE.Clock();
    let fr = 0;
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mat.uniforms.uTime.value = t;

      const doPhys = !TOUCH || fr % 2 === 0;
      if (doPhys) {
        for (let i = 0; i < N; i++) {
          const o = i * 3;
          vel[o]   += (tgt[o]  -pos[o])   * 0.025;
          vel[o+1] += (tgt[o+1]-pos[o+1]) * 0.025;
          vel[o+2] += (tgt[o+2]-pos[o+2]) * 0.025;
          pos[o]   += vel[o];   vel[o]   *= 0.87;
          pos[o+1] += vel[o+1]; vel[o+1] *= 0.87;
          pos[o+2] += vel[o+2]; vel[o+2] *= 0.87;
          sz[i] = szB[i]*(1+Math.sqrt(vel[o]*vel[o]+vel[o+1]*vel[o+1])*0.25);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate    = true;
      }

      bwGeo && (scene.children[1].rotation.y = t * 0.06);
      camera.position.x += (M.x * 5 - camera.position.x) * 0.05;
      camera.position.y += (-M.y * 3.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
      fr++;
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = W_() / H_();
      camera.updateProjectionMatrix();
      renderer.setSize(W_(), H_());
    });
  }

})();
