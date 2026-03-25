const inputGroup= document.getElementById('groupId');
const result = document.getElementById('result');
const inputTeacher = document.getElementById('teacherName');

function loadTimetable() {
    
    const groupNumber=inputGroup.value;
    
    if (groupNumber === '') {
        result.innerHTML = 'Номер группы не выбран';
        return;  
    }

    showLoading();

    fetch('/groupRasp?groupId=' + groupNumber)
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

    if (teacherName === '') {
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
    .then(searchData => {
        showLoading();
        return fetch('/teacherRasp?teacherId=' + searchData.id);
    })
    .then(response=>response.json())
    .then(data => {
        if (data.success) {
            renderTable(data.schedule, data.teacherName);
        }
        else {
            result.innerHTML = "error";
        }
    })
}

function renderTable(timeTable, title) {
    if (timeTable.length === 0) {
        result.innerHTML = 'Расписание не найдено';
        return;
    }
    result.innerHTML = '';
    result.appendChild(createTitle(title, timeTable.length));
    const grouped = groupByDate(timeTable);
    for (const [date, items] of Object.entries(grouped)) {
        result.appendChild(createDateBlock(date, items));
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
    countSpan.className = 'lessons-count';
    countSpan.textContent = `Занятия: ${count}`;
    
    titleBlock.appendChild(h2);
    titleBlock.appendChild(countSpan);
    
    return titleBlock;
}

function createDateBlock(date, items) {
    const block = document.createElement('div');

    const dateHeader = document.createElement('h3');
    dateHeader.className = 'date-header';
    dateHeader.textContent = `${date}`;
    block.appendChild(dateHeader);

    const table = createTable(items);
    block.appendChild(table);
    
    return block;
}

function createTable(items) {
    const table = document.createElement('table');
    table.className = 'schedule-table';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    const headers = ['Время', 'Предмет', 'Тип', 'Аудитория', 'Преподаватель'];
    headers.forEach(headerText => {
        const th = document.createElement('th');
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    const sortedItems = [...items].sort((a, b) => a.time.localeCompare(b.time));
    
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