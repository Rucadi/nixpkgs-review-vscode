Here's a comprehensive `README.md` for your extension:

---

# Nixpkgs Review Helper for Visual Studio Code

This is a Visual Studio Code (VSCode) extension that helps you easily review pull requests (PRs) for the `nixpkgs` repository using the [`nixpkgs-review` ](https://github.com/Mic92/nixpkgs-review) tool. The extension allows you to either manually enter a PR number or URL, or automatically fetch PRs where you are a reviewer or assigned. You can then run the `nixpkgs-review` tool on the selected PRs.

## Features

* **Review a PR Manually**: Enter the PR number or GitHub PR URL to run `nixpkgs-review`.
* **Review PRs Where You're a Reviewer**: Automatically fetch PRs where you're assigned or a reviewer, and run `nixpkgs-review` on them.
* **Supports VsCode GitHub Authentication**: Uses your GitHub credentials to fetch PRs from the repository.

## Prerequisites

Before using this extension, you need to have the following tools installed:

* **VSCode**: Install [Visual Studio Code](https://code.visualstudio.com/).
* **Nix**: Install [Nix package manager](https://nixos.org/download.html) on your machine. 

## Installation

1. Open VSCode.
2. Navigate to the Extensions panel (`Ctrl+Shift+X`).
3. Search for `nixpkgs-review-helper`.
4. Click **Install**.

Or, you can install the extension from the VSCode marketplace via the [WIP](https://marketplace.visualstudio.com/).

## Usage

Once the extension is installed, you can use the following commands:

1. **Manually Review a PR**:

   * Press `F1` or `Ctrl+Shift+P` to open the Command Palette.
   * Type `Nixpkgs Review Helper: Review PR` and press `Enter`.
   * Enter the PR number or GitHub URL when prompted.

2. **Automatically Fetch PRs Where You're a Reviewer**:

   * Press `F1` or `Ctrl+Shift+P` to open the Command Palette.
   * Type `Nixpkgs Review Helper: Fetch & Review My PRs` and press `Enter`.
   * The extension will fetch PRs where you are a reviewer or assigned and list them in the output channel.

### Options

* **Post Results**:
  You can choose to post the results of the review to a GitHub issue or other endpoint if you include the `--post-result` flag when prompted.

## How It Works

1. **GitHub Authentication**:
   The extension uses the GitHub API to fetch PRs where you're assigned or a reviewer. You'll be prompted to authenticate using your GitHub account. The extension uses your GitHub access token to perform operations on the PRs.

2. **Nixpkgs Review**:
   The extension runs `nixpkgs-review` on the selected PR. If `nixpkgs-review` is not found in your `PATH`, the extension will fall back to using `nix run nixpkgs#nixpkgs-review`.

3. **Post-Result Flag**:
   If you want to publish the results, you can include the `--post-result` flag when the extension prompts you for the review options. This can post the review results back to GitHub or another endpoint.


## Error Handling

* **Missing Commands**: If the required commands (`nix`, `git`, `nixpkgs-review`) are not found on your system, the extension will show an error message and advise you to install them.
* **GitHub Authentication Failures**: If the extension fails to authenticate with GitHub, it will display an error message and prompt you to retry authentication.

## Debugging

If you're encountering issues or want to debug the output of the `nixpkgs-review` command, you can view the detailed logs in the **Output** panel in VSCode. The logs will show all the commands being executed and any errors returned by the tools.

## Known Issues

* The extension currently only supports reviewing PRs from the `nixpkgs` repository on GitHub.
* It relies on the availability of `nixpkgs-review` in your `PATH` or the ability to run it via `nix run`.

## Contributing

If you'd like to contribute to this extension, feel free to submit an issue or a pull request. Contributions are welcome!

### Steps to Contribute:

1. Fork the repository.
2. Clone your fork to your local machine.
3. Install dependencies:

   ```bash
   npm install
   ```
4. Run the extension in VSCode's debug mode:

   * Press `F5` to open a new window with the extension loaded.
5. Make your changes and submit a pull request.

## License

This extension is open-source and released under the MIT License.

