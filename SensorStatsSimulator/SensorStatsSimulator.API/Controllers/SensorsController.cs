using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using SensorStatsSimulator.API.Dtos;
using SensorStatsSimulator.API.Hubs;
using SensorStatsSimulator.API.Models;

namespace SensorStatsSimulator.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SensorsController : ControllerBase
    {
        private readonly InMemorySensorStore _store;
        private readonly IHubContext<SensorHub> _hub;

        public SensorsController(InMemorySensorStore store, IHubContext<SensorHub> hub)
        {
            _store = store;
            _hub = hub;
        }

        [HttpPost]
        public async Task<IActionResult> Post([FromBody] SensorSampleDto dto)
        {
            // validate
            if (string.IsNullOrWhiteSpace(dto.SensorId)) return BadRequest("sensorId required");

            var sample = new SensorSample(dto.SensorId, dto.Timestamp ?? DateTimeOffset.Now, dto.Value);
            _store.AddSample(sample);

            // broadcast to all clients (or to sensor group if you prefer)
            await _hub.Clients.All.SendAsync("sensorUpdate", new
            {
                sensorId = sample.SensorId,
                timestamp = sample.Timestamp,
                value = sample.Value
            });

            return Accepted();
        }

       
        [HttpGet("snapshot")]
        public IActionResult GetSnapshot()
        {
            var data = _store.SnapshotAll();

            if(data != null && data.Count==0)
            {
                //build one fake reord and return (for simulation demo)
                var random = new Random();
                var fakeSample = new SensorSample(
                    SensorId: Guid.NewGuid().ToString(),                            // Random Sensor ID
                    Timestamp: DateTimeOffset.Now,                              // Current time
                    Value: Math.Round(random.NextDouble() * 100, 2)                // Random value between 0 and 100
                );

                return Ok(new[] { fakeSample }); // Return as a single-element array

            }

            return Ok(data);
        }
    }
}
