import { useState, useEffect } from 'react';

const FACE = '/thetas-face.png';
const SPEAK = '/thetas-speak.png';
const COMPLEX = '/thetas-complex.png';

export default function Mascot() {
  const [mode, setMode] = useState('idle'); // idle | talking | clicked
  const [mouthOpen, setMouthOpen] = useState(false);

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

  let src = FACE;
  if (mode === 'clicked') src = COMPLEX;
  else if (mode === 'talking' && mouthOpen) src = SPEAK;

  const stateClass = mode === 'talking' ? 'mascot-talking' : mode === 'clicked' ? 'mascot-clicked' : '';

  return <img src={src} alt="Thêtas" className={`mascot ${stateClass}`} onClick={() => setMode('clicked')} />;
}
