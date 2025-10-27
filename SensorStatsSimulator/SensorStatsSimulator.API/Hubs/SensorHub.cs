using System.Text.RegularExpressions;
using Microsoft.AspNetCore.SignalR;

namespace SensorStatsSimulator.API.Hubs
{
    public class SensorHub : Hub
    {
        // You can add groups if you want per-sensor subscriptions
        public override Task OnConnectedAsync()
        {
            return base.OnConnectedAsync();
        }

        // client can call this if needed
        public Task SubscribeToSensor(string sensorId)
        {
            return Groups.AddToGroupAsync(Context.ConnectionId, sensorId);
        }
    }
}
