using System.Collections;
using System.Collections.Generic;

namespace SensorStatsSimulator.API.Utility
{
    public class FixedSizeQueue<T> : IEnumerable<T>
    {
        private readonly Queue<T> _queue;
        private readonly int _maxSize;
        private readonly object _lock = new object();

        public FixedSizeQueue(int maxSize)
        {
            if (maxSize <= 0) throw new ArgumentException("Max size must be greater than 0");
            _maxSize = maxSize;
            _queue = new Queue<T>(maxSize);
        }

        public void Enqueue(T item)
        {
            lock (_lock)
            {
                if (_queue.Count >= _maxSize)
                {
                    _queue.Dequeue();
                }
                _queue.Enqueue(item);
            }
        }

        public List<T> ToList()
        {
            lock (_lock)
            {
                return new List<T>(_queue);
            }
        }

        public IEnumerator<T> GetEnumerator()
        {
            lock (_lock)
            {
                return _queue.ToArray().AsEnumerable().GetEnumerator();
            }
        }

        IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
    }
}
