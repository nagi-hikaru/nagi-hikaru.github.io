const { createRequire } = require('node:module');

// Register with the Highlight.js instance used by Hexo's renderer.
const requireFromHexoUtil = createRequire(require.resolve('hexo-util/package.json'));
const hljs = requireFromHexoUtil('highlight.js');
const highlightAliases = requireFromHexoUtil('./highlight_alias.json');

hljs.registerLanguage('limactl', function (hljs) {
  const values = [
    hljs.QUOTE_STRING_MODE,
    hljs.APOS_STRING_MODE,
    hljs.HASH_COMMENT_MODE,
    hljs.C_NUMBER_MODE
  ];

  return {
    name: 'Lima CLI',
    aliases: ['lima'],
    keywords: {
      // Keep paths and instance names together instead of matching fragments.
      $pattern: /[A-Za-z_][A-Za-z0-9_./:-]*/,
      built_in: 'limactl lima',
      keyword: `
        autostart clone completion copy create delete disk edit factory-reset
        help info list network protect prune rename restart screenshot shell
        show-ssh snapshot start stop sudoers template tunnel unprotect validate
        watch apply disable enable import resize unlock url yq
      `.trim().split(/\s+/),
      literal: 'true false Running Stopped Broken READY'
    },
    contains: [
      { scope: 'meta', begin: /^>>>/, end: /$/, contains: values },
      ...values,
      { scope: 'attr', begin: /(?<![\w./:])--?[A-Za-z][A-Za-z0-9-]*/ },
      { scope: 'symbol', begin: /\btemplate:[A-Za-z0-9_./-]+/ },
      { scope: 'variable', begin: /<[A-Za-z][A-Za-z0-9_-]*>/ }
    ]
  };
});

// Hexo-util 3.x checks this whitelist before using a registered language.
highlightAliases.aliases.limactl = 'limactl';
highlightAliases.aliases.lima = 'limactl';
