import type { AgentEntry, AgentSummary } from '../types.js';

interface ListOptions {
  division?: string;
  q?: string;
  limit?: number;
  offset?: number;
}

interface ListResult {
  agents: AgentSummary[];
  total: number;
  limit: number;
  offset: number;
}

export class Catalog {
  private readonly agents: Map<string, AgentEntry>;
  private readonly sorted: AgentEntry[];

  constructor(entries: AgentEntry[]) {
    this.agents = new Map(entries.map((e) => [e.slug, e]));
    this.sorted = [...entries].sort((a, b) => a.slug.localeCompare(b.slug));
  }

  get count(): number {
    return this.agents.size;
  }

  list(options: ListOptions): ListResult {
    const { division, q, limit = 20, offset = 0 } = options;

    let filtered = this.sorted;

    if (division) {
      filtered = filtered.filter((a) => a.division === division);
    }

    if (q) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(lower) ||
          a.specialty.toLowerCase().includes(lower) ||
          a.whenToUse.toLowerCase().includes(lower),
      );
    }

    const total = filtered.length;
    const page = filtered.slice(offset, offset + limit);

    return {
      agents: page.map(toSummary),
      total,
      limit,
      offset,
    };
  }

  get(slug: string): AgentEntry | undefined {
    return this.agents.get(slug);
  }
}

function toSummary(entry: AgentEntry): AgentSummary {
  return {
    slug: entry.slug,
    name: entry.name,
    division: entry.division,
    specialty: entry.specialty,
    whenToUse: entry.whenToUse,
    emoji: entry.emoji,
  };
}
