// See https://aka.ms/new-console-template for more information
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;


var http = new HttpClient();
var baseUrl = "http://localhost:5103/api/sensors"; // adjust port
var rng = new Random();


var _randomDelay = new Random();

int sensorCount = 1000; // tune
var tasks = new List<Task>();


for (int i = 0; i < sensorCount; i++)
{
    int idx = i;
    tasks.Add(Task.Run(async () =>
    {
        var id = $"sensor-{idx:D4}";
        Console.WriteLine($"for sensor -> {id}");
        while (true)
        {
            var sample = new { sensorId = id, timestamp = DateTimeOffset.Now, value = Math.Round(rng.NextDouble() * 100, 2) };
            var json = JsonSerializer.Serialize(sample);
            try
            {
                var response = await http.PostAsync(baseUrl, new StringContent(json, Encoding.UTF8, "application/json"));
            }
            catch (Exception ex)
            {
                Console.WriteLine(ex.Message);
            }
            await DelayRandomAsync(); // 1 per second per sensor -> heavy; increase delay for local testing
        }
    }));
}


await Task.WhenAll(tasks);

//help to simulate post of data with 100ms to 1200ms interval
async Task DelayRandomAsync(int minMs = 100, int maxMs = 1200)
{
    int delay = _randomDelay.Next(minMs, maxMs + 1); // inclusive upper bound
    await Task.Delay(delay);
}
