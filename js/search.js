
const DOC_FILENAMES = ['index', 'installation', 'client', 'asynclient', 'deploy', 'api'];
let docsContent = {}; 
let searchIndex = [];
let searchModal = null;
let searchInput = null;
let searchResults = null;

function initSearch() {
    createSearchModal();
    setupEventListeners();
    loadAllDocuments();
}


function createSearchModal() {
    searchModal = document.createElement('div');
    searchModal.className = 'search-modal';
    searchModal.style.display = 'none';

    const modalContent = `
        <div class="search-modal-content">
            <div class="search-header">
                <input type="text" class="search-modal-input" placeholder="Search for documentation...">
                <button class="search-close-btn">ESC</button>
            </div>
            <div class="search-results"></div>
        </div>
    `;

    searchModal.innerHTML = modalContent;
    document.body.appendChild(searchModal);

    searchInput = searchModal.querySelector('.search-modal-input');
    searchResults = searchModal.querySelector('.search-results');
    
    searchModal.querySelector('.search-close-btn').addEventListener('click', closeSearch);
}

/**
 * Configura los event listeners para abrir/cerrar el modal y buscar.
 */
function setupEventListeners() {
    const openDesktop = document.getElementById('open-search-desktop');
    const openMobile = document.getElementById('open-search-mobile');
    
    if (openDesktop) openDesktop.addEventListener('click', openSearch);
    if (openMobile) openMobile.addEventListener('click', openSearch);

    // Atajo de teclado (Ctrl+K)
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (searchModal && searchModal.style.display === 'block') {
                closeSearch();
            } else {
                openSearch();
            }
        } else if (e.key === 'Escape' && searchModal && searchModal.style.display === 'block') {
            closeSearch();
        }
    });

    // Búsqueda en tiempo real
    if (searchInput) {
        searchInput.addEventListener('input', runSearch);
    }

    // Cerrar al hacer clic fuera del modal
    if (searchModal) {
        searchModal.addEventListener('click', function(e) {
            if (e.target === searchModal) {
                closeSearch();
            }
        });
    }
}

/**
 * Carga todos los archivos Markdown y construye el índice de búsqueda.
 */
function loadAllDocuments() {
    console.log(`Indexando ${DOC_FILENAMES.length} documentos...`);
    
    const fetchPromises = DOC_FILENAMES.map(filename => 
        fetch(`docs/${filename}.md`)
            .then(response => {
                if (!response.ok) throw new Error(`Error loading ${filename}.md`);
                return response.text();
            })
            .then(markdownText => {
                docsContent[filename] = markdownText;
                indexDocumentContent(filename, markdownText);
            })
            .catch(error => {
                console.error(`X Error indexing ${filename}:`, error.message);
            })
    );

    Promise.all(fetchPromises).then(() => {
        console.log(`Indexación completa. ${searchIndex.length} secciones indexadas.`);
    });
}

/**
 * Procesa el texto Markdown de un archivo para construir el índice de secciones.
 */
function indexDocumentContent(filename, markdownText) {
    const h1Match = markdownText.match(/^#\s+(.*)/m);
    const documentTitle = h1Match ? h1Match[1].trim() : filename.charAt(0).toUpperCase() + filename.slice(1);
    
    const sections = markdownText.split(/^(##\s+.*|###\s+.*)/gm).filter(s => s.trim() !== '');

    searchIndex = searchIndex.filter(item => item.filename !== filename);

    let currentTitle = documentTitle;

    for (let i = 0; i < sections.length; i++) {
        const section = sections[i].trim();
        
        if (section.startsWith('## ') || section.startsWith('### ')) {
            currentTitle = section.replace(/^(##|###)\s*/, '').trim();
            const nextContent = sections[i + 1] ? sections[i + 1].trim() : '';

            const cleanContent = nextContent
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ');

            if (cleanContent.length > 10) {
                searchIndex.push({
                    filename: filename,
                    title: currentTitle,
                    context: cleanContent,
                    content: (currentTitle + ' ' + cleanContent).toLowerCase()
                });
            }
            i++;
        } else {
            const cleanContent = section
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ');
            
            if (cleanContent.length > 10 && searchIndex.filter(item => item.filename === filename && item.title === documentTitle).length === 0) {
                 searchIndex.push({
                    filename: filename,
                    title: documentTitle,
                    context: cleanContent.substring(0, 300) + (cleanContent.length > 300 ? '...' : ''),
                    content: cleanContent.toLowerCase()
                });
            }
        }
    }
}

/**
 * Muestra el modal de búsqueda y enfoca la entrada.
 */
function openSearch() {
    if (!searchModal) {
        console.error('X Error: Modal de búsqueda no inicializado');
        return;
    }
    searchModal.style.display = 'flex';
    if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 100);
    }
    if (searchResults) {
        searchResults.innerHTML = '<p class="text-gray-500 p-4 text-center">Escribe para empezar a buscar...</p>';
    }
}

/**
 * Oculta el modal de búsqueda.
 */
function closeSearch() {
    if (!searchModal) return;
    searchModal.style.display = 'none';
}

/**
 * Ejecuta la búsqueda en el índice en memoria.
 */
function runSearch() {
    if (!searchInput || !searchResults) return;
    
    const query = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = '';

    if (query.length < 2) {
        searchResults.innerHTML = '<p class="text-gray-500 p-4 text-center">Escribe al menos 2 caracteres.</p>';
        return;
    }

    const matchedResults = searchIndex.filter(item => item.content.includes(query));

    if (matchedResults.length === 0) {
        searchResults.innerHTML = `<p class="text-gray-500 p-4 text-center">No se encontraron resultados para "${searchInput.value}".</p>`;
    } else {
        renderResults(matchedResults, query);
    }
}

/**
 * Renderiza los resultados de búsqueda en el modal.
 */
function renderResults(results, query) {
    if (!searchResults) return;
    
    results.slice(0, 10).forEach(match => {
        const resultElement = document.createElement('div');
        resultElement.className = 'search-result';

        const matchIndex = match.context.toLowerCase().indexOf(query);
        let contextSnippet = match.context;

        if (matchIndex !== -1) {
             const start = Math.max(0, matchIndex - 50);
             const end = Math.min(match.context.length, matchIndex + query.length + 100);
             contextSnippet = '...' + match.context.substring(start, end) + '...';
        } else {
             contextSnippet = match.context.substring(0, 150) + (match.context.length > 150 ? '...' : '');
        }

        const regex = new RegExp(query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
        const highlightedContext = contextSnippet.replace(
            regex,
            match => `<span class="search-highlight">${match}</span>`
        );

        resultElement.innerHTML = `
            <div class="search-result-title">${match.title} <span style="color: #9ca3af; font-size: 0.85em;">(${match.filename})</span></div>
            <div class="search-result-context">${highlightedContext}</div>
        `;

        resultElement.addEventListener('click', () => {
            navigateToResult(match.filename, match.title);
            closeSearch();
        });

        searchResults.appendChild(resultElement);
    });
}

/**
 * Navega a un documento y desplaza la vista al encabezado de la sección.
 */
function navigateToResult(filename, title) {
    if (typeof loadMarkdown === 'function') {
        loadMarkdown(filename);

        setTimeout(() => {
            const headings = document.querySelectorAll('#content h1, #content h2, #content h3');
            headings.forEach(heading => {
                if (heading.textContent.trim() === title) {
                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }, 300);
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}