export default function LoadingSpinner() {
  return (
    <div className="flex flex-col justify-center items-center py-16">
      <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>

        {/* Outermost slow rotating tick ring */}
        <div className="absolute inset-0" style={{ animation: 'ls-spin-slow 10s linear infinite' }}>
          <svg viewBox="0 0 140 140" className="w-full h-full" overflow="visible">
            {Array.from({ length: 32 }).map((_, i) => {
              const angle = (i * 360) / 32
              const isMajor = i % 8 === 0
              const r = 68
              const tickLen = isMajor ? 8 : 4
              const rad = (angle * Math.PI) / 180
              const x1 = 70 + r * Math.sin(rad)
              const y1 = 70 - r * Math.cos(rad)
              const x2 = 70 + (r - tickLen) * Math.sin(rad)
              const y2 = 70 - (r - tickLen) * Math.cos(rad)
              return (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke={isMajor ? 'rgba(212,175,55,0.8)' : 'rgba(212,175,55,0.25)'}
                  strokeWidth={isMajor ? 1.5 : 1}
                />
              )
            })}
          </svg>
        </div>

        {/* Gold spinner arc */}
        <div className="absolute" style={{
          inset: 8, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#D4AF37',
          borderRightColor: 'rgba(212,175,55,0.3)',
          filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.7))',
          animation: 'ls-spin 1.1s cubic-bezier(0.4,0,0.2,1) infinite',
        }} />

        {/* Crimson counter-arc */}
        <div className="absolute" style={{
          inset: 16, borderRadius: '50%',
          border: '2px solid transparent',
          borderBottomColor: '#9A2E40',
          borderLeftColor: 'rgba(154,46,64,0.25)',
          filter: 'drop-shadow(0 0 5px rgba(122,30,44,0.6))',
          animation: 'ls-spin 0.75s linear infinite reverse',
        }} />

        {/* Inner thin gold ring */}
        <div className="absolute" style={{
          inset: 26, borderRadius: '50%',
          border: '1px solid transparent',
          borderTopColor: 'rgba(212,175,55,0.5)',
          animation: 'ls-spin 1.8s linear infinite',
        }} />

        {/* Ambient glow halo */}
        <div className="absolute -inset-3 rounded-full pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 65%)',
          animation: 'ls-breathe 2.4s ease-in-out infinite',
        }} />

        {/* Logo */}
        <div className="relative z-10" style={{ animation: 'ls-breathe 2.4s ease-in-out infinite' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" width={72} height={72} draggable={false}
            style={{ animation: 'ls-glow 2.4s ease-in-out infinite' }}
          />
        </div>
      </div>

      {/* Dot pulse bar */}
      <div className="flex items-center gap-1 mt-3">
        {[0,1,2,3,4].map(i => (
          <span key={i} className="rounded-full" style={{
            width: i === 2 ? 7 : 3,
            height: i === 2 ? 7 : 3,
            background: i === 2 ? '#D4AF37' : 'rgba(212,175,55,0.3)',
            animation: `ls-dot 1.3s ease-in-out ${i * 0.11}s infinite`,
          }} />
        ))}
      </div>

      <style>{`
        @keyframes ls-spin      { to { transform: rotate(360deg); } }
        @keyframes ls-spin-slow { to { transform: rotate(360deg); } }
        @keyframes ls-breathe {
          0%,100% { opacity:.7;  transform:scale(0.97); }
          50%      { opacity:1;   transform:scale(1.03); }
        }
        @keyframes ls-glow {
          0%,100% { filter:drop-shadow(0 0 8px rgba(212,175,55,0.4)) drop-shadow(0 0 20px rgba(212,175,55,0.12)); }
          50%      { filter:drop-shadow(0 0 18px rgba(212,175,55,0.8)) drop-shadow(0 0 40px rgba(212,175,55,0.28)); }
        }
        @keyframes ls-dot {
          0%,80%,100% { transform:scale(1);   opacity:.35; }
          40%          { transform:scale(1.8); opacity:1;   }
        }
      `}</style>
    </div>
  )
}