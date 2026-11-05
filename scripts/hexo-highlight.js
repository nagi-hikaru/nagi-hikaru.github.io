const { createRequire } = require('node:module');

// Use Hexo-util's own Highlight.js instance and language whitelist.
const requireFromHexoUtil = createRequire(require.resolve('hexo-util/package.json'));
const hljs = requireFromHexoUtil('highlight.js');
const highlightAliases = requireFromHexoUtil('./highlight_alias.json');

hljs.registerLanguage('hexo', function (hljs) {
  const values = [
    hljs.QUOTE_STRING_MODE,
    hljs.APOS_STRING_MODE,
    hljs.HASH_COMMENT_MODE,
    hljs.C_NUMBER_MODE
  ];

  return {
    name: 'Hexo CLI',
    aliases: ['hexo-cli'],
    keywords: {
      // Avoid matching command names within paths, filenames or URLs.
      $pattern: /[A-Za-z_][A-Za-z0-9_./:-]*/,
      built_in: 'hexo npx',
      keyword: `
        init new generate publish server deploy render migrate clean list
        version config help n g s d
      `.trim().split(/\s+/),
      literal: 'post page draft true false'
    },
    contains: [
      { scope: 'meta', begin: /^>>>/, end: /$/, contains: values },
      ...values,
      { scope: 'attr', begin: /(?<![\w./:])--?[A-Za-z][A-Za-z0-9-]*/ },
      { scope: 'variable', begin: /<[A-Za-z][A-Za-z0-9_-]*>/ },
      { scope: 'operator', begin: /&&|\|\|/ }
    ]
  };
});

// Extend the in-memory registry without changing installed dependency files.
highlightAliases.aliases.hexo = 'hexo';
highlightAliases.aliases['hexo-cli'] = 'hexo';
