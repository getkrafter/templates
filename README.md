# Krafter templates

The template catalog for [Krafter](https://krafter.vercel.app), a resume
builder. Every template is a small package — a manifest, a Handlebars file, a
stylesheet, optional partials and a preview image — and this repository holds
all of them, plus the `catalog.json` the app reads to list them.

```
templates/<id>/        one template: template.json, template.hbs, template.css,
                       partials/*.hbs, preview.png, LICENSE
catalog.json           the list the app fetches
docs/                  authoring-guide.md, contract.md, maintaining.md
```

## Built on JSON Resume

A Krafter resume is a [JSON Resume](https://jsonresume.org/) v1.0.0 document
([schema](https://jsonresume.org/schema/)). That is the open standard a whole
ecosystem of resume tools reads and writes, so your data is portable: import it
from anywhere that speaks JSON Resume, export it anywhere, and never lose it to
a proprietary format. A
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

Templates are authored with `krafter-template`, a CLI that scaffolds a package,
serves a live preview while you edit, renders the preview image and runs the
same validation the app runs. **The CLI is not published yet** — while the
catalog takes shape the Krafter team authors every template here, and
community submissions open once the tooling is on npm. Until then:

- [`docs/authoring-guide.md`](docs/authoring-guide.md) — the workflow and the
  parts you have to get right: the manifest, writing against the data,
  styling with tokens, pagination, publishing.
- [`docs/contract.md`](docs/contract.md) — the reference: `TemplateData`,
  the token vocabulary, the `tk-*` classes, helpers and partials, manifest
  fields, validation rules.

Reading them now is the best preparation for the day submissions open; the
contract is what a template is written against, and it is versioned
(`contract: "1"`) so what you learn stays true.

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
