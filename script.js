/**
 * Daily Todo Manager - Frontend Logic
 * Supports Express/PostgreSQL backend with graceful LocalStorage fallback.
 */

let currentTodos = [];
let currentTaskId = null;
let activeFilter = 'all';
let searchQuery = '';
let isOnlineAPI = true;
const API_BASE = '/api';

// DOM Elements
const selectedDateInput = document.getElementById('selectedDate');
const dateDisplayLabel = document.getElementById('dateDisplayLabel');
const prevDateBtn = document.getElementById('prevDateBtn');
const nextDateBtn = document.getElementById('nextDateBtn');
const todayBtn = document.getElementById('todayBtn');
const themeToggle = document.getElementById('themeToggle');
const todoInput = document.getElementById('todoInput');
const todoList = document.getElementById('todoList');
const searchInput = document.getElementById('searchInput');

// Stat Elements
const totalTasksEl = document.getElementById('totalTasks');
const completedTasksEl = document.getElementById('completedTasks');
const pendingTasksEl = document.getElementById('pendingTasks');
const progressPercentageText = document.getElementById('progressPercentageText');
const progressSubtitle = document.getElementById('progressSubtitle');
const progressBarFill = document.getElementById('progressBarFill');

// Filter Tab Counters
const filterAllCount = document.getElementById('filterAllCount');
const filterPendingCount = document.getElementById('filterPendingCount');
const filterCompletedCount = document.getElementById('filterCompletedCount');

// Modal Elements
const completionModal = document.getElementById('completionModal');
const taskTitleEl = document.getElementById('taskTitle');
const completionPercentageInput = document.getElementById('completionPercentage');
const completionRangeInput = document.getElementById('completionRange');
const percentageBadge = document.getElementById('percentageBadge');
const reasonSection = document.getElementById('reasonSection');
const incompleteReasonInput = document.getElementById('incompleteReason');
const presetBtns = document.querySelectorAll('.preset-btn');

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initDate();
    initEventListeners();
    loadTodos();
});

/* Theme Manager */
function initTheme() {
    const savedTheme = localStorage.getItem('todo_theme') || 'theme-dark';
    document.body.className = savedTheme;
}

function toggleTheme() {
    const isDark = document.body.classList.contains('theme-dark');
    const newTheme = isDark ? 'theme-light' : 'theme-dark';
    document.body.className = newTheme;
    localStorage.setItem('todo_theme', newTheme);
    showToast(isDark ? 'Switched to Light mode' : 'Switched to Dark mode');
}

/* Date Helpers & Navigation */
function initDate() {
    const today = getTodayFormatted();
    selectedDateInput.value = today;
    updateDateDisplayLabel(today);
}

function getTodayFormatted() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getCurrentDate() {
    return selectedDateInput.value || getTodayFormatted();
}

function updateDateDisplayLabel(dateStr) {
    if (!dateStr) return;
    const today = getTodayFormatted();
    const selectedDate = new Date(dateStr + 'T00:00:00');
    const todayDate = new Date(today + 'T00:00:00');
    
    const diffTime = selectedDate.getTime() - todayDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 0) {
        dateDisplayLabel.textContent = 'Today';
    } else if (diffDays === -1) {
        dateDisplayLabel.textContent = 'Yesterday';
    } else if (diffDays === 1) {
        dateDisplayLabel.textContent = 'Tomorrow';
    } else {
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        dateDisplayLabel.textContent = selectedDate.toLocaleDateString('en-US', options);
    }
}

function changeDateByDays(days) {
    const current = new Date(getCurrentDate() + 'T00:00:00');
    current.setDate(current.getDate() + days);
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    const newDateStr = `${year}-${month}-${day}`;
    
    selectedDateInput.value = newDateStr;
    updateDateDisplayLabel(newDateStr);
    loadTodos();
}

