# The template contract (`contract: "1"`)

The reference for what a template package may rely on: the data it is handed,
the tokens and classes it may style, the helpers and partials it may call, the
manifest it declares, and the rules it is validated against.

Every manifest declares `"contract": "1"`. The contract versions *the shape of
this document* — not the engine and not the template. See the repository
[`README.md`](../README.md#contract-version). For the workflow and the
reasoning, read [`authoring-guide.md`](authoring-guide.md); this file is the
lookup table.

---

## `TemplateData`

The root context of `template.hbs`. Every field is always present.

| field | type | notes |
|---|---|---|
| `fullName` | `string` | `basics.name`, trimmed; `""` when unset |
| `firstName` | `string \| null` | first whitespace-separated token |
| `lastName` | `string \| null` | the remainder; `null` for a single-token name |
| `jobTitle` | `string \| null` | `basics.label`; `null` when empty **or hidden** |
| `contactItems` | `ContactItem[]` | phone, email, location — see below |
| `links` | `Link[]` | `{ href, title }` from `basics.profiles` |
| `summary` | `string \| null` | rich-text HTML, or `null` |
| `sections` | `ProcessedSection[]` | every **visible** section, document order |
| `regions` | `TemplateRegions` | the same sections grouped by region |
| `options` | `Record<string, string \| number \| boolean>` | this template's controls |
| `resume` | `JsonResume` | the whole document, JSON Resume v1.0.0 |
| `showIcons` | `boolean` | `meta.settings.header.icons === true` |
| `showSummaryHeading` | `boolean` | render a "Summary" heading above the summary block |
| `tagStyle` | `"inline" \| "list" \| "chips"` | which layout `{{> tags}}` renders |

`summary` is `null` unless it carries HTML markup: plain text is treated as
"the user has not written anything yet", so editor placeholder artefacts never
reach the page. It is one of the two rich-text fields, so render it with
`{{{summary}}}`.

`showSummaryHeading` and `tagStyle` are resolved through three tiers — the
user's `renderDefaults`, then the template's `settings.defaults.renderDefaults`,
then the app default (`true` and `inline`).

### `ContactItem`

```ts
{ value: string; type: "phone" | "email" | "location" }
```

Order is fixed: phone, email, location. `location` is `"City, Country"` with
the country code resolved to a name, and each part is dropped independently if
the user hid it. An item is absent, never empty.

### `Link`

```ts
{ href: string; title: string }
```

One per visible profile with a URL. `title` is the profile's `network`, or the
URL with the scheme, `www.` and trailing slashes stripped. Hiding the Profiles
section empties the whole array.

### `ProcessedSection`

```ts
{
  id: string;          // the resume section's own stable id
  type: string;        // "work" | "education" | … (see below)
  name: string;        // the section heading the user chose
  category: string;    // "history" | "tags" | "languages" | "references" | "custom"
  region: "header" | "main" | "aside" | "footer";
  historyItems?:   ProcessedHistoryItem[];
  tagItems?:       ProcessedTagItem[];
  languageItems?:  ProcessedLanguageItem[];
  referenceItems?: ProcessedReferenceItem[];
}
```

Exactly one of the four item arrays is present — dispatch on that, not on
`type`. A section whose every item was filtered out as hidden is removed from
the list entirely, so there is no empty-section case to guard.

`id` is stable for the life of the section, which is what lets the user move
*this* section between regions without moving every section of its type.

`type` → `category`:

| `type` | `category` | item array |
|---|---|---|
| `work`, `education`, `volunteer`, `awards`, `certificates`, `publications`, `projects` | `history` | `historyItems` |
| `custom` | `custom` | `historyItems` |
| `skills`, `interests` | `tags` | `tagItems` |
| `languages` | `languages` | `languageItems` |
| `references` | `references` | `referenceItems` |

`custom` has its own category (so `defaultPlacement` can place it separately)
but the same item shape as `history`.

### `ProcessedHistoryItem`

```ts
{
  heading: string;              // headingParts joined with ", "
  headingParts: string[];       // the slots the heading format consumed
  duration: string;             // "" when dates are off or unparseable
  subtitleParts: string[];      // the slots it did not, plus extras
  descriptionBlocks: string[];  // rich-text HTML, one block per concept
  link: string | null;
  showLink: boolean;            // settings allow it AND there is a link
  linkDisplay: "icon" | "header";
  linkDisplayHeader: boolean;   // showLink && linkDisplay === "header"
  linkDisplayIcon: boolean;     // showLink && linkDisplay === "icon"
  hasHeader: boolean;           // heading || duration
  isFirst: boolean;             // index 0 in this section
}
```

Which fields land in `headingParts` depends on the user's
`itemHeadingFormat`; whatever it does not consume falls through to
`subtitleParts`, so render both and the setting works. The three orderable
slots per type:

| type | slot 1 | slot 2 | slot 3 | always in the subtitle |
|---|---|---|---|---|
| `work` | position | name | location | — |
| `education` | institution | area | studyType | score |
| `volunteer` | position | organization | location | — |
| `awards` | title | awarder | — | — |
| `certificates` | name | issuer | — | — |
| `publications` | name | publisher | — | — |
| `projects` | name | entity | type | — |
| `custom` | title | subtitle | tertiary | — |

`duration` is already formatted: the user's `dateFormat`, their
`dateRangeSeparator` glyph, and their `presentLabel` for an in-progress role
(an empty `endDate` with a `startDate`). Single-date types (`awards`,
`certificates`, `publications`) render one date.

`descriptionBlocks` is one self-contained HTML string per concept — the summary
first if present, then the highlights as a `<ul>`. Render with
`{{#each descriptionBlocks}}{{{this}}}{{/each}}`; this is the only place
`{{{this}}}` is permitted.

`linkDisplayHeader` / `linkDisplayIcon` exist so markup never has to combine
three conditions itself.

### `ProcessedTagItem`

```ts
{ name: string; level: string | null; keywords: string[]; display: string }
```

One entry of a **skills** or **interests** section, with the field names of
the JSON Resume `skills[]` / `interests[]` entry it comes from (the raw entry
is still at `resume.skills` / `resume.interests`). Every field is trimmed.

| field | meaning |
|---|---|
| `name` | the group's name; `""` for a group that is just a list of keywords |
| `level` | the group's level; `null` when absent, and always `null` for interests |
| `keywords` | the group's keywords, empty strings removed |
| `display` | a convenience string: `"Name (Level): kw, kw"`, dropping whichever parts are absent |

An entry is kept when it has a name **or** at least one keyword. An entry with
a name and no keywords is a single skill ("Leadership"), not a label.

`display` exists for a template that prints one string per entry. It is
derived from the other three; `{{> tags}}` does not use it, and a template
that styles the parts separately should not either.

### `ProcessedLanguageItem`

```ts
{ name: string; proficiency: string; display: string }
```

`display` is `"Name (Proficiency)"`, or just the name when there is no fluency.

### `ProcessedReferenceItem`

```ts
{
  name: string; reference: string;
  jobTitle: string; company: string; phone: string; email: string;
  details: string;   // [jobTitle, company] joined with ", "
  contact: string;   // [phone, email] joined with ", "
}
```

`details` and `contact` are the pre-joined forms; the individual fields are
there if you want a different arrangement. All are `""` rather than `null` when
absent.

---

## Regions

```ts
type TemplateRegions = Record<"header" | "main" | "aside" | "footer",
                              { sections: ProcessedSection[] }>;
```

All four keys are **always** present. An empty region is `{ sections: [] }`,
not a missing key, so `{{#each regions.aside.sections}}` is safe in any resume.
Order within a region is document order.

Where one section goes, most specific first:

1. the resume's own `settings.layout.placement[section.id]` — the user's choice;
2. the template's `layout.defaultPlacement[category]`;
3. `main`.

A value that is not one of the four standard regions, or names a region this
template does not declare, is **skipped at every tier** rather than rendered
into a column that does not exist. A resume carrying placements for a
three-region template therefore still renders when the user switches to a
two-region one.

A flow template declares no regions, so every section lands in `main` and the
other three stay empty. `ProcessedSection.region` carries the same answer per
section, so `{{#each (where sections region="aside")}}` is equivalent to
iterating `regions.aside.sections`.

---

## Options

```ts
options: Record<string, string | number | boolean>
```

One entry per control the manifest declares, keyed by the control's `key`:
the user's stored value if they set one, the control's `default` otherwise.

Driven by the **manifest**, never by what happens to be stored — so a control
you removed contributes nothing (a stale value cannot leak into a template that
knows nothing about it), and `options` can never disagree with the `--tpl-*`
tokens about which controls exist. Values are read from
`templateOptions[<your id>]`, which is what makes switching template and back
restore a user's choices.

Keys are kebab-case, which is not a legal Handlebars path segment:

```hbs
{{lookup options "aside-tone"}}
{{options.[aside-tone]}}
{{#if (eq (lookup options "aside-tone") "dark")}}…{{/if}}
```

`options` is `{}` for a template with no controls.

Unlike the CSS tokens, the value here is **not** re-validated against the
control's declaration: a token lands in a `style` attribute and has to be
sanitised, whereas `options.<key>` is a value you compare or print through
Handlebars' own escaping. Compare with `eq` (strict), and remember a slider
stores a number while a select stores a string.

---

## `resume`

The whole resume as a **JSON Resume v1.0.0** document, alongside `sections` /
`regions` rather than instead of them.

```
resume.basics            name, label, email, phone, url, summary, location, profiles
resume.work[]            volunteer[]  education[]  awards[]  certificates[]
resume.publications[]    skills[]     languages[]  interests[]  references[]
resume.projects[]
resume.meta              title, version, x-krafter
```

`resume.skills[].keywords`, `resume.basics.location.region`,
`resume.work[].description` — anything the flat contract does not surface is
here, in the shape a `jsonresume-theme` already reads. Krafter's extensions
live under the reserved `x-krafter` key on `meta` and on each item.

**It is the document, not the render.** It is built from the *unfiltered*
input: hidden sections and hidden items are present here even though they are
absent from `sections` and `regions`. A template iterating `resume.work` is
opting out of the engine's visibility handling *and* of its display resolution
(headings, durations, description blocks, the user's format settings).

Place content from `sections` / `regions`; reach into `resume.*` for the extra
field. Reading `resume.*` while never mentioning `sections` or `regions` is a
`resume-without-sections` warning.

---

## Token vocabulary

The engine compiles the resolved settings into CSS custom properties on the
rendered root. A template **reads** them; it never defines them. Each is
emitted only when the setting that feeds it resolves to a value, so always
write a `var()` fallback.

### Typography, per element

Eight elements share one family of seven tokens. `<el>` is one of
`body`, `page-heading`, `page-subheading`, `section-heading`, `item-heading`,
`item-subheading`, `date`, `contact`:

| token | from | value |
|---|---|---|
| `--font-<el>` | `fontFamily` | a full font stack |
| `--size-<el>` | `fontSize` | `pt` |
| `--weight-<el>` | `fontWeight` | `400`–`900` |
| `--tracking-<el>` | `letterSpacing` | `em` |
| `--transform-<el>` | `textTransform` | `uppercase` / `lowercase` / `capitalize` / `none` |
| `--color-<el>` | `color` | hex, resolved from the accent or text scale |
| `--style-<el>` | `fontStyle` | `normal` / `italic` |

Plus, section-heading only: `--variant-section-heading` (`normal` /
`small-caps`).

### Section-heading prefix

| token | value |
|---|---|
| `--section-heading-prefix-style` | a `<counter-style>` keyword (`decimal`, `upper-roman`, …) |
| `--section-heading-prefix-display` | `inline`, or `none` when the prefix is off |

Numbering itself is a CSS counter (`tk-section`) incremented by
`.tk-section-heading`, so it stays continuous across pages.

### Section-heading decoration

Emitted from `typography.sectionHeading.decoration`, and consumed by
`utils.css` on the heading element itself:

```
--decoration-enabled                 1 / 0  (a calc() multiplier)
--decoration-side-top                1 / 0
--decoration-side-right              1 / 0
--decoration-side-bottom             1 / 0
--decoration-side-left               1 / 0
--decoration-border-style            solid | dashed | dotted | double
--decoration-border-width            pt
--decoration-border-color            hex
--decoration-background-color        hex
--decoration-padding-top             pt
--decoration-padding-right           pt
--decoration-padding-bottom          pt
--decoration-padding-left            pt
--decoration-border-radius           pt
```

Each side's border width is the product
`enabled × side × width`, which is how one setting switches four borders
on and off without a cascade of rules.

### Bullets and links

```
--bullet-character      a quoted string ("\2022")
--bullet-font-size      pt
--bullet-indent         pt      (the list's left padding)
--bullet-gap            pt      (the hanging indent of the glyph)
--bullet-color          hex
--style-bullet          normal | italic
--color-link            hex
--style-link            normal | italic
--link-decoration       underline | none
--link-border           a `border-bottom` shorthand, or `none`
```

`--link-decoration` and `--link-border` are one setting
(`typography.link.decoration`) expressed as two tokens, so `underline` and
`border` are both reachable from the same rule.

### Separators

```
--item-heading-separator          the glyph, quoted (content of .tk-item-sep::after)
--item-heading-separator-margin   the padding either side
--separator-content               the header/links separator glyph, quoted
--separator-margin                its padding
```

### Page and rhythm

```
--leading                      unitless line-height
--margin-top/right/bottom/left px   (the page margins)
--space-section-gap            pt
--space-section-after-heading  pt
--space-item-gap               pt
--space-item-after-heading     pt
--space-header-after           pt
--space-header-name-gap        pt
--space-paragraph              pt   (below a paragraph)
--space-list-item              pt   (vertical margin on a list item)
--header-align                 left | center | right
```

### Colour

```
--color-accent          the accent, mid-scale (step 5)
--color-accent-1 … -10  the full accent scale, light → dark
--color-paper           the page background
--color-text-1 … -10    the ink scale derived from the paper
```

`--color-text-*` is built *from* `--color-paper`, so ink picked from it stays
legible on a dark sheet. Prefer it to a hardcoded grey. `utils.css` already
paints `.resume` with `--color-paper`; do not override it.

A colour setting whose value is the literal `currentColor` emits **no** token,
so the template's own ink applies.

### Layout (grid templates)

```
--layout-col-1 … -n     one per column, in `widths` order, as a percentage
--layout-gap            px
```

Emitted from the manifest's `layout` block, not from `settings.defaults`. A
flow template has no columns, so neither is emitted.

### Template controls

```
--tpl-<control key>
```

One per control the manifest declares. Toggle → `1` / `0`; slider → the value
with `unit` appended, clamped to `min`–`max`; select → the chosen value;
colour → the hex. A stored value that does not satisfy the declaration falls
back to the declared `default`. Template-local by construction: nothing emits a
`--tpl-*` for a control this template does not declare.

### Not emitted from settings

`utils.css` declares these on `.resume` for the contact icons, and a template
may override them:

```
--icon-size  --icon-color  --icon-stroke-width  --icon-spacing
```

These are read with a fallback and never emitted — set them yourself if you
use the element they drive:

```
--sidebar-width  --size-link-icon
```

---

## `tk-*` class reference

`utils.css` ships ahead of `template.css` and wires each of these to the tokens
above. Emit the class and you inherit the behaviour; your own rules override by
specificity, because they carry `[data-template]` and these do not.

### Root

| selector | purpose |
|---|---|
| `.resume` | the sheet: `--color-paper` fill, `widows`/`orphans: 3`, `print-color-adjust: exact`, ligatures and kerning, the `--icon-*` defaults. Kerning is disabled in `@media print` so PDF copy-paste extracts whole words |
| `.resume:not([data-page])`, `.resume[data-page="1"]` | resets the `tk-section` counter, so numbering runs continuously across pages |
| `.resume[data-page]:not([data-page="1"]) > *:first-child` | clears the top margin of the first element on pages 2+ |

### Header

| selector | purpose |
|---|---|
| `.tk-header` | the header block: `--space-header-after`, `--header-align` |
| `.tk-resume-name` | the name: page-heading typography, `--space-header-name-gap` |
| `.tk-subtitle` | the headline / job title: page-subheading typography |
| `.tk-contact` | the contact row: contact typography, wrapping flex |
| `.tk-contact-item` | one contact item; `:not(:first-child)::before` draws `--separator-content` |
| `.tk-contact-item svg.resume-icon` | the item's icon, sized by `--icon-*` |
| `.tk-contact-text` | the value, emitted by `{{> contact-row}}` (no rules of its own) |
| `.tk-links` | the links row: contact typography |
| `.tk-links a`, `.tk-link` | a link: `--color-link`, `--link-decoration`, `--link-border` |
| `.tk-links .tk-separator::after` | the inline separator between links |

### Sections

| selector | purpose |
|---|---|
| `.tk-section-heading` | the section title: section-heading typography, `--space-section-gap`, `--space-section-after-heading`, the whole decoration box, and `break-after: avoid` |
| `.tk-section-heading::before` | the numbering prefix, from the `tk-section` counter |
| `.tk-section-content` | a section body: `--size-body`. Its `.tk-separator::after` emits `", "` |
| `.tk-section-heading-rule` | **retired** — `display: none`. Do not emit it |

### Items

| selector | purpose |
|---|---|
| `.tk-item-header` | title + date row: flex, baseline-aligned, space-between |
| `.tk-item-title` | the heading: item-heading typography. `a` inside it picks up the link tokens |
| `.tk-item-title .tk-item-sep::after` | the glyph between heading parts, from `--item-heading-separator` |
| `.tk-item-subtitle` | the subtitle: item-subheading typography, `--space-item-after-heading` |
| `.tk-item-date` | the duration: date typography, right-aligned, no shrink |
| `.tk-item-link-icon` (+ `svg`) | the per-item external-link icon, sized by `--size-link-icon` |
| `.tk-history-gap` | `--space-item-gap` as a top margin — put it on every item but the first |
| `.tk-date`, `.tk-history-header time` | `font-variant-numeric: tabular-nums` |
| `.tk-item`, `.tk-history-entry` | `break-inside: avoid` |
| `.tk-photo`, `.tk-logo` | `break-inside: avoid` |

### Rich text

| selector | purpose |
|---|---|
| `.tk-rich-text` | body copy: `--style/weight/tracking/transform-body`. Deliberately *not* on `.resume`, so body typography never bleeds into headings whose own fallback is `inherit` |
| `.tk-rich-text a` | link tokens |
| `.tk-rich-text p` | `--space-paragraph` below, never on the last paragraph |
| `.tk-rich-text ul` | `--bullet-indent` padding, markers off |
| `.tk-rich-text ul > li::before` | the bullet: `--bullet-character`, `--bullet-gap`, `--bullet-color`, `--bullet-font-size`, `--style-bullet` |
| `.tk-rich-text ol` | native decimal numbering |
| `.tk-rich-text li` | `--space-list-item` vertical margin |

### Tags

| selector | purpose |
|---|---|
| `.tk-tag-group` | one group (or one run of single skills) in every `{{> tags}}` style |
| `.tk-tag-group-name` | a group's label — name, level and colon — in every style; bold. Override it to restyle the label (`font-weight: 400; font-style: italic`, a colour) |
| `.tk-tag-level` | the level inside a label or a single skill; muted in `chips` |
| `.tk-tag` | a single skill in running text, or one pill in `chips` |
| `.tk-tags-inline` | the `inline` container; widens the gap between groups to `0.75em` |
| `.tk-tags` | the `list` / `chips` list container: list reset, `--size-body` |
| `.tk-tags-list` | one group per line, `--space-item-gap` apart (the work/education item gap) |
| `.tk-tag-groups` | the `chips` container; groups `--space-item-gap` apart |
| `.tk-tags-chips` + `.tk-tag` | wrapping inline-flex of hairline-bordered pills |
| `.tk-tag-list` | a wrapping flex container, for a template building its own tag layout |
| `.tag-item` | `--size-body` (**no** `tk-` prefix — a legacy hook) |

### References

| selector | purpose |
|---|---|
| `.tk-reference` | one entry; consecutive entries get `--space-item-gap` |
| `.tk-reference-name` | bold |
| `.tk-reference-detail` | italic |
| `.tk-reference-contact` | `--size-body` |

### Grid primitive

| selector | purpose |
|---|---|
| `.tk-two-col` | flex, `min-height: 100%` |
| `.tk-two-col > .tk-sidebar` | `--sidebar-width` (default `35%`) — override with `--layout-col-1` |
| `.tk-two-col > .tk-main` | `flex: 1` |

### Date position

| selector | purpose |
|---|---|
| `.resume[data-date-position="inline"] .tk-item-header` | dates beside the title instead of right-aligned |
| `.resume[data-date-position="inline"] .tk-item-date` | its own size / style / colour, with the user's tokens winning |

---

## Helpers

Registered by the engine and available in `template.hbs` and every partial. A
package ships no JavaScript, so this is the whole of what it can compute.

| helper | signature | returns |
|---|---|---|
| `join` | `(array, separator)` | the strings joined; items HTML-escaped, separator emitted raw |
| `join` | `(array, key, separator)` | the same, reading `key` off each object |
| `where` | `(array, k=v …)` | the array filtered to items matching every hash pair |
| `formatDate` | `(value, pattern?)` | `date-fns` format; `""` when empty or unparseable. Default pattern `"MMM yyyy"` |
| `truncate` | `(value, limit, suffix?)` | at most `limit` **code points**, suffix included. Default suffix `"…"` |
| `initials` | `(value)` | the first code point of up to three words, uppercased |
| `default` | `(value, fallback)` | `fallback` when `null`, `undefined` or `""`; `false` and `0` are preserved |
| `eq` / `ne` | `(a, b)` | **strict** `===` / `!==` |
| `gt` / `lt` | `(a, b)` | numeric when both read as finite numbers, lexicographic otherwise |
| `and` / `or` | `(…args)` | variadic; a real boolean, so they compose in `{{#if}}` |
| `icon` | `(name)` | an inline `<svg class="resume-icon">`; `""` for an unknown name |
| `contactIcon` | `(type)` | the same, for a contact type (`email`, `phone`, `location`, `url`, `github`, `linkedin`, `twitter`; anything else falls back to a link glyph) |

`lookup` is Handlebars' own built-in and is deliberately **not** redefined —
shadowing a built-in is how a template that works in one engine version breaks
in the next.

`join`'s separator is emitted raw, which is what lets
`{{join headingParts '<span class="tk-item-sep"></span>'}}` work; the items
themselves are always escaped.

The string helpers return plain strings, so `{{ }}` escapes them like any other
value — none of them may emit markup. There is no `markdown` helper and nothing
that evaluates template-supplied code.

---

## Partials

### The engine's

| partial | renders |
|---|---|
| `{{> contact-row}}` | one `<span class="tk-contact-item" data-type="…">` per `contactItems` entry, value wrapped in `<span class="tk-contact-text">`, prefixed with `{{contactIcon type}}` when `showIcons` is true. Separators are drawn by `utils.css`, not by markup |
| `{{> tags}}` | a tag section in the current `tagStyle` |

Both read from the **current** context, so call them where `contactItems` /
`tagItems` are in scope. `{{> tags}}` takes an optional `tagStyle=` hash;
without it the style comes from `@root.tagStyle`, and failing that `inline`.

The partial renders **runs**: each entry with keywords is its own run, and
consecutive single skills (a name, no keywords) form one run joined by `, `.
Inside a run:

| entry | `inline` / `list` group content |
|---|---|
| named, with level | `<span class="tk-tag-group-name">Languages<span class="tk-tag-level"> (Expert)</span>:</span> Go, C++` |
| named, no level | `<span class="tk-tag-group-name">Cloud:</span> AWS, GCP` |
| unnamed | `React, Next.js` — no label, no colon |
| single skills | `<span class="tk-tag">TypeScript</span>, <span class="tk-tag">Rust<span class="tk-tag-level"> (Advanced)</span></span>` |

| `tagStyle` | markup |
|---|---|
| `inline` (default) | `<span class="tk-tags-inline"><span class="tk-tag-group">…</span> <span class="tk-tag-group">…</span></span>` — groups flow as text; a real space between them, widened by CSS, and no separator glyph |
| `list` | `<ul class="tk-tags tk-tags-list"><li class="tk-tag-group">…</li>…</ul>` — one group per line |
| `chips` | `<div class="tk-tag-groups"><div class="tk-tag-group"><div class="tk-tag-group-name">Languages<span class="tk-tag-level"> (Expert)</span></div><ul class="tk-tags tk-tags-chips"><li class="tk-tag">Go</li>…</ul></div>…</div>` — the label only when the group has a name or level; one pill per keyword, or per single skill |

All text is escaped. No entries renders nothing. An unknown `tagStyle=` value
falls back to `inline`.

A template whose design wants one group per line by default — a sidebar, say —
sets `"renderDefaults": { "tagStyle": "list" }` in `settings.defaults`; the
user can still pick another style in the drawer's **Skills display** control.

### Your own

A file at `partials/<name>.hbs` is registered as `<your id>/<name>` and is
referenced that way:

```hbs
{{> ridge-serif/tag-list}}
```

`<name>` must match `^[a-z0-9][a-z0-9-]*$` — anything else can never be
registered and is a `partial-name` error. Partials are not nested: the path is
always `partials/<name>.hbs`, one level.

At render time the bare namespace belongs to the engine, so **do not name a
partial `tags` or `contact-row`**: you would shadow an engine partial and
`{{> tags}}` would stop meaning what every other template means by it.

An unreferenced partial is a warning in `validate` and an error in `check` — a
published package carries no dead files. A reference to a name that is neither
yours nor the engine's is always an error. A *dynamic* partial
(`{{> (whichPartial) }}`) cannot be checked and is skipped.

---

## Manifest fields

Normative source:
[`../schema/template.schema.json`](../schema/template.schema.json), generated
from the engine's Zod schemas. Unknown keys are **rejected** at every level.

| field | required | type / rule |
|---|---|---|
| `$schema` | no | string; an editor hint only |
| `id` | **yes** | `^[a-z][a-z0-9-]{1,63}$` — also the folder name and the `data-template` value |
| `name` | **yes** | non-empty string |
| `version` | **yes** | `MAJOR.MINOR.PATCH` with an optional `-prerelease` |
| `contract` | **yes** | the literal `"1"` |
| `description` | no | string |
| `author` | **yes** | `{ name: non-empty, url?: a URL }` — no other keys |
| `license` | **yes** | non-empty string; a matching `LICENSE` file is required to publish |
| `layout` | **yes** | see below |
| `settings` | no | `{ defaults, locked, controls }`; defaults to all three empty |

### `layout`

```ts
{ mode: "flow" }
| {
    mode: "grid";
    regions: ("header" | "main" | "aside" | "footer")[];   // >= 1, no duplicates
    widths: number[];                                      // >= 1, each 0 < w <= 100, sum 100 ±0.01
    gap: number;                                           // px, >= 0
    defaultPlacement?: Record<SectionCategory, Region>;    // optional
  }
```

`SectionCategory` is `history | tags | languages | references | custom`.
`widths` is one entry per **column** and is deliberately not tied to
`regions.length` — `header` and `footer` span the full width.

### `settings.defaults`

A deep partial of the settings tree, plus `renderDefaults`:

```
typography.{baseFontSize, scale, lineHeight}
typography.{pageHeading, pageSubheading, sectionHeading, itemHeading,
            itemSubheading, body, date, contact, bullet, link}.*
typography.sectionHeading.{prefix, decoration.*}
typography.itemHeading.separator
spacing.{page.{top,right,bottom,left}, section.{gap,afterHeading},
         item.{gap,afterHeading}, header.{after,nameGap},
         paragraph, listItem, density}
color.{accent, paper}
header.{align, separator, icons}
layout.{placement, widths, gap}        (declare geometry in `layout` instead)
renderDefaults.{showDates, showDescription, linkDisplay, dateFormat,
                itemHeadingFormat, datePosition, dateRangeSeparator,
                presentLabel, showSummaryHeading, tagStyle}
```

`template` and `templateOptions` are **not** settable. Every key must address a
real leaf; an unknown one is a `defaults-paths` error, located at its line in
`template.json`.

### `settings.locked`

An array of dotted settings paths. Each must be a real leaf (same vocabulary as
`defaults`, minus the `renderDefaults.` prefix) or it is a `locked-paths`
error. `layout.widths`, `layout.gap` and `layout.placement` **are** lockable —
a template that fixes its grid geometry is a real case.

### `settings.controls`

An array of discriminated unions; `key` must be unique in the package.

```ts
{ type: "toggle"; key; label; default: boolean }
{ type: "select"; key; label; options: { value, label }[]; default: string }   // default ∈ options
{ type: "slider"; key; label; min; max; step?; unit?; default: number }        // min < max, default in range
{ type: "color";  key; label; default: "#rrggbb" }
```

`key` matches `^[a-z][a-z0-9-]*$`, because it becomes both `--tpl-<key>` and
`options.<key>`. `step` must be `> 0` if present. Cross-field failures are
reported under the `controls` rule.

---

## Validation rules

`krafter-template validate` runs all of these; `check` promotes the publish
rules to errors and adds the preview and licence ones. A package that cannot be
parsed produces its parse errors and nothing else — no other rule has anything
meaningful to say without a manifest.

| rule | `validate` | `check` | reads | what it checks |
|---|---|---|---|---|
| `contract` | error | error | `template.json` | `contract` is a version this engine renders |
| `manifest` | error | error | `template.json` | the manifest matches the schema (one issue per Zod failure, each with its line) |
| `css-scope` | error | error | `template.css` | every style rule — including inside `@media` — starts with `.resume[data-template="<id>"]` |
| `css-external-url` | error | error | `template.css` | no `@import`, no external `url()` and no external string in `image-set()` / `image()` / `src()` / `cross-fade()` / `element()` / `paint()`; only `data:` URIs resolve |
| `css-font-face` | error | error | `template.css` | no `@font-face` — fonts come from the engine's pipeline |
| `css-escape` | error | error | `template.css` | no backslash escape outside a string literal — a browser decodes `@\69mport` to `@import` before it reads the rule; inside a string (`content: "\2022"`) escapes are fine |
| `css-position` | error | error | `template.css` | no `position: fixed` / `sticky` (they resolve against the viewport and can paint over the app) and no `position` whose value cannot be resolved (`var()`); allowed inside `@media print`, which never applies to the preview |
| `hbs-script` | error | error | `*.hbs` | no `<script>` |
| `hbs-event-handler` | error | error | `*.hbs` | no `on*=` attributes |
| `hbs-javascript-url` | error | error | `*.hbs` | an `<a href>` scheme is `https:`, `http:`, `mailto:`, `tel:`, `sms:` or a fragment — checked after decoding HTML entities and stripping whitespace, so `javascript&colon;` and `java&#9;script:` are errors too |
| `hbs-element` | error | error | `*.hbs` | none of `iframe`, `frame`, `frameset`, `object`, `embed`, `applet`, `portal`, `form`, `input`, `button`, `select`, `textarea`, `meta`, `base`, `link`, `style`, `video`, `audio`, `source`, `track`, `template`, `slot`, `noscript`, and the SVG animation elements `animate`, `animateMotion`, `animateTransform`, `set`, `discard` (they can retarget a URL attribute after validation) — anything that embeds a document, submits data, redirects the page, loads media, animates attributes or declares styles outside `template.css` |
| `hbs-url-attr` | error | error | `*.hbs` | `src`, `srcset`, `poster`, `background`, `action`, `formaction`, `ping`, `data`, `xlink:href` — and `href` on anything but `<a>` — is a `data:` URL, a `#` fragment, or a single plain field (`{{basics.image}}`); no literal URLs, no helpers (a helper can build a URL out of résumé fields) |
| `hbs-link-href` | error | error | `*.hbs` | an `<a href>` is a single plain field, `mailto:`/`tel:`/`sms:` over one field, or fully static — never a literal mixed with a mustache (`https://x/?e={{basics.email}}`) |
| `hbs-style-attr` | error | error | `*.hbs` | an inline `style` attribute contains none of `url(`, `@import`, `expression(`, `behavior`, `position`, `-moz-binding`; `style="--tpl-x: {{options.x}}"` is fine |
| `hbs-raw-output` | error | error | `*.hbs` | `{{{ }}}` / `{{& }}` only on `summary`, `descriptionBlocks`, and `this` inside `{{#each descriptionBlocks}}` |
| `hbs-partials` | error | error | `*.hbs` | every `{{> … }}` is an engine partial (`contact-row`, `tags`) or one of yours **namespaced** as `{{> <id>/<name>}}` — the bare form of your own partial is an error (it would resolve to the engine at render time) |
| `locked-paths` | error | error | `template.json` | every `settings.locked` entry is a real settings leaf |
| `defaults-paths` | error | error | `template.json` | every `settings.defaults` key is a real settings leaf (read from the raw JSON, so a typo Zod would strip is still caught) |
| `controls` | error | error | `template.json` | per-control shape and cross-field rules; duplicate keys |
| `partial-name` | error / warning | error / warning | `partials/*` | a `partials/` entry is a lowercase-slug `.hbs`, so it can be registered (error); a partial named like an engine one (`tags`, `contact-row`) that the package also references bare resolves to the engine's, not yours (warning) |
| `render-fixtures` | error | error | every file | the package renders **every** fixture (all eight profiles in the CLI) — the Handlebars line is in the message |
| `render-leftover` | error | error | `template.hbs` | no unresolved `{{` survives into the output |
| `partial-unused` | warning | **error** | `*.hbs` | every partial you ship is referenced |
| `control-unused` | warning | warning | `template.css`, `*.hbs` | each control is read via `--tpl-<key>` or `options.<key>` |
| `resume-without-sections` | warning | warning | `*.hbs` | a template reading `resume.*` also renders `sections` or `regions` |
| `files-unexpected` | warning | warning | the files map | only `template.json`, `template.hbs`, `template.css`, `partials/*.hbs`, `preview.png`, `README.md`, `LICENSE` |
| `preview-missing` | warning | **error** | the files map | `preview.png` exists |
| `preview-stale` | — | **error** | mtimes | `preview.png` is newer than `template.hbs`, `template.css` and every partial |
| `license-missing` | — | **error** | `LICENSE`, `template.json` | a licence file is present |

Every issue prints as:

```
<file>:<line>: <severity> [<rule>] <message>
```

— and as `<file>: <severity> [<rule>] <message>` when the fault has no position
in a text file. Warnings do not fail a package; errors do. `--strict` fails on
warnings too, and `--json` prints the whole result as one JSON object instead.

Comments are not scanned: a commented-out `{{> other/tags}}` is neither a
partial reference nor a use of anything.

---

## Data attributes on `.resume`

The host sets these on the rendered root. A template may key rules off them;
nothing in a package writes them.

| attribute | values | set by |
|---|---|---|
| `data-template` | the manifest's `id` | every renderer — this is your CSS scope |
| `data-date-position` | `right` \| `inline` | the resolved `renderDefaults.datePosition` |
| `data-body-style` | `serif` \| `sans` \| `mono` | the body font's category, collapsed to three buckets (display and handwriting fonts, and unknown families, resolve to `sans`) |
| `data-page` | `"1"`, `"2"`, … | the paginated preview and the print path, one `.resume` per page. Absent on an unpaginated root |

`data-page` is what keeps the section counter continuous (`[data-page="1"]`
resets it, later pages do not) and what clears the first element's top margin on
pages 2+.

---

## JSON Schema

The manifest schema is published with `@getkrafter/template-engine` and has the
canonical id

```
https://raw.githubusercontent.com/getkrafter/templates/main/schema/template.schema.json
```

which is what `krafter-template init` writes into a new manifest's `$schema`.

That URL is the copy kept in this repository, so a `template.json` can point at a stable URL
here instead:

```json
"$schema": "https://raw.githubusercontent.com/getkrafter/templates/main/schema/template.schema.json"
```

A relative `"../../schema/template.schema.json"` works too, and is what editors
resolve fastest when you are working in a clone. The copy is refreshed from the
package rather than edited by hand — the engine is the source of truth, so a
diff here means the copy is stale.

Neither this schema nor `catalog.schema.json` uses JSON Schema `format`
keywords; every constrained string carries an explicit `pattern`, so
`npx ajv-cli validate` needs no `ajv-formats` plugin.
