# Jam Space — Levantamento do que é necessário

Complementa o [briefing](earth-jukebox-briefing.md). Foco: o **modo compositor com o disco de vinil** e a **aula do gelo**.
Prazo: **domingo, 15/11/2026, 23h59.** Fontes de tudo o que for usado vão em [REFERENCIAS.md](REFERENCIAS.md).

---

## 1. A experiência (como a pessoa usa)

1. A tela abre com um **disco de vinil vazio** e uma prateleira de **camadas** (cartões: Temperatura, Gelo, Raios, Luzes noturnas…).
2. A pessoa **arrasta uma camada para o disco** (ou seleciona e aperta Enter). O disco ganha um "ambiente" em cima:
   | Camada | O que aparece no disco | O que se ouve |
   |---|---|---|
   | Temperatura | Superfície tinge de azul → branco → vermelho, com leve "ondulação de calor" | Baixo + harmonia (pads) |
   | Gelo | Cristais/geada na borda, que encolhem quando o gelo diminui | Sinos agudos e cristalinos |
   | Raios | Clarões curtos sobre os sulcos | Percussão |
   | Luzes noturnas | Pontinhos de luz como cidades vistas do espaço | Melodia |
3. Escolhe o **lugar**: o rótulo central do disco mostra o mapa da região (mundo, Atlântico Sul, Ártico…).
4. Escolhe o **período**: os **sulcos do disco são a linha do tempo**. Borda externa = ano inicial, centro = ano final, como um vinil de verdade.
5. Aperta **Play**: o braço do toca-discos desce, a agulha anda da borda ao centro, e cada volta/trecho corresponde a um ano. O ambiente visual e o som mudam conforme o dado daquele ano.
6. No fim, o disco ganha **título automático** ("Atlântico Sul · Temperatura + Raios · 2017–2023") e um **link para compartilhar**.

Regra de ouro (do briefing): **mesma receita, mesma música.** Nada é sorteado.

---

## 2. Dados: o que existe de verdade (verificado no SVS em 14/11)

