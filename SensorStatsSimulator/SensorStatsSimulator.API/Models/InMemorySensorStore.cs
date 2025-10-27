using SensorStatsSimulator.API.Utility;
using System.Collections.Concurrent;
using System.Linq;

namespace SensorStatsSimulator.API.Models
{

    public class InMemorySensorStore
    {
        //private readonly ConcurrentDictionary<string, FixedSizeQueue<SensorSample>> _store;
        public int BufferSize { get; }



        private readonly ConcurrentDictionary<string, FixedSizeQueue<SensorSample>> _store =
            new ConcurrentDictionary<string, FixedSizeQueue<SensorSample>>();

        private readonly int _maxSamplesPerSensor = 200; // adjust as needed


        public InMemorySensorStore(int bufferSize = 500)
        {
            BufferSize = bufferSize;
            _store = new ConcurrentDictionary<string, FixedSizeQueue<SensorSample>>();
        }

        //public void AddSample(SensorSample sample)
        //{
        //    var q = _store.GetOrAdd(sample.SensorId, _ => new FixedSizeQueue<SensorSample>(BufferSize));
        //    q.Enqueue(sample);
        //}

        public SensorSample? GetLatest(string sensorId)
        {
            if (_store.TryGetValue(sensorId, out var q))
                return q.ToList().LastOrDefault();
            return null;
        }

        //public IReadOnlyDictionary<string, IReadOnlyList<SensorSample>> SnapshotAll()
        //{
        //    //return _store.ToDictionary(kv => kv.Key, kv => (IReadOnlyList<SensorSample>)kv.Value.ToList());


        //}


        public void AddSample(SensorSample sample)
        {
            var queue = _store.GetOrAdd(sample.SensorId, _ => new FixedSizeQueue<SensorSample>(_maxSamplesPerSensor));
            queue.Enqueue(sample);
        }

        public IReadOnlyDictionary<string, IReadOnlyList<SensorSample>> SnapshotAll()
        {
            // Flatten all queues and re-group by sensorId to avoid any contamination
            return _store.ToList()
                .SelectMany(kv => kv.Value)           // FixedSizeQueue is enumerable
                .GroupBy(s => s.SensorId)             // Ensure proper grouping by sensorId
                .ToDictionary(
                    g => g.Key,
                    g => (IReadOnlyList<SensorSample>)g.ToList()
                );
        }


        // helper fixed-size queue
        //private class FixedSizeQueue<T>
        //{
        //    private readonly object _lock = new();
        //    private readonly Queue<T> _q;
        //    private readonly int _max;
        //    public FixedSizeQueue(int max)
        //    {
        //        _max = max;
        //        _q = new Queue<T>(max);
        //    }
        //    public void Enqueue(T item)
        //    {
        //        lock (_lock)
        //        {
        //            if (_q.Count == _max) _q.Dequeue();
        //            _q.Enqueue(item);
        //        }
        //    }
        //    public List<T> ToList()
        //    {
        //        lock (_lock) { return _q.ToList(); }
        //    }
        //    public bool TryPeekLast(out T? last)
        //    {
        //        lock (_lock)
        //        {
        //            if (_q.Count == 0) { last = default; return false; }
        //            last = _q.Last();
        //            return true;
        //        }
        //    }
        //}
    }

}
