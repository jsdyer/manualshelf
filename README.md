# Manual Shelf

Find archived equipment manuals, inspect their editions and save a private equipment cabinet.

**Open:** https://coolcode.ca/manualshelf/

Search any manufacturer/model or manual title, inspect document formats and original versus generated files, label your equipment, and save page references or repair notes. Compare up to three records and export a cabinet backup or a file manifest.

<!-- coolcode:guide -->
Search your manufacturer and model, then inspect the source record before choosing a PDF or other document format. Archive dates and title-based manual types do not establish compatibility; verify the exact model, region and revision in the document. Save an equipment label and notes only when you choose, compare up to three records, and export a cabinet backup. Search terms and selected item IDs go to Internet Archive; your private labels, notes and imported cabinet stay on your device. Restricted files remain subject to Internet Archive access controls.
Configured model-number aliases expand exact model searches; aliases are search aids, never a compatibility guarantee. Inspect a record to compare file formats and editions, then search a selected PDF’s existing text layer locally. Results link to exact PDF file pages and offer citations that distinguish file pages from printed numbering. Download availability checks make a bounded GET request and display the response status and time; metadata alone is not labelled verified. PDFs are fetched only after Search PDF pages, limited to 50 MB and 500 pages; image-only scans need OCR from the provider. Your cabinet and notes stay local.
<!-- /coolcode:guide -->

## How it works

- Internet Archive Advanced Search supplies public text-record metadata. The default search looks in the manuals collection or titles containing manual, instructions or handbook. Expand to **All archived texts** when a guide is catalogued elsewhere.
- Queries are literal words, not an exposed Archive query-language input. Model punctuation is retained where safe; use fewer words when no record matches.
- The item metadata API supplies original/derived file records. Links are shown for publicly listed PDF, text, DjVu, EPUB and related document formats. Private files are omitted. File existence or public metadata does not guarantee permission, unrestricted downloads or accurate descriptions.
- Manual classification is inferred only from the title. Record dates can refer to different kinds of dates; verify the actual document.
- Comparison uses up to three selected record summaries. Inspect a record to include its file formats. There is no claim that two editions are interchangeable.
- Cabinet entries contain the metadata checked at the time you saved them. They do not update silently. Import adds new identifiers and preserves existing entries/notes. Up to 300 manuals per cabinet.
- No scheduled collector, backend, API key or account is needed. Network failures appear explicitly; the app never presents example fixtures as live results.

## Privacy and storage

Searches, selected archive IDs, thumbnails and opened document URLs contact Internet Archive. Equipment labels, notes and cabinet files remain local. Cabinet data is written only after Save or Import under `coolcode:manualshelf:cabinet`; export JSON before clearing browser data. CSV exports guard spreadsheet formula-leading cells. There is no cloud sync or account. The common CoolCode visitor counter records aggregate tool visits, not your cabinet or search terms. This app does not load a third-party font service; fonts fall back to installed system fonts.

## Expand or customize

Edit `web/config.json` to add/remove starter queries or set a page size between 1 and 50. Examples are shortcuts, never a fixed inventory: every visitor can enter arbitrary model names. Add a preset such as `{"label":"Your device","query":"manufacturer model"}`. Update `tool.json` and the guide excerpt if coverage or behaviour changes.

```sh
node --test tests/*.test.mjs
python3 -m unittest discover -s tests -v
python3 scripts/build.py
python3 -m http.server 8000 --directory dist
```

The build is offline. Browser smoke tests use deterministic API fixtures to exercise search, files, save/import/export, comparisons, errors and mobile layout; real source calls are checked separately before release. Main pushes and manual dispatch run tests, build and browser checks, then deploy `dist/` through GitHub Pages. Pull requests never deploy. No refresh schedule or watchdog target is appropriate for an on-demand browser query tool.

## Sources

- [Internet Archive metadata API](https://archive.org/developers/md-read.html)
- [Internet Archive developer portal](https://archive.org/developers/index-apis.html)
- [Manuals collection](https://archive.org/details/manuals)
- [Automated access guidance](https://archive.org/developers/bots.html)

Requests are user-triggered with limited pagination. No background bulk downloading, access-control bypass, copyrighted mirror or automatic repair instruction is supplied. Use original source links and qualified service advice where appropriate.

## PDF pages, aliases and verified links

`web/config.json` has `modelAliases`, a list of `{model, aliases}` groups. Add any manufacturer/model group; matching ignores punctuation/case and expands only a recognized complete model query. Existing arbitrary model search still works. Inspect files before comparing editions; no metadata comparison promises compatibility or textual equality.

**Verify download availability** sends a one-byte range GET and cancels the body after reading status. Some servers ignore Range; the app does not continue downloading the file. A successful status is a dated access observation, not a cryptographic integrity check. Private/restricted files are not bypassed. Browser CORS or source errors are explicitly unverified.

**Search PDF pages** downloads one public PDF on demand (50 MB / 500-page cap), then extracts its existing text with vendored Mozilla PDF.js 6.5.438. Search phrases remain local. File page 1 may be a cover, so citations deliberately identify PDF page numbers. Image-only scans cannot be searched without an existing OCR text layer. PDF.js does not execute document JavaScript; evaluation support is disabled. Its Apache-2.0 licence and npm integrity provenance are in `web/vendor/pdfjs/`.

To update PDF.js, use an official npm package, verify its SHA-512 integrity, replace both matching `pdf.mjs` and `pdf.worker.mjs`, retain the licence, and rerun app/browser tests. Runtime CDN script loading is not used. The ordinary offline build includes the reviewed local files. No collector or Worker/API key is introduced.
