// See https://aka.ms/new-console-template for more information
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;




var handler = new SocketsHttpHandler
{
    PooledConnectionLifetime = TimeSpan.FromMinutes(5),
    MaxConnectionsPerServer = 200,  // <= match your concurrency
    ConnectTimeout = TimeSpan.FromSeconds(300),
};


var http = new HttpClient(handler);
var baseUrl = "http://localhost:5103/api/sensors"; // adjust port
var rng = new Random();


var _randomDelay = new Random();

int sensorCount = 15000; // tune
int maxConcurrent = 200;


var semaphore = new SemaphoreSlim(maxConcurrent); // limit concurrency
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
            await semaphore.WaitAsync(); // acquire slot
            try
            {

                var sample = new { sensorId = id, timestamp = DateTimeOffset.Now, value = Math.Round(rng.NextDouble() * 100, 2) };
                var json = JsonSerializer.Serialize(sample);
                var content = new StringContent(json, Encoding.UTF8, "application/json");

                try
                {
                    var response = await http.PostAsync(baseUrl, content);
                    
                    if (!response.IsSuccessStatusCode)
                        Console.WriteLine($"[{id}] Server responded: {response.StatusCode}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[{id}] Error: {ex.Message}");
                }
            }
            finally
            {
                semaphore.Release(); // release slot
            }
            await DelayRandomAsync(); // 1 per second per sensor -> heavy; increase delay for local testing
        }
    }));
}


await Task.WhenAll(tasks);

//hel to simulate post of data with 100ms to 1200ms interval
async Task DelayRandomAsync(int minMs = 2500, int maxMs = 6500)
{
    int delay = _randomDelay.Next(minMs, maxMs + 1); // inclusive upper bound
    await Task.Delay(delay);
}
