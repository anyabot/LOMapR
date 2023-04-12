// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { app, getImage } from '@/firebaseConfigs'
import { getDatabase, ref, child, get } from "firebase/database";

const dbRef = ref(getDatabase(app));

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<string | {}>
) {
  const id = req.query.id as string
  try { 
    const reponse = await getImage(`/images/world/${id}.png`)
    res.setHeader('Cache-Control','s-maxage=86400');
    res.status(200).send(reponse)
  }
  catch(e) {  
    res.status(404).send({ error: 'failed to fetch data' });
  }
}
