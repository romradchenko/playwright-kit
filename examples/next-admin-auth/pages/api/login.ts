import type { NextApiRequest, NextApiResponse } from "next";

function setCookie(res: NextApiResponse, value: string) {
  res.setHeader("Set-Cookie", value);
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  const email = typeof req.body?.email === "string" ? req.body.email : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  const isAdmin = email === "admin@example.com" && password === "admin";
  const isUser = email === "user@example.com" && password === "user";

  if (!isAdmin && !isUser) {
    res.status(401).send("Invalid credentials");
    return;
  }

  const role = isAdmin ? "admin" : "user";
  setCookie(res, `session=${role}; Path=/; HttpOnly; SameSite=Lax`);
  res.writeHead(302, { Location: role === "admin" ? "/admin" : "/me" });
  res.end();
}
