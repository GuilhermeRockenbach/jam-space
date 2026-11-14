# Jam Space — protótipo

Um toca-discos 3D: escolha as camadas de dados, o lugar e o período, e aperte o play no centro do disco. **Os valores ainda são dados de demonstração.** Na versão final, eles vêm da leitura dos pixels dos quadros do NASA SVS (ver `../requisitos.md`).

## Rodar

Na pasta `Hackathon`:

```bash
python -m http.server 5173 --directory site
```

Abra http://localhost:5173. É preciso internet para carregar o three.js e as fontes.

Receitas de exemplo:
- `#c=temp,luzes,raios&p=2017-2023`
- `#c=temp&r=artico&p=1880-2023`
- `#c=gelo` (uma estação de gelo derretendo, março a setembro de 2024)

## Arquivos

| Arquivo | O que faz |
|---|---|
| `index.html` | Estrutura: palco 3D, play no centro, camadas, lugar e período, opções de acessibilidade |
| `style.css` | Visual (fontes Unbounded e Atkinson Hyperlegible) |
| `app.js` | Liga tudo: estado, reprodução, linha do tempo, anúncios, link |
| `cena.js` | three.js: vinil, braço, sulco atual e o ambiente de cada camada (brilho de calor, cristais de gelo, cidades, raios) |
| `audio.js` | Sons gerados com Web Audio |
| `dados.js` | Camadas, regiões, **valores de demonstração** e textos |

## Acessibilidade

- O play é um botão de verdade, com nome que diz o que vai tocar.
- As camadas são botões: Tab + Enter. Arrastar para o disco é opcional.
- Linha do tempo: as setas tocam e descrevem ano a ano.
- Anúncios para leitor de tela, narração opcional, vibração opcional.
- Com "reduzir movimento" ligado no sistema, o disco não gira e as partículas ficam paradas.
- Sem WebGL, o 3D some e o som e os controles continuam funcionando.

## Próximo passo

Trocar `valorTemp`, `valorRaios`, `valorLuzes` e `GELO_DEMO` em `dados.js` por valores lidos dos quadros.
