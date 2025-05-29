import * as vscode from 'vscode';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { existsSync } from 'fs';
import * as path from 'path';
import * as fs from 'fs/promises';

interface GitHubPRItem {
    number: number;
    title: string;
    html_url: string;
    user: {
        login: string;
    };
}

interface GitHubSearchResponse {
    total_count: number;
    incomplete_results: boolean;
    items: GitHubPRItem[];
}

async function checkCommandExists(command: string): Promise<boolean> {
    return new Promise((resolve) => {
        const cmd = spawn(command, ['--version']);
        cmd.on('error', () => resolve(false)); // Command not found
        cmd.on('close', (code) => resolve(code === 0)); // Command found
    });
}

export async function runNixpkgsReview(context: vscode.ExtensionContext) {

    const gitExists = await checkCommandExists('git');
    const nixExists = await checkCommandExists('nix');

    if (!gitExists) {
        vscode.window.showErrorMessage('Git is not installed. Please install Git to continue.');
        return;
    }

    if (!nixExists) {
        vscode.window.showErrorMessage('Nix is not installed. Please install Nix to continue.');
        return;
    }

    const outputChannel = vscode.window.createOutputChannel("nixpkgs-review");
    outputChannel.clear();
    outputChannel.show(true);

    // GitHub session
    let session;
    try {
        session = await vscode.authentication.getSession("github", ["repo"], { createIfNone: true });
    } catch (err: any) {
        vscode.window.showErrorMessage("GitHub authentication failed.");
        return;
    }
    const token = session.accessToken;
    const username = session.account.label;

    // Fetch PRs where user is involved
    const fetchPRs = async (): Promise<GitHubPRItem[]> => {
        const res = await fetch(`https://api.github.com/search/issues?q=is:pr+repo:NixOS/nixpkgs+state:open+involves:${username}`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
            }
        });

        if (!res.ok) { throw new Error(`GitHub API error: ${res.statusText}`); }

        const dataRaw = await res.json();

        if (!dataRaw || typeof dataRaw !== 'object' || !('items' in dataRaw)) {
            throw new Error("Unexpected GitHub API response");
        }

        const data = dataRaw as GitHubSearchResponse;
        return data.items;
    };
    let prOptions: any[] = [];
    try {
        const prs = await fetchPRs();
        prOptions = prs.map((pr: any) => ({
            label: `#${pr.number} - ${pr.title}`,
            description: `Author: ${pr.user.login}`,
            detail: pr.html_url,
            prNumber: pr.number,
        }));
    } catch (err: any) {
        vscode.window.showErrorMessage(`Failed to fetch pull requests: ${err.message}`);
        return;
    }

    // Prompt user
    const selection = await vscode.window.showQuickPick(
        [
            { label: '🔢 Enter PR number or GitHub PR URL manually', prNumber: null },
            ...prOptions

        ],
        {
            placeHolder: "Select a pull request to review",
            ignoreFocusOut: true,
        }
    );

    if (!selection) { return; }

    let prInput: string;
    if (selection.prNumber === null) {
        const input = await vscode.window.showInputBox({
            prompt: 'Enter PR number or GitHub PR URL',
            ignoreFocusOut: true,
            validateInput: (value) => value.trim() === '' ? 'Input cannot be empty' : null,
        });
        if (!input) { return; }
        prInput = input;
    } else {
        prInput = selection.prNumber.toString();
    }

    outputChannel.appendLine(`Running nixpkgs-review for: ${prInput}\n`);

    // Prepare nixpkgs path
    const storagePath = context.globalStorageUri.fsPath;
    const nixpkgsPath = path.join(storagePath, 'nixpkgs');

    if (!existsSync(nixpkgsPath)) {
        outputChannel.appendLine("📦 nixpkgs repository not found, cloning...");
        try {
            await fs.mkdir(storagePath, { recursive: true });

            await new Promise<void>((resolve, reject) => {
                const gitClone = spawn('git', ['clone', '--depth', '1', 'https://github.com/NixOS/nixpkgs.git', nixpkgsPath]);

                gitClone.stdout.on('data', (data: Buffer) => outputChannel.append(data.toString()));
                gitClone.stderr.on('data', (data: Buffer) => outputChannel.append(data.toString()));

                gitClone.on('close', (code: number) => {
                    if (code === 0) {
                        outputChannel.appendLine("✅ Cloned nixpkgs successfully.\n");
                        resolve();
                    } else {
                        reject(new Error(`git clone exited with code ${code}`));
                    }
                });

                gitClone.on('error', (err: Error) => reject(err));
            });
        } catch (err: any) {
            vscode.window.showErrorMessage(`Failed to clone nixpkgs: ${err.message}`);
            outputChannel.appendLine(`❌ Failed to clone nixpkgs: ${err.message}`);
            return;
        }
    } else {
        outputChannel.appendLine("✅ nixpkgs repository already present.\n");
    }

    const publishChoice = await vscode.window.showQuickPick(['Yes', 'No'], {
        placeHolder: 'Publish nixpkgs-review results with --post-result flag?',
    });
    if (!publishChoice) { return; }

    const publish = publishChoice === 'Yes';

    // Run nixpkgs-review
    const args: string[] = ["pr", prInput];
    if (publish) { args.push('--post-result'); }


    const review = await (async () => {
        // Check if nixpkgs-review is in PATH
        const commandExists = await checkCommandExists("nixpkgs-review");

        if (commandExists) {
            return spawn('nixpkgs-review', args, {
                cwd: nixpkgsPath,
                env: { ...process.env, GITHUB_TOKEN: token },
            });
        }


        vscode.window.showInformationMessage("nixpkgs-review not found in PATH, using nix run...");
        return spawn('nix', [
            'run',
            '--experimental-features', 'nix-command flakes',
            'nixpkgs#nixpkgs-review',
            '--', ...args
        ], {
            cwd: nixpkgsPath,
            env: { ...process.env, GITHUB_TOKEN: token },
        });

    })();

    review.stdout.on("data", (data: Buffer) => {
        outputChannel.append(data.toString());
    });

    review.stderr.on("data", (data: Buffer) => {
        outputChannel.append(data.toString());
    });

    review.on("error", (err: Error) => {
        outputChannel.appendLine(`\n❌ Error running nixpkgs-review: ${err.message}`);
        vscode.window.showErrorMessage(`nixpkgs-review failed to launch: ${err.message}`);
    });

    review.on("close", (code: number) => {
        outputChannel.appendLine(`\n🎉 nixpkgs-review completed with exit code ${code}`);
        if (code !== 0) {
            vscode.window.showWarningMessage(`nixpkgs-review failed with code ${code}`);
        }
    });
}

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand("nixpkgs-review-helper.reviewPR", () => {
        runNixpkgsReview(context);
    });
    context.subscriptions.push(disposable);
}

export function deactivate() { }
