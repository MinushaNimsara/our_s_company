/* ════════════════════════════════════════
   QUANTUMEXE Admin Panel Logic
   ════════════════════════════════════════ */

const LS_KEY   = 'nexusCMS';
const PASS_KEY = 'nexusAdminPass';
const DEFAULT_PASS = 'admin2026';

let cmsData = null;

/* ── Boot ── */
window.addEventListener('DOMContentLoaded', () => {
  setupLogin();
  // Logout (safe here — DOM is ready)
  document.getElementById('logoutBtn').addEventListener('click', () => {
    document.getElementById('adminApp').style.display    = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginPass').value = '';
  });
});

/* ════════════════════════════════════════
   AUTH
   ════════════════════════════════════════ */
function setupLogin() {
  const form = document.getElementById('loginForm');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const pass    = document.getElementById('loginPass').value;
    const stored  = localStorage.getItem(PASS_KEY) || DEFAULT_PASS;
    const errEl   = document.getElementById('loginError');

    if (pass === stored) {
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('adminApp').style.display    = 'flex';
      initApp();
    } else {
      errEl.style.display = 'block';
    }
  });
}

/* ════════════════════════════════════════
   INIT APP
   ════════════════════════════════════════ */
function initApp() {
  loadData().then(() => {
    populateAllForms();
    setupLogoUpload();
    setupNav();
    setupTopbar();
    renderDynamicEditors();
    setupChangePassword();
  });
}

/* ════════════════════════════════════════
   DATA LOAD / SAVE
   ════════════════════════════════════════ */
async function loadData() {
  // 1. Try localStorage first
  const saved = localStorage.getItem(LS_KEY);
  if (saved) { cmsData = JSON.parse(saved); return; }

  // 2. Fetch cms-data.json
  try {
    const res = await fetch('cms-data.json');
    cmsData = await res.json();
  } catch {
    cmsData = getDefaultData();
  }
}

function saveData() {
  collectAllForms();
  cmsData._draft = true;
  localStorage.setItem(LS_KEY, JSON.stringify(cmsData));
  showToast('Draft saved in this browser. Export JSON + git push to publish live.', 'success');
}

