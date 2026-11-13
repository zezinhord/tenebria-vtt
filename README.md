# TENEBRIA VTT 0.2.1 — Importação assistida de fichas

## Novo: importar ficha e criar personagem

1. Abra a campanha e entre em **Ferramentas → Fichas → ↑ Importar ficha**.
2. Selecione um **PDF com texto selecionável**, **TXT** ou **JSON de personagem** de até **12 MB**.
3. O aplicativo tenta reconhecer nome, raça, classe, nível, Físico, Habilidade, Vigor, Mental, PV e bônus de defesa, além de seções textuais quando identificadas.
4. **Revise os campos**: valores faltantes permanecem em branco. Corrija os avisos e confirme **Criar personagem**.
5. Se deixar marcada a opção **Criar token no mapa atual**, o token será gerado automaticamente e vinculado à nova ficha.

**Limitações importantes:** o reconhecimento usa campos e rótulos do documento, não IA. Fichas com diagramação incomum podem precisar de correções. **Não há OCR** para PDFs escaneados ou imagens nesta versão. PDF.js (Mozilla, Apache 2.0, versão fixa 4.10.38) extrai o texto **localmente no navegador**: o PDF não é enviado a um serviço de IA. A primeira instalação exige `npm install` para preparar o leitor de PDF (isso já é executado pela publicação automática do GitHub Pages). A cópia original do PDF é guardada no IndexedDB do dispositivo do Mestre e pode ser incluída na exportação da campanha. Jogadores conectados não recebem o PDF original pelo protocolo de sala.

**Proteção dos dados:** nenhuma ficha é criada antes da confirmação. Atribuição de oito pontos de nível 1 e limites raciais seguem as regras verificadas do livro. Não são inventadas habilidades ou bônus ausentes. Campanhas e fichas já existentes continuam intactas.

# TENEBRIA VTT 0.2.1 — Fichas e regras de criação

Mesa virtual dark fantasy para **Tenebria Revisado 3.0**. Uma única PWA para celulares Android, computadores e navegadores compatíveis de televisores/projetores. O mesmo núcleo guarda campanhas, mapas, fichas, tokens, dados, combate, sons e permissões. Desenvolvido sobre a base **0.1.2**, sem reiniciar o projeto.

## Novidades da 0.2.1 — primeiro incremento de fichas avançadas

- **27 raças catalogadas** diretamente do livro *Tenebria Revisado 3.0*, com seus limites Físico/Habilidade/Vigor/Mental e deslocamento básico. O Satirino tem 12 m na forma verdadeira e 7 m na forma oculta; a ficha mostra essa ressalva. O campo de raça mantém valores legados/customizados e não modifica atributos ao trocar de raça.
- **27 classes oficiais** disponíveis em lista, incluindo Espadachim Oriental, Mago, Monge, Sacerdote, Patrulheiro e Sem Caminho. Classes personalizadas de fichas antigas continuam exibidas.
- **Criação**: 8 pontos iniciais nos quatro atributos-base (nenhum pode ser zero), 2 qualidades no nível 1 (3 para Humanos com Versátil) e registro estruturado das habilidades compradas (5 pontos iniciais; custo × nível informado pelo Mestre conforme o livro). Há avisos não destrutivos se os limites forem ultrapassados.
- **Combate e testes a partir da ficha**: iniciativa, fadiga, vontade, resistência, defesa total = Vigor + equipamento, dano desarmado = Físico + 1; botões de teste D20 para Físico, Habilidade, Mental, Vigor, Iniciativa, Vontade e Resistência.
- **Compatibilidade**: `classPowers` é um campo opcional; campanhas antigas continuam abrindo. Atributos, classes, fichas, mapas, sessões e áudio continuam compartilhados entre mesa presencial e online.

**Limites conscientes:** a vida máxima depende da classe e não é calculada automaticamente sem a tabela da classe. O campo de habilidade comprada exige que o Mestre confira o custo e as restrições na obra; o aplicativo não declara verificada uma regra ainda não codificada. Traços raciais como Vigoroso (Anão) são descritos, mas não inseridos automaticamente nos atributos-base, para evitar exceder limites raciais ou sobrescrever escolhas. A lista de raças/classes é uma referência condensada; o PDF do livro não é distribuído.