/* Event Listeners */
function initEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);

    selectedDateInput.addEventListener('change', (e) => {
        updateDateDisplayLabel(e.target.value);
        loadTodos();
    });

    prevDateBtn.addEventListener('click', () => changeDateByDays(-1));
    nextDateBtn.addEventListener('click', () => changeDateByDays(1));
    todayBtn.addEventListener('click', () => {
        const today = getTodayFormatted();
        selectedDateInput.value = today;
        updateDateDisplayLabel(today);
        loadTodos();
    });

    // Search filter
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        renderTodos();
    });

    // Filter Tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.filter-tab').forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            activeFilter = tab.dataset.filter;
            renderTodos();
        });
    });

    // Percentage Sync (Slider <-> Number Input <-> Presets)
    completionRangeInput.addEventListener('input', (e) => {
        setCompletionPercentage(parseInt(e.target.value) || 0);
    });

    completionPercentageInput.addEventListener('input', (e) => {
        setCompletionPercentage(parseInt(e.target.value) || 0);
    });

    presetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = parseInt(btn.dataset.value);
            setCompletionPercentage(val);
        });
    });

    // Close modal on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && completionModal.classList.contains('active')) {
            closeModal();
        }
    });
}

function setCompletionPercentage(val) {
    val = Math.max(0, Math.min(100, val));
    completionPercentageInput.value = val;
    completionRangeInput.value = val;
    percentageBadge.textContent = `${val}%`;

    // Highlight matching preset
    presetBtns.forEach(btn => {
        if (parseInt(btn.dataset.value) === val) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Show/hide incomplete reason box
    if (val < 100) {
        reasonSection.style.display = 'block';
        incompleteReasonInput.required = true;
    } else {
        reasonSection.style.display = 'none';
        incompleteReasonInput.required = false;
        incompleteReasonInput.value = '';
    }
}

/* API Calls with Fallback */
async function loadTodos() {
    const dateStr = getCurrentDate();
    try {
        const res = await fetch(`${API_BASE}/todos/${dateStr}`);
        if (!res.ok) throw new Error('API server returned error');
        const data = await res.json();

        if (data && data.offline) {
            isOnlineAPI = false;
            const localData = localStorage.getItem(`todos_${dateStr}`);
            currentTodos = localData ? JSON.parse(localData) : [];
        } else if (Array.isArray(data)) {
            isOnlineAPI = true;
            currentTodos = data;
        } else {
            isOnlineAPI = false;
            const localData = localStorage.getItem(`todos_${dateStr}`);
            currentTodos = localData ? JSON.parse(localData) : [];
        }
    } catch (err) {
        // Fallback to localStorage
        isOnlineAPI = false;
        const localData = localStorage.getItem(`todos_${dateStr}`);
        currentTodos = localData ? JSON.parse(localData) : [];
    }

    renderTodos();
    updateStats();
}

function saveLocalStorageTodos() {
    const dateStr = getCurrentDate();
    localStorage.setItem(`todos_${dateStr}`, JSON.stringify(currentTodos));
}

async function addTodo() {
    const text = todoInput.value.trim();
    const dateStr = getCurrentDate();

    if (!text) {
        showToast('Please enter a task title', 'warning');
        return;
    }

    try {
        if (isOnlineAPI) {
            const res = await fetch(`${API_BASE}/todos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text, date: dateStr })
            });
            if (!res.ok) throw new Error('Failed to create task on backend');
        } else {
            const newTodo = {
                id: Date.now(),
                text,
                date: dateStr,
                completed: false,
                completion_percentage: 0,
                reason: null,
                created_at: new Date().toISOString(),
                completed_at: null
            };
            currentTodos.push(newTodo);
            saveLocalStorageTodos();
        }

        todoInput.value = '';
        showToast('Task added successfully', 'success');
        await loadTodos();
    } catch (err) {
        // Fallback mode if API fails on action
        const newTodo = {
            id: Date.now(),
            text,
            date: dateStr,
            completed: false,
            completion_percentage: 0,
            reason: null,
            created_at: new Date().toISOString(),
            completed_at: null
        };
        currentTodos.push(newTodo);
        saveLocalStorageTodos();
        todoInput.value = '';
        showToast('Task saved locally', 'info');
        renderTodos();
        updateStats();
    }
}

async function deleteTodo(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        if (isOnlineAPI) {
            const res = await fetch(`${API_BASE}/todos/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete on server');
        }
        
        currentTodos = currentTodos.filter(t => t.id !== id);
        saveLocalStorageTodos();
        showToast('Task deleted', 'info');
        await loadTodos();
    } catch (err) {
        currentTodos = currentTodos.filter(t => t.id !== id);
        saveLocalStorageTodos();
        showToast('Task deleted', 'info');
        renderTodos();
        updateStats();
    }
}

/* Modal Review Handlers */
function markComplete(id) {
    const todo = currentTodos.find(t => t.id === id);
    if (!todo) return;

    currentTaskId = id;
    taskTitleEl.textContent = `"${todo.text}"`;
    setCompletionPercentage(todo.completion_percentage || 100);
    incompleteReasonInput.value = todo.reason || '';

    completionModal.classList.add('active');
}

function closeModal() {
    completionModal.classList.remove('active');
    currentTaskId = null;
}

async function submitCompletion() {
    const percentage = parseInt(completionPercentageInput.value);
    const reason = incompleteReasonInput.value.trim();

    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
        showToast('Please enter a valid percentage (0 - 100)', 'warning');
        return;
    }

    if (percentage < 100 && !reason) {
        showToast('Please provide a reason why task is incomplete', 'warning');
        incompleteReasonInput.focus();
        return;
    }

    try {
        if (isOnlineAPI) {
            const res = await fetch(`${API_BASE}/todos/${currentTaskId}/complete`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completionPercentage: percentage, reason })
            });
            if (!res.ok) throw new Error('Failed to update task on server');
        }
        
        // Update local object
        const todo = currentTodos.find(t => t.id === currentTaskId);
        if (todo) {
            todo.completed = true;
            todo.completion_percentage = percentage;
            todo.reason = percentage < 100 ? reason : null;
            todo.completed_at = new Date().toISOString();
        }
        saveLocalStorageTodos();

        closeModal();
        showToast(percentage === 100 ? 'Awesome! 100% Completed' : 'Progress saved', 'success');
        await loadTodos();
    } catch (err) {
        const todo = currentTodos.find(t => t.id === currentTaskId);
        if (todo) {
            todo.completed = true;
            todo.completion_percentage = percentage;
            todo.reason = percentage < 100 ? reason : null;
            todo.completed_at = new Date().toISOString();
        }
        saveLocalStorageTodos();
        closeModal();
        showToast('Review saved locally', 'info');
        renderTodos();
        updateStats();
    }
}

