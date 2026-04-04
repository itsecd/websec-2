$(function () {

  const state = {
    mode: 'group',
    currentId: null,
    currentName: null,
    currentWeek: null,
    lastData: null,
    searchTimer: null,
    activeDayIndex: 0,
  };

  const $stateEmpty   = $('#state-empty');
  const $stateLoading = $('#state-loading');
  const $stateError   = $('#state-error');
  const $scheduleWrap = $('#schedule-container');
  const $title        = $('#schedule-title');
  const $metaType     = $('#meta-type');
  const $metaWeek     = $('#meta-week');
  const $thead        = $('#schedule-thead');
  const $tbody        = $('#schedule-tbody');
  const $dayTabsBar   = $('#day-tabs-bar');
  const $dayCardsWrap = $('#day-cards-wrap');
  const $weekSelect   = $('#week-select');
  const $errorTitle   = $('#error-title');
  const $errorDesc    = $('#error-desc');

  for (let w = 1; w <= 52; w++) {
    $weekSelect.append($('<option>').val(w).text('Неделя ' + w));
  }

  function setMode(mode) {
    state.mode = mode;
    $('[data-mode]').removeClass('active');
    $('[data-mode="' + mode + '"]').addClass('active');
    $('#search-input, #search-input-mobile')
      .val('')
      .attr('placeholder', mode === 'group' ? 'Поиск группы…' : 'Поиск преподавателя…');
    closeDropdowns();
  }

  $(document).on('click', '.mode-tab', function () {
    setMode($(this).data('mode'));
  });

  $('#mobile-menu-btn').on('click', function () {
    const $panel = $('#mobile-panel');
    const open = $panel.hasClass('open');
    $panel.toggleClass('open');
    $(this).attr('aria-expanded', !open);
  });

  function doSearch(inputEl, dropdownEl) {
    const q = $(inputEl).val().trim();
    if (q.length < 2) {
      $(dropdownEl).removeClass('open').empty();
      return;
    }
    clearTimeout(state.searchTimer);
    state.searchTimer = setTimeout(function () {
      $.ajax({
        url: '/api/search',
        data: { q: q },
        success: function (items) {
          renderDropdown(items, dropdownEl);
        },
        error: function () {
          $(dropdownEl).removeClass('open').empty();
        },
      });
    }, 280);
  }

  function renderDropdown(items, dropdownEl) {
    const $dd = $(dropdownEl);
    $dd.empty();

    if (!items || items.length === 0) {
      $dd.append('<li class="no-results">Ничего не найдено</li>');
      $dd.addClass('open');
      return;
    }

    $.each(items, function (_, item) {
      const id   = item.id    || item.value || '';
      const name = item.name  || item.label || item.text || '';
      const type = (item.type === 'staff' || item.type === 'teacher') ? 'teacher' : 'group';

      const iconClass  = type === 'teacher' ? 'teacher' : 'group';
      const iconSymbol = type === 'teacher'
        ? '<i class="fa-solid fa-chalkboard-user"></i>'
        : '<i class="fa-solid fa-users"></i>';
      const typeLabel  = type === 'teacher' ? 'Преподаватель' : 'Группа';

      const $li = $('<li>')
        .attr('role', 'option')
        .append('<span class="item-icon ' + iconClass + '">' + iconSymbol + '</span>')
        .append('<span class="item-name">' + escapeHtml(name) + '</span>')
        .append('<span class="item-type">' + typeLabel + '</span>')
        .on('click', function () {
          loadSchedule(type, id, name, null);
          $dd.removeClass('open');
          $('#search-input, #search-input-mobile').val(name);
          $('#mobile-panel').removeClass('open');
        });

      $dd.append($li);
    });

    $dd.addClass('open');
  }

  $('#search-input').on('input', function () {
    toggleClearBtn(this);
    doSearch(this, '#search-dropdown');
  });

  $('#search-input-mobile').on('input', function () {
    doSearch(this, '#search-dropdown-mobile');
  });

  $('#search-clear').on('click', function () {
    $('#search-input').val('');
    $('#search-dropdown').removeClass('open').empty();
    $(this).hide();
  });

  function toggleClearBtn(inputEl) {
    $(inputEl).val().length > 0 ? $('#search-clear').show() : $('#search-clear').hide();
  }

  $('#search-input, #search-input-mobile').on('keydown', function (e) {
    const $dd       = $(this).is('#search-input') ? $('#search-dropdown') : $('#search-dropdown-mobile');
    const $items    = $dd.find('li:not(.no-results)');
    const $active   = $items.filter('.highlighted');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      $items.removeClass('highlighted');
      ($active.length ? $active.next() : $items.first()).addClass('highlighted');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      $items.removeClass('highlighted');
      ($active.length ? $active.prev() : $items.last()).addClass('highlighted');
    } else if (e.key === 'Enter' && $active.length) {
      e.preventDefault();
      $active.trigger('click');
    } else if (e.key === 'Escape') {
      $dd.removeClass('open');
    }
  });

  $(document).on('click', function (e) {
    if (!$(e.target).closest('.search-box').length) {
      closeDropdowns();
    }
  });

  function closeDropdowns() {
    $('.search-dropdown').removeClass('open').empty();
  }

  $('#btn-prev-week').on('click', function () {
    if (state.currentId && state.lastData) {
      loadSchedule(state.mode, state.currentId, state.currentName, state.lastData.prevWeek);
    }
  });

  $('#btn-next-week').on('click', function () {
    if (state.currentId && state.lastData) {
      loadSchedule(state.mode, state.currentId, state.currentName, state.lastData.nextWeek);
    }
  });

  $('#btn-current-week').on('click', function () {
    if (state.currentId) {
      loadSchedule(state.mode, state.currentId, state.currentName, null);
    }
  });

  $weekSelect.on('change', function () {
    if (state.currentId) {
      loadSchedule(state.mode, state.currentId, state.currentName, parseInt($(this).val(), 10));
    }
  });

  $('#btn-retry').on('click', function () {
    if (state.currentId) {
      loadSchedule(state.mode, state.currentId, state.currentName, state.currentWeek);
    }
  });

  function loadSchedule(type, id, name, week) {
    state.mode        = type;
    state.currentId   = id;
    state.currentName = name;
    state.currentWeek = week;

    showState('loading');

    const params = { type: type, id: id };
    if (week) params.week = week;

    $.ajax({
      url: '/api/schedule',
      data: params,
      success: function (data) {
        state.lastData    = data;
        state.currentWeek = data.week;
        renderSchedule(data, type, name);
        showState('schedule');
      },
      error: function (xhr) {
        const msg = xhr.responseJSON ? xhr.responseJSON.error : 'Ошибка сервера';
        showError('Не удалось загрузить расписание', msg);
      },
    });
  }

  function showState(which) {
    [$stateEmpty, $stateLoading, $stateError, $scheduleWrap].forEach(function ($el) {
      $el.addClass('js-hidden');
    });
    ({ empty: $stateEmpty, loading: $stateLoading, error: $stateError, schedule: $scheduleWrap })[which]
      .removeClass('js-hidden');
  }

  function showError(title, desc) {
    $errorTitle.text(title);
    $errorDesc.text(desc || '');
    showState('error');
  }

  function renderSchedule(data, type, selectedName) {
    const entityName = data.entityName || selectedName || 'Расписание';

    $title.text(entityName);

    if (type === 'teacher') {
      $metaType.removeClass('group').addClass('teacher')
        .html('<i class="fa-solid fa-chalkboard-user"></i> Преподаватель');
    } else {
      $metaType.removeClass('teacher').addClass('group')
        .html('<i class="fa-solid fa-users"></i> Группа');
    }

    $metaWeek.text('Неделя ' + data.week + (data.weekDate ? ' · ' + data.weekDate : ''));
    $weekSelect.val(data.week);

    renderTable(data);
    renderDayCards(data);
    renderDayTabs(data);
  }

  function renderTable(data) {
    $thead.empty();
    $tbody.empty();

    const today = getTodayDateStr();
    const $headerRow = $('<tr>');
    $headerRow.append('<th><span class="th-day-name">Время</span></th>');

    $.each(data.days, function (_, day) {
      const isToday = day.date === today;
      const $th = $('<th>').toggleClass('th-today', isToday)
        .append($('<span class="th-day-name">').text(capitalize(day.weekday)))
        .append($('<span class="th-day-date">').text(day.date));
      $headerRow.append($th);
    });
    $thead.append($headerRow);

    $.each(data.grid, function (rowIdx, row) {
      const timeStr = data.timeSlots[rowIdx] || '—';
      const pairNum = rowIdx + 1;
      const $tr     = $('<tr>');

      $tr.append(
        $('<td>').append(
          $('<div class="time-slot">')
            .append($('<div class="time-pair">').text(pairNum + ' пара'))
            .append($('<div class="time-range">').text(timeStr))
        )
      );

      $.each(row, function (_, lessons) {
        const $td = $('<td>');
        if (lessons && lessons.length > 0) {
          $.each(lessons, function (_, lesson) {
            $td.append(buildLessonCard(lesson));
          });
        } else {
          $td.append('<div class="cell-empty"></div>');
        }
        $tr.append($td);
      });

      $tbody.append($tr);
    });
  }

  function renderDayCards(data) {
    $dayCardsWrap.empty();
    const today = getTodayDateStr();

    $.each(data.days, function (dayIdx, day) {
      const isToday = day.date === today;
      const $card   = $('<div class="day-card">')
        .toggleClass('today-card', isToday)
        .attr('data-day-index', dayIdx);

      $card.append(
        $('<div class="day-card-header">')
          .append($('<span>').text(capitalize(day.weekday)))
          .append($('<span class="day-date">').text(day.date))
      );

      let hasLessons = false;
      $.each(data.grid, function (rowIdx, row) {
        const lessons = row[dayIdx];
        if (!lessons || lessons.length === 0) return;

        hasLessons = true;
        const $slot      = $('<div class="day-slot">');
        const $slotTime  = $('<div class="slot-time">')
          .append($('<div class="time-pair">').text(rowIdx + 1))
          .append($('<div class="time-range">').text(data.timeSlots[rowIdx] || '—'));
        const $slotBody  = $('<div class="slot-lessons">');

        $.each(lessons, function (_, lesson) {
          $slotBody.append(buildLessonCard(lesson));
        });

        $card.append($slot.append($slotTime).append($slotBody));
      });

      if (!hasLessons) {
        $card.append(
          $('<div class="day-slot">').append(
            '<span style="color:var(--color-text-muted);font-size:.85rem">Занятий нет</span>'
          )
        );
      }

      $dayCardsWrap.append($card);
    });

    showDayCard(state.activeDayIndex);
  }

  function showDayCard(dayIdx) {
    state.activeDayIndex = dayIdx;
    $dayCardsWrap.find('.day-card').hide();
    $dayCardsWrap.find('.day-card[data-day-index="' + dayIdx + '"]').show();
    $dayTabsBar.find('.day-tab').removeClass('active');
    $dayTabsBar.find('.day-tab[data-day="' + dayIdx + '"]').addClass('active');
  }

  function renderDayTabs(data) {
    $dayTabsBar.empty();
    const today    = getTodayDateStr();
    let todayIdx   = 0;

    $.each(data.days, function (idx, day) {
      const isToday = day.date === today;
      if (isToday) todayIdx = idx;

      const $tab = $('<button class="day-tab" role="tab" type="button">')
        .attr('data-day', idx)
        .toggleClass('today', isToday)
        .append($('<span class="tab-day-name">').text(day.weekday ? day.weekday.slice(0, 2) : 'Д' + (idx + 1)))
        .append($('<span class="tab-day-date">').text(day.date ? day.date.split('.')[0] : ''));

      $tab.on('click', function () { showDayCard(idx); });
      $dayTabsBar.append($tab);
    });

    showDayCard(todayIdx);
  }

  function buildLessonCard(lesson) {
    const $card = $('<div class="lesson-card">').attr('data-type', lesson.typeNum || 0);

    if (lesson.typeText) {
      $card.append($('<div class="lesson-badge">').text(lesson.typeText));
    }

    $card.append($('<div class="lesson-subject">').text(lesson.subject || '—'));

    const $meta = $('<div class="lesson-meta">');

    if (lesson.teacher) {
      const $row = $('<div class="lesson-teacher">').append(
        '<i class="fa-solid fa-user" style="margin-right:4px;font-size:.65rem"></i>'
      );
      if (lesson.teacherId) {
        $('<a href="#">')
          .text(lesson.teacher)
          .on('click', function (e) {
            e.preventDefault();
            loadSchedule('teacher', lesson.teacherId, lesson.teacher, null);
            $('#search-input').val(lesson.teacher);
            toggleClearBtn($('#search-input')[0]);
          })
          .appendTo($row);
      } else {
        $row.append(lesson.teacher);
      }
      $meta.append($row);
    }

    if (lesson.room) {
      $meta.append(
        $('<div class="lesson-room">')
          .append('<i class="fa-solid fa-location-dot"></i> ')
          .append(lesson.room)
      );
    }

    if (lesson.subgroup) {
      $meta.append($('<div class="lesson-subgroup">').text(lesson.subgroup));
    }

    if (lesson.groups && lesson.groups.length > 0) {
      const $groups = $('<div class="lesson-groups">');
      $.each(lesson.groups, function (i, g) {
        if (i > 0) $groups.append(', ');
        $('<a href="#">')
          .text(g.name)
          .on('click', function (e) {
            e.preventDefault();
            loadSchedule('group', g.id, g.name, null);
            $('#search-input').val(g.name);
            toggleClearBtn($('#search-input')[0]);
          })
          .appendTo($groups);
      });
      $meta.append($groups);
    }

    $card.append($meta);
    return $card;
  }

  function capitalize(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }

  function escapeHtml(str) {
    return $('<div>').text(str).html();
  }

  function getTodayDateStr() {
    const d = new Date();
    return String(d.getDate()).padStart(2, '0') + '.'
      + String(d.getMonth() + 1).padStart(2, '0') + '.'
      + d.getFullYear();
  }

});
