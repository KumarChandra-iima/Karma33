# Karma28 — Cross-Platform UI Planning

How to get from one React codebase to a desktop website, an Android app, and
an iOS app that feel like one product — without building three separate UIs.

---

## 1. The core decision: one codebase, two shells, not three apps

The fastest path to "common mobile experience, Android or iOS" is to make
that an automatic consequence of architecture rather than something you have
to manually keep in sync:

- **Mobile (Android + iOS):** wrap the existing React app in **Capacitor**
  (already on your roadmap — see memory of the earlier business-strategy
  discussion). Capacitor takes the same components, same CSS, same state
  logic, and ships it inside a native shell with access to native APIs
  (camera, notifications, mic permissions handled properly, app store
  presence). Because Android and iOS run the *literal same component tree*,
  there's no "make sure both match" step — they can't drift apart.
- **Desktop website:** the same React app, served as a normal responsive
  website, with a second layout mode that activates above a breakpoint.

This means you maintain **one design system and one component library**,
not three. The mockup I built shows exactly this: the phone screens for
Android and iOS in it are generated from the identical HTML — proving the
point rather than just asserting it.

The alternative — fully native Swift for iOS and Kotlin for Android — gives
slightly more native polish but means every UI change has to be built three
times and can drift. Not recommended unless a specific platform feature
forces it later (e.g. deep Health app integration on iOS).

---

## 2. How the layout switch actually works

Two signals, checked together:

```js
const isNativeApp = Capacitor.isNativePlatform(); // true inside the Android/iOS shell
const isWideScreen = window.matchMedia('(min-width: 1024px)').matches;

const layout = isNativeApp || !isWideScreen ? 'mobile' : 'desktop';
```

- Inside the Capacitor shell, `isNativeApp` is always true → always mobile
  layout, regardless of how big the phone screen is (a tablet running the
  Android app should still get the mobile shell, not the desktop one — the
  *platform*, not the pixel width, is the real signal there).
- On the plain website, there's no Capacitor — so it falls through to a
  pure viewport-width check, which is what lets a desktop browser get the
  rich layout and a phone browser visiting the same URL get the mobile one.

This check happens once, high in the component tree (`App.jsx`), and the
result picks between two top-level layout components. Everything below that
— the practice cards, the calendar, the streak rows — stays exactly the same
component, just arranged differently by its parent.

---

## 3. What actually changes between the two layouts

This is the part the mockup makes concrete. Nothing about *what* the app
does changes — only how much of it is visible at once and how it's arranged:

| Element | Mobile shell | Desktop shell |
|---|---|---|
| Navigation | Top tab row (Yoga/Weight/Speak) | Left sidebar, same 3 items + Calendar + Settings as their own destinations |
| Today's practice | A card you tap into | A hero banner with the action always visible |
| 4 Yoga practice cards | Stacked, full width | 2×2 grid |
| Calendar | Current month only, scroll for others | Full month grid, no scroll, more breathing room per cell |
| Streaks / schedule | Inline, part of the scroll | Persistent right-hand rail, always visible |
| Practice player (Surya/Kriya/etc.) | Full-screen, one phase at a time | Same full-screen player, just capped to a centered max-width column — a breathing/mantra screen doesn't benefit from being 1400px wide |

The rule of thumb: **components don't get redesigned for desktop, they get
re-arranged.** A `BreathRing` or a practice card looks the same in both; only
the grid around it changes.

---

## 4. Recommended build sequence

1. **Mockup (this step)** — agree on the two layouts at a glance, before
   touching real code. ✅ done — see `karma28-platform-mockup.html`.
2. **Extract the design tokens** — the `buildTheme()` / `tabCfg` objects
   already in `App.jsx` are most of this. Formalize them into a single
   `tokens.js` (colors, spacing scale, radii, font sizes) imported by every
   component, so "desktop" and "mobile" are never out of sync on color or
   type.
3. **Build the desktop shell** — a `DesktopLayout` component (sidebar + main
   + right rail) that renders the *same* practice/calendar/streak components
   used today, just in the new grid. The mobile layout you already have
   becomes `MobileLayout`.
4. **Add the breakpoint/platform switch** in `App.jsx` (the code in §2).
5. **Capacitor wrap** — `npx cap init`, `npx cap add android`, `npx cap add
   ios`. At this point Android and iOS are "free" — same build, two native
   shells.
6. **Platform-specific polish (small, optional)** — status bar color,
   splash screen, push notification permission prompts. This is the only
   place Android and iOS code paths differ, and it's a handful of config
   lines, not UI.
7. **Store submission prep** — icons, screenshots (the mockup's phone frames
   are a good starting point for these), privacy policy, App Store /
   Play Store listings.

Steps 2–4 are web work we can keep doing together in this chat. Step 5
onward needs Xcode (iOS, Mac only) and Android Studio — that's local
machine work, or doable via Claude Code if you want an agent driving it
directly in your dev environment rather than back-and-forth in chat.

---

## 5. Open decisions for you

- **Tablet (iPad / Android tablet):** treat as desktop layout (more screen
  to use) or a third "medium" layout? Recommendation: just let it fall into
  the desktop breakpoint — simplest, and the desktop layout already isn't
  ultra-wide-specific.
- **Landscape phone:** mobile layout, unchanged, just reflows naturally
  since it's normal responsive CSS underneath — no special-casing needed.
- **Domain structure for the website** vs the bundle/subscription split
  discussed earlier (single app vs per-bundle domains) — that decision is
  independent of this layout work and can be slotted in later without
  rework.
