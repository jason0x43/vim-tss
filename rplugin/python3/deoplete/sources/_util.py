from subprocess import check_output
from os.path import abspath, dirname, join
import json

script_dir = join(dirname(__file__), '..', '..', '..', '..', 'bin')

def get_completions(fname, line, col):
	script = join(script_dir, 'completions.js')
	output = check_output(['node', script, fname, line, col])
	completions = json.loads(output)
	if not completions['success']:
		return None
	return completions['body']

def update_tsserver(fname, contents):
	script = join(script_dir, 'reload.js')
	output = check_output(['node', script, fname], input=contents, encoding='utf-8')

if __name__ == '__main__':
	candidates = gather_candidates({
		'bufname': abspath(join(script_dir, '..', 'src', 'start.ts')),
		'position': [0, 190, 10]
	})
	print(candidates)
