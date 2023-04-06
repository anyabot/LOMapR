import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync, World } from '@/store/worldSlice';
import { useEffect } from 'react';
import { useRouter } from 'next/router'
import Error from 'next/error';
import Link from 'next/link';

export default function Home() {

  const world = useAppSelector(selectWorld);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, [dispatch]);
  const router = useRouter()
  const id = router.query.id as string
  const zone = router.query.zone as string
  const real_zone = parseInt(zone) - 1
  // function getCurrent() {
  //   return Object.fromEntries(Object.entries(world).filter(([k,v]) => v.type == "story" || v.type == "current"))
  // }
  if (Object.keys(world).length === 0) {
    return <h1>Loading</h1>
  }
  else if (!(id in world) || !(real_zone in world[id].zones)) {
    return <Error statusCode={404}/>
  }
  else {
    let z = world[id].zones[real_zone]
    let [width, height] = z.gridsize
    let grid = [...Array(height)].map(e => Array(height));
    return (
      <>
        <Link href={`/world/${id}`}>Back</Link>
        <h2>{z.title}</h2>
        <ul>
          
        </ul>
      </>
    )
  }
}
