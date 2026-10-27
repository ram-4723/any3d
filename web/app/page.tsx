import { getObjects } from '@/lib/objects';
import { Home } from '@/components/Site';
export default async function Page() { return <Home objects={await getObjects()}/>; }
