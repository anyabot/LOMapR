import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldImage, fetchWorldAsync, fetchWorldImageAsync } from '@/store/worldSlice';
import { useEffect } from 'react';
import { useRouter } from 'next/router'
import Error from 'next/error';
import Link from 'next/link';

export default function Home() {

  const world = useAppSelector(selectWorld);
  const imagelink = useAppSelector(selectWorldImage)
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, []);
  const router = useRouter()
  const id = router.query.id as string
  useEffect(() => {
    world[id]?.zones.map((zone) => imagelink[zone.img]? null : dispatch(fetchWorldImageAsync(zone.img)))
  }, [world]);
  if (Object.keys(world).length === 0) {
    return <h1>Loading</h1>
  }
  else if (!(id in world)) {
    return <Error statusCode={404}/>
  }
  else {
    let w = world[id]

    return (
      <>
        <Link href={`/world/`}>Back</Link>
        <h2>{w.title}</h2>
        <ul>
          {w.zones.map((z,index) => (<li key={index}><><img src={imagelink[z.img]}/><Link href={`/world/${id}/${index+1}`}>{z.title}</Link></></li>))}
        </ul>
      </>
    )
  }
}
