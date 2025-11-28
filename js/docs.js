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

            document.querySelectorAll('.nav-link').forEach(a => a.classList.remove('active'));
            document.querySelector(`.nav-link[data-doc="${docName}"]`).classList.add('active');

            closeSearch();
        });
    });
});


function loadMarkdown(filename) {
    const contentElement = document.getElementById('content');
    contentElement.innerHTML = '<div class="loading">Loading documentation...</div>';
    
    fetch(`docs/${filename}.md`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to load file: docs/${filename}.md (Status: ${response.status})`);
            }
            return response.text();
        })
        .then(markdownText => {
            marked.setOptions({
                gfm: true,
                breaks: true,
                highlight: function(code, lang) {
                    const language = Prism.languages[lang] || Prism.languages.clike;
                    return Prism.highlight(code, language, lang);
                }
            });

            const htmlContent = marked.parse(markdownText);
            
            contentElement.innerHTML = htmlContent;

            window.scrollTo(0, 0);
            generatePageNavigation();

            indexDocumentContent(filename, markdownText); 

        })
        .catch(error => {
            console.error('Error al cargar Markdown:', error);
            contentElement.innerHTML = `<div class="p-8 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                <h2 class="text-xl font-bold mb-2">Error al cargar el documento</h2>
                <p>No se pudo encontrar el archivo <code>docs/${filename}.md</code>. Por favor, asegúrate de que el archivo existe en la carpeta <code>docs/</code>.</p>
                <p class="mt-2 text-sm">${error.message}</p>
            </div>`;
        });
}

function generatePageNavigation() {
    const contentElement = document.getElementById('content');
    const pageNavLinks = document.getElementById('page-nav');
    pageNavLinks.innerHTML = ''; 

    const headings = contentElement.querySelectorAll('h2, h3');
    
    if (headings.length === 0) {
        pageNavLinks.innerHTML = '<p class="text-sm text-gray-400 p-2">No hay secciones.</p>';
        return;
    }

    headings.forEach((heading, index) => {
        if (!heading.id) {
            heading.id = heading.textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + index;
        }
        
        const link = document.createElement('a');
        link.href = '#' + heading.id;
        link.textContent = heading.textContent;
        link.className = 'page-nav-link';
        
        if (heading.tagName === 'H3') {
            link.style.paddingLeft = '1.5rem';
            link.style.fontSize = '0.85rem';
        }
        
        link.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById(heading.id).scrollIntoView({ behavior: 'smooth' });
            
            document.querySelectorAll('#page-nav .page-nav-link').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
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