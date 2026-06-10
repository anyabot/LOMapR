// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'
import { getNode, normalizeRegion } from '@/lib/datasource'

export default async function GET(
  req: NextApiRequest,
  res: NextApiResponse<{[key: string]: string} | {}>
) {
  const temp = await getNode('Images', normalizeRegion(req.query.region))
  if (temp) {
    res.setHeader('Cache-Control','s-maxage=10800');
    return res.status(200).json(temp)
  } else {
    return res.status(404).send({});
  }
}