**Fonte das regras:** PDF *TENEBRIA REVISADO 3.0*: catálogo de raças nas páginas 14–69; atributos e subatributos na página 71; classes nas páginas 74–154; regra de cinco pontos de habilidades na página 73. Numerações de páginas aqui são as páginas do arquivo PDF, não necessariamente a paginação impressa.

## Novidades da 0.1.3

- **Menu inicial com duas modalidades:** Mesa Presencial e Mesa Online, acessando as mesmas campanhas salvas. O botão ⌂ permite voltar ao seletor.
- **Mesa Presencial de duas telas:** o Mestre controla a campanha no celular e outro navegador acessa o modo Projetor, com credencial própria, exibindo o tabuleiro em tela cheia, sem menu administrativo. Funciona sem internet pública quando ambos acessam um **servidor Node.js funcionando na mesma rede Wi-Fi/hotspot**.
- **Mesa Online:** salas e convites individuais de jogadores, controle de permissões no servidor, retomada da sessão no navegador após recarregar, encerramento e reabertura pelo Mestre. Requer servidor acessível por **HTTPS**, além do GitHub Pages.
- **Convites com credenciais diferentes** para Mestre, projetor e cada jogador. O código de acesso vai no fragmento `#` do link, que não é enviado no pedido HTTP para carregar a página. Não compartilhe a credencial do Mestre.
- **Sincronização incremental dos tokens** enquanto são arrastados (até ~8 atualizações por segundo), sem retransmitir a imagem completa do mapa a cada movimento. Encaixe dos tokens continua no **centro** de cada célula, como na 0.1.2.
- **Áudio por destino:** reproduzir efeitos originais incluídos no celular do Mestre, projetor, jogadores ou todos. O servidor envia somente comandos, e o arquivo de áudio é carregado por cada aparelho. É necessário o usuário tocar em **Ativar áudio** no navegador receptor antes da reprodução automática. Sons importados continuam locais.
- **Ferramentas adicionais:** medição de distância em casas e criação de marcadores públicos no tabuleiro.
- Melhorias de segurança: projetor exige código, jogadores não movimentam tokens alheios, segredos permanecem filtrados pelo servidor, SSE reconecta e salas podem ser encerradas/retomadas.

## Abrir o aplicativo

PWA pública: **https://zezinhord.github.io/tenebria-vtt/** — funciona como aplicação individual com campanhas locais. A partir da 0.1.3, no menu **Sessão** você também pode informar a **origem HTTPS** de um servidor Tenebria próprio para habilitar salas remotas. **O GitHub Pages não executa o backend Node.js.**

### 1. Presencial sem internet pública

**Opção A — PC ou notebook como servidor:**

1. Baixe o projeto, extraia o ZIP ou clone este repositório.
2. Instale **Node.js 20 ou superior**, entre na pasta do projeto e execute `npm install` uma vez e depois `npm start`. Não é necessário instalar pacotes adicionais.
3. Conecte celular, computador e projetor/receptor à mesma rede Wi-Fi ou hotspot. Descubra o IP local do computador.
4. No navegador do Mestre, abra `http://IP-DO-COMPUTADOR:4173` (não o endereço GitHub Pages). Escolha **Mesa Presencial → Criar sala presencial**.
5. Copie o **link do projetor** e abra-o no navegador do dispositivo ligado ao projetor. Esse aparelho recebe somente a visualização pública. Ative a tela cheia pelo navegador, quando suportado.
6. Compartilhe os links/códigos dos jogadores para permitir acesso individual, caso queiram controlar os próprios tokens.

**Opção B — somente celular Android como servidor (Termux):** instale o Termux, execute `pkg update && pkg install nodejs`, extraia este projeto numa pasta acessível e, dentro dela, use `npm install` e depois `npm start`. O celular deve manter o Termux rodando durante toda a sessão. No próprio celular, abra `http://localhost:4173`; no projetor/receptor abra `http://IP-DO-CELULAR:4173`. O servidor escuta na interface de rede `0.0.0.0`. O hotspot deve permitir comunicação entre clientes (isolamento de AP desativado). Faça backup das campanhas. Alguns Androids podem suspender o Termux quando o aplicativo fica em segundo plano; desative sua otimização de bateria, se necessário.

