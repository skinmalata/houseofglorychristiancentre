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
});