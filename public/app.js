(function () {
  const state = {
    selected: null,
    week: null,
    debounceTimer: null,
  };

  const elements = {
    entityMeta: $("#entityMeta"),
    entityTitle: $("#entityTitle"),
    nextWeek: $("#nextWeek"),
    prevWeek: $("#prevWeek"),
    scheduleRoot: $("#scheduleRoot"),
    scheduleStatus: $("#scheduleStatus"),
    searchButton: $("#searchButton"),
    searchInput: $("#searchInput"),
    searchResults: $("#searchResults"),
    searchStatus: $("#searchStatus"),
    weekCaption: $("#weekCaption"),
    weekInput: $("#weekInput"),
  };

  function escapeHtml(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function lessonHtml(lesson) {
    const teachers = lesson.teachers.length
      ? lesson.teachers.map((teacher) => teacher.name).join(", ")
      : lesson.teacherText;
    const groups = lesson.groups.length
      ? lesson.groups.map((group) => group.name).join(", ")
      : lesson.groupText;

    return `
      <article class="lesson-card ${escapeHtml(lesson.typeClass)}">
        <div class="lesson-type">${escapeHtml(lesson.type || "Занятие")}</div>
        <h3>${escapeHtml(lesson.discipline || "Без названия")}</h3>
        <p class="lesson-meta">${escapeHtml(lesson.place || "Место не указано")}</p>
        <p class="lesson-meta">${escapeHtml(teachers || "Преподаватель не указан")}</p>
        ${groups ? `<p class="lesson-meta">${escapeHtml(groups)}</p>` : ""}
        ${lesson.comment ? `<p class="lesson-meta">${escapeHtml(lesson.comment)}</p>` : ""}
      </article>
    `;
  }

  function updateUrl() {
    const url = new URL(window.location.href);
    url.search = "";

    if (state.selected) {
      if (state.selected.groupId) {
        url.searchParams.set("groupId", state.selected.groupId);
      }
      if (state.selected.staffId) {
        url.searchParams.set("staffId", state.selected.staffId);
      }
    }

    if (state.week) {
      url.searchParams.set("week", state.week);
    }

    window.history.replaceState({}, "", url);
  }

  function renderResults(results) {
    elements.searchResults.empty();

    if (!results.length) {
      elements.searchStatus.text("Ничего не найдено.");
      return;
    }

    elements.searchStatus.text(`Найдено: ${results.length}`);

    results.forEach((item) => {
      const card = $(`
        <button class="result-card" type="button">
          <strong>${escapeHtml(item.text)}</strong>
          <span>${item.type === "teacher" ? "Преподаватель" : "Группа"}</span>
        </button>
      `);

      card.on("click", function () {
        state.selected = item;
        state.week = null;
        updateUrl();
        loadTimetable();
      });

      elements.searchResults.append(card);
    });
  }

  function renderSchedule(data) {
    elements.scheduleRoot.empty();

    elements.entityTitle.text(data.entity.title || data.entity.name || "Без названия");
    elements.entityMeta.text(data.entity.description.join(" | "));
    elements.weekInput.val(data.week.currentWeek || "");
    elements.weekCaption.text(
      data.week.currentWeek
        ? `Сейчас открыта ${data.week.currentWeek} неделя, дата привязки: ${data.week.currentDate || "не указана"}`
        : "Неделя не определена"
    );

    elements.prevWeek.prop("disabled", !data.week.prevWeek);
    elements.nextWeek.prop("disabled", !data.week.nextWeek);
    elements.prevWeek.data("week", data.week.prevWeek || "");
    elements.nextWeek.data("week", data.week.nextWeek || "");

    if (!data.schedule) {
      elements.scheduleStatus.text(data.emptyState || "Расписание отсутствует.");
      return;
    }

    elements.scheduleStatus.empty();

    const table = $('<div class="schedule-grid"><div class="schedule-grid__table"></div></div>');
    const grid = table.find(".schedule-grid__table");

    grid.append('<div class="grid-head">Время</div>');
    data.schedule.days.forEach((day) => {
      grid.append(`
        <div class="grid-head">
          ${escapeHtml(day.weekday)}
          <span>${escapeHtml(day.date)}</span>
        </div>
      `);
    });

    data.schedule.slots.forEach((slot) => {
      grid.append(`<div class="time-card">${escapeHtml(slot.time.label)}</div>`);

      slot.cells.forEach((cell) => {
        if (!cell.lessons.length) {
          grid.append('<div class="lesson-cell lesson-cell_empty"></div>');
          return;
        }

        grid.append(`<div class="lesson-cell">${cell.lessons.map(lessonHtml).join("")}</div>`);
      });
    });

    elements.scheduleRoot.append(table);
  }

  function timetableQuery() {
    if (!state.selected) {
      return null;
    }

    const params = new URLSearchParams();
    if (state.selected.groupId) {
      params.set("groupId", state.selected.groupId);
    }
    if (state.selected.staffId) {
      params.set("staffId", state.selected.staffId);
    }
    if (state.week) {
      params.set("week", state.week);
    }
    return `/api/timetable?${params.toString()}`;
  }

  function loadTimetable() {
    const query = timetableQuery();
    if (!query) {
      return;
    }

    elements.scheduleStatus.text("Загружаю расписание...");
    elements.scheduleRoot.empty();

    $.getJSON(query)
      .done((data) => {
        state.week = data.week.currentWeek || state.week;
        updateUrl();
        renderSchedule(data);
      })
      .fail((xhr) => {
        const message = xhr.responseJSON?.error || "Не удалось загрузить расписание.";
        elements.scheduleStatus.text(message);
      });
  }

  function runSearch() {
    const value = elements.searchInput.val().trim();
    elements.searchResults.empty();

    if (value.length < 2) {
      elements.searchStatus.text("Введите хотя бы 2 символа.");
      return;
    }

    elements.searchStatus.text("Ищу...");

    $.getJSON(`/api/search?q=${encodeURIComponent(value)}`)
      .done(renderResults)
      .fail(() => {
        elements.searchStatus.text("Ошибка поиска.");
      });
  }

  elements.searchButton.on("click", runSearch);
  elements.searchInput.on("input", function () {
    window.clearTimeout(state.debounceTimer);
    state.debounceTimer = window.setTimeout(runSearch, 350);
  });

  elements.prevWeek.on("click", function () {
    const week = $(this).data("week");
    if (!week) {
      return;
    }
    state.week = week;
    updateUrl();
    loadTimetable();
  });

  elements.nextWeek.on("click", function () {
    const week = $(this).data("week");
    if (!week) {
      return;
    }
    state.week = week;
    updateUrl();
    loadTimetable();
  });

  elements.weekInput.on("change", function () {
    const value = Number($(this).val());
    if (!value || value < 1 || value > 52 || !state.selected) {
      return;
    }
    state.week = value;
    updateUrl();
    loadTimetable();
  });

  function bootstrapFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const groupId = params.get("groupId");
    const staffId = params.get("staffId");
    const week = params.get("week");

    if (!groupId && !staffId) {
      return;
    }

    state.selected = {
      text: groupId || staffId,
      type: staffId ? "teacher" : "group",
      groupId,
      staffId,
    };
    state.week = week;
    loadTimetable();
  }

  bootstrapFromUrl();
})();
