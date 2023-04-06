
import { Inter } from 'next/font/google'

import { useAppSelector, useAppDispatch } from '../hooks';
import { selectWorld, selectWorldStatus, fetchWorldAsync } from '@/store/worldSlice';
import { useEffect } from 'react';


const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const world = useAppSelector(selectWorld);
  const dispatch = useAppDispatch();
  useEffect(() => {
    dispatch(fetchWorldAsync());
  }, [dispatch]);
  async function temp() {
    dispatch(fetchWorldAsync());
  }
  return (
    <>
      <button onClick={temp}>Fetch</button>
      {Object.keys(world).length}
    </>
  )
}
