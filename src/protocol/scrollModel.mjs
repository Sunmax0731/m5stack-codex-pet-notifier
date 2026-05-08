export function paginateAnswer(body, options = {}) {
  const charsPerLine = options.charsPerLine ?? 28;
  const linesPerPage = options.linesPerPage ?? 4;
  const charsPerPage = charsPerLine * linesPerPage;
  const normalized = String(body ?? '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return [''];
  }

  const pages = [];
  for (let cursor = 0; cursor < normalized.length; cursor += charsPerPage) {
    pages.push(normalized.slice(cursor, cursor + charsPerPage));
  }
  return pages;
}

export function moveScroll(currentPage, direction, pageCount) {
  if (direction === 'up') {
    return Math.max(0, currentPage - 1);
  }
  if (direction === 'down') {
    return Math.min(Math.max(0, pageCount - 1), currentPage + 1);
  }
  return currentPage;
}
