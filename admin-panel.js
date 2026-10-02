/* Jamm’s local editor. The hidden entrance is a convenience, not authentication. */
(() => {
  'use strict';
  const SECRET = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a', 'b', 'a'];
  const SECTIONS = { introduction: 'Self Introduction', hobbies: 'Hobbies', game: 'Favourite Game', mika: 'Favourite Character' };
  const PRESETS = {
    mika: { name: 'Mika pink', colours: ['#fce8ef', '#e8f3fc', '#eee9fc', '#f8dce9'], accent: '#bd3869' },
    sky: { name: 'Kivotos sky', colours: ['#e6f3ff', '#daf5f3', '#e8edff', '#f2e9fc'], accent: '#2476ad' },
    lilac: { name: 'Lilac dream', colours: ['#f1e9fc', '#e7eafa', '#f6e7f5', '#eadcf6'], accent: '#8853ae' },
    midnight: { name: 'Midnight rose', colours: ['#202032', '#182638', '#292039', '#352335'], accent: '#f6a6cb' }
  };
  const ACCEPT = 'image/png,image/jpeg,image/webp,image/gif';
  const MAX_DRAFT = 30 * 1024 * 1024;
  let site, config, published, active = false, collapsed = false, count = 0, codePosition = 0;
  let panel, unlock, body, notice, saveButton, floating, tabs, currentTab = 'sections';
  let tokenInput, publishButton, publishing = false, dirty = false, lastFocus, fieldGroup, photoSection = 'introduction';
  const clone = value => JSON.parse(JSON.stringify(value));
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  const button = (text, action, className = 'ja-button') => {
    const node = el('button', className, text);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  };
  const hint = text => el('p', 'ja-hint', text);
  const heading = (title, description) => {
    const node = el('div', 'ja-section-heading');
    node.append(el('h3', '', title));
    if (description) node.append(hint(description));
    return node;
  };
  function field(label, input, description) {
    const wrap = el('label', 'ja-field');
    wrap.append(el('span', 'ja-label', label), input);
    if (description) wrap.append(el('span', 'ja-hint', description));
    return wrap;
  }
  function input(value, onInput, options = {}) {
    const node = el(options.multiline ? 'textarea' : 'input', 'ja-input');
    if (!options.multiline) node.type = options.type || 'text';
    else node.rows = options.rows || 3;
    node.value = value || '';
    if (options.placeholder) node.placeholder = options.placeholder;
    if (options.maxLength) node.maxLength = options.maxLength;
    node.addEventListener('input', () => onInput(node.value, node));
    return node;
  }
  function select(options, selected, callback) {
    const node = el('select', 'ja-input');
    Object.entries(options).forEach(([value, label]) => {
      const option = el('option', '', label);
      option.value = value;
      node.append(option);
    });
    node.value = selected;
    node.addEventListener('change', () => callback(node.value));
    return node;
  }
  function status(message, error = false) {
    notice.textContent = message;
    notice.classList.toggle('is-error', error);
    notice.setAttribute('role', error ? 'alert' : 'status');
  }
  function update() {
    try {
      site.apply(config);
      dirty = true;
      saveButton.textContent = 'Save draft •';
    } catch (error) {
      status(error.message || 'That change could not be previewed.', true);
    }
  }
  function bytes(value) { return new Blob([JSON.stringify(value)]).size; }
  function fits(next) {
    if (bytes(next) > MAX_DRAFT) throw new Error('This draft is over 30 MB. Remove a few photos or use smaller images before adding more.');
  }
  function readableSize(value) { return `${(bytes(value) / 1024 / 1024).toFixed(1)} MB of 30 MB`; }
  function safeURL(value) {
    try { return ['https:', 'http:', 'mailto:', 'tel:'].includes(new URL(value.trim()).protocol); }
    catch (_) { return false; }
  }
  function validInputs() {
    const invalid = body.querySelector('input:invalid, textarea:invalid');
    if (!invalid) return true;
    status('Please correct the highlighted field before continuing.', true);
    invalid.reportValidity();
    return false;
  }
  async function readImage(file, limit) {
    if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) throw new Error(`${file.name}: choose a PNG, JPG, WebP, or GIF image.`);
    if (file.size > limit) throw new Error(`${file.name}: image must be smaller than ${limit / 1024 / 1024} MB.`);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Could not read ${file.name}. Please try again.`));
      reader.readAsDataURL(file);
    });
  }
  function filePicker(label, multiple, callback) {
    const wrap = el('label', 'ja-upload');
    wrap.append(el('strong', '', label), el('span', 'ja-hint', multiple ? 'PNG, JPG, WebP or GIF · up to 6 MB each' : 'PNG, JPG, WebP or GIF · up to 1 MB'));
    const node = el('input', 'ja-file');
    node.type = 'file'; node.accept = ACCEPT; node.multiple = multiple;
    node.addEventListener('change', async () => {
      if (!node.files.length) return;
      node.disabled = true;
      try { await callback([...node.files]); }
      catch (error) { status(error.message || 'The image could not be added.', true); }
      finally { node.disabled = false; node.value = ''; }
    });
    wrap.append(node);
    return wrap;
  }
  function trap(event, container) {
    if (event.key !== 'Tab') return;
    const nodes = [...container.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href], summary, [tabindex="0"]')].filter(node => node.getClientRects().length);
    if (!nodes.length) return;
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function makeUnlock() {
    unlock = el('dialog', 'ja-unlock');
    unlock.setAttribute('aria-labelledby', 'ja-unlock-title');
    const top = el('div', 'ja-unlock-top');
    top.append(el('span', 'ja-eyebrow', 'PRIVATE ARCHIVE'), button('×', () => unlock.close(), 'ja-icon-button'));
    top.lastChild.setAttribute('aria-label', 'Close access prompt');
    const title = el('h2', '', 'A little secret.'); title.id = 'ja-unlock-title';
    const progress = el('div', 'ja-code-progress'); progress.setAttribute('aria-live', 'polite');
    const message = hint('Enter your access sequence with your keyboard or the buttons below.');
    const keys = el('div', 'ja-code-keys');
    [['↑', 'ArrowUp', 'Up'], ['↓', 'ArrowDown', 'Down'], ['←', 'ArrowLeft', 'Left'], ['→', 'ArrowRight', 'Right'], ['B', 'b', 'B'], ['A', 'a', 'A']].forEach(([label, key, name]) => {
      const control = button(label, () => acceptKey(key), 'ja-code-key');
      control.setAttribute('aria-label', name); keys.append(control);
    });
    const reset = button('Start again', () => { codePosition = 0; progress.textContent = 'Ready for your sequence'; }, 'ja-text-button');
    unlock.append(top, title, message, progress, keys, reset);
    unlock.addEventListener('close', () => { count = 0; codePosition = 0; });
    unlock.addEventListener('keydown', event => {
      if (event.key === 'Tab') { trap(event, unlock); return; }
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (SECRET.includes(key)) { event.preventDefault(); event.stopPropagation(); acceptKey(key); }
    });
    function acceptKey(key) {
      if (key !== SECRET[codePosition]) {
        codePosition = 0;
        progress.textContent = 'That sequence did not match. Try again.';
        return;
      }
      codePosition += 1;
      progress.textContent = `${'● '.repeat(codePosition)}${'○ '.repeat(SECRET.length - codePosition)}`;
      if (codePosition === SECRET.length) {
        unlock.close();
        enter();
      }
    }
    document.body.append(unlock);
  }
  function makePanel() {
    panel = el('dialog', 'ja-panel');
    panel.setAttribute('aria-labelledby', 'ja-panel-title');
    const header = el('header', 'ja-header');
    const titleWrap = el('div');
    titleWrap.append(el('span', 'ja-eyebrow', 'YOUR LITTLE CORNER'));
    const title = el('h2', '', 'Make it yours.'); title.id = 'ja-panel-title';
    titleWrap.append(title);
    const close = button('×', exit, 'ja-icon-button'); close.setAttribute('aria-label', 'Save draft and exit editor');
    header.append(titleWrap, close);
    tabs = el('div', 'ja-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', 'Editor settings');
    Object.entries({ sections: 'Sections', photos: 'Photos', theme: 'Theme', contacts: 'Contacts', publish: 'Publish' }).forEach(([name, label]) => {
      const tab = button(label, () => render(name), 'ja-tab');
      tab.id = `ja-tab-${name}`;
      tab.dataset.tab = name;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'ja-tab-content');
      tab.addEventListener('keydown', event => {
        const all = [...tabs.children];
        let next = null;
        if (event.key === 'ArrowRight') next = all[(all.indexOf(tab) + 1) % all.length];
        if (event.key === 'ArrowLeft') next = all[(all.indexOf(tab) + all.length - 1) % all.length];
        if (event.key === 'Home') next = all[0];
        if (event.key === 'End') next = all[all.length - 1];
        if (next) { event.preventDefault(); render(next.dataset.tab); next.focus(); }
      });
      tabs.append(tab);
    });
    body = el('div', 'ja-body'); body.id = 'ja-tab-content'; body.setAttribute('role', 'tabpanel');
    notice = el('p', 'ja-notice'); notice.setAttribute('role', 'status'); notice.setAttribute('aria-live', 'polite');
    const footer = el('footer', 'ja-footer');
    const actionRow = el('div', 'ja-actions');
    saveButton = button('Save draft', () => save(), 'ja-button ja-primary');
    actionRow.append(saveButton, button('Preview page', collapse));
    const backupRow = el('div', 'ja-backup-actions');
    backupRow.append(button('Download backup', async () => {
      try { await window.JammStorage.exportBackup(config); status('Backup downloaded. Keep it somewhere safe.'); }
      catch (error) { status(error.message || 'Could not create the backup.', true); }
    }, 'ja-text-button'));
    const importLabel = el('label', 'ja-import-label', 'Import backup');
    const importInput = el('input'); importInput.type = 'file'; importInput.accept = '.json,application/json';
    importInput.setAttribute('aria-label', 'Import a portfolio backup');
    importInput.addEventListener('change', async () => {
      if (!importInput.files[0]) return;
      if (publishing) { status('Wait for publishing to finish before importing a backup.'); importInput.value = ''; return; }
      try {
        if (importInput.files[0].size > MAX_DRAFT) throw new Error('Backup must be smaller than 30 MB.');
        const candidate = JSON.parse(await importInput.files[0].text());
        fits(candidate); site.apply(candidate); config = site.getConfig(); dirty = true;
        saveButton.textContent = 'Save draft •'; render(currentTab); status('Backup imported into your preview. Publish when you are ready.');
      } catch (error) { status(`Could not import backup: ${error.message}`, true); }
      importInput.value = '';
    });
    importLabel.append(importInput); backupRow.append(importLabel);
    footer.append(notice, actionRow, backupRow);
    panel.append(header, tabs, body, footer);
    panel.addEventListener('keydown', event => {
      trap(event, panel);
      if (event.key === 'Escape') { event.preventDefault(); exit(); }
    });
    panel.addEventListener('cancel', event => { event.preventDefault(); exit(); });
    floating = el('div', 'ja-floating'); floating.hidden = true;
    floating.append(el('span', '', 'LOCAL PREVIEW'), button('Open editor', expand, 'ja-button ja-primary'), button('Exit', exit));
    document.body.append(panel, floating);
  }
  async function enter() {
    if (active) return;
    active = true; dirty = false; lastFocus = document.activeElement;
    published = site.getConfig(); config = clone(published);
    let restored = false, restoreError = '';
    try {
      const draft = await window.JammStorage.loadDraft();
      if (draft) { site.apply(draft); config = site.getConfig(); restored = true; }
    } catch (error) { restoreError = 'Your saved draft could not be restored. The published version is open.'; site.apply(published); }
    document.documentElement.classList.add('jamm-editing');
    saveButton.textContent = 'Save draft';
    collapsed = false; panel.show(); render(currentTab);
    status(restoreError || (restored ? 'Saved draft restored. Changes are visible only in this local preview until published.' : 'Local preview is ready. Your live website changes only when you publish.'), Boolean(restoreError));
    panel.querySelector('.ja-tab').focus();
  }
  async function save(silent = false) {
    if (!validInputs()) return false;
    try {
      fits(config);
      await window.JammStorage.saveDraft(config);
      dirty = false; saveButton.textContent = 'Save draft';
      if (!silent) status(`Draft saved on this browser. ${readableSize(config)}. Publish to update the live website.`);
      return true;
    } catch (error) {
      status(`${error.message || 'Could not save this draft.'} Download a backup to keep your changes.`, true);
      return false;
    }
  }
  async function exit() {
    if (!active) return;
    if (publishing) { expand(); status('Publishing is in progress. Please wait for it to finish before exiting.'); return; }
    if (tokenInput) tokenInput.value = '';
    if (!await save(true)) { expand(); return; }
    site.apply(published);
    active = false; collapsed = false; count = 0;
    panel.close(); floating.hidden = true;
    document.documentElement.classList.remove('jamm-editing');
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }
  function collapse() {
    if (!active) return;
    collapsed = true; panel.close(); floating.hidden = false;
    floating.querySelector('button').focus();
  }
  function expand() {
    if (!active || !collapsed) return;
    collapsed = false; floating.hidden = true; panel.show();
    panel.querySelector('.ja-tab[aria-selected="true"]').focus();
  }
  function render(name) {
    if (publishing) { status('Please wait for publishing to finish before switching sections.'); return; }
    if (name !== currentTab && !validInputs()) return;
    currentTab = name;
    if (tokenInput) tokenInput.value = '';
    tokenInput = null;
    [...tabs.children].forEach(tab => {
      const selected = tab.dataset.tab === name;
      tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
    });
    body.setAttribute('aria-labelledby', `ja-tab-${name}`);
    body.replaceChildren();
    ({ sections: renderSections, photos: renderPhotos, theme: renderTheme, contacts: renderContacts, publish: renderPublish })[name]();
    body.scrollTop = 0;
  }
  function renderSections() {
    body.append(heading('Every word, your way.', 'Edit headings, captions, buttons and body text. Changes appear instantly in your local preview.'));
    const groups = {};
    site.fields.forEach(item => { groups[item.group] = item.group; });
    if (!groups[fieldGroup]) fieldGroup = Object.keys(groups)[0];
    body.append(field('Choose a section', select(groups, fieldGroup, value => { fieldGroup = value; render('sections'); })));
    site.fields.filter(item => item.group === fieldGroup).forEach(item => {
      const control = input(config.text[item.key], value => { config.text[item.key] = value; update(); }, { multiline: item.multiline, maxLength: item.multiline ? 12000 : 1000 });
      body.append(field(item.label, control));
    });
    const section = Object.keys(SECTIONS).find(key => SECTIONS[key] === fieldGroup);
    if (!section) return;
    if (!config.notes) config.notes = Object.fromEntries(Object.keys(SECTIONS).map(key => [key, []]));
    if (!Array.isArray(config.notes[section])) config.notes[section] = [];
    const notes = config.notes[section];
    const extra = el('section', 'ja-extra-notes');
    extra.append(heading('Extra text', 'Add another thought or story below this section. Each block can have a heading, a paragraph, or both.'));
    if (!notes.length) extra.append(hint('No extra text blocks yet.'));
    notes.forEach((note, index) => {
      const card = el('article', 'ja-note-card');
      card.append(el('span', 'ja-eyebrow', `TEXT BLOCK ${index + 1}`));
      card.append(field(`Block ${index + 1} heading (optional)`, input(note.title, value => { note.title = value; update(); }, { maxLength: 200 })));
      card.append(field(`Block ${index + 1} text`, input(note.body, value => { note.body = value; update(); }, { multiline: true, rows: 5, maxLength: 12000 })));
      const actions = el('div', 'ja-item-actions');
      const up = button('↑ Move up', () => { [notes[index - 1], notes[index]] = [notes[index], notes[index - 1]]; update(); render('sections'); });
      up.disabled = index === 0;
      const down = button('↓ Move down', () => { [notes[index + 1], notes[index]] = [notes[index], notes[index + 1]]; update(); render('sections'); });
      down.disabled = index === notes.length - 1;
      const remove = button('Remove', () => { notes.splice(index, 1); update(); render('sections'); status('Text block removed from the draft.'); }, 'ja-button ja-danger');
      actions.append(up, down, remove); card.append(actions); extra.append(card);
    });
    const add = button('+ Add text block', () => {
      notes.push({ id: uid(), title: '', body: '' });
      update(); render('sections');
      const cards = body.querySelectorAll('.ja-note-card');
      cards[cards.length - 1]?.querySelector('input')?.focus();
    }, 'ja-button ja-wide');
    add.disabled = notes.length >= 20;
    extra.append(add);
    if (add.disabled) extra.append(hint('Each section can hold up to 20 extra text blocks.'));
    body.append(extra);
  }
  function renderPhotos() {
    body.append(heading('A few favourite moments.', 'Add several photos at once. Captions are optional; image descriptions help people using screen readers.'));
    body.append(field('Photo section', select(SECTIONS, photoSection, value => { photoSection = value; render('photos'); })));
    body.append(filePicker('Choose photos', true, async files => {
      const target = photoSection;
      const added = [];
      for (const file of files) {
        const src = await readImage(file, 6 * 1024 * 1024);
        added.push({ id: uid(), src, description: '', alt: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') });
      }
      const next = clone(config);
      if (next.galleries[target].length + files.length > 100) throw new Error('Each section can hold up to 100 photos. Remove a few photos before adding more.');
      next.galleries[target].push(...added); fits(next); config = next; update(); render('photos');
      status(`${added.length} photo${added.length === 1 ? '' : 's'} added to ${SECTIONS[target]}. ${readableSize(config)}.`);
    }));
    body.append(hint(readableSize(config)));
    const gallery = config.galleries[photoSection];
    if (!gallery.length) body.append(el('div', 'ja-empty', 'No added photos in this section yet. Your next adventure belongs here.'));
    gallery.forEach((photo, index) => {
      const card = el('article', 'ja-photo-card');
      const image = el('img', 'ja-photo-thumb'); image.src = photo.src; image.alt = photo.alt || photo.description || 'Uploaded photo';
      const info = el('div', 'ja-photo-info');
      info.append(el('span', 'ja-eyebrow', `PHOTO ${String(index + 1).padStart(2, '0')}`));
      info.append(field('Caption (optional)', input(photo.description, value => { photo.description = value; update(); }, { multiline: true, rows: 2, maxLength: 2000 })));
      info.append(field('Image description', input(photo.alt, value => { photo.alt = value; update(); }, { maxLength: 500 })));
      const actions = el('div', 'ja-item-actions');
      const up = button('↑ Move up', () => { [gallery[index - 1], gallery[index]] = [gallery[index], gallery[index - 1]]; update(); render('photos'); }); up.disabled = index === 0;
      const down = button('↓ Move down', () => { [gallery[index + 1], gallery[index]] = [gallery[index], gallery[index + 1]]; update(); render('photos'); }); down.disabled = index === gallery.length - 1;
      const remove = button('Remove', () => { gallery.splice(index, 1); update(); render('photos'); status('Photo removed from the draft.'); }, 'ja-button ja-danger');
      actions.append(up, down, remove); card.append(image, info, actions); body.append(card);
    });
  }
  function renderTheme() {
    body.append(heading('Set the mood.', 'Choose a palette, then make it your own. Scroll gradients blend between your four section colours.'));
    const grid = el('div', 'ja-preset-grid');
    Object.entries(PRESETS).forEach(([key, preset]) => {
      const choice = button('', () => { config.theme.preset = key; config.theme.colours = [...preset.colours]; config.theme.accent = preset.accent; update(); render('theme'); }, 'ja-preset');
      const swatch = el('span', 'ja-preset-swatch'); swatch.style.background = `linear-gradient(110deg, ${preset.colours.join(',')})`;
      choice.setAttribute('aria-pressed', String(config.theme.preset === key));
      choice.append(swatch, el('span', '', preset.name)); grid.append(choice);
    });
    body.append(grid, field('Background behaviour', select({ scroll: 'Colour changes as you scroll', solid: 'One colour for the whole page' }, config.theme.mode, value => { config.theme.mode = value; update(); render('theme'); })));
    Object.entries(SECTIONS).forEach(([key, label], index) => {
      if (config.theme.mode === 'solid' && index > 0) return;
      const control = input(config.theme.colours[index], value => { config.theme.colours[index] = value; update(); }, { type: 'color' });
      body.append(field(config.theme.mode === 'solid' ? 'Background colour' : `${label} colour`, control));
    });
    body.append(field('Accent colour', input(config.theme.accent, value => { config.theme.accent = value; update(); }, { type: 'color' }), 'Used for links, buttons and highlights.'));
  }
  function renderContacts() {
    body.append(heading('Let’s stay in touch.', 'Add contact links to the bottom of your page. Upload an optional icon for each one.'));
    if (!config.contacts.length) body.append(el('div', 'ja-empty', 'Your contact links will appear here. Add one whenever you are ready.'));
    config.contacts.forEach((contact, index) => {
      const card = el('article', 'ja-contact-card');
      card.append(el('span', 'ja-eyebrow', `CONTACT ${String(index + 1).padStart(2, '0')}`));
      card.append(field('Link label', input(contact.label, value => { contact.label = value; update(); }, { placeholder: 'Instagram, Discord, email…', maxLength: 100 })));
      const url = input(contact.url, value => {
        const valid = !value || safeURL(value);
        url.setCustomValidity(valid ? '' : 'Use a link starting with https://, http://, mailto:, or tel:.');
        url.setAttribute('aria-invalid', String(!valid));
        if (valid) { contact.url = value.trim(); update(); }
      }, { placeholder: 'https://…', maxLength: 2000 });
      card.append(field('Link address', url, 'Use https://, http://, mailto: or tel:.'));
      if (contact.icon) {
        const icon = el('img', 'ja-contact-icon'); icon.src = contact.icon; icon.alt = '';
        const iconRow = el('div', 'ja-icon-preview');
        iconRow.append(icon, button('Remove icon', () => { contact.icon = ''; update(); render('contacts'); }, 'ja-text-button'));
        card.append(iconRow);
      }
      card.append(filePicker(contact.icon ? 'Replace icon' : 'Add an icon (optional)', false, async files => {
        const src = await readImage(files[0], 1024 * 1024);
        const next = clone(config);
        const target = next.contacts.find(item => item.id === contact.id);
        if (!target) throw new Error('This contact was removed before its icon finished loading.');
        target.icon = src; fits(next); config = next; update(); render('contacts'); status('Contact icon added to the draft.');
      }));
      const actions = el('div', 'ja-item-actions');
      const up = button('↑ Move up', () => { [config.contacts[index - 1], config.contacts[index]] = [config.contacts[index], config.contacts[index - 1]]; update(); render('contacts'); }); up.disabled = index === 0;
      const down = button('↓ Move down', () => { [config.contacts[index + 1], config.contacts[index]] = [config.contacts[index], config.contacts[index + 1]]; update(); render('contacts'); }); down.disabled = index === config.contacts.length - 1;
      actions.append(up, down, button('Remove', () => { config.contacts.splice(index, 1); update(); render('contacts'); }, 'ja-button ja-danger'));
      card.append(actions); body.append(card);
    });
    const addContact = button('+ Add contact link', () => { config.contacts.push({ id: uid(), label: 'New contact', url: '', icon: '' }); update(); render('contacts'); }, 'ja-button ja-wide');
    addContact.disabled = config.contacts.length >= 30;
    body.append(addContact);
    if (addContact.disabled) body.append(hint('You have reached the limit of 30 contact links.'));
  }
  function renderPublish() {
    body.append(heading('Update your website', 'Copy your changes into GitHub, then commit them. You can use your normal GitHub sign-in; no access token is needed.'));
    let repository = config.repository;
    const actions = el('div', 'ja-publish-actions');
    const generated = el('textarea', 'ja-input ja-json-output');
    generated.readOnly = true; generated.rows = 8; generated.spellcheck = false;
    generated.setAttribute('aria-label', 'Generated content.json');
    const editorLink = el('a', 'ja-button', 'Open GitHub editor');
    editorLink.target = '_blank'; editorLink.rel = 'noopener noreferrer';
    const destination = hint('');
    const size = hint('');
    const prepared = () => {
      fits(config);
      site.apply(config);
      return site.getConfig();
    };
    function refreshExport() {
      try {
        const content = prepared();
        generated.value = window.JammStorage.serializeContent(content);
        size.textContent = `${(new Blob([generated.value]).size / 1024 / 1024).toFixed(2)} MB · Includes your text, notes, theme, photos and contacts.`;
      } catch (error) {
        generated.value = ''; size.textContent = error.message || 'The content could not be prepared.';
      }
      try {
        editorLink.href = window.JammStorage.githubEditorURL(repository);
        editorLink.removeAttribute('aria-disabled'); editorLink.removeAttribute('tabindex');
        destination.textContent = `Editing ${repository.owner}/${repository.repo} · ${repository.branch || 'main'}/content.json`;
      } catch (error) {
        editorLink.removeAttribute('href'); editorLink.setAttribute('aria-disabled', 'true'); editorLink.tabIndex = -1;
        destination.textContent = error.message || 'Check your repository settings below.';
      }
      return generated.value;
    }
    const copyButton = button('Copy for GitHub', async () => {
      if (publishing || !validInputs()) return;
      const text = refreshExport();
      if (!text) { status('The content could not be prepared. Check the message above.', true); return; }
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); copied = true; }
      } catch (_) { /* Keep the same text available for manual copying. */ }
      if (!copied) {
        preview.open = true;
        generated.focus(); generated.select(); generated.setSelectionRange(0, generated.value.length);
        try { copied = document.execCommand('copy'); } catch (_) { /* The selected text can still be copied by the user. */ }
      }
      status(copied
        ? 'Copied. Open the GitHub editor, replace the file’s contents, then choose Commit changes. Your live website has not changed yet.'
        : 'Your changes are selected below. Press ⌘C on Mac or Ctrl+C on Windows, then paste them into the GitHub editor. You can also download content.json.');
    }, 'ja-button ja-primary');
    const download = button('Download content.json', () => {
      if (publishing || !validInputs()) return;
      try {
        const content = prepared();
        window.JammStorage.downloadContent(content);
        refreshExport();
        status('content.json downloaded. Upload it to your repository, replacing the existing content.json, then commit the change.');
      } catch (error) { status(error.message || 'The content file could not be downloaded.', true); }
    });
    actions.append(copyButton, download, editorLink);
    body.append(actions, destination);
    const instructions = el('ol', 'ja-instructions ja-publish-steps');
    instructions.append(
      el('li', '', 'Finish editing your page, then choose Copy for GitHub.'),
      el('li', '', 'Open the GitHub editor and sign in to the account that owns this repository.'),
      el('li', '', 'Select all the text in content.json, paste your copied changes, then choose Commit changes. Your website updates when GitHub Pages finishes publishing.')
    );
    body.append(instructions, hint('You can also download content.json and upload it to the repository, replacing the existing file. New photo uploads and contact icons are included in the file.'));
    const preview = el('details', 'ja-publish-details');
    preview.append(el('summary', '', 'View generated content.json'), generated, size);
    body.append(preview);
    const settings = el('details', 'ja-publish-details');
    settings.append(el('summary', '', 'Repository settings'));
    const setRepository = key => value => { repository[key] = value.trim(); update(); refreshExport(); };
    settings.append(field('GitHub account or organisation', input(repository.owner, setRepository('owner'), { placeholder: 'MikaLover-Art', maxLength: 39 })));
    settings.append(field('Repository name', input(repository.repo, setRepository('repo'), { placeholder: 'mika', maxLength: 100 })));
    settings.append(field('Branch', input(repository.branch, setRepository('branch'), { placeholder: 'main', maxLength: 200 }), 'Leave blank to use main in the GitHub editor link.'));
    body.append(settings);
    const advanced = el('details', 'ja-publish-details ja-publish-advanced');
    advanced.append(el('summary', '', 'Advanced: publish with an access token'));
    const tokenSteps = el('ol', 'ja-instructions');
    const first = el('li', '', 'Create a fine-grained personal access token in ');
    const link = el('a', '', 'GitHub settings'); link.href = 'https://github.com/settings/personal-access-tokens/new'; link.target = '_blank'; link.rel = 'noopener noreferrer'; first.append(link, document.createTextNode('.'));
    tokenSteps.append(first, el('li', '', 'Select only this portfolio repository and allow “Contents: Read and write”.'), el('li', '', 'Paste the token below, then publish. It stays in memory and is cleared when you leave this tab or exit the editor.'));
    advanced.append(tokenSteps);
    tokenInput = input('', () => {}, { type: 'password', placeholder: 'GitHub fine-grained access token' });
    tokenInput.autocomplete = 'off'; tokenInput.spellcheck = false; tokenInput.setAttribute('data-1p-ignore', ''); tokenInput.setAttribute('data-lpignore', 'true');
    advanced.append(field('GitHub access token', tokenInput, 'Never included in drafts, backups or uploaded website content.'));
    advanced.addEventListener('toggle', () => { if (!advanced.open && !publishing && tokenInput) tokenInput.value = ''; });
    publishButton = button('Publish directly to GitHub', async () => {
      if (publishing || !validInputs()) return;
      if (!repository.owner || !repository.repo || !tokenInput.value.trim()) { status('Enter the GitHub account, repository name and access token to publish.', true); return; }
      if (config.contacts.some(contact => contact.url && !safeURL(contact.url))) { status('A contact link is invalid. Use https://, http://, mailto: or tel:.', true); return; }
      publishing = true; publishButton.textContent = 'Publishing…';
      const controls = [...body.querySelectorAll('input, select, textarea, button')].map(control => [control, control.disabled]);
      controls.forEach(([control]) => { control.disabled = true; });
      try {
        const content = prepared();
        const result = await window.JammStorage.publish({ owner: repository.owner, repo: repository.repo, branch: repository.branch, token: tokenInput.value.trim(), config: content, onProgress: message => status(String(message)) });
        config = result && result.config ? clone(result.config) : config;
        site.apply(config); config = site.getConfig(); published = clone(config);
        const saved = await save(true);
        status(saved ? 'Published to GitHub. Your public website will update when GitHub Pages finishes deploying.' : 'Published to GitHub, but this browser could not save your draft. Download a backup to keep a local copy.', !saved);
      } catch (error) { status(`Publishing failed: ${error.message || 'Please check your connection and repository permissions.'}`, true); }
      finally {
        publishing = false; if (tokenInput) tokenInput.value = '';
        controls.forEach(([control, disabled]) => { control.disabled = disabled; });
        publishButton.textContent = 'Publish directly to GitHub';
        repository = config.repository;
        refreshExport();
      }
    }, 'ja-button ja-wide');
    advanced.append(publishButton);
    body.append(advanced);
    refreshExport();
  }
  async function init() {
    if (!window.JammSite) return;
    site = window.JammSite; await site.ready;
    makeUnlock(); makePanel();
    document.addEventListener('click', event => {
      const brand = event.target.closest && event.target.closest('.brand');
      if (!brand) return;
      if (active) { event.preventDefault(); event.stopImmediatePropagation(); exit(); return; }
      count += 1;
      if (count === 10) {
        event.preventDefault(); event.stopImmediatePropagation();
        codePosition = 0; unlock.querySelector('.ja-code-progress').textContent = 'Ready for your sequence';
        unlock.showModal();
      }
    }, true);
  }
  init().catch(error => console.error('The portfolio editor could not start.', error));
})();
