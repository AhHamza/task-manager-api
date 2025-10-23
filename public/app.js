/* Simple frontend to interact with the Express API
   Usage: configure BASE_URL if API is served on another origin.
*/

const BASE_URL = window.location.origin || 'http://localhost:3000'; // change if needed

// helpers
const $ = (sel) => document.querySelector(sel);
const qs = (sel) => Array.from(document.querySelectorAll(sel));

const authSection = $('#auth-section');
const dashboard = $('#dashboard');
const userActions = $('#user-actions');

const authForm = $('#auth-form');
const authFields = $('#auth-fields');
const authMsg = $('#auth-msg');

const tabLogin = $('#tab-login');
const tabSignup = $('#tab-signup');

let isLogin = true;

// store token & user in localStorage
const setAuth = (token, user) => {
    localStorage.setItem('tm_token', token);
    localStorage.setItem('tm_user', JSON.stringify(user));
    renderUserActions();
};
const clearAuth = () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_user');
    renderUserActions();
};
const getToken = () => localStorage.getItem('tm_token');
const getUser = () => JSON.parse(localStorage.getItem('tm_user') || 'null');

function authHeaders() {
    const token = getToken();
    return token
        ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
}

// UI switching
function showAuth() {
    authSection.classList.remove('hidden');
    dashboard.classList.add('hidden');
}
function showDashboard() {
    authSection.classList.add('hidden');
    dashboard.classList.remove('hidden');
}

function renderUserActions() {
    const user = getUser();
    userActions.innerHTML = '';
    if (!user) {
        userActions.innerHTML = `<button id="show-login" class="btn">Login</button>`;
        $('#show-login').addEventListener('click', () => {
            showAuth(); tabLogin.click();
        });
        return;
    }
    const el = document.createElement('div');
    el.innerHTML = `
    <span class="small muted">Hello, ${user.name}</span>
    <button id="btn-logout" class="btn">Logout</button>
  `;
    userActions.appendChild(el);
    $('#btn-logout').addEventListener('click', async () => {
        try {
            await fetch(`${BASE_URL}/users/logout`, {
                method: 'POST',
                headers: authHeaders()
            });
        } catch (e) { /* ignore */ }
        clearAuth();
        showAuth();
    });
}

// auth form fields render
function renderAuthFields() {
    if (isLogin) {
        authFields.innerHTML = `
      <input id="email" type="email" placeholder="Email" required />
      <input id="password" type="password" placeholder="Password" required />
    `;
    } else {
        authFields.innerHTML = `
      <input id="name" placeholder="Name" required />
      <input id="email" type="email" placeholder="Email" required />
      <input id="password" type="password" placeholder="Password" required />
    `;
    }
}

tabLogin.addEventListener('click', () => { isLogin = true; tabLogin.classList.add('active'); tabSignup.classList.remove('active'); renderAuthFields(); });
tabSignup.addEventListener('click', () => { isLogin = false; tabSignup.classList.add('active'); tabLogin.classList.remove('active'); renderAuthFields(); });

// handle auth submit
authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    authMsg.textContent = '';
    if (isLogin) {
        const email = $('#email').value.trim();
        const password = $('#password').value.trim();
        try {
            const res = await fetch(`${BASE_URL}/users/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            if (!res.ok) throw new Error('Login failed');
            const data = await res.json();
            setAuth(data.token, data.user);
            authMsg.textContent = 'Login success';
            loadDashboard();
        } catch (err) {
            authMsg.textContent = 'Login failed: ' + (err.message || '');
        }
    } else {
        const name = $('#name').value.trim();
        const email = $('#email').value.trim();
        const password = $('#password').value.trim();
        try {
            const res = await fetch(`${BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                throw new Error(body.error || 'Signup failed');
            }
            const body = await res.json();
            setAuth(body.token, body.user);
            authMsg.textContent = 'Signup success';
            loadDashboard();
        } catch (err) {
            authMsg.textContent = 'Signup failed: ' + (err.message || '');
        }
    }
});

// Dashboard logic
const tasksListEl = $('#tasks-list');
const newDesc = $('#new-desc');
const createBtn = $('#create-task');
const filterCompleted = $('#filter-completed');
const sortBy = $('#sort-by');

createBtn.addEventListener('click', createTask);
filterCompleted.addEventListener('change', loadTasks);
sortBy.addEventListener('change', loadTasks);

async function createTask() {
    const description = newDesc.value.trim();
    if (!description) return;
    try {
        const res = await fetch(`${BASE_URL}/tasks`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ description })
        });
        if (!res.ok) throw new Error('Failed to create');
        newDesc.value = '';
        await loadTasks();
    } catch (e) {
        alert('Create failed: ' + e.message);
    }
}

async function loadDashboard() {
    renderUserActions();
    showDashboard();
    await loadTasks();
}

function getQueryParams() {
    const q = {};
    const fc = filterCompleted.value;
    if (fc !== 'all') q.completed = fc;
    const s = sortBy.value;
    if (s) q.sortBy = s;
    // can add pagination: limit, skip
    return new URLSearchParams(q).toString();
}

