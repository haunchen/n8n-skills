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
});
