import type { GetServerSideProps } from "next";
import Head from "next/head";
import Link from "next/link";

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
  if (cookies.session !== "user") {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    };
  }
  return { props: {} };
};

export default function MePage() {
  return (
    <>
      <Head>
        <title>Me</title>
      </Head>
      <main style={{ maxWidth: 720, margin: "48px auto", fontFamily: "system-ui" }}>
        <h1>Me</h1>
        <p data-testid="whoami">user</p>
        <Link href="/api/logout">Logout</Link>
      </main>
    </>
  );
}

