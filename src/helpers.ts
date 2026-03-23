export function renderMarkdownTable(headers: string[], rows: string[][]) {
  const headerRow = `| ${headers.join(' | ')} |`
  const separatorRow = `| ${headers.map(() => '---').join(' | ')} |`
  const dataRows = rows.map((row) => `| ${row.join(' | ')} |`)
  return [headerRow, separatorRow, ...dataRows].join('\n')
}
