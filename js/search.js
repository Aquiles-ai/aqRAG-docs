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
    // Create modal element with Tailwind classes
    searchModal = document.createElement('div');
    searchModal.className = 'fixed inset-0 z-50 hidden items-center justify-center bg-black/50 p-4';
    searchModal.setAttribute('aria-hidden', 'true');

    const modalContent = document.createElement('div');
    modalContent.className = 'w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden';
    modalContent.innerHTML = `
        <div class="p-4 border-b border-gray-100 flex items-center gap-3">
            <input type="text" class="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 search-modal-input" placeholder="Search for documentation...">
            <button type="button" class="px-3 py-1 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 search-close-btn">Esc</button>
        </div>
        <div class="max-h-80 overflow-y-auto p-4 search-results bg-white"></div>
    `;

    searchModal.appendChild(modalContent);
    document.body.appendChild(searchModal);

    // Hook elements
    searchInput = searchModal.querySelector('.search-modal-input');
    searchResults = searchModal.querySelector('.search-results');

    // Close button
    searchModal.querySelector('.search-close-btn').addEventListener('click', () => closeSearch());

    // Click outside to close
    searchModal.addEventListener('click', function (e) {
        if (e.target === searchModal) closeSearch();
    });

    // Enter & navigation handling inside input
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    });

    // Add a minimal highlight style using Tailwind-compatible classes produced inline
}

function setupEventListeners() {
    // Integrate with header search input (if present)
    const headerSearch = document.querySelector('.search-input');
    if (headerSearch) {
        headerSearch.addEventListener('click', (e) => {
            e.preventDefault();
            openSearch();
        });

        // Allow pressing any key while header input is focused to open modal and type
        headerSearch.addEventListener('keydown', (e) => {
            // Let Ctrl/Cmd+K be handled globally
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') return;

            openSearch();
            // Delay a little then set the modal input value to what user typed (if printable)
            setTimeout(() => {
                searchInput.focus();
                if (e.key && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                    searchInput.value = e.key;
                    runSearch();
                }
            }, 60);
        });
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', function (e) {
        // Ctrl/Cmd + K to open search
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            if (searchModal && !isModalOpen()) openSearch();
            else if (searchModal && isModalOpen()) closeSearch();
            return;
        }

        // Escape closes modal
        if (e.key === 'Escape' && isModalOpen()) {
            closeSearch();
        }
    });

    // Input typing
    if (searchInput) {
        searchInput.addEventListener('input', debounce(runSearch, 180));
    }
}

function isModalOpen() {
    return searchModal && !searchModal.classList.contains('hidden');
}

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

