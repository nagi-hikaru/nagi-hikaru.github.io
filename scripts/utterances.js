const fs = require('node:fs');
const path = require('node:path');

// Keep the comment override in the repository so npm ci preserves it on Pages.
hexo.extend.filter.register('before_generate', function () {
  if (this.config.theme !== 'redefine') return;
  this.theme.setView('components/comments/utterances.ejs', fs.readFileSync(
    path.join(this.base_dir, 'theme-overrides/utterances.ejs'), 'utf8'));
});
