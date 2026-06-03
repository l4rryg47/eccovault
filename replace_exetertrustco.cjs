const fs = require("fs");
const path = require("path");
const root = process.cwd();
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      walk(file);
    } else {
      try {
        const content = fs.readFileSync(file, "utf8");
        if (/Eccovault/i.test(content)) {
          const newContent = content.replace(/Eccovault/gi, "Eccovault");
          fs.writeFileSync(file, newContent, "utf8");
          console.log("Updated:", file);
        }
      } catch (err) {
        // ignore binary/unreadable files
      }
    }
  }
}
walk(root);
