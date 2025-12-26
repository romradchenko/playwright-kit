import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Set-Cookie", "session=; Path=/; Max-Age=0");
  res.writeHead(302, { Location: "/login" });
  res.end();
}

