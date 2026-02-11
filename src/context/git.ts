import { execFileSync } from 'node:child_process';
import { basename } from 'node:path';
import type { PipelineTransform } from '../core/pipeline.ts';
import { truncate } from '../core/strings.ts';
import { Footer } from '../footer.ts';
import type { ContextValueProvider } from '../types.ts';

type GitStatus = {
  /* Current branch label, or `detached` when HEAD is not attached to a branch. */
  branch: string;

  /* Number of commits the local branch is ahead of upstream. */
  ahead: number;

  /* Number of commits the local branch is behind upstream. */
  behind: number;

  /* Number of staged file entries in porcelain status output. */
  staged: number;

  /* Number of unstaged file entries in porcelain status output. */
  unstaged: number;

  /* Number of untracked file entries in porcelain status output. */
  untracked: number;
};

type GitCommit = {
  /* Short commit hash from `%h`. */
  hash: string;

  /* Commit subject line from `%s`. */
  subject: string;
};

type GitStatusIconStyle = {
  /* Prefix marker used before branch name. */
  branch: string;

  /* Marker used for staged count. */
  staged: string;

  /* Marker used for unstaged count. */
  unstaged: string;

  /* Marker used for untracked count. */
  untracked: string;

  /* Marker used for ahead count. */
  ahead: string;

  /* Marker used for behind count. */
  behind: string;

  /* Marker used when working tree has no deltas. */
  clean: string;
};

/* Built-in styles for `git_status_icons(style)` transform argument. */
const GIT_STATUS_STYLES: Record<string, GitStatusIconStyle> = {
  ascii: {
    branch: 'git:',
    staged: '+',
    unstaged: '~',
    untracked: '?',
    ahead: '^',
    behind: 'v',
    clean: 'clean',
  },
  unicode: {
    branch: ' ',
    staged: '●',
    unstaged: '✚',
    untracked: '…',
    ahead: '↑',
    behind: '↓',
    clean: 'clean',
  },
};

/* Hard timeout to avoid blocking the footer render loop on slow git calls. */
const GIT_TIMEOUT_MS = 250;

/* Character cap for commit subject preview in `recent_commits` provider. */
const MAX_SUBJECT_LENGTH = 44;

/*
 * Purpose:
 * Run a git subcommand in `cwd`.
 *
 * Inputs:
 * - `cwd`: working directory
 * - `args`: git argument list
 *
 * Returns:
 * - Trimmed stdout on success, otherwise `null`
 */