/* Rendering */
function renderTodos() {
    let filtered = currentTodos;

    // Filter tab criteria
    if (activeFilter === 'pending') {
        filtered = filtered.filter(t => !t.completed);
    } else if (activeFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Search query criteria
    if (searchQuery) {
        filtered = filtered.filter(t => t.text.toLowerCase().includes(searchQuery));
    }

    // Tab counts
    filterAllCount.textContent = currentTodos.length;
    filterPendingCount.textContent = currentTodos.filter(t => !t.completed).length;
    filterCompletedCount.textContent = currentTodos.filter(t => t.completed).length;

    todoList.innerHTML = '';

    if (filtered.length === 0) {
        const template = document.getElementById('emptyStateTemplate');
        const emptyNode = template.content.cloneNode(true);
        todoList.appendChild(emptyNode);
        return;
    }

    filtered.forEach(todo => {
        const item = document.createElement('div');
        const isCompleted = todo.completed;
        const isFull100 = isCompleted && (todo.completion_percentage === 100);
        
        item.className = `todo-item p-3.5 sm:p-5 rounded-xl md:rounded-2xl flex flex-col gap-2.5 transition-all bg-bg-card-solid border border-border-color shadow-sm relative overflow-hidden ${isCompleted ? (isFull100 ? 'completed' : 'incomplete-completed') : ''}`;

        let statusDetails = '';
        if (isCompleted) {
            const dateStr = todo.completed_at ? new Date(todo.completed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
            statusDetails = `
                <div class="todo-status-badge mt-2 pt-2.5 border-t border-border-color flex items-center gap-2 flex-wrap text-xs">
                    <span class="pct-tag px-2 py-0.5 rounded-md font-bold ${isFull100 ? 'pct-100 bg-success-bg text-success' : 'pct-partial bg-warning-bg text-warning'}">
                        ${todo.completion_percentage}% Completed
                    </span>
                    ${todo.reason ? `<span class="reason-tag text-warning italic break-all">Reason: "${escapeHtml(todo.reason)}"</span>` : ''}
                    ${dateStr ? `<span class="time-tag text-text-dim">Completed at ${dateStr}</span>` : ''}
                </div>
            `;
        }

        item.innerHTML = `
            <div class="todo-main-row flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 w-full">
                <div class="todo-text-group flex items-center gap-3 flex-1 w-full sm:w-auto">
                    <div class="checkbox-wrapper min-w-[44px] min-h-[44px] flex items-center justify-center flex-shrink-0">
                        <button class="checkbox-btn ${isCompleted ? 'checked bg-success border-success text-white' : 'bg-transparent border-2 border-text-dim text-transparent'} w-6 h-6 rounded-md cursor-pointer flex items-center justify-center transition-all" onclick="markComplete(${todo.id})" title="${isCompleted ? 'Re-review progress' : 'Mark as complete'}" aria-label="Toggle completion status">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                        </button>
                    </div>
                    <span class="todo-title text-sm sm:text-base font-semibold text-text-main leading-snug break-words flex-1 ${isCompleted ? 'strikethrough line-through text-text-muted' : ''}">${escapeHtml(todo.text)}</span>
                </div>

                <div class="todo-actions flex items-center justify-end gap-2 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-border-color flex-shrink-0">
                    ${!isCompleted ? `
                        <button class="action-btn complete-btn min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center gap-1.5 cursor-pointer transition-all bg-success-bg text-success border border-success-border hover:bg-success hover:text-white" onclick="markComplete(${todo.id})">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                            <span>Review</span>
                        </button>
                    ` : `
                        <button class="action-btn edit-btn min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all bg-bg-input text-text-muted hover:bg-bg-hover hover:text-text-main" onclick="markComplete(${todo.id})" title="Edit Review">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                    `}
                    <button class="action-btn delete-btn min-h-[44px] min-w-[44px] px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all bg-bg-input text-text-muted hover:bg-danger/15 hover:text-danger" onclick="deleteTodo(${todo.id})" title="Delete Task">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </div>
            </div>
            ${statusDetails}
        `;

        todoList.appendChild(item);
    });
}

function updateStats() {
    const total = currentTodos.length;
    const completed = currentTodos.filter(t => t.completed).length;
    const pending = total - completed;

    totalTasksEl.textContent = total;
    completedTasksEl.textContent = completed;
    pendingTasksEl.textContent = pending;

    // Progress Bar Calculation
    let avgProgress = 0;
    if (total > 0) {
        const sumPercentage = currentTodos.reduce((acc, t) => acc + (t.completed ? (t.completion_percentage || 0) : 0), 0);
        avgProgress = Math.round(sumPercentage / total);
    }

    progressPercentageText.textContent = `${avgProgress}%`;
    progressBarFill.style.width = `${avgProgress}%`;

    if (total === 0) {
        progressSubtitle.textContent = 'No tasks recorded for this day.';
    } else if (avgProgress === 100) {
        progressSubtitle.textContent = 'Incredible job! 100% of your daily goals achieved.';
    } else if (avgProgress >= 50) {
        progressSubtitle.textContent = `Great progress! ${completed} of ${total} tasks completed (${avgProgress}% score).`;
    } else {
        progressSubtitle.textContent = `Keep pushing! ${pending} tasks pending review tonight.`;
    }
}

/* Helpers */
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, function(m) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        }[m];
    });
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Bind functions to window object for inline HTML event handlers
window.addTodo = addTodo;
window.markComplete = markComplete;
window.deleteTodo = deleteTodo;
window.closeModal = closeModal;
window.submitCompletion = submitCompletion;
window.toggleTheme = toggleTheme;

