import type { GetServerSideProps } from "next";
import Head from "next/head";

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  return cookieHeader
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return acc;
      acc[part.slice(0, idx)] = part.slice(idx + 1);
      return acc;
    }, {});
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.session === "admin") {
    return {
      redirect: {
        destination: "/admin",
        permanent: false,
      },
    };
  }
  return { props: {} };
};

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login</title>
      </Head>
      <main style={{ maxWidth: 560, margin: "48px auto", fontFamily: "system-ui" }}>
        <h1>Login</h1>
        <form method="POST" action="/api/login" style={{ display: "grid", gap: 12 }}>
          <label>
            Email
            <input name="email" aria-label="Email" style={{ display: "block", width: "100%" }} />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              aria-label="Password"
              style={{ display: "block", width: "100%" }}
            />
          </label>
          <button type="submit">Sign in</button>
        </form>
      </main>
    </>
  );
}

