/* Editable portfolio content. The unlock gesture is a convenience, not authentication. */
(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const groups = { general: 'Navigation & branding', introduction: 'Self Introduction', hobbies: 'Hobbies', game: 'Favourite Game', mika: 'Favourite Character', footer: 'Footer & credits' };
  const fields = [];
  const targets = new Map();
  const text = {};
  const excluded = 'script,style,svg,[aria-hidden="true"],.brand-mark,.motion-toggle,#personal-fact,#hobby-detail,#love-button,#love-status,.credits-button,.dialog-close';
  const roots = [
    ['general', document.querySelector('.site-header')],
    ...['introduction', 'hobbies', 'game', 'mika'].map(id => [id, document.getElementById(id)]),
    ['footer', document.querySelector('.site-footer')],
    ['footer', document.querySelector('#credits-dialog')],
  ];
  const counters = {};
  for (const [group, element] of roots) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      const value = node.textContent.trim();
      if (!parent || parent.closest(excluded) || !/[\p{L}]/u.test(value)) continue;
      counters[group] = (counters[group] || 0) + 1;
      const key = `${group}.${String(counters[group]).padStart(3, '0')}`;
      const heading = parent.closest('h1,h2,h3');
      const action = parent.closest('a,button');
      const label = `${heading ? 'Heading' : action ? 'Link or button' : 'Text'}: ${value.slice(0, 65)}${value.length > 65 ? '…' : ''}`;
      fields.push({ key, label, group: groups[group], multiline: value.length > 70 });
      targets.set(key, {node, before: node.textContent.match(/^\s*/)[0], after: node.textContent.match(/\s*$/)[0]}); text[key] = value;
    }
  }
  function addField(key, label, group, value, multiline = false) {
    fields.push({ key, label, group: groups[group] || group, multiline }); text[key] = value;
  }
  const runtime = window.JammRuntime;
  const initial = runtime.getData();
  initial.facts.forEach((fact, i) => addField(`fact.${i}`, `Personal fact ${i + 1}`, 'introduction', fact, true));
  for (const [name, hobby] of Object.entries(initial.hobbies)) {
    addField(`hobby.${name}.kicker`, `${name}: small heading`, 'hobbies', hobby.kicker);
    addField(`hobby.${name}.title`, `${name}: detail heading`, 'hobbies', hobby.title);
    addField(`hobby.${name}.description`, `${name}: detail text`, 'hobbies', hobby.description, true);
  }
  addField('love.off', 'Mika appreciation button', 'mika', 'A little love for Mika');
  addField('love.on', 'Mika appreciation button after clicking', 'mika', 'Mika appreciation club ♡');
  addField('love.message', 'Mika appreciation response', 'mika', 'Excellent taste. Jamm approves.');
  addField('page.title', 'Browser tab title', 'general', document.title);
  addField('page.description', 'Search result description', 'general', document.querySelector('meta[name="description"]').content, true);
  for (const id of ['introduction', 'hobbies', 'game', 'mika']) addField(`gallery.${id}`, 'Photo gallery heading', id, 'Little moments, big memories.');
  addField('contacts.heading', 'Contact section heading', 'footer', 'Find me around the internet.');

  const defaults = {
    version: 1,
    text,
    theme: { mode: 'scroll', preset: 'mika', colours: ['#fcedf3', '#e8f1f9', '#f0e9f9', '#fbe7f1'], accent: '#cf4e82' },
    galleries: { introduction: [], hobbies: [], game: [], mika: [] },
    contacts: [],
    repository: { owner: 'MikaLover-Art', repo: 'Mika-Lover', branch: 'main' },
  };
  let current = clone(defaults);
  const galleryNodes = {};
  for (const id of Object.keys(defaults.galleries)) {
    const block = document.createElement('div'); block.className = 'section-gallery wrap'; block.hidden = true;
    const heading = document.createElement('h3'); const grid = document.createElement('div'); grid.className = 'photo-grid';
    block.append(heading, grid); document.getElementById(id).append(block); galleryNodes[id] = { block, heading, grid };
  }
  const contactsBlock = document.createElement('section'); contactsBlock.className = 'contact-section'; contactsBlock.hidden = true;
  const contactsHeading = document.createElement('h3'); const contactsList = document.createElement('div'); contactsList.className = 'contact-links';
  contactsBlock.append(contactsHeading, contactsList); document.querySelector('.site-footer').prepend(contactsBlock);

  const lightbox = document.createElement('dialog'); lightbox.className = 'photo-lightbox'; lightbox.setAttribute('aria-label', 'Photo viewer');
  const lightboxClose = document.createElement('button'); lightboxClose.type = 'button'; lightboxClose.className = 'photo-lightbox-close'; lightboxClose.textContent = 'Close photo ×';
  const lightboxImage = document.createElement('img'); const lightboxCaption = document.createElement('p');
  lightbox.append(lightboxClose, lightboxImage, lightboxCaption); document.body.append(lightbox);
  lightboxClose.addEventListener('click', () => lightbox.close());
  lightbox.addEventListener('click', event => { if (event.target === lightbox) { const r = lightbox.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) lightbox.close(); } });

  const validHex = value => typeof value === 'string' && /^#[\da-f]{6}$/i.test(value);
  function safeImage(value) {
    if (typeof value !== 'string') return '';
    if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length < 8.5 * 1024 * 1024) return value;
    if (/^(?:\.\/)?assets\/[A-Za-z0-9_./-]+$/.test(value) && !value.includes('..')) return value;
    try { const url = new URL(value); if (url.protocol === 'https:' || url.protocol === 'http:') return url.href; } catch (_) {}
    return '';
  }
  function safeLink(value) {
    if (typeof value !== 'string' || value.length > 2000) return '';
    try { const url = new URL(value.trim()); return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; }
  }
  const string = (value, fallback = '', maximum = 12000) => typeof value === 'string' ? value.slice(0, maximum) : fallback;
  function normalise(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1) throw new Error('This is not a compatible Jamm portfolio backup.');
    const result = clone(defaults);
    for (const field of fields) result.text[field.key] = string(input.text?.[field.key], defaults.text[field.key]);
    const theme = input.theme || {};
    result.theme.mode = theme.mode === 'solid' ? 'solid' : 'scroll';
    result.theme.preset = ['mika', 'sky', 'lilac', 'midnight'].includes(theme.preset) ? theme.preset : 'mika';
    if (Array.isArray(theme.colours) && theme.colours.length === 4 && theme.colours.every(validHex)) result.theme.colours = [...theme.colours];
    if (validHex(theme.accent)) result.theme.accent = theme.accent;
    let totalData = 0;
    for (const id of Object.keys(defaults.galleries)) {
      const photos = input.galleries?.[id];
      if (!Array.isArray(photos)) continue;
      result.galleries[id] = photos.slice(0, 100).map((photo, i) => {
        const src = safeImage(photo?.src); if (!src) return null;
        if (src.startsWith('data:')) totalData += src.length * .75;
        return { id: string(photo.id, `${id}-${i}`, 100).replace(/[^a-zA-Z0-9_-]/g, '') || `${id}-${i}`, src, description: string(photo.description, '', 2000), alt: string(photo.alt, '', 500) };
      }).filter(Boolean);
    }
    if (Array.isArray(input.contacts)) result.contacts = input.contacts.slice(0, 30).map((contact, i) => {
      if (!contact || typeof contact !== 'object') return null;
      const icon = safeImage(contact.icon); if (icon.startsWith('data:')) totalData += icon.length * .75;
      return { id: string(contact.id, `contact-${i}`, 100).replace(/[^a-zA-Z0-9_-]/g, '') || `contact-${i}`, label: string(contact.label, '', 100), url: string(contact.url, '', 2000), icon };
    }).filter(Boolean);
    if (totalData > 30 * 1024 * 1024) throw new Error('Keep draft image uploads below 30 MB. Remove a few photos or use smaller images.');
    result.repository = { owner: string(input.repository?.owner, defaults.repository.owner, 100), repo: string(input.repository?.repo, defaults.repository.repo, 100), branch: string(input.repository?.branch, '', 200) };
    return result;
  }
  function renderGalleries(config) {
    for (const [id, elements] of Object.entries(galleryNodes)) {
      const photos = config.galleries[id]; elements.block.hidden = photos.length === 0; elements.heading.textContent = config.text[`gallery.${id}`]; elements.grid.replaceChildren();
      photos.forEach(photo => {
        const figure = document.createElement('figure'); const button = document.createElement('button'); button.type = 'button'; button.className = 'photo-open'; button.setAttribute('aria-label', `Open photo: ${photo.alt || photo.description || 'Photo from Jamm’s gallery'}`);
        const img = document.createElement('img'); img.src = photo.src; img.alt = photo.alt || photo.description || 'Photo from Jamm’s gallery'; img.loading = 'lazy'; img.decoding = 'async';
        button.append(img); figure.append(button);
        if (photo.description) { const caption = document.createElement('figcaption'); caption.textContent = photo.description; figure.append(caption); }
        button.addEventListener('click', () => { lightboxImage.src = photo.src; lightboxImage.alt = img.alt; lightboxCaption.textContent = photo.description; lightboxCaption.hidden = !photo.description; lightbox.showModal(); });
        elements.grid.append(figure);
      });
    }
  }
  function renderContacts(config) {
    contactsList.replaceChildren(); contactsHeading.textContent = config.text['contacts.heading'];
    config.contacts.forEach(contact => {
      const href = safeLink(contact.url); if (!href || !contact.label.trim()) return;
      const link = document.createElement('a'); link.className = 'contact-link'; link.href = href;
      if (/^https?:/.test(href)) { link.target = '_blank'; link.rel = 'noopener noreferrer'; }
      if (contact.icon) { const img = document.createElement('img'); img.src = contact.icon; img.alt = ''; img.width = 24; img.height = 24; link.append(img); }
      const label = document.createElement('span'); label.textContent = contact.label; link.append(label); contactsList.append(link);
    });
    contactsBlock.hidden = contactsList.children.length === 0;
  }
  function apply(input) {
    const next = normalise(input);
    const imagesChanged = JSON.stringify(next.galleries) !== JSON.stringify(current.galleries);
    const contactsChanged = JSON.stringify(next.contacts) !== JSON.stringify(current.contacts);
    for (const [key, target] of targets) target.node.textContent = target.before + next.text[key] + target.after;
    document.title = next.text['page.title']; document.querySelector('meta[name="description"]').content = next.text['page.description'];
    const hobbies = {};
    for (const key of Object.keys(initial.hobbies)) hobbies[key] = { kicker: next.text[`hobby.${key}.kicker`], title: next.text[`hobby.${key}.title`], description: next.text[`hobby.${key}.description`] };
    runtime.setData({ facts: initial.facts.map((_, i) => next.text[`fact.${i}`]), hobbies, love: { off: next.text['love.off'], on: next.text['love.on'], message: next.text['love.message'] } });
    runtime.setTheme(next.theme);
    if (imagesChanged) renderGalleries(next);
    else for (const [id, elements] of Object.entries(galleryNodes)) elements.heading.textContent = next.text[`gallery.${id}`];
    if (contactsChanged) renderContacts(next); else contactsHeading.textContent = next.text['contacts.heading'];
    current = next;
    window.dispatchEvent(new Event('resize'));
    return clone(current);
  }
  window.JammSite = { fields, defaults: clone(defaults), getConfig: () => clone(current), apply, safeLink, safeImage, ready: null };
  window.JammSite.ready = (async () => {
    try {
      if (location.protocol !== 'file:') {
        const response = await fetch('content.json', { cache: 'no-store' });
        if (response.ok) { apply(await response.json()); return; }
      }
      apply(defaults);
    } catch (_) { apply(defaults); }
  })();
})();
