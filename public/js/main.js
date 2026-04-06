const dictionary = {
    group: [
        { id: '1213641978', name: '6413-100503D' },
        { id: '1282690279', name: '6412-100503D' },
        { id: '1282690301', name: '6411-100503D' }
    ],
    staff: [
        { id: '432837452', name: 'Юзькив Р.Р.' },
        { id: '335824546', name: 'Максимов А.И.' },
        { id: '364272302', name: 'Агафонов А.А.' },
        { id: '3664017039', name: 'Борисов А.Н.' },
        { id: '594502705', name: 'Чернышев П.В.' },
        { id: '544973937', name: 'Шапиро Д.А.' },
        { id: '333991624', name: 'Веричев А.В.' },
        { id: '114869468', name: 'Сергеев А.В.' },
        { id: '147619112', name: 'Кузнецов А.В.' },
        { id: '62061001', name: 'Мясников В.В.' }

    ]
};

let state = {
    id: dictionary.group[0].id,
    type: 'group',
    week: 33 
};

$(document).ready(() => {
    init();
    loadData();
});

/*
  Sets up event listeners and initial UI state
 */
function init() {
    const updateSelect = () => {
        const s = $('#targetSelect').empty();
        dictionary[state.type].forEach(i => s.append(`<option value="${i.id}">${i.name}</option>`));
        state.id = s.val();
    };

    updateSelect();

    $('#targetType').change(function() { 
        state.type = $(this).val(); 
        updateSelect(); 
        loadData(); 
    });

    $('#targetSelect').change(function() { 
        state.id = $(this).val(); 
        loadData(); 
    });

    $('#prevW').click(() => { if(state.week > 1) { state.week--; loadData(); } });
    $('#nextW').click(() => { state.week++; loadData(); });
    $('#updateBtn').click(loadData);
}

/*
  Fetches data from the server and handles loading states
 */
function loadData() {
    const grid = $('#grid-container');
    $('#weekNum').text(`Неделя ${state.week}`);
    grid.html('<div class="status-msg">Загрузка данных...</div>');

    $.getJSON(`/api/schedule?type=${state.type}&id=${state.id}&week=${state.week}`, (data) => {
        if (!data.schedule || data.schedule.length === 0) {
            grid.html('<div class="status-msg">Расписание не найдено.</div>');
            return;
        }
        render(data);
    }).fail(() => grid.html('<div class="status-msg error">Сервер не отвечает.</div>'));
}

/*
  Performs dynamic DOM construction and CSSOM manipulation
 */
function render(data) {
    const grid = $('#grid-container').empty();
    const displayDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

    grid.append('<div class="cell header-cell">Время</div>');
    displayDays.forEach(day => grid.append(`<div class="cell header-cell">${day}</div>`));

    data.schedule.forEach(row => {
        grid.append(`<div class="cell time-cell">${row.time}</div>`);

        for (let i = 0; i < 6; i++) {
            const lessonList = row.lessons[i];
            const cell = $('<div class="cell lesson-cell"></div>');
            
            if (lessonList && Array.isArray(lessonList)) {
                lessonList.forEach(lesson => {
                    const subgroupTag = lesson.subgroup ? `<span class="l-subgroup">${lesson.subgroup}</span>` : '';
                    const bottomInfo = state.type === 'staff' ? `👥 ${lesson.groups}` : `👤 ${lesson.teacher}`;

                    const card = $(`
                        <div class="lesson-card">
                            <div class="card-inner">
                                <div class="mobile-day-label">${displayDays[i]}</div>
                                <div class="card-header-line">
                                    <span class="l-badge">${lesson.type}</span>
                                    ${subgroupTag}
                                </div>
                                <div class="l-title">${lesson.subject}</div>
                                <div class="l-details">
                                    <div class="l-info">📍 ${lesson.place}</div>
                                    <div class="l-info">${bottomInfo}</div>
                                </div>
                            </div>
                        </div>
                    `);

                    const t = lesson.type.toLowerCase();
                    if (t.includes('лаб')) card.addClass('type-lab');
                    else if (t.includes('лек')) card.addClass('type-lec');
                    else if (t.includes('пр')) card.addClass('type-prac');

                    cell.append(card);
                });
            } else {
                cell.addClass('empty-hide-mobile');
            }
            grid.append(cell);
        }
    });
}