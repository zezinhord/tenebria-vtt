/** Retorna o centro da casa que contém a coordenada. A posição do token é seu CENTRO. */
export function snapToCellCenter(position, extent, size) {
  if (!Number.isFinite(position) || !Number.isFinite(extent) || extent <= 0) return 0;
  if (!Number.isFinite(size) || size <= 0) return Math.max(0, Math.min(extent, position));
  // Uma casa parcial na borda não deve posicionar o token fora do mapa.
  if (extent < size) return extent / 2;
  const lastCompleteCell = Math.max(0, Math.floor(extent / size) - 1);
  const cell = Math.max(0, Math.min(lastCompleteCell, Math.floor(position / size)));
  return (cell + 0.5) * size;
}

export function snapTokenPosition(x, y, scene, snapEnabled = true) {
  const width = Number(scene?.width) || 0;
  const height = Number(scene?.height) || 0;
  const size = Number(scene?.grid?.size);
  if (snapEnabled && scene?.grid?.enabled && Number.isFinite(size) && size > 0) {
    return {x: snapToCellCenter(x, width, size), y: snapToCellCenter(y, height, size)};
  }
  return {x: Math.max(0, Math.min(width, x)), y: Math.max(0, Math.min(height, y))};
}
