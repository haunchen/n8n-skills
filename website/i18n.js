// Language switcher — detects current language from URL path
(function() {
  function getCurrentLang() {
    return window.location.pathname.includes('/zh-TW') ? 'zh-TW' : 'en';
  }

  function getAltUrl() {
    const loc = window.location;
    if (getCurrentLang() === 'zh-TW') {
      // Remove /zh-TW/ from path
      return loc.origin + loc.pathname.replace(/\/zh-TW\/?/, '/') + loc.search + loc.hash;
    } else {
      // Add /zh-TW/ before trailing path
      const base = loc.pathname.replace(/\/$/, '');
      return loc.origin + base + '/zh-TW/' + loc.search + loc.hash;
    }
  }

  window.i18nLang = getCurrentLang();
  window.i18nGetAltUrl = getAltUrl;
})();
