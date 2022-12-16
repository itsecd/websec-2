namespace MyTimeTable.Models
{
    public class DataViewModel
    {
        public string? CurrentInstitutionName { get; set; } = string.Empty;
        public long? CurrentInstitutionId { get; set; }
        public string? CurrentGroupName { get; set; } = string.Empty;
        public long? CurrentGroupId { get; set; }
        public string? CurrentTeacherName { get; set; } = string.Empty;
        public long? CurrentTeacherId { get; set; }

        public DataViewModel(string? instName, string? groupName, string? teacherName, long? instId, long? groupId, long? teacherId)
        {
            CurrentInstitutionName = instName;
            CurrentInstitutionId = instId;
            CurrentGroupName = groupName;
            CurrentGroupId = groupId;
            CurrentTeacherName = teacherName;
            CurrentTeacherId = teacherId;
        }
    }
}
