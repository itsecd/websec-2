(function() {
    'use strict';
    
    let currentState = {
        mode: 'group',
        groupId: null,
        teacherId: null,
        teacherName: null,
        currentSchedule: null
    };
    
    function loadInstitutes() {
        $('#instituteSelect').html('<option>Загрузка...</option>');
        
        $.get('/api/institutes')
            .done(function(response) {
                if (response.success && response.data) {
                    const institutes = response.data.institutes;
                    const $select = $('#instituteSelect');
                    $select.empty().append('<option value="">Выберите институт...</option>');
                    
                    institutes.forEach(function(inst) {
                        $select.append(`<option value="${inst.id}">${escapeHtml(inst.name)}</option>`);
                    });
                }
            })
            .fail(function() {
                $('#instituteSelect').html('<option>Ошибка</option>');
            });
    }
    
    function loadCourses(instituteId) {
        $('#courseSelect').prop('disabled', true).html('<option>Загрузка...</option>');
        
        $.get('/api/courses', { institute_id: instituteId })
            .done(function(response) {
                if (response.success && response.data) {
                    const courses = response.data.courses;
                    const $select = $('#courseSelect');
                    $select.empty().append('<option value="">Выберите курс...</option>');
                    
                    courses.forEach(function(course) {
                        $select.append(`<option value="${course}">${course} курс</option>`);
                    });
                    $select.prop('disabled', false);
                }
            });
    }
    
    function loadGroups(instituteId, course) {
        $('#groupSelect').prop('disabled', true).html('<option>Загрузка...</option>');
        $('#showScheduleBtn').prop('disabled', true);
        
        $.get('/api/groups', { institute_id: instituteId, course: course })
            .done(function(response) {
                if (response.success && response.data) {
                    const groups = response.data.groups;
                    const $select = $('#groupSelect');
                    $select.empty().append('<option value="">Выберите группу...</option>');
                    
                    groups.forEach(function(group) {
                        $select.append(`<option value="${group.id}">${escapeHtml(group.name)}</option>`);
                    });
                    $select.prop('disabled', false);
                }
            });
    }
    

    let searchTimeout;
    function initTeacherSearch() {
        const $input = $('#teacherInput');
        const $suggestions = $('#teacherSuggestions');
        let currentQuery = '';
        
        $input.on('input', function() {
            clearTimeout(searchTimeout);
            const query = $(this).val().trim();
            currentQuery = query;
            
            if (query.length < 2) {
                $suggestions.hide().empty();
                $('#showTeacherScheduleBtn').prop('disabled', true);
                currentState.teacherId = null;
                currentState.teacherName = null;
                return;
            }
            
            searchTimeout = setTimeout(function() {
                $.get('/api/teachers', { q: query })
                    .done(function(response) {
                        if (currentQuery !== query) return;
                        
                        if (response.success && response.data && response.data.teachers.length > 0) {
                            const teachers = response.data.teachers;
                            $suggestions.empty();
                            
                            teachers.slice(0, 10).forEach(function(teacher) {
                                $suggestions.append(`
                                    <div class="suggestion-item" data-id="${teacher.id}" data-name="${escapeHtml(teacher.name)}">
                                        <div class="suggestion-name">${escapeHtml(teacher.name)}</div>
                                        <div class="suggestion-meta">ID: ${teacher.id}</div>
                                    </div>
                                `);
                            });
                            $suggestions.show();
                        } else {
                            $suggestions.html('<div class="suggestion-item">Ничего не найдено</div>').show();
                        }
                    })
                    .fail(function() {
                        $suggestions.html('<div class="suggestion-item">Ошибка поиска</div>').show();
                    });
            }, 300);
        });
        
        $(document).on('click', '.suggestion-item[data-id]', function() {
            const id = $(this).data('id');
            const name = $(this).data('name');
            $('#teacherInput').val(name);
            currentState.teacherId = id;
            currentState.teacherName = name;
            $('#showTeacherScheduleBtn').prop('disabled', false);
            $('#teacherSuggestions').hide();
        });
        
        $(document).on('click', function(e) {
            if (!$(e.target).closest('.search-wrapper').length) {
                $('#teacherSuggestions').hide();
            }
        });
    }
    
    function loadSchedule() {
        const container = $('#scheduleContainer');
        container.html('<div class="placeholder"><div class="placeholder-icon">⏳</div><p>Загрузка расписания...</p></div>');
        
        let params = {};
        if (currentState.mode === 'group' && currentState.groupId) {
            params = { group_id: currentState.groupId };
        } else if (currentState.mode === 'teacher' && currentState.teacherId) {
            params = { staff_id: currentState.teacherId };
        } else {
            return;
        }
        
        if (currentState.currentWeek && currentState.currentWeek !== currentState.currentSchedule?.week_number) {
            params.week = currentState.currentWeek;
        }
        
        $.get('/api/schedule', params)
            .done(function(response) {
                if (response.success && response.data) {
                    currentState.currentSchedule = response.data;
                    renderSchedule(response.data);
                    updateWeekControls(response.data);
                } else {
                    container.html('<div class="placeholder"><div class="placeholder-icon">❌</div><p>Ошибка загрузки расписания</p></div>');
                }
            })
            .fail(function() {
                container.html('<div class="placeholder"><div class="placeholder-icon">❌</div><p>Ошибка соединения с сервером</p></div>');
            });
    }
    
    function loadScheduleWithWeek(week) {
        currentState.currentWeek = week;
        loadSchedule();
    }
    
    function updateWeekControls(schedule) {
        $('#weekControls').show();
        $('#entityName').text(schedule.entity_name);
        
        let weekText = schedule.week_label || `${schedule.week_number} неделя`;
        $('#weekBadge').text(weekText);
        
        const $weekSelect = $('#weekSelect');
        $weekSelect.empty();
        for (let w = 1; w <= 52; w++) {
            $weekSelect.append(`<option value="${w}" ${w === schedule.week_number ? 'selected' : ''}>${w} неделя</option>`);
        }
        
        $('#prevWeekBtn').prop('disabled', !schedule.prev_week);
        $('#nextWeekBtn').prop('disabled', !schedule.next_week);
    }
    
    function renderSchedule(schedule) {
        const days = schedule.days || [];
        const timeSlots = schedule.time_slots || [];
        
        if (days.length === 0 || timeSlots.length === 0) {
            $('#scheduleContainer').html('<div class="placeholder"><div class="placeholder-icon">📭</div><p>Нет занятий на эту неделю</p></div>');
            return;
        }
        
        const lessonsBySlot = {};
        days.forEach(function(day, dayIdx) {
            (day.lessons || []).forEach(function(lesson) {
                const key = `${lesson.time_start}|${lesson.time_end}`;
                if (!lessonsBySlot[key]) lessonsBySlot[key] = {};
                if (!lessonsBySlot[key][dayIdx]) lessonsBySlot[key][dayIdx] = [];
                lessonsBySlot[key][dayIdx].push(lesson);
            });
        });
        
        let headerHtml = '<div class="grid-header"><div class="grid-time-header">Время</div>';
        days.forEach(function(day) {
            headerHtml += `<div class="grid-day-header">
                <div class="day-name">${escapeHtml(day.weekday)}</div>
                <div class="day-date">${day.date || ''}</div>
            </div>`;
        });
        headerHtml += '</div>';
        
        let rowsHtml = '';
        timeSlots.forEach(function(slot) {
            const key = `${slot[0]}|${slot[1]}`;
            rowsHtml += `<div class="grid-row">
                <div class="grid-time-cell">
                    <div class="time-start">${escapeHtml(slot[0])}</div>
                    <div class="time-end">${escapeHtml(slot[1])}</div>
                </div>`;
            
            days.forEach(function(_, dayIdx) {
                const lessons = lessonsBySlot[key]?.[dayIdx] || [];
                rowsHtml += `<div class="grid-lesson-cell">`;
                lessons.forEach(function(lesson) {
                    rowsHtml += renderLessonCard(lesson);
                });
                rowsHtml += `</div>`;
            });
            
            rowsHtml += `</div>`;
        });
        
        $('#scheduleContainer').html(`<div class="schedule-grid">${headerHtml}${rowsHtml}</div>`);
    }
    
    function renderLessonCard(lesson) {
        const typeClass = getLessonTypeClass(lesson.lesson_type);
        
        let teachersHtml = '';
        if (lesson.teachers && lesson.teachers.length > 0) {
            teachersHtml = `<div class="lesson-details">👨‍🏫 ${lesson.teachers.map(function(t) { 
                if (t.staff_id) {
                    return `<a href="#" class="teacher-link" data-staff-id="${t.staff_id}" data-name="${escapeHtml(t.name)}">${escapeHtml(t.name)}</a>`;
                }
                return escapeHtml(t.name);
            }).join(', ')}</div>`;
        }
        
        let groupsHtml = '';
        if (lesson.groups && lesson.groups.length > 0) {
            groupsHtml = `<div class="lesson-details">👥 ${lesson.groups.map(function(g) { return escapeHtml(g.name); }).join(', ')}</div>`;
        }
        
        let roomHtml = '';
        if (lesson.room) {
            roomHtml = `<div class="lesson-details">🏛️ ${escapeHtml(lesson.room)}</div>`;
        }
        
        let subgroupHtml = '';
        if (lesson.subgroup) {
            subgroupHtml = `<span class="lesson-subgroup">(подгр. ${escapeHtml(lesson.subgroup)})</span>`;
        }
        
        return `<div class="lesson-card ${typeClass}">
            <div class="lesson-type">${escapeHtml(lesson.lesson_type)}${subgroupHtml}</div>
            <div class="lesson-subject">${escapeHtml(lesson.subject)}</div>
            ${roomHtml}
            ${teachersHtml}
            ${groupsHtml}
        </div>`;
    }
    
    function getLessonTypeClass(type) {
        const t = (type || '').toLowerCase();
        if (t.includes('лекция')) return 'lesson--lecture';
        if (t.includes('практика')) return 'lesson--practice';
        if (t.includes('лабораторная')) return 'lesson--lab';
        if (t.includes('экзамен')) return 'lesson--exam';
        if (t.includes('зачёт')) return 'lesson--credit';
        return '';
    }
    
    function escapeHtml(str) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
    
    function setMode(mode) {
        currentState.mode = mode;
        currentState.currentSchedule = null;
        currentState.currentWeek = null;
        
        $('#weekControls').hide();
        $('#scheduleContainer').html('<div class="placeholder"><div class="placeholder-icon">📋</div><p>Выберите группу или преподавателя</p></div>');
        
        if (mode === 'group') {
            $('#groupFilters').show();
            $('#teacherFilters').hide();
        } else {
            $('#groupFilters').hide();
            $('#teacherFilters').show();
            $('#teacherInput').focus();
        }
    }
    
    function initEvents() {
        $('.mode-btn').on('click', function() {
            const mode = $(this).data('mode');
            $('.mode-btn').removeClass('active');
            $(this).addClass('active');
            setMode(mode);
        });
        
        $('#instituteSelect').on('change', function() {
            const id = parseInt($(this).val());
            if (id) loadCourses(id);
            else {
                $('#courseSelect').prop('disabled', true).html('<option value="">Выберите институт</option>');
                $('#groupSelect').prop('disabled', true).html('<option value="">Сначала выберите курс</option>');
            }
        });
        
        $('#courseSelect').on('change', function() {
            const instituteId = parseInt($('#instituteSelect').val());
            const course = parseInt($(this).val());
            if (instituteId && course) loadGroups(instituteId, course);
            else {
                $('#groupSelect').prop('disabled', true).html('<option value="">Сначала выберите курс</option>');
            }
        });
        
        $('#groupSelect').on('change', function() {
            currentState.groupId = parseInt($(this).val());
            $('#showScheduleBtn').prop('disabled', !currentState.groupId);
        });
        
        $('#showScheduleBtn').on('click', function() {
            if (currentState.groupId) {
                currentState.currentWeek = null;
                loadSchedule();
            }
        });
        
        $('#showTeacherScheduleBtn').on('click', function() {
            if (currentState.teacherId) {
                currentState.currentWeek = null;
                loadSchedule();
            }
        });
        
        $('#prevWeekBtn').on('click', function() {
            if (currentState.currentSchedule && currentState.currentSchedule.prev_week) {
                loadScheduleWithWeek(currentState.currentSchedule.prev_week);
            }
        });
        
        $('#nextWeekBtn').on('click', function() {
            if (currentState.currentSchedule && currentState.currentSchedule.next_week) {
                loadScheduleWithWeek(currentState.currentSchedule.next_week);
            }
        });
        
        $('#weekSelect').on('change', function() {
            const week = parseInt($(this).val());
            if (week && week !== currentState.currentSchedule?.week_number) {
                loadScheduleWithWeek(week);
            }
        });
        
        $('#scheduleContainer').on('click', '.teacher-link', function(e) {
            e.preventDefault();
            const staffId = $(this).data('staff-id');
            const teacherName = $(this).data('name');
            
            if (staffId) {
                $('.mode-btn[data-mode="teacher"]').addClass('active');
                $('.mode-btn[data-mode="group"]').removeClass('active');
                
                currentState.mode = 'teacher';
                currentState.teacherId = staffId;
                currentState.teacherName = teacherName;
                currentState.currentWeek = null;
                
                $('#teacherInput').val(teacherName);
                $('#showTeacherScheduleBtn').prop('disabled', false);
                $('#groupFilters').hide();
                $('#teacherFilters').show();
                $('#weekControls').hide();
                
                loadSchedule();
            }
        });
    }
    
    $(function() {
        initEvents();
        initTeacherSearch();
        loadInstitutes();
        setMode('group');
    });
})();