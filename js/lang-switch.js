/* Custom language switcher. Google Translate stays the engine; its own UI is hidden (see css/style.css). */
(function () {
  var LANGS = [
    { code: 'en', label: 'English' },
    { code: 'zh-CN', label: '中文 (Chinese Simplified)' },
    { code: 'zh-TW', label: '繁體中文 (Traditional)' },
    { code: 'ms', label: 'Bahasa Malaysia' }
  ];

  function readCookie() {
    var m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^\/]*\/([^;]+)/);
    return m ? decodeURIComponent(m[1]) : 'en';
  }

  function setCookie(value, expired) {
    var parts = ['googtrans=' + value, 'path=/'];
    if (expired) parts.push('expires=Thu, 01 Jan 1970 00:00:00 GMT');
    var base = parts.join('; ');
    document.cookie = base;
    var host = location.hostname;
    if (host.indexOf('.') > -1 && !/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      document.cookie = base + '; domain=' + host;
      document.cookie = base + '; domain=.' + host.replace(/^www\./, '');
    }
  }

  function choose(code) {
    if (code === 'en') setCookie('', true); else setCookie('/en/' + code, false);
    var combo = document.querySelector('.goog-te-combo');
    if (combo && code !== 'en') {
      combo.value = code;
      combo.dispatchEvent(new Event('change'));
      return;
    }
    location.reload();
  }

  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: LANGS.map(function (l) { return l.code; }).join(',')
    }, 'google_translate_element');
  };

  function loadGoogle() {
    var s = document.createElement('script');
    s.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(s);
  }

  function build(host) {
    var current = readCookie();
    var cur = LANGS.filter(function (l) { return l.code === current; })[0] || LANGS[0];
    current = cur.code;
    host.className = 'lang-switch notranslate';
    host.setAttribute('translate', 'no');

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lang-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = '\uD83C\uDF10 ' + (current === 'en' ? 'Language' : cur.label.split(' ')[0]) + ' \u25BE';

    var menu = document.createElement('ul');
    menu.className = 'lang-menu';
    menu.setAttribute('role', 'listbox');
    menu.hidden = true;
    LANGS.forEach(function (l) {
      var li = document.createElement('li');
      li.setAttribute('role', 'option');
      li.textContent = l.label;
      li.tabIndex = 0;
      if (l.code === current) { li.className = 'active'; li.setAttribute('aria-selected', 'true'); }
      var go = function () { if (l.code !== current) choose(l.code); else toggle(false); };
      li.addEventListener('click', go);
      li.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      menu.appendChild(li);
    });

    function toggle(open) {
      menu.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggle(menu.hidden); });
    document.addEventListener('click', function () { toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });

    host.appendChild(btn);
    host.appendChild(menu);

    if (current !== 'en') {
      var g = document.createElement('div');
      g.id = 'google_translate_element';
      g.style.display = 'none';
      document.body.appendChild(g);
      loadGoogle();
    }
  }

  function init() {
    var host = document.getElementById('lang-switch');
    if (host) build(host);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