async function loadTasks() {
    tasksListEl.innerHTML = '<div class="card muted">Loading...</div>';
    try {
        const q = getQueryParams();
        const res = await fetch(`${BASE_URL}/tasks${q ? '?' + q : ''}`, { headers: authHeaders() });
        if (!res.ok) {
            if (res.status === 401) { clearAuth(); showAuth(); return; }
            throw new Error('Failed to fetch tasks');
        }
        const tasks = await res.json();
        renderTasks(tasks);
    } catch (err) {
        tasksListEl.innerHTML = `<div class="card muted">Error loading tasks: ${err.message}</div>`;
    }
}

function renderTasks(tasks) {
    if (!tasks || tasks.length === 0) {
        tasksListEl.innerHTML = '<div class="card muted">No tasks yet — add one above.</div>';
        return;
    }
    tasksListEl.innerHTML = '';
    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card card';
        card.innerHTML = `
      <div class="task-top">
        <div>
          <input type="checkbox" ${task.completed ? 'checked' : ''} data-id="${task._id}" class="complete-toggle" />
          <span class="task-desc" id="desc-${task._id}">${escapeHtml(task.description)}</span>
        </div>
        <div class="task-actions">
          <button class="iconbtn edit" data-id="${task._id}">Edit</button>
          <button class="iconbtn remind" data-id="${task._id}">Reminder</button>
          <button class="iconbtn warn delete" data-id="${task._1d}">Delete</button>
          <button class="iconbtn danger delete" data-id="${task._id}">Del</button>
        </div>
      </div>
      <div class="task-meta small muted">
        Created: ${new Date(task.createdAt).toLocaleString()} ${task.updatedAt ? `· Updated: ${new Date(task.updatedAt).toLocaleString()}` : ''}
      </div>
      <div class="task-meta small reminder">${task.reminder ? 'Reminder: ' + new Date(task.reminder).toLocaleString() : ''}</div>
    `;
        tasksListEl.appendChild(card);
    });

    // Attach handlers
    qs('.complete-toggle').forEach(cb => cb.addEventListener('click', toggleComplete));
    qs('.edit').forEach(btn => btn.addEventListener('click', startEdit));
    qs('.delete').forEach(btn => btn.addEventListener('click', deleteTask));
    qs('.remind').forEach(btn => btn.addEventListener('click', setReminderPrompt));
}

// small escape
function escapeHtml(text) {
    const p = document.createElement('p');
    p.textContent = text;
    return p.innerHTML;
}

async function toggleComplete(e) {
    const id = e.target.dataset.id;
    const checked = e.target.checked;
    try {
        await fetch(`${BASE_URL}/tasks/${id}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ completed: checked })
        });
        await loadTasks();
    } catch (err) {
        alert('Update failed');
    }
}

function startEdit(e) {
    const id = e.target.dataset.id;
    const descEl = $(`#desc-${id}`);
    const current = descEl.textContent;
    const input = document.createElement('input');
    input.value = current;
    input.style.width = '100%';
    descEl.replaceWith(input);
    input.focus();
    input.addEventListener('blur', async () => {
        const val = input.value.trim();
        if (val && val !== current) {
            try {
                await fetch(`${BASE_URL}/tasks/${id}`, {
                    method: 'PATCH',
                    headers: authHeaders(),
                    body: JSON.stringify({ description: val })
                });
            } catch (err) { alert('Edit failed'); }
        }
        await loadTasks();
    });
}

async function deleteTask(e) {
    const id = e.target.dataset.id;
    if (!confirm('Delete this task?')) return;
    try {
        const res = await fetch(`${BASE_URL}/tasks/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (!res.ok) throw new Error('Delete failed');
        await loadTasks();
    } catch (err) {
        alert('Delete failed: ' + err.message);
    }
}
function setReminderPrompt(e) {
    const id = e.target.dataset.id;
    const modal = document.getElementById('reminderModal');
    const input = document.getElementById('reminderInput');
    const saveBtn = document.getElementById('saveReminder');
    const cancelBtn = document.getElementById('cancelReminder');

    modal.classList.remove('hidden');

    saveBtn.onclick = async () => {
        const dt = input.value.trim();
        const payload = dt ? { reminder: new Date(dt).toISOString() } : { reminder: null };
        try {
            await fetch(`${BASE_URL}/tasks/${id}/reminder`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });
            await loadTasks();
        } catch (err) {
            alert('Set reminder failed: ' + err.message);
        }
        input.value = '';
        modal.classList.add('hidden');
    };

    cancelBtn.onclick = () => {
        input.value = '';
        modal.classList.add('hidden');
    };
}

const socket = io(BASE_URL);
socket.on('reminder', task => {
    alert(`Reminder: ${task.description}`);
});

// Register the current logged-in user
const user = JSON.parse(localStorage.getItem('tm_user'));
if (user) {
    socket.emit('register', user._id);
}

// Listen for reminders
socket.on('reminder', (task) => {
    alert(`⏰ Reminder: ${task.description}`);
});

function connectSocket(userId) {
    const socket = io('http://localhost:3000'); // your server URL
    socket.emit('register', userId); // register this user for reminders

    socket.on('reminder', (task) => {
        alert(`⏰ Reminder: ${task.description}`);
    });
}


// on load
(function init() {
    renderAuthFields();
    renderUserActions();

    const user = getUser();  // reads from localStorage
    const token = getToken(); // reads from localStorage

    if (user && token) {
        loadDashboard(); // restore dashboard
        connectSocket(user._id); // connect to Socket.io for real-time reminders

    } else {
        showAuth();
    }
})();
