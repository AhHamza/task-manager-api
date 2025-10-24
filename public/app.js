/* ------------------ CONFIG ------------------ */
const BASE_URL = window.location.origin || 'http://localhost:3000';

/* ------------------ HELPERS ------------------ */
const $ = (sel) => document.querySelector(sel);
const qs = (sel) => Array.from(document.querySelectorAll(sel));

/* ------------------ ELEMENTS ------------------ */
const authSection = $('#auth-section');
const dashboard = $('#dashboard');
const userActions = $('#user-actions');

const authForm = $('#auth-form');
const authFields = $('#auth-fields');
const authMsg = $('#auth-msg');

const tabLogin = $('#tab-login');
const tabSignup = $('#tab-signup');

const tasksListEl = $('#tasks-list');
const newDesc = $('#new-desc');
const createBtn = $('#create-task');
const filterCompleted = $('#filter-completed');
const sortBy = $('#sort-by');

const reminderModal = $('#reminderModal');
const reminderInput = $('#reminderInput');
const saveReminder = $('#saveReminder');
const cancelReminder = $('#cancelReminder');

let isLogin = true;

/* ------------------ LOCAL STORAGE ------------------ */
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

const authHeaders = () => {
    const token = getToken();
    return token
        ? { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }
        : { 'Content-Type': 'application/json' };
};

/* ------------------ UI SWITCHING ------------------ */
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
            showAuth();
            tabLogin.click();
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
            await fetch(`${BASE_URL}/users/logout`, { method: 'POST', headers: authHeaders() });
        } catch { }
        clearAuth();
        showAuth();
    });
}

/* ------------------ AUTH FIELDS ------------------ */
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

tabLogin.addEventListener('click', () => {
    isLogin = true;
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    renderAuthFields();
});
tabSignup.addEventListener('click', () => {
    isLogin = false;
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    renderAuthFields();
});

/* ------------------ AUTH FORM SUBMIT ------------------ */
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
            await loadDashboard();
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
            await loadDashboard();
        } catch (err) {
            authMsg.textContent = 'Signup failed: ' + (err.message || '');
        }
    }
});

/* ------------------ TASKS ------------------ */
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
    if (filterCompleted.value !== 'all') q.completed = filterCompleted.value;
    if (sortBy.value) q.sortBy = sortBy.value;
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

/* ------------------ RENDER TASKS ------------------ */
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
                    <button class="iconbtn danger delete" data-id="${task._id}">Del</button>
                </div>
            </div>
            <div class="task-meta small muted">
                Created: ${new Date(task.createdAt).toLocaleString()}
                ${task.updatedAt ? `· Updated: ${new Date(task.updatedAt).toLocaleString()}` : ''}
            </div>
            <div class="task-meta small reminder">${task.reminder ? 'Reminder: ' + new Date(task.reminder).toLocaleString() : ''}</div>
        `;
        tasksListEl.appendChild(card);
    });

    qs('.complete-toggle').forEach(cb => cb.addEventListener('click', toggleComplete));
    qs('.edit').forEach(btn => btn.addEventListener('click', startEdit));
    qs('.delete').forEach(btn => btn.addEventListener('click', deleteTask));
    qs('.remind').forEach(btn => btn.addEventListener('click', setReminderPrompt));
}

function escapeHtml(text) {
    const p = document.createElement('p');
    p.textContent = text;
    return p.innerHTML;
}

/* ------------------ TASK ACTIONS ------------------ */
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
            } catch (err) {
                alert('Edit failed');
            }
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

/* ------------------ REMINDERS ------------------ */
function setReminderPrompt(e) {
    const id = e.target.dataset.id;
    reminderModal.classList.remove('hidden');

    // Remove previous listeners
    saveReminder.replaceWith(saveReminder.cloneNode(true));
    cancelReminder.replaceWith(cancelReminder.cloneNode(true));

    const newSave = document.getElementById('saveReminder');
    const newCancel = document.getElementById('cancelReminder');

    newSave.addEventListener('click', async () => {
        const dt = reminderInput.value.trim();
        if (!dt) {
            alert('Please select a valid date and time');
            return;
        }

        const payload = { reminder: new Date(dt).toISOString() };
        try {
            await fetch(`${BASE_URL}/tasks/${id}/reminder`, {
                method: 'PATCH',
                headers: authHeaders(),
                body: JSON.stringify(payload)
            });
            await loadTasks();
        } catch (err) {
            alert('Set reminder failed: ' + err.message);
        } finally {
            reminderInput.value = '';
            reminderModal.classList.add('hidden');
        }
    });

    newCancel.addEventListener('click', () => {
        reminderInput.value = '';
        reminderModal.classList.add('hidden');
    });
}

/* ------------------ NOTIFICATIONS ------------------ */
async function requestNotificationPermission() {
    if (!("Notification" in window)) return false;
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
    }
    return false;
}

async function checkReminders() {
    try {
        const res = await fetch(`${BASE_URL}/tasks?dueReminders=true`, { headers: authHeaders() });
        if (!res.ok) return;
        const tasks = await res.json();

        tasks.forEach(task => {
            new Notification(`⏰ Reminder`, { body: task.description });
        });
    } catch (err) {
        console.error('Reminder check failed', err);
    }
}

/* ------------------ INIT ------------------ */
(async function init() {
    renderAuthFields();
    renderUserActions();

    const user = getUser();
    const token = getToken();

    if (user && token) {
        await loadDashboard();

        const permissionGranted = await requestNotificationPermission();
        if (!permissionGranted) alert("Enable notifications to get reminders!");

        setInterval(checkReminders, 30_000);
    } else {
        showAuth();
    }
})();
