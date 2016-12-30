command! -buffer TssStart :call tss#start()
command! -buffer TssStop :call tss#stop()

let g:tss_verbose = 0

let g:neomake_typescript_tsc_maker = {
		\ 'exe': 'node',
		\ 'args': [expand('<sfile>:p:h') . '/../bin/errors.js'],
        \ 'errorformat':
            \ '%E%f %#(%l\,%c): error TS%n: %m,' .
            \ '%C%\s%\+%m'
        \ }

call tss#start()
