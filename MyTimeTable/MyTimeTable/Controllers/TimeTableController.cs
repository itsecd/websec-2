using AngleSharp.Dom;
using AngleSharp.Html.Parser;
using Microsoft.AspNetCore.Mvc;
using MyTimeTable.Models;
using Newtonsoft.Json;
using System.Diagnostics;

namespace MyTimeTable.Controllers
{
    public class TimeTableController : Controller
    {
        private readonly ILogger<TimeTableController> _logger;

        private readonly Dictionary<string, string> _cssClassNames;

        public TimeTableController(ILogger<TimeTableController> logger)
        {
            _logger = logger;
            _cssClassNames = new Dictionary<string, string>()
            {
                { "Name", ".info-block__title" },
                { "MainTable", ".timetable-card" },
                { "PrevWeek", ".week-nav-prev" },
                { "CurWeek", ".week-nav-current" },
                { "NextWeek", ".week-nav-next" },
                { "TimeTable", ".schedule" },
                { "DayNames", ".schedule__head-weekday" },
                { "DayDates", ".schedule__head-date" },
                { "SubjectItem", ".schedule__item"},
                { "SubjectTime", ".schedule__time"},
                { "SubjectTimeItem", ".schedule__time-item"},
                { "Subject", ".schedule__lesson" },
                { "SubjectName", ".schedule__discipline" },
                { "SubjectPlace", ".schedule__place"},
                { "SubjectTeacher", ".schedule__teacher"},
                { "SubjectGroups", ".schedule__groups"},
                { "SubjectGroup", ".schedule__group"},
                { "Color1", ".lesson-color-type-1"},
                { "Color2", ".lesson-color-type-2"},
                { "Color3", ".lesson-color-type-3"},
                { "Color4", ".lesson-color-type-4"},

            };
        }

        public IActionResult Index()
        {
            return View("FacultiesDataForm");
        }

        [Route("TimeTable/Faculties")]
        public string GetAllFaculties()
        {
            var response = getResponse("https://ssau.ru/rasp").Result;
            if (!response.IsSuccessStatusCode)
            {
                return JsonConvert.SerializeObject(new { success = false, text = "Не удалось загрузить расписание с источника по причине его плохой работы..." });
            }
            var responseString = string.Empty;
            using (var reader = new StreamReader(response.Content.ReadAsStreamAsync().Result))
            {
                responseString = reader.ReadToEnd();
            }
            var parser = new HtmlParser();
            var htmlDoc = parser.ParseDocument(responseString);
            var instElems = htmlDoc.QuerySelectorAll(".faculties__item");
            var instNames = instElems.Select(x => new KeyValuePair<string, string>(x.QuerySelectorAll("a")[0].InnerHtml, x.QuerySelectorAll("a")[0].Attributes[0]!.Value[14..23])).ToList();
            return JsonConvert.SerializeObject(new {success = true, instDict = instNames }); 
        }

        [Route("TimeTable/Faculty/{id}&course={course}")]
        public IActionResult FacultyGroupsDataForm()
        {
            return View("FacultyGroupsDataForm");
        }