function indexDocumentContent(filename, markdownText) {
    const h1Match = markdownText.match(/^#\s+(.*)/m);
    const documentTitle = h1Match ? h1Match[1].trim() : filename.charAt(0).toUpperCase() + filename.slice(1);

    // Split by headings: keep headings in array
    const sections = markdownText.split(/(^##\s+.*$|^###\s+.*$)/m).map(s => s || '').filter(s => s.trim() !== '');

    // Remove existing entries for this filename
    searchIndex = searchIndex.filter(item => item.filename !== filename);

    let currentTitle = documentTitle;

    for (let i = 0; i < sections.length; i++) {
        const part = sections[i].trim();
        if (/^##\s+/.test(part) || /^###\s+/.test(part)) {
            currentTitle = part.replace(/^(##|###)\s*/, '').trim();
            const nextContent = sections[i + 1] ? sections[i + 1].trim() : '';

            const cleanContent = nextContent
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (cleanContent.length > 10) {
                searchIndex.push({
                    filename: filename,
                    title: currentTitle,
                    context: cleanContent,
                    content: (currentTitle + ' ' + cleanContent).toLowerCase()
                });
            }
            i++; // skip content that was consumed
        } else {
            const cleanContent = part
                .replace(/```[\s\S]*?```/g, '')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
                .replace(/<[^>]*>/g, '')
                .replace(/\s+/g, ' ')
                .trim();

            if (cleanContent.length > 10 && !searchIndex.some(item => item.filename === filename && item.title === documentTitle)) {
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

function openSearch() {
    if (!searchModal) {
        console.error('X Error: Modal de búsqueda no inicializado');
        return;
    }
    searchModal.classList.add('flex');
    searchModal.classList.remove('hidden');
    searchModal.setAttribute('aria-hidden', 'false');
    if (searchInput) {
        searchInput.value = '';
        setTimeout(() => searchInput.focus(), 60);
    }
    if (searchResults) {
        searchResults.innerHTML = '<p class="text-gray-500 p-4 text-center">Type to start your search...</p>';
    }
}

function closeSearch() {
    if (!searchModal) return;
    searchModal.classList.add('hidden');
    searchModal.classList.remove('flex');
    searchModal.setAttribute('aria-hidden', 'true');
}

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
        searchResults.innerHTML = `<p class="text-gray-500 p-4 text-center">No se encontraron resultados para "${escapeHtml(searchInput.value)}".</p>`;
    } else {
        renderResults(matchedResults, query);
    }
}

function renderResults(results, query) {
    if (!searchResults) return;

    // clear
    searchResults.innerHTML = '';

    results.slice(0, 10).forEach(match => {
        const resultElement = document.createElement('div');
        resultElement.className = 'p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-transparent hover:border-gray-100 mb-2';

        const matchIndex = match.context.toLowerCase().indexOf(query);
        let contextSnippet = match.context;

        if (matchIndex !== -1) {
            const start = Math.max(0, matchIndex - 50);
            const end = Math.min(match.context.length, matchIndex + query.length + 100);
            contextSnippet = (start > 0 ? '...' : '') + match.context.substring(start, end) + (end < match.context.length ? '...' : '');
        } else {
            contextSnippet = match.context.substring(0, 150) + (match.context.length > 150 ? '...' : '');
        }

        const regex = new RegExp(escapeRegExp(query), 'gi');
        const highlightedContext = escapeHtml(contextSnippet).replace(regex, (m) => `<span class="px-1 rounded bg-yellow-100 text-yellow-800">${m}</span>`);

        resultElement.innerHTML = `
            <div class="flex items-baseline justify-between">
                <div class="font-medium text-sm text-gray-800">${escapeHtml(match.title)}</div>
                <div class="text-xs text-gray-400">${escapeHtml(match.filename)}</div>
            </div>
            <div class="text-sm text-gray-600 mt-1">${highlightedContext}</div>
        `;

        resultElement.addEventListener('click', () => {
            navigateToResult(match.filename, match.title);
            closeSearch();
        });

        searchResults.appendChild(resultElement);
    });
}

function navigateToResult(filename, title) {
    if (typeof loadMarkdown === 'function') {
        loadMarkdown(filename);

        // Wait until content area is updated. loadMarkdown doesn't return a promise,
        // so use a MutationObserver to detect changes and then scroll to the heading.
        const contentEl = document.getElementById('content');
        if (!contentEl) return;

        const observer = new MutationObserver((mutations, obs) => {
            // try to scroll to matching heading
            const headings = contentEl.querySelectorAll('h1, h2, h3');
            for (const heading of headings) {
                if (heading.textContent && heading.textContent.trim() === title) {
                    heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    obs.disconnect();
                    return;
                }
            }

            // if not found after a short while, give up
            // (we keep observing but add a timeout cleanup)
        });

        observer.observe(contentEl, { childList: true, subtree: true });

        // safety timeout to disconnect observer after 2.5s
        setTimeout(() => observer.disconnect(), 2500);
    }
}

// Utility helpers
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function debounce(fn, wait) {
    let t = null;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), wait);
    };
}

// Init on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSearch);
} else {
    initSearch();
}