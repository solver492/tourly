/**
 * destination-page.js
 * Gabarit dynamique pour destination.html
 * Lit le hash #destination/<slug>, charge les données depuis destinations.config.js
 * et génère l'intégralité de la page.
 *
 * Structure générée :
 *   1. Fil d'Ariane
 *   2. Hero (image, nom, pays, accroche, CTAs)
 *   3. Intro + fiche rapide
 *   4. À voir et à faire (highlights)
 *   5. Conseils pratiques (tips)
 *   6. Services liés
 *   7. FAQ accordéon
 *   8. Destinations similaires
 *   9. Navigation précédente/suivante
 *  10. CTA contact / WhatsApp
 *
 * SEO : <title>, <meta description>, Open Graph, JSON-LD TouristDestination + BreadcrumbList
 */

import { DESTINATIONS_CONFIG } from './destinations.config.js';
import { getVirtualTours } from './destinations.360tr.js';
import { getStreetviewTours } from './destinations.streetview.js';
import { getBySlug, getSimilar } from './search.js';
import { services as SERVICES_CONFIG } from './services.config.js';

// ─── Icônes par highlight (rotation depuis une liste) ──────────────────────
const HIGHLIGHT_ICONS = [
  'eye-outline', 'camera-outline', 'walk-outline', 'compass-outline',
  'heart-outline', 'star-outline', 'map-outline', 'flag-outline',
  'sunny-outline', 'leaf-outline', 'boat-outline', 'restaurant-outline',
];

// ─── FAQ par défaut (générique, remplacée si la config en fournit) ──────────
function buildFaq(dest) {
  return [
    {
      q: `Quelle est la meilleure période pour visiter ${dest.name} ?`,
      a: dest.bestSeason || 'Consultez-nous pour connaître la période idéale selon vos envies et contraintes.',
    },
    {
      q: `Comment se rendre à ${dest.name} depuis le Maroc ?`,
      a: `Des vols directs ou avec escale desservent régulièrement ${dest.name} depuis les principaux aéroports marocains. Notre équipe peut vous proposer les meilleures options selon vos dates.`,
    },
    {
      q: `Quels documents faut-il pour voyager à ${dest.name} ?`,
      a: `Un passeport en cours de validité est généralement requis. Selon votre nationalité et la destination, un visa peut être nécessaire. Renseignez-vous auprès de nos conseillers pour les formalités à jour.`,
    },
    {
      q: `Manasik Bayt Travel propose-t-il des forfaits tout compris pour ${dest.name} ?`,
      a: `Oui, nous organisons des séjours sur mesure incluant vols, hébergement, transferts et activités. Contactez-nous pour un devis personnalisé.`,
    },
  ];
}

// ─── Helpers HTML ──────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Génération SEO ────────────────────────────────────────────────────────

function applySeo(dest) {
  const title       = `${dest.name} — Voyage avec Manasik Bayt Travel`;
  const description = `${dest.tagline} ${dest.intro ? dest.intro.substring(0, 120) + '…' : ''}`.trim();
  const url         = `https://agency.manasiktravelagency.com/destination.html#destination/${dest.slug}`;
  const img         = `https://agency.manasiktravelagency.com/${dest.image}`;

  document.title = title;

  const head = document.head;

  // Meta description
  let metaDesc = head.querySelector('meta[name="description"]');
  if (!metaDesc) { metaDesc = document.createElement('meta'); metaDesc.name = 'description'; head.appendChild(metaDesc); }
  metaDesc.content = description;

  // Open Graph
  const og = { 'og:type': 'website', 'og:title': title, 'og:description': description, 'og:url': url, 'og:image': img };
  Object.entries(og).forEach(([prop, content]) => {
    let el = head.querySelector(`meta[property="${prop}"]`);
    if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); head.appendChild(el); }
    el.content = content;
  });

  // JSON-LD
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'TouristDestination',
        name: dest.name,
        description: description,
        url: url,
        image: img,
        touristType: dest.tags || [],
        includesAttraction: (dest.highlights || []).map(h => ({ '@type': 'TouristAttraction', name: h })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Accueil',       item: 'https://agency.manasiktravelagency.com/index.html' },
          { '@type': 'ListItem', position: 2, name: 'Destinations',  item: 'https://agency.manasiktravelagency.com/destinations.html' },
          { '@type': 'ListItem', position: 3, name: dest.name,       item: url },
        ],
      },
    ],
  };
  let ldScript = head.querySelector('script[data-dpage-ld]');
  if (!ldScript) { ldScript = document.createElement('script'); ldScript.type = 'application/ld+json'; ldScript.dataset.dpageLd = ''; head.appendChild(ldScript); }
  ldScript.textContent = JSON.stringify(ld);
}

