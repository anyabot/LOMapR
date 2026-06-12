import type { NextApiRequest, NextApiResponse } from 'next';
import { getSplitEnemy, normalizeRegion } from '@/lib/datasource';
import { EnemyFull } from '@/interfaces/enemy';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EnemyFull | { error: string }>
) {
  const id = req.query.id as string;
  const region = normalizeRegion(req.query.region);
  const data = await getSplitEnemy(id, region);
  if (!data) return res.status(404).json({ error: 'not found' });
  res.setHeader('Cache-Control', 's-maxage=10800');
  return res.status(200).json({ ...data, id });
}
