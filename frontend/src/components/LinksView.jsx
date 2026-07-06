import { useState, useEffect, useRef } from 'react';
import { api } from '../api.js';
import { ClassIcon } from '../icons.jsx';
import ConfirmModal from './ConfirmModal.jsx';

const FAMILY = new Set(['Parent', 'Enfant', 'Grand-parent', 'Petit-enfant', 'Frère/Sœur', 'Oncle/Tante', 'Neveu/Nièce', 'Cousin/Cousine']);
const POSITIVE = new Set(['Allié', 'Ami', 'Mentor', 'Élève']);

function colorFor(type) {
  if (FAMILY.has(type)) return 'var(--gold-bright)';
  if (POSITIVE.has(type)) return 'var(--teal-bright)';
  if (type === 'Rival') return 'var(--burgundy-bright)';
  return 'var(--text-dim)';
}

function relationLabel(r) {
  return r.type === 'Autre' && r.typeCustom ? r.typeCustom : r.type;
}

function entityValue(kind, id) {
  return `${kind}:${id}`;
}

function splitEntityValue(v) {
  const idx = v.indexOf(':');
  return { kind: v.slice(0, idx), id: v.slice(idx + 1) };
}

const CLUSTER_COLORS = ['var(--gold-bright)', 'var(--teal-bright)', 'var(--burgundy-bright)', '#8f7fe0', '#e0954a'];
function clusterColor(i) {
  return CLUSTER_COLORS[i % CLUSTER_COLORS.length];
}

const VIEW_W = 800;
const VIEW_H = 760;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

