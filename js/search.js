/**
 * docs.js
 * Maneja la carga de archivos Markdown y la navegación.
 * IMPORTANTE: Este script espera que search.js ya esté cargado.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Esperar a que las librerías estén disponibles
    if (!window.appLibrariesLoaded) {
        console.log('Esperando a que las librerías se carguen...');
        const checkInterval = setInterval(() => {
            if (window.appLibrariesLoaded) {
                clearInterval(checkInterval);
                initializeDocs();
            }
        }, 100);
    } else {
        initializeDocs();
    }
});

function initializeDocs() {
    // Definir la página de inicio por defecto
    loadMarkdown('index');
    
    // Configurar navegación principal
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            if (this.getAttribute('target') === '_blank') {
                return; // Permite que el enlace funcione normalmente
            }

            e.preventDefault();
            const docName = this.getAttribute('data-doc');
            loadMarkdown(docName);
            
            // Actualizar navegación activa
            document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
            
            // Cerrar el modal de búsqueda si está abierto
            // Verificar que la función exista antes de llamarla
            if (typeof closeSearch === 'function') {
                closeSearch();
            }
        });
    });
}

/**
 * Carga un archivo Markdown y lo renderiza.
 * @param {string} filename El nombre del archivo (ej: 'installation').
 */
function loadMarkdown(filename) {
    const contentElement = document.getElementById('content');
    if (!contentElement) {
        console.error('X Error: Elemento #content no encontrado');
        return;
    }

    contentElement.innerHTML = '<div class="loading"><div class="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600 mb-4"></div><p>Cargando documentación...</p></div>';
    
    // Actualizar breadcrumb
    const breadcrumb = document.getElementById('breadcrumb-current');
    if (breadcrumb) {
        const titles = {
            'index': 'Introduction',
            'installation': 'Installation',
            'deploy': 'Deployment',
            'api': 'REST API',
            'client': 'Python Client',
            'asynclient': 'Async Client'
        };
        breadcrumb.textContent = titles[filename] || filename;
    }
    
    // Cargar el archivo Markdown
    fetch(`docs/${filename}.md`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load file: docs/${filename}.md (Status: ${response.status})`);
            }
            return response.text();
        })
        .then(markdownText => {
            // Verificar que marked esté disponible
            if (typeof marked === 'undefined') {
                throw new Error('Marked library not loaded');
            }

            // Convertir Markdown a HTML
            const htmlContent = marked.parse(markdownText);
            
            // Renderizar el contenido
            contentElement.innerHTML = htmlContent;

            // Volver al inicio de la página y generar la navegación lateral
            window.scrollTo(0, 0);
            generatePageNavigation();

            // Reinicializar iconos de Lucide en el nuevo contenido
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }

            // Actualizar el índice de búsqueda si la función existe
            if (typeof indexDocumentContent === 'function') {
                indexDocumentContent(filename, markdownText);
            }

        })
        .catch(error => {
            console.error('X Error al cargar Markdown:', error);
            contentElement.innerHTML = `<div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 class="text-xl font-bold mb-2">Error al cargar el documento</h2>
                <p>No se pudo encontrar el archivo <code>docs/${filename}.md</code>. Por favor, asegúrate de que el archivo existe en la carpeta <code>docs/</code>.</p>
                <p class="mt-2 text-sm">${error.message}</p>
            </div>`;
        });
}

/**
 * Genera la navegación lateral de la página (Table of Contents).
 */
function generatePageNavigation() {
    const contentElement = document.getElementById('content');
    const pageNavLinks = document.getElementById('page-nav');
    
    if (!contentElement || !pageNavLinks) return;
    
    pageNavLinks.innerHTML = '';

    // Seleccionar todos los encabezados H2 y H3 dentro del contenido
    const headings = contentElement.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
        pageNavLinks.innerHTML = '<p class="text-sm text-gray-400 p-2">No hay secciones.</p>';
        return;
    }

    headings.forEach((heading, index) => {
        // Asegurar que cada encabezado tenga un ID
        if (!heading.id) {
            heading.id = heading.textContent.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-|-$/g, '') + '-' + index;
        }
        
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        link.className = 'page-nav-link';
        
        // Ajustar el estilo de anidación para H3
        if (heading.tagName === 'H3') {
            link.style.paddingLeft = '1.5rem';
            link.style.fontSize = '0.85rem';
        }
        
        // Manejador de clic para desplazamiento suave
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetHeading = document.getElementById(heading.id);
            if (targetHeading) {
                targetHeading.scrollIntoView({ behavior: 'smooth' });
                
                // Actualizar link activo
                document.querySelectorAll('#page-nav .page-nav-link').forEach(a => a.classList.remove('active'));
                this.classList.add('active');
            }
        });
        
        pageNavLinks.appendChild(link);
    });
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                document.querySelectorAll('#page-nav .page-nav-link').forEach(a => {
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