function exportData() {
  collectAllForms();
  const published = { ...cmsData };
  delete published._draft;
  const blob = new Blob([JSON.stringify(published, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'cms-data.json';
  a.click();
  URL.revokeObjectURL(url);
  // Clear draft flag so the public site uses published cms-data.json
  cmsData = published;
  localStorage.setItem(LS_KEY, JSON.stringify(published));
  showToast('cms-data.json downloaded! Replace the file in your repo and git push.', 'info');
}

/* ════════════════════════════════════════
   NAVIGATION
   ════════════════════════════════════════ */
const SECTION_TITLES = {
  dashboard: 'Dashboard',
  settings:  'Settings',
  hero:      'Hero Section',
  services:  'Services',
  about:     'About',
  team:      'Team',
  blog:      'Blog',
  projects:  'Projects',
  contact:   'Contact',
};

function setupNav() {
  document.querySelectorAll('.nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
}

function switchSection(name) {
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  const activeBtn = document.querySelector(`.nav-item[data-section="${name}"]`);
  if (activeBtn) activeBtn.classList.add('active');

  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  const sec = document.getElementById(`sec-${name}`);
  if (sec) sec.classList.add('active');

  document.getElementById('pageTitle').textContent = SECTION_TITLES[name] || name;
}

/* ════════════════════════════════════════
   TOP BAR
   ════════════════════════════════════════ */
function setupTopbar() {
  document.getElementById('saveBtn').addEventListener('click', saveData);
  document.getElementById('exportBtn').addEventListener('click', exportData);
  document.getElementById('previewBtn').addEventListener('click', () => {
    saveData();
    window.open('index.html', '_blank');
  });
}

/* ════════════════════════════════════════
   POPULATE FORMS (data → inputs)
   ════════════════════════════════════════ */
function populateAllForms() {
  const d = cmsData;

  // SETTINGS
  v('s-companyName', d.settings.companyName);
  v('s-tagline',     d.settings.tagline);
  v('s-logoMark',    d.settings.logoMark);
  v('s-accentColor', d.settings.accentColor);
  document.getElementById('s-accentColorPicker').value = d.settings.accentColor || '#4f8ef7';
  v('s-footerText',  d.settings.footerText);
  // default theme radio
  const theme = d.settings.defaultTheme || 'light';
  const radio = document.getElementById(theme === 'dark' ? 's-theme-dark' : 's-theme-light');
  if (radio) radio.checked = true;

  // HERO
  v('h-badge',   d.hero.badge);
  v('h-line1',   d.hero.line1);
  v('h-line2',   d.hero.line2);
  v('h-line3',   d.hero.line3);
  v('h-subtitle',d.hero.subtitle);
  v('h-cta1',    d.hero.cta1);
  v('h-cta2',    d.hero.cta2);
  v('h-s1v',     d.hero.stat1Val);  v('h-s1suf', d.hero.stat1Suf); v('h-s1l', d.hero.stat1Label);
  v('h-s2v',     d.hero.stat2Val);  v('h-s2suf', d.hero.stat2Suf); v('h-s2l', d.hero.stat2Label);
  v('h-s3v',     d.hero.stat3Val);  v('h-s3suf', d.hero.stat3Suf); v('h-s3l', d.hero.stat3Label);

  // ABOUT
  v('a-title',      d.about.title);
  v('a-highlight',  d.about.highlight);
  v('a-p1',         d.about.p1);
  v('a-p2',         d.about.p2);
  v('a-mission',    d.about.mission);
  v('a-image',      d.about.image);
  v('a-badgeIcon',  d.about.badgeIcon);
  v('a-badgeTitle', d.about.badgeTitle);
  v('a-badgeSub',   d.about.badgeSub);
  v('a-stat4Val',   d.about.stat4Val);
  v('a-stat4Suf',   d.about.stat4Suf);
  v('a-stat4Label', d.about.stat4Label);
  v('a-valuesTag',   d.about.valuesTag);
  v('a-valuesTitle', d.about.valuesTitle);
  v('a-valuesHl',    d.about.valuesHl);
  v('a-valuesDesc',  d.about.valuesDesc);

  // PROJECTS
  if (d.projects) {
    v('proj-tag',        d.projects.sectionTag);
    v('proj-title',      d.projects.title);
    v('proj-hl',         d.projects.highlight);
    v('proj-desc',       d.projects.desc);
    v('proj-githubUser', d.projects.githubUsername);
  }

  // CONTACT
  v('c-title',     d.contact.title);
  v('c-highlight', d.contact.highlight);
  v('c-desc',      d.contact.desc);

  // Color picker sync
  document.getElementById('s-accentColor').addEventListener('input', e => {
    document.getElementById('s-accentColorPicker').value = e.target.value;
  });
  document.getElementById('s-accentColorPicker').addEventListener('input', e => {
    document.getElementById('s-accentColor').value = e.target.value;
  });
}

/* ════════════════════════════════════════
   COLLECT FORMS (inputs → data)
   ════════════════════════════════════════ */
function collectAllForms() {
  const d = cmsData;

  // SETTINGS
  d.settings.companyName = g('s-companyName');
  d.settings.tagline     = g('s-tagline');
  d.settings.logoMark    = g('s-logoMark');
  d.settings.accentColor   = g('s-accentColor') || g('s-accentColorPicker');
  d.settings.footerText    = g('s-footerText');
  const checkedTheme = document.querySelector('input[name="s-defaultTheme"]:checked');
  d.settings.defaultTheme = checkedTheme ? checkedTheme.value : 'light';

  // HERO
  d.hero.badge    = g('h-badge');
  d.hero.line1    = g('h-line1');
  d.hero.line2    = g('h-line2');
  d.hero.line3    = g('h-line3');
  d.hero.subtitle = g('h-subtitle');
  d.hero.cta1     = g('h-cta1');
  d.hero.cta2     = g('h-cta2');
  d.hero.stat1Val = parseInt(g('h-s1v'))||0; d.hero.stat1Suf = g('h-s1suf'); d.hero.stat1Label = g('h-s1l');
  d.hero.stat2Val = parseInt(g('h-s2v'))||0; d.hero.stat2Suf = g('h-s2suf'); d.hero.stat2Label = g('h-s2l');
  d.hero.stat3Val = parseInt(g('h-s3v'))||0; d.hero.stat3Suf = g('h-s3suf'); d.hero.stat3Label = g('h-s3l');

  // ABOUT
  d.about.title      = g('a-title');
  d.about.highlight  = g('a-highlight');
  d.about.p1         = g('a-p1');
  d.about.p2         = g('a-p2');
  d.about.mission    = g('a-mission');
  d.about.image      = g('a-image');
  d.about.badgeIcon  = g('a-badgeIcon');
  d.about.badgeTitle = g('a-badgeTitle');
  d.about.badgeSub   = g('a-badgeSub');
  d.about.stat4Val   = parseInt(g('a-stat4Val')) || 50;
  d.about.stat4Suf   = g('a-stat4Suf')   || '+';
  d.about.stat4Label = g('a-stat4Label') || 'Engineers';
  d.about.valuesTag   = g('a-valuesTag');
  d.about.valuesTitle = g('a-valuesTitle');
  d.about.valuesHl    = g('a-valuesHl');
  d.about.valuesDesc  = g('a-valuesDesc');
  d.about.features    = collectFeatures();
  d.about.timeline    = collectTimeline();

  // SERVICES, TEAM, BLOG, CONTACT collected inline
  d.services = collectServices();
  d.team     = collectTeam();
  d.blog     = collectBlog();
  // PROJECTS
  if (!d.projects) d.projects = {};
  d.projects.sectionTag      = g('proj-tag');
  d.projects.title           = g('proj-title');
  d.projects.highlight       = g('proj-hl');
  d.projects.desc            = g('proj-desc');
  d.projects.githubUsername  = g('proj-githubUser');
  d.projects.items           = collectProjects();

  d.contact.title     = g('c-title');
  d.contact.highlight = g('c-highlight');
  d.contact.desc      = g('c-desc');
  d.contact.channels  = collectChannels();
  d.contact.social    = collectSocial();
}

/* ════════════════════════════════════════
   DYNAMIC EDITORS
   ════════════════════════════════════════ */
function renderDynamicEditors() {
  renderServicesEditor();
  renderFeaturesEditor();
  renderTimelineEditor();
  renderTeamEditor();
  renderBlogEditor();
  renderChannelsEditor();
  renderSocialEditor();

  renderProjectsEditor();

  document.getElementById('fetchGithubBtn').addEventListener('click', fetchGithubRepos);
  document.getElementById('addProjectBtn').addEventListener('click', () => {
    if (!cmsData.projects) cmsData.projects = { items: [] };
    cmsData.projects.items = collectProjects();
    cmsData.projects.items.push({
      id: 'custom-' + Date.now(),
      type: 'custom',
      name: 'New Project',
      description: '',
      githubUrl: '',
      liveUrl: '',
      language: '',
      stars: 0, forks: 0,
      topics: [],
      image: '',
      visible: true,
    });
    renderProjectsEditor();
  });

  document.getElementById('addTimelineBtn')?.addEventListener('click', () => {
    cmsData.about.timeline = collectTimeline();
    cmsData.about.timeline.push({ year: new Date().getFullYear().toString(), title: 'New Milestone', desc: '' });
    renderTimelineEditor();
  });

  document.getElementById('addTeamBtn').addEventListener('click', () => {
    cmsData.team = collectTeam(); // save current edits before re-render
    cmsData.team.push({ name: 'New Member', role: 'Role', bio: '', photo: '', linkedin: '', twitter: '', portfolio: '' });
    renderTeamEditor();
  });
  document.getElementById('addBlogBtn').addEventListener('click', () => {
    cmsData.blog = collectBlog(); // save current edits before re-render
    cmsData.blog.push({ cat: 'CATEGORY', day: '01', month: 'JAN', title: 'New Article', excerpt: '', image: '', featured: false });
    renderBlogEditor();
  });
}

/* ── SERVICES ── */
function renderServicesEditor() {
  const container = document.getElementById('services-editor');
  container.innerHTML = cmsData.services.map((s, i) => `
    <div class="item-card" id="svc-card-${i}">
      <div class="item-card-header" onclick="toggleCard('svc-card-${i}')">
        <h4>Service ${i+1}: ${s.title}</h4>
        <div class="item-card-actions">
          ${s.featured ? '<span class="featured-badge">★ FEATURED</span>' : ''}
          <span class="item-card-toggle">▼</span>
        </div>
      </div>
      <div class="item-card-body">
        <div class="form-group"><label>Featured card (shown large)</label>
          <select id="svc-featured-${i}">
            <option value="false" ${!s.featured?'selected':''}>No</option>
            <option value="true"  ${s.featured ?'selected':''}>Yes (only one can be featured)</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Title</label><input type="text" id="svc-title-${i}" value="${esc(s.title)}"></div>
          <div class="form-group"><label>Genre / Type</label><input type="text" id="svc-genre-${i}" value="${esc(s.genre)}"></div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="svc-desc-${i}" rows="2">${esc(s.desc)}</textarea></div>
        <div class="form-row">
          <div class="form-group"><label>Tech Stack (comma separated)</label><input type="text" id="svc-tech-${i}" value="${esc(s.tech)}"></div>
          <div class="form-group"><label>Badge Label (e.g. FLAGSHIP)</label><input type="text" id="svc-badge-${i}" value="${esc(s.badge)}"></div>
        </div>
        <div class="form-group">
          <label>Image URL</label>
          <input type="url" id="svc-image-${i}" value="${esc(s.image)}" oninput="updatePreview('svc-prev-${i}', this.value)">
          <img id="svc-prev-${i}" class="img-preview" src="${s.image}" alt="preview">
        </div>
      </div>
    </div>`).join('');
}

function collectServices() {
  return cmsData.services.map((_, i) => ({
    title:    g(`svc-title-${i}`),
    genre:    g(`svc-genre-${i}`),
    desc:     g(`svc-desc-${i}`),
    tech:     g(`svc-tech-${i}`),
    badge:    g(`svc-badge-${i}`),
    image:    g(`svc-image-${i}`),
    featured: document.getElementById(`svc-featured-${i}`)?.value === 'true',
  }));
}

/* ── ABOUT FEATURES ── */
function renderFeaturesEditor() {
  const container = document.getElementById('features-editor');
  container.innerHTML = (cmsData.about.features || []).map((f, i) => `
    <div class="form-card inner">
      <label>Feature ${i+1}</label>
      <div class="form-row">
        <div class="form-group"><label>Icon (emoji)</label><input type="text" id="feat-icon-${i}" value="${esc(f.icon)}" maxlength="4"></div>
        <div class="form-group"><label>Title</label><input type="text" id="feat-title-${i}" value="${esc(f.title)}"></div>
        <div class="form-group"><label>Subtitle</label><input type="text" id="feat-sub-${i}" value="${esc(f.sub)}"></div>
      </div>
    </div>`).join('');
}

function collectFeatures() {
  return (cmsData.about.features || []).map((_, i) => ({
    icon:  g(`feat-icon-${i}`),
    title: g(`feat-title-${i}`),
    sub:   g(`feat-sub-${i}`),
  }));
}

/* ── TIMELINE ── */
function renderTimelineEditor() {
  const container = document.getElementById('timeline-editor');
  if (!container) return;
  container.innerHTML = (cmsData.about.timeline || []).map((e, i) => `
    <div class="item-card" id="tl-card-${i}">
      <div class="item-card-header" onclick="toggleCard('tl-card-${i}')">
        <h4>${esc(e.year)} — ${esc(e.title)}</h4>
        <div class="item-card-actions">
          <button class="btn-admin btn-danger-admin sm" onclick="removeTimelineItem(${i})">Remove</button>
          <span class="item-card-toggle">▼</span>
        </div>
      </div>
      <div class="item-card-body">
        <div class="form-row">
          <div class="form-group" style="max-width:120px">
            <label>Year</label>
            <input type="text" id="tl-year-${i}" value="${esc(e.year)}" maxlength="6">
          </div>
          <div class="form-group">
            <label>Milestone Title</label>
            <input type="text" id="tl-title-${i}" value="${esc(e.title)}">
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="tl-desc-${i}" rows="2">${esc(e.desc)}</textarea>
        </div>
      </div>
    </div>`).join('');
}

function collectTimeline() {
  return (cmsData.about.timeline || []).map((_, i) => ({
    year:  g(`tl-year-${i}`),
    title: g(`tl-title-${i}`),
    desc:  g(`tl-desc-${i}`),
  }));
}

function removeTimelineItem(i) {
  cmsData.about.timeline = collectTimeline();
  cmsData.about.timeline.splice(i, 1);
  renderTimelineEditor();
}

/* ── TEAM ── */
function renderTeamEditor() {
  const container = document.getElementById('team-editor');
  container.innerHTML = cmsData.team.map((m, i) => `
    <div class="item-card team-item-card" id="team-card-${i}">
      <div class="item-card-header" onclick="toggleCard('team-card-${i}')">
        <div class="team-card-header-inner">
          <img class="team-thumb" src="${esc(m.photo)}" id="team-thumb-${i}" alt="${esc(m.name)}">
          <div>
            <h4>${esc(m.name)}</h4>
            <span class="team-role-label">${esc(m.role)}</span>
          </div>
        </div>
        <div class="item-card-actions">
          <button class="btn-admin btn-danger-admin sm" onclick="removeMember(${i})">Remove</button>
          <span class="item-card-toggle">▼</span>
        </div>
      </div>
      <div class="item-card-body">

        <!-- identity -->
        <div class="form-row">
          <div class="form-group">
            <label>Full Name</label>
            <input type="text" id="team-name-${i}" value="${esc(m.name)}"
              oninput="document.querySelectorAll('#team-card-${i} h4')[0].textContent=this.value">
          </div>
          <div class="form-group">
            <label>Job Title / Role</label>
            <input type="text" id="team-role-${i}" value="${esc(m.role)}"
              oninput="document.querySelector('#team-card-${i} .team-role-label').textContent=this.value">
          </div>
        </div>

        <!-- bio -->
        <div class="form-group">
          <label>Short Bio <small>(shown on hover / About page)</small></label>
          <textarea id="team-bio-${i}" rows="2" placeholder="2–3 sentence bio…">${esc(m.bio||'')}</textarea>
        </div>

        <!-- photo -->
        <div class="form-group">
          <label>Photo URL <small>(paste a direct image link, or use a service like imgur)</small></label>
          <div style="display:flex;gap:12px;align-items:flex-start">
            <input type="url" id="team-photo-${i}" value="${esc(m.photo)}"
              oninput="updatePreview('team-prev-${i}',this.value);document.getElementById('team-thumb-${i}').src=this.value"
              style="flex:1">
            <img id="team-prev-${i}" src="${esc(m.photo)}" alt="preview"
              style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:2px solid var(--border);flex-shrink:0">
          </div>
        </div>

        <!-- social links -->
        <div class="form-group">
          <label>Social Links</label>
          <div class="socials-grid">
            <div class="social-field">
              <span class="social-icon-label">in</span>
              <input type="url" id="team-linkedin-${i}" value="${esc(m.linkedin||'')}" placeholder="https://linkedin.com/in/…">
            </div>
            <div class="social-field">
              <span class="social-icon-label">𝕏</span>
              <input type="url" id="team-twitter-${i}" value="${esc(m.twitter||'')}" placeholder="https://x.com/…">
            </div>
            <div class="social-field">
              <span class="social-icon-label">↗</span>
              <input type="url" id="team-portfolio-${i}" value="${esc(m.portfolio||'')}" placeholder="https://yoursite.com">
            </div>
          </div>
        </div>

      </div>
    </div>`).join('');
}

function collectTeam() {
  return cmsData.team.map((_, i) => ({
    name:      g(`team-name-${i}`),
    role:      g(`team-role-${i}`),
    bio:       g(`team-bio-${i}`),
    photo:     g(`team-photo-${i}`),
    linkedin:  g(`team-linkedin-${i}`),
    twitter:   g(`team-twitter-${i}`),
    portfolio: g(`team-portfolio-${i}`),
  }));
}

function removeMember(i) {
  cmsData.team = collectTeam();
  cmsData.team.splice(i, 1);
  renderTeamEditor();
}

/* ── BLOG ── */
function renderBlogEditor() {
  const container = document.getElementById('blog-editor');
  container.innerHTML = cmsData.blog.map((b, i) => `
    <div class="item-card" id="blog-card-${i}">
      <div class="item-card-header" onclick="toggleCard('blog-card-${i}')">
        <h4>${b.cat}: ${b.title.slice(0,50)}${b.title.length>50?'…':''}</h4>
        <div class="item-card-actions">
          ${b.featured ? '<span class="featured-badge">★ FEATURED</span>' : ''}
          <button class="btn-admin btn-danger-admin sm" onclick="removeBlog(${i})">Remove</button>
          <span class="item-card-toggle">▼</span>
        </div>
      </div>
      <div class="item-card-body">
        <div class="form-group"><label>Featured (shown large)</label>
          <select id="blog-feat-${i}">
            <option value="false" ${!b.featured?'selected':''}>No</option>
            <option value="true"  ${b.featured ?'selected':''}>Yes</option>
          </select>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><input type="text" id="blog-cat-${i}" value="${esc(b.cat)}"></div>
          <div class="form-group"><label>Day</label><input type="text" id="blog-day-${i}" value="${esc(b.day)}" maxlength="2"></div>
          <div class="form-group"><label>Month</label><input type="text" id="blog-month-${i}" value="${esc(b.month)}" maxlength="3"></div>
        </div>
        <div class="form-group"><label>Title</label><input type="text" id="blog-title-${i}" value="${esc(b.title)}"></div>
        <div class="form-group"><label>Excerpt (optional)</label><textarea id="blog-excerpt-${i}" rows="2">${esc(b.excerpt)}</textarea></div>
        <div class="form-group">
          <label>Image URL</label>
          <input type="url" id="blog-img-${i}" value="${esc(b.image)}" oninput="updatePreview('blog-prev-${i}', this.value)">
          <img id="blog-prev-${i}" class="img-preview" src="${b.image}" alt="preview">
        </div>
      </div>
    </div>`).join('');
}

function collectBlog() {
  return cmsData.blog.map((_, i) => ({
    cat:      g(`blog-cat-${i}`),
    day:      g(`blog-day-${i}`),
    month:    g(`blog-month-${i}`),
    title:    g(`blog-title-${i}`),
    excerpt:  g(`blog-excerpt-${i}`),
    image:    g(`blog-img-${i}`),
    featured: document.getElementById(`blog-feat-${i}`)?.value === 'true',
  }));
}

function removeBlog(i) {
  cmsData.blog = collectBlog(); // preserve current edits
  cmsData.blog.splice(i, 1);
  renderBlogEditor();
}

/* ── CONTACT CHANNELS ── */
function renderChannelsEditor() {
  const container = document.getElementById('channels-editor');
  if (!container) return;
  if (!cmsData.contact.channels) cmsData.contact.channels = [];
  container.innerHTML = cmsData.contact.channels.map((ch, i) => `
    <div class="form-card inner" style="margin-bottom:12px">
      <label>Channel ${i+1}</label>
      <div class="form-row">
        <div class="form-group"><label>Icon (emoji)</label><input type="text" id="ch-icon-${i}" value="${esc(ch.icon)}" maxlength="4"></div>
        <div class="form-group"><label>Title</label><input type="text" id="ch-title-${i}" value="${esc(ch.title)}"></div>
        <div class="form-group"><label>Subtitle</label><input type="text" id="ch-sub-${i}" value="${esc(ch.sub)}"></div>
        <div class="form-group"><label>Link (URL)</label><input type="url" id="ch-link-${i}" value="${esc(ch.link)}"></div>
      </div>
    </div>`).join('');
}

function collectChannels() {
  return (cmsData.contact.channels || []).map((_, i) => ({
    icon:  g(`ch-icon-${i}`),
    title: g(`ch-title-${i}`),
    sub:   g(`ch-sub-${i}`),
    link:  g(`ch-link-${i}`),
  }));
}

function renderSocialEditor() {
  const container = document.getElementById('social-editor');
  if (!container) return;
  if (!cmsData.contact.social) cmsData.contact.social = [];
  container.innerHTML = cmsData.contact.social.map((ch, i) => `
    <div class="form-card inner" style="margin-bottom:12px">
      <label>Social ${i+1}</label>
      <div class="form-row">
        <div class="form-group"><label>Icon (emoji)</label><input type="text" id="soc-icon-${i}" value="${esc(ch.icon)}" maxlength="4"></div>
        <div class="form-group"><label>Title</label><input type="text" id="soc-title-${i}" value="${esc(ch.title)}"></div>
        <div class="form-group"><label>Subtitle</label><input type="text" id="soc-sub-${i}" value="${esc(ch.sub)}"></div>
        <div class="form-group"><label>Link (URL)</label><input type="url" id="soc-link-${i}" value="${esc(ch.link)}"></div>
      </div>
    </div>`).join('');
}

function collectSocial() {
  return (cmsData.contact.social || []).map((_, i) => ({
    icon:  g(`soc-icon-${i}`),
    title: g(`soc-title-${i}`),
    sub:   g(`soc-sub-${i}`),
    link:  g(`soc-link-${i}`),
  }));
}

/* ════════════════════════════════════════
   PROJECTS EDITOR
   ════════════════════════════════════════ */
function renderProjectsEditor() {
  const container = document.getElementById('projects-editor');
  if (!container) return;
  const items = (cmsData.projects && cmsData.projects.items) || [];

  const countEl = document.getElementById('proj-count');
  if (countEl) countEl.textContent = items.length ? `(${items.length} total)` : '';

  if (!items.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:0.9rem;padding:16px 0">No projects yet. Fetch from GitHub or add a custom project.</p>';
    return;
  }

  container.innerHTML = items.map((p, i) => `
    <div class="item-card" id="proj-card-${i}">
      <div class="item-card-header" onclick="toggleCard('proj-card-${i}')">
        <h4 style="display:flex;align-items:center;gap:8px">
          ${p.type === 'github' ? '<span title="GitHub repo" style="font-size:0.85rem">⌥</span>' : '<span title="Custom" style="font-size:0.85rem">✦</span>'}
          ${p.name}
          ${p.language ? `<span style="font-size:0.7rem;color:var(--muted)">${p.language}</span>` : ''}
        </h4>
        <div class="item-card-actions">
          <label class="toggle-label" onclick="event.stopPropagation()" title="Show on website">
            <input type="checkbox" id="proj-vis-${i}" ${p.visible !== false ? 'checked' : ''} onchange=""> 
            <span style="font-size:0.75rem;color:var(--muted)">Visible</span>
          </label>
          <button class="btn-admin btn-danger-admin sm" onclick="removeProject(${i})">Remove</button>
          <span class="item-card-toggle">▼</span>
        </div>
      </div>
      <div class="item-card-body">
        <div class="form-row">
          <div class="form-group"><label>Display Name</label><input type="text" id="proj-name-${i}" value="${esc(p.name)}"></div>
          <div class="form-group"><label>Language</label><input type="text" id="proj-lang-${i}" value="${esc(p.language)}" placeholder="JavaScript"></div>
        </div>
        <div class="form-group"><label>Description</label><textarea id="proj-desc-${i}" rows="2">${esc(p.description)}</textarea></div>
        <div class="form-row">
          <div class="form-group">
            <label>GitHub URL</label>
            <input type="url" id="proj-ghurl-${i}" value="${esc(p.githubUrl)}" placeholder="https://github.com/...">
          </div>
          <div class="form-group">
            <label>Live Demo URL <span style="color:var(--accent);font-size:0.75rem">(overrides GitHub homepage)</span></label>
            <input type="url" id="proj-liveurl-${i}" value="${esc(p.liveUrl)}" placeholder="https://your-demo.com">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Topics / Tags (comma separated)</label>
            <input type="text" id="proj-topics-${i}" value="${esc((p.topics||[]).join(', '))}">
          </div>
          <div class="form-group">
            <label>Thumbnail Image URL (optional)</label>
            <input type="url" id="proj-img-${i}" value="${esc(p.image)}" placeholder="https://..." oninput="updatePreview('proj-prev-${i}', this.value)">
          </div>
        </div>
        ${p.image ? `<img id="proj-prev-${i}" class="img-preview" src="${p.image}" alt="preview">` : `<img id="proj-prev-${i}" class="img-preview" src="" alt="" style="display:none">`}
        ${p.type === 'github' ? `
          <div style="display:flex;gap:16px;font-size:0.8rem;color:var(--muted);margin-top:4px">
            <span>★ Stars: ${p.stars || 0}</span>
            <span>⑂ Forks: ${p.forks || 0}</span>
            <span style="color:var(--accent)">↻ Auto-updated when you re-fetch GitHub repos</span>
          </div>` : ''}
      </div>
    </div>`).join('');
}

function collectProjects() {
  const items = (cmsData.projects && cmsData.projects.items) || [];
  return items.map((p, i) => ({
    ...p,
    name:        g(`proj-name-${i}`)    || p.name,
    description: g(`proj-desc-${i}`)   || '',
    language:    g(`proj-lang-${i}`)   || '',
    githubUrl:   g(`proj-ghurl-${i}`)  || '',
    liveUrl:     g(`proj-liveurl-${i}`)|| '',
    image:       g(`proj-img-${i}`)    || '',
    topics:      (g(`proj-topics-${i}`) || '').split(',').map(t => t.trim()).filter(Boolean),
    visible:     document.getElementById(`proj-vis-${i}`)?.checked !== false,
  }));
}

function removeProject(i) {
  cmsData.projects.items = collectProjects();
  cmsData.projects.items.splice(i, 1);
  renderProjectsEditor();
}

/* ── GitHub Auto-Fetch ── */
async function fetchGithubRepos() {
  const username = g('proj-githubUser').trim();
  if (!username) { showToast('Enter a GitHub username first.', 'error'); return; }

  const btn      = document.getElementById('fetchGithubBtn');
  const statusEl = document.getElementById('githubFetchStatus');

  btn.disabled     = true;
  btn.textContent  = 'Fetching...';
  statusEl.innerHTML = '<span style="color:var(--muted)">⏳ Contacting GitHub API...</span>';

  try {
    const res = await fetch(
      `https://api.github.com/users/${username}/repos?sort=updated&per_page=50&type=public`
    );
    if (res.status === 404) throw new Error(`GitHub user "${username}" not found.`);
    if (res.status === 403) throw new Error('GitHub API rate limit reached. Try again in ~1 hour.');
    if (!res.ok) throw new Error(`GitHub API error (${res.status}).`);

    const repos = await res.json();

    // Save current form edits first
    if (!cmsData.projects) cmsData.projects = {};
    cmsData.projects.items = collectProjects();
    cmsData.projects.githubUsername = username;

    const existingMap = new Map((cmsData.projects.items || []).map(p => [p.id, p]));
    let newCount = 0, updCount = 0;

    repos.forEach(repo => {
      const id = `gh-${repo.name}`;
      if (existingMap.has(id)) {
        // Update live stats, but keep user's manual edits
        const item = existingMap.get(id);
        item.stars = repo.stargazers_count;
        item.forks = repo.forks_count;
        // Only update liveUrl if user hasn't set one manually
        if (!item.liveUrl && repo.homepage) item.liveUrl = repo.homepage;
        updCount++;
      } else {
        cmsData.projects.items.push({
          id,
          type:        'github',
          name:        repo.name.replace(/[-_]/g, ' '),
          repoName:    repo.name,
          description: repo.description || '',
          githubUrl:   repo.html_url,
          liveUrl:     repo.homepage  || '',
          language:    repo.language  || '',
          stars:       repo.stargazers_count,
          forks:       repo.forks_count,
          topics:      repo.topics    || [],
          image:       '',
          visible:     true,
        });
        newCount++;
      }
    });

    renderProjectsEditor();
    v('proj-githubUser', username);

    const msg = `✓ Done! ${newCount} new repo${newCount !== 1 ? 's' : ''} added, ${updCount} updated.`;
    statusEl.innerHTML = `<span style="color:var(--success)">${msg}</span>`;
    showToast(msg, 'success');
  } catch (err) {
    statusEl.innerHTML = `<span style="color:var(--danger)">✗ ${err.message}</span>`;
    showToast(err.message, 'error');
  } finally {
    btn.disabled    = false;
    btn.textContent = '🔄 Fetch Repos';
  }
}

/* ════════════════════════════════════════
   LOGO IMAGE UPLOAD
   ════════════════════════════════════════ */
function setupLogoUpload() {
  const fileInput   = document.getElementById('s-logoFile');
  const chooseBtn   = document.getElementById('s-logoChooseBtn');
  const removeBtn   = document.getElementById('s-logoRemoveBtn');
  const preview     = document.getElementById('s-logoPreview');
  const placeholder = document.getElementById('s-logoPlaceholder');

  function showLogo(src) {
    preview.src           = src;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    removeBtn.style.display   = 'inline-flex';
  }

  function clearLogo() {
    cmsData.settings.logoImage = '';
    fileInput.value            = '';
    preview.src                = '';
    preview.style.display      = 'none';
    placeholder.style.display  = 'flex';
    removeBtn.style.display    = 'none';
  }

  // Show existing logo on load
  if (cmsData.settings && cmsData.settings.logoImage) {
    showLogo(cmsData.settings.logoImage);
  }

  chooseBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Image is too large. Maximum size is 2 MB.', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      if (!cmsData.settings) cmsData.settings = {};
      cmsData.settings.logoImage = ev.target.result;
      showLogo(ev.target.result);
      showToast('Logo uploaded! Click Save Changes to apply.', 'success');
    };
    reader.readAsDataURL(file);
  });

  removeBtn.addEventListener('click', () => {
    clearLogo();
    showToast('Logo image removed.', 'info');
  });
}

/* ════════════════════════════════════════
   CHANGE PASSWORD
   ════════════════════════════════════════ */
function setupChangePassword() {
  document.getElementById('changePassBtn').addEventListener('click', () => {
    const np = document.getElementById('s-newPass').value;
    const cp = document.getElementById('s-confirmPass').value;
    if (!np) { showToast('Enter a new password.', 'error'); return; }
    if (np !== cp) { showToast('Passwords do not match.', 'error'); return; }
    localStorage.setItem(PASS_KEY, np);
    document.getElementById('s-newPass').value    = '';
    document.getElementById('s-confirmPass').value = '';
    showToast('Password updated!', 'success');
  });
}

/* ════════════════════════════════════════
   HELPERS
   ════════════════════════════════════════ */
function g(id)      { const el = document.getElementById(id); return el ? el.value.trim() : ''; }
function v(id, val) { const el = document.getElementById(id); if (el) el.value = val ?? ''; }
function esc(s)     { return String(s ?? '').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

function toggleCard(id) {
  const card = document.getElementById(id);
  card.classList.toggle('collapsed');
}

function updatePreview(imgId, src) {
  const img = document.getElementById(imgId);
  if (img) img.src = src;
}

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className   = `toast ${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), 4000);
}

function getDefaultData() {
  return {
    settings: { companyName:'QUANTUMEXE', tagline:'TECHNOLOGIES', logoMark:'QE', accentColor:'#00a8ff', footerText:'Engineering brilliant software — since 2018.' },
    hero: { badge:'Your Vision. Our Technology.', line1:'ENGINEERING', line2:'BRILLIANT', line3:'SOFTWARE', subtitle:'We build high-performance digital products.', cta1:'Our Services', cta2:'View Our Work', stat1Val:200, stat1Suf:'+', stat1Label:'Projects', stat2Val:98, stat2Suf:'%', stat2Label:'Satisfaction', stat3Val:8, stat3Suf:'+', stat3Label:'Years' },
    countdown: { sectionTag:'UPCOMING LAUNCH', title:'QUANTUMEXE PLATFORM 3.0', subtitle:'The most powerful platform yet', daysFromNow:42 },
    services: [
      { title:'WEB DESIGN & DEVELOPMENT', genre:'DESIGN / FULL-STACK', desc:'Modern responsive websites and web apps.', tech:'UI/UX, React, Next.js', image:'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800&q=80', badge:'', featured:true },
      { title:'MOBILE APP DEVELOPMENT', genre:'iOS / ANDROID', desc:'Native and cross-platform mobile apps.', tech:'Flutter, React Native', image:'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80', badge:'', featured:false },
      { title:'AI SOLUTIONS & AUTOMATION', genre:'AI / AUTOMATION', desc:'AI-powered workflows and automation.', tech:'OpenAI, Python, APIs', image:'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80', badge:'', featured:false },
      { title:'WHATSAPP CHATBOTS', genre:'CHATBOTS / MESSAGING', desc:'Automated WhatsApp chatbots for sales and support.', tech:'WhatsApp API, NLP', image:'https://images.unsplash.com/photo-1611606063065-ee7946f0787a?w=800&q=80', badge:'', featured:false },
      { title:'POS SYSTEMS', genre:'RETAIL / POINT OF SALE', desc:'Custom POS with billing and reporting.', tech:'POS, Payments, Reports', image:'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80', badge:'', featured:false },
      { title:'ERP SYSTEMS', genre:'ENTERPRISE / ERP', desc:'End-to-end ERP for business operations.', tech:'ERP, Modules, Dashboards', image:'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80', badge:'', featured:false },
      { title:'INVENTORY MANAGEMENT SYSTEMS', genre:'INVENTORY / LOGISTICS', desc:'Real-time stock and warehouse tracking.', tech:'Stock, Barcode, Alerts', image:'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80', badge:'', featured:false },
      { title:'FACTORY MANAGEMENT SYSTEMS', genre:'MANUFACTURING / OPS', desc:'Production planning and factory monitoring.', tech:'Production, IoT, KPIs', image:'https://images.unsplash.com/photo-1565793298595-6a879b1d9492?w=800&q=80', badge:'', featured:false },
      { title:'CLOUD SOLUTIONS', genre:'CLOUD / INFRASTRUCTURE', desc:'Cloud architecture, migration and management.', tech:'AWS, Azure, GCP', image:'https://images.unsplash.com/photo-1639322537504-6427a16b0a28?w=800&q=80', badge:'', featured:false },
      { title:'SERVER INSTALLATION & MANAGEMENT', genre:'SERVERS / ADMIN', desc:'Server setup, hardening and monitoring.', tech:'Linux, Windows, Monitoring', image:'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800&q=80', badge:'', featured:false },
      { title:'NETWORKING & FIREWALL SOLUTIONS', genre:'NETWORK / SECURITY', desc:'Enterprise networking and firewall protection.', tech:'Firewall, VPN, LAN/WAN', image:'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80', badge:'', featured:false },
      { title:'IP INTEGRATION', genre:'IP / SYSTEMS INTEGRATION', desc:'IP cameras, access control and connected systems.', tech:'IP Cameras, Access, VoIP', image:'https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=800&q=80', badge:'', featured:false },
      { title:'CYBERSECURITY & CLOUD BACKUPS', genre:'SECURITY / BACKUPS', desc:'Cybersecurity hardening and cloud backups.', tech:'Security, Backup, Recovery', image:'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&q=80', badge:'', featured:false },
    ],
    about: { title:'We Build Software', highlight:'That Matters.', p1:'A team of engineers passionate about software.', p2:'From MVP to enterprise-scale platforms.', image:'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=900&q=80', badgeIcon:'💻', badgeTitle:'Since 2018', badgeSub:'Delivering Excellence', features:[{icon:'⚡',title:'Agile',sub:'Fast sprints'},{icon:'🔒',title:'Secure',sub:'Security first'},{icon:'💎',title:'Quality Obsessed',sub:'Polished, tested, built to last'},{icon:'🤝',title:'True Partnership',sub:'Your goals guide every decision'}] },
    team: [
      { name:'Alex Chen', role:'CEO & Founder', photo:'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80' },
      { name:'Jordan Lee', role:'CTO', photo:'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80' },
      { name:'Sam Rivera', role:'Head of Design', photo:'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80' },
      { name:'Maya Patel', role:'Cloud Architect', photo:'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=500&q=80' },
    ],
    blog: [
      { cat:'ENGINEERING', day:'20', month:'FEB', title:'Scaling Our API to 10M Requests/Day', excerpt:'A deep dive...', image:'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=900&q=80', featured:true },
      { cat:'AI', day:'15', month:'FEB', title:'LLMs in Production', excerpt:'', image:'https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=600&q=80', featured:false },
      { cat:'COMPANY', day:'08', month:'FEB', title:'We Raised $4M', excerpt:'', image:'https://images.unsplash.com/photo-1618401479427-c8ef9465fbe1?w=600&q=80', featured:false },
      { cat:'DEVOPS', day:'01', month:'FEB', title:'Zero-Downtime Deployments', excerpt:'', image:'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=600&q=80', featured:false },
    ],
    contact: { title:"Let's Build", highlight:'Something Great', desc:'Have a project? Reach out.', channels:[{icon:'💼',title:'LinkedIn',sub:'Follow us',link:'#'},{icon:'💬',title:'WhatsApp',sub:'Chat with us anytime',link:'#'}], social:[{icon:'🎬',title:'YouTube',sub:'Tutorials & Talks',link:'#'},{icon:'𝕏',title:'X',sub:'Engineering updates',link:'#'},{icon:'📸',title:'Instagram',sub:'Behind the scenes',link:'#'},{icon:'🎵',title:'TikTok',sub:'Shorts & tips',link:'#'}] },
  };
}
