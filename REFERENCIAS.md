# Referências — Jam Space

Lista **viva**: tudo o que entrar no projeto (dados, código, imagens, sons, fontes, IA) é registrado aqui **no momento em que for usado**.
Formato: o quê · link · crédito exigido · licença/termos · onde usamos · status.

Status: ✅ verificado · ⚠️ a verificar · 📝 planejado (ainda não usado)

---

## 1. Desafio

- **NASA Space Apps Challenge 2026: The Earth Information Jukebox** · https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/ · ✅

## 2. Dados e visualizações da NASA

Crédito geral pedido pelo SVS: **"NASA's Scientific Visualization Studio"**. Cada página aponta para as *NASA Reproduction Guidelines* (⚠️ ler antes de publicar).

| # | Visualização | Link | Créditos de dados (da página) | Uso no projeto | Status |
|---|---|---|---|---|---|
| 1 | Global Temperature Anomalies 1880–2023 (SVS 5207) | https://svs.gsfc.nasa.gov/5207/ | Robert B. Schmunk (NASA/GSFC GISS) | Camada Temperatura | 📝 |
| 2 | Arctic Sea Ice Minimum 2024 (SVS 5382) | https://svs.gsfc.nasa.gov/5382/ | JAXA (AMSR2); Blue Marble: Reto Stockli (NASA/GSFC). Equipe: Trent L. Schindler, Cindy Starr, Grace Weikert, Walt Meier | Não usado (globo gira; trocado pelo SVS 5099) | 📝 |
| 3 | Daily Polar Sea Ice, Two Year History (SVS 5099) | https://svs.gsfc.nasa.gov/5099/ | JAXA (AMSR2); Blue Marble: Reto Stockli (NASA/GSFC) | Camada Gelo: vídeo webm 4096×2048 lido nos pixels (730 dias desde 03/05/2021) | ✅ |
| 4 | Lightning Events from the ISS 2017–2023 (SVS 5011) | https://svs.gsfc.nasa.gov/5011/ | ⚠️ copiar da página | Camada Raios: vídeo 4096×2048 lido nos pixels | ✅ |
| 4b | GEOS-FP Precipitation and Clouds (SVS 5149), painel Earth Now do EIC | https://svs.gsfc.nasa.gov/5149/ | Modelo NASA GMAO GEOS-FP | Camada Chuva: 24 quadros 2048×1024 lidos pela legenda | ✅ |
| 4c | Near Real-Time Global Precipitation, GPM IMERG (SVS 5650) | https://svs.gsfc.nasa.gov/5650/ | Não está na galeria do EIC | Não usado | — |
| 5 | Change in Night Lights 2012–2023 (SVS 5313) | https://svs.gsfc.nasa.gov/5313/ | Visualização: Kel Elkins. Dados: NASA Black Marble (Suomi NPP VIIRS); NASA Earth Observatory; Miguel Román (NASA GSFC) | Camada Luzes noturnas: vídeo 7680×2160 lido nos pixels | ✅ |
| 6 | DYAMOND Global Carbon Dioxide (SVS 5196) | https://svs.gsfc.nasa.gov/5196/ | Modelo GEOS / DYAMOND (GEOS-MITgcm) | Fora do compositor (só jan–mar/2020) | 📝 |
| 7 | Global Sea Surface Currents and Temperature (SVS 3912) | https://svs.gsfc.nasa.gov/3912/ | Crédito: NASA/Goddard Space Flight Center SVS. Dados: ECCO2 (MIT/JPL) | Não usado (só 2007–2008) | 📝 |
| 8 | EIC Content Database | https://svs.gsfc.nasa.gov/gallery/earth-information-center/ | — | Fonte principal | ✅ |
| 9 | Climate Vital Signs Dashboard | https://svs.gsfc.nasa.gov/gallery/climate-vital-signs-dashboard/ | — | Pesquisa | ✅ |
| 10 | Data Sonification: Caldwell 73 (SVS 13786) | https://svs.gsfc.nasa.gov/13786/ | — | Inspiração conceitual | 📝 |

