# Snip design language

Borrowed look: dark, minimal, generous, with a full-viewport warm gradient glow behind the hero and a large pill chat-style input as the centerpiece.

## Tokens

- Background: `#08090d` page base; top glow uses coral/pink/orange with a little blue-violet depth.
- Surface: `rgba(255,255,255,.07)` cards; `rgba(255,255,255,.11)` elevated controls; `rgba(255,255,255,.16)` hover/focus.
- Text: `#fff7f0` primary; `#c8bfbc` muted; `#8d8588` subtle.
- Accent gradient: `linear-gradient(90deg, #ff7a45, #ff4fb8, #7c5cff)`; use for primary action and active details.
- Type: `Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`.
- Scale: hero `clamp(3rem, 9vw, 7rem)` / 0.92 line-height; section title `1.05rem`; body `1rem`; metadata `0.8rem`.
- Spacing: page `clamp(48px, 8vw, 96px) 20px`; hero gap `18px`; card gap `22px`; control padding `18px 22px`.
- Radius: chat input and primary button `999px`; cards `28px`; notices `18px`; table rows `16px`.
- Border: `1px solid rgba(255,255,255,.12)`; focus ring `0 0 0 4px rgba(255, 103, 144, .18)`.
- Shadow/glow: cards `0 24px 80px rgba(0,0,0,.34)`; top glow is `position: fixed; left: 0; right: 0; pointer-events: none`.

## Snip mapping

- Page header: centered hero with one bold headline and a short muted subline.
- URL form: large pill chat-style input with the primary action attached on the right.
- Result notice: compact rounded success surface with the generated short link as the highlight.
- Error notice: compact rounded warm-danger surface below the input.
- Links table: rounded glass card with subtle borders, spacious rows, and accent-colored link codes.
