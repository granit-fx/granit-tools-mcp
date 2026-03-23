using Microsoft.Extensions.Logging;

namespace Granit.Mcp;

public sealed record GranitMcpConfig(
    LogLevel LogLevel,
    int RefreshHours,
    string DataDir,
    string DocsUrl,
    string CodeIndexUrl,
    string FrontIndexUrl)
{
    private const string Prefix = "GRANIT_MCP_";

    public static GranitMcpConfig FromEnvironment()
    {
        var logLevel = ParseEnum(
            $"{Prefix}LOG_LEVEL", LogLevel.Information);
        var refreshHours = ParseInt(
            $"{Prefix}REFRESH_HOURS", 4);
        var dataDir = Environment.GetEnvironmentVariable(
            $"{Prefix}DATA_DIR")
            ?? Path.Combine(
                Environment.GetFolderPath(
                    Environment.SpecialFolder.UserProfile),
                ".granit-mcp");
        var docsUrl = Environment.GetEnvironmentVariable(
            $"{Prefix}DOCS_URL")
            ?? "https://granit-fx.dev/llms-full.txt";
        var codeIndexUrl = Environment.GetEnvironmentVariable(
            $"{Prefix}CODE_INDEX_URL")
            ?? "https://raw.githubusercontent.com/granit-fx/granit-dotnet/{branch}/.mcp-code-index.json";
        var frontIndexUrl = Environment.GetEnvironmentVariable(
            $"{Prefix}FRONT_INDEX_URL")
            ?? "https://raw.githubusercontent.com/granit-fx/granit-front/{branch}/.mcp-front-index.json";

        return new GranitMcpConfig(
            logLevel, refreshHours, dataDir,
            docsUrl, codeIndexUrl, frontIndexUrl);
    }

    private static T ParseEnum<T>(string key, T defaultValue)
        where T : struct, Enum
    {
        var value = Environment.GetEnvironmentVariable(key);
        return Enum.TryParse<T>(value, ignoreCase: true, out var result)
            ? result
            : defaultValue;
    }

    private static int ParseInt(string key, int defaultValue)
    {
        var value = Environment.GetEnvironmentVariable(key);
        return int.TryParse(value, out var result) ? result : defaultValue;
    }
}
