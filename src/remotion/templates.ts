export const MONEY_RAIN_TEMPLATE = `import { useCurrentFrame, interpolate, AbsoluteFill, random } from 'remotion';

const TOTAL = 28;
const COINS = Array.from({ length: TOTAL }, function(_, i) {
  return {
    id: i,
    x: random('x-' + i) * 88 + 4,
    delay: Math.floor(random('delay-' + i) * 70),
    speed: 0.5 + random('speed-' + i) * 1.3,
    size: 34 + random('size-' + i) * 34,
    emoji: ['💰', '💵', '💴', '💶', '🪙', '💸'][Math.floor(random('emoji-' + i) * 6)],
  };
});

export default function MoneyRain() {
  var frame = useCurrentFrame();

  return (
    <AbsoluteFill
      style={{
        background: 'linear-gradient(160deg, #0f0c29 0%, #302b63 50%, #1a1a2e 100%)',
        overflow: 'hidden',
      }}
    >
      {COINS.map(function(coin) {
        var elapsed = Math.max(0, frame - coin.delay);
        var y = interpolate(
          elapsed * coin.speed,
          [0, 160],
          [-12, 115],
          { extrapolateRight: 'clamp' }
        );
        var opacity = interpolate(
          elapsed,
          [0, 10, 120, 145],
          [0, 1, 1, 0],
          { extrapolateRight: 'clamp' }
        );
        var rotate = interpolate(elapsed, [0, 150], [0, 360 * (coin.speed > 1 ? 2 : 1)]);

        return (
          <div
            key={coin.id}
            style={{
              position: 'absolute',
              left: coin.x + '%',
              top: y + '%',
              opacity: opacity,
              fontSize: coin.size,
              transform: 'rotate(' + rotate + 'deg)',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            {coin.emoji}
          </div>
        );
      })}

      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          width: '100%',
          textAlign: 'center',
          color: '#FFD700',
          fontSize: 84,
          fontWeight: 900,
          fontFamily: 'system-ui, sans-serif',
          textShadow: '0 0 60px rgba(255,215,0,0.85), 0 4px 24px rgba(0,0,0,0.6)',
          letterSpacing: '-3px',
        }}
      >
        💸 MONEY RAIN 💸
      </div>
    </AbsoluteFill>
  );
}
`;
