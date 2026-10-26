// Genera informe-apa7.docx a partir de informe-apa7.md con formato APA 7 (trabajo de estudiante).
// Uso (desde esta carpeta): npm ci && npm run generar
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const {
  AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, HighlightColor, ImageRun, LevelFormat,
  Packer, PageBreak, PageNumber, Paragraph, ShadingType, Table, TableCell, TableLayoutType, TableRow, TextRun,
  WidthType,
} = require('docx');

const input = process.argv[2] ?? path.join(__dirname, '..', 'informe-apa7.md');
const output = process.argv[3] ?? path.join(__dirname, '..', 'informe-apa7.docx');
const md = fs.readFileSync(input, 'utf8').replace(/\r\n/g, '\n');
const tokens = marked.lexer(md);

const FONT = 'Times New Roman';
const SIZE = 24; // 12 pt
const DOUBLE = { line: 480, before: 0, after: 0 };
const SINGLE = { line: 240, before: 0, after: 0 };
const INDENT = 720; // 1,27 cm
const PAGE_WIDTH = 11906 - 2 * 1440; // A4 con márgenes de 2,54 cm

// Títulos de las tablas, en el orden en que aparecen en el informe.
const TABLE_TITLES = [
  'Comparación entre Git Flow y Trunk Based Development',
  'Artefactos de GitHub Spec Kit en el repositorio de TaskFlow',
  'Trabajos del pipeline de GitHub Actions',
  'Pruebas automatizadas por versión de TaskFlow',
  'Problemas de la empresa, prácticas propuestas y forma de medirlas',
  'Hoja de ruta de adopción del modelo',
  'Roles del modelo propuesto',
  'Riesgos de la adopción y su mitigación',
  'Evidencias del proyecto en el repositorio',
];
let tableCount = 0;
let figureCount = 0;
let listInstance = 0;
let section = '';

// ---------- Texto en línea ----------
function runsFromText(text, style = {}) {
  // Los datos por completar van entre corchetes: se resaltan para que nadie los entregue sin llenar.
  return text
    .split(/(\[[^\]]+\])/)
    .filter(Boolean)
    .map(
      (part) =>
        new TextRun({
          text: part,
          font: style.code ? 'Courier New' : FONT,
          size: style.code ? 22 : SIZE,
          bold: style.bold,
          italics: style.italics,
          highlight:
            style.highlight || (!style.noHighlight && /^\[[^\]]+\]$/.test(part))
              ? HighlightColor.YELLOW
              : undefined,
        }),
    );
}

const decode = (s) =>
  s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

function inline(list = [], style = {}) {
  const runs = [];
  for (const t of list) {
    switch (t.type) {
      case 'strong':
        runs.push(...inline(t.tokens, { ...style, bold: true }));
        break;
      case 'em':
        runs.push(...inline(t.tokens, { ...style, italics: true }));
        break;
      case 'codespan':
        runs.push(...runsFromText(decode(t.text), { ...style, code: true }));
        break;
      case 'link':
        runs.push(...inline(t.tokens, style));
        break;
      case 'br':
        runs.push(new TextRun({ break: 1 }));
        break;
      case 'text':
        if (t.tokens) runs.push(...inline(t.tokens, style));
        else runs.push(...runsFromText(decode(t.text), style));
        break;
      default:
        runs.push(...runsFromText(decode(t.raw ?? t.text ?? ''), style));
    }
  }
  return runs;
}

const plain = (list = []) => list.map((t) => (t.tokens ? plain(t.tokens) : decode(t.text ?? ''))).join('');

// Las referencias no se resaltan ([Curso] es parte del formato APA); un párrafo entero entre corchetes sí.
function paragraphStyle(token) {
  const text = plain(token.tokens).trim();
  if (section === 'Referencias') return { noHighlight: true };
  return text.startsWith('[') && text.endsWith(']') ? { highlight: true } : {};
}

// ---------- Bloques ----------
const body = (children) => new Paragraph({ children, spacing: DOUBLE, indent: { firstLine: INDENT } });
const centered = (children) => new Paragraph({ children, alignment: AlignmentType.CENTER, spacing: DOUBLE });
const pageBreak = () => new Paragraph({ children: [new PageBreak()] });
const label = (text, opts) => new TextRun({ text, font: FONT, size: SIZE, ...opts });

