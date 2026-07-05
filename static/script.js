const COLOR_OPTIONS = [
    { label: 'Cyan', value: '#00f0ff', rgb: '0, 240, 255' },
    { label: 'Pink', value: '#ff007f', rgb: '255, 0, 127' },
    { label: 'Green', value: '#39ff14', rgb: '57, 255, 20' },
    { label: 'Yellow', value: '#fcee0a', rgb: '252, 238, 10' },
    { label: 'Purple', value: '#bd00ff', rgb: '189, 0, 255' },
    { label: 'Blue', value: '#0049ff', rgb: '0, 73, 255' },
    { label: 'Red', value: '#ff003c', rgb: '255, 0, 60' },
    { label: 'Orange', value: '#ff5e00', rgb: '255, 94, 0' }
];

document.addEventListener('DOMContentLoaded', () => {
    const notesGrid = document.getElementById('notes-grid');
    const searchInput = document.getElementById('search-input');
    const headerAddBtn = document.getElementById('header-add-btn');

    // Edit Modal elements
    const editModal = document.getElementById('edit-modal');
    const editTitle = document.getElementById('edit-title');
    const editContent = document.getElementById('edit-content');
    const editColorVal = document.getElementById('edit-color-val');
    const modalSaveBtn = document.getElementById('modal-save-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    
    // Create Modal elements
    const createModal = document.getElementById('create-modal');
    const createTitle = document.getElementById('create-title');
    const createContent = document.getElementById('create-content');
    const createColorVal = document.getElementById('create-color-val');
    const modalCreateSaveBtn = document.getElementById('create-modal-save-btn');
    const modalCreateCancelBtn = document.getElementById('create-modal-cancel-btn');

    let currentEditingNoteId = null;
    let sortableInstance = null;

    // Color Pickers Setup
    const setupColorPicker = (containerId, hiddenInputId) => {
        const container = document.getElementById(containerId);
        const hiddenInput = document.getElementById(hiddenInputId);
        
        container.innerHTML = '';
        COLOR_OPTIONS.forEach((opt, idx) => {
            const chip = document.createElement('div');
            chip.className = 'color-chip';
            chip.style.backgroundColor = opt.value;
            chip.style.color = opt.value;
            chip.dataset.value = opt.value;
            chip.title = opt.label;
            
            if (hiddenInput.value === opt.value || (idx === 0 && !hiddenInput.value)) {
                chip.classList.add('selected');
                hiddenInput.value = opt.value;
            }

            chip.addEventListener('click', () => {
                container.querySelectorAll('.color-chip').forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                hiddenInput.value = opt.value;

                // Live neon glow updates for the modals
                if (containerId === 'edit-color-picker') {
                    editModal.style.setProperty('--neon-cyan', opt.value);
                    editModal.style.boxShadow = `0 0 30px rgba(${opt.rgb}, 0.4), 0 10px 50px rgba(0,0,0,0.8)`;
                } else if (containerId === 'create-color-picker') {
                    createModal.style.setProperty('--neon-cyan', opt.value);
                    createModal.style.boxShadow = `0 0 30px rgba(${opt.rgb}, 0.4), 0 10px 50px rgba(0,0,0,0.8)`;
                }
            });
            container.appendChild(chip);
        });
    };

    const updateColorPickerSelection = (containerId, value) => {
        const container = document.getElementById(containerId);
        container.querySelectorAll('.color-chip').forEach(c => {
            if (c.dataset.value === value) {
                c.classList.add('selected');
            } else {
                c.classList.remove('selected');
            }
        });
    };

    setupColorPicker('edit-color-picker', 'edit-color-val');
    setupColorPicker('create-color-picker', 'create-color-val');

        // Check response for 401 (Authentication required)
        const checkResponse = (response) => {
            if (response.status === 401) {
                window.location.href = '/login';
                throw new Error("Unauthorized");
            }
            return response;
        };

        // Fetch and render notes
        const fetchNotes = async () => {
            const response = await fetch('/notes').then(checkResponse);
            const notes = await response.json();
            renderNotes(notes);
        };

    const renderNotes = (notes) => {
        notesGrid.innerHTML = '';
        notes.forEach(note => {
            const card = document.createElement('div');
            card.className = 'note-card';
            card.dataset.id = note.id;
            
            // Find theme colors
            const colorOption = COLOR_OPTIONS.find(opt => opt.value === note.color) || COLOR_OPTIONS[0];
            card.style.setProperty('--theme-color', colorOption.value);
            card.style.setProperty('--theme-rgb', colorOption.rgb);

            card.innerHTML = `
                <h3>${escapeHtml(note.title || 'UNTITLED //')}</h3>
                <p>${escapeHtml(note.content)}</p>
                <div class="note-actions">
                    <button class="edit-btn">EDIT</button>
                    <button class="delete-btn">DELETE</button>
                </div>
            `;

            // Double Click to Edit
            card.addEventListener('dblclick', () => {
                openEditModal(note);
            });

            // Action Button Events
            card.querySelector('.edit-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                openEditModal(note);
            });

            card.querySelector('.delete-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteNote(note.id);
            });

            notesGrid.appendChild(card);
        });

        // Re-apply search filter after rendering (keeps state)
        applySearchFilter();
    };

    const escapeHtml = (str) => {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };



    // Delete Note
    const deleteNote = async (id) => {
        const modal = document.createElement('dialog');
        modal.className = 'cyber-dialog';
        modal.innerHTML = `
            <div class="dialog-content">
                <h2 class="dialog-title" style="color: var(--neon-red); text-shadow: 0 0 10px var(--neon-red); border-color: var(--neon-red)">SYS_WARN //</h2>
                <p>DELETE MEMORY ID_${id} PERMANENTLY?</p>
                <div class="dialog-actions">
                    <button class="cyber-btn secondary cancel-btn"><span>ABORT</span></button>
                    <button class="cyber-btn confirm-btn" style="color: var(--neon-red); border-color: var(--neon-red);"><span>CONFIRM</span></button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.showModal();

        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            modal.close();
            modal.remove();
        });

        modal.querySelector('.confirm-btn').addEventListener('click', async () => {
            await fetch(`/notes/${id}`, { method: 'DELETE' }).then(checkResponse);
            modal.close();
            modal.remove();
            fetchNotes();
        });
    };

    // Open Edit Modal
    const openEditModal = (note) => {
        currentEditingNoteId = note.id;
        editTitle.value = note.title;
        editContent.value = note.content;
        editColorVal.value = note.color;
        
        // Find theme colors for modal border reflection
        const colorOption = COLOR_OPTIONS.find(opt => opt.value === note.color) || COLOR_OPTIONS[0];
        editModal.style.setProperty('--neon-cyan', colorOption.value);
        editModal.style.boxShadow = `0 0 30px rgba(${colorOption.rgb}, 0.4), 0 10px 50px rgba(0,0,0,0.8)`;
        
        updateColorPickerSelection('edit-color-picker', note.color);
        editModal.showModal();
    };

    // Save Edit
    modalSaveBtn.addEventListener('click', async () => {
        const title = editTitle.value;
        const content = editContent.value;
        const color = editColorVal.value;

        if (!title && !content) return;

        await fetch(`/notes/${currentEditingNoteId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content, color }),
        }).then(checkResponse);

        editModal.close();
        fetchNotes();
    });

    modalCancelBtn.addEventListener('click', () => {
        editModal.close();
    });

    // Close modal on click outside content
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.close();
        }
    });

    // --- Create Modal Event Handling ---
    headerAddBtn.addEventListener('click', () => {
        createTitle.value = '';
        createContent.value = '';
        createColorVal.value = COLOR_OPTIONS[0].value;
        updateColorPickerSelection('create-color-picker', COLOR_OPTIONS[0].value);
        
        // Initialize default cyan glow
        const defaultColor = COLOR_OPTIONS[0];
        createModal.style.setProperty('--neon-cyan', defaultColor.value);
        createModal.style.boxShadow = `0 0 30px rgba(${defaultColor.rgb}, 0.4), 0 10px 50px rgba(0,0,0,0.8)`;
        
        createModal.showModal();
    });

    modalCreateSaveBtn.addEventListener('click', async () => {
        const title = createTitle.value;
        const content = createContent.value;
        const color = createColorVal.value;

        if (!title && !content) return;

        await fetch('/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content, color }),
        }).then(checkResponse);

        createModal.close();
        fetchNotes();
    });

    modalCreateCancelBtn.addEventListener('click', () => {
        createModal.close();
    });

    createModal.addEventListener('click', (e) => {
        if (e.target === createModal) {
            createModal.close();
        }
    });

    // Search filter implementation
    const applySearchFilter = () => {
        const query = searchInput.value.toLowerCase().trim();
        const cards = notesGrid.querySelectorAll('.note-card');

        // Disable Sortable when searching to prevent placement bugs
        if (sortableInstance) {
            if (query) {
                sortableInstance.option('disabled', true);
            } else {
                sortableInstance.option('disabled', false);
            }
        }

        cards.forEach(card => {
            const title = card.querySelector('h3').textContent.toLowerCase();
            const content = card.querySelector('p').textContent.toLowerCase();
            if (title.includes(query) || content.includes(query)) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    };

    searchInput.addEventListener('input', applySearchFilter);

    // Drag and Drop (Sortable.js Setup)
    sortableInstance = Sortable.create(notesGrid, {
        animation: 250,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        delay: 200,             // 200ms of holding on mobile to drag
        delayOnTouchOnly: true, // Only apply delay to mobile devices
        touchStartThreshold: 5, // Cancel drag if touch shifts too much (avoids accidental triggers)
        onEnd: async () => {
            const cards = notesGrid.querySelectorAll('.note-card');
            const items = Array.from(cards).map((card, index) => ({
                id: parseInt(card.dataset.id),
                position: index
            }));

            await fetch('/notes/reorder', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(items),
            }).then(checkResponse);
        }
    });

    // Logout Button Setup
    const logoutBtn = document.getElementById('header-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                const response = await fetch('/auth/logout', { method: 'POST' });
                if (response.ok) {
                    window.location.href = '/login';
                }
            } catch (err) {
                console.error("Logout failed:", err);
            }
        });
    }

    // Initial Load
    fetchNotes();
});
