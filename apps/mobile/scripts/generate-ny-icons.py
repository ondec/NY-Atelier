"""Generate shared, colour-adaptive vector data from the retained source SVGs."""
from pathlib import Path
import json
import xml.etree.ElementTree as ET
root = Path(__file__).resolve().parents[1]
source = root / 'assets/icons'
metadata = {row['key']: row for row in json.loads((source / 'figma-sources.json').read_text())}
allowed = {'svg', 'path', 'rect', 'circle', 'g', 'line', 'ellipse', 'polygon', 'polyline'}

def element(node, solid=False):
    tag = node.tag.split('}')[-1]
    if tag not in allowed:
        raise ValueError(f'Unsupported SVG element: {tag}')
    attrs = {}
    for key, value in node.attrib.items():
        if key.startswith('on') or 'href' in key or 'url(' in value:
            raise ValueError(f'Unexpected active SVG attribute: {key}')
        if key in {'xmlns', 'width', 'height', 'viewBox'} and tag == 'svg':
            continue
        if key == 'stroke-width':
            continue
        attrs[key] = 'currentColor' if value.startswith('#') else value
    if solid and attrs.get('fill') == 'currentColor' and 'stroke' not in attrs:
        attrs['stroke'] = 'none'
    return {'tag': tag, 'attrs': attrs, 'children': [element(child, solid) for child in node]}

icons = {}
for directory in ['lets', 'custom']:
    for file in sorted((source / directory).glob('*.svg')):
        tree = ET.fromstring(file.read_text())
        if tree.attrib.get('viewBox') != '0 0 24 24':
            raise ValueError(f'Unexpected icon bounds: {file}')
        icon = element(tree, solid=file.stem.endswith('-filled'))
        icon['attrs'].update({'stroke-linecap': 'round', 'stroke-linejoin': 'round'})
        icon['source'] = {'kind': 'figma', **metadata[file.stem]} if directory == 'lets' else {'kind': 'ny-atelier', 'name': file.stem}
        icons[file.stem] = icon
output = root / 'src/data/ny-icons.json'
output.write_text(json.dumps(icons, indent=2) + '\n')
print(f'Generated {len(icons)} shared icon variants from the source vectors.')
