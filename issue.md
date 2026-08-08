# Homepage GSAP & Performance Issues

## 1. GSAP ScrollTrigger "Stuck" Issue (Pinning Miscalculation)
**Location:** `components/providers/SmoothScroll.tsx`, `Services.tsx`, `Showcase.tsx`
**Issue:** Pinned sections (Services and Showcase) get completely stuck or jump abruptly. This happens because Next.js `next/image` loads images asynchronously, shifting the document height *after* GSAP has calculated the start/end pin markers.
**Fix:** We need to observe DOM/image loading and call `ScrollTrigger.refresh()` in `SmoothScroll.tsx`, and ensure `ResizeObserver` is connected.

## 2. Canvas Background Lag (Constant CPU/GPU usage)
**Location:** `components/sections/Services.tsx`
**Issue:** The particle background uses a `requestAnimationFrame` loop that runs continuously, even when the Services section is not visible on the screen. This causes severe frame drops and lagging ("legs").
**Fix:** Wrap the canvas render loop in an `IntersectionObserver` so it only computes when the section is actually in the viewport.

## 3. CSS/GSAP Conflict in Showcase (Jitter & Lag)
**Location:** `components/sections/Showcase.tsx`
**Issue:** GSAP scales the `width`, `height`, and `borderRadius` from thumbnail to fullscreen. If there are native CSS transitions (`transition: all`) applied to the same element in the global CSS, GSAP and CSS fight for control, causing severe jittering.
**Fix:** Ensure `will-change: transform, width, height` is applied, and remove native CSS transitions on GSAP-animated properties. Also, animate `scale` and `transform` where possible instead of `width`/`height` for better performance.

## 4. Missing Hardware Acceleration
**Location:** `Works.tsx`, `Showcase.tsx`
**Issue:** Parallax and scaling elements do not have hardware acceleration hints (`will-change`, `force3D`), leading to repaint lags on some devices.
**Fix:** Add `force3D: true` to GSAP animations and apply `will-change: transform` to heavily animated layers.
