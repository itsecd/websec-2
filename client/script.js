const inputGroup= document.getElementById('groupId');
const result = document.getElementById('result');
const inputTeacher = document.getElementById('teacherName');
const weekSelect = document.getElementById('weekSelect');

function loadTimetable() {
    
    const groupNumber=inputGroup.value;
    const week = weekSelect.value;

    if (!groupNumber) {
        result.innerHTML = 'Номер группы не выбран';
        return;  
    }

    showLoading();
    fetch(`/groupRasp?groupId=${groupNumber}&week=${week}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            renderTable(data.schedule, `Группа ${data.groupName}`);
            } 
        else {
                showError(data.error);
            } 
        })
}

function loadTeacherTimetable() {
    const teacherName = inputTeacher.value;
    const week = weekSelect.value;

    if (!teacherName) {
        result.innerHTML = 'ФИО преподавателя не введено';
        return;  
    }
    showLoading();
    fetch('/search?q=' + encodeURIComponent(teacherName))
    .then(response => {
        if (!response.ok) {
            throw new Error('Преподаватель не найден');
        }
        return response.json();
    })
    .then(searchData => fetch(`/teacherRasp?teacherId=${searchData.id}&week=${week}`))
    .then(res => res.json())
    .then(data => {
        if (data.success) renderTable(data.schedule, data.teacherName, true);
        else result.innerHTML = 'Расписание не найдено';
    })
    .catch(err => result.innerHTML = err.message);
}

function renderTable(timeTable, title, isTeacher=false) {
    if (timeTable.length === 0) {
        result.innerHTML = 'Расписание не найдено';
        return;
    }
    result.innerHTML = '';
    result.appendChild(createTitle(title, timeTable.length));
    const grouped = groupByDate(timeTable);
    for (const [date, items] of Object.entries(grouped)) {
        result.appendChild(createDateBlock(date, items, isTeacher));
    }
}

function showLoading() {
    result.innerHTML = `<div class="loading">Загрузка...</div>`;
}


function createTitle(title, count) {
    const titleBlock = document.createElement('div');
    titleBlock.className = 'schedule-title';
    
    const h2 = document.createElement('h2');
    h2.textContent = `${title}`;

    const countSpan = document.createElement('p');
    
    titleBlock.appendChild(h2);
    
    return titleBlock;
}

function createDateBlock(date, items, isTeacher) {
    const block = document.createElement('div');

    const dateHeader = document.createElement('h3');
    dateHeader.className = 'date-header';
    dateHeader.textContent = `${date}`;
    block.appendChild(dateHeader);

    const table = createTable(items, isTeacher);
    block.appendChild(table);
    
    return block;
}

function createTable(items, isTeacher) {
    const table = document.createElement('table');
    table.className = 'schedule-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const groupedMap = new Map();

    function normalize(str) {
        return (str || '').toString().trim().toLowerCase();
    }

    items.forEach(item => {
    const key = [
        normalize(item.time),
        normalize(item.title),
        normalize(item.type),
        normalize(item.place),
        normalize(item.teacherName)
    ].join('|');

    if (!groupedMap.has(key)) {
        groupedMap.set(key, {
            ...item,
            groupNames: []
        });
    }

    if (item.groupName) {
        const existing = groupedMap.get(key);
        if (!existing.groupNames.includes(item.groupName)) {
            existing.groupNames.push(item.groupName);
        }
    }
    });
    const groupedItems = Array.from(groupedMap.values()).map(item => {
    item.groupName = item.groupNames.join(', ');
    return item;
    });
    groupedItems.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    const teacherSchedule = isTeacher;
    const headers = ['Время', 'Предмет', 'Тип', 'Аудитория'];
    if (teacherSchedule) {
        headers.push('Группа(ы)');
    }
    headers.push('Преподаватель');

    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    const sortedItems = [...groupedItems].sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.time.localeCompare(b.time);
    });

    sortedItems.forEach(item => {
        const row = document.createElement('tr');

        const timeCell = document.createElement('td');
        const strong = document.createElement('strong');
        strong.textContent = item.time;
        timeCell.appendChild(strong);
        row.appendChild(timeCell);
        
        const subjectCell = document.createElement('td');
        subjectCell.textContent = item.title;
        row.appendChild(subjectCell);

        const typeCell = document.createElement('td');
        typeCell.textContent = item.type || '-';
        row.appendChild(typeCell);

        const placeCell = document.createElement('td');
        placeCell.textContent = item.place || '-';
        row.appendChild(placeCell);

        if (teacherSchedule) {
            const groupCell = document.createElement('td');
            groupCell.textContent = item.groupName || '-';
            row.appendChild(groupCell);
        }

        const teacherCell = document.createElement('td');
        teacherCell.textContent = item.teacherName || '-';
        row.appendChild(teacherCell);
        
        tbody.appendChild(row);
    });
    
    table.appendChild(tbody);
    return table;
}

function groupByDate(schedule) {
    const grouped = {};
    
    schedule.forEach(item => {
        if (!grouped[item.date]) {
            grouped[item.date] = [];
        }
        grouped[item.date].push(item);
    });
    return grouped;
}