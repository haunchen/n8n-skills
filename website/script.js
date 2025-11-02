// 滾動導航列控制
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.getElementById('navbar');
    const heroButtons = document.querySelector('.hero-buttons');
    const heroTitle = document.querySelector('.hero-title');

    // 使用 Intersection Observer 監測按鈕區域
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1  // 當按鈕區域只有 10% 可見時就觸發
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (!entry.isIntersecting) {
                // 按鈕區域開始離開畫面,顯示導航列
                navbar.classList.add('navbar-visible');
                if (heroTitle) {
                    heroTitle.classList.add('hero-hidden');
                }
                if (heroButtons) {
                    heroButtons.classList.add('hero-hidden');
                }
            } else {
                // 按鈕區域回到畫面,隱藏導航列
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

    // 開始觀察按鈕區域
    if (heroButtons) {
        observer.observe(heroButtons);
    }
});
