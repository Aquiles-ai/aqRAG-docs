document.addEventListener('DOMContentLoaded', function() {
    // Cargar la página de introducción por defecto
    loadMarkdown('index');
    
    // Configurar navegación desktop
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('target') === '_blank') {
                return;
            }

            e.preventDefault();
            const docName = this.getAttribute('data-doc');
            loadMarkdown(docName);
            
            // Actualizar navegación activa en desktop
            document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            document.querySelectorAll(`.nav-link[data-doc="${docName}"]`).forEach(a => a.classList.add('active'));
            
            // Actualizar breadcrumb
            updateBreadcrumb(this.textContent.trim());
        });
    });

    // Clonar navegación para menú móvil
    cloneMobileNavigation();
});

function cloneMobileNavigation() {
    const desktopNav = document.querySelector('nav.lg\\:block');
    const mobileNavContent = document.getElementById('mobile-nav-content');
    
    if (desktopNav && mobileNavContent) {
        mobileNavContent.innerHTML = desktopNav.innerHTML;
        
        // Re-inicializar iconos de Lucide en el menú móvil
        if (window.lucide) {
            lucide.createIcons();
        }
        
        // Agregar eventos a los enlaces móviles
        mobileNavContent.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', function(e) {
                if (this.getAttribute('target') === '_blank') {
                    return;
                }

                e.preventDefault();
                const docName = this.getAttribute('data-doc');
                loadMarkdown(docName);

                // Cerrar menú móvil
                closeMobileMenu();

                // Actualizar navegación activa en ambos menús
                document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
                document.querySelectorAll(`.nav-link[data-doc="${docName}"]`).forEach(a => a.classList.add('active'));
                
                // Actualizar breadcrumb
                updateBreadcrumb(this.textContent.trim());
            });
        });
    }
}

function closeMobileMenu() {
    const mobileBackdrop = document.getElementById('mobile-backdrop');
    const panel = document.getElementById('mobile-panel');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileBackdrop) mobileBackdrop.classList.add('opacity-0');
    if (panel) panel.classList.add('-translate-x-full');
    
    setTimeout(() => {
        if (mobileMenu) mobileMenu.classList.add('hidden');
    }, 300);
}

function updateBreadcrumb(title) {
    const breadcrumb = document.getElementById('breadcrumb-current');
    if (breadcrumb) {
        breadcrumb.textContent = title;
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
            if (!response.ok) throw new Error('Failed to load file');
            return response.text();
        })
        .then(markdownText => {
            // Configurar marked
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

            // 1) Convertir Markdown a HTML
            const rawHtml = marked.parse(markdownText);

            // 2) Filtrar y validar iframes (solo YouTube embeds)
            const tmp = document.createElement('div');
            tmp.innerHTML = rawHtml;

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

                    // Configurar atributos seguros
                    iframe.setAttribute('loading', 'lazy');
                    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

                    // Envolver en contenedor responsive
                    const wrapper = document.createElement('div');
                    wrapper.className = 'video-wrapper';
                    iframe.parentNode.insertBefore(wrapper, iframe);
                    wrapper.appendChild(iframe);

                } catch (err) {
                    iframe.remove();
                }
            });

            // 3) Sanitizar con DOMPurify
            const clean = DOMPurify.sanitize(tmp.innerHTML, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy', 'sandbox', 'src', 'width', 'height']
            });

            // 4) Insertar HTML limpio
            contentElement.innerHTML = clean;

            // 5) Scroll suave al inicio
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // 6) Generar navegación de página
            generatePageNav();

            // 7) Resaltar código con Prism
            if (window.Prism) {
                Prism.highlightAllUnder(contentElement);
            }

            // 8) Reinicializar iconos de Lucide
            if (window.lucide) {
                lucide.createIcons();
            }

            // 9) Indexar para búsqueda (si existe la función)
            if (typeof indexDocumentContent === 'function') {
                indexDocumentContent(filename, markdownText);
            }
        })
        .catch(error => {
            contentElement.innerHTML = `
                <div class="p-8 bg-red-50 border border-red-200 text-red-700 rounded-xl">
                    <h2 class="text-xl font-bold mb-2 font-lora">Error loading documentation</h2>
                    <p class="mb-2">Could not find file <code class="bg-red-100 px-2 py-1 rounded">docs/${filename}.md</code></p>
                    <p class="text-sm text-red-600">${error.message}</p>
                </div>
            `;
        });
}

function generatePageNav() {
    const pageNavLinks = document.getElementById('page-nav');
    
    if (!pageNavLinks) return;
    
    pageNavLinks.innerHTML = '';
    
    const content = document.getElementById('content');
    const headings = content.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
        pageNavLinks.innerHTML = '<p class="text-sm text-gray-400 italic px-2">No sections available</p>';
        return;
    }
    
    headings.forEach((heading, index) => {
        // Generar ID si no tiene
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
            
            // Actualizar estado activo
            document.querySelectorAll('.page-nav-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
        
        pageNavLinks.appendChild(link);
    });
    
    // Intersection Observer para actualizar navegación automáticamente
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