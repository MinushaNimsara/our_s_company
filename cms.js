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
    const sides    = services.filter(s => s !== featured);

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

  /* ── INLINE DEFAULTS (used when fetch fails or file:// protocol) ── */
  const DEFAULTS = {"settings":{"companyName":"NEXUS","tagline":"SOFTWARE SOLUTIONS","logoMark":"N","accentColor":"#4f8ef7","footerText":"Engineering brilliant software that transforms businesses and delights users — since 2018."},"hero":{"badge":"TRUSTED BY 200+ COMPANIES WORLDWIDE","line1":"ENGINEERING","line2":"BRILLIANT","line3":"SOFTWARE","subtitle":"We design, build and scale high-performance digital products that transform businesses and delight users.","cta1":"Our Services","cta2":"View Our Work","stat1Val":200,"stat1Suf":"+","stat1Label":"Projects","stat2Val":98,"stat2Suf":"%","stat2Label":"Satisfaction","stat3Val":8,"stat3Suf":"+","stat3Label":"Years"},"countdown":{"sectionTag":"UPCOMING LAUNCH","title":"NEXUS PLATFORM 3.0","subtitle":"The most powerful developer platform we've ever built","daysFromNow":42},"services":[{"title":"WEB DEVELOPMENT","genre":"FULL-STACK / ENTERPRISE","desc":"Scalable, performant web applications built with React, Next.js, Node.js and modern cloud infrastructure.","tech":"React, Node.js, AWS","image":"https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=1200&q=80","badge":"FLAGSHIP","featured":true},{"title":"MOBILE APPS","genre":"iOS / ANDROID / CROSS-PLATFORM","desc":"Native and cross-platform apps using React Native and Flutter that users love.","tech":"Flutter, React Native","image":"https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80","badge":"","featured":false},{"title":"CLOUD & AI","genre":"CLOUD / AI / DEVOPS","desc":"Intelligent cloud architecture and AI-powered features that automate and accelerate your business.","tech":"AWS, GCP, OpenAI","image":"https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80","badge":"","featured":false}],"about":{"title":"We Build Software","highlight":"That Matters.","p1":"We are a team of engineers, designers, and strategists passionate about building software that solves real problems and drives measurable business outcomes.","p2":"From MVP to enterprise-scale platforms, we partner with startups and Fortune 500 companies alike to deliver clean, robust, and future-proof technology.","image":"https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80","badgeIcon":"💻","badgeTitle":"Since 2018","badgeSub":"Delivering Excellence","features":[{"icon":"⚡","title":"Agile Delivery","sub":"Fast sprints, real results, zero bloat"},{"icon":"🔒","title":"Security First","sub":"Enterprise-grade security built in from day one"},{"icon":"🏆","title":"Award Winning","sub":"Best Tech Agency — Dev Summit 2025"}]},"team":[{"name":"Alex Chen","role":"CEO & Founder","photo":"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80"},{"name":"Jordan Lee","role":"CTO & Lead Engineer","photo":"https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80"},{"name":"Sam Rivera","role":"Head of Design","photo":"https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80"},{"name":"Maya Patel","role":"Cloud Architect","photo":"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&q=80"}],"blog":[{"cat":"ENGINEERING","day":"20","month":"FEB","title":"How We Scaled Our API to Handle 10 Million Requests per Day","excerpt":"A deep dive into the architectural decisions, caching strategies, and infrastructure changes that took our platform to the next level...","image":"https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&q=80","featured":true},{"cat":"AI","day":"15","month":"FEB","title":"Integrating LLMs into Production — Lessons Learned","excerpt":"","image":"https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80","featured":false},{"cat":"COMPANY","day":"08","month":"FEB","title":"Nexus Raises $4M Seed Round to Expand Engineering Team","excerpt":"","image":"https://images.unsplash.com/photo-1618401479427-c8ef9465fbe1?w=600&q=80","featured":false},{"cat":"DEVOPS","day":"01","month":"FEB","title":"Zero-Downtime Deployments with Kubernetes & GitHub Actions","excerpt":"","image":"https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80","featured":false}],"contact":{"title":"Let's Build","highlight":"Something Great","desc":"Have a project in mind? Send us your email and our team will reach out within 24 hours to discuss your vision.","channels":[{"icon":"💼","title":"LinkedIn","sub":"Follow our journey","link":"#"},{"icon":"🐙","title":"GitHub","sub":"Open source projects","link":"#"},{"icon":"🎬","title":"YouTube","sub":"Tutorials & Talks","link":"#"},{"icon":"𝕏","title":"Twitter / X","sub":"Engineering updates","link":"#"}]}};

  /* ── BOOT ── */
  function boot() {
    const saved = getData();
    if (saved) {
      applyData(saved);
    } else {
      // Try fetching cms-data.json (works on HTTP server / GitHub Pages)
      fetch('cms-data.json')
        .then(r => r.json())
        .then(d => applyData(d))
        .catch(() => applyData(DEFAULTS)); // fallback for file:// protocol
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
