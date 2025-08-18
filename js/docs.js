document.addEventListener('DOMContentLoaded', function() {
    // Cargar la página de introducción por defecto
    loadMarkdown('index');
    
    // Configurar navegación
    document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => {
        link.addEventListener('click', function(e) {
            
            if (this.getAttribute('target') === '_blank') {
                return; // Permite que el enlace funcione normalmente
            }

            e.preventDefault();
            const docName = this.getAttribute('data-doc');
            loadMarkdown(docName);
            
            // Actualizar navegación activa
            document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            document.querySelector(`.nav-link[data-doc="${docName}"]`).classList.add('active');
        });
    });
});

function loadMarkdown(filename) {
    const contentElement = document.getElementById('content');
    contentElement.innerHTML = '<div class="loading">Loading documentation...</div>';

    fetch(`docs/${filename}.md`)
        .then(response => {
            if (!response.ok) throw new Error('Failed to load file');
            return response.text();
        })
        .then(markdownText => {
            // marked options (mismo comportamiento que tenías)
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

            // 1) Convertir a HTML
            const rawHtml = marked.parse(markdownText);

            // 2) Filtrar/validar iframes para que solo se permitan embeds de YouTube,
            //    y envolverlos en .video-wrapper para que sean responsive.
            const tmp = document.createElement('div');
            tmp.innerHTML = rawHtml;

            tmp.querySelectorAll('iframe').forEach(iframe => {
                try {
                    const src = iframe.getAttribute('src') || '';
                    // Normalizar URL (soporta src relativizado)
                    const url = new URL(src, location.href);
                    const host = url.hostname.toLowerCase();

                    const isYouTubeEmbed = (
                        (host === 'www.youtube.com' || host === 'youtube.com' || host === 'www.youtube-nocookie.com' || host === 'youtube-nocookie.com')
                        && url.pathname.startsWith('/embed/')
                    );

                    if (!isYouTubeEmbed) {
                        // eliminar iframes no válidos
                        iframe.remove();
                        return;
                    }

                    // fuerza atributos útiles y seguros
                    iframe.setAttribute('loading', 'lazy');
                    iframe.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
                    iframe.setAttribute('allowfullscreen', '');
                    iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');

                    // envolver en wrapper responsive
                    const wrapper = document.createElement('div');
                    wrapper.className = 'video-wrapper';
                    iframe.parentNode.insertBefore(wrapper, iframe);
                    wrapper.appendChild(iframe);

                } catch (err) {
                    // si la URL no es válida, eliminar el iframe
                    iframe.remove();
                }
            });

            // 3) Sanitizar con DOMPurify: permitimos iframe y los atributos que necesitamos
            const clean = DOMPurify.sanitize(tmp.innerHTML, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'loading', 'referrerpolicy', 'sandbox', 'src', 'width', 'height']
            });

            // 4) Insertar el HTML limpio en el DOM
            contentElement.innerHTML = clean;

            // 5) Generar navegación y resaltar con Prism
            generatePageNav();
            if (window.Prism) {
                Prism.highlightAllUnder(contentElement);
            }
        })
        .catch(error => {
            contentElement.innerHTML = `
                <div class="error">
                    <h2>Error loading documentation</h2>
                    <p>${error.message}</p>
                </div>
            `;
        });
}

function generatePageNav() {
    const pageNavLinks = document.getElementById('page-nav-links');
    pageNavLinks.innerHTML = '';
    
    // Buscar todos los encabezados en el contenido
    const content = document.getElementById('content');
    const headings = content.querySelectorAll('h2, h3');
    
    // Si no hay encabezados, ocultar la navegación
    if (headings.length === 0) {
        document.querySelector('.page-nav').style.display = 'none';
        return;
    }
    
    document.querySelector('.page-nav').style.display = 'block';
    
    // Crear enlaces de navegación
    headings.forEach((heading, index) => {
        // Asignar ID si no tiene
        if (!heading.id) {
            heading.id = 'heading-' + index;
        }
        
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        link.className = 'page-nav-link';
        
        if (heading.tagName === 'H3') {
            link.style.paddingLeft = '1rem';
            link.style.fontSize = '0.85rem';
        }
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth' });
            
            // Actualizar link activo
            document.querySelectorAll('.page-nav-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
        
        pageNavLinks.appendChild(link);
    });
    
    // Implementar observador de intersección para actualizar navegación al desplazarse
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
    }, { threshold: 0.1, rootMargin: '-20% 0px -80% 0px' });
    
    headings.forEach(heading => {
        observer.observe(heading);
    });
}