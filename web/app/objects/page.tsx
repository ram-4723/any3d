import { getObjects } from '@/lib/objects';
import ObjectsListing from './listing';
export default async function ObjectsPage(){return <ObjectsListing items={await getObjects()}/>;}
