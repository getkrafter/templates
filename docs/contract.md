# The template contract (`contract: "1"`)

The reference for what a template package may rely on: the data it is handed,
the tokens and classes it may style, the helpers and partials it may call, and
the rules it is validated against.

> **Skeleton.** The outline and the validation rule list are settled; the
> field-by-field tables arrive in W6 (step 20), generated from the engine so
> they cannot drift from it.

Every manifest declares `"contract": "1"`. The contract versions the *shape of
this document*, not the engine and not the template — see the repository
[`README.md`](../README.md#contract-version).

## `TemplateData`

_Filled in W6 (Step 20)._ The root context of `template.hbs`: the resume, the
resolved settings, the sections to render and the template's own options.

## Regions

_Filled in W6 (Step 20)._ `header`, `main`, `aside`, `footer` — what a grid
template receives in place of a flat `sections` list, and how
`layout.defaultPlacement` decides where a section lands.

## Options

_Filled in W6 (Step 20)._ The values of `settings.controls`, keyed by the
control's `key`.

## `resume`

_Filled in W6 (Step 20)._ The profile itself, for the fields a section list
does not expose.

## Tokens

_Filled in W6 (Step 20)._ The CSS custom properties the engine emits from the
resolved settings, by family (typography, colour, spacing, page). A template
reads them; it does not define them.

## `tk-*` classes

_Filled in W6 (Step 20)._ The class hooks the built-in sections emit —
`tk-section-heading`, `tk-item-title`, `tk-item-subtitle`, `tk-item-date`,
`tk-contact-item`, `tk-rich-text`, `tk-tag-list` and the rest. Style them;
`utils.css` already gives them their settings-driven behaviour.

## Helpers

`icon`, `contactIcon`, `formatDate`, `initials`, `default`, `eq`, `ne`, `gt`,
`lt`, `and`, `or`.

_Filled in W6 (Step 20)._

## Partials

Shared partials — `contact-row`, `tags` — plus the namespacing rule for a
package's own `partials/*.hbs` (`partial-name`), and why an unused one is an
error rather than dead weight.

_Filled in W6 (Step 20)._

## Manifest fields

Normative source: [`../schema/template.schema.json`](../schema/template.schema.json).
Required: `id`, `name`, `version`, `contract`, `author`, `license`, `layout`.
Optional: `description`, `settings`.

_Filled in W6 (Step 20)._

## Validation rules

What `krafter-template validate` and `check` report. `check` promotes the
publish rules to errors and adds the preview and licence ones.

| rule | reported by |
|---|---|
| `contract` | validate |
| `manifest` | validate |
| `css-scope` | validate |
| `css-external-url` | validate |
| `css-font-face` | validate |
| `hbs-script` | validate |
| `hbs-event-handler` | validate |
| `hbs-javascript-url` | validate |
| `hbs-raw-output` | validate |
| `hbs-partials` | validate |
| `locked-paths` | validate |
| `defaults-paths` | validate |
| `controls` | validate |
| `control-unused` | validate |
| `partial-name` | validate |
| `render-fixtures` | validate |
| `render-leftover` | validate |
| `resume-without-sections` | validate |
| `files-unexpected` | validate |
| `partial-unused` | warning in validate, **error** in check |
| `preview-missing` | warning in validate, **error** in check |
| `preview-stale` | **error** in check |
| `license-missing` | **error** in check |

Each is printed as `file:line: severity [rule] message`.

_Filled in W6 (Step 20): what each rule means and how to fix it._
