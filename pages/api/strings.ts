// Per-region official localization table (Firebase LOMapInfo/<region>/Strings).
import type { NextApiRequest, NextApiResponse } from 'next'
import { getNode, normalizeRegion } from '@/lib/datasource'

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{ [id: string]: { en?: string; ko?: string } } | {}>
) {
  const temp = await getNode('Strings', normalizeRegion(req.query.region))
  if (temp) {
    res.setHeader('Cache-Control', 's-maxage=10800');
    return res.status(200).json(temp)
  }
  return res.status(404).send({});
}
