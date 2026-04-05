console.log("App loaded");

let currentMode = 'group';
let currentItems = [];

function getCurrentWeek() {
    const start = new Date(2025, 8, 1);
    const now = new Date();
    const diff = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    if (diff < 0) return 1;
    return (Math.floor(diff / 7) % 52) + 1;
}

function loadGroups() {
    return $.get('/api/groups');
}

function loadTeachers() {
    return $.get('/api/teachers');
}

function loadItems() {
    const label = currentMode === 'group' ? 'Группа' : 'Преподаватель';
    $('#selectLabel').text(label);
    $('#entitySelect').prop('disabled', true).html('<option value="">Загрузка...</option>');
    
    const loader = currentMode === 'group' ? loadGroups() : loadTeachers();
    
    loader.done(function(items) {
        currentItems = items;
        renderSelect(items);
        $('#entitySelect').prop('disabled', false);
    }).fail(function() {
        $('#entitySelect').prop('disabled', false).html('<option value="">Ошибка загрузки</option>');
    });
}

function renderSelect(items) {
    const modeText = currentMode === 'group' ? 'группу' : 'преподавателя';
    let options = `<option value="">-- Выберите ${modeText} --</option>`;
    
    items.forEach(function(item) {
        options += `<option value="${item.id}">${escapeHtml(item.name)}</option>`;
    });
    
    $('#entitySelect').html(options);
}

function getLessonClass(typeText) {
    const t = (typeText || '').toLowerCase();
    if (t.includes('лекц')) return 'lesson-lecture';
    if (t.includes('практ')) return 'lesson-practice';
    if (t.includes('лаб')) return 'lesson-lab';
    if (t.includes('экзамен')) return 'lesson-exam';
    if (t.includes('зачёт')) return 'lesson-credit';
    return 'lesson-default';
}

function buildLessonHTML(lesson) {
    const lessonClass = getLessonClass(lesson.type);
    let html = `<div class="lesson-card ${lessonClass}">`;
    html += `<b>${escapeHtml(lesson.title)}</b>`;
    if (lesson.teacher) {
        html += `<br><span class="lesson-teacher">${escapeHtml(lesson.teacher)}</span>`;
    }
    if (lesson.room) {
        html += `<br><span class="lesson-room">${escapeHtml(lesson.room)}</span>`;
    }
    html += `</div>`;
    return html;
}

function buildDayCellHTML(lessons) {
    if (!lessons || lessons.length === 0) {
        return '<span class="lesson-empty">—</span>';
    }
    
    let html = '';
    lessons.forEach(function(lesson) {
        html += buildLessonHTML(lesson);
    });
    return html;
}

function buildRowHTML(row) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    let html = '<tr>';
    html += `<td class="time-cell">${escapeHtml(row.time)}</td>`;
    
    days.forEach(function(day) {
        const lessons = row.days[day] || [];
        html += `<td class="day-cell">${buildDayCellHTML(lessons)}</td>`;
    });
    
    html += '</tr>';
    return html;
}

function loadSchedule() {
    const entityId = $('#entitySelect').val();
    const week = $('#weekInput').val();
    
    if (!entityId) {
        showEmptyState('Выберите ' + (currentMode === 'group' ? 'группу' : 'преподавателя'));
        return;
    }
    
    showLoading(true);
    
    const url = currentMode === 'group' 
        ? `/api/schedule/${entityId}?week=${week}`
        : `/api/schedule/teacher/${entityId}?week=${week}`;
    
    $.get(url)
        .done(function(data) {
            renderSchedule(data);
            showLoading(false);
        })
        .fail(function() {
            showLoading(false);
            showErrorState('Не удалось загрузить расписание');
        });
}

function renderSchedule(data) {
    if (!data || data.length === 0) {
        showEmptyState('Нет данных');
        return;
    }
    
    let html = '';
    data.forEach(function(row) {
        html += buildRowHTML(row);
    });
    
    $('#scheduleBody').html(html);
}

function showLoading(show) {
    if (show) {
        $('#loadingIndicator').show();
        $('#scheduleBody').html('<tr><td colspan="7"><div class="spinner"></div> Загрузка...</td></tr>');
    } else {
        $('#loadingIndicator').hide();
    }
}

function showEmptyState(message) {
    $('#scheduleBody').html(`<tr><td colspan="7" class="empty-state">${escapeHtml(message)}</td></tr>`);
}

function showErrorState(message) {
    $('#scheduleBody').html(`<tr><td colspan="7" class="empty-state">${escapeHtml(message)}<br><button onclick="loadSchedule()">Повторить</button></td></tr>`);
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function prevWeek() {
    let week = parseInt($('#weekInput').val());
    if (week > 1) {
        $('#weekInput').val(week - 1);
        loadSchedule();
    }
}

function nextWeek() {
    let week = parseInt($('#weekInput').val());
    if (week < 52) {
        $('#weekInput').val(week + 1);
        loadSchedule();
    }
}

function setMode(mode) {
    currentMode = mode;
    
    if (mode === 'group') {
        $('#btnGroups').addClass('active');
        $('#btnTeachers').removeClass('active');
    } else {
        $('#btnTeachers').addClass('active');
        $('#btnGroups').removeClass('active');
    }
    
    loadItems();
    showEmptyState('Выберите ' + (mode === 'group' ? 'группу' : 'преподавателя'));
}

$(document).ready(function() {
    $('#weekInput').val(getCurrentWeek());
    $('#currentWeekBadge').html(getCurrentWeek() + '-я неделя');
    
    setMode('group');
    
    $('#btnGroups').on('click', function() { setMode('group'); });
    $('#btnTeachers').on('click', function() { setMode('teacher'); });
    $('#entitySelect').on('change', loadSchedule);
    $('#weekInput').on('change', loadSchedule);
    $('#weekPrev').on('click', prevWeek);
    $('#weekNext').on('click', nextWeek);
});