(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TEL = '02 96 94 56 48';

  // Horaires : lundi (1) à vendredi (5), 8:00–12:00 et 14:00–18:30, heure de Paris
  const SLOTS = [[8 * 60, 12 * 60], [14 * 60, 18 * 60 + 30]];
  const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  const fmt = (m) => `${Math.floor(m / 60)} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;

  function parisNow() {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { day, min: +get('hour') * 60 + +get('minute') };
  }

  function nextOpening(day, min) {
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7;
      if (d === 0 || d === 6) continue;
      for (const [start] of SLOTS) {
        if (i > 0 || start > min) {
          const when = i === 0 ? "aujourd'hui" : i === 1 ? 'demain' : DAYS[d];
          return `${when} à ${fmt(start)}`;
        }
      }
    }
    return '';
  }

  function updateStatus() {
    const el = document.getElementById('status');
    if (!el) return;
    const { day, min } = parisNow();
    const open = day >= 1 && day <= 5 && SLOTS.find(([a, b]) => min >= a && min < b);
    el.classList.toggle('status--closed', !open);
    el.querySelector('.status__text').textContent = open
      ? `Ouvert · ferme à ${fmt(open[1])}`
      : `Fermé · ouvre ${nextOpening(day, min)}`;
    const row = document.querySelector(`.hours tr[data-day="${day}"]`);
    document.querySelectorAll('.hours tr').forEach((r) => r.classList.toggle('today', r === row));
  }
  updateStatus();
  setInterval(updateStatus, 60 * 1000);

  // Plaque : mise en forme AB-123-CD au fil de la saisie
  function formatPlate(v) {
    const raw = v.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const m = raw.match(/^([A-Z]{0,2})(\d{0,3})([A-Z]{0,2})$/);
    if (!m) return v.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 10);
    return [m[1], m[2], m[3]].filter(Boolean).join('-');
  }
  document.querySelectorAll('#plaque-hero, #plaque').forEach((input) => {
    input.addEventListener('input', () => {
      const f = formatPlate(input.value);
      if (f !== input.value) input.value = f;
    });
  });

  // La grande plaque : fondu lent entre les mentions tant que rien n'est saisi
  const ghosts = document.querySelectorAll('.bigplate__ghost span');
  if (ghosts.length && !reduce) {
    let i = 0;
    let timer = setInterval(() => {
      if (document.hidden) return;
      ghosts[i].classList.remove('on');
      i = (i + 1) % ghosts.length;
      ghosts[i].classList.add('on');
    }, 5600);
    document.getElementById('plaque-hero').addEventListener('focus', () => clearInterval(timer), { once: true });
  }

  // Formulaire rapide du haut de page → remplit la demande de devis
  const quick = document.getElementById('quick');
  const form = document.getElementById('devis-form');
  quick.addEventListener('submit', (e) => {
    e.preventDefault();
    const plaque = quick.elements.plaque.value.trim();
    const travaux = quick.elements.travaux.value;
    if (plaque) form.elements.plaque.value = plaque;
    form.elements.travaux.value = travaux;
    document.getElementById('devis').scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    setTimeout(() => form.elements.nom.focus({ preventScroll: true }), reduce ? 0 : 600);
  });

  // Récapitulatif de la demande
  const recap = document.getElementById('recap');
  const recapText = document.getElementById('recap-text');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const lines = [
      'Bonjour, je souhaite un devis.',
      f.nom.value.trim() && `Nom : ${f.nom.value.trim()}`,
      f.plaque.value.trim() && `Immatriculation : ${f.plaque.value.trim()}`,
      `Intervention : ${f.travaux.value}`,
      f.details.value.trim() && `Détails : ${f.details.value.trim()}`
    ].filter(Boolean);
    recapText.textContent = lines.join('\n');
    recap.hidden = false;
    recap.focus({ preventScroll: true });
    recap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
  });

  const copy = document.getElementById('copy');
  copy.addEventListener('click', async () => {
    const label = copy.querySelector('span');
    try {
      await navigator.clipboard.writeText(recapText.textContent);
      label.textContent = 'Texte copié';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(recapText);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      label.textContent = 'Texte sélectionné';
    }
    setTimeout(() => { label.textContent = 'Copier le texte'; }, 2400);
  });

  // Carte Google Maps chargée uniquement à la demande
  document.getElementById('load-map').addEventListener('click', () => {
    const map = document.getElementById('map');
    const iframe = document.createElement('iframe');
    iframe.title = 'Plan d’accès : 138 boulevard de l’Atlantique, Saint-Brieuc';
    iframe.loading = 'lazy';
    iframe.referrerPolicy = 'no-referrer-when-downgrade';
    iframe.src = 'https://maps.google.com/maps?q=' +
      encodeURIComponent("Carrosserie et Garage Ollivier, 138 Boulevard de l'Atlantique, 22000 Saint-Brieuc") +
      '&z=16&output=embed';
    map.replaceChildren(iframe);
  });

  // Entrées des sections
  const reveals = document.querySelectorAll('.reveal');
  if (reduce || !('IntersectionObserver' in window)) {
    reveals.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    reveals.forEach((el) => io.observe(el));
  }

  // Le schéma : les plaques se rangent quand il entre à l'écran
  const flows = document.querySelectorAll('.flow');
  if (!reduce && 'IntersectionObserver' in window) {
    flows.forEach((svg) => {
      const rects = svg.querySelectorAll('rect');
      rects.forEach((r, i) => {
        r.style.opacity = '0';
        r.style.transformBox = 'fill-box';
        r.style.transformOrigin = 'center';
        r.style.transitionDelay = `${Math.round(i * 6)}ms`;
      });
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting) return;
        rects.forEach((r) => { r.style.opacity = '1'; });
        io.disconnect();
      }, { threshold: 0.2 });
      io.observe(svg);
    });
  }

  // Barre d'appel sur téléphone, après le premier écran
  const bar = document.getElementById('callbar');
  const hero = document.querySelector('.hero');
  if (bar && hero && 'IntersectionObserver' in window) {
    new IntersectionObserver(([en]) => bar.classList.toggle('show', !en.isIntersecting), { threshold: 0 }).observe(hero);
  } else if (bar) {
    bar.classList.add('show');
  }

  document.getElementById('year').textContent = new Date().getFullYear();
})();
