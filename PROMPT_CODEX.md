Aja como engenheiro de software sênior, especialista em Next.js, TypeScript, Vercel e processamento de PDF.

Objetivo: finalizar e validar o projeto `PDF Master Pro`.

Contexto técnico:
- Next.js App Router com TypeScript.
- Tailwind CSS.
- `pdf-lib` para funções locais no navegador.
- Deploy alvo: Vercel.
- Prioridade: custo mínimo, privacidade e velocidade.

Requisitos obrigatórios:
1. Rodar `npm install`.
2. Rodar `npm run build` e corrigir qualquer erro.
3. Manter as ferramentas locais sem upload para servidor:
   - merge
   - split
   - rotate
   - watermark
   - compress leve
4. Não implementar senha/criptografia com `pdf-lib`, pois isso não é suporte correto de produção.
5. Criar integração opcional para CloudConvert ou ConvertAPI nas funções pesadas:
   - protect
   - pdf-to-word
   - word-to-pdf
   - ocr
6. A API key deve ficar em variável de ambiente:
   - CLOUDCONVERT_API_KEY ou CONVERTAPI_SECRET
7. Nunca expor chave de API no frontend.
8. Tratar erros de arquivo protegido, arquivo corrompido, PDF grande e navegador sem memória.
9. Melhorar acessibilidade: labels, foco visível, mensagens claras.
10. Manter design responsivo mobile/desktop.

Critérios de aceite:
- `npm run build` passa sem erro.
- Home carrega cards de ferramentas.
- Merge junta 2 PDFs simples.
- Split extrai intervalo correto.
- Rotate gira páginas.
- Watermark adiciona texto.
- Compress gera novo PDF e exibe diferença de tamanho.
- Páginas de funções externas explicam que precisam de API.
- README atualizado com passos de deploy na Vercel.
