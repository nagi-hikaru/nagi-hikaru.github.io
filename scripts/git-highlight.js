const { createRequire } = require('node:module');

// Share Hexo-util's Highlight.js instance, as with the Redis grammar.
const requireFromHexoUtil = createRequire(require.resolve('hexo-util/package.json'));
const hljs = requireFromHexoUtil('highlight.js');
const highlightAliases = requireFromHexoUtil('./highlight_alias.json');

hljs.registerLanguage('git', function (hljs) {
  const values = [
    hljs.QUOTE_STRING_MODE,
    hljs.APOS_STRING_MODE,
    hljs.HASH_COMMENT_MODE
  ];

  return {
    name: 'Git',
    aliases: ['git-cli'],
    keywords: {
      // Keep paths, branch names and URLs together instead of matching pieces.
      $pattern: /[A-Za-z_][A-Za-z0-9_./:-]*/,
      built_in: 'git',
      keyword: `
        add am apply archive bisect blame branch bundle checkout cherry-pick
        clean clone commit config describe diff difftool fetch filter-branch
        format-patch fsck gc grep help init log ls-files ls-remote merge
        mergetool mv notes pull push range-diff rebase reflog remote reset
        restore revert rev-parse rm shortlog show show-ref sparse-checkout
        stash status submodule switch tag worktree
        list pop drop clear save set-url remove rename prune update
      `
    },
    contains: [
      { scope: 'meta', begin: /^>>>/, end: /$/, contains: values },
      ...values,
      {
        scope: 'attr',
        begin: /(?<![\w./:])--?[A-Za-z][A-Za-z0-9-]*/
      },
      {
        scope: 'literal',
        begin: /\b(?:HEAD|ORIG_HEAD|FETCH_HEAD|MERGE_HEAD|CHERRY_PICK_HEAD|REBASE_HEAD)(?:[~^]\d*)*/
      },
      { scope: 'variable', begin: /<[A-Za-z][A-Za-z0-9_-]*>/ }
    ]
  };
});

// Hexo-util 3.x also checks this in-memory language whitelist.
highlightAliases.aliases.git = 'git';
highlightAliases.aliases['git-cli'] = 'git';
