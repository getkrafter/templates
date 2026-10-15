# Authoring a Krafter template

How to build a template package, from `init` to a merged pull request.

> **Skeleton.** The sections below are the agreed outline; the prose arrives in
> W6 (step 20), written against the shipped CLI. What is already here —
> the pagination contract, the publishing rules — is normative.

## Getting started

_Filled in W6 (Step 20)._ Install the CLI, `init` a package, run `dev`, and
look at it. The short version lives in the repository
[`README.md`](../README.md#adding-a-template).

## Package anatomy

A package is five things (fact-1):

| file | required | what it is |
|---|---|---|
| `template.json` | yes | the manifest |
| `template.hbs` | yes | the markup |
| `template.css` | yes | the stylesheet, scoped to `.resume` |
| `partials/*.hbs` | no | partials the markup includes |
| `preview.png` | to publish | the catalog thumbnail, written by `krafter-template preview` |
| `LICENSE` | to publish | a licence file matching `license` in the manifest |

_Filled in W6 (Step 20)._

## The manifest

`template.json` validates against
[`../schema/template.schema.json`](../schema/template.schema.json). Required:
`id`, `name`, `version`, `contract`, `author`, `license`, `layout`.

- **`layout`** — `{ "mode": "flow" }`, or `{ "mode": "grid", "regions": […],
  "widths": […], "gap": <n> }` with an optional `defaultPlacement`.
- **`settings.defaults`** — the template's own starting point for the app's
  settings tree (typography, colour, density …). Every path must be a real
  settings leaf; `defaults-paths` fails on a typo.
- **`settings.locked`** — setting paths the user may not change, because the
  design depends on them.
- **`settings.controls`** — template-specific controls (`toggle`, `slider`,
  `select`, `color`) that the app and `dev` render from the manifest. A control
  nothing in the markup reads is a `control-unused` error.

_Filled in W6 (Step 20)._

## Writing the template

_Filled in W6 (Step 20)._ The data a template receives, `sections` versus
`regions` (flow versus grid), and reaching into `resume.*` directly. See
[`contract.md`](contract.md) for the field-by-field reference.

## Styling

_Filled in W6 (Step 20)._ Every selector is scoped under `.resume`
(`css-scope`), no external URLs or `@font-face` (`css-external-url`,
`css-font-face`), style the tokens and the `tk-*` classes rather than
re-inventing them.

## The pagination contract

This is the one part of the contract a template can silently break, so it is
spelled out (fact-19):

- In **flow** mode only the **direct children** of the template root are break
  candidates.
- A wrapper element is therefore **atomic**: its contents never split across
  pages — the whole wrapper moves to the next page instead.
- A direct child carrying `data-break="allow"` opts out: it is replaced in the
  candidate list by its own direct children, so a break may fall between them.
  Descent is **exactly one level** — a nested wrapper inside an allowed wrapper
  is itself atomic, whether or not it also carries the attribute.
- In **grid** mode there is nothing to flow: the sheet paginates by
  page-height windows, and columns are *not* broken independently of each
  other.

Practically: wrap each entry you never want split (a job, a project) in one
element, and put `data-break="allow"` on the list that holds them.

## Previews and `check`

`krafter-template preview` screenshots the first A4 page at 2× — that PNG is
what the catalog shows. `krafter-template check` is the publish gate and the
exact command CI runs: every validation rule, all eight profile fixtures, plus
`preview-missing`, `preview-stale`, `license-missing` and `partial-unused`.

A `preview.png` older than `template.hbs`, `template.css` or any partial is
`preview-stale` — regenerate it in the same commit as the change.

_Filled in W6 (Step 20)._

## Publishing

- Adding or updating a template is a **pull request** against `main`
  (fact-24). CI runs `check` on every package the PR touches and fails on any
  error or a missing/stale `preview.png`.
- `CODEOWNERS` carries one `/templates/<id>/ @you` line per template, so
  updates to yours come to you for review. Add it in the same PR.
- `catalog.json`'s `commit` field is written by CI after the merge. Do not
  hand-edit it.
- **Pinning.** A resume records the commit of the template it was built
  against, so your next change never reflows a document somebody already
  finished. Rendering improvements that *do* reach every existing resume live
  in the engine, not in your package (fact-35) — which is also why a fix
  belongs upstream whenever it is not specific to your design.

_Filled in W6 (Step 20)._