export default function LinksView({ characters, relationTypes, showToast }) {
  const svgRef = useRef(null);
  const wrapRef = useRef(null);
  const overridesRef = useRef({});
  const [containerWidth, setContainerWidth] = useState(800);
  const [relations, setRelations] = useState([]);
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [type, setType] = useState('');
  const [typeCustom, setTypeCustom] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [dragging, setDragging] = useState(null);
  const [clusterDragging, setClusterDragging] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    refresh();
    api.getCanvasLayout().then(setOverrides).catch(() => {});
  }, []);

  useEffect(() => {
    overridesRef.current = overrides;
  }, [overrides]);

  useEffect(() => {
    if (!type && relationTypes.length > 0) setType(relationTypes[0]);
  }, [relationTypes]);

  function refresh() {
    api.getRelations().then(setRelations).catch((e) => showToast(e.message));
  }

  function persistLayout() {
    api.saveCanvasLayout(overridesRef.current).catch((e) => showToast(e.message));
  }

  async function handleResetLayout() {
    try {
      await api.resetCanvasLayout();
      setOverrides({});
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
    } catch (err) {
      showToast(err.message);
    }
  }

  const groups = (() => {
    const map = new Map();
    characters.forEach((c) => {
      const nom = (c.affectationNom || '').trim();
      const key = `${c.affectationType}|${nom.toLowerCase()}`;
      const label = nom || c.affectationType;
      if (!map.has(key)) map.set(key, { key, label, members: [] });
      map.get(key).members.push(c);
    });
    return Array.from(map.values());
  })();

  const layout = (() => {
    const M = groups.length;
    const CX = VIEW_W / 2;
    const CY = VIEW_H / 2 + 20;
    const clusterOrbit = M > 1 ? Math.min(220, 120 + M * 12) : 0;

    const clusters = groups.map((g, gi) => {
      const angle = (2 * Math.PI * gi) / Math.max(M, 1) - Math.PI / 2;
      const cx = CX + clusterOrbit * Math.cos(angle);
      const cy = CY + clusterOrbit * Math.sin(angle);
      const n = g.members.length;
      const memberOrbit = n > 1 ? Math.min(75, 34 + n * 9) : 0;

      const nodes = g.members.map((c, mi) => {
        const mAngle = (2 * Math.PI * mi) / Math.max(n, 1) - Math.PI / 2;
        return {
          nodeKey: entityValue('character', c.id),
          id: c.id,
          name: c.name,
          classe: c.classe,
          avatar: c.avatar,
          role: c.role,
          x: cx + memberOrbit * Math.cos(mAngle),
          y: cy + memberOrbit * Math.sin(mAngle)
        };
      });

      return { key: g.key, label: g.label, nodes };
    });

    return { clusters, nodes: clusters.flatMap((c) => c.nodes) };
  })();

  const nodeById = Object.fromEntries(layout.nodes.map((n) => [n.nodeKey, n]));

  function pos(nodeKey) {
    const base = nodeById[nodeKey];
    if (!base) return null;
    const o = overrides[nodeKey];
    return o ? { ...base, x: o.x, y: o.y } : base;
  }

  const liveClusters = layout.clusters.map((g) => {
    const livePositions = g.nodes.map((n) => pos(n.nodeKey));
    const cx = livePositions.reduce((s, p) => s + p.x, 0) / livePositions.length;
    const cy = livePositions.reduce((s, p) => s + p.y, 0) / livePositions.length;
    const maxDist = Math.max(30, ...livePositions.map((p) => Math.hypot(p.x - cx, p.y - cy)));
    return { key: g.key, label: g.label, nodes: g.nodes, cx, cy, radius: maxDist + 50 };
  });
  const clusterByKey = Object.fromEntries(liveClusters.map((g) => [g.key, g]));

  const viewBox = (() => {
    let minX = 0;
    let minY = 0;
    let maxX = VIEW_W;
    let maxY = VIEW_H;
    layout.nodes.forEach((n) => {
      minX = Math.min(minX, n.x - 40);
      minY = Math.min(minY, n.y - 40);
      maxX = Math.max(maxX, n.x + 40);
      maxY = Math.max(maxY, n.y + 40);
    });
    const PAD = 150; // marge généreuse : absorbe les déplacements normaux sans recalculer le zoom
    return { x: minX - PAD, y: minY - PAD, w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };
  })();

  const effectiveViewBox = { x: viewBox.x + panOffset.x, y: viewBox.y + panOffset.y, w: viewBox.w, h: viewBox.h };

  // Position "brute" d'une extrémité de lien (centre exact pour un personnage, centre du
  // cercle de groupe pour une affectation) — sert à calculer la direction du trait.
  function rawEndpoint(kind, id) {
    if (kind === 'character') {
      const p = pos(entityValue('character', id));
      return p ? { x: p.x, y: p.y, name: p.name } : null;
    }
    const g = clusterByKey[id];
    return g ? { x: g.cx, y: g.cy, name: g.label, radius: g.radius } : null;
  }

  // Point d'accroche réel du trait : pour une affectation, on s'arrête sur le bord du
  // cercle, orienté vers l'autre extrémité (comme un lien entre deux zones).
  function anchorPoint(raw, towardX, towardY) {
    if (!raw.radius) return raw;
    const dx = towardX - raw.x;
    const dy = towardY - raw.y;
    const dist = Math.hypot(dx, dy) || 1;
    return { x: raw.x + (dx / dist) * raw.radius, y: raw.y + (dy / dist) * raw.radius, name: raw.name };
  }

  function svgPointFromEvent(e) {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    return pt.matrixTransform(ctm.inverse());
  }

  function handlePointerDown(e, nodeKey) {
    e.preventDefault();
    e.stopPropagation();
    setDragging(nodeKey);
  }

  function handleClusterPointerDown(e, cluster) {
    e.preventDefault();
    e.stopPropagation();
    const startPoint = svgPointFromEvent(e);
    if (!startPoint) return;
    const startPositions = {};
    cluster.nodes.forEach((n) => {
      startPositions[n.nodeKey] = pos(n.nodeKey);
    });
    setClusterDragging({ startPoint, startPositions });
  }

  function handleBackgroundPointerDown(e) {
    e.preventDefault();
    setPanning({ startClientX: e.clientX, startClientY: e.clientY, startOffset: panOffset });
  }

  useEffect(() => {
    if (!dragging) return;
    function handleMove(e) {
      const p = svgPointFromEvent(e);
      if (!p) return;
      setOverrides((prev) => ({ ...prev, [dragging]: { x: p.x, y: p.y } }));
    }
    function handleUp() {
      setDragging(null);
      persistLayout();
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging]);

  useEffect(() => {
    if (!clusterDragging) return;
    function handleMove(e) {
      const p = svgPointFromEvent(e);
      if (!p) return;
      const dx = p.x - clusterDragging.startPoint.x;
      const dy = p.y - clusterDragging.startPoint.y;
      setOverrides((prev) => {
        const next = { ...prev };
        Object.entries(clusterDragging.startPositions).forEach(([nodeKey, startPos]) => {
          next[nodeKey] = { x: startPos.x + dx, y: startPos.y + dy };
        });
        return next;
      });
    }
    function handleUp() {
      setClusterDragging(null);
      persistLayout();
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterDragging]);

  useEffect(() => {
    if (!panning) return;
    const unitsPerPixel = viewBox.w / (containerWidth * zoom);
    function handleMove(e) {
      const dxPixels = e.clientX - panning.startClientX;
      const dyPixels = e.clientY - panning.startClientY;
      setPanOffset({
        x: panning.startOffset.x - dxPixels * unitsPerPixel,
        y: panning.startOffset.y - dyPixels * unitsPerPixel
      });
    }
    function handleUp() {
      setPanning(null);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panning]);

  async function handleCreate(e) {
    e.preventDefault();
    if (!fromValue || !toValue || fromValue === toValue) {
      showToast('Choisis deux extrémités différentes.');
      return;
    }
    const from = splitEntityValue(fromValue);
    const to = splitEntityValue(toValue);
    try {
      await api.createRelation({
        fromKind: from.kind,
        fromId: from.id,
        toKind: to.kind,
        toId: to.id,
        type,
        typeCustom
      });
      setTypeCustom('');
      refresh();
    } catch (err) {
      showToast(err.message);
    }
  }

  async function handleDelete(id) {
    try {
      await api.deleteRelation(id);
      setConfirm(null);
      refresh();
    } catch (err) {
      showToast(err.message);
    }
  }

  function zoomBy(delta) {
    setZoom((z) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(z + delta).toFixed(2))));
  }

  if (characters.length < 2) {
    return (
      <div className="empty-state">
        <h3>Pas encore assez de compagnons</h3>
        <p>Ajoute au moins deux fiches dans le Registre pour commencer à tisser des liens.</p>
      </div>
    );
  }

  const entityOptions = (
    <>
      <optgroup label="Personnages">
        {characters.map((c) => (
          <option key={`c-${c.id}`} value={entityValue('character', c.id)}>
            {c.name}
          </option>
        ))}
      </optgroup>
      {groups.length > 1 && (
        <optgroup label="Groupes (affectations)">
          {groups.map((g) => (
            <option key={`g-${g.key}`} value={entityValue('affectation', g.key)}>
              {g.label}
            </option>
          ))}
        </optgroup>
      )}
    </>
  );

  return (
    <div>
      <div className="links-toolbar-row">
        <p className="modal-sub" style={{ margin: 0 }}>
          Glisse les cercles ou le fond du canvas pour dégager la vue — ça ne change rien aux
          données, juste l'affichage (ta disposition est mémorisée pour toi).
        </p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={handleResetLayout}>
          Réinitialiser la disposition
        </button>
      </div>
      <div className="links-canvas-wrap" ref={wrapRef}>
        <div className="zoom-controls">
          <button type="button" onClick={() => zoomBy(-ZOOM_STEP)} aria-label="Dézoomer">
            −
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoomer">
            +
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="zoom-reset"
          >
            100%
          </button>
        </div>
        <div className="links-canvas-scroll">
          <svg
            ref={svgRef}
            viewBox={`${effectiveViewBox.x} ${effectiveViewBox.y} ${effectiveViewBox.w} ${effectiveViewBox.h}`}
            width={containerWidth * zoom}
            height={containerWidth * (viewBox.h / viewBox.w) * zoom}
            className={`links-canvas ${panning ? 'is-panning' : ''}`}
          >
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L10 5L0 10Z" fill="var(--text-dim)" />
              </marker>
            </defs>

            <rect
              x={viewBox.x - viewBox.w}
              y={viewBox.y - viewBox.h}
              width={viewBox.w * 3}
              height={viewBox.h * 3}
              fill="transparent"
              className="links-canvas-background"
              onPointerDown={handleBackgroundPointerDown}
            />

            {liveClusters.map((g, i) => (
              <g key={g.key} className="link-cluster" onPointerDown={(e) => handleClusterPointerDown(e, g)}>
                <circle cx={g.cx} cy={g.cy} r={g.radius} fill={clusterColor(i)} fillOpacity="0.1" stroke={clusterColor(i)} strokeOpacity="0.5" strokeWidth="1.2" />
                <text x={g.cx} y={g.cy - g.radius - 10} textAnchor="middle" className="cluster-label" fill={clusterColor(i)}>
                  {g.label}
                </text>
              </g>
            ))}

            {relations.map((r) => {
              const rawA = rawEndpoint(r.fromKind || 'character', r.fromId);
              const rawB = rawEndpoint(r.toKind || 'character', r.toId);
              if (!rawA || !rawB) return null;
              const a = anchorPoint(rawA, rawB.x, rawB.y);
              const b = anchorPoint(rawB, rawA.x, rawA.y);
              const mx = (a.x + b.x) / 2;
              const my = (a.y + b.y) / 2;
              const label = relationLabel(r);
              return (
                <g key={r.id} className="link-edge" onClick={() => setConfirm({ id: r.id, label: `${a.name} — ${label} → ${b.name}` })}>
                  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={colorFor(r.type)} strokeWidth="1.6" markerEnd="url(#arrow)" opacity="0.85" />
                  <rect x={mx - label.length * 3.2 - 5} y={my - 9} width={label.length * 6.4 + 10} height="16" fill="var(--bg)" stroke="var(--border)" rx="3" />
                  <text x={mx} y={my + 3.5} textAnchor="middle" className="link-label" fill={colorFor(r.type)}>
                    {label}
                  </text>
                </g>
              );
            })}

            {layout.nodes.map((base) => {
              const n = pos(base.nodeKey);
              return (
                <g key={n.nodeKey} className="link-node" transform={`translate(${n.x}, ${n.y})`} onPointerDown={(e) => handlePointerDown(e, n.nodeKey)}>
                  <circle r="34" fill="var(--surface)" stroke={n.role === 'Principal' ? 'var(--gold)' : 'var(--teal)'} strokeWidth="1.6" />
                  {n.avatar ? (
                    <foreignObject x="-32" y="-32" width="64" height="64" style={{ pointerEvents: 'none' }}>
                      <img
                        src={n.avatar}
                        alt=""
                        style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </foreignObject>
                  ) : (
                    <foreignObject x="-16" y="-16" width="32" height="32" style={{ pointerEvents: 'none' }}>
                      <div style={{ width: 32, height: 32, color: n.role === 'Principal' ? 'var(--gold)' : 'var(--teal-bright)' }}>
                        <ClassIcon classe={n.classe} />
                      </div>
                    </foreignObject>
                  )}
                  <text y="50" textAnchor="middle" className="link-node-name">
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="link-form-card">
        <h3 className="link-form-title">Créer un lien</h3>
        <form onSubmit={handleCreate} className="link-form">
          <select value={fromValue} onChange={(e) => setFromValue(e.target.value)}>
            <option value="">Choisir…</option>
            {entityOptions}
          </select>
          <span className="link-form-word">est</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {relationTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          {type === 'Autre' && (
            <input type="text" placeholder="précise…" value={typeCustom} onChange={(e) => setTypeCustom(e.target.value)} />
          )}
          <span className="link-form-word">de</span>
          <select value={toValue} onChange={(e) => setToValue(e.target.value)}>
            <option value="">Choisir…</option>
            {entityOptions}
          </select>
          <button type="submit" className="btn btn-primary btn-sm">
            Ajouter
          </button>
        </form>
        {groups.length <= 1 && (
          <p style={{ color: 'var(--text-dim)', fontSize: 12.5, marginTop: 10 }}>
            Il faut au moins deux affectations différentes parmi tes personnages pour pouvoir lier des groupes entre eux.
          </p>
        )}
      </div>

      {relations.length > 0 && (
        <div className="link-list">
          {relations.map((r) => {
            const a = rawEndpoint(r.fromKind || 'character', r.fromId);
            const b = rawEndpoint(r.toKind || 'character', r.toId);
            const label = relationLabel(r);
            return (
              <div key={r.id} className="link-list-row">
                <span>
                  <b>{a ? a.name : '?'}</b> — {label} → <b>{b ? b.name : '?'}</b>
                </span>
                <button onClick={() => setConfirm({ id: r.id, label: `${a ? a.name : '?'} — ${label} → ${b ? b.name : '?'}` })}>
                  Supprimer
                </button>
              </div>
            );
          })}
        </div>
      )}

      {confirm && (
        <ConfirmModal
          message={`Supprimer le lien "${confirm.label}" ?`}
          onConfirm={() => handleDelete(confirm.id)}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}
