// Shared community translation overlay (Firebase LOMapInfo/Community).
import type { NextApiRequest, NextApiResponse } from 'next'
import { getShared } from '@/lib/datasource'

export default async function GET(
  _req: NextApiRequest,
  res: NextApiResponse<{ [id: string]: { en?: string; ko?: string } } | {}>
) {
  const temp = await getShared('Community', 'community_translation.json')
  if (temp) {
    res.setHeader('Cache-Control', 's-maxage=10800');
    return res.status(200).json(temp)
  }
  return res.status(404).send({});
}
