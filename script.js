(() => {
  'use strict';
  const root = document.documentElement;
  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('jamm-motion'); } catch (_) { /* Device preferences remain optional. */ }
  let motionEnabled = savedMotion === null ? !media.matches : savedMotion === 'on' && !media.matches;
  let updateBannerMotion = null;

  function applyMotion() {
    root.classList.toggle('motion-off', !motionEnabled);
    if (!motionEnabled) document.querySelector('.heart-particles')?.replaceChildren();
    root.classList.toggle('js-motion', motionEnabled);
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
    motionButton.setAttribute('aria-label', `Animations ${motionEnabled ? 'enabled. Turn off' : 'disabled. Turn on'} animations`);
    motionButton.title = `Turn ${motionEnabled ? 'off' : 'on'} animations`;
    motionButton.querySelector('b').textContent = motionEnabled ? 'on' : 'off';
    updateBannerMotion?.();
  }
  applyMotion();
  motionButton.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    try { localStorage.setItem('jamm-motion', motionEnabled ? 'on' : 'off'); } catch (_) { /* Works without storage. */ }
    applyMotion();
  });
  media.addEventListener('change', event => { motionEnabled = !event.matches; applyMotion(); });

  const banner = document.querySelector('.hero');
  const bannerSlides = [...document.querySelectorAll('.banner-slide')];
  const bannerDots = [...document.querySelectorAll('.banner-dot')];
  let bannerIndex = 0;
  let bannerTimer = 0;
  let bannerHovered = false;
  let bannerFocused = false;
  function showBanner(index) {
    bannerIndex = (index + bannerSlides.length) % bannerSlides.length;
    bannerSlides.forEach((slide, i) => slide.classList.toggle('is-active', i === bannerIndex));
    bannerDots.forEach((dot, i) => dot.setAttribute('aria-pressed', String(i === bannerIndex)));
    updateBannerMotion();
  }
  updateBannerMotion = () => {
    window.clearTimeout(bannerTimer);
    if (!motionEnabled || media.matches || document.hidden || bannerHovered || bannerFocused || bannerSlides.length < 2) return;
    bannerTimer = window.setTimeout(() => showBanner(bannerIndex + 1), 6500);
  };
  bannerDots.forEach((dot, index) => dot.addEventListener('click', () => showBanner(index)));
  document.querySelectorAll('[data-banner-step]').forEach(button => {
    button.addEventListener('click', () => showBanner(bannerIndex + Number(button.dataset.bannerStep)));
  });
  banner.addEventListener('pointerenter', event => {
    if (event.pointerType === 'mouse') { bannerHovered = true; updateBannerMotion(); }
  });
  banner.addEventListener('pointerleave', () => { bannerHovered = false; updateBannerMotion(); });
  banner.addEventListener('focusin', () => { bannerFocused = true; updateBannerMotion(); });
  banner.addEventListener('focusout', event => {
    bannerFocused = !!event.relatedTarget && banner.contains(event.relatedTarget);
    updateBannerMotion();
  });
  document.addEventListener('visibilitychange', updateBannerMotion);
  updateBannerMotion();

  const sections = [...document.querySelectorAll('.page-section')];
  const navLinks = [...document.querySelectorAll('.nav-link')];
  let themeMode = 'scroll';
  let palette = [
    { background: [252, 237, 243], accent: [247, 184, 211] },
    { background: [232, 241, 249], accent: [180, 208, 238] },
    { background: [240, 233, 249], accent: [210, 188, 240] },
    { background: [251, 231, 241], accent: [239, 177, 210] },
  ];
  let positions = [];
  let scrollQueued = false;
  function measureSections() { positions = sections.map(section => section.offsetTop); updateScroll(); }
  const mix = (a, b, ratio) => a.map((value, i) => Math.round(value + (b[i] - value) * ratio)).join(',');
  function updateScroll() {
    scrollQueued = false;
    const y = window.scrollY;
    const progress = y / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    root.style.setProperty('--scroll', Math.min(1, Math.max(0, progress)).toFixed(4));
    const sample = y + window.innerHeight * 0.32;
    let index = 0;
    for (let i = 1; i < positions.length; i++) if (sample >= positions[i]) index = i;
    navLinks.forEach((link, i) => {
      link.classList.toggle('is-active', i === index);
      if (i === index) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    let colourIndex = 0;
    for (let i = 1; i < positions.length; i++) if (y >= positions[i] - window.innerHeight * .5) colourIndex = i;
    const current = palette[colourIndex];
    const next = palette[Math.min(3, colourIndex + 1)];
    const start = Math.max(0, positions[colourIndex] - window.innerHeight * .5);
    const end = Math.max(start + 1, (positions[colourIndex + 1] ?? document.documentElement.scrollHeight) - window.innerHeight * .5);
    const ratio = Math.max(0, Math.min(1, (y - start) / (end - start)));
    const eased = ratio * ratio * (3 - 2 * ratio);
    const colour = themeMode === 'solid' ? palette[0].background.join(',') : mix(current.background, next.background, eased);
    root.style.setProperty('--page-rgb', colour);
    const [r, g, b] = colour.split(',').map(Number);
    root.classList.toggle('theme-dark', r * .299 + g * .587 + b * .114 < 145);
    root.style.setProperty('--accent-rgb', mix(current.accent, next.accent, eased));
  }
  window.addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  window.addEventListener('resize', measureSections, { passive: true });
  window.addEventListener('load', measureSections);
  if (document.fonts?.ready) document.fonts.ready.then(measureSections);
  measureSections();

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
    }, { threshold: .1 });
    document.querySelectorAll('.reveal').forEach(element => observer.observe(element));
  } else document.querySelectorAll('.reveal').forEach(element => element.classList.add('is-visible'));

  const facts = [
    'I’d rather be called Jamm than Earl James.',
    'I still remember my first time seeing an orangutan.',
    'I’m happy in a quiet place outside.',
    'I like joking around and making people laugh.',
    'My favourite Blue Archive character is Mika. You probably guessed that.',
  ];
  let factIndex = 0;
  document.querySelector('#next-fact').addEventListener('click', () => {
    factIndex = (factIndex + 1) % facts.length;
    document.querySelector('#personal-fact').textContent = facts[factIndex];
  });

  const hobbies = {
    games: { kicker: 'GAMING', title: 'I like a good game.', description: 'I spend some of my free time playing games. Blue Archive is one of my favourites, if the website didn’t give that away.' },
    movies: { kicker: 'MOVIES', title: 'Sometimes I’ll put on a movie.', description: 'When I have some spare time, I like watching movies too.' },
    drawing: { kicker: 'DRAWING', title: 'I draw sometimes.', description: 'Drawing is one of the things I enjoy trying. I don’t really stick to one hobby.' },
    swimming: { kicker: 'SWIMMING', title: 'I like swimming too.', description: 'Swimming is another activity I enjoy. I’m usually happy to try something different.' },
    sports: { kicker: 'SOCCER & SPORTS', title: 'It’s fun to play outside.', description: 'I like soccer and trying other sports. I’m mostly there to have fun.' },
    nature: { kicker: 'EXPLORING', title: 'I like getting out of the house.', description: 'I love going outside and seeing new things. My first time seeing an orangutan was one of those moments. I like quiet places in nature too.' },
  };
  const hobbyButtons = [...document.querySelectorAll('.hobby-card')];
  hobbyButtons.forEach((button, index) => button.addEventListener('click', () => {
    hobbyButtons.forEach(item => { const selected = item === button; item.classList.toggle('is-selected', selected); item.setAttribute('aria-pressed', String(selected)); });
    const hobby = hobbies[button.dataset.hobby];
    document.querySelector('#hobby-kicker').textContent = hobby.kicker;
    document.querySelector('#hobby-title').textContent = hobby.title;
    document.querySelector('#hobby-description').textContent = hobby.description;
    document.querySelector('#hobby-count').textContent = `${String(index + 1).padStart(2, '0')} / 06`;
  }));

  let loveMessages = {off: 'Like Mika too?', on: 'Mika fans ♡', message: 'Okay, you get it.'};
  const loveButton = document.querySelector('#love-button');
  loveButton.addEventListener('click', () => {
    const loved = loveButton.getAttribute('aria-pressed') !== 'true';
    loveButton.setAttribute('aria-pressed', String(loved));
    loveButton.querySelector('span').textContent = loved ? loveMessages.on : loveMessages.off;
    document.querySelector('#love-status').textContent = loved ? loveMessages.message : '';
    if (!loved || !motionEnabled || media.matches) return;
    const rect = loveButton.getBoundingClientRect();
    const container = document.querySelector('.heart-particles');
    for (let i = 0; i < 9; i++) {
      const heart = document.createElement('span');
      heart.className = 'heart-particle'; heart.textContent = i % 3 === 0 ? '✦' : '♡';
      heart.style.left = `${rect.left + rect.width / 2}px`; heart.style.top = `${rect.top}px`;
      heart.style.setProperty('--dx', `${(i - 4) * 24}px`); heart.style.setProperty('--rotation', `${(i - 4) * 13}deg`);
      heart.style.animationDelay = `${i * 25}ms`; container.appendChild(heart);
      heart.addEventListener('animationend', () => heart.remove(), { once: true });
      window.setTimeout(() => heart.remove(), 1600);
    }
  });

  window.JammRuntime = {
    getData: () => JSON.parse(JSON.stringify({facts, hobbies})),
    setData(data) {
      facts.splice(0, facts.length, ...data.facts);
      Object.assign(hobbies, data.hobbies);
      loveMessages = data.love;
      document.querySelector('#personal-fact').textContent = facts[factIndex % facts.length];
      const selected = document.querySelector('.hobby-card.is-selected');
      const hobby = hobbies[selected.dataset.hobby];
      document.querySelector('#hobby-kicker').textContent = hobby.kicker;
      document.querySelector('#hobby-title').textContent = hobby.title;
      document.querySelector('#hobby-description').textContent = hobby.description;
      const loved = loveButton.getAttribute('aria-pressed') === 'true';
      loveButton.querySelector('span').textContent = loved ? loveMessages.on : loveMessages.off;
      document.querySelector('#love-status').textContent = loved ? loveMessages.message : '';
    },
    setTheme(theme) {
      const rgb = hex => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
      themeMode = theme.mode;
      palette = theme.colours.map(hex => ({background: rgb(hex), accent: rgb(theme.accent)}));
      root.style.setProperty('--pink', theme.accent);
      root.style.setProperty('--action', theme.accent);
      const accent = rgb(theme.accent);
      root.style.setProperty('--action-ink', accent[0] * .299 + accent[1] * .587 + accent[2] * .114 > 160 ? '#302733' : '#ffffff');
      updateScroll();
    }
  };

  const dialog = document.querySelector('#credits-dialog');
  document.querySelector('#open-credits').addEventListener('click', () => dialog.showModal());
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
})();
