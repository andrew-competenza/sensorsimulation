using SensorStatsSimulator.API.Hubs;
using SensorStatsSimulator.API.Models;
using System.Text.Json.Serialization.Metadata;

var builder = WebApplication.CreateSlimBuilder(args);


builder.WebHost.ConfigureKestrel(o =>
{
    o.Limits.MaxConcurrentConnections = 50000;
    o.Limits.MaxConcurrentUpgradedConnections = 80000;
});

// Services registration
builder.Services.AddSingleton(_ => new InMemorySensorStore(bufferSize: 3000000)); // keep last 300 samples
builder.Services.AddSignalR();

builder.Services.AddControllers()
     .AddNewtonsoftJson(); // <- use Newtonsoft for controller JSON;
builder.Services.AddSignalR()
    .AddJsonProtocol(options =>
    {
        options.PayloadSerializerOptions.TypeInfoResolver = new DefaultJsonTypeInfoResolver(); // enable reflection
        options.PayloadSerializerOptions.WriteIndented = true; // optional
    });
builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
    policy.AllowAnyHeader()
          .AllowAnyMethod()
          .AllowCredentials()
          .SetIsOriginAllowed(_ => true) // Equivalent to AllowAnyOrigin but works with AllowCredentials
));

// Build app
var app = builder.Build();

// Middleware
app.UseCors();

// Map routes
app.MapControllers();
app.MapHub<SensorHub>("/hubs/sensors");

app.Run();
