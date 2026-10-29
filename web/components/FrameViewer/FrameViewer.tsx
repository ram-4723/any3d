'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { frameIndex, hotspotVisible } from './math';

type Props = { slug: string; mode?: 'drag' | 'scroll' };
type Hotspot = { id: string; name: string; group?: string; frame: number; x: number; y: number; color: string };
type ExplodeHotspot = { id: string; name: string; group: string; color: string; points: ([number, number] | null)[] };
type Sequence = { count: number; pattern: string; loop?: boolean; startFrame?: number };
type CampHotspot = { id: string; name: string; approx: boolean; offModel?: boolean; points: ([number, number] | null)[] };
type RouteFrame = { frame: number; points: [number, number, number][] };
type CampDetail = { id: string; name: string; altitudeM?: number; altitudeNote?: string; lat?: number; lon?: number; coordsApprox?: boolean; coordsSource?: string; description: string };
type Manifest = { width: number; height: number; rotate: Sequence & { hotspots?: CampHotspot[]; route?: { id: string; name: string; frames: RouteFrame[] } }; explode?: Sequence & { labelsFrom?: number; hotspots?: ExplodeHotspot[] }; hotspots?: Hotspot[]; background?: string };

export default function FrameViewer({ slug, mode = 'drag' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const images = useRef<(HTMLImageElement | undefined)[]>([]);
  const position = useRef(0);
  const zoomFactor = useRef(1);
  const panPosition = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [allFramesLoaded, setAllFramesLoaded] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [explodeDirection, setExplodeDirection] = useState<1 | -1 | 0>(0);
  const [missing, setMissing] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [campsRoute, setCampsRoute] = useState(false);
  const [campDetails, setCampDetails] = useState<CampDetail[] | null>(null);
  const [activeCamp, setActiveCamp] = useState<string | null>(null);
  const [hoveredCamp, setHoveredCamp] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);
  const [viewFrame, setViewFrame] = useState(0);
  const count = exploded ? manifest?.explode?.count ?? 0 : manifest?.rotate.count ?? 1;
  const explodeStart = Math.max(0, Math.min(count - 1, (manifest?.explode?.startFrame ?? 1) - 1));

  const draw = useCallback(() => {
    const c = canvas.current, ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = window.devicePixelRatio || 1, r = c.getBoundingClientRect();
    if (!r.width || !r.height) return;
    if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) {
      c.width = Math.round(r.width * dpr);
      c.height = Math.round(r.height * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = manifest?.background || '#10101b';
    ctx.fillRect(0, 0, r.width, r.height);
    const img = images.current[frameIndex(position.current, count)];
    if (img?.complete && img.naturalWidth) {
      const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight) * zoomFactor.current;
      const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      ctx.drawImage(img, (r.width - w) / 2 + panPosition.current.x, (r.height - h) / 2 + panPosition.current.y, w, h);
    }
  }, [count, manifest]);
  const drawRef = useRef(draw);
  drawRef.current = draw;

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const observer = new IntersectionObserver(entries => setInView(entries[0]?.isIntersecting ?? false), { rootMargin: '160px' });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    setManifest(null); setMissing(false); setReady(false); setAllFramesLoaded(false); setProgress(0); setExploded(false); setExplodeDirection(0); setActiveHotspot(null); setHoveredHotspot(null); setViewFrame(0); zoomFactor.current = 1; setZoom(1); panPosition.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 });
    position.current = 0; images.current = [];
    const poster = new Image();
    poster.onload = () => { if (!cancelled) { images.current[0] = poster; drawRef.current(); } };
    poster.src = `/objects/${slug}/poster.webp`;
    fetch(`/objects/${slug}/manifest.json`).then(r => {
      if (!r.ok) throw new Error();
      return r.json() as Promise<Manifest>;
    }).then(m => { if (!cancelled) setManifest(m); }).catch(() => { if (!cancelled) setMissing(true); });
    return () => { cancelled = true; };
  }, [slug, inView]);

  useEffect(() => {
    if (slug !== 'mount-everest' || !campsRoute) {
      setActiveCamp(null);
      return;
    }
    let cancelled = false;
    fetch('/objects/mount-everest/everest.json')
      .then(response => {
        if (!response.ok) throw new Error('Everest camp information is unavailable');
        return response.json() as Promise<{ pins: CampDetail[] }>;
      })
      .then(data => { if (!cancelled) setCampDetails(data.pins); })
      .catch(() => { if (!cancelled) setCampDetails([]); });
    return () => { cancelled = true; };
  }, [slug, campsRoute]);

  useEffect(() => {
    if (!inView) { images.current = []; return; }
    if (!manifest) return;
    let cancelled = false;
    setReady(false); setAllFramesLoaded(false); setProgress(0);
    const sequence = exploded ? manifest.explode : manifest.rotate;
    if (!sequence) { setExploded(false); return; }
    const total = sequence.count, arr: (HTMLImageElement | undefined)[] = new Array(total);
    images.current = arr;
    const load = (i: number) => new Promise<void>(resolve => {
      const im = new Image();
      im.onload = () => { arr[i] = im; resolve(); };
      im.onerror = () => resolve();
      im.src = `/objects/${slug}/${sequence.pattern.replace('{0000}', String(i + 1).padStart(4, '0'))}`;
    });
    void (async () => {
      const initial = [...new Set([0, frameIndex(position.current, total)])];
      await Promise.all(initial.map(load));
      if (cancelled) return;
      setProgress(Math.round(initial.length * 100 / total)); draw();
      const coarse = Array.from({ length: total }, (_, i) => i).filter(i => i % 8 === 0 && i !== 0 && !arr[i]);
      await Promise.all(coarse.map(load));
      if (cancelled) return;
      setReady(true); setProgress(Math.round((initial.length + coarse.length) * 100 / total)); draw();
      for (let start = 1; start < total; start += 12) {
        await Promise.all(Array.from({ length: Math.min(12, total - start) }, (_, n) => start + n).filter(i => !arr[i]).map(load));
        if (cancelled) return;
        setProgress(Math.min(100, Math.round(Math.min(total, start + 12) * 100 / total))); draw();
      }
      if (cancelled) return;
      setProgress(100); setAllFramesLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [manifest, exploded, slug, draw, inView]);

  useEffect(() => {
    if (!exploded || explodeDirection === 0 || !allFramesLoaded) return;
    let raf = 0;
    const start = position.current;
    const target = explodeDirection > 0 ? count - 1 : explodeStart;
    const distance = Math.abs(target - start);
    const duration = Math.max(700, distance * 25);
    const began = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - began) / duration);
      const eased = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      const frame = Math.round(start + (target - start) * eased);
      position.current = frame;
      setViewFrame(frame);
      draw();
      if (progress < 1) { raf = requestAnimationFrame(step); return; }
      setExplodeDirection(0);
      if (explodeDirection < 0) { position.current = 0; setViewFrame(0); setExploded(false); }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [exploded, explodeDirection, allFramesLoaded, count, draw, explodeStart]);
  useEffect(() => {
    draw();
    const ro = new ResizeObserver(draw);
    if (canvas.current) ro.observe(canvas.current);
    return () => ro.disconnect();
  }, [draw]);

  useEffect(() => {
    if (mode !== 'scroll' || !ready) return;
    const fn = () => {
      const r = stage.current?.getBoundingClientRect();
      if (r) {
        position.current = Math.max(0, Math.min(1, (window.innerHeight - r.top) / (window.innerHeight + r.height))) * Math.max(0, count - 1);
        setViewFrame(frameIndex(position.current, count)); draw();
      }
    };
    window.addEventListener('scroll', fn, { passive: true }); fn();
    return () => window.removeEventListener('scroll', fn);
  }, [mode, ready, count, draw]);

  const constrainPan = (offset: { x: number; y: number }, scale = zoomFactor.current) => {
    const r = canvas.current?.getBoundingClientRect();
    if (!r || !manifest) return { x: 0, y: 0 };
    const fit = Math.min(r.width / manifest.width, r.height / manifest.height);
    const maxX = Math.max(0, (manifest.width * fit * scale - r.width) / 2);
    const maxY = Math.max(0, (manifest.height * fit * scale - r.height) / 2);
    return { x: Math.max(-maxX, Math.min(maxX, offset.x)), y: Math.max(-maxY, Math.min(maxY, offset.y)) };
  };
  const move = (x: number, y: number) => {
    if (!drag.current) return;
    const dx = x - drag.current.x;
    const dy = y - drag.current.y;
    if (zoomFactor.current > 1) {
      const offset = constrainPan({ x: panPosition.current.x + dx, y: panPosition.current.y + dy });
      panPosition.current = offset;
      drag.current = { x, y };
      setPanOffset(offset);
      draw();
      return;
    }
    const next = position.current + dx / 7;
    position.current = exploded ? Math.max(explodeStart, Math.min(count - 1, next)) : (next + count) % count;
    drag.current = { x, y };
    setViewFrame(frameIndex(position.current, count)); draw();
  };
  const end = () => { drag.current = null; };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setExplodeDirection(0);
        const next = position.current + (e.key === 'ArrowLeft' ? -1 : 1);
        position.current = exploded ? Math.max(explodeStart, Math.min(count - 1, next)) : (next + count) % count;
        setViewFrame(frameIndex(position.current, count)); draw();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [count, draw, exploded, explodeStart]);

  const current = viewFrame;
  const hotspots = exploded
    ? (manifest?.explode?.hotspots ?? []).flatMap(part => {
        const point = part.points[current];
        if (current + 1 < (manifest?.explode?.labelsFrom ?? 1) || !point) return [];
        return [{ id: part.id, name: part.name, group: part.group, x: point[0], y: point[1], color: part.color }];
      })
    : (manifest?.hotspots ?? []).filter(h => hotspotVisible(current, h.frame, count));
  const hotspotStyle = (x: number, y: number) => {
    const r = canvas.current?.getBoundingClientRect();
    if (!r || !manifest) return { left: `${x * 100}%`, top: `${y * 100}%` };
    const scale = Math.min(r.width / manifest.width, r.height / manifest.height) * zoomFactor.current;
    const imageWidth = manifest.width * scale, imageHeight = manifest.height * scale;
    return { left: `${(r.width - imageWidth) / 2 + panOffset.x + x * imageWidth}px`, top: `${(r.height - imageHeight) / 2 + panOffset.y + y * imageHeight}px` };
  };
  const imageBounds = (() => {
    const r = canvas.current?.getBoundingClientRect();
    if (!r || !manifest) return { left: 0, top: 0, width: '100%', height: '100%' };
    const scale = Math.min(r.width / manifest.width, r.height / manifest.height) * zoomFactor.current;
    const width = manifest.width * scale, height = manifest.height * scale;
    return { left: (r.width - width) / 2 + panOffset.x, top: (r.height - height) / 2 + panOffset.y, width, height };
  })();
  const visibleCampPins = campsRoute && slug === 'mount-everest' && !exploded
    ? (manifest?.rotate.hotspots ?? []).flatMap(pin => {
        const point = pin.points[current];
        return point ? [{ ...pin, x: point[0], y: point[1] }] : [];
      })
    : [];
  const visibleRoutePoints = campsRoute && slug === 'mount-everest' && !exploded
    ? (manifest?.rotate.route?.frames[current]?.points ?? []).filter(point => point[2] === 1)
    : [];
  const reset = () => { position.current = 0; setViewFrame(0); setExploded(false); setExplodeDirection(0); setActiveHotspot(null); setHoveredHotspot(null); zoomFactor.current = 1; setZoom(1); panPosition.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }); draw(); };
  const adjustZoom = (amount: number) => {
    const next = Math.max(1, Math.min(3, Math.round((zoomFactor.current + amount) * 100) / 100));
    if (next === zoomFactor.current) return;
    zoomFactor.current = next;
    setZoom(next);
    const offset = constrainPan(panPosition.current, next);
    panPosition.current = offset;
    setPanOffset(offset);
    draw();
  };
  const toggleExplode = () => {
    if (!manifest?.explode) return;
    setActiveHotspot(null);
    setHoveredHotspot(null);
    if (exploded) setExplodeDirection(-1);
    else { position.current = explodeStart; setViewFrame(explodeStart); setExploded(true); setAllFramesLoaded(false); setExplodeDirection(1); }
  };

  return <div ref={stage} className={`viewer ${mode === 'scroll' ? 'viewer-scroll' : ''}`} aria-label={`${slug} 3D viewer`}>
    <canvas ref={canvas} className={`viewer-canvas ${zoom > 1 ? 'viewer-canvas-zoomed' : ''}`} role="img" aria-label={`Interactive 3D view of ${slug}`} onPointerDown={e => { if (mode === 'drag') { setExplodeDirection(0); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; } }} onPointerMove={e => move(e.clientX, e.clientY)} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} tabIndex={0} />
    {missing && <div className="viewer-empty"><span>✦</span><b>3D coming soon</b><small>Frame pack not added yet</small></div>}
    {!missing && <>
      <div className="viewer-tag">↔ {exploded ? 'DRAG THROUGH EXPLODED VIEW' : 'DRAG TO ROTATE'} · {exploded ? count - explodeStart : count} VIEWS</div>
      {campsRoute && slug === 'mount-everest' && !exploded && <>
        <svg className="camp-route-line" aria-label={manifest?.rotate.route?.name ?? 'Everest climbing route'} style={imageBounds} viewBox={`0 0 ${manifest?.width ?? 1600} ${manifest?.height ?? 900}`} preserveAspectRatio="none">
          <polyline points={visibleRoutePoints.map(([x, y]) => `${x * (manifest?.width ?? 1600)},${y * (manifest?.height ?? 900)}`).join(' ')} />
        </svg>
        {visibleCampPins.map(pin => {
          const details = campDetails?.find(camp => camp.id === pin.id);
          const selected = activeCamp === pin.id;
          const alignment = [pin.y < 0.2 && 'camp-label-below', pin.x < 0.16 && 'camp-label-left', pin.x > 0.84 && 'camp-label-right'].filter(Boolean).join(' ');
          return <div className={`camp-marker ${alignment}`} key={pin.id} style={hotspotStyle(pin.x, pin.y)}>
            <button type="button" className="camp-pin-button" aria-label={`Show details for ${pin.name}${pin.approx ? ', approximate location' : ''}`} aria-expanded={selected} onPointerEnter={() => setHoveredCamp(pin.id)} onPointerLeave={() => setHoveredCamp(null)} onFocus={() => setHoveredCamp(pin.id)} onBlur={() => setHoveredCamp(null)} onClick={() => setActiveCamp(selected ? null : pin.id)}>
              <span className="camp-pin-icon" aria-hidden="true" />
              {hoveredCamp === pin.id && <span className="camp-pin-label">{pin.name}{pin.approx && <small>approx.</small>}</span>}
            </button>
            {selected && <aside className="camp-info-card" role="dialog" aria-label={`${pin.name} details`}>
              <button type="button" className="camp-info-close" aria-label="Close camp details" onClick={() => setActiveCamp(null)}>×</button>
              <b>{details?.name ?? pin.name}</b>
              {details?.altitudeM && <strong>{details.altitudeM.toLocaleString()} m <small>ALTITUDE</small></strong>}
              {details?.description && <p>{details.description}</p>}
              {details?.altitudeNote && <small>{details.altitudeNote}</small>}
              {details?.coordsApprox && <small>Coordinates approximate · {details.lat?.toFixed(4)}° N, {details.lon?.toFixed(4)}° E</small>}
              {details?.coordsSource && <small>Location source: {details.coordsSource}</small>}
            </aside>}
          </div>;
        })}
      </>}
      {hotspots.map(h => {
        const alignment = [h.y < 0.16 && 'hotspot-below', h.x < 0.12 && 'hotspot-align-left', h.x > 0.88 && 'hotspot-align-right'].filter(Boolean).join(' ');
        const selected = activeHotspot === h.id, hovered = hoveredHotspot === h.id;
        return <button key={h.id} type="button" className={'hotspot ' + alignment} style={hotspotStyle(h.x, h.y)} onPointerEnter={() => setHoveredHotspot(h.id)} onPointerLeave={() => setHoveredHotspot(null)} onFocus={() => setHoveredHotspot(h.id)} onBlur={() => setHoveredHotspot(null)} onClick={() => { if (selected) { setActiveHotspot(null); setHoveredHotspot(null); } else setActiveHotspot(h.id); }} aria-label={h.name} aria-pressed={selected}>{(selected || hovered) && <span className="hotspot-label" role="tooltip">{h.group && <small>{h.group}</small>}{h.name}</span>}</button>;
      })}
      {(!ready || (exploded && explodeDirection !== 0 && !allFramesLoaded)) && <div className="viewer-loading"><span>{exploded && explodeDirection !== 0 ? 'PREPARING EXPLODED VIEW' : 'LOADING OBJECT'}</span><i><b style={{ width: `${progress}%` }} /></i></div>}
    </>}
    <div className="viewer-controls">
      {slug === 'mount-everest' ? <button type="button" className={`viewer-action ${campsRoute ? 'viewer-action-active' : ''}`} aria-pressed={campsRoute} title="Toggle camps and climbing route" onClick={() => { setCampsRoute(value => !value); setActiveCamp(null); setHoveredCamp(null); }}>Camps &amp; Route</button> : <button type="button" className="viewer-action" disabled={!manifest?.explode} title={exploded ? 'Assemble parts' : 'Explode view'} onClick={toggleExplode}>{exploded ? (explodeDirection === -1 ? 'Assembling…' : 'Assemble parts') : 'Explode view'}</button>}
      <div className="viewer-zoom-group" role="group" aria-label="Zoom controls">
        <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 1} onClick={() => adjustZoom(-0.25)}>−</button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= 3} onClick={() => adjustZoom(0.25)}>+</button>
      </div>
      <button type="button" className="viewer-action" onClick={reset}>Reset</button>
      <button type="button" className="viewer-icon" aria-label="Fullscreen" title="Fullscreen" onClick={() => stage.current?.requestFullscreen()}>⛶</button>
    </div>
  </div>;
}
