# Jam Space: resumo do projeto

**NASA Space Apps Challenge 2026 · Lajeado (RS) · desafio The Earth Information Jukebox**

> A ciência da Terra não precisa só ser vista. Ela pode ser ouvida e sentida por todo mundo.

- Protótipo: https://claude.ai/artifact/JpyyyarxiQ5NTVW5Vm7UHS
- Apresentação (7 slides): https://claude.ai/artifact/MEstRxfhgx3RMiByn884yN

## O que é

O Jam Space é um toca-discos do planeta que roda no navegador. A pessoa arrasta temas do clima (temperatura, raios, chuva, luzes noturnas, gelo do Ártico) para dentro de um disco em 3D, escolhe o lugar e o período, e aperta play. A música que sai é feita com os dados das visualizações da NASA: cada ano vira um compasso, e o calor muda o andamento, os acordes, o timbre e a bateria. Enquanto toca, um terreno cresce sobre o disco e muda de cor com a temperatura.

## Por que importa (impacto)

A NASA produz algumas das imagens mais impressionantes do planeta, mas quase toda a comunicação sobre o clima depende da visão. Quem não enxerga fica de fora. Dados abertos não são o mesmo que dados acessíveis.

- **Público principal:** pessoas cegas ou com baixa visão, como o Mateus, 24 anos, que hoje não tem acesso aos gráficos do clima.
- **Público secundário:** professores, escolas e museus, como a professora Camila, 38 anos, que busca ensinar mudança climática com mais de um sentido.
- **Números de contexto** (a confirmar nas fontes oficiais antes de usar):
  - [~7,9 milhões] de brasileiros com dificuldade permanente de enxergar, segundo o Censo IBGE.
  - [~2,2 bilhões] de pessoas com alguma deficiência visual no mundo, segundo a OMS (World Report on Vision).
- **ODS da ONU:**
  - ODS 10 (redução das desigualdades): ciência espacial sem depender da visão.
  - ODS 4 (educação de qualidade): aprendizado multissensorial.
  - ODS 13 (ação climática): números viram emoção; ouvir 1910 e depois 2023 deixa a urgência clara.

## O que tem de original (criatividade)

- **Metáfora física:** o disco de vinil vazio que ganha camadas. Cada tema é um instrumento:

  | Tema | Instrumento |
  |---|---|
  | Temperatura | baixo, acordes e melodia |
  | Raios | percussão |
  | Chuva | garoa e gotas |
  | Luzes noturnas | arpejo |
  | Gelo | sinos |

- **Os cinco temas tocam juntos:** cada um tem seu registro (do grave ao agudo) e o volume se ajusta à mistura, para o conjunto continuar agradável.
- **Duas formas de ouvir:**
  - **Ano a ano:** você ouve a mudança ao longo do tempo.
  - **Retrato do período:** a média de um período vira uma música em loop. Serve para comparar 1950–1980 com 2013–2023.
- **Música de verdade, não bipes:** harmonia em Ré maior, frases de 4 compassos e ritmos euclidianos. A tensão vem de acordes emprestados do modo menor quando o dado se afasta do normal.
- **Frio e calor têm cara própria:**
  - Frio: andamento lento, flauta grave, vento agudo e sinos de gelo.
  - Calor: até 140 batidas por minuto, violoncelo áspero, prato, um grave suave e cordas agudas no extremo.
- **Mesma receita, mesma música:** nada é sorteado. Quando 2023 soa mais tenso que 1910, é o dado falando.

## Como funciona (validade científica)

A temperatura é **lida dos pixels** da visualização Global Temperature Anomalies 1880–2023 (NASA SVS 5207, dados GISTEMP/GISS):

1. Para cada ano, baixamos o último quadro do vídeo em 4K (143 quadros, 1881–2023).
2. Cada cor do mapa vira um valor em °C pela escala oficial da visualização (−2 a +2 °C).
3. O mapa está na projeção Robinson. Amostramos uma grade de 1° × 1° de latitude e longitude, projetada sobre o mapa.
4. Fazemos a média ponderada pela área (cosseno da latitude) para o mundo e para três regiões (Brasil, Atlântico Sul, Ártico). Linhas de costa e fronteiras ficam de fora.

**Checagem:**

| Ano | Média global lida nos pixels | Referência GISTEMP |
|---|---|---|
| 2023 | +1,03 °C | ~1,0 °C (média de 24 meses de 2022–2023) |
| 1910 | −0,43 °C | ~−0,4 °C |

