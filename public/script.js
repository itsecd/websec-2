$(document).ready(function() {
    let currentWeek = null;
    let currentType = 'group';
    let currentId = null;
    let initialGroupsData = [];

    function initGroups() {
        initialGroupsData = [
            {id: '1282690301', name: '6411-100503D'},
            {id: '1282690279', name: '6421-100503D'},
            {id: '1213641978', name: '6413-100503D'}
        ];
        let $select = $('#group-select');
        $select.empty().append('<option value="">группы ИБАС 4 курс</option>');
        for (var i = 0; i < initialGroupsData.length; i++) {
            $select.append('<option value="' + initialGroupsData[i].id + '">' + initialGroupsData[i].name + '</option>');
        }
    }

    function loadSchedule(id, type, week, groupName) {
        let url = '';
        let currentTargetInfo = { name: '', type: '' };

        currentId = id;
        currentType = type;

        if (type === 'group') {
            url = '/api/schedule?groupId=' + id + (week ? '&selectedWeek=' + week : '');
            
            // если передано имя группы - используем его, иначе в массив
            if (groupName) {
                currentTargetInfo = { name: groupName, type: 'Группа' };
            } else {
                var group = null;
                for (var i = 0; i < initialGroupsData.length; i++) {
                    if (initialGroupsData[i].id == id) {
                        group = initialGroupsData[i];
                        break;
                    }
                }
                currentTargetInfo = { name: group ? group.name : id, type: 'Группа' };
            }
        } else if (type === 'teacher') {
            url = '/api/schedule?staffId=' + id + (week ? '&selectedWeek=' + week : '');
            currentTargetInfo = { name: 'Преподаватель', type: 'Преподаватель' };
        }

        $('#schedule-content').html('<div class="empty-state">Загрузка данных...</div>');
        $('#empty-message').hide();

        $.getJSON(url, function(data) {
            if (Array.isArray(data)) {
                $('#schedule-content').html('<div class="error-message">Ошибка структуры данных</div>');
                return;
            }

            currentWeek = parseInt(data.weekNumber);
            
            if (type === 'teacher' && data.group) {
                currentTargetInfo.name = data.group;
            }
            
            renderSchedule(data, currentTargetInfo);
        }).fail(function() {
            $('#schedule-content').html('<div class="error-message">Сервер не отвечает</div>');
        });
    }

    function renderSchedule(data, currentTargetInfo) {
        var $container = $('#schedule-content');
        $container.empty().show();

        var timeSlots = ["08:00-09:35", "09:45-11:20", "11:30-13:05", "13:30-15:05", "15:15-16:50", "17:00-18:35"];
        var dayNames = ["понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

        var scheduleMap = {};
        for (var d = 0; d < data.daysSchedule.length; d++) {
            var day = data.daysSchedule[d];
            var dName = day.dayOfWeek.toLowerCase();
            scheduleMap[dName] = {};
            for (var s = 0; s < day.timeSlots.length; s++) {
                var slot = day.timeSlots[s];
                if (!scheduleMap[dName][slot.timeRange]) {
                    scheduleMap[dName][slot.timeRange] = [];
                }
                if (slot.subject && slot.subject.trim() !== "") {
                    scheduleMap[dName][slot.timeRange].push(slot);
                }
            }
        }

        var infoHtml = '<div class="group-info">';
        infoHtml += '<h3>' + currentTargetInfo.type + ': ' + currentTargetInfo.name + '</h3>';
        if (currentTargetInfo.type === 'Группа') {
            infoHtml += '<p>' + (data.specialty || '') + '</p>';
        }
        infoHtml += '<p>Неделя: ' + data.weekNumber + '</p>';
        infoHtml += '</div>';
        $container.append(infoHtml);

        var tableHtml = '<table class="schedule-table"><thead><tr>';
        tableHtml += '<th class="time-header">Время</th>';
        for (var i = 0; i < dayNames.length; i++) {
            tableHtml += '<th>' + dayNames[i].toUpperCase() + '</th>';
        }
        tableHtml += '</tr></thead><tbody>';

        for (var t = 0; t < timeSlots.length; t++) {
            var time = timeSlots[t];
            tableHtml += '<tr><td class="time-cell">' + time + '</td>';

            for (var dayIdx = 0; dayIdx < dayNames.length; dayIdx++) {
                var dayName = dayNames[dayIdx];
                var slots = scheduleMap[dayName] ? scheduleMap[dayName][time] : [];

                if (slots && slots.length > 0) {
                    tableHtml += '<td>';
                    for (var slotIdx = 0; slotIdx < slots.length; slotIdx++) {
                        var slot = slots[slotIdx];
                        var typeInfo = getLessonTypeInfo(slot.type);
                        
                        var groupsList = '';
                        for (var g = 0; g < slot.groups.length; g++) {
                            var gr = slot.groups[g];
                            if (gr.groupId) {
                                groupsList += '<a href="#" class="group-nav-link" data-id="' + gr.groupId + '" data-name="' + gr.groupNumber + '">' + gr.groupNumber + '</a>';
                            } else {
                                groupsList += '<span>' + gr.groupNumber + '</span>';
                            }
                            if (g < slot.groups.length - 1) {
                                groupsList += '<br>';
                            }
                        }

                        var teacherNameHtml = '';
                        if (slot.teacher && slot.teacher.teacherId) {
                            teacherNameHtml = '<a href="#" class="teacher-nav-link" data-id="' + slot.teacher.teacherId + '">' + slot.teacher.teacherName + '</a>';
                        } else if (slot.teacher && slot.teacher.teacherName) {
                            teacherNameHtml = '<span>' + slot.teacher.teacherName + '</span>';
                        } else {
                            teacherNameHtml = '<span>Не указан</span>';
                        }

                        tableHtml += '<div class="lesson-card">';
                        tableHtml += '<span class="badge ' + typeInfo.badgeClass + '">' + slot.type + '</span>';
                        tableHtml += '<div class="lesson-name">' + slot.subject + '</div>';
                        tableHtml += '<div class="lesson-details">';
                        tableHtml += '<div class="room">' + slot.room + '</div>';
                        tableHtml += '<div class="teacher">' + teacherNameHtml + '</div>';
                        tableHtml += '<div class="subgroups">' + groupsList + '</div>';
                        tableHtml += '</div></div>';
                    }
                    tableHtml += '</td>';
                } else {
                    var dayHasAny = false;
                    if (scheduleMap[dayName]) {
                        for (var key in scheduleMap[dayName]) {
                            if (scheduleMap[dayName][key].length > 0) {
                                dayHasAny = true;
                                break;
                            }
                        }
                    }
                    if (time === "08:00-09:35" && !dayHasAny) {
                        tableHtml += '<td class="empty-day-cell">Пар нет</td>';
                    } else {
                        tableHtml += '<td class="empty-day-cell"></td>';
                    }
                }
            }
            tableHtml += '</tr>';
        }

        tableHtml += '</tbody></table>';
        $container.append(tableHtml);
        $('#current-week-label').text('Неделя: ' + data.weekNumber);
    }

    function getLessonTypeInfo(type) {
        var t = type ? type.toLowerCase() : '';
        if (t.indexOf('лекц') !== -1) return { badgeClass: 'lec' };
        if (t.indexOf('лаб') !== -1) return { badgeClass: 'lab' };
        if (t.indexOf('прак') !== -1) return { badgeClass: 'prc' };
        return { badgeClass: 'prc' };
    }

    // события
    $('#btn-prev-week').on('click', function() {
        if (currentId && currentWeek) {
            if (currentType === 'group') {
                var groupName = '';
                for (var i = 0; i < initialGroupsData.length; i++) {
                    if (initialGroupsData[i].id == currentId) {
                        groupName = initialGroupsData[i].name;
                        break;
                    }
                }
                loadSchedule(currentId, currentType, currentWeek - 1, groupName);
            } else {
                loadSchedule(currentId, currentType, currentWeek - 1);
            }
        }
    });
    
    $('#btn-next-week').on('click', function() {
        if (currentId && currentWeek) {
            if (currentType === 'group') {
                var groupName = '';
                for (var i = 0; i < initialGroupsData.length; i++) {
                    if (initialGroupsData[i].id == currentId) {
                        groupName = initialGroupsData[i].name;
                        break;
                    }
                }
                loadSchedule(currentId, currentType, currentWeek + 1, groupName);
            } else {
                loadSchedule(currentId, currentType, currentWeek + 1);
            }
        }
    });

    $('#group-select').on('change', function() {
        var id = $(this).val();
        if (id) {
            var groupName = '';
            for (var i = 0; i < initialGroupsData.length; i++) {
                if (initialGroupsData[i].id == id) {
                    groupName = initialGroupsData[i].name;
                    break;
                }
            }
            loadSchedule(id, 'group', "", groupName);
        } else {
            $('#schedule-content').empty().hide();
            $('#empty-message').show();
            $('#current-week-label').text('Неделя: -');
        }
    });

    $(document).on('click', '.group-nav-link', function(e) {
        e.preventDefault();
        var id = $(this).data('id');
        var name = $(this).data('name');
        loadSchedule(id, 'group', currentWeek, name);
    });

    $(document).on('click', '.teacher-nav-link', function(e) {
        e.preventDefault();
        var id = $(this).data('id');
        loadSchedule(id, 'teacher', currentWeek);
    });

    initGroups();
    loadSchedule('1213641978', 'group', "", '6413-100503D');
});