(function () {
  "use strict";

  const state = {
    mode: "group",
    instituteId: null,
    course: null,
    groupId: null,
    teacherId: null,
    week: null,
    schedule: null,
  };

  const LESSON_TYPE_MAP = [
    [/лекц/, "lesson--lecture"],
    [/практ/, "lesson--practice"],
    [/лаб/, "lesson--lab"],
    [/экза/, "lesson--exam"],
    [/зачёт|зачет/, "lesson--credit"],
    [/консульт/, "lesson--consult"],
  ];

  const WEEKDAY_SHORT = {
    пон: "пн", вто: "вт", сре: "ср",
    чет: "чт", пят: "пт", суб: "сб", вос: "вс",
  };

  const isMobile = () =>
    window.matchMedia?.("(max-width: 768px)").matches ?? false;

  function debounce(fn, ms) {
    let timer = null;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function capitalize(s) {
    if (!s) return "";
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function shortWeekday(w) {
    const prefix = (w || "").toLowerCase().slice(0, 3);
    return WEEKDAY_SHORT[prefix] ?? w ?? "";
  }

  function describeXhr(xhr) {
    try {
      return (
        xhr.responseJSON?.detail ||
        xhr.responseJSON?.error ||
        xhr.responseText ||
        (xhr.status ? `HTTP ${xhr.status}` : "network error")
      );
    } catch {
      return "network error";
    }
  }

  function apiGet(url, data = {}) {
    return $.ajax({ url, method: "GET", data, dataType: "json", cache: false });
  }

  function setStatus(type, text) {
    const $s = $("#status").removeClass("status--idle status--loading status--error");
    switch (type) {
      case "loading":
        $s.addClass("status--loading");
        break;
      case "error":
        $s.addClass("status--error");
        break;
      default: $s.addClass("status--idle");
    }
    $s.text(text);
  }

  function resetWeekControls() {
    $("#weekControls, #mobileDayControls").hide();
    $("#entityName").text("—");
    $("#weekLabel").text("—");
    $("#weekDates").text("");
    $("#weekSelect").empty();
    $("#prevWeekBtn, #nextWeekBtn").prop("disabled", true);
  }

  function buildWeekSelect(currentWeek) {
    const $ws = $("#weekSelect").empty();
    for (let w = 0; w <= 52; w++) {
      $ws.append(
        $("<option>").val(w).text(w === 0 ? "Неделя 0" : String(w)).prop("selected", w === currentWeek)
      );
    }
  }

  function updateWeekControls(schedule) {
    $("#weekControls").show();
    $("#entityName").text(schedule.entity_name || "—");
    $("#weekLabel").text(schedule.week_label || "—");
    $("#weekDates").text(schedule.week_dates ? `(${schedule.week_dates})` : "");

    const weekNum = schedule.week_number ?? null;
    if ($("#weekSelect").children().length === 0) {
      buildWeekSelect(weekNum);
    } else {
      $("#weekSelect").val(weekNum);
    }

    $("#prevWeekBtn").prop("disabled", schedule.prev_week == null);
    $("#nextWeekBtn").prop("disabled", schedule.next_week == null);
  }

  function setMode(mode) {
    state.mode = mode;
    state.schedule = null;
    state.week = null;
    resetWeekControls();
    $("#scheduleContainer").empty();

    switch (mode) {
      case "group":
        $("#filtersGroup").show();
        $("#filtersTeacher").hide();
        setStatus("idle", "Выберите институт, курс и группу, затем нажмите «Показать».");
        break;
      default:
        $("#filtersGroup").hide();
        $("#filtersTeacher").show();
        setStatus("idle", "Начните вводить фамилию преподавателя и выберите из списка.");
    }
  }

  function fillInstitutes() {
    setStatus("loading", "Загружаю список институтов/факультетов…");
    apiGet("/api/institutes")
      .done((resp) => {
        const $sel = $("#instituteSelect").empty().append('<option value="">Выберите…</option>');
        resp.institutes.forEach((it) =>
          $sel.append(`<option value="${it.id}">${escapeHtml(it.name)}</option>`)
        );
        $("#courseSelect").prop("disabled", true).empty().append('<option value="">Выберите институт</option>');
        $("#groupSelect").prop("disabled", true).empty().append('<option value="">Сначала выберите курс</option>');
        $("#showBtn").prop("disabled", true);
        setStatus("idle", "Выберите институт, курс и группу, затем нажмите «Показать».");
      })
      .fail((xhr) => setStatus("error", `Не удалось загрузить институты: ${describeXhr(xhr)}`));
  }

  function fillCourses(instituteId) {
    $("#courseSelect").prop("disabled", true).empty().append('<option value="">Загрузка…</option>');
    $("#groupSelect").prop("disabled", true).empty().append('<option value="">Сначала выберите курс</option>');
    $("#showBtn").prop("disabled", true);
    resetWeekControls();
    $("#scheduleContainer").empty();

    apiGet("/api/groups", { institute_id: instituteId })
      .done((resp) => {
        const $course = $("#courseSelect").empty().append('<option value="">Выберите…</option>');
        (resp.available_courses || []).forEach((c) =>
          $course.append(`<option value="${c}">${c}</option>`)
        );
        $course.prop("disabled", false);
        setStatus("idle", "Теперь выберите курс.");
      })
      .fail((xhr) => setStatus("error", `Не удалось загрузить курсы: ${describeXhr(xhr)}`));
  }

  function fillGroups(instituteId, course) {
    $("#groupSelect").prop("disabled", true).empty().append('<option value="">Загрузка…</option>');
    $("#showBtn").prop("disabled", true);
    resetWeekControls();
    $("#scheduleContainer").empty();

    apiGet("/api/groups", { institute_id: instituteId, course })
      .done((resp) => {
        const $g = $("#groupSelect").empty().append('<option value="">Выберите…</option>');
        (resp.groups || []).forEach((gr) =>
          $g.append(`<option value="${gr.id}">${escapeHtml(gr.name)}</option>`)
        );
        $g.prop("disabled", false);
        setStatus("idle", "Теперь выберите группу и нажмите «Показать».");
      })
      .fail((xhr) => setStatus("error", `Не удалось загрузить группы: ${describeXhr(xhr)}`));
  }

  function loadSchedule(mode, id, week) {
    setStatus("loading", "Загружаю расписание…");
    $("#scheduleContainer").empty();
    resetWeekControls();

    const isGroup = mode === "group";
    const url = isGroup ? "/api/schedule/group" : "/api/schedule/teacher";
    const params = isGroup ? { group_id: id } : { staff_id: id };
    if (week != null && week !== "") params.week = week;

    apiGet(url, params)
      .done((resp) => {
        state.schedule = resp;
        state.week = resp.week_number;
        updateWeekControls(resp);
        setStatus("idle", "Готово.");
        renderSchedule(resp);
      })
      .fail((xhr) => {
        state.schedule = null;
        resetWeekControls();
        const isScheduleMissing = xhr.status === 500 || xhr.status === 502;
        if (isScheduleMissing) {
          setStatus("idle", "Расписание пока не введено!");
        } else {
          setStatus("error", `Не удалось загрузить расписание: ${describeXhr(xhr)}`);
        }
      });
  }

  function navigateWeek(weekNum) {
    if (!state.schedule || weekNum == null) return;
    const id = state.mode === "group" ? state.groupId : state.teacherId;
    loadSchedule(state.mode, id, weekNum);
  }

  function renderSchedule(schedule) {
    const $c = $("#scheduleContainer").empty();
    if (!schedule?.days?.length) {
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
    const { days, time_slots: slots = [] } = schedule;
    const map = buildLessonsMap(schedule);
    const slotList = slots.length ? slots : computeSlotsFromLessons(days);
    const todayStr = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "numeric",
    });

    const headerCells = days.map((d) => {
      const todayClass = d.date === todayStr ? " dayHeader__today" : "";
      const dateHtml = d.date ? `<div class="dayHeader__date">${escapeHtml(d.date)}</div>` : "";
      return `<div class="scheduleGrid__dayHead${todayClass}">
        <div class="dayHeader__name">${escapeHtml(capitalize(d.weekday))}</div>
        ${dateHtml}
      </div>`;
    }).join("");

    const rows = slotList.map((slot) => {
      const key = `${slot.time_start}|${slot.time_end}`;
      const cells = days.map((_, di) => {
        const lessons = map[di]?.[key] ?? [];
        const stack = lessons.length
          ? `<div class="cellStack">${lessons.map(lessonCardHtml).join("")}</div>`
          : "";
        return `<div class="scheduleGrid__cell">${stack}</div>`;
      }).join("");

      return `<div class="scheduleGrid__row">
        <div class="scheduleGrid__timeCell">
          <div class="timeCell__start">${escapeHtml(slot.time_start)}</div>
          <div class="timeCell__end">${escapeHtml(slot.time_end)}</div>
        </div>
        ${cells}
      </div>`;
    }).join("");

    $("#scheduleContainer").append(`
      <div class="scheduleGrid">
        <div class="scheduleGrid__header">
          <div class="scheduleGrid__timeHead">Время</div>
          ${headerCells}
        </div>
        ${rows}
      </div>
    `);
  }

  function renderMobile(schedule, initialDayIndex) {
    const { days } = schedule;
    const slotList = schedule.time_slots?.length
      ? schedule.time_slots
      : computeSlotsFromLessons(days);

    const $ds = $("#daySelect").empty();
    days.forEach((d, idx) => {
      const dateShort = d.date ? d.date.substring(0, 5) : "";
      const label = shortWeekday(d.weekday) + (dateShort ? ` ${dateShort}` : "");
      $ds.append($("<option>").val(idx).text(label));
    });
    $ds.val(initialDayIndex);

    function renderDay(dayIndex) {
      const day = days[dayIndex];
      const lessonsBySlot = {};
      (day.lessons || []).forEach((l) => {
        const key = `${l.time_start}|${l.time_end}`;
        (lessonsBySlot[key] ??= []).push(l);
      });

      const slotsHtml = slotList.map((slot) => {
        const key = `${slot.time_start}|${slot.time_end}`;
        const lessons = lessonsBySlot[key] || [];
        const content = lessons.length
          ? lessons.map(lessonCardHtml).join("")
          : '<div class="status status--idle" style="box-shadow:none;border:none;padding:0;color:#9ca3af">Нет занятий</div>';
        return `<div class="slot">
          <div class="slot__time">
            <b>${escapeHtml(slot.time_start)}</b>
            <span>— ${escapeHtml(slot.time_end)}</span>
          </div>
          ${content}
        </div>`;
      }).join("");

      const dateHtml = day.date ? `<div class="dayBlock__date">${escapeHtml(day.date)}</div>` : "";
      $("#scheduleContainer").html(`
        <div class="dayView">
          <div class="dayBlock">
            <div class="dayBlock__header">
              <div class="dayBlock__title">${escapeHtml(capitalize(day.weekday))}</div>
              ${dateHtml}
            </div>
            ${slotsHtml}
          </div>
        </div>
      `);
    }

    renderDay(initialDayIndex);
    $ds.off("change").on("change", function () {
      renderDay(parseInt($(this).val(), 10));
    });
  }

  function buildLessonsMap(schedule) {
    const map = {};
    (schedule.days || []).forEach((day, di) => {
      map[di] = {};
      (day.lessons || []).forEach((l) => {
        const key = `${l.time_start}|${l.time_end}`;
        (map[di][key] ??= []).push(l);
      });
      Object.values(map[di]).forEach((arr) =>
        arr.sort((a, b) => (a.subgroup ?? "").localeCompare(b.subgroup ?? ""))
      );
    });
    return map;
  }

  function computeSlotsFromLessons(days) {
    const seen = new Map();
    days.forEach((d) =>
      (d.lessons || []).forEach((l) => {
        const key = `${l.time_start}|${l.time_end}`;
        if (!seen.has(key)) seen.set(key, { time_start: l.time_start, time_end: l.time_end });
      })
    );
    return [...seen.values()].sort((a, b) => a.time_start.localeCompare(b.time_start));
  }

  function getLessonTypeClass(type) {
    const t = (type || "").toLowerCase();
    const match = LESSON_TYPE_MAP.find(([pattern]) => pattern.test(t));
    return match ? match[1] : "lesson--other";
  }

  function lessonCardHtml(l) {
    const typeClass = getLessonTypeClass(l.lesson_type);
    const type = escapeHtml(l.lesson_type || "—");
    const room = escapeHtml(l.room || "—");

    const subgroupHtml = l.subgroup
      ? `<span class="lessonSubgroup">Подгруппа\u00a0${escapeHtml(l.subgroup)}</span>`
      : "";

    const teachersHtml = (l.teachers || [])
      .map((t) =>
        t.staff_id
          ? `<a href="#" class="teacherLink" data-staff-id="${t.staff_id}">${escapeHtml(t.name)}</a>`
          : `<span>${escapeHtml(t.name)}</span>`
      )
      .join(", ");

    const filteredGroups = (l.groups || []).filter((g) => !/подгрупп/i.test(g.name));
    const groupsHtml = filteredGroups.length
      ? `<div class="groupList">${filteredGroups
        .map((g) => {
          const attr = g.group_id ? ` data-group-id="${g.group_id}"` : "";
          return `<span class="groupChip"${attr}>${escapeHtml(g.name)}</span>`;
        })
        .join("")}</div>`
      : "";

    const metaHtml = [
      `<span class="metaItem"><b>Ауд.</b>\u00a0${room}</span>`,
      teachersHtml && `<span class="metaItem"><b>Преп.</b>\u00a0${teachersHtml}</span>`,
      groupsHtml && `<div class="metaItem metaItem--groups"><b>Группы</b>${groupsHtml}</div>`,
    ].filter(Boolean).join("");

    const commentHtml = l.comment
      ? `<div class="lessonCard__comment">${escapeHtml(l.comment)}</div>`
      : "";

    return `<div class="lessonCard ${typeClass}">
      <div class="lessonCard__top">
        <span class="lessonType">${type}</span>${subgroupHtml}
      </div>
      <div class="lessonCard__subject">${escapeHtml(l.subject || "—")}</div>
      <div class="lessonCard__meta">${metaHtml}</div>
      ${commentHtml}
    </div>`;
  }

  function initTeacherSearch() {
    const $input = $("#teacherInput");
    const $hid = $("#teacherId");
    const $btn = $("#showTeacherBtn");
    const $box = $("#teacherSuggest");

    const doSearch = debounce((text) => {
      text = (text || "").trim();
      if (text.length < 2) {
        $box.hide().empty();
        $btn.prop("disabled", true);
        $hid.val("");
        return;
      }

      apiGet("/api/teachers", { q: text })
        .done((resp) => {
          const teachers = resp.teachers || [];
          $box.empty();

          if (!teachers.length) {
            $box.append(
              '<div class="teacherSuggest__item">' +
              '<div>Ничего не найдено</div>' +
              '<div class="teacherSuggest__meta">Попробуйте другую строку</div></div>'
            ).show();
            return;
          }

          teachers.slice(0, 20).forEach((t) => {
            $('<div class="teacherSuggest__item">')
              .append(`<div><b>${escapeHtml(t.name)}</b></div>`)
              .append(`<div class="teacherSuggest__meta">staffId: ${t.id}</div>`)
              .on("click", () => {
                $input.val(t.name);
                $hid.val(t.id);
                $btn.prop("disabled", false);
                $box.hide().empty();
              })
              .appendTo($box);
          });

          $box.show();
        })
        .fail((xhr) =>
          $box.empty()
            .append(
              `<div class="teacherSuggest__item"><div>Ошибка поиска</div>` +
              `<div class="teacherSuggest__meta">${escapeHtml(describeXhr(xhr))}</div></div>`
            )
            .show()
        );
    }, 250);

    $input.on("input", function () {
      $hid.val("");
      $btn.prop("disabled", true);
      doSearch($(this).val());
    });

    $(document).on("click", (e) => {
      if (!$(e.target).closest(".teacherSearch").length) $box.hide().empty();
    });

    $btn.on("click", () => {
      const tid = parseInt($hid.val(), 10);
      if (!tid) return;
      state.teacherId = tid;
      loadSchedule("teacher", tid, null);
    });
  }

  function initEvents() {
    $('input[name="mode"]').on("change", function () {
      setMode($('input[name="mode"]:checked').val());
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

    $("#showBtn").on("click", () => {
      if (state.groupId) loadSchedule("group", state.groupId, null);
    });

    $("#prevWeekBtn").on("click", () => navigateWeek(state.schedule?.prev_week));
    $("#nextWeekBtn").on("click", () => navigateWeek(state.schedule?.next_week));

    $("#weekSelect").on("change", function () {
      const w = parseInt($(this).val(), 10);
      if (!isNaN(w)) navigateWeek(w);
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

      state.teacherId = staffId;
      loadSchedule("teacher", staffId, state.schedule?.week_number ?? null);
    });

    let lastMobile = isMobile();
    $(window).on("resize", debounce(() => {
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
