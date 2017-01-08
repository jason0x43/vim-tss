from deoplete.source.base import Base
from pprint import pformat
from ._util import get_completions, update_tsserver

class Source(Base):
	def __init__(self, vim):
		super(Source, self).__init__(vim)

		self.name = 'tss'
		self.filetypes = ['typescript', 'javascript']
		self.logfile = open('tss.log', mode='a')
		self.rank = 700
		self.vim = vim
		self.min_pattern_length = 1

	def __del__(self):
		self.logfile.close()

	def gather_candidates(self, context):
		fname = context['bufname']
		line = context['position'][1]
		col = context['position'][2]
		content = '\n'.join(self.vim.current.buffer[:])

		# Update tsserver
		update_tsserver(fname, content)

		self.logfile.write('-----------------------------------------\n')

		self.logfile.write('Gathering candidates for {} at ({}, {}):\n'.format(
			context['bufname'], context['position'][1], context['position'][2]))
		# self.logfile.write(pformat(context) + '\n')
		completions = get_completions(fname, line, col)
		candidates = [to_candidate(x) for x in completions]
		self.logfile.write('Candidates:\n')
		self.logfile.write(pformat(candidates[:3]) + '\n')
		return candidates

def to_candidate(completion):
    return {
		'word': completion['name'],
		'kind': completion['kind']
    }
