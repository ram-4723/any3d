import { getObjects } from '@/lib/objects';
import Compare from './compare';
export default async function ComparePage(){return <Compare objects={await getObjects()}/>;}
