# mikalover.github.io — Jamm’s Personal Archive

A responsive, Mika-inspired personal portfolio for Earl James (Jamm), with Jamm’s introduction and photos, pink-to-blue-to-lilac scroll colours, and four navigation sections:

1. Self Introduction
2. Hobbies
3. Favourite Game
4. Favourite Character

Includes a rotating Mika photo banner, interactive hobby cards, a rotating personal-fact panel, a Mika appreciation button, reading progress, active section navigation, a motion toggle, reduced-motion support, and keyboard-accessible controls.

## Preview

Open `index.html` directly in a browser. For local HTTP preview, run `python3 -m http.server 4173` from this folder and visit `http://localhost:4173`.

No installation or build is required. The page works with local assets. Google Fonts is optional; system fonts are used when offline.

## GitHub destination

- Account: **MikaLover-Art** (verified in the friend’s signed-in GitHub window).
- Repository: **mika**.
- Project-site address: **https://mikalover-art.github.io/mika/**.
- Requested display title: **mikalover.github.io**.

The exact root address `mikalover.github.io` is reserved by GitHub for the account `mikalover` and its repository `mikalover.github.io`. A display title cannot change the assigned GitHub Pages domain.

## Publish on GitHub Pages

1. Sign in to **MikaLover-Art**.
2. Use the existing public repository named **mika**.
3. Upload this folder’s contents at the repository root, preserving the `assets` folder. `index.html` must be at the top level.
4. Open **Settings → Pages → Build and deployment**. Choose **Deploy from a branch**, **main**, **/ (root)**, and save.
5. Wait for the Pages deployment to complete. Its settings screen will show the live address.

No build step or package installation is required. All paths are relative, including future photo uploads, so the project path works correctly.

[GitHub’s Pages setup instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site)

## Hidden editor

1. Click the **circular Mika logo 10 times**.
2. Enter **↑ ↑ ↓ ↓ ← → ← → B A B A** using the keyboard or on-screen controls. Letters are case-insensitive.
3. Edit text in **Sections**, add multiple images and optional captions in **Photos**, change the background in **Theme**, or manage footer links and custom icons in **Contacts**.
4. **Preview page** collapses the editor. **Save draft** keeps work in this browser. Clicking the Mika logo again saves the draft, exits admin mode, and returns to the published version. Reopening the editor restores the draft.

Photo galleries accept PNG, JPG, WebP and GIF, up to 6 MB per photo and 100 photos per section. Contact icons allow up to 1 MB; up to 30 links are supported. Draft and backup JSON are limited to 30 MB, including encoded images. Captions are optional; add image descriptions for accessibility. Galleries are hidden until photos are added. Photos sit in horizontal strips with arrow controls, keyboard navigation and touch scrolling. Captions appear on hover or focus, and remain visible on phones. Clicking opens the photo viewer, which includes a zoom control.

## Publish edits from the editor

The secret sequence hides the editing interface. It is not authentication: visitors cannot publish without GitHub authorisation.

In **Sections**, choose a section to edit its headings, paragraphs, button labels and other text. Use **Add text block** to add extra information to any of the four main sections, with an optional heading. Blocks can be reordered or removed.

To publish with the same copy-and-paste workflow as the NutcrackerPro portfolio:

1. Open **Publish** and choose **Copy for GitHub**.
2. Choose **Open GitHub editor**. This opens `content.json` in the **MikaLover-Art/mika** repository.
3. Select all the existing file text, paste the copied code, and choose **Commit changes**. GitHub Pages will update after its deployment finishes.

The code includes every editable text field, extra text blocks, colours, photo captions, contacts, and newly uploaded photos/icons. Existing website images keep their current asset paths. You only need to replace `content.json`; no access token is required for this workflow. Copying or saving a draft does not publish anything.

You can also choose **Download content.json** and upload that file to the repository, replacing the existing file. This is useful if a large photo collection is difficult to paste into GitHub's editor.

Optional direct publishing remains available under **Advanced**. It uses a fine-grained GitHub token limited to this repository with **Contents: Read and write**. The token stays in memory, is excluded from exports and backups, and is cleared after publishing or leaving the Publish tab. Direct publishing saves images as separate assets and updates `content.json` in one commit.

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

The galleries include 14 photos, drawings, screenshots, and Mika images supplied by Jamm. The remaining supplied profile picture appears as the circular site logo, browser icon, and a banner background. Every gallery image has a caption and an accessible description. `published-content.js` supplies the same galleries for local file previews; the live site reads `content.json` first.

GitHub Pages serves this folder from the main branch. Upload changes to the same repository to update the site.
