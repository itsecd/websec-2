$(document).ready(function() {
    let currentMode = 'group';
    let currentGroupId = null;
    let currentTeacherId = null;
    let currentSchedule = null;
    
    function updateCurrentDate() {
        const now = new Date();
        const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
        const dateStr = now.toLocaleDateString('ru-RU', options);
        $('#current-date').text(dateStr);
    }
    updateCurrentDate();
    $('.mode-btn').on('click', function() {
        $('.mode-btn').removeClass('mode-btn--active');
        $(this).addClass('mode-btn--active');
        
        currentMode = $(this).data('mode');
        
        if (currentMode === 'group') {
            $('#group-mode').show();
            $('#teacher-mode').hide();
            $('#week-navigation').hide();
            $('#schedule-container').empty();
            $('#status').text('Выберите институт, курс и группу').removeClass('status--error').addClass('status--idle');
        } else {
            $('#group-mode').hide();
            $('#teacher-mode').show();
            $('#week-navigation').hide();
            $('#schedule-container').empty();
            $('#status').text('Начните вводить фамилию преподавателя').removeClass('status--error').addClass('status--idle');
        }
    });
    
    function loadInstitutes() {
        $.ajax({
            url: '/api/institutes',
            method: 'GET',
            success: function(data) {
                let $select = $('#institute-select');
                $select.empty().append('<option value="">Выберите институт</option>');
                $.each(data.institutes, function(i, inst) {
                    $select.append('<option value="' + inst.id + '">' + inst.name + '</option>');
                });
            },
            error: function() {
                $('#status').text('Ошибка загрузки институтов').removeClass('status--idle').addClass('status--error');
            }
        });
    }
    
    $('#institute-select').on('change', function() {
        let instituteId = $(this).val();
        if (!instituteId) return;
        
        $('#course-select').prop('disabled', true).html('<option value="">Загрузка...</option>');
        $('#group-select').prop('disabled', true).html('<option value="">Сначала выберите курс</option>');
        $('#show-group-btn').prop('disabled', true);
        
        $.ajax({
            url: '/api/groups',
            method: 'GET',
            data: { institute_id: instituteId },
            success: function(data) {
                let $select = $('#course-select');
                $select.empty().append('<option value="">Выберите курс</option>');
                $.each(data.available_courses, function(i, course) {
                    $select.append('<option value="' + course + '">' + course + ' курс</option>');
                });
                $select.prop('disabled', false);
            },
            error: function() {
                $('#status').text('Ошибка загрузки курсов').removeClass('status--idle').addClass('status--error');
            }
        });
    });
    
    $('#course-select').on('change', function() {
        let instituteId = $('#institute-select').val();
        let course = $(this).val();
        if (!instituteId || !course) return;
        
        $('#group-select').prop('disabled', true).html('<option value="">Загрузка...</option>');
        $('#show-group-btn').prop('disabled', true);
        
        $.ajax({
            url: '/api/groups',
            method: 'GET',
            data: { institute_id: instituteId, course: course },
            success: function(data) {
                let $select = $('#group-select');
                $select.empty().append('<option value="">Выберите группу</option>');
                $.each(data.groups, function(i, group) {
                    $select.append('<option value="' + group.id + '">' + group.name + '</option>');
                });
                $select.prop('disabled', false);
            },
            error: function() {
                $('#status').text('Ошибка загрузки групп').removeClass('status--idle').addClass('status--error');
            }
        });
    });
    
    $('#group-select').on('change', function() {
        currentGroupId = $(this).val();
        $('#show-group-btn').prop('disabled', !currentGroupId);
    });
    
    $('#show-group-btn').on('click', function() {
        if (currentGroupId) {
            loadSchedule('group', currentGroupId);
        }
    });
    
    let searchTimeout;
    $('#teacher-input').on('input', function() {
        let query = $(this).val().trim();
        
        if (searchTimeout) clearTimeout(searchTimeout);
        
        if (query.length < 2) {
            $('#teacher-suggestions').hide().empty();
            $('#show-teacher-btn').prop('disabled', true);
            return;
        }
        
        searchTimeout = setTimeout(function() {
            $.ajax({
                url: '/api/teachers',
                method: 'GET',
                data: { q: query },
                success: function(data) {
                    let $suggestions = $('#teacher-suggestions').empty();
                    if (data.teachers && data.teachers.length > 0) {
                        $.each(data.teachers.slice(0, 10), function(i, teacher) {
                            $suggestions.append('<div data-id="' + teacher.id + '">' + teacher.name + '</div>');
                        });
                        $suggestions.show();
                    } else {
                        $suggestions.append('<div>Ничего не найдено</div>').show();
                    }
                },
                error: function() {
                    $('#teacher-suggestions').html('<div>Ошибка поиска</div>').show();
                }
            });
        }, 300);
    });
    
    $(document).on('click', '#teacher-suggestions div', function() {
        let teacherId = $(this).data('id');
        let teacherName = $(this).text();
        $('#teacher-input').val(teacherName);
        $('#teacher-suggestions').hide();
        $('#show-teacher-btn').prop('disabled', false);
        currentTeacherId = teacherId;
    });
    
    $(document).on('click', function(e) {
        if (!$(e.target).closest('.search-wrapper').length) {
            $('#teacher-suggestions').hide();
        }
    });
    
    $('#show-teacher-btn').on('click', function() {
        if (currentTeacherId) {
            loadSchedule('teacher', currentTeacherId);
        }
    });
    
    function loadSchedule(mode, id, week) {
        let url = mode === 'group' ? '/api/schedule/group' : '/api/schedule/teacher';
        let params = mode === 'group' ? { group_id: id } : { staff_id: id };
        if (week !== undefined) params.week = week;
        
        $('#status').text('Загрузка расписания...').removeClass('status--idle status--error').addClass('status--loading');
        $('#schedule-container').empty();
        $('#week-navigation').hide();
        
        $.ajax({
            url: url,
            method: 'GET',
            data: params,
            success: function(data) {
                currentSchedule = data;
                $('#status').text('Готово').removeClass('status--loading').addClass('status--idle');
                updateWeekNavigation(data);
                renderSchedule(data);
            },
            error: function(xhr) {
                let errorMsg = 'Ошибка загрузки расписания';
                if (xhr.responseJSON && xhr.responseJSON.error) {
                    errorMsg = xhr.responseJSON.error;
                }
                $('#status').text(errorMsg).removeClass('status--loading').addClass('status--error');
            }
        });
    }
    
    function updateWeekNavigation(schedule) {
        $('#week-info').text(schedule.week_label || 'Неделя ' + schedule.week_number);
        if (schedule.week_dates) {
            $('#week-info').append(' <span class="week-dates">(' + schedule.week_dates + ')</span>');
        }
        
        $('#prev-week-btn').prop('disabled', schedule.prev_week === null);
        $('#next-week-btn').prop('disabled', schedule.next_week === null);
        
        let $weekSelect = $('#week-select').empty();
        for (let w = 0; w <= 52; w++) {
            $weekSelect.append('<option value="' + w + '"' + (w === schedule.week_number ? ' selected' : '') + '>Неделя ' + w + '</option>');
        }
        
        $('#week-navigation').show();
    }
    
    $('#prev-week-btn').on('click', function() {
        if (currentSchedule && currentSchedule.prev_week !== null) {
            if (currentMode === 'group' && currentGroupId) {
                loadSchedule('group', currentGroupId, currentSchedule.prev_week);
            } else if (currentMode === 'teacher' && currentTeacherId) {
                loadSchedule('teacher', currentTeacherId, currentSchedule.prev_week);
            }
        }
    });
    
    $('#next-week-btn').on('click', function() {
        if (currentSchedule && currentSchedule.next_week !== null) {
            if (currentMode === 'group' && currentGroupId) {
                loadSchedule('group', currentGroupId, currentSchedule.next_week);
            } else if (currentMode === 'teacher' && currentTeacherId) {
                loadSchedule('teacher', currentTeacherId, currentSchedule.next_week);
            }
        }
    });
    
    $('#week-select').on('change', function() {
        let week = parseInt($(this).val());
        if (currentMode === 'group' && currentGroupId) {
            loadSchedule('group', currentGroupId, week);
        } else if (currentMode === 'teacher' && currentTeacherId) {
            loadSchedule('teacher', currentTeacherId, week);
        }
    });
    
    function renderSchedule(schedule) {
        let isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            renderMobile(schedule);
        } else {
            renderDesktop(schedule);
        }
    }
    
    function renderDesktop(schedule) {
        let days = schedule.days;
        let timeSlots = schedule.time_slots;
        
        let headersHtml = '<div class="schedule-grid__time-head">Время</div>';
        $.each(days, function(i, day) {
            let dateHtml = day.date ? '<div class="day-date">' + day.date + '</div>' : '';
            headersHtml += '<div class="schedule-grid__day-head">' + day.weekday + dateHtml + '</div>';
        });
        
        let rowsHtml = '';
        $.each(timeSlots, function(slotIdx, slot) {
            let timeStr = slot.time_start + '–' + slot.time_end;
            let rowHtml = '<div class="schedule-grid__row">';
            rowHtml += '<div class="schedule-grid__time-cell">' + timeStr + '</div>';
            
            $.each(days, function(dayIdx, day) {
                let lessonsInSlot = $.grep(day.lessons, function(l) {
                    return l.time_start === slot.time_start && l.time_end === slot.time_end;
                });
                
                let cellHtml = '<div class="schedule-grid__cell">';
                $.each(lessonsInSlot, function(i, lesson) {
                    cellHtml += renderLessonCard(lesson);
                });
                cellHtml += '</div>';
                rowHtml += cellHtml;
            });
            
            rowHtml += '</div>';
            rowsHtml += rowHtml;
        });
        
        let fullHtml = '<div class="schedule-grid"><div class="schedule-grid__header">' + headersHtml + '</div>' + rowsHtml + '</div>';
        $('#schedule-container').html(fullHtml);
    }
    
    function renderMobile(schedule) {
        let days = schedule.days;
        let currentDayIndex = getCurrentDayIndex(days);
        
        if (currentDayIndex === -1) {
            currentDayIndex = 0;
        }
        
        let dayNavHtml = '<div class="mobile-day-nav">';
        dayNavHtml += '<button id="mobile-prev-day" class="mobile-day-nav__btn" ' + (currentDayIndex <= 0 ? 'disabled' : '') + '>←</button>';
        dayNavHtml += '<span id="mobile-day-info" class="mobile-day-nav__info"></span>';
        dayNavHtml += '<button id="mobile-next-day" class="mobile-day-nav__btn" ' + (currentDayIndex >= days.length - 1 ? 'disabled' : '') + '>→</button>';
        dayNavHtml += '</div>';
        
        $('#schedule-container').html(dayNavHtml + '<div id="mobile-day-content"></div>');
        
        function renderDay(dayIndex) {
            let day = days[dayIndex];
            let dateHtml = day.date ? '<div class="mobile-day__date">' + day.date + '</div>' : '';
            
            let dayHtml = '<div class="mobile-day">';
            dayHtml += '<div class="mobile-day__header">' + day.weekday + dateHtml + '</div>';
            
            let lessonsByTime = {};
            $.each(day.lessons, function(j, lesson) {
                let timeKey = lesson.time_start + '-' + lesson.time_end;
                if (!lessonsByTime[timeKey]) lessonsByTime[timeKey] = [];
                lessonsByTime[timeKey].push(lesson);
            });
            
            if (Object.keys(lessonsByTime).length === 0) {
                dayHtml += '<div class="mobile-lesson"><div class="mobile-lesson__time">Нет занятий</div></div>';
            } else {
                $.each(lessonsByTime, function(timeKey, lessons) {
                    dayHtml += '<div class="mobile-lesson">';
                    dayHtml += '<div class="mobile-lesson__time">' + timeKey + '</div>';
                    $.each(lessons, function(k, lesson) {
                        dayHtml += '<div class="mobile-lesson__subject">' + escapeHtml(lesson.subject) + '</div>';
                        dayHtml += '<div class="mobile-lesson__type">' + lesson.lesson_type + '</div>';
                        if (lesson.room) {
                            dayHtml += '<div class="mobile-lesson__room">ауд. ' + escapeHtml(lesson.room) + '</div>';
                        }
                    });
                    dayHtml += '</div>';
                });
            }
            
            dayHtml += '</div>';
            
            $('#mobile-day-content').html(dayHtml);
            $('#mobile-day-info').text(day.weekday + ' ' + (day.date || ''));
            
            $('#mobile-prev-day').prop('disabled', dayIndex <= 0);
            $('#mobile-next-day').prop('disabled', dayIndex >= days.length - 1);
            
            $('#mobile-day-content').data('current-day', dayIndex);
        }
        
        renderDay(currentDayIndex);
        
        $(document).off('click', '#mobile-prev-day');
        $(document).off('click', '#mobile-next-day');
        
        $(document).on('click', '#mobile-prev-day', function() {
            let current = $('#mobile-day-content').data('current-day');
            if (current > 0) {
                renderDay(current - 1);
            }
        });
        
        $(document).on('click', '#mobile-next-day', function() {
            let current = $('#mobile-day-content').data('current-day');
            if (current < days.length - 1) {
                renderDay(current + 1);
            }
        });
    }

    function getCurrentDayIndex(days) {
        let today = new Date();
        let todayDayOfWeek = today.getDay();
        
        if (todayDayOfWeek === 0) {
            return -1;
        }
        
        let day = String(today.getDate()).padStart(2, '0');
        let month = String(today.getMonth() + 1).padStart(2, '0');
        let year = today.getFullYear();
        let todayStr = day + '.' + month + '.' + year;
        
        for (let i = 0; i < days.length; i++) {
            if (days[i].date === todayStr) {
                return i;
            }
        }
        
        return 0;
    }
    
    function renderLessonCard(lesson) {
        let typeClass = getTypeClass(lesson.lesson_type);
        let teachersHtml = '';
        $.each(lesson.teachers, function(i, teacher) {
            let teacherLink = '<span class="lesson-card__teacher" data-teacher-id="' + (teacher.staff_id || '') + '">' + escapeHtml(teacher.name) + '</span>';
            teachersHtml += (i > 0 ? ', ' : '') + teacherLink;
        });
        
        return '<div class="lesson-card ' + typeClass + '">' +
            '<div class="lesson-card__type">' + escapeHtml(lesson.lesson_type) + '</div>' +
            '<div class="lesson-card__subject">' + escapeHtml(lesson.subject) + '</div>' +
            (lesson.room ? '<div class="lesson-card__room">ауд. ' + escapeHtml(lesson.room) + '</div>' : '') +
            (teachersHtml ? '<div class="lesson-card__teacher">' + teachersHtml + '</div>' : '') +
            '</div>';
    }
    
    function getTypeClass(type) {
        let t = type.toLowerCase();
        if (t.includes('лекц')) return 'lesson--lecture';
        if (t.includes('практ')) return 'lesson--practice';
        if (t.includes('лабор')) return 'lesson--lab';
        if (t.includes('экза')) return 'lesson--exam';
        if (t.includes('зачёт') || t.includes('зачет')) return 'lesson--credit';
        return 'lesson--other';
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
    
    $(document).on('click', '.lesson-card__teacher', function() {
        let teacherId = $(this).data('teacher-id');
        let teacherName = $(this).text();
        if (teacherId) {
            $('.mode-btn[data-mode="teacher"]').click();
            $('#teacher-input').val(teacherName);
            currentTeacherId = teacherId;
            $('#show-teacher-btn').prop('disabled', false);
            loadSchedule('teacher', teacherId);
        }
    });
    
    let resizeTimeout;
    $(window).on('resize', function() {
        if (resizeTimeout) clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(function() {
            if (currentSchedule) {
                renderSchedule(currentSchedule);
            }
        }, 200);
    });
    
    loadInstitutes();
});