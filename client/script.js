function loadTimetable() {
    const inputGroup= document.getElementById('groupId');
    const groupNumber=inputGroup.value;
    const result = document.getElementById('result');

    if (groupNumber === '') {
        result.innerHTML = 'Номер группы не выбран';
        return;  
    }

    result.innerHTML = '<div class="loading">Загрузка</div>';
    fetch('/rasp?groupId=' + groupNumber)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            let html = '';
            html += '<h2>Расписание для группы ' + data.groupId + '</h2>';
            html += '<div class="dates-row">';
            for (let i = 0; i < data.dates.length; i++) {
                    html += '<div class="date-item">' + data.dates[i] + '</div>';
            }
            html += '</div>';
            result.innerHTML = html;
            } else {
                result.innerHTML = 'error';
            }
        })
        .catch(error => {
            console.error('Ошибка:', error);
            result.innerHTML = "error";
        });
}