(function () {
  "use strict";

  const state = {
    mode: "group",
    instituteId: null,
    course: null,
    groupId: null,
    staffId: null,
    week: null,
    schedule: null,
  };

  const WEEKDAY_SHORT = {
    пон: "пн",
    вто: "вт",
    сре: "ср",
    чет: "чт",
    пят: "пт",
    суб: "сб",
    вос: "вс",
  };

  const LESSON_BADGE_MAP = [
    [/лекц/i, "lesson-badge--lecture"],
    [/практ/i, "lesson-badge--practice"],
    [/лаб/i, "lesson-badge--lab"],
    [/экза/i, "lesson-badge--exam"],
    [/зач[eё]т/i, "lesson-badge--credit"],
    [/консульт/i, "lesson-badge--consult"],
  ];

  const isMobile = () => window.matchMedia("(max-width: 980px)").matches;

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setStatus(text) {
    $("#status").text(text);
  }

  function apiGet(url, data = {}) {
    return $.ajax({
      url,
      method: "GET",
      data,
      dataType: "json",
      cache: false,
    });
  }

  function badgeClass(lessonType) {
    const text = (lessonType || "").toLowerCase();
    const match = LESSON_BADGE_MAP.find(([re]) => re.test(text));
    return match ? match[1] : "lesson-badge--other";
  }

  function shortWeekday(name) {
    const prefix = (name || "").toLowerCase().slice(0, 3);
    return WEEKDAY_SHORT[prefix] ?? name ?? "";
  }

  function ensureWeekOptions() {
    const $weekSelect = $("#weekSelect");

    const hasNumericOptions = $weekSelect
      .find("option")
      .toArray()
      .some((option) => /^\d+$/.test(String(option.value)));

    if (hasNumericOptions) {
      return;
    }

    $weekSelect.empty();

    for (let week = 0; week <= 52; week++) {
      $weekSelect.append(
        $("<option>").val(String(week)).text(week === 0 ? "Неделя 0" : String(week))
      );
    }
  }

  function lessonCardHtml(lesson) {
    const teacher = lesson.teacher || "—";
    const room = lesson.room || "—";

    const subgroupHtml = lesson.subgroup
      ? `<span class="lesson-subgroup">Подгруппа ${escapeHtml(lesson.subgroup)}</span>`
      : "";

    const commentHtml = lesson.comment
      ? `<div class="lesson-card__comment">${escapeHtml(lesson.comment)}</div>`
      : "";

    return `
      <div class="lesson-card">
        <div class="lesson-card__top">
          <span class="lesson-badge ${badgeClass(lesson.lesson_type)}">${escapeHtml(lesson.lesson_type || "—")}</span>
          ${subgroupHtml}
        </div>
        <div class="lesson-card__subject">${escapeHtml(lesson.subject || "—")}</div>
        <div class="lesson-card__meta">
          <div><strong>Время:</strong> ${escapeHtml(lesson.time_start)} — ${escapeHtml(lesson.time_end)}</div>
          <div><strong>Преподаватель:</strong> ${escapeHtml(teacher)}</div>
          <div><strong>Аудитория:</strong> ${escapeHtml(room)}</div>
        </div>
        ${commentHtml}
      </div>
    `;
  }

  function buildLessonsMap(schedule) {
    const map = {};
    (schedule.days || []).forEach((day, dayIndex) => {
      map[dayIndex] = {};
      (day.lessons || []).forEach((lesson) => {
        const key = `${lesson.time_start}|${lesson.time_end}`;
        (map[dayIndex][key] ??= []).push(lesson);
      });
    });
    return map;
  }

  function computeSlotsFromLessons(days) {
    const seen = new Map();
    (days || []).forEach((day) => {
      (day.lessons || []).forEach((lesson) => {
        const key = `${lesson.time_start}|${lesson.time_end}`;
        if (!seen.has(key)) {
          seen.set(key, {
            time_start: lesson.time_start,
            time_end: lesson.time_end,
          });
        }
      });
    });
    return [...seen.values()].sort((a, b) => a.time_start.localeCompare(b.time_start));
  }

  function renderDesktop(schedule) {
    const days = schedule.days || [];
    const slots = schedule.time_slots?.length ? schedule.time_slots : computeSlotsFromLessons(days);
    const lessonMap = buildLessonsMap(schedule);

    const headerHtml = days.map((day) => `
      <div class="schedule-grid__day-head">
        <div class="day-name">${escapeHtml(day.weekday)}</div>
        <div class="day-date">${escapeHtml(day.date || "")}</div>
      </div>
    `).join("");

    const rowsHtml = slots.map((slot) => {
      const key = `${slot.time_start}|${slot.time_end}`;
      const cellsHtml = days.map((_, index) => {
        const lessons = lessonMap[index]?.[key] ?? [];
        return `
          <div class="schedule-grid__cell">
            <div class="cell-stack">
              ${lessons.map(lessonCardHtml).join("")}
            </div>
          </div>
        `;
      }).join("");

      return `
        <div class="schedule-grid__row">
          <div class="schedule-grid__time-cell">
            <div class="time-start">${escapeHtml(slot.time_start)}</div>
            <div class="time-end">${escapeHtml(slot.time_end)}</div>
          </div>
          ${cellsHtml}
        </div>
      `;
    }).join("");

    $("#scheduleContainer").html(`
      <div class="schedule-grid">
        <div class="schedule-grid__header">
          <div class="schedule-grid__time-head">Время</div>
          ${headerHtml}
        </div>
        ${rowsHtml}
      </div>
    `);
  }

  function renderMobile(schedule) {
    const days = schedule.days || [];
    const slots = schedule.time_slots?.length ? schedule.time_slots : computeSlotsFromLessons(days);

    const $daySelect = $("#daySelect").empty();
    days.forEach((day, index) => {
      const label = `${shortWeekday(day.weekday)} ${day.date ? day.date.slice(0, 5) : ""}`.trim();
      $daySelect.append(`<option value="${index}">${escapeHtml(label)}</option>`);
    });

    function renderDay(dayIndex) {
      const day = days[dayIndex];
      const lessonsBySlot = {};
      (day.lessons || []).forEach((lesson) => {
        const key = `${lesson.time_start}|${lesson.time_end}`;
        (lessonsBySlot[key] ??= []).push(lesson);
      });

      const slotsHtml = slots.map((slot) => {
        const key = `${slot.time_start}|${slot.time_end}`;
        const lessons = lessonsBySlot[key] || [];

        return `
          <div class="day-mobile__slot">
            <div class="day-mobile__time">${escapeHtml(slot.time_start)} — ${escapeHtml(slot.time_end)}</div>
            ${
              lessons.length
                ? lessons.map(lessonCardHtml).join("")
                : `<div class="empty-note">Нет занятий</div>`
            }
          </div>
        `;
      }).join("");

      $("#scheduleContainer").html(`
        <div class="day-mobile">
          <div class="day-mobile__block">
            <div class="day-mobile__head">
              <div class="day-mobile__title">${escapeHtml(day.weekday)}</div>
              <div class="day-mobile__date">${escapeHtml(day.date || "")}</div>
            </div>
            ${slotsHtml}
          </div>
        </div>
      `);
    }

    $("#mobileDayWrap").show();
    renderDay(0);

    $daySelect.off("change").on("change", function () {
      renderDay(parseInt($(this).val(), 10));
    });
  }

  function renderSchedule(schedule) {
    if (schedule.error) {
      $("#scheduleContainer").html(`<div class="status-box">Ошибка: ${escapeHtml(schedule.detail || schedule.error)}</div>`);
      return;
    }

    if (!schedule.days || !schedule.days.length) {
      $("#scheduleContainer").html(`<div class="status-box">Нет данных для отображения.</div>`);
      return;
    }

    $("#entityName").text(schedule.entity_name || "—");
    $("#weekLabel").text(schedule.week_label || "—");
    $("#weekDates").text(schedule.week_dates ? `(${schedule.week_dates})` : "");

    $("#prevWeekBtn").prop("disabled", schedule.prev_week == null);
    $("#nextWeekBtn").prop("disabled", schedule.next_week == null);

    ensureWeekOptions();

    if (schedule.week_number != null) {
      $("#weekSelect").val(String(schedule.week_number));
    }

    if (isMobile()) {
      renderMobile(schedule);
    } else {
      $("#mobileDayWrap").hide();
      renderDesktop(schedule);
    }
  }

  function loadInstitutes() {
    setStatus("Загружаю список институтов...");
    apiGet("/api/institutes")
      .done((response) => {
        const $select = $("#instituteSelect").empty().append(`<option value="">Выберите...</option>`);
        (response.institutes || []).forEach((item) => {
          $select.append(`<option value="${item.id}">${escapeHtml(item.name)}</option>`);
        });
        setStatus("Выберите институт, курс и группу.");
      })
      .fail((xhr) => {
        setStatus(`Ошибка загрузки институтов: ${xhr.responseText || xhr.status}`);
      });
  }

  function loadCourses(instituteId) {
    $("#courseSelect").prop("disabled", true).empty().append(`<option value="">Загрузка...</option>`);
    $("#groupSelect").prop("disabled", true).empty().append(`<option value="">Сначала выберите курс</option>`);
    $("#showGroupBtn").prop("disabled", true);

    apiGet("/api/groups", { institute_id: instituteId })
      .done((response) => {
        const $course = $("#courseSelect").empty().append(`<option value="">Выберите...</option>`);
        (response.available_courses || []).forEach((course) => {
          $course.append(`<option value="${course}">${course}</option>`);
        });
        $("#courseSelect").prop("disabled", false);
        setStatus("Теперь выберите курс.");
      })
      .fail((xhr) => {
        setStatus(`Ошибка загрузки курсов: ${xhr.responseText || xhr.status}`);
      });
  }

  function loadGroups(instituteId, course) {
    $("#groupSelect").prop("disabled", true).empty().append(`<option value="">Загрузка...</option>`);
    $("#showGroupBtn").prop("disabled", true);

    apiGet("/api/groups", { institute_id: instituteId, course })
      .done((response) => {
        const $group = $("#groupSelect").empty().append(`<option value="">Выберите...</option>`);
        (response.groups || []).forEach((group) => {
          $group.append(`<option value="${group.id}">${escapeHtml(group.name)}</option>`);
        });
        $("#groupSelect").prop("disabled", false);
        setStatus("Теперь выберите группу.");
      })
      .fail((xhr) => {
        setStatus(`Ошибка загрузки групп: ${xhr.responseText || xhr.status}`);
      });
  }

  function loadSchedule(mode, id, week = null) {
    setStatus("Загружаю расписание...");

    const url = mode === "group" ? "/api/schedule/group" : "/api/schedule/teacher";
    const params = mode === "group" ? { group_id: id } : { staff_id: id };
    if (week != null) {
      params.week = week;
    }

    apiGet(url, params)
      .done((response) => {
        state.schedule = response;
        state.week = response.week_number ?? null;
        renderSchedule(response);
        setStatus("Готово.");
      })
      .fail((xhr) => {
        const detail = xhr.responseJSON?.detail || xhr.responseText || `HTTP ${xhr.status}`;
        $("#scheduleContainer").html(`<div class="status-box">Ошибка: ${escapeHtml(detail)}</div>`);
        setStatus("Не удалось загрузить расписание.");
      });
  }

  function initTeacherSearch() {
    const $input = $("#teacherInput");
    const $hidden = $("#teacherId");
    const $button = $("#showTeacherBtn");
    const $box = $("#teacherSuggest");

    const doSearch = debounce((text) => {
      const value = (text || "").trim();
      if (value.length < 2) {
        $box.hide().empty();
        $hidden.val("");
        $button.prop("disabled", true);
        return;
      }

      apiGet("/api/teachers", { q: value })
        .done((response) => {
          const teachers = response.teachers || [];
          $box.empty();

          if (!teachers.length) {
            $box.html(`<div class="suggest-item">Ничего не найдено</div>`).show();
            return;
          }

          teachers.slice(0, 20).forEach((teacher) => {
            $(`
              <div class="suggest-item">
                <div><strong>${escapeHtml(teacher.name)}</strong></div>
                <div class="suggest-item__meta">staffId: ${teacher.id}</div>
              </div>
            `)
              .on("click", () => {
                $input.val(teacher.name);
                $hidden.val(teacher.id);
                $button.prop("disabled", false);
                $box.hide().empty();
              })
              .appendTo($box);
          });

          $box.show();
        })
        .fail((xhr) => {
          $box.html(`<div class="suggest-item">Ошибка поиска: ${escapeHtml(xhr.responseText || xhr.status)}</div>`).show();
        });
    }, 250);

    $input.on("input", function () {
      $hidden.val("");
      $button.prop("disabled", true);
      doSearch($(this).val());
    });

    $(document).on("click", (e) => {
      if (!$(e.target).closest(".suggest-wrap").length) {
        $box.hide().empty();
      }
    });

    $button.on("click", () => {
      const staffId = parseInt($hidden.val(), 10);
      if (!staffId) return;
      state.staffId = staffId;
      loadSchedule("teacher", staffId, null);
    });
  }

  function bindEvents() {
    $('input[name="mode"]').on("change", function () {
      state.mode = $('input[name="mode"]:checked').val();

      if (state.mode === "group") {
        $("#groupModePanel").show();
        $("#teacherModePanel").hide();
        setStatus("Выберите институт, курс и группу.");
      } else {
        $("#groupModePanel").hide();
        $("#teacherModePanel").show();
        setStatus("Введите фамилию преподавателя.");
      }
    });

    $("#instituteSelect").on("change", function () {
      const instituteId = parseInt($(this).val(), 10);
      state.instituteId = Number.isNaN(instituteId) ? null : instituteId;
      state.course = null;
      state.groupId = null;

      if (!state.instituteId) {
        $("#courseSelect").prop("disabled", true).empty().append(`<option value="">Сначала выберите институт</option>`);
        $("#groupSelect").prop("disabled", true).empty().append(`<option value="">Сначала выберите курс</option>`);
        $("#showGroupBtn").prop("disabled", true);
        return;
      }

      loadCourses(state.instituteId);
    });

    $("#courseSelect").on("change", function () {
      const course = parseInt($(this).val(), 10);
      state.course = Number.isNaN(course) ? null : course;
      state.groupId = null;

      if (state.instituteId && state.course != null) {
        loadGroups(state.instituteId, state.course);
      }
    });

    $("#groupSelect").on("change", function () {
      const groupId = parseInt($(this).val(), 10);
      state.groupId = Number.isNaN(groupId) ? null : groupId;
      $("#showGroupBtn").prop("disabled", !state.groupId);
    });

    $("#showGroupBtn").on("click", () => {
      if (!state.groupId) return;
      loadSchedule("group", state.groupId, null);
    });

    $("#prevWeekBtn").on("click", () => {
      if (state.schedule?.prev_week == null) return;
      const id = state.mode === "group" ? state.groupId : state.staffId;
      loadSchedule(state.mode, id, state.schedule.prev_week);
    });

    $("#nextWeekBtn").on("click", () => {
      if (state.schedule?.next_week == null) return;
      const id = state.mode === "group" ? state.groupId : state.staffId;
      loadSchedule(state.mode, id, state.schedule.next_week);
    });

    $("#weekSelect").on("change", function () {
      const week = parseInt($(this).val(), 10);
      const id = state.mode === "group" ? state.groupId : state.staffId;
      if (!id || Number.isNaN(week)) return;
      loadSchedule(state.mode, id, week);
    });

    $(window).on("resize", debounce(() => {
      if (state.schedule) {
        renderSchedule(state.schedule);
      }
    }, 150));
  }

  $(function () {
    loadInstitutes();
    initTeacherSearch();
    bindEvents();
  });
})();