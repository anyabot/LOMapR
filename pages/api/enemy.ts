// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getNode, normalizeRegion } from '@/lib/datasource'
import { EnemyData } from '@/interfaces/enemy';

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: EnemyData} | {}>
) {
  const temp = await getNode('EnemyData', normalizeRegion(req.query.region))
  if (temp) {
    Object.keys(temp).forEach(key => temp[key].id = key)
    res.setHeader('Cache-Control','s-maxage=10800');
    return res.status(200).json(temp)
  } else {
    return res.status(404).send({ error: 'failed to fetch data' });
  }
}
