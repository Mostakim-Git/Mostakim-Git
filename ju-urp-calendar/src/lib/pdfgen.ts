// Minimal dependency-free PDF writer used to create realistic demo lecture files offline.
function esc(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/[^\x20-\x7e]/g, '');
}

const BODY: Record<string, string[]> = {
  'URP 301': [
    'Learning objectives', '- Define land use planning and its role in city development', '- Understand zoning, FAR, and land use compatibility', '- Review the Dhaka Detailed Area Plan (DAP) 2022-35 land use classes', '',
    'Key concepts', 'Land use planning is the systematic assessment of land and water potential, alternatives for land use, and economic and social conditions, in order to select and adopt the best land use options (FAO, 1993).', '',
    'Land use classes (DAP)', 'Residential, Mixed-use, Commercial, Industrial, Institutional, Open space, Agricultural, Water body, Transport.', '',
    'Reading', 'Chapin & Kaiser - Urban Land Use Planning, Ch. 1-2.',
  ],
  'URP 303': [
    'The Four-Step Model', '1. Trip Generation - how many trips start/end in each zone (regression, category analysis)', '2. Trip Distribution - where trips go (gravity model)', '3. Modal Split - which mode (logit model)', '4. Trip Assignment - which route (all-or-nothing, equilibrium)', '',
    'Gravity model', 'T_ij = P_i * A_j * F_ij * K_ij / sum_j (A_j * F_ij * K_ij)', '',
    'Exam tips', 'Practice the numerical on trip distribution from tutorial 3. Understand Wardrop equilibrium principles.',
  ],
  'URP 305': [
    'Georeferencing workflow in QGIS', '1. Raster > Georeferencer', '2. Load the scanned map (Savar mouza sheet)', '3. Add at least 4 well-distributed Ground Control Points', '4. Transformation: Polynomial 1; Resampling: Nearest neighbour', '5. Target CRS: EPSG:32646 (WGS 84 / UTM 46N) or BTM', '6. Check RMS error (< 1 pixel is good)', '',
    'Deliverable', 'Georeferenced GeoTIFF + a screenshot of GCP table with residuals.',
  ],
  'URP 307': [
    'Housing typologies in Bangladesh', '- Detached / semi-detached single family', '- Walk-up apartments (5-6 storey)', '- High-rise apartments (developer-led)', '- Informal settlements (bostee)', '- Rural homestead (bari) clusters', '',
    'Affordability', 'Housing cost-to-income ratio; residual income approach; the 30% rule and its criticism.', '',
    'Assignment', 'Estimate affordability for 3 income groups in Savar using BBS HIES data.',
  ],
  'URP 310': [
    'Studio Brief - Neighbourhood Design', 'Site: 25 acres, Purbachal Sector 9', 'Population target: 5,000', '',
    'Deliverables', '- Site analysis sheets (A1 x 2)', '- Concept plan and land use budget', '- Detailed layout with road hierarchy', '- Physical model 1:500', '',
    'Jury', 'External jury from BIP. Marks: concept 30%, layout 40%, presentation 30%.',
  ],
};

export function generateLecturePdf(title: string, code: string, teacher: string): Blob {
  const lines = BODY[code] ?? ['Lecture notes'];
  const pages: string[][] = [];
  const per = Math.ceil(lines.length / 3) || 1;
  for (let i = 0; i < lines.length; i += per) pages.push(lines.slice(i, i + per));
  while (pages.length < 3) pages.push(['(continued)']);

  const objs: string[] = [];
  const add = (s: string) => { objs.push(s); return objs.length; };
  const fontReg = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBold = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pagesIdx = objs.length + 1; objs.push('');
  const pageIds: number[] = [];

  pages.forEach((pl, pi) => {
    let stream = 'BT\n';
    stream += `/F2 18 Tf 50 780 Td (${esc(title)}) Tj\n`;
    stream += `/F1 11 Tf 0 -20 Td (${esc(code + '  |  ' + teacher + '  |  Dept. of Urban & Regional Planning, Jahangirnagar University')}) Tj\n`;
    stream += `/F1 12 Tf 0 -38 Td 16 TL\n`;
    for (const l of pl) {
      const bold = l.length < 40 && !l.startsWith('-') && !/^\d\./.test(l) && l !== '' && !l.includes('.');
      stream += `${bold ? '/F2 13 Tf' : '/F1 12 Tf'} (${esc(l)}) Tj T*\n`;
    }
    stream += `/F1 9 Tf 1 0 0 1 50 40 Tm (Page ${pi + 1} of ${pages.length}  -  JU URP Calendar demo document) Tj\n`;
    stream += 'ET';
    const contentId = add(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    const pid = add(`<< /Type /Page /Parent ${pagesIdx} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontReg} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pid);
  });
  objs[pagesIdx - 1] = `<< /Type /Pages /Kids [${pageIds.map(i => `${i} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  const catalog = add(`<< /Type /Catalog /Pages ${pagesIdx} 0 R >>`);

  let out = '%PDF-1.4\n';
  const offsets: number[] = [];
  objs.forEach((o, i) => { offsets.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += String(off).padStart(10, '0') + ' 00000 n \n';
  out += `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([out], { type: 'application/pdf' });
}
