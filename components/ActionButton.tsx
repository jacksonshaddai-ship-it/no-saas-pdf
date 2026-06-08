"use client";

import type { ReactNode } from "react";

export function ActionButton({
  children,
  loading,
  disabled,
  onClick,
}: {
  children: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className="w-full rounded-md bg-red-600 px-5 py-4 text-base font-black text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      disabled={disabled || loading}
      onClick={onClick}
      type="button"
    >
      {loading ? "Processando..." : children}
    </button>
  );
}
