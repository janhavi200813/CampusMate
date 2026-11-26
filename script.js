/* =========================================================
   CampusMate - script.js
   One file used by every page.
   Data is saved in the browser using localStorage,
   so it is still there after refreshing the page.
   ========================================================= */


/* ---------- 1. Helpers: save and load data ---------- */

function loadData(key) {
    // localStorage only stores text, so we convert text -> array
    let saved = localStorage.getItem(key);
    if (saved === null) {
        return [];
    }
    return JSON.parse(saved);
}

function saveData(key, list) {
    // array -> text
    localStorage.setItem(key, JSON.stringify(list));
}

// Makes user text safe before putting it in the page (stops HTML injection)
function safe(text) {
    let div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

// Turns a date like 2026-12-01 into "Due Tomorrow", "Due in 5 days" etc.
function dueText(dateString) {
    let today = new Date();
    today.setHours(0, 0, 0, 0);

    let due = new Date(dateString + "T00:00:00");
    let days = Math.round((due - today) / (1000 * 60 * 60 * 24));

    if (days < 0) return "Overdue";
    if (days === 0) return "Due Today";
    if (days === 1) return "Due Tomorrow";
    return "Due in " + days + " days";
}


/* ---------- 2. Timetable data (used by Dashboard + Timetable) ---------- */

const timetable = {
    Monday: [
        { time: "10:00 AM", subject: "Web Technology", room: "Room 204" },
        { time: "12:00 PM", subject: "Computer Programming", room: "Lab 1" },
        { time: "2:00 PM", subject: "Discrete Mathematics", room: "Room 301" }
    ],
    Tuesday: [
        { time: "9:00 AM", subject: "Digital Logic", room: "Room 202" },
        { time: "11:00 AM", subject: "Web Technology", room: "Lab 2" }
    ],
    Wednesday: [
        { time: "10:00 AM", subject: "Discrete Mathematics", room: "Room 301" },
        { time: "1:00 PM", subject: "Computer Programming", room: "Lab 1" }
    ],
    Thursday: [
        { time: "9:00 AM", subject: "Web Technology", room: "Room 204" },
        { time: "12:00 PM", subject: "Digital Logic", room: "Room 202" }
    ],
    Friday: [
        { time: "10:00 AM", subject: "Computer Programming", room: "Lab 1" },
        { time: "2:00 PM", subject: "Discrete Mathematics", room: "Room 301" }
    ]
};

function classCard(c) {
    return `
        <div class="class-card">
            <span class="class-time">${c.time}</span>
            <h3>${c.subject}</h3>
            <p>${c.room}</p>
        </div>`;
}

// Timetable page: draw one column for each day
function showTimetable() {
    let html = "";
    let todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });

    for (let day in timetable) {
        let cards = "";
        for (let c of timetable[day]) {
            cards += classCard(c);
        }
        let extra = (day === todayName) ? " today" : "";
        html += `<div class="day-column${extra}">
                    <div class="day-header">${day}</div>
                    ${cards}
                 </div>`;
    }
    document.getElementById("timetable").innerHTML = html;
}


/* ---------- 3. Assignments ---------- */

function showForm() {
    document.getElementById("assignment-form").style.display = "block";
}

function hideForm() {
    document.getElementById("assignment-form").style.display = "none";
}

function addAssignment() {
    let subject = document.getElementById("subject").value.trim();
    let title = document.getElementById("title").value.trim();
    let dueDate = document.getElementById("due-date").value;

    if (subject === "" || title === "" || dueDate === "") {
        alert("Please fill in all the fields.");
        return;
    }

    let list = loadData("assignments");
    list.push({ id: Date.now(), subject: subject, title: title, due: dueDate, done: false });
    saveData("assignments", list);

    document.getElementById("subject").value = "";
    document.getElementById("title").value = "";
    document.getElementById("due-date").value = "";
    hideForm();
    showAssignments();
}

function toggleAssignment(id) {
    let list = loadData("assignments");
    for (let a of list) {
        if (a.id === id) {
            a.done = !a.done;
        }
    }
    saveData("assignments", list);
    showAssignments();
}

function deleteAssignment(id) {
    let list = loadData("assignments");
    list = list.filter(function (a) { return a.id !== id; });
    saveData("assignments", list);
    showAssignments();
}

