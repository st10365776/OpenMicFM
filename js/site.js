/* Site-level behaviors. Vendor scripts remain separate and unchanged. */
(function () {
  'use strict';

  // Fallbacks for WordPress-style URLs that may still exist in exported markup.
  var localPageLinks = {
    '/': './index.html',
    '/shows/': './shows.html',
    '/news/': './news.html',
    '/local/': './local.html',
    '/national-news/': './national-news.html',
    '/sports/': './sports.html',
    '/about/': './about.html',
    '/contact/': './contact.html'
  };

  // Convert internal links at runtime so the pages also work when opened locally.
  document.querySelectorAll('a[href]').forEach(function (link) {
    var target = link.getAttribute('href');
    if (localPageLinks[target]) {
      link.setAttribute('href', localPageLinks[target]);
    }
  });
})();
