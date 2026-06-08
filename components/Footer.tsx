import Link from "next/link";
import { toolCategories, tools } from "@/lib/tools";

export function Footer() {
  const featuredTools = tools.filter((tool) => tool.localProcessing);

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-1">
          <div className="flex items-center gap-3 text-slate-950">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-red-600 text-sm font-black text-white">PDF</span>
            <span className="text-lg font-black">PDF Master Pro</span>
          </div>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            Plataforma moderna para organizar, otimizar, converter, editar e proteger documentos PDF.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Processou, baixou, descartou. Nao armazenamos seus arquivos permanentemente.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">Categorias</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {toolCategories.map((category) => (
              <li key={category.id}>
                <Link className="hover:text-red-700" href={`/#${category.id}`}>
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">Processamento local</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {featuredTools.map((tool) => (
              <li key={tool.id}>
                <Link className="hover:text-red-700" href={tool.href}>
                  {tool.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-black text-slate-950">Legal e suporte</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>
              <Link className="hover:text-red-700" href="/privacidade">
                Privacidade
              </Link>
            </li>
            <li>
              <Link className="hover:text-red-700" href="/termos">
                Termos de uso
              </Link>
            </li>
            <li>
              <Link className="hover:text-red-700" href="/seguranca">
                Seguranca
              </Link>
            </li>
            <li>
              <Link className="hover:text-red-700" href="/cookies">
                Cookies
              </Link>
            </li>
            <li>
              <Link className="hover:text-red-700" href="/suporte">
                Suporte
              </Link>
            </li>
            <li>
              <Link className="hover:text-red-700" href="/pricing">
                Precos
              </Link>
            </li>
            <li>
              <Link className="hover:text-red-700" href="/contact-sales">
                Contato Enterprise
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-slate-200 px-4 py-4 text-center text-xs font-semibold text-slate-500">
        © 2026 PDF Master Pro. Privacidade e confiabilidade como padrao.
      </div>
    </footer>
  );
}