function heading(token) {
  const text = plain(token.tokens);
  // ## → nivel 1 (centrado, negrita), ### → nivel 2 (izquierda, negrita), #### → nivel 3 (negrita cursiva).
  if (token.depth === 2) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: DOUBLE,
      children: [label(text, { bold: true })],
    });
  }
  return new Paragraph({
    heading: token.depth === 3 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
    spacing: DOUBLE,
    children: [label(text, { bold: true, italics: token.depth > 3 })],
  });
}

function list(token) {
  const reference = token.ordered ? 'numbers' : 'bullets';
  const instance = token.ordered ? ++listInstance : 0;
  return token.items.map(
    (item) =>
      new Paragraph({
        numbering: { reference, level: 0, instance },
        spacing: DOUBLE,
        children: item.tokens.flatMap((t) =>
          t.type === 'text' || t.type === 'paragraph' ? inline(t.tokens ?? [t]) : [],
        ),
      }),
  );
}

const H_BORDER = { style: BorderStyle.SINGLE, size: 6, color: '000000' };
const NONE = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };

function table(token) {
  const title = TABLE_TITLES[tableCount] ?? 'Tabla';
  tableCount++;
  const cols = token.header.length;
  // Promedio de longitud más un cuarto del máximo: las columnas de rutas largas no se comen a las demás.
  const weights = token.header.map((h, i) => {
    const lens = [h, ...token.rows.map((r) => r[i])].map((c) => plain(c.tokens).length);
    return Math.max(8, Math.min(45, lens.reduce((a, b) => a + b, 0) / lens.length + Math.max(...lens) / 4));
  });
  const total = weights.reduce((a, b) => a + b, 0);
  const widths = weights.map((w) => Math.floor((w / total) * PAGE_WIDTH));
  widths[cols - 1] += PAGE_WIDTH - widths.reduce((a, b) => a + b, 0);

  const cell = (c, i, header, last) =>
    new TableCell({
      width: { size: widths[i], type: WidthType.DXA },
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      borders: { top: header ? H_BORDER : NONE, bottom: header || last ? H_BORDER : NONE, left: NONE, right: NONE },
      shading: { type: ShadingType.CLEAR, fill: 'FFFFFF' },
      children: [new Paragraph({ spacing: SINGLE, children: inline(c.tokens, header ? { bold: true } : {}) })],
    });

  return [
    new Paragraph({ spacing: DOUBLE, keepNext: true, children: [label(`Tabla ${tableCount}`, { bold: true })] }),
    new Paragraph({ spacing: DOUBLE, keepNext: true, children: [label(title, { italics: true })] }),
    new Table({
      width: { size: PAGE_WIDTH, type: WidthType.DXA },
      layout: TableLayoutType.FIXED,
      columnWidths: widths,
      rows: [
        new TableRow({ tableHeader: true, children: token.header.map((h, i) => cell(h, i, true, false)) }),
        ...token.rows.map(
          (row, r) => new TableRow({ children: row.map((c, i) => cell(c, i, false, r === token.rows.length - 1)) }),
        ),
      ],
    }),
    new Paragraph({ spacing: DOUBLE, children: [] }),
  ];
}

// Ancho y alto de un PNG (cabecera IHDR) o de un JPEG (marcador SOF).
function imageSize(data) {
  if (data.readUInt32BE(0) === 0x89504e47) {
    return { type: 'png', w: data.readUInt32BE(16), h: data.readUInt32BE(20) };
  }
  let i = 2;
  while (i < data.length) {
    const marker = data.readUInt16BE(i);
    const length = data.readUInt16BE(i + 2);
    if (marker >= 0xffc0 && marker <= 0xffcf && ![0xffc4, 0xffc8, 0xffcc].includes(marker)) {
      return { type: 'jpg', h: data.readUInt16BE(i + 5), w: data.readUInt16BE(i + 7) };
    }
    i += 2 + length;
  }
  throw new Error('Formato de imagen no soportado');
}

