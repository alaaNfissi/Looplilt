# The Looplilt identity

Looplilt pairs precise motion with a little warmth. The mark is a continuous lowercase loop with a lifted dot: a compact shape that reads at favicon size and leaves room for movement at larger sizes.

## Assets

- [Primary wordmark](../site/assets/logo.svg)
- [Wordmark for dark backgrounds](../site/assets/logo-light.svg)
- [Standalone mark](../site/assets/mark.svg)
- [App icon and favicon](../site/assets/icon.svg)
- [Repository cover](../site/assets/banner.svg)
- [Social preview](../site/assets/social-card.png)
- [PNG favicon](../site/assets/favicon.png) and [touch icon](../site/assets/apple-touch-icon.png)

All vector assets are editable SVG, drawn for Looplilt. They use no external images or font downloads. The wordmark uses the system Arial/Helvetica stack; geometry carries the identity even where font rendering varies.

| Color | Hex | Role |
| --- | --- | --- |
| Deep green | `#102D29` | Wordmark, headings, dark surfaces |
| Warm paper | `#F5F0E6` | Main canvas |
| Spring | `#D5ED74` | Motion accents and contrast on dark surfaces |
| Apricot | `#FF956F` | The lifted dot and story details |
| Lilac | `#B9AEDB` | Secondary illustration accents |

Leave at least one dot's width around the mark. Preserve its proportions. Use the light wordmark on dark surfaces and the dark wordmark on paper. Keep small text in deep green or warm paper; accent colors are primarily for shapes and surfaces.

The site uses short, interruptible motion. Autoplay previews are muted, can be paused, and remain still when reduced motion is requested. Essential content and navigation work without animation.

## Rebuild the raster assets

With the browser dependency installed, render the editable SVG artwork into a new folder:

```sh
node scripts/render-brand.mjs --out output/brand
```

This creates the social card, favicon, and touch icon with the same geometry as the SVG sources. Review the results before copying them into `site/assets`.

Copyright © 2026 Alaa Nfissi. Assets are covered by the repository's MIT license.
