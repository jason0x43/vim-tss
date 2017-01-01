command! -buffer TssDefinition :call tss#definition()
command! -buffer TssFormat :call tss#format()
command! -buffer TssImplementation :call tss#implementation()
command! -buffer TssReferences :call tss#references()
command! -buffer TssStart :call tss#start()
command! -buffer TssStop :call tss#stop()

let g:tss_verbose = 0

let g:neomake_typescript_tsc_maker = {
		\ 'exe': 'node',
		\ 'args': [expand('<sfile>:p:h') . '/../bin/errors.js', '-r'],
        \ 'errorformat':
            \ '%E%f %#(%l\,%c): error TS%n: %m,' .
            \ '%C%\s%\+%m'
        \ }

call tss#start()
