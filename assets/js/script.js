'use strict';

/**
 * navbar toggle
 */

const overlay = document.querySelector("[data-overlay]");
const navOpenBtn = document.querySelector("[data-nav-open-btn]");
const navbar = document.querySelector("[data-navbar]");
const navCloseBtn = document.querySelector("[data-nav-close-btn]");
const navLinks = document.querySelectorAll("[data-nav-link]");

const navElemArr = [navOpenBtn, navCloseBtn, overlay];

const navToggleEvent = function (elem) {
  for (let i = 0; i < elem.length; i++) {
    elem[i].addEventListener("click", function () {
      navbar.classList.toggle("active");
      overlay.classList.toggle("active");
    });
  }
}

navToggleEvent(navElemArr);
navToggleEvent(navLinks);



/**
 * header sticky & go to top
 */

const header = document.querySelector("[data-header]");
const goTopBtn = document.querySelector("[data-go-top]");

window.addEventListener("scroll", function () {

  if (window.scrollY >= 200) {
    header.classList.add("active");
    goTopBtn.classList.add("active");
  } else {
    header.classList.remove("active");
    goTopBtn.classList.remove("active");
  }

});



/**
 * dark / light mode toggle
 */

(function () {
  var LS_KEY = 'manasik_theme';

  function getSaved() {
    try { return localStorage.getItem(LS_KEY); } catch (_) { return null; }
  }
  function save(theme) {
    try { localStorage.setItem(LS_KEY, theme); } catch (_) {}
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? 'Passer en mode jour' : 'Passer en mode nuit');
      btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    }
  }

  // Applique immédiatement pour éviter le flash
  var saved = getSaved();
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  // Attache le listener une fois le DOM prêt
  function bindToggle() {
    var btn = document.getElementById('theme-toggle');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      var next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      save(next);
    });
    // Suit les changements système si pas de préférence manuelle
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function (e) {
        if (!getSaved()) applyTheme(e.matches ? 'dark' : 'light');
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindToggle);
  } else {
    bindToggle();
  }
})();



/**
 * search button — overlay de recherche avec suggestions dynamiques
 */

