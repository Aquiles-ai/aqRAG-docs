document.addEventListener('DOMContentLoaded', function() {
    // Detectar ruta inicial (sin barra)
    const initialPath = window.location.pathname.slice(1) || 'index';
    loadMarkdown(initialPath);
    setActiveNav(initialPath);

    // Captura clicks en la navbar y menú móvil
    document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => {
        link.addEventListener('click', function(e) {
            // Dejar pasar enlaces externos
            if (this.target === '_blank') return;

            e.preventDefault();
            const docName = this.dataset.doc;

            loadMarkdown(docName);
            history.pushState({ doc: docName }, '', `/${docName}`);
            setActiveNav(docName);
        });
    });

    // Manejar back/forward del navegador
    window.addEventListener('popstate', function(e) {
        const docName = (e.state && e.state.doc)
                      || window.location.pathname.slice(1)
                      || 'index';
        loadMarkdown(docName);
        setActiveNav(docName);
    });
});

function setActiveNav(docName) {
    document.querySelectorAll('.nav-link').forEach(a =>
        a.classList.toggle('active', a.dataset.doc === docName)
    );
}

function loadMarkdown(filename) {
    const contentElement = document.getElementById('content');
    contentElement.innerHTML = '<div class="loading">Loading documentation...</div>';

    fetch(`docs/${filename}.md`)
        .then(resp => {
            if (!resp.ok) throw new Error('Failed to load file');
            return resp.text();
        })
        .then(md => {
            // Configuración de marked con highlight usando Prism
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

            // 1. Renderizar MD
            contentElement.innerHTML = marked.parse(md);

            // 2. Añadir enlaces a TODOS los headers h1-h6
            contentElement.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((hdr, i) => {
                // Generar id a partir del texto si no existe
                if (!hdr.id) {
                    hdr.id = hdr.textContent
                               .trim()
                               .toLowerCase()
                               .replace(/\s+/g, '-')
                               .replace(/[^\w\-]/g, '');
                }
                // Crear el ancla
                const a = document.createElement('a');
                a.className = 'header-anchor';
                a.href = `#${hdr.id}`;
                a.innerHTML = '🔗';  // puedes cambiar por un SVG si prefieres
                // Insertar al inicio del header
                hdr.prepend(a);
            });

            // 3. Generar la navegación lateral (h1–h3)
            generatePageNav();

            // 4. Resaltar sintaxis
            if (window.Prism) Prism.highlightAllUnder(contentElement);
        })
        .catch(err => {
            contentElement.innerHTML = `
                <div class="error">
                    <h2>Error loading documentation</h2>
                    <p>${err.message}</p>
                </div>`;
        });
}

function generatePageNav() {
    const pageNavLinks = document.getElementById('page-nav-links');
    pageNavLinks.innerHTML = '';
    const headings = document.querySelectorAll('#content h1, #content h2, #content h3');

    if (headings.length === 0) {
        document.querySelector('.page-nav').style.display = 'none';
        return;
    }
    document.querySelector('.page-nav').style.display = 'block';

    headings.forEach((heading, index) => {
        if (!heading.id) heading.id = 'heading-' + index;

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
            document.querySelectorAll('.page-nav-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });

        pageNavLinks.appendChild(link);
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('.page-nav-link').forEach(a => {
                    a.classList.toggle('active', a.getAttribute('href') === '#' + id);
                });
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '-20% 0px -80% 0px'
    });

    headings.forEach(heading => observer.observe(heading));
}
