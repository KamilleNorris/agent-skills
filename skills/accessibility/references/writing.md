# Writing accessible UI

Rules for authoring markup, components, and styles to WCAG 2.2 AA. Each rule ends with `[success criterion · check]`:

- **axe**: the axe scan in `testing.md` reports violations; its output names the axe rule and links its docs.
- **manual**: only a person (or you, driving the browser) can verify it.
- **axe + manual**: axe catches part of it; the rest needs checking by hand.

Criterion details: [WCAG 2.2 quick reference](https://www.w3.org/WAI/WCAG22/quickref/).

## Page and document

- `<html lang="…">` with a valid BCP 47 code; matching `xml:lang` if both are set. [3.1.1 · axe]
- Inline content in another language carries its own valid `lang`. [3.1.2 · axe]
- A non-empty, page-specific `<title>`; in an SPA, update it on route change. [2.4.2 · axe + manual]
- A skip link or landmarks so keyboard users can bypass repeated navigation. [2.4.1 · axe]
- Never `<meta http-equiv="refresh">` with a delay. [2.2.1 · axe]
- Never `user-scalable=no` or `maximum-scale` below 2 in the viewport meta. [1.4.4 · axe]
- Never lock orientation with CSS media queries. [1.3.4 · manual]
- Never `aria-hidden="true"` on `<body>`. [4.1.2 · axe]
- Content reflows at 320 CSS px wide without two-dimensional scrolling. [1.4.10 · manual]

## Structure and semantics

- Headings mark sections; never style a `<p>` to look like one. [1.3.1 · manual]
- Lists: `<ul>`/`<ol>` contain only `<li>` (plus `<script>`/`<template>`); `<li>` lives in a list. [1.3.1 · axe]
- Definition lists: `<dl>` contains only `<dt>`/`<dd>` groups (optionally wrapped in `<div>`); `<dt>`/`<dd>` live in a `<dl>`. [1.3.1 · axe]
- Reading order in the DOM matches visual order. [1.3.2 · manual]
- Instructions never rely only on shape, position, or colour ("click the red button"). [1.3.3 · manual]

## Data tables

- Header cells are `<th>`; each `<th>` labels real data cells; `headers` attributes point at `<th>` ids in the same table. [1.3.1 · axe]
- Large tables give every non-empty `<td>` an associated header. [1.3.1 · manual]
- Use `<caption>` for the table's caption, not a spanning header cell. [1.3.1 · manual]
- Layout belongs in CSS, not `<table>`. [1.3.1 · manual]

## Images and media

- Every `<img>` has `alt`: a description for meaningful images, `alt=""` for decorative ones. [1.1.1 · axe + manual: axe sees missing `alt`, not a poor description]
- `<svg role="img">`, `[role="img"]`, `<object>`, `<input type="image">`, and `<area href>` each have a text alternative. [1.1.1 · axe]
- Icon-only `<svg>` inside a labelled control gets `aria-hidden="true"`. [1.1.1 · manual]
- No server-side image maps (`<img ismap>`). [2.1.1 · axe]
- `<video>` with speech has a captions `<track>`; prerecorded video has an audio description or transcript. [1.2.2, 1.2.5 · axe + manual]
- Audio-only content has a transcript. [1.2.1 · manual]
- Media never autoplays sound for more than 3 seconds without a control to stop it. [1.4.2 · axe]
- No `<blink>` or `<marquee>`; anything that moves, blinks, or auto-updates for more than 5 seconds can be paused. [2.2.2 · axe + manual]
- Nothing flashes more than three times a second. [2.3.1 · manual]
- Respect `prefers-reduced-motion` for non-essential animation. [best practice · manual]

## Colour and visual presentation

- Text contrast at least 4.5:1, or 3:1 for large text (≥24px, or ≥18.66px bold). [1.4.3 · axe]
- UI component boundaries, focus indicators, and meaningful icons/graphics at least 3:1 against adjacent colours. [1.4.11 · manual]
- Links inside a text block are distinguishable without colour (underline, or 3:1 contrast with surrounding text plus a non-colour cue on hover/focus). [1.4.1 · axe]
- Colour is never the only way to convey state, error, or meaning. [1.4.1 · manual]
- Text spacing stays adjustable: never `!important` on inline `line-height`, `letter-spacing`, or `word-spacing`. [1.4.12 · axe]
- Text resizes to 200% without loss of content; use relative units. [1.4.4 · manual]
- Content shown on hover or focus (tooltips, popovers) is dismissible with Esc, hoverable, and persists until dismissed. [1.4.13 · manual]

## Names, roles, and values

- Every `<button>` and `<input type="button|submit|reset">` has discernible text; icon buttons use `aria-label` or visually hidden text. [4.1.2 · axe]
- Every link has discernible text that makes sense out of context; no bare "click here". [2.4.4 · axe + manual: axe sees empty links, not vague text]
- Every `<summary>` has text. [4.1.2 · axe]
- Every `<iframe>` has a unique, descriptive `title`. [4.1.2 · axe]
- A control's accessible name contains its visible label text, starting with it. [2.5.3 · manual]
- ids referenced by `aria-labelledby`, `aria-describedby`, `for`, and similar are unique. [4.1.2 · axe]
- No interactive element inside another (a button in a link, a link in a button). [4.1.2 · axe]

## ARIA

- Only valid roles; no deprecated roles. [4.1.2 · axe]
- Only valid attribute names and values; required attributes present (e.g. `aria-checked` on `role="checkbox"`). [4.1.2 · axe]
- Only attributes the role supports, and only in the way that role allows; never naming attributes on roles that prohibit them. [4.1.2 · axe]
- Roles with required structure get it: `listbox` owns `option`s, `tab`s live in a `tablist`, `menuitem`s live in a `menu`. [1.3.1 · axe]
- Named widgets have names: `role="button|link|menuitem"`, `combobox|textbox|searchbox|listbox|spinbutton|slider`, `checkbox|radio|switch|menuitemcheckbox`, `tab`, `tooltip`, `meter`, `progressbar`. [4.1.2 · axe]
- `aria-braillelabel`/`aria-brailleroledescription` only alongside a non-braille equivalent. [4.1.2 · axe]
- Nothing focusable inside `aria-hidden="true"`; use `inert` to hide interactive regions. [4.1.2 · axe]
- State changes update ARIA state (`aria-expanded`, `aria-selected`, `aria-pressed`, `aria-current`) in the same render. [4.1.2 · manual]
- Status messages (saved, N results, errors) are announced via `role="status"`/`aria-live="polite"` or `role="alert"`, without moving focus. The live region exists in the DOM before its text changes. [4.1.3 · manual]

## Forms

- Every input, `<select>`, and `<textarea>` has a programmatic label, preferably a visible `<label for>`; placeholder alone is not a label. [4.1.2, 3.3.2 · axe]
- At most one `<label>` per field; group related fields (radios, checkboxes) in `<fieldset>` with `<legend>`. [3.3.2, 1.3.1 · axe + manual]
- Personal-data fields use valid `autocomplete` tokens (`email`, `given-name`, `tel`, `street-address`…). [1.3.5 · axe]
- Required fields say so in text, not only with `*` or colour; set `required` or `aria-required`. [3.3.2 · manual]
- Errors are identified in text next to the field, linked with `aria-describedby`, flagged with `aria-invalid="true"`, and suggest a fix. [3.3.1, 3.3.3 · manual]
- Legal, financial, or data-deleting submissions can be reviewed, corrected, or reversed. [3.3.4 · manual]
- Information already entered in the same process is pre-filled or selectable, not asked for again. [3.3.7 · manual]
- Login never requires a cognitive test (memorising, transcribing, puzzles); allow paste and password managers. [3.3.8 · manual]
- Changing a field's value never submits the form or moves context unexpectedly. [3.2.2 · manual]

## Keyboard and focus

- Everything operable by pointer is operable by keyboard alone. Custom widgets follow the [APG keyboard pattern](https://www.w3.org/WAI/ARIA/apg/patterns/). [2.1.1 · manual]
- Scrollable regions are keyboard-reachable (contain a focusable element or take `tabindex="0"`). [2.1.1 · axe]
- Iframes with focusable content never take `tabindex="-1"`. [2.1.1 · axe]
- No positive `tabindex`; DOM order defines focus order. [2.4.3 · manual]
- Focus is always visible: keep or replace the outline, never just remove it. [2.4.7 · manual]
- Focused elements are never fully hidden behind sticky headers, footers, or overlays; use `scroll-padding`. [2.4.11 · manual]
- No keyboard traps; a user can always Tab or Esc out. [2.1.2 · manual]
- Dialogs: focus moves into the dialog on open, stays inside while modal, returns to the trigger on close, Esc closes. Prefer `<dialog>` with `showModal()`. [2.4.3, 2.1.2 · manual]
- After deleting an item or changing route, move focus somewhere sensible (the next item, the new page's `<h1>`). [2.4.3 · manual]
- Receiving focus never changes context on its own. [3.2.1 · manual]
- Single-character keyboard shortcuts can be turned off or remapped. [2.1.4 · manual]

## Pointer and touch

- Targets are at least 24×24 CSS px, or spaced so a 24px circle around each does not overlap another target. [2.5.8 · axe]
- Drag operations have a single-pointer alternative (buttons, click-to-place). [2.5.7 · manual]
- Multipoint or path gestures (pinch, swipe) have a single-pointer alternative. [2.5.1 · manual]
- Actions fire on pointer up, not down, so users can slide off to cancel. [2.5.2 · manual]

## Timing and navigation

- Time limits can be turned off, adjusted, or extended. [2.2.1 · manual]
- Navigation repeated across pages stays in the same order; components with the same function have the same label. [3.2.3, 3.2.4 · manual]
- Help mechanisms (contact link, chat) sit in the same relative place on every page. [3.2.6 · manual]
- More than one way to reach a page (nav plus search or sitemap). [2.4.5 · manual]
- Headings and labels describe their topic or purpose. [2.4.6 · manual]