function runGit(cwd: string, args: string[]): string | null {
  try {
    return execFileSync('git', ['-C', cwd, ...args], {
      encoding: 'utf-8',
      timeout: GIT_TIMEOUT_MS,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/*
 * Purpose:
 * Parse git status header metadata fragment (e.g. `ahead 2, behind 1`).
 *
 * Inputs:
 * - `meta`: bracket metadata from porcelain header
 *
 * Returns:
 * - Ahead/behind counters
 */
function parseBranchMeta(meta: string): { ahead: number; behind: number } {
  const aheadMatch = meta.match(/ahead (\d+)/);
  const behindMatch = meta.match(/behind (\d+)/);
  return {
    ahead: aheadMatch ? Number(aheadMatch[1]) : 0,
    behind: behindMatch ? Number(behindMatch[1]) : 0,
  };
}

/*
 * Purpose:
 * Parse porcelain status output into structured counters.
 *
 * Inputs:
 * - `output`: stdout from `git status --porcelain=v1 --branch`
 *
 * Returns:
 * - Structured `GitStatus`
 */
function parseStatus(output: string): GitStatus {
  const lines = output.split(/\r?\n/).filter((line) => line.length > 0);

  let branch = 'detached';
  let ahead = 0;
  let behind = 0;
  let staged = 0;
  let unstaged = 0;
  let untracked = 0;

  const header = lines[0];
  if (header?.startsWith('## ')) {
    const branchMatch = header.match(/^## ([^.\s]+)(?:\.\.\.[^\s]+)?(?: \[(.+)\])?/);
    if (branchMatch?.[1]) {
      branch = branchMatch[1] === 'HEAD' ? 'detached' : branchMatch[1];
    }
    if (branchMatch?.[2]) {
      const parsed = parseBranchMeta(branchMatch[2]);
      ahead = parsed.ahead;
      behind = parsed.behind;
    }
  }

  for (const line of lines.slice(1)) {
    if (line.startsWith('??')) {
      untracked += 1;
      continue;
    }

    const x = line[0] ?? ' ';
    const y = line[1] ?? ' ';

    if (x !== ' ') staged += 1;
    if (y !== ' ') unstaged += 1;
  }

  return { branch, ahead, behind, staged, unstaged, untracked };
}

/*
 * Purpose:
 * Resolve repository status for a directory.
 *
 * Inputs:
 * - `cwd`: working directory
 *
 * Returns:
 * - `GitStatus` or `null` when unavailable
 */
function getGitStatus(cwd: string): GitStatus | null {
  const output = runGit(cwd, ['status', '--porcelain=v1', '--branch', '--untracked-files=normal']);
  if (!output) return null;

  return parseStatus(output);
}

/*
 * Purpose:
 * Read recent commits for compact footer display.
 *
 * Inputs:
 * - `cwd`: working directory
 * - `limit`: desired number of commits (clamped internally)
 *
 * Returns:
 * - Array of `{hash, subject}` entries, newest first
 */
function getRecentCommits(cwd: string, limit = 2): GitCommit[] {
  const safeLimit = Math.max(1, Math.min(limit, 5));

  const output = runGit(cwd, [
    'log',
    `-${safeLimit}`,
    '--pretty=format:%h%x09%s',
    '--no-show-signature',
  ]);

  if (!output) return [];

  return output
    .split(/\r?\n/)
    .map((line) => line.split('\t'))
    .map(([hash = '', subject = '']) => ({ hash, subject }))
    .filter((entry) => entry.hash.length > 0 && entry.subject.length > 0);
}

/*
 * Purpose:
 * Resolve worktree display name from repository top-level path basename.
 *
 * Inputs:
 * - `cwd`: working directory
 *
 * Returns:
 * - Worktree name or `null`
 */
function getGitWorktreeName(cwd: string): string | null {
  const worktreeRoot = runGit(cwd, ['rev-parse', '--show-toplevel']);
  if (!worktreeRoot) return null;

  return basename(worktreeRoot);
}

/* Runtime type guard used by `git_status_icons` transform. */
function isGitStatus(value: unknown): value is GitStatus {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<GitStatus>;
  return (
    typeof candidate.branch === 'string' &&
    typeof candidate.staged === 'number' &&
    typeof candidate.unstaged === 'number' &&
    typeof candidate.untracked === 'number' &&
    typeof candidate.ahead === 'number' &&
    typeof candidate.behind === 'number'
  );
}

/* Normalize transform style argument to one of the known icon style maps. */
function resolveGitStatusStyle(styleArg: unknown): GitStatusIconStyle {
  if (typeof styleArg !== 'string') return GIT_STATUS_STYLES.ascii;

  const normalized = styleArg.trim();
  if (!normalized) return GIT_STATUS_STYLES.ascii;

  if (normalized in GIT_STATUS_STYLES) {
    return GIT_STATUS_STYLES[normalized];
  }

  if (normalized.startsWith('GitStatusStyle.')) {
    const key = normalized.slice('GitStatusStyle.'.length);
    if (key in GIT_STATUS_STYLES) {
      return GIT_STATUS_STYLES[key];
    }
  }

  return GIT_STATUS_STYLES.ascii;
}

/* Convert structured git status object into compact branch + delta indicator text. */
const git_status_icons: PipelineTransform = (state, _ctx, styleArg?) => {
  const value = state.value;
  if (!isGitStatus(value)) return { ...state, text: '--' };

  const style = resolveGitStatusStyle(styleArg);
  const markers: string[] = [];

  if (value.staged > 0) markers.push(`${style.staged}${value.staged}`);
  if (value.unstaged > 0) markers.push(`${style.unstaged}${value.unstaged}`);
  if (value.untracked > 0) markers.push(`${style.untracked}${value.untracked}`);
  if (value.ahead > 0) markers.push(`${style.ahead}${value.ahead}`);
  if (value.behind > 0) markers.push(`${style.behind}${value.behind}`);

  const summary = markers.length > 0 ? markers.join(' ') : style.clean;
  const text = `${style.branch}${value.branch} ${summary}`.trim();
  return { ...state, text };
};

/* Provider: current git branch label for `{git_branch_name}`. */
const gitBranchNameProvider: ContextValueProvider = (props) => {
  const status = getGitStatus(props.ctx.cwd);
  return status?.branch ?? '';
};

/* Provider: current git worktree folder name for `{git_worktree_name}`. */
const gitWorktreeNameProvider: ContextValueProvider = (props) => {
  return getGitWorktreeName(props.ctx.cwd) ?? '';
};

/* Provider: full structured status object for transform-based rendering. */
const gitStatusProvider: ContextValueProvider = (props) => {
  return getGitStatus(props.ctx.cwd);
};

/* Provider: latest commit summary object with truncated subject line. */
const recentCommitsProvider: ContextValueProvider = (props) => {
  const recent = getRecentCommits(props.ctx.cwd, 1);
  const latest = recent[0];
  if (!latest) return null;

  return {
    hash: latest.hash,
    subject: truncate(latest.subject, MAX_SUBJECT_LENGTH),
  };
};

/* Register built-in git providers. */
Footer.registerContextValue('git_branch_name', gitBranchNameProvider);
Footer.registerContextValue('git_worktree_name', gitWorktreeNameProvider);
Footer.registerContextValue('git_status', gitStatusProvider);
Footer.registerContextValue('recent_commits', recentCommitsProvider);

/* Register built-in git transforms. */
Footer.registerContextTransform('git_status_icons', git_status_icons);
