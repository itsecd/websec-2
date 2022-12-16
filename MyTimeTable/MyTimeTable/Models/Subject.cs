namespace MyTimeTable.Models
{
    public class Subject
    {
        public string? Name { get; set; }
        public string? Place { get; set; }
        public string? Teacher { get; set; }
        public string? TeacherId { get; set; }
        public string?[] Groups { get; set; }
        public string?[] GroupIds { get; set; }
        public int? Color { get; set; }

        public Subject(string? name, string? place, string? teacher, string? teacherId, string?[] groups, string?[] groupIds, int? color)
        {
            Name = name;
            Place = place;
            Teacher = teacher;
            TeacherId = teacherId;
            Groups = groups;
            GroupIds = groupIds;
            Color = color;
        }
    }
}
