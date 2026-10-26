const fs = require('node:fs');
const path = require('node:path');

hexo.extend.filter.register('before_generate', function () {
  if (this.config.theme !== 'redefine') return;
  for (const [view, file] of [
    ['pages/tag/tags.ejs', 'tags.ejs'],
    ['pages/category/categories.ejs', 'categories.ejs'],
  ]) {
    this.theme.setView(view, fs.readFileSync(path.join(this.base_dir, 'theme-overrides', file), 'utf8'));
  }
});
