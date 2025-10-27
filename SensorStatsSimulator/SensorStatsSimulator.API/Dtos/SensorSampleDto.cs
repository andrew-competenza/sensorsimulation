namespace SensorStatsSimulator.API.Dtos
{
    public class SensorSampleDto
    {
        public string SensorId { get; set; } = default!;
        public DateTimeOffset? Timestamp { get; set; }
        public double Value { get; set; }
    }
}
