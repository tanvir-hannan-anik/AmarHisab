// ─────────────────────────────────────────────────────────────────────────────
// Components / Charts
//
// Hand-rolled SVG donut and bar charts. No charting library — keeps the bundle
// tiny and lets the visuals follow the active palette via CSS variables. Used
// by the dashboard and the budget screen.
// ─────────────────────────────────────────────────────────────────────────────

function DonutChart({ data, size = 200, thickness = 28 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div style={{
        height: size,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#9AA3AC', fontSize: 13,
      }}>কোন তথ্য নেই</div>
    );
  }
  const r = (size - thickness) / 2;
  const cx = size / 2, cy = size / 2;
  const C = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#EDF0F3" strokeWidth={thickness} />
      {data.map((d, i) => {
        const len = (d.value / total) * C;
        const el = (
          <circle key={i}
            cx={cx} cy={cy} r={r}
            fill="none" stroke={d.color}
            strokeWidth={thickness}
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="butt"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

function WeeklyBarChart({ data, height = 220 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{display:'flex', alignItems:'flex-end', gap:14, height, padding:'12px 4px 4px'}}>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - 50);
        const isToday = d.today;
        return (
          <div key={i} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:8}}>
            <div style={{
              fontSize: 11, color: '#6B737C', fontWeight: 600,
              fontFamily: 'Hind Siliguri',
              opacity: d.value ? 1 : .4,
            }}>৳{fmtTk(d.value)}</div>
            <div style={{
              width: '100%', maxWidth: 36,
              height: Math.max(h, 4),
              borderRadius: 8,
              background: isToday
                ? 'linear-gradient(180deg, var(--brand-blue-700), var(--brand-blue-900))'
                : 'linear-gradient(180deg, var(--brand-blue-500), var(--brand-blue-700))',
              boxShadow: isToday ? '0 4px 12px rgba(0,0,0,.18)' : 'none',
              transition: 'all 400ms cubic-bezier(.2,.8,.2,1)',
            }}/>
            <div style={{
              fontSize: 11.5,
              color: isToday ? 'var(--brand-blue-700)' : '#9AA3AC',
              fontWeight: isToday ? 700 : 500,
            }}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

Object.assign(window, { DonutChart, WeeklyBarChart });
