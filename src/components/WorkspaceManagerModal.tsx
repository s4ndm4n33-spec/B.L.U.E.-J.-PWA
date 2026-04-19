import { useMemo, useState } from 'react';
import {
  Check,
  FileCode2,
  FolderOpen,
  GitCompareArrows,
  Save,
  Search,
  WandSparkles,
  X,
} from 'lucide-react';
import { useBlueJStore } from '@/lib/store';
import {
  createDiffPreview,
  listWorkspaceFiles,
  pickWorkspaceFiles,
  readWorkspaceFile,
  searchWorkspaceFiles,
  writeWorkspaceFile,
} from '@/lib/workspace-tools';
import { usePatchWorkspaceFile } from '@/hooks/use-bluej-api';
import { optimizeOfflineCode, patchOfflineCode } from '@/lib/offline-ai';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WorkspaceManagerModal({ open, onClose }: Props) {
  const {
    workspaceFiles,
    selectedWorkspaceFileId,
    importWorkspaceFile,
    selectWorkspaceFile,
    setWorkspacePendingPatch,
    acceptWorkspacePatch,
    rejectWorkspacePatch,
    markWorkspaceSaved,
    providerMode,
    localModelReady,
    workspacePermissionMode,
    workspaceSessionApproved,
  } = useBlueJStore();

  const [query, setQuery] = useState('');
  const [instruction, setInstruction] = useState('');
  const [savingFileId, setSavingFileId] = useState<string | null>(null);
  const patchMutation = usePatchWorkspaceFile();

  const selectedFile = selectedWorkspaceFileId
    ? readWorkspaceFile(workspaceFiles, selectedWorkspaceFileId)
    : undefined;

  const filteredFiles = useMemo(() => {
    const listed = listWorkspaceFiles(workspaceFiles);
    return searchWorkspaceFiles(listed, query);
  }, [query, workspaceFiles]);

  if (!open) return null;

  const canUseLocal = providerMode !== 'cloud' && localModelReady;
  const canAutoSave = workspacePermissionMode === 'project-session' && workspaceSessionApproved;

  const importFiles = async () => {
    const files = await pickWorkspaceFiles();
    files.forEach((file) => importWorkspaceFile(file));
  };

  const proposePatch = async () => {
    if (!selectedFile || !instruction.trim()) return;

    try {
      const result = canUseLocal
        ? await patchOfflineCode(selectedFile.content, instruction, selectedFile.language)
        : await patchMutation.mutateAsync({
            content: selectedFile.content,
            instruction,
            language: selectedFile.language,
          });

      setWorkspacePendingPatch(
        selectedFile.id,
        result.updatedContent,
        createDiffPreview(selectedFile.content, result.updatedContent),
      );
      setInstruction('');
    } catch (error) {
      console.error('Patch proposal failed', error);
    }
  };

  const saveSelectedFile = async () => {
    if (!selectedFile) return;
    if (!canAutoSave && !window.confirm(`Write ${selectedFile.name} back to its approved workspace?`)) {
      return;
    }

    setSavingFileId(selectedFile.id);
    try {
      await writeWorkspaceFile(selectedFile);
      markWorkspaceSaved(selectedFile.id, selectedFile.content);
    } finally {
      setSavingFileId(null);
    }
  };

  const runOptimizerOnSelected = async () => {
    if (!selectedFile) return;
    const result = canUseLocal
      ? await optimizeOfflineCode(selectedFile.content, selectedFile.language)
      : await patchMutation.mutateAsync({
          content: selectedFile.content,
          instruction: 'Apply the Five Masters optimisation without changing the underlying persona or safety logic.',
          language: selectedFile.language,
        });

    setWorkspacePendingPatch(
      selectedFile.id,
      'optimizedCode' in result ? result.optimizedCode : result.updatedContent,
      createDiffPreview(
        selectedFile.content,
        'optimizedCode' in result ? result.optimizedCode : result.updatedContent,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-sm border border-primary/30 bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-primary/20 px-4 py-3">
          <div className="flex items-center gap-2 text-primary">
            <FolderOpen className="h-4 w-4" />
            <span className="font-hud text-sm uppercase tracking-widest">
              Scoped Workspace
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-primary/20 px-2 py-1 text-xs font-hud text-primary/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-0 md:grid-cols-[280px_1fr]">
          <aside className="border-r border-primary/20 p-4">
            <button
              onClick={importFiles}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-primary"
            >
              <FolderOpen className="h-4 w-4" />
              Import Files
            </button>
            <div className="mb-3 flex items-center gap-2 rounded border border-primary/20 bg-black/30 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-primary/50" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search workspace"
                className="w-full bg-transparent text-xs font-mono text-primary outline-none placeholder:text-primary/30"
              />
            </div>

            <div className="space-y-2 overflow-y-auto">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => selectWorkspaceFile(file.id)}
                  className={`w-full rounded border px-3 py-2 text-left ${
                    file.id === selectedWorkspaceFileId
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-primary/10 bg-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-hud uppercase tracking-wider text-primary">
                      {file.name}
                    </span>
                    <span className="text-[10px] font-mono text-primary/50">
                      {file.status}
                    </span>
                  </div>
                  <p className="truncate text-[11px] font-mono text-primary/35">
                    {file.path}
                  </p>
                </button>
              ))}
            </div>
          </aside>

          <section className="flex flex-col p-4">
            {selectedFile ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 text-primary">
                      <FileCode2 className="h-4 w-4" />
                      <span className="font-hud text-sm uppercase tracking-widest">
                        {selectedFile.name}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-primary/45">
                      Permission mode: {workspacePermissionMode}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={runOptimizerOnSelected}
                      className="rounded border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-yellow-300"
                    >
                      <WandSparkles className="mr-1 inline h-4 w-4" />
                      Optimise
                    </button>
                    <button
                      onClick={saveSelectedFile}
                      disabled={savingFileId === selectedFile.id}
                      className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-green-300 disabled:opacity-50"
                    >
                      <Save className="mr-1 inline h-4 w-4" />
                      {savingFileId === selectedFile.id ? 'Saving...' : 'Write'}
                    </button>
                  </div>
                </div>

                <div className="grid flex-1 gap-4 md:grid-cols-[1.1fr_0.9fr]">
                  <div className="min-h-0 rounded border border-primary/20 bg-black/20 p-3">
                    <pre className="h-full overflow-auto whitespace-pre-wrap text-xs font-mono text-primary/85">
                      {selectedFile.pendingContent ?? selectedFile.content}
                    </pre>
                  </div>

                  <div className="flex min-h-0 flex-col gap-3">
                    <div className="rounded border border-primary/20 bg-black/20 p-3">
                      <label className="mb-2 block text-xs font-hud uppercase tracking-widest text-primary/60">
                        Self patch instruction
                      </label>
                      <textarea
                        value={instruction}
                        onChange={(event) => setInstruction(event.target.value)}
                        rows={4}
                        placeholder="Describe the file change J. should make while preserving persona and safety logic."
                        className="w-full rounded border border-primary/20 bg-black/30 p-3 text-xs font-mono text-primary outline-none placeholder:text-primary/25"
                      />
                      <button
                        onClick={proposePatch}
                        disabled={!instruction.trim() || patchMutation.isPending}
                        className="mt-3 rounded border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-accent disabled:opacity-50"
                      >
                        {patchMutation.isPending ? 'Proposing...' : 'Propose Patch'}
                      </button>
                    </div>

                    <div className="min-h-0 flex-1 rounded border border-primary/20 bg-black/20 p-3">
                      <div className="mb-2 flex items-center gap-2 text-primary/70">
                        <GitCompareArrows className="h-4 w-4" />
                        <span className="text-xs font-hud uppercase tracking-widest">
                          Diff Preview
                        </span>
                      </div>
                      <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap text-xs font-mono text-primary/75">
                        {selectedFile.diffPreview ?? 'No pending patch.'}
                      </pre>

                      {selectedFile.pendingContent && (
                        <div className="mt-3 flex gap-2">
                          <button
                            onClick={() => acceptWorkspacePatch(selectedFile.id)}
                            className="rounded border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-green-300"
                          >
                            <Check className="mr-1 inline h-4 w-4" />
                            Approve patch
                          </button>
                          <button
                            onClick={() => rejectWorkspacePatch(selectedFile.id)}
                            className="rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-hud uppercase tracking-widest text-red-300"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded border border-dashed border-primary/20 text-center text-sm font-mono text-primary/45">
                Import a scoped project file to let J. read, patch, and write with explicit approval.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
