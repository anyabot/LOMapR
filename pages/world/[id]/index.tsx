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
  // function getCurrent() {
  //   return Object.fromEntries(Object.entries(world).filter(([k,v]) => v.type == "story" || v.type == "current"))
  // }
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
          {w.zones.map((z,index) => (<li><Link href={`/world/${id}/${index+1}`}>{z.title}</Link></li>))}
        </ul>
      </>
    )
  }
}
