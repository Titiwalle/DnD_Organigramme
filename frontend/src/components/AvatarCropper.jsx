import { useState, useRef, useEffect } from 'react';

const CROP_SIZE = 260;
const OUTPUT_SIZE = 240;
const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

export default function AvatarCropper({ imageSrc, onCancel, onSave }) {
  const imgRef = useRef(null);
  const [natural, setNatural] = useState(null); // { width, height }
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(null); // { startX, startY, startOffset }

  useEffect(() => {
    const img = new Image();
    img.onload = () => setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = imageSrc;
  }, [imageSrc]);

  const baseScale = natural ? CROP_SIZE / Math.min(natural.width, natural.height) : 1;
  const renderedWidth = natural ? natural.width * baseScale * zoom : 0;
  const renderedHeight = natural ? natural.height * baseScale * zoom : 0;
  const maxOffsetX = Math.max(0, (renderedWidth - CROP_SIZE) / 2);
  const maxOffsetY = Math.max(0, (renderedHeight - CROP_SIZE) / 2);

  function clamp(o, mx, my) {
    return {
      x: Math.min(mx, Math.max(-mx, o.x)),
      y: Math.min(my, Math.max(-my, o.y))
    };
  }

  function handleZoomChange(nextZoomRaw) {
    if (!natural) return;
    const nextZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, nextZoomRaw));
    const nextRenderedWidth = natural.width * baseScale * nextZoom;
    const nextRenderedHeight = natural.height * baseScale * nextZoom;
    const nextMaxX = Math.max(0, (nextRenderedWidth - CROP_SIZE) / 2);
    const nextMaxY = Math.max(0, (nextRenderedHeight - CROP_SIZE) / 2);
    setZoom(nextZoom);
    setOffset((o) => clamp(o, nextMaxX, nextMaxY));
  }

  function handlePointerDown(e) {
    e.preventDefault();
    setDragging({ startX: e.clientX, startY: e.clientY, startOffset: offset });
  }

  useEffect(() => {
    if (!dragging) return;
    function handleMove(e) {
      const dx = e.clientX - dragging.startX;
      const dy = e.clientY - dragging.startY;
      const next = { x: dragging.startOffset.x + dx, y: dragging.startOffset.y + dy };
      setOffset(clamp(next, maxOffsetX, maxOffsetY));
    }
    function handleUp() {
      setDragging(null);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, maxOffsetX, maxOffsetY]);

  function handleSave() {
    if (!natural) return;
    const sourceX = natural.width / 2 - (CROP_SIZE / 2 + offset.x) / (baseScale * zoom);
    const sourceY = natural.height / 2 - (CROP_SIZE / 2 + offset.y) / (baseScale * zoom);
    const sourceSize = CROP_SIZE / (baseScale * zoom);

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgRef.current, sourceX, sourceY, sourceSize, sourceSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    onSave(canvas.toDataURL('image/jpeg', 0.85));
  }

  if (!natural) {
    return (
      <div className="overlay">
        <div className="modal" style={{ maxWidth: 340, textAlign: 'center' }}>
          <p className="modal-sub" style={{ margin: 0 }}>
            Chargement de l'image…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="modal" style={{ maxWidth: 340 }}>
        <h2>Recadrer la photo</h2>
        <p className="modal-sub">Glisse l'image pour la repositionner, ajuste le zoom si besoin.</p>

        <div
          className="cropper-frame"
          style={{ width: CROP_SIZE, height: CROP_SIZE }}
          onPointerDown={handlePointerDown}
        >
          <img
            ref={imgRef}
            src={imageSrc}
            alt=""
            draggable={false}
            style={{
              width: renderedWidth,
              height: renderedHeight,
              transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`
            }}
          />
        </div>

        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step="0.05"
          value={zoom}
          onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
          className="cropper-zoom"
        />

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSave}>
            Utiliser cette photo
          </button>
        </div>
      </div>
    </div>
  );
}
