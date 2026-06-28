# PetrusCMS

A small, database-free content manager built into the Time Capsule Tapes site.
It runs on flat files and a handful of PHP scripts. No database, no framework,
no build step. This document is the map of how it is put together.

## The one idea

There is a single content file, `state.json`, and it describes everything
dynamic on the page. The site ships with sensible defaults in the HTML, and
`state.json` overrides them. Editing the site means editing that file through
the interface, and every save files the previous version into a history folder,
so rolling back is just stepping to an older copy.

```
visitor  →  server renders the page with state.json already in the HTML  →  painted
owner    →  edits in the browser  →  saves  →  new state.json + a history snapshot  →  live
```

Nothing else holds state.

## The moving parts

```
index.php · inc/boot.php   Server render. Reads state.json and prints the page,
                           saved content already in place, so there is no flash
                           of default text before the real content appears.

petrus.js                  The editing layer in the browser. Unlock, edit text
                           and photographs in place, save, step through history.

api/                       A few small endpoints, each behind a server session:
                             auth      open and close an editing session
                             save      write state.json and snapshot the old one
                             upload    receive a photograph
                             history   list and load previous versions

data/state.json            The single source of truth.
data/history/              One snapshot per save. Rollback reads from here.
img/photos/                Uploaded photographs. Never deleted, so any past
                           version can always point back at its images.
```

## How the page and the editor talk

Everything the manager touches is marked with a `data-petrus-*` attribute, so
making more of the page editable is usually a one-attribute change rather than a
code change.

| Hook | Put it on | What it does |
|---|---|---|
| `data-petrus-text="key"` | any text element | Makes that text editable. Stored under the key. |
| `data-petrus-gallery` | the gallery container | Marks a managed gallery. |
| `data-petrus-family` | the stories container | Marks the family stories grid. |
| `data-petrus-hold` | logo or feature photo | Press and hold to unlock editing. |

State is one shared document loaded by every page, so each value is stored under
a page-prefixed key, `"<page>:<key>"`. A key only has to be unique within its own
page, which keeps two pages from ever overwriting each other.

## The shape of the content

```json
{
  "version": 1,
  "updated": "2026-06-17T10:00:00+00:00",
  "texts":       { "home:hero-h1": "…", "home:offer-p1": "…" },
  "backgrounds": { "home:hero": { "src": "img/photos/…", "posY": 38, "scrim": 0.3 } },
  "galleries":   { "home": [ { "src": "img/photos/…", "alt": "" } ] },
  "families":    { "home": [ { "name": "…", "place": "…", "src": "img/photos/…" } ] },
  "hidden":      { "home:stories": true }
}
```

Empty collections mean the page falls back to its HTML defaults. A background
entry only stores the framing fields that differ from neutral, so the file stays
small and readable.

## Why custom, and why this small

A heavy content platform would have brought a database, an admin area, accounts,
upgrades and a hosting shape to match. None of that served a one-person studio
site. The whole job was to let the owner change words and photographs and roll
back a mistake. Flat files do exactly that, and the result is something one
person can read end to end and trust. State lives in one JSON file, history is
just copies of it, and photographs are never thrown away. As long as those three
things hold, the system stays simple to reason about and simple to recover.
