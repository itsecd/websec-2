const express = require("express");
const fs = require("fs");

const app = express();
const PORT = 5000;

const { parseGroup } = require("./parser");
const groups = JSON.parse(fs.readFileSync("groups.json", "utf8"));
const teachers = JSON.parse(fs.readFileSync("teachers.json", "utf8"));
app.use(express.static("client"));

app.get("/teacherRasp", async (req, res) => {
  let teacherId = req.query.teacherId;
  let week = parseInt(req.query.week) || 31;

  try {
    const allSchedule = [];
    for (const [groupName, groupId] of Object.entries(groups)) {
      const data = await parseGroup(groupName, groupId, week);
      allSchedule.push(...data);
      data.forEach((item) => {
        if (item.teacherId && item.teacherName && !teachers[item.teacherId]) {
          teachers[item.teacherId] = item.teacherName;
        }
      });
    }
    const filtered = allSchedule.filter((item) => item.teacherId === teacherId);
    filtered.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time.localeCompare(b.time);
    });
    res.json({
      success: true,
      teacherId: teacherId,
      teacherName: teachers[teacherId],
      count: filtered.length,
      schedule: filtered,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/groupRasp", async (req, res) => {
  let groupId = req.query.groupId;
  let week = parseInt(req.query.week) || 31;
  if (groups[groupId]) {
    groupId = groups[groupId];
  }

  try {
    const timetableData = await parseGroup(req.query.groupId, groupId, week);
    timetableData.forEach((item) => {
      if (item.teacherId && item.teacherName && !teachers[item.teacherId]) {
        teachers[item.teacherId] = item.teacherName;
      }
    });
    timetableData.forEach((item, index) => (item.id = index + 1));

    res.json({
      success: true,
      groupId: groupId,
      groupName: req.query.groupId,
      count: timetableData.length,
      schedule: timetableData,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/search", (req, res) => {
  const query = req.query.q.trim();

  if (groups[query]) {
    return res.json({
      type: "group",
      id: groups[query],
      name: query,
    });
  }
  for (const [id, name] of Object.entries(teachers)) {
    if (name && name.toLowerCase().includes(query.toLowerCase())) {
      return res.json({
        type: "teacher",
        id: id,
        name: name,
      });
    }
  }

  res.status(404).json({
    success: false,
    error: "Ничего не найдено",
  });
});

app.listen(PORT, () => {
  console.log("Адерс сервера  http://localhost:5000");
});
