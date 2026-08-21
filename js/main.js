document.addEventListener('DOMContentLoaded', function () {
  const nav = document.getElementById('nav');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  const yearEl = document.getElementById('year');
  if (yearEl) { yearEl.textContent = new Date().getFullYear(); }

  window.addEventListener('scroll', function () {
    nav.classList.toggle('scrolled', window.scrollY > 24);
  }, { passive: true });

  navToggle.addEventListener('click', function () {
    const open = navToggle.classList.toggle('open');
    navLinks.classList.toggle('open', open);
    navToggle.setAttribute('aria-expanded', String(open));
  });

  navLinks.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      navToggle.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { observer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  const giveForm = document.getElementById('giveForm');
  if (giveForm) {
    giveForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const note = document.getElementById('giveNote');
      const select = giveForm.querySelector('select');
      if (!select.value) {
        note.textContent = 'Please select an offering type above.';
        return;
      }
      note.textContent = 'Thank you! Kindly reach out to the church office (+234 803 310 5045) for our official giving account details.';
      giveForm.reset();
    });
  }

  const contactForm = document.getElementById('contactForm');
  const formNote = document.getElementById('formNote');
  if (contactForm && formNote) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      formNote.textContent = 'Thank you for reaching out! We will get back to you soon. You may also reach us on WhatsApp at +234 803 310 5045.';
      contactForm.reset();
    });
  }

  /* ---------- PWA: service worker ---------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {
        /* Service workers require https or localhost — fail silently */
      });
    });
  }

  /* ---------- PWA: standalone (installed app) detection ----------
     Covers three launch contexts:
     - installed PWA (Chrome/Edge desktop & Android): display-mode media query
     - iOS home-screen web app: navigator.standalone
     - our Android APK: its WebView UA ("; wv)") or the utm_source=apk
       entry link — neither PWA signal exists inside a WebView. */
  var ua = navigator.userAgent || '';
  var IS_IOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var IS_ANDROID = /Android/.test(ua);
  var IN_APK = (IS_ANDROID && /;\s*wv\)/.test(ua)) ||
    /[?&]utm_source=apk/.test(window.location.search);

  var isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    IN_APK;

  /* ---------- In-app splash screen (desktop installed app launches) ----------
     Skipped on iOS: the system already displays the identical startup image
     natively. Skipped on Android: Chrome draws its own native splash from the
     manifest before any page code runs. (The APK has a full custom splash.) */
  if (isStandalone && !IS_IOS && !IS_ANDROID && !document.querySelector('.app-splash')) {
    var splashEl = document.createElement('div');
    splashEl.className = 'app-splash';
    splashEl.innerHTML = '<img src="splash.png" alt="House of Glory Christian Centre">';
    document.body.appendChild(splashEl);

    var splashDone = false;
    function hideSplash() {
      if (splashDone) return;
      splashDone = true;
      setTimeout(function () {
        splashEl.classList.add('is-fading');
        setTimeout(function () {
          if (splashEl.parentNode) splashEl.parentNode.removeChild(splashEl);
        }, 550);
      }, 700);
    }
    if (document.readyState === 'complete') hideSplash();
    else window.addEventListener('load', hideSplash);
    setTimeout(hideSplash, 4000); /* safety net */
  }

  /* ---------- Inside the installed app: Download App -> Read the Bible ---------- */
  if (isStandalone) {
    document.querySelectorAll('[data-install-app]').forEach(function (btn) {
      btn.removeAttribute('data-install-app');
      btn.removeAttribute('aria-haspopup');
      btn.setAttribute('href', 'bible.html');
      btn.innerHTML =
        '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>' +
        'Read the Bible';
    });
  }

  /* ---------- PWA: install app button + instructions modal ---------- */
  var deferredPrompt = null;
  var overlay = null;
  var APK_URL = 'house-of-glory.apk';

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;

    /* Auto-offer the install prompt to new visitors shortly after they
       arrive — at most once every 7 days, never inside the installed app. */
    var AUTO_PROMPT_KEY = 'hog-auto-install-prompt';
    var REPROMPT_AFTER = 7 * 24 * 60 * 60 * 1000;
    var seenRecently = false;
    try {
      var last = parseInt(localStorage.getItem(AUTO_PROMPT_KEY), 10);
      seenRecently = !isNaN(last) && Date.now() - last < REPROMPT_AFTER;
    } catch (err) { /* private mode */ }

    if (!seenRecently) {
      setTimeout(function () {
        if (!deferredPrompt || isStandalone) return;
        try {
          localStorage.setItem(AUTO_PROMPT_KEY, String(Date.now()));
        } catch (err) { /* ignore */ }
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
        });
      }, 3500);
    }
  });

  window.addEventListener('appinstalled', function () {
    deferredPrompt = null;
    closeInstallModal();
  });

  function platformSteps() {
    var ua2 = navigator.userAgent || '';
    var isIOS = /iPad|iPhone|iPod/.test(ua2) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var isAndroid = /Android/.test(ua2);

    if (isIOS) {
      return [
        'Open this site in <strong>Safari</strong>.',
        'Tap the <strong>Share</strong> icon <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M16 6l-4-4-4 4M12 2v13"/></svg> at the bottom of the screen.',
        'Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.'
      ];
    }
    if (isAndroid) {
      return [
        'Tap the <strong>&#8942;</strong> menu icon at the top right of your browser.',
        'Tap <strong>Install app</strong> (or <strong>Add to Home screen</strong>).',
        'Confirm by tapping <strong>Install</strong> — the app appears on your home screen.'
      ];
    }
    return [
      'Look for the <strong>install icon</strong> <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg> on the right side of your browser address bar and click it.',
      'Click <strong>Install</strong> in the popup that appears.',
      'The House of Glory app opens in its own window, just like a native app.'
    ];
  }

  function buildInstallModal() {
    overlay = document.createElement('div');
    overlay.className = 'install-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Download the House of Glory app');

    var stepsHtml = platformSteps()
      .map(function (step) { return '<li><span>' + step + '</span></li>'; })
      .join('');

    overlay.innerHTML =
      '<div class="install-modal">' +
      '<button type="button" class="install-modal-close" aria-label="Close">&times;</button>' +
      '<img class="install-modal-icon" src="icon-192.png" alt="House of Glory Christian Centre app icon">' +
      '<h3>Get The House of Glory App</h3>' +
      '<p>Service times, ministries, giving and the <strong>complete Holy Bible</strong> — installed on your device and available offline.</p>' +
      '<ol class="install-steps">' + stepsHtml + '</ol>' +
      (IS_ANDROID
        ? '<a href="' + APK_URL + '" download class="btn btn-primary">Download Android App (.apk)</a>'
        : '<a href="bible.html" class="btn btn-primary">Read the Bible Now</a>') +
      '<p style="margin-top:1rem;font-size:.82rem;color:var(--muted)">Tip: in Chrome, the one-tap Install option appears automatically after visiting this site once or twice.</p>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('.install-modal-close')) {
        closeInstallModal();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeInstallModal();
    });
  }

  function openInstallModal() {
    if (!overlay) buildInstallModal();
    overlay.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function closeInstallModal() {
    if (overlay) {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
    }
  }

  document.querySelectorAll('[data-install-app]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      if (IS_ANDROID) {
        /* Android: always deliver the real app package */
        window.location.href = APK_URL;
      } else if (deferredPrompt) {
        /* Native install dialog — the app installs directly */
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(function () {
          deferredPrompt = null;
        });
      } else {
        openInstallModal();
      }
    });
  });
});