## 2.1 Estudos que embasam a geração da música

| Referência | O que tiramos dela | Status |
|---|---|---|
| Hermann, T.; Hunt, A.; Neuhoff, J. G. (orgs.). *The Sonification Handbook*. Berlim: Logos, 2011 | Base geral de sonificação | ⚠️ conferir dados bibliográficos e link |
| Grond, F.; Berger, J. "Parameter Mapping Sonification". In: *The Sonification Handbook*, cap. 15, 2011 | Método usado: cada dimensão do dado controla um parâmetro do som; quantidade → densidade de notas; mapeamento redundante (um dado em vários parâmetros) para separar os extremos | ⚠️ conferir |
| Walker, B. N. "Magnitude estimation of conceptual data dimensions for use in sonification". *Journal of Experimental Psychology: Applied*, 8(4), 2002 | Polaridade: valor maior → som mais agudo | ⚠️ conferir |
| Walker, B. N.; Kramer, G. "Mappings and metaphors in auditory displays: an experimental assessment". *ACM Transactions on Applied Perception*, 2(4), 2005 | Escolha de mapeamentos e polaridades | ⚠️ conferir |
| Crawford, D. *A Song of Our Warming Planet*. Universidade de Minnesota, 2013 | Precedente: uma nota por ano, altura = temperatura (dados NASA GISS) | ⚠️ conferir |
| Toussaint, G. "The Euclidean algorithm generates traditional musical rhythms". *Proceedings of BRIDGES*, 2005 | Distribuir batidas (raios, arpejo, sinos) mantendo o ritmo musical | ⚠️ conferir |
| NASA Chandra, *A Universe of Sound* (ex.: SVS 13786, Caldwell 73) | Exemplo de sonificação da própria NASA | ⚠️ conferir |

As mesmas referências aparecem no painel "Como funciona" do site (botão ⓘ).

### 2.2 Leitura dos quadros (pixels)

- SVS 5207: quadros 3840×2160 (`frames/3840x2160_16x9_30p/GISTEMP_Map_4K###.png`), projeção Robinson; `time.txt` liga quadro → ano; escala `giss_navy_anomaly_Vertical-both.png`, lida como ±2 °C.
  - Teste com o quadro de 2023: média global ponderada pela área = +1,03 °C. Bate com a média de 24 meses 2022–2023 do GISTEMP (~1,0 °C), o que confirma a escala. ✅
  - Leitor próprio em `ferramentas/` (Node, sem dependências). Lidos os 143 anos (1881–2023), um quadro por ano; resultado em `site/dados/temperatura.json`. Os quadros foram apagados depois da leitura. ✅
  - Limite: a escala satura em +2 °C, então o Ártico nos anos recentes aparece como ~+1,8 °C (o valor real pode ser maior).
- SVS 5382: globo que gira e aproxima durante o vídeo; neve em terra parece gelo. Não usado. 
- SVS 5011 (raios): mapa plano padrão; pixel amarelo = raio; uma amostra a cada janela de 10 dias. O vídeo não tem datas: os anos foram alinhados pelos 7 picos de julho. Sem Ártico (órbita da ISS até ~52°). Resultado em `site/dados/raios.json`. ✅
- SVS 5313 (luzes): mapa plano, 12 px por grau, alinhado à máscara terra/mar tirada do Blue Marble dos quadros do 5149 (85% de acerto). Brilho médio das terras por ano, 2012–2023. Resultado em `site/dados/luzes.json`. ✅
- SVS 5149 (chuva): 24 quadros (1 a cada 16 h, 29/10 a 13/11/2026); cor comparada com a legenda oficial; fração da área com chuva (~10% do globo). Resultado em `site/dados/chuva.json`. ✅
- SVS 5099 (gelo): vista polar fixa, georreferenciada com modelo de perspectiva (85% de acerto com a máscara terra/mar); pixel branco sobre o mar = gelo; média mensal de mai/2021 a abr/2023. A forma do ciclo bate com o esperado (máximo em março, mínimo em setembro), mas a área absoluta sai ~2–3 milhões de km² acima por causa da costa; por isso o app mostra só a fração do maior mês. Resultado em `site/dados/gelo.json`. ✅
- Disco 3D: a mesma máscara terra/mar (1°, do Blue Marble dos quadros do SVS 5149) desenha os continentes no vinil, em projeção polar (90°N no centro, 60°S na borda). O relevo é estilizado, não é dado de altitude. A placa de gelo usa a área do mês do SVS 5099 convertida em latitude da borda da calota. Arquivo `site/dados/mascara-terra.json`.
- Leitura dos vídeos feita no navegador (`ferramentas/leitor.html`, canvas `getImageData`).

