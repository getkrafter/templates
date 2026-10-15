# Maintaining the catalog

For the core team. Authors do not need any of this — the
[authoring guide](authoring-guide.md) is theirs; this page is how the
repository behind it works.

## `catalog.json`

The app fetches `catalog.json` from
`https://raw.githubusercontent.com/getkrafter/templates/main/catalog.json`
(the `NEXT_PUBLIC_CATALOG_URL` default). GitHub raw serves branch URLs with
`max-age=300`, so a merged change is visible to the app within five minutes;
package files are fetched from the same host at the pinned commit, with
jsDelivr as a fallback only. One entry per package:

```json
{
  "$schema": "./schema/catalog.schema.json",
  "generatedAt": "2026-10-15T01:15:50Z",
  "templates": [
    {
      "id": "hunza",
      "name": "Hunza",
      "description": "Single-column flow layout with rules under the section headings.",
      "author": { "name": "Krafter", "url": "https://krafter.vercel.app" },
      "license": "MIT",
      "official": true,
      "layout": "flow",
      "source": "gh:getkrafter/templates/templates/hunza",
      "commit": "0f1c2d3e4f5a60718293a4b5c6d7e8f90a1b2c3d",
      "version": "1.0.0",
      "previewUrl": "https://raw.githubusercontent.com/getkrafter/templates/0f1c2d3e4f5a60718293a4b5c6d7e8f90a1b2c3d/templates/hunza/preview.png"
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
| `source` | `gh:getkrafter/templates/templates/<id>` |
| `commit` | `git log -1 --format=%H -- templates/<id>` — written by CI on merge |
| `previewUrl` | the GitHub raw URL of `preview.png` **at that commit**; absent if there is none |

`source` is derivable from the id, and the app does derive it — it is stored
anyway so that the app's catalog parser reads one shape whether the catalog
came from here or from `krafter-template dev --catalog`, whose entries also
carry `source` (there as an `http://127.0.0.1:…` base URL, with
`commit: "dev"`).

`commit` is what makes a template immutable. A resume pins the commit it was
built against, so a template update never reflows somebody's existing
document; app-level rendering improvements still reach everyone, because those
live in the engine rather than in the package.

**Rewriting history changes every `commit`.** After a rebase or a re-sign of
`main`, run the recompute below and push it, or the catalog points at commits
that no longer exist.

### Regenerating it

```sh
npm run catalog         # rewrite catalog.json
npm run catalog:check   # verify it without touching it (what the PR gate runs)
```

`generatedAt` only moves when the entries do, so a no-op run leaves the file
byte-identical. The script has no dependencies; it structurally checks what it
writes and refuses to write an invalid catalog, and the catalog job validates
the result against `schema/catalog.schema.json` with `ajv-cli` as well.

## `official.json`

The ids the core team maintains. It is the only thing that distinguishes an
official template from a community one; CI reads it to set `official` on the
catalog entry. Authors must not add their id to it in a PR — `CODEOWNERS`
routes changes to it to the core team.

## CI

| workflow | trigger | permissions | what it does |
|---|---|---|---|
| `.github/workflows/check.yml` | `pull_request` → `main` | `contents: read` | diffs against the base branch, runs `krafter-template check templates/<id>` for every changed package, then `update-catalog.mjs --check` |
| `.github/workflows/catalog.yml` | `push` → `main` (`templates/**`, `official.json`, the script, the schema) | `contents: write` | runs `update-catalog.mjs`, validates with `ajv-cli`, and commits `chore(catalog): update commits [skip ci]` if anything changed |

Only the merge job can write. The PR gate deliberately cannot: a pull request
never has to update `commit` or `previewUrl`, and CI computes both after the
merge commit exists.

The gate installs the CLI from the `KRAFTER_CLI_SPEC` repository variable (a
tarball URL or, once published, an npm spec) and **is skipped while that
variable is unset** — which is the current state: the CLI is internal, the
team runs `krafter-template check` locally before each merge, and the merge
job (`catalog.yml`, plain Node) still recomputes `catalog.json`. Setting the
variable turns the gate on without a workflow change.

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

`schema/catalog.schema.json` is this repository's own: it describes
`catalog.json`.

`schema/template.schema.json` is a **copy** of the manifest schema published
with `@getkrafter/template-engine`. Its canonical URL — the schema's `$id`, and
what `krafter-template init` writes into a new manifest's `$schema` — is

```
https://raw.githubusercontent.com/getkrafter/templates/main/schema/template.schema.json
```

so the copy here *is* the published location. Refresh it from the package
rather than editing it by hand:

```sh
npm pack @getkrafter/template-engine        # the tarball ships schema/
tar -xzOf getkrafter-template-engine-*.tgz package/schema/template.schema.json > schema/template.schema.json
```

The engine is the source of truth; a diff here means the copy is stale, never
that the schema changed.

Neither schema carries JSON Schema `format` keywords — every constrained string
has an explicit `pattern` instead — so `npx ajv-cli validate` needs no
`ajv-formats` plugin.

## Trialling an unreleased CLI

`npm pack` the CLI build you want to try, host the tarball somewhere CI can
fetch it, and set the `KRAFTER_CLI_SPEC` repository variable to its URL; the
gate installs that instead of the npm release. Unset it afterwards.

## Pixel regression

When a change to the engine or to a template's CSS is meant to be invisible,
prove it: `krafter-template render-set templates/<id>… --out <dir>` renders
every package against the reference profiles at the catalog's preview
geometry, and `krafter-template diff <before> <after>` reports changed pixels
per image, failing on any. Render the set before the change, keep it, render
again after, and expect every image identical.
