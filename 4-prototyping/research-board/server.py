#!/usr/bin/env python3
"""Local review board. Standard library only; binds to loopback."""
import argparse
import json
import os
import re
import tempfile
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
STATE = PROJECT / '1-research' / 'board-state.json'


def reviews():
    metadata = json.loads((PROJECT / '1-research/sources.json').read_text())['items']
    by_number = {x['row_number']: x for x in metadata}
    result = []
    for line in (PROJECT / '1-research/open-research.md').read_text().splitlines():
        match = re.match(r'\| \*\*(\d+)\.\*\*', line)
        if not match:
            continue
        number = int(match[1])
        cells = [x.strip() for x in line.split('|')[1:-1]]
        context = re.sub(r'^\*\*\d+\.\*\*\s*', '', cells[0])
        meta = by_number[number]
        result.append(dict(id=meta['id'], number=number, context=context,
                           headline=context.split('. ')[0].rstrip('.'), quote=cells[1][1:-1],
                           url=meta['url'], date=meta['published'], author=meta['author'],
                           source='Храни Деньги!' if 'hranidengi' in meta['url'] else 'Банки.ру',
                           outcome=meta['outcome']))
    return result


def validate_state(state):
    if not isinstance(state, dict) or state.get('version') != 1:
        raise ValueError('Неверный формат доски')
    groups = state.get('groups')
    if not isinstance(groups, list) or not 1 <= len(groups) <= 100:
        raise ValueError('На доске должно быть от 1 до 100 колонок')
    known = {r['id'] for r in reviews()}
    seen, group_ids = set(), set()
    for group in groups:
        if not isinstance(group, dict):
            raise ValueError('Неверный формат колонки')
        gid = group.get('id')
        if not isinstance(gid, str) or not gid or len(gid) > 100 or gid in group_ids:
            raise ValueError('Неверный идентификатор колонки')
        group_ids.add(gid)
        if not isinstance(group.get('title'), str) or not group['title'].strip() or len(group['title']) > 120:
            raise ValueError('Неверное название колонки')
        if group.get('color') not in ('stone', 'sage', 'peach', 'lavender', 'blue', 'yellow'):
            raise ValueError('Неверный цвет колонки')
        cards = group.get('cards')
        if not isinstance(cards, list):
            raise ValueError('Неверный список карточек')
        for cid in cards:
            if not isinstance(cid, str) or cid not in known or cid in seen:
                raise ValueError('Неизвестная или повторяющаяся карточка')
            seen.add(cid)
    excluded = state.get('excluded', {})
    if not isinstance(excluded, dict) or any(k not in known or not isinstance(v, str) for k, v in excluded.items()):
        raise ValueError('Неверный список исключений')
    if groups[0]['id'] != 'inbox' or seen | set(excluded) != known or seen & set(excluded):
        raise ValueError('Доска должна содержать все исходные отзывы и колонку «Без группы»')
    notes = state.get('notes', {})
    if not isinstance(notes, dict) or any(k not in known or not isinstance(v, str) or len(v) > 10000 for k, v in notes.items()):
        raise ValueError('Неверные заметки')
    return state


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(HERE), **kwargs)

    def send_json(self, value, status=200):
        data = json.dumps(value, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        path = self.path.split('?')[0]
        if path == '/api/reviews':
            return self.send_json(reviews())
        if path == '/api/state':
            try:
                return self.send_json(json.loads(STATE.read_text()) if STATE.exists() else None)
            except (OSError, json.JSONDecodeError):
                return self.send_json({'error': 'Не удалось прочитать сохранённую доску. Скачайте резервную копию перед продолжением.'}, 500)
        return super().do_GET()

    def do_PUT(self):
        if self.path != '/api/state':
            return self.send_json({'error': 'Страница не найдена'}, 404)
        origin = self.headers.get('Origin')
        if origin and origin != f'http://{self.headers.get("Host")}':
            return self.send_json({'error': 'Запрос с другого сайта запрещён'}, 403)
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if not 0 < length <= 2_000_000:
                raise ValueError('Слишком большой или пустой файл')
            state = json.loads(self.rfile.read(length))
            # Preserve exclusions requested by the owner even from older open tabs.
            current = json.loads(STATE.read_text()) if STATE.exists() else {}
            state['excluded'] = {**state.get('excluded', {}), **current.get('excluded', {})}
            for group in state.get('groups', []):
                group['cards'] = [cid for cid in group.get('cards', []) if cid not in state['excluded']]
            state = validate_state(state)
            with tempfile.NamedTemporaryFile('w', encoding='utf-8', dir=STATE.parent, delete=False) as temp:
                json.dump(state, temp, ensure_ascii=False, indent=2)
                temp.write('\n')
                temp.flush()
                os.fsync(temp.fileno())
            os.replace(temp.name, STATE)
            return self.send_json({'saved': True})
        except (ValueError, TypeError, KeyError, json.JSONDecodeError) as error:
            return self.send_json({'error': str(error)}, 400)
        except OSError:
            return self.send_json({'error': 'Не удалось записать доску на диск'}, 500)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Review board: http://127.0.0.1:{args.port}', flush=True)
    server.serve_forever()
