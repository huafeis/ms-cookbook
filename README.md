<h1 align="center">ModelScope Cookbook</h1>

<p align="center"><strong>From open-source models to practical AI applications.</strong></p>
<p align="center">魔搭紫皮书 · Learn, build, and evaluate with open-source AI.</p>

<p align="center">
  <img src="assets/home/book-hero.webp" width="320" alt="ModelScope Cookbook — illustrated purple book cover">
</p>

<p align="center">
  English · <a href="README.zh-CN.md">简体中文</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-5B4BDB.svg" alt="License: Apache 2.0"></a>
  <a href="#contents"><img src="https://img.shields.io/badge/Content-Simplified_Chinese-5B4BDB.svg" alt="Book content: Simplified Chinese"></a>
  <a href="https://github.com/modelscope/ms-cookbook/pulls"><img src="https://img.shields.io/badge/Contributions-Welcome-287D70.svg" alt="Contributions welcome"></a>
</p>

<p align="center">
  <a href="#getting-started">Get started</a> ·
  <a href="https://modelscope.cn/studios/canghe/ms-cookbook">Read online</a> ·
  <a href="#contents">Explore the book</a> ·
  <a href="#contributing">Contribute</a> ·
  <a href="content/">Browse chapter sources</a>
</p>

## What is ModelScope Cookbook?

**ModelScope Cookbook is an open-source learning resource for developers who want to use open-source AI models in real tasks.** Through practical tutorials and application examples, it connects model selection, inference, data preparation, fine-tuning, evaluation, and application development into a structured learning journey.

Which model fits your task? What can run on your hardware? How do you adapt a model to your data and measure the result? The cookbook works through these decisions with tools from the ModelScope ecosystem, including **EvalScope, ms-swift, and DiffSynth**, alongside local inference tools and agent frameworks.

The aim is to help readers build the skills to **choose an appropriate model, get it running, evaluate its behavior, and integrate it into an application**. Examples span enterprise knowledge assistants, speech assistants, customer-service quality analysis, image generation, and agents that use external tools.

## What you will learn

- **🧭 Choose models for a task.** Define inputs, outputs, and evaluation criteria, then assess models against the problem you need to solve.
- **🛠️ Run models on available hardware.** Work through downloads, environment setup, local and cloud inference, and quantization to understand resource requirements.
- **📊 Adapt and evaluate.** Prepare training data, explore lightweight fine-tuning and preference alignment, and compare results with a baseline.
- **🚀 Build with models and tools.** Follow application examples in RAG, speech, and generative AI, then explore MCP and skills for connecting tools and organizing reusable workflows.

### Find your starting point

| Your goal | Suggested reading path |
| --- | --- |
| Run your first open-source model | **Start with the basics:** model fundamentals → task selection → first inference |
| Adapt a model to your use case | **Develop model expertise:** training data → fine-tuning → evaluation |
| Build an AI application | **Explore applications:** knowledge assistants → external tools → reusable skills |
| Create with generative AI | **AIGC creation:** examples → image LoRA → product visuals → theory |

The book and website are currently in **Simplified Chinese**. This repository includes the reading website, chapter content, and supporting media; the English README provides an overview and setup instructions.

## Getting started

### Requirements

- Git to clone the repository, or download and extract its ZIP archive from GitHub.
- Python 3 to run the local HTTP server.
- A modern web browser.

The reading website requires no package installation, build step, API key, or GPU. Individual exercises may require additional software, model downloads, credentials, or hardware as described in their chapters.

### Run locally

```bash
git clone https://github.com/modelscope/ms-cookbook.git
cd ms-cookbook
python3 -m http.server 4173 --bind 127.0.0.1
```

