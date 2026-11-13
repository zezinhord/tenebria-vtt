# TENEBRIA VTT 0.1.0 — PWA de mesa virtual

Aplicação real de mesa virtual **2D**, sem dependências de npm, para RPG **Tenebria Revisado 3.0**. Construída como PWA em JavaScript, Canvas 2D, IndexedDB e Node.js HTTP + Server-Sent Events (SSE). **Não é um APK**: roda no navegador e pode ser instalada como PWA onde o navegador permitir.

## O que funciona na 0.1.0

- Campanhas locais, nova campanha, demo, seleção, edição, salvamento automático por IndexedDB, importação/exportação `.json` (áudios e PDFs anexados incluídos quando disponíveis).
- Dois mapas demonstrativos editáveis (masmorra **Cripta sob a Vigília** e povoado **Corval**); importação de PNG/JPEG/WebP convertidos localmente para WebP até 1800 × 1300; zoom por pinça, roda, arrasto, centralização, grade quadrada configurável e alinhamento opcional.
- Tokens nomeados com tamanho, rotação, vida, proprietário, bloqueio, ocultação, imagem customizada e associação a fichas; movimentação por arrastar. Névoa manual: ocultar/revelar áreas retangulares e revelar tudo.
- Fichas editáveis: Físico, Habilidade, Vigor, Mental, subatributos calculados; raças **Humano, Anão, Elfo, Gnomo e Zetharin**, validadas por limites do livro; habilidades, inventário, qualidades e campos livres; PDFs anexos consultáveis, sem OCR/conversão automática.
- Rolagens D4, D6, D8, D10, D12, D20, múltiplos dados e modificadores (`2D6+3`), histórico; privadas do Mestre, públicas compartilhadas e teste rápido de atributos. RNG `crypto.getRandomValues` no navegador; rolagem dos jogadores é refeita no servidor para não aceitar valores inventados.
- Iniciativa, ordenação, troca de turnos, rodadas, ajuste de PV, condições em combate; decisão sempre controlada pelo Mestre.
- Áudio local com volume, loop, sobreposição, importação de arquivos, três efeitos originais incluídos. Sons importados **não são sincronizados** para outros dispositivos na versão 0.1.0.
- Servidor multiplayer independente de bibliotecas de terceiros, com salas, código administrativo e convites individuais dos jogadores. Estado atualizado por SSE sem recarregar. Jogadores só podem movimentar seus próprios tokens, editar campos de texto de sua ficha e rolar dados. Projeção recebe estado público, sem fichas privadas, anotações do Mestre e tokens dentro da névoa. Névoa é queimada numa imagem pública no navegador do Mestre antes da sincronização, para que o cliente não receba a imagem original oculta.
- PWA instalável em origem segura HTTPS ou localhost, e cache de recursos da interface para uso individual offline.

## Como iniciar no computador ou hospedagem Node.js

1. Extraia o ZIP preservando as pastas.
2. Com **Node.js 20 ou superior** instalado, abra um terminal na pasta `tenebria-vtt`.
3. Execute `npm start` (não precisa de `npm install`, pois não há dependências de npm).
4. Abra **http://localhost:4173**. A campanha demonstrativa aparece na primeira visita.
5. Clique em **Sessão → Criar sala online**, distribua os códigos de convite individuais e abra o link do projetor.

Para acessar de outro aparelho na mesma rede Wi‑Fi, use `http://IP-DO-SERVIDOR:4173` no navegador. Os dois aparelhos precisam alcançar a mesma instância do servidor. Para funcionamento externo pela internet, hospede **todo o projeto no mesmo servidor Node** com HTTPS (proxy reverso/TLS no provedor) e disco persistente para a pasta `.local-rooms/`. `TENEBRIA_DATA_DIR` permite alterar a pasta de persistência. O servidor escuta `0.0.0.0` e usa a variável `PORT` quando definida.

## Sem computador: executar no próprio celular Android via Termux

A solução tecnicamente mais direta para hospedar o servidor **na rede local** usando somente o Android é Termux:

1. Instale uma versão atual e confiável do **Termux** e um gerenciador que descompacte ZIP.
2. No Termux, execute `pkg update && pkg install nodejs unzip`.
3. Extraia a pasta do projeto em um diretório acessível pelo Termux; em seguida entre nela com `cd .../tenebria-vtt`.
4. Execute `npm start`. Abra no próprio celular `http://localhost:4173`.
5. Com o celular e o projetor no mesmo Wi‑Fi, obtenha o IPv4 local do celular nas configurações da conexão e, no navegador do projetor, acesse `http://IP-DO-CELULAR:4173`.
6. Crie uma sala pelo celular e conecte o navegador do projetor como **projetor**.

**Atenção:** Termux deve continuar em execução enquanto a sessão acontece. Desative a otimização de bateria para o Termux, conforme as opções do Android; algumas redes impedem comunicação entre dispositivos e alguns projetores não suportam todos os recursos do navegador. PWA instalada via HTTP no IP de outro aparelho geralmente não é permitida; use o navegador ou HTTPS.

