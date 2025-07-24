const pathParts = window.location.pathname.split('/');
const basePath = pathParts[1]
  ? '/' + pathParts[1] + '/'
  : '/';

let currentDoc = 'index';

document.addEventListener('DOMContentLoaded', () => {
  // Determina el documento inicial (quita el basePath)
  currentDoc = window.location.pathname.slice(basePath.length) || 'index';
  loadMarkdown(currentDoc);
  setActiveNav(currentDoc);

  // Captura clicks en la navbar y menú móvil
  document.querySelectorAll('.nav-link, .mobile-menu-link').forEach(link => {
    link.addEventListener('click', function(e) {
      if (this.target === '_blank') return;
      e.preventDefault();

      currentDoc = this.dataset.doc;
      loadMarkdown(currentDoc);
      history.pushState({ doc: currentDoc }, '', basePath + currentDoc);
      setActiveNav(currentDoc);
    });
  });

  // Maneja back/forward del navegador
  window.addEventListener('popstate', e => {
    currentDoc = (e.state && e.state.doc)
               || window.location.pathname.slice(basePath.length)
               || 'index';
    loadMarkdown(currentDoc);
    setActiveNav(currentDoc);
  });
});

function setActiveNav(docName) {
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.doc === docName)
  );
}

function loadMarkdown(filename) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading documentation...</div>';

  fetch(`${basePath}docs/${filename}.md`)
    .then(r => {
      if (!r.ok) throw new Error('Failed to load file');
      return r.text();
    })
    .then(md => {
      // Configurar marked + prism
      marked.setOptions({
        gfm: true,
        breaks: true,
        highlight: (code, lang) =>
          Prism.languages[lang]
            ? Prism.highlight(code, Prism.languages[lang], lang)
            : code
      });

      content.innerHTML = marked.parse(md);

      // Añadir ancla con listener para cada header
      content.querySelectorAll('h1, h2, h3, h4, h5, h6')
        .forEach(hdr => {
          if (!hdr.id) {
            hdr.id = hdr.textContent
                       .trim()
                       .toLowerCase()
                       .replace(/\s+/g, '-')
                       .replace(/[^\w\-]/g, '');
          }
          const a = document.createElement('a');
          a.className = 'header-anchor';
          a.href = `#${hdr.id}`;
          a.innerHTML = '🔗';
          a.addEventListener('click', e => {
            e.preventDefault();
            hdr.scrollIntoView({ behavior: 'smooth' });
            // Actualiza solo el hash en la URL sin recargar
            history.replaceState(history.state, '', basePath + filename + '#' + hdr.id);
          });
          hdr.prepend(a);
        });

      generatePageNav();
      if (window.Prism) Prism.highlightAllUnder(content);
    })
    .catch(err => {
      content.innerHTML = `
        <div class="error">
          <h2>Error loading documentation</h2>
          <p>${err.message}</p>
        </div>`;
    });
}

function generatePageNav() {
  const nav = document.getElementById('page-nav-links');
  nav.innerHTML = '';
  const headings = document.querySelectorAll('#content h1, #content h2, #content h3');

  if (!headings.length) {
    document.querySelector('.page-nav').style.display = 'none';
    return;
  }
  document.querySelector('.page-nav').style.display = 'block';

  headings.forEach((h, idx) => {
    if (!h.id) h.id = 'heading-' + idx;
    const link = document.createElement('a');
    link.href = '#' + h.id;
    link.textContent = h.textContent;
    link.className = 'page-nav-link';
    if (h.tagName === 'H3') {
      link.style.paddingLeft = '1rem';
      link.style.fontSize = '0.85rem';
    }
    link.addEventListener('click', e => {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth' });
      document.querySelectorAll('.page-nav-link').forEach(a => a.classList.remove('active'));
      link.classList.add('active');
    });
    nav.appendChild(link);
  });

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.id;
        document.querySelectorAll('.page-nav-link').forEach(a =>
          a.classList.toggle('active', a.getAttribute('href') === '#' + id)
        );
      }
    });
  }, { threshold: 0.1, rootMargin: '-20% 0px -80% 0px' });

  headings.forEach(h => obs.observe(h));
}