$(document).ready(function() {
    $.get("http://127.0.0.1:5000/api/groups", function(groups) {
        console.log("Группы:", groups);

        groups.forEach(function(g) {
            const button = $('<button>')
                .text(g.group_number)
                .attr('data-id', g.id);

            $('#groups').append(button);

            button.click(function() {
                $('#groups button').removeClass('active');
                $(this).addClass('active');

                const groupId = $(this).attr('data-id');

                $.get(`http://127.0.0.1:5000/api/timetable/${groupId}`, function(data) {
                    $('#timetable').empty();

                    if (data.error) {
                        $('#timetable').html(data.error);
                        return;
                    }

                    data.forEach(function(item) {
                        $('#timetable').append(`
                            <div class="lesson-card">
                                <div class="lesson-type">${item.type}</div>
                                <div class="lesson-name">${item.lesson}</div>
                                <div class="lesson-teacher">${item.lecturer}</div>
                                <div class="lesson-place">${item.place}</div>
                            </div>
                        `);
                    });
                });
            });
        });
    });
});