## GitHub Pages e publicação

Os arquivos `.github/workflows/check.yml` e `pages.yml` foram incluídos para CI e publicação estática no GitHub Pages. Crie um repositório **novo e separado** `tenebria-vtt`, envie todo o conteúdo do ZIP preservando a estrutura, ative em *Settings → Pages → Build and deployment → GitHub Actions*. O fluxo de teste executa `npm test`, e o de Pages publica a PWA estática. **GitHub Pages não executa `server/index.mjs`**: nessa publicação, campanhas locais funcionam, mas salas online só funcionam com a aplicação hospedada no servidor Node (não há seleção de backend remoto na 0.1.0).

O repositório **não foi criado automaticamente**. Estes arquivos o deixam pronto para o upload e a publicação.

## Controles

- **Mestre:** menu Campanha, Mapas, Tokens, Fichas, Dados, Combate, Áudio e Sessão.
- **Mapas:** arraste o fundo para mover; toque num token para selecioná-lo, arraste o token para reposicionar; pinça para zoom, clique duplo para centralizar. Ferramenta “+ Token”: escolha e toque no ponto do mapa. “Ocultar” e “Revelar”: arraste um retângulo no mapa; toque sozinho usa 90 × 90 px como pequeno pincel.
- **Jogador:** abra `?room=SEU-CODIGO&role=player` e informe o código individual distribuído pelo Mestre.
- **Projetor:** abra `?room=SEU-CODIGO&role=projector`. Não precisa da senha administrativa. Pode entrar em tela cheia se o navegador permitir.
- **Dados:** use fórmulas `1D20+2`, `2D6+3` etc., ou toque nos botões.
- **Campanhas:** para migrar de um aparelho para outro, use Exportar / Importar `.json`; não confie exclusivamente no armazenamento do navegador.

## Regras incorporadas do livro

O PDF de referência **TENEBRIA_REVISADO_3.0.pdf** (305 páginas) foi examinado. A distribuição inicial é de **8 pontos-base** com nenhum atributo zero; os quatro atributos são Físico, Habilidade, Vigor e Mental. Subatributos: Iniciativa H+M, Fadiga F+V, Vontade M+H, Resistência M+F, Defesa-base V (antes do equipamento). Limites confirmados: Humano F5/H5/V5/M5; Anão F6/H5/V6/M3; Elfo F4/H7/V4/M4; Gnomo F5/H4/V4/M7; Zetharin F5/H5/V5/M5. O livro prevê outras raças, classes, exceções, bônus e cálculos de PV; **a 0.1.0 não automatiza todos eles**. PV das fichas demo são valores de demonstração sujeitos a correção pelo Mestre. O livro integral não está incluído no ZIP.

## Estrutura

```text
tenebria-vtt/
  index.html, manifest.webmanifest, sw.js
  src/
    main.js       ciclo da aplicação e campanhas
    ui.js         telas e controles
    board.js      Canvas 2D, câmera, pinça, tokens, névoa
    rules.js      atributos, validação e dados
    demo.js       campanha demonstrativa
    storage.js    IndexedDB, exportação e anexos
    network.js    API HTTP + SSE do cliente
    style.css     interface responsiva dark fantasy
  server/
    index.mjs     servidor HTTP, salas e SSE
    room.mjs      permissões e estado público
  assets/         mapas SVG, ícone, áudios WAV
  tests/          testes unitários e HTTP integrados
  scripts/        comando auxiliar Termux
  .github/workflows/   testes e GitHub Pages
```

## Testes executados e limitações verificadas

Execute `npm test`. Foram criados testes automatizados para atributos/limites, gerador de dados, campanha demo, separação de dados privados, códigos de convite, permissão de movimentação, servidor HTTP, SSE, persistência de alterações e rolagens no servidor. O teste HTTP foi executado localmente de ponta a ponta.

A inspeção gráfica automatizada por Chromium **não foi possível neste ambiente** por política de bloqueio administrativo do navegador; portanto, renderização, touch real, áudio Android, tela cheia e acesso ao projetor HY3000 **não foram comprovados em hardware**. Não foi realizado teste funcional em um Moto G34 ou projetor HY3000. A compatibilidade deve ser validada no dispositivo, com alternativa de reprodução usando um computador/TV box/celular externo conectado ao projetor.

**Limitações 0.1.0:** iluminação dinâmica, grade hexagonal, áreas de efeito sofisticadas, dados 3D, transmissão de áudio remoto, armazenamento remoto de mapas/áudio em objeto dedicado, reconexão segura avançada, gerenciamento completo de condições/skills de todas as classes e importação automática de PDFs estão fora do escopo atual. A sala remota depende de hospedagem e disponibilidade do Node, e os arquivos de áudio/PDF importados permanecem no dispositivo original. Servidor público requer HTTPS, backup do diretório de salas, limites de uso, proteção contra abuso e política de retenção antes de exposição ampla.
