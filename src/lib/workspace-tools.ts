import { createWorkspaceFile, type ProgrammingLanguage, type WorkspaceFile } from '@/lib/store';

type PickerHandle = FileSystemFileHandle;

const fileHandleMap = new Map<string, PickerHandle>();

function inferLanguageFromName(name: string): ProgrammingLanguage {
  const lowered = name.toLowerCase();
  if (lowered.endsWith('.cpp') || lowered.endsWith('.cc') || lowered.endsWith('.cxx') || lowered.endsWith('.c') || lowered.endsWith('.hpp') || lowered.endsWith('.h')) {
    return 'cpp';
  }
  if (lowered.endsWith('.js') || lowered.endsWith('.jsx') || lowered.endsWith('.ts') || lowered.endsWith('.tsx')) {
    return 'javascript';
  }
  return 'python';
}

async function fileToWorkspaceFile(file: File, handle?: PickerHandle): Promise<WorkspaceFile> {
  const content = await file.text();
  const workspaceFile = createWorkspaceFile(
    file.name,
    file.name,
    content,
    inferLanguageFromName(file.name),
  );
  if (handle) {
    fileHandleMap.set(workspaceFile.id, handle);
  }
  return workspaceFile;
}

export async function pickWorkspaceFiles(): Promise<WorkspaceFile[]> {
  if ('showOpenFilePicker' in window) {
    const handles = await window.showOpenFilePicker({
      multiple: true,
      types: [
        {
          description: 'Code files',
          accept: {
            'text/plain': ['.py', '.js', '.ts', '.jsx', '.tsx', '.cpp', '.cc', '.cxx', '.c', '.hpp', '.h', '.md', '.txt', '.json'],
          },
        },
      ],
    });

    const files = await Promise.all(
      handles.map(async (handle) => {
        const file = await handle.getFile();
        return fileToWorkspaceFile(file, handle);
      }),
    );
    return files;
  }

  return new Promise<WorkspaceFile[]>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.py,.js,.ts,.jsx,.tsx,.cpp,.cc,.cxx,.c,.hpp,.h,.md,.txt,.json';
    input.onchange = async () => {
      const selectedFiles = Array.from(input.files ?? []);
      const files = await Promise.all(selectedFiles.map((file) => fileToWorkspaceFile(file)));
      resolve(files);
    };
    input.click();
  });
}

export function listWorkspaceFiles(files: WorkspaceFile[]): WorkspaceFile[] {
  return [...files].sort((left, right) => left.name.localeCompare(right.name));
}

export function readWorkspaceFile(
  files: WorkspaceFile[],
  id: string,
): WorkspaceFile | undefined {
  return files.find((file) => file.id === id);
}

export function searchWorkspaceFiles(
  files: WorkspaceFile[],
  query: string,
): WorkspaceFile[] {
  const needle = query.trim().toLowerCase();
  if (!needle) {
    return files;
  }
  return files.filter((file) => (
    file.name.toLowerCase().includes(needle) ||
    file.path.toLowerCase().includes(needle) ||
    file.content.toLowerCase().includes(needle)
  ));
}

export function createDiffPreview(previous: string, next: string): string {
  const previousLines = previous.split('\n');
  const nextLines = next.split('\n');
  const diffLines: string[] = [];
  const maxLines = Math.max(previousLines.length, nextLines.length);

  for (let index = 0; index < maxLines; index += 1) {
    const before = previousLines[index];
    const after = nextLines[index];

    if (before === after) {
      continue;
    }
    if (before !== undefined) {
      diffLines.push(`- ${before}`);
    }
    if (after !== undefined) {
      diffLines.push(`+ ${after}`);
    }
    if (diffLines.length > 40) {
      diffLines.push('... diff truncated ...');
      break;
    }
  }

  return diffLines.join('\n') || 'No changes.';
}

export async function writeWorkspaceFile(file: WorkspaceFile): Promise<'saved' | 'downloaded'> {
  const handle = fileHandleMap.get(file.id);
  if (handle) {
    const writable = await handle.createWritable();
    await writable.write(file.content);
    await writable.close();
    return 'saved';
  }

  const blob = new Blob([file.content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return 'downloaded';
}