        [Route("TimeTable/GetGroupsByFacultyAndCourse/{id}/{course}")]
        public string GetGroupsByFacultyAndCourse(long id, int course)
        {
            var response = getResponse($"https://ssau.ru/rasp/faculty/{id}?course={course}").Result;
            if (!response.IsSuccessStatusCode)
            {
                return JsonConvert.SerializeObject(new { success = false, text = "Не удалось загрузить расписание с источника по причине его плохой работы..." });
            }
            var responseString = string.Empty;
            using (var reader = new StreamReader(response.Content.ReadAsStreamAsync().Result))
            {
                responseString = reader.ReadToEnd();
            }
            var parser = new HtmlParser();
            var htmlDoc = parser.ParseDocument(responseString);
            var courseElems = htmlDoc.QuerySelectorAll(".nav-course__item");
            var courseNames = courseElems.Select(x => x.QuerySelectorAll("a")[0].InnerHtml[0]).ToList();
            var groupDict = new Dictionary<string, Dictionary<string, Dictionary<string, string>>>();
            var studyLevels = htmlDoc.QuerySelectorAll(".group-catalog__item");
            var studyLevelNames = htmlDoc.QuerySelectorAll(".group-catalog__edtype").Select(x => x.InnerHtml.Trim()).ToList();
            for (int i = 0; i < studyLevelNames.Count; i++)
            {
                groupDict[studyLevelNames[i]] = new Dictionary<string, Dictionary<string, string>>();
                var studyTypes = studyLevels[i].QuerySelectorAll(".group-catalog__edform");
                var studyTypeNames = studyLevels[i].QuerySelectorAll(".group-catalog__edform").Select(x => x.InnerHtml.Trim()).ToList();
                for (int j = 0; j < studyTypeNames.Count; j++)
                {
                    groupDict[studyLevelNames[i]][studyTypeNames[j]] = new Dictionary<string, string>();
                    var groupCatalog = studyLevels[i].QuerySelectorAll(".group-catalog__groups")[j];
                    var groups = groupCatalog.QuerySelectorAll(".group-catalog__group");
                    foreach (var group in groups)
                    {
                        groupDict[studyLevelNames[i]][studyTypeNames[j]][group.QuerySelectorAll("span").First().InnerHtml] = group.Attributes.First().Value[14..];
                    }
                }
            }
            return JsonConvert.SerializeObject(new { success = true, name = htmlDoc.QuerySelectorAll(".page-header")[0].InnerHtml, dict = groupDict, course = course , courseCount = courseNames.Count});
        }

        [Route("TimeTable/GetGroupTimeTable/{id}&week={week}")]
        public string GetGroupTimeTable(long id, string week)
        {
            var response = getResponse($"https://ssau.ru/rasp?groupId={id}" + (week == "current" ? string.Empty : $"&selectedWeek={week}")).Result;
            if (!response.IsSuccessStatusCode)
            {
                return JsonConvert.SerializeObject(new { success = false, text = "Не удалось загрузить расписание с источника по причине его плохой работы..." });
            }
            var responseString = string.Empty;
            using (var reader = new StreamReader(response.Content.ReadAsStreamAsync().Result))
            {
                responseString = reader.ReadToEnd();
            }
            var parser = new HtmlParser();
            var htmlDoc = parser.ParseDocument(responseString);
            var groupName = htmlDoc.QuerySelectorAll(_cssClassNames["Name"])[0].InnerHtml.Trim();
            var timetable = htmlDoc.QuerySelectorAll(_cssClassNames["MainTable"]).Length > 0 ? htmlDoc.QuerySelectorAll(_cssClassNames["MainTable"])[0] : null;
            if (timetable == null)
            {
                return JsonConvert.SerializeObject(new { success = false, inGroupName = groupName });
            }
            var prevWeekName = timetable.QuerySelectorAll(_cssClassNames["PrevWeek"])[0].QuerySelectorAll("span")[0].InnerHtml;
            var curWeek = timetable.QuerySelectorAll(_cssClassNames["CurWeek"])[0].QuerySelectorAll("span")[0].InnerHtml;
            var nextWeek = timetable.QuerySelectorAll(_cssClassNames["NextWeek"])[0].QuerySelectorAll("span")[0].InnerHtml;
            timetable = timetable.QuerySelectorAll(_cssClassNames["TimeTable"])[0];
            var weekDayNames = timetable.QuerySelectorAll(_cssClassNames["DayNames"]).ToList().Select(elem => elem.InnerHtml).ToList();
            var weekDayDates = timetable.QuerySelectorAll(_cssClassNames["DayDates"]).ToList().Select(elem => elem.InnerHtml).ToList();
            var subjectss = timetable.QuerySelectorAll(_cssClassNames["SubjectItem"]);
            var subjects = subjectss.ToList().GetRange(7, subjectss.Length - 7);
            var timesS = htmlDoc.QuerySelectorAll(_cssClassNames["SubjectTimeItem"]);
            var timesList = new List<string>();
            for (int i= 0; i < timesS.Length; i+=2)
            {
                timesList.Add($"{timesS[i].InnerHtml[..6]} - {timesS[i + 1].InnerHtml[..6]}");
            }
            var times = timesList.ToArray();
            var subjects2 = new List<List<Subject?>>();
            foreach (var elem in subjects)
            {
                subjects2.Add(GetGroupSubjectFromHtmlElement(elem, true));
            }
            return JsonConvert.SerializeObject( new 
                                          {
                                            success = true,
                                            inTimes = times,
                                            inSubjects = subjects2,
                                            inWeekDayNames = weekDayNames,
                                            inWeekDayDates = weekDayDates,
                                            inPrevWeek = prevWeekName,
                                            inCurWeek = curWeek,
                                            inNextWeek = nextWeek,
                                            inGroupName = groupName});
        }

