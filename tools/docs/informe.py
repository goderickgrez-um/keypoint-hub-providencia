# Convierte docs/informe.md en docs/informe.html (luego tools/docs/print.cjs lo pasa a PDF).
import os, markdown
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
md = open(os.path.join(ROOT, 'docs', 'informe.md'), encoding='utf-8').read()
body = markdown.markdown(md, extensions=['tables', 'md_in_html'])
CSS = """@page { size: Letter; margin: 22mm 22mm 24mm; }
body { font: 11pt/1.55 Inter, 'DejaVu Sans', sans-serif; color: #1D1D1F; }
h1 { font-size: 24pt; margin: 30mm 0 6mm; letter-spacing: -.02em; } h1 + h2 { font-size: 16pt; color: #0E7C86; margin-bottom: 20mm; border: 0; }
h2 { font-size: 15pt; margin: 9mm 0 3mm; color: #0E7C86; break-after: avoid; } h3 { font-size: 12pt; margin: 6mm 0 2mm; break-after: avoid; }
p { margin: 0 0 3mm; text-align: justify; } li { margin-bottom: 1.5mm; }
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 2mm 0 5mm; break-inside: avoid; }
th, td { text-align: left; padding: 1.8mm 2mm; border-bottom: .3mm solid #DAD5CA; vertical-align: top; } th { background: #EAF3F2; }
.pb { break-after: page; } code { font-size: 9.5pt; }
.shots { display: flex; gap: 4mm; margin: 4mm 0; } .shots img { width: 32%; border: .3mm solid #DAD5CA; border-radius: 2mm; }
.wide img { width: 100%; border: .3mm solid #DAD5CA; border-radius: 2mm; margin: 2mm 0; }"""
open(os.path.join(ROOT, 'docs', 'informe.html'), 'w', encoding='utf-8').write(f'<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Informe Capstone · keypoint</title><style>{CSS}</style></head><body><img src="../assets/logo.png" style="width:28mm;margin-top:10mm">{body}</body></html>')
print('docs/informe.html')
