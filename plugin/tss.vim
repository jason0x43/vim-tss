" If non-zero, display debug messages
if !exists('g:tss_verbose')
	let g:tss_verbose = 0
endif

" Automatically format code when saving
if !exists('g:tss_format_on_save')
	let g:tss_format_on_save = 0
endif

augroup vimtss
	autocmd!
	autocmd BufReadPost *.ts,*.tsx call tss#openFile(expand('<afile>'))
	autocmd BufDelete *.ts,*.tsx call tss#closeFile(expand('<afile>'))
	autocmd BufWritePre *.ts,*.tsx call tss#preSave()
augroup END

" The job ID of the currently running tss server
let g:tss_server_id = 0
