(() => {
  const files = [
    '20260811_102007.jpg', '20260811_102444.jpg', '20260811_111755.jpg', '20260811_181047.jpg',
    'Scan_20260811_113402.jpg', 'Scan_20260811_113628.jpg', 'Scan_20260811_114029.jpg', 'Scan_20260811_114150.jpg', 'Scan_20260811_114213.jpg', 'Scan_20260811_114332.jpg', 'Scan_20260811_114421.jpg', 'Scan_20260811_114611.jpg', 'Scan_20260811_114854.jpg', 'Scan_20260811_115056.jpg', 'Scan_20260811_115230.jpg', 'Scan_20260811_115359.jpg', 'Scan_20260811_115640.jpg', 'Scan_20260811_115712.jpg', 'Scan_20260811_115912.jpg', 'Scan_20260811_120211.jpg', 'Scan_20260811_120427.jpg', 'Scan_20260811_120533.jpg', 'Scan_20260811_120619.jpg', 'Scan_20260811_121239.jpg', 'Scan_20260811_121410.jpg', 'Scan_20260811_121656.jpg',
    'Scan_20260811_133357.jpg', 'Scan_20260811_133445.jpg', 'Scan_20260811_133553.jpg', 'Scan_20260811_133634.jpg', 'Scan_20260811_133940.jpg', 'Scan_20260811_134152.jpg', 'Scan_20260811_134333.jpg', 'Scan_20260811_135352.jpg', 'Scan_20260811_135433.jpg', 'Scan_20260811_135606.jpg', 'Scan_20260811_140026.jpg', 'Scan_20260811_140617.jpg', 'Scan_20260811_140950.jpg', 'Scan_20260811_141438.jpg', 'Scan_20260811_141529.jpg', 'Scan_20260811_142709.jpg', 'Scan_20260811_142719.jpg', 'Scan_20260811_143041.jpg', 'Scan_20260811_143107.jpg',
    'Scan_20260811_150734.jpg', 'Scan_20260811_150756.jpg', 'Scan_20260811_150855.jpg', 'Scan_20260811_151357.jpg', 'Scan_20260811_151525.jpg', 'Scan_20260811_151615.jpg', 'Scan_20260811_151850.jpg', 'Scan_20260811_152431.jpg', 'Scan_20260811_152454.jpg', 'Scan_20260811_152706.jpg', 'Scan_20260811_152724.jpg', 'Scan_20260811_152903.jpg', 'Scan_20260811_153328.jpg', 'Scan_20260811_153607.jpg', 'Scan_20260811_154050.jpg', 'Scan_20260811_154453.jpg', 'Scan_20260811_154908.jpg', 'Scan_20260811_155155.jpg', 'Scan_20260811_155345.jpg', 'Scan_20260811_155726.jpg', 'Scan_20260811_155738.jpg', 'Scan_20260811_155805.jpg', 'Scan_20260811_160148.jpg', 'Scan_20260811_160205.jpg',
    'Scan_20260811_171444.jpg', 'Scan_20260811_171636.jpg', 'Scan_20260811_172043.jpg', 'Scan_20260811_172156.jpg', 'Scan_20260811_172434.jpg', 'Scan_20260811_172844.jpg', 'Scan_20260811_173040.jpg', 'Scan_20260811_173902.jpg', 'Scan_20260811_174433.jpg', 'Scan_20260811_174957.jpg', 'Scan_20260811_175038.jpg', 'Scan_20260811_175217.jpg', 'Scan_20260811_175248.jpg', 'Scan_20260811_175355.jpg', 'Scan_20260811_175510.jpg', 'Scan_20260811_175529.jpg', 'Scan_20260811_175702.jpg', 'Scan_20260811_175801.jpg', 'Scan_20260811_180059.jpg'
  ];

  const groups = [
    { title: 'Дополнительные фотографии', description: 'Фотографии до и после тематических блоков.', files: [files[0], files[1], files[2], files[3]] },
    { title: 'Введение и основы безопасности приложений', description: 'Фотографии 11:34:02–12:16:56.', files: files.slice(4, 26) },
    { title: 'OWASP Top 10:2025 — A01–A03', description: 'Фотографии 13:33:57–14:31:07.', files: files.slice(26, 45) },
    { title: 'OWASP Top 10:2025 — A04–A06', description: 'Фотографии 15:07:34–16:02:05.', files: files.slice(45, 69) },
    { title: 'Безопасность ИИ', description: 'Фотографии 17:14:44–18:00:59.', files: files.slice(69) }
  ];

  const root = document.getElementById('slides-gallery');
  if (!root) return;
  const base = 'downloads/day-01/slides/';
  for (const group of groups) {
    const section = document.createElement('section');
    section.className = 'slides-group';
    const heading = document.createElement('div');
    heading.className = 'slides-group-heading';
    heading.innerHTML = `<h2>${group.title}</h2><p>${group.description}</p>`;
    section.append(heading);
    const grid = document.createElement('div');
    grid.className = 'slides-grid';
    for (const name of group.files) {
      const figure = document.createElement('figure');
      figure.className = 'slide-card';
      const link = document.createElement('a');
      link.href = `${base}${encodeURIComponent(name)}`;
      link.target = '_blank';
      link.rel = 'noopener';
      link.title = `Открыть оригинал: ${name}`;
      const image = document.createElement('img');
      image.src = link.href;
      image.alt = `Фотография слайда: ${name}`;
      image.loading = 'lazy';
      image.decoding = 'async';
      const caption = document.createElement('figcaption');
      caption.textContent = name;
      link.append(image);
      figure.append(link, caption);
      grid.append(figure);
    }
    section.append(grid);
    root.append(section);
  }
})();
