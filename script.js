$(document).ready(function() {
    const API_URL = 'http://localhost:3000/api/schedule';
    const TEACHER_API_URL = 'http://localhost:3000/api/teacher-schedule';

    const groups = [
        { id: '1282690301', name: '6411-100503D', 
          details: '10.05.03 Информационная безопасность автоматизированных систем<br>Специалист (Очная форма обучения)',
          startYear: 'Начало учебного года: 01.09.2025' },
        { id: '1282690279', name: '6412-100503D',
          details: '10.05.03 Информационная безопасность автоматизированных систем<br>Специалист (Очная форма обучения)',
          startYear: 'Начало учебного года: 01.09.2025' },
        { id: '1213641978', name: '6413-100503D',
          details: '10.05.03 Информационная безопасность автоматизированных систем<br>Специалист (Очная форма обучения)',
          startYear: 'Начало учебного года: 01.09.2025' }
    ];

    const teachers = [
        { id: '335824546', name: 'Максимов А.И.' },
        { id: '664017039', name: 'Борисов А.Н.' },
        { id: '333991624', name: 'Веричев А.В.' },
        { id: '364272302', name: 'Агафонов А.А.' },
        { id: '651422674', name: 'Позднякова Д.С.' },
        { id: '147619112', name: 'Кузнецов А.В.' },
        { id: '432837452', name: 'Юзькив Р.Р.' },
        { id: '544973937', name: 'Шапиро Д.А.' },
        { id: '62061001', name: 'Мясников В.В.' }
    ];

    const weeks = [32, 33, 34, 35, 36];
    let currentWeekIndex = 0;

    const searchTrigger = $('#searchTrigger');
    const searchDropdown = $('#searchDropdown');
    const groupInput = $('#groupInput');
    const container = $('#scheduleContainer');
    const groupTitle = $('#groupTitle');
    const groupNameDisplay = $('#groupNameDisplay');
    const groupDetailsDisplay = $('#groupDetailsDisplay');
    const startYearDisplay = $('#startYearDisplay');

    let currentData = null;

    function setContent(content) {
        const header = `<div class="schedule-header-block">
            <div class="week-nav">
                <button class="week-nav-prev" id="prevWeekBtn"><span>&lt;</span></button>
                <div class="week-number" id="weekNumber">${weeks[currentWeekIndex]} неделя</div>
                <button class="week-nav-next" id="nextWeekBtn"><span>&gt;</span></button>
            </div>
        </div>`;
        container.html(header + content);
        updateWeekButtons();
    }

    function toggleSearch(open) {
        if (open) {
            searchDropdown.addClass('show');
            searchTrigger.addClass('open');
            groupInput.focus();
        } else {
            searchDropdown.removeClass('show');
            searchTrigger.removeClass('open');
        }
    }

    searchTrigger.on('click', function(e) {
        e.stopPropagation();
        toggleSearch(!searchDropdown.hasClass('show'));
    });

    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-trigger, .search-dropdown').length) {
            toggleSearch(false);
        }
    });

    function getTypeClass(type) {
        let t = type.toLowerCase();
        if (t.includes('лекция')) return 'lecture';
        if (t.includes('практика')) return 'practice';
        if (t.includes('лабораторная')) return 'lab';
        if (t.includes('экзамен')) return 'exam';
        if (t.includes('зачёт')) return 'test';
        return 'other';
    }

    function desktopView(days, dates, matrix) {
        let html = '<div class="schedule-wrapper"><table class="schedule-table">';
        html += '<thead><tr><th class="time-col">Время</th>';
        for (let i = 0; i < days.length; i++) {
            html += `<th class="day-col">${days[i]}<br><span class="date">${dates[i] || ''}</span></th>`;
        }
        html += '</tr></thead><tbody>';

        for (let row of matrix) {
            html += '<tr>';
            let time = row.time;
            if (time.includes('–')) {
                let parts = time.split('–');
                time = parts[0] + '<br>' + parts[1];
            }
            html += `<td class="time-cell">${time}</td>`;

            for (let cell of row.cells) {
                if (cell && cell.length) {
                    let cellHtml = '<td class="lesson-cell">';
                    for (let i = 0; i < cell.length; i++) {
                        let l = cell[i];
                        let groups = l.groupsInfo ? `<div class="lesson-groups">${l.groupsInfo.split(',').map(g => g.trim()).join('<br>')}</div>` : '';
                        cellHtml += `<div class="lesson-item ${getTypeClass(l.type)}">
                                        <div class="lesson-subject">${l.subject}</div>
                                        <div class="lesson-place">${l.place}</div>
                                        <div class="lesson-teacher">${l.teacher}</div>
                                        ${groups}
                                    </div>`;
                        if (i < cell.length - 1) cellHtml += '<div class="lesson-divider"></div>';
                    }
                    cellHtml += '</td>';
                    html += cellHtml;
                } else {
                    html += '<td class="lesson-cell empty">—</td>';
                }
            }
            html += '</tr>';
        }
        html += '</tbody></table></div>';
        return html;
    }

    function mobileView(days, dates, matrix) {
        let daysData = [];
        for (let i = 0; i < days.length; i++) {
            let lessons = [];
            for (let row of matrix) {
                let time = row.time;
                if (time.includes('–')) {
                    let parts = time.split('–');
                    time = parts[0] + '<br>' + parts[1];
                }
                let cell = row.cells[i];
                if (cell && cell.length) {
                    for (let l of cell) {
                        let groups = l.groupsInfo ? `<div class="lesson-groups">${l.groupsInfo.split(',').map(g => g.trim()).join('<br>')}</div>` : '';
                        lessons.push({
                            time: time,
                            subject: l.subject,
                            place: l.place,
                            teacher: l.teacher,
                            groups: groups,
                            type: getTypeClass(l.type)
                        });
                    }
                }
            }
            daysData.push({ name: days[i], date: dates[i] || '', lessons: lessons });
        }

        let html = '<div class="mobile-schedule">';
        for (let day of daysData) {
            html += `<div class="mobile-day-card">
                        <div class="mobile-day-header">
                            <span class="mobile-day-name">${day.name}</span>
                            <span class="mobile-day-date">${day.date}</span>
                        </div>
                        <div class="mobile-day-lessons">`;
            if (day.lessons.length === 0) {
                html += '<div class="mobile-lesson-item empty">Нет занятий</div>';
            } else {
                for (let l of day.lessons) {
                    html += `<div class="mobile-lesson-item ${l.type}">
                                <div class="mobile-lesson-time">${l.time}</div>
                                <div class="mobile-lesson-content">
                                    <div class="lesson-subject">${l.subject}</div>
                                    <div class="lesson-place">${l.place}</div>
                                    <div class="lesson-teacher">${l.teacher}</div>
                                    ${l.groups}
                                </div>
                            </div>`;
                }
            }
            html += `</div></div>`;
        }
        html += '</div>';
        return html;
    }

    function render(days, dates, matrix) {
        if (!matrix || !matrix.length) {
            setContent('<p class="error">Расписание не найдено</p>');
            return;
        }
        let isMobile = window.innerWidth <= 768;
        let content = isMobile ? mobileView(days, dates, matrix) : desktopView(days, dates, matrix);
        setContent(content);
        currentData = { days, dates, matrix };
    }

    $(window).on('resize', function() {
        if (currentData) {
            let isMobile = window.innerWidth <= 768;
            let content = isMobile ? mobileView(currentData.days, currentData.dates, currentData.matrix) : desktopView(currentData.days, currentData.dates, currentData.matrix);
            setContent(content);
        }
    });

    function loadGroup(id, week) {
        if (!id) return;
        setContent('<div class="loading">Загрузка расписания...</div>');
        $.ajax({
            url: API_URL,
            data: { groupId: id, week: week },
            success: function(res) {
                if (res.scheduleMatrix && res.scheduleMatrix.length) {
                    render(res.days, res.dates, res.scheduleMatrix);
                } else {
                    setContent('<p class="error">Расписание пустое или не найдено</p>');
                }
            },
            error: function() {
                setContent('<p class="error">Ошибка загрузки. Проверьте сервер.</p>');
            }
        });
    }

    function loadTeacher(id, week) {
        if (!id) return;
        setContent('<div class="loading">Загрузка расписания преподавателя...</div>');
        $.ajax({
            url: TEACHER_API_URL,
            data: { staffId: id, week: week },
            success: function(res) {
                if (res.scheduleMatrix && res.scheduleMatrix.length) {
                    render(res.days, res.dates, res.scheduleMatrix);
                } else {
                    setContent('<p class="error">Расписание преподавателя не найдено</p>');
                }
            },
            error: function() {
                setContent('<p class="error">Ошибка загрузки. Проверьте сервер.</p>');
            }
        });
    }

    function updateGroupInfo(name) {
        let group = groups.find(g => g.name === name);
        if (group) {
            groupNameDisplay.text(group.name);
            groupDetailsDisplay.html(group.details);
            startYearDisplay.text(group.startYear);
        } else {
            groupNameDisplay.text('');
            groupDetailsDisplay.text('');
            startYearDisplay.text('');
        }
    }

    function findGroup(query) {
        let q = query.trim().toLowerCase();
        if (!q) return null;
        return groups.find(g => g.name.toLowerCase() === q || g.id === q || g.name.toLowerCase().includes(q));
    }

    function findTeacher(query) {
        let q = query.trim().toLowerCase();
        if (!q) return null;
        return teachers.find(t => t.name.toLowerCase().includes(q));
    }

    function updateWeekButtons() {
        $('#weekNumber').text(`${weeks[currentWeekIndex]} неделя`);
        $('#prevWeekBtn').prop('disabled', currentWeekIndex === 0);
        $('#nextWeekBtn').prop('disabled', currentWeekIndex === weeks.length - 1);
    }

    $(document).on('click', '#prevWeekBtn', function() {
        if (currentWeekIndex > 0) {
            currentWeekIndex--;
            let week = weeks[currentWeekIndex];
            let groupId = $('#group').val();
            if (groupId) {
                loadGroup(groupId, week);
            } else {
                loadGroup('1213641978', week);
            }
            updateWeekButtons();
        }
    });

    $(document).on('click', '#nextWeekBtn', function() {
        if (currentWeekIndex < weeks.length - 1) {
            currentWeekIndex++;
            let week = weeks[currentWeekIndex];
            let groupId = $('#group').val();
            if (groupId) {
                loadGroup(groupId, week);
            } else {
                loadGroup('1213641978', week);
            }
            updateWeekButtons();
        }
    });

    groupInput.on('keypress', function(e) {
        if (e.which === 13) {
            let query = groupInput.val();
            let group = findGroup(query);
            if (group) {
                groupTitle.text(`Расписание, ${group.name}`);
                updateGroupInfo(group.name);
                loadGroup(group.id, weeks[currentWeekIndex]);
                toggleSearch(false);
                groupInput.val('');
                return;
            }
            let teacher = findTeacher(query);
            if (teacher) {
                groupTitle.text(`Расписание преподавателя: ${teacher.name}`);
                groupNameDisplay.text('');
                groupDetailsDisplay.text('');
                startYearDisplay.text('');
                loadTeacher(teacher.id, weeks[currentWeekIndex]);
                toggleSearch(false);
                groupInput.val('');
                return;
            }
            setContent('<p class="error">Ни группа, ни преподаватель не найдены. Попробуйте: 6411, 6412, 6413 или фамилию преподавателя (например, Максимов)</p>');
        }
    });

    let defaultGroup = groups.find(g => g.name === '6413-100503D');
    if (defaultGroup) {
        groupTitle.text(`Расписание, ${defaultGroup.name}`);
        updateGroupInfo(defaultGroup.name);
        loadGroup(defaultGroup.id, weeks[currentWeekIndex]);
    } else {
        groupTitle.text('Расписание');
        setContent('<p>Нажмите "Поиск..." и введите номер группы или фамилию преподавателя</p>');
    }
});