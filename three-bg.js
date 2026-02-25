/* ═══════════════════════════════════════════════════════════════════
   NEXUS  —  TECH DEVICES  3D BACKGROUND
   Three.js r134  +  GSAP 3
   ═══════════════════════════════════════════════════════════════════

   Three floating wireframe tech devices:
     • Laptop   — open lid with keyboard detail, screen glow lines
     • Phone    — body with screen, camera, buttons
     • Headphones — headband, ear cups, cushion rings

   Scene behaviour:
     • Devices fly in from off-screen on load (GSAP, staggered)
     • Each device bobs on Y with its own phase (GSAP repeat/yoyo)
     • Slow individual Y-rotation for 3-D depth
     • Mouse parallax shifts the camera
     • Click → all devices spring-scale (elastic)
     • Scroll → whole scene fades and camera retreats

   Mobile optimisation:
     • Fewer particle count (500 vs 2 000)
     • DPR capped at 1.5
     • Simplified geometry segments
═══════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('[3DBG] Three.js not loaded'); return; }

  /* ── mouse ── */
  const M = { x: 0, y: 0 };
  document.addEventListener('mousemove', e => {
    M.x = (e.clientX / window.innerWidth  - 0.5) * 2;
    M.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const TOUCH    = window.matchMedia('(hover:none) and (pointer:coarse)').matches;
  const DPR      = Math.min(window.devicePixelRatio, TOUCH ? 1.5 : 2);
  const IS_LIGHT = document.documentElement.classList.contains('light-theme');

  /* ── colours ── */
  const WIRE_HEX   = IS_LIGHT ? 0x1e3a8a : 0x4f8ef7;
  const ACCENT_HEX = IS_LIGHT ? 0x0c6dc7 : 0x00c4ff;
  const WIRE_OP    = IS_LIGHT ? 0.65 : 0.55;
  const ACCENT_OP  = IS_LIGHT ? 0.80 : 0.75;
  const PART_OP    = IS_LIGHT ? 0.55 : 0.45;

  /* ── helpers ── */
  function edgeMesh(geo, mat) {
    return new THREE.LineSegments(new THREE.EdgesGeometry(geo), mat);
  }
  function makeMat(hex, op) {
    return new THREE.LineBasicMaterial({ color: hex, transparent: true, opacity: op, depthWrite: false });
  }
  function lineMesh(points, mat) {
    const g = new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p)));
    return new THREE.Line(g, mat);
  }

  /* ════════════════════════════════════════════════════
     BUILD DEVICES
  ════════════════════════════════════════════════════ */
  function buildLaptop(wm, am) {
    const g = new THREE.Group();
    const SEG = TOUCH ? 6 : 10;

    /* base (keyboard body) */
    g.add(edgeMesh(new THREE.BoxGeometry(8.2, 0.45, 5.8), wm));

    /* keyboard rows — decorative lines */
    for (let z = -2.1; z <= 2.1; z += 0.7) {
      g.add(lineMesh([[-3.6, 0.23, z], [3.6, 0.23, z]], am));
    }
    for (let x = -3.2; x <= 3.2; x += 0.8) {
      g.add(lineMesh([[x, 0.23, -2.1], [x, 0.23, 2.1]], am));
    }

    /* touchpad */
    g.add(edgeMesh(new THREE.BoxGeometry(2.2, 0.04, 1.4), am)
      .translateY(0.24).translateZ(1.9));

    /* screen pivot — hinged at back edge of base */
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.22, -2.9);
    pivot.rotation.x = -1.92; // ~110° open angle

    /* screen bezel */
    const bezel = edgeMesh(new THREE.BoxGeometry(8.2, 5.2, 0.28), wm);
    bezel.position.set(0, 2.6, 0);
    pivot.add(bezel);

    /* screen display glow */
    const display = edgeMesh(new THREE.BoxGeometry(7.5, 4.5, 0.08), am);
    display.position.set(0, 2.6, 0.1);
    pivot.add(display);

    /* screen content lines (fake UI) */
    for (let y = 0.5; y <= 4.2; y += 0.65) {
      const lineW = 5.5 - y * 0.3;
      const l = lineMesh([[-lineW/2, y + 0.0, 0.15], [lineW/2, y + 0.0, 0.15]], am);
      pivot.add(l);
    }

    /* camera dot on bezel top */
    const cam = edgeMesh(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8), am);
    cam.position.set(0, 5.08, 0.1);
    pivot.add(cam);

    g.add(pivot);
    return g;
  }

  function buildPhone(wm, am) {
    const g = new THREE.Group();
    const SEG = TOUCH ? 10 : 18;

    /* body */
    g.add(edgeMesh(new THREE.BoxGeometry(3.0, 6.2, 0.42), wm));

    /* screen face */
    const scr = edgeMesh(new THREE.BoxGeometry(2.55, 5.45, 0.1), am);
    scr.position.z = 0.17;
    g.add(scr);

    /* camera pill (top notch area) */
    const cPill = edgeMesh(new THREE.CylinderGeometry(0.15, 0.15, 0.55, SEG), am);
    cPill.rotation.z = Math.PI / 2;
    cPill.position.set(0, 2.6, 0.17);
    g.add(cPill);

    /* front camera dot */
    const fCam = edgeMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.06, SEG), am);
    fCam.position.set(0, 2.6, 0.22);
    g.add(fCam);

    /* home indicator bar */
    g.add(lineMesh([[-0.65, -2.78, 0.22], [0.65, -2.78, 0.22]], am));

    /* UI screen content lines */
    for (let y = -1.8; y <= 2.1; y += 0.55) {
      const lw = 1.8 - Math.abs(y) * 0.18;
      g.add(lineMesh([[-lw, y, 0.22], [lw, y, 0.22]], am));
    }

    /* side buttons */
    const btnL = edgeMesh(new THREE.BoxGeometry(0.07, 0.7, 0.18), wm);
    btnL.position.set(-1.535, 0.9, 0);
    g.add(btnL);
    const btnL2 = edgeMesh(new THREE.BoxGeometry(0.07, 0.7, 0.18), wm);
    btnL2.position.set(-1.535, 0.0, 0);
    g.add(btnL2);
    const btnR = edgeMesh(new THREE.BoxGeometry(0.07, 0.9, 0.18), wm);
    btnR.position.set(1.535, 0.7, 0);
    g.add(btnR);

    return g;
  }

  function buildHeadphones(wm, am) {
    const g = new THREE.Group();
    const SEG = TOUCH ? 12 : 24;

    /* headband — half torus */
    const band = edgeMesh(new THREE.TorusGeometry(3.4, 0.22, 8, SEG, Math.PI), wm);
    band.rotation.z = Math.PI / 2;
    g.add(band);

    /* adjustable arms */
    [-3.4, 3.4].forEach(x => {
      const arm = edgeMesh(new THREE.CylinderGeometry(0.2, 0.2, 1.8, 6), wm);
      arm.position.set(x, -0.9, 0);
      g.add(arm);
    });

    /* ear cups + cushion rings */
    [-3.4, 3.4].forEach(x => {
      /* outer shell */
      const cup = edgeMesh(new THREE.CylinderGeometry(1.4, 1.4, 0.7, SEG), wm);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(x, -1.9, 0);
      g.add(cup);

      /* cushion ring */
      const cushion = edgeMesh(new THREE.TorusGeometry(1.25, 0.26, 8, SEG), am);
      cushion.rotation.y = Math.PI / 2;
      cushion.position.set(x, -1.9, 0);
      g.add(cushion);

      /* speaker mesh circle */
      const face = edgeMesh(new THREE.CircleGeometry(1.0, SEG), am);
      face.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      face.position.set(x + (x > 0 ? 0.38 : -0.38), -1.9, 0);
      g.add(face);

      /* inner ring */
      const inner = edgeMesh(new THREE.TorusGeometry(0.55, 0.06, 6, SEG), am);
      inner.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      inner.position.copy(face.position);
      g.add(inner);
    });

    /* cable (left cup → down) */
    g.add(lineMesh([[-4.8, -1.9, 0], [-4.8, -5.5, 0], [-4.2, -6.5, 0]], am));

    return g;
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
    const camera = new THREE.PerspectiveCamera(65, W() / H(), 0.1, 500);
    camera.position.z = 46;

    /* shared materials — opacity controlled centrally */
    const wireMat   = makeMat(WIRE_HEX,   0);
    const accentMat = makeMat(ACCENT_HEX, 0);

    /* ── build devices ── */
    const laptop     = buildLaptop(wireMat, accentMat);
    const phone      = buildPhone(wireMat, accentMat);
    const headphones = buildHeadphones(wireMat, accentMat);

    /* final resting positions */
    const LAPTOP_POS     = { x: -6, y: -2.5, z: -2 };
    const PHONE_POS      = { x:  7, y: -1,   z:  3 };
    const HEADPHONES_POS = { x:  0, y:  9.5, z: -4 };

    /* start positions (off-screen) */
    laptop.position.set(LAPTOP_POS.x - 70, LAPTOP_POS.y, LAPTOP_POS.z);
    phone.position.set(PHONE_POS.x + 70, PHONE_POS.y, PHONE_POS.z);
    headphones.position.set(HEADPHONES_POS.x, HEADPHONES_POS.y + 70, HEADPHONES_POS.z);

    laptop.rotation.y     =  0.28;
    phone.rotation.y      = -0.32;
    headphones.rotation.y =  0.08;

    scene.add(laptop, phone, headphones);

    /* ── particles (ambient glow cloud) ── */
    const NP   = TOUCH ? 500 : 2000;
    const pPos = new Float32Array(NP * 3);
    const C1 = new THREE.Color(WIRE_HEX), C2 = new THREE.Color(ACCENT_HEX);
    for (let i = 0; i < NP; i++) {
      const r  = 12 + Math.random() * 28;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      pPos[i*3]   = r * Math.sin(ph) * Math.cos(th) + (Math.random()-0.5) * 6;
      pPos[i*3+1] = r * Math.sin(ph) * Math.sin(th) * 0.65;
      pPos[i*3+2] = r * Math.cos(ph) - 4;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: WIRE_HEX,
      size: IS_LIGHT ? 0.18 : 0.22,
      transparent: true, opacity: 0,
      sizeAttenuation: true, depthWrite: false,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    /* ── GSAP intro ── */
    /* 1. material fade-in */
    let introFade = 0;
    gsap.to({ f: 0 }, {
      f: 1, duration: 2.2, ease: 'power2.out', delay: 0.3,
      onUpdate: function () { introFade = this.targets()[0].f; }
    });
    gsap.to(pMat, { opacity: PART_OP, duration: 2.5, ease: 'power2.out', delay: 0.8 });

    /* 2. fly-in then start bobbing */
    gsap.to(laptop.position, {
      x: LAPTOP_POS.x, duration: 1.8, ease: 'power3.out', delay: 0.3,
      onComplete: () => gsap.to(laptop.position, {
        y: LAPTOP_POS.y - 1, duration: 2.2, ease: 'sine.inOut', repeat: -1, yoyo: true
      })
    });
    gsap.to(phone.position, {
      x: PHONE_POS.x, duration: 1.8, ease: 'power3.out', delay: 0.55,
      onComplete: () => gsap.to(phone.position, {
        y: PHONE_POS.y - 1, duration: 2.4, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.4
      })
    });
    gsap.to(headphones.position, {
      y: HEADPHONES_POS.y, duration: 1.8, ease: 'power3.out', delay: 0.8,
      onComplete: () => gsap.to(headphones.position, {
        y: HEADPHONES_POS.y - 1, duration: 2.0, ease: 'sine.inOut', repeat: -1, yoyo: true, delay: 0.8
      })
    });

    /* ── click → spring pulse ── */
    canvas.addEventListener('click', () => {
      const targets = [laptop.scale, phone.scale, headphones.scale];
      gsap.to(targets, {
        x: 1.14, y: 1.14, z: 1.14, duration: 0.18, ease: 'power3.out', stagger: 0.06,
        onComplete: () => gsap.to(targets, {
          x: 1, y: 1, z: 1, duration: 1, ease: 'elastic.out(1, 0.5)', stagger: 0.06
        })
      });
    });

    /* ── scroll ── */
    let scrollY = 0;
    window.addEventListener('scroll', () => { scrollY = window.scrollY; });

    /* ── animation loop ── */
    const clock = new THREE.Clock();
    let camX = 0, camY = 0;

    function animate() {
      requestAnimationFrame(animate);
      const t  = clock.getElapsedTime();
      const sp = Math.min(scrollY / H(), 1);
      const scrollFade = Math.max(0, 1 - sp * 1.4);
      const totalFade  = scrollFade * introFade;

      /* device Y-rotation (gentle sway) */
      laptop.rotation.y     = 0.28  + Math.sin(t * 0.22) * 0.18;
      phone.rotation.y      = -0.32 + Math.sin(t * 0.19 + 1.1) * 0.14;
      headphones.rotation.y = 0.08  + Math.sin(t * 0.24 + 2.0) * 0.20;
      headphones.rotation.z = Math.sin(t * 0.15) * 0.04;

      /* slow scene drift for depth */
      scene.rotation.y = Math.sin(t * 0.055) * 0.10;

      /* particles orbit */
      particles.rotation.y = t * 0.022;
      particles.rotation.x = Math.sin(t * 0.08) * 0.04;

      /* materials fade */
      wireMat.opacity   = WIRE_OP   * totalFade;
      accentMat.opacity = ACCENT_OP * totalFade;
      pMat.opacity      = PART_OP   * scrollFade;

      /* mouse parallax */
      camX += (M.x * 8  - camX) * 0.04;
      camY += (-M.y * 5 - camY) * 0.04;
      camera.position.set(camX, camY, 46 + sp * 32);
      camera.lookAt(0, 2, 0);

      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
    });
  }

  /* ════════════════════════════════════════════════════
     SUBPAGE BANNER  (phone + particles)
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
    const camera = new THREE.PerspectiveCamera(65, W_() / H_(), 0.1, 300);
    camera.position.z = 36;

    const wm = makeMat(WIRE_HEX, 0);
    const am = makeMat(ACCENT_HEX, 0);

    /* one phone + one laptop side by side */
    const bPhone  = buildPhone(wm, am);
    bPhone.position.set(5, 0, 0);
    bPhone.rotation.y = -0.3;
    bPhone.scale.setScalar(0.9);

    const bLaptop = buildLaptop(wm, am);
    bLaptop.position.set(-7, -2, 2);
    bLaptop.rotation.y = 0.3;
    bLaptop.scale.setScalar(0.75);

    /* start off-screen */
    bPhone.position.x  += 60;
    bLaptop.position.x -= 60;

    scene.add(bPhone, bLaptop);

    /* particles */
    const NP  = TOUCH ? 250 : 900;
    const pP  = new Float32Array(NP * 3);
    for (let i = 0; i < NP; i++) {
      pP[i*3]   = (Math.random()-0.5) * 50;
      pP[i*3+1] = (Math.random()-0.5) * 24;
      pP[i*3+2] = (Math.random()-0.5) * 30 - 5;
    }
    const pG = new THREE.BufferGeometry();
    pG.setAttribute('position', new THREE.BufferAttribute(pP, 3));
    const pM = new THREE.PointsMaterial({
      color: WIRE_HEX, size: 0.16, transparent: true, opacity: 0,
      sizeAttenuation: true, depthWrite: false,
      blending: IS_LIGHT ? THREE.NormalBlending : THREE.AdditiveBlending,
    });
    scene.add(new THREE.Points(pG, pM));

    /* intro */
    let iFade = 0;
    gsap.to({ f:0 }, { f:1, duration:2, ease:'power2.out', delay:0.1,
      onUpdate: function(){ iFade = this.targets()[0].f; } });
    gsap.to(pM, { opacity: PART_OP * 0.8, duration: 2, ease:'power2.out', delay:0.4 });

    gsap.to(bPhone.position, { x: 5, duration: 1.5, ease:'power3.out', delay:0.15,
      onComplete: () => gsap.to(bPhone.position, { y:-0.8, duration:2.2, ease:'sine.inOut', repeat:-1, yoyo:true })
    });
    gsap.to(bLaptop.position, { x: -7, duration: 1.5, ease:'power3.out', delay:0.35,
      onComplete: () => gsap.to(bLaptop.position, { y:-2.8, duration:2.5, ease:'sine.inOut', repeat:-1, yoyo:true, delay:0.5 })
    });

    const clock = new THREE.Clock();
    function animate() {
      requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      bPhone.rotation.y  = -0.3 + Math.sin(t * 0.2)  * 0.15;
      bLaptop.rotation.y =  0.3 + Math.sin(t * 0.18 + 1) * 0.14;
      wm.opacity = WIRE_OP   * iFade;
      am.opacity = ACCENT_OP * iFade;
      camera.position.x += (M.x * 4 - camera.position.x) * 0.05;
      camera.position.y += (-M.y * 2.5 - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);
      renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
      camera.aspect = W_() / H_();
      camera.updateProjectionMatrix();
      renderer.setSize(W_(), H_());
    });
  }

})();
