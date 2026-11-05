/**
 * Decorative line art fixed in two corners of the window (top right, bottom left),
 * fading out toward the middle so it never sits behind text. Colours and strength
 * come from the theme tokens in styles.css.
 */

// A set of near-parallel lines; each one is offset a little more than the last, which gives the contour look.
function ribbon(count: number, line: (i: number) => string) {
  return Array.from({ length: count }, (_, i) => <path key={i} d={line(i)} />)
}

export function BackgroundLines() {
  return (
    <div className="bg-lines" aria-hidden="true">
      {/* Top right: contour arcs radiating from the corner. */}
      <svg className="bg-corner tr" viewBox="0 0 600 600" fill="none">
        <defs>
          <radialGradient id="bg-lines-glow" cx="1" cy="0" r="0.9">
            <stop offset="0" style={{ stopColor: 'var(--accent)', stopOpacity: 0.16 }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <rect width="600" height="600" fill="url(#bg-lines-glow)" />
        <g className="lines" stroke="currentColor" strokeWidth="1">
          {ribbon(16, (i) => {
            const r = 110 + i * 30
            // The centre drifts slightly with each ring, so the arcs aren't perfectly concentric.
            const cx = 600 + i * 4
            const cy = -i * 3
            return `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx} ${cy + r}`
          })}
        </g>
        <path className="accent-line" strokeWidth="1.5" strokeLinecap="round" d="M 350 0 A 250 250 0 0 0 600 250" />
      </svg>

      {/* Bottom left: flowing curves from the left edge down to the bottom edge. */}
      <svg className="bg-corner bl" viewBox="0 0 600 600" fill="none">
        <g className="lines" stroke="currentColor" strokeWidth="1">
          {ribbon(16, (i) => {
            const y = 120 + i * 22
            const x = 260 + i * 22
            return `M 0 ${y} C ${110 + i * 8} ${y + 90}, ${x - 150} ${600 - 140 + i * 4}, ${x} 600`
          })}
        </g>
        <path className="accent-line" strokeWidth="1.5" strokeLinecap="round" d="M 0 274 C 166 364, 262 488, 414 600" />
      </svg>
    </div>
  )
}
