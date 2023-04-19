// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { db } from '@/firebaseConfigs'
import { getDatabase, ref, child, get } from "firebase/database";
import { World } from '@/interfaces/world';

const dbRef = ref(db);

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: World}>
) {
  const response = await get(child(dbRef, "World/")).then((snapshot) => snapshot)
  if (response.exists()) {
    var temp = response.val();
    Object.keys(temp).forEach(key => temp[key].id = key)
    res.setHeader('Cache-Control','s-maxage=10800');
    return res.status(200).json(temp)
  } else {
    return res.status(404);
  }
}
