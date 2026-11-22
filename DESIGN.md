---
name: Auktiva
description: A free, open-source auction platform for charity events, fundraisers and community sales.
colors:
  paddle-indigo: "oklch(45% 0.24 277.023)"
  paddle-indigo-dark-theme: "oklch(58% 0.233 277.117)"
  paddle-indigo-content: "oklch(93% 0.034 272.788)"
  raised-pink: "oklch(65% 0.241 354.308)"
  raised-pink-content: "oklch(94% 0.028 342.258)"
  ledger-teal: "oklch(77% 0.152 181.912)"
  ledger-teal-content: "oklch(38% 0.063 188.416)"
  hall-ink: "oklch(14% 0.005 285.823)"
  paper-white: "oklch(100% 0 0)"
  paper-mist: "oklch(98% 0 0)"
  paper-fold: "oklch(95% 0 0)"
  ink-text: "oklch(21% 0.006 285.885)"
  night-slate: "oklch(25.33% 0.016 252.42)"
  night-slate-deep: "oklch(23.26% 0.014 253.1)"
  night-slate-deepest: "oklch(21.15% 0.012 254.09)"
  night-text: "oklch(97.807% 0.029 256.847)"
  status-info: "oklch(74% 0.16 232.661)"
  status-winning: "oklch(76% 0.177 163.223)"
  status-outbid: "oklch(82% 0.189 84.429)"
  status-ended: "oklch(71% 0.194 13.428)"
  christmas-pine: "#1f593f"
  christmas-fir: "#408268"
  christmas-cranberry: "#a44550"
  christmas-gold: "#a87126"
  christmas-light: "#ffe2a0"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "4.5rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  subtitle:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  label:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
    letterSpacing: "0.025em"
  price:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.025em"
rounded:
  field: "0.25rem"
  box: "0.5rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  3xl: "1.5rem"
  full: "9999px"
spacing:
  1: "0.25rem"
  2: "0.5rem"
  3: "0.75rem"
  4: "1rem"
  5: "1.25rem"
  6: "1.5rem"
  8: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.paddle-indigo}"
    textColor: "{colors.paddle-indigo-content}"
    rounded: "{rounded.field}"
    height: "2.5rem"
    padding: "0 1rem"
  button-primary-hero:
    backgroundColor: "{colors.paddle-indigo}"
    textColor: "{colors.paddle-indigo-content}"
    rounded: "{rounded.full}"
    height: "3.5rem"
    padding: "0 2rem"
  button-ghost:
    textColor: "{colors.ink-text}"
    rounded: "{rounded.field}"
    height: "2rem"
    padding: "0 0.75rem"
  input:
    backgroundColor: "{colors.paper-white}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.field}"
    height: "2.5rem"
    padding: "0 0.75rem"
  card-item:
    backgroundColor: "{colors.paper-white}"
    rounded: "{rounded.box}"
    padding: "1.25rem"
  badge-winning:
    backgroundColor: "{colors.status-winning}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.full}"
  badge-outbid:
    backgroundColor: "{colors.status-outbid}"
    textColor: "{colors.ink-text}"
    rounded: "{rounded.full}"
  nav-icon-tile:
    backgroundColor: "{colors.paddle-indigo}"
    rounded: "{rounded.xl}"
    size: "2.5rem"
---

# Design System: Auktiva

## Overview

**Creative North Star: "The Community Hall Auction"**

Auktiva should feel like a school gym or church hall on auction night, made digital: warm, welcoming and a little festive, never slick or corporate. The organizer runs the room, and guests drift between tables, check their bids and cheer when they win. The interface stays friendly and legible. Excitement belongs to the moments that earn it: a new bid, an outbid warning, a win.

The system is built on daisyUI 5's stock `light` and `dark` themes on Tailwind 4, with no custom theme file. Its identity comes from how those tokens are used: soft translucent surfaces, hairline borders, generous rounding on hero controls, an indigo-to-pink gradient on the wordmark and display headlines, and a strict set of status colours for bid states. Density is moderate. App screens use cards in grids and compact `sm` controls, while the landing page opens up into large centred type and big pill buttons.