| Camada | Visualização EIC | Período real | Resolução no tempo | Formato útil |
|---|---|---|---|---|
| Temperatura | [5207 Global Temperature Anomalies](https://svs.gsfc.nasa.gov/5207/) | **1880–2023** | Média móvel de 24 meses; 901 quadros | Vídeo equirretangular 4096×2048 (versão Science On a Sphere) + tabela de cores |
| Gelo (estação) | [5382 Arctic Sea Ice Minimum 2024](https://svs.gsfc.nasa.gov/5382/) | **14/03 a 11/09/2024** | Diária | Quadros 3840×2160; linha amarela = mínimo médio 1981–2010 |
| Gelo (2 anos) | [5099 Daily Polar Sea Ice](https://svs.gsfc.nasa.gov/5099/) | **~2 anos** (datas exatas **a verificar**, amostra de jun/2023) | Diária; 731 quadros | Ártico + Antártida lado a lado, 4320×2160 |
| Raios | [5011 Lightning from the ISS](https://svs.gsfc.nasa.gov/5011/) | **jan/2017 a jul/2023** | Janela móvel de 10 dias | Vídeo 4096×2048 (SOS) |
| Luzes noturnas | [5313 Change in Night Lights](https://svs.gsfc.nasa.gov/5313/) | **2012–2023** | Anual | Mapa plano 32:9 (7680×2160); depois vira mapa de mudança (roxo = mais luz, laranja = menos) |
| CO₂ | [5196 DYAMOND CO₂](https://svs.gsfc.nasa.gov/5196/) | **só jan–mar/2020** (modelo) | Não informada | Globo 3D, não é mapa plano |
| Temp. do oceano | [3912 Sea Surface Currents and Temperature](https://svs.gsfc.nasa.gov/3912/) | **só mar/2007 a mar/2008** (modelo ECCO2) | Não informada | Quadros 2048×1024 |

### Consequências para o design (importante)

- **Os períodos quase não se cruzam.** Temperatura + Raios + Luzes noturnas convivem em **2017–2023**. O gelo é de **2024** (ou dos ~2 anos do 5099) e não cruza com a temperatura do 5207, que termina em 2023.
- **CO₂ não serve como camada histórica** (são 3 meses de 2020). O exemplo "Ártico + gelo + CO₂, 2024" **não é possível** com os dados do EIC.
- **Temperatura do oceano (3912) cobre só um ano.** Para o compositor, usar a **temperatura global do 5207** (terra + oceano) como camada "Temperatura".
- **"Geleiras" não existem no EIC**: o que há é **gelo marinho**. Na interface e na narração, dizer "gelo do mar Ártico".

### Regra do disco para lidar com isso

- Cada cartão de camada mostra uma **barrinha com o período disponível**.
- O período do disco = **interseção** das camadas colocadas. Se não houver interseção, o disco avisa ("Gelo só existe em 2024; Temperatura vai até 2023") e sugere uma combinação que funciona.
- O gelo ganha destaque próprio na **Aula do gelo** (seção 6), onde não depende de cruzar com outras camadas.

**Decisão para a equipe:** manter CO₂ fora do compositor (recomendado) ou usá-lo num "disco especial 2020" de 3 meses.

---

## 3. Como a imagem vira número (análise de pixels)

O som tem que nascer **da imagem** (exigência do desafio). Para cada camada:

| Camada | O que medir em cada quadro | Como |
|---|---|---|
| Temperatura | Anomalia média da região (°C) | Comparar cada pixel com a **tabela de cores** oficial do 5207 e achar a cor mais próxima → valor |
| Gelo | Área de gelo (% da região) e quanto está abaixo da linha amarela da média 1981–2010 | Contar pixels branco-azulados (gelo > 15% de concentração) |
| Raios | Densidade de raios | Contar pixels de clarão acima de um limiar de brilho |
| Luzes noturnas | Intensidade de luz | Soma do brilho dos pixels na região |

Mais a grade do briefing (32 colunas × 8 linhas): a **agulha varre a imagem** dentro de cada ano. A coluna vira o tempo dentro do compasso, a posição vira o lado do som (esquerda/direita) e a linha vira a oitava.

**Onde a análise roda:**
- **No navegador, ao vivo** (Canvas `getImageData`), como pede o desafio.
- Os quadros precisam estar **no próprio site** (mesma origem). Imagens carregadas direto do SVS "contaminam" o canvas por CORS e não dá para ler os pixels.
- Opcional: um `features.json` pré-calculado como reserva, caso a análise ao vivo fique lenta no celular.

**Regiões:** cada região é uma caixa de latitude/longitude convertida em pixels **por visualização**, já que as projeções diferem (equirretangular, 32:9, vista polar). Isso fica num `manifest.json` por camada.

---

## 4. Como o número vira música

| Elemento | Regra |
|---|---|
| Tempo | 1 ano = 1 compasso (~2 s). Controle de velocidade (0,5× a 2×). 2017–2023 ≈ 15 s; 1880–2023 ≈ 5 min |
| Escala | Pentatônica para tudo soar bem junto. **Maior** perto do normal, **menor** quando a anomalia é grande |
| Temperatura | Nota do baixo e cor do acorde sobem com a anomalia; acima de um limiar, acordes ficam mais tensos |
| Gelo | Número de sinos ∝ área de gelo. Menos gelo = mais silêncio, notas "pingando" para o grave |
| Raios | Densidade de batidas ∝ densidade de raios |
| Luzes noturnas | Melodia; volume e número de notas ∝ intensidade de luz |
| Ambiente | Pad sintetizado por baixo de tudo (100% original, evita problema de licença de música pronta) |

**Motor de som:** Web Audio API, de preferência com **Tone.js** (licença MIT). Ele já resolve agendamento no tempo, sintetizadores, reverb e panorâmica.

---

## 5. Interface e visual

- **Disco:** Canvas 2D (ou SVG) com camadas desenhadas por cima. Three.js é desnecessário e arriscado no prazo.
- **Elementos:** disco + rótulo central (mapa da região + título), braço/agulha, prateleira de camadas, seletor de região, seletor de período (dois controles deslizantes: início e fim), Play/Pause, velocidade, compartilhar.
- **Estado vazio:** "Arraste uma camada para o disco (ou use Tab + Enter)".
- **Durante o Play:** ano atual em destaque grande + legenda do que se ouve ("2020: temperatura +1,0 °C acima da média, muitos raios na região").
- Respeitar `prefers-reduced-motion` (disco gira devagar ou para; só a agulha anda).
- Não depender só de vermelho/azul: usar também textura, brilho e texto.

---

## 6. Modo Aula (didático): "Uma estação de gelo derretendo"

Usa o **5382**: de 14/03/2024 (máximo) a 11/09/2024 (mínimo), com a linha amarela da média 1981–2010. Duração ~60–90 s.

1. **Conheça o som (10 s):** "Cada sino é um pedaço de gelo do mar Ártico."
2. **Março:** muitos sinos, escala maior.
3. **Derretimento:** a agulha avança dia a dia, os sinos somem e as notas descem.
4. **Abaixo da média:** quando o gelo fica menor que a linha amarela, entra um tom grave de alerta. É o dado mostrando que este ano derreteu mais que o normal de 1981–2010.
5. **Pergunta:** "Qual soou mais vazio, março ou setembro?" Depois vem a resposta com o valor medido em texto e voz.
6. **Convite:** "Agora monte o seu disco."

Outras aulas, se der tempo: "Do século XIX até hoje" (temperatura 1880–2023, antes × depois) e "Raios pelo mundo".

---

## 7. Acessibilidade (requisitos práticos)

| Requisito | Como implementar |
|---|---|
| Arrastar não pode ser obrigatório (WCAG 2.5.7) | Cada camada é um botão: Tab até ela, Enter adiciona; Delete remove |
| Leitor de tela | Regiões `aria-live` anunciam mudanças ("Gelo adicionado. Período 2024. Duração 40 s.") |
| Descrição do disco | Texto sempre atualizado: região, período, camadas, duração e resumo dos dados |
| Atalhos de teclado | Espaço = play/pause; ← → = ano anterior/seguinte, com narração do dado; D = descrever agora |
| Narração | Web Speech API (pt-BR e en-US); toda fala também vira legenda na tela |
| Tátil | Vibration API nos raios e nas batidas. Funciona no Android; **iPhone/Safari não suporta**, então mostrar pulso visual como alternativa |
| Visual | Alto contraste, alvos grandes (≥ 44 px), modo calmo (menos movimento e volume) |
| Idiomas | Textos em arquivo separado (`pt.json` / `en.json`) |
| Áudio | O navegador só libera som após um clique ou tecla: o primeiro Play "acorda" o áudio |
| Teste final | Usar o site inteiro só com teclado e com o NVDA (Windows) ou o TalkBack (Android), de olhos fechados |

---

## 8. Compartilhar

- A receita vai na URL: `#c=temp,raios&r=atl-sul&p=2017-2023`. Quem abre o link ouve **exatamente** a mesma música.
- Título automático a partir da receita.
- Opcional: **baixar o áudio** (gravar a saída com `MediaRecorder` em WebM). Isso também serve para montar uma "playlist" de exemplos para a entrega.

---

## 9. Estrutura do projeto

```
/index.html
/css/style.css
/js/
  main.js        inicialização, rotas, atalhos
  disco.js       desenho do vinil, camadas visuais, agulha
  camadas.js     catálogo: nome, período, instrumento, cor
  analisador.js  imagem → números (canvas, tabela de cores, contagem de pixels)
  compositor.js  receita → partitura (anos, escala, notas)
  audio.js       instrumentos e reprodução (Tone.js)
  narracao.js    voz + legendas
  acessivel.js   aria-live, descrição, teclado, vibração
  compartilhar.js URL, título, download do áudio
/dados/<camada>/
  quadros/AAAA.jpg (ou AAAA-MM-DD.jpg)
  manifest.json  datas dos quadros, projeção, caixas das regiões, tabela de cores
/scripts/extrair-quadros.md  comandos ffmpeg usados
/i18n/pt.json, en.json
README.md, REFERENCIAS.md
```

**Tamanho:** quadros reduzidos para ~1024×512 em JPG (~50 KB). Temperatura com 1 quadro por ano dá 144 arquivos (~7 MB), o que é tranquilo no GitHub Pages. **Não subir os MP4 originais** (até 4 GB).

---

## 10. Ferramentas

| Para quê | Ferramenta |
|---|---|
| Código | Editor (VS Code), Git, GitHub, GitHub Pages |
| Extrair quadros dos vídeos | **ffmpeg** (ex.: `ffmpeg -i entrada.mp4 -vf "fps=1,scale=1024:-1" saida_%03d.jpg`) |
| Som | Web Audio API + Tone.js |
| Voz | Web Speech API |
| Teste de acessibilidade | Teclado, NVDA, TalkBack, Lighthouse |
| Slides / vídeo de 30 s | Canva/Figma/Google Slides; OBS para gravar a tela |

---

## 11. Divisão da equipe

| Perfil | Responsável por |
|---|---|
| **Dev** | Estrutura, disco interativo, teclado/ARIA, URL de compartilhar, deploy |
| **Dados/Áudio** | Baixar e extrair quadros, `manifest.json`, regiões, analisador, instrumentos e regras musicais |
| **Designer** | Visual do vinil e de cada camada, ícones, contraste, telas para os slides |
| **Storyteller** | Textos da Aula e da narração (pt/en), roteiro do vídeo/slides, Resumo, Detalhes, **REFERENCIAS.md** |

---

## 12. Cronograma até o envio

| Quando | Entrega |
|---|---|
| Sáb 14/11, tarde | Quadros extraídos (temperatura, gelo 5382, raios, luzes) + manifests; esqueleto do site |
| Sáb 14/11, noite | Analisador + motor de som tocando a temperatura 1880–2023 |
| Dom 15/11, manhã | Disco com arrastar/teclado, 3 camadas, região e período |
| Dom 15/11, início da tarde | Aula do gelo, narração, legendas, vibração, link de compartilhar |
| Dom 15/11, fim da tarde | Teste de acessibilidade de olhos fechados; correções; deploy no GitHub Pages |
| Dom 15/11, noite | Slides/vídeo, README, Referências. **Enviar até 22h**, com folga |

**Corte de escopo se apertar:** 1º vai embora a vibração e o download de áudio; 2º as regiões (fica só "mundo"); **nunca** cortar o teclado/leitor de tela nem a Aula.

---

## 13. Riscos

| Risco | Mitigação |
|---|---|
| Períodos das camadas não se cruzam | Regra de interseção + aviso + combinações sugeridas |
| Ler a cor errada (bordas, textos, legenda dentro do quadro) | Usar versões "sem data / sem legenda" quando houver; recortar a área do mapa |
| Celular lento na análise ao vivo | `features.json` pré-calculado como reserva |
| Licença das imagens | SVS pede crédito "NASA's Scientific Visualization Studio"; ler as NASA Reproduction Guidelines linkadas em cada página |
| Prazo | Escopo mínimo acima; enviar com 2 h de folga |

---

## 14. Pendências antes de começar

- [ ] Equipe aprovar a regra de interseção de períodos e a saída do CO₂.
- [ ] Confirmar as datas exatas do 5099 (gelo de 2 anos).
- [ ] Confirmar a projeção das luzes noturnas (32:9) para recortar regiões.
- [ ] Baixar a tabela de cores do 5207.
- [ ] Definir a lista de regiões (sugestão: Mundo, Brasil, Atlântico Sul, Ártico, Europa, Índia).