**Limites:**
- A escala do mapa satura em +2 °C, então o Ártico recente aparece perto de +1,8 °C (o valor real pode ser maior).
- Os mapas são médias móveis de 24 meses.
- Raios (SVS 5011), luzes noturnas (5313), chuva (5149) e gelo do Ártico (5099) também são lidos nos pixels, dos vídeos e quadros da NASA. Nenhum valor é inventado.
- Raios não têm dados no Ártico (a órbita da ISS só vai até ~52°). Chuva cobre 29/10–13/11/2026 e gelo mai/2021–abr/2023: junto com temas anuais, eles tocam em ciclo.
- No gelo, a área absoluta sai acima do real por causa da costa; o app usa a fração do maior mês, que preserva o ciclo de derretimento.

## Como o som é feito (validade técnica)

Usamos **sonificação por mapeamento de parâmetros**: cada característica do dado controla uma característica do som (Grond & Berger, 2011).

| Dado | O que você ouve | Base |
|---|---|---|
| Temperatura | andamento de 70 a 140 bpm, melodia mais aguda, timbre mais áspero, acordes mais tensos, bateria mais cheia | "mais" soa mais agudo: polaridade positiva (Walker, 2002; Walker & Kramer, 2005); uma nota por ano, mais aguda quanto mais quente (Crawford, 2013) |
| Raios | caixa nos tempos 2 e 4 e batidas extras, sempre no ritmo | ritmos euclidianos (Toussaint, 2005) |
| Chuva | garoa ao fundo e gotas curtas; mais chuva, mais gotas | densidade de eventos |
| Luzes noturnas | arpejo; mais luz, mais notas | densidade de eventos |
| Gelo | sinos; abaixo da média de 1981–2010, entra um som grave | densidade de eventos |

- **Contraste ajustado ao período:** no modo ano a ano, o ano mais frio e o mais quente do período escolhido viram os extremos da música, porque dentro de períodos curtos a diferença real é de décimos de grau. No modo retrato, vale o valor absoluto.
- **Tecnologia:**
  - Web Audio API, com síntese própria (nenhuma música gravada).
  - three.js 0.170 para o disco em 3D.
  - Site estático, sem servidor, que funciona no computador e no celular.
- **Acessibilidade:**
  - Tudo funciona pelo teclado. Atalhos: 1 a 4 ligam os temas, espaço toca, D descreve o disco, L abre lugar e período, I abre o painel de informação.
  - Avisos para leitor de tela e narração opcional por voz.
  - Fonte Atkinson Hyperlegible (Braille Institute).
  - Cores testadas para daltonismo, com ícones e padrões, e não só cor.
  - Página legível com zoom de 200%.
  - Vibração nos raios no Android.

## Relevância ao desafio

| O desafio pede | O Jam Space |
|---|---|
| Usar visualizações do Earth Information Center | Lê os pixels dos quadros do SVS 5207 e também os de 5011, 5313, 5149 e 5099, todos da galeria do EIC |
| Som gerado em tempo real a partir da imagem | Cor do pixel → °C → andamento, harmonia, timbre, gerados ao vivo |
| Equilíbrio entre fidelidade e musicalidade | Escala, harmonia, frases e ritmos fixos; os dados mudam o caráter, não sorteiam notas |
| Acessibilidade como tema central | Teclado, leitor de tela, descrição em texto, vibração, fonte e cores acessíveis |
| Contar a história e explicar as escolhas | Painel "Ouvir a Terra" com o mapeamento, os estudos e todas as fontes |
| Jukebox web interativo | Site estático, roda no navegador |

## Time

Jam Space é um time do Rio Grande do Sul, com integrante da Colômbia, criado no Tecnovates para o NASA Space Apps Challenge 2026, em Lajeado (RS).

## Próximos passos

- Melhorar a máscara de costa do gelo para medir a área absoluta.
- Modo "explorar por toque": tocar num ponto do mapa e ouvir aquela região.
- Testes com pessoas cegas e com professores.
- Versão em inglês.

## Referências

Lista completa, com status de conferência, em [REFERENCIAS.md](REFERENCIAS.md). Uso de IA declarado: Claude (Anthropic), via Claude Code, ajudou a planejar, pesquisar e escrever código e textos.
