import { useAppSelector, useAppDispatch } from '@/hooks';
import { selectWorld, selectWorldStatus, selectWorldImage, fetchWorldAsync, fetchWorldImageAsync } from '@/store/worldSlice';
import { useEffect } from 'react';
import Link from 'next/link'

export default function Home() {

  const world = useAppSelector(selectWorld);
  const worldStatus = useAppSelector(selectWorldStatus)
  const imagelink = useAppSelector(selectWorldImage)
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, []);
  useEffect(() => {
    Object.keys(world).map((key) => imagelink[world[key].img]? null : dispatch(fetchWorldImageAsync(world[key].img)))
  }, [world]);
  
  function sortNumeric(a:any, b:any) {
    return a.id.localeCompare(b.id, undefined, {
      numeric: true,
      sensitivity: 'base'
    });
  }
  function getImage(id:string) {
    return imagelink[id] ? imagelink[id] : undefined
  }
  const world2 = Object.keys(world).map((key) => {
    let temp = world[key]
    return temp
  });
  function getCurrent() {
    return world2.filter(w => w.type == "current" || w.type == "story").sort(sortNumeric);
  }
  function getPermaEvents() {
    return world2.filter(w => w.type == "permanent").sort(sortNumeric);
  }
  function getOldEvents() {
    return world2.filter(w => w.type == "old").sort(sortNumeric);
  }
  function getOthers() {
    return world2.filter(w => w.type == "others").sort(sortNumeric);
  }
  if (worldStatus == "failed"){
    return <h1>Fetch Failed</h1>
  }
  if (Object.keys(world).length === 0) {
    return <h1>Loading</h1>
  }
  else {
    return (
      <>
        <h2>Current Event and Story</h2>
        <ul>
          {getCurrent().map(w => (<li key={w.id}><Link href={`/world/${encodeURIComponent(w.id)}`}><><img src={getImage(w.img)}/>{w.title}</></Link></li>))}
        </ul>
        <h2>Current Event and Story</h2>
        <ul>
          {getPermaEvents().map(w => (<li key={w.id}><Link href={`/world/${encodeURIComponent(w.id)}`}><><img src={getImage(w.img)}/>{w.title}</></Link></li>))}
        </ul>
        <h2>Current Event and Story</h2>
        <ul>
          {getOldEvents().map(w => (<li key={w.id}><Link href={`/world/${encodeURIComponent(w.id)}`}><><img src={getImage(w.img)}/>{w.title}</></Link></li>))}
        </ul>
        <h2>Current Event and Story</h2>
        <ul>
          {getOthers().map(w => (<li key={w.id}><Link href={`/world/${encodeURIComponent(w.id)}`}><><img src={getImage(w.img)}/>{w.title}</></Link></li>))}
        </ul>
      </>
    )
  }
}
