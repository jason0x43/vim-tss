if exists('g:tss_loaded')
  finish
endif
let g:tss_loaded = 1

" If non-zero, display debug messages
let g:tss_verbose = get(g:, 'tss_verbose', 0)

" If non-zero, start tsserver in a node inspector session
let g:tss_debug_tsserver = get(g:, 'tss_debug_tsserver', 0)

" Use with JS files
let g:tss_js = get(g:, 'tss_js', 1)

" Automatically format code when saving
let g:tss_format_on_save = get(g:, 'tss_format_on_save', 0)

" Ignore case in completions
let g:tss_completion_ignore_case = get(g:, 'tss_completion_ignore_case', 0)

" If true, automatically open the location list when it's populated
let g:tss_auto_open_loclist = get(g:, 'tss_auto_open_loclist', 0)

augroup vimtss
	autocmd!
	autocmd BufReadPost *.js,*.ts,*.tsx call tss#openFile(expand('<afile>'))
	autocmd BufDelete *.js,*.ts,*.tsx call tss#closeFile(expand('<afile>'))
	autocmd BufWritePre *.js,*.ts,*.tsx call tss#preSave()
augroup END

" The job ID of the currently running tss server
let g:tss_server_id = 0
