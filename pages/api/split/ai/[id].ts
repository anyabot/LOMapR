import type { NextApiRequest, NextApiResponse } from 'next';
import { getSplitAI, normalizeRegion } from '@/lib/datasource';
import { AIGraph } from '@/interfaces/ai';

export default async function GET(req: NextApiRequest, res: NextApiResponse<AIGraph | {}>) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({});
  const region = normalizeRegion(req.query.region);
  const graph = await getSplitAI(id, region);
  if (!graph) return res.status(404).json({});
  res.setHeader('Cache-Control', 's-maxage=10800');
  return res.status(200).json(graph);
}
