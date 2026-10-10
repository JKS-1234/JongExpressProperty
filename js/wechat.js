(function () {
  var modal = document.getElementById('wechat-modal');
  if (!modal) return;
  var ID = 'ivanjong0809';
  var dialog = modal.querySelector('.wechat-dialog');
  var copyBtn = modal.querySelector('[data-wechat-copy]');
  var qrBtn = modal.querySelector('[data-wechat-qr]');
  var qrPanel = modal.querySelector('.wechat-qr-panel');
  var status = modal.querySelector('.wechat-status');
  var lastFocus = null;
  var timer = null;

  function open(e) {
    if (e) e.preventDefault();
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.documentElement.classList.add('wechat-open');
    copyBtn.focus();
  }

  function close() {
    modal.hidden = true;
    document.documentElement.classList.remove('wechat-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function notify(msg) {
    status.textContent = msg;
    copyBtn.textContent = msg === 'Copied!' ? 'Copied!' : 'Copy WeChat ID';
    clearTimeout(timer);
    timer = setTimeout(function () {
      status.textContent = '';
      copyBtn.textContent = 'Copy WeChat ID';
    }, 2500);
  }

  function fallbackCopy() {
    var ta = document.createElement('textarea');
    ta.value = ID;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    dialog.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, ID.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    dialog.removeChild(ta);
    copyBtn.focus();
    return ok;
  }

  copyBtn.addEventListener('click', function () {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(ID).then(function () { notify('Copied!'); }, function () {
        notify(fallbackCopy() ? 'Copied!' : 'Press and hold the ID to copy');
      });
    } else {
      notify(fallbackCopy() ? 'Copied!' : 'Press and hold the ID to copy');
    }
  });

  qrBtn.addEventListener('click', function () {
    var show = qrPanel.hidden;
    qrPanel.hidden = !show;
    qrBtn.setAttribute('aria-expanded', String(show));
  });

  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-wechat-open]') : null;
    if (t) open(e);
  });
  modal.addEventListener('click', function (e) {
    if (e.target === modal || (e.target.closest && e.target.closest('[data-wechat-close]'))) close();
  });
  document.addEventListener('keydown', function (e) {
    if (modal.hidden) return;
    if (e.key === 'Escape' || e.key === 'Esc') { close(); return; }
    if (e.key !== 'Tab') return;
    var f = Array.prototype.filter.call(dialog.querySelectorAll('button, a[href]'), function (el) { return el.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
