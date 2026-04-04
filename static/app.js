(function () {
  "use strict";

  const state = {
    mode: "group",           
    instituteId: null,
    course: null,
    groupId: null,
    teacherId: null,
    week: null,
    schedule: null
  };

  function isMobile() {
    return window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  }

  function setStatus(type, text) {
    const $s = $("#status");
    $s.removeClass("status--idle status--loading status--error");
    if (type === "loading") $s.addClass("status--loading");
    if (type === "error") $s.addClass("status--error");
    if (type === "idle") $s.addClass("status--idle");
    $s.text(text);
  }

  function apiGet(url, data) {
    return $.ajax({
      url: url,
      method: "GET",
      data: data || {},
      dataType: "json",
      cache: false
    });
  }

  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  function resetWeekControls() {
    $("#weekControls").hide();
    $("#mobileDayControls").hide();
    $("#entityName").text("—");
    $("#weekLabel").text("—");
    $("#weekDates").text("");
    $("#weekSelect").empty();
    $("#prevWeekBtn").prop("disabled", true);
    $("#nextWeekBtn").prop("disabled", true);
  }

  function fillInstitutes() {
    setStatus("loading", "Загружаю список институтов/факультетов…");
    apiGet("/api/institutes")
      .done(function (resp) {
        const $sel = $("#instituteSelect");
        $sel.empty();
        $sel.append('<option value="">Выберите…</option>');
        resp.institutes.forEach(function (it) {
          $sel.append('<option value="' + it.id + '">' + escapeHtml(it.name) + "</option>");
        });
        $("#courseSelect").prop("disabled", true).empty().append('<option value="">Выберите институт</option>');
        $("#groupSelect").prop("disabled", true).empty().append('<option value="">Сначала выберите курс</option>');
        $("#showBtn").prop("disabled", true);
        setStatus("idle", "Выберите институт, курс и группу, затем нажмите «Показать».");
      })
      .fail(function (xhr) {
        setStatus("error", "Не удалось загрузить институты: " + describeXhr(xhr));
      });
  }

  function fillCourses(instituteId) {
    $("#courseSelect").prop("disabled", true).empty().append('<option value="">Загрузка…</option>');
    $("#groupSelect").prop("disabled", true).empty().append('<option value="">Сначала выберите курс</option>');
    $("#showBtn").prop("disabled", true);
    resetWeekControls();
    $("#scheduleContainer").empty();

    apiGet("/api/groups", { institute_id: instituteId })
      .done(function (resp) {
        const $course = $("#courseSelect");
        $course.empty();
        $course.append('<option value="">Выберите…</option>');

        (resp.available_courses || []).forEach(function (c) {
          $course.append('<option value="' + c + '">' + c + "</option>");
        });

        $course.prop("disabled", false);
        setStatus("idle", "Теперь выберите курс.");
      })
      .fail(function (xhr) {
        setStatus("error", "Не удалось загрузить курсы: " + describeXhr(xhr));
      });
  }

  function fillGroups(instituteId, course) {
    $("#groupSelect").prop("disabled", true).empty().append('<option value="">Загрузка…</option>');
    $("#showBtn").prop("disabled", true);
    resetWeekControls();
    $("#scheduleContainer").empty();

    apiGet("/api/groups", { institute_id: instituteId, course: course })
      .done(function (resp) {
        const $g = $("#groupSelect");
        $g.empty();
        $g.append('<option value="">Выберите…</option>');
        (resp.groups || []).forEach(function (gr) {
          $g.append('<option value="' + gr.id + '">' + escapeHtml(gr.name) + "</option>");
        });
        $g.prop("disabled", false);
        setStatus("idle", "Теперь выберите группу и нажмите «Показать».");
      })
      .fail(function (xhr) {
        setStatus("error", "Не удалось загрузить группы: " + describeXhr(xhr));
      });
  }

  function buildWeekSelect(currentWeek) {
    const $ws = $("#weekSelect");
    $ws.empty();

    for (let w = 0; w <= 52; w++) {
      const label = (w === 0) ? "0 (неделя 0)" : String(w);
      const opt = $('<option></option>').val(w).text(label);
      if (currentWeek === w) opt.prop("selected", true);
      $ws.append(opt);
    }
  }

  function updateWeekControls(schedule) {
    $("#weekControls").show();

    $("#entityName").text(schedule.entity_name || "—");
    $("#weekLabel").text(schedule.week_label || "—");
    $("#weekDates").text(schedule.week_dates ? ("(" + schedule.week_dates + ")") : "");

    const weekNum = (schedule.week_number != null) ? schedule.week_number : null;
    if ($("#weekSelect").children().length === 0) {
      buildWeekSelect(weekNum);
    } else {
      $("#weekSelect").val(weekNum);
    }

    $("#prevWeekBtn").prop("disabled", schedule.prev_week == null);
    $("#nextWeekBtn").prop("disabled", schedule.next_week == null);
  }

  function loadSchedule(mode, id, week) {
    setStatus("loading", "Загружаю расписание…");
    $("#scheduleContainer").empty();
    resetWeekControls();

    let url = "";
    const params = {};

    if (mode === "group") {
      url = "/api/schedule/group";
      params.group_id = id;
    } else {
      url = "/api/schedule/teacher";
      params.staff_id = id;
    }
    if (week != null && week !== "") params.week = week;

    apiGet(url, params)
      .done(function (resp) {
        state.schedule = resp;
        state.week = resp.week_number;
        updateWeekControls(resp);

        setStatus("idle", "Готово.");
        renderSchedule(resp);
      })
      .fail(function (xhr) {
        state.schedule = null;
        resetWeekControls();

        const isParseError = xhr.status === 500 || xhr.status === 502;
        const errorCode = xhr.responseJSON && (xhr.responseJSON.error || "");
        const isScheduleMissing =
          isParseError ||
          errorCode === "PARSE_ERROR" ||
          errorCode === "SSAU_HTTP_ERROR";

        if (isScheduleMissing) {
          setStatus("idle", "Расписание пока не введено!");
        } else {
          setStatus("error", "Не удалось загрузить расписание: " + describeXhr(xhr));
        }
      });
  }

  function renderSchedule(schedule) {
    const $c = $("#scheduleContainer");
    $c.empty();

    if (!schedule || !schedule.days || schedule.days.length === 0) {
      $c.append('<div class="status status--idle">Нет данных для отображения.</div>');
      return;
    }

    if (isMobile()) {
      $("#mobileDayControls").show();
      renderMobile(schedule, 0);
    } else {
      $("#mobileDayControls").hide();
      renderDesktop(schedule);
    }
  }

  function renderDesktop(schedule) {
    const days = schedule.days;
    const slots = schedule.time_slots || [];
    const map = buildLessonsMap(schedule);
    const slotList = slots.length ? slots : computeSlotsFromLessons(days);

    const todayStr = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric"
    });

    let html = '<div class="scheduleGrid">';

    html += '<div class="scheduleGrid__header">';
    html += '<div class="scheduleGrid__timeHead">Время</div>';
    days.forEach(function (d) {
      const isToday = d.date && d.date === todayStr;
      html += '<div class="scheduleGrid__dayHead' + (isToday ? ' dayHeader__today' : '') + '">';
      html += '<div class="dayHeader__name">' + escapeHtml(capitalize(d.weekday)) + '</div>';
      if (d.date) html += '<div class="dayHeader__date">' + escapeHtml(d.date) + '</div>';
      html += '</div>';
    });
    html += '</div>';

    slotList.forEach(function (slot) {
      const key = slot.time_start + "|" + slot.time_end;
      html += '<div class="scheduleGrid__row">';
      html += '<div class="scheduleGrid__timeCell">' +
        '<div class="timeCell__start">' + escapeHtml(slot.time_start) + '</div>' +
        '<div class="timeCell__end">' + escapeHtml(slot.time_end) + '</div>' +
        '</div>';

      for (let di = 0; di < days.length; di++) {
        const lessons = (map[di] && map[di][key]) ? map[di][key] : [];
        html += '<div class="scheduleGrid__cell">';
        if (lessons.length > 0) {
          html += '<div class="cellStack">';
          lessons.forEach(function (l) {
            html += lessonCardHtml(l);
          });
          html += '</div>';
        }
        html += '</div>';
      }

      html += '</div>';
    });

    html += '</div>';

    $("#scheduleContainer").append(html);
  }

  function renderMobile(schedule, initialDayIndex) {
    const days = schedule.days;
    const slotList = (schedule.time_slots && schedule.time_slots.length)
      ? schedule.time_slots
      : computeSlotsFromLessons(days);

    const $ds = $("#daySelect");
    $ds.empty();
    days.forEach(function (d, idx) {
      const dateShort = d.date ? d.date.substring(0, 5) : "";
      const label = shortWeekday(d.weekday) + (dateShort ? (" " + dateShort) : "");
      $ds.append($('<option></option>').val(idx).text(label));
    });

    $ds.val(initialDayIndex);

    function renderDay(dayIndex) {
      const day = days[dayIndex];
      const lessonsBySlot = {};
      (day.lessons || []).forEach(function (l) {
        const key = l.time_start + "|" + l.time_end;
        if (!lessonsBySlot[key]) lessonsBySlot[key] = [];
        lessonsBySlot[key].push(l);
      });

      let html = '<div class="dayView">';
      html += '<div class="dayBlock">';
      html += '<div class="dayBlock__header">' +
        '<div class="dayBlock__title">' + escapeHtml(capitalize(day.weekday)) + '</div>' +
        (day.date ? '<div class="dayBlock__date">' + escapeHtml(day.date) + '</div>' : '') +
        '</div>';

      slotList.forEach(function (slot) {
        const key = slot.time_start + "|" + slot.time_end;
        const lessons = lessonsBySlot[key] || [];
        html += '<div class="slot">';
        html += '<div class="slot__time"><b>' + escapeHtml(slot.time_start) + '</b><span>— ' + escapeHtml(slot.time_end) + '</span></div>';
        if (lessons.length === 0) {
          html += '<div class="status status--idle" style="box-shadow:none;border:none;padding:0;color:#9ca3af">Нет занятий</div>';
        } else {
          lessons.forEach(function (l) {
            html += lessonCardHtml(l);
          });
        }
        html += '</div>';
      });

      html += '</div></div>';

      $("#scheduleContainer").html(html);
    }

    renderDay(initialDayIndex);

    $ds.off("change").on("change", function () {
      const idx = parseInt($(this).val(), 10);
      renderDay(idx);
    });
  }

  function buildLessonsMap(schedule) {
    const map = {};
    (schedule.days || []).forEach(function (day, di) {
      map[di] = {};
      (day.lessons || []).forEach(function (l) {
        const key = l.time_start + "|" + l.time_end;
        if (!map[di][key]) map[di][key] = [];
        map[di][key].push(l);
      });

      Object.keys(map[di]).forEach(function (k) {
        map[di][k].sort(function (a, b) {
          const sa = (a.subgroup || "");
          const sb = (b.subgroup || "");
          if (sa === sb) return 0;
          return sa < sb ? -1 : 1;
        });
      });
    });
    return map;
  }

  function computeSlotsFromLessons(days) {
    const s = {};
    days.forEach(function (d) {
      (d.lessons || []).forEach(function (l) {
        const key = l.time_start + "|" + l.time_end;
        s[key] = { time_start: l.time_start, time_end: l.time_end };
      });
    });
    return Object.keys(s).map(function (k) { return s[k]; })
      .sort(function (a, b) { return (a.time_start || "").localeCompare(b.time_start || ""); });
  }

  function getLessonTypeClass(type) {
    const t = (type || "").toLowerCase();
    if (t.includes("лекц")) return "lesson--lecture";
    if (t.includes("практ")) return "lesson--practice";
    if (t.includes("лаб")) return "lesson--lab";
    if (t.includes("экза")) return "lesson--exam";
    if (t.includes("зачёт") || t.includes("зачет")) return "lesson--credit";
    if (t.includes("консульт")) return "lesson--consult";
    return "lesson--other";
  }

  function lessonCardHtml(l) {
    const typeClass = getLessonTypeClass(l.lesson_type);
    const type = l.lesson_type ? escapeHtml(l.lesson_type) : "—";
    const room = l.room ? escapeHtml(l.room) : "—";

    const subgroup = l.subgroup
      ? '<span class="lessonSubgroup">Подгруппа\u00a0' + escapeHtml(l.subgroup) + '</span>'
      : '';

    const teachersHtml = (l.teachers || []).map(function (t) {
      if (t.staff_id) {
        return '<a href="#" class="teacherLink" data-staff-id="' + t.staff_id + '">' + escapeHtml(t.name) + '</a>';
      }
      return '<span>' + escapeHtml(t.name) + '</span>';
    }).join(", ");

    const filteredGroups = (l.groups || []).filter(function (g) {
      return !/подгрупп/i.test(g.name);
    });

    let groupsHtml = '';
    if (filteredGroups.length > 0) {
      groupsHtml = '<div class="groupList">' +
        filteredGroups.map(function (g) {
          const attr = g.group_id ? ' data-group-id="' + g.group_id + '"' : '';
          return '<span class="groupChip"' + attr + '>' + escapeHtml(g.name) + '</span>';
        }).join('') +
        '</div>';
    }

    let meta = '';
    meta += '<span class="metaItem"><b>Ауд.</b>\u00a0' + room + '</span>';
    if (teachersHtml) meta += '<span class="metaItem"><b>Преп.</b>\u00a0' + teachersHtml + '</span>';
    if (groupsHtml) {
      meta += '<div class="metaItem metaItem--groups"><b>Группы</b>' + groupsHtml + '</div>';
    }

    const comment = l.comment ? ('<div class="lessonCard__comment">' + escapeHtml(l.comment) + '</div>') : '';

    return '' +
      '<div class="lessonCard ' + typeClass + '">' +
      '<div class="lessonCard__top">' +
      '<span class="lessonType">' + type + '</span>' +
      subgroup +
      '</div>' +
      '<div class="lessonCard__subject">' + escapeHtml(l.subject || "—") + '</div>' +
      '<div class="lessonCard__meta">' + meta + '</div>' +
      comment +
      '</div>';
  }

  function shortWeekday(w) {
    const x = (w || "").toLowerCase();
    if (x.startsWith("пон")) return "пн";
    if (x.startsWith("вто")) return "вт";
    if (x.startsWith("сре")) return "ср";
    if (x.startsWith("чет")) return "чт";
    if (x.startsWith("пят")) return "пт";
    if (x.startsWith("суб")) return "сб";
    if (x.startsWith("вос")) return "вс";
    return w || "";
  }

  function capitalize(s) {
    s = s || "";
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function describeXhr(xhr) {
    try {
      if (xhr.responseJSON && xhr.responseJSON.detail) return xhr.responseJSON.detail;
      if (xhr.responseJSON && xhr.responseJSON.error) return xhr.responseJSON.error;
      if (xhr.responseText) return xhr.responseText;
      return (xhr.status ? ("HTTP " + xhr.status) : "network error");
    } catch (e) {
      return "network error";
    }
  }

  function setMode(mode) {
    state.mode = mode;
    state.schedule = null;
    state.week = null;
    resetWeekControls();
    $("#scheduleContainer").empty();

    if (mode === "group") {
      $("#filtersGroup").show();
      $("#filtersTeacher").hide();
      setStatus("idle", "Выберите институт, курс и группу, затем нажмите «Показать».");
    } else {
      $("#filtersGroup").hide();
      $("#filtersTeacher").show();
      setStatus("idle", "Начните вводить фамилию преподавателя и выберите из списка.");
    }
  }

  function initTeacherSearch() {
    const $input = $("#teacherInput");
    const $hid = $("#teacherId");
    const $btn = $("#showTeacherBtn");
    const $box = $("#teacherSuggest");

    const doSearch = debounce(function (text) {
      text = (text || "").trim();
      if (text.length < 2) {
        $box.hide().empty();
        $btn.prop("disabled", true);
        $hid.val("");
        return;
      }

      apiGet("/api/teachers", { q: text })
        .done(function (resp) {
          const teachers = resp.teachers || [];
          $box.empty();

          if (teachers.length === 0) {
            $box.append('<div class="teacherSuggest__item"><div>Ничего не найдено</div><div class="teacherSuggest__meta">Попробуйте другую строку</div></div>');
            $box.show();
            return;
          }

          teachers.slice(0, 20).forEach(function (t) {
            const $it = $('<div class="teacherSuggest__item"></div>');
            $it.append('<div><b>' + escapeHtml(t.name) + '</b></div>');
            $it.append('<div class="teacherSuggest__meta">staffId: ' + t.id + '</div>');
            $it.on("click", function () {
              $input.val(t.name);
              $hid.val(t.id);
              $btn.prop("disabled", false);
              $box.hide().empty();
            });
            $box.append($it);
          });

          $box.show();
        })
        .fail(function (xhr) {
          $box.empty().append('<div class="teacherSuggest__item"><div>Ошибка поиска</div><div class="teacherSuggest__meta">' + escapeHtml(describeXhr(xhr)) + '</div></div>').show();
        });
    }, 250);

    $input.on("input", function () {
      $hid.val("");
      $btn.prop("disabled", true);
      doSearch($input.val());
    });

    $(document).on("click", function (e) {
      if ($(e.target).closest(".teacherSearch").length === 0) {
        $box.hide().empty();
      }
    });

    $("#showTeacherBtn").on("click", function () {
      const tid = parseInt($hid.val(), 10);
      if (!tid) return;
      state.teacherId = tid;
      loadSchedule("teacher", tid, null);
    });
  }

  function initEvents() {
    $('input[name="mode"]').on("change", function () {
      const m = $('input[name="mode"]:checked').val();
      setMode(m);
    });

    $("#instituteSelect").on("change", function () {
      const id = parseInt($(this).val(), 10);
      state.instituteId = isNaN(id) ? null : id;
      state.course = null;
      state.groupId = null;
      if (!state.instituteId) {
        $("#courseSelect").prop("disabled", true).empty().append('<option value="">Выберите институт</option>');
        $("#groupSelect").prop("disabled", true).empty().append('<option value="">Сначала выберите курс</option>');
        $("#showBtn").prop("disabled", true);
        return;
      }
      fillCourses(state.instituteId);
    });

    $("#courseSelect").on("change", function () {
      const c = parseInt($(this).val(), 10);
      state.course = isNaN(c) ? null : c;
      state.groupId = null;
      if (state.instituteId && state.course != null) {
        fillGroups(state.instituteId, state.course);
      } else {
        $("#groupSelect").prop("disabled", true).empty().append('<option value="">Сначала выберите курс</option>');
        $("#showBtn").prop("disabled", true);
      }
    });

    $("#groupSelect").on("change", function () {
      const g = parseInt($(this).val(), 10);
      state.groupId = isNaN(g) ? null : g;
      $("#showBtn").prop("disabled", !state.groupId);
    });

    $("#showBtn").on("click", function () {
      if (!state.groupId) return;
      loadSchedule("group", state.groupId, null);
    });

    $("#prevWeekBtn").on("click", function () {
      if (!state.schedule) return;
      const w = state.schedule.prev_week;
      if (w == null) return;
      if (state.mode === "group") loadSchedule("group", state.groupId, w);
      else loadSchedule("teacher", state.teacherId, w);
    });

    $("#nextWeekBtn").on("click", function () {
      if (!state.schedule) return;
      const w = state.schedule.next_week;
      if (w == null) return;
      if (state.mode === "group") loadSchedule("group", state.groupId, w);
      else loadSchedule("teacher", state.teacherId, w);
    });

    $("#weekSelect").on("change", function () {
      const w = parseInt($(this).val(), 10);
      if (!state.schedule || isNaN(w)) return;
      if (state.mode === "group") loadSchedule("group", state.groupId, w);
      else loadSchedule("teacher", state.teacherId, w);
    });

    $("#scheduleContainer").on("click", "a.teacherLink", function (e) {
      e.preventDefault();
      const staffId = parseInt($(this).attr("data-staff-id"), 10);
      if (!staffId) return;

      $('input[name="mode"][value="teacher"]').prop("checked", true);
      setMode("teacher");

      $("#teacherInput").val($(this).text());
      $("#teacherId").val(staffId);
      $("#showTeacherBtn").prop("disabled", false);

      const currentWeek = state.schedule ? state.schedule.week_number : null;
      state.teacherId = staffId;
      loadSchedule("teacher", staffId, currentWeek);
    });

    let lastMobile = isMobile();
    $(window).on("resize", debounce(function () {
      const nowMobile = isMobile();
      if (nowMobile !== lastMobile && state.schedule) {
        lastMobile = nowMobile;
        renderSchedule(state.schedule);
      }
    }, 150));
  }

  $(function () {
    setMode("group");
    initTeacherSearch();
    initEvents();
    fillInstitutes();
  });
})();
