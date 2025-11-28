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
                <input type="text" class="search-modal-input" placeholder="Buscar documentación...">
                <button class="search-close-btn">×</button>
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


function setupEventListeners() {
    document.getElementById('open-search-desktop').addEventListener('click', openSearch);
    document.getElementById('open-search-mobile').addEventListener('click', openSearch);

    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            if (searchModal.style.display === 'block') {
                closeSearch();
            } else {
                openSearch();
            }
        } else if (e.key === 'Escape' && searchModal.style.display === 'block') {
            closeSearch();
        }
    });

    searchInput.addEventListener('input', runSearch);
}


function loadAllDocuments() {
    console.log(`[Search] Indexando ${DOC_FILENAMES.length} documentos...`);
    
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
                console.error(`[Search] Error indexing ${filename}:`, error.message);
            })
    );

    Promise.all(fetchPromises).then(() => {
        console.log(`[Search] Indexación completa. ${searchIndex.length} secciones indexadas.`)
    });
}


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
                    context: cleanContent.substring(0, 300) + (cleanContent.length > 300 ? '...' : ''), // Snippet del inicio
                    content: cleanContent.toLowerCase()
                });
            }
        }
    }
}


function openSearch() {
    searchModal.style.display = 'block';
    searchInput.value = '';
    searchResults.innerHTML = '<p class="text-gray-500 p-2">Escribe para empezar a buscar...</p>';
    setTimeout(() => searchInput.focus(), 100);
}


function closeSearch() {
    searchModal.style.display = 'none';
}


function runSearch() {
    const query = searchInput.value.trim().toLowerCase();
    searchResults.innerHTML = '';

    if (query.length < 2) {
        searchResults.innerHTML = '<p class="text-gray-500 p-2">Escribe al menos 2 caracteres.</p>';
        return;
    }

    const matchedResults = searchIndex.filter(item => item.content.includes(query));

    if (matchedResults.length === 0) {
        searchResults.innerHTML = `<p class="text-gray-500 p-2">No se encontraron resultados para "${searchInput.value}".</p>`;
    } else {
        renderResults(matchedResults, query);
    }
}


function renderResults(results, query) {
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
            <div class="search-result-title">${match.title} (${match.filename})</div>
            <div class="search-result-context">${highlightedContext}</div>
        `;

        resultElement.addEventListener('click', () => {
            navigateToResult(match.filename, match.title);
            closeSearch();
        });

        searchResults.appendChild(resultElement);
    });
}

function navigateToResult(filename, title) {
    loadMarkdown(filename);

    setTimeout(() => {
        const headings = document.querySelectorAll('#content h1, #content h2, #content h3');
        headings.forEach(heading => {
            if (heading.textContent.trim() === title) {
                heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    }, 200);
}