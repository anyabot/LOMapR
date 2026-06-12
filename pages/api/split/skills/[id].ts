import type { NextApiRequest, NextApiResponse } from 'next';
import { getSplitSkills, normalizeRegion } from '@/lib/datasource';

export default async function GET(req: NextApiRequest, res: NextApiResponse) {
  const id = req.query.id as string;
  if (!id) return res.status(400).json({});
  const region = normalizeRegion(req.query.region);
  const skills = await getSplitSkills(id, region);
  if (!skills) return res.status(404).json({});
  res.setHeader('Cache-Control', 's-maxage=10800');
  return res.status(200).json(skills);
}
