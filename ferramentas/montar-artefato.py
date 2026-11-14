# Monta a versão do site para publicar como artefato (claude.ai).
# Uso: python ferramentas/montar-artefato.py <pasta-site> <pasta-saida>
# - tira <!doctype>, <html>, <head> e <body> (o artefato coloca o esqueleto)
# - a página ocupa 100% da altura disponível (respeita as margens do celular)
# - esconde "Copiar link do disco" (dentro do artefato o link copiado não abriria o disco)
import re, shutil, sys
from pathlib import Path

site, saida = Path(sys.argv[1]), Path(sys.argv[2])
if saida.exists():
    shutil.rmtree(saida)
(saida / 'dados').mkdir(parents=True)
for nome in ['app.js', 'audio.js', 'cena.js', 'dados.js', 'monitor.js']:
    shutil.copy(site / nome, saida / nome)
for nome in ['temperatura', 'raios', 'luzes', 'chuva', 'gelo', 'mascara-terra']:
    shutil.copy(site / 'dados' / f'{nome}.json', saida / 'dados' / f'{nome}.json')

css = (site / 'style.css').read_text(encoding='utf-8')
css = css.replace('height: 100vh; height: 100dvh;', 'height: 100%;')
css = css.replace(':root {\n', ':root {\n  color-scheme: dark;\n', 1)
(saida / 'style.css').write_text(css, encoding='utf-8')

html = (site / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<!doctype html>\s*', '', html, flags=re.I)
html = re.sub(r'</?html[^>]*>\s*', '', html)
html = re.sub(r'</?head>\s*', '', html)
html = re.sub(r'</?body>\s*', '', html)
html = re.sub(r'\s*<meta charset[^>]*>', '', html)
html = re.sub(r'\s*<meta name="viewport"[^>]*>', '', html)
html = re.sub(r'\s*<link rel="preconnect"[^>]*>', '', html)
html = html.replace('<button id="compartilhar" type="button">', '<button id="compartilhar" type="button" hidden>')
html = html.replace('<link rel="stylesheet" href="style.css">',
                    '<link rel="stylesheet" href="style.css">\n<style>html, body { height: 100%; background: #0a1030; }</style>')
(saida / 'index.html').write_text(html.strip() + '\n', encoding='utf-8')
print('ok', sorted(p.name for p in saida.rglob('*')))
