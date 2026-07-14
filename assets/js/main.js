/* =========================================================
   Metin2Public — main.js
   Vanilla JS: theme toggle, mobile drawer, tab switching,
   cookie consent, "show more" toggle, back-to-top, and
   dynamic rendering of mock server/blog/comment data.
   ========================================================= */

(function () {
  'use strict';

  /* ---------- THEME ---------- */
  function setTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem('pvp_theme', t); } catch (e) {}
    document.querySelectorAll('[data-theme-btn]').forEach(function (el) {
      el.classList.toggle('active', el.getAttribute('data-theme-btn') === t);
    });
  }
  function toggleTheme() {
    var cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    setTheme(cur === 'light' ? 'dark' : 'light');
  }
  (function initTheme() {
    var t = 'dark';
    try { t = localStorage.getItem('pvp_theme') || 'dark'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
  })();
  window.addEventListener('DOMContentLoaded', function () {
    setTheme(document.documentElement.getAttribute('data-theme'));
    document.querySelectorAll('[data-theme-toggle]').forEach(function (btn) {
      btn.addEventListener('click', toggleTheme);
    });
    document.querySelectorAll('[data-set-theme]').forEach(function (btn) {
      btn.addEventListener('click', function () { setTheme(btn.getAttribute('data-set-theme')); });
    });
  });

  /* ---------- MOBILE DRAWER ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    var drawer = document.getElementById('mobileDrawer');
    var overlay = document.getElementById('drawerOverlay');
    var openBtn = document.getElementById('hamburgerBtn');
    var closeBtn = document.getElementById('drawerClose');

    function openDrawer() {
      if (!drawer) return;
      drawer.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function closeDrawer() {
      if (!drawer) return;
      drawer.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }
    if (openBtn) openBtn.addEventListener('click', function (e) { e.stopPropagation(); openDrawer(); });
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
    if (overlay) overlay.addEventListener('click', closeDrawer);
  });

  /* ---------- HEADER SEARCH EXPAND ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    var wrap = document.getElementById('headerSearchWrap');
    var box = document.getElementById('headerSearchBox');
    var input = document.getElementById('headerSearch');
    if (!wrap || !box || !input) return;
    box.addEventListener('click', function () {
      if (!wrap.classList.contains('open')) { wrap.classList.add('open'); input.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target) && input.value.trim() === '') wrap.classList.remove('open');
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') { input.value = ''; wrap.classList.remove('open'); input.blur(); }
    });
  });

  /* ---------- USER / AUTH DROPDOWN ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-dropdown-toggle]').forEach(function (btn) {
      var targetId = btn.getAttribute('data-dropdown-toggle');
      var target = document.getElementById(targetId);
      if (!target) return;
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        target.classList.toggle('open');
      });
      target.addEventListener('click', function (e) { e.stopPropagation(); });
    });
    document.addEventListener('click', function () {
      document.querySelectorAll('.open[id]').forEach(function (el) {
        if (el.dataset.persistent !== 'true') el.classList.remove('open');
      });
    });
  });

  /* ---------- COOKIE CONSENT ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    var el = document.getElementById('cookieConsent');
    if (!el) return;
    var ok = false;
    try { ok = !!localStorage.getItem('pvp_cookie_ok'); } catch (e) {}
    if (!ok) el.classList.add('show');
    var acceptBtn = document.getElementById('cookieAccept');
    if (acceptBtn) acceptBtn.addEventListener('click', function () {
      try { localStorage.setItem('pvp_cookie_ok', '1'); } catch (e) {}
      el.classList.remove('show');
    });
  });

  /* ---------- BACK TO TOP ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    var btn = document.getElementById('backToTop');
    if (!btn) return;
    window.addEventListener('scroll', function () {
      btn.classList.toggle('show', window.scrollY > 500);
    });
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ---------- TOP BANNER DISMISS ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('[data-close-banner]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var el = document.getElementById(btn.getAttribute('data-close-banner'));
        if (el) el.style.display = 'none';
      });
    });
  });

  /* ---------- SEO "SHOW MORE" TOGGLE ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    var toggle = document.getElementById('seoToggle');
    var content = document.getElementById('seoContent');
    if (!toggle || !content) return;
    toggle.addEventListener('click', function () {
      var expanded = content.classList.toggle('expanded');
      toggle.textContent = expanded ? 'Daha az göster' : 'Devamını oku';
    });
  });

  /* ---------- TAB SWITCHING (server list filters) ---------- */
  window.addEventListener('DOMContentLoaded', function () {
    var tabs = document.querySelectorAll('.server-tab');
    if (!tabs.length) return;
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        tabs.forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        renderServers(tab.getAttribute('data-filter') || 'all');
      });
    });
  });

  /* ---------- DATA LOADING + RENDERING ---------- */
  var SERVERS = [];
  var BLOG = [];
  var COMMENTS = [];

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function placeholderSvg(text, bg, fg) {
    bg = bg || '1a1d27'; fg = fg || 'f5a623';
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">' +
      '<rect width="200" height="200" fill="#' + bg + '"/>' +
      '<text x="50%" y="50%" fill="#' + fg + '" font-family="sans-serif" font-size="20" font-weight="700" text-anchor="middle" dominant-baseline="middle">' +
      escapeHtml(text) + '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  /* Deterministic pseudo view/comment counters based on server id, so
     numbers stay stable across reloads without needing a backend. */
  function seededNumber(id, max, min) {
    min = min || 0;
    var str = String(id);
    var hash = 0;
    for (var i = 0; i < str.length; i++) { hash = (hash * 31 + str.charCodeAt(i)) >>> 0; }
    return min + (hash % (max - min + 1));
  }
  function viewCount(id) { return seededNumber('v' + id, 480, 12); }
  function commentCount(id) { return seededNumber('c' + id, 24, 0); }

  var EYE_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
  var COMMENT_ICON = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var CALENDAR_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';

  function renderServers(filter) {
    var grid = document.getElementById('serverGrid');
    if (!grid) return;
    filter = filter || 'all';
    var list = SERVERS.filter(function (s) {
      if (filter === 'all') return true;
      return s.status === filter;
    });
    if (!list.length) {
      grid.innerHTML = '<p style="color:var(--color-text-secondary)">Bu kategoride sunucu bulunamadı.</p>';
      return;
    }
    grid.innerHTML = list.map(function (s) {
      var badge = s.status === 'new' ? '<span class="server-badge new">YENİ</span>' :
        s.status === 'soon' ? '<span class="server-badge soon">YAKINDA</span>' : '';
      var views = viewCount(s.id), comments = commentCount(s.id);
      return (
        '<div class="server-card">' +
          '<div class="server-logo-col"><img class="server-logo" src="' + s.logo + '" alt="' + escapeHtml(s.name) + ' logosu"></div>' +
          '<div class="server-info">' +
            '<div class="server-name-row"><span class="server-name">' + escapeHtml(s.name) + '</span>' + badge + '</div>' +
            '<div class="server-meta">' +
              '<span class="server-date">' + CALENDAR_ICON + ' ' + escapeHtml(s.openDate) + '</span>' +
              '<span class="server-desc">' + escapeHtml(s.game) + ' &middot; ' + escapeHtml(s.description) + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="server-vote">' +
            '<div class="server-stats">' +
              '<span>' + EYE_ICON + ' ' + views + '</span>' +
              '<span>' + COMMENT_ICON + ' ' + comments + '</span>' +
            '</div>' +
            '<button class="vote-btn" data-vote-id="' + s.id + '" aria-label="Oy ver">&#9650; <span class="vote-count" data-vote-count="' + s.id + '">' + s.votes + '</span></button>' +
          '</div>' +
        '</div>'
      );
    }).join('');

    grid.querySelectorAll('[data-vote-id]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-vote-id');
        var key = 'pvp_voted_' + id;
        var already = false;
        try { already = !!localStorage.getItem(key); } catch (e) {}
        if (already) return;
        var s = SERVERS.find(function (x) { return String(x.id) === String(id); });
        if (!s) return;
        s.votes += 1;
        try { localStorage.setItem(key, '1'); } catch (e) {}
        var countEl = grid.querySelector('[data-vote-count="' + id + '"]');
        if (countEl) countEl.textContent = s.votes;
        btn.disabled = true;
        btn.style.opacity = '.5';
      });
    });
  }

  function renderSponsored() {
    var grid = document.getElementById('sponsorGrid');
    if (!grid) return;
    var list = SERVERS.filter(function (s) { return s.sponsored; });
    grid.innerHTML = list.map(function (s) {
      var views = viewCount(s.id), votes = s.votes;
      return (
        '<div class="sponsor-card">' +
          '<span class="sponsor-badge">SPONSORLU</span>' +
          '<div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">' +
            '<img class="server-logo" src="' + s.logo + '" alt="' + escapeHtml(s.name) + ' logosu">' +
            '<div><div class="server-name">' + escapeHtml(s.name) + '</div>' +
            '<div class="server-meta"><span>' + escapeHtml(s.game) + '</span></div></div>' +
          '</div>' +
          '<p class="server-desc">' + escapeHtml(s.description) + '</p>' +
          '<div class="sponsor-stats">' +
            '<span>' + EYE_ICON + ' ' + views + '</span>' +
            '<span>&#9650; ' + votes + '</span>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function renderStories() {
    var scroller = document.getElementById('storiesScroll');
    if (!scroller) return;
    scroller.innerHTML = BLOG.slice(0, 6).map(function (b) {
      return (
        '<a class="story-card" href="#">' +
          '<img class="story-thumb" src="' + b.image + '" alt="">' +
          '<div class="story-body">' +
            '<div class="story-cat">' + escapeHtml(b.category) + '</div>' +
            '<div class="story-title">' + escapeHtml(b.title) + '</div>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  function renderBlog() {
    var grid = document.getElementById('blogGrid');
    if (!grid) return;
    grid.innerHTML = BLOG.map(function (b) {
      return (
        '<a class="blog-card" href="#">' +
          '<img class="blog-thumb" src="' + b.image + '" alt="">' +
          '<div class="blog-body">' +
            '<div class="blog-date">' + escapeHtml(b.date) + '</div>' +
            '<div class="blog-title">' + escapeHtml(b.title) + '</div>' +
            '<p class="blog-excerpt">' + escapeHtml(b.excerpt) + '</p>' +
            '<span class="blog-more">Devamını oku &rarr;</span>' +
          '</div>' +
        '</a>'
      );
    }).join('');
  }

  function renderComments() {
    var wrap = document.getElementById('commentsList');
    if (!wrap) return;
    wrap.innerHTML = COMMENTS.map(function (c) {
      var initial = c.author.charAt(0).toUpperCase();
      return (
        '<div class="comment-item">' +
          '<span class="comment-avatar">' + initial + '</span>' +
          '<div class="comment-body">' +
            '<div class="comment-author">' + escapeHtml(c.author) + '</div>' +
            '<p class="comment-text">' + escapeHtml(c.text) + '</p>' +
            '<div class="comment-meta">' + escapeHtml(c.server) + ' &middot; ' + escapeHtml(c.time) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }

  function updateStats() {
    var totalServers = SERVERS.length;
    var totalVotes = SERVERS.reduce(function (sum, s) { return sum + s.votes; }, 0);
    var newToday = SERVERS.filter(function (s) { return s.status === 'new'; }).length;
    var soonCount = SERVERS.filter(function (s) { return s.status === 'soon'; }).length;
    var track = document.getElementById('heroBandTrack');
    if (!track) return;
    var items = [
      '<b>' + totalServers + '</b> SUNUCU YAYINDA',
      '<b>' + totalVotes.toLocaleString('tr-TR') + '</b> OY VERİLDİ',
      '<b>' + newToday + '</b> BUGÜN YENİ AÇILIŞ',
      '<b>' + soonCount + '</b> YAKINDA AÇILACAK'
    ];
    var group = items.map(function (t) {
      return '<span class="hero2-bi">' + t + '</span><span class="hero2-bsep">&#9670;</span>';
    }).join('');
    track.innerHTML = group + group;
  }

  function loadJSON(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('Failed to load ' + url);
      return res.json();
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    Promise.all([
      loadJSON('assets/data/servers.json').catch(function () { return []; }),
      loadJSON('assets/data/blog.json').catch(function () { return []; }),
      loadJSON('assets/data/comments.json').catch(function () { return []; })
    ]).then(function (results) {
      SERVERS = results[0] || [];
      BLOG = results[1] || [];
      COMMENTS = results[2] || [];
      renderServers('all');
      renderSponsored();
      renderStories();
      renderBlog();
      renderComments();
      updateStats();
    });
  });

  // Expose for inline use if ever needed
  window.pvphub = { placeholderSvg: placeholderSvg };
})();
