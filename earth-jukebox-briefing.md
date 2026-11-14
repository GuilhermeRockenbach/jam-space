# Jam Space — Briefing do projeto

Contexto consolidado da conversa de planejamento, para continuar o desenvolvimento no Claude Code.

## 1. Contexto

- **Evento:** NASA Space Apps Challenge 2026, sede local Lajeado (RS).
- **Desafio:** The Earth Information Jukebox
  (https://www.spaceappschallenge.org/2026/challenges/the-earth-information-jukebox/)
- **Prazo de envio:** domingo, 15/11/2026, 23h59.
- **Equipe:** perfis Dev, Dados/Áudio, Designer, Storyteller.
- **Texto da equipe:** "Vamos transformar dados da NASA numa experiência auditiva, inclusiva e acessível! Quer construir algo visto, ouvido e sentido no mundo todo?"

## 2. Entregáveis obrigatórios

| Item | O que é |
|---|---|
| Resumo | O que é o projeto e por que importa |
| Demonstração | 7 slides **ou** vídeo de 30 s |
| Detalhes | Como funciona e ferramentas usadas |
| Link final | Público: GitHub ou Drive |
| Dados da NASA | Obrigatório para concorrer ao prêmio global |
| Referências | Tudo o que foi usado (dados, código, imagens, músicas, IA) |

## 3. O que o desafio pede (resumo do enunciado)

- Construir um "Earth Jukebox": interface, script ou aplicação que combina **quadros visuais do Earth Information Center (EIC)** com **sonificações geradas em tempo real**.
- O som deve nascer **da imagem**: analisar cor, brilho, formas e densidade de pixels e mapear para altura, ritmo, andamento, volume, instrumentação.
- A pessoa escolhe uma visualização do EIC e ouve a paisagem sonora correspondente.
- Equilíbrio entre fidelidade ao dado e **musicalidade**: tradução direta pixel→som vira ruído; usar escalas, harmonias e regras artísticas.
- **Acessibilidade é tema central:** compatibilidade com leitor de tela, resposta tátil, texto descritivo rico.
- Contar a história: explicar o porquê das escolhas artísticas e dos algoritmos; refletir a urgência da mudança climática ou a beleza do planeta.
- Formatos aceitos: jukebox web interativo, app desktop, API, ou playlist de áudios originais gerados com explicação do processo.

## 4. Problema e motivação

**Ponto crítico:** a ciência da Terra é comunicada quase só por imagens. Quem não enxerga fica fora da conversa sobre o que está acontecendo com o planeta.

- Dados da NASA são abertos, mas "aberto" não é o mesmo que "acessível".
- Pessoas com deficiência estão entre as mais vulneráveis a eventos climáticos e são as que menos recebem a informação.
- Direito à informação, autonomia (explorar sem depender de alguém descrevendo o mapa) e educação inclusiva.
- Som cria conexão emocional que gráfico não cria.
- Analogia central: como a legenda, nasce para incluir e acaba útil para todos. Projetado para quem não pode ver, útil para quem não pode *olhar agora*.

**Frase de motivação:** "O planeta é de todos, então entender o planeta também tem que ser. Ninguém deveria precisar enxergar para saber o que está acontecendo com a Terra."

> A verificar antes de usar nos slides: número da OMS de cerca de 2,2 bilhões de pessoas com deficiência visual (confirmar na fonte oficial e citar nas Referências).

## 5. Críticas levantadas pela equipe e como o conceito responde

| Crítica | Resposta |
|---|---|
| Precisa ser útil no dia a dia, não só inclusivo | Faixa do dia + modo rádio (trilha ambiente, sem olhar a tela) |
| Por que usar isto em vez de apps existentes? | Apps de clima exigem olhar a tela e não mostram mudança histórica; leitores de tela leem números, não padrões; ferramentas da NASA são 100% visuais |
| Por que quem não tem deficiência usaria? | Uso passivo/sem tela, mostra hoje × histórico, é agradável de ouvir, e permite criar |
| "Eu acessaria uma vez e nunca mais" | Modo compositor: combinações praticamente infinitas; conteúdo diário; música compartilhável |

## 6. Conceito final

**"Componha com o planeta: escolha os dados, o lugar e o tempo, e ouça a música que a Terra faz."**

### Modos

1. **Jukebox (ouvir):** escolher uma visualização do EIC e ouvir a paisagem sonora gerada ao vivo a partir dos quadros.
2. **Compositor / "mixer da Terra" (criar):** o usuário monta a música escolhendo:
   - **Camadas**, cada uma um instrumento (ver tabela abaixo)
   - **Lugar:** mundo inteiro ou uma região
   - **Período:** um ano, uma década ou intervalo livre
   - Resultado com título e link para compartilhar.
3. **Viagem no tempo (histórico):** a mesma receita avançando pelos períodos; modo **antes × depois** (primeiro ano num ouvido, último no outro).
4. **Explorar por toque:** tocar em um ponto da imagem para ouvir a nota daquela região, com vibração no celular.
5. **Faixa do dia / modo rádio:** música gerada do quadro de hoje; reprodução contínua como trilha ambiente.

### Camadas sugeridas

| Camada | Papel musical |
|---|---|
| Temperatura (oceano / global) | Baixo e harmonia |
| CO₂ | Tensão dos acordes |
| Gelo marinho | Sons agudos e cristalinos |
| Raios | Percussão |
| Luzes noturnas | Melodia |

### Regra de ouro

**Mesma receita, mesma música.** A variedade vem das escolhas do usuário e dos dados, nunca de sorteio. Se o som fosse aleatório, deixaria de representar o dado. Quando 2023 soa mais tenso que 1980, é o dado falando.

## 7. Acessibilidade (requisitos)

- **Cegos e baixa visão:** tudo ouvível; narração por voz; compatível com leitor de tela; navegação completa por teclado; texto descritivo de cada visualização.
- **Surdos:** vibração no celular, pulsos visuais sincronizados, legendas de toda narração.
- **Mobilidade reduzida:** teclado, toque simples, alvos grandes.
- **Daltônicos e neurodivergentes:** alto contraste, paletas seguras, modo calmo.
- **Crianças e leigos:** linguagem simples; português e inglês.
- Teste de sucesso: dá para entender o planeta de olhos fechados?

## 8. Como a imagem vira som (abordagem técnica)

1. Desenhar o quadro em um `canvas` e ler os pixels (R, G, B).
2. Reduzir para uma grade (ex.: 32 colunas × 8 linhas) com a cor média de cada célula.
3. Mapear:
   - Matiz → altura da nota (azul grave, vermelho agudo)
   - Brilho → volume
   - Saturação → timbre (viva = brilhante, apagada = abafado)
   - Posição horizontal → pan estéreo
   - Posição vertical → oitava
   - Diferença entre quadros consecutivos → ritmo / densidade de batidas
4. Gerar o som com a **Web Audio API**; uma linha de varredura percorre a imagem como a agulha de um toca-discos.
5. Quantizar as notas em **escala pentatônica**; escala maior perto do normal, menor quando a anomalia é grande.

Stack sugerida: site estático (HTML/CSS/JS), sem servidor, hospedável no GitHub Pages. Web Audio API, Canvas, Web Speech API (narração), Vibration API (tátil).

### Música de fundo (StockTune)

- Ideia da equipe: usar faixas de https://stocktune.com/free-songs/environmental-music
- Música pronta sozinha **não é sonificação**. Uso válido apenas como camada de fundo **modulada pela imagem** (filtro, andamento, volume), com o sintetizador ao vivo por cima.
- **Licença não verificada.** Confirmar no site se permite redistribuição em repositório público e citar nas Referências.
- Alternativa mais segura: gerar a camada ambiente por síntese (pads), 100% original.

## 9. Dados e recursos da NASA

Fonte principal: **EIC Content Database** — https://svs.gsfc.nasa.gov/gallery/earth-information-center/

### Lista oficial do desafio

| Visualização | Link | Uso sugerido |
|---|---|---|
| Change in Night Lights 2012–2023 (EIC) | https://svs.gsfc.nasa.gov/5313/ | Intensidade → andamento/volume; histórico por lugar |
| Global Sea Surface Currents and Temperature | https://svs.gsfc.nasa.gov/3912/ | Movimento contínuo → paisagem sonora fluida |
| GEOS Aerosols | https://svs.gsfc.nasa.gov/5669/ | Multi-faixa: cada tipo de partícula um instrumento |
| Air Quality Model Runs | https://svs.gsfc.nasa.gov/5533/ | Quadros em alta resolução para download |
| Perpetual Ocean 2: Western Boundary Currents | https://svs.gsfc.nasa.gov/5425/ | Alto contraste → ritmo/escala |
| DYAMOND Global Carbon Dioxide | https://svs.gsfc.nasa.gov/5196/ | Entrada principal para síntese interativa |
| Lightning Events from the ISS 2017–2023 | https://svs.gsfc.nasa.gov/5011/ | Percussão / gatilhos |
| 3D View of an Atmospheric River | https://svs.gsfc.nasa.gov/4960/ | Densidade de umidade → texturas |
| GEDI Forest Height | https://svs.gsfc.nasa.gov/4950/ | Espectro de cor → altura/frequência |
| Data Sonification: Caldwell 73 | https://svs.gsfc.nasa.gov/13786/ | Referência conceitual de sonificação |

### Climate Vital Signs Dashboard (séries históricas)

https://svs.gsfc.nasa.gov/gallery/climate-vital-signs-dashboard/

| Visualização | SVS ID | Período |
|---|---|---|
| Global Temperature Anomalies | 5207 | 1880–2023 |
| NASA Climate Spiral | 5190 | 1880–presente |
| Zonal Climate Anomalies | 5209 | 1880–2023 |
| Sea Level Through a Porthole | 5235 | 1993–2023 |
| Arctic Sea Ice Minimum 2024 | 5382 | mar–set 2024 |
| Daily Polar Sea Ice, Two Year History | 5099 | dois anos |
| Increase in Ocean Heat (Spilhaus) | 5111 | desde 1957 |

### Outros

- Wildland Fires Dashboard: https://svs.gsfc.nasa.gov/gallery/wildland-fires/
- Daily Visualizations: https://svs.gsfc.nasa.gov/gallery/daily-visualizations/ (**a verificar** se atualiza diariamente e se permite download, antes de prometer a "faixa do dia")
- Earth Now Dashboard: https://svs.gsfc.nasa.gov/gallery/earth-now-dashboard/

## 10. Limitações e cuidados

- **Geleiras:** o EIC não tem visualização de geleiras de montanha, Groenlândia ou Antártida. Só gelo marinho, em janelas curtas (uma estação / dois anos). O "histórico de 5 anos de geleiras" não é viável com material do EIC.
- **Sazonalidade:** gelo varia mais entre estações do que entre anos; comparar sempre o mesmo mês.
- **5 anos é pouco** para tendências climáticas; oferecer série longa como padrão e período curto como opção.
- **Não é previsão do tempo:** dados de satélite têm atraso e resolução de quilômetros. Não prometer informação local em tempo real.
- **Aderência ao tema:** o som deve vir das visualizações do EIC, não de dados soltos nem de áudio pré-gravado.
- **Concorrência:** várias equipes estão sonificando uma única curva (GISTEMP, gelo do Ártico) com a justificativa "para cegos". O diferencial deste projeto é ler a imagem de verdade e o modo compositor.

## 11. Escopo recomendado para o hackathon

1. **Faixa principal completa:** temperatura global 1880–2023 (SVS 5207), com varredura, toque, narração e antes × depois.
2. **2 ou 3 camadas extras mais simples** para o modo compositor (ex.: raios como percussão, CO₂ como tensão, luzes noturnas como melodia).
3. **Acessibilidade real:** teclado, leitor de tela, legendas, vibração.
4. Site estático publicado no GitHub Pages; repositório público com README.
5. 7 slides ou vídeo de 30 s; textos de Resumo, Detalhes e Referências.

## 12. Pendências

- [ ] Equipe confirmar o conceito final (seção 6).
- [ ] Definir protagonista da história dos slides (sugestão: estudante cego na aula de ciências).
- [ ] Definir sentimento (sugestão: do belo ao urgente).
- [ ] Baixar os quadros/vídeos das visualizações escolhidas no SVS.
- [ ] Verificar Daily Visualizations (atualização e download).
- [ ] Verificar licença do StockTune ou optar por síntese própria.
- [ ] Confirmar estatísticas (OMS) nas fontes oficiais.
- [ ] Declarar uso de IA nas Referências, conforme regras do Space Apps.
