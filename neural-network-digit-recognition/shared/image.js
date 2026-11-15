export const IMAGE_SIZE = 16;

export function prepareGalleryPixels(bytes) {
  if (!bytes || bytes.length !== IMAGE_SIZE * IMAGE_SIZE) {
    throw new RangeError('Gallery image must contain 256 grayscale bytes');
  }
  return normalizePixels(Float32Array.from(bytes, (value) => value / 255), IMAGE_SIZE, IMAGE_SIZE);
}

export function normalizePixels(input, width = IMAGE_SIZE, height = IMAGE_SIZE) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      !input || input.length !== width * height) {
    throw new RangeError('Input length must match image dimensions');
  }
  const source = new Float32Array(input.length);
  for (let index = 0; index < input.length; index += 1) {
    if (!Number.isFinite(input[index])) throw new TypeError('Pixel values must be finite');
    source[index] = Math.min(1, Math.max(0, input[index]));
  }
  let borderTotal = 0;
  let borderCount = 0;
  for (let x = 0; x < width; x += 1) {
    borderTotal += source[x] + source[(height - 1) * width + x];
    borderCount += 2;
  }
  for (let y = 1; y < height - 1; y += 1) {
    borderTotal += source[y * width] + source[y * width + width - 1];
    borderCount += 2;
  }
  if (borderTotal / borderCount > 0.5) {
    for (let index = 0; index < source.length; index += 1) source[index] = 1 - source[index];
  }
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (source[y * width + x] > 0.12) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
  const boxWidth = maxX - minX + 1;
  const boxHeight = maxY - minY + 1;
  const scale = 12 / Math.max(boxWidth, boxHeight);
  const scaledWidth = Math.max(1, Math.round(boxWidth * scale));
  const scaledHeight = Math.max(1, Math.round(boxHeight * scale));
  const scaled = new Float32Array(scaledWidth * scaledHeight);
  const sample = (x, y) => source[Math.min(height - 1, Math.max(0, y)) * width + Math.min(width - 1, Math.max(0, x))];
  let total = 0;
  let centerX = 0;
  let centerY = 0;
  for (let y = 0; y < scaledHeight; y += 1) {
    const sourceY = (y + 0.5) * boxHeight / scaledHeight - 0.5 + minY;
    const y0 = Math.floor(sourceY);
    const y1 = y0 + 1;
    const fy = sourceY - y0;
    for (let x = 0; x < scaledWidth; x += 1) {
      const sourceX = (x + 0.5) * boxWidth / scaledWidth - 0.5 + minX;
      const x0 = Math.floor(sourceX);
      const x1 = x0 + 1;
      const fx = sourceX - x0;
      const top = sample(x0, y0) * (1 - fx) + sample(x1, y0) * fx;
      const bottom = sample(x0, y1) * (1 - fx) + sample(x1, y1) * fx;
      const value = top * (1 - fy) + bottom * fy;
      scaled[y * scaledWidth + x] = value;
      total += value;
      centerX += x * value;
      centerY += y * value;
    }
  }
  if (total <= 1e-8) return new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
  centerX /= total;
  centerY /= total;
  const offsetX = Math.max(0, Math.min(IMAGE_SIZE - scaledWidth, Math.round(7.5 - centerX)));
  const offsetY = Math.max(0, Math.min(IMAGE_SIZE - scaledHeight, Math.round(7.5 - centerY)));
  const output = new Float32Array(IMAGE_SIZE * IMAGE_SIZE);
  for (let y = 0; y < scaledHeight; y += 1) {
    for (let x = 0; x < scaledWidth; x += 1) {
      output[(y + offsetY) * IMAGE_SIZE + x + offsetX] = scaled[y * scaledWidth + x];
    }
  }
  return output;
}
