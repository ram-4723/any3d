'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { ObjectEntry } from '@/types/object';
import FrameViewer from '@/components/FrameViewer/FrameViewer';
const heroSequence={hidden:{},visible:{transition:{staggerChildren:.14,delayChildren:.12}}};
const heroRise={hidden:{opacity:0,y:26,filter:"blur(8px)"},visible:{opacity:1,y:0,filter:"blur(0px)",transition:{duration:.72,ease:[.22,1,.36,1] as const}}};
const copy={en:{explore:'Explore the extraordinary',hero:'The world,',line:'in every dimension.',sub:'Spin it. Study it. Discover the details that make everything fascinating.',objects:'objects to explore',browse:'Browse all objects',trending:'THE WORLD IS YOURS TO SPIN',featured:'FEATURED OBJECT',categories:'Pick your universe',cars:'Cars & bikes',machines:'Machines',landmarks:'Landmarks',nature:'Nature',aircraft:'Aircraft',spacecraft:'Spacecraft',popular:'Trending now',view:'EXPLORE OBJECT',search:'Search objects, facts, tags…',sample:'SAMPLE DATA',facts:'Fun facts',specs:'Specs',connections:'Celebrity connections',overview:'Overview',all:'All objects',back:'Back to all objects',source:'source',soon:'3D coming soon',language:'हिंदी'},hi:{explore:'असाधारण दुनिया को खोजें',hero:'दुनिया,',line:'हर आयाम में।',sub:'घुमाएं। जानें। उन बारीकियों को खोजें जो हर चीज़ को दिलचस्प बनाती हैं।',objects:'ऑब्जेक्ट खोजें',browse:'सभी ऑब्जेक्ट देखें',trending:'दुनिया आपकी उंगलियों पर',featured:'चर्चित ऑब्जेक्ट',categories:'अपनी दुनिया चुनें',cars:'कार और बाइक',machines:'मशीनें',landmarks:'स्थल',nature:'प्रकृति',aircraft:'विमान',spacecraft:'अंतरिक्ष यान',popular:'अभी लोकप्रिय',view:'ऑब्जेक्ट देखें',search:'ऑब्जेक्ट, तथ्य, टैग खोजें…',sample:'नमूना डेटा',facts:'रोचक तथ्य',specs:'विशेषताएं',connections:'सेलिब्रिटी संबंध',overview:'अवलोकन',all:'सभी ऑब्जेक्ट',back:'सभी ऑब्जेक्ट पर लौटें',source:'स्रोत',soon:'3D जल्द आ रहा है',language:'English'}};
export function useLanguage(){const [lang,setLang]=useState<'en'|'hi'>('en');useEffect(()=>{const sync=(event:Event)=>{const next=(event as CustomEvent<'en'|'hi'>).detail;if(next==='en'||next==='hi')setLang(next)};const stored=localStorage.getItem('3da-lang');if(stored==='hi')setLang('hi');window.addEventListener('3da-language-change',sync);return()=>window.removeEventListener('3da-language-change',sync)},[]);useEffect(()=>{document.documentElement.lang=lang},[lang]);const toggle=()=>{const next=lang==='en'?'hi':'en';localStorage.setItem('3da-lang',next);setLang(next);window.dispatchEvent(new CustomEvent('3da-language-change',{detail:next}))};return {lang,t:copy[lang],toggle};}
let remoteObjectsRequest:{base:string;promise:Promise<ObjectEntry[]>}|null=null;
export function useRemoteObjects(fallback:ObjectEntry[]){const [items,setItems]=useState(fallback);useEffect(()=>{const base=process.env.NEXT_PUBLIC_API_URL;if(!base)return;if(remoteObjectsRequest?.base!==base){const promise=fetch(`${base}/api/objects`).then(response=>{if(!response.ok)throw new Error('Object service unavailable');return response.json() as Promise<ObjectEntry[]>});remoteObjectsRequest={base,promise};promise.catch(()=>{if(remoteObjectsRequest?.promise===promise)remoteObjectsRequest=null;});}const request=remoteObjectsRequest.promise;let active=true;request.then(data=>{if(active&&Array.isArray(data))setItems([...data,...fallback.filter(item=>!data.some(remote=>remote.slug===item.slug))])}).catch(()=>{});return()=>{active=false}},[fallback]);return items;}
export function Header({objects=[]}:{objects?:ObjectEntry[]}) {
  const {lang,t,toggle}=useLanguage();
  const remoteObjects=useRemoteObjects(objects);
  const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[mobileNavOpen,setMobileNavOpen]=useState(false);
  const searchButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    const key=(e:KeyboardEvent)=>{
      if(e.key==='Escape'){setOpen(false);setQuery('');setMobileNavOpen(false);searchButton.current?.focus();return}
      if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();setMobileNavOpen(false);setOpen(v=>!v)}
    };
    window.addEventListener('keydown',key);
    return()=>window.removeEventListener('keydown',key)
  },[]);
  const normalizedQuery=query.trim().toLowerCase();
  const results=useMemo(()=>normalizedQuery?remoteObjects.filter(o=>!o.sample&&`${o.name.en} ${o.name.hi} ${o.tagline.en} ${o.tagline.hi} ${o.summary.en} ${o.summary.hi} ${o.tags.join(' ')} ${o.specs.map(s=>`${s.label.en} ${s.label.hi} ${s.value} ${s.unit}`).join(' ')} ${o.funFacts.map(f=>`${f.text.en} ${f.text.hi}`).join(' ')}`.toLowerCase().includes(normalizedQuery)):[],[normalizedQuery,remoteObjects]);
  const closeMobileNav=()=>setMobileNavOpen(false);
  return <>
    <header className="topbar">
      <Link href="/" className="brand" onClick={closeMobileNav}><img className="brand-mark" src="/any3d-mark.svg" alt=""/><span>ANYTHING<span className="brand-dot">.</span></span></Link>
      <nav id="main-navigation" className={mobileNavOpen?'mobile-nav-open':''} aria-label="Main navigation">
        <Link href="/objects" onClick={closeMobileNav}>{t.all}</Link>
        <a href="/#universes" onClick={closeMobileNav}>{t.categories}</a>
        <Link href="/compare" onClick={closeMobileNav}>COMPARE</Link>
      </nav>
      <div className="header-right">
        <button ref={searchButton} className="search-trigger" aria-label={t.search} aria-haspopup="dialog" aria-expanded={open} onClick={()=>{setMobileNavOpen(false);setOpen(true)}}>⌕ <span>{t.search}</span><kbd>Ctrl K</kbd></button>
        <button className="lang-switch" aria-label={lang==='en'?'Switch language to Hindi':'Switch language to English'} onClick={toggle}>{t.language}</button>
        <button className="mobile-menu-toggle" type="button" aria-label={mobileNavOpen?'Close menu':'Open menu'} aria-expanded={mobileNavOpen} aria-controls="main-navigation" onClick={()=>setMobileNavOpen(value=>!value)}><span aria-hidden="true">{mobileNavOpen?'×':'☰'}</span></button>
      </div>
    </header>
    {open&&<div className="search-overlay" onClick={()=>{setOpen(false);searchButton.current?.focus()}}><div className="search-box" role="dialog" aria-modal="true" aria-label={t.search} onClick={e=>e.stopPropagation()}><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search} aria-label={t.search}/><button aria-label="Close search" onClick={()=>{setOpen(false);setQuery('');searchButton.current?.focus()}}>ESC</button>{query&&<div className="search-results" aria-live="polite">{results.map(o=><Link href={`/objects/${o.slug}`} key={o.slug} onClick={()=>setOpen(false)}><span>{o.name[lang]}</span><small>{o.category}</small></Link>)}{!results.length&&<p>No matching objects. Try a category, model, or feature.</p>}</div>}</div></div>}
  </>;
}
export function CursorGlow(){
  useEffect(()=>{
    const root=document.documentElement;
    if(!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return;
    let frame=0,x=0,y=0;
    const move=(event:PointerEvent)=>{
      if(event.pointerType==='touch')return;
      x=event.clientX;y=event.clientY;
      if(frame)return;
      frame=window.requestAnimationFrame(()=>{
        frame=0;
        root.style.setProperty('--cursor-x',`${x}px`);
        root.style.setProperty('--cursor-y',`${y}px`);
        root.dataset.cursorActive='true';
      });
    };
    const leave=(event:PointerEvent)=>{if(!event.relatedTarget)root.dataset.cursorActive='false'};
    const hide=()=>{root.dataset.cursorActive='false';delete root.dataset.cursorPressed};
    const down=()=>{root.dataset.cursorPressed='true'};
    const up=()=>{delete root.dataset.cursorPressed};
    window.addEventListener('pointermove',move,{passive:true});
    window.addEventListener('pointerout',leave,{passive:true});
    window.addEventListener('pointerdown',down,{passive:true});
    window.addEventListener('pointerup',up,{passive:true});
    window.addEventListener('blur',hide);
    return()=>{
      if(frame)window.cancelAnimationFrame(frame);
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerout',leave);
      window.removeEventListener('pointerdown',down);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('blur',hide);
      delete root.dataset.cursorActive;
      delete root.dataset.cursorPressed;
      root.style.removeProperty('--cursor-x');
      root.style.removeProperty('--cursor-y');
    };
  },[]);
  return <div className="cursor-aura" aria-hidden="true"/>;
}
function cardBadge(item:ObjectEntry){const rarity=typeof item.rarity==='string'?item.rarity.trim():'';if(rarity&&rarity.length<=28)return rarity;const spec=item.specs[0];return spec?`${spec.value}${spec.unit?` ${spec.unit}`:''}`:'Explore in 360°';}
export function ObjectCard({item}:{item:ObjectEntry}){const {lang,t}=useLanguage();return <motion.div initial={{opacity:0,y:12}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.15}} whileHover={{y:-4}} transition={{duration:.24}}><Link href={`/objects/${item.slug}`} className={`object-card category-${item.category} ${item.hasFramePack?"object-card-framepack":""} ${item.slug==="toyota-gr-supra-a90"?"object-card-truecolor":""}`}><div className="card-art"><div className="card-orb"/><img src={`/objects/${item.slug}/poster.webp`} alt={item.name[lang]} onError={e=>{e.currentTarget.style.display='none'}}/><span className="card-category">{item.category==='spacecraft'?t.spacecraft:item.category.replace('-',' & ')}</span><span className="card-arrow" aria-hidden="true">↗</span></div><div className="card-copy"><div><h3>{item.name[lang]}</h3><p>{item.tagline[lang]}</p></div><span className="rarity" title={typeof item.rarity==='string'?item.rarity:undefined}>✦ {cardBadge(item)}</span></div></Link></motion.div>}
export function Home({objects}:{objects:ObjectEntry[]}){const {lang,t}=useLanguage();const liveObjects=useRemoteObjects(objects).filter(item=>!item.sample);return <><motion.section className="hero" initial="hidden" animate="visible" variants={heroSequence}><motion.div className="hero-glow" initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}} transition={{duration:1.2,ease:"easeOut"}}/><motion.div className="hero-copy" variants={heroRise}><span className="eyebrow"><i/> {t.explore}</span><h1>{t.hero}<br/><em>{t.line}</em></h1><p>{t.sub}</p><div className="hero-actions"><Link className="button-primary" href="/objects">{t.objects}<span>↗</span></Link><span className="hero-count"><b>{liveObjects.length.toString().padStart(2,'0')}</b> / OBJECTS LIVE</span></div><div className="hero-stats"><div><strong>360°</strong><span>INTERACTIVE VIEWS</span></div><div><strong>∞</strong><span>THINGS TO DISCOVER</span></div><div><strong>02</strong><span>LANGUAGES</span></div></div></motion.div><motion.div className="hero-visual" variants={heroRise}><div className="hero-orbit orbit-a"/><div className="hero-orbit orbit-b"/><div className="hero-object"><FrameViewer slug="porsche-992-gt3r" autoRotate/></div><div className="hero-object-label"><span>{t.featured}</span><b>{lang==='en'?'PORSCHE 911 GT3 R':'पोर्श 911 जीटी3 आर'}</b><small>144 FRAMES&nbsp;&nbsp; · &nbsp;&nbsp;360° VIEW</small></div><div className="float-note note-one"><svg className="rotate-prompt-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.7 9A7 7 0 0 1 18 6.5L20 8M4 16l2 1.5A7 7 0 0 0 18.3 15"/></svg><span>ROTATE TO EXPLORE</span></div><div className="float-note note-two">01 / OBJECT</div></motion.div><motion.span className="hero-index" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.9,duration:.7}}>EST. 2025&nbsp; · &nbsp;CURIOUS BY DESIGN</motion.span></motion.section><section id="universes" className="section-wrap"><div className="section-heading"><div><span className="eyebrow">01 — {t.trending}</span><h2>{t.categories}<span className="pink-dot">.</span></h2></div><Link href="/objects" className="text-link">{t.browse} ↗</Link></div><div className="category-row">{[['cars-bikes','01',t.cars,'#ff624d','↗'],['machines','02',t.machines,'#f3c543','⌁'],['nature','03',t.nature,'#61c994','✿'],['aircraft','04',t.aircraft,'#79a7dc','✈']].map(([slug,n,name,color,icon])=><Link href={`/objects?category=${slug}`} className="category-tile" key={slug} style={{'--tile':color} as React.CSSProperties}><span>{n} / CATEGORY</span><b>{name}</b><i>{icon}</i></Link>)}</div></section><section className="section-wrap objects-section"><div className="section-heading"><div><span className="eyebrow">02 — {t.popular}</span><h2>{t.explore}<span className="pink-dot">.</span></h2></div><Link href="/objects" className="text-link">VIEW ALL ↗</Link></div><div className="object-grid">{liveObjects.map(item=><ObjectCard item={item} key={item.slug}/>)}</div></section><footer className="footer"><Link href="/" className="brand"><img className="brand-mark" src="/any3d-mark.svg" alt=""/><span>ANYTHING<span className="brand-dot">.</span></span></Link><span>MADE FOR THE CURIOUS&nbsp; ✳ &nbsp;2026</span><Link href="/objects">EXPLORE ALL OBJECTS ↗</Link></footer></>}
type InsightKind='speed'|'power'|'length'|'height';
type InsightDatum={slug:string;name:string;label:string;value:number;display:string};
type InsightSeries={kind:InsightKind;title:string;unit:string;rows:InsightDatum[]};

