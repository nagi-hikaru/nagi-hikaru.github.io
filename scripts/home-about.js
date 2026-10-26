hexo.extend.filter.register('before_generate', function () {
  if (this.config.theme !== 'redefine') return;
  const name = 'pages/home/home-banner.ejs';
  const view = this.theme.getView(name);
  const source = view?.data?._content;
  if (!source || source.includes('class="home-about-link"')) return;

  const marker = /(<% if \(theme\.home_banner\.social_links\.enable\) \{ %>)/;
  const link = `<a class="home-about-link" href="<%= url_for('/about/') %>" aria-label="关于 Lyu">
            <span>About me</span><i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </a>
        `;
  this.theme.setView(name, source.replace(marker, `${link}$1`));
});
