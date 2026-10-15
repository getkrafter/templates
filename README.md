# Krafter templates

The template catalog for [Krafter](https://krafter.vercel.app), a resume
builder. Every template is a small package — a manifest, a Handlebars file, a
stylesheet, optional partials and a preview image — and this repository holds
all of them, official and community alike, plus the `catalog.json` the app
reads to list them.

```
templates/<id>/        one template: template.json, template.hbs, template.css,
                       partials/*.hbs, preview.png, LICENSE
catalog.json           the list the app fetches
docs/                  authoring-guide.md, contract.md, maintaining.md
```

## Built on JSON Resume

A Krafter resume is a [JSON Resume](https://jsonresume.org/schema/) v1.0.0
document. That is the open standard the whole ecosystem of resume tools reads
and writes, so your data is portable: import it from anywhere that speaks JSON
Resume, export it anywhere, and never lose it to a proprietary format. A
template receives the full document as `resume` alongside Krafter's processed
`sections` and header fields — which is also why an existing
`jsonresume-theme` is a short port rather than a rewrite.

## Using a template

In the Krafter editor open **Template** in the render-settings drawer. The
catalog tab lists everything in this repository; pick one and your resume is
pinned to that exact version of it. You can also import a template straight
from a GitHub repository or gist URL into your personal library.

Pinning means a template update never reflows a resume you already built —
you choose when to take an update. Improvements to the rendering engine itself
(pagination, exports, fonts) reach everyone regardless.

## Writing a template

```sh
npx @getkrafter/template-cli init templates/<id>     # a package that already validates
npx @getkrafter/template-cli dev templates/<id>      # live preview while you edit
npx @getkrafter/template-cli preview templates/<id>  # writes preview.png
npx @getkrafter/template-cli check templates/<id>    # exactly what CI runs
```

Then open a pull request. `check` is the gate: it runs every validation rule,
renders all eight profile fixtures, and fails on a missing or stale
`preview.png`, a missing licence, or an unused partial. Run it before you push
— a red PR is the same failure, ten minutes later.

- [`docs/authoring-guide.md`](docs/authoring-guide.md) — the workflow and the
  parts you have to get right: the manifest, writing against the data,
  styling with tokens, pagination, publishing.
- [`docs/contract.md`](docs/contract.md) — the reference: `TemplateData`,
  the token vocabulary, the `tk-*` classes, helpers and partials, manifest
  fields, validation rules.

Official and community templates sit side by side under `templates/`; nothing
about the folder differs. A template is *official* only because its id is
listed in `official.json`, which the core team maintains.

## Contract version

Every manifest declares `"contract": "1"` — the version of the template
contract (the data a template receives, the tokens and `tk-*` classes it may
style, the helpers and partials it may call), not of the engine and not of the
template. The engine renders every package whose `contract` it understands; a
breaking change to the contract would be `"2"`, shipped alongside `"1"` for as
long as packages declare it. A template's own `version` is independent and only
tells a reader that the package changed.

## Maintainers

How `catalog.json` is produced, what CI does, and how the schema copies are
kept in step: [`docs/maintaining.md`](docs/maintaining.md).

## Licence

The repository and everything the core team ships in it are MIT (see
`LICENSE`). A community template declares its own licence in `template.json`
and ships its own `LICENSE` file; `check` fails without one.
