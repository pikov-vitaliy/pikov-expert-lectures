import { prepareGalleryPixels } from '/shared/image.js';

export async function loadDataset() {
  const response = await fetch('/samples/manifest.json');
  if (!response.ok) throw new Error('Не удалось загрузить встроенные примеры');
  const manifest = await response.json();
  if (manifest.imageSize !== 16 || !Array.isArray(manifest.samples) || manifest.samples.length !== 100) {
    throw new Error('Встроенный набор примеров повреждён');
  }
  return manifest.samples.map((sample) => {
    const binary = atob(sample.pixels);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    if (bytes.length !== 256 || !Number.isInteger(sample.label) || sample.label < 0 || sample.label > 9) {
      throw new Error(`Пример ${sample.id} повреждён`);
    }
    return { ...sample, bytes, input: prepareGalleryPixels(bytes) };
  });
}
