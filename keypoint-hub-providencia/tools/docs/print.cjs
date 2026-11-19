// Imprime a PDF los documentos HTML de docs/. Uso: node tools/docs/print.cjs  (requiere Playwright)
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const docs = path.join(__dirname, '..', '..', 'docs');
(async () => {
  const b = await chromium.launch(), p = await b.newPage();
  const jobs = [['manual.html', 'manual.pdf'], ['informe.html', 'informe-capstone.pdf'], ...fs.readdirSync(path.join(docs, 'tripticos')).filter(f => f.endsWith('.html')).map(f => ['tripticos/' + f, 'tripticos/' + f.replace('.html', '.pdf')])];
  for (const [src, out] of jobs) { if (!fs.existsSync(path.join(docs, src))) continue; await p.goto('file://' + path.join(docs, src)); await p.waitForTimeout(400);
    await p.pdf({ path: path.join(docs, out), preferCSSPageSize: true, printBackground: true, displayHeaderFooter: src === 'manual.html' || src === 'informe.html', headerTemplate: '<span></span>', footerTemplate: '<div style="font:8px Inter,sans-serif;color:#888;width:100%;text-align:center"><span class="pageNumber"></span></div>' }); console.log(out); }
  await b.close();
})();
