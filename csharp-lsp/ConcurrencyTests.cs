using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

public sealed class ConcurrencyTests
{
    private sealed class AsyncLock
    {
        private readonly SemaphoreSlim _sem;
        public AsyncLock(int initial = 1) => _sem = new SemaphoreSlim(initial, initial);
        public async Task<IDisposable> AcquireAsync()
        {
            await _sem.WaitAsync();
            return new Releaser(_sem);
        }

        private sealed class Releaser : IDisposable
        {
            private readonly SemaphoreSlim _sem;
            public Releaser(SemaphoreSlim sem) => _sem = sem;
            public void Dispose() => _sem.Release();
        }
    }

    [Fact]
    public async Task FileLock_AllowsOnlyOneWriterAtATime()
    {
        var fileLock = new AsyncLock();
        int concurrent = 0;
        int max = 0;

        async Task Work()
        {
            using (await fileLock.AcquireAsync())
            {
                concurrent++;
                max = Math.Max(max, concurrent);
                await Task.Delay(50);
                concurrent--;
            }
        }

        await Task.WhenAll(Work(), Work(), Work());
        Assert.Equal(1, max);
    }

    [Fact]
    public async Task RequestLimiter_AllowsParallelismUpToLimit()
    {
        var limiter = new SemaphoreSlim(2, 2);
        int concurrent = 0;
        int max = 0;

        async Task Work()
        {
            await limiter.WaitAsync();
            try
            {
                concurrent++;
                max = Math.Max(max, concurrent);
                await Task.Delay(50);
                concurrent--;
            }
            finally
            {
                limiter.Release();
            }
        }

        await Task.WhenAll(Work(), Work(), Work(), Work());
        Assert.Equal(2, max);
    }

    [Fact]
    public async Task WriteLock_SerializesWrites()
    {
        var writeLock = new AsyncLock();
        var order = new List<int>();

        async Task Write(int id)
        {
            using (await writeLock.AcquireAsync())
            {
                order.Add(id);
                await Task.Delay(10);
            }
        }

        await Task.WhenAll(Write(1), Write(2), Write(3));
        Assert.Equal(3, order.Count);
        Assert.True(order[0] != order[1] && order[1] != order[2]);
    }
}