        [Route("TimeTable/GetTeacherTimeTable/{id}&week={week}")]
        public string GetTeacherTimeTable(long id, string week)
        {
            var response = getResponse($"https://ssau.ru/rasp?staffId={id}" + (week == "current" ? string.Empty : $"&selectedWeek={week}")).Result;
            if (!response.IsSuccessStatusCode)
            {
                return JsonConvert.SerializeObject(new { success = false, text = "Не удалось загрузить расписание с источника по причине его плохой работы..." });
            }
            var responseString = string.Empty;
            using (var reader = new StreamReader(response.Content.ReadAsStreamAsync().Result))
            {
                responseString = reader.ReadToEnd();
            }
            var parser = new HtmlParser();
            var htmlDoc = parser.ParseDocument(responseString);
            var teacherName = htmlDoc.QuerySelectorAll(_cssClassNames["Name"])[0].InnerHtml.Trim();
            var timetable = htmlDoc.QuerySelectorAll(_cssClassNames["MainTable"]).Length > 0 ? htmlDoc.QuerySelectorAll(_cssClassNames["MainTable"])[0] : null;
            if (timetable == null)
            {
                return JsonConvert.SerializeObject(new { success = false, inGroupName = teacherName });
            }
            var prevWeekName = timetable.QuerySelectorAll(_cssClassNames["PrevWeek"])[0].QuerySelectorAll("span")[0].InnerHtml;
            var curWeek = timetable.QuerySelectorAll(_cssClassNames["CurWeek"])[0].QuerySelectorAll("span")[0].InnerHtml;
            var nextWeek = timetable.QuerySelectorAll(_cssClassNames["NextWeek"])[0].QuerySelectorAll("span")[0].InnerHtml;
            timetable = timetable.QuerySelectorAll(_cssClassNames["TimeTable"])[0];
            var weekDayNames = timetable.QuerySelectorAll(_cssClassNames["DayNames"]).ToList().Select(elem => elem.InnerHtml).ToList();
            var weekDayDates = timetable.QuerySelectorAll(_cssClassNames["DayDates"]).ToList().Select(elem => elem.InnerHtml).ToList();
            var subjectss = timetable.QuerySelectorAll(_cssClassNames["SubjectItem"]);
            var subjects = subjectss.ToList().GetRange(7, subjectss.Length - 7);
            var timeDivs = timetable.QuerySelectorAll(_cssClassNames["SubjectTime"]);
            var times = timeDivs.Select(elem => $"{elem.QuerySelectorAll(_cssClassNames["SubjectTimeItem"])[0].InnerHtml} - {elem.QuerySelectorAll(_cssClassNames["SubjectTimeItem"])[1].InnerHtml}").ToArray(); List<List<Subject?>> subjects2 = new List<List<Subject?>>();
            foreach (var elem in subjects)
            {
                subjects2.Add(GetGroupSubjectFromHtmlElement(elem, false));
            }
            return JsonConvert.SerializeObject(new
            {
                success = true,
                inTimes = times,
                inSubjects = subjects2,
                inWeekDayNames = weekDayNames,
                inWeekDayDates = weekDayDates,
                inPrevWeek = prevWeekName,
                inCurWeek = curWeek,
                inNextWeek = nextWeek,
                inTeacherName = teacherName
            });
        }

        [Route("TimeTable/Group/{id}&week={week}")]
        public IActionResult GroupDataForm(long id, string week)
        {
            return View("GroupDataForm");
        }

