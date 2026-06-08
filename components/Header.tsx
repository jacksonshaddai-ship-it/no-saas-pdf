"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { tools, toolCategories } from "@/lib/tools";
import { PLANS } from "@/lib/plans";

const planAccent: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  emerald: "bg-emerald-50 text-emerald-700",
  indigo: "bg-indigo-50 text-indigo-700",
  red: "bg-red-50 text-red-700",
  violet: "bg-violet-50 text-violet-700",
};

export function Header() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  const [openMenu, setOpenMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3 text-slate-950" aria-label="PDF Master Pro">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-red-600 text-sm font-black text-white shadow-sm">
            PDF
          </span>
          <span className="truncate text-lg font-black">PDF Master Pro</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-600 lg:flex" aria-label="Categorias">
          {toolCategories.map((category) => (
            <Link
              className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-red-700"
              href={`/#${category.id}`}
              key={category.id}
            >
              {category.label}
            </Link>
          ))}

          <div
            className="relative"
            onMouseEnter={() => setOpenMenu(true)}
            onMouseLeave={() => setOpenMenu(false)}
          >
            <button
              className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-red-700"
              type="button"
            >
              Todas as ferramentas ▾
            </button>
            {openMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-[640px] rounded-lg border border-slate-200 bg-white p-4 shadow-xl">
                <div className="grid grid-cols-2 gap-3">
                  {toolCategories.map((cat) => {
                    const items = tools.filter((t) => t.category === cat.id);
                    if (items.length === 0) return null;
                    return (
                      <div key={cat.id} className="min-w-0">
                        <h4 className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
                          {cat.label}
                        </h4>
                        <ul className="space-y-1">
                          {items.map((tool) => {
                            const plan = PLANS[tool.minimumPlan];
                            return (
                              <li key={tool.id} className="flex items-center justify-between gap-2">
                                <Link
                                  className="min-w-0 truncate text-sm font-semibold text-slate-700 hover:text-red-700"
                                  href={tool.href}
                                >
                                  {tool.name}
                                </Link>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${planAccent[plan.accent]}`}
                                >
                                  {tool.badge}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 border-t border-slate-100 pt-3 text-center">
                  <Link className="text-xs font-bold text-red-700 hover:text-red-800" href="/#ferramentas">
                    Ver todas as ferramentas →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link className="rounded-md px-3 py-2 transition hover:bg-slate-100 hover:text-red-700" href="/pricing">
            Planos
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          {isLoggedIn ? (
            <>
              <Link
                className="hidden rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 sm:inline-flex"
                href="/account"
              >
                Conta
              </Link>
              <button
                className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                onClick={() => signOut({ callbackUrl: "/" })}
                type="button"
              >
                Sair
              </button>
            </>
          ) : (
            <>
              <Link
                className="hidden rounded-md px-3 py-2 text-sm font-bold text-slate-700 transition hover:text-red-700 sm:inline-flex"
                href="/login"
              >
                Entrar
              </Link>
              <Link
                className="inline-flex items-center rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
                href="/register"
              >
                Criar conta grátis
              </Link>
            </>
          )}
        </div>
      </div>

      <nav
        className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 sm:px-6 lg:hidden"
        aria-label="Categorias móveis"
      >
        {toolCategories.map((category) => (
          <Link
            className="shrink-0 rounded-md bg-slate-100 px-3 py-2 hover:bg-red-50 hover:text-red-700"
            href={`/#${category.id}`}
            key={category.id}
          >
            {category.label}
          </Link>
        ))}
        <Link className="shrink-0 rounded-md bg-slate-100 px-3 py-2 hover:bg-red-50 hover:text-red-700" href="/pricing">
          Planos
        </Link>
      </nav>
    </header>
  );
}
