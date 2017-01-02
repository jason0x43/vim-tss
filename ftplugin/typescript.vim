command! -buffer TssDefinition :call tss#definition()
command! -buffer TssErrors :call tss#errors()
command! -buffer TssFormat :call tss#format()
command! -buffer TssImplementation :call tss#implementation()
command! -buffer TssQuickInfo :call tss#quickinfo()
command! -buffer TssReferences :call tss#references()
command! -buffer TssStart :call tss#start()
command! -buffer TssStop :call tss#stop()

" Replace the default neomake tsc maker; this will only have an effect if
" neomake is installed.
let g:neomake_typescript_tsc_maker = {
		\ 'exe': 'node',
		\ 'args': [expand('<sfile>:p:h') . '/../bin/errors.js'],
        \ 'errorformat':
            \ '%E%f %#(%l\,%c): error TS%n: %m,' .
            \ '%C%\s%\+%m'
        \ }

if !g:tss_server_id
	call tss#start()
endif
