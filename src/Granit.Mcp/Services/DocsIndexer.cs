using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Granit.Mcp.Services;

/// <summary>
/// Background service that fetches llms-full.txt and indexes it into
/// the DocsStore on startup, then refreshes periodically.
/// </summary>
public sealed class DocsIndexer(
    DocsStore store,
    IHttpClientFactory httpFactory,
    GranitMcpConfig config,
    ILogger<DocsIndexer> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        // Skip if we already have a fresh cached index
        if (!store.HasFreshIndex(config.RefreshHours))
        {
            await IndexAsync(ct);
        }
        else
        {
            logger.LogInformation(
                "Using cached FTS5 index (still fresh)");
            // Mark as ready — the persisted DB is loaded
            store.Index(await FetchDocsAsync(ct));
        }

        using var timer = new PeriodicTimer(
            TimeSpan.FromHours(config.RefreshHours));
        while (await timer.WaitForNextTickAsync(ct))
        {
            await IndexAsync(ct);
        }
    }

    private async Task IndexAsync(CancellationToken ct)
    {
        try
        {
            logger.LogInformation(
                "Fetching llms-full.txt from {Url}", config.DocsUrl);
            var content = await FetchDocsAsync(ct);
            store.Index(content);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            logger.LogWarning(ex,
                "Failed to index docs — serving stale cache if available");
        }
    }

    private async Task<string> FetchDocsAsync(CancellationToken ct)
    {
        using var http = httpFactory.CreateClient();
        http.Timeout = TimeSpan.FromSeconds(30);
        return await http.GetStringAsync(config.DocsUrl, ct);
    }
}
