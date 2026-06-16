document.addEventListener('DOMContentLoaded', () => {
    // --- State ---
    let releaseNotes = [];
    let activeFilter = 'all';
    let searchQuery = '';
    let selectedChanges = new Set(); // Stores composite key `releaseId_index`
    
    // --- DOM Elements ---
    const btnRefresh = document.getElementById('btn-refresh');
    const btnExportCsv = document.getElementById('btn-export-csv');
    const btnThemeToggle = document.getElementById('btn-theme-toggle');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.tag-btn');
    const releasesContainer = document.getElementById('releases-container');
    
    // Theme Toggle Icons
    const sunIcon = btnThemeToggle.querySelector('.sun-icon');
    const moonIcon = btnThemeToggle.querySelector('.moon-icon');
    
    // Tweet Composer Elements
    const tweetComposer = document.getElementById('tweet-composer');
    const tweetTextarea = document.getElementById('tweet-textarea');
    const btnCloseComposer = document.getElementById('btn-close-composer');
    const btnTweetNow = document.getElementById('btn-tweet-now');
    const tweetCharCounter = document.getElementById('tweet-char-counter');
    
    // --- Load Saved Theme ---
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        sunIcon.style.display = 'none';
        moonIcon.style.display = 'block';
    }
    
    // --- Event Listeners ---
    btnRefresh.addEventListener('click', fetchReleaseNotes);
    btnExportCsv.addEventListener('click', exportToCsv);
    searchInput.addEventListener('input', handleSearch);
    
    btnThemeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
        
        if (isLight) {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
        }
    });
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeFilter = btn.dataset.filter;
            renderReleases();
        });
    });
    
    // Tweet Composer events
    btnCloseComposer.addEventListener('click', clearTweetSelection);
    tweetTextarea.addEventListener('input', updateCharCounter);
    btnTweetNow.addEventListener('click', shareOnTwitter);
    
    // Initial load
    fetchReleaseNotes();
    
    // --- API Calls ---
    async function fetchReleaseNotes() {
        showLoadingState();
        try {
            const response = await fetch('/api/releases');
            const data = await response.json();
            
            if (data.success) {
                releaseNotes = data.releases;
                clearTweetSelection();
                renderReleases();
            } else {
                showErrorState(data.error || 'No se pudieron recuperar las notas de lanzamiento.');
            }
        } catch (error) {
            console.error('Error fetching release notes:', error);
            showErrorState('Error de conexión con el servidor. Por favor, intente de nuevo.');
        } finally {
            hideLoadingState();
        }
    }
    
    // --- Render Functions ---
    function showLoadingState() {
        btnRefresh.classList.add('loading');
        btnRefresh.disabled = true;
        
        releasesContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-card"></div>
        `).join('');
    }
    
    function hideLoadingState() {
        btnRefresh.classList.remove('loading');
        btnRefresh.disabled = false;
    }
    
    function showErrorState(message) {
        releasesContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                    </svg>
                </div>
                <h3>¡Ups! Algo salió mal</h3>
                <p>${escapeHTML(message)}</p>
                <button class="btn-retry" id="btn-retry">Reintentar</button>
            </div>
        `;
        document.getElementById('btn-retry')?.addEventListener('click', fetchReleaseNotes);
    }
    
    function renderReleases() {
        const filtered = filterAndSearchNotes();
        
        if (filtered.length === 0) {
            releasesContainer.innerHTML = `
                <div class="empty-state" style="background: var(--bg-card);">
                    <div class="empty-state-icon" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted);">
                        <svg viewBox="0 0 24 24">
                            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                        </svg>
                    </div>
                    <h3>No se encontraron resultados</h3>
                    <p>Pruebe con otros términos de búsqueda o filtros.</p>
                </div>
            `;
            return;
        }
        
        releasesContainer.innerHTML = filtered.map((note, noteIndex) => {
            const changesHTML = note.filteredChanges.map((change, changeIndex) => {
                const uniqueKey = `${note.id}_${change.originalIndex}`;
                const isChecked = selectedChanges.has(uniqueKey) ? 'checked' : '';
                
                return `
                    <div class="change-item" data-key="${uniqueKey}">
                        <div class="change-item-top">
                            <div class="change-type-selector">
                                <label class="change-checkbox-wrapper">
                                    <input type="checkbox" class="change-checkbox" data-key="${uniqueKey}" ${isChecked}>
                                </label>
                                <span class="change-badge badge-${change.type.toLowerCase()}">${change.type}</span>
                            </div>
                            <div class="change-actions">
                                <button class="btn-share-change" data-text="${escapeHTML(change.text)}" title="Twittear este cambio">
                                    <svg viewBox="0 0 24 24">
                                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="change-content">${highlightText(change.html, searchQuery)}</div>
                    </div>
                `;
            }).join('');
            
            return `
                <article class="release-card" style="animation-delay: ${noteIndex * 0.05}s">
                    <div class="card-header">
                        <div class="card-title-area">
                            <div class="card-date">
                                <svg viewBox="0 0 24 24">
                                    <path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/>
                                </svg>
                                <span>${note.date}</span>
                            </div>
                            <h2 class="card-title">${escapeHTML(note.title)}</h2>
                        </div>
                        <button class="btn-copy-card" data-note-index="${noteIndex}" title="Copiar nota al portapapeles">
                            <svg viewBox="0 0 24 24">
                                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                            </svg>
                            <span>Copiar</span>
                        </button>
                    </div>
                    <div class="changes-list">
                        ${changesHTML}
                    </div>
                </article>
            `;
        }).join('');
        
        // Adjuntar eventos a los dinámicos
        attachDynamicEventListeners(filtered);
    }
    
    function attachDynamicEventListeners(filtered) {
        // Checkboxes para twittear seleccionados
        const checkboxes = releasesContainer.querySelectorAll('.change-checkbox');
        checkboxes.forEach(chk => {
            chk.addEventListener('change', (e) => {
                const key = e.target.dataset.key;
                if (e.target.checked) {
                    selectedChanges.add(key);
                } else {
                    selectedChanges.delete(key);
                }
                updateTweetComposer();
            });
        });
        
        // Botones individuales para compartir en Twitter
        const shareBtns = releasesContainer.querySelectorAll('.btn-share-change');
        shareBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const text = btn.dataset.text;
                // Formateamos un tweet corto y agradable
                const tweetText = `BigQuery Update:\n"${truncateText(text, 190)}"\n\n#BigQuery #GoogleCloud`;
                const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                window.open(twitterUrl, '_blank');
            });
        });

        // Botones de copiar tarjeta al portapapeles
        const copyCardBtns = releasesContainer.querySelectorAll('.btn-copy-card');
        copyCardBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const noteIndex = parseInt(btn.dataset.noteIndex, 10);
                const note = filtered[noteIndex];
                
                // Construir texto formateado para la nota
                let textToCopy = `BigQuery Release Notes - ${note.title} (${note.date})\n\n`;
                note.filteredChanges.forEach(c => {
                    textToCopy += `[${c.type}] ${c.text}\n`;
                });
                
                navigator.clipboard.writeText(textToCopy).then(() => {
                    // Feedback visual temporal
                    const span = btn.querySelector('span');
                    const originalText = span.textContent;
                    span.textContent = '¡Copiado!';
                    btn.style.color = 'var(--color-feature)';
                    btn.style.borderColor = 'var(--color-feature)';
                    
                    setTimeout(() => {
                        span.textContent = originalText;
                        btn.style.color = '';
                        btn.style.borderColor = '';
                    }, 2000);
                }).catch(err => {
                    console.error('Error al copiar al portapapeles: ', err);
                });
            });
        });
    }
    
    // --- Filter and Search Logic ---
    function filterAndSearchNotes() {
        const query = searchQuery.toLowerCase().trim();
        
        return releaseNotes.map(note => {
            // Guardamos el índice original de cada cambio para poder mapearlo después
            const mappedChanges = note.changes.map((c, idx) => ({ ...c, originalIndex: idx }));
            
            // 1. Filtrar por tipo (badge)
            let filtered = mappedChanges;
            if (activeFilter !== 'all') {
                filtered = mappedChanges.filter(c => c.type === activeFilter);
            }
            
            // 2. Filtrar por término de búsqueda
            if (query) {
                filtered = filtered.filter(c => 
                    c.text.toLowerCase().includes(query) || 
                    note.title.toLowerCase().includes(query) ||
                    note.date.toLowerCase().includes(query)
                );
            }
            
            return {
                ...note,
                filteredChanges: filtered
            };
        }).filter(note => note.filteredChanges.length > 0);
    }
    
    function handleSearch(e) {
        searchQuery = e.target.value;
        renderReleases();
    }
    
    // --- Tweet Composer Logic ---
    function updateTweetComposer() {
        if (selectedChanges.size === 0) {
            tweetComposer.style.display = 'none';
            return;
        }
        
        // Construimos el tweet a partir de los elementos seleccionados
        let selectedTexts = [];
        
        // Iteramos los elementos reales buscando los que coincidan con el Set
        releaseNotes.forEach(note => {
            note.changes.forEach((change, idx) => {
                const key = `${note.id}_${idx}`;
                if (selectedChanges.has(key)) {
                    selectedTexts.push(change.text);
                }
            });
        });
        
        let headerText = "💡 BigQuery Updates I'm checking out:\n";
        let footerText = "\n#BigQuery #GoogleCloud #DataEngineering";
        
        // Intentar encajar la mayor cantidad de cambios respetando el límite de 280 caracteres
        let itemsText = "";
        selectedTexts.forEach(txt => {
            const formattedItem = `• ${truncateText(txt, 80)}\n`;
            itemsText += formattedItem;
        });
        
        let fullTweetText = headerText + itemsText + footerText;
        
        // Si excede el límite total, recortamos
        if (fullTweetText.length > 280) {
            // Reducimos cada item un poco más
            itemsText = "";
            selectedTexts.forEach(txt => {
                const formattedItem = `• ${truncateText(txt, 50)}\n`;
                itemsText += formattedItem;
            });
            fullTweetText = headerText + itemsText + footerText;
            
            // Si aún así se pasa, tomamos el primer item completo y agregamos puntos suspensivos
            if (fullTweetText.length > 280) {
                const singleItem = selectedTexts[0];
                const availableSpace = 280 - headerText.length - footerText.length - 10;
                fullTweetText = headerText + `• ${truncateText(singleItem, availableSpace)}\n` + footerText;
            }
        }
        
        tweetTextarea.value = fullTweetText;
        tweetComposer.style.display = 'block';
        updateCharCounter();
    }
    
    function updateCharCounter() {
        const len = tweetTextarea.value.length;
        const remaining = 280 - len;
        
        tweetCharCounter.textContent = `${remaining} caracteres restantes`;
        
        if (remaining < 0) {
            tweetCharCounter.className = 'tweet-char-counter error';
            btnTweetNow.disabled = true;
        } else if (remaining < 30) {
            tweetCharCounter.className = 'tweet-char-counter warning';
            btnTweetNow.disabled = false;
        } else {
            tweetCharCounter.className = 'tweet-char-counter';
            btnTweetNow.disabled = false;
        }
    }
    
    function shareOnTwitter() {
        const text = tweetTextarea.value;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank');
    }
    
    function clearTweetSelection() {
        selectedChanges.clear();
        tweetComposer.style.display = 'none';
        
        // Desmarcar todos los checkboxes de la interfaz
        const checkboxes = releasesContainer.querySelectorAll('.change-checkbox');
        checkboxes.forEach(chk => chk.checked = false);
    }
    
    // --- Helper Functions ---
    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    function truncateText(str, maxLength) {
        if (!str) return '';
        if (str.length <= maxLength) return str;
        return str.substr(0, maxLength - 3) + '...';
    }

    function highlightText(html, query) {
        if (!query || !query.trim()) return html;
        const trimmedQuery = query.trim();
        // Escapar caracteres especiales para la regex
        const escapedQuery = trimmedQuery.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        // Coincidir solo el texto fuera de etiquetas HTML para evitar romper elementos HTML
        const regex = new RegExp(`(?![^<>]*>)(${escapedQuery})`, 'gi');
        return html.replace(regex, '<mark class="highlight">$1</mark>');
    }

    // --- Export to CSV Logic ---
    function exportToCsv() {
        const filtered = filterAndSearchNotes();
        if (filtered.length === 0) {
            alert("No hay datos filtrados para exportar.");
            return;
        }
        
        // Cabeceras del CSV (UTF-8 BOM para soporte correcto de caracteres en Excel)
        let csvContent = "\uFEFFFecha,Título,Tipo de Cambio,Detalle\n";
        
        filtered.forEach(note => {
            note.filteredChanges.forEach(change => {
                const titleClean = note.title.replace(/"/g, '""');
                const dateClean = note.date.replace(/"/g, '""');
                const typeClean = change.type.replace(/"/g, '""');
                const textClean = change.text.replace(/"/g, '""');
                
                csvContent += `"${dateClean}","${titleClean}","${typeClean}","${textClean}"\n`;
            });
        });
        
        // Descargar el archivo CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_release_notes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});
