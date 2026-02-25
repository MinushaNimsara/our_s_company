/* ═══════════════════════════════════════════════════════════════════
   NEXUS  —  FLUID WAVE GRID  3D BACKGROUND
   Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════════

   Hero  (full canvas)
   ───────────────────
   ①  Animated wave-grid mesh  (80×80 subdivisions)
      • Multi-frequency sine waves create organic ocean-like motion.
      • Grid lines coloured by vertex height  →  deep blue valleys,
        bright cyan peaks.
      • Mouse moves  →  ripple waves expand outward from cursor.
      • Click        →  large splash ripple.
   ②  Floating particle haze  (1 500 pts)  for mid-ground depth.
   ③  Atmospheric bloom sphere  (background glow).
   ④  Scroll  →  mesh tilts further, camera pulls back, opacity fades.

   Subpage banner
   ──────────────
   Smaller wave grid (40×40) + 600 particles.

   Mobile
   ──────
   • 40×40 grid (vs 80×80)
   • 600 particles (vs 1 500)
   • No mouse ripple
   • Physics every 2nd frame
   • DPR capped at 1.5
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('[3DBG] Three.js not loaded'); return; }

  const TOUCH    = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  const DPR      = Math.min(window.devicePixelRatio, TOUCH ? 1.5 : 2);
  const IS_LIGHT = document.documentElement.classList.contains('light-theme');

  /* shared normalised mouse */
  const M = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    M.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    M.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  /* ════════════════════════════════════════════════════
     SHADERS  —  wave mesh
  ════════════════════════════════════════════════════ */
  const WAVE_VERT = `
    varying vec2  vUv;
    varying float vHeight;
    varying float vDist;   /* distance from grid centre */
    void main() {
      vUv    = uv;
      vHeight= position.y;
      vDist  = length(position.xz) / 80.0;   /* 0..1 across the grid */
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  const WAVE_FRAG = `
    varying vec2  vUv;
    varying float vHeight;
    varying float vDist;
    uniform float uOpacity;
    uniform float uTime;
    uniform int   uLight;

    void main() {
      /* grid lines in UV space */
      float segs   = 40.0;
      vec2  g      = abs(fract(vUv * segs) - 0.5);
      float lineX  = 1.0 - smoothstep(0.0, 0.035, g.x);
      float lineY  = 1.0 - smoothstep(0.0, 0.035, g.y);
      float line   = max(lineX, lineY);
      if (line < 0.05) discard;   /* blank between grid lines */

      /* height-driven colour */
      float h = clamp((vHeight + 6.0) / 12.0, 0.0, 1.0);

      vec3 colDeep, colPeak;
      if (uLight == 1) {
        colDeep = vec3(0.08, 0.20, 0.60);   /* dark navy  */
        colPeak = vec3(0.18, 0.45, 0.95);   /* bright blue */
      } else {
        colDeep = vec3(0.18, 0.32, 0.75);   /* blue        */
        colPeak = vec3(0.00, 0.78, 1.00);   /* cyan        */
      }
      vec3 col = mix(colDeep, colPeak, h);

      /* brightness pulse at peaks */
      float bright = 0.55 + h * 0.45 + line * 0.25;

      /* edge fade — grid fades to transparent at the perimeter */
      float edgeFade = 1.0 - smoothstep(0.55, 1.0, vDist);

      float alpha = line * bright * edgeFade * uOpacity;
      gl_FragColor = vec4(col, alpha);
    }`;

  /* ════════════════════════════════════════════════════
     PARTICLE SHADERS  (floating haze)
  ════════════════════════════════════════════════════ */
  const PART_VERT = `
    attribute float aSize;
    attribute vec3  aColor;
    varying   vec3  vColor;
    void main() {
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (400.0 / -mv.z);
      gl_Position  = projectionMatrix * mv;
    }`;

  const PART_FRAG = `
    varying vec3  vColor;
    uniform float uOpacity;
    uniform float uTime;
    void main() {
      vec2  uv  = gl_PointCoord - 0.5;
      float r   = length(uv);
      if (r > 0.5) discard;
      float core = 1.0 - smoothstep(0.0, 0.20, r);
      float glow = exp(-r * 8.0) * 0.65;
      float pulse = 0.82 + sin(uTime * 0.9 + vColor.r * 9.42) * 0.18;
      gl_FragColor = vec4(vColor + core * 0.4, (core + glow) * uOpacity * pulse);
    }`;

  /* ════════════════════════════════════════════════════
     HERO
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
    const camera = new THREE.PerspectiveCamera(65, W() / H(), 0.1, 1000);
    camera.position.set(0, 28, 72);
    camera.lookAt(0, 0, 0);

    /* ── wave grid ── */
    const SEGS  = TOUCH ? 40 : 80;
    const SIZE  = 160;
    const wGeo  = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
    wGeo.rotateX(-Math.PI * 0.38);   /* tilt like a horizon */
    wGeo.translate(0, -8, -10);

    /* keep original XZ for wave calculation */
    const baseXZ = [];
    const wPos   = wGeo.attributes.position.array;
    for (let i = 0; i < wPos.length; i += 3) {
      baseXZ.push(wPos[i], wPos[i+2]);  /* x, z pairs */
    }

    const wMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime:    { value: 0 },
        uLight:   { value: IS_LIGHT ? 1 : 0 },
      },
      vertexShader:   WAVE_VERT,
      fragmentShader: WAVE_FRAG,
      transparent: true,
      depthWrite:  false,
      side: THREE.DoubleSide,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const waveMesh = new THREE.Mesh(wGeo, wMat);
    scene.add(waveMesh);

    /* ── mouse ripples ── */
    const ripples = [];   /* { x, z, age, maxAge, amp } */

    function addRipple(wx, wz, amp) {
      if (TOUCH) return;
      ripples.push({ x: wx, z: wz, age: 0, maxAge: 80, amp });
    }

    /* convert normalised mouse to approximate world XZ on the tilted plane */
    function mouseToGrid() {
      const aspect = W() / H();
      const fovRad = camera.fov * Math.PI / 180;
      const halfH  = Math.tan(fovRad / 2) * camera.position.z;
      return {
        x: M.x * halfH * aspect,
        z: -M.y * halfH * 0.5,
      };
    }

    let lastRippleT = 0;
    document.addEventListener('mousemove', () => {
      const now = performance.now();
      if (now - lastRippleT > 220) {   /* throttle */
        const gp = mouseToGrid();
        addRipple(gp.x, gp.z, 1.8);
        lastRippleT = now;
      }
    });

    canvas.addEventListener('click', () => {
      const gp = mouseToGrid();
      addRipple(gp.x, gp.z, 5.0);
    });

    /* ── floating particle haze ── */
    const NP   = TOUCH ? 600 : 1500;
    const pPos = new Float32Array(NP * 3);
    const pCol = new Float32Array(NP * 3);
    const pSz  = new Float32Array(NP);
    const pPh  = new Float32Array(NP);  /* phase for float animation */
    const pSpd = new Float32Array(NP);  /* float speed */

    const C0 = IS_LIGHT ? new THREE.Color(0x0f2460) : new THREE.Color(0x4f8ef7);
    const C1 = IS_LIGHT ? new THREE.Color(0x1e40af) : new THREE.Color(0x00c4ff);
    const C2 = IS_LIGHT ? new THREE.Color(0x1e3a8a) : new THREE.Color(0xffffff);

    for (let i = 0; i < NP; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * 160;
      pPos[i*3+1] = Math.random() * 60 - 5;
      pPos[i*3+2] = (Math.random() - 0.5) * 100 - 20;
      const t = Math.random();
      const c = t < 0.6 ? C0.clone().lerp(C1, t/0.6) : C1.clone().lerp(C2, (t-0.6)/0.4);
      pCol[i*3]=c.r; pCol[i*3+1]=c.g; pCol[i*3+2]=c.b;
      pSz[i]  = 0.4 + Math.random() * 1.2;
      pPh[i]  = Math.random() * Math.PI * 2;
      pSpd[i] = 0.3 + Math.random() * 0.7;
    }

    const pInitY = pPos.slice();   /* keep initial Y for float cycle */

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute('aColor',   new THREE.BufferAttribute(pCol, 3));
    pGeo.setAttribute('aSize',    new THREE.BufferAttribute(pSz,  1));
    const pMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: PART_VERT, fragmentShader: PART_FRAG,
      transparent: true, depthWrite: false,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(pGeo, pMat));

    /* ── atmospheric glow sphere (dark mode only) ── */
    let glowMesh = null;
    if (!IS_LIGHT) {
      const glowGeo = new THREE.SphereGeometry(45, 16, 16);
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x1a3a8a, transparent: true, opacity: 0, side: THREE.BackSide,
      });
      glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(0, 10, -20);
      scene.add(glowMesh);
      gsap.to(glowMat, { opacity: 0.55, duration: 3, ease: 'power2.out', delay: 0.5 });
    }

    /* ── GSAP intro ── */
    gsap.to(wMat.uniforms.uOpacity, { value: IS_LIGHT ? 0.75 : 0.9, duration: 2.5, ease: 'power2.out', delay: 0.2 });
    gsap.to(pMat.uniforms.uOpacity, { value: IS_LIGHT ? 0.6  : 0.7, duration: 2.5, ease: 'power2.out', delay: 0.6 });
    gsap.from(camera.position, { y: 60, z: 130, duration: 3, ease: 'power3.out', delay: 0.1 });

    /* ── scroll ── */
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ── animation loop ── */
    const clock = new THREE.Clock();
    let camX = 0, camY = 28, frame = 0;

    function animate() {
      requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const sp = Math.min(scrollY / H(), 1);

      wMat.uniforms.uTime.value = t;
      pMat.uniforms.uTime.value = t;

      /* ── age / remove old ripples ── */
      for (let r = ripples.length - 1; r >= 0; r--) {
        ripples[r].age++;
        if (ripples[r].age > ripples[r].maxAge) ripples.splice(r, 1);
      }

      /* ── wave vertex displacement (skip every 2nd frame on mobile) ── */
      if (!TOUCH || frame % 2 === 0) {
        let vi = 0;
        for (let i = 0; i < wPos.length; i += 3) {
          const bx = baseXZ[vi*2];
          const bz = baseXZ[vi*2 + 1];

          /* base multi-frequency waves */
          let y  = Math.sin(bx * 0.055 + t * 0.70) * 3.2;
              y += Math.sin(bz * 0.070 + t * 1.05) * 2.0;
              y += Math.sin((bx + bz) * 0.038 + t * 0.55) * 1.5;
              y += Math.sin(bx * 0.120 + t * 1.40) * 0.8;
              y += Math.cos(bz * 0.090 + t * 0.85) * 0.6;

          /* mouse ripples */
          for (const rip of ripples) {
            const dx    = bx - rip.x;
            const dz    = bz - rip.z;
            const d     = Math.sqrt(dx*dx + dz*dz);
            const prog  = rip.age / rip.maxAge;
            const waveR = prog * 50;
            const shell = Math.abs(d - waveR);
            if (shell < 6) {
              y += Math.cos(shell * 0.9) * rip.amp * (1 - prog) * (1 - shell/6);
            }
          }

          wPos[i + 1] = y;
          vi++;
        }
        wGeo.attributes.position.needsUpdate = true;
        wGeo.computeVertexNormals();
      }

      /* ── float particles ── */
      if (!TOUCH || frame % 2 === 0) {
        for (let i = 0; i < NP; i++) {
          pPos[i*3+1] = pInitY[i*3+1] + Math.sin(t * pSpd[i] * 0.6 + pPh[i]) * 3.5;
        }
        pGeo.attributes.position.needsUpdate = true;
      }

      /* ── camera: mouse parallax ── */
      camX += (M.x * 6  - camX) * 0.035;
      camY += (-M.y * 3 + 28 + sp * 8 - camY) * 0.035;
      camera.position.x = camX;
      camera.position.y = camY;
      camera.position.z = 72 + sp * 40;
      camera.lookAt(0, 0, 0);

      /* ── scroll fades ── */
      const fade = Math.max(0, 1 - sp * 1.5);
      wMat.uniforms.uOpacity.value = (IS_LIGHT ? 0.75 : 0.9) * fade;
      pMat.uniforms.uOpacity.value = (IS_LIGHT ? 0.6  : 0.7) * fade;
      if (glowMesh) glowMesh.material.opacity = 0.55 * fade;

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
     SUBPAGE BANNER
  ════════════════════════════════════════════════════ */
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
    const camera = new THREE.PerspectiveCamera(65, W_() / H_(), 0.1, 500);
    camera.position.set(0, 22, 55);
    camera.lookAt(0, 0, 0);

    /* small wave grid */
    const SEGS  = TOUCH ? 24 : 40;
    const bGeo  = new THREE.PlaneGeometry(120, 120, SEGS, SEGS);
    bGeo.rotateX(-Math.PI * 0.38);
    bGeo.translate(0, -6, -8);

    const bXZ = [];
    const bPos = bGeo.attributes.position.array;
    for (let i = 0; i < bPos.length; i += 3) bXZ.push(bPos[i], bPos[i+2]);

    const bMat = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime:    { value: 0 },
        uLight:   { value: IS_LIGHT ? 1 : 0 },
      },
      vertexShader: WAVE_VERT, fragmentShader: WAVE_FRAG,
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    scene.add(new THREE.Mesh(bGeo, bMat));

    /* particles */
    const NP  = TOUCH ? 300 : 600;
    const ppPos = new Float32Array(NP * 3);
    const ppCol = new Float32Array(NP * 3);
    const ppSz  = new Float32Array(NP);
    const ppPh  = new Float32Array(NP);
    const ppInitY = new Float32Array(NP);
    const C0b = IS_LIGHT ? new THREE.Color(0x0f2460) : new THREE.Color(0x4f8ef7);
    const C1b = IS_LIGHT ? new THREE.Color(0x1e40af) : new THREE.Color(0x00c4ff);
    for (let i = 0; i < NP; i++) {
      ppPos[i*3]   = (Math.random()-0.5)*120;
      ppPos[i*3+1] = Math.random()*50 - 5;
      ppPos[i*3+2] = (Math.random()-0.5)*80 - 15;
      ppInitY[i]   = ppPos[i*3+1];
      const t = Math.random();
      const c = C0b.clone().lerp(C1b, t);
      ppCol[i*3]=c.r; ppCol[i*3+1]=c.g; ppCol[i*3+2]=c.b;
      ppSz[i] = 0.35 + Math.random()*1.0;
      ppPh[i] = Math.random()*Math.PI*2;
    }
    const ppGeo = new THREE.BufferGeometry();
    ppGeo.setAttribute('position', new THREE.BufferAttribute(ppPos, 3));
    ppGeo.setAttribute('aColor',   new THREE.BufferAttribute(ppCol, 3));
    ppGeo.setAttribute('aSize',    new THREE.BufferAttribute(ppSz,  1));
    const ppMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      vertexShader: PART_VERT, fragmentShader: PART_FRAG,
      transparent: true, depthWrite: false,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(ppGeo, ppMat));

    gsap.to(bMat.uniforms.uOpacity,  { value: IS_LIGHT?0.7:0.85, duration:1.8, ease:'power2.out', delay:0.1 });
    gsap.to(ppMat.uniforms.uOpacity, { value: IS_LIGHT?0.5:0.65, duration:2.0, ease:'power2.out', delay:0.4 });

    const clock = new THREE.Clock();
    let fr = 0;
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      bMat.uniforms.uTime.value  = t;
      ppMat.uniforms.uTime.value = t;

      if (!TOUCH || fr % 2 === 0) {
        let vi = 0;
        for (let i = 0; i < bPos.length; i += 3) {
          const bx = bXZ[vi*2], bz = bXZ[vi*2+1];
          bPos[i+1] = Math.sin(bx*0.06+t*0.7)*2.8
                    + Math.sin(bz*0.08+t*1.0)*1.8
                    + Math.sin((bx+bz)*0.04+t*0.55)*1.2;
          vi++;
        }
        bGeo.attributes.position.needsUpdate = true;

        for (let i = 0; i < NP; i++)
          ppPos[i*3+1] = ppInitY[i] + Math.sin(t*0.55 + ppPh[i]) * 2.5;
        ppGeo.attributes.position.needsUpdate = true;
      }

      camera.position.x += (M.x * 5 - camera.position.x) * 0.04;
      camera.position.y += (-M.y * 2.5 + 22 - camera.position.y) * 0.04;
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