// ─── Construction du HTML ──────────────────────────────────────────────────

function renderBreadcrumb(dest) {
  return `
    <nav class="dpage-breadcrumb" aria-label="Fil d'Ariane">
      <ol>
        <li><a href="index.html">Accueil</a></li>
        <li><a href="destinations.html">Destinations</a></li>
        <li><span aria-current="page">${esc(dest.name)}</span></li>
      </ol>
    </nav>`;
}

function getToursFor(dest) {
  const tours = getVirtualTours(dest.slug).slice();
  // Complète avec les visites immersives Mapillary/Panoramax (réseau plus large).
  tours.push(...getStreetviewTours(dest.slug));
  if (!tours.length && dest.virtualTourUrl) {
    tours.push({ title: `Visite virtuelle — ${dest.name}`, url: dest.virtualTourUrl });
  }
  return tours;
}

function renderHero(dest) {
  const imgPath = dest.image || `assets/images/destinations/${dest.slug}.jpg`;
  const isHajj  = (dest.tags || []).includes('omra-hajj');
  const tours   = getToursFor(dest);
  return `
    <section class="dpage-hero" aria-label="Hero ${esc(dest.name)}">
      <div class="dpage-hero-bg" style="background-image:url('${esc(imgPath)}')"></div>
      <div class="dpage-hero-overlay"></div>
      <div class="dpage-hero-content container">
        ${isHajj ? '<span class="dest-country-tag">Omra &amp; Hajj</span>' : ''}
        <h1 class="dpage-hero-title">${esc(dest.name)}</h1>
        <p class="dpage-hero-tagline">${esc(dest.tagline || '')}</p>
        <div class="btn-group">
          ${tours.length ? `<button type="button" class="btn btn-tour" data-tour-dest="${esc(dest.slug)}"><ion-icon name="navigate-outline" aria-hidden="true"></ion-icon>Visite virtuelle${tours.length > 1 ? ` (${tours.length})` : ''}</button>` : ''}
          <a href="index.html#contact" class="btn btn-secondary">Demander un devis</a>
          <a href="index.html#package" class="btn btn-primary">Voir les forfaits</a>
        </div>
      </div>
    </section>`;
}

function renderIntro(dest) {
  return `
    <section class="dpage-section">
      <div class="container">
        <div class="dpage-intro-grid">
          <div class="dpage-intro-text">
            <p class="dpage-section-subtitle">À propos</p>
            <h2 class="dpage-section-title">${esc(dest.name)}</h2>
            <p>${esc(dest.intro || '')}</p>
          </div>
          <aside class="dpage-fact-card" aria-label="Fiche rapide">
            <h3 class="dpage-fact-card-title">
              <ion-icon name="information-circle-outline" aria-hidden="true"></ion-icon>
              Fiche rapide
            </h3>
            <ul class="dpage-fact-list">
              <li class="dpage-fact-item">
                <span class="dpage-fact-label">
                  <ion-icon name="flag-outline" aria-hidden="true"></ion-icon>
                  Pays
                </span>
                <span class="dpage-fact-value">${esc(dest.country)}</span>
              </li>
              <li class="dpage-fact-item">
                <span class="dpage-fact-label">
                  <ion-icon name="globe-outline" aria-hidden="true"></ion-icon>
                  Région
                </span>
                <span class="dpage-fact-value">${esc(dest.region || '')}</span>
              </li>
              <li class="dpage-fact-item">
                <span class="dpage-fact-label">
                  <ion-icon name="calendar-outline" aria-hidden="true"></ion-icon>
                  Meilleure période
                </span>
                <span class="dpage-fact-value">${esc(dest.bestSeason || '—')}</span>
              </li>
              ${(dest.tags || []).length ? `
              <li class="dpage-fact-item">
                <span class="dpage-fact-label">
                  <ion-icon name="pricetag-outline" aria-hidden="true"></ion-icon>
                  Type de séjour
                </span>
                <span class="dpage-fact-value">${dest.tags.map(t => ({
                  'omra-hajj':'Omra &amp; Hajj','culture':'Culture','plage':'Plage',
                  'nature':'Nature','ville':'Ville','montagne':'Montagne',
                  'famille':'Famille','luxe':'Luxe'
                }[t] || t)).join(', ')}</span>
              </li>` : ''}
            </ul>
          </aside>
        </div>
      </div>
    </section>`;
}

