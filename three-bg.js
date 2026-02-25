/* ═══════════════════════════════════════════════════════════════════
   NEXUS  —  TECH DEVICES  3D DOT ANIMATION ENGINE
   Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════════

   5 000 spring-physics particles morph between 4 tech device shapes:

     Formation 0  ·  🎧  HEADPHONES
        Two filled disc ear-cups + arched headband above

     Formation 1  ·  📱  SMARTPHONE
        Portrait rectangle with edge frame, screen surface, camera notch
        and a small home-bar at the bottom

     Formation 2  ·  💻  LAPTOP  (3/4 view)
        Flat keyboard base + open screen tilted ~115° from base
        Seen from a slight elevation for full 3D effect

     Formation 3  ·  ⌚  SMARTWATCH
        Circular face + crown knob + curved band

   Special FX
     • Tech data-pulse sparks  (bright rings every 2 s)
     • Mouse repulsion field    (desktop only)
     • Click shockwave + scan-line flash
     • Device label flash on formation entry (GSAP)
     • Glitch burst every 30 s

   Mobile-friendly
     • 1 200 particles  (vs 5 000 desktop)
     • Physics every 2nd frame
     • 150 connection lines max  (vs 500 desktop)
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

  /* ══════════════════════════════════════════════
     SHADERS
  ══════════════════════════════════════════════ */
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
      float core  = 1.0 - smoothstep(0.0, 0.14, r);
      float mid   = (1.0 - smoothstep(0.14, 0.40, r)) * 0.45;
      float glow  = exp(-r * 9.5) * 0.8;
      /* per-particle breathing */
      float pulse = 0.82 + sin(uTime * 1.4 + vBright * 12.56) * 0.18;
      float alpha = (core + mid + glow) * uOpacity * vBright * pulse;
      vec3  col   = vColor + vec3(core * 0.6);
      gl_FragColor = vec4(col, alpha);
    }`;

  const LINE_VERT = `
    attribute float aAlpha;
    varying   float vAlpha;
    void main() { vAlpha = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const LINE_FRAG = `
    varying float vAlpha; uniform float uOpacity; uniform vec3 uColor;
    void main() { gl_FragColor = vec4(uColor, vAlpha * uOpacity); }`;

  /* ══════════════════════════════════════════════
     DEVICE FORMATIONS
  ══════════════════════════════════════════════ */
  function buildDeviceFormations(N) {
    const F = [
      new Float32Array(N * 3), // 0  Headphones
      new Float32Array(N * 3), // 1  Smartphone
      new Float32Array(N * 3), // 2  Laptop
      new Float32Array(N * 3), // 3  Smartwatch
    ];

    /* helper: assign a particle to a part based on range */
    function band(i, start, end, total) {
      return i >= Math.floor(total * start) && i < Math.floor(total * end);
    }

    for (let i = 0; i < N; i++) {
      const o = i * 3;
      const t = i / N; // 0..1 continuously

      /* ──────────────────────────────────────────
         FORMATION 0  —  HEADPHONES
         Segments:  0–35% left cup · 35–70% right cup · 70–100% headband
      ────────────────────────────────────────── */
      {
        const CUP_R   = 9.5;
        const SEP     = 22;   // centre-to-centre distance
        const TILT    = 0.22; // outward tilt of cups (radians)

        if (band(i, 0, 0.35, N)) {
          /* LEFT EAR CUP — filled disc */
          const r_   = CUP_R * Math.sqrt(Math.random());
          const ang  = Math.random() * Math.PI * 2;
          const cx   = r_ * Math.cos(ang);
          const cy   = r_ * Math.sin(ang);
          const cz   = (Math.random() - 0.5) * 4;
          /* slight outward tilt */
          F[0][o]   = -SEP/2 + cx * Math.cos(TILT) - cz * Math.sin(TILT);
          F[0][o+1] = cy;
          F[0][o+2] = cx * Math.sin(TILT) + cz * Math.cos(TILT);

        } else if (band(i, 0.35, 0.70, N)) {
          /* RIGHT EAR CUP — mirror */
          const r_   = CUP_R * Math.sqrt(Math.random());
          const ang  = Math.random() * Math.PI * 2;
          const cx   = r_ * Math.cos(ang);
          const cy   = r_ * Math.sin(ang);
          const cz   = (Math.random() - 0.5) * 4;
          F[0][o]   = SEP/2 + cx * Math.cos(-TILT) - cz * Math.sin(-TILT);
          F[0][o+1] = cy;
          F[0][o+2] = cx * Math.sin(-TILT) + cz * Math.cos(-TILT);

        } else {
          /* HEADBAND — smooth arc over the top */
          const bt   = (i / N - 0.70) / 0.30; // 0..1 along arc
          const ang  = bt * Math.PI;            // 0..π
          const arcR = SEP * 0.58;
          F[0][o]   = -Math.cos(ang) * arcR;
          F[0][o+1] = CUP_R + 0.5 + Math.sin(ang) * 11;
          F[0][o+2] = (Math.random() - 0.5) * 2;
        }
      }

      /* ──────────────────────────────────────────
         FORMATION 1  —  SMARTPHONE  (portrait)
         Segments: 0–20% frame · 20–70% screen · 70–85% notch/cam · 85–100% homebar
      ────────────────────────────────────────── */
      {
        const PW = 13, PH = 28, PD = 1.2;

        if (band(i, 0, 0.20, N)) {
          /* OUTER FRAME EDGES */
          const edge = Math.floor(Math.random() * 4);
          const rand = Math.random();
          if (edge === 0) { F[1][o]= -PW/2+(rand-0.5)*0.6; F[1][o+1]=-PH/2+rand*PH; F[1][o+2]=(Math.random()-0.5)*PD; }
          else if (edge===1){ F[1][o]=  PW/2+(rand-0.5)*0.6; F[1][o+1]=-PH/2+rand*PH; F[1][o+2]=(Math.random()-0.5)*PD; }
          else if (edge===2){ F[1][o]=-PW/2+rand*PW; F[1][o+1]= PH/2+(rand-0.5)*0.6;  F[1][o+2]=(Math.random()-0.5)*PD; }
          else              { F[1][o]=-PW/2+rand*PW; F[1][o+1]=-PH/2+(rand-0.5)*0.6;  F[1][o+2]=(Math.random()-0.5)*PD; }

        } else if (band(i, 0.20, 0.70, N)) {
          /* SCREEN SURFACE — slight icon-grid clustering */
          const gx = Math.floor(Math.random() * 4); // 4 columns
          const gy = Math.floor(Math.random() * 6); // 6 rows
          F[1][o]   = -PW/2 + 1.5 + (gx + Math.random()) * ((PW-3) / 4);
          F[1][o+1] = -PH/2 + 3.5 + (gy + Math.random()) * ((PH-7) / 6);
          F[1][o+2] = PD/2 + Math.random() * 0.2;

        } else if (band(i, 0.70, 0.85, N)) {
          /* CAMERA NOTCH at top */
          const ang  = Math.random() * Math.PI * 2;
          const r_   = Math.random() * 1.0;
          F[1][o]   = Math.cos(ang) * r_;
          F[1][o+1] = PH/2 - 1.2;
          F[1][o+2] = PD/2;

        } else {
          /* HOME BAR at bottom */
          F[1][o]   = (Math.random() - 0.5) * 5;
          F[1][o+1] = -PH/2 + 0.8 + (Math.random() - 0.5) * 0.3;
          F[1][o+2] = PD/2;
        }
      }

      /* ──────────────────────────────────────────
         FORMATION 2  —  LAPTOP  (3/4 elevated view)
         Base lies on slight tilt; screen opens 115° from base.
         Segments: 0–40% base · 40–100% screen
      ────────────────────────────────────────── */
      {
        const BW = 38, BD = 26;          // base width / depth
        const SW = 36, SH = 24;          // screen width / height
        const BASE_TILT_X = 0.35;        // tilt base down for 3/4 view
        const SCREEN_ANGLE = Math.PI * 0.64; // ~115°

        if (band(i, 0, 0.40, N)) {
          /* BASE / KEYBOARD */
          const bx = (Math.random() - 0.5) * BW;
          const bz = (Math.random() - 0.5) * BD;
          /* keyboard key clusters */
          const ky = (Math.random() - 0.5) * 0.8;
          /* tilt whole base: rotate around X */
          const c_ = Math.cos(BASE_TILT_X), s_ = Math.sin(BASE_TILT_X);
          F[2][o]   = bx;
          F[2][o+1] = ky * c_ - bz * s_;
          F[2][o+2] = ky * s_ + bz * c_;

        } else {
          /* SCREEN */
          const sx  = (Math.random() - 0.5) * SW;
          const sh  = Math.random() * SH;
          /* screen hinge at back of base z = -BD/2 (after tilt) */
          const hingeZ = -BD/2;
          const rawY   = sh * Math.sin(SCREEN_ANGLE);
          const rawZ   = hingeZ + sh * (-Math.cos(SCREEN_ANGLE));
          /* apply same tilt as base */
          const c_ = Math.cos(BASE_TILT_X), s_ = Math.sin(BASE_TILT_X);
          F[2][o]   = sx;
          F[2][o+1] = rawY * c_ - rawZ * s_;
          F[2][o+2] = rawY * s_ + rawZ * c_;
        }
      }

      /* ──────────────────────────────────────────
         FORMATION 3  —  SMARTWATCH
         Segments: 0–55% watch face · 55–80% top band · 80–100% bottom band
      ────────────────────────────────────────── */
      {
        const FACE_R = 11;
        const BAND_W = 8;

        if (band(i, 0, 0.55, N)) {
          /* CIRCULAR FACE */
          const r_   = FACE_R * Math.sqrt(Math.random());
          const ang  = Math.random() * Math.PI * 2;
          F[3][o]   = Math.cos(ang) * r_;
          F[3][o+1] = Math.sin(ang) * r_;
          F[3][o+2] = (Math.random() - 0.5) * 2;

        } else if (band(i, 0.55, 0.80, N)) {
          /* TOP BAND */
          const bt   = Math.random();
          /* band tapers as it goes up */
          const bw   = BAND_W * (0.55 + (1 - bt) * 0.45);
          F[3][o]   = (Math.random() - 0.5) * bw;
          F[3][o+1] = FACE_R + 1 + bt * 14;
          F[3][o+2] = (Math.random() - 0.5) * 1.5;

        } else {
          /* BOTTOM BAND */
          const bt   = Math.random();
          const bw   = BAND_W * (0.55 + (1 - bt) * 0.45);
          F[3][o]   = (Math.random() - 0.5) * bw;
          F[3][o+1] = -(FACE_R + 1 + bt * 14);
          F[3][o+2] = (Math.random() - 0.5) * 1.5;
        }
      }
    }

    return F;
  }

  /* device labels shown briefly on each morph-in */
  const DEVICE_NAMES = ['HEADPHONES', 'SMARTPHONE', 'LAPTOP', 'SMARTWATCH'];

  function flashLabel(name) {
    let el = document.getElementById('_dev_label');
    if (!el) {
      el = document.createElement('div');
      el.id = '_dev_label';
      el.style.cssText = [
        'position:fixed','left:50%','top:50%',
        'transform:translate(-50%,-50%)',
        'font-family:var(--font-display,Orbitron,sans-serif)',
        'font-size:clamp(2rem,5vw,4.5rem)',
        'font-weight:900',
        'letter-spacing:0.2em',
        'color:rgba(79,142,247,0)',
        'pointer-events:none',
        'z-index:9',
        'text-align:center',
        'user-select:none',
        'text-shadow:0 0 40px rgba(79,142,247,0.6)',
        'white-space:nowrap',
      ].join(';');
      document.body.appendChild(el);
    }
    el.textContent = name;
    gsap.killTweensOf(el.style);
    gsap.fromTo(el, { opacity: 0 }, {
      opacity: IS_LIGHT ? 0.12 : 0.18,
      duration: 0.5, ease: 'power2.out',
      onComplete: () => gsap.to(el, { opacity: 0, duration: 1.2, delay: 0.8, ease: 'power2.in' })
    });
  }

  /* ══════════════════════════════════════════════
     HERO SCENE
  ══════════════════════════════════════════════ */
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
    const camera = new THREE.PerspectiveCamera(68, W() / H(), 0.1, 1200);
    camera.position.z = 80;

    /* ── colour palettes ── */
    const P = IS_LIGHT ? [
      new THREE.Color(0x0f2460),
      new THREE.Color(0x1a3a8a),
      new THREE.Color(0x1e40af),
      new THREE.Color(0x0c1a45),
      new THREE.Color(0x2d5a9e),
    ] : [
      new THREE.Color(0x4f8ef7),  // electric blue
      new THREE.Color(0x00c4ff),  // cyan
      new THREE.Color(0x6b3fd4),  // violet
      new THREE.Color(0x00e5a0),  // teal-green
      new THREE.Color(0xffffff),  // white hot
    ];

    const LINE_COL = IS_LIGHT ? new THREE.Color(0x1e3a8a) : new THREE.Color(0x4f8ef7);

    /* ── particles ── */
    const N       = TOUCH ? 1200 : 5000;
    const pos     = new Float32Array(N * 3);
    const vel     = new Float32Array(N * 3);
    const col     = new Float32Array(N * 3);
    const sz      = new Float32Array(N);
    const szB     = new Float32Array(N);
    const brt     = new Float32Array(N);
    const brtLive = new Float32Array(N);
    const tgt     = new Float32Array(N * 3);

    const formations = buildDeviceFormations(N);
    const morph = { from: 0, to: 0, t: 1 };

    /* scatter init */
    for (let i = 0; i < N; i++) {
      const o = i * 3;
      pos[o]   = (Math.random() - 0.5) * 160;
      pos[o+1] = (Math.random() - 0.5) * 160;
      pos[o+2] = (Math.random() - 0.5) * 100 - 30;

      /* colour: each device part gets its accent tone */
      const t  = i / N;
      let c;
      if      (t < 0.40) c = P[0].clone().lerp(P[1], t / 0.40);
      else if (t < 0.70) c = P[1].clone().lerp(P[2], (t-0.40)/0.30);
      else if (t < 0.88) c = P[2].clone().lerp(P[3], (t-0.70)/0.18);
      else               c = P[4].clone();
      col[o]=c.r; col[o+1]=c.g; col[o+2]=c.b;

      szB[i]     = 0.55 + Math.random() * 1.6;
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

    /* ── connection lines ── */
    const MAX_LINES = TOUCH ? 150 : 500;
    const linePos   = new Float32Array(MAX_LINES * 6);
    const lineAlp   = new Float32Array(MAX_LINES * 2);
    const lineGeo   = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(35048));
    lineGeo.setAttribute('aAlpha',   new THREE.BufferAttribute(lineAlp, 1).setUsage(35048));
    const lineMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uColor: { value: LINE_COL } },
      vertexShader: LINE_VERT, fragmentShader: LINE_FRAG,
      transparent: true, depthWrite: false, blending: BLEND,
    });
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    let lineFrame = 0;
    function updateLines() {
      const p = pos;
      let   n = 0;
      const step = TOUCH ? 12 : 7;
      const MD   = 16;
      for (let i = 0; i < N && n < MAX_LINES; i += step) {
        for (let j = i+step; j < N && n < MAX_LINES; j += step) {
          const dx=p[i*3]-p[j*3], dy=p[i*3+1]-p[j*3+1], dz=p[i*3+2]-p[j*3+2];
          const d = Math.sqrt(dx*dx+dy*dy+dz*dz);
          if (d < MD) {
            const a = (1-d/MD)*0.7;
            linePos[n*6]  =p[i*3];   linePos[n*6+1]=p[i*3+1]; linePos[n*6+2]=p[i*3+2];
            linePos[n*6+3]=p[j*3];   linePos[n*6+4]=p[j*3+1]; linePos[n*6+5]=p[j*3+2];
            lineAlp[n*2]=a; lineAlp[n*2+1]=a;
            n++;
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.aAlpha.needsUpdate   = true;
      lineGeo.setDrawRange(0, n*2);
    }

    /* ── GSAP intro ── */
    const BASE_OP = IS_LIGHT ? 0.80 : 1.0;
    let introP = 0;
    gsap.to({ p:0 }, {
      p: 1, duration: 3.2, ease: 'power3.out', delay: 0.2,
      onUpdate: function() { introP = this.targets()[0].p; }
    });
    gsap.to(mat.uniforms.uOpacity,      { value: BASE_OP, duration: 2.5, ease:'power2.out', delay:0.2 });
    gsap.to(lineMat.uniforms.uOpacity,  { value: 1,       duration: 2.0, ease:'power2.out', delay:1.0 });

    /* ── formation morphing ── */
    let morphing = false;
    function nextMorph() {
      if (morphing) return;
      morphing = true;
      morph.from = morph.to;
      morph.to   = (morph.to + 1) % formations.length;
      morph.t    = 0;
      gsap.to(morph, {
        t: 1, duration: 3.2, ease: 'power2.inOut',
        onComplete: () => {
          flashLabel(DEVICE_NAMES[morph.to]);
          morphing = false;
          setTimeout(nextMorph, 9000);
        }
      });
    }
    setTimeout(() => { flashLabel(DEVICE_NAMES[0]); setTimeout(nextMorph, 9000); }, 3000);

    /* ── data-pulse sparks (replacing synapse fires) ── */
    const sparks = [];
    function triggerSpark() {
      const idx = Math.floor(Math.random() * N);
      sparks.push({ x:pos[idx*3], y:pos[idx*3+1], z:pos[idx*3+2],
                    r:0, maxR: 16 + Math.random()*10,
                    speed: 0.4 + Math.random()*0.25, intensity:1 });
    }
    setInterval(triggerSpark, TOUCH ? 3000 : 2000);

    function applySparks() {
      for (let i=0; i<N; i++) brtLive[i] = brt[i];
      for (let s=sparks.length-1; s>=0; s--) {
        const sp_ = sparks[s];
        sp_.r += sp_.speed;
        sp_.intensity = Math.max(0, 1 - sp_.r/sp_.maxR);
        if (sp_.r > sp_.maxR) { sparks.splice(s,1); continue; }
        for (let i=0; i<N; i++) {
          const dx=pos[i*3]-sp_.x, dy=pos[i*3+1]-sp_.y, dz=pos[i*3+2]-sp_.z;
          const d = Math.sqrt(dx*dx+dy*dy+dz*dz);
          const shell = Math.abs(d - sp_.r);
          if (shell < 3) {
            const boost = (1-shell/3)*sp_.intensity*(IS_LIGHT?0.35:0.65);
            brtLive[i] = Math.min(1, brtLive[i] + boost);
          }
        }
      }
      geo.attributes.aBright.needsUpdate = true;
    }

    /* ── physics ── */
    const SPRING = 0.028, DAMP = 0.87;
    const REP_R  = TOUCH ? 0 : 20, REP_F = 3.0;

    function mWorld() {
      const h = Math.tan((camera.fov*Math.PI/180)/2)*camera.position.z;
      return { x: M.x*h*(W()/H()), y: -M.y*h };
    }

    canvas.addEventListener('click', () => {
      const mw = mWorld();
      for (let i=0; i<N; i++) {
        const o=i*3, dx=pos[o]-mw.x, dy=pos[o+1]-mw.y;
        const d=Math.sqrt(dx*dx+dy*dy)||1;
        const f=Math.max(0,(35-d)/35)*5.5;
        vel[o]+=(dx/d)*f; vel[o+1]+=(dy/d)*f; vel[o+2]+=(Math.random()-0.5)*f*0.5;
      }
      triggerSpark();
    });

    setInterval(() => {
      for (let i=0; i<N; i++) {
        const o=i*3;
        vel[o]+=(Math.random()-0.5)*7;
        vel[o+1]+=(Math.random()-0.5)*7;
        vel[o+2]+=(Math.random()-0.5)*5;
      }
    }, 30000);

    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ── render loop ── */
    const clock = new THREE.Clock();
    let camX=0, camY=0, frame=0;

    function animate() {
      requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const sp = Math.min(scrollY/H(), 1);

      mat.uniforms.uTime.value = t;

      /* interpolate targets */
      const fA=formations[morph.from], fB=formations[morph.to], mt=morph.t;
      for (let i=0; i<N; i++) {
        const o=i*3;
        tgt[o]  = fA[o]   + (fB[o]  -fA[o])  *mt;
        tgt[o+1]= fA[o+1] + (fB[o+1]-fA[o+1])*mt;
        tgt[o+2]= fA[o+2] + (fB[o+2]-fA[o+2])*mt;
      }

      /* spring physics (every 2nd frame on mobile) */
      if (!TOUCH || frame%2===0) {
        const mw = mWorld();
        for (let i=0; i<N; i++) {
          const o=i*3;
          vel[o]  +=(tgt[o]  -pos[o])  *SPRING;
          vel[o+1]+=(tgt[o+1]-pos[o+1])*SPRING;
          vel[o+2]+=(tgt[o+2]-pos[o+2])*SPRING;
          if (REP_R>0) {
            const dx=pos[o]-mw.x, dy=pos[o+1]-mw.y;
            const d2=dx*dx+dy*dy;
            if (d2<REP_R*REP_R && d2>0.01) {
              const d=Math.sqrt(d2), f=(1-d/REP_R)*REP_F;
              vel[o]+=(dx/d)*f; vel[o+1]+=(dy/d)*f;
            }
          }
          pos[o]  +=vel[o];   vel[o]  *=DAMP;
          pos[o+1]+=vel[o+1]; vel[o+1]*=DAMP;
          pos[o+2]+=vel[o+2]; vel[o+2]*=DAMP;
          sz[i]=szB[i]*(1+Math.sqrt(vel[o]*vel[o]+vel[o+1]*vel[o+1])*0.32);
        }
        geo.attributes.position.needsUpdate = true;
        geo.attributes.aSize.needsUpdate    = true;
      }

      applySparks();
      if (frame%4===0) updateLines();

      camX += (M.x*10-camX)*0.042;
      camY += (-M.y*7 -camY)*0.042;
      camera.position.set(camX, camY-(1-introP)*10, 80+sp*46);
      camera.lookAt(0,0,0);

      const fade = Math.max(0, 1-sp*1.4);
      mat.uniforms.uOpacity.value      = BASE_OP*fade;
      lineMat.uniforms.uOpacity.value  = fade*(IS_LIGHT?0.30:0.50);

      renderer.render(scene, camera);
      frame++;
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = W()/H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(),H());
    });
  }

  /* ══════════════════════════════════════════════
     BANNER  (subpages — lightweight smartphone)
  ══════════════════════════════════════════════ */
  const bannerCanvas = document.getElementById('banner-canvas');
  if (bannerCanvas) initBanner(bannerCanvas);

  function initBanner(canvas) {
    const par = canvas.parentElement;
    const W_  = () => par ? par.offsetWidth  : window.innerWidth;
    const H_  = () => par ? par.offsetHeight : 420;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !TOUCH });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W_(), H_());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(65, W_()/H_(), 0.1, 500);
    camera.position.z = 50;

    const N   = TOUCH ? 500 : 1400;
    const pos = new Float32Array(N*3);
    const vel = new Float32Array(N*3);
    const col = new Float32Array(N*3);
    const sz  = new Float32Array(N);
    const szB = new Float32Array(N);
    const brt = new Float32Array(N);
    const tgt = new Float32Array(N*3);

    const C0 = IS_LIGHT ? new THREE.Color(0x0f2460) : new THREE.Color(0x4f8ef7);
    const C1 = IS_LIGHT ? new THREE.Color(0x1e40af) : new THREE.Color(0x00c4ff);
    const C2 = IS_LIGHT ? new THREE.Color(0x2d5a9e) : new THREE.Color(0x6b3fd4);

    /* banner uses the smartphone formation, scaled 60% */
    const PW=8, PH=17, PD=0.8;
    for (let i=0; i<N; i++) {
      const t_=i/N;
      if (t_<0.22) {
        const e=Math.floor(Math.random()*4), r=Math.random();
        if (e===0){tgt[i*3]=-PW/2; tgt[i*3+1]=-PH/2+r*PH;}
        else if(e===1){tgt[i*3]=PW/2; tgt[i*3+1]=-PH/2+r*PH;}
        else if(e===2){tgt[i*3]=-PW/2+r*PW; tgt[i*3+1]=PH/2;}
        else{tgt[i*3]=-PW/2+r*PW; tgt[i*3+1]=-PH/2;}
        tgt[i*3+2]=(Math.random()-0.5)*PD;
      } else {
        tgt[i*3]  = (-PW/2+1)+Math.random()*(PW-2);
        tgt[i*3+1]= (-PH/2+2)+Math.random()*(PH-3.5);
        tgt[i*3+2]= PD/2+Math.random()*0.2;
      }
      pos[i*3]  =(Math.random()-0.5)*90;
      pos[i*3+1]=(Math.random()-0.5)*60;
      pos[i*3+2]=(Math.random()-0.5)*50;

      const tc=i/N, c=tc<0.5?C0.clone().lerp(C1,tc*2):C1.clone().lerp(C2,(tc-0.5)*2);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      szB[i]=0.5+Math.random()*1.3; sz[i]=szB[i];
      brt[i]=0.45+Math.random()*0.55;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col,3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz, 1));
    geo.setAttribute('aBright',  new THREE.BufferAttribute(brt,1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity:{value:0}, uTime:{value:0} },
      vertexShader:VERT, fragmentShader:FRAG,
      transparent:true, depthWrite:false,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(geo, mat));

    gsap.to(mat.uniforms.uOpacity, { value:IS_LIGHT?0.75:1, duration:1.8, ease:'power2.out', delay:0.1 });

    const clock = new THREE.Clock();
    let fr=0;
    function animate() {
      requestAnimationFrame(animate);
      mat.uniforms.uTime.value = clock.getElapsedTime();
      if (!TOUCH || fr%2===0) {
        for (let i=0; i<N; i++) {
          const o=i*3;
          vel[o]  +=(tgt[o]  -pos[o])  *0.026;
          vel[o+1]+=(tgt[o+1]-pos[o+1])*0.026;
          vel[o+2]+=(tgt[o+2]-pos[o+2])*0.026;
          pos[o]  +=vel[o];   vel[o]  *=0.87;
          pos[o+1]+=vel[o+1]; vel[o+1]*=0.87;
          pos[o+2]+=vel[o+2]; vel[o+2]*=0.87;
          sz[i]=szB[i]*(1+Math.sqrt(vel[o]*vel[o]+vel[o+1]*vel[o+1])*0.25);
        }
        geo.attributes.position.needsUpdate=true;
        geo.attributes.aSize.needsUpdate=true;
      }
      camera.position.x+=(M.x*5-camera.position.x)*0.05;
      camera.position.y+=(-M.y*3.5-camera.position.y)*0.05;
      camera.lookAt(0,0,0);
      renderer.render(scene,camera);
      fr++;
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect=W_()/H_();
      camera.updateProjectionMatrix();
      renderer.setSize(W_(),H_());
    });
  }

})();