A seasonal layer sits on top of the base system. From 20 November to 6 January, `data-season="christmas"` adds a pine, fir, cranberry and gold palette, trims and scenes, and it switches off completely outside that window.

**Key Characteristics:**

- Stock daisyUI light and dark themes, switched by `data-theme`, following the system preference by default.
- The system sans font stack throughout, with monospace kept for money.
- Soft glass surfaces: 50% base fill, a light backdrop blur, and a hairline border at 5% of the text colour.
- An indigo-to-pink gradient reserved for the wordmark and display headlines.
- Status colours tied to bid state: winning, outbid, ended, draft.
- Tabler icons (via Iconify) next to almost every label and action.
- A seasonal Christmas layer that adds to the base design without replacing it.

## Colors

The palette is friendly and saturated: an indigo action colour, a pink personal accent and a teal third note on clean white or deep blue-slate paper, plus a strict set of status colours.

### Primary

- **Paddle Indigo** (light theme; lifted to `paddle-indigo-dark-theme` in dark): the colour of action and price. It fills primary buttons, the current price on item cards, active navigation, link hover, focus, and the tinted hover shadow under interactive cards. Its 10% tint fills the logo tile and the hover background of navigation items.

### Secondary

- **Raised Pink**: the colour of "yours" and "soon". It outlines your own listings, fills the "Your listing" badge, colours item end times, and forms the far end of the brand gradient.

### Tertiary

- **Ledger Teal**: a rare third note. It closes the hero headline's three-stop gradient and accents a few section titles. It never acts as a button colour.

### Neutral

- **Paper White / Paper Mist / Paper Fold**: the light theme's `base-100`, `base-200` and `base-300`, used for the page, recessed wells such as image placeholders, and dividers.
- **Ink Text**: body text in the light theme. Secondary text is the same ink at reduced opacity, never a new grey: 80% for supporting copy, 60% for descriptions, 50% for labels and 10% for placeholder icons.
- **Night Slate / Night Slate Deep / Night Slate Deepest**: the dark theme's base layers. The dark theme is a cool blue-slate, not neutral black.
- **Night Text**: body text in the dark theme.
- **Hall Ink**: daisyUI's `neutral`, used rarely for strong neutral fills.

### Status

- **Winning / Won** (`success`): bid status badges and the price when you lead.
- **Outbid / Draft** (`warning`): outbid badges and price, unpublished drafts, and the admin entry in the navigation.
- **Ended** (`error`): ended badges and destructive buttons.
- **Info** (`info`): neutral notices and section accents.

### Seasonal (Christmas)

- **Pine, Fir, Cranberry, Gold, Light**: active only under `data-season="christmas"`. In the dark theme Fir, Cranberry and Gold lift (`#62a08a`, `#ca7580`, `#e0b775`). They appear as a 2px pine → gold → cranberry trim on cards, soft radial washes behind headers, and the scene illustrations.

### Named Rules

**The Status Is Sacred Rule.** Success, warning and error mean only bid state and outcome: winning or won, outbid or draft, ended or destructive. Never use them for decoration.

**The Opacity, Not New Greys Rule.** Text hierarchy comes from `base-content` at 80%, 60% or 50% opacity, and borders from `base-content` at 5–10%. Don't add new grey tokens.

**The Gradient Is a Signature Rule.** The indigo → pink (→ teal) gradient text is for the wordmark and display or hero headlines only. Body text, buttons and prices are always solid colour.

## Typography

**Display Font:** the system sans stack (`ui-sans-serif, system-ui, sans-serif`), which renders as Segoe UI, San Francisco, Roboto and so on.
**Body Font:** the same system sans stack.
**Label/Mono Font:** `ui-monospace` (SFMono, Menlo, Consolas) for money only.

**Character:** native, familiar and fast. It's the type of the device in the guest's hand, so nothing feels foreign at a live event. Personality comes from weight (800 on display headlines) and tight tracking, not from a custom typeface.