function renderGallery(dest) {
  const imgs = (dest.images && dest.images.length)
    ? dest.images
    : [dest.image || `assets/images/destinations/${dest.slug}.jpg`];
  const unique = [...new Set(imgs)].slice(0, 4);
  if (unique.length < 2) return '';
  const items = unique.map((src, i) => `
    <button type="button" class="dpage-gallery-item" data-gallery-src="${esc(src)}"
            aria-label="Agrandir la photo ${i + 1} de ${esc(dest.name)}">
      <img src="${esc(src)}" alt="${esc(dest.name)} — photo ${i + 1}" loading="lazy"
           onerror="this.closest('.dpage-gallery-item').style.display='none'"/>
    </button>`).join('');
  return `
    <section class="dpage-section dpage-gallery-section">
      <div class="container">
        <p class="dpage-section-subtitle">En images</p>
        <h2 class="dpage-section-title">Galerie — ${esc(dest.name)}</h2>
        <div class="dpage-gallery-grid">${items}</div>
      </div>
    </section>`;
}

function openLightbox(src, name) {
  let box = document.getElementById('dpage-lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'dpage-lightbox';
    box.className = 'dpage-lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.innerHTML = `
      <button type="button" class="dpage-lightbox-close" aria-label="Fermer">&#x2715;</button>
      <img class="dpage-lightbox-img" src="" alt=""/>`;
    document.body.appendChild(box);
    const close = () => { box.classList.remove('open'); document.body.style.overflow = ''; };
    box.querySelector('.dpage-lightbox-close').addEventListener('click', close);
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }
  const img = box.querySelector('.dpage-lightbox-img');
  img.src = src;
  img.alt = name || '';
  box.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function creditFor(url) {
  if (url.includes('mapillary.com')) {
    return 'Vue de rue fournie par <a href="https://www.mapillary.com" target="_blank" rel="noopener">Mapillary</a>';
  }
  if (url.includes('panoramax')) {
    return 'Vue panoramique fournie par <a href="https://panoramax.fr" target="_blank" rel="noopener">Panoramax</a>';
  }
  if (url.includes('360tr.com') || url.includes('360riyadh.com')) {
    return 'Tours 360° provided by <a href="https://www.360tr.com" target="_blank" rel="noopener">360TR.com</a>';
  }
  return '';
}

function openVirtualTour(dest) {
  const tours = getToursFor(dest);
  if (!tours.length) return;

  let box = document.getElementById('dpage-tour');
  if (!box) {
    box = document.createElement('div');
    box.id = 'dpage-tour';
    box.className = 'dpage-tour';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Visite virtuelle');
    box.innerHTML = `
      <div class="dpage-tour-bar">
        <span class="dpage-tour-title">Visite virtuelle</span>
        <button type="button" class="dpage-tour-close" aria-label="Fermer la visite virtuelle">&#x2715;</button>
      </div>
      <div class="dpage-tour-picker" role="tablist" aria-label="Choisir une visite"></div>
      <div class="dpage-tour-shell">
        <iframe class="dpage-tour-frame" title="Visite virtuelle"
                allow="fullscreen; accelerometer; gyroscope; camera; xr-spatial-tracking"
                allowfullscreen></iframe>
      </div>
      <div class="dpage-tour-credit"></div>`;
    document.body.appendChild(box);
    const close = () => {
      box.classList.remove('open');
      document.body.style.overflow = '';
      box.querySelector('.dpage-tour-frame').src = 'about:blank';
    };
    box.querySelector('.dpage-tour-close').addEventListener('click', close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && box.classList.contains('open')) close();
    });
  }

  const title = box.querySelector('.dpage-tour-title');
  title.textContent = `Visite virtuelle — ${dest.name}`;

  // Sélecteur de tours (masqué s'il n'y en a qu'un)
  const picker = box.querySelector('.dpage-tour-picker');
  picker.innerHTML = '';
  picker.style.display = tours.length > 1 ? '' : 'none';
  const frame = box.querySelector('.dpage-tour-frame');

  const select = (i) => {
    picker.querySelectorAll('.dpage-tour-chip').forEach((c, j) => {
      c.classList.toggle('active', j === i);
      c.setAttribute('aria-selected', j === i ? 'true' : 'false');
    });
    frame.src = tours[i].url;
    const credit = box.querySelector('.dpage-tour-credit');
    if (credit) credit.innerHTML = creditFor(tours[i].url);
  };

  tours.forEach((t, i) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'dpage-tour-chip';
    chip.setAttribute('role', 'tab');
    chip.textContent = t.title;
    chip.addEventListener('click', () => select(i));
    picker.appendChild(chip);
  });

  select(0);
  box.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function renderHighlights(dest) {
  if (!dest.highlights || !dest.highlights.length) return '';
  const items = dest.highlights.map((h, i) => `
    <div class="dpage-highlight-card">
      <div class="dpage-highlight-icon" aria-hidden="true">
        <ion-icon name="${HIGHLIGHT_ICONS[i % HIGHLIGHT_ICONS.length]}"></ion-icon>
      </div>
      <div class="dpage-highlight-body">
        <h3 class="dpage-highlight-title">${esc(h)}</h3>
      </div>
    </div>`).join('');
  return `
    <section class="dpage-section">
      <div class="container">
        <p class="dpage-section-subtitle">À voir et à faire</p>
        <h2 class="dpage-section-title">Incontournables</h2>
        <div class="dpage-highlights-grid">${items}</div>
      </div>
    </section>`;
}

function renderTips(dest) {
  if (!dest.tips || !dest.tips.length) return '';
  const items = dest.tips.map(tip => `<li><p>${esc(tip)}</p></li>`).join('');
  return `
    <section class="dpage-section">
      <div class="container">
        <p class="dpage-section-subtitle">Préparez votre voyage</p>
        <h2 class="dpage-section-title">Conseils pratiques</h2>
        <ul class="dpage-tips-list">${items}</ul>
      </div>
    </section>`;
}

function renderServices(dest) {
  const slugs   = dest.services || [];
  const matched = SERVICES_CONFIG.filter(s => slugs.includes(s.slug));
  if (!matched.length) return '';
  const cards = matched.map(s => `
    <a href="${esc(s.route)}" class="dpage-service-card">
      <div class="dpage-service-icon" aria-hidden="true">
        <ion-icon name="${esc(s.icon)}"></ion-icon>
      </div>
      <h3 class="dpage-service-name">${esc(s.nav)}</h3>
      <p class="dpage-service-desc">${esc(s.short)}</p>
    </a>`).join('');
  return `
    <section class="dpage-section">
      <div class="container">
        <p class="dpage-section-subtitle">Réservez votre voyage</p>
        <h2 class="dpage-section-title">Nos services pour ${esc(dest.name)}</h2>
        <div class="dpage-services-grid">${cards}</div>
      </div>
    </section>`;
}

function renderFaq(dest) {
  const faqItems = (dest.faq && dest.faq.length) ? dest.faq : buildFaq(dest);
  const items = faqItems.map((item, i) => `
    <div class="dpage-faq-item" id="faq-${i}">
      <button class="dpage-faq-question" aria-expanded="false" aria-controls="faq-answer-${i}">
        ${esc(item.q)}
        <ion-icon name="add-outline" class="dpage-faq-icon" aria-hidden="true"></ion-icon>
      </button>
      <div class="dpage-faq-answer" id="faq-answer-${i}" role="region" aria-labelledby="faq-${i}">
        <p>${esc(item.a)}</p>
      </div>
    </div>`).join('');
  return `
    <section class="dpage-section">
      <div class="container">
        <p class="dpage-section-subtitle">Questions fréquentes</p>
        <h2 class="dpage-section-title">FAQ — ${esc(dest.name)}</h2>
        <div class="dpage-faq-list">${items}</div>
      </div>
    </section>`;
}

function renderSimilar(dest) {
  const similar = getSimilar(dest.slug, 3);
  if (!similar.length) return '';
  const cards = similar.map(d => {
    const imgPath = d.image || `assets/images/destinations/${d.slug}.jpg`;
    return `
      <a href="destination.html#destination/${esc(d.slug)}" class="dest-card">
        <div class="dest-card-img">
          <img src="${esc(imgPath)}" alt="${esc(d.name)}" loading="lazy"
               onerror="this.style.display='none'"/>
        </div>
        <div class="dest-card-body">
          <h3 class="dest-card-name">${esc(d.name)}</h3>
          <p class="dest-card-country">
            <ion-icon name="location-outline" aria-hidden="true"></ion-icon>
            ${esc(d.country)}
          </p>
          <span class="dest-card-btn">Découvrir</span>
        </div>
      </a>`;
  }).join('');
  return `
    <section class="dpage-section">
      <div class="container">
        <p class="dpage-section-subtitle">Vous aimerez aussi</p>
        <h2 class="dpage-section-title">Destinations similaires</h2>
        <div class="dpage-similar-grid">${cards}</div>
      </div>
    </section>`;
}

function renderPrevNext(dest) {
  const idx  = DESTINATIONS_CONFIG.findIndex(d => d.slug === dest.slug);
  const prev = idx > 0                         ? DESTINATIONS_CONFIG[idx - 1] : null;
  const next = idx < DESTINATIONS_CONFIG.length - 1 ? DESTINATIONS_CONFIG[idx + 1] : null;

  const prevLink = prev
    ? `<a href="destination.html#destination/${esc(prev.slug)}" class="dpage-nav-link dpage-nav-link--prev" aria-label="Destination précédente : ${esc(prev.name)}">
        <span class="dpage-nav-icon"><ion-icon name="arrow-back-outline" aria-hidden="true"></ion-icon></span>
        <span><span class="dpage-nav-label">Précédente</span><span class="dpage-nav-name">${esc(prev.name)}</span></span>
       </a>`
    : `<span class="dpage-nav-link" aria-hidden="true"></span>`;

  const nextLink = next
    ? `<a href="destination.html#destination/${esc(next.slug)}" class="dpage-nav-link dpage-nav-link--next" aria-label="Destination suivante : ${esc(next.name)}">
        <span class="dpage-nav-icon"><ion-icon name="arrow-forward-outline" aria-hidden="true"></ion-icon></span>
        <span><span class="dpage-nav-label">Suivante</span><span class="dpage-nav-name">${esc(next.name)}</span></span>
       </a>`
    : `<span class="dpage-nav-link" aria-hidden="true"></span>`;

  return `
    <div class="container">
      <nav class="dpage-nav" aria-label="Navigation entre destinations">
        ${prevLink}
        ${nextLink}
      </nav>
    </div>`;
}

function renderCta(dest) {
  const waMsg = encodeURIComponent(
    `Bonjour Manasik Bayt Travel,\nje suis intéressé(e) par un voyage à ${dest.name}.\nPourriez-vous m'envoyer plus d'informations ?\n\nMerci.`
  );
  return `
    <section class="cta" style="margin-top: 0">
      <div class="container">
        <div class="cta-content">
          <p class="section-subtitle">Prêt à partir ?</p>
          <h2 class="h2 section-title">Envie de découvrir ${esc(dest.name)} ?</h2>
          <p class="section-text">Notre équipe organise votre séjour de A à Z : vols, hébergement, transferts et activités.</p>
        </div>
        <div class="btn-group">
          <a href="https://wa.me/212661631160?text=${waMsg}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
            Contacter sur WhatsApp
          </a>
          <a href="index.html#contact" class="btn btn-primary">Demander un devis</a>
        </div>
      </div>
    </section>`;
}

// ─── Rendu complet ──────────────────────────────────────────────────────────

function renderPage(dest) {
  const root = document.getElementById('dpage-root');
  if (!root) return;

  applySeo(dest);

  root.innerHTML =
    renderBreadcrumb(dest) +
    renderHero(dest) +
    renderIntro(dest) +
    renderGallery(dest) +
    renderHighlights(dest) +
    renderTips(dest) +
    renderServices(dest) +
    renderFaq(dest) +
    renderSimilar(dest) +
    renderPrevNext(dest) +
    renderCta(dest);

  // ── FAQ accordion ────────────────────────────────────────────────────────
  root.querySelectorAll('.dpage-faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.closest('.dpage-faq-item');
      const isOpen = item.classList.contains('open');
      // Fermer tous
      root.querySelectorAll('.dpage-faq-item.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.dpage-faq-question').setAttribute('aria-expanded', 'false');
      });
      // Ouvrir celui cliqué si fermé
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // ── Galerie : lightbox ───────────────────────────────────────────────────
  root.querySelectorAll('.dpage-gallery-item').forEach(btn => {
    btn.addEventListener('click', () => openLightbox(btn.dataset.gallerySrc, dest.name));
  });

  // ── Visite virtuelle 360° : ouverture plein écran ────────────────────────
  root.querySelectorAll('.dpage-tour-btn, [data-tour-dest]').forEach(btn => {
    btn.addEventListener('click', () => openVirtualTour(dest));
  });
}

// ─── Page "non trouvée" ────────────────────────────────────────────────────

function renderNotFound(slug) {
  const root = document.getElementById('dpage-root');
  if (!root) return;

  document.title = 'Destination introuvable — Manasik Bayt Travel';
  root.innerHTML = `
    <section class="dpage-section" style="min-height:60vh;display:flex;align-items:center;justify-content:center;text-align:center">
      <div class="container">
        <ion-icon name="globe-outline" style="font-size:64px;color:var(--bright-navy-blue);margin-bottom:20px"></ion-icon>
        <h1 class="h2 section-title">Destination introuvable</h1>
        <p class="section-text">La destination « ${esc(slug)} » n'existe pas dans notre catalogue.</p>
        <div class="btn-group" style="justify-content:center;margin-top:20px">
          <a href="destinations.html" class="btn btn-primary">Voir toutes les destinations</a>
          <a href="index.html" class="btn btn-secondary">Retour à l'accueil</a>
        </div>
      </div>
    </section>`;

  // Redirection douce après 3 secondes
  setTimeout(() => { window.location.href = 'destinations.html'; }, 3000);
}

// ─── Routeur hash ──────────────────────────────────────────────────────────

function route() {
  const hash = window.location.hash || '';
  // Attend le format #destination/<slug>
  const match = hash.match(/^#destination\/(.+)$/);

  if (!match) {
    // Hash absent ou invalide → redirect vers destinations.html
    window.location.replace('destinations.html');
    return;
  }

  const slug = decodeURIComponent(match[1]).trim();
  const dest = getBySlug(slug);

  if (dest) {
    renderPage(dest);
  } else {
    renderNotFound(slug);
  }
}

// ─── Init ──────────────────────────────────────────────────────────────────

function init() {
  route();
  // Gestion du bouton retour / changement de hash
  window.addEventListener('hashchange', () => {
    const root = document.getElementById('dpage-root');
    if (root) root.innerHTML = '<div class="dpage-loading" aria-live="polite">Chargement…</div>';
    route();
    // Remonter en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
