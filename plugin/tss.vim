augroup vimtss
	autocmd!
	autocmd BufReadPost *.ts,*.tsx call tss#openFile(expand('<afile>'))
	autocmd BufDelete *.ts,*.tsx call tss#closeFile(expand('<afile>'))
augroup END
