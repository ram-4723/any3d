'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { frameIndex, hotspotVisible } from './math';

type Props = { slug: string; mode?: 'drag' | 'scroll' };
type Hotspot = { id: string; name: string; group?: string; frame?: number; x: number; y: number; color?: string; details?: string; source?: string };
type ExplodeHotspot = { id: string; name: string; group?: string; category?: string; color?: string; points: ([number, number] | null)[] };
type Sequence = { count: number; pattern: string; loop?: boolean; startFrame?: number };
type HotspotPhoto = { url: string; sourceUrl: string; credit: string; caption: string };
type CampHotspot = { id: string; name: string; category?: string; details?: string; approx: boolean; offModel?: boolean; image?: HotspotPhoto; points: ([number, number] | null)[] };
type ExcavatorHotspot = { id: string; name: string; category: string; details: string; source: string; points: (string | [number, number] | null)[] };
type HumanHotspot = { id: string; name: string; category: string; details: string; source: string; point: [number, number] };
type Point = [number, number] | null;
const parsePoint = (point: string | [number, number] | null | undefined): Point => { if (Array.isArray(point)) return point; if (typeof point !== 'string') return null; const values = point.trim().split(/[\s,]+/).map(Number); return values.length === 2 && values.every(Number.isFinite) ? [values[0], values[1]] : null; };
type RouteFrame = { frame: number; points: [number, number, number][] };
type CampDetail = { id: string; name: string; altitudeM?: number; altitudeNote?: string; lat?: number; lon?: number; coordsApprox?: boolean; coordsSource?: string; description: string; image?: HotspotPhoto };
type PartDetail = { id: string; category: string; name: { en: string }; desc: { en: string } };
type Manifest = { width: number; height: number; rotate: Sequence & { hotspots?: (CampHotspot | ExcavatorHotspot)[]; route?: { id: string; name: string; frames: RouteFrame[] } }; explode?: Sequence & { labelsFrom?: number; hotspots?: ExplodeHotspot[] }; humanScale?: { image: string; hotspots: HumanHotspot[] }; hotspots?: Hotspot[]; background?: string; credit?: string; credits?: string };

const excavatorPhoto: HotspotPhoto = {
  url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/83/Bagger_288_2012.jpg/960px-Bagger_288_2012.jpg',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Bagger_288_2012.jpg',
  credit: 'Pappnaas666 · CC BY-SA 3.0',
  caption: 'Bagger 288 at the Garzweiler open-cast mine, Germany',
};

