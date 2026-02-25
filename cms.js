/* ══════════════════════════════════════════════
   NEXUS CMS Loader
   Reads from localStorage (admin edits) or
   falls back to cms-data.json (source of truth)
   ══════════════════════════════════════════════ */

(function () {
  const LS_KEY = 'nexusCMS';

  /* ── get data ── */
  function getData() {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  }

  /* ── apply data to DOM ── */
  function applyData(d) {
    applySettings(d.settings);
    applyHero(d.hero);
    applyCountdown(d.countdown);
    renderServices(d.services);
    applyAbout(d.about);
    renderTeam(d.team);
    renderBlog(d.blog);
    applyContact(d.contact);
  }

  /* ── helpers ── */
  function set(id, text)     { const el = document.getElementById(id); if (el) el.textContent = text; }
  function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function setSrc(id, src)   { const el = document.getElementById(id); if (el) el.src = src; }
  function setHref(id, href) { const el = document.getElementById(id); if (el) el.href = href; }

  /* ── SETTINGS ── */
  function applySettings(s) {
    if (!s) return;
    document.querySelectorAll('.cms-company').forEach(el => el.textContent = s.companyName);
    document.querySelectorAll('.cms-tagline').forEach(el => el.textContent = s.tagline);
    document.querySelectorAll('.cms-logo-mark').forEach(el => el.textContent = s.logoMark);
    document.title = s.companyName + ' | ' + s.tagline;
    if (s.accentColor) {
      document.documentElement.style.setProperty('--accent', s.accentColor);
      const r = parseInt(s.accentColor.slice(1,3),16);
      const g = parseInt(s.accentColor.slice(3,5),16);
      const b = parseInt(s.accentColor.slice(5,7),16);
      document.documentElement.style.setProperty('--accent-glow', `rgba(${r},${g},${b},0.35)`);
      document.documentElement.style.setProperty('--border-accent', `rgba(${r},${g},${b},0.25)`);
    }
    set('cms-footer-text', s.footerText);
  }

  /* ── HERO ── */
  function applyHero(h) {
    if (!h) return;
    set('cms-hero-badge', h.badge);
    const l1 = document.getElementById('cms-hero-l1');
    const l2 = document.getElementById('cms-hero-l2');
    const l3 = document.getElementById('cms-hero-l3');
    if (l1) { l1.textContent = h.line1; l1.dataset.text = h.line1; }
    if (l2) { l2.textContent = h.line2; l2.dataset.text = h.line2; }
    if (l3) { l3.textContent = h.line3; l3.dataset.text = h.line3; }
    set('cms-hero-sub', h.subtitle);
    set('cms-cta1', h.cta1);
    set('cms-cta2', h.cta2);
    const s1 = document.getElementById('cms-s1v');
    const s2 = document.getElementById('cms-s2v');
    const s3 = document.getElementById('cms-s3v');
    if (s1) { s1.textContent = '0'; s1.dataset.target = h.stat1Val; }
    if (s2) { s2.textContent = '0'; s2.dataset.target = h.stat2Val; }
    if (s3) { s3.textContent = '0'; s3.dataset.target = h.stat3Val; }
    const p1 = document.getElementById('cms-s1p'); if (p1) p1.textContent = h.stat1Suf;
    const p2 = document.getElementById('cms-s2p'); if (p2) p2.textContent = h.stat2Suf;
    const p3 = document.getElementById('cms-s3p'); if (p3) p3.textContent = h.stat3Suf;
    set('cms-s1l', h.stat1Label);
    set('cms-s2l', h.stat2Label);
    set('cms-s3l', h.stat3Label);
  }

  /* ── COUNTDOWN ── */
  function applyCountdown(c) {
    if (!c) return;
    set('cms-cd-tag',   c.sectionTag);
    set('cms-cd-title', c.title);
    set('cms-cd-sub',   c.subtitle);
  }

  /* ── SERVICES (dynamic render) ── */
  function renderServices(services) {
    const container = document.getElementById('cms-services-layout');
    if (!container || !services) return;

    const featured = services.find(s => s.featured) || services[0];
    const sides    = services.filter(s => !s.featured);

    const techTags = t => t.split(',').map(x =>
      `<span>${x.trim()}</span>`).join('');

    container.innerHTML = `
      <article class="game-card big tilt-card">
        <div class="game-card-media">
          <img src="${featured.image}" alt="${featured.title}">
          <div class="card-lines"></div>
        </div>
        <div class="game-card-overlay">
          ${featured.badge ? `<div class="game-badge blink">${featured.badge}</div>` : ''}
          <div class="game-info">
            <span class="game-genre">${featured.genre}</span>
            <h3 class="game-name">${featured.title}</h3>
            <p>${featured.desc}</p>
            <div class="game-platforms">${techTags(featured.tech)}</div>
            <a href="#contact" class="btn btn-primary magnetic sm"><span class="btn-text">Get a Quote</span></a>
          </div>
        </div>
        <div class="game-trailer-btn"><div class="trailer-ring"></div><span>→</span></div>
      </article>
      <div class="games-side">
        ${sides.map(s => `
          <article class="game-card small tilt-card">
            <div class="game-card-media">
              <img src="${s.image}" alt="${s.title}">
            </div>
            <div class="game-card-overlay">
              <div class="game-info">
                <span class="game-genre">${s.genre}</span>
                <h3 class="game-name">${s.title}</h3>
                <p>${s.desc}</p>
                <div class="game-platforms">${techTags(s.tech)}</div>
                <a href="#contact" class="btn btn-outline magnetic sm"><span class="btn-text">Learn More</span></a>
              </div>
            </div>
          </article>`).join('')}
      </div>`;
  }

  /* ── ABOUT ── */
  function applyAbout(a) {
    if (!a) return;
    set('cms-about-title', a.title);
    set('cms-about-hl',    a.highlight);
    set('cms-about-p1',    a.p1);
    set('cms-about-p2',    a.p2);
    setSrc('cms-about-img', a.image);
    set('cms-badge-icon',  a.badgeIcon);
    set('cms-badge-title', a.badgeTitle);
    set('cms-badge-sub',   a.badgeSub);
    if (a.features) {
      a.features.forEach((f, i) => {
        set(`cms-feat${i+1}-icon`,  f.icon);
        set(`cms-feat${i+1}-title`, f.title);
        set(`cms-feat${i+1}-sub`,   f.sub);
      });
    }
  }

  /* ── TEAM (dynamic render) ── */
  function renderTeam(team) {
    const grid = document.getElementById('cms-team-grid');
    if (!grid || !team) return;
    grid.innerHTML = team.map((m, i) => `
      <div class="team-card tilt-card" data-delay="${i*100}">
        <div class="team-img">
          <img src="${m.photo}" alt="${m.name}">
          <div class="team-social">
            <a href="#" aria-label="LinkedIn">in</a>
            <a href="#" aria-label="Twitter">𝕏</a>
            <a href="#" aria-label="Portfolio">↗</a>
          </div>
        </div>
        <div class="team-info">
          <h3>${m.name}</h3>
          <span class="team-role">${m.role}</span>
        </div>
      </div>`).join('');
  }

  /* ── BLOG (dynamic render) ── */
  function renderBlog(blog) {
    const grid = document.getElementById('cms-news-grid');
    if (!grid || !blog) return;

    const featured = blog.find(b => b.featured) || blog[0];
    const smalls   = blog.filter(b => !b.featured);

    grid.innerHTML = `
      <article class="news-card big">
        <div class="news-img">
          <img src="${featured.image}" alt="${featured.title}">
          <div class="news-date-badge">
            <span class="n-day">${featured.day}</span>
            <span class="n-month">${featured.month}</span>
          </div>
        </div>
        <div class="news-body">
          <span class="news-cat">${featured.cat}</span>
          <h3><a href="#">${featured.title}</a></h3>
          ${featured.excerpt ? `<p>${featured.excerpt}</p>` : ''}
          <a href="#" class="news-more">Read Full Article →</a>
        </div>
      </article>
      <div class="news-smalls">
        ${smalls.map(b => `
          <article class="news-card small">
            <div class="news-img">
              <img src="${b.image}" alt="${b.title}">
              <div class="news-date-badge">
                <span class="n-day">${b.day}</span>
                <span class="n-month">${b.month}</span>
              </div>
            </div>
            <div class="news-body">
              <span class="news-cat">${b.cat}</span>
              <h3><a href="#">${b.title}</a></h3>
              <a href="#" class="news-more">Read More →</a>
            </div>
          </article>`).join('')}
      </div>`;
  }

  /* ── CONTACT ── */
  function applyContact(c) {
    if (!c) return;
    set('cms-contact-title', c.title);
    set('cms-contact-hl',    c.highlight);
    set('cms-contact-desc',  c.desc);
    const list = document.getElementById('cms-channel-list');
    if (list && c.channels) {
      list.innerHTML = c.channels.map(ch => `
        <a href="${ch.link}" class="channel-item magnetic">
          <span class="channel-icon">${ch.icon}</span>
          <div><strong>${ch.title}</strong><span>${ch.sub}</span></div>
          <span class="channel-arrow">→</span>
        </a>`).join('');
    }
  }

  /* ── BOOT ── */
  function boot() {
    const saved = getData();
    if (saved) {
      applyData(saved);
    } else {
      // Fetch defaults from cms-data.json
      fetch('cms-data.json')
        .then(r => r.json())
        .then(d => applyData(d))
        .catch(() => {/* keep static HTML as fallback */});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
