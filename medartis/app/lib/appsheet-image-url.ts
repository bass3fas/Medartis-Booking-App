export function buildAppSheetImageUrl(fileName: string, tableName: string): string {
  if (!fileName || fileName.trim() === '') return '';

  const trimmed = fileName.trim();

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (trimmed.includes('appsheet.com/image/getimageurl')) return trimmed;

    try {
      const url = new URL(trimmed);
      const pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '').replace(/\\/g, '/');
      if (pathname) {
        return buildAppSheetImageUrl(pathname, tableName);
      }
    } catch {
      const fallbackPath = trimmed.replace(/^https?:\/\/[^/]+/i, '').replace(/^\/+/, '');
      if (fallbackPath) {
        return buildAppSheetImageUrl(fallbackPath, tableName);
      }
    }
  }

  const normalizedTableName = tableName.trim();
  const normalizedFileName = trimmed.replace(/\\/g, '/').replace(/^\/+/, '');

  return `https://www.appsheet.com/image/getimageurl?appName=MedartisPhase1-5435197&tableName=${encodeURIComponent(normalizedTableName)}&fileName=${encodeURIComponent(normalizedFileName)}&width=1000`;
}
