/* ══════════════════════════════════════════════
   QUANTUMEXE CMS Loader
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
    applyReviews(d.reviews || DEFAULTS.reviews);
    renderServices(d.services);
    applyAbout(d.about);
    renderTeam(d.team);
    renderBlog(d.blog);
    renderProjects(d.projects);
    applyContact(d.contact);
    try {
      window.dispatchEvent(new CustomEvent('cms:ready'));
    } catch (e) {}
  }

  /* ── helpers ── */
  function set(id, text)     { const el = document.getElementById(id); if (el) el.textContent = text; }
  function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }
  function setSrc(id, src)   { const el = document.getElementById(id); if (el) el.src = src; }
  function setHref(id, href) { const el = document.getElementById(id); if (el) el.href = href; }

  /* ── SETTINGS ── */
  function formatCompanyName(name, html) {
    if (!name) return '';
    const upper = name.toUpperCase();
    if (upper.endsWith('EXE') && upper.length > 3) {
      const base = name.slice(0, -3);
      const accent = name.slice(-3);
      return html
        ? base + '<span class="logo-accent">' + accent + '</span>'
        : base + accent;
    }
    return name;
  }

  function applySettings(s) {
    if (!s) return;
    document.querySelectorAll('.cms-company').forEach(el => {
      // Keep "Contact Us" loader label when arriving via #contact from other pages
      if (el.id === 'loaderText' && document.documentElement.classList.contains('loader-contact')) {
        return;
      }
      const useHtml = el.classList.contains('logo-title') || el.classList.contains('loader-text');
      const text = formatCompanyName(s.companyName, useHtml);
      if (useHtml) el.innerHTML = text;
      else el.textContent = text;
      if (el.dataset.text !== undefined) el.dataset.text = formatCompanyName(s.companyName, false);
    });
    document.querySelectorAll('.cms-tagline').forEach(el => el.textContent = s.tagline);
    document.querySelectorAll('.cms-logo-mark').forEach(el => el.textContent = s.logoMark);
    document.title = s.companyName + ' | ' + s.tagline;

    // Logo image: show image and hide letter mark when an image is set
    const logoImgs  = document.querySelectorAll('.cms-logo-img');
    const logoMarks = document.querySelectorAll('.cms-logo-mark');
    if (s.logoImage) {
      logoImgs.forEach(img  => { img.src = s.logoImage; img.style.display = 'block'; });
      logoMarks.forEach(el  => { el.style.display = 'none'; });
    } else {
      logoImgs.forEach(img  => { img.style.display = 'none'; });
      logoMarks.forEach(el  => { el.style.display = ''; });
    }

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
  }

  /* ── GOOGLE REVIEWS ── */
  function renderStars(rating) {
    const full = Math.round(rating);
    return '★'.repeat(full) + '☆'.repeat(5 - full);
  }

  function applyReviews(r) {
    if (!r) return;
    set('cms-reviews-tag', (r.sectionTag || '').replace(/^\/\/\s*/, ''));
    set('cms-reviews-title', r.title);
    set('cms-reviews-sub', r.subtitle);
    set('cms-reviews-score', r.rating);
    const stars = document.getElementById('cms-reviews-stars');
    if (stars) {
      stars.textContent = renderStars(r.rating);
      stars.setAttribute('aria-label', r.rating + ' out of 5 stars');
    }
    set('cms-reviews-count', 'Based on ' + r.reviewCount + ' Google reviews');
    const viewLink = document.getElementById('cms-reviews-view');
    const writeLink = document.getElementById('cms-reviews-write');
    if (viewLink && r.googleUrl) viewLink.href = r.googleUrl;
    if (writeLink && r.writeReviewUrl) writeLink.href = r.writeReviewUrl;

    const grid = document.getElementById('cms-reviews-grid');
    if (!grid || !r.items) return;
    grid.innerHTML = r.items.map(item => `
      <article class="review-card">
        <div class="review-card-header">
          <img class="review-avatar" src="${item.avatar}" alt="${item.name}">
          <div>
            <strong class="review-name">${item.name}</strong>
            <span class="review-date">${item.date}</span>
          </div>
          <div class="review-card-stars" aria-label="${item.rating} stars">${'★'.repeat(item.rating)}</div>
        </div>
        <p class="review-text">${item.text}</p>
        <span class="review-source">
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Posted on Google
        </span>
      </article>
    `).join('');
  }

  /* ── SERVICES (dynamic render) ── */
  function renderServices(services) {
    const container = document.getElementById('cms-services-layout');
    if (!container || !services) return;

    // Homepage preview: show only the first 4 services (full list on services.html)
    const preview = services.slice(0, 4);

    const techTags = t => (t || '').split(',').filter(Boolean).map(x =>
      `<span>${x.trim()}</span>`).join('');

    container.classList.add('services-grid');
    container.innerHTML = preview.map(s => `
      <article class="game-card small tilt-card">
        <div class="game-card-media">
          <img src="${s.image}" alt="${s.title}" loading="lazy">
        </div>
        <div class="game-card-overlay">
          <div class="game-info">
            <span class="game-genre">${s.genre || ''}</span>
            <h3 class="game-name">${s.title}</h3>
            <p>${s.desc || ''}</p>
            <div class="game-platforms">${techTags(s.tech)}</div>
            <a href="#contact" class="btn btn-outline magnetic sm"><span class="btn-text">Learn More</span></a>
          </div>
        </div>
      </article>`).join('');
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
            <a href="${m.linkedin  ||'#'}" ${m.linkedin  &&m.linkedin !=='#'?'target="_blank" rel="noopener"':''} aria-label="LinkedIn">in</a>
            <a href="${m.twitter   ||'#'}" ${m.twitter   &&m.twitter  !=='#'?'target="_blank" rel="noopener"':''} aria-label="Twitter">𝕏</a>
            <a href="${m.portfolio ||'#'}" ${m.portfolio &&m.portfolio!=='#'?'target="_blank" rel="noopener"':''} aria-label="Portfolio">↗</a>
          </div>
        </div>
        <div class="team-info">
          <h3>${m.name}</h3>
          <span class="team-role">${m.role}</span>
          ${m.bio ? `<p class="team-bio">${m.bio}</p>` : ''}
        </div>
      </div>`).join('');
  }

  /* ── BLOG (dynamic render) ── */
  function renderBlog(blog) {
    const grid = document.getElementById('cms-news-grid');
    if (!grid || !blog) return;

    const featured = blog.find(b => b.featured) || blog[0];
    const smalls   = blog.filter(b => b !== featured);

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

  /* ── PROJECTS (dynamic render) ── */
  const LANG_COLORS = {
    JavaScript:'#f7df1e', TypeScript:'#3178c6', Python:'#3572a5',
    Java:'#b07219', CSS:'#563d7c', HTML:'#e34c26', PHP:'#4F5D95',
    Ruby:'#701516', Go:'#00add8', Rust:'#dea584', 'C#':'#178600',
    'C++':'#f34b7d', Swift:'#fa7343', Kotlin:'#a97bff', Dart:'#00b4ab',
    Vue:'#41b883', Shell:'#89e051',
  };

  function renderProjects(projects) {
    const section = document.getElementById('projects');
    const grid    = document.getElementById('cms-projects-grid');
    if (!grid || !projects) return;

    // Section text
    set('cms-proj-tag',   (projects.sectionTag || 'OUR WORK').replace(/^\/\/\s*/, ''));
    set('cms-proj-title', projects.title      || 'Featured');
    set('cms-proj-hl',    projects.highlight  || 'Projects');
    set('cms-proj-desc',  projects.desc       || '');

    const visible  = (projects.items || []).filter(p => p.visible !== false);
    const preview  = visible.slice(0, 3); // show max 3 on homepage

    if (!visible.length) {
      if (section) section.style.display = 'none';
      return;
    }

    if (section) section.style.display = '';

    grid.innerHTML = preview.map(p => {
      const lc   = LANG_COLORS[p.language] || 'var(--accent)';
      const tags = [
        p.language ? `<span class="proj-lang-dot" style="background:${lc}"></span><span class="proj-tag">${p.language}</span>` : '',
        ...(p.topics || []).slice(0, 4).map(t => `<span class="proj-tag">${t}</span>`),
      ].filter(Boolean).join('');

      return `
        <div class="project-card tilt-card reveal-fade">
          ${p.image
            ? `<div class="project-card-img-wrap"><img class="project-card-img" src="${p.image}" alt="${p.name}"></div>`
            : `<div class="project-lang-bar" style="background:${lc};box-shadow:0 0 12px ${lc}55"></div>`}
          <div class="project-card-body">
            <div class="project-card-top">
              <h3 class="project-name">${p.name}</h3>
              ${(p.stars || p.forks) ? `
                <div class="project-counts">
                  ${p.stars ? `<span class="project-count">★ ${p.stars}</span>` : ''}
                  ${p.forks ? `<span class="project-count">⑂ ${p.forks}</span>` : ''}
                </div>` : ''}
            </div>
            ${p.description ? `<p class="project-desc">${p.description}</p>` : ''}
            ${tags ? `<div class="project-tags">${tags}</div>` : ''}
            <div class="project-links">
              ${p.githubUrl ? `<a href="${p.githubUrl}" target="_blank" rel="noopener" class="btn btn-outline magnetic sm"><span class="btn-text">⌥ GitHub</span></a>` : ''}
              ${p.liveUrl   ? `<a href="${p.liveUrl}"   target="_blank" rel="noopener" class="btn btn-primary magnetic sm"><span class="btn-text">Live Demo →</span></a>` : ''}
            </div>
          </div>
        </div>`;
    }).join('');

    // "View all projects" button — always visible when there are projects
    const ghWrap = document.getElementById('cms-proj-github-wrap');
    const ghLink = document.getElementById('cms-proj-github-link');
    if (ghWrap) {
      ghLink.href          = 'projects.html';
      ghLink.removeAttribute('target');
      ghWrap.style.display = '';
    }
  }

  /* ── SOCIAL SVG LOGOS ── */
  const SOCIAL_ICONS = {
    linkedin: `<svg viewBox="0 0 24 24" fill="#0A66C2"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>`,

    github: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>`,

    youtube: `<svg viewBox="0 0 24 24"><path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"/><path fill="#fff" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`,

    twitter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.63L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z"/></svg>`,

    facebook: `<svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`,

    instagram: `<svg viewBox="0 0 24 24"><defs><radialGradient id="ig-g" cx="30%" cy="107%" r="150%"><stop offset="0%" stop-color="#fdf497"/><stop offset="45%" stop-color="#fd5949"/><stop offset="60%" stop-color="#d6249f"/><stop offset="90%" stop-color="#285AEB"/></radialGradient></defs><path fill="url(#ig-g)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`,

    discord: `<svg viewBox="0 0 24 24" fill="#5865F2"><path d="M20.317 4.492c-1.53-.69-3.17-1.2-4.885-1.49a.075.075 0 0 0-.079.036c-.21.369-.444.85-.608 1.23a18.566 18.566 0 0 0-5.487 0 12.36 12.36 0 0 0-.617-1.23A.077.077 0 0 0 8.562 3c-1.714.29-3.354.8-4.885 1.491a.07.07 0 0 0-.032.027C.533 9.093-.32 13.555.099 17.961a.08.08 0 0 0 .031.055 20.03 20.03 0 0 0 5.993 2.98.078.078 0 0 0 .084-.026 13.83 13.83 0 0 0 1.226-1.963.074.074 0 0 0-.041-.104 13.175 13.175 0 0 1-1.872-.878.075.075 0 0 1-.008-.125c.126-.093.252-.19.372-.287a.075.075 0 0 1 .078-.01c3.927 1.764 8.18 1.764 12.061 0a.075.075 0 0 1 .079.009c.12.098.245.195.372.288a.075.075 0 0 1-.006.125c-.598.344-1.22.635-1.873.877a.075.075 0 0 0-.041.105c.36.687.772 1.341 1.225 1.962a.077.077 0 0 0 .084.028 19.963 19.963 0 0 0 6.002-2.981.076.076 0 0 0 .032-.054c.5-5.094-.838-9.52-3.549-13.442a.06.06 0 0 0-.031-.028zM8.02 15.278c-1.182 0-2.157-1.069-2.157-2.38 0-1.312.956-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.956 2.38-2.157 2.38zm7.975 0c-1.183 0-2.157-1.069-2.157-2.38 0-1.312.955-2.38 2.157-2.38 1.21 0 2.176 1.077 2.157 2.38 0 1.312-.946 2.38-2.157 2.38z"/></svg>`,

    tiktok: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`,

    whatsapp: `<svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>`,
  };

  function getSocialIcon(title) {
    const t = (title || '').toLowerCase();
    if (t.includes('linkedin'))                      return SOCIAL_ICONS.linkedin;
    if (t.includes('github'))                        return SOCIAL_ICONS.github;
    if (t.includes('youtube'))                       return SOCIAL_ICONS.youtube;
    if (t.includes('twitter') || t === 'x' || t.startsWith('x ') || t.includes('twitter / x')) return SOCIAL_ICONS.twitter;
    if (t.includes('facebook'))                      return SOCIAL_ICONS.facebook;
    if (t.includes('instagram'))                     return SOCIAL_ICONS.instagram;
    if (t.includes('discord'))                       return SOCIAL_ICONS.discord;
    if (t.includes('tiktok'))                        return SOCIAL_ICONS.tiktok;
    if (t.includes('whatsapp'))                      return SOCIAL_ICONS.whatsapp;
    return null;
  }

  /* ── CONTACT ── */
  function renderChannelItems(items) {
    return (items || []).map(ch => {
      const svg = getSocialIcon(ch.title);
      const iconHtml = svg
        ? `<span class="channel-icon channel-icon-svg">${svg}</span>`
        : `<span class="channel-icon">${ch.icon || ''}</span>`;
      const external = ch.link && ch.link !== '#';
      return `
        <a href="${ch.link || '#'}" class="channel-item magnetic"${external ? ' target="_blank" rel="noopener"' : ''}>
          ${iconHtml}
          <div><strong>${ch.title}</strong><span>${ch.sub || ''}</span></div>
          <span class="channel-arrow">→</span>
        </a>`;
    }).join('');
  }

  function applyContact(c) {
    if (!c) return;
    set('cms-contact-title', c.title);
    set('cms-contact-hl',    c.highlight);
    set('cms-contact-desc',  c.desc);
    const list = document.getElementById('cms-channel-list');
    if (list && c.channels) list.innerHTML = renderChannelItems(c.channels);
    const social = document.getElementById('cms-social-list');
    if (social) social.innerHTML = renderChannelItems(c.social || []);
  }

  /* ── INLINE DEFAULTS (used when fetch fails or file:// protocol) ── */
  const DEFAULTS = {"projects":{"sectionTag": "OUR WORK","title":"Featured","highlight":"Projects","desc":"Open-source work, demos and client projects we're proud of","githubUsername":"","items":[]},"settings":{"companyName":"QUANTUMEXE","tagline":"TECHNOLOGIES","logoMark":"QE","accentColor":"#00a8ff","footerText":"Engineering brilliant software that transforms businesses and delights users — since 2018."},"hero":{"badge":"Your Vision. Our Technology.","line1":"ENGINEERING","line2":"BRILLIANT","line3":"SOFTWARE","subtitle":"We design, build and scale high-performance digital products that transform businesses and delight users.","cta1":"Our Services","cta2":"View Our Work","stat1Val":200,"stat1Suf":"+","stat1Label":"Projects","stat2Val":98,"stat2Suf":"%","stat2Label":"Satisfaction","stat3Val":8,"stat3Suf":"+","stat3Label":"Years"},"reviews":{"sectionTag":"GOOGLE REVIEWS","title":"What Our Clients Say","subtitle":"Rated highly on Google by businesses we've helped grow","rating":4.9,"reviewCount":47,"googleUrl":"https://www.google.com/maps","writeReviewUrl":"https://search.google.com/local/writereview?placeid=","items":[{"name":"Sarah Mitchell","date":"2 weeks ago","rating":5,"text":"Quantumexe delivered our platform ahead of schedule. Professional team, clear communication, and exceptional code quality throughout.","avatar":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80"},{"name":"James Okafor","date":"1 month ago","rating":5,"text":"Best development partner we've worked with. They understood our vision immediately and built a scalable solution that exceeded expectations.","avatar":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80"},{"name":"Elena Vasquez","date":"6 weeks ago","rating":5,"text":"Outstanding attention to detail and post-launch support. Our app performance improved dramatically after their cloud optimization work.","avatar":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80"}]},"services":[{"title":"WEB DESIGN & DEVELOPMENT","genre":"DESIGN / FULL-STACK","desc":"Modern, responsive websites and web apps built for performance, branding, and conversion.","tech":"UI/UX, React, Next.js","image":"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80","badge":"","featured":true},{"title":"MOBILE APP DEVELOPMENT","genre":"iOS / ANDROID","desc":"Native and cross-platform mobile apps that deliver smooth, reliable user experiences.","tech":"Flutter, React Native","image":"https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80","badge":"","featured":false},{"title":"AI SOLUTIONS & AUTOMATION","genre":"AI / AUTOMATION","desc":"Intelligent automation and AI-powered workflows that reduce manual work and scale operations.","tech":"OpenAI, Python, APIs","image":"https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80","badge":"","featured":false},{"title":"WHATSAPP CHATBOTS","genre":"CHATBOTS / MESSAGING","desc":"Automated WhatsApp chatbots for sales, support, and customer engagement around the clock.","tech":"WhatsApp API, NLP","image":"https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80","badge":"","featured":false},{"title":"POS SYSTEMS","genre":"RETAIL / POINT OF SALE","desc":"Custom POS solutions for retail and hospitality with billing, payments, and reporting.","tech":"POS, Payments, Reports","image":"https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80","badge":"","featured":false},{"title":"ERP SYSTEMS","genre":"ENTERPRISE / ERP","desc":"End-to-end ERP platforms that connect finance, operations, HR, and business workflows.","tech":"ERP, Modules, Dashboards","image":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80","badge":"","featured":false},{"title":"INVENTORY MANAGEMENT SYSTEMS","genre":"INVENTORY / LOGISTICS","desc":"Real-time stock tracking, procurement, and warehouse tools to keep inventory under control.","tech":"Stock, Barcode, Alerts","image":"https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80","badge":"","featured":false},{"title":"FACTORY MANAGEMENT SYSTEMS","genre":"MANUFACTURING / OPS","desc":"Factory operations software for production planning, monitoring, and efficiency tracking.","tech":"Production, IoT, KPIs","image":"https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&q=80","badge":"","featured":false},{"title":"CLOUD SOLUTIONS","genre":"CLOUD / INFRASTRUCTURE","desc":"Secure cloud architecture, migration, and managed services on leading cloud platforms.","tech":"AWS, Azure, GCP","image":"https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80","badge":"","featured":false},{"title":"SERVER INSTALLATION & MANAGEMENT","genre":"SERVERS / ADMIN","desc":"Server setup, hardening, monitoring, and ongoing management for reliable uptime.","tech":"Linux, Windows, Monitoring","image":"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80","badge":"","featured":false},{"title":"NETWORKING & FIREWALL SOLUTIONS","genre":"NETWORK / SECURITY","desc":"Enterprise networking and firewall setups that protect connectivity without slowing teams down.","tech":"Firewall, VPN, LAN/WAN","image":"https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80","badge":"","featured":false},{"title":"IP INTEGRATION","genre":"IP / SYSTEMS INTEGRATION","desc":"IP-based system integration for cameras, access control, and connected business infrastructure.","tech":"IP Cameras, Access, VoIP","image":"https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80","badge":"","featured":false},{"title":"CYBERSECURITY & CLOUD BACKUPS","genre":"SECURITY / BACKUPS","desc":"Cybersecurity hardening and automated cloud backups to keep your data safe and recoverable.","tech":"Security, Backup, Recovery","image":"https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80","badge":"","featured":false}],"about":{"title":"We Build Software","highlight":"That Matters.","p1":"We are a team of engineers, designers, and strategists passionate about building software that solves real problems and drives measurable business outcomes.","p2":"From MVP to enterprise-scale platforms, we partner with startups and Fortune 500 companies alike to deliver clean, robust, and future-proof technology.","image":"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80","badgeIcon":"💻","badgeTitle":"Since 2018","badgeSub":"Delivering Excellence","features":[{"icon":"⚡","title":"Agile Delivery","sub":"Fast sprints, real results, zero bloat"},{"icon":"🔒","title":"Security First","sub":"Enterprise-grade security built in from day one"},{"icon":"💎","title":"Quality Obsessed","sub":"Every release is polished, tested, and built to last"},{"icon":"🤝","title":"True Partnership","sub":"Your goals guide every decision we make together"}]},"team":[{"name":"Alex Chen","role":"CEO & Founder","photo":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80"},{"name":"Jordan Lee","role":"CTO & Lead Engineer","photo":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80"},{"name":"Sam Rivera","role":"Head of Design","photo":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80"},{"name":"Maya Patel","role":"Cloud Architect","photo":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&q=80"}],"blog":[{"cat":"ENGINEERING","day":"20","month":"FEB","title":"How We Scaled Our API to Handle 10 Million Requests per Day","excerpt":"A deep dive into the architectural decisions, caching strategies, and infrastructure changes that took our platform to the next level...","image":"https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&q=80","featured":true},{"cat":"AI","day":"15","month":"FEB","title":"Integrating LLMs into Production — Lessons Learned","excerpt":"","image":"https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80","featured":false},{"cat":"COMPANY","day":"08","month":"FEB","title":"Nexus Raises $4M Seed Round to Expand Engineering Team","excerpt":"","image":"https://images.unsplash.com/photo-1618401479427-c8ef9465fbe1?w=600&q=80","featured":false},{"cat":"DEVOPS","day":"01","month":"FEB","title":"Zero-Downtime Deployments with Kubernetes & GitHub Actions","excerpt":"","image":"https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80","featured":false}],"contact":{"title":"Let's Build","highlight":"Something Great","desc":"Have a project in mind? Send us your email and our team will reach out within 24 hours to discuss your vision.","channels":[{"icon":"💼","title":"LinkedIn","sub":"Follow our journey","link":"#"},{"icon":"💬","title":"WhatsApp","sub":"Chat with us anytime","link":"#"}],"social":[{"icon":"🎬","title":"YouTube","sub":"Tutorials & Talks","link":"#"},{"icon":"𝕏","title":"X","sub":"Engineering updates","link":"#"},{"icon":"📸","title":"Instagram","sub":"Behind the scenes","link":"#"},{"icon":"🎵","title":"TikTok","sub":"Shorts & tips","link":"#"}]}};

  /* ── BOOT ── */
  function boot() {
    // Published cms-data.json is the source of truth.
    // localStorage only wins when admin marked an intentional draft (_draft: true).
    fetch('cms-data.json?v=20260714c')
      .then(r => {
        if (!r.ok) throw new Error('cms-data fetch failed');
        return r.json();
      })
      .then(published => {
        const saved = getData();
        if (saved && saved._draft === true) {
          applyData(saved);
          return;
        }
        applyData(published);
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(published));
        } catch (e) {}
      })
      .catch(() => {
        const saved = getData();
        applyData(saved || DEFAULTS);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