## 3. Código e bibliotecas

| Item | Link | Licença | Uso | Status |
|---|---|---|---|---|
| three.js 0.170.0 (via jsDelivr), com os módulos RoomEnvironment, EffectComposer, UnrealBloomPass e OutputPass | https://threejs.org/ | MIT | Disco 3D e efeitos de brilho | ✅ em uso |
| Tone.js | https://tonejs.github.io/ | MIT | (não usado: o som é Web Audio puro) | — |
| Web Audio, Canvas, Web Speech, Vibration API | https://developer.mozilla.org/ | Padrões web (sem licença a citar; citar MDN como documentação) | Som, análise, voz, tátil | 📝 |
| ffmpeg | https://ffmpeg.org/ | LGPL/GPL (só usado como ferramenta, não distribuído) | Extrair quadros dos vídeos | 📝 |

## 4. Imagens, ícones e fontes

| Item | Link | Licença | Uso | Status |
|---|---|---|---|---|
| Disco de vinil e camadas visuais | — | Criação própria da equipe | Interface | 📝 |
| Fonte Unbounded (Google Fonts) | https://fonts.google.com/specimen/Unbounded | SIL Open Font License | Títulos e rótulo do disco | ✅ em uso |
| Fonte Atkinson Hyperlegible (Google Fonts), criada pelo Braille Institute para baixa visão | https://fonts.google.com/specimen/Atkinson+Hyperlegible | SIL Open Font License | Texto | ✅ em uso |
| Ícones das camadas (termômetro, raio, luzes, floco de neve) | — | Desenho próprio (SVG) | Botões das camadas | ✅ |

## 5. Música e áudio

| Item | Link | Licença | Uso | Status |
|---|---|---|---|---|
| Todos os sons | — | Síntese própria, gerada em tempo real a partir dos dados | Toda a trilha | 📝 |
| StockTune (ideia descartada ou só fundo) | https://stocktune.com/free-songs/environmental-music | ⚠️ licença não verificada para repositório público | — | ⚠️ |

## 6. Estatísticas citadas nos slides

| Afirmação | Fonte | Status |
|---|---|---|
| ~2,2 bilhões de pessoas com deficiência visual | OMS, World Report on Vision (https://www.who.int/) | ⚠️ confirmar número e link exato |
| ~7,9 milhões de brasileiros com dificuldade permanente de enxergar (usado no site, painel ⓘ) | Censo IBGE, segundo o resumo do time | ⚠️ confirmar ano do censo, número e link |
| ODS 4, 10 e 13 (usados no site, painel ⓘ) | ONU, Objetivos de Desenvolvimento Sustentável (https://brasil.un.org/pt-br/sdgs) | ⚠️ conferir link |

## 7. Uso de Inteligência Artificial (declaração obrigatória pelas regras do Space Apps)

| Ferramenta | Para quê | Status |
|---|---|---|
| Claude (Anthropic), via Claude Code | Planejamento do conceito, pesquisa e verificação dos períodos das visualizações SVS, levantamento de requisitos, apoio na escrita de código e textos | ✅ em uso |
| (outras IAs usadas pela equipe: imagens, voz, texto) | | ⚠️ cada membro adicionar |
