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

function renderTable(timeTable, title, isTeacher = false) {
    if (timeTable.length === 0) {
        result.innerHTML = 'Расписание не найдено';
        return;
    }

    result.innerHTML = '';
    result.appendChild(createTitle(title));

    let processedTable = timeTable;
    if (isTeacher) {
        const groupedMap = new Map();
        
        timeTable.forEach(item => {
            const key = `${item.date}|${item.time}|${item.title}|${item.type}|${item.place}`;
            
            if (!groupedMap.has(key)) {
                groupedMap.set(key, {
                    ...item,
                    groupNames: [item.groupName]
                });
            } else {
                const existing = groupedMap.get(key);
                if (!existing.groupNames.includes(item.groupName)) {
                    existing.groupNames.push(item.groupName);
                }
            }
        });
        
        processedTable = Array.from(groupedMap.values()).map(item => ({
            ...item,
            groupName: item.groupNames.join(', ')
        }));
    }

    const grouped = groupByDate(processedTable);

    const existingDates = Object.keys(grouped).sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('.').map(Number);
        const [dayB, monthB, yearB] = b.split('.').map(Number);
        return new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB);
    });
    
    const firstDate = existingDates[0].split('.').map(Number);
    let monday = new Date(firstDate[2], firstDate[1] - 1, firstDate[0]);
    while (monday.getDay() !== 1) {
        monday.setDate(monday.getDate() - 1);
    }
    
    const dates = [];
    for (let i = 0; i < 6; i++) {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        dates.push(`${day}.${month}.${year}`);
    }

    const timesSet = new Set();
    processedTable.forEach(item => timesSet.add(item.time));
    const times = Array.from(timesSet).sort((a, b) => a.localeCompare(b));

    const table = document.createElement('table');
    table.className = 'timetable';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const timeHeader = document.createElement('th');
    timeHeader.textContent = 'Время';
    headerRow.appendChild(timeHeader);

    dates.forEach(date => {
        const th = document.createElement('th');
        th.textContent = date;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');

    times.forEach(time => {
        const row = document.createElement('tr');

        const timeCell = document.createElement('td');
        timeCell.textContent = time;
        row.appendChild(timeCell);

        dates.forEach(date => {
            const lessons = grouped[date]?.filter(item => item.time === time) || [];
            const cell = document.createElement('td');

            if (lessons.length === 0) {
                cell.textContent = '';
            } else {
                lessons.forEach(item => {
                    const lessonDiv = document.createElement('div');
                    lessonDiv.innerHTML = `<strong>${item.title}</strong> (${item.type || 'Другое'})<br>
                                           ${item.place || ''}<br>
                                           ${isTeacher ? (item.groupName || '') : (item.teacherName || '')}`;
                    cell.appendChild(lessonDiv);
                });
            }

            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    result.appendChild(table);
}

function showLoading() {
    result.innerHTML = `<div class="loading">Загрузка...</div>`;
}


function createTitle(title, count) {
    const titleBlock = document.createElement('div');
    titleBlock.className = 'schedule-title';
    titleBlock.style.cssText = 'text-align: center; margin-bottom: 20px;';
    const h2 = document.createElement('h2');
    h2.textContent = title;
    titleBlock.appendChild(h2);
    
    return titleBlock;
}

function createDateBlock(date, items, isTeacher) {
    const block = document.createElement('div');
    block.className = 'day-card';
    
    const dateHeader = document.createElement('div');
    dateHeader.className = 'day-header';
    dateHeader.textContent = date;
    block.appendChild(dateHeader);
    
    const lessonsGrid = document.createElement('div');
    lessonsGrid.className = 'lessons-grid';
    
    console.log('Занятия на дату', date, items);

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
        
        console.log('Ключ:', key);
        
        if (!groupedMap.has(key)) {
            groupedMap.set(key, {
                ...item,
                groupNames: []
            });
        }
        
        if (isTeacher && item.groupName) {
            const existing = groupedMap.get(key);
            if (!existing.groupNames.includes(item.groupName)) {
                existing.groupNames.push(item.groupName);
            }
        }
    });
    
    const groupedItems = Array.from(groupedMap.values()).map(item => {
        if (isTeacher && item.groupNames && item.groupNames.length > 0) {
            item.groupName = item.groupNames.join(', ');
        }
        return item;
    });
    
    groupedItems.sort((a, b) => a.time.localeCompare(b.time));
    
    console.log('Сгруппировано:', groupedItems.length, 'занятий');
    
    groupedItems.forEach(item => {
        const card = createLessonCard(item, isTeacher);
        lessonsGrid.appendChild(card);
    });
    
    block.appendChild(lessonsGrid);
    return block;
}

function createLessonCard(item, isTeacher) {
    const card = document.createElement('div');
    card.className = 'lesson-card';

    const timeDiv = document.createElement('div');
    timeDiv.className = 'lesson-time';
    timeDiv.textContent = item.time;
    card.appendChild(timeDiv);

    const titleDiv = document.createElement('div');
    titleDiv.className = 'lesson-title';
    titleDiv.textContent = item.title;
    card.appendChild(titleDiv);
    const typeDiv = document.createElement('div');
    typeDiv.className = 'lesson-type';
    const type = (item.type || 'Другое').toLowerCase();
    if (type.includes('лек')) typeDiv.classList.add('type-lecture');
    else if (type.includes('практ')) typeDiv.classList.add('type-practice');
    else if (type.includes('лабор')) typeDiv.classList.add('type-lab');
    else typeDiv.classList.add('type-other');
    typeDiv.textContent = item.type || 'Другое';
    card.appendChild(typeDiv);
    
    const placeDiv = document.createElement('div');
    placeDiv.className = 'lesson-place';
    placeDiv.textContent = item.place || 'Место не указано';
    card.appendChild(placeDiv);
    
    const teacherDiv = document.createElement('div');
    teacherDiv.className = 'lesson-teacher';
    teacherDiv.textContent = item.teacherName || 'Преподаватель не указан';
    card.appendChild(teacherDiv);
    
    if (isTeacher && item.groupName) {
        const groupsDiv = document.createElement('div');
        groupsDiv.className = 'lesson-groups';
        
        const groups = item.groupName.split(', ');
        groups.forEach(group => {
            const badge = document.createElement('span');
            badge.className = 'group-badge';
            badge.textContent = group;
            groupsDiv.appendChild(badge);
        });
        
        card.appendChild(groupsDiv);
    }
    
    return card;
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