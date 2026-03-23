using System.ComponentModel;
using Granit.Mcp.Services;
using ModelContextProtocol.Server;

namespace Granit.Mcp.Tools;

[McpServerToolType]
public static class ListBranchesTool
{
    [McpServerTool(Name = "list_branches")]
    [Description(
        "Lists Git branches that have a committed code index, so you know which " +
        "values are valid for the \"branch\" parameter of search_code, get_public_api, " +
        "and get_project_graph.")]
    public static async Task<string> ExecuteAsync(
        CodeIndexClient client,
        [Description("Restrict to a specific repo. Omit to check both.")]
        string? repo = null,
        CancellationToken ct = default)
    {
        var branches = await client.ListBranchesAsync(repo, ct);

        if (branches.Count == 0)
            return "No branches with code indexes found.";

        var grouped = branches
            .GroupBy(b => b.Repo)
            .OrderBy(g => g.Key);

        var sections = grouped.Select(g =>
        {
            var list = g.Select(b => $"- `{b.Branch}`");
            return $"### {g.Key}\n{string.Join('\n', list)}";
        });

        return $"## Available index branches\n\n" +
               string.Join("\n\n", sections);
    }
}
