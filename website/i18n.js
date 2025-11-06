// Simple i18n implementation for n8n Skills website
class I18n {
  constructor() {
    this.currentLang = this.detectLanguage();
    this.translations = {};
    this.fallbackLang = 'en';
    // Auto-detect base path for subpath deployments
    this.basePath = this.getBasePath();
  }

  // Get base path from current location
  getBasePath() {
    const pathname = window.location.pathname;
    // If pathname ends with / or .html, get the directory path
    const lastSlashIndex = pathname.lastIndexOf('/');
    return pathname.substring(0, lastSlashIndex + 1);
  }

  // Detect user's preferred language
  detectLanguage() {
    // Check localStorage first
    const savedLang = localStorage.getItem('n8n-skills-lang');
    if (savedLang && ['zh-TW', 'en'].includes(savedLang)) {
      return savedLang;
    }

    // Default to English
    return 'en';
  }

  // Load translations for a specific language
  async loadTranslations(lang) {
    try {
      const response = await fetch(`${this.basePath}locales/${lang}.json`);
      if (!response.ok) {
        throw new Error(`Failed to load ${lang} translations`);
      }
      this.translations[lang] = await response.json();
      return true;
    } catch (error) {
      console.error(`Error loading translations for ${lang}:`, error);
      return false;
    }
  }

  // Get nested translation value by key path (e.g., "hero.title")
  t(keyPath) {
    const keys = keyPath.split('.');
    let value = this.translations[this.currentLang];

    for (const key of keys) {
      if (value && typeof value === 'object') {
        value = value[key];
      } else {
        break;
      }
    }

    // Fallback to English if translation not found
    if (value === undefined && this.currentLang !== this.fallbackLang) {
      value = this.translations[this.fallbackLang];
      for (const key of keys) {
        if (value && typeof value === 'object') {
          value = value[key];
        } else {
          break;
        }
      }
    }

    return value || keyPath;
  }

  // Update all elements with data-i18n attribute
  updatePageContent() {
    // Update text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
      const key = element.getAttribute('data-i18n');
      element.textContent = this.t(key);
    });

    // Update aria-label attributes
    document.querySelectorAll('[data-i18n-aria]').forEach(element => {
      const key = element.getAttribute('data-i18n-aria');
      element.setAttribute('aria-label', this.t(key));
    });

    // Update meta tags
    this.updateMetaTags();

    // Update HTML lang attribute
    document.documentElement.setAttribute('lang', this.currentLang);
  }

  // Update meta tags for SEO
  updateMetaTags() {
    const metaTitle = this.t('meta.title');
    const metaDescription = this.t('meta.description');
    const metaKeywords = this.t('meta.keywords');

    // Update title
    document.title = metaTitle;

    // Update meta tags
    this.updateMetaTag('name', 'title', metaTitle);
    this.updateMetaTag('name', 'description', metaDescription);
    this.updateMetaTag('name', 'keywords', metaKeywords);

    // Update Open Graph tags
    this.updateMetaTag('property', 'og:title', metaTitle);
    this.updateMetaTag('property', 'og:description', metaDescription);
    this.updateMetaTag('property', 'og:locale', this.currentLang === 'zh-TW' ? 'zh_TW' : 'en_US');

    // Update Twitter tags
    this.updateMetaTag('property', 'twitter:title', metaTitle);
    this.updateMetaTag('property', 'twitter:description', metaDescription);

    // Update JSON-LD structured data
    const jsonLdScript = document.querySelector('script[type="application/ld+json"]');
    if (jsonLdScript) {
      try {
        const structuredData = JSON.parse(jsonLdScript.textContent);
        structuredData.description = metaDescription;
        jsonLdScript.textContent = JSON.stringify(structuredData, null, 2);
      } catch (e) {
        console.error('Error updating JSON-LD:', e);
      }
    }
  }

  // Helper function to update meta tag
  updateMetaTag(attribute, name, content) {
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  }

  // Switch language
  async switchLanguage(lang) {
    if (!['zh-TW', 'en'].includes(lang)) {
      console.error(`Unsupported language: ${lang}`);
      return false;
    }

    // Load translations if not already loaded
    if (!this.translations[lang]) {
      const loaded = await this.loadTranslations(lang);
      if (!loaded) {
        return false;
      }
    }

    this.currentLang = lang;
    localStorage.setItem('n8n-skills-lang', lang);
    this.updatePageContent();

    // Trigger custom event for other components to listen
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));

    return true;
  }

  // Initialize i18n
  async init() {
    // Load current language translations
    await this.loadTranslations(this.currentLang);

    // Load fallback language if different
    if (this.currentLang !== this.fallbackLang) {
      await this.loadTranslations(this.fallbackLang);
    }

    // Update page content
    this.updatePageContent();

    return true;
  }

  // Get current language
  getCurrentLanguage() {
    return this.currentLang;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = I18n;
}
