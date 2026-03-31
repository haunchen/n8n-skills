// Scroll-based navbar control
document.addEventListener('DOMContentLoaded', function() {
    const navbar = document.getElementById('navbar');
    const heroButtons = document.querySelector('.hero-buttons');
    const heroTitle = document.querySelector('.hero-title');

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
}

// Copy button functionality
document.addEventListener('DOMContentLoaded', function() {
    initCopyButtons();
});

function initCopyButtons() {
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const textToCopy = this.getAttribute('data-copy');
            if (!textToCopy) return;

            try {
                await navigator.clipboard.writeText(textToCopy);

                // Show copied state
                this.classList.add('copied');

                // Change icon to checkmark
                const originalSvg = this.innerHTML;
                this.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>`;

                // Reset after 2 seconds
                setTimeout(() => {
                    this.classList.remove('copied');
                    this.innerHTML = originalSvg;
                }, 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        });
    });
}
