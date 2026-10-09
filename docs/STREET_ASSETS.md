# Street Edition: image assets

Created with OpenAI image generation for this project. Generated originals were converted to WebP for delivery. These are editorial/demo assets, not photographs of verified merchant stock. No externally hosted photo URLs are needed.

## Prompt direction

Shared product direction: premium monochrome studio product photography, square canvas, off-white seamless background, realistic fabric/material texture, soft natural shadows, clean centered composition, no third-party logos or watermark. Individual subjects:

| File | Subject |
|---|---|
| `tee-black.webp` | Oversized washed black crew-neck T-shirt, front view |
| `hoodie-gray.webp` | Oversized heather gray pullover hoodie |
| `cargo-black.webp` | Black wide-leg cargo pants with utility pockets |
| `sweatshirt.webp` | Black graphic crew-neck sweatshirt with 404 design |
| `sneaker.webp` | Minimal white low-top street sneaker |
| `cap.webp` | Washed black baseball cap, subtle XIII lettering |
| `bag.webp` | Black technical crossbody bag |
| `chain.webp` | Polished silver curb-link chain |

Hero direction: wide premium black-and-white streetwear editorial; adult Vietnamese male and female models in oversized black clothing and cargos, concrete urban skatepark/bridge, models on right, dark negative space on left for headings, analog grain and subtle paint edging, no text or logos. Delivered as `hero.webp`.

## Final paths

- Hero and all eight products: `apps/web/public/street/`.
- Product copies: `apps/seller/public/street/` and `apps/admin/public/street/`.
- Paint accents: `apps/web/public/street/paint.svg`, a lightweight code-native vector decoration.
- Product legacy redirects: `next.config.mjs` in each of the three frontend apps.

The generated photos replace only the bundled demo visuals. Custom CMS art and seller-uploaded media retain their own URLs. Screenshots of the implementation are in `docs/qa/previews/`.
