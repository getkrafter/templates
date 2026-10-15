# Krafter templates

The template catalog for [Krafter](https://getkrafter.dev). One folder per
template package, `catalog.json` at the root, and `docs/` for the authoring
guide (fact-24).

```
templates/<id>/        a template package: template.json, template.hbs,
                       template.css, partials/*.hbs, preview.png, LICENSE
catalog.json           what the app fetches: one entry per template
official.json          the ids the core team maintains
schema/                catalog.schema.json, and a copy of the manifest schema
scripts/               update-catalog.mjs — writes catalog.json
docs/                  authoring-guide.md, contract.md
```

Official and community templates live side by side under `templates/`; nothing
about the folder differs. The only thing that marks a template official is its
id being listed in `official.json`, which only `@getkrafter/core` can change.

## Adding a template

```sh
npx @getkrafter/template-cli init templates/<id>   # a package that already validates
npx @getkrafter/template-cli dev templates/<id>    # live preview while you edit
npx @getkrafter/template-cli preview templates/<id>  # writes preview.png
npx @getkrafter/template-cli check templates/<id>  # exactly what CI runs
```

Then open a pull request. `check` is the gate: it runs every validation rule,
renders all eight profile fixtures, and fails on a missing or stale
`preview.png`, a missing licence, or an unused partial. Run it before you push
— a red PR is the same failure, ten minutes later.

Read [`docs/authoring-guide.md`](docs/authoring-guide.md) for the long version
and [`docs/contract.md`](docs/contract.md) for the data, tokens and helpers a
template may rely on.

### Running the CLI before it is published

`@getkrafter/template-cli` is not on npm yet (it lands in W6). Until then, run
it out of the monorepo:

```sh
bun ../krafter-app/packages/template-cli/src/bin.ts check templates/<id>
```

or pack it once and install the tarball:

```sh
(cd ../krafter-app/packages/template-cli && npm pack)
npm i -g ../krafter-app/packages/template-cli/getkrafter-template-cli-0.1.0.tgz
```

CI resolves the CLI from the `KRAFTER_CLI_SPEC` repository variable when it is
set, and from `@getkrafter/template-cli@^0.1` otherwise — so a tarball URL in
that variable keeps the gate green during the pre-publish window. W6 removes
the variable and the gate runs the published version.

## `catalog.json`

```json
{
  "$schema": "./schema/catalog.schema.json",
  "generatedAt": "2026-10-15T01:15:50Z",
  "templates": [
    {
      "id": "hunza",
      "name": "Hunza",
      "description": "Single-column flow layout with rules under the section headings.",
      "author": { "name": "Krafter", "url": "https://getkrafter.dev" },
      "license": "MIT",
      "official": true,
      "layout": "flow",
      "source": "gh:getkrafter/templates/templates/hunza",
      "commit": "0f1c2d3e4f5a60718293a4b5c6d7e8f90a1b2c3d",
      "version": "1.0.0",
      "previewUrl": "https://cdn.jsdelivr.net/gh/getkrafter/templates@0f1c2d3e4f5a60718293a4b5c6d7e8f90a1b2c3d/templates/hunza/preview.png"
    }
  ]
}
```

| field | where it comes from |
|---|---|
| `id` | the manifest — and it must equal the folder name |
| `name`, `description`, `license`, `version` | the manifest (`description` defaults to `""`) |
| `author` | the manifest's author block, unchanged |
| `official` | whether the id is listed in `official.json` |
| `layout` | the manifest's `layout.mode` — `"flow"` or `"grid"` |
| `source` | `gh:getkrafter/templates/templates/<id>` (D3) |
| `commit` | `git log -1 --format=%H -- templates/<id>` — written by CI on merge |
| `previewUrl` | the jsDelivr URL of `preview.png` **at that commit**; absent if there is none |

`source` is derivable from the id, and the app does derive it — it is stored
anyway so that the app's catalog parser reads one shape whether the catalog
came from here or from `krafter-template dev --catalog`, whose entries also
carry `source` (there as an `http://127.0.0.1:…` base URL, with `commit:
"dev"`).

`commit` is what makes a template immutable. A resume pins the commit it was
built against, so a template update never reflows somebody's existing document;
app-level rendering improvements still reach everyone, because those live in the
engine rather than in the package (fact-35).

### The app side

The app reads `NEXT_PUBLIC_CATALOG_URL`, which defaults to
`https://cdn.jsdelivr.net/gh/getkrafter/templates@main/catalog.json` (D10).
Point it at `http://127.0.0.1:4321/catalog.json` to develop against a package on
your own disk.

### Regenerating it

```sh
npm run catalog         # rewrite catalog.json
npm run catalog:check   # verify it without touching it (what the PR gate runs)
```

`generatedAt` only moves when the entries do, so a no-op run leaves the file
byte-identical. The script has no dependencies; it structurally checks what it
writes and refuses to write an invalid catalog, and the catalog job validates
the result against `schema/catalog.schema.json` with `ajv-cli` as well.

## CI

| workflow | trigger | permissions | what it does |
|---|---|---|---|
| `.github/workflows/check.yml` | `pull_request` → `main` | `contents: read` | diffs against the base branch, runs `krafter-template check templates/<id>` for every changed package, then `update-catalog.mjs --check` |
| `.github/workflows/catalog.yml` | `push` → `main` (`templates/**`, `official.json`, the script, the schema) | `contents: write` | runs `update-catalog.mjs`, validates with `ajv-cli`, and commits `chore(catalog): update commits [skip ci]` if anything changed |

Only the merge job can write. The PR gate deliberately cannot: a pull request
never has to update `commit` or `previewUrl`, and CI computes both after the
merge commit exists.

The gate sets `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`: `check` only *reads*
`preview.png`, so the CLI's bundled Chromium is never launched there.
Generating a preview is the author's job, locally.

`--check` fails a PR when an entry already in `catalog.json` disagrees with its
manifest (name, description, author, licence, layout, version, official). A
template that is not in the catalog yet is fine — the merge job adds it.

`CODEOWNERS` routes review: the core team owns the catalog machinery, and a
`/templates/<id>/ @author` line sends updates of a template to the person who
wrote it.

## Schemas

`schema/catalog.schema.json` is this repo's own: it describes `catalog.json`.

`schema/template.schema.json` is a **copy** of the manifest schema published
with `@getkrafter/template-engine`, kept here so a `template.json` can point
`$schema` at a stable URL in this repository:

```json
"$schema": "https://raw.githubusercontent.com/getkrafter/templates/main/schema/template.schema.json"
```

A relative `"../../schema/template.schema.json"` works too, and is what editors
resolve fastest when you are working in a clone.

The copy is refreshed from the package rather than edited by hand:

```sh
npm pack @getkrafter/template-engine   # the tarball ships schema/
#   … copy package/schema/template.schema.json over schema/template.schema.json
```

W6 wires that refresh into CI. The engine is the source of truth; a diff here
means the copy is stale, never that the schema changed.

Neither schema carries JSON Schema `format` keywords — every constrained string
has an explicit `pattern` instead — so `npx ajv-cli validate` needs no
`ajv-formats` plugin.

## Contract version

Every manifest declares `"contract": "1"`. That is the version of the template
contract (the data a template receives, the tokens and `tk-*` classes it may
style, the helpers and partials it may call) — not of the engine and not of the
template. The engine renders every package whose `contract` it understands; a
breaking change to the contract would be `"2"`, shipped alongside `"1"` for as
long as packages declare it. A template's own `version` is independent and only
tells a reader that the package changed.

## Licence

The repository and everything the core team ships in it are MIT (see `LICENSE`).
A community template declares its own licence in `template.json` and ships its
own `LICENSE` file — `check` fails without one.
