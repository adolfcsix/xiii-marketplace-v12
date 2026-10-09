# XIII Street Edition v14 — button feedback

Buyer web buttons now share a consistent interaction response: a small lift and raised shadow on mouse hover, a quick 65ms press response, and a smooth release. Existing selected colors, SKU selection, navigation and cart handlers remain responsible for their actual behavior.

The product add-to-cart and buy-now controls expose `aria-busy` while the existing cart write is pending. A loading indicator accompanies the existing pending text; disabled controls retain their existing duplicate-submission protection. Coarse-pointer controls for wishlist, bag, header icons, gallery navigation, quantity and sizes have at least a 44px touch target.

The shared stylesheet uses CSS transitions and individual translate/scale properties, so it composes with existing transform-based 3D effects. It adds no pointer listeners, dependencies, idle rendering loops or layout movement. The spinner runs only during a pending write. Hover lift requires a fine pointer. The motion toggle and system reduced-motion preference disable the new movement; keyboard focus remains visible.

Validation for this update: 16 Chromium browser scenarios covering hover/press, keyboard selection, persisted motion preference, slow cart writes, duplicate attempts, narrow touch layouts, gallery/swipe, cart flight, quick view and outfit actions. Buyer production build and TypeScript checks also pass. Browser tests use local catalog fixtures and software rendering; physical-device frame rate was not measured. Other applications and backend behavior are preserved from v13.