### Hierarchy

- **Display** (800, 3rem on phones to 4.5rem from `md`, line-height 1.25, tracking -0.025em): the landing hero headline only, with its second line in gradient text.
- **Headline** (800, 1.875–2.25rem, tracking -0.025em): page titles and landing section titles. The dashboard title uses the indigo → pink gradient.
- **Title** (600–700, 1.5rem): card and section titles inside app pages, usually paired with a Tabler icon.
- **Subtitle** (600, 1.125rem): sub-section headings, often tinted with a semantic or brand colour and led by an icon.
- **Body** (400, 0.875rem; 1.25rem on landing lead paragraphs): descriptions, at 60% ink, clamped to two lines on cards.
- **Label** (500, 0.75rem, uppercase, tracking 0.025em): small field captions such as "Current bid", at 50% ink.
- **Price** (mono 700, 1.25rem, tracking -0.025em): bid amounts. Colour follows bid state.

### Named Rules

**The Money Is Mono Rule.** Every bid amount, starting price and total is set in monospace bold with the currency code after it. Numbers line up and read as figures.

**The Native Voice Rule.** Don't add a web font. The system stack is part of the "feels like my phone" promise and keeps first paint fast.

## Layout

App and landing content sit in a centred `container` with 1rem side padding. Reading-width blocks are capped at `max-w-2xl` to `max-w-4xl`. Navigation is a sticky top bar on desktop (`md` and up). On phones it becomes a fixed bottom tab bar (4rem tall, safe-area padded) plus a notification bell in the top bar. Item and auction collections use responsive card grids, with a list view and a split view that keeps a sidebar of items next to the selected one.

Spacing follows Tailwind's 0.25rem scale. Groups mostly use `gap-2` or `gap-3` (0.5–0.75rem), and cards are padded 1–1.25rem (`p-4`/`p-5`), up to 1.5–2rem for forms and settings panels. Landing sections breathe much more: 4rem or more vertical padding and centred, stacked composition.

## Elevation & Depth

This is a soft-glass system. Resting cards and bars are translucent (`base-100` at 50%, or 80–95% for navigation) with a light backdrop blur and a hairline border. Depth is mostly a response to interaction. On hover, cards gain a large soft shadow tinted with Paddle Indigo (or Raised Pink for your own items), and some lift 4px. The sticky top bar starts transparent and gains glass, a bottom hairline and a small shadow once the page scrolls.

### Shadow Vocabulary

- **Resting chip** (`shadow-sm`): status badges floating over images, and small floating icon buttons.
- **Card hover** (`shadow-lg` tinted `primary/5`, or `secondary/5` for your own items): the interactive lift on item and auction cards.
- **Hero CTA** (`shadow-xl` tinted `primary/20`, rising to `primary/40` on hover): the large landing call-to-action buttons only.
- **Scrolled bar** (`shadow-sm` with `backdrop-blur-lg`): the sticky top bar after scrolling.

### Named Rules

**The Lift on Intent Rule.** Surfaces are quiet at rest: translucent fill, hairline border, little or no shadow. Shadow and lift appear when the guest points at something.

**The Tinted Shadow Rule.** Interactive shadows carry the colour of their meaning: indigo for anything you can open, pink for things that are yours. Neutral grey shadows are for static floating chips only.

## Shapes

Controls follow daisyUI's field radius (0.25rem) and cards its box radius (0.5rem). On top of that, app chrome rounds up: icon tiles and list rows use 0.75rem (`rounded-xl`), and showcase containers use 1–1.5rem. Badges, avatars, icon buttons and every hero or landing call-to-action are full pills. Images inside cards fill edge to edge, with cover cropping, under the card's rounded top.

## Components

### Buttons

Friendly and confident, with an icon on almost every one.