        [Route("TimeTable/Teacher/{id}&week={week}")]
        public IActionResult TeacherDataForm(long id, string week)
        {
            return View("TeacherDataForm");
        }

        private List<Subject?> GetGroupSubjectFromHtmlElement(IElement elem1, bool isGroupTimeTable)
        {
            List<Subject?> subjects = new List<Subject?>();
            if (elem1.QuerySelectorAll(_cssClassNames["Subject"]).Length > 0)
            {
                foreach (var elem in elem1.QuerySelectorAll(_cssClassNames["Subject"]))
                {
                    string? Name;
                    string? Place;
                    string? Teacher;
                    string? TeacherId;
                    string?[] Groups;
                    string?[] GroupIds;
                    int? Color;
                    Name = elem.QuerySelectorAll(_cssClassNames["SubjectName"])[0].InnerHtml.Trim();
                    Place = elem.QuerySelectorAll(_cssClassNames["SubjectPlace"])[0].InnerHtml.Trim();
                    Teacher = isGroupTimeTable  ? elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"]).Length > 0
                                                    ? elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"])[0].QuerySelectorAll("a").Length > 0
                                                        ? elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"])[0].QuerySelectorAll("a")[0].InnerHtml
                                                        : elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"])[0].InnerHtml
                                                    : null
                                                : null;
                    TeacherId = isGroupTimeTable ? elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"]).Length > 0
                                                    ? elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"])[0].QuerySelectorAll("a").Length > 0
                                                        ? elem.QuerySelectorAll(_cssClassNames["SubjectTeacher"])[0].QuerySelectorAll("a")[0]?.Attributes[1]?.Value[14..]
                                                        : null
                                                    : null
                                                : null;
                    Groups = isGroupTimeTable ? elem.QuerySelectorAll(_cssClassNames["SubjectGroups"])[0].QuerySelectorAll("a").Length > 0
                                                    ? elem.QuerySelectorAll(_cssClassNames["SubjectGroups"])[0].QuerySelectorAll("a").Select(elem2 => elem2.InnerHtml).ToArray()
                                                    : new string[0]
                                              : elem.QuerySelectorAll(_cssClassNames["SubjectGroup"]).Length > 0
                                                    ? elem.QuerySelectorAll(_cssClassNames["SubjectGroup"]).Select(x => x.InnerHtml).ToArray() // TO DO доделать
                                                    : new string[0];
                    GroupIds = isGroupTimeTable ? elem.QuerySelectorAll(_cssClassNames["SubjectGroups"])[0].QuerySelectorAll("a").Length > 0
                                                    ? elem.QuerySelectorAll(_cssClassNames["SubjectGroups"]).Select(x => x.QuerySelectorAll("a").First().Attributes[0]?.Value[14..]).ToArray()
                                                    : new string[0]
                                                : elem.QuerySelectorAll(_cssClassNames["SubjectGroup"]).Length > 0
                                                    ? elem.QuerySelectorAll(_cssClassNames["SubjectGroup"]).Select(x => x.Attributes[0]?.Value[14..]).ToArray()
                                                    : new string[0];
                    Color = elem.QuerySelectorAll(_cssClassNames["Color1"]).Length > 0
                                                ? 1
                                                : elem.QuerySelectorAll(_cssClassNames["Color2"]).Length > 0
                                                    ? 2
                                                    : elem.QuerySelectorAll(_cssClassNames["Color3"]).Length > 0
                                                        ? 3
                                                        : elem.QuerySelectorAll(_cssClassNames["Color4"]).Length > 0
                                                            ? 4 : 0;
                    subjects.Add(new Subject(Name, Place, Teacher, TeacherId, Groups, GroupIds, Color));
                }
            }
            else
            {
                subjects.Add(null);
            }
            return subjects;
       
        }

        private async Task<HttpResponseMessage> getResponse(string url)
        {
            int requestCounter = 0;
            HttpResponseMessage response;
            do
            {
                response = await new HttpClient().GetAsync(url);
                if (response.IsSuccessStatusCode)
                {
                    break;
                }
                requestCounter++;
            }
            while(requestCounter < 5);
            return response;
        }
    }
}