const insightDefinitions:{kind:InsightKind;labels:Record<'en'|'hi',string>;unit:string;matches:(label:string)=>boolean}[]=[
  {kind:'speed',labels:{en:'Top speed',hi:'अधिकतम गति'},unit:'km/h',matches:label=>/^top speed/i.test(label)},
  {kind:'power',labels:{en:'Power',hi:'शक्ति'},unit:'hp',matches:label=>/^power(?:\s*\(|$)/i.test(label)},
  {kind:'length',labels:{en:'Body length',hi:'लंबाई'},unit:'m',matches:label=>/\blength\b/i.test(label)},
  {kind:'height',labels:{en:'Peak elevation',hi:'ऊंचाई'},unit:'m',matches:label=>/height/i.test(label)},
];

function parseInsightMetric(spec:ObjectEntry['specs'][number],kind:InsightKind):number|null {
  const raw=String(spec.value)+' '+(spec.unit??'');
  if(kind==='speed'){
    const match=raw.match(/([\d,]+(?:\.\d+)?)\s*(km\/h|mph)\b/i);
    if(!match)return null;
    const value=Number(match[1].replace(/,/g,''));
    return match[2].toLowerCase()==='mph'?value*1.60934:value;
  }
  if(kind==='power'){
    const match=raw.match(/([\d,]+(?:\.\d+)?)\s*(hp|bhp|kw|ps)\b/i);
    if(!match)return null;
    const value=Number(match[1].replace(/,/g,''));
    const unit=match[2].toLowerCase();
    return unit==='kw'?value*1.34102:unit==='ps'?value*0.98632:value;
  }
  const match=raw.match(/([\d,]+(?:\.\d+)?)\s*(mm|cm|m|ft)\b/i);
  if(!match)return null;
  const value=Number(match[1].replace(/,/g,''));
  const unit=match[2].toLowerCase();
  const metres=unit==='mm'?value/1000:unit==='cm'?value/100:unit==='ft'?value*0.3048:value;
  return kind==='length'||kind==='height'?metres:null;
}

function metricDisplay(value:number,unit:string,kind:InsightKind){
  const maxDigits=kind==='speed'?0:kind==='power'?0:1;
  return new Intl.NumberFormat('en-US',{maximumFractionDigits:maxDigits}).format(value)+' '+unit;
}

function detailComparisonSeries(item:ObjectEntry,collection:ObjectEntry[],lang:'en'|'hi'):InsightSeries[]{
  const peers=collection.filter(candidate=>!candidate.sample&&candidate.category===item.category);
  return insightDefinitions.flatMap(definition=>{
    const rows=peers.flatMap(candidate=>{
      const spec=candidate.specs.find(entry=>definition.matches(entry.label.en));
      if(!spec)return [];
      const value=parseInsightMetric(spec,definition.kind);
      if(value===null||!Number.isFinite(value))return [];
      return [{slug:candidate.slug,name:candidate.name[lang],label:spec.label[lang],value,display:metricDisplay(value,definition.unit,definition.kind)}];
    });
    if(rows.length<2)return [];
    const title=definition.kind==='height'&&item.category==='nature'
      ?(lang==='en'?'Peak height':'पहाड़ की ऊंचाई')
      :definition.labels[lang];
    return [{kind:definition.kind,title,unit:definition.unit,rows}];
  }).slice(0,3);
}

function detailScaleProfile(item:ObjectEntry,lang:'en'|'hi'){
  const rows=item.specs.flatMap(spec=>{
    if(!/(length|width|height|diameter|wheelbase|rotor)/i.test(spec.label.en))return [];
    const raw=String(spec.value)+' '+(spec.unit??'');
    const match=raw.match(/([\d,]+(?:\.\d+)?)\s*(mm|cm|m|ft)\b/i);
    if(!match)return [];
    const value=Number(match[1].replace(/,/g,''));
    const unit=match[2].toLowerCase();
    const metres=unit==='mm'?value/1000:unit==='cm'?value/100:unit==='ft'?value*0.3048:value;
    return Number.isFinite(metres)?[{label:spec.label[lang],value:metres}]:[];
  }).slice(0,5);
  return rows.length>1?rows:null;
}

function detailHighlights(item:ObjectEntry,lang:'en'|'hi'){
  const seen=new Set<string>();
  return item.specs.flatMap(spec=>{
    if(/^power unit$/i.test(spec.label.en))return [];
    const raw=String(spec.value)+' '+(spec.unit??'');
    const match=raw.match(/([\d,]+(?:\.\d+)?)\s*(km\/h|mph|hp|bhp|kw|ps|cc|km²|ha|mm|cm|m|kg|t|mw|ft|s|l|rpm)\b/i);
    if(!match)return [];
    const label=spec.label.en.toLowerCase();
    const key=/height/i.test(label)?'height':/^top speed/i.test(label)?'speed':/^power/i.test(label)?'power':/engine/i.test(label)?'engine':/length/i.test(label)?'length':/weight|mass/i.test(label)?'weight':/area/i.test(label)?'area':label;
    if(seen.has(key))return [];
    seen.add(key);
    return [{label:spec.label[lang],value:match[1],unit:spec.unit||match[2]}];
  }).slice(0,4);
}

function detailBuildTimeline(item:ObjectEntry){
  if(item.category!=='landmarks')return null;
  const spec=item.specs.find(entry=>/built|construction/i.test(entry.label.en));
  const match=String(spec?.value??'').match(/(\d{4})\s*[–—-]\s*(\d{4})/);
  if(!match)return null;
  const start=Number(match[1]),end=Number(match[2]);
  return end>start?{start,end,duration:end-start}:null;
}

function DetailInsights({item,collection,lang}:{item:ObjectEntry;collection:ObjectEntry[];lang:'en'|'hi'}){
  const series=detailComparisonSeries(item,collection,lang);
  const profile=detailScaleProfile(item,lang);
  const highlights=detailHighlights(item,lang);
  const timeline=detailBuildTimeline(item);
  return <section className="detail-insights" aria-label={lang==='en'?'Numbers and comparisons':'संख्याएं और तुलना'}>
    <header className="insight-heading"><span className="eyebrow">{lang==='en'?'DATA / IN CONTEXT':'डेटा / संदर्भ सहित'}</span><h3>{lang==='en'?'Numbers in perspective':'आंकड़ों की झलक'}</h3><p>{lang==='en'?'Key figures, then comparisons where matching measurements exist.':'मुख्य आंकड़े और उपलब्ध समान मापों की तुलना।'}</p></header>
    {!!highlights.length&&<div className="insight-highlights">{highlights.map((value,index)=><article key={value.label}><span>{String(index+1).padStart(2,'0')} / {value.label}</span><b>{value.value}<small> {value.unit}</small></b></article>)}</div>}
    {series.map(group=><article className="insight-chart" key={group.kind}>
      <div className="insight-chart-heading"><b>{group.title}</b><span>SHARED UNIT · {group.unit.toUpperCase()}</span></div>
      <div className="insight-chart-rows">{group.rows.map(row=><div className={'insight-chart-row '+(row.slug===item.slug?'is-current':'')} key={row.slug}>
        <div className="insight-row-label"><span>{row.name}</span><b>{row.display}</b></div>
        <div className="insight-track"><i style={{width:Math.max(8,row.value/Math.max(...group.rows.map(entry=>entry.value))*100)+'%'}}/></div>
        <small>{row.label}</small>
      </div>)}</div>
      <p className="insight-note">{lang==='en'?'Collection figures may reflect different trims, model years, or measurement conditions.':'संग्रह के आंकड़े अलग-अलग मॉडल, वर्ष या मापन स्थितियों के हो सकते हैं।'}</p>
    </article>)}
    {profile&&<article className="insight-chart">
      <div className="insight-chart-heading"><b>{lang==='en'?'Shape & scale':'आकार और पैमाना'}</b><span>RELATIVE MEASUREMENTS · M</span></div>
      <div className="insight-chart-rows">{profile.map(entry=><div className="insight-chart-row" key={entry.label}><div className="insight-row-label"><span>{entry.label}</span><b>{metricDisplay(entry.value,'m','length')}</b></div><div className="insight-track"><i style={{width:Math.max(8,entry.value/Math.max(...profile.map(value=>value.value))*100)+'%'}}/></div></div>)}</div>
      <p className="insight-note">{lang==='en'?'Bars compare measurements within this object; they are not a drawing scale.':'बार इस ऑब्जेक्ट के मापों की आपस में तुलना करते हैं; यह चित्र का स्केल नहीं है।'}</p>
    </article>}
    {timeline&&<article className="insight-timeline"><div><span className="eyebrow">{lang==='en'?'BUILDING TIMELINE':'निर्माण समयरेखा'}</span><b>{timeline.duration} <small>{lang==='en'?'years':'वर्ष'}</small></b></div><div className="timeline-track"><i/></div><div className="timeline-years"><b>{timeline.start}</b><span>{lang==='en'?'construction began':'निर्माण शुरू'}</span><b>{timeline.end}</b><span>{lang==='en'?'main works completed':'मुख्य निर्माण पूरा'}</span></div></article>}
  </section>;
}
export function ObjectDetail({item:initialItem,collection=[initialItem]}:{item:ObjectEntry;collection?:ObjectEntry[]}){const {lang,t}=useLanguage();const [item,setItem]=useState(initialItem);const [tab,setTab]=useState('overview');useEffect(()=>{setItem(initialItem);const base=process.env.NEXT_PUBLIC_API_URL;if(base)fetch(`${base}/api/objects/${initialItem.slug}`).then(r=>r.ok?r.json():null).then(data=>{if(data)setItem(data)}).catch(()=>{});},[initialItem]);return <main className="detail-page"><Link className="back-link" href="/objects">← {t.back}</Link><div className="detail-heading"><div><span className="eyebrow">{item.category.toUpperCase()} / INTERACTIVE OBJECT</span><h1>{item.name[lang]}</h1><p>{item.tagline[lang]}</p></div>{item.sample&&<span className="sample-pill">● {t.sample}</span>}</div><div className="detail-layout"><div className="detail-viewer"><FrameViewer slug={item.slug} autoRotate/></div><div className="detail-panel"><div className="tab-list">{[['overview',t.overview],['specs',t.specs],['facts',t.facts],['connections',t.connections]].map(([id,label])=><button className={tab===id?'selected':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</div>{tab==='overview'&&<div className="tab-content"><span className="eyebrow">01 / FIELD NOTES</span><h2>{item.name[lang]}</h2><p>{item.summary[lang]}</p><div className="overview-quote">“{item.tagline[lang]}”<span>✳</span></div><div className="overview-metrics">{item.specs.slice(0,3).map((spec,i)=><div key={spec.label.en}><span>0{i+1} / {spec.label[lang]}</span><b>{spec.value}<small> {spec.unit}</small></b></div>)}</div><p className="explore-hint">Drag the object to explore it. Zoom in to inspect the details.</p></div>}{tab==='specs'&&<div className="panel-scroll"><div className="panel-intro"><span className="eyebrow">TECHNICAL PROFILE</span><h2>Built to be explored</h2><p>Numbers behind the object, at a glance.</p></div><div className="spec-grid">{item.specs.map((s,i)=><div className="spec-tile" key={s.label.en}><span><i>{String(i+1).padStart(2,'0')}</i>{s.label[lang]}</span><b>{s.value}<small> {s.unit}</small></b></div>)}</div><DetailInsights item={item} collection={collection} lang={lang}/></div>}{tab==='facts'&&<div className="panel-scroll"><div className="panel-intro"><span className="eyebrow">DETAILS THAT STICK</span><h2>Look a little closer</h2><p>Surprising details and the sources behind them.</p></div><div className="facts-list">{item.funFacts.map((f,i)=><article key={i}><span>DISCOVERY / {String(i+1).padStart(2,'0')}</span><p>{f.text[lang]}</p><a href={f.sourceUrl} target="_blank" rel="noreferrer">↗ {t.source}</a></article>)}</div></div>}{tab==='connections'&&<div className="panel-scroll"><div className="panel-intro"><span className="eyebrow">PEOPLE &amp; STORIES</span><h2>Connected to the world</h2><p>People linked to this object and why they matter.</p></div><div className="facts-list">{item.celebrityLinks.map((c,i)=><article key={i}><span>CONNECTION / {String(i+1).padStart(2,'0')}</span><p><b>{c.person}</b> — {c.relation[lang]}</p><a href={c.sourceUrl} target="_blank" rel="noreferrer">↗ {t.source}</a></article>)}</div>{item.celebrityLinks.length===0&&<p className="empty-story">No notable connections have been added yet.</p>}</div>}</div></div>{item.slug==='audi-f1-r26'&&<p className="viewer-disclaimer">{lang==='en'?'Illustrative 3D model · Not an official Audi, Formula 1 or FIA asset.':'उदाहरणात्मक 3D मॉडल · यह Audi, Formula 1 या FIA की आधिकारिक सामग्री नहीं है।'}</p>}{item.slug==='james-webb-space-telescope'&&<p className="viewer-disclaimer">{lang==='en'?'Illustrative 3D model based on NASA’s public model · Not an engineering CAD model.':'NASA के सार्वजनिक मॉडल पर आधारित उदाहरणात्मक 3D मॉडल · यह इंजीनियरिंग CAD मॉडल नहीं है।'}</p>}{item.slug==='mexico-city-metropolitan-cathedral'&&<p className="viewer-disclaimer">{lang==='en'?<>Illustrative photogrammetry model · Agisoft scan · <a href="/objects/mexico-city-metropolitan-cathedral/CREDITS.md" target="_blank" rel="noreferrer">Model credits</a></>:<>उदाहरणात्मक फोटोग्रामेट्री मॉडल · Agisoft स्कैन · <a href="/objects/mexico-city-metropolitan-cathedral/CREDITS.md" target="_blank" rel="noreferrer">मॉडल क्रेडिट</a></>}</p>}{item.slug==='janaki-mandir'&&<JanakiCredits/>}{item.slug==='mount-everest'&&<EverestCredits/>}{item.slug==='valley-of-flowers'&&<ValleyCredits/>}{item.slug==='excavator'&&<ExcavatorCredits/>}{item.slug==='porsche-992-gt3r'&&<PorscheCredits/>}{item.slug==='audi-f1-r26'&&<AudiCredits/>}</main>}
function EverestCredits(){return <aside className="asset-credits" aria-label="Mount Everest data and image credits"><h2>Terrain and imagery credits</h2><p><strong>Elevation data:</strong> produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved. <a href="https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf" target="_blank" rel="noreferrer">WorldDEM-30 licence</a>.</p><p>The organisations in charge of the Copernicus programme by law or by delegation do not incur any liability for any use of the Copernicus WorldDEM-30.</p><p><strong>Satellite colour:</strong> Sentinel-2 cloudless - https://s2maps.eu by EOX IT Services GmbH (Contains modified Copernicus Sentinel data 2016). <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>.</p></aside>}
function JanakiCredits(){return <aside className="asset-credits" aria-label="Janaki Mandir model and photo credits"><h2>Model &amp; photo credits</h2><p><strong>3D model:</strong> “janaki mandir” by ajaa (2021), licensed under <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Procedural colour, lighting, backdrop, podium, flags and the 360° render were added for this viewer; these are artistic changes, not a measured restoration. <a href="/objects/janaki-mandir/CREDITS.md" target="_blank" rel="noreferrer">Full model credits</a>.</p><p><strong>Photos:</strong> Wikimedia Commons images; each photo card links to its source and licence. <a href="/objects/janaki-mandir/PHOTO-CREDITS.md" target="_blank" rel="noreferrer">Full photo credits</a> · <a href="/objects/janaki-mandir/SOURCES.md" target="_blank" rel="noreferrer">Research sources</a>.</p></aside>}
function ExcavatorCredits(){return <aside className="asset-credits" aria-label="Excavator model credits and licence"><h2>Model credits &amp; use</h2><p><strong>Excavator model:</strong> “#TEMPTED 2015 Worlds Biggest Excavator” by heedongq, via Sketchfab, <a href="https://creativecommons.org/licenses/by-nc/4.0/" target="_blank" rel="noreferrer">CC BY-NC 4.0</a> (non-commercial use only). Mesh repair, materials, scale and render were modified.</p><p><strong>Human scale figure:</strong> “Business Man Standing” by suasanakreasi, via Sketchfab, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>; scaled to 1.78 m and re-shaded. <a href="/objects/excavator/CREDITS.md" target="_blank" rel="noreferrer">Full credits</a>.</p><p>Bagger 288 is a real German bucket-wheel excavator built by Krupp for RWE. The interactive viewer presents the machine at a 220 m scale. The excavator model’s non-commercial licence also applies to uses of this model asset.</p></aside>}
function ValleyCredits(){return <aside className="asset-credits" aria-label="Valley of Flowers model note and credits"><h2>About this landscape model</h2><p>Artistic model: Nanda Devi is moved about 45 km closer for the composition; trees and waterfalls are exaggerated. Pin locations marked “approx.” are approximate.</p><p>Terrain: Copernicus GLO-30 DEM. Imagery: Sentinel-2 cloudless by EOX (CC BY-NC-SA 4.0). <a href="/objects/valley-of-flowers/CREDITS.md" target="_blank" rel="noreferrer">Full credits and licence</a>.</p></aside>}

function AudiCredits(){return <aside className="asset-credits" aria-label="Audi R26 illustrative model credits"><h2>Illustrative model &amp; credits</h2><p>This is a user-provided 3D model in Audi Revolut F1 Team-inspired livery. It is not an official Audi, Formula 1 or FIA asset.</p><p>The supplied archive did not identify the original model author or licence. <a href="/objects/audi-f1-r26/CREDITS.md" target="_blank" rel="noreferrer">View model credits and label sources</a>.</p></aside>}
function PorscheCredits(){return <aside className="asset-credits" aria-label="Porsche model credits"><h2>Model credits</h2><p><strong>3D car model:</strong> “2024 Porsche 992 GT3 R” by Dave Love (Tyler_Dave), via Sketchfab, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. Motion blur and helper meshes were hidden; materials were re-shaded for the studio render.</p><p><strong>Human scale figure:</strong> “Business Man Standing” by suasanakreasi, via Sketchfab, <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a>. <a href="/objects/porsche-992-gt3r/CREDITS.md" target="_blank" rel="noreferrer">Full credits</a>.</p></aside>}
