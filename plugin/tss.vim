" If non-zero, display debug messages
let g:tss_verbose = get(g:, 'tss_verbose', 0)

" Automatically format code when saving
let g:tss_format_on_save = get(g:, 'tss_format_on_save', 0)

" Ignore case in completions
let g:tss_completion_ignore_case = get(g:, 'tss_completion_ignore_case', 0)

augroup vimtss
	autocmd!
	autocmd BufReadPost *.ts,*.tsx call tss#openFile(expand('<afile>'))
	autocmd BufDelete *.ts,*.tsx call tss#closeFile(expand('<afile>'))
	autocmd BufWritePre *.ts,*.tsx call tss#preSave()
augroup END

" The job ID of the currently running tss server
let g:tss_server_id = 0
