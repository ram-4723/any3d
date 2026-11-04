import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getObject, getObjects } from '@/lib/objects';
import { ObjectDetail } from '@/components/Site';
export async function generateStaticParams(){return (await getObjects()).filter(o=>!o.sample).map(o=>({slug:o.slug}));}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const {slug}=await params;const item=await getObject(slug);if(!item||item.sample)return {title:'Object not found | 3D Anything',robots:{index:false,follow:false}};const title=item.name.en;const description=item.summary.en;const origin=process.env.NEXT_PUBLIC_SITE_URL??(process.env.VERCEL_PROJECT_PRODUCTION_URL?`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`:undefined);const image=origin?new URL(`/objects/${item.slug}/poster.webp`,origin).toString():undefined;return {title:`${title} | 3D Anything`,description,openGraph:{title:`${title} | 3D Anything`,description,images:image?[{url:image,alt:`${title} interactive 360° view` }]:undefined,type:'article'},twitter:{card:'summary_large_image',title:`${title} | 3D Anything`,description,images:image?[image]:undefined}};}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=await getObject(slug);if(!item)notFound();return <ObjectDetail item={item}/>;}
