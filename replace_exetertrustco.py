from pathlib import Path
import re
root = Path('.').resolve()
pattern = re.compile(r'Eccovault', re.IGNORECASE)
for path in root.rglob('*'):
    if path.is_file():
        try:
            text = path.read_text(encoding='utf-8')
        except Exception:
            continue
        if pattern.search(text):
            path.write_text(pattern.sub('Eccovault', text), encoding='utf-8')
            print(f'Updated: {path}')
