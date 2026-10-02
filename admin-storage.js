/* Local drafts and explicit GitHub publishing. No credentials are persisted. */
(() => {
  'use strict';

  const DATABASE = 'jamm-portfolio-admin';
  const STORE = 'drafts';
  const DRAFT_KEY = 'current';
  const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
  const API_ROOT = 'https://api.github.com';
  const ALLOWED_MIMES = new Map([
    ['image/jpeg', 'jpg'], ['image/jpg', 'jpg'], ['image/png', 'png'],
    ['image/webp', 'webp'], ['image/gif', 'gif'],
  ]);
  let publishing = false;

  function copyConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
      throw new Error('The portfolio content is invalid. Restore a valid backup and try again.');
    }
    try {
      return JSON.parse(JSON.stringify(config));
    } catch (_) {
      throw new Error('The portfolio content could not be prepared. Restore a valid backup and try again.');
    }
  }

  function openDatabase() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('This browser cannot save drafts. Download a backup to keep your changes.'));
        return;
      }
      const request = window.indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
      };
      request.onsuccess = () => {
        const database = request.result;
        database.onversionchange = () => database.close();
        resolve(database);
      };
      request.onerror = () => reject(new Error('Your browser could not open draft storage. Download a backup to keep your changes.'));
      request.onblocked = () => reject(new Error('Draft storage is busy in another tab. Close other portfolio tabs and try again.'));
    });
  }

  async function withDraftStore(mode, action) {
    const database = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = database.transaction(STORE, mode);
        let request;
        try { request = action(transaction.objectStore(STORE)); }
        catch (_) {
          transaction.abort();
          reject(new Error('The draft could not be saved. Download a backup to keep your changes.'));
          return;
        }
        transaction.oncomplete = () => resolve(request.result ?? null);
        transaction.onabort = transaction.onerror = () => {
          reject(new Error('The draft could not be stored. Your browser may be out of space or using private browsing. Download a backup to keep your changes.'));
        };
      });
    } finally {
      database.close();
    }
  }

  async function loadDraft() {
    return withDraftStore('readonly', store => store.get(DRAFT_KEY));
  }

  async function saveDraft(config) {
    const draft = copyConfig(config);
    await withDraftStore('readwrite', store => store.put(draft, DRAFT_KEY));
  }

  async function clearDraft() {
    await withDraftStore('readwrite', store => store.delete(DRAFT_KEY));
  }

  function validateBranch(branch) {
    if (typeof branch !== 'string' || branch.length > 250 ||
        !/^[A-Za-z0-9_][A-Za-z0-9_./-]*$/.test(branch) ||
        branch.includes('..') || branch.includes('//') || branch.endsWith('/') ||
        branch.endsWith('.') || branch.split('/').some(part => part.startsWith('.') || part.endsWith('.lock'))) {
      throw new Error('Enter a valid GitHub branch name, such as main.');
    }
    return branch;
  }

  function validateRepository(owner, repo) {
    if (typeof owner !== 'string' || owner.length > 39 || !/^[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?$/.test(owner)) {
      throw new Error('Enter a valid GitHub account or organisation name.');
    }
    if (typeof repo !== 'string' || repo.length > 100 || !/^[A-Za-z0-9_.-]+$/.test(repo) || repo === '.' || repo === '..') {
      throw new Error('Enter a valid GitHub repository name.');
    }
  }

  function validSha(value) {
    if (typeof value !== 'string' || !/^[a-f0-9]{40,64}$/i.test(value)) {
      throw new Error('GitHub returned an unexpected response. Nothing was published; please try again.');
    }
    return value;
  }

  function progress(callback, message) {
    if (typeof callback === 'function') {
      try { callback(message); } catch (_) { /* A status display must not interrupt an upload. */ }
    }
  }

  function apiError(status, stage) {
    if (status === 401) return new Error('GitHub did not accept the access token. Enter a valid token and try again.');
    if (status === 403 || status === 429) return new Error('GitHub refused this request. Check that the token has Contents: read and write access to this repository, that branch rules allow updates, and that the GitHub API rate limit has not been reached.');
    if (status === 404) return new Error(stage === 'index'
      ? 'This branch must contain the Jamm portfolio at its root, including index.html. Upload the website files first.'
      : 'The repository or branch could not be found. Check the account, repository, branch, and token access. Upload the website files first if the repository is empty.');
    if ((status === 409 || status === 422) && stage === 'update') return new Error('The branch changed during publishing, or its rules prevent direct updates. Your changes were not published. Review the latest site and branch rules, then try again. Existing commits were not overwritten.');
    if (status === 409) return new Error('The repository is empty or cannot be updated yet. Upload the website files and create its first commit, then try again.');
    if (status === 422) return new Error('GitHub could not accept the update. Check the branch rules and repository settings, then try again.');
    if (status >= 500) return new Error('GitHub is temporarily unavailable. Your draft is safe; try publishing again later.');
    return new Error(`GitHub could not complete the request (HTTP ${Number(status) || 'error'}). Your draft is safe; please try again.`);
  }

  async function github(path, token, { method = 'GET', body, stage = '' } = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(API_ROOT + path, {
        method,
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        credentials: 'omit',
        cache: 'no-store',
        redirect: 'error',
      });
      // Never surface response bodies: they can contain untrusted text or reflected credentials.
      if (!response.ok) throw apiError(response.status, stage);
      let result;
      try { result = await response.json(); }
      catch (_) { throw new Error('GitHub returned an unreadable response. Please try again.'); }
      return result;
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(stage === 'update'
          ? 'GitHub did not respond in time. The update may have completed; check the repository before publishing again.'
          : 'The GitHub request timed out. Check your connection and try again.');
      }
      if (error instanceof TypeError) throw new Error(stage === 'update'
        ? 'The connection ended while publishing. Check the repository to see whether the update completed before trying again.'
        : 'Could not reach GitHub. Check your internet connection and try again.');
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function verifyImageBytes(bytes, mime) {
    const prefix = count => String.fromCharCode(...bytes.slice(0, count));
    const valid = (mime === 'image/png' && bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)) ||
      ((mime === 'image/jpeg' || mime === 'image/jpg') && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) ||
      (mime === 'image/gif' && ['GIF87a', 'GIF89a'].includes(prefix(6))) ||
      (mime === 'image/webp' && bytes.length >= 12 && prefix(4) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP');
    if (!valid) throw new Error('One image has an invalid file format. Replace it with a valid JPG, PNG, WebP, or GIF image.');
  }

  function readDataImage(value) {
    const match = /^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/\s]*={0,2})$/i.exec(value);
    if (!match) throw new Error('Images must be JPG, PNG, WebP, or GIF files. SVG uploads are not supported.');
    const mime = match[1].toLowerCase();
    const content = match[2].replace(/\s/g, '');
    if (!content || content.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new Error('Each photo or contact icon must be no larger than 6 MB.');
    let decoded;
    try { decoded = atob(content); }
    catch (_) { throw new Error('One uploaded image is damaged. Remove it and upload the original file again.'); }
    if (!decoded.length || decoded.length > MAX_IMAGE_BYTES) throw new Error('Each photo or contact icon must be no larger than 6 MB.');
    verifyImageBytes(Uint8Array.from(decoded, char => char.charCodeAt(0)), mime);
    return { mime, content, extension: ALLOWED_MIMES.get(mime) };
  }

  // Visit only authored image fields. Text, headings, and links are never rewritten.
  function imageFields(config) {
    const images = [];
    const visit = (value, trail, depth = 0) => {
      if (depth > 12) throw new Error('The photo collection has an invalid structure. Restore a valid backup and try again.');
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) value.forEach((entry, index) => visit(entry, `${trail}-${index}`, depth + 1));
      else {
        if (typeof value.src === 'string' && value.src) images.push({ object: value, key: 'src', id: value.id || trail });
        Object.entries(value).forEach(([key, entry]) => {
          if (entry && typeof entry === 'object') visit(entry, `${trail}-${key}`, depth + 1);
        });
      }
    };
    visit(config.galleries, 'photo');
    if (Array.isArray(config.contacts)) config.contacts.forEach((contact, index) => {
      if (contact && typeof contact.icon === 'string' && contact.icon) images.push({ object: contact, key: 'icon', id: `${contact.id || index}-icon` });
    });
    return images;
  }

  function assetPath(id, extension, usedPaths) {
    const stem = String(id).replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 100) || 'photo';
    let path = `assets/uploads/${stem}.${extension}`;
    let suffix = 2;
    while (usedPaths.has(path)) path = `assets/uploads/${stem}-${suffix++}.${extension}`;
    usedPaths.add(path);
    return path;
  }

  async function publish({ owner, repo, branch, token, config, onProgress } = {}) {
    if (publishing) throw new Error('A publish is already in progress. Please wait for it to finish.');
    owner = typeof owner === 'string' ? owner.trim() : owner;
    repo = typeof repo === 'string' ? repo.trim() : repo;
    validateRepository(owner, repo);
    if (typeof token !== 'string' || !token.trim() || /[^\x21-\x7e]/.test(token.trim())) throw new Error('Enter your GitHub access token to publish.');
    token = token.trim();
    if (branch) branch = validateBranch(branch.trim());
    const publishedConfig = copyConfig(config);
    const uploads = [];
    const fields = imageFields(publishedConfig);
    // Keep existing referenced assets intact even if an imported backup reused an ID.
    const usedPaths = new Set(fields.map(field => field.object[field.key].replace(/^\.\//, ''))
      .filter(path => /^assets\/uploads\/[A-Za-z0-9_.-]+$/.test(path)));
    // Validate every upload before making any GitHub changes.
    for (const field of fields) {
      if (/^data:/i.test(field.object[field.key])) {
        const image = readDataImage(field.object[field.key]);
        const path = assetPath(field.id, image.extension, usedPaths);
        uploads.push({ path, content: image.content });
        field.object[field.key] = `./${path}`;
      }
    }
    const base = `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
    publishing = true;
    try {
      progress(onProgress, 'Checking the GitHub repository…');
      const repository = await github(base, token);
      branch = validateBranch(branch || repository.default_branch);
      const branchPath = branch.split('/').map(encodeURIComponent).join('/');
      const reference = await github(`${base}/git/ref/heads/${branchPath}`, token);
      if (reference.object?.type !== 'commit') throw new Error('This repository branch has no commit yet. Upload the website files first.');
      const parentSha = validSha(reference.object.sha);
      const commit = await github(`${base}/git/commits/${parentSha}`, token);
      const baseTree = validSha(commit.tree?.sha);
      const index = await github(`${base}/contents/index.html?ref=${encodeURIComponent(parentSha)}`, token, { stage: 'index' });
      let indexText = '';
      if (index.type === 'file' && index.encoding === 'base64' && typeof index.content === 'string') {
        try { indexText = atob(index.content.replace(/\s/g, '')); } catch (_) { /* Fails the portfolio check below. */ }
      }
      if (!/jamm/i.test(indexText)) throw new Error('The selected branch does not contain the Jamm portfolio at its root. Upload these website files first, or choose the correct repository.');
      const tree = [];
      for (let index = 0; index < uploads.length; index++) {
        progress(onProgress, `Uploading photo or icon ${index + 1} of ${uploads.length}…`);
        const upload = uploads[index];
        const blob = await github(`${base}/git/blobs`, token, { method: 'POST', body: { content: upload.content, encoding: 'base64' } });
        tree.push({ path: upload.path, mode: '100644', type: 'blob', sha: validSha(blob.sha) });
      }
      progress(onProgress, 'Saving your text, photos, contacts, and theme…');
      const contentBlob = await github(`${base}/git/blobs`, token, {
        method: 'POST', body: { content: JSON.stringify(publishedConfig, null, 2) + '\n', encoding: 'utf-8' },
      });
      tree.push({ path: 'content.json', mode: '100644', type: 'blob', sha: validSha(contentBlob.sha) });
      const newTree = await github(`${base}/git/trees`, token, { method: 'POST', body: { base_tree: baseTree, tree } });
      const newCommit = await github(`${base}/git/commits`, token, {
        method: 'POST', body: { message: 'Update Jamm portfolio content', tree: validSha(newTree.sha), parents: [parentSha] },
      });
      const sha = validSha(newCommit.sha);
      progress(onProgress, 'Publishing the update to your branch…');
      await github(`${base}/git/refs/heads/${branchPath}`, token, { method: 'PATCH', stage: 'update', body: { sha, force: false } });
      progress(onProgress, 'Published. GitHub Pages may take a few minutes to update.');
      return { sha, commitUrl: `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commit/${sha}`, config: publishedConfig };
    } finally {
      // The token only lives in this invocation and in its HTTPS request headers.
      token = '';
      publishing = false;
    }
  }

  async function imageAsDataUrl(source) {
    if (/^data:/i.test(source)) {
      readDataImage(source);
      return source;
    }
    let url;
    try { url = new URL(source, document.baseURI); }
    catch (_) { throw new Error('A photo has an invalid address. Remove or replace it before downloading a backup.'); }
    if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('A photo has an unsupported address. Upload it again before downloading a backup.');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url.href, { credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error('Image unavailable');
      const rawMime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
      if (!ALLOWED_MIMES.has(rawMime)) throw new Error('Unsupported image');
      const declaredSize = Number(response.headers.get('content-length'));
      if (declaredSize > MAX_IMAGE_BYTES) throw new Error('Image too large');
      let bytes;
      if (response.body?.getReader) {
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > MAX_IMAGE_BYTES) { await reader.cancel(); throw new Error('Image too large'); }
          chunks.push(value);
        }
        bytes = new Uint8Array(size);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      } else bytes = new Uint8Array(await response.arrayBuffer());
      if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Image too large');
      verifyImageBytes(bytes, rawMime);
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return `data:${rawMime};base64,${btoa(binary)}`;
    } catch (_) {
      throw new Error('One photo or icon could not be included in the backup. Open the hosted website and try again, or upload that image again. Images must be accessible JPG, PNG, WebP, or GIF files under 6 MB.');
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function serializeContent(config) {
    const content = copyConfig(config);
    if (content.version !== 1 || !content.text || !content.galleries) {
      throw new Error('The portfolio content is incomplete. Reload the editor and try again.');
    }
    return JSON.stringify(content, null, 2) + '\n';
  }

  function githubEditorURL(repository = {}) {
    const owner = String(repository.owner || '').trim();
    const repo = String(repository.repo || '').trim();
    const branch = String(repository.branch || 'main').trim() || 'main';
    validateRepository(owner, repo);
    validateBranch(branch);
    return `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/edit/${encodeURIComponent(branch)}/content.json`;
  }

  function downloadContent(config) {
    const blob = new Blob([serializeContent(config)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'content.json';
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return blob;
  }

  async function exportBackup(config) {
    const backup = copyConfig(config);
    for (const field of imageFields(backup)) field.object[field.key] = await imageAsDataUrl(field.object[field.key]);
    const blob = new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jamm-portfolio-backup.json';
    link.hidden = true;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    return blob;
  }

  window.JammStorage = Object.freeze({ loadDraft, saveDraft, clearDraft, publish, exportBackup, serializeContent, githubEditorURL, downloadContent });
})();
