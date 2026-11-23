---
topics: [stepped-audits-micro-fixes]
---

# Plugin styles from Figma

The [Design Passport reference](https://www.figma.com/design/M9E3vBjYh7o1Y8TOyVanro/Design-Passport?node-id=56-220) supplies the plugin's visual values. Read nodes `1:2` (Audit), `13:485` (Report), `16:1112` (expanded issues), and `13:1034` (saved results) before changing their presentation. The file has no local variable collections, text styles, or paint styles. CSS custom properties in `src/ui/styles.css` share its literal values; they are not published Figma tokens.

## Grade geometry and typography

The report grade uses a 100×100px square, 4px corners, Inter Black at 39.6px for the letter, and Inter Regular at 16.6px for the score. The saved-result badge uses a 40×40px square, 4px corners, and Inter Black at 23.6px. Letter spacing is -1%. The saved score sits beside the badge at 15.6px and weight 500, inside a 58px-high preview with 9px corners.

Keep shared grade styles compact and use `.report-grade` for the large report treatment. A later general `.grade` rule previously overrode the saved badge's width and height. Report scores use two decimal places without a visible denominator, with an accessible label preserving the out-of-100 meaning. Stale readiness still appears explicitly.

The card uses a 24px inset, 20px gaps between report sections, and a 20px gap beside the grade. Cleanup text uses Inter Semi Bold at 12px. Category scores use primary Report node `13:485`'s bright green/red palette and white 9px text in both collapsed and expanded states. Expanded examples contain inconsistent badge variants; preserve the primary reference appearance and the decision recorded in [the earlier grade styling journal](../journal/2026-10-07-figma-grade-style-parity.md).

## Verification limits

Chromium checks rendered geometry and text styles at 320, 456, and 500px, including the saved-result badge and the large report grade. They retain exact known Axe contrast failures for 40% inactive navigation labels and white score-pill text. Do not describe literal style parity as accessibility compliance.

The [initial styling journal](../journal/2026-10-07-figma-navigation-styles.md) records the earlier native bundle. The [grade correction journal](../journal/2026-10-07-figma-grade-card-parity.md) records the subsequent browser checks and native access limit. Dynamic report content, additional categories, required notices, and retained advanced controls vary with actual audit data; the design's example data does not override audit behavior.

## Companion styles

The companion follows the Cumulative style guide for palette, type, spacing,
and motion. It uses Aeonik and Aeonik Fono when the licensed variable fonts are
available locally. Place `AeonikVF-Regular.ttf` and
`AeonikFonoVF-Regular.ttf` in `apps/companion/public/fonts/`. Keep the font
files out of Git. The existing system fallbacks load when those files are absent.

Use the shared four-pixel spacing scale for companion layout. Single-select
controls reserve space for their inset chevrons and use native arrows in
forced-colors mode. Keep page headings task-based. The Cumulative signal mark
indicates route and request loading. Content enters as it reaches the viewport.
A reduced-motion preference keeps the mark and content still.
