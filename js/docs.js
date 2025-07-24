document.addEventListener('DOMContentLoaded', () => {
  // Carga inicial según el hash (o 'index')
  handleHashChange();

  // Maneja cambios de hash
  window.addEventListener('hashchange', handleHashChange);
});

function handleHashChange() {
  // Ejemplos de hash:
  //   "#/api"               → doc = "api",     anchor = null
  //   "#/api/mi‑encabezado" → doc = "api",     anchor = "mi‑encabezado"
  //   "#"                   → doc = "index",   anchor = null
  let hash = window.location.hash.slice(1); // quita '#'
  if (!hash) hash = '/index';
  const parts = hash.split('/');
  const doc = parts[1] || 'index';
  const anchor = parts[2] || null;

  loadMarkdown(doc).then(() => {
    setActiveNav(doc);
    if (anchor) {
      const el = document.getElementById(anchor);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

function setActiveNav(docName) {
  document.querySelectorAll('.nav-link').forEach(a =>
    a.classList.toggle('active', a.dataset.doc === docName)
  );
}

async function loadMarkdown(filename) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Loading documentation...</div>';

  try {
    const resp = await fetch(`docs/${filename}.md`);
    if (!resp.ok) throw new Error('Failed to load file');
    const md = await resp.text();

    // Configurar marked
    marked.setOptions({
      gfm: true,
      breaks: true,
      highlight: (code, lang) =>
        Prism.languages[lang]
          ? Prism.highlight(code, Prism.languages[lang], lang)
          : code
    });

    // Renderiza MD
    content.innerHTML = marked.parse(md);

    // Añade anclas a headers y actualiza sus hrefs
    content.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(hdr => {
      if (!hdr.id) {
        hdr.id = hdr.textContent
                   .trim()
                   .toLowerCase()
                   .replace(/\s+/g, '-')
                   .replace(/[^\w\-]/g, '');
      }
      // href debe ser "#/{doc}/{hdr.id}"
      const a = document.createElement('a');
      a.className = 'header-anchor';
      a.href = `#/${filename}/${hdr.id}`;
      a.innerHTML = '🔗';
      hdr.prepend(a);
    });

    generatePageNav(filename);
    Prism.highlightAllUnder(content);
  } catch (err) {
    content.innerHTML = `
      <div class="error">
        <h2>Error loading documentation</h2>
        <p>${err.message}</p>
      </div>`;
  }
}

function generatePageNav(currentDoc) {
  const nav = document.getElementById('page-nav-links');
  nav.innerHTML = '';
  const headings = document.querySelectorAll('#content h1, #content h2, #content h3');
  if (!headings.length) {
    document.querySelector('.page-nav').style.display = 'none';
    return;
  }
  document.querySelector('.page-nav').style.display = 'block';

  headings.forEach((h, idx) => {
    const id = h.id || ('heading-' + idx);
    h.id = id;
    const link = document.createElement('a');
    link.href = `#/${currentDoc}/${id}`;
    link.textContent = h.textContent;
    link.className = 'page-nav-link';
    if (h.tagName === 'H3') {
      link.style.paddingLeft = '1rem';
      link.style.fontSize = '0.85rem';
    }
    link.addEventListener('click', e => {
      // El hashchange se encargará de todo
      e.preventDefault();
      window.location.hash = `/${currentDoc}/${id}`;
    });
    nav.appendChild(link);
  });
}