Open [http://127.0.0.1:4173/#home](http://127.0.0.1:4173/#home). Stop the server with `Ctrl+C`.

If port `4173` is in use, replace it with `4174` in both the command and the browser address. Keep `index.html` and the `assets/` directory together, and serve the repository root over HTTP.

Once downloaded, the bundled reading content is available locally. GitHub and other external resources require an internet connection and may require access permissions.

## Contents

| Part | Topic | Chapters |
| --- | --- | --- |
| I | Understanding open-source models | 1–4 |
| II | Choosing models for a task | 5–6 |
| III | Running your first models | 7–11 |
| IV | Fine-tuning and evaluation | 12–15 |
| V | Building application systems | 16–19 |
| VI | Generative AI | 20–24 |
| VII | Agents | 25–30 |
| VIII | Supplementary fundamentals | 31 |

Use the website's table of contents to browse the book, its reading paths to follow a guided sequence, or its application entries to begin with a specific task.

### Content status

The current snapshot is dated **September 15, 2026** and includes **31 chapters, with 30 available to read**. Chapter 23, on AI-generated video, retains the source manuscript's notice about an upcoming MiniMax H3 deployment tutorial.

The snapshot includes 347 chapter-image references, 12 attachment links, and the contents of 12 embedded spreadsheets. [Chapter sources](content/) are bundled in this repository. Updates are reviewed explicitly; the website does not automatically pull from the authoring workspace. [Sync evidence](content/sync-report.json) records source revisions and checks of prose, heading order, code, and formulas.

### Reading experience

The website provides full-text keyword search, guided reading paths, chapter navigation, code copying, image enlargement, and KaTeX formula rendering. Responsive layouts support desktop and mobile reading, with chapter images, attachments, and rendering assets bundled for local access.

## Deployment

The website is published as a [public ModelScope Studio](https://modelscope.cn/studios/canghe/ms-cookbook). Changes to site files on `main` trigger the **Deploy to ModelScope Studio** GitHub Actions workflow; maintainers can also run it manually from the Actions tab.

The workflow synchronizes committed website files to the Studio's `master` branch, prepares a Chinese Studio card, and triggers deployment. It verifies the live page and its source commit before completing. The `MODELSCOPE_API_KEY` repository secret provides deployment authentication. GitHub remains the source for code and content changes.

## Repository structure

```text
.
├── index.html                  # Website entry point and page structure
├── favicon.svg                 # Site icon
├── assets/
│   ├── content.js              # Book metadata and chapter content
│   ├── paper.js                # Navigation, search, and reading interactions
│   ├── styles.css              # Base styles
│   ├── paper.css               # Site theme and layout
│   ├── review.css              # Focused UI and mobile refinements
│   ├── dada/                   # Dada artwork, license, and notice
│   ├── community/              # Community QR code
│   ├── review/                 # Backgrounds with paper airplanes removed
│   ├── paper/                  # Illustrations, icons, and attribution
│   ├── home/                   # Shared visual assets and font licenses
│   ├── manuscript-20260914/     # Chapter images and attachments
│   └── katex/                  # Bundled math renderer and fonts
├── content/                    # Reviewable chapter sources and sync evidence
├── scripts/build-content.py    # Rebuild bundled chapter data
├── scripts/check-site.mjs       # Content and local-link checks
├── CONTRIBUTING.md             # Contribution guide
├── README.md                   # English documentation
├── README.zh-CN.md             # Simplified Chinese documentation
├── 使用说明.txt                 # Local edition notes
└── LICENSE                     # Apache License 2.0
```

The site uses HTML, CSS, and browser-side JavaScript. `index.html` loads the chapter data from `assets/content.js` and the reading interface from `assets/paper.js`. Navigation uses URL fragments, such as `#home`, `#contents`, `#paths/aigc`, `#contribute`, and `#chapter-1`. After editing chapter sources, run `python3 scripts/build-content.py` and `node scripts/check-site.mjs`; reading the existing website requires no build.

## Contributing

Contributions are welcome through [GitHub Issues](https://github.com/modelscope/ms-cookbook/issues) and [pull requests](https://github.com/modelscope/ms-cookbook/pulls). Useful contributions include technical corrections, clearer explanations, reproducible examples, accessibility improvements, and fixes to the reading experience.

1. For substantial changes, open an issue describing the problem and proposed scope.
2. Fork the repository and create a branch for your changes.
3. Include the affected chapter or page, supporting references, and reproduction steps where relevant.
4. Preview changes locally. Check navigation, search, images, attachments, code blocks, and formulas affected by the change, including mobile layout when applicable.
5. Submit a pull request describing the change and how you verified it. Keep both README versions aligned when updating project documentation.

Preserve attribution for contributed material and include only content you are authorized to share. Keep credentials and personal data out of examples and attachments.

See the [contribution guide](CONTRIBUTING.md). You can also share a practice through [ModelScope Developer Practices](https://modelscope.cn/spotlight): select **创建内容** and add **#魔搭紫皮书**. The website's **社区共建** page includes the community QR code and verified contributor links. Author and reviewer credits are added after confirmation.

## License and acknowledgments

This repository is distributed under the [Apache License 2.0](LICENSE). Bundled third-party components retain their respective licenses:

- [KaTeX](assets/katex/LICENSE): MIT License.
- [Remix Icon](assets/home/REMIX-LICENSE): Apache License 2.0.
- [Noto Serif SC](assets/home/NOTO-LICENSE.txt): SIL Open Font License 1.1.
- [Dada illustrations](https://github.com/NovaWang97/dada-illustrations): [MIT License](assets/dada/LICENSE), with the [upstream notice](assets/dada/NOTICE.md) retained. See [artwork notes](assets/review/ATTRIBUTION.md).

Chapter images and attachments remain subject to the rights of their authors or respective rights holders. See the [site asset attribution](assets/paper/ATTRIBUTION.txt) and [shared asset attribution](assets/home/ATTRIBUTION.txt) for provenance. Models, datasets, and tools referenced in the book are subject to their own licenses and terms.
