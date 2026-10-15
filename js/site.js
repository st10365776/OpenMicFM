/* Site-level behaviors. Vendor scripts remain separate and unchanged. */
(function () {
  'use strict';

  function renderNavigation(navMount, isArticlePage, markup) {
    navMount.innerHTML = markup;
    if (isArticlePage) {
      navMount.querySelectorAll('a[href^="./"]').forEach(function (link) {
        link.setAttribute('href', '../' + link.getAttribute('href').slice(2));
      });
      navMount.querySelectorAll('img[src^="./"]').forEach(function (image) {
        image.setAttribute('src', '../' + image.getAttribute('src').slice(2));
      });
    }

    var menuToggle = navMount.querySelector('.shared-site-menu-toggle');
    var menu = navMount.querySelector('.shared-site-nav');
    var listenLink = navMount.querySelector('.shared-site-listen');
    if (listenLink) {
      document.querySelectorAll('.elementor-page-299 .elementor-widget-button a').forEach(function (button) {
        button.setAttribute('href', listenLink.getAttribute('href'));
        button.setAttribute('target', '_blank');
        button.setAttribute('rel', 'noopener noreferrer');
      });
    }
    if (menuToggle && menu) {
      menuToggle.addEventListener('click', function () {
        var isOpen = menu.classList.toggle('is-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
      });
    }
  }

  var navMount = document.getElementById('site-navigation');
  if (navMount) {
    document.querySelectorAll('header.site-header').forEach(function (legacyHeader) {
      legacyHeader.remove();
    });

    var isArticlePage = window.location.pathname.indexOf('/news-articles/') !== -1;
    var navPath = isArticlePage ? '../nav.html' : './nav.html';
    var fallbackNavigation = '<header class="shared-site-header" id="site-navigation-header"><div class="shared-site-header-inner"><a class="shared-site-logo" href="' + (isArticlePage ? '../' : './') + 'index.html" aria-label="OpenMicFM home"><img src="' + (isArticlePage ? '../' : './') + 'images/logo.png" alt="OpenMicFM logo"></a><button class="shared-site-menu-toggle" type="button" aria-expanded="false" aria-controls="shared-site-nav">Menu</button><nav class="shared-site-nav" id="shared-site-nav" aria-label="Primary navigation"><a href="' + (isArticlePage ? '../' : './') + 'index.html">Home</a><a href="' + (isArticlePage ? '../' : './') + 'shows.html">Shows</a><a href="' + (isArticlePage ? '../' : './') + 'sports.html">Sport</a><details class="shared-site-dropdown"><summary>News</summary><div class="shared-site-dropdown-menu"><a href="' + (isArticlePage ? '../' : './') + 'local.html">Local News</a><a href="' + (isArticlePage ? '../' : './') + 'national-news.html">National News</a></div></details><a href="' + (isArticlePage ? '../' : './') + 'about.html">About</a><a href="' + (isArticlePage ? '../' : './') + 'contact.html">Contact</a></nav><a class="shared-site-listen" href="http://p.onlineradiobox.com/za/nkqubela/player/?cs=za.nkqubela&amp;played=1" target="_blank" rel="noopener noreferrer">Listen Now</a></div></header>';
    if (typeof fetch !== 'function') {
      renderNavigation(navMount, isArticlePage, fallbackNavigation);
    } else {
      fetch(navPath)
        .then(function (response) {
          if (!response.ok) {
            throw new Error('Navigation request failed');
          }
          return response.text();
        })
        .then(function (markup) {
          renderNavigation(navMount, isArticlePage, markup);
        })
        .catch(function () {
          renderNavigation(navMount, isArticlePage, fallbackNavigation);
        });
    }
  }

  function renderFooter(footerMount, isArticlePage, markup) {
    footerMount.innerHTML = markup;
    if (isArticlePage) {
      footerMount.querySelectorAll('a[href^="./"]').forEach(function (link) {
        link.setAttribute('href', '../' + link.getAttribute('href').slice(2));
      });
    }
  }

  var legacyFooter = document.querySelector('footer.site-footer');
  if (legacyFooter) {
    legacyFooter.remove();
  }

  var footerMount = document.getElementById('site-footer');
  if (!footerMount) {
    footerMount = document.createElement('div');
    footerMount.id = 'site-footer';
    document.body.appendChild(footerMount);
  }

  var footerPath = isArticlePage ? '../footer.html' : './footer.html';
  var fallbackFooter = '<footer class="shared-site-footer" id="site-footer-content"><div class="shared-site-footer-inner"><div class="shared-site-footer-contact"><div class="footer-contact-box"><h4>Email</h4><p><a href="mailto:info@openmicfm.co.za">info@openmicfm.co.za</a></p></div><div class="footer-contact-box"><h4>Phone</h4><p><a href="tel:+27414644471">+27 41 464 4471</a></p></div><div class="footer-contact-box"><h4>Location</h4><p>Pier 14 Shopping Mall, Nelson Mandela Bay, South Africa, 6001</p></div></div><nav class="shared-site-footer-nav" aria-label="Footer navigation"><a href="' + (isArticlePage ? '../' : './') + 'index.html">Home</a><a href="' + (isArticlePage ? '../' : './') + 'shows.html">Shows</a><a href="' + (isArticlePage ? '../' : './') + 'sports.html">Sport</a><a href="' + (isArticlePage ? '../' : './') + 'news.html">News</a><a href="' + (isArticlePage ? '../' : './') + 'local.html">Local News</a><a href="' + (isArticlePage ? '../' : './') + 'national-news.html">National News</a><a href="' + (isArticlePage ? '../' : './') + 'entertainment.html">Entertainment</a><a href="' + (isArticlePage ? '../' : './') + 'about.html">About</a><a href="' + (isArticlePage ? '../' : './') + 'contact.html">Contact</a><a class="shared-site-admin" href="' + (isArticlePage ? '../' : './') + 'admin_dashboard/login.html">Admin Login</a></nav><p class="shared-site-footer-copyright">Copyright &copy; 2026 The Station With Progresss</p></div></footer>';
  if (typeof fetch !== 'function') {
    renderFooter(footerMount, isArticlePage, fallbackFooter);
  } else {
    fetch(footerPath)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Footer request failed');
        }
        return response.text();
      })
      .then(function (markup) {
        renderFooter(footerMount, isArticlePage, markup);
      })
      .catch(function () {
        renderFooter(footerMount, isArticlePage, fallbackFooter);
      });
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