(function () {

  function initSearch() {
    var searchBtn = document.querySelector('.search-btn');
    if (!searchBtn) return;

    // ── Détection du chemin de base (index vs sous-répertoire) ──────────────
    var pathParts = window.location.pathname.split('/');
    var inServices = pathParts.some(function(p) { return p === 'services'; });
    var base = inServices ? '../' : './';

    // ── Création de l'overlay ───────────────────────────────────────────────
    var overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.id = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Recherche de destinations');
    overlay.setAttribute('data-i18n-skip', '');
    overlay.innerHTML =
      '<div class="search-overlay-inner">' +
        '<div class="search-overlay-header">' +
          '<input type="search" class="search-overlay-input" id="search-overlay-input"' +
            ' placeholder="Rechercher une destination\u2026"' +
            ' autocomplete="off" autocorrect="off" spellcheck="false"' +
            ' aria-label="Rechercher une destination" />' +
          '<button class="search-overlay-close" id="search-overlay-close" aria-label="Fermer">\u2715</button>' +
        '</div>' +
        '<div class="search-suggestions" id="search-suggestions"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    var input        = document.getElementById('search-overlay-input');
    var closeBtn     = document.getElementById('search-overlay-close');
    var suggestBox   = document.getElementById('search-suggestions');
    var activeIndex  = -1;
    var debounceTimer = null;

    // ── Module search chargé à la demande ───────────────────────────────────
    var searchModule = null;

    function loadSearchModule(cb) {
      if (searchModule) { cb(searchModule); return; }
      import(base + 'assets/js/search.js')
        .then(function (mod) { searchModule = mod; cb(mod); })
        .catch(function (err) { console.error('[search] Impossible de charger search.js', err); });
    }

    // ── Rendu des suggestions ────────────────────────────────────────────────

    function renderDestItem(dest) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'search-suggestion-item';
      item.dataset.slug = dest.slug;
      item.dataset.name = dest.name;
      // Miniature
      var img = '<img class="search-suggestion-img" src="' +
        base + dest.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'">';
      // Texte
      var txt = '<span class="search-suggestion-text">' +
        '<span class="search-suggestion-name">' + dest.name + '</span>' +
        '<span class="search-suggestion-country">' + dest.country + '</span>' +
        '</span>';
      item.innerHTML = img + txt;
      item.addEventListener('click', function () {
        navigateTo(dest.slug);
      });
      return item;
    }

    function renderServiceItem(svc) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'search-suggestion-item search-suggestion-service';
      item.dataset.serviceSlug = svc.slug;
      var icon = '<span class="search-suggestion-service-icon">&#128279;</span>';
      var txt = '<span class="search-suggestion-text">' +
        '<span class="search-suggestion-name">' + svc.label + '</span>' +
        '<span class="search-suggestion-country">Service</span>' +
        '</span>';
      item.innerHTML = icon + txt;
      item.addEventListener('click', function () {
        window.location.href = base + 'services/' + svc.slug + '.html';
        closeOverlay();
      });
      return item;
    }

    function setActive(idx) {
      var items = suggestBox.querySelectorAll('.search-suggestion-item');
      items.forEach(function (el, i) {
        el.classList.toggle('active', i === idx);
      });
      activeIndex = idx;
    }

    function showFeatured(mod) {
      var featured = mod.getFeatured().slice(0, 6);
      suggestBox.innerHTML = '';
      if (!featured.length) return;
      var heading = document.createElement('p');
      heading.className = 'search-suggestions-heading';
      heading.textContent = 'Destinations populaires';
      suggestBox.appendChild(heading);
      featured.forEach(function (dest) {
        suggestBox.appendChild(renderDestItem(dest));
      });
      activeIndex = -1;
    }

    function showResults(mod, query) {
      var results = mod.searchDestinations(query, 6);
      suggestBox.innerHTML = '';
      activeIndex = -1;

      if (results.length) {
        results.forEach(function (dest) {
          suggestBox.appendChild(renderDestItem(dest));
        });
      } else {
        // Aucun résultat destination — proposer des services
        var noResult = document.createElement('p');
        noResult.className = 'search-no-result';
        noResult.textContent = 'Aucune destination trouvée pour « ' + query + ' ».';
        suggestBox.appendChild(noResult);

        var services = mod.searchServices(query);
        if (services.length) {
          var svcHeading = document.createElement('p');
          svcHeading.className = 'search-suggestions-heading';
          svcHeading.textContent = 'Services correspondants';
          suggestBox.appendChild(svcHeading);
          services.forEach(function (svc) {
            suggestBox.appendChild(renderServiceItem(svc));
          });
        }
      }
    }

    // ── Navigation vers une destination ─────────────────────────────────────

    function navigateTo(slug) {
      window.location.href = base + 'destination.html#destination/' + slug;
      closeOverlay();
    }

    // ── Ouverture / fermeture ────────────────────────────────────────────────

    function openOverlay() {
      overlay.classList.add('active');
      overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      setTimeout(function () { input.focus(); }, 50);
      // Charge les featured immédiatement
      loadSearchModule(function (mod) { showFeatured(mod); });
    }

    function closeOverlay() {
      overlay.classList.remove('active');
      overlay.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      input.value = '';
      suggestBox.innerHTML = '';
      activeIndex = -1;
    }

    // ── Debounce saisie ──────────────────────────────────────────────────────

    input.addEventListener('input', function () {
      var query = input.value.trim();
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function () {
        loadSearchModule(function (mod) {
          if (query.length < 1) {
            showFeatured(mod);
          } else {
            showResults(mod, query);
          }
        });
      }, 150);
    });

    // ── Navigation clavier ───────────────────────────────────────────────────

    input.addEventListener('keydown', function (e) {
      var items = suggestBox.querySelectorAll('.search-suggestion-item');
      var count = items.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(Math.min(activeIndex + 1, count - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(Math.max(activeIndex - 1, -1));
        if (activeIndex === -1) input.focus();
      } else if (e.key === 'Escape') {
        closeOverlay();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < count) {
          items[activeIndex].click();
        } else {
          // Pas de sélection active — valider la saisie
          var query = input.value.trim();
          if (!query) return;
          loadSearchModule(function (mod) {
            var results = mod.searchDestinations(query, 6);
            if (results.length === 1) {
              navigateTo(results[0].slug);
            } else {
              window.location.href = base + 'destinations.html?q=' + encodeURIComponent(query);
              closeOverlay();
            }
          });
        }
      }
    });

    // ── Fermeture via clic sur le fond (hors inner) ──────────────────────────

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeOverlay();
    });

    closeBtn.addEventListener('click', closeOverlay);

    // ── Fermeture globale Échap ──────────────────────────────────────────────

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('active')) closeOverlay();
    });

    // ── Branchement du bouton search ────────────────────────────────────────

    searchBtn.addEventListener('click', openOverlay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
  } else {
    initSearch();
  }
})();


/**
 * App install popup
 * - S'affiche 3 secondes après l'arrivée sur la page
 * - Ne réapparaît pas avant 7 jours (localStorage)
 * - Fermeture par : × / "Plus tard" / clic hors popup
 */
(function () {
  var STORAGE_KEY = 'manasik_app_popup_dismissed';
  var DELAY_MS    = 3000;   // délai avant affichage (ms)
  var COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

  function isDismissed() {
    try {
      var ts = localStorage.getItem(STORAGE_KEY);
      if (!ts) return false;
      return (Date.now() - parseInt(ts, 10)) < COOLDOWN_MS;
    } catch (_) { return false; }
  }

  function dismiss() {
    try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch (_) {}
    var popup = document.getElementById('app-popup');
    if (popup) {
      popup.style.opacity = '0';
      popup.style.transition = 'opacity 0.25s';
      setTimeout(function () { popup.style.display = 'none'; }, 250);
    }
    document.body.style.overflow = '';
  }

  function showPopup() {
    var popup = document.getElementById('app-popup');
    if (!popup) return;
    popup.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // bloque le scroll derrière

    // Fermeture × 
    var closeBtn = document.getElementById('app-popup-close');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    // Bouton "Plus tard"
    var laterBtn = document.getElementById('app-popup-later');
    if (laterBtn) laterBtn.addEventListener('click', dismiss);

    // Clic sur le fond sombre
    popup.addEventListener('click', function (e) {
      if (e.target === popup) dismiss();
    });

    // Touche Échap
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape') { dismiss(); document.removeEventListener('keydown', onEsc); }
    });

    // Bouton téléchargement → ferme aussi la popup
    var dlBtn = document.getElementById('app-popup-btn');
    if (dlBtn) dlBtn.addEventListener('click', dismiss);
  }

  function init() {
    if (isDismissed()) return;
    setTimeout(showPopup, DELAY_MS);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