function showAssignments() {
    let list = loadData("assignments");
    let html = "";
    let pending = 0;
    let completed = 0;

    // earliest deadline first
    list.sort(function (a, b) { return a.due.localeCompare(b.due); });

    for (let a of list) {
        if (a.done) { completed++; } else { pending++; }

        let statusClass = a.done ? "completed" : "pending";
        let statusText = a.done ? "✔ Completed" : "● Pending";
        let btnText = a.done ? "Undo" : "Mark Complete";
        let deadline = a.done ? "Done" : dueText(a.due);

        html += `
            <div class="assignment-card ${a.done ? "is-done" : ""}">
                <div class="assignment-info">
                    <span class="assignment-status ${statusClass}">${statusText}</span>
                    <h2>${safe(a.title)}</h2>
                    <p class="subject">${safe(a.subject)}</p>
                </div>
                <div class="assignment-actions">
                    <span class="deadline">${deadline}</span>
                    <button class="complete-button" onclick="toggleAssignment(${a.id})">${btnText}</button>
                    <button class="delete-button" onclick="deleteAssignment(${a.id})">Delete</button>
                </div>
            </div>`;
    }

    if (list.length === 0) {
        html = `<p class="empty">No assignments yet. Click "+ Add Assignment" to start.</p>`;
    }

    document.getElementById("assignment-list").innerHTML = html;
    document.getElementById("pending-count").textContent = pending;
    document.getElementById("completed-count").textContent = completed;
}


/* ---------- 4. Goals ---------- */

function addGoal() {
    let input = document.getElementById("goal-input");
    let text = input.value.trim();
    if (text === "") {
        alert("Please type a goal.");
        return;
    }

    let list = loadData("goals");
    list.push({ id: Date.now(), text: text, done: false });
    saveData("goals", list);

    input.value = "";
    showGoals();
}

function toggleGoal(id) {
    toggleGoalData(id);
    showGoals();
}

function deleteGoal(id) {
    let list = loadData("goals");
    list = list.filter(function (g) { return g.id !== id; });
    saveData("goals", list);
    showGoals();
}

function showGoals() {
    let list = loadData("goals");
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


/* ---------- 5. Notes ---------- */

function addNote() {
    let title = document.getElementById("note-title").value.trim();
    let text = document.getElementById("note-text").value.trim();

    if (title === "" || text === "") {
        alert("Please write a title and a note.");
        return;
    }

    let list = loadData("notes");
    list.unshift({ id: Date.now(), title: title, text: text }); // newest first
    saveData("notes", list);

    document.getElementById("note-title").value = "";
    document.getElementById("note-text").value = "";
    showNotes();
}

function deleteNote(id) {
    let list = loadData("notes");
    list = list.filter(function (n) { return n.id !== id; });
    saveData("notes", list);
    showNotes();
}

function showNotes() {
    let list = loadData("notes");
    let html = "";

    for (let n of list) {
        html += `
            <div class="note-card">
                <h3>${safe(n.title)}</h3>
                <p>${safe(n.text)}</p>
                <button class="delete-button" onclick="deleteNote(${n.id})">Delete</button>
            </div>`;
    }

    if (list.length === 0) {
        html = `<p class="empty">No notes yet. Write your first note above.</p>`;
    }

    document.getElementById("note-list").innerHTML = html;
}


/* ---------- 6. Dashboard (reads everything saved above) ---------- */

function showDashboard() {
    // Today's classes
    let todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
    let todayClasses = timetable[todayName] || [];   // weekend -> no classes
    let classHtml = "";
    for (let c of todayClasses) {
        classHtml += `
            <div class="class-item">
                <div class="time">${c.time}</div>
                <div><h3>${c.subject}</h3><p>${c.room}</p></div>
            </div>`;
    }
    if (todayClasses.length === 0) {
        classHtml = `<p class="empty">No classes today 🎉</p>`;
    }
    document.getElementById("today-classes").innerHTML = classHtml;
    document.getElementById("classes-count").textContent = todayClasses.length;

    // Assignments (only pending ones, earliest deadline first, show 3)
    let assignments = loadData("assignments").filter(function (a) { return !a.done; });
    assignments.sort(function (a, b) { return a.due.localeCompare(b.due); });

    let aHtml = "";
    for (let a of assignments.slice(0, 3)) {
        aHtml += `
            <div class="assignment">
                <div><h3>${safe(a.subject)}</h3><p>${safe(a.title)}</p></div>
                <span class="due">${dueText(a.due)}</span>
            </div>`;
    }
    if (assignments.length === 0) {
        aHtml = `<p class="empty">No pending assignments 🎉</p>`;
    }
    document.getElementById("dash-assignments").innerHTML = aHtml;
    document.getElementById("pending-count").textContent = assignments.length;

    // Goals
    let goals = loadData("goals");
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
        gHtml = `<p class="empty">No goals yet. Add some on the Goals page.</p>`;
    }
    document.getElementById("dash-goals").innerHTML = gHtml;
}

// Tick a goal straight from the dashboard
function dashToggleGoal(id) {
    toggleGoalData(id);
    showDashboard();
}

function toggleGoalData(id) {
    let list = loadData("goals");
    for (let g of list) {
        if (g.id === id) {
            g.done = !g.done;
        }
    }
    saveData("goals", list);
}
