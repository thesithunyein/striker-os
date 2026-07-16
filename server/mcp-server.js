// Striker OS MCP Server — exposes live World Cup / soccer data as MCP tools.
//
// Add to Cursor or Claude Desktop (see mcp.json) and call these tools with
// natural language. Data is fetched live from TheSportsDB.
//
// Tools:
//   worldcup_fixtures  -> upcoming + recent fixtures
//   worldcup_match     -> deep intel for one match by team/name query
//   worldcup_teams     -> team metadata for a league

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getFixtures, getMatch, getTeams } from "./worldcup.js";

const server = new McpServer({
  name: "striker-os-worldcup",
  version: "1.0.0"
});

server.tool(
  "worldcup_fixtures",
  "Get upcoming and recent World Cup / soccer fixtures (live data).",
  { limit: z.number().min(1).max(20).optional() },
  async ({ limit }) => {
    const fixtures = await getFixtures(limit || 6);
    return {
      content: [{ type: "text", text: JSON.stringify(fixtures, null, 2) }]
    };
  }
);

server.tool(
  "worldcup_match",
  "Get deep intel for a single match by team name or query (live data).",
  { query: z.string() },
  async ({ query }) => {
    const match = await getMatch(query);
    return {
      content: [
        {
          type: "text",
          text: match
            ? JSON.stringify(match, null, 2)
            : `No live fixture matched "${query}".`
        }
      ]
    };
  }
);

server.tool(
  "worldcup_teams",
  "Get team metadata (stadium, founded year, country) for a soccer league.",
  { league: z.string().optional() },
  async ({ league }) => {
    const teams = await getTeams(league || "English Premier League");
    return {
      content: [{ type: "text", text: JSON.stringify(teams, null, 2) }]
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Striker OS MCP server running on stdio.");
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});
