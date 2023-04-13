// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { app } from '@/firebaseConfigs'
import { getDatabase, ref, child, get } from "firebase/database";

const dbRef = ref(getDatabase(app));

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: string}>
) {
  const response = await get(child(dbRef, "Images/")).then((snapshot) => snapshot)
  if (response.exists()) {
    var temp = response.val();
    res.setHeader('Cache-Control','s-maxage=86400');
    return res.status(200).json(temp)
  } else {
    return res.status(404);
  }
}
