document.addEventListener('DOMContentLoaded', function() {
    loadMarkdown('index');
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('target') === '_blank') {
                return;
            }

            e.preventDefault();
            const docName = this.getAttribute('data-doc');
            loadMarkdown(docName);

            // Update active state
            document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            document.querySelectorAll(`.nav-link[data-doc="${docName}"]`).forEach(a => a.classList.add('active'));

            // Close search if open
            if (typeof closeSearch === 'function') {
                closeSearch();
            }

            // Update breadcrumb
            const breadcrumb = document.getElementById('breadcrumb-current');
            if (breadcrumb) {
                breadcrumb.textContent = this.textContent.trim();
            }
        });
    });

    // Clone navigation to mobile menu
    cloneMobileNavigation();
});

function cloneMobileNavigation() {
    const desktopNav = document.querySelector('nav.lg\\:block');
    const mobileNavContent = document.getElementById('mobile-nav-content');
    
    if (desktopNav && mobileNavContent) {
        mobileNavContent.innerHTML = desktopNav.innerHTML;
        
        // Add click handlers to mobile nav links
        mobileNavContent.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.getAttribute('target') === '_blank') {
                    return;
                }

                e.preventDefault();
                const docName = this.getAttribute('data-doc');
                loadMarkdown(docName);

                // Close mobile menu
                const mobileBackdrop = document.getElementById('mobile-backdrop');
                const panel = document.getElementById('mobile-panel');
                if (mobileBackdrop) mobileBackdrop.classList.add('opacity-0');
                if (panel) panel.classList.add('-translate-x-full');
                setTimeout(() => {
                    const mobileMenu = document.getElementById('mobile-menu');
                    if (mobileMenu) mobileMenu.classList.add('hidden');
                }, 300);

                // Update active state in both menus
                document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
                document.querySelectorAll(`.nav-link[data-doc="${docName}"]`).forEach(a => a.classList.add('active'));

                // Update breadcrumb
                const breadcrumb = document.getElementById('breadcrumb-current');
                if (breadcrumb) {
                    breadcrumb.textContent = this.textContent.trim();
                }
            });
        });
    }
}

function loadMarkdown(filename) {
    const contentElement = document.getElementById('content');
    contentElement.innerHTML = `
        <div class="loading">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div>
            <p>Loading documentation...</p>
        </div>
    `;
    
    fetch(`docs/${filename}.md`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load file: docs/${filename}.md (Status: ${response.status})`);
            }
            return response.text();
        })
        .then(markdownText => {
            // Configure marked
            marked.setOptions({
                gfm: true,
                breaks: true,
                highlight: function(code, lang) {
                    if (Prism.languages[lang]) {
                        return Prism.highlight(code, Prism.languages[lang], lang);
                    }
                    return code;
                }
            });

            // 1) Convert Markdown to HTML
            const rawHtml = marked.parse(markdownText);

            // 2) Process and validate iframes
            const tmp = document.createElement('div');
            tmp.innerHTML = rawHtml;

            // Filter iframes - only allow YouTube embeds
            tmp.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const src = iframe.getAttribute('src') || '';
                    const url = new URL(src, location.href);
                    const host = url.hostname.toLowerCase();

                    const isYouTubeEmbed = (
                        (host === 'www.youtube.com' || 
                         host === 'youtube.com' || 
                         host === 'www.youtube-nocookie.com' || 
                         host === 'youtube-nocookie.com')
                        && url.pathname.startsWith('/embed/')
                    );

                    if (!isYouTubeEmbed) {
                        iframe.remove();
                        return;
                    }

                    // Set secure attributes
                    iframe.setAttribute('loading', 'lazy');
                    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

                    // Wrap in responsive container
                    const wrapper = document.createElement('div');
                    wrapper.className = 'video-wrapper';
                    iframe.parentNode.insertBefore(wrapper, iframe);
                    wrapper.appendChild(iframe);

                } catch (err) {
                    iframe.remove();
                }
            });

            // 3) Sanitize with DOMPurify
            const clean = DOMPurify.sanitize(tmp.innerHTML, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy', 'sandbox', 'src', 'width', 'height']
            });

            // 4) Insert clean HTML
            contentElement.innerHTML = clean;

            // 5) Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // 6) Generate page navigation
            generatePageNavigation();

            // 7) Highlight code blocks
            if (window.Prism) {
                Prism.highlightAllUnder(contentElement);
            }

            // 8) Index content for search (if search function exists)
            if (typeof indexDocumentContent === 'function') {
                indexDocumentContent(filename, markdownText);
            }

            // 9) Reinitialize Lucide icons
            if (window.lucide) {
                lucide.createIcons();
            }
        })
        .catch(error => {
            console.error('Error loading Markdown:', error);
            contentElement.innerHTML = `
                <div class="p-8 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <h2 class="text-xl font-bold mb-2 font-lora">Error loading document</h2>
                    <p class="mb-2">Could not find file <code class="bg-red-100 px-2 py-1 rounded">docs/${filename}.md</code></p>
                    <p class="text-sm text-red-600">${error.message}</p>
                </div>
            `;
        });
}

function generatePageNavigation() {
    const contentElement = document.getElementById('content');
    const pageNavLinks = document.getElementById('page-nav');
    
    if (!pageNavLinks) return;
    
    pageNavLinks.innerHTML = '';

    const headings = contentElement.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
        pageNavLinks.innerHTML = '<p class="text-sm text-gray-400 italic">No sections available</p>';
        return;
    }

    headings.forEach((heading, index) => {
        // Generate ID if not present
        if (!heading.id) {
            heading.id = heading.textContent
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') + '-' + index;
        }
        
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        link.className = 'page-nav-link';
        
        if (heading.tagName === 'H3') {
            link.style.paddingLeft = '1rem';
            link.style.fontSize = '0.8rem';
        }
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.getElementById(heading.id);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
            
            // Update active state
            document.querySelectorAll('.page-nav-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
        
        pageNavLinks.appendChild(link);
    });
    
    // Intersection Observer for active state
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('.page-nav-link').forEach(a => {
                    a.classList.remove('active');
                    if (a.getAttribute('href') === '#' + id) {
                        a.classList.add('active');
                    }
                });
            }
        });
    }, { 
        threshold: 0.1, 
        rootMargin: '-100px 0px -80% 0px' 
    });
    
    headings.forEach(heading => {
        observer.observe(heading);
    });
}