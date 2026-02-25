/* ═══════════════════════════════════════════════════════════════
   3D BACKGROUND ENGINE  —  Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════
   Layers
     1. Glowing shader-based particle cloud (2 800 pts)
     2. Wireframe Torus Knot  (slow rotation)
     3. Wireframe Icosahedron (counter-rotation)
     4. Three nested floating rings
     5. Neural-network lines (dynamic, distance-based)
   Interactions
     • Mouse parallax  – camera tilts gently with cursor
     • Scroll morph    – cloud expands, objects fade, camera pulls back
     • GSAP intro      – scene flies in from distance on load
   Subpage banner
     • Lighter version: particle field + 3 rings + mouse parallax
═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('Three.js not loaded'); return; }

  /* ── Global mouse state ── */
  const mouse = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    mouse.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const isTouch = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  const DPR     = Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2);

  /* ══════════════════════════════════════════════════════════
     SHARED GLSL SHADERS
  ══════════════════════════════════════════════════════════ */
  const PARTICLE_VS = `
    attribute float aSize;
    attribute vec3  aColor;
    varying   vec3  vColor;
    void main() {
      vColor = aColor;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = aSize * (420.0 / -mv.z);
      gl_Position  = projectionMatrix * mv;
    }`;

  const PARTICLE_FS = `
    varying vec3 vColor;
    uniform float uOpacity;
    void main() {
      vec2  uv   = gl_PointCoord - 0.5;
      float r    = length(uv);
      if (r > 0.5) discard;
      float core = 1.0 - smoothstep(0.0, 0.20, r);
      float glow = exp(-r * 8.0) * 0.6;
      float a    = (core + glow) * uOpacity;
      gl_FragColor = vec4(vColor + vec3(glow * 0.4), a);
    }`;

  const LINE_VS = `
    attribute float aAlpha;
    varying   float vAlpha;
    void main() {
      vAlpha      = aAlpha;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`;

  const LINE_FS = `
    varying float vAlpha;
    uniform float uOpacity;
    void main() {
      gl_FragColor = vec4(0.31, 0.56, 0.97, vAlpha * uOpacity * 0.5);
    }`;

  /* ══════════════════════════════════════════════════════════
     HERO  — full 3-D scene
  ══════════════════════════════════════════════════════════ */
  const heroCanvas = document.getElementById('bg-canvas');
  if (heroCanvas) initHero(heroCanvas);

  function initHero(canvas) {
    const W = () => window.innerWidth;
    const H = () => window.innerHeight;

    /* renderer */
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isTouch });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);

    /* scene + camera */
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(70, W() / H(), 0.1, 1000);
    camera.position.set(0, 0, 68);

    /* ── Palette ── */
    const C1 = new THREE.Color(0x4f8ef7);
    const C2 = new THREE.Color(0x7b2dff);
    const C3 = new THREE.Color(0x00c4ff);

    /* ── PARTICLES ── */
    const N    = isTouch ? 1400 : 3000;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const sz   = new Float32Array(N);
    const ph   = new Float32Array(N);     // random phase per particle
    const ip   = new Float32Array(N * 3); // initial positions

    for (let i = 0; i < N; i++) {
      const layer = Math.random();
      const r  = layer < 0.65
        ? 22 + Math.random() * 38   // outer cloud
        : 4  + Math.random() * 18;  // bright inner core
      const th = Math.random() * Math.PI * 2;
      const ph_ = Math.acos(2 * Math.random() - 1);
      const x = r * Math.sin(ph_) * Math.cos(th);
      const y = r * Math.sin(ph_) * Math.sin(th);
      const z = r * Math.cos(ph_);

      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      ip[i*3] =x; ip[i*3+1] =y; ip[i*3+2] =z;

      const t = Math.random();
      const c = t < 0.5
        ? C1.clone().lerp(C2, t * 2)
        : C2.clone().lerp(C3, (t - 0.5) * 2);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;

      sz[i] = r < 18 ? 1.4 + Math.random() * 1.8 : 0.5 + Math.random() * 1.0;
      ph[i] = Math.random() * Math.PI * 2;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pGeo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    pGeo.setAttribute('aSize',    new THREE.BufferAttribute(sz, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader:   PARTICLE_VS,
      fragmentShader: PARTICLE_FS,
      transparent: true,
      depthWrite:  false,
      blending:    THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* ── TORUS KNOT ── */
    const tkGeo = new THREE.TorusKnotGeometry(15, 4.2, 200, 20, 2, 3);
    const tkMat = new THREE.MeshBasicMaterial({
      color: 0x4f8ef7, wireframe: true, transparent: true, opacity: 0,
    });
    const torusKnot = new THREE.Mesh(tkGeo, tkMat);
    scene.add(torusKnot);

    /* ── OUTER ICOSAHEDRON ── */
    const icoGeo = new THREE.IcosahedronGeometry(36, 1);
    const icoMat = new THREE.MeshBasicMaterial({
      color: 0x7b2dff, wireframe: true, transparent: true, opacity: 0,
    });
    const ico = new THREE.Mesh(icoGeo, icoMat);
    scene.add(ico);

    /* ── FLOATING RINGS ── */
    function makeRing(r, color, rx, ry) {
      const geo  = new THREE.TorusGeometry(r, 0.22, 8, 120);
      const mat  = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.rotation.x = rx;
      mesh.rotation.y = ry;
      scene.add(mesh);
      return { mesh, mat };
    }
    const ring1 = makeRing(24, 0x4f8ef7, Math.PI / 4, 0);
    const ring2 = makeRing(17, 0x7b2dff, Math.PI / 3, Math.PI / 5);
    const ring3 = makeRing(10, 0x00c4ff, Math.PI / 2, Math.PI / 4);

    /* ── NEURAL NETWORK LINES ── */
    const MAX_LINES = isTouch ? 180 : 450;
    const linePos   = new Float32Array(MAX_LINES * 2 * 3);
    const lineAlp   = new Float32Array(MAX_LINES * 2);
    const lineGeo   = new THREE.BufferGeometry();
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3).setUsage(35048)); // DYNAMIC_DRAW
    lineGeo.setAttribute('aAlpha',   new THREE.BufferAttribute(lineAlp, 1).setUsage(35048));
    const lineMat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: LINE_VS, fragmentShader: LINE_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const lines = new THREE.LineSegments(lineGeo, lineMat);
    scene.add(lines);

    let lineFrameCount = 0;
    function updateLines() {
      const p  = pGeo.attributes.position.array;
      let  n   = 0;
      const step = isTouch ? 18 : 9;
      const MAX_D = 24;
      for (let i = 0; i < N && n < MAX_LINES; i += step) {
        for (let j = i + step; j < N && n < MAX_LINES; j += step) {
          const dx = p[i*3]-p[j*3], dy = p[i*3+1]-p[j*3+1], dz = p[i*3+2]-p[j*3+2];
          const d  = Math.sqrt(dx*dx + dy*dy + dz*dz);
          if (d < MAX_D) {
            const a = (1 - d / MAX_D) * 0.85;
            const b = n * 6;
            linePos[b  ]=p[i*3];   linePos[b+1]=p[i*3+1]; linePos[b+2]=p[i*3+2];
            linePos[b+3]=p[j*3];   linePos[b+4]=p[j*3+1]; linePos[b+5]=p[j*3+2];
            lineAlp[n*2]   = a;
            lineAlp[n*2+1] = a;
            n++;
          }
        }
      }
      lineGeo.attributes.position.needsUpdate = true;
      lineGeo.attributes.aAlpha.needsUpdate   = true;
      lineGeo.setDrawRange(0, n * 2);
    }

    /* ── GSAP INTRO ── */
    let introP = 0; // 0 → 1
    gsap.to({ p: 0 }, {
      p: 1, duration: 3, ease: 'power3.out', delay: 0.2,
      onUpdate: function () { introP = this.targets()[0].p; },
    });
    // wireframe + ring fade-in via GSAP on their opacity directly
    gsap.to(tkMat,            { opacity: 0.14, duration: 2.2, ease: 'power2.out', delay: 0.5 });
    gsap.to(icoMat,           { opacity: 0.06, duration: 2.8, ease: 'power2.out', delay: 0.7 });
    gsap.to(ring1.mat,        { opacity: 0.22, duration: 2.0, ease: 'power2.out', delay: 0.9 });
    gsap.to(ring2.mat,        { opacity: 0.14, duration: 2.0, ease: 'power2.out', delay: 1.1 });
    gsap.to(ring3.mat,        { opacity: 0.10, duration: 2.0, ease: 'power2.out', delay: 1.3 });
    gsap.to(lineMat.uniforms.uOpacity, { value: 1, duration: 2, ease: 'power2.out', delay: 1.5 });

    /* ── STATE ── */
    let scrollY  = 0;
    let camX = 0, camY = 0;
    let introCamZ = 130; // starts far, approaches 68

    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ── ANIMATION LOOP ── */
    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const sp = Math.min(scrollY / H(), 1);

      /* intro camera fly-in */
      const introCamTarget = 68;
      const camZ = introCamTarget + (1 - introP) * 62;

      /* wave-animate particles */
      for (let i = 0; i < N; i++) {
        const o = i * 3, f = ph[i];
        pos[o]   = ip[o]   * (1 + sp * 0.9) + Math.sin(t * 0.55 + f)       * 2.4;
        pos[o+1] = ip[o+1] * (1 + sp * 0.9) + Math.cos(t * 0.45 + f)       * 1.9;
        pos[o+2] = ip[o+2]                   + Math.sin(t * 0.35 + f * 1.5) * 1.6;
      }
      pGeo.attributes.position.needsUpdate = true;

      /* neural lines — every 4th frame for perf */
      lineFrameCount++;
      if (lineFrameCount % 4 === 0) updateLines();

      /* rotate scene objects */
      torusKnot.rotation.x = t * 0.11;
      torusKnot.rotation.y = t * 0.07;
      ico.rotation.x = -t * 0.04;
      ico.rotation.y =  t * 0.036;
      ring1.mesh.rotation.z = t * 0.18;
      ring2.mesh.rotation.z = -t * 0.14;
      ring3.mesh.rotation.z = t * 0.24;
      particles.rotation.y  = t * 0.034;
      particles.rotation.x  = sp * 0.4;

      /* mouse parallax */
      camX += (mouse.x * 9 - camX) * 0.04;
      camY += (-mouse.y * 7 - camY) * 0.04;
      camera.position.set(camX, camY, camZ + sp * 42);
      camera.lookAt(0, 0, 0);

      /* scroll-based fades */
      const fade = Math.max(0, 1 - sp * 1.4);
      pMat.uniforms.uOpacity.value = introP * fade;
      lineMat.uniforms.uOpacity.value = introP * fade;
      tkMat.opacity  = 0.14 * fade;
      icoMat.opacity = 0.06 * fade;
      ring1.mat.opacity = 0.22 * fade;
      ring2.mat.opacity = 0.14 * fade;
      ring3.mat.opacity = 0.10 * fade;

      renderer.render(scene, camera);
    }
    animate();

    /* ── RESIZE ── */
    window.addEventListener('resize', () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });

    /* ── CLICK RIPPLE ── */
    window.addEventListener('click', e => {
      if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') return;
      // brief scale-out then back on particles group
      gsap.to(particles.scale, {
        x: 1.08, y: 1.08, z: 1.08, duration: 0.25, ease: 'power2.out',
        onComplete: () => gsap.to(particles.scale, { x: 1, y: 1, z: 1, duration: 0.6, ease: 'elastic.out(1,0.5)' }),
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     PAGE BANNER  — lightweight version for subpages
  ══════════════════════════════════════════════════════════ */
  const bannerCanvas = document.getElementById('banner-canvas');
  if (bannerCanvas) initBanner(bannerCanvas);

  function initBanner(canvas) {
    const W  = () => canvas.parentElement ? canvas.parentElement.offsetWidth  : window.innerWidth;
    const H_ = () => canvas.parentElement ? canvas.parentElement.offsetHeight : 420;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !isTouch });
    renderer.setPixelRatio(DPR);
    renderer.setSize(W(), H_());
    renderer.setClearColor(0x000000, 0);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(68, W() / H_(), 0.1, 500);
    camera.position.z = 44;

    const C1 = new THREE.Color(0x4f8ef7);
    const C2 = new THREE.Color(0x7b2dff);
    const C3 = new THREE.Color(0x00c4ff);

    /* Particles */
    const N   = isTouch ? 600 : 1200;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const sz  = new Float32Array(N);
    const ph  = new Float32Array(N);
    const ip  = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 90;
      const y = (Math.random() - 0.5) * 36;
      const z = (Math.random() - 0.5) * 50 - 5;
      pos[i*3]=x; pos[i*3+1]=y; pos[i*3+2]=z;
      ip[i*3] =x; ip[i*3+1] =y; ip[i*3+2] =z;
      const t = Math.random();
      const c = t < 0.5 ? C1.clone().lerp(C2, t*2) : C2.clone().lerp(C3, (t-0.5)*2);
      col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
      sz[i]  = 0.5 + Math.random() * 1.4;
      ph[i]  = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(sz,  1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 } },
      vertexShader: PARTICLE_VS, fragmentShader: PARTICLE_FS,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    const pts = new THREE.Points(geo, mat);
    scene.add(pts);

    /* Rings */
    function addRing(r, color, rx, ry, rz) {
      const g = new THREE.TorusGeometry(r, 0.2, 8, 100);
      const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0 });
      const mesh = new THREE.Mesh(g, m);
      mesh.rotation.set(rx, ry, rz);
      scene.add(mesh);
      return { mesh, mat: m };
    }
    const r1 = addRing(20, 0x4f8ef7, Math.PI/4, 0, 0);
    const r2 = addRing(13, 0x7b2dff, Math.PI/3, Math.PI/6, 0);
    const r3 = addRing(8,  0x00c4ff, Math.PI/2, Math.PI/4, Math.PI/6);

    /* Central torus knot (small) */
    const tkG = new THREE.TorusKnotGeometry(7, 1.8, 100, 12, 2, 3);
    const tkM = new THREE.MeshBasicMaterial({ color: 0x4f8ef7, wireframe: true, transparent: true, opacity: 0 });
    const tk  = new THREE.Mesh(tkG, tkM);
    scene.add(tk);

    /* GSAP intro */
    let introP = 0;
    gsap.to({ p: 0 }, {
      p: 1, duration: 2, ease: 'power3.out', delay: 0.1,
      onUpdate: function () { introP = this.targets()[0].p; },
    });
    gsap.to(r1.mat, { opacity: 0.2, duration: 1.5, ease: 'power2.out', delay: 0.3 });
    gsap.to(r2.mat, { opacity: 0.14, duration: 1.5, ease: 'power2.out', delay: 0.5 });
    gsap.to(r3.mat, { opacity: 0.1,  duration: 1.5, ease: 'power2.out', delay: 0.7 });
    gsap.to(tkM,    { opacity: 0.12, duration: 1.8, ease: 'power2.out', delay: 0.4 });

    /* Loop */
    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      for (let i = 0; i < N; i++) {
        const o = i * 3, f = ph[i];
        pos[o]   = ip[o]   + Math.sin(t * 0.5 + f) * 1.8;
        pos[o+1] = ip[o+1] + Math.cos(t * 0.4 + f) * 1.2;
        pos[o+2] = ip[o+2] + Math.sin(t * 0.3 + f) * 0.9;
      }
      geo.attributes.position.needsUpdate = true;

      r1.mesh.rotation.z = t * 0.18;
      r2.mesh.rotation.z = -t * 0.14;
      r3.mesh.rotation.z = t * 0.22;
      tk.rotation.x = t * 0.12;
      tk.rotation.y = t * 0.08;

      mat.uniforms.uOpacity.value = introP * 0.9;

      const cx = mouse.x * 5;
      const cy = -mouse.y * 3;
      camera.position.x += (cx - camera.position.x) * 0.05;
      camera.position.y += (cy - camera.position.y) * 0.05;
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