function image(token) {
  const data = fs.readFileSync(path.join(path.dirname(input), token.href));
  const { type, w, h } = imageSize(data);
  const width = 600;
  // El título sale del texto alternativo (hasta los dos puntos): la numeración sigue el orden del documento.
  const title = token.text.split(':')[0].trim();
  figureCount++;
  return [
    new Paragraph({ spacing: DOUBLE, keepNext: true, children: [label(`Figura ${figureCount}`, { bold: true })] }),
    new Paragraph({ spacing: DOUBLE, keepNext: true, children: [label(title, { italics: true })] }),
    new Paragraph({
      spacing: SINGLE,
      children: [
        new ImageRun({
          type,
          data,
          transformation: { width, height: Math.round((width * h) / w) },
          altText: { title, description: token.text, name: title },
        }),
      ],
    }),
    new Paragraph({ spacing: DOUBLE, children: [] }),
  ];
}

// ---------- Portada ----------
const firstHr = tokens.findIndex((t) => t.type === 'hr');
const titleToken = tokens.find((t) => t.type === 'heading' && t.depth === 1);
const titleText = plain(titleToken.tokens);
const children = [
  ...Array.from({ length: 3 }, () => centered([])),
  centered([label(titleText, { bold: true })]),
  centered([]),
  ...tokens.slice(0, firstHr).filter((t) => t.type === 'paragraph').map((p) => centered(inline(p.tokens))),
  pageBreak(),
];

// ---------- Cuerpo ----------
for (const token of tokens.slice(firstHr + 1)) {
  switch (token.type) {
    case 'heading': {
      if (token.depth === 2) {
        section = plain(token.tokens);
        // Página nueva para el cuerpo, las referencias y los anexos.
        if (['Introducción', 'Referencias'].includes(section) || section.startsWith('Anexo A')) {
          children.push(pageBreak());
        }
        if (section === 'Introducción') children.push(centered([label(titleText, { bold: true })]));
      }
      children.push(heading(token));
      break;
    }
    case 'paragraph':
      if (token.tokens.length === 1 && token.tokens[0].type === 'image') {
        children.push(...image(token.tokens[0]));
      } else if (section === 'Referencias') {
        // Sangría francesa.
        children.push(
          new Paragraph({
            spacing: DOUBLE,
            indent: { left: INDENT, hanging: INDENT },
            children: inline(token.tokens, paragraphStyle(token)),
          }),
        );
      } else if (section === 'Resumen') {
        const keywords = plain(token.tokens).startsWith('Palabras clave');
        children.push(
          new Paragraph({
            spacing: DOUBLE,
            indent: keywords ? { firstLine: INDENT } : undefined,
            children: inline(token.tokens),
          }),
        );
      } else {
        children.push(body(inline(token.tokens, paragraphStyle(token))));
      }
      break;
    case 'list':
      children.push(...list(token));
      break;
    case 'table':
      children.push(...table(token));
      break;
    case 'blockquote':
    case 'hr':
    case 'space':
    case 'code':
      break;
    default:
      console.warn('Elemento sin convertir:', token.type);
  }
}

const headingStyle = (id, name, outlineLevel, extra = {}) => ({
  id,
  name,
  basedOn: 'Normal',
  next: 'Normal',
  quickFormat: true,
  run: { font: FONT, size: SIZE, bold: true, color: '000000', ...extra },
  paragraph: { spacing: DOUBLE, outlineLevel, ...(outlineLevel === 0 ? { alignment: AlignmentType.CENTER } : {}) },
});
const listLevel = (format, text) => ({
  level: 0,
  format,
  text,
  alignment: AlignmentType.LEFT,
  style: { paragraph: { indent: { left: INDENT, hanging: 360 } } },
});

const doc = new Document({
  creator: 'TaskFlow',
  title: titleText,
  styles: {
    default: { document: { run: { font: FONT, size: SIZE } } },
    paragraphStyles: [
      headingStyle('Heading1', 'Heading 1', 0),
      headingStyle('Heading2', 'Heading 2', 1),
      headingStyle('Heading3', 'Heading 3', 2, { italics: true }),
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [listLevel(LevelFormat.BULLET, '•')] },
      { reference: 'numbers', levels: [listLevel(LevelFormat.DECIMAL, '%1.')] },
    ],
  },
  sections: [
    {
      properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              alignment: AlignmentType.RIGHT,
              children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SIZE })],
            }),
          ],
        }),
      },
      footers: { default: new Footer({ children: [] }) },
      children,
    },
  ],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync(output, buffer);
  console.log(`${path.basename(output)}: ${tableCount} tablas, ${figureCount} figuras`);
});
