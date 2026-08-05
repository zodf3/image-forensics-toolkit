# Contributing to ForensicLens

Thank you for your interest in contributing! This guide will help you get started.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/image-forensics-toolkit.git
   cd image-forensics-toolkit
   ```
3. **Create a branch** for your feature:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development

This project uses **zero build tools** — just plain HTML, CSS, and JavaScript. To develop:

1. Open `index.html` in your browser
2. Edit the files
3. Refresh the browser to see changes

For a better development experience, use a local server:
```bash
npx serve .
# or
python -m http.server 8080
```

## Project Structure

```
js/
├── app.js          # Main controller — DO NOT add processing logic here
├── ela.js          # Error Level Analysis module
├── noise.js        # Noise analysis module
├── copymove.js     # Copy-move detection module
├── metadata.js     # EXIF metadata parser
├── channels.js     # Channel analysis module
└── edges.js        # Edge detection module
```

## Adding a New Forensic Tool

1. **Create a new JS file** in `js/` (e.g., `js/yourtool.js`)
2. **Export a global function** on `window`:
   ```javascript
   window.performYourTool = function(sourceCanvas, resultCanvas, options) {
       // Your processing logic here
   };
   ```
3. **Add a tool tab** in `index.html` inside `.tool-tabs`
4. **Add controls** in `index.html` inside `.controls-sidebar`
5. **Register the tool** in `js/app.js`:
   - Add to `toolMeta` object
   - Add a `runYourTool()` function
   - Add the case to the `switch` in `runTool()`
6. **Update `README.md`** with your tool's documentation

## Code Style

- Use **vanilla JavaScript** (ES6+) — no frameworks or libraries
- All image processing must use the **Canvas API** and **ImageData**
- Add **detailed comments** explaining DIP concepts and algorithms
- Keep functions focused and modular
- Use `const` and `let` — never `var`
- Follow the existing naming conventions

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add DCT block visualization tool
fix: correct Gaussian kernel normalization in noise analysis
docs: update README with new tool documentation
style: improve slider hover animation
```

## Pull Request Process

1. Ensure your code works correctly with various image formats (JPEG, PNG, WebP)
2. Test on at least Chrome and Firefox
3. Update the README if you've added a new tool
4. Submit a PR with a clear description of what was changed and why

## Reporting Issues

When reporting bugs, please include:
- Browser name and version
- Image format that caused the issue
- Steps to reproduce
- Expected vs actual behavior

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
