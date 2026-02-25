/* ═══════════════════════════════════════════════════════════════════
   NEXUS  —  DEEP SPACE GALAXY  (Gold + White)
   Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════════

   Layers
     ①  5 000 galaxy particles (spring physics + morphing formations)
          Sphere  →  Galaxy Disc  →  Elliptical  →  Ring Galaxy
     ②  3 000 deep-field background stars (static, infinite depth feel)
     ③  Glowing golden central orb + pulsing halo
     ④  Comets (5 streaking comets with gold tails, relaunch every 4 s)
     ⑤  Mouse parallax camera  •  Click shockwave  •  Glitch every 30 s

   Mobile
     • 900 galaxy particles / 600 background stars / 2 comets
     • Physics every 2nd frame  •  DPR capped 1.5
     • No neural lines (replaced by comet trails)

   Light theme
     • Dark navy particles on white BG (NormalBlending)
     • Reduced opacity comet trails
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('[3DBG] Three.js not loaded'); return; }

  const M = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    M.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    M.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const TOUCH    = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  const DPR      = Math.min(window.devicePixelRatio, TOUCH ? 1.5 : 2);
  const IS_LIGHT = document.documentElement.classList.contains('light-theme');

  /* ══════════════════════════════════════════
     SHADERS
  ══════════════════════════════════════════ */
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
      gl_PointSize = aSize * (480.0 / -mv.z);
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
      float core  = 1.0 - smoothstep(0.0, 0.14, r);
      float mid   = (1.0 - smoothstep(0.14, 0.40, r)) * 0.50;
      float glow  = exp(-r * 10.0) * 0.80;
      float twinkle = 0.82 + sin(uTime * 2.5 + vBright * 19.0) * 0.18;
      float alpha = (core + mid + glow) * uOpacity * vBright * twinkle;
      /* hot-white/gold centre */
      vec3  col   = vColor + vec3(core * 0.55, core * 0.40, core * 0.05);
      gl_FragColor = vec4(col, alpha);
    }`;

  /* ══════════════════════════════════════════
     GALAXY FORMATIONS
  ══════════════════════════════════════════ */
  function buildFormations(N) {
    const F = [
      new Float32Array(N * 3), // 0 Sphere (globular cluster)
      new Float32Array(N * 3), // 1 Galaxy Disc (3 spiral arms)
      new Float32Array(N * 3), // 2 Elliptical galaxy
      new Float32Array(N * 3), // 3 Ring galaxy
    ];

    for (let i = 0; i < N; i++) {
      const o = i * 3;

      /* ── 0: Globular Cluster (Fibonacci sphere) ── */
      {
        const phi   = Math.acos(1 - 2 * (i + 0.5) / N);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const r     = (i / N < 0.3 ? 6 : 18) + Math.random() * 8;
        F[0][o]   = r * Math.sin(phi) * Math.cos(theta);
        F[0][o+1] = r * Math.sin(phi) * Math.sin(theta);
        F[0][o+2] = r * Math.cos(phi);
      }

      /* ── 1: Galaxy Disc (3 logarithmic spiral arms) ── */
      {
        const arm    = i % 3;
        const t      = i / N;
        const r      = 3 + t * 44;
        const angle  = (arm / 3) * Math.PI * 2 + t * Math.PI * 6;
        const scatter = (Math.random() - 0.5) * r * 0.14;
        const thick   = (Math.random() - 0.5) * (3 + r * 0.06); // slight thickness
        F[1][o]   = Math.cos(angle) * r + scatter;
        F[1][o+1] = thick;
        F[1][o+2] = Math.sin(angle) * r + scatter;
      }

      /* ── 2: Elliptical galaxy (stretched ellipsoid) ── */
      {
        const phi   = Math.acos(1 - 2 * (i + 0.5) / N);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const r     = 6 + Math.random() * 28;
        F[2][o]   = r * 1.6 * Math.sin(phi) * Math.cos(theta); // wide
        F[2][o+1] = r * 0.6 * Math.sin(phi) * Math.sin(theta); // flat
        F[2][o+2] = r * 1.0 * Math.cos(phi);
      }

      /* ── 3: Ring Galaxy (disk + central blob) ── */
      {
        const isCore  = i < N * 0.15;
        if (isCore) {
          const r = Math.random() * 8;
          const t = Math.random() * Math.PI * 2;
          const p = Math.acos(2 * Math.random() - 1);
          F[3][o]   = r * Math.sin(p) * Math.cos(t);
          F[3][o+1] = r * Math.sin(p) * Math.sin(t) * 0.4;
          F[3][o+2] = r * Math.cos(p);
        } else {
          const angle   = ((i - N * 0.15) / (N * 0.85)) * Math.PI * 2;
          const ringR   = 26 + (Math.random() - 0.5) * 6;
          const scatter = (Math.random() - 0.5) * 3;
          F[3][o]   = Math.cos(angle) * ringR + scatter;
          F[3][o+1] = (Math.random() - 0.5) * 4;
          F[3][o+2] = Math.sin(angle) * ringR + scatter;
        }
      }
    }
    return F;
  }

  /* ══════════════════════════════════════════
     HERO SCENE
  ══════════════════════════════════════════ */
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
    camera.position.z = 85;

    /* ── Gold + White palette ── */
    const GOLD = IS_LIGHT ? [
      new THREE.Color(0x0f2460),  // dark navy (light-theme: dark particles on white)
      new THREE.Color(0x1a3a8a),
      new THREE.Color(0x2d5a9e),
      new THREE.Color(0x1e40af),
      new THREE.Color(0x3b5bdb),
    ] : [
      new THREE.Color(0xffffff),  // star white
      new THREE.Color(0xfffde7),  // cream
      new THREE.Color(0xffd700),  // gold
      new THREE.Color(0xffb300),  // amber
      new THREE.Color(0xff8f00),  // deep amber
    ];

    const BLEND = IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending;

    /* ── GALAXY PARTICLES ── */
    const N   = TOUCH ? 900  : 5000;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz  = new Float32Array(N);
    const szB = new Float32Array(N);
    const brt = new Float32Array(N);
    const tgt = new Float32Array(N * 3);

    const formations = buildFormations(N);
    const morph = { from: 0, to: 0, t: 1 };

    for (let i = 0; i < N; i++) {
      const o = i * 3;
      pos[o]   = (Math.random() - 0.5) * 180;
      pos[o+1] = (Math.random() - 0.5) * 180;
      pos[o+2] = (Math.random() - 0.5) * 120 - 30;

      /* gold gradient: white core → gold → amber edge */
      const t = i / N;
      let c;
      if      (t < 0.15) c = GOLD[0].clone();                              // white stars
      else if (t < 0.40) c = GOLD[0].clone().lerp(GOLD[2], (t-0.15)/0.25); // white → gold
      else if (t < 0.70) c = GOLD[2].clone().lerp(GOLD[3], (t-0.40)/0.30); // gold → amber
      else if (t < 0.90) c = GOLD[3].clone().lerp(GOLD[4], (t-0.70)/0.20); // amber → deep
      else               c = GOLD[1].clone();                               // cream rare
      col[o]=c.r; col[o+1]=c.g; col[o+2]=c.b;

      szB[i] = 0.5 + Math.random() * 1.8;
      sz[i]  = szB[i];
      brt[i] = 0.35 + Math.random() * 0.65;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brt, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    const galaxyPoints = new THREE.Points(geo, mat);
    scene.add(galaxyPoints);

    /* ── BACKGROUND STARS ── */
    const NS   = TOUCH ? 600 : 3000;
    const sPos = new Float32Array(NS * 3);
    const sCol = new Float32Array(NS * 3);
    const sSz  = new Float32Array(NS);
    const sBrt = new Float32Array(NS);
    for (let i = 0; i < NS; i++) {
      const r  = 80 + Math.random() * 300;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      sPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      sPos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      sPos[i*3+2] = r * Math.cos(ph);
      /* mostly white, occasional gold tint */
      const g = Math.random() < 0.3 ? 0.85 + Math.random() * 0.15 : 1.0;
      sCol[i*3]=1; sCol[i*3+1]=g; sCol[i*3+2]=Math.random() < 0.3 ? 0 : 0.9;
      sSz[i]  = 0.15 + Math.random() * 0.45;
      sBrt[i] = 0.2  + Math.random() * 0.5;
    }
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
    sGeo.setAttribute('aColor',   new THREE.BufferAttribute(sCol, 3));
    sGeo.setAttribute('aSize',    new THREE.BufferAttribute(sSz,  1));
    sGeo.setAttribute('aBright',  new THREE.BufferAttribute(sBrt, 1));
    const sMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    if (!IS_LIGHT) scene.add(new THREE.Points(sGeo, sMat));

    /* ── GOLDEN CENTRAL ORB + HALO ── */
    const orbColor  = IS_LIGHT ? 0x1e3a8a : 0xffd700;
    const haloColor = IS_LIGHT ? 0x2d5a9e : 0xffb300;
    const orbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(3.0, 20, 20),
      new THREE.MeshBasicMaterial({ color: orbColor, transparent: true, opacity: 0 })
    );
    scene.add(orbMesh);
    const haloMesh = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.6, 8, 80),
      new THREE.MeshBasicMaterial({ color: haloColor, transparent: true, opacity: 0 })
    );
    haloMesh.rotation.x = Math.PI / 2;
    scene.add(haloMesh);

    /* ── COMET SYSTEM ── */
    const COMET_COUNT = TOUCH ? 2 : 5;
    const TAIL_LEN    = TOUCH ? 10 : 18;
    const cometPts    = new Float32Array(COMET_COUNT * TAIL_LEN * 3);
    const cometBrt    = new Float32Array(COMET_COUNT * TAIL_LEN);
    const cometSz     = new Float32Array(COMET_COUNT * TAIL_LEN);
    const cometCol    = new Float32Array(COMET_COUNT * TAIL_LEN * 3);
    const cometGeo    = new THREE.BufferGeometry();
    cometGeo.setAttribute('position', new THREE.BufferAttribute(cometPts, 3).setUsage(35048));
    cometGeo.setAttribute('aBright',  new THREE.BufferAttribute(cometBrt, 1).setUsage(35048));
    cometGeo.setAttribute('aSize',    new THREE.BufferAttribute(cometSz,  1).setUsage(35048));
    cometGeo.setAttribute('aColor',   new THREE.BufferAttribute(cometCol, 3).setUsage(35048));
    const cometMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: IS_LIGHT ? 0.5 : 1.0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    scene.add(new THREE.Points(cometGeo, cometMat));

    /* comet state */
    const comets = Array.from({ length: COMET_COUNT }, () => ({
      x: 999, y: 999, z: 0,
      vx: 0, vy: 0,
      history: new Float32Array(TAIL_LEN * 3),
      active: false,
    }));

    function launchComet(c) {
      const fovH = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      const fovW = fovH * (W() / H());
      const edge = Math.floor(Math.random() * 4);
      const speed = 0.9 + Math.random() * 0.7;
      switch (edge) {
        case 0: c.x = -fovW * 1.1; c.y = (Math.random()-0.5)*fovH; c.vx=speed;  c.vy=(Math.random()-0.5)*0.5; break;
        case 1: c.x =  fovW * 1.1; c.y = (Math.random()-0.5)*fovH; c.vx=-speed; c.vy=(Math.random()-0.5)*0.5; break;
        case 2: c.x = (Math.random()-0.5)*fovW; c.y= fovH*1.1;  c.vy=-speed; c.vx=(Math.random()-0.5)*0.4; break;
        case 3: c.x = (Math.random()-0.5)*fovW; c.y=-fovH*1.1;  c.vy= speed; c.vx=(Math.random()-0.5)*0.4; break;
      }
      c.z = -15 + Math.random() * 10;
      c.active = true;
      for (let j = 0; j < TAIL_LEN; j++) {
        c.history[j*3]=c.x; c.history[j*3+1]=c.y; c.history[j*3+2]=c.z;
      }
    }

    function updateComets() {
      const fovH = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      const fovW = fovH * (W() / H());

      for (let i = 0; i < COMET_COUNT; i++) {
        const c   = comets[i];
        const off = i * TAIL_LEN;
        if (!c.active) {
          for (let j = 0; j < TAIL_LEN; j++) {
            cometPts[(off+j)*3]=1e5; cometBrt[off+j]=0;
          }
          continue;
        }

        c.x += c.vx; c.y += c.vy;

        if (Math.abs(c.x) > fovW * 1.3 || Math.abs(c.y) > fovH * 1.3) {
          c.active = false; continue;
        }

        /* shift history */
        for (let j = TAIL_LEN-1; j > 0; j--) {
          c.history[j*3]  = c.history[(j-1)*3];
          c.history[j*3+1]= c.history[(j-1)*3+1];
          c.history[j*3+2]= c.history[(j-1)*3+2];
        }
        c.history[0]=c.x; c.history[1]=c.y; c.history[2]=c.z;

        /* write to geometry */
        for (let j = 0; j < TAIL_LEN; j++) {
          const gi = (off+j)*3;
          cometPts[gi]  =c.history[j*3];
          cometPts[gi+1]=c.history[j*3+1];
          cometPts[gi+2]=c.history[j*3+2];
          const fade = 1 - j / TAIL_LEN;
          cometBrt[off+j] = fade * (IS_LIGHT ? 0.6 : 0.95);
          cometSz [off+j] = (fade * 2.8 + 0.3);
          /* gold → white head; amber tail */
          cometCol[gi]  = 1.0;
          cometCol[gi+1]= IS_LIGHT ? 0.6 : (0.9 - j/TAIL_LEN * 0.6);
          cometCol[gi+2]= IS_LIGHT ? 0.2 : 0.0;
        }
      }
      cometGeo.attributes.position.needsUpdate = true;
      cometGeo.attributes.aBright.needsUpdate  = true;
      cometGeo.attributes.aSize.needsUpdate    = true;
      cometGeo.attributes.aColor.needsUpdate   = true;
    }

    /* launch comets staggered */
    comets.forEach((c, i) => setTimeout(() => launchComet(c), 2000 + i * 3500));
    setInterval(() => {
      const c = comets.find(c => !c.active);
      if (c) launchComet(c);
    }, 4000);

    /* ── GSAP INTRO ── */
    const BASE_OP = IS_LIGHT ? 0.78 : 1.0;
    let introP = 0;
    gsap.to({ p: 0 }, {
      p: 1, duration: 3.2, ease: 'power3.out', delay: 0.2,
      onUpdate: function () { introP = this.targets()[0].p; }
    });
    gsap.to(mat.uniforms.uOpacity,  { value: BASE_OP, duration: 2.5, ease: 'power2.out', delay: 0.2 });
    gsap.to(sMat.uniforms.uOpacity, { value: 0.7,     duration: 3.5, ease: 'power2.out', delay: 0.5 });
    gsap.to(orbMesh.material,       { opacity: IS_LIGHT ? 0.55 : 0.95, duration: 2.8, ease: 'power2.out', delay: 0.7 });
    gsap.to(haloMesh.material,      { opacity: IS_LIGHT ? 0.25 : 0.50, duration: 2.8, ease: 'power2.out', delay: 1.0 });

    /* ── FORMATION MORPHING ── */
    let morphing = false;
    function nextMorph() {
      if (morphing) return;
      morphing = true;
      morph.from = morph.to;
      morph.to   = (morph.to + 1) % formations.length;
      morph.t    = 0;
      gsap.to(morph, {
        t: 1, duration: 3.2, ease: 'power2.inOut',
        onComplete: () => { morphing = false; setTimeout(nextMorph, 10000); }
      });
    }
    setTimeout(nextMorph, 6000);

    /* ── PHYSICS ── */
    const SPRING = 0.026, DAMP = 0.87;
    const REP_R  = TOUCH ? 0 : 22, REP_F = 3.0;

    function mWorld() {
      const h = Math.tan((camera.fov * Math.PI / 180) / 2) * camera.position.z;
      return { x: M.x * h * (W() / H()), y: -M.y * h };
    }

    /* ── SHOCKWAVE + CLICK ── */
    canvas.addEventListener('click', () => {
      const mw = mWorld();
      for (let i = 0; i < N; i++) {
        const o  = i * 3;
        const dx = pos[o]-mw.x, dy = pos[o+1]-mw.y;
        const d  = Math.sqrt(dx*dx+dy*dy) || 1;
        const f  = Math.max(0,(38-d)/38) * 5.5;
        vel[o]   += (dx/d)*f;
        vel[o+1] += (dy/d)*f;
        vel[o+2] += (Math.random()-0.5)*f*0.4;
      }
      /* launch a comet on click */
      const c = comets.find(c => !c.active);
      if (c) launchComet(c);
      /* orb burst */
      gsap.to(orbMesh.scale, {
        x:2.5, y:2.5, z:2.5, duration:0.2, ease:'power4.out',
        onComplete:()=>gsap.to(orbMesh.scale,{x:1,y:1,z:1,duration:1,ease:'elastic.out(1,0.5)'})
      });
    });

    /* ── GLITCH every 30 s ── */
    setInterval(() => {
      for (let i = 0; i < N; i++) {
        vel[i*3]   += (Math.random()-0.5)*7;
        vel[i*3+1] += (Math.random()-0.5)*7;
        vel[i*3+2] += (Math.random()-0.5)*5;
      }
    }, 30000);

    /* ── SCROLL ── */
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ── ANIMATION LOOP ── */
    const clock = new THREE.Clock();
    let   frame = 0, camX = 0, camY = 0;

    function animate() {
      requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const sp = Math.min(scrollY / H(), 1);

      mat.uniforms.uTime.value  = t;
      sMat.uniforms.uTime.value = t;
      cometMat.uniforms.uTime.value = t;

      /* morphed targets */
      const fA = formations[morph.from];
      const fB = formations[morph.to];
      const mt = morph.t;
      for (let i = 0; i < N; i++) {
        const o = i * 3;
        tgt[o]   = fA[o]   + (fB[o]   - fA[o])   * mt;
        tgt[o+1] = fA[o+1] + (fB[o+1] - fA[o+1]) * mt;
        tgt[o+2] = fA[o+2] + (fB[o+2] - fA[o+2]) * mt;
      }

      /* physics (every 2nd frame on mobile) */
      if (!TOUCH || frame % 2 === 0) {
        const mw = mWorld();
        for (let i = 0; i < N; i++) {
          const o = i * 3;
          vel[o]   += (tgt[o]  -pos[o])   * SPRING;
          vel[o+1] += (tgt[o+1]-pos[o+1]) * SPRING;
          vel[o+2] += (tgt[o+2]-pos[o+2]) * SPRING;
          if (REP_R > 0) {
            const dx=pos[o]-mw.x, dy=pos[o+1]-mw.y;
            const d2=dx*dx+dy*dy;
            if (d2 < REP_R*REP_R && d2 > 0.01) {
              const d=Math.sqrt(d2), f=(1-d/REP_R)*REP_F;
              vel[o]   += (dx/d)*f;
              vel[o+1] += (dy/d)*f;
            }
          }
          pos[o]  +=vel[o];   vel[o]  *=DAMP;
          pos[o+1]+=vel[o+1]; vel[o+1]*=DAMP;
          pos[o+2]+=vel[o+2]; vel[o+2]*=DAMP;
          sz[i] = szB[i] * (1 + Math.sqrt(vel[o]*vel[o]+vel[o+1]*vel[o+1]) * 0.28);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate    = true;
      }

      /* galaxy tilt (scroll-based rotation handled below) */
      galaxyPoints.rotation.x = Math.sin(t * 0.015) * 0.12;

      updateComets();

      /* orb breathe */
      const breath = 1 + Math.sin(t * 1.4) * 0.10;
      orbMesh.scale.setScalar(breath);
      haloMesh.rotation.z = t * 0.4;

      /* camera */
      camX += (M.x * 10 - camX) * 0.04;
      camY += (-M.y * 7  - camY) * 0.04;
      /* Camera stays fixed on Z — galaxy is now always behind all sections.
         Only the intro fly-in moves the camera forward. */
      camera.position.set(camX, camY - (1 - introP) * 10, 85);
      camera.lookAt(0, 0, 0);

      /* Scroll-through: galaxy stays visible at a reduced "between-section"
         opacity while the intro hero view uses full opacity.
         sp 0→0.25: lerp from BASE_OP down to SECTION_OP
         sp > 0.25: stay at SECTION_OP so the galaxy glows through sections */
      const SECTION_OP = IS_LIGHT ? 0.28 : 0.50;
      const heroFade   = Math.max(0, 1 - sp * 4);   // 0..1 over first 25% scroll
      const curOp      = SECTION_OP + (BASE_OP - SECTION_OP) * heroFade;

      mat.uniforms.uOpacity.value         = curOp;
      sMat.uniforms.uOpacity.value        = IS_LIGHT ? 0 : curOp * 0.70;
      orbMesh.material.opacity            = (IS_LIGHT?0.55:0.95) * Math.max(SECTION_OP, curOp);
      haloMesh.material.opacity           = (IS_LIGHT?0.25:0.50) * Math.max(SECTION_OP * 0.7, curOp * 0.7);
      cometMat.uniforms.uOpacity.value    = IS_LIGHT ? 0.45 : curOp * 0.9;

      /* Galaxy slowly rotates with scroll so each section reveals a fresh angle */
      galaxyPoints.rotation.y = t * 0.025 + scrollY * 0.00055;

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

  /* ══════════════════════════════════════════
     SUBPAGE BANNER  (compact galaxy)
  ══════════════════════════════════════════ */
  const bannerCanvas = document.getElementById('banner-canvas');
  if (bannerCanvas) initBanner(bannerCanvas);

  function initBanner(canvas) {
    const parent = canvas.parentElement;
    const W_ = () => parent ? parent.offsetWidth  : window.innerWidth;
    const H_ = () => parent ? parent.offsetHeight : 420;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !TOUCH });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W_(), H_());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, W_() / H_(), 0.1, 600);
    camera.position.z = 48;

    const BLEND = IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending;
    const N  = TOUCH ? 450 : 1200;
    const pos = new Float32Array(N * 3);
    const vel = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz  = new Float32Array(N);
    const szB = new Float32Array(N);
    const brt = new Float32Array(N);

    /* spiral disc for banner */
    for (let i = 0; i < N; i++) {
      const o   = i * 3;
      const arm = i % 3;
      const t   = i / N;
      const r   = 3 + t * 36;
      const a   = (arm/3)*Math.PI*2 + t*Math.PI*5;
      const sc  = (Math.random()-0.5)*r*0.14;
      pos[o]   = vel[o]   = 0;
      pos[o+1] = vel[o+1] = 0;
      pos[o+2] = vel[o+2] = 0;

      /* start scattered then spring to disc */
      pos[o]   = (Math.random()-0.5)*80;
      pos[o+1] = (Math.random()-0.5)*50;
      pos[o+2] = (Math.random()-0.5)*60;

      /* store target in sz reuse — actually store in separate arrays */
      /* (we'll just use fixed targets below) */

      const gx = Math.cos(a)*r + sc;
      const gy = (Math.random()-0.5)*3;
      const gz = Math.sin(a)*r + sc;
      /* pack target into pos itself via phase — simpler: spring to formation */
      /* We'll use the formations approach inline */
      pos[o]=gx+( Math.random()-0.5)*100; // start scattered
      pos[o+1]=gy+(Math.random()-0.5)*60;
      pos[o+2]=gz+(Math.random()-0.5)*60;
      // store final target in szB (abuse) temporarily — no, use separate
      // Let's just store targets properly

      const tGold = IS_LIGHT ? [0x1e3a8a,0x2d5a9e,0x1e40af] : [0xffffff,0xffd700,0xff8f00];
      const c = new THREE.Color(tGold[arm % 3]);
      col[o]=c.r; col[o+1]=c.g; col[o+2]=c.b;
      szB[i] = 0.5 + Math.random()*1.4; sz[i]=szB[i];
      brt[i] = 0.35 + Math.random()*0.65;
    }

    /* rebuild proper galaxy disc targets */
    const tgtB = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const o   = i * 3;
      const arm = i % 3, t = i / N;
      const r   = 3 + t * 36;
      const a   = (arm/3)*Math.PI*2 + t*Math.PI*5;
      const sc  = (Math.random()-0.5)*r*0.14;
      tgtB[o]   = Math.cos(a)*r+sc;
      tgtB[o+1] = (Math.random()-0.5)*3;
      tgtB[o+2] = Math.sin(a)*r+sc;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brt, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: VERT, fragmentShader: FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    /* golden orb */
    const oMat = new THREE.MeshBasicMaterial({
      color: IS_LIGHT ? 0x1e3a8a : 0xffd700, transparent: true, opacity: 0
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(2, 12, 12), oMat));

    gsap.to(mat.uniforms.uOpacity, { value: IS_LIGHT?0.72:1, duration:1.8, ease:'power2.out', delay:0.1 });
    gsap.to(oMat, { opacity: IS_LIGHT?0.5:0.9, duration:2, ease:'power2.out', delay:0.4 });

    const clock = new THREE.Clock();
    let fr = 0;
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      mat.uniforms.uTime.value = t;
      if (!TOUCH || fr%2===0) {
        for (let i = 0; i < N; i++) {
          const o = i*3;
          vel[o]   += (tgtB[o]  -pos[o])   * 0.022;
          vel[o+1] += (tgtB[o+1]-pos[o+1]) * 0.022;
          vel[o+2] += (tgtB[o+2]-pos[o+2]) * 0.022;
          pos[o]  +=vel[o];   vel[o]  *=0.87;
          pos[o+1]+=vel[o+1]; vel[o+1]*=0.87;
          pos[o+2]+=vel[o+2]; vel[o+2]*=0.87;
          sz[i] = szB[i]*(1+Math.sqrt(vel[o]*vel[o]+vel[o+1]*vel[o+1])*0.25);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate    = true;
      }
      pts.rotation.y = t * 0.025;
      camera.position.x += (M.x*5 - camera.position.x)*0.05;
      camera.position.y += (-M.y*3.5 - camera.position.y)*0.05;
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
