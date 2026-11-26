/* =========================================================
   CampusMate - script.js
   One file used by every page.

   Main idea used everywhere:
       load from localStorage -> change it -> save it -> redraw page

   Sections:
     1. Helpers (save/load, safe text, dates, toast)
     2. Settings + dark mode
     3. Header (same menu on every page)
     4. Timetable
     5. Assignments
     6. Goals
     7. Notes
     8. Dashboard
     9. Settings page + backup (export / import)
   ========================================================= */


/* =========================================================
   1. HELPERS
   ========================================================= */

// localStorage only stores text, so we convert text <-> JavaScript data
function loadData(key, fallback) {
    let saved = localStorage.getItem(key);
    if (saved === null) {
        return fallback;
    }
    try {
        return JSON.parse(saved);
    } catch (e) {
        return fallback;
    }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Makes user text safe before putting it in the page (stops HTML injection)
function safe(text) {
    let div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Today at midnight (so we can compare dates by whole days)
function todayStart() {
    let d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
}

// How many days until a date like "2026-12-01" (negative = in the past)
function daysUntil(dateString) {
    let due = new Date(dateString + "T00:00:00");
    return Math.round((due - todayStart()) / (1000 * 60 * 60 * 24));
}

function dueText(dateString) {
    let days = daysUntil(dateString);
    if (days < 0) return "Overdue by " + (-days) + (days === -1 ? " day" : " days");
    if (days === 0) return "Due Today";
    if (days === 1) return "Due Tomorrow";
    return "Due in " + days + " days";
}

// "13:30" -> "1:30 PM"
function formatTime(time24) {
    let parts = time24.split(":");
    let hour = Number(parts[0]);
    let suffix = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    return hour + ":" + parts[1] + " " + suffix;
}

// Small message that appears at the bottom, e.g. "Assignment added"
function showToast(message) {
    let toast = document.getElementById("toast");
    if (toast === null) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(function () { toast.classList.remove("show"); }, 2000);
}


// Shows a red message inside a form instead of an alert() popup.
// The container must hold an element with class "form-error".
function showError(containerId, message) {
    let box = document.querySelector("#" + containerId + " .form-error");
    box.textContent = message;
    box.style.display = "block";
}

function clearError(containerId) {
    let box = document.querySelector("#" + containerId + " .form-error");
    if (box) { box.style.display = "none"; }
}

// Date for an <input type="date">, e.g. dateInputValue(1) = tomorrow
function dateInputValue(daysFromNow) {
    let d = todayStart();
    d.setDate(d.getDate() + daysFromNow);
    let month = String(d.getMonth() + 1).padStart(2, "0");
    let day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + month + "-" + day;
}


/* =========================================================
   2. SETTINGS + DARK MODE
   ========================================================= */

function getSettings() {
    return loadData("settings", { name: "Janhavi", theme: "light" });
}

function applyTheme() {
    document.documentElement.setAttribute("data-theme", getSettings().theme);
}

function toggleTheme() {
    let settings = getSettings();
    settings.theme = (settings.theme === "dark") ? "light" : "dark";
    saveData("settings", settings);
    applyTheme();
    document.getElementById("theme-button").textContent = (settings.theme === "dark") ? "☀️" : "🌙";
}

applyTheme(); // run as soon as the script loads


/* =========================================================
   3. HEADER (built by JavaScript so every page has the same menu)
   ========================================================= */

function renderHeader(activePage) {
    let pages = [
        ["index.html", "Dashboard", "dashboard"],
        ["timetable.html", "Timetable", "timetable"],
        ["assignments.html", "Assignments", "assignments"],
        ["notes.html", "Notes", "notes"],
        ["goals.html", "Goals", "goals"]
    ];

    let links = "";
    for (let p of pages) {
        let cls = (p[2] === activePage) ? ' class="active"' : "";
        links += `<a href="${p[0]}"${cls}>${p[1]}</a>`;
    }

    let settings = getSettings();
    let icon = (settings.theme === "dark") ? "☀️" : "🌙";
    let initial = settings.name.trim().charAt(0).toUpperCase() || "?";

    document.getElementById("header").innerHTML = `
        <div class="logo">CampusMate</div>
        <nav>${links}</nav>
        <div class="header-right">
            <button class="theme-button" id="theme-button" onclick="toggleTheme()" title="Dark / light mode" aria-label="Switch dark or light mode">${icon}</button>
            <a class="profile" href="settings.html" title="Settings">${safe(initial)}</a>
        </div>`;
}


/* =========================================================
   4. TIMETABLE
   ========================================================= */

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Starting classes, used only the very first time the app opens
const sampleClasses = [
    { id: 1, day: "Monday", time: "10:00", subject: "Web Technology", room: "Room 204" },
    { id: 2, day: "Monday", time: "12:00", subject: "Computer Programming", room: "Lab 1" },
    { id: 3, day: "Monday", time: "14:00", subject: "Discrete Mathematics", room: "Room 301" },
    { id: 4, day: "Tuesday", time: "09:00", subject: "Digital Logic", room: "Room 202" },
    { id: 5, day: "Tuesday", time: "11:00", subject: "Web Technology", room: "Lab 2" },
    { id: 6, day: "Wednesday", time: "10:00", subject: "Discrete Mathematics", room: "Room 301" },
    { id: 7, day: "Wednesday", time: "13:00", subject: "Computer Programming", room: "Lab 1" },
    { id: 8, day: "Thursday", time: "09:00", subject: "Web Technology", room: "Room 204" },
    { id: 9, day: "Thursday", time: "12:00", subject: "Digital Logic", room: "Room 202" },
    { id: 10, day: "Friday", time: "10:00", subject: "Computer Programming", room: "Lab 1" },
    { id: 11, day: "Friday", time: "14:00", subject: "Discrete Mathematics", room: "Room 301" }
];

function getClasses() {
    return loadData("classes", sampleClasses);
}

// Sorted by time, so "9:00" always comes before "10:00"
function classesOn(day) {
    return getClasses()
        .filter(function (c) { return c.day === day; })
        .sort(function (a, b) { return a.time.localeCompare(b.time); });
}

function todayName() {
    return new Date().toLocaleDateString("en-US", { weekday: "long" });
}

function addClass() {
    let day = document.getElementById("class-day").value;
    let time = document.getElementById("class-time").value;
    let subject = document.getElementById("class-subject").value.trim();
    let room = document.getElementById("class-room").value.trim();

    if (time === "" || subject === "" || room === "") {
        showError("class-form", "Please fill in the time, subject and room.");
        return;
    }

    let list = getClasses();
    list.push({ id: Date.now(), day: day, time: time, subject: subject, room: room });
    saveData("classes", list);

    document.getElementById("class-subject").value = "";
    document.getElementById("class-room").value = "";
    toggleForm("class-form", false);
    showTimetable();
    showToast("Class added");
}

function deleteClass(id) {
    if (!confirm("Remove this class?")) return;
    saveData("classes", getClasses().filter(function (c) { return c.id !== id; }));
    showTimetable();
    showToast("Class removed");
}

function showTimetable() {
    let html = "";

    for (let day of days) {
        let cards = "";
        for (let c of classesOn(day)) {
            cards += `
                <div class="class-card">
                    <button class="class-remove" onclick="deleteClass(${c.id})" title="Remove">✕</button>
                    <span class="class-time">${formatTime(c.time)}</span>
                    <h3>${safe(c.subject)}</h3>
                    <p>${safe(c.room)}</p>
                </div>`;
        }
        if (cards === "") {
            cards = `<p class="empty">No classes</p>`;
        }

        let extra = (day === todayName()) ? " today" : "";
        html += `<div class="day-column${extra}">
                    <div class="day-header">${day}</div>
                    ${cards}
                 </div>`;
    }
    document.getElementById("timetable").innerHTML = html;

    // the "Add class" form starts on today's weekday (first time only)
    let daySelect = document.getElementById("class-day");
    if (!daySelect.dataset.set && days.includes(todayName())) {
        daySelect.value = todayName();
        daySelect.dataset.set = "1";
    }
}

// Open / close any form box
function toggleForm(formId, open) {
    let form = document.getElementById(formId);
    form.classList.toggle("open", open);
    clearError(formId);

    if (open) {
        form.querySelector("input, select").focus();   // cursor goes to the first field
    }
}


/* =========================================================
   5. ASSIGNMENTS (priority, filter, search, edit)
   ========================================================= */

let editingId = null;        // null = adding new, number = editing that one
let currentFilter = "all";   // all | pending | completed | overdue
let searchText = "";

function getAssignments() {
    let list = loadData("assignments", []);
    // older saved assignments have no priority, so give them "medium"
    for (let a of list) {
        if (!a.priority) { a.priority = "medium"; }
    }
    return list;
}

function isOverdue(a) {
    return !a.done && daysUntil(a.due) < 0;
}

// Opens the form. If an id is given, fill the form with that assignment (edit mode)
function openAssignmentForm(id) {
    editingId = (id === undefined) ? null : id;

    let a = getAssignments().find(function (x) { return x.id === editingId; });
    document.getElementById("form-title").textContent = a ? "Edit Assignment" : "Add New Assignment";
    document.getElementById("save-assignment").textContent = a ? "Save Changes" : "Add Assignment";
    document.getElementById("subject").value = a ? a.subject : "";
    document.getElementById("title").value = a ? a.title : "";
    document.getElementById("due-date").value = a ? a.due : dateInputValue(1);   // default: tomorrow
    document.getElementById("priority").value = a ? a.priority : "medium";

    fillSubjects();
    toggleForm("assignment-form", true);
    document.getElementById("assignment-form").scrollIntoView({ behavior: "smooth" });
}

function closeAssignmentForm() {
    editingId = null;
    toggleForm("assignment-form", false);
}

function saveAssignment() {
    let subject = document.getElementById("subject").value.trim();
    let title = document.getElementById("title").value.trim();
    let due = document.getElementById("due-date").value;
    let priority = document.getElementById("priority").value;

    if (subject === "" || title === "" || due === "") {
        showError("assignment-form", "Please fill in the subject, title and due date.");
        return;
    }

    let list = getAssignments();

    if (editingId === null) {
        list.push({ id: Date.now(), subject: subject, title: title, due: due, priority: priority, done: false });
        showToast("Assignment added");
    } else {
        for (let a of list) {
            if (a.id === editingId) {
                a.subject = subject;
                a.title = title;
                a.due = due;
                a.priority = priority;
            }
        }
        showToast("Assignment updated");
    }

    saveData("assignments", list);
    closeAssignmentForm();
    showAssignments();
}

function toggleAssignmentData(id) {
    let list = getAssignments();
    for (let a of list) {
        if (a.id === id) {
            a.done = !a.done;
        }
    }
    saveData("assignments", list);
}

function toggleAssignment(id) {
    toggleAssignmentData(id);
    showAssignments();
}

// Subject suggestions: subjects from the timetable and from earlier assignments
function fillSubjects() {
    let subjects = [];
    for (let c of getClasses()) { subjects.push(c.subject); }
    for (let a of getAssignments()) { subjects.push(a.subject); }

    let html = "";
    for (let name of new Set(subjects)) {       // Set removes duplicates
        html += `<option value="${safe(name)}">`;
    }
    document.getElementById("subject-list").innerHTML = html;
}

function deleteAssignment(id) {
    if (!confirm("Delete this assignment?")) return;
    saveData("assignments", getAssignments().filter(function (a) { return a.id !== id; }));
    showAssignments();
    showToast("Assignment deleted");
}

function setFilter(filter) {
    currentFilter = filter;
    showAssignments();
}

function setSearch(text) {
    searchText = text.toLowerCase();
    showAssignments();
}

function showAssignments() {
    let all = getAssignments();
    let pending = all.filter(function (a) { return !a.done; }).length;
    let completed = all.length - pending;

    // 1) apply the filter button and the search box
    let list = all.filter(function (a) {
        if (currentFilter === "pending" && a.done) return false;
        if (currentFilter === "completed" && !a.done) return false;
        if (currentFilter === "overdue" && !isOverdue(a)) return false;

        let text = (a.title + " " + a.subject).toLowerCase();
        return text.includes(searchText);
    });

    // 2) pending first (earliest deadline first), completed at the bottom
    list.sort(function (a, b) {
        if (a.done !== b.done) { return a.done ? 1 : -1; }
        return a.due.localeCompare(b.due);
    });

    // 3) draw the cards
    let html = "";
    for (let a of list) {
        let overdue = isOverdue(a);
        let statusClass = a.done ? "completed" : (overdue ? "overdue" : "pending");
        let statusText = a.done ? "✔ Completed" : (overdue ? "⚠ Overdue" : "● Pending");
        let deadline = a.done ? "Done" : dueText(a.due);

        html += `
            <div class="assignment-card ${a.done ? "is-done" : ""}">
                <div class="assignment-info">
                    <span class="assignment-status ${statusClass}">${statusText}</span>
                    <span class="tag ${a.priority}">${a.priority.toUpperCase()}</span>
                    <h2>${safe(a.title)}</h2>
                    <p class="subject">${safe(a.subject)}</p>
                </div>
                <div class="assignment-actions">
                    <span class="deadline ${overdue ? "overdue" : ""}">${deadline}</span>
                    <button class="complete-button" onclick="toggleAssignment(${a.id})">${a.done ? "Undo" : "Mark Complete"}</button>
                    <button class="edit-button" onclick="openAssignmentForm(${a.id})">Edit</button>
                    <button class="delete-button" onclick="deleteAssignment(${a.id})">Delete</button>
                </div>
            </div>`;
    }

    if (list.length === 0) {
        html = (all.length === 0)
            ? `<p class="empty">No assignments yet. Click "+ Add Assignment" to start.</p>`
            : `<p class="empty">No assignments match your search or filter.</p>`;
    }

    document.getElementById("assignment-list").innerHTML = html;
    document.getElementById("pending-count").textContent = pending;
    document.getElementById("completed-count").textContent = completed;

    // highlight the active filter button
    let buttons = document.querySelectorAll(".filter-button");
    for (let b of buttons) {
        b.classList.toggle("active", b.dataset.filter === currentFilter);
    }
}


/* =========================================================
   6. GOALS
   ========================================================= */

function getGoals() {
    return loadData("goals", []);
}

function addGoal() {
    let input = document.getElementById("goal-input");
    let text = input.value.trim();
    if (text === "") {
        showError("goal-card", "Please type a goal first.");
        return;
    }

    let list = getGoals();
    list.push({ id: Date.now(), text: text, done: false });
    saveData("goals", list);

    input.value = "";
    showGoals();
    showToast("Goal added");
}

function toggleGoalData(id) {
    let list = getGoals();
    for (let g of list) {
        if (g.id === id) {
            g.done = !g.done;
        }
    }
    saveData("goals", list);
}

function toggleGoal(id) {
    toggleGoalData(id);
    showGoals();
}

function deleteGoal(id) {
    if (!confirm("Delete this goal?")) return;
    saveData("goals", getGoals().filter(function (g) { return g.id !== id; }));
    showGoals();
    showToast("Goal deleted");
}

function showGoals() {
    let list = getGoals();
    let html = "";
    let done = 0;

    for (let g of list) {
        if (g.done) { done++; }
        html += `
            <div class="goal goal-row">
                <label class="${g.done ? "goal-done" : ""}">
                    <input type="checkbox" ${g.done ? "checked" : ""} onchange="toggleGoal(${g.id})">
                    <span>${safe(g.text)}</span>
                </label>
                <button class="delete-button" onclick="deleteGoal(${g.id})">Delete</button>
            </div>`;
    }

    if (list.length === 0) {
        html = `<p class="empty">No goals yet. Add your first goal above.</p>`;
    }

    let percent = (list.length === 0) ? 0 : Math.round(done / list.length * 100);

    document.getElementById("goal-list").innerHTML = html;
    document.getElementById("goal-progress-text").textContent = done + " of " + list.length + " done (" + percent + "%)";
    document.getElementById("goal-progress-bar").style.width = percent + "%";
}


/* =========================================================
   7. NOTES (with search)
   ========================================================= */

let noteSearch = "";

function getNotes() {
    return loadData("notes", []);
}

function addNote() {
    let title = document.getElementById("note-title").value.trim();
    let text = document.getElementById("note-text").value.trim();

    if (title === "" || text === "") {
        showError("note-form", "Please write both a title and a note.");
        return;
    }

    let list = getNotes();
    list.unshift({ id: Date.now(), title: title, text: text, date: new Date().toLocaleDateString() }); // newest first
    saveData("notes", list);

    document.getElementById("note-title").value = "";
    document.getElementById("note-text").value = "";
    showNotes();
    showToast("Note saved");
}

function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    saveData("notes", getNotes().filter(function (n) { return n.id !== id; }));
    showNotes();
    showToast("Note deleted");
}

function searchNotes(text) {
    noteSearch = text.toLowerCase();
    showNotes();
}

function showNotes() {
    let all = getNotes();
    let list = all.filter(function (n) {
        return (n.title + " " + n.text).toLowerCase().includes(noteSearch);
    });

    let html = "";
    for (let n of list) {
        html += `
            <div class="note-card">
                <h3>${safe(n.title)}</h3>
                <p>${safe(n.text)}</p>
                <span class="note-date">${safe(n.date || "")}</span>
                <button class="delete-button" onclick="deleteNote(${n.id})">Delete</button>
            </div>`;
    }

    if (list.length === 0) {
        html = (all.length === 0)
            ? `<p class="empty">No notes yet. Write your first note above.</p>`
            : `<p class="empty">No notes match your search.</p>`;
    }

    document.getElementById("note-list").innerHTML = html;
}


/* =========================================================
   8. DASHBOARD
   ========================================================= */

function greeting() {
    let hour = new Date().getHours();
    if (hour < 12) return "GOOD MORNING 👋";
    if (hour < 17) return "GOOD AFTERNOON 👋";
    return "GOOD EVENING 👋";
}

// Finds the next class today and how long until it starts
function showNextClass(todayClasses) {
    let now = new Date();
    let nowMinutes = now.getHours() * 60 + now.getMinutes();
    let box = document.getElementById("next-class");

    for (let c of todayClasses) {          // already sorted by time
        let parts = c.time.split(":");
        let start = Number(parts[0]) * 60 + Number(parts[1]);

        if (start > nowMinutes) {
            let left = start - nowMinutes;
            let hours = Math.floor(left / 60);
            let mins = left % 60;
            let leftText = (hours > 0 ? hours + "h " : "") + mins + "m";

            box.innerHTML = `
                <div class="label">NEXT CLASS · in ${leftText}</div>
                <h2>${safe(c.subject)}</h2>
                <p>${formatTime(c.time)} · ${safe(c.room)}</p>`;
            return;
        }
    }

    box.innerHTML = `
        <div class="label">NEXT CLASS</div>
        <h2>No more classes today 🎉</h2>
        <p>Enjoy your free time or get ahead on assignments.</p>`;
}

function showDashboard() {
    let settings = getSettings();
    document.getElementById("greeting").textContent = greeting();
    document.getElementById("welcome-name").textContent = "Welcome back, " + settings.name + "!";

    // Today's classes + next class
    let todayClasses = classesOn(todayName());   // weekend -> empty list
    let classHtml = "";
    for (let c of todayClasses) {
        classHtml += `
            <div class="class-item">
                <div class="time">${formatTime(c.time)}</div>
                <div><h3>${safe(c.subject)}</h3><p>${safe(c.room)}</p></div>
            </div>`;
    }
    if (todayClasses.length === 0) {
        classHtml = `<p class="empty">No classes today 🎉</p>`;
    }
    document.getElementById("today-classes").innerHTML = classHtml;
    document.getElementById("classes-count").textContent = todayClasses.length;
    showNextClass(todayClasses);

    // Assignments: pending only, earliest deadline first, show 3
    let pending = getAssignments().filter(function (a) { return !a.done; });
    pending.sort(function (a, b) { return a.due.localeCompare(b.due); });

    let aHtml = "";
    for (let a of pending.slice(0, 3)) {
        let days = daysUntil(a.due);
        let urgency = (days < 0) ? " overdue" : (days <= 1 ? " soon" : "");   // red / amber / normal
        aHtml += `
            <div class="assignment">
                <div><h3>${safe(a.subject)}</h3><p>${safe(a.title)}</p></div>
                <div class="dash-actions">
                    <span class="due${urgency}">${dueText(a.due)}</span>
                    <button class="complete-button" onclick="dashCompleteAssignment(${a.id})" title="Mark complete" aria-label="Mark complete">✓</button>
                </div>
            </div>`;
    }
    if (pending.length > 3) {
        aHtml += `<a class="more-link" href="assignments.html">+ ${pending.length - 3} more</a>`;
    }
    if (pending.length === 0) {
        aHtml = (getAssignments().length === 0)
            ? `<p class="empty">Nothing here yet. <a href="assignments.html">Add your first assignment</a></p>`
            : `<p class="empty">All caught up 🎉</p>`;
    }
    document.getElementById("dash-assignments").innerHTML = aHtml;
    document.getElementById("pending-count").textContent = pending.length;

    // Overdue warning
    let overdueCount = pending.filter(isOverdue).length;
    let alertBox = document.getElementById("overdue-alert");
    if (overdueCount > 0) {
        alertBox.textContent = "⚠️ You have " + overdueCount + " overdue assignment" + (overdueCount > 1 ? "s" : "") + ". Check the Assignments page.";
        alertBox.style.display = "block";
    } else {
        alertBox.style.display = "none";
    }

    // Goals
    let goals = getGoals();
    let done = goals.filter(function (g) { return g.done; }).length;
    let percent = (goals.length === 0) ? 0 : Math.round(done / goals.length * 100);
    document.getElementById("progress-count").textContent = percent + "%";

    let gHtml = "";
    for (let g of goals) {
        gHtml += `
            <div class="goal">
                <label class="${g.done ? "goal-done" : ""}">
                    <input type="checkbox" ${g.done ? "checked" : ""} onchange="dashToggleGoal(${g.id})">
                    <span>${safe(g.text)}</span>
                </label>
            </div>`;
    }
    if (goals.length === 0) {
        gHtml = `<p class="empty">No goals yet. Type one above and press Enter.</p>`;
    }
    document.getElementById("dash-goals").innerHTML = gHtml;
}

// Finish an assignment straight from the dashboard
function dashCompleteAssignment(id) {
    toggleAssignmentData(id);
    showDashboard();
    showToast("Marked complete");
}

// Add a goal straight from the dashboard
function dashAddGoal() {
    let input = document.getElementById("dash-goal-input");
    let text = input.value.trim();
    if (text === "") { return; }

    let list = getGoals();
    list.push({ id: Date.now(), text: text, done: false });
    saveData("goals", list);

    input.value = "";
    showDashboard();
    document.getElementById("dash-goal-input").focus();
    showToast("Goal added");
}

// Tick a goal straight from the dashboard
function dashToggleGoal(id) {
    toggleGoalData(id);
    showDashboard();
}


/* =========================================================
   9. SETTINGS PAGE + BACKUP
   ========================================================= */

// Every key we keep in localStorage
const allKeys = ["settings", "classes", "assignments", "goals", "notes"];

function showSettings() {
    document.getElementById("name-input").value = getSettings().name;
}

function saveName() {
    let name = document.getElementById("name-input").value.trim();
    if (name === "") {
        showError("name-card", "Please enter your name.");
        return;
    }
    let settings = getSettings();
    settings.name = name;
    saveData("settings", settings);
    renderHeader("settings");
    showToast("Name saved");
}

// Download all data as a .json file
function exportData() {
    let backup = {};
    for (let key of allKeys) {
        backup[key] = loadData(key, null);
    }

    let blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    let link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "campusmate-backup.json";
    link.click();
    URL.revokeObjectURL(link.href);
    showToast("Backup downloaded");
}

// Read a .json backup file and put the data back
function importData(event) {
    let file = event.target.files[0];
    if (!file) return;

    let reader = new FileReader();
    reader.onload = function () {
        try {
            let backup = JSON.parse(reader.result);

            // basic check that this really is a CampusMate backup
            if (typeof backup !== "object" || backup === null) {
                throw new Error("bad file");
            }
            for (let key of allKeys) {
                if (backup[key] !== null && backup[key] !== undefined) {
                    saveData(key, backup[key]);
                }
            }
            alert("Backup restored!");
            location.reload();
        } catch (e) {
            alert("That file is not a valid CampusMate backup.");
        }
    };
    reader.readAsText(file);
    event.target.value = "";   // lets you pick the same file again
}

function resetData() {
    if (!confirm("This deletes ALL your data (classes, assignments, goals, notes). Continue?")) return;
    for (let key of allKeys) {
        localStorage.removeItem(key);
    }
    location.reload();
}


/* =========================================================
   10. KEYBOARD SHORTCUTS
   Enter = submit the form, Esc = close the form,
   Ctrl+Enter = save a note
   ========================================================= */

document.addEventListener("keydown", function (e) {
    let t = e.target;

    // Esc closes any open form
    if (e.key === "Escape") {
        for (let form of document.querySelectorAll(".form-card.open")) {
            toggleForm(form.id, false);
        }
        editingId = null;
        return;
    }

    if (e.key !== "Enter") { return; }

    // Enter inside a text/date/time box presses that form's main button
    let isTextBox = (t.tagName === "INPUT" && ["text", "date", "time"].includes(t.type));
    let isNoteBox = (t.tagName === "TEXTAREA" && e.ctrlKey);
    if (!isTextBox && !isNoteBox) { return; }

    let box = t.closest(".form-card, .note-form, .settings-card");
    if (box && box.classList.contains("note-form") && !isNoteBox) { return; }
    if (box) {
        box.querySelector(".save-button").click();
    }
});
