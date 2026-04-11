let currentMode = 'group';
let currentGroupId = null;
let currentTeacherName = null;
let currentWeek = null;
let selectedWeek = null;
let currentDayIndex = 0;
let currentScheduleData = null;

const groupMode = document.getElementById('groupMode');
const teacherMode = document.getElementById('teacherMode');
const groupSelect = document.getElementById('groupSelect');
const teacherInput = document.getElementById('teacherInput');
const teacherSelect = document.getElementById('teacherSelect');
const weekNumberSpan = document.getElementById('weekNumber');
const prevWeekBtn = document.getElementById('prevWeek');
const nextWeekBtn = document.getElementById('nextWeek');
const currentWeekBtn = document.getElementById('currentWeekBtn');
const loader = document.getElementById('loader');
const errorDiv = document.getElementById('error');
const scheduleDiv = document.getElementById('schedule');

const DAYS_ORDER = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

let isMobile = window.innerWidth <= 768;

window.addEventListener('resize', () => {
    isMobile = window.innerWidth <= 768;
    if (currentScheduleData) {
        if (isMobile) {
            renderMobileSchedule(currentScheduleData);
        } else {
            renderDesktopSchedule(currentScheduleData);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadGroups();
    loadCurrentWeek();
});

// Настройка всех обработчиков событий
function setupEventListeners() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            switchMode(mode);
        });
    });

    groupSelect.addEventListener('change', () => {
        currentGroupId = groupSelect.value;
        if (currentGroupId) loadSchedule();
    });

    let timeout;
    teacherInput.addEventListener('input', () => {
        clearTimeout(timeout);
        const query = teacherInput.value.trim();
        if (query.length >= 2) {
            timeout = setTimeout(() => searchTeachers(query), 500);
        } else {
            teacherSelect.classList.add('hidden');
        }
    });

    teacherSelect.addEventListener('change', () => {
        currentTeacherName = teacherSelect.value;
        if (currentTeacherName) loadSchedule();
    });

    prevWeekBtn.addEventListener('click', () => {
        if (selectedWeek > 1) {
            selectedWeek--;
            updateWeekDisplay();
            loadSchedule();
        }
    });

    nextWeekBtn.addEventListener('click', () => {
        selectedWeek++;
        updateWeekDisplay();
        loadSchedule();
    });

    currentWeekBtn.addEventListener('click', () => {
        if (currentWeek) {
            selectedWeek = currentWeek;
            updateWeekDisplay();
            loadSchedule();
        }
    });
}

// Переключение между режимами "По группе" и "По преподавателю"
function switchMode(mode) {
    currentMode = mode;

    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    if (mode === 'group') {
        groupMode.classList.remove('hidden');
        teacherMode.classList.add('hidden');
        if (currentGroupId) loadSchedule();
    } else {
        groupMode.classList.add('hidden');
        teacherMode.classList.remove('hidden');
        if (currentTeacherName) loadSchedule();
    }
}

// Загрузка списка групп 
function loadGroups() {
    fetch('/api/groups')
        .then(res => res.json())
        .then(groups => {
            groupSelect.innerHTML = '<option value="">Выберите группу...</option>';
            groups.forEach(g => {
                groupSelect.innerHTML += `<option value="${g.id}">${g.name}</option>`;
            });
            if (groups.length) {
                currentGroupId = groups[0].id;
                groupSelect.value = currentGroupId;
                loadSchedule();
            }
        })
        .catch(() => showError('Ошибка загрузки групп'));
}

// Поиск преподавателей по введённой фамилии
function searchTeachers(query) {
    fetch(`/api/teachers?q=${encodeURIComponent(query)}`)
        .then(res => res.json())
        .then(teachers => {
            teacherSelect.innerHTML = '<option value="">Выберите преподавателя...</option>';
            teachers.forEach(t => {
                teacherSelect.innerHTML += `<option value="${t.name}">${t.name}</option>`;
            });
            teacherSelect.classList.remove('hidden');
        })
        .catch(() => showError('Ошибка поиска'));
}

// Загрузка текущей учебной недели
function loadCurrentWeek() {
    fetch('/api/current-week')
        .then(res => res.json())
        .then(data => {
            currentWeek = data.week;
            selectedWeek = currentWeek;
            updateWeekDisplay();
        })
        .catch(() => {
            currentWeek = 31;
            selectedWeek = 31;
            updateWeekDisplay();
        });
}

function updateWeekDisplay() {
    weekNumberSpan.textContent = `${selectedWeek} неделя`;
}

