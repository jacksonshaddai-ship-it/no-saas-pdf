const features = [
  {
    title: "Fluxos locais quando possível",
    description: "Merge, split, rotação, marca d'água e compressão leve rodam no navegador.",
  },
  {
    title: "Arquitetura pronta para APIs",
    description: "Conversões, OCR e criptografia ficam separados para CloudConvert, ConvertAPI ou outro provedor.",
  },
  {
    title: "Interface de produto SaaS",
    description: "Estados claros de upload, processamento, conclusão e erro em todas as páginas de ferramenta.",
  },
];

export function FeatureSection() {
  return (
    <section id="privacidade" className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-3 lg:px-8">
        {features.map((feature) => (
          <article className="rounded-lg border border-slate-200 p-5" key={feature.title}>
            <h2 className="text-base font-black text-slate-950">{feature.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{feature.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
