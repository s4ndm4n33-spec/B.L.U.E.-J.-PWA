import { Router, type IRouter } from "express";

const router: IRouter = Router();

interface GitHubPushBody {
  token: string;
  owner: string;
  repo: string;
  code: string;
  language: string;
  filename?: string;
  commitMessage?: string;
  description?: string;
  isPrivate?: boolean;
}

function getFilename(language: string): string {
  switch (language) {
    case "python": return "main.py";
    case "cpp": return "main.cpp";
    case "javascript": return "main.js";
    default: return "main.txt";
  }
}

async function ghFetch(path: string, token: string, method = "GET", body?: unknown) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      "User-Agent": "BLUEJ-AI-Simulator/1.0",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

router.post("/push", async (req, res) => {
  try {
    const {
      token, owner, repo, code, language,
      filename, commitMessage, description, isPrivate = false,
    } = req.body as GitHubPushBody;

    if (!token?.trim())  { res.status(400).json({ error: "GitHub token is required." }); return; }
    if (!owner?.trim())  { res.status(400).json({ error: "GitHub username is required." }); return; }
    if (!repo?.trim())   { res.status(400).json({ error: "Repository name is required." }); return; }
    if (!code?.trim())   { res.status(400).json({ error: "No code to push." }); return; }

    const file = filename || getFilename(language);
    const message = commitMessage || `J. export — ${language} — ${new Date().toISOString().slice(0, 10)}`;

    // 1. Verify token works
    const { status: authStatus } = await ghFetch("/user", token);
    if (authStatus === 401) {
      res.status(401).json({ error: "Invalid GitHub token. Please check your Personal Access Token." });
      return;
    }

    // 2. Check if repo exists
    const { status: repoStatus } = await ghFetch(`/repos/${owner}/${repo}`, token);

    if (repoStatus === 404) {
      // Create the repo
      const { status: createStatus, data: createData } = await ghFetch("/user/repos", token, "POST", {
        name: repo,
        description: description || "Created by B.L.U.E.-J. AI Coding Simulator",
        private: isPrivate,
        auto_init: false,
      });
      if (createStatus !== 201) {
        res.status(500).json({ error: `Failed to create repository: ${(createData as any)?.message ?? "Unknown error"}` });
        return;
      }
      // Wait briefly for GitHub to initialize
      await new Promise(r => setTimeout(r, 800));
    } else if (repoStatus !== 200) {
      res.status(500).json({ error: "Unable to access repository. Check your token permissions." });
      return;
    }

    // 3. Check if file already exists to get its SHA (needed for updates)
    const { status: fileStatus, data: fileData } = await ghFetch(
      `/repos/${owner}/${repo}/contents/${file}`, token
    );
    const existingSha = fileStatus === 200 ? (fileData as any)?.sha : undefined;

    // 4. Commit the file
    const encodedContent = Buffer.from(code, "utf-8").toString("base64");
    const { status: putStatus, data: putData } = await ghFetch(
      `/repos/${owner}/${repo}/contents/${file}`, token, "PUT", {
        message,
        content: encodedContent,
        ...(existingSha ? { sha: existingSha } : {}),
      }
    );

    if (putStatus !== 200 && putStatus !== 201) {
      res.status(500).json({ error: `Failed to push file: ${(putData as any)?.message ?? "Unknown error"}` });
      return;
    }

    const repoUrl = `https://github.com/${owner}/${repo}`;
    const fileUrl = `${repoUrl}/blob/main/${file}`;

    res.json({
      success: true,
      repoUrl,
      fileUrl,
      created: repoStatus === 404,
      message: existingSha ? "File updated." : "File created.",
    });
  } catch (err) {
    req.log.error({ err }, "GitHub push error");
    res.status(500).json({ error: "An unexpected error occurred during GitHub push." });
  }
});

export default router;
