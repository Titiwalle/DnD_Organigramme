import { useState, useEffect } from 'react';

const FACE = '/thetas-face.png';
const SPEAK = '/thetas-speak.png';
const COMPLEX = '/thetas-complex.png';

export default function Mascot({ config }) {
  const [mode, setMode] = useState('idle'); // idle | talking | clicked
  const [mouthOpen, setMouthOpen] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [overlayState, setOverlayState] = useState(null); // état temporisé actif : talking | clicked | null

  useEffect(() => {
    let timeoutId;
    let intervalId;

    if (mode === 'idle') {
      const delay = 2000 + Math.random() * 5000;
      timeoutId = setTimeout(() => setMode('talking'), delay);
    } else if (mode === 'talking') {
      let ticks = 0;
      const maxTicks = 6 + Math.floor(Math.random() * 4);
      intervalId = setInterval(() => {
        setMouthOpen((v) => !v);
        ticks += 1;
        if (ticks >= maxTicks) {
          setMode('idle');
        }
      }, 220);
    } else if (mode === 'clicked') {
      timeoutId = setTimeout(() => setMode('idle'), 200);
    }

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      setMouthOpen(false);
    };
  }, [mode]);

  // Ne se déclenche qu'à la TRANSITION vers "talking"/"clicked" (une fois par cycle), pas à
  // chaque battement de bouche — d'où la dépendance sur `mode` seul, pas `mouthOpen`.
  useEffect(() => {
    if ((mode === 'talking' || mode === 'clicked') && config[mode]) {
      setOverlayState(mode);
      const duration = (config[mode].duration || 2) * 1000;
      const timer = setTimeout(() => {
        setOverlayState((current) => (current === mode ? null : current));
      }, duration);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const activeState = overlayState || (hovering && config.hover ? 'hover' : null);
  const override = activeState ? config[activeState] : null;
  const sizePercent = override?.size || 100;

  // La mascotte elle-même garde toujours ses propres images/animations, quoi qu'il arrive.
  const src = mode === 'clicked' ? COMPLEX : mode === 'talking' && mouthOpen ? SPEAK : FACE;
  const stateClass = mode === 'talking' ? 'mascot-talking' : mode === 'clicked' ? 'mascot-clicked' : '';

  return (
    <div className="mascot-anchor">
      {override && (
        <div className="mascot-overlay">
          {override.type === 'image' ? (
            <img
              src={override.value}
              alt=""
              className="mascot-overlay-image"
              style={{ width: `${(160 * sizePercent) / 100}px` }}
            />
          ) : (
            <div
              className="mascot-overlay-text"
              style={{ color: override.color || 'var(--text)', fontSize: `${(14 * sizePercent) / 100}px` }}
            >
              {override.value}
            </div>
          )}
        </div>
      )}
      <img
        src={src}
        alt="Thêtas"
        className={`mascot ${stateClass}`}
        onClick={() => setMode('clicked')}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />
    </div>
  );
}
