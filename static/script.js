$(document).ready(function () {

    const groupBtn = $('.groupSearchBtn');
    const groupInput = $('.groupSearchInput');
    const teacherBtn = $('.teacherSearchBtn');
    const teacherInput = $('.teacherSearchInput');
    const h2GroupName = $('.h2-group-name');
    const scheduleDiv = $('.schedule');
    const prevWeekBtn = $('#prevWeekBtn');
    const nextWeekBtn = $('#nextWeekBtn');
    const currentWeekInfo = $('#currentWeekInfo');


    let currentType = null;
    let currentId = null;
    let currentName = null;
    let currentWeek = null;


    function renderSchedule(data) {
        if (!data.days || data.days.length === 0) {
            scheduleDiv.html('<p>Расписание не найдено</p>');
            return;
        }

        currentWeek = data.week;
        currentWeekInfo.text(`Неделя ${currentWeek}`);

        let table = '<table class="schedule-table" border="1" cellpadding="10" cellspacing="0">';

        table += '<thead>';
        table += '<tr>';
        table += '<th>Время</th>';
        for (let i = 0; i < data.days.length; i++) {
            const day = data.days[i];
            table += `<th>${day.weekday}<br><small>${day.date}</small></th>`;
        }
        table += '</tr>';
        table += '</thead>';

        table += '<tbody>';

        for (let row = 0; row < data.time_slots.length; row++) {
            table += '<tr>';
            table += `<td class="time-slot"><strong>${data.time_slots[row]}</strong></td>`;

            for (let col = 0; col < data.days.length; col++) {
                const cellData = data.grid && data.grid[row] ? data.grid[row][col] : null;

                if (cellData && Array.isArray(cellData) && cellData.length > 0) {
                    table += '<td class="lesson-cell">';
                    for (let k = 0; k < cellData.length; k++) {
                        const lesson = cellData[k];
                        table += '<div class="lesson">';
                        table += `<div class="lesson-subject"><strong>${lesson.subject || '—'}</strong></div>`;
                        table += `<div class="lesson-type">${lesson.type || '—'}</div>`;
                        table += `<div class="lesson-teacher">${lesson.teacher || '—'}</div>`;
                        table += `<div class="lesson-room"> ${lesson.room || '—'}</div>`;
                        if (lesson.subgroup) {
                            table += `<div class="lesson-subgroup"> ${lesson.subgroup}</div>`;
                        }
                        if (lesson.groups && lesson.groups !== "") {
                            table += `<div class="lesson-groups"> ${lesson.groups}</div>`;
                        }
                        table += '</div>';
                        if (k < cellData.length - 1) {
                            table += '<hr class="lesson-separator">';
                        }
                    }
                    table += '</td>';
                } else {
                    table += '<td class="empty-cell" style="text-align: center;">—</td>';
                }
            }
            table += '</tr>';
        }

        table += '</tbody>';
        table += '</table>';

        scheduleDiv.html(table);
    }


    async function loadSchedule(type, id, name, week = null) {
        try {
            scheduleDiv.html('<p>Загрузка расписания...</p>');
            let url = `/api/schedule?type=${type}&id=${id}`;
            if (week !== null) {
                url += `&week=${week}`;
            }
            const response = await fetch(url);
            const data = await response.json();
            currentType = type;
            currentId = id;
            currentName = name;
            h2GroupName.text(data.entity_name || name);
            renderSchedule(data);

        } catch (error) {
            scheduleDiv.html('<p style="color: red;">Ошибка при загрузке расписания</p>');
        }
    }



    async function nextWeek() {
        if (!currentType || !currentId) {
            alert('Сначала найдите группу или преподавателя');
            return;
        }
        const nextWeekNumber = currentWeek + 1;
        await loadSchedule(currentType, currentId, currentName, nextWeekNumber);
    }



    async function prevWeek() {
        if (!currentType || !currentId) {
            alert('Сначала найдите группу или преподавателя');
            return;
        }
        const prevWeekNumber = currentWeek - 1;
        await loadSchedule(currentType, currentId, currentName, prevWeekNumber);
    }



    async function searchGroup() {
        const query = groupInput.val().trim();
        if (!query) {
            alert('Введите номер группы');
            return;
        }
        try {
            const response = await fetch('/api/groups');
            const groups = await response.json();
            const group = groups.find(g => g.name.startsWith(query));
            if (!group) {
                alert(`Группа начинающаяся с "${query}" не найдена. Доступные группы: ${groups.map(g => g.name).join(', ')}`);
                return;
            }
            await loadSchedule('group', group.id, group.name);
        } catch (error) {
            alert('Ошибка при поиске группы');
        }
    }



    async function searchTeacher() {
        const query = teacherInput.val().trim();

        if (!query) {
            alert('Введите ФИО преподавателя');
            return;
        }

        try {
            const response = await fetch('/api/teachers');
            const teachers = await response.json();

            const teacher = teachers.find(t => {
                const surname = t.name.split(' ')[0];
                return surname.toLowerCase() === query.toLowerCase() ||
                    t.name.toLowerCase().includes(query.toLowerCase());
            });

            if (!teacher) {
                alert(`Преподаватель "${query}" не найден.`);
                return;
            }

            await loadSchedule('teacher', teacher.id, teacher.name);

        } catch (error) { alert('Ошибка при поиске преподавателя') };
    }
    groupBtn.on('click', searchGroup);
    teacherBtn.on('click', searchTeacher);
    prevWeekBtn.on('click', prevWeek);
    nextWeekBtn.on('click', nextWeek);
});