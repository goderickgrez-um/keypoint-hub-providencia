# Genera docs/bitacora-desarrollo.html desde docs/bitacora-desarrollo.md (luego: node tools/docs/print.cjs para el PDF).
# Con argumentos convierte otro documento: python3 tools/docs/bitacora.py informe-qa "Informe de QA"
# Diseño apto para imprimir en blanco y negro.
import os, sys, markdown
NAME = sys.argv[1] if len(sys.argv) > 1 else 'bitacora-desarrollo'
TITLE = sys.argv[2] if len(sys.argv) > 2 else 'Bitácora de desarrollo'
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(ROOT, 'docs', NAME + '.md'), encoding='utf-8').read()
html = markdown.markdown(src, extensions=['tables', 'sane_lists'])
html = html.replace('<li>[x] ', '<li class="done">').replace('<li>[ ] ', '<li class="todo">')
CSS = """
@page { size: A4; margin: 20mm 18mm 18mm; }
* { box-sizing: border-box; } body { font: 10.2pt/1.5 Inter, 'DejaVu Sans', Arial, sans-serif; color: #000; margin: 0; }
h1 { font-size: 22pt; letter-spacing: -.02em; margin: 0 0 4mm; padding-bottom: 3mm; border-bottom: .8mm solid #000; }
h2 { font-size: 14pt; margin: 9mm 0 3mm; padding-bottom: 1.5mm; border-bottom: .3mm solid #000; break-after: avoid; }
h3 { font-size: 11pt; margin: 6mm 0 2mm; break-after: avoid; }
p { margin: 0 0 2.5mm; } ul, ol { margin: 0 0 3mm; padding-left: 6mm; } li { margin-bottom: 1mm; }
li.done, li.todo { list-style: none; position: relative; } li.done::before { content: '☑'; position: absolute; left: -5.5mm; } li.todo::before { content: '☐'; position: absolute; left: -5.5mm; }
hr { border: 0; border-top: .3mm solid #000; margin: 6mm 0; }
table { width: 100%; border-collapse: collapse; margin: 2mm 0 4mm; font-size: 9pt; break-inside: auto; }
th, td { border: .25mm solid #000; padding: 1.6mm 2mm; text-align: left; vertical-align: top; } th { font-weight: 700; border-bottom: .6mm solid #000; }
tr { break-inside: avoid; } code { font-family: 'DejaVu Sans Mono', Consolas, monospace; font-size: 8.8pt; }
h1 + p { font-size: 10.5pt; }
"""
open(os.path.join(ROOT, 'docs', NAME + '.html'), 'w', encoding='utf-8').write(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>{TITLE} · Keypoint Hub Providencia</title><style>{CSS}</style></head><body>{html}</body></html>')
print(f'docs/{NAME}.html')
