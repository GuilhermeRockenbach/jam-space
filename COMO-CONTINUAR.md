# Como continuar o Jam Space

Guia para quem vai pegar o projeto no próprio computador. Prazo do desafio: **15/11/2026, 23h59**.

Resumo do projeto, impacto e roteiro: [RESUMO.md](RESUMO.md). Fontes e o que foi conferido: [REFERENCIAS.md](REFERENCIAS.md). Texto do desafio: [earth-jukebox-briefing.md](earth-jukebox-briefing.md) e [requisitos.md](requisitos.md).

## 1. Rodar o site

O site é estático (HTML, CSS e JavaScript puros, sem build). O three.js vem de CDN, então precisa de internet.

```bash
git clone <url-do-repositorio>
cd <pasta-do-repositorio>
python -m http.server 5180
```

Abra http://localhost:5180/site/ no Chrome ou no Edge. Abrir o `index.html` direto pelo arquivo não funciona, porque o navegador bloqueia o carregamento dos JSON.

Atalhos úteis na URL: `#c=temp,raios,luzes,gelo,chuva` já coloca todos os temas no disco.

Se uma alteração não aparecer, recarregue com Ctrl+Shift+R (o navegador guarda CSS e JS em cache).

## 2. Onde está cada coisa

| Pasta ou arquivo | O que é |
|---|---|
| `site/` | **O site. É aqui que se mexe.** |
| `site/index.html` | Estrutura da página: disco, painel, "Aprenda a ouvir", Monitor do som |
| `site/app.js` | Liga tudo: arrastar temas, play, teclado, leitor de tela, URL |
| `site/dados.js` | Carrega os JSON, normaliza os valores, monta os compassos e escreve as legendas |
| `site/audio.js` | Síntese do som com Web Audio (andamento, acordes, timbres, lições do "Aprenda a ouvir") |
| `site/cena.js` | Cena 3D com three.js: vinil, planeta, gelo, raios, chuva, luzes, calor, braço |
| `site/monitor.js` | Gráfico de frequências e leituras do Monitor do som |
| `site/style.css` | Visual e layout (computador, tablet e celular) |
| `site/dados/*.json` | Dados já extraídos das visualizações da NASA (ver seção 4) |
| `ferramentas/` | Scripts que leem os quadros da NASA e geram os JSON |
| `conceitos/disco3d.html` | Estudo dos modelos 3D do disco (não é usado pelo site) |
| `exemplo-planeta/` | Primeira versão do disco-planeta, antes dos efeitos mais fortes. Ficou só como histórico; a versão atual está em `site/` |
| `entregas/` | Documento técnico (.docx) e apresentação (.pptx) |
| `apresentacao/` | Projeto dos slides |

## 3. Como o site funciona (em poucas linhas)

1. `dados.js` lê os JSON e, para o lugar e o período escolhidos, gera uma lista de passos (um passo = um ano ou um mês).
2. `app.js` toca os passos em sequência. Em cada passo chama `audio.js` (som) e `cena.js` (imagem) com os mesmos valores.
3. No som: temperatura muda andamento, acordes e timbre; raios viram percussão; luzes viram arpejo; gelo vira sinos; chuva vira garoa e gotas.
4. Na imagem, o disco é a Terra vista de cima do Polo Norte (centro = Ártico, borda = 60°S):
   - **Temperatura:** a cor da terra vai do azul ao dourado, e faíscas sobem (ou flocos descem, se estiver frio).
   - **Gelo do Ártico:** uma placa branca com fendas, uma borda ciano que pulsa e geada; o tamanho segue a área do mês. O anel amarelo marca metade do maior mês.
   - **Luzes noturnas:** a cena escurece e as cidades acendem perto das costas.
   - **Raios:** descarga com clarão no ponto onde cai.
   - **Chuva:** riscos caindo; quanto mais chuva, mais riscos e mais rápidos.

## 4. Dados (só NASA)

Regra do time: **usar apenas dados da NASA** e **nunca inventar números**. Número não conferido leva ⚠️.

| Tema | Visualização NASA | Arquivo |
|---|---|---|
| Temperatura | SVS 5207 (GISTEMP) | `site/dados/temperatura.json` |
| Raios | SVS 5011 (raios vistos da ISS) | `site/dados/raios.json` |
| Luzes noturnas | SVS 5313 (Black Marble) | `site/dados/luzes.json` |
| Chuva | SVS 5149 (GEOS-FP) | `site/dados/chuva.json` |
| Gelo do Ártico | SVS 5099 | `site/dados/gelo.json` |
| Continentes do disco | máscara terra/mar tirada dos quadros do SVS 5149 | `site/dados/mascara-terra.json` |

Limitação conhecida: a área absoluta do gelo sai 2 a 3 milhões de km² acima por causa da costa. Por isso o site mostra só a fração do maior mês (detalhes em REFERENCIAS.md).

### Gerar os dados de novo (só se precisar)

Os vídeos e quadros baixados da NASA (cerca de 540 MB, em `fontes-nasa/videos`, `fontes-nasa/chuva` e `fontes-nasa/gelo`) **não estão no repositório**. Para refazer um JSON, baixe de novo a visualização no site do NASA SVS (https://svs.gsfc.nasa.gov/) e rode o script correspondente com Node 18 ou mais novo:

```bash
node ferramentas/chuva.mjs <pasta-dos-quadros> site/dados/chuva.json
```

```bash
node ferramentas/ler-temperatura.mjs fontes-nasa site/dados/temperatura.json
```

O `ferramentas/leitor.html` (abrir por http://localhost:5180/ferramentas/leitor.html) lê os vídeos de raios, luzes e gelo no navegador.

## 5. Protótipo publicado

A versão online fica em https://claude.ai/artifact/JpyyyarxiQ5NTVW5Vm7UHS (versão 12, já com o disco-planeta e os efeitos novos). Qualquer pessoa com o link abre. Só o dono da conta consegue atualizar; quem mudar o site manda o código pelo GitHub e o dono publica de novo. Para gerar a pasta que vai para lá:

```bash
python ferramentas/montar-artefato.py site publicar
```

A pasta `publicar/` é gerada por esse script e não vai para o repositório.

## 6. O que falta

- Testar com pessoas cegas e com professores.
- Versão em inglês.
- Modo "explorar por toque": tocar num ponto do mapa e ouvir aquela região.
- Melhorar a máscara de costa do gelo para medir a área absoluta.
- Conferir os números de contexto do RESUMO.md marcados como "a confirmar".
- No celular, a malha do planeta é mais leve e as costas ficam um pouco quadradas.
- Atualizar o protótipo publicado e a apresentação com o disco-planeta, se o time quiser.

## 7. Combinados do time

- Só dados da NASA, com a fonte anotada em REFERENCIAS.md.
- Sem números inventados; o que não foi conferido leva ⚠️.
- Acessibilidade em primeiro lugar: tudo funciona por teclado e leitor de tela, e cada efeito visual tem som e texto equivalentes.
- Uso de IA declarado: Claude (Anthropic), via Claude Code.