O navegador do **HY3000 não foi testado fisicamente**. Caso seja limitado, utilize um notebook, TV box, Chromecast compatível ou outro celular ligado ao projetor e abra nele o modo público. **Espelhamento** da tela do Mestre não substitui uma segunda tela pública: pode expor controles e notas privadas.

### 2. Online pela internet

1. Hospede este projeto em um servidor Node.js acessível por **HTTPS**, com `npm start` ou `node server/index.mjs`. O servidor usa `PORT` e aceita `TENEBRIA_DATA_DIR` para o diretório persistente das salas. Utilize um volume persistente e backups para dados de campanhas.
2. O backend permite CORS somente da origem oficial `https://zezinhord.github.io` e da própria origem do servidor; adicione outras origens autorizadas em `TENEBRIA_ALLOWED_ORIGINS` (lista separada por vírgulas).
3. Abra a PWA pública, escolha **Mesa Online**, vá a **Sessão**, insira apenas a origem `https://seu-servidor.example.com` em **Endereço do servidor** e clique em **Salvar e testar servidor**.
4. Clique em **Criar sala online**. Compartilhe os convites individuais com amigos. O link inclui a origem do backend para conectar quem recebe o convite.
5. Os clientes recebem o estado permitido via Server-Sent Events (SSE). O Mestre continua controlando encontros, turnos e segredos. Ao recarregar a aba, o cliente tenta retomar a sessão no mesmo navegador. Se a credencial de sessão expirar, será necessário entrar novamente com o código.

**Não há servidor de internet hospedado por este repositório neste momento**. A opção online depende da configuração real da hospedagem externa. O Dockerfile está incluído para provedores compatíveis. Para operação pública contínua, configure HTTPS, disco persistente, backup, limites de solicitações e monitoramento do servidor.

**Evite usar o endereço HTTP da rede local na configuração do GitHub Pages (HTTPS)**: navegadores bloqueiam conteúdo misto. Para sessões locais, abra a PWA servida diretamente pelo próprio Node em `http://IP:4173`.

## Recursos de jogo

- **Campanhas:** IndexedDB local, autosalvamento, exportação/importação JSON, duas cenas de demonstração (masmorra e povoado), quatro personagens e encontro de combate. As campanhas compartilham os mesmos identificadores entre as modalidades; mudar de modo não cria novas fichas.
- **Mapas:** importar PNG/JPEG/WebP (redução para 1800 × 1300), zoom/pinça, arrasto, grade quadrada e encaixe no centro das casas, névoa manual por retângulo e ferramenta para revelar, marcadores e medição de distância. Não há iluminação dinâmica ou colisão automática por obstáculos nesta versão.
- **Tokens:** imagens, tamanho, rotação, vida, visibilidade, dono, bloqueio e ficha vinculada; movimentação autorizada, sincronizada e econômica. O Mestre pode corrigir fichas/posições a qualquer momento.
- **Fichas:** atributos Físico, Habilidade, Vigor e Mental; subatributos Iniciativa H+M, Fadiga F+V, Vontade M+H, Resistência M+F; limites raciais de Humano, Anão, Elfo, Gnomo e Zetharin, extraídos de Tenebria Revisado 3.0. Qualidades, perícias, magias, habilidades, inventário e histórico são editáveis. PDFs anexados não são convertidos e os blobs ficam no dispositivo original.
- **Dados:** D4/D6/D8/D10/D12/D20, modificadores e múltiplos dados, histórico compartilhado; o servidor calcula rolagens de jogador, ignorando valores falsificados. Rolagens privadas do Mestre não são enviadas aos clientes públicos.
- **Combate:** participantes, iniciativa, ordem, rodadas, turnos, vida e condições, com intervenção manual do Mestre.
- **Áudio:** importar sons locais, reproduzir em loop e ajustar volume; enviar comandos para efeitos incluídos. Sons importados não são distribuídos automaticamente aos participantes.

## Estrutura

