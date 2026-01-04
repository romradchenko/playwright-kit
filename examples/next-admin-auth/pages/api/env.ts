import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse): void {
  res.status(200).json({
    PLAYWRIGHT_KIT_EXAMPLE: process.env.PLAYWRIGHT_KIT_EXAMPLE ?? null,
  });
}