- **Shape:** field radius in the app (0.25rem). On the landing page and big calls to action, a full pill (`rounded-full`, 3.5rem tall).
- **Primary:** Paddle Indigo fill with its content colour. One per view, for the main act (create, bid, save).
- **Hover / Focus:** daisyUI's darken on hover and a visible focus outline. Hero buttons also lift 4px and their indigo shadow deepens.
- **Ghost:** the workhorse (most-used variant). Navigation links, toolbar actions and icon buttons; hover adds a `primary/10` wash and indigo text.
- **Outline / Error / Success:** secondary paths, destructive actions, and confirmations.
- **Sizes:** `sm` (2rem) is the app default for toolbars and navigation, `md` (2.5rem) for forms, `lg` for landing.
- **Shared component:** `src/components/ui/button.tsx` wraps these variants with a loading state and icon slots. Prefer it for new buttons.

### Chips and Badges

- **Style:** daisyUI badges, bold, with a 0.75rem Tabler icon and a `shadow-sm` when they float over imagery.
- **State:** Won (success, crown), Winning (success, trophy, gentle pulse), Outbid (warning, alert), Ended (error, flag), Draft (warning, eye-off), Your listing (secondary, extra small), Lost (ghost at 70%).

### Cards / Containers

- **Corner Style:** box radius (0.5rem).
- **Background:** `base-100` at 50% with `backdrop-blur-sm`. Image wells use `base-200` at 50%.
- **Shadow Strategy:** none at rest, tinted `shadow-lg` on hover (see Elevation & Depth).
- **Border:** 1px `base-content/5`. Your own items use `secondary/30`, rising to `/50` on hover.
- **Internal Padding:** 1.25rem. The footer row is separated by a `base-content/5` top border.
- **Ended state:** the card drops to 75% opacity and its image turns grayscale.

### Inputs / Fields

- **Style:** daisyUI `input`/`select`/`textarea`, mostly in the `-bordered` style, at field radius on the base surface.
- **Focus:** daisyUI's outline ring in the field's colour.
- **Error / Disabled:** `input-error` plus a helper message. Disabled fields use daisyUI's muted treatment.
- **Rich text:** item descriptions use the TipTap editor (`ui/rich-text-editor.tsx`).

### Navigation

- **Desktop:** a sticky top bar. On the left is the wordmark: a gavel icon in a 2.5rem indigo-tint tile (it tilts -12° on hover) next to "Auktiva" in indigo → pink gradient text. Ghost `sm` links follow, with icons, at 70% ink, turning indigo with a `primary/10` wash on hover. The admin link is warning-coloured.
- **Mobile:** a fixed bottom tab bar with icon-over-label items, `base-100/95` glass and a top hairline, plus a notification bell with a count badge in the top bar.

### Item Card (signature)

The unit of the whole product. A 12rem image well with a status badge in its top-left corner, a one-line title that turns indigo on hover, a two-line muted description, then a footer with an uppercase "Current bid" label, the mono price (indigo, green when winning, amber when outbid), the bid count and a pink end time. On hover, the image scales to 105% over 500ms and an edit button fades in at the top right.

## Do's and Don'ts

### Do:

- **Do** build on daisyUI semantic classes and tokens (`btn-primary`, `base-content/60`, `badge-success`) so the light, dark and Christmas layers keep working without changes.
- **Do** put a Tabler icon (`icon-[tabler--*]`) next to button and heading labels, sized 1rem in controls and 0.75rem in badges.
- **Do** set every money value in monospace bold, followed by the currency code, coloured by bid state.
- **Do** use soft glass (`base-100/50`, `backdrop-blur-sm`, `border-base-content/5`) for new cards, with a tinted `shadow-lg` on hover.
- **Do** check every new screen in both light and dark themes, and with `data-season="christmas"` on.
- **Do** design the phone layout with the fixed bottom tab bar in mind and leave room for it.

### Don't:

- **Don't** use success, warning or error colours for decoration. They mean bid state.
- **Don't** apply gradient text outside the wordmark and display or hero headlines.
- **Don't** add new grey or brand colour tokens. Use opacity steps on `base-content` and the daisyUI roles.
- **Don't** add a web font. The system stack is part of the system.
- **Don't** let seasonal decoration change layout or block content. It must disappear completely outside its date window.
