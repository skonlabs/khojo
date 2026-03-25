import { useState, useMemo } from "react";
import { sampleRuns, failureTypeConfig, type FailureType, type Confidence } from "@/data/sampleData";
import { FailureBadge } from "@/components/FailureBadge";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown, Filter, Search } from "lucide-react";

type SortKey = 'timestamp' | 'tokens' | 'id';
type SortDir = 'asc' | 'desc';

export default function RunsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FailureType | 'all' | 'pass'>('all');
  const [filterConfidence, setFilterConfidence] = useState<Confidence | 'all'>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const models = useMemo(() => [...new Set(sampleRuns.map(r => r.model))], []);

  const filteredRuns = useMemo(() => {
    let runs = [...sampleRuns];

    // Search
    if (search) {
      const q = search.toLowerCase();
      runs = runs.filter(r =>
        r.input.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        r.source.toLowerCase().includes(q) ||
        r.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Filter by type
    if (filterType === 'pass') {
      runs = runs.filter(r => r.failureTypes.length === 0);
    } else if (filterType !== 'all') {
      runs = runs.filter(r => r.failureTypes.includes(filterType));
    }

    // Filter by confidence
    if (filterConfidence !== 'all') {
      runs = runs.filter(r => r.confidence === filterConfidence);
    }

    // Filter by model
    if (filterModel !== 'all') {
      runs = runs.filter(r => r.model === filterModel);
    }

    // Sort
    runs.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'timestamp') cmp = a.timestamp.localeCompare(b.timestamp);
      else if (sortKey === 'tokens') cmp = a.tokens.total - b.tokens.total;
      else if (sortKey === 'id') cmp = a.id.localeCompare(b.id);
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return runs;
  }, [search, filterType, filterConfidence, filterModel, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const failureTypes: (FailureType | 'all' | 'pass')[] = ['all', 'pass', 'hallucination', 'incomplete', 'irrelevant', 'verbose', 'inconsistent'];

  return (
    <div className="p-6 max-w-6xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Runs</h1>
        <p className="text-sm text-muted-foreground mt-1">All captured AI runs ({filteredRuns.length} of {sampleRuns.length})</p>
      </div>

      {/* Filters bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search runs..."
            className="w-full bg-surface-1 border border-border rounded-md pl-8 pr-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as typeof filterType)}
            className="bg-surface-1 border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {failureTypes.map(t => (
              <option key={t} value={t}>
                {t === 'all' ? 'All types' : t === 'pass' ? '✓ Passed' : failureTypeConfig[t].emoji + ' ' + failureTypeConfig[t].label}
              </option>
            ))}
          </select>
        </div>

        {/* Confidence filter */}
        <select
          value={filterConfidence}
          onChange={e => setFilterConfidence(e.target.value as typeof filterConfidence)}
          className="bg-surface-1 border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All confidence</option>
          <option value="high">High confidence</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Model filter */}
        <select
          value={filterModel}
          onChange={e => setFilterModel(e.target.value)}
          className="bg-surface-1 border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="all">All models</option>
          {models.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-[70px_1fr_auto_110px_80px] gap-3 px-4 py-2.5 bg-surface-1 border-b border-border text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          <button onClick={() => toggleSort('id')} className="flex items-center gap-1 hover:text-foreground transition-colors text-left">
            ID <ArrowUpDown className="h-2.5 w-2.5" />
          </button>
          <span>Input</span>
          <span>Issues</span>
          <span>Source</span>
          <button onClick={() => toggleSort('tokens')} className="flex items-center gap-1 hover:text-foreground transition-colors justify-end">
            Tokens <ArrowUpDown className="h-2.5 w-2.5" />
          </button>
        </div>
        {filteredRuns.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No runs match your filters.</div>
        ) : (
          filteredRuns.map(run => (
            <button
              key={run.id}
              onClick={() => navigate(`/runs/${run.id}`)}
              className="w-full grid grid-cols-[70px_1fr_auto_110px_80px] gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-surface-1 transition-colors text-left items-center"
            >
              <span className="text-xs font-mono text-muted-foreground">{run.id.replace('run-', '#')}</span>
              <span className="text-sm text-foreground truncate">{run.input}</span>
              <div className="flex gap-1">
                {run.failureTypes.length > 0 ? (
                  run.failureTypes.map(ft => <FailureBadge key={ft} type={ft} />)
                ) : (
                  <span className="text-xs text-primary font-medium">✓ Pass</span>
                )}
              </div>
              <span className="text-xs font-mono text-muted-foreground truncate">{run.source}</span>
              <span className="text-xs font-mono text-muted-foreground text-right">{run.tokens.total}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
