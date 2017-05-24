if exists('tss_loaded')
	finish
endif
let tss_loaded = 1

" Replace the default neomake tsc maker; this will only have an effect if
" neomake is installed.
let g:neomake_typescript_tsc_maker = {
		\ 'exe': 'node',
		\ 'args': [expand('<sfile>:p:h') . '/../../bin/errors.js'],
        \ 'errorformat':
            \ '%E%f %#(%l\,%c): error TS%n: %m,' .
            \ '%C%\s%\+%m'
        \ }

call tss#init()
