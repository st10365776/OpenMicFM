/* Site-level behaviors. Vendor scripts remain separate and unchanged. */
(function () {
  'use strict';

  var navMount = document.getElementById('site-navigation');
  if (navMount) {
    document.querySelectorAll('header.site-header').forEach(function (legacyHeader) {
      legacyHeader.remove();
    });

    var navPath = window.location.pathname.indexOf('/news-articles/') !== -1 ? '../nav.html' : './nav.html';
    fetch(navPath)
      .then(function (response) { return response.text(); })
      .then(function (markup) {
        navMount.innerHTML = markup;
        if (navPath === '../nav.html') {
          navMount.querySelectorAll('a[href^="./"]').forEach(function (link) {
            link.setAttribute('href', '../' + link.getAttribute('href').slice(2));
          });
          navMount.querySelectorAll('img[src^="./"]').forEach(function (image) {
            image.setAttribute('src', '../' + image.getAttribute('src').slice(2));
          });
        }
        var menuToggle = navMount.querySelector('.shared-site-menu-toggle');
        var menu = navMount.querySelector('.shared-site-nav');
        if (menuToggle && menu) {
          menuToggle.addEventListener('click', function () {
            var isOpen = menu.classList.toggle('is-open');
            menuToggle.setAttribute('aria-expanded', String(isOpen));
          });
        }
      })
      .catch(function () { navMount.setAttribute('aria-hidden', 'true'); });
  }

  // Fallbacks for WordPress-style URLs that may still exist in exported markup.
  var localPageLinks = {
    '/': './index.html',
    '/shows/': './shows.html',
    '/news/': './news.html',
    '/local/': './local.html',
    '/national-news/': './national-news.html',
    '/sports/': './sports.html',
    '/about/': './about.html',
    '/contact/': './contact.html',
    './womens-day-commemorate/': './news-articles/womens-day-commemorate.html',
    './drink-responsible/': './news-articles/drink-responsible.html',
    './this-is-the-worst-run-municipality-in-south-africa/': './news-articles/this-is-the-worst-run-municipality-in-south-africa.html',
    './local-government-statistics/': './news-articles/local-government-statistics.html',
    './back-on-top-chiefs-outclass-sekhukhune-for-second-league-win/': './news-articles/back-on-top-chiefs-outclass-sekhukhune-for-second-league-win.html'
  };

  // Convert internal links at runtime so the pages also work when opened locally.
  document.querySelectorAll('a[href]').forEach(function (link) {
    var target = link.getAttribute('href');
    if (localPageLinks[target]) {
      link.setAttribute('href', localPageLinks[target]);
    }

    if (target === '#') {
      var article = link.closest('.uagb-post__inner-wrap');
      var title = article && article.querySelector('.uagb-post__title');
      var articleLinks = {
        'This is the worst-run municipality in South Africa': localPageLinks['./this-is-the-worst-run-municipality-in-south-africa/'],
        'LOCAL GOVERNMENT STATISTICS': localPageLinks['./local-government-statistics/']
      };
      var articleLink = title && articleLinks[title.textContent.trim()];
      if (articleLink) {
        link.setAttribute('href', articleLink);
      }
    }
  });
})();