export default function FrameViewer({ slug, mode = 'drag' }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const campCardRef = useRef<HTMLElement>(null);
  const images = useRef<(HTMLImageElement | undefined)[]>([]);
  const lastDrawnImage = useRef<HTMLImageElement | null>(null);
  const requestFrame = useRef<(index: number) => void>(() => {});
  const position = useRef(0);
  const zoomFactor = useRef(1);
  const panPosition = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [allFramesLoaded, setAllFramesLoaded] = useState(false);
  const [exploded, setExploded] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [humanScale, setHumanScale] = useState(false);
  const [explodeDirection, setExplodeDirection] = useState<1 | -1 | 0>(0);
  const [missing, setMissing] = useState(false);
  const [activeHotspot, setActiveHotspot] = useState<string | null>(null);
  const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);
  const [campsRoute, setCampsRoute] = useState(false);
  const [campDetails, setCampDetails] = useState<CampDetail[] | null>(null);
  const [partDetails, setPartDetails] = useState<PartDetail[]>([]);
  const [activeCamp, setActiveCamp] = useState<string | null>(null);
  const [hoveredCamp, setHoveredCamp] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [inView, setInView] = useState(false);
  const [viewFrame, setViewFrame] = useState(0);
  const count = humanScale ? 1 : exploded ? manifest?.explode?.count ?? 0 : manifest?.rotate.count ?? 1;
  const maxZoom = slug === 'porsche-992-gt3r' && humanScale ? 6 : 3;
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
    const current = images.current[humanScale ? 0 : frameIndex(position.current, count)];
    const img = current?.complete && current.naturalWidth ? current : lastDrawnImage.current;
    ctx.fillStyle = manifest?.background || '#10101b';
    ctx.fillRect(0, 0, r.width, r.height);
    if (!img?.complete || !img.naturalWidth) return;
    if (img === current) lastDrawnImage.current = img;
    const scale = Math.min(r.width / img.naturalWidth, r.height / img.naturalHeight) * zoomFactor.current;
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    ctx.drawImage(img, (r.width - w) / 2 + panPosition.current.x, (r.height - h) / 2 + panPosition.current.y, w, h);
  }, [count, manifest, humanScale]);
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
    setManifest(null); setMissing(false); setReady(false); setAllFramesLoaded(false); setProgress(0); setExploded(false); setExplodeDirection(0); setShowLabels(false); setHumanScale(false); setActiveHotspot(null); setHoveredHotspot(null); setViewFrame(0); zoomFactor.current = 1; setZoom(1); panPosition.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }); lastDrawnImage.current = null;
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
    if (slug !== 'bmw-s1000rr' && slug !== 'sa342m-gazelle') {
      setPartDetails([]);
      return;
    }
    let cancelled = false;
    fetch(`/objects/${slug}/${slug}.json`)
      .then(response => response.ok ? response.json() as Promise<{ parts?: PartDetail[] }> : Promise.reject())
      .then(data => { if (!cancelled) setPartDetails(data.parts ?? []); })
      .catch(() => { if (!cancelled) setPartDetails([]); });
    return () => { cancelled = true; };
  }, [slug]);

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
    requestFrame.current = () => {};
    setReady(false); setAllFramesLoaded(false); setProgress(0);
    const sequence = humanScale && manifest.humanScale ? { count: 1, pattern: manifest.humanScale.image } : exploded ? manifest.explode : manifest.rotate;
    if (!sequence) { setExploded(false); return; }
    const total = sequence.count, arr: (HTMLImageElement | undefined)[] = new Array(total);
    images.current = arr;
    const pending = new Map<number, Promise<void>>();
    const load = (i: number) => {
      if (arr[i]) return Promise.resolve();
      const existing = pending.get(i);
      if (existing) return existing;
      const promise = new Promise<void>(resolve => {
        const im = new Image();
        im.onload = () => {
          if (cancelled) { resolve(); return; }
          arr[i] = im;
          if (frameIndex(position.current, total) === i) drawRef.current();
          resolve();
        };
        im.onerror = () => resolve();
        im.src = `/objects/${slug}/${sequence.pattern.replace('{0000}', String(i + 1).padStart(4, '0'))}`;
      });
      pending.set(i, promise);
      return promise;
    };
    requestFrame.current = index => { void load(index); };
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
    return () => { cancelled = true; requestFrame.current = () => {}; };
  }, [manifest, exploded, humanScale, slug, draw, inView]);

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
        setViewFrame(frameIndex(position.current, count)); requestFrame.current(frameIndex(position.current, count)); draw();
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
    if (humanScale) { drag.current = { x, y }; return; }
    const next = position.current + dx / 7;
    position.current = exploded ? Math.max(explodeStart, Math.min(count - 1, next)) : (next + count) % count;
    drag.current = { x, y };
    setViewFrame(frameIndex(position.current, count)); requestFrame.current(frameIndex(position.current, count)); draw();
  };
  const end = () => { drag.current = null; };
  const current = viewFrame;
  const hotspots: Hotspot[] = humanScale
    ? (manifest?.humanScale?.hotspots ?? []).map(point => ({ id: point.id, name: point.name, group: point.category, x: point.point[0], y: point.point[1], color: '#f0444e', details: point.details, source: point.source }))
    : (slug === 'excavator' || slug === 'porsche-992-gt3r') && !exploded && showLabels
      ? (manifest?.rotate.hotspots ?? []).flatMap((part) => { const point = parsePoint((part as ExcavatorHotspot).points?.[current] as string | [number, number] | null); return point ? [{ id: part.id, name: part.name, group: (part as ExcavatorHotspot).category, x: point[0], y: point[1], color: '#f0444e', details: (part as ExcavatorHotspot).details, source: (part as ExcavatorHotspot).source }] : []; })
    : exploded
    ? (manifest?.explode?.hotspots ?? []).flatMap(part => {
        const point = part.points[current];
        if (current + 1 < (manifest?.explode?.labelsFrom ?? 1) || !point) return [];
        return [{ id: part.id, name: part.name, group: part.category ?? part.group, x: point[0], y: point[1], color: part.color }];
      })
    : (manifest?.hotspots ?? []).filter(h => h.frame === undefined || hotspotVisible(current, h.frame, count));
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
    ? ((manifest?.rotate.hotspots ?? []) as CampHotspot[]).flatMap(pin => {
        const point = pin.points[current];
        return point ? [{ ...pin, x: point[0], y: point[1] }] : [];
      })
    : [];
  const visibleValleyPins = slug === 'valley-of-flowers' && !exploded && showLabels
    ? ((manifest?.rotate.hotspots ?? []) as CampHotspot[]).flatMap(pin => {
        const point = pin.points[current];
        return point ? [{ ...pin, x: point[0], y: point[1] }] : [];
      })
    : [];
  const visibleRoutePoints = campsRoute && slug === 'mount-everest' && !exploded
    ? (manifest?.rotate.route?.frames[current]?.points ?? []).filter(point => point[2] === 1)
    : [];
  const activeCampPin = [...visibleCampPins, ...visibleValleyPins].find(pin => pin.id === activeCamp);
  const activeCampDetails = campDetails?.find(camp => camp.id === activeCamp);
  const activeCampImage = activeCampPin?.image ?? activeCampDetails?.image;
  useLayoutEffect(() => {
    const card = campCardRef.current;
    const viewer = stage.current;
    const pin = activeCampPin;
    if (!card || !viewer || !pin) return;

    const placeCard = () => {
      const bounds = viewer.getBoundingClientRect();
      const anchor = hotspotStyle(pin.x, pin.y);
      const toPixels = (value: string | number, size: number) => typeof value === 'number'
        ? value
        : value.endsWith('%') ? Number.parseFloat(value) * size / 100 : Number.parseFloat(value);
      const anchorX = toPixels(anchor.left, bounds.width);
      const anchorY = toPixels(anchor.top, bounds.height);
      const width = card.offsetWidth;
      const height = card.offsetHeight;
      const left = Math.max(8, Math.min(bounds.width - width - 8, anchorX - width / 2));
      const preferredTop = anchorY > bounds.height / 2 ? anchorY - height - 14 : anchorY + 14;
      const top = Math.max(8, Math.min(bounds.height - height - 8, preferredTop));
      card.style.left = `${left}px`;
      card.style.top = `${top}px`;
      card.style.visibility = 'visible';
    };

    card.style.visibility = 'hidden';
    placeCard();
    const observer = new ResizeObserver(placeCard);
    observer.observe(viewer);
    observer.observe(card);
    return () => observer.disconnect();
  }, [activeCampPin?.id, activeCampPin?.x, activeCampPin?.y, activeCamp, current, zoom, panOffset, manifest]);
  const reset = () => { position.current = 0; setViewFrame(0); setExploded(false); setHumanScale(false); setActiveCamp(null); setShowLabels(false); setExplodeDirection(0); setActiveHotspot(null); setHoveredHotspot(null); zoomFactor.current = 1; setZoom(1); panPosition.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }); draw(); };
  const adjustZoom = (amount: number) => {
    const next = Math.max(1, Math.min(maxZoom, Math.round((zoomFactor.current + amount) * 100) / 100));
    if (next === zoomFactor.current) return;
    zoomFactor.current = next;
    setZoom(next);
    const offset = constrainPan(panPosition.current, next);
    panPosition.current = offset;
    setPanOffset(offset);
    draw();
  };
  const toggleExplode = () => {
    if (!manifest?.explode || humanScale) return;
    setActiveHotspot(null);
    setHoveredHotspot(null);
    if (exploded) setExplodeDirection(-1);
    else { position.current = explodeStart; setViewFrame(explodeStart); setExploded(true); setAllFramesLoaded(false); setExplodeDirection(1); }
  };

  return <div ref={stage} className={`viewer ${mode === 'scroll' ? 'viewer-scroll' : ''}`} aria-label={`${slug} 3D viewer`}>
    <canvas ref={canvas} className={`viewer-canvas ${zoom > 1 ? 'viewer-canvas-zoomed' : ''}`} role="img" aria-label={`Interactive 3D view of ${slug}`} onPointerDown={e => { if (mode === 'drag') { setExplodeDirection(0); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY }; } }} onPointerMove={e => move(e.clientX, e.clientY)} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); setExplodeDirection(0); const next = position.current + (e.key === 'ArrowLeft' ? -1 : 1); position.current = exploded ? Math.max(explodeStart, Math.min(count - 1, next)) : (next + count) % count; setViewFrame(frameIndex(position.current, count)); requestFrame.current(frameIndex(position.current, count)); draw(); } }} tabIndex={0} />
    {missing && <div className="viewer-empty"><span>✦</span><b>3D coming soon</b><small>Frame pack not added yet</small></div>}
    {!missing && <>
      <div className="viewer-tag">↔ {humanScale ? "HUMAN SCALE · 5'10\" (1.78 M)" : exploded ? 'DRAG THROUGH EXPLODED VIEW' : 'DRAG TO ROTATE'} · {humanScale ? 'SCALE REFERENCE' : exploded ? count - explodeStart : count} {humanScale ? '' : 'VIEWS'}</div>
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
          </div>;
        })}
      </>}
      {slug === 'valley-of-flowers' && !exploded && visibleValleyPins.map(pin => {
        const selected = activeCamp === pin.id;
        const alignment = [pin.y < 0.2 && 'camp-label-below', pin.x < 0.16 && 'camp-label-left', pin.x > 0.84 && 'camp-label-right'].filter(Boolean).join(' ');
        return <div className={`camp-marker ${alignment}`} key={pin.id} style={hotspotStyle(pin.x, pin.y)}>
          <button type="button" className="camp-pin-button" aria-label={`${pin.category ?? 'PLACE'}: ${pin.name}${pin.approx ? ', approximate position' : ''}`} aria-expanded={selected} onPointerEnter={() => setHoveredCamp(pin.id)} onPointerLeave={() => setHoveredCamp(null)} onFocus={() => setHoveredCamp(pin.id)} onBlur={() => setHoveredCamp(null)} onClick={() => setActiveCamp(selected ? null : pin.id)}>
            <span className="camp-pin-icon" aria-hidden="true" />
            {selected && <span className="camp-pin-label">{pin.name}{pin.approx && <small>approx.</small>}</span>}
          </button>
        </div>;
      })}
      {activeCampPin && <aside ref={campCardRef} className="camp-info-card viewer-place-card" role="dialog" aria-label={`${activeCampPin.name} details`} style={{ left: 0, top: 0, visibility: 'hidden' }}>
        <button type="button" className="camp-info-close" aria-label="Close place details" onClick={() => setActiveCamp(null)}>×</button>
        {activeCampImage && <figure className="viewer-info-photo"><img src={activeCampImage.url} alt={activeCampImage.caption} loading="lazy"/><a href={activeCampImage.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Photo source: ${activeCampImage.credit}`}>{activeCampImage.credit}<span> ↗</span></a></figure>}
        <small>{activeCampPin.category ?? 'MOUNTAIN ROUTE'}</small>
        <b>{activeCampDetails?.name ?? activeCampPin.name}</b>
        {activeCampDetails?.altitudeM && <strong>{activeCampDetails.altitudeM.toLocaleString()} m <small>ALTITUDE</small></strong>}
        <p>{activeCampDetails?.description ?? activeCampPin.details}</p>
        {activeCampDetails?.altitudeNote && <small>{activeCampDetails.altitudeNote}</small>}
        {activeCampDetails?.coordsApprox && <small>Coordinates approximate · {activeCampDetails.lat?.toFixed(4)}° N, {activeCampDetails.lon?.toFixed(4)}° E</small>}
        {activeCampDetails?.coordsSource && <small>Location source: {activeCampDetails.coordsSource}</small>}
        {activeCampPin.approx && !activeCampDetails && <small>Approximate position</small>}
        {activeCampPin.offModel && <small>Shown at model edge, true direction</small>}
      </aside>}
      {hotspots.map(h => {
        const alignment = [h.y < 0.16 && 'hotspot-below', h.x < 0.12 && 'hotspot-align-left', h.x > 0.88 && 'hotspot-align-right'].filter(Boolean).join(' ');
        const selected = activeHotspot === h.id, hovered = hoveredHotspot === h.id;
        return <button key={h.id} type="button" className={'hotspot ' + (slug === 'excavator' ? 'excavator-hotspot ' : '') + alignment} style={hotspotStyle(h.x, h.y)} onPointerEnter={() => setHoveredHotspot(h.id)} onPointerLeave={() => setHoveredHotspot(null)} onFocus={() => setHoveredHotspot(h.id)} onBlur={() => setHoveredHotspot(null)} onClick={() => { if (selected) { setActiveHotspot(null); setHoveredHotspot(null); } else setActiveHotspot(h.id); }} aria-label={h.name} aria-pressed={selected}>{(slug === 'excavator' || slug === 'porsche-992-gt3r') && <span className="camp-pin-icon" aria-hidden="true"/>}{(selected || hovered) && <span className="hotspot-label" role="tooltip">{h.group && <small>{h.group}</small>}{h.name}</span>}</button>;
      })}
      {(slug === 'excavator' || slug === 'porsche-992-gt3r') && activeHotspot && (() => { const item = humanScale ? manifest?.humanScale?.hotspots.find(point => point.id === activeHotspot) : manifest?.rotate.hotspots?.find(point => point.id === activeHotspot) as ExcavatorHotspot | undefined; if (!item) return null; return <aside className="part-info-card" role="dialog" aria-label={`${item.name} details`}><button type="button" className="camp-info-close" aria-label="Close part details" onClick={() => setActiveHotspot(null)}>×</button>{slug === 'excavator' && <figure className="viewer-info-photo"><img src={excavatorPhoto.url} alt={excavatorPhoto.caption} loading="lazy"/><a href={excavatorPhoto.sourceUrl} target="_blank" rel="noreferrer">{excavatorPhoto.credit}<span> ↗</span></a></figure>}<small>{item.category}</small><b>{item.name}</b><p>{item.details}</p><a href={item.source} target="_blank" rel="noreferrer">↗ Source</a></aside>; })()}
      {activeHotspot && partDetails.length > 0 && (() => {
        const part = partDetails.find(item => item.id === activeHotspot);
        if (!part) return null;
        return <aside className="part-info-card" role="dialog" aria-label={`${part.name.en} details`}>
          <button type="button" className="camp-info-close" aria-label="Close part details" onClick={() => setActiveHotspot(null)}>×</button>
          <small>{part.category}</small><b>{part.name.en}</b><p>{part.desc.en}</p>
        </aside>;
      })()}
      {(manifest?.credit || (slug === 'valley-of-flowers' && manifest?.credits)) && <a className="viewer-credit" href={slug === 'valley-of-flowers' || slug === 'excavator' || slug === 'porsche-992-gt3r' ? `/objects/${slug}/CREDITS.md` : slug === 'sa342m-gazelle' ? 'https://sketchfab.com/3d-models/sa342m-gazelle-2eb65cec2060459085ea4f06db44d668' : 'https://sketchfab.com/3d-models/bmw-s1000-rr-1873aed292d6465694119bd81860a0c2'} target="_blank" rel="noreferrer">{manifest?.credit ?? manifest?.credits}</a>}
      {(!ready || (exploded && explodeDirection !== 0 && !allFramesLoaded)) && <div className="viewer-loading"><span>{exploded && explodeDirection !== 0 ? 'PREPARING EXPLODED VIEW' : 'LOADING OBJECT'}</span><i><b style={{ width: `${progress}%` }} /></i></div>}
    </>}
    <div className="viewer-controls">
      {(slug === 'excavator' || slug === 'porsche-992-gt3r') && <><button type="button" className={`viewer-action excavator-label-toggle ${showLabels ? 'viewer-action-active' : ''}`} disabled={humanScale} aria-pressed={showLabels} onClick={() => { setShowLabels(value => !value); setActiveHotspot(null); setHoveredHotspot(null); }}>Labels</button><button type="button" className={`viewer-action excavator-human-toggle ${humanScale ? 'viewer-action-active' : ''}`} aria-pressed={humanScale} onClick={() => { setHumanScale(value => !value); setActiveHotspot(null); setHoveredHotspot(null); zoomFactor.current = 1; setZoom(1); panPosition.current = { x: 0, y: 0 }; setPanOffset({ x: 0, y: 0 }); }}>Human 5'10"</button></>}
      {slug === 'mount-everest' ? <button type="button" className={`viewer-action ${campsRoute ? 'viewer-action-active' : ''}`} aria-pressed={campsRoute} title="Toggle camps and climbing route" onClick={() => { setCampsRoute(value => !value); setActiveCamp(null); setHoveredCamp(null); }}>Camps &amp; Route</button> : slug === 'valley-of-flowers' ? <button type="button" className={`viewer-action ${showLabels ? 'viewer-action-active' : ''}`} aria-pressed={showLabels} title="Toggle place markers" onClick={() => { setShowLabels(value => !value); setActiveCamp(null); setHoveredCamp(null); }}>Labels</button> : slug === 'porsche-992-gt3r' ? null : <button type="button" className="viewer-action" disabled={!manifest?.explode} title={exploded ? 'Assemble parts' : 'Explode view'} onClick={toggleExplode}>{exploded ? (explodeDirection === -1 ? 'Assembling…' : 'Assemble parts') : 'Explode view'}</button>}
      <div className="viewer-zoom-group" role="group" aria-label="Zoom controls">
        <button type="button" aria-label="Zoom out" title="Zoom out" disabled={zoom <= 1} onClick={() => adjustZoom(-0.25)}>−</button>
        <span aria-live="polite">{Math.round(zoom * 100)}%</span>
        <button type="button" aria-label="Zoom in" title="Zoom in" disabled={zoom >= maxZoom} onClick={() => adjustZoom(0.25)}>+</button>
      </div>
      <button type="button" className="viewer-action" onClick={reset}>Reset</button>
      <button type="button" className="viewer-icon" aria-label="Fullscreen" title="Fullscreen" onClick={() => stage.current?.requestFullscreen()}>⛶</button>
    </div>
  </div>;
}
