import { notFound } from 'next/navigation';
import { getObject, getObjects } from '@/lib/objects';
import { ObjectDetail } from '@/components/Site';
export async function generateStaticParams(){return (await getObjects()).map(o=>({slug:o.slug}));}
export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const item=await getObject(slug);if(!item)notFound();return <ObjectDetail item={item}/>;}
