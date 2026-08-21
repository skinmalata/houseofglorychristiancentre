/* ==========================================================================
   House of Glory Christian Centre | bible.js
   Complete KJV Bible reader (data lives in bible-data.js).
   ========================================================================== */
(function () {
  "use strict";

  var BOOKS = window.BIBLE_BOOKS || [];
  var OT_COUNT = 39;
  var FONT_KEY = "hog-bible-font";
  var POS_KEY = "hog-bible-pos";
  var MIN_FONT = 15;
  var MAX_FONT = 30;
  var MAX_RESULTS = 300;

  var els = {
    bookSelect: document.getElementById("bookSelect"),
    chapterSelect: document.getElementById("chapterSelect"),
    prevChapter: document.getElementById("prevChapter"),
    nextChapter: document.getElementById("nextChapter"),
    chapterTitle: document.getElementById("chapterTitle"),
    chapterText: document.getElementById("chapterText"),
    readerStatus: document.getElementById("readerStatus"),
    pagerPrev: document.getElementById("pagerPrev"),
    pagerNext: document.getElementById("pagerNext"),
    searchInput: document.getElementById("searchInput"),
    searchClear: document.getElementById("searchClear"),
    searchResults: document.getElementById("searchResults"),
    fontSmaller: document.getElementById("fontSmaller"),
    fontLarger: document.getElementById("fontLarger")
  };

  if (!BOOKS.length || !els.bookSelect) return;

  var current = { book: 0, chapter: 0 };

  /* ---------- Setup selects ---------- */
  function populateBooks() {
    var ot = document.createElement("optgroup");
    ot.label = "Old Testament";
    var nt = document.createElement("optgroup");
    nt.label = "New Testament";
    BOOKS.forEach(function (book, i) {
      var opt = document.createElement("option");
      opt.value = String(i);
      opt.textContent = book.n;
      (i < OT_COUNT ? ot : nt).appendChild(opt);
    });
    els.bookSelect.appendChild(ot);
    els.bookSelect.appendChild(nt);
  }

  function populateChapters(bookIndex) {
    els.chapterSelect.innerHTML = "";
    var count = BOOKS[bookIndex].c.length;
    for (var c = 1; c <= count; c++) {
      var opt = document.createElement("option");
      opt.value = String(c);
      opt.textContent = c === 1 && count > 1 ? "Chapter " + c : String(c);
      els.chapterSelect.appendChild(opt);
    }
  }

  /* ---------- Rendering ---------- */
  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function renderChapter() {
    var book = BOOKS[current.book];
    var verses = book.c[current.chapter];

    els.chapterTitle.textContent = book.n + " " + (current.chapter + 1);
    els.bookSelect.value = String(current.book);
    populateChapters(current.book);
    els.chapterSelect.value = String(current.chapter + 1);

    var html = "";
    for (var v = 0; v < verses.length; v++) {
      html +=
        '<span class="verse" id="v-' + (v + 1) + '">' +
        '<span class="verse__num">' + (v + 1) + "</span>" +
        escapeHtml(verses[v]) +
        "</span> ";
    }
    els.chapterText.innerHTML = html;

    var label =
      book.n + " " + (current.chapter + 1) + " · " + verses.length + " verses";
    els.readerStatus.textContent = label;

    savePosition();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goTo(bookIndex, chapterIndex, highlightVerse) {
    current.book = Math.min(Math.max(bookIndex, 0), BOOKS.length - 1);
    current.chapter = Math.min(
      Math.max(chapterIndex, 0),
      BOOKS[current.book].c.length - 1
    );
    renderChapter();
    if (highlightVerse) {
      var el = document.getElementById("v-" + highlightVerse);
      if (el) {
        el.classList.add("is-highlighted");
        setTimeout(function () {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 60);
        setTimeout(function () {
          el.classList.remove("is-highlighted");
        }, 3200);
      }
    }
  }

  function step(direction) {
    var b = current.book;
    var c = current.chapter + direction;
    if (c < 0) {
      b = (b - 1 + BOOKS.length) % BOOKS.length;
      c = BOOKS[b].c.length - 1;
    } else if (c >= BOOKS[b].c.length) {
      b = (b + 1) % BOOKS.length;
      c = 0;
    }
    goTo(b, c);
  }

  /* ---------- Persistence ---------- */
  function savePosition() {
    try {
      localStorage.setItem(POS_KEY, JSON.stringify(current));
    } catch (e) { /* private mode */ }
  }

  function restorePosition() {
    var b = 0;
    var c = 0;
    try {
      var saved = JSON.parse(localStorage.getItem(POS_KEY));
      if (
        saved &&
        typeof saved.book === "number" &&
        BOOKS[saved.book] &&
        saved.chapter >= 0 &&
        saved.chapter < BOOKS[saved.book].c.length
      ) {
        b = saved.book;
        c = saved.chapter;
      }
    } catch (e) { /* ignore */ }

    /* Deep link: bible.html?b=John&c=3 */
    var params = new URLSearchParams(window.location.search);
    var qBook = params.get("b");
    var qChapter = parseInt(params.get("c"), 10);
    if (qBook) {
      var idx = BOOKS.findIndex(function (book) {
        return book.n.toLowerCase() === qBook.toLowerCase();
      });
      if (idx !== -1) {
        b = idx;
        if (!isNaN(qChapter) && qChapter >= 1 && qChapter <= BOOKS[idx].c.length) {
          c = qChapter - 1;
        }
      }
    }
    goTo(b, c);
  }

  /* ---------- Search ---------- */
  var searchTimer = null;

  function runSearch(query) {
    var needle = query.trim().toLowerCase();
    if (needle.length < 3) {
      hideResults();
      return;
    }

    var results = [];
    for (var b = 0; b < BOOKS.length && results.length < MAX_RESULTS; b++) {
      for (var c = 0; c < BOOKS[b].c.length && results.length < MAX_RESULTS; c++) {
        var verses = BOOKS[b].c[c];
        for (var v = 0; v < verses.length; v++) {
          var lower = verses[v].toLowerCase();
          var at = lower.indexOf(needle);
          if (at !== -1) {
            results.push({ b: b, c: c, v: v, text: verses[v], at: at });
            if (results.length >= MAX_RESULTS) break;
          }
        }
      }
    }

    showResults(results, needle);
  }

  function showResults(results, needle) {
    if (!results.length) {
      els.searchResults.innerHTML =
        '<p class="bible-search__empty">No verses found for &ldquo;' +
        escapeHtml(needle) + '&rdquo;.</p>';
      els.searchResults.hidden = false;
      els.searchClear.hidden = false;
      return;
    }

    var html =
      '<p class="bible-search__count">' +
      results.length +
      (results.length >= MAX_RESULTS ? "+" : "") +
      ' result' + (results.length === 1 ? "" : "s") + "</p>";

    results.forEach(function (r, i) {
      var start = Math.max(0, r.at - 40);
      var end = Math.min(r.text.length, r.at + needle.length + 60);
      var snippet =
        (start > 0 ? "&hellip;" : "") +
        escapeHtml(r.text.slice(start, r.at)) +
        "<mark>" +
        escapeHtml(r.text.slice(r.at, r.at + needle.length)) +
        "</mark>" +
        escapeHtml(r.text.slice(r.at + needle.length, end)) +
        (end < r.text.length ? "&hellip;" : "");

      html +=
        '<button type="button" class="bible-search__result" data-i="' + i + '">' +
        '<span class="bible-search__ref">' +
        BOOKS[r.b].n + " " + (r.c + 1) + ":" + (r.v + 1) +
        "</span>" +
        '<span class="bible-search__text">' + snippet + "</span>" +
        "</button>";
    });

    els.searchResults.innerHTML = html;
    els.searchResults.hidden = false;
    els.searchClear.hidden = false;

    els.searchResults.querySelectorAll(".bible-search__result").forEach(
      function (btn) {
        btn.addEventListener("click", function () {
          var r = results[parseInt(btn.getAttribute("data-i"), 10)];
          hideResults();
          els.searchInput.value = "";
          els.searchClear.hidden = true;
          goTo(r.b, r.c, r.v + 1);
        });
      }
    );
  }

  function hideResults() {
    els.searchResults.hidden = true;
    els.searchResults.innerHTML = "";
  }

  /* ---------- Font size ---------- */
  function applyFont(size) {
    size = Math.min(Math.max(size, MIN_FONT), MAX_FONT);
    els.chapterText.style.fontSize = size + "px";
    try {
      localStorage.setItem(FONT_KEY, String(size));
    } catch (e) { /* ignore */ }
  }

  function restoreFont() {
    var size = 19;
    try {
      var saved = parseInt(localStorage.getItem(FONT_KEY), 10);
      if (!isNaN(saved)) size = saved;
    } catch (e) { /* ignore */ }
    applyFont(size);
  }

  /* ---------- Events ---------- */
  els.bookSelect.addEventListener("change", function () {
    goTo(parseInt(this.value, 10), 0);
  });

  els.chapterSelect.addEventListener("change", function () {
    goTo(current.book, parseInt(this.value, 10) - 1);
  });

  els.prevChapter.addEventListener("click", function () { step(-1); });
  els.nextChapter.addEventListener("click", function () { step(1); });
  els.pagerPrev.addEventListener("click", function () { step(-1); });
  els.pagerNext.addEventListener("click", function () { step(1); });

  els.searchInput.addEventListener("input", function () {
    clearTimeout(searchTimer);
    var value = this.value;
    els.searchClear.hidden = value.length === 0;
    searchTimer = setTimeout(function () { runSearch(value); }, 220);
  });

  els.searchClear.addEventListener("click", function () {
    els.searchInput.value = "";
    this.hidden = true;
    hideResults();
    els.searchInput.focus();
  });

  document.addEventListener("click", function (e) {
    if (!e.target.closest(".bible-search")) hideResults();
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") hideResults();
  });

  els.fontSmaller.addEventListener("click", function () {
    applyFont((parseInt(els.chapterText.style.fontSize, 10) || 19) - 2);
  });

  els.fontLarger.addEventListener("click", function () {
    applyFont((parseInt(els.chapterText.style.fontSize, 10) || 19) + 2);
  });

  /* ---------- Boot ---------- */
  populateBooks();
  restoreFont();
  restorePosition();
})();
