/**
 * Decorative line art fixed behind every page: two bundles of flowing curves and
 * one amber accent line. Colours and strength come from the theme tokens in styles.css.
 */

// A ribbon of near-parallel curves; each line is offset a little more than the last, which gives the contour look.
function ribbon(count: number, line: (i: number) => string) {
  return Array.from({ length: count }, (_, i) => <path key={i} d={line(i)} />)
}

export function BackgroundLines() {
  return (
    <div className="bg-lines" aria-hidden="true">
      <svg viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" fill="none">
        <defs>
          <radialGradient id="bg-lines-glow">
            <stop offset="0" style={{ stopColor: 'var(--accent)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        <circle className="glow" cx="1180" cy="80" r="420" fill="url(#bg-lines-glow)" />

        <g className="lines" stroke="currentColor" strokeWidth="1">
          {/* Sweeps across the top, dipping in the middle. */}
          {ribbon(18, (i) => {
            const y = 40 + i * 14
            return `M -80 ${y} C 320 ${y - 120 + i * 4}, 760 ${y + 300 - i * 6}, 1520 ${y + 20 + i * 3}`
          })}
          {/* Curls in from the right edge and back out. */}
          {ribbon(14, (i) => {
            const x = 1500 - i * 6
            return `M ${x} ${-40 + i * 18} C ${1120 - i * 10} ${180 + i * 12}, ${1180 - i * 4} ${520 + i * 8}, ${x} ${780 + i * 10}`
          })}
          {/* A looser bundle low on the left. */}
          {ribbon(10, (i) => {
            const y = 560 + i * 20
            return `M -60 ${y} C 220 ${y - 160}, 480 ${y + 140}, 860 ${y - 40 - i * 6}`
          })}
        </g>

        <path
          className="accent-line" strokeWidth="1.5" strokeLinecap="round"
          d="M -80 166 C 320 82, 760 412, 1520 194"
        />
      </svg>
    </div>
  )
}
