# Authoring a Krafter template

How to build a template package, from `init` to a merged pull request.

A Krafter resume is a [JSON Resume](https://jsonresume.org/schema/) v1.0.0
document, and a template gets the whole of it as `resume` — the same shape every
`jsonresume-theme` reads — next to the processed `sections`, `regions` and
header fields Krafter adds. You can render from either; the data stays the
user's, in an open format, whichever you choose.

Everything here is normative for `contract: "1"`. The field-by-field reference
— `TemplateData`, the token vocabulary, the `tk-*` classes, the helpers and the
validation rules — lives in [`contract.md`](contract.md); this document is the
workflow and the parts you have to get right.

---

## Getting started

```sh
npx @getkrafter/template-cli init templates/<id>   # a package that already validates
npx @getkrafter/template-cli dev templates/<id>    # live preview while you edit
npx @getkrafter/template-cli preview templates/<id>  # writes preview.png
npx @getkrafter/template-cli check templates/<id>  # exactly what CI runs
```

Then open a pull request against `main`.

**`init`** writes into an empty or new directory only, and what it writes
passes `validate` immediately: a manifest with `$schema`, markup, a scoped
stylesheet, a `partials/` directory, a `README.md` and an MIT `LICENSE`. The
directory's basename becomes the template id unless you pass `--id`; `--name`
sets the display name, and `--grid` starts from the two-region grid skeleton
instead of single-column flow.

**`dev`** serves a live preview on `http://127.0.0.1:4321` (change it with
`--port`): a fixture switcher, a settings panel that renders *your* manifest's
controls, the validator's diagnostics, and page boundaries drawn over the
sheet. It reloads the browser over server-sent events on every save, and binds
`127.0.0.1` only. `dev --catalog` additionally serves a one-entry
`catalog.json`, so you can point the app itself at the package on your disk:

```sh
npx @getkrafter/template-cli dev templates/<id> --catalog
#   NEXT_PUBLIC_CATALOG_URL=http://127.0.0.1:4321/catalog.json
```

**`preview`** screenshots the first A4 page at 2× into `preview.png` — that PNG
is the catalog thumbnail. It needs Chromium, which the CLI brings with it.

**`check`** is the publish gate and the exact command CI runs. Run it before
you push; a red PR is the same failure ten minutes later.

**The pull request.** Add a `CODEOWNERS` line for your template in the same PR:

```
/templates/<id>/   @your-github-handle
```

That is what sends later changes to *your* template to you for review.

`official.json` lists the ids the core team maintains, and is the **only**
thing that marks a template official — the folder itself is identical either
way. It is maintainers-only: do not add your id to it in your PR. CI reads it
to set `official` on your catalog entry.

---

## Package anatomy

A package is five things (and nothing else):

| file | required | what it is |
|---|---|---|
| `template.json` | yes | the manifest |
| `template.hbs` | yes | the markup |
| `template.css` | yes | the stylesheet, scoped to your id |
| `partials/*.hbs` | no | partials the markup includes |
| `preview.png` | to publish | the catalog thumbnail, written by `krafter-template preview` |
| `LICENSE` | to publish | a licence file matching `license` in the manifest |

`README.md` is allowed too. Anything else is a `files-unexpected` warning: a
package ships **no assets** — no fonts, no images, no JavaScript — because it
has to render offline and inside somebody else's page.

A partial's filename is its name, so it must be a lowercase slug ending in
`.hbs` (`partials/tag-list.hbs`). A `partials/` entry that is not — uppercase,
underscores, a nested directory — can never be registered, and is a
`partial-name` **error** rather than a silent drop.

---

## The manifest

`template.json` validates against
[`../schema/template.schema.json`](../schema/template.schema.json), which is
generated from the engine's own Zod schemas — so the autocomplete your editor
gives you and the rules `validate` enforces are the same rules by
construction. Point `$schema` at it:

```json
{
  "$schema": "https://raw.githubusercontent.com/getkrafter/templates/main/schema/template.schema.json",
  "id": "ridge-serif",
  "name": "Ridge Serif",
  "version": "0.1.0",
  "contract": "1",
  "description": "Single-column flow layout with hairline section rules.",
  "author": { "name": "Your Name", "url": "https://example.com" },
  "license": "MIT",
  "layout": { "mode": "flow" },
  "settings": { "defaults": {}, "locked": [], "controls": [] }
}
```

Required: `id`, `name`, `version`, `contract`, `author`, `license`, `layout`.
Optional: `$schema`, `description`, `settings`. Unknown keys are **rejected**,
not ignored — a typo at the top level fails `manifest` rather than being
quietly dropped.

### `id` is your CSS scope

`id` is a lowercase slug of 2–64 characters starting with a letter
(`^[a-z][a-z0-9-]{1,63}$`). It is three things at once:

- the folder name under `templates/` (CI checks they match),
- the `data-template` attribute value every rule in `template.css` must scope
  under — `.resume[data-template="ridge-serif"]`,
- the namespace your own partials are reached through — `{{> ridge-serif/tags}}`.

Changing it later is a rename of all three. Choose it once.

### `contract: "1"`

The version of *the contract*: the data a template receives, the tokens and
`tk-*` classes it may style, the helpers and partials it may call. Not the
engine's version and not your template's. The engine renders every package
whose contract it understands and refuses, with one clear message, a package
declaring one it does not. Your own `version` is independent (see
[Publishing](#publishing-and-versions)).

### `layout`

Two modes.

**Flow** — one column, the page is a vertical sequence:

```json
"layout": { "mode": "flow" }
```

**Grid** — regions laid out as columns:

```json
"layout": {
  "mode": "grid",
  "regions": ["aside", "main"],
  "widths": [35, 65],
  "gap": 24,
  "defaultPlacement": { "tags": "aside", "languages": "aside" }
}
```

| key | rule |
|---|---|
| `regions` | at least one of `header`, `main`, `aside`, `footer`; no duplicates |
| `widths` | one entry per **column**, each `> 0` and `<= 100`, summing to 100 (±0.01) |
| `gap` | the column gutter in **px**, `>= 0` |
| `defaultPlacement` | optional; section **category** → region |

`widths` is deliberately not tied to `regions.length`: `header` and `footer`
span the full width, so a two-column grid with a header declares three regions
and two widths.

`defaultPlacement` is keyed by category, not by section type — there are five:
`history` (work, education, volunteer, awards, certificates, publications,
projects), `tags` (skills, interests), `languages`, `references` and `custom`.
A category you do not place lands in `main`. So does a section whose stored
placement names a region you do not declare, which is what lets a resume
survive the user switching from a three-region template to yours.

The geometry you declare here is the *only* channel for it: a
`settings.defaults.layout` is ignored rather than silently competing with
`layout`. The user can still drag your columns (and a resume can override the
placement of an individual section) unless you lock the geometry — see
`locked` below.

### `settings.defaults`

Your template's starting point for the app's settings tree. Every path must
address a real settings leaf; a typo is a `defaults-paths` **error**, reported
at the line in `template.json` where you wrote it, because Zod would otherwise
drop `typography.sectionHeadng` and your template would silently not get the
style it asked for.

```json
"settings": {
  "defaults": {
    "typography": { "sectionHeading": { "textTransform": "uppercase" } },
    "color": { "accent": "#1f2937" },
    "spacing": { "section": { "gap": 14 } },
    "renderDefaults": { "tagStyle": "chips", "showSummaryHeading": false }
  }
}
```

Two kinds of key live here:

- **core settings** — `typography.*`, `spacing.*`, `color.*`, `header.*`.
  These are the middle tier of the cascade: the user's own value wins, yours
  applies when they have not set one, and the app's default is the floor.
- **`renderDefaults.*`** — the per-document render choices (`showDates`,
  `showDescription`, `linkDisplay`, `dateFormat`, `itemHeadingFormat`,
  `datePosition`, `dateRangeSeparator`, `presentLabel`, `showSummaryHeading`,
  `tagStyle`). Same three tiers, with a per-section config above them.

`template` and `templateOptions` are **not** settable here. A template
pointing at a template is nonsense, and your controls already declare their own
defaults.

### `settings.locked`

Dotted settings paths the user may not override, because your design depends on
them:

```json
"locked": ["typography.sectionHeading.textTransform", "layout.widths"]
```

An unknown path is a `locked-paths` error. What the user sees: the matching
control in the render-settings drawer is **disabled and marked "Set by this
template"** — it is not hidden, so it is obvious the template made the choice
rather than the app losing a feature. Their stored value is nulled out of the
user tier for the duration, so your default wins; switching to a template that
does not lock the path brings their own value back.

Lock the two or three things that *are* the design. Locking a dozen settings
reads, correctly, as a template that does not want to be used.

### `settings.controls`

Your own vocabulary — up to a handful of knobs that mean something in *your*
design and nothing anywhere else. Four types:

```json
"controls": [
  { "type": "toggle", "key": "show-rules", "label": "Section rules", "default": true },
  { "type": "slider", "key": "rule-weight", "label": "Rule weight",
    "min": 0.5, "max": 3, "step": 0.5, "unit": "px", "default": 1 },
  { "type": "select", "key": "aside-tone", "label": "Sidebar tone",
    "options": [ { "value": "light", "label": "Light" },
                 { "value": "dark",  "label": "Dark" } ],
    "default": "light" },
  { "type": "color", "key": "aside-bg", "label": "Sidebar background", "default": "#f3f4f6" }
]
```

| type | extra keys | `default` must be |
|---|---|---|
| `toggle` | — | a boolean |
| `slider` | `min`, `max`, optional `step` (`> 0`), optional `unit` | a number inside `min`–`max` (`min < max`) |
| `select` | `options[]` of `{ value, label }`, at least one | one of the option values |
| `color` | — | a 6-digit hex string (`#1f2937`) |

A `key` is a lowercase slug (`^[a-z][a-z0-9-]*$`) and must be unique in the
package, because it becomes two public names:

**`--tpl-<key>`**, a CSS custom property on the rendered root:

```css
.resume[data-template="ridge-serif"] .tk-section-heading {
  /* `--tpl-rule-weight` already carries its `px` unit (the slider's `unit`),
     so the toggle multiplies a length — no extra `* 1px`. */
  border-bottom-width: calc(var(--tpl-show-rules, 1) * var(--tpl-rule-weight, 1px));
}
```

A toggle emits `1` / `0` — a number, so it works as a `calc()` multiplier. A
slider emits its value with `unit` appended, clamped to the range. A select
emits its value; a colour emits the hex. In every case a stored value that does
not satisfy what you declared falls back to your `default`, because these
strings land in a `style` attribute.

**`options.<key>`** in Handlebars. Control keys are kebab-case, which is not a
legal Handlebars path segment, so read them one of two ways:

```hbs
{{lookup options "aside-tone"}}
{{options.[aside-tone]}}

{{#if (eq (lookup options "aside-tone") "dark")}}…{{/if}}
```

`lookup` composes into subexpressions; the bracket form reads better
standalone. Both resolve the same value, and `options` always has one entry per
declared control — your `default` until the user changes it.

A control nothing reads is a `control-unused` warning: the check is literally
"does `template.css` contain `--tpl-<key>`, or does any `.hbs` contain
`options.<key>` / `options.[<key>]`". Delete it or use it.

Keep the list short. Most users pick a template and move on; the controls are
the few decisions that are genuinely yours to offer, not a second settings
panel.

---

## Writing the template

`template.hbs` is compiled with Handlebars and handed one context object,
`TemplateData`. It is deliberately thin: the engine has already resolved
headings, durations, subtitle parts and description blocks, so the markup only
decides layout and semantics. See [`contract.md`](contract.md#templatedata) for
every field.

The shape, in brief:

| field | what it is |
|---|---|
| `fullName`, `firstName`, `lastName`, `jobTitle` | header strings (`null` when absent or hidden) |
| `contactItems[]` | `{ value, type }` — phone, email, location |
| `links[]` | `{ href, title }` from the profiles |
| `summary` | rich-text HTML, or `null` |
| `sections[]` | every **visible** section, in document order |
| `regions` | the same sections grouped by region |
| `options` | your controls' resolved values |
| `resume` | the whole document as JSON Resume v1.0.0 |
| `showIcons`, `showSummaryHeading`, `tagStyle` | resolved render flags |

### `sections` versus `regions.<name>.sections`

`sections` is the canonical flat list, in document order. `regions` is a
*grouping of it*, not a replacement: all four keys (`header`, `main`, `aside`,
`footer`) are always present, and an empty region is `{ "sections": [] }`
rather than a missing key — so `{{#each regions.aside.sections}}` is safe
whatever the resume happens to contain.

A **flow** template iterates `sections`. A **grid** template iterates the
regions it declared:

```hbs
<div class="tk-two-col">
  <div class="tk-sidebar">{{#each regions.aside.sections}}…{{/each}}</div>
  <div class="tk-main">{{#each regions.main.sections}}…{{/each}}</div>
</div>
```

The engine decides placement; a template never computes where a section
belongs. Each `ProcessedSection` also carries its own `region`, so
`{{#each (where sections region="aside")}}` is equivalent if you prefer the
flat list.

Dispatch on what a section *has*, not on its type — `historyItems`,
`tagItems`, `languageItems`, `referenceItems` are mutually exclusive, and a
section whose items all turned out hidden is dropped from the list entirely, so
there are no empty headings to guard against.

### `resume.*` — and the one trap in it

`resume` is the whole resume as a JSON Resume v1.0.0 document
(`resume.basics.name`, `resume.work`, `resume.skills[].keywords`, …). It exists
for the field the flat contract does not expose, and it is the field that makes
porting a `jsonresume-theme` straightforward: the data is in exactly the shape
those themes already read.

**`resume` is the document, not the render.** It is built from the *unfiltered*
input: hidden sections and hidden items are present in it even though they are
absent from `sections` and `regions`. A template iterating `resume.work` is
opting out of the engine's visibility handling — the user hides a job and it
reappears. It also skips the resolved headings, durations and description
blocks, so you rebuild the date formatting, the heading format and the
highlights list yourself, and the user's settings for those stop working.

So: place content from `sections` / `regions`, reach into `resume.*` for the
extra field. A template that reads `resume.*` and never mentions `sections` or
`regions` is a `resume-without-sections` warning, because the user's content
would not appear at all.

### Helpers

A package ships no JavaScript, so everything it computes it computes with the
standard library (full signatures in
[`contract.md`](contract.md#helpers)):

```hbs
{{join subtitleParts ", "}}                  {{! string array }}
{{join languageItems "display" ", "}}        {{! object array, by key }}
{{#each (where sections category="tags")}}   {{! filter by property }}
{{formatDate date "MMM yyyy"}}               {{! "" when unparseable }}
{{truncate summary 140 "…"}}                 {{! code-point safe }}
{{initials fullName}}                        {{! up to three letters }}
{{default jobTitle "—"}}                     {{! null / undefined / "" }}
{{icon "mail"}}  {{contactIcon type}}        {{! inline SVG }}
{{#if (and showLink (eq linkDisplay "icon"))}}…{{/if}}
```

`eq` and `ne` are **strict**: a select stores a string and a slider a number,
so `(eq options.size 3)` matching `"3"` would hide a real bug. `gt` / `lt`
compare numerically when both sides read as finite numbers and
lexicographically otherwise. `and` / `or` are variadic and return a boolean, so
they compose inside `{{#if}}`.

There is no `markdown` helper and nothing that evaluates template-supplied
code. A package is data, not a program.

### Unescaped output

`{{{ }}}` (and `{{& }}`) is allowed on **exactly** the engine's rich-text
fields: `summary`, `descriptionBlocks`, and `{{{this}}}` inside
`{{#each descriptionBlocks}}`. Everything else in `TemplateData` is a plain
string that must stay escaped, and a triple-stache anywhere else is a
`hbs-raw-output` error. `<script>`, `on*=` attributes and `javascript:` URLs
are errors too.

### A template renders a résumé; it talks to no one

Your markup is rendered with the user's whole résumé in scope, as live HTML in
their editor and in the files they export — so the validator refuses anything
that could carry that data off the page or embed a document in it:

- **No embedding, form, media, directive or style elements** — `iframe`,
  `object`, `embed`, `form`, `input`, `button`, `meta`, `base`, `link`,
  `style`, `video`, `audio`, … (`hbs-element`). Icons are inline `<svg>`,
  which is allowed; CSS goes in `template.css`.
- **No network loads.** `src`, `srcset`, `poster`, `action`, `data`,
  `xlink:href` and `href` on anything but `<a>` must be a `data:` URL, a `#`
  fragment, or a single plain field such as `{{basics.image}}` — never a
  literal URL and never a helper call, because a helper can build a URL out of
  résumé fields (`hbs-url-attr`).
- **Links are a field or a constant.** `<a href="{{item.url}}">`,
  `href="mailto:{{basics.email}}"` and a fully static `href` are fine;
  `href="https://x/?e={{basics.email}}"` is an error (`hbs-link-href`).
- **Inline `style` carries no `url(`, `position` or `@import`**
  (`hbs-style-attr`); `style="--tpl-x: {{options.x}}"` is fine.
- **No `position: fixed` or `sticky` in `template.css`** outside
  `@media print` (`css-position`) — they resolve against the viewport and
  would paint over the editor. Use `absolute` inside a `relative` ancestor.

### Partials

Two partials come from the engine and are always available:

```hbs
<div class="tk-contact">{{> contact-row}}</div>
{{> tags}}
```

`contact-row` iterates `contactItems` in the current context and emits one
`<span class="tk-contact-item" data-type="…">` per item, wrapping the value in
`<span class="tk-contact-text">` and prefixing `{{contactIcon type}}` when
`showIcons` is on. Separators between items are drawn by `utils.css`, not by
markup, so the user's `header.separator` applies.

`tags` renders a tag section in the style `tagStyle` selects:

| `tagStyle` | markup |
|---|---|
| `inline` (default) | `<span class="tk-tag-group">` per group, `; ` between |
| `chips` | `<ul class="tk-tags tk-tags-chips"><li class="tk-tag">` |
| `list` | `<ul class="tk-tags tk-tags-list"><li class="tk-tag">` |

It reads `tagItems` from the current context (so you call it inside the
`{{#each}}` over sections) and the style from a `tagStyle=` hash if you pass
one, else `@root.tagStyle`, else `inline`. `inline` is byte-identical to the
markup templates wrote by hand before the partial existed, so adopting it moves
no pixels.

Your own partials live in `partials/<name>.hbs` and are referenced
**namespaced**:

```hbs
{{> ridge-serif/tag-list}}
```

At render time the bare namespace belongs to the engine, and two packages in
one process both claiming `tags` would be a race — so the namespaced form is
the one that resolves. **Never name a partial `tags` or `contact-row`**: you
would be shadowing an engine partial, and `{{> tags}}` would stop meaning what
every other template means by it.

An unreferenced partial is a warning in `validate` and an **error** in
`check` — a published package carries no dead files. An unknown partial name is
always an error.

---

## Styling

### Scope every rule

Every selector in `template.css`, including every rule nested inside an at-rule
block (`@media print { … }`), must start with your scope:

```css
.resume[data-template="ridge-serif"] .tk-section-heading { … }
```

A template is styled inside the app's own page, so an unscoped selector would
restyle somebody else's resume. `css-scope` is an error, reported per selector
in a comma-separated list, with the line and column.

Also errors: `@import` and any external `url()` — a template must render
offline — and `@font-face`, because fonts come from the engine's font pipeline
and a package declaring its own would fetch from the network. `data:` URIs are
allowed; nothing else resolves, since a contract 1 package ships no assets.

### Consume tokens, not literals

The engine compiles the resolved settings into CSS custom properties on the
rendered root. Read them; do not restate their values:

```css
.resume[data-template="ridge-serif"] {
  font-size: var(--size-body);
  line-height: var(--leading, 1.3);
  color: var(--color-body, #000000);
  padding: var(--margin-top, 30px) var(--margin-right, 30px)
           var(--margin-bottom, 30px) var(--margin-left, 30px);
}
```

A literal `12pt` is a setting the user's drawer cannot reach. A fallback in the
`var()` is fine and is how a package renders sensibly even where a token is
absent. The families are `--font/size/weight/tracking/transform/color/style-*`
per element, `--space-*`, `--margin-*`, `--leading`, `--decoration-*`,
`--bullet-*`, the separators, `--color-accent(-1..10)`, `--color-text-1..10`,
`--color-paper`, `--header-align`, `--layout-*` and your own `--tpl-*`. The
complete list is in [`contract.md`](contract.md#token-vocabulary).

### Use the `tk-*` classes

`utils.css` ships ahead of your stylesheet and already wires every `tk-*` class
to the tokens that drive it — `.tk-section-heading` to the section-heading
typography and the decoration box, `.tk-item-date` to the date typography,
`.tk-rich-text` to the body and bullet settings, and so on. Emit those classes
in your markup and you inherit all of it; your rules then override by
specificity, because yours carry the `[data-template]` attribute and
`utils.css`'s do not.

Inventing a parallel class for something `tk-*` already covers is how a
template stops responding to the settings drawer.

### Paper

`--color-paper` paints the page, and `utils.css` already applies it to
`.resume`. Do not set a `background` on the root: you would override the user's
paper, and the same token paints the preview cards and the exported HTML
document, so the three surfaces would stop matching.

`--color-text-1..10` is a text scale derived *from* the paper, so ink picked
from it stays legible on a dark sheet. Prefer it to a hardcoded grey.

### Grid geometry

A grid template's columns come from the manifest, emitted as tokens:

```css
.resume[data-template="ridge-serif"] .tk-two-col { gap: var(--layout-gap, 24px); }
.resume[data-template="ridge-serif"] .tk-sidebar { width: var(--layout-col-1, 35%); }
```

One `--layout-col-<n>` per column, 1-indexed in `widths` order, so
`grid-template-columns: var(--layout-col-1) var(--layout-col-2)` reads
naturally. `--layout-gap` is px. Both are settings leaves and cascade like any
other, which is what lets the user adjust your columns — and what makes
`"locked": ["layout.widths"]` meaningful if they must not.

A flow template has no columns, so nothing is emitted and your own fallback
stands.

### Region backgrounds are yours

The engine paints the paper and nothing else. A tinted sidebar, a coloured
header band, a full-height spine — those are rules in *your* stylesheet, on
*your* elements, usually fed by a `color` control:

```css
.resume[data-template="ridge-serif"] .tk-sidebar {
  background: var(--tpl-aside-bg, #f3f4f6);
}
```

Remember that your fill does not change `--color-text-*`, which is derived from
the paper: text over a dark region needs its own colour, from your own token or
control.

---

## The pagination contract

This is the one part of the contract a template can silently break, so it is
spelled out.

- In **flow** mode only the **direct children** of the template root are break
  candidates.
- A wrapper element is therefore **atomic**: its contents never split across
  pages — the whole wrapper moves to the next page instead.
- A direct child carrying `data-break="allow"` opts out: it is replaced in the
  candidate list by its own direct children, so a break may fall between them.
  Descent is **exactly one level** — a nested wrapper inside an allowed wrapper
  is itself atomic, whether or not it also carries the attribute.
- An allowed wrapper with no children stays in the list as a single candidate,
  so the candidate list always covers every direct child of the root.
- In **grid** mode there is nothing to flow: the sheet paginates by
  page-height windows from the top, and columns are **not** broken
  independently of each other.

Practically: wrap each entry you never want split (a job, a project) in one
element, and put `data-break="allow"` on the list that holds them.

```hbs
<section data-break="allow">
  {{#each historyItems}}
    <article class="entry">…</article>   {{! atomic: never split }}
  {{/each}}
</section>
```

Without the attribute the whole `<section>` is one candidate and a long work
history pushes to page 2 in its entirety. With it, breaks may fall between
`<article>`s but never inside one.

Two consequences worth knowing:

- A flat sibling sequence at the root (what the flow starter emits) can break
  anywhere, which is usually what you want for a single-column résumé.
- A grid template wraps its columns in **one** root-level element, so page
  breaking treats the layout as a unit instead of splitting one column away
  from the other.

Trailing section headings are pulled to the next page automatically: if the
last candidates on a page are `.tk-section-heading` elements with no content
following them, the break moves up. That only works if your heading carries the
class.

The `dev` server draws the measured breaks over the sheet for a flow template,
and plain page-height windows for a grid one, saying which it did.

---

## Previews and `check`

```sh
krafter-template preview templates/<id>   # writes preview.png
krafter-template check templates/<id>     # the publish gate
```

`check` runs every `validate` rule — including a render of all **eight** shared
profile fixtures (`senior-engineer`, `product-designer`, `sales-executive`,
`junior-grad`, `long-overflow`, `no-summary`, `many-tags`, `non-latin`) — and
then promotes or adds the rules that make a package *publishable*:

| rule | in `check` | what it checks |
|---|---|---|
| every `validate` rule | error / warning | the package |
| `partial-unused` | **error** (warning in `validate`) | a partial nothing references |
| `preview-missing` | **error** (warning in `validate`) | `preview.png` is absent |
| `preview-stale` | **error** | `preview.png` older than `template.hbs`, `template.css` or any partial |
| `license-missing` | **error** | no `LICENSE`, or none matching `license` |

So: regenerate `preview.png` **in the same commit** as any change to the markup
or styles, or CI fails on `preview-stale`. `check --no-preview` drops the two
preview rules, which is what you want in a pre-commit hook; `--strict` fails on
warnings too.

CI runs `check` on every package a pull request touches. It never generates a
preview for you — it only reads the PNG — so the thumbnail is always the one
you looked at.

To prove a change moved no pixels, screenshot the set before and after:

```sh
krafter-template render-set templates/<id> --out /tmp/before
#   … edit template.css …
krafter-template render-set templates/<id> --out /tmp/after
krafter-template diff /tmp/before /tmp/after
```

`diff` pairs the directories by filename, prints
`file | changed px | % | verdict`, writes a `diff-<name>.png` for anything that
moved, and exits 1 if any pair is over `--threshold` (default `0`) or any file
is unpaired. It needs no browser.

---

## Publishing and versions

- Adding or updating a template is a **pull request** against `main`. There is
  no other publishing step.
- Bump `version` (semver, `MAJOR.MINOR.PATCH` with an optional pre-release)
  whenever the package changes. It is your own number and is independent of
  `contract`; it tells a reader that the package moved, nothing more.
- `catalog.json`'s `commit` and `previewUrl` are written by CI **after** the
  merge. Do not hand-edit them. The PR gate deliberately cannot write to the
  repository.
- Add your `CODEOWNERS` line in the same PR.
- Licence: declare it in `template.json` and ship a matching `LICENSE` file.
  `check` fails without one.

### Pinning, and what it does not protect

A resume records the `{ id, source, commit }` of the template it was built
against, and rendering always uses that commit — never a moving branch. So your
next change never reflows a document somebody has already finished; they move
to it when they choose to.

**Pinning protects resumes from template changes only; app-level rendering
improvements apply to everyone.**

That is the whole promise, and it cuts both ways. A fix in the engine — the
pagination algorithm, the token compiler, `utils.css`, the standard partials —
reaches every existing resume immediately, because none of that lives in your
package. Which is also why a fix belongs upstream whenever it is not specific
to your design: put it in the package and only future resumes get it.

---

## Troubleshooting

Every diagnostic is one line, and it always names a file you can open:

```
template.css:42: error [css-scope] Selector ".tk-item-title" is not scoped to this
  template; every rule must start with .resume[data-template="ridge-serif"]
template.json:17: error [defaults-paths] Unknown setting path
  "typography.sectionHeadng.textTransform" in settings.defaults — …
partials/tag-list.hbs: warning [partial-unused] Partial "tag-list" is never referenced
```

The format is `file:line: severity [rule] message` — `file: severity [rule]
message` when the fault has no position in a text file. `validate` exits 1 on
any error (and on any warning with `--strict`); warnings alone do not fail a
package. Every command takes `--json` and then prints exactly one JSON object
to stdout; human diagnostics go to stderr, so `render … > resume.html` is
always a clean document.

The same rule ids, with the same text, are what the app shows a user whose
imported template is broken — so a message you fixed here is a message nobody
ever sees there.

| symptom | likely rule | fix |
|---|---|---|
| package will not load at all | `contract`, `manifest` | contract must be `"1"`; unknown manifest keys are rejected |
| a selector is rejected | `css-scope` | prefix it with `.resume[data-template="<id>"]` |
| a font or image will not load | `css-font-face`, `css-external-url`, `hbs-url-attr` | packages ship no assets and render offline |
| output contains a literal `{{…}}` | `render-leftover` | an escaped or malformed expression |
| a fixture fails to render | `render-fixtures` | the Handlebars line is in the message |
| a control does nothing | `control-unused` | use `--tpl-<key>` in CSS or `options.<key>` in markup |
| the user's content is missing | `resume-without-sections` | iterate `sections` / `regions`, not only `resume.*` |
| CI fails after a style change | `preview-stale` | re-run `preview` in the same commit |

If `dev`'s preview returns a 500 with a list of issues, that is deliberate: a
live preview of something the catalog would reject is a preview of a package
nobody can publish. The server keeps answering, so the next save fixes it.

---

## See also

- [`contract.md`](contract.md) — `TemplateData`, tokens, `tk-*` classes,
  helpers, manifest fields, validation rules.
- [`../README.md`](../README.md) — the repository, `catalog.json`, CI, the
  schemas.
- [`../schema/template.schema.json`](../schema/template.schema.json) — the
  manifest schema, for your editor.
