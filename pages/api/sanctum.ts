// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { app } from '@/firebaseConfigs'
import { getDatabase, ref, child, get } from "firebase/database";
import { Floor } from '@/interfaces/sanctum';

const dbRef = ref(getDatabase(app));

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: Floor}>
) {
  const response = await get(child(dbRef, "Sanctum/")).then((snapshot) => snapshot)
  if (response.exists()) {
    var temp = response.val();
    Object.keys(temp).forEach(key => temp[key].id = key)
    res.setHeader('Cache-Control','s-maxage=86400');
    return res.status(200).json(temp)
  } else {
    return res.status(404);
  }
}