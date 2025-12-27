import React, { useEffect, useMemo, useState } from "react";

function getRole(): string | null {
  return window.localStorage.getItem("role");
}

export function Me(): React.ReactElement {
  const role = getRole();
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone,
    [],
  );
  const language = useMemo(() => navigator.language, []);
  const [xTestHeader, setXTestHeader] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/headers")
      .then((r) => r.json() as Promise<Record<string, unknown>>)
      .then((json) => {
        if (cancelled) return;
        const value = json["x-test-header"];
        setXTestHeader(typeof value === "string" ? value : null);
      })
      .catch(() => {
        if (cancelled) return;
        setXTestHeader(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <h1>Me</h1>
      <p data-testid="whoami">{role ?? "anonymous"}</p>
      <p data-testid="tz">{timezone}</p>
      <p data-testid="lang">{language}</p>
      <p data-testid="x-test-header">{xTestHeader ?? "missing"}</p>
    </div>
  );
}

