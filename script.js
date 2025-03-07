document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const els = {
        taskInput: document.getElementById('task-input'),
        dueDateInput: document.getElementById('due-date-input'),
        addButton: document.getElementById('add-button'),
        todoList: document.getElementById('todo-list'),
        filterBtns: document.querySelectorAll('.filter-btn'),
        totalTasks: document.getElementById('total-tasks'),
        completedTasks: document.getElementById('completed-tasks'),
        currentDate: document.getElementById('current-date'),
        currentTime: document.getElementById('current-time'),
        filterContainer: document.querySelector('.filter-container')
    };
    
    // State
    let todos = JSON.parse(localStorage.getItem('todos') || '[]');
    let history = JSON.parse(localStorage.getItem('todos_history') || '[]');
    let currentFilter = 'all';
    let showingHistory = false;
    
    // Set default due date to tomorrow noon
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);
    els.dueDateInput.value = tomorrow.toISOString().slice(0, 16);
    
    // Add history button
    const historyBtn = document.createElement('button');
    historyBtn.className = 'filter-btn';
    historyBtn.setAttribute('data-filter', 'history');
    historyBtn.textContent = 'History';
    els.filterContainer.appendChild(historyBtn);
    
    // Format date for display
    const formatDate = (date, includeTime = true) => {
        const options = {
            year: 'numeric', month: 'short', day: 'numeric',
            ...(includeTime && { hour: '2-digit', minute: '2-digit' })
        };
        return new Date(date).toLocaleString(undefined, options);
    };
    
    // Update date and time display
    const updateDateTime = () => {
        const now = new Date();
        els.currentDate.textContent = now.toLocaleDateString(undefined, 
            { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        els.currentTime.textContent = now.toLocaleTimeString(undefined, 
            { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    
    // Save data to localStorage
    const save = () => {
        localStorage.setItem('todos', JSON.stringify(todos));
        localStorage.setItem('todos_history', JSON.stringify(history.slice(-100)));
    };
    
    // Update statistics
    const updateStats = () => {
        els.totalTasks.textContent = `Total: ${todos.length}`;
        els.completedTasks.textContent = `Completed: ${todos.filter(t => t.completed).length}`;
    };
    
    // Add a new task
    const addTask = () => {
        const text = els.taskInput.value.trim();
        if (!text) return alert("Please enter a task!");
        
        const todo = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: Date.now(),
            dueDate: els.dueDateInput.value ? new Date(els.dueDateInput.value).getTime() : null
        };
        
        todos.push(todo);
        history.push({...todo, status: 'added', actionTime: Date.now()});
        
        save();
        showingHistory ? renderHistory() : renderTodos();
        updateStats();
        
        els.taskInput.value = '';
        els.taskInput.focus();
    };
    
    // Render todos based on current filter
    const renderTodos = () => {
        els.todoList.innerHTML = '';
        
        // Filter and sort todos
        let filteredTodos = todos;
        if (currentFilter === 'active') filteredTodos = todos.filter(t => !t.completed);
        if (currentFilter === 'completed') filteredTodos = todos.filter(t => t.completed);
        
        filteredTodos.sort((a, b) => {
            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return a.createdAt - b.createdAt;
        });
        
        if (filteredTodos.length === 0) {
            els.todoList.innerHTML = `<div class="empty-message">No ${currentFilter === 'all' ? '' : currentFilter} tasks found.</div>`;
            return;
        }
        
        filteredTodos.forEach(todo => {
            const now = Date.now();
            const isOverdue = todo.dueDate && todo.dueDate < now && !todo.completed;
            
            const li = document.createElement('li');
            li.className = `todo-item ${todo.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`;
            
            li.innerHTML = `
                <div class="todo-content">
                    <div class="todo-text">${todo.text}</div>
                    <div class="todo-date">
                        Created: ${formatDate(todo.createdAt)}
                        ${todo.dueDate ? `<br>Due: ${formatDate(todo.dueDate)}` : ''}
                        ${isOverdue ? '<span class="overdue-text"> (Overdue)</span>' : ''}
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="complete-btn">${todo.completed ? 'Undo' : 'Complete'}</button>
                    <button class="delete-btn">Delete</button>
                </div>
            `;
            
            li.querySelector('.complete-btn').onclick = () => toggleComplete(todo.id);
            li.querySelector('.delete-btn').onclick = () => deleteTodo(todo.id);
            
            els.todoList.appendChild(li);
        });
    };
    
    // Render history items
    const renderHistory = () => {
        els.todoList.innerHTML = '';
        
        if (history.length === 0) {
            els.todoList.innerHTML = '<div class="empty-message">No history found.</div>';
            return;
        }
        
        // Sort history by action time (newest first)
        [...history]
            .sort((a, b) => b.actionTime - a.actionTime)
            .forEach(item => {
                const li = document.createElement('li');
                li.className = `todo-item history-item ${item.status}`;
                
                // Status icons and text
                const statusInfo = {
                    added: { text: 'Added', icon: '➕' },
                    completed: { text: 'Completed', icon: '✅' },
                    uncompleted: { text: 'Marked as incomplete', icon: '🔄' },
                    deleted: { text: 'Deleted', icon: '🗑️' }
                }[item.status];
                
                li.innerHTML = `
                    <div class="todo-content">
                        <div class="history-status">${statusInfo.icon} ${statusInfo.text} on ${formatDate(item.actionTime)}</div>
                        <div class="todo-text">${item.text}</div>
                        <div class="todo-date">
                            Created: ${formatDate(item.createdAt)}
                            ${item.dueDate ? `<br>Due: ${formatDate(item.dueDate)}` : ''}
                        </div>
                    </div>
                    <div class="todo-actions">
                        ${item.status === 'deleted' ? 
                            `<button class="restore-btn">Restore</button>` : 
                            `<button class="history-info-btn">Info</button>`}
                    </div>
                `;
                
                if (item.status === 'deleted') {
                    li.querySelector('.restore-btn').onclick = () => restoreTodo(item);
                }
                
                els.todoList.appendChild(li);
            });
    };
    
    // Restore a deleted todo
    const restoreTodo = (item) => {
        const todo = {
            id: Date.now(),
            text: item.text,
            completed: item.completed,
            createdAt: item.createdAt,
            dueDate: item.dueDate
        };
        
        todos.push(todo);
        history.push({
            ...todo, 
            status: 'added', 
            actionTime: Date.now(),
            restoredFrom: item.id
        });
        
        save();
        renderHistory();
        updateStats();
    };
    
    // Toggle complete status
    const toggleComplete = (id) => {
        let completedTodo = null;
        
        todos = todos.map(todo => {
            if (todo.id === id) {
                const updated = { ...todo, completed: !todo.completed };
                completedTodo = updated;
                return updated;
            }
            return todo;
        });
        
        if (completedTodo) {
            history.push({
                ...completedTodo,
                status: completedTodo.completed ? 'completed' : 'uncompleted',
                actionTime: Date.now()
            });
        }
        
        save();
        showingHistory ? renderHistory() : renderTodos();
        updateStats();
    };
    
    // Delete a todo
    const deleteTodo = (id) => {
        const todoToDelete = todos.find(todo => todo.id === id);
        
        if (todoToDelete) {
            history.push({
                ...todoToDelete,
                status: 'deleted',
                actionTime: Date.now()
            });
            
            todos = todos.filter(todo => todo.id !== id);
            save();
            showingHistory ? renderHistory() : renderTodos();
            updateStats();
        }
    };
    
    // Event listeners
    els.addButton.onclick = addTask;
    els.taskInput.addEventListener('keypress', e => { if (e.key === 'Enter') addTask(); });
    
    els.filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            els.filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            showingHistory = false;
            renderTodos();
        });
    });
    
    historyBtn.addEventListener('click', () => {
        els.filterBtns.forEach(btn => btn.classList.remove('active'));
        historyBtn.classList.add('active');
        showingHistory = true;
        renderHistory();
    });
    
    // Initialize
    updateDateTime();
    setInterval(updateDateTime, 1000);
    renderTodos();
    updateStats();
    
    // Check for overdue tasks periodically
    setInterval(() => {
        const hasChanges = todos.some(todo => todo.dueDate && todo.dueDate < Date.now() && !todo.completed);
        if (hasChanges && !showingHistory) renderTodos();
    }, 60000);
});
