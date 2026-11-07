# Local UI fonts

Downloaded from Google Fonts on 2026-11-06. These unmodified WOFF2 files are
bundled by Vite with content hashes; the app makes no Google Fonts requests.
`sources.json` records the source URL, SHA-256 and byte size of every font file.

- **Bricolage Grotesque:** variable weight 200–800, optical size 12–96, normal
  width. Used for headings, brand text and focal prompts, typically at 800.
  [Upstream](https://github.com/ateliertriay/bricolage).
  [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque).
  License: [SIL OFL 1.1](../../../public/font-licenses/bricolagegrotesque-OFL.txt).
- **Be Vietnam Pro:** normal static weights 400, 500, 600, 700, 800 and 900.
  Used for body copy, forms, controls, timers and room codes.
  [Upstream](https://github.com/bettergui/BeVietnamPro).
  [Google Fonts source](https://github.com/google/fonts/tree/main/ofl/bevietnampro).
  License: [SIL OFL 1.1](../../../public/font-licenses/bevietnampro-OFL.txt).

The full copyright and license notices ship in `public/font-licenses` so they
remain available with the deployed fonts at `/font-licenses/`.

`fonts.css` retains Google's Latin and Vietnamese Unicode ranges and uses
`font-display: swap`. Only faces needed by the page download; the system fallback
remains readable while loading or if a font request fails. Other scripts fall
back to system fonts. Italic faces are not bundled; synthetic styles are disabled
by the application's existing `font-synthesis: none` rule.

Source CSS request:

```text
https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap
```