```
index.html                 entrada e menu de modalidades
manifest.webmanifest      manifesto PWA
sw.js                     cache de recursos locais
src/main.js               campanhas, sessão e estado do cliente
src/ui.js                 Mestre, Jogador, Sessão e menus
src/board.js              renderização Canvas, token, grade, névoa, medição
src/grid.js               encaixe no centro das casas
src/network.js            conexão configurável, API HTTP e SSE
src/storage.js            IndexedDB e importação/exportação
src/rules.js              rolagens, validação e cálculos da ficha
src/compendium.js         catálogo de 27 raças e 27 classes
src/demo.js               campanha de demonstração
src/style.css             visual responsivo dark fantasy
server/index.mjs          backend Node: salas, SSE, autorização, áudio
server/room.mjs           projeção pública, filtragem e permissões
assets/                   mapas e efeitos sonoros
scripts/termux-start.sh  execução auxiliar em Android
.github/workflows/        testes Node e publicação Pages
tests/                    testes de regras, renderização e integração
```

## Testes e limitações

Execute `npm test`. Os testes incluem regras e limites de Tenebria, renderização/encaixe, projeção privada, sessões com clientes independentes, atualizações SSE, movimentos autorizados, rolagem do servidor, retomada, encerramento/reabertura, som remoto, bloqueio de origens CORS e convites com códigos em fragmentos da URL.

**Testes físicos ainda necessários:** Moto G34 com arrasto contínuo de tokens, estabilidade de Canvas, reprodução de áudio após toque, navegador do HY3000, modo horizontal, rede Wi-Fi sem internet e carga com muitos participantes. O Chromium automatizado deste ambiente não completou a inicialização; não tratamos a revisão visual como concluída.

**Limitações adicionais:** QR Code ainda não implementado (há código e links de convite); sessões remotas exigem backend HTTPS; o servidor de exemplo usa arquivos JSON em uma única instância, não foi projetado para replicação horizontal; streaming de áudio importado e sincronização temporal precisa não existem; imagens do mapa compartilhado são incorporadas como WebP no estado e podem ser pesadas; até 9 MB por requisição. A PWA é instalável apenas em origens consideradas seguras pelo navegador (HTTPS ou localhost), e não necessariamente por HTTP de IP LAN. A automatização detalhada das habilidades e traços de classes ainda será ampliada ao longo da versão 0.2.x.

O livro completo **TENEBRIA REVISADO 3.0** não é distribuído no projeto.

## Arquivos adicionados na 0.2.1

- `src/sheet-import.js`: extração e revisão de campos com regras e avisos
- `src/pdf-reader.js`: leitura PDF.js (texto e formulários PDF)
- `scripts/prepare-pdfjs.mjs`: copia biblioteca e worker para `vendor/` após `npm install`
- `tests/sheet-import.test.mjs`: testes para detecção, validação e ausência de preenchimento inventado
- `.github/workflows/{check,pages}.yml`: instalação do leitor durante testes e publicação
- `Dockerfile`: prepara dependências na construção do container

O GitHub Pages hospeda apenas a interface; sala online continua exigindo backend HTTPS separado.


## Importação de ficha preenchível de Tenebria — 0.2.2

O VTT reconhece diretamente campos AcroForm do modelo oficial de duas páginas, inclusive nome, raça, classe, nível, atributos, pontos de vida, perícias marcadas, qualidades, defeitos, habilidades, armas e inventário. Os códigos internos `text_*` e `checkbox_*` são traduzidos pelo importador. PDFs comuns ainda usam o extrator anterior; PDFs digitalizados sem campos e sem texto precisam de OCR, ainda não implementado. O arquivo original permanece local no dispositivo do Mestre.

A qualidade escrita como **Meio-Antigo +1 ponto de atributo** permite validar 9 pontos no nível 1; sem esse registro o limite continua 8. Valores defensivos não explícitos, requisitos especiais e custos de classe devem ser conferidos com o livro antes de automatizar. Use **Fichas → Importar ficha** e expanda a prévia para revisar os itens antes de criar o personagem e token. Não é necessário importar novamente personagens existentes.

A ficha pessoal utilizada para verificar a correção não foi adicionada ao repositório público.
