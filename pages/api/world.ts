// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getNode, normalizeRegion } from '@/lib/datasource'
import { World } from '@/interfaces/world';

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: World} | {}>
) {
  const temp = await getNode('World', normalizeRegion(req.query.region))
  if (temp) {
    Object.keys(temp).forEach(key => temp[key].id = key)
    res.setHeader('Cache-Control','s-maxage=10800');
    return res.status(200).json(temp)
  } else {
    return res.status(404).send({});
  }
}
