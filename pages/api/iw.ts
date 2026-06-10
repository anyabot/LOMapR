// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getNode, normalizeRegion } from '@/lib/datasource'
import { InfiniteWar } from '@/interfaces/iw';

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: InfiniteWar} | {}>
) {
  const temp = await getNode('InfiniteWar', normalizeRegion(req.query.region))
  if (temp) {
    Object.keys(temp).forEach(key => temp[key].id = key)
    res.setHeader('Cache-Control','s-maxage=10800');
    return res.status(200).json(temp)
  } else {
    return res.status(404).send({});
  }
}
