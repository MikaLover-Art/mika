# mikalover.github.io — Jamm’s Personal Archive

A responsive, Mika-inspired personal portfolio for Earl James (Jamm), with polished copy, pink-to-blue-to-lilac scroll colours, and four navigation sections:

1. Self Introduction
2. Hobbies
3. Favourite Game
4. Favourite Character

Includes interactive hobby cards, a rotating personal-fact panel, a Mika appreciation button, reading progress, active section navigation, a motion toggle, reduced-motion support, and keyboard-accessible controls.

## Preview

Open `index.html` directly in a browser. For local HTTP preview, run `python3 -m http.server 4173` from this folder and visit `http://localhost:4173`.

No installation or build is required. The page works with local assets. Google Fonts is optional; system fonts are used when offline.

## Intended GitHub destination

- Account: **MikaLover-Art** (verified in the friend’s signed-in GitHub window).
- Requested repository: **Mika-Lover**.
- Expected project-site address: **https://mikalover-art.github.io/Mika-Lover/**.
- Requested display title: **mikalover.github.io**.

The exact root address `mikalover.github.io` is reserved by GitHub for the account `mikalover` and its repository `mikalover.github.io`. A display title cannot change the assigned GitHub Pages domain.

## Publish on GitHub Pages

1. Sign in to **MikaLover-Art**.
2. Create a public repository named **Mika-Lover**.
3. Upload this folder’s contents at the repository root, preserving the `assets` folder. `index.html` must be at the top level.
4. Open **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, **main**, **/ (root)**, and save.
5. Wait for the Pages deployment to complete. Its settings screen will show the live address.

No build step or package installation is required. All paths are relative, including future photo uploads, so the project path works correctly.

[GitHub’s Pages setup instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## Hidden editor

1. Click the **Jamm logo 10 times**.
2. Enter **↑ ↑ ↓ ↓ ← → ← → B A B A** using the keyboard or on-screen controls. Letters are case-insensitive.
3. Edit text in **Sections**, add multiple images and optional captions in **Photos**, change the background in **Theme**, or manage footer links and custom icons in **Contacts**.
4. **Preview page** collapses the editor. **Save draft** keeps work in this browser. Clicking the Jamm logo again saves the draft, exits admin mode, and returns to the published version. Reopening the editor restores the draft.

Photo galleries accept PNG, JPG, WebP and GIF, up to 6 MB per photo and 100 photos per section. Contact icons allow up to 1 MB; up to 30 links are supported. Draft and backup JSON are limited to 30 MB, including encoded images. Captions are optional; add image descriptions for accessibility. Galleries are hidden until photos are added. Photos open in a larger viewer when clicked.

## Publish edits from the editor

The secret sequence hides the editing interface. It is not authentication: visitors cannot publish without GitHub authorisation.

In **Publish**, the account and repository are already configured. Your friend can create a fine-grained GitHub personal access token limited to this repository with **Contents: Read and write**, then enter it in the editor’s password field. The token is held only in memory, never stored in drafts, backups, or the repository, and cleared after publishing or leaving the Publish tab.

Publishing uploads new image assets and `content.json` in a commit, preserving existing repository files. GitHub Pages then deploys the updated content. The initial website files must already be in the repository before this works. Branch protection may require a different publishing workflow.

**Download backup** exports a portable JSON copy, including photos and icons. **Import backup** restores it into the local preview. Back up before changing devices or clearing browser data. Browser drafts are private to that browser; publishing makes the selected photos and contacts public.

## Customise

- `index.html`: personal copy, section structure, and image descriptions.
- `styles.css`: visual design, responsive layouts, and animations.
- `script.js`: interactions and scroll palette.
- `site-content.js` and `content.json`: editable content, themes, galleries and contacts.
- `admin-panel.js` / `admin.css`: the hidden editor.
- `admin-storage.js`: browser drafts, backups and GitHub publishing.
- `INTRODUCTION.md`: the fully corrected introduction and section copy.
- `assets/`: local artwork and favicon.
- `CREDITS.md`: artwork origins and attribution.

Personal photos and earlier reference websites were not present in the provided project files. Add Jamm’s actual photos when available; no personal images were invented.

This folder is ready to upload. It has not been published to a GitHub account unless a subsequent deployment is explicitly confirmed.
