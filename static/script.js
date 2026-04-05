$(document).ready(function() {
    let currentMode = 'group';
    let currentGroupId = null;
    let currentTeacherId = null;
    let currentSchedule = null;
    let currentWeek = null;
    
    function loadInstitutes() {
        $.ajax({
            url: '/api/institutes',
            method: 'GET',
            success: function(data) {
                let $select = $('#institute-select');
                $select.empty().append('<option value="">Выберите институт</option>');
                $.each(data.institutes || [], function(i, inst) {
                    $select.append('<option value="' + inst.id + '">' + inst.name + '</option>');
                });
            },
            error: function() {
                $('#status').text('Ошибка загрузки институтов').addClass('status--error');
            }
        });
    }
    
    $('#institute-select').on('change', function() {
        let instituteId = $(this).val();
        if (!instituteId) return;
        
        $('#course-select').prop('disabled', true).html('<option value="">Загрузка...</option>');
        $('#group-select').prop('disabled', true).html('<option value="">Сначала выберите курс</option>');
        
        $.ajax({
            url: '/api/groups',
            data: { institute_id: instituteId },
            success: function(data) {
                let $select = $('#course-select');
                $select.empty().append('<option value="">Выберите курс</option>');
                $.each(data.available_courses || [], function(i, course) {
                    $select.append('<option value="' + course + '">' + course + ' курс</option>');
                });
                $select.prop('disabled', false);
            }
        });
    });
    
    $('#course-select').on('change', function() {
        let instituteId = $('#institute-select').val();
        let course = $(this).val();
        if (!instituteId || !course) return;
        
        $('#group-select').prop('disabled', true).html('<option value="">Загрузка...</option>');
        
        $.ajax({
            url: '/api/groups',
            data: { institute_id: instituteId, course: course },
            success: function(data) {
                let $select = $('#group-select');
                $select.empty().append('<option value="">Выберите группу</option>');
                $.each(data.groups || [], function(i, group) {
                    $select.append('<option value="' + group.id + '">' + group.name + '</option>');
                });
                $select.prop('disabled', false);
            }
        });
    });
    
    $('#group-select').on('change', function() {
        currentGroupId = $(this).val();
        $('#show-group-btn').prop('disabled', !currentGroupId);
    });
    
    $('#show-group-btn').on('click', function() {
        if (currentGroupId) loadSchedule('group', currentGroupId);
    });
    
    let searchTimeout;
    $('#teacher-input').on('input', function() {
        let query = $(this).val().trim();
        clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            $('#teacher-suggestions').hide();
            $('#show-teacher-btn').prop('disabled', true);
            return;
        }
        
        searchTimeout = setTimeout(function() {
            $.ajax({
                url: '/api/teachers',
                data: { q: query },
                success: function(data) {
                    let $suggestions = $('#teacher-suggestions').empty();
                    $.each(data.teachers || [], function(i, teacher) {
                        $suggestions.append('<div data-id="' + teacher.id + '">' + teacher.name + '</div>');
                    });
                    $suggestions.show();
                }
            });
        }, 300);
    });
    
    $(document).on('click', '#teacher-suggestions div', function() {
        currentTeacherId = $(this).data('id');
        $('#teacher-input').val($(this).text());
        $('#teacher-suggestions').hide();
        $('#show-teacher-btn').prop('disabled', false);
    });
    
    $('#show-teacher-btn').on('click', function() {
        if (currentTeacherId) loadSchedule('teacher', currentTeacherId);
    });
    
    function loadSchedule(mode, id, week) {
        let url = mode === 'group' ? '/api/schedule/group' : '/api/schedule/teacher';
        let params = mode === 'group' ? { group_id: id } : { staff_id: id };
        if (week) params.week = week;
        
        currentWeek = week;
        $('#status').text('Загрузка...').removeClass('status--error').addClass('status--loading');
        $('#schedule-container').empty();
        
        $.ajax({
            url: url,
            data: params,
            success: function(data) {
                currentSchedule = data;
                $('#status').text('Расписание загружено').removeClass('status--loading').addClass('status--idle');
                updateWeekNav(data);
                renderTable(data);
            },
            error: function() {
                $('#status').text('Ошибка загрузки').removeClass('status--loading').addClass('status--error');
            }
        });
    }
    
    function updateWeekNav(schedule) {
        let weekText = schedule.week_label || (schedule.week_number ? schedule.week_number + ' неделя' : '—');
        $('#week-info').html(weekText);
        $('#prev-week-btn').prop('disabled', !schedule.prev_week);
        $('#next-week-btn').prop('disabled', !schedule.next_week);
        $('#week-navigation').show();
    }
    
    $('#prev-week-btn').click(function() {
        if (currentSchedule?.prev_week) {
            if (currentMode === 'group') loadSchedule('group', currentGroupId, currentSchedule.prev_week);
            else loadSchedule('teacher', currentTeacherId, currentSchedule.prev_week);
        }
    });
    
    $('#next-week-btn').click(function() {
        if (currentSchedule?.next_week) {
            if (currentMode === 'group') loadSchedule('group', currentGroupId, currentSchedule.next_week);
            else loadSchedule('teacher', currentTeacherId, currentSchedule.next_week);
        }
    });
    
    function renderTable(schedule) {
        let days = schedule.days || [];
        let timeSlots = schedule.time_slots || [];
        
        if (!days.length) {
            $('#schedule-container').html('<div class="empty-state">Нет данных</div>');
            return;
        }
        
        let html = '<table class="schedule-table"><thead><tr><th>Время</th>';
        $.each(days, function(i, day) {
            html += '<th>' + day.weekday + (day.date ? '<br><small>' + day.date + '</small>' : '') + '</th>';
        });
        html += '</tr></thead><tbody>';
        
        $.each(timeSlots, function(i, slot) {
            let timeStr = slot.time_start + '–' + slot.time_end;
            html += '<tr><td class="lesson-time">' + timeStr + '</td>';
            
            $.each(days, function(j, day) {
                let lessons = $.grep(day.lessons, function(l) {
                    return l.time_start === slot.time_start;
                });
                
                if (lessons.length) {
                    html += '<td>';
                    $.each(lessons, function(k, lesson) {
                        html += '<div class="lesson-card">';
                        html += '<div class="lesson-name">' + escapeHtml(lesson.subject) + '</div>';
                        if (lesson.lesson_type) html += '<span class="lesson-type">' + escapeHtml(lesson.lesson_type) + '</span>';
                        if (lesson.room) html += '<div class="lesson-room">ауд. ' + escapeHtml(lesson.room) + '</div>';
                        if (lesson.teachers && lesson.teachers.length) {
                            html += '<div class="lesson-teacher">' + escapeHtml(lesson.teachers[0].name) + '</div>';
                        }
                        html += '</div>';
                    });
                    html += '</td>';
                } else {
                    html += '<td class="no-lesson">—</td>';
                }
            });
            html += '</tr>';
        });
        
        html += '</tbody></table>';
        $('#schedule-container').html(html);
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return str.replace(/[&<>]/g, function(m) {
            if (m === '&') return '&amp;';
            if (m === '<') return '&lt;';
            if (m === '>') return '&gt;';
            return m;
        });
    }
    
    $('.mode-btn').click(function() {
        $('.mode-btn').removeClass('mode-btn--active');
        $(this).addClass('mode-btn--active');
        currentMode = $(this).data('mode');
        
        if (currentMode === 'group') {
            $('#group-mode').show();
            $('#teacher-mode').hide();
        } else {
            $('#group-mode').hide();
            $('#teacher-mode').show();
        }
        $('#week-navigation').hide();
        $('#schedule-container').empty();
    });
    
    $(document).on('click', '.lesson-teacher', function() {
        let name = $(this).text();
        $('#teacher-input').val(name);
        $('.mode-btn[data-mode="teacher"]').click();
        $('#teacher-suggestions').hide();
        $.ajax({
            url: '/api/teachers',
            data: { q: name },
            success: function(data) {
                if (data.teachers && data.teachers.length) {
                    currentTeacherId = data.teachers[0].id;
                    $('#show-teacher-btn').prop('disabled', false);
                }
            }
        });
    });
    
    loadInstitutes();
});