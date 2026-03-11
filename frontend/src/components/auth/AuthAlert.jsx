import React from "react";

export function AuthAlert({ message, type = "error", role = "alert" }) {
  if (!message) return null;

  return (
    <div className={`auth-alert auth-alert-${type}`} role={role}>
      {type === "success" && "✓ "}
      {message}
    </div>
  );
}
