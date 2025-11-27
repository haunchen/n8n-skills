// Scroll-based navbar control
document.addEventListener('DOMContentLoaded', async function() {
    const navbar = document.getElementById('navbar');
    const heroButtons = document.querySelector('.hero-buttons');
    const heroTitle = document.querySelector('.hero-title');

    // Initialize i18n as global variable
    window.i18n = new I18n();
    await window.i18n.init();

    // Update language toggle button text
    updateLangToggleButton(window.i18n.getCurrentLanguage());

    // Setup language toggle
    const langToggle = document.getElementById('lang-toggle');
    if (langToggle) {
        langToggle.addEventListener('click', async function() {
            const currentLang = window.i18n.getCurrentLanguage();
            const newLang = currentLang === 'zh-TW' ? 'en' : 'zh-TW';
            await window.i18n.switchLanguage(newLang);
            updateLangToggleButton(newLang);
        });
    }

    // Update language toggle button text
    function updateLangToggleButton(lang) {
        const langText = document.querySelector('.lang-text');
        if (langText) {
            langText.textContent = lang === 'zh-TW' ? '中' : 'En';
        }
    }

    // Use Intersection Observer to monitor button area
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1  // Trigger when button area is 10% visible
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                // Button area leaving viewport, show navbar
                navbar.classList.add('navbar-visible');
                if (heroTitle) {
                    heroTitle.classList.add('hero-hidden');
                }
                if (heroButtons) {
                    heroButtons.classList.add('hero-hidden');
                }
            } else {
                // Button area back in viewport, hide navbar
                navbar.classList.remove('navbar-visible');
                if (heroTitle) {
                    heroTitle.classList.remove('hero-hidden');
                }
                if (heroButtons) {
                    heroButtons.classList.remove('hero-hidden');
                }
            }
        });
    }, observerOptions);

    // Start observing button area
    if (heroButtons) {
        observer.observe(heroButtons);
    }

    // Initialize community packages section
    initCommunityPackages();
});

// Community packages section toggle
function initCommunityPackages() {
    const section = document.getElementById('community-packages-section');
    const toggle = document.getElementById('community-packages-toggle');
    const statsCard = document.getElementById('community-stats-card');

    if (!section || !toggle) return;

    // Toggle on header click
    toggle.addEventListener('click', () => {
        section.classList.toggle('expanded');
    });

    // Toggle on stats card click
    if (statsCard) {
        statsCard.addEventListener('click', () => {
            section.classList.add('expanded');
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    }

    // Update category labels based on current language
    if (window.i18n) {
        updateCategoryLabels();
        // Listen for language changes
        document.addEventListener('languageChanged', updateCategoryLabels);
    }
}

// Update category labels with translations
function updateCategoryLabels() {
    const categoryLabels = {
        'en': {
            'communication': 'Communication',
            'ai-tools': 'AI Tools',
            'web-scraping': 'Web Scraping',
            'document': 'Document',
            'data-processing': 'Data Processing',
            'utilities': 'Utilities'
        },
        'zh-TW': {
            'communication': '通訊',
            'ai-tools': 'AI 工具',
            'web-scraping': '網頁爬蟲',
            'document': '文件處理',
            'data-processing': '資料處理',
            'utilities': '實用工具'
        }
    };

    const currentLang = window.i18n ? window.i18n.getCurrentLanguage() : 'zh-TW';
    const labels = categoryLabels[currentLang] || categoryLabels['en'];

    document.querySelectorAll('.package-category[data-category]').forEach(el => {
        const category = el.getAttribute('data-category');
        if (labels[category]) {
            el.textContent = labels[category];
        }
    });
}
