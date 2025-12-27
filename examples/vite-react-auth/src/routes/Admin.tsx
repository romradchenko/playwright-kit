import React from "react";

function getRole(): string | null {
  return window.localStorage.getItem("role");
}

export function Admin(): React.ReactElement {
  const role = getRole();
  return (
    <div>
      <h1>Admin</h1>
      <p data-testid="whoami">{role ?? "anonymous"}</p>
    </div>
  );
}

