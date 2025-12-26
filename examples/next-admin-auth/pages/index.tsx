import type { GetServerSideProps } from "next";

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: "/admin",
      permanent: false,
    },
  };
};

export default function IndexPage() {
  return null;
}