// Загрузка расписания (группы или преподавателя)
function loadSchedule() {
    showLoader(true);
    hideError();
    currentDayIndex = 0;

    let url;
    if (currentMode === 'group') {
        url = `/api/schedule/group?groupId=${currentGroupId}&week=${selectedWeek}`;
    } else {
        url = `/api/schedule/teacher?name=${encodeURIComponent(currentTeacherName)}&week=${selectedWeek}`;
    }

    fetch(url)
        .then(res => res.json())
        .then(data => {
            currentScheduleData = data;
            if (isMobile) {
                renderMobileSchedule(data);
            } else {
                renderDesktopSchedule(data);
            }
            showLoader(false);
        })
        .catch(() => {
            showError('Ошибка загрузки расписания');
            showLoader(false);
        });
}

// Отображение расписания
function renderDesktopSchedule(data) {
    if (!data.days || data.days.length === 0) {
        scheduleDiv.innerHTML = '<div style="text-align:center;padding:40px;">На этой неделе занятий нет</div>';
        return;
    }

    const daysMap = {};
    data.days.forEach(day => {
        daysMap[day.day_name] = day;
    });

    const allTimes = new Set();
    data.days.forEach(day => {
        day.lessons.forEach(l => {
            if (l.time) allTimes.add(l.time);
        });
    });

    const times = Array.from(allTimes).sort((a, b) => {
        return parseInt(a.split('-')[0]) - parseInt(b.split('-')[0]);
    });

    let html = '<div class="schedule-table"><table><thead><tr><th>Время</th>';
    DAYS_ORDER.forEach(day => html += `<th>${day}</th>`);
    html += '</tr></thead><tbody>';

    for (const time of times) {
        html += `<tr><td>${time}</td>`;

        for (const day of DAYS_ORDER) {
            const dayData = daysMap[day];
            let lessons = [];
            if (dayData) {
                lessons = dayData.lessons.filter(l => l.time === time);
            }

            html += `<td>`;
            if (lessons.length) {
                lessons.forEach(l => {
                    html += `<div class="lesson">
                        <div class="lesson-title">${l.title}</div>
                        <div class="lesson-type">${l.type || 'Лекция'}</div>`;
                    if (l.teacher) html += `<div class="lesson-teacher">${l.teacher}</div>`;
                    if (l.room) html += `<div class="lesson-room">${l.room}</div>`;
                    if (l.group) html += `<div class="lesson-group">${l.group}</div>`;
                    html += `</div>`;
                });
            } else {
                html += '—';
            }
            html += `</td>`;
        }
        html += `</tr>`;
    }

    html += '</tbody></table></div>';
    scheduleDiv.innerHTML = html;
}

// Отображение расписания на мобильных устройствах
function renderMobileSchedule(data) {
    if (!data.days || data.days.length === 0) {
        scheduleDiv.innerHTML = '<div style="text-align:center;padding:40px;">На этой неделе занятий нет</div>';
        return;
    }

    if (currentDayIndex >= data.days.length) {
        currentDayIndex = 0;
    }

    const currentDay = data.days[currentDayIndex];

    let html = `
        <div class="mobile-day-nav">
            <button class="day-nav-btn" id="prevDayBtn" ${currentDayIndex === 0 ? 'disabled' : ''}>←</button>
            <div class="mobile-day-info">
                <div class="day-name">${currentDay.day_name}</div>
                <div class="day-date">${currentDay.date || ''}</div>
            </div>
            <button class="day-nav-btn" id="nextDayBtn" ${currentDayIndex === data.days.length - 1 ? 'disabled' : ''}>→</button>
        </div>
        <div class="mobile-lessons">
    `;

    if (currentDay.lessons.length === 0) {
        html += '<div class="no-lessons">Занятий нет</div>';
    } else {
        currentDay.lessons.forEach(lesson => {
            html += `
                <div class="lesson">
                    <div class="lesson-time">${lesson.time || 'Время не указано'}</div>
                    <div class="lesson-title">${lesson.title}</div>
                    <div class="lesson-type">${lesson.type || 'Лекция'}</div>
            `;
            if (lesson.teacher) html += `<div class="lesson-teacher">${lesson.teacher}</div>`;
            if (lesson.room) html += `<div class="lesson-room">${lesson.room}</div>`;
            if (lesson.group) html += `<div class="lesson-group">${lesson.group}</div>`;
            html += `</div>`;
        });
    }

    html += '</div>';
    scheduleDiv.innerHTML = html;

    const prevBtn = document.getElementById('prevDayBtn');
    const nextBtn = document.getElementById('nextDayBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentDayIndex > 0) {
                currentDayIndex--;
                renderMobileSchedule(currentScheduleData);
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            if (currentDayIndex < currentScheduleData.days.length - 1) {
                currentDayIndex++;
                renderMobileSchedule(currentScheduleData);
            }
        });
    }
}

function showLoader(show) {
    if (show) {
        loader.classList.remove('hidden');
    } else {
        loader.classList.add('hidden');
    }
}

function showError(msg) {
    errorDiv.textContent = msg;
    errorDiv.classList.remove('hidden');
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

function hideError() {
    errorDiv.classList.add('hidden');
}