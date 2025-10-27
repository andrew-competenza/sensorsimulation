namespace SensorStatsSimulator.API.Models
{
    public record SensorSample(string SensorId, DateTimeOffset Timestamp, double Value